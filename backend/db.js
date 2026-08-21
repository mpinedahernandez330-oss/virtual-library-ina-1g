// db.js — Conexion SQLite con sqlite3
"use strict";

const sqlite3 = require("sqlite3").verbose();
const path    = require("path");
const fs      = require("fs");

const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new sqlite3.Database(path.join(dataDir, "library.db"), err => {
  if (err) { console.error("[DB] Error al conectar:", err.message); process.exit(1); }
  console.log("[DB] SQLite conectado -> backend/data/library.db");
});

// Activar foreign keys
db.run("PRAGMA foreign_keys = ON");
db.run("PRAGMA journal_mode = WAL");

// Helper: ejecutar una query que no devuelve filas
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

// Helper: obtener una sola fila
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Helper: obtener multiples filas
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Crear tablas e insertar datos iniciales
async function init() {
  await run(`CREATE TABLE IF NOT EXISTS administradores (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre    TEXT    NOT NULL,
    apellidos TEXT    NOT NULL,
    usuario   TEXT    NOT NULL UNIQUE,
    password  TEXT    NOT NULL,
    activo    INTEGER NOT NULL DEFAULT 1
  )`);

  await run(`CREATE TABLE IF NOT EXISTS categorias (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT    NOT NULL UNIQUE
  )`);

  await run(`CREATE TABLE IF NOT EXISTS usuarios (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre      TEXT    NOT NULL,
    email       TEXT    NOT NULL UNIQUE,
    password    TEXT    NOT NULL,
    plan        TEXT    NOT NULL DEFAULT 'free',
    plan_expiry INTEGER DEFAULT NULL,
    creado_en   TEXT    NOT NULL DEFAULT (datetime('now'))
  )`);

  await run(`CREATE TABLE IF NOT EXISTS libros (
    id          TEXT    PRIMARY KEY,
    titulo      TEXT    NOT NULL,
    autor       TEXT    NOT NULL,
    categoria   TEXT    DEFAULT NULL,
    anio        INTEGER DEFAULT NULL,
    descripcion TEXT    DEFAULT NULL,
    enlace      TEXT    DEFAULT NULL,
    disponible  INTEGER NOT NULL DEFAULT 1,
    portada     TEXT    DEFAULT NULL,
    color       TEXT    DEFAULT '#1f8a70',
    favorito    INTEGER NOT NULL DEFAULT 0,
    destacado   INTEGER NOT NULL DEFAULT 0,
    creado_en   TEXT    NOT NULL DEFAULT (datetime('now'))
  )`);

  await run(`CREATE TABLE IF NOT EXISTS resenas (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    libro_id     TEXT    NOT NULL,
    user_email   TEXT    NOT NULL,
    nombre       TEXT    NOT NULL,
    calificacion INTEGER NOT NULL DEFAULT 5,
    texto        TEXT    DEFAULT NULL,
    fecha        INTEGER NOT NULL,
    UNIQUE (libro_id, user_email)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS historial_lecturas (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT    NOT NULL,
    libro_id   TEXT    NOT NULL,
    leido_en   INTEGER NOT NULL
  )`);

  // Datos iniciales
  const adminCount = await get("SELECT COUNT(*) AS n FROM administradores");
  if (adminCount.n === 0) {
    const admins = [
      ["Jose David",      "Maravilla Pena",      "jose david maravilla pena",       "0310223542"],
      ["Josue Nahum",     "Villanueva Mendoza",   "josue nahum villanueva mendoza",   "0310223542"],
      ["Brayan Alexander","Garcia Fernandez",     "brayan alexander garcia fernandez","0310223542"],
      ["Miguel Antonio",  "Pineda Hernandez",     "miguel antonio pineda hernandez",  "0310223542"]
    ];
    for (const a of admins) await run("INSERT OR IGNORE INTO administradores (nombre,apellidos,usuario,password) VALUES (?,?,?,?)", a);
  }

  const catCount = await get("SELECT COUNT(*) AS n FROM categorias");
  if (catCount.n === 0) {
    for (const c of ["Programacion","Literatura","Ciencia","Historia","Matematicas","Arte","Filosofia"])
      await run("INSERT OR IGNORE INTO categorias (nombre) VALUES (?)", [c]);
  }

  const userCount = await get("SELECT COUNT(*) AS n FROM usuarios");
  if (userCount.n === 0) {
    await run("INSERT OR IGNORE INTO usuarios (nombre,email,password,plan) VALUES (?,?,?,?)", ["Estudiante Demo",  "demo@gmail.com",    "123456","free"]);
    await run("INSERT OR IGNORE INTO usuarios (nombre,email,password,plan) VALUES (?,?,?,?)", ["Usuario Plata",    "plata@gmail.com",   "123456","silver"]);
    await run("INSERT OR IGNORE INTO usuarios (nombre,email,password,plan) VALUES (?,?,?,?)", ["Usuario Diamante", "diamante@gmail.com","123456","diamond"]);
  }

  const libroCount = await get("SELECT COUNT(*) AS n FROM libros");
  if (libroCount.n === 0) {
    const libros = [
      ["1","Pinocho",                  "Carlo Collodi",            "Literatura",   1883,"La historia del muneco de madera.","#2d6cdf",1,1],
      ["2","Cenicienta",               "Charles Perrault",         "Literatura",   1697,"El cuento de la joven bondadosa.",  "#d75a4a",1,1],
      ["3","Blancanieves",             "Hermanos Grimm",           "Literatura",   1812,"Una princesa huye de su malvada madrastra.","#7c3aed",1,0],
      ["4","La Bella Durmiente",       "Charles Perrault",         "Literatura",   1697,"Una princesa cae en un sueno profundo.","#b7791f",1,0],
      ["5","La Caperucita Roja",       "Hermanos Grimm",           "Literatura",   1812,"Una nina valiente enfrenta al lobo feroz.","#0f766e",1,0],
      ["6","El Principito",            "Antoine de Saint-Exupery", "Literatura",   1943,"Un joven principe viaja por el universo.","#1f8a70",1,1],
      ["7","Codigo Limpio",            "Robert C. Martin",         "Programacion", 2008,"Buenas practicas para programar.","#1f8a70",1,0],
      ["8","Breve Historia del Tiempo","Stephen Hawking",          "Ciencia",      1988,"Un recorrido por el universo.","#b7791f",1,0],
      ["9","El Diario de Ana Frank",   "Ana Frank",                "Historia",     1947,"Testimonio de una joven en la Segunda Guerra Mundial.","#d75a4a",1,0],
      ["10","Don Quijote de la Mancha","Miguel de Cervantes",      "Literatura",   1605,"Las aventuras del caballero andante.","#2d6cdf",1,0]
    ];
    for (const l of libros)
      await run("INSERT INTO libros (id,titulo,autor,categoria,anio,descripcion,color,disponible,destacado) VALUES (?,?,?,?,?,?,?,?,?)", l);
  }
}

init().catch(err => console.error("[DB] Error al inicializar:", err.message));

module.exports = { run, get, all };
