// server.js — API REST para Virtual Library (MySQL + Express)
"use strict";

require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const path    = require("path");
const fs      = require("fs");
const multer  = require("multer");
const db      = require("./db");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Sirve el frontend desde la raiz del proyecto
app.use(express.static(path.join(__dirname, "..")));

// Sirve archivos subidos (portadas, PDFs)
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/uploads", express.static(uploadsDir));

// ── Multer: portadas ───────────────────────────────────────────────────────────
const coverStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename:    (_req, file, cb) => {
    const name = Date.now() + "-" + Math.round(Math.random() * 1e6);
    cb(null, name + path.extname(file.originalname));
  }
});
const uploadCover = multer({
  storage:    coverStorage,
  limits:     { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    cb(null, allowed.includes(file.mimetype));
  }
});

// ── Multer: PDFs ───────────────────────────────────────────────────────────────
const pdfDir = path.join(uploadsDir, "pdfs");
if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

const pdfStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, pdfDir),
  filename:    (_req, file, cb) => {
    const name = Date.now() + "-" + Math.round(Math.random() * 1e6);
    cb(null, name + ".pdf");
  }
});
const uploadPdf = multer({
  storage:    pdfStorage,
  limits:     { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, file.mimetype === "application/pdf");
  }
});

// ── Helper de respuestas ───────────────────────────────────────────────────────
function ok(res, data, status = 200) {
  return res.status(status).json({ ok: true, data });
}
function fail(res, status, message) {
  return res.status(status).json({ ok: false, error: message });
}

// ── Colores por defecto para libros sin portada ────────────────────────────────
const COLORS = ["#1f8a70", "#2d6cdf", "#d75a4a", "#7c3aed", "#b7791f", "#0f766e"];

// =============================================================================
// LIBROS
// =============================================================================

// GET /api/books
app.get("/api/books", async (req, res) => {
  try {
    const { search, category, sort } = req.query;
    let sql    = "SELECT * FROM books";
    const params = [];
    const where  = [];

    if (search) {
      where.push("(title LIKE ? OR author LIKE ? OR category LIKE ?)");
      const like = `%${search}%`;
      params.push(like, like, like);
    }
    if (category && category !== "Todas") {
      where.push("category = ?");
      params.push(category);
    }
    if (where.length) sql += " WHERE " + where.join(" AND ");

    const sortMap = { title: "title ASC", author: "author ASC", year: "year DESC" };
    sql += " ORDER BY featured DESC, " + (sortMap[sort] || "title ASC");

    const [rows] = await db.query(sql, params);
    return ok(res, rows);
  } catch (err) {
    console.error("[GET /api/books]", err.message);
    return fail(res, 500, "Error al obtener libros.");
  }
});

// GET /api/books/:id
app.get("/api/books/:id", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM books WHERE id = ?", [req.params.id]);
    if (!rows.length) return fail(res, 404, "Libro no encontrado.");
    return ok(res, rows[0]);
  } catch (err) {
    return fail(res, 500, "Error al obtener el libro.");
  }
});

// POST /api/books  (con portada opcional y PDF opcional)
app.post("/api/books", uploadCover.single("cover"), async (req, res) => {
  try {
    const { title, author, category, year, description, link, available } = req.body;
    if (!title || !author || !category)
      return fail(res, 400, "Titulo, autor y categoria son obligatorios.");

    // Portada
    let coverUrl = null;
    if (req.file) {
      coverUrl = "/uploads/" + req.file.filename;
    } else if (req.body.cover_base64) {
      const base64Data = req.body.cover_base64.replace(/^data:image\/\w+;base64,/, "");
      const filename   = Date.now() + "-cover.jpg";
      fs.writeFileSync(path.join(uploadsDir, filename), Buffer.from(base64Data, "base64"));
      coverUrl = "/uploads/" + filename;
    }

    // Color automatico
    const [[{ n }]] = await db.query("SELECT COUNT(*) AS n FROM books");
    const color = COLORS[n % COLORS.length];

    const isAvailable = available === "true" || available === true || available === 1 ? 1 : 0;

    const [result] = await db.query(
      `INSERT INTO books (title, author, category, year, description, link, available, cover, color, featured)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        title.trim(), author.trim(), category,
        year || new Date().getFullYear(),
        (description || "").trim(),
        (link || "").trim(),
        isAvailable, coverUrl, color
      ]
    );
    const [[newBook]] = await db.query("SELECT * FROM books WHERE id = ?", [result.insertId]);
    return ok(res, newBook, 201);
  } catch (err) {
    console.error("[POST /api/books]", err.message);
    return fail(res, 500, "Error al guardar el libro.");
  }
});

// POST /api/books/:id/pdf  — sube un PDF al servidor
app.post("/api/books/:id/pdf", uploadPdf.single("pdf"), async (req, res) => {
  try {
    const [rows] = await db.query("SELECT id FROM books WHERE id = ?", [req.params.id]);
    if (!rows.length) return fail(res, 404, "Libro no encontrado.");
    if (!req.file)    return fail(res, 400, "No se recibio ningun archivo PDF.");

    const pdfUrl = "/uploads/pdfs/" + req.file.filename;
    await db.query("UPDATE books SET link = ?, updated_at = NOW() WHERE id = ?", [pdfUrl, req.params.id]);
    const [[updated]] = await db.query("SELECT * FROM books WHERE id = ?", [req.params.id]);
    return ok(res, updated);
  } catch (err) {
    console.error("[POST /api/books/:id/pdf]", err.message);
    return fail(res, 500, "Error al subir el PDF.");
  }
});

// PUT /api/books/:id
app.put("/api/books/:id", uploadCover.single("cover"), async (req, res) => {
  try {
    const { id } = req.params;
    const [[existing]] = await db.query("SELECT * FROM books WHERE id = ?", [id]);
    if (!existing) return fail(res, 404, "Libro no encontrado.");

    const { title, author, category, year, description, link, available, featured } = req.body;

    let coverUrl = existing.cover;
    if (req.file) {
      coverUrl = "/uploads/" + req.file.filename;
    } else if (req.body.cover_base64) {
      const base64Data = req.body.cover_base64.replace(/^data:image\/\w+;base64,/, "");
      const filename   = Date.now() + "-cover.jpg";
      fs.writeFileSync(path.join(uploadsDir, filename), Buffer.from(base64Data, "base64"));
      coverUrl = "/uploads/" + filename;
    }

    await db.query(
      `UPDATE books SET
        title       = COALESCE(?, title),
        author      = COALESCE(?, author),
        category    = COALESCE(?, category),
        year        = COALESCE(?, year),
        description = COALESCE(?, description),
        link        = COALESCE(?, link),
        available   = COALESCE(?, available),
        featured    = COALESCE(?, featured),
        cover       = ?,
        updated_at  = NOW()
       WHERE id = ?`,
      [
        title       ? title.trim()       : null,
        author      ? author.trim()      : null,
        category    || null,
        year        || null,
        description !== undefined ? description.trim() : null,
        link        !== undefined ? link.trim()        : null,
        available   !== undefined ? (available === "true" || available === true || available === 1 ? 1 : 0) : null,
        featured    !== undefined ? (featured  === "true" || featured  === true || featured  === 1 ? 1 : 0) : null,
        coverUrl, id
      ]
    );
    const [[updated]] = await db.query("SELECT * FROM books WHERE id = ?", [id]);
    return ok(res, updated);
  } catch (err) {
    console.error("[PUT /api/books/:id]", err.message);
    return fail(res, 500, "Error al actualizar el libro.");
  }
});

// DELETE /api/books/:id
app.delete("/api/books/:id", async (req, res) => {
  try {
    const [[row]] = await db.query("SELECT * FROM books WHERE id = ?", [req.params.id]);
    if (!row) return fail(res, 404, "Libro no encontrado.");

    // Borrar portada del disco si existe
    if (row.cover && row.cover.startsWith("/uploads/")) {
      const fp = path.join(uploadsDir, path.basename(row.cover));
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    // Borrar PDF del disco si es local
    if (row.link && row.link.startsWith("/uploads/pdfs/")) {
      const fp = path.join(pdfDir, path.basename(row.link));
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }

    await db.query("DELETE FROM books WHERE id = ?", [req.params.id]);
    return ok(res, { message: "Libro eliminado." });
  } catch (err) {
    return fail(res, 500, "Error al eliminar el libro.");
  }
});

// PATCH /api/books/:id/featured
app.patch("/api/books/:id/featured", async (req, res) => {
  try {
    const [[row]] = await db.query("SELECT featured FROM books WHERE id = ?", [req.params.id]);
    if (!row) return fail(res, 404, "Libro no encontrado.");
    const newVal = row.featured ? 0 : 1;
    await db.query("UPDATE books SET featured = ? WHERE id = ?", [newVal, req.params.id]);
    return ok(res, { featured: newVal });
  } catch (err) {
    return fail(res, 500, "Error al actualizar destacado.");
  }
});

// PATCH /api/books/:id/favorite
app.patch("/api/books/:id/favorite", async (req, res) => {
  try {
    const [[row]] = await db.query("SELECT favorite FROM books WHERE id = ?", [req.params.id]);
    if (!row) return fail(res, 404, "Libro no encontrado.");
    const newVal = row.favorite ? 0 : 1;
    await db.query("UPDATE books SET favorite = ? WHERE id = ?", [newVal, req.params.id]);
    return ok(res, { favorite: newVal });
  } catch (err) {
    return fail(res, 500, "Error al actualizar favorito.");
  }
});

// =============================================================================
// CATEGORIAS
// =============================================================================

app.get("/api/categories", async (_req, res) => {
  try {
    const [rows] = await db.query("SELECT name FROM categories ORDER BY name ASC");
    return ok(res, rows.map(r => r.name));
  } catch (err) {
    return fail(res, 500, "Error al obtener categorias.");
  }
});

app.post("/api/categories", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return fail(res, 400, "El nombre de la categoria es obligatorio.");
    const [[exists]] = await db.query("SELECT id FROM categories WHERE name = ?", [name.trim()]);
    if (exists) return fail(res, 409, "Esa categoria ya existe.");
    await db.query("INSERT INTO categories (name) VALUES (?)", [name.trim()]);
    return ok(res, { message: "Categoria agregada." }, 201);
  } catch (err) {
    return fail(res, 500, "Error al agregar la categoria.");
  }
});

app.delete("/api/categories/:name", async (req, res) => {
  try {
    await db.query("DELETE FROM categories WHERE name = ?", [req.params.name]);
    return ok(res, { message: "Categoria eliminada." });
  } catch (err) {
    return fail(res, 500, "Error al eliminar la categoria.");
  }
});

// =============================================================================
// USUARIOS
// =============================================================================

// GET /api/users  — solo para el admin
app.get("/api/users", async (_req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, name, email, plan, plan_expiry, created_at FROM users ORDER BY created_at DESC"
    );
    return ok(res, rows);
  } catch (err) {
    return fail(res, 500, "Error al obtener usuarios.");
  }
});

// POST /api/users/register
app.post("/api/users/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return fail(res, 400, "Nombre, correo y contrasena son obligatorios.");
    if (!email.toLowerCase().endsWith("@gmail.com"))
      return fail(res, 400, "Solo se aceptan correos @gmail.com.");
    if (password.length < 6)
      return fail(res, 400, "La contrasena debe tener minimo 6 caracteres.");

    const [[exists]] = await db.query("SELECT id FROM users WHERE email = ?", [email.toLowerCase()]);
    if (exists) return fail(res, 409, "Ese correo ya esta registrado.");

    await db.query(
      "INSERT INTO users (name, email, password, plan) VALUES (?, ?, ?, 'free')",
      [name.trim(), email.toLowerCase(), password]
    );
    return ok(res, { message: "Usuario registrado correctamente." }, 201);
  } catch (err) {
    console.error("[POST /api/users/register]", err.message);
    return fail(res, 500, "Error al registrar usuario.");
  }
});

// POST /api/users/login
app.post("/api/users/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return fail(res, 400, "Correo y contrasena son obligatorios.");

    const [[user]] = await db.query(
      "SELECT id, name, email, plan, plan_expiry FROM users WHERE email = ? AND password = ?",
      [email.toLowerCase(), password]
    );
    if (!user) return fail(res, 401, "Correo o contrasena incorrectos.");

    // Verificar si el plan expiro
    if (user.plan !== "free" && user.plan_expiry && new Date() > new Date(user.plan_expiry)) {
      await db.query("UPDATE users SET plan = 'free', plan_expiry = NULL WHERE id = ?", [user.id]);
      user.plan       = "free";
      user.plan_expiry = null;
    }

    return ok(res, {
      id:         user.id,
      name:       user.name,
      email:      user.email,
      plan:       user.plan,
      planExpiry: user.plan_expiry
    });
  } catch (err) {
    console.error("[POST /api/users/login]", err.message);
    return fail(res, 500, "Error al iniciar sesion.");
  }
});

// PUT /api/users/:id/plan
app.put("/api/users/:id/plan", async (req, res) => {
  try {
    const { plan } = req.body;
    const planDays = { free: null, silver: 21, diamond: 30 };
    if (!Object.keys(planDays).includes(plan))
      return fail(res, 400, "Plan invalido. Opciones: free, silver, diamond.");

    const days   = planDays[plan];
    const expiry = days ? new Date(Date.now() + days * 86400000) : null;
    await db.query("UPDATE users SET plan = ?, plan_expiry = ? WHERE id = ?", [plan, expiry, req.params.id]);
    return ok(res, { message: "Plan actualizado." });
  } catch (err) {
    return fail(res, 500, "Error al actualizar el plan.");
  }
});

// =============================================================================
// RESENAS
// =============================================================================

app.get("/api/reviews", async (req, res) => {
  try {
    const { bookId } = req.query;
    let sql    = "SELECT r.*, u.name AS user_name FROM reviews r JOIN users u ON r.user_id = u.id";
    const params = [];
    if (bookId) { sql += " WHERE r.book_id = ?"; params.push(bookId); }
    sql += " ORDER BY r.created_at DESC";
    const [rows] = await db.query(sql, params);
    return ok(res, rows);
  } catch (err) {
    return fail(res, 500, "Error al obtener resenas.");
  }
});

app.post("/api/reviews", async (req, res) => {
  try {
    const { book_id, user_id, rating, text } = req.body;
    if (!book_id || !user_id || !rating) return fail(res, 400, "Datos incompletos.");
    if (rating < 1 || rating > 5)         return fail(res, 400, "El rating debe ser entre 1 y 5.");

    await db.query(
      `INSERT INTO reviews (book_id, user_id, rating, text)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE rating = VALUES(rating), text = VALUES(text), created_at = NOW()`,
      [book_id, user_id, rating, text || ""]
    );
    return ok(res, { message: "Resena guardada." }, 201);
  } catch (err) {
    console.error("[POST /api/reviews]", err.message);
    return fail(res, 500, "Error al guardar la resena.");
  }
});

// =============================================================================
// HISTORIAL DE LECTURA
// =============================================================================

app.post("/api/history", async (req, res) => {
  try {
    const { user_id, book_id } = req.body;
    if (!user_id || !book_id) return fail(res, 400, "user_id y book_id son obligatorios.");
    await db.query("INSERT INTO reading_history (user_id, book_id) VALUES (?, ?)", [user_id, book_id]);
    return ok(res, { message: "Lectura registrada." }, 201);
  } catch (err) {
    return fail(res, 500, "Error al registrar lectura.");
  }
});

app.get("/api/history/:userId", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT h.*, b.title, b.author, b.cover, b.color
       FROM reading_history h
       JOIN books b ON h.book_id = b.id
       WHERE h.user_id = ?
       ORDER BY h.read_at DESC
       LIMIT 50`,
      [req.params.userId]
    );
    return ok(res, rows);
  } catch (err) {
    return fail(res, 500, "Error al obtener historial.");
  }
});

// =============================================================================
// ESTADISTICAS
// =============================================================================

app.get("/api/stats", async (_req, res) => {
  try {
    const [[{ total_books }]]     = await db.query("SELECT COUNT(*) AS total_books FROM books");
    const [[{ total_users }]]     = await db.query("SELECT COUNT(*) AS total_users FROM users");
    const [[{ total_reads }]]     = await db.query("SELECT COUNT(*) AS total_reads FROM reading_history");
    const [[{ total_reviews }]]   = await db.query("SELECT COUNT(*) AS total_reviews FROM reviews");
    const [[{ available_books }]] = await db.query("SELECT COUNT(*) AS available_books FROM books WHERE available = 1");
    const [[{ favorite_books }]]  = await db.query("SELECT COUNT(*) AS favorite_books FROM books WHERE favorite = 1");

    const [planRows] = await db.query("SELECT plan, COUNT(*) AS cnt FROM users GROUP BY plan");
    const plan_count = { free: 0, silver: 0, diamond: 0 };
    planRows.forEach(p => { plan_count[p.plan] = p.cnt; });

    const [top_books] = await db.query(
      `SELECT b.id, b.title, b.author, b.cover, b.color, COUNT(h.id) AS reads
       FROM reading_history h
       JOIN books b ON h.book_id = b.id
       GROUP BY h.book_id
       ORDER BY reads DESC
       LIMIT 5`
    );

    return ok(res, {
      total_books, total_users, total_reads, total_reviews,
      available_books, favorite_books, plan_count, top_books
    });
  } catch (err) {
    console.error("[GET /api/stats]", err.message);
    return fail(res, 500, "Error al obtener estadisticas.");
  }
});

// =============================================================================
// FALLBACK — sirve index.html para rutas no-API
// =============================================================================
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "index.html"));
});

app.listen(PORT, () => {
  console.log(`[Server] Virtual Library corriendo en http://localhost:${PORT}`);
});
