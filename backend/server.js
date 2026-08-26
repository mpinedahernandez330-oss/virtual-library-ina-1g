// server.js — API REST Virtual Library (tablas en inglés)
"use strict";

const express = require("express");
const cors    = require("cors");
const path    = require("path");
const fs      = require("fs");
const multer  = require("multer");
const { run, get, all } = require("./db");

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
  limits:     { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype === "application/pdf")
});

function ok(res, data, status = 200) { return res.status(status).json({ ok: true,  data }); }
function fail(res, status, msg)      { return res.status(status).json({ ok: false, error: msg }); }

// Convierte una fila de la tabla books al formato que espera el frontend
function mapBook(row) {
  if (!row) return null;
  return {
    id:          row.id,
    titulo:      row.title,
    autor:       row.author,
    categoria:   row.category,
    anio:        row.year,
    descripcion: row.description,
    enlace:      row.link      || "",
    portada:     row.cover     || null,
    color:       row.color     || "#1f8a70",
    disponible:  row.available,
    favorito:    row.favorite,
    destacado:   row.featured,
    creado_en:   row.created_at
  };
}

const COLORS = ["#1f8a70","#2d6cdf","#d75a4a","#7c3aed","#b7791f","#0f766e"];

// =============================================================================
// LIBROS
// =============================================================================
app.get("/api/libros", async (req, res) => {
  try {
    const { search, categoria, sort } = req.query;
    let sql = "SELECT * FROM books";
    const params = [], where = [];
    if (search) {
      where.push("(title LIKE ? OR author LIKE ? OR category LIKE ?)");
      const like = `%${search}%`;
      params.push(like, like, like);
    }
    if (categoria && categoria !== "Todas") { where.push("category = ?"); params.push(categoria); }
    if (where.length) sql += " WHERE " + where.join(" AND ");
    const sortMap = { titulo: "title ASC", autor: "author ASC", anio: "year DESC" };
    sql += " ORDER BY featured DESC, " + (sortMap[sort] || "title ASC");
    const rows = await all(sql, params);
    return ok(res, rows.map(mapBook));
  } catch (err) { return fail(res, 500, "Error al obtener libros."); }
});

app.get("/api/libros/:id", async (req, res) => {
  try {
    const row = await get("SELECT * FROM books WHERE id = ?", [req.params.id]);
    if (!row) return fail(res, 404, "Libro no encontrado.");
    return ok(res, mapBook(row));
  } catch (err) { return fail(res, 500, "Error al obtener el libro."); }
});

app.post("/api/libros", uploadCover.single("portada"), async (req, res) => {
  try {
    const { titulo, autor, categoria, anio, descripcion, enlace, disponible } = req.body;
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
    const cnt   = (await get("SELECT COUNT(*) AS n FROM books")).n;
    const color = COLORS[cnt % COLORS.length];
    const [result] = await require("./db").pool.query(
      "INSERT INTO books (title,author,category,year,description,link,available,cover,color,featured) VALUES (?,?,?,?,?,?,?,?,?,0)",
      [titulo.trim(), autor.trim(), categoria || null, anio || null, (descripcion||"").trim(), (enlace||"").trim(), disponible === "true" || disponible === true ? 1 : 0, coverUrl, color]
    );
    const row = await get("SELECT * FROM books WHERE id = ?", [result.insertId]);
    return ok(res, mapBook(row), 201);
  } catch (err) { console.error("[POST /api/libros]", err.message); return fail(res, 500, "Error al guardar el libro."); }
});

app.post("/api/libros/:id/pdf", uploadPdf.single("pdf"), async (req, res) => {
  try {
    const row = await get("SELECT id FROM books WHERE id = ?", [req.params.id]);
    if (!row)     return fail(res, 404, "Libro no encontrado.");
    if (!req.file) return fail(res, 400, "No se recibio ningun PDF.");
    const pdfUrl = "/uploads/pdfs/" + req.file.filename;
    await run("UPDATE books SET link = ? WHERE id = ?", [pdfUrl, req.params.id]);
    return ok(res, mapBook(await get("SELECT * FROM books WHERE id = ?", [req.params.id])));
  } catch (err) { return fail(res, 500, "Error al subir el PDF."); }
});

app.put("/api/libros/:id", uploadCover.single("portada"), async (req, res) => {
  try {
    const existing = await get("SELECT * FROM books WHERE id = ?", [req.params.id]);
    if (!existing) return fail(res, 404, "Libro no encontrado.");
    const { titulo, autor, categoria, anio, descripcion, enlace, disponible, destacado } = req.body;
    let coverUrl = existing.cover;
    if (req.file) {
      coverUrl = "/uploads/" + req.file.filename;
    } else if (req.body.portada_base64) {
      const base64Data = req.body.portada_base64.replace(/^data:image\/\w+;base64,/, "");
      const filename   = Date.now() + "-portada.jpg";
      fs.writeFileSync(path.join(uploadsDir, filename), Buffer.from(base64Data, "base64"));
      coverUrl = "/uploads/" + filename;
    }
    await run(
      `UPDATE books SET
        title       = COALESCE(?,title),   author    = COALESCE(?,author),
        category    = COALESCE(?,category), year      = COALESCE(?,year),
        description = COALESCE(?,description), link   = COALESCE(?,link),
        available   = COALESCE(?,available), featured = COALESCE(?,featured),
        cover = ? WHERE id = ?`,
      [titulo?titulo.trim():null, autor?autor.trim():null, categoria||null, anio||null,
       descripcion!==undefined?descripcion.trim():null, enlace!==undefined?enlace.trim():null,
       disponible!==undefined?(disponible==="true"||disponible===true?1:0):null,
       destacado!==undefined?(destacado==="true"||destacado===true?1:0):null,
       coverUrl, req.params.id]
    );
    return ok(res, mapBook(await get("SELECT * FROM books WHERE id = ?", [req.params.id])));
  } catch (err) { return fail(res, 500, "Error al actualizar el libro."); }
});

app.delete("/api/libros/:id", async (req, res) => {
  try {
    const row = await get("SELECT * FROM books WHERE id = ?", [req.params.id]);
    if (!row) return fail(res, 404, "Libro no encontrado.");
    if (row.cover?.startsWith("/uploads/")) { const fp = path.join(uploadsDir, path.basename(row.cover)); if (fs.existsSync(fp)) fs.unlinkSync(fp); }
    if (row.link?.startsWith("/uploads/pdfs/")) { const fp = path.join(pdfDir, path.basename(row.link)); if (fs.existsSync(fp)) fs.unlinkSync(fp); }
    await run("DELETE FROM books WHERE id = ?", [req.params.id]);
    return ok(res, { message: "Libro eliminado." });
  } catch (err) { return fail(res, 500, "Error al eliminar el libro."); }
});

app.patch("/api/libros/:id/destacado", async (req, res) => {
  try {
    const row = await get("SELECT featured FROM books WHERE id = ?", [req.params.id]);
    if (!row) return fail(res, 404, "Libro no encontrado.");
    const newVal = row.featured ? 0 : 1;
    await run("UPDATE books SET featured = ? WHERE id = ?", [newVal, req.params.id]);
    return ok(res, { destacado: newVal });
  } catch (err) { return fail(res, 500, "Error al actualizar destacado."); }
});

app.patch("/api/libros/:id/favorito", async (req, res) => {
  try {
    const row = await get("SELECT favorite FROM books WHERE id = ?", [req.params.id]);
    if (!row) return fail(res, 404, "Libro no encontrado.");
    const newVal = row.favorite ? 0 : 1;
    await run("UPDATE books SET favorite = ? WHERE id = ?", [newVal, req.params.id]);
    return ok(res, { favorito: newVal });
  } catch (err) { return fail(res, 500, "Error al actualizar favorito."); }
});

// =============================================================================
// CATEGORIAS
// =============================================================================
app.get("/api/categorias", async (_req, res) => {
  try { return ok(res, (await all("SELECT name FROM categories ORDER BY name ASC")).map(r => r.name)); }
  catch (err) { return fail(res, 500, "Error al obtener categorias."); }
});

app.post("/api/categorias", async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre) return fail(res, 400, "El nombre es obligatorio.");
    const exists = await get("SELECT id FROM categories WHERE name = ?", [nombre.trim()]);
    if (exists) return fail(res, 409, "Esa categoria ya existe.");
    await run("INSERT INTO categories (name) VALUES (?)", [nombre.trim()]);
    return ok(res, { message: "Categoria agregada." }, 201);
  } catch (err) { return fail(res, 500, "Error al agregar la categoria."); }
});

app.delete("/api/categorias/:nombre", async (req, res) => {
  try { await run("DELETE FROM categories WHERE name = ?", [req.params.nombre]); return ok(res, { message: "Categoria eliminada." }); }
  catch (err) { return fail(res, 500, "Error al eliminar la categoria."); }
});

// =============================================================================
// USUARIOS
// =============================================================================
app.get("/api/usuarios", async (_req, res) => {
  try { return ok(res, await all("SELECT id,name AS nombre,email,plan,plan_expiry,created_at AS creado_en FROM users ORDER BY created_at DESC")); }
  catch (err) { return fail(res, 500, "Error al obtener usuarios."); }
});

app.post("/api/usuarios/registro", async (req, res) => {
  try {
    const { nombre, email, password } = req.body;
    if (!nombre || !email || !password) return fail(res, 400, "Nombre, correo y contrasena son obligatorios.");
    if (!email.toLowerCase().endsWith("@gmail.com")) return fail(res, 400, "Solo se aceptan correos @gmail.com.");
    const exists = await get("SELECT id FROM users WHERE email = ?", [email.toLowerCase()]);
    if (exists) return fail(res, 409, "Ese correo ya esta registrado.");
    await run("INSERT INTO users (name,email,password,plan) VALUES (?,?,?,'free')", [nombre.trim(), email.toLowerCase(), password]);
    return ok(res, { message: "Usuario registrado correctamente." }, 201);
  } catch (err) { return fail(res, 500, "Error al registrar usuario."); }
});

app.post("/api/usuarios/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return fail(res, 400, "Correo y contrasena son obligatorios.");
    const user = await get("SELECT * FROM users WHERE email = ? AND password = ?", [email.toLowerCase(), password]);
    if (!user) return fail(res, 401, "Correo o contrasena incorrectos.");
    // Verificar expiración del plan
    if (user.plan !== "free" && user.plan_expiry && new Date() > new Date(user.plan_expiry)) {
      await run("UPDATE users SET plan='free', plan_expiry=NULL WHERE id=?", [user.id]);
      user.plan = "free"; user.plan_expiry = null;
    }
    return ok(res, { id: user.id, nombre: user.name, email: user.email, plan: user.plan, planExpiry: user.plan_expiry });
  } catch (err) { return fail(res, 500, "Error al iniciar sesion."); }
});

app.put("/api/usuarios/:id/plan", async (req, res) => {
  try {
    const { plan } = req.body;
    const planDays = { free: null, silver: 21, diamond: 30 };
    if (!Object.keys(planDays).includes(plan)) return fail(res, 400, "Plan invalido.");
    const days   = planDays[plan];
    const expiry = days ? new Date(Date.now() + days * 86400000).toISOString().slice(0,19).replace("T"," ") : null;
    await run("UPDATE users SET plan=?, plan_expiry=? WHERE id=?", [plan, expiry, req.params.id]);
    return ok(res, { message: "Plan actualizado." });
  } catch (err) { return fail(res, 500, "Error al actualizar el plan."); }
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
    const nameWords = norm(name).split(/\s+/);
    return words.every(w => nameWords.some(nw => nw.startsWith(w) || nw === w));
  }) || null;
}

app.post("/api/admin/login", async (req, res) => {
  try {
    const { usuario, password } = req.body;
    if (!usuario || !password) return fail(res, 400, "Usuario y contrasena son obligatorios.");
    const match = findAdmin(usuario);
    if (!match || password !== ADMIN_PASS) return fail(res, 401, "Usuario o contrasena incorrectos.");
    const parts   = match.split(" ");
    const nombre   = parts.slice(0, 2).map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
    const apellidos = parts.slice(2).map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
    return ok(res, { id: 1, nombre, apellidos, usuario: match });
  } catch (err) { return fail(res, 500, "Error al iniciar sesion."); }
});

// =============================================================================
// RESEÑAS
// =============================================================================
app.get("/api/resenas", async (req, res) => {
  try {
    const { libroId } = req.query;
    let sql = `SELECT r.*, u.name AS nombre, u.email AS user_email,
               r.rating AS calificacion, r.text AS texto,
               UNIX_TIMESTAMP(r.created_at)*1000 AS fecha
               FROM reviews r JOIN users u ON r.user_id = u.id`;
    const params = [];
    if (libroId) { sql += " WHERE r.book_id = ?"; params.push(libroId); }
    sql += " ORDER BY r.created_at DESC";
    return ok(res, await all(sql, params));
  } catch (err) { return fail(res, 500, "Error al obtener resenas."); }
});

app.post("/api/resenas", async (req, res) => {
  try {
    const { libro_id, user_email, nombre, calificacion, texto } = req.body;
    if (!libro_id || !user_email || !calificacion) return fail(res, 400, "Datos incompletos.");
    const user = await get("SELECT id FROM users WHERE email = ?", [user_email]);
    if (!user) return fail(res, 404, "Usuario no encontrado.");
    // Upsert: actualiza si ya existe reseña del mismo usuario para el mismo libro
    const existing = await get("SELECT id FROM reviews WHERE book_id = ? AND user_id = ?", [libro_id, user.id]);
    if (existing) {
      await run("UPDATE reviews SET rating=?, text=?, created_at=NOW() WHERE id=?", [calificacion, texto||"", existing.id]);
    } else {
      await run("INSERT INTO reviews (book_id,user_id,rating,text) VALUES (?,?,?,?)", [libro_id, user.id, calificacion, texto||""]);
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
    const user = await get("SELECT id FROM users WHERE email = ?", [user_email]);
    if (!user) return fail(res, 404, "Usuario no encontrado.");
    await run("INSERT INTO reading_history (user_id,book_id) VALUES (?,?)", [user.id, libro_id]);
    return ok(res, { message: "Lectura registrada." }, 201);
  } catch (err) { return fail(res, 500, "Error al registrar lectura."); }
});

app.get("/api/historial/:email", async (req, res) => {
  try {
    const user = await get("SELECT id FROM users WHERE email = ?", [req.params.email]);
    if (!user) return ok(res, []);
    const rows = await all(
      `SELECT h.id, h.book_id AS libro_id,
              UNIX_TIMESTAMP(h.read_at)*1000 AS leido_en,
              b.title AS titulo, b.author AS autor,
              b.cover AS portada, b.color
       FROM reading_history h
       JOIN books b ON h.book_id = b.id
       WHERE h.user_id = ?
       ORDER BY h.read_at DESC LIMIT 50`,
      [user.id]
    );
    return ok(res, rows);
  } catch (err) { return fail(res, 500, "Error al obtener historial."); }
});

// =============================================================================
// ESTADÍSTICAS
// =============================================================================
app.get("/api/stats", async (_req, res) => {
  try {
    const total_libros       = (await get("SELECT COUNT(*) AS n FROM books")).n;
    const total_usuarios     = (await get("SELECT COUNT(*) AS n FROM users")).n;
    const total_lecturas     = (await get("SELECT COUNT(*) AS n FROM reading_history")).n;
    const total_resenas      = (await get("SELECT COUNT(*) AS n FROM reviews")).n;
    const libros_disponibles = (await get("SELECT COUNT(*) AS n FROM books WHERE available=1")).n;
    const top_libros = await all(
      `SELECT b.id, b.title AS titulo, b.author AS autor,
              b.cover AS portada, b.color, COUNT(h.id) AS lecturas
       FROM reading_history h JOIN books b ON h.book_id = b.id
       GROUP BY h.book_id ORDER BY lecturas DESC LIMIT 5`
    );
    return ok(res, { total_libros, total_usuarios, total_lecturas, total_resenas, libros_disponibles, top_libros });
  } catch (err) { return fail(res, 500, "Error al obtener estadisticas."); }
});

app.listen(PORT, () => {
  console.log(`[Server] Virtual Library corriendo en http://localhost:${PORT}`);
});
