// server.js — API REST Virtual Library INA 1G (sqlite3)
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

// ── Multer portadas ────────────────────────────────────────────────────────────
const coverStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename:    (_req, file, cb) => cb(null, Date.now() + "-" + Math.round(Math.random()*1e6) + path.extname(file.originalname))
});
const uploadCover = multer({
  storage:    coverStorage,
  limits:     { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, ["image/jpeg","image/png","image/webp","image/gif"].includes(file.mimetype))
});

// ── Multer PDFs ────────────────────────────────────────────────────────────────
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

const COLORS = ["#1f8a70","#2d6cdf","#d75a4a","#7c3aed","#b7791f","#0f766e"];

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
    return ok(res, await all(sql, params));
  } catch (err) { return fail(res, 500, "Error al obtener libros."); }
});

app.get("/api/libros/:id", async (req, res) => {
  try {
    const row = await get("SELECT * FROM libros WHERE id = ?", [req.params.id]);
    if (!row) return fail(res, 404, "Libro no encontrado.");
    return ok(res, row);
  } catch (err) { return fail(res, 500, "Error al obtener el libro."); }
});

app.post("/api/libros", uploadCover.single("portada"), async (req, res) => {
  try {
    const { titulo, autor, categoria, anio, descripcion, enlace, disponible } = req.body;
    if (!titulo || !autor) return fail(res, 400, "Titulo y autor son obligatorios.");
    let portadaUrl = null;
    if (req.file) {
      portadaUrl = "/uploads/" + req.file.filename;
    } else if (req.body.portada_base64) {
      const base64Data = req.body.portada_base64.replace(/^data:image\/\w+;base64,/, "");
      const filename   = Date.now() + "-portada.jpg";
      fs.writeFileSync(path.join(uploadsDir, filename), Buffer.from(base64Data, "base64"));
      portadaUrl = "/uploads/" + filename;
    }
    const cnt   = (await get("SELECT COUNT(*) AS n FROM libros")).n;
    const color = COLORS[cnt % COLORS.length];
    const id    = Date.now().toString();
    await run(
      "INSERT INTO libros (id,titulo,autor,categoria,anio,descripcion,enlace,disponible,portada,color,destacado) VALUES (?,?,?,?,?,?,?,?,?,?,0)",
      [id, titulo.trim(), autor.trim(), categoria || null, anio || null, (descripcion||"").trim(), (enlace||"").trim(), disponible === "true" || disponible === true ? 1 : 0, portadaUrl, color]
    );
    return ok(res, await get("SELECT * FROM libros WHERE id = ?", [id]), 201);
  } catch (err) { console.error("[POST /api/libros]", err.message); return fail(res, 500, "Error al guardar el libro."); }
});

app.post("/api/libros/:id/pdf", uploadPdf.single("pdf"), async (req, res) => {
  try {
    const row = await get("SELECT id FROM libros WHERE id = ?", [req.params.id]);
    if (!row)     return fail(res, 404, "Libro no encontrado.");
    if (!req.file) return fail(res, 400, "No se recibio ningun PDF.");
    const pdfUrl = "/uploads/pdfs/" + req.file.filename;
    await run("UPDATE libros SET enlace = ? WHERE id = ?", [pdfUrl, req.params.id]);
    return ok(res, await get("SELECT * FROM libros WHERE id = ?", [req.params.id]));
  } catch (err) { return fail(res, 500, "Error al subir el PDF."); }
});

app.put("/api/libros/:id", uploadCover.single("portada"), async (req, res) => {
  try {
    const existing = await get("SELECT * FROM libros WHERE id = ?", [req.params.id]);
    if (!existing) return fail(res, 404, "Libro no encontrado.");
    const { titulo, autor, categoria, anio, descripcion, enlace, disponible, destacado } = req.body;
    let portadaUrl = existing.portada;
    if (req.file) {
      portadaUrl = "/uploads/" + req.file.filename;
    } else if (req.body.portada_base64) {
      const base64Data = req.body.portada_base64.replace(/^data:image\/\w+;base64,/, "");
      const filename   = Date.now() + "-portada.jpg";
      fs.writeFileSync(path.join(uploadsDir, filename), Buffer.from(base64Data, "base64"));
      portadaUrl = "/uploads/" + filename;
    }
    await run(
      `UPDATE libros SET
        titulo      = COALESCE(?,titulo), autor       = COALESCE(?,autor),
        categoria   = COALESCE(?,categoria), anio     = COALESCE(?,anio),
        descripcion = COALESCE(?,descripcion), enlace = COALESCE(?,enlace),
        disponible  = COALESCE(?,disponible), destacado = COALESCE(?,destacado),
        portada = ? WHERE id = ?`,
      [titulo?titulo.trim():null, autor?autor.trim():null, categoria||null, anio||null,
       descripcion!==undefined?descripcion.trim():null, enlace!==undefined?enlace.trim():null,
       disponible!==undefined?(disponible==="true"||disponible===true?1:0):null,
       destacado!==undefined?(destacado==="true"||destacado===true?1:0):null,
       portadaUrl, req.params.id]
    );
    return ok(res, await get("SELECT * FROM libros WHERE id = ?", [req.params.id]));
  } catch (err) { return fail(res, 500, "Error al actualizar el libro."); }
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
  try { return ok(res, await all("SELECT id,nombre,email,plan,plan_expiry,creado_en FROM usuarios ORDER BY creado_en DESC")); }
  catch (err) { return fail(res, 500, "Error al obtener usuarios."); }
});

app.post("/api/usuarios/registro", async (req, res) => {
  try {
    const { nombre, email, password } = req.body;
    if (!nombre || !email || !password) return fail(res, 400, "Nombre, correo y contrasena son obligatorios.");
    if (!email.toLowerCase().endsWith("@gmail.com")) return fail(res, 400, "Solo se aceptan correos @gmail.com.");
    const exists = await get("SELECT id FROM usuarios WHERE email = ?", [email.toLowerCase()]);
    if (exists) return fail(res, 409, "Ese correo ya esta registrado.");
    await run("INSERT INTO usuarios (nombre,email,password,plan) VALUES (?,?,?,'free')", [nombre.trim(), email.toLowerCase(), password]);
    return ok(res, { message: "Usuario registrado correctamente." }, 201);
  } catch (err) { return fail(res, 500, "Error al registrar usuario."); }
});

app.post("/api/usuarios/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return fail(res, 400, "Correo y contrasena son obligatorios.");
    const user = await get("SELECT * FROM usuarios WHERE email = ? AND password = ?", [email.toLowerCase(), password]);
    if (!user) return fail(res, 401, "Correo o contrasena incorrectos.");
    if (user.plan !== "free" && user.plan_expiry && Date.now() > user.plan_expiry) {
      await run("UPDATE usuarios SET plan='free', plan_expiry=NULL WHERE id=?", [user.id]);
      user.plan = "free"; user.plan_expiry = null;
    }
    return ok(res, { id: user.id, nombre: user.nombre, email: user.email, plan: user.plan, planExpiry: user.plan_expiry });
  } catch (err) { return fail(res, 500, "Error al iniciar sesion."); }
});

app.put("/api/usuarios/:id/plan", async (req, res) => {
  try {
    const { plan } = req.body;
    const planDays = { free: null, silver: 21, diamond: 30 };
    if (!Object.keys(planDays).includes(plan)) return fail(res, 400, "Plan invalido.");
    const days   = planDays[plan];
    const expiry = days ? Date.now() + days * 86400000 : null;
    await run("UPDATE usuarios SET plan=?, plan_expiry=? WHERE id=?", [plan, expiry, req.params.id]);
    return ok(res, { message: "Plan actualizado." });
  } catch (err) { return fail(res, 500, "Error al actualizar el plan."); }
});

// =============================================================================
// ADMINISTRADORES
// =============================================================================
app.post("/api/admin/login", async (req, res) => {
  try {
    const { usuario, password } = req.body;
    if (!usuario || !password) return fail(res, 400, "Usuario y contrasena son obligatorios.");
    const admin = await get("SELECT * FROM administradores WHERE usuario=? AND password=? AND activo=1", [usuario.toLowerCase().trim(), password]);
    if (!admin) return fail(res, 401, "Usuario o contrasena incorrectos.");
    return ok(res, { id: admin.id, nombre: admin.nombre, apellidos: admin.apellidos, usuario: admin.usuario });
  } catch (err) { return fail(res, 500, "Error al iniciar sesion."); }
});

// =============================================================================
// RESENAS
// =============================================================================
app.get("/api/resenas", async (req, res) => {
  try {
    const { libroId } = req.query;
    let sql = "SELECT * FROM resenas", params = [];
    if (libroId) { sql += " WHERE libro_id = ?"; params.push(libroId); }
    sql += " ORDER BY fecha DESC";
    return ok(res, await all(sql, params));
  } catch (err) { return fail(res, 500, "Error al obtener resenas."); }
});

app.post("/api/resenas", async (req, res) => {
  try {
    const { libro_id, user_email, nombre, calificacion, texto } = req.body;
    if (!libro_id || !user_email || !calificacion) return fail(res, 400, "Datos incompletos.");
    await run(
      `INSERT INTO resenas (libro_id,user_email,nombre,calificacion,texto,fecha) VALUES (?,?,?,?,?,?)
       ON CONFLICT(libro_id,user_email) DO UPDATE SET calificacion=excluded.calificacion, texto=excluded.texto, fecha=excluded.fecha`,
      [libro_id, user_email, nombre, calificacion, texto || "", Date.now()]
    );
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
    await run("INSERT INTO historial_lecturas (user_email,libro_id,leido_en) VALUES (?,?,?)", [user_email, libro_id, Date.now()]);
    return ok(res, { message: "Lectura registrada." }, 201);
  } catch (err) { return fail(res, 500, "Error al registrar lectura."); }
});

app.get("/api/historial/:email", async (req, res) => {
  try {
    const rows = await all(
      `SELECT h.*, l.titulo, l.autor, l.portada, l.color FROM historial_lecturas h
       JOIN libros l ON h.libro_id = l.id WHERE h.user_email = ? ORDER BY h.leido_en DESC LIMIT 50`,
      [req.params.email]
    );
    return ok(res, rows);
  } catch (err) { return fail(res, 500, "Error al obtener historial."); }
});

// =============================================================================
// ESTADISTICAS
// =============================================================================
app.get("/api/stats", async (_req, res) => {
  try {
    const total_libros       = (await get("SELECT COUNT(*) AS n FROM libros")).n;
    const total_usuarios     = (await get("SELECT COUNT(*) AS n FROM usuarios")).n;
    const total_lecturas     = (await get("SELECT COUNT(*) AS n FROM historial_lecturas")).n;
    const total_resenas      = (await get("SELECT COUNT(*) AS n FROM resenas")).n;
    const libros_disponibles = (await get("SELECT COUNT(*) AS n FROM libros WHERE disponible=1")).n;
    const top_libros = await all(
      `SELECT l.id,l.titulo,l.autor,l.portada,l.color,COUNT(h.id) AS lecturas
       FROM historial_lecturas h JOIN libros l ON h.libro_id=l.id
       GROUP BY h.libro_id ORDER BY lecturas DESC LIMIT 5`
    );
    return ok(res, { total_libros, total_usuarios, total_lecturas, total_resenas, libros_disponibles, top_libros });
  } catch (err) { return fail(res, 500, "Error al obtener estadisticas."); }
});

app.listen(PORT, () => {
  console.log(`[Server] Virtual Library corriendo en http://localhost:${PORT}`);
});
