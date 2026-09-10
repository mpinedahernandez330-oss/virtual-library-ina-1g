// server.js — API REST Virtual Library (tablas en español)
"use strict";

const express = require("express");
const cors    = require("cors");
const path    = require("path");
const fs      = require("fs");
const multer  = require("multer");
const { run, get, all, pool } = require("./db");

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "..")));

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/uploads", express.static(uploadsDir));

const pdfDir = path.join(uploadsDir, "pdfs");
if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

// ── Multer portadas ───────────────────────────────────────────────────────────
const coverStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename:    (_req, file, cb) => cb(null, Date.now() + "-" + Math.round(Math.random()*1e6) + path.extname(file.originalname))
});
const uploadCover = multer({
  storage:    coverStorage,
  limits:     { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, ["image/jpeg","image/png","image/webp","image/gif"].includes(file.mimetype))
});

// ── Multer PDFs ───────────────────────────────────────────────────────────────
const pdfStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, pdfDir),
  filename:    (_req, file, cb) => cb(null, Date.now() + "-" + Math.round(Math.random()*1e6) + ".pdf")
});
const uploadPdf = multer({
  storage:    pdfStorage,
  limits:     { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype === "application/pdf")
});

function ok(res, data, status = 200) { return res.status(status).json({ ok: true,  data }); }
function fail(res, status, msg)      { return res.status(status).json({ ok: false, error: msg }); }

// Mapea una fila de la tabla libros al formato del frontend
function mapBook(row) {
  if (!row) return null;
  return {
    id:           row.id,
    titulo:       row.titulo,
    autor:        row.autor,
    categoria:    row.categoria,
    anio:         row.anio,
    descripcion:  row.descripcion,
    enlace:       row.enlace       || "",
    portada:      row.portada      || null,
    color:        row.color        || "#1f8a70",
    disponible:   row.disponible,
    favorito:     row.favorito,
    destacado:    row.destacado,
    access_level: row.access_level || "free",
    creado_en:    row.creado_en
  };
}

const COLORS = ["#1f8a70","#2d6cdf","#d75a4a","#7c3aed","#b7791f","#0f766e"];
const ACCESS_LEVELS = { free: 1, silver: 2, diamond: 3 };

// =============================================================================
// LIBROS
// =============================================================================
app.get("/api/libros", async (req, res) => {
  try {
    const { search, categoria, sort } = req.query;
    let sql = "SELECT * FROM libros";
    const params = [], where = [];
    if (search) {
      where.push("(titulo LIKE ? OR autor LIKE ? OR categoria LIKE ?)");
      const like = `%${search}%`;
      params.push(like, like, like);
    }
    if (categoria && categoria !== "Todas") { where.push("categoria = ?"); params.push(categoria); }
    if (where.length) sql += " WHERE " + where.join(" AND ");
    const sortMap = { titulo: "titulo ASC", autor: "autor ASC", anio: "anio DESC" };
    sql += " ORDER BY destacado DESC, " + (sortMap[sort] || "titulo ASC");
    const rows = await all(sql, params);
    return ok(res, rows.map(mapBook));
  } catch (err) { console.error(err); return fail(res, 500, "Error al obtener libros."); }
});

app.get("/api/libros/:id", async (req, res) => {
  try {
    const row = await get("SELECT * FROM libros WHERE id = ?", [req.params.id]);
    if (!row) return fail(res, 404, "Libro no encontrado.");
    return ok(res, mapBook(row));
  } catch (err) { return fail(res, 500, "Error al obtener el libro."); }
});

app.post("/api/libros", uploadCover.single("portada"), async (req, res) => {
  try {
    const { titulo, autor, categoria, anio, descripcion, enlace, disponible, access_level } = req.body;
    if (!titulo || !autor) return fail(res, 400, "Titulo y autor son obligatorios.");
    let coverUrl = null;
    if (req.file) {
      coverUrl = "/uploads/" + req.file.filename;
    } else if (req.body.portada_base64) {
      const base64Data = req.body.portada_base64.replace(/^data:image\/\w+;base64,/, "");
      const filename   = Date.now() + "-portada.jpg";
      fs.writeFileSync(path.join(uploadsDir, filename), Buffer.from(base64Data, "base64"));
      coverUrl = "/uploads/" + filename;
    }
    const cnt   = (await get("SELECT COUNT(*) AS n FROM libros")).n;
    const color = COLORS[cnt % COLORS.length];
    const id    = Date.now().toString();
    await run(
      "INSERT INTO libros (id,titulo,autor,categoria,anio,descripcion,enlace,disponible,portada,color,access_level) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
      [id, titulo.trim(), autor.trim(), categoria||null, anio||null, (descripcion||"").trim(),
       (enlace||"").trim(), disponible==="true"||disponible===true?1:0, coverUrl, color, access_level||"free"]
    );
    const row = await get("SELECT * FROM libros WHERE id = ?", [id]);
    return ok(res, mapBook(row), 201);
  } catch (err) { console.error("[POST /api/libros]", err.message); return fail(res, 500, "Error al guardar el libro."); }
});

app.post("/api/libros/:id/pdf", uploadPdf.single("pdf"), async (req, res) => {
  try {
    const row = await get("SELECT id FROM libros WHERE id = ?", [req.params.id]);
    if (!row)      return fail(res, 404, "Libro no encontrado.");
    if (!req.file) return fail(res, 400, "No se recibio ningun PDF.");
    const pdfUrl = "/uploads/pdfs/" + req.file.filename;
    await run("UPDATE libros SET enlace = ? WHERE id = ?", [pdfUrl, req.params.id]);
    return ok(res, mapBook(await get("SELECT * FROM libros WHERE id = ?", [req.params.id])));
  } catch (err) { return fail(res, 500, "Error al subir el PDF."); }
});

app.put("/api/libros/:id", uploadCover.single("portada"), async (req, res) => {
  try {
    const existing = await get("SELECT * FROM libros WHERE id = ?", [req.params.id]);
    if (!existing) return fail(res, 404, "Libro no encontrado.");
    const { titulo, autor, categoria, anio, descripcion, enlace, disponible, destacado, access_level } = req.body;
    let coverUrl = existing.portada;
    if (req.file) {
      coverUrl = "/uploads/" + req.file.filename;
    } else if (req.body.portada_base64) {
      const base64Data = req.body.portada_base64.replace(/^data:image\/\w+;base64,/, "");
      const filename   = Date.now() + "-portada.jpg";
      fs.writeFileSync(path.join(uploadsDir, filename), Buffer.from(base64Data, "base64"));
      coverUrl = "/uploads/" + filename;
    }
    await run(
      `UPDATE libros SET
        titulo      = COALESCE(?,titulo),
        autor       = COALESCE(?,autor),
        categoria   = COALESCE(?,categoria),
        anio        = COALESCE(?,anio),
        descripcion = COALESCE(?,descripcion),
        enlace      = COALESCE(?,enlace),
        disponible  = COALESCE(?,disponible),
        destacado   = COALESCE(?,destacado),
        access_level = COALESCE(?,access_level),
        portada     = ?
       WHERE id = ?`,
      [titulo?titulo.trim():null, autor?autor.trim():null, categoria||null, anio||null,
       descripcion!==undefined?descripcion.trim():null,
       enlace!==undefined && enlace.trim()!==""?enlace.trim():null,
       disponible!==undefined?(disponible==="true"||disponible===true?1:0):null,
       destacado!==undefined?(destacado==="true"||destacado===true?1:0):null,
       access_level||null,
       coverUrl, req.params.id]
    );
    return ok(res, mapBook(await get("SELECT * FROM libros WHERE id = ?", [req.params.id])));
  } catch (err) { console.error(err); return fail(res, 500, "Error al actualizar el libro."); }
});

app.delete("/api/libros/:id", async (req, res) => {
  try {
    const row = await get("SELECT * FROM libros WHERE id = ?", [req.params.id]);
    if (!row) return fail(res, 404, "Libro no encontrado.");
    if (row.portada?.startsWith("/uploads/")) { const fp = path.join(uploadsDir, path.basename(row.portada)); if (fs.existsSync(fp)) fs.unlinkSync(fp); }
    if (row.enlace?.startsWith("/uploads/pdfs/")) { const fp = path.join(pdfDir, path.basename(row.enlace)); if (fs.existsSync(fp)) fs.unlinkSync(fp); }
    await run("DELETE FROM libros WHERE id = ?", [req.params.id]);
    return ok(res, { message: "Libro eliminado." });
  } catch (err) { return fail(res, 500, "Error al eliminar el libro."); }
});

app.patch("/api/libros/:id/destacado", async (req, res) => {
  try {
    const row = await get("SELECT destacado FROM libros WHERE id = ?", [req.params.id]);
    if (!row) return fail(res, 404, "Libro no encontrado.");
    const newVal = row.destacado ? 0 : 1;
    await run("UPDATE libros SET destacado = ? WHERE id = ?", [newVal, req.params.id]);
    return ok(res, { destacado: newVal });
  } catch (err) { return fail(res, 500, "Error al actualizar destacado."); }
});

app.patch("/api/libros/:id/favorito", async (req, res) => {
  try {
    const row = await get("SELECT favorito FROM libros WHERE id = ?", [req.params.id]);
    if (!row) return fail(res, 404, "Libro no encontrado.");
    const newVal = row.favorito ? 0 : 1;
    await run("UPDATE libros SET favorito = ? WHERE id = ?", [newVal, req.params.id]);
    return ok(res, { favorito: newVal });
  } catch (err) { return fail(res, 500, "Error al actualizar favorito."); }
});

// =============================================================================
// CATEGORIAS
// =============================================================================
app.get("/api/categorias", async (_req, res) => {
  try { return ok(res, (await all("SELECT nombre FROM categorias ORDER BY nombre ASC")).map(r => r.nombre)); }
  catch (err) { return fail(res, 500, "Error al obtener categorias."); }
});

app.post("/api/categorias", async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre) return fail(res, 400, "El nombre es obligatorio.");
    const exists = await get("SELECT id FROM categorias WHERE nombre = ?", [nombre.trim()]);
    if (exists) return fail(res, 409, "Esa categoria ya existe.");
    await run("INSERT INTO categorias (nombre) VALUES (?)", [nombre.trim()]);
    return ok(res, { message: "Categoria agregada." }, 201);
  } catch (err) { return fail(res, 500, "Error al agregar la categoria."); }
});

app.delete("/api/categorias/:nombre", async (req, res) => {
  try { await run("DELETE FROM categorias WHERE nombre = ?", [req.params.nombre]); return ok(res, { message: "Categoria eliminada." }); }
  catch (err) { return fail(res, 500, "Error al eliminar la categoria."); }
});

// =============================================================================
// USUARIOS
// =============================================================================
app.get("/api/usuarios", async (_req, res) => {
  try { return ok(res, await all("SELECT id, nombre, email, plan, plan_expiry, creado_en FROM usuarios ORDER BY creado_en DESC")); }
  catch (err) { return fail(res, 500, "Error al obtener usuarios."); }
});

app.post("/api/usuarios/registro", async (req, res) => {
  try {
    const { nombre, email, password } = req.body;
    if (!nombre || !email || !password) return fail(res, 400, "Nombre, correo y contrasena son obligatorios.");
    if (!email.toLowerCase().endsWith("@gmail.com")) return fail(res, 400, "Solo se aceptan correos @gmail.com.");
    const exists = await get("SELECT id FROM usuarios WHERE email = ?", [email.toLowerCase()]);
    if (exists) return fail(res, 409, "Ese correo ya esta registrado.");
    await run("INSERT INTO usuarios (nombre, email, password, plan) VALUES (?,?,?,'free')", [nombre.trim(), email.toLowerCase(), password]);
    return ok(res, { message: "Usuario registrado correctamente." }, 201);
  } catch (err) { return fail(res, 500, "Error al registrar usuario."); }
});

app.post("/api/usuarios/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return fail(res, 400, "Correo y contrasena son obligatorios.");
    const user = await get("SELECT * FROM usuarios WHERE email = ? AND password = ?", [email.toLowerCase(), password]);
    if (!user) return fail(res, 401, "Correo o contrasena incorrectos.");
    // Verificar expiración del plan
    if (user.plan !== "free" && user.plan_expiry && Date.now() > Number(user.plan_expiry)) {
      await run("UPDATE usuarios SET plan='free', plan_expiry=NULL WHERE id=?", [user.id]);
      user.plan = "free"; user.plan_expiry = null;
    }
    return ok(res, { id: user.id, nombre: user.nombre, email: user.email, plan: user.plan, planExpiry: user.plan_expiry });
  } catch (err) { return fail(res, 500, "Error al iniciar sesion."); }
});

app.get("/api/usuarios/:id/plan-status", async (req, res) => {
  try {
    const row = await get("SELECT plan, plan_expiry FROM usuarios WHERE id = ?", [req.params.id]);
    if (!row) return fail(res, 404, "Usuario no encontrado.");
    return ok(res, { plan: row.plan, plan_expiry: row.plan_expiry });
  } catch (err) { return fail(res, 500, "Error al consultar estado del plan."); }
});

app.put("/api/usuarios/:id/plan", async (req, res) => {
  try {
    const { plan } = req.body;
    const planDays = { free: null, silver: 60, diamond: 120 };
    if (!Object.keys(planDays).includes(plan)) return fail(res, 400, "Plan invalido.");
    const days   = planDays[plan];
    const expiry = days ? Date.now() + days * 86400000 : null;
    await run("UPDATE usuarios SET plan=?, plan_expiry=? WHERE id=?", [plan, expiry, req.params.id]);
    return ok(res, { message: "Plan actualizado.", vencimiento: expiry });
  } catch (err) { return fail(res, 500, "Error al actualizar el plan."); }
});

// =============================================================================
// MEMBRESÍAS
// =============================================================================
const PLAN_TO_MEMBERSHIP = { free: 1, silver: 2, diamond: 3 };
const MEMBERSHIP_TO_PLAN = { 1: "free", 2: "silver", 3: "diamond" };

async function getOrCreateMembership(userId) {
  let um = await get(`
    SELECT um.*, m.name, m.price, m.duration_days, m.book_limit, m.description
    FROM user_memberships um
    INNER JOIN memberships m ON m.id = um.membership_id
    WHERE um.user_id = ? AND um.active = 1
    ORDER BY um.id DESC LIMIT 1
  `, [userId]);

  if (!um) {
    await run("INSERT INTO user_memberships (user_id,membership_id,start_date,expiration_date,active,books_used) VALUES (?,1,NOW(),NULL,1,0)", [userId]);
    um = await get(`
      SELECT um.*, m.name, m.price, m.duration_days, m.book_limit, m.description
      FROM user_memberships um INNER JOIN memberships m ON m.id = um.membership_id
      WHERE um.user_id = ? ORDER BY um.id DESC LIMIT 1
    `, [userId]);
  }

  if (um && um.expiration_date && new Date() > new Date(um.expiration_date)) {
    await run("UPDATE user_memberships SET active=0 WHERE id=?", [um.id]);
    await run("INSERT INTO user_memberships (user_id,membership_id,start_date,expiration_date,active,books_used) VALUES (?,1,NOW(),NULL,1,0)", [userId]);
    await run("UPDATE usuarios SET plan='free', plan_expiry=NULL WHERE id=?", [userId]);
    um = await get(`
      SELECT um.*, m.name, m.price, m.duration_days, m.book_limit, m.description
      FROM user_memberships um INNER JOIN memberships m ON m.id = um.membership_id
      WHERE um.user_id = ? ORDER BY um.id DESC LIMIT 1
    `, [userId]);
  }
  return um;
}

app.get("/api/membresia/:userId", async (req, res) => {
  try {
    const um = await getOrCreateMembership(req.params.userId);
    if (!um) return fail(res, 404, "Usuario no encontrado.");
    let days_remaining = null;
    if (um.expiration_date) {
      const diff = new Date(um.expiration_date) - new Date();
      days_remaining = diff > 0 ? Math.ceil(diff / 86400000) : 0;
    }
    const today     = new Date().toISOString().slice(0,10);
    const lastReset = um.last_reset_date ? String(um.last_reset_date).slice(0,10) : null;
    const usedToday = lastReset === today ? (um.books_used_today || 0) : 0;
    const available = um.book_limit >= 999999 ? 999999 : Math.max(0, um.book_limit - usedToday);
    return ok(res, {
      membership_id: um.membership_id, name: um.name, price: um.price,
      plan: MEMBERSHIP_TO_PLAN[um.membership_id] || "free",
      duration_days: um.duration_days, book_limit: um.book_limit,
      books_used: um.books_used, books_used_today: usedToday,
      available_books: available, start_date: um.start_date,
      expiration_date: um.expiration_date, days_remaining,
      active: !!um.active, description: um.description
    });
  } catch (err) { console.error(err); return fail(res, 500, "Error al obtener membresía."); }
});

app.post("/api/membresia/:userId/suscribir", async (req, res) => {
  try {
    const { plan } = req.body;
    if (!PLAN_TO_MEMBERSHIP[plan]) return fail(res, 400, "Plan inválido.");
    const membershipId = PLAN_TO_MEMBERSHIP[plan];
    const m = await get("SELECT * FROM memberships WHERE id=?", [membershipId]);
    if (!m) return fail(res, 404, "Membresía no encontrada.");
    await run("UPDATE user_memberships SET active=0 WHERE user_id=?", [req.params.userId]);
    const expiry = m.duration_days > 0
      ? new Date(Date.now() + m.duration_days * 86400000).toISOString().slice(0,19).replace("T"," ")
      : null;
    await run("INSERT INTO user_memberships (user_id,membership_id,start_date,expiration_date,active,books_used) VALUES (?,?,NOW(),?,1,0)",
      [req.params.userId, membershipId, expiry]);
    const expiryMs = expiry ? new Date(expiry).getTime() : null;
    await run("UPDATE usuarios SET plan=?, plan_expiry=? WHERE id=?", [plan, expiryMs, req.params.userId]);
    const days_remaining = expiry ? Math.ceil((new Date(expiry) - new Date()) / 86400000) : null;
    return ok(res, { message: "Membresía activada.", plan, expiration_date: expiry, days_remaining, book_limit: m.book_limit }, 201);
  } catch (err) { console.error(err); return fail(res, 500, "Error al suscribir."); }
});

// Verificar acceso a un libro (equivalente a check_access.php)
app.get("/api/membresia/:userId/acceso/:bookId", async (req, res) => {
  try {
    const { userId, bookId } = req.params;

    // Verificar que el libro existe
    const book = await get("SELECT * FROM libros WHERE id = ?", [bookId]);
    if (!book) return fail(res, 404, "El libro no existe.");

    // Obtener membresía activa
    const um = await getOrCreateMembership(userId);
    if (!um) return fail(res, 404, "Usuario no encontrado.");

    // Verificar expiración
    if (um.expiration_date && new Date() > new Date(um.expiration_date)) {
      return res.json({ allowed: false, message: "Tu membresía ha expirado." });
    }

    // Verificar nivel de acceso del libro vs plan del usuario
    const userLevel = ACCESS_LEVELS[MEMBERSHIP_TO_PLAN[um.membership_id] || "free"] || 1;
    const bookLevel = ACCESS_LEVELS[book.access_level || "free"] || 1;
    if (userLevel < bookLevel) {
      return res.json({
        allowed: false,
        message: `Necesitas el plan ${book.access_level} para leer este libro.`
      });
    }

    // Si ya leyó el libro antes → permitir sin contar límite
    const yaLeido = await get(
      "SELECT id FROM membership_readings WHERE user_id=? AND book_id=?",
      [userId, bookId]
    );
    if (yaLeido) {
      await run("UPDATE membership_readings SET last_read_date=NOW() WHERE id=?", [yaLeido.id]);
      return res.json({ allowed: true, ya_leido: true });
    }

    // Resetear contador diario si cambió el día
    const today     = new Date().toISOString().slice(0,10);
    const lastReset = um.last_reset_date ? String(um.last_reset_date).slice(0,10) : null;
    if (lastReset !== today) {
      await run("UPDATE user_memberships SET books_used_today=0, last_reset_date=? WHERE id=?", [today, um.id]);
      um.books_used_today = 0;
    }

    // Verificar límite diario (solo para Free)
    const usedToday = lastReset === today ? (um.books_used_today || 0) : 0;
    if (um.book_limit < 999999 && usedToday >= um.book_limit) {
      return res.json({
        allowed: false,
        message: `Límite de ${um.book_limit} libros por día alcanzado. Actualiza tu plan.`
      });
    }

    // Registrar la lectura
    await run("INSERT INTO membership_readings (user_id,book_id,start_date,last_read_date) VALUES (?,?,NOW(),NOW())", [userId, bookId]);
    await run("UPDATE user_memberships SET books_used=books_used+1, books_used_today=books_used_today+1, last_reset_date=? WHERE id=?", [today, um.id]);

    return res.json({ allowed: true, ya_leido: false });
  } catch (err) { console.error(err); return fail(res, 500, "Error al verificar acceso."); }
});

app.patch("/api/membresia/:userId/leer", async (req, res) => {
  try {
    const { book_id } = req.body;
    const um = await getOrCreateMembership(req.params.userId);
    if (!um) return fail(res, 404, "Membresía no encontrada.");
    const today     = new Date().toISOString().slice(0,10);
    const lastReset = um.last_reset_date ? String(um.last_reset_date).slice(0,10) : null;
    if (lastReset !== today) {
      await run("UPDATE user_memberships SET books_used_today=0, last_reset_date=? WHERE id=?", [today, um.id]);
      um.books_used_today = 0;
    }
    const usedToday = lastReset === today ? (um.books_used_today || 0) : 0;
    if (um.book_limit < 999999 && usedToday >= um.book_limit) {
      return fail(res, 403, `Límite de ${um.book_limit} libros por día alcanzado.`);
    }
    await run("UPDATE user_memberships SET books_used=books_used+1, books_used_today=books_used_today+1, last_reset_date=? WHERE id=?", [today, um.id]);
    if (book_id) {
      const existing = await get("SELECT id FROM membership_readings WHERE user_id=? AND book_id=?", [req.params.userId, book_id]);
      if (existing) {
        await run("UPDATE membership_readings SET last_read_date=NOW() WHERE id=?", [existing.id]);
      } else {
        await run("INSERT INTO membership_readings (user_id,book_id,start_date,last_read_date) VALUES (?,?,NOW(),NOW())", [req.params.userId, book_id]);
      }
    }
    const newUsed   = usedToday + 1;
    const available = um.book_limit >= 999999 ? 999999 : Math.max(0, um.book_limit - newUsed);
    return ok(res, { books_used_today: newUsed, available_books: available, book_limit: um.book_limit });
  } catch (err) { console.error(err); return fail(res, 500, "Error al registrar lectura."); }
});

// =============================================================================
// ADMINISTRADORES
// =============================================================================
const ADMIN_NAMES = [
  "jose david maravilla pena",
  "josue nahum villanueva mendoza",
  "brayan alexander garcia fernandez",
  "miguel antonio pineda hernandez"
];
const ADMIN_PASS = "0310223542";

function norm(t) {
  return String(t).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z\s]/g,"").trim();
}
function findAdmin(input) {
  const words = norm(input).split(/\s+/).filter(Boolean);
  return ADMIN_NAMES.find(name => {
    const nw = norm(name).split(/\s+/);
    return words.every(w => nw.some(n => n.startsWith(w) || n === w));
  }) || null;
}

app.post("/api/admin/login", async (req, res) => {
  try {
    const { usuario, password } = req.body;
    if (!usuario || !password) return fail(res, 400, "Usuario y contrasena son obligatorios.");
    const match = findAdmin(usuario);
    if (!match || password !== ADMIN_PASS) return fail(res, 401, "Usuario o contrasena incorrectos.");
    const parts    = match.split(" ");
    const nombre   = parts.slice(0,2).map(w => w[0].toUpperCase()+w.slice(1)).join(" ");
    const apellidos = parts.slice(2).map(w => w[0].toUpperCase()+w.slice(1)).join(" ");
    return ok(res, { id: 1, nombre, apellidos, usuario: match });
  } catch (err) { return fail(res, 500, "Error al iniciar sesion."); }
});

// =============================================================================
// RESEÑAS
// =============================================================================
app.get("/api/resenas", async (req, res) => {
  try {
    const { libroId } = req.query;
    let sql = "SELECT *, fecha AS fecha FROM resenas";
    const params = [];
    if (libroId) { sql += " WHERE libro_id = ?"; params.push(libroId); }
    sql += " ORDER BY fecha DESC";
    return ok(res, await all(sql, params));
  } catch (err) { return fail(res, 500, "Error al obtener resenas."); }
});

app.post("/api/resenas", async (req, res) => {
  try {
    const { libro_id, user_email, nombre, calificacion, texto } = req.body;
    if (!libro_id || !user_email || !calificacion) return fail(res, 400, "Datos incompletos.");
    const existing = await get("SELECT id FROM resenas WHERE libro_id=? AND user_email=?", [libro_id, user_email]);
    if (existing) {
      await run("UPDATE resenas SET calificacion=?, texto=?, fecha=? WHERE id=?", [calificacion, texto||"", Date.now(), existing.id]);
    } else {
      await run("INSERT INTO resenas (libro_id,user_email,nombre,calificacion,texto,fecha) VALUES (?,?,?,?,?,?)",
        [libro_id, user_email, nombre||"Anónimo", calificacion, texto||"", Date.now()]);
    }
    return ok(res, { message: "Resena guardada." }, 201);
  } catch (err) { return fail(res, 500, "Error al guardar la resena."); }
});

// =============================================================================
// HISTORIAL
// =============================================================================
app.post("/api/historial", async (req, res) => {
  try {
    const { user_email, libro_id } = req.body;
    if (!user_email || !libro_id) return fail(res, 400, "user_email y libro_id son obligatorios.");
    await run("INSERT INTO historial_lecturas (user_email,libro_id,leido_en) VALUES (?,?,?)",
      [user_email, libro_id, Date.now()]);
    return ok(res, { message: "Lectura registrada." }, 201);
  } catch (err) { return fail(res, 500, "Error al registrar lectura."); }
});

app.get("/api/historial/:email", async (req, res) => {
  try {
    const rows = await all(
      `SELECT h.id, h.libro_id, h.leido_en,
              l.titulo, l.autor, l.portada, l.color
       FROM historial_lecturas h
       JOIN libros l ON h.libro_id = l.id
       WHERE h.user_email = ?
       ORDER BY h.leido_en DESC LIMIT 50`,
      [req.params.email]
    );
    return ok(res, rows);
  } catch (err) { return fail(res, 500, "Error al obtener historial."); }
});

// =============================================================================
// ESTADÍSTICAS
// =============================================================================
app.get("/api/stats", async (_req, res) => {
  try {
    const total_libros       = (await get("SELECT COUNT(*) AS n FROM libros")).n;
    const total_usuarios     = (await get("SELECT COUNT(*) AS n FROM usuarios")).n;
    const total_lecturas     = (await get("SELECT COUNT(*) AS n FROM historial_lecturas")).n;
    const total_resenas      = (await get("SELECT COUNT(*) AS n FROM resenas")).n;
    const libros_disponibles = (await get("SELECT COUNT(*) AS n FROM libros WHERE disponible=1")).n;
    const top_libros = await all(
      `SELECT l.id, l.titulo, l.autor, l.portada, l.color, COUNT(h.id) AS lecturas
       FROM historial_lecturas h JOIN libros l ON h.libro_id = l.id
       GROUP BY h.libro_id ORDER BY lecturas DESC LIMIT 5`
    );
    return ok(res, { total_libros, total_usuarios, total_lecturas, total_resenas, libros_disponibles, top_libros });
  } catch (err) { return fail(res, 500, "Error al obtener estadisticas."); }
});

app.listen(PORT, () => {
  console.log(`[Server] Virtual Library corriendo en http://localhost:${PORT}`);
});
