// db.js — Conexion MySQL con mysql2/promise (Laragon/XAMPP)
"use strict";

require("dotenv").config();
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || "127.0.0.1",
  port:               Number(process.env.DB_PORT) || 3306,
  user:               process.env.DB_USER     || "root",
  password:           process.env.DB_PASSWORD || "",
  database:           process.env.DB_NAME     || "virtual_library",
  waitForConnections: true,
  connectionLimit:    10,
  timezone:           "Z"
});

// Verificar conexion al arrancar
pool.getConnection()
  .then(conn => {
    console.log("[DB] MySQL conectado -> virtual_library");
    conn.release();
  })
  .catch(err => {
    console.error("[DB] Error al conectar:", err.message);
    console.error("     Abre Laragon y activa MySQL antes de arrancar.");
    process.exit(1);
  });

// Helper: query que devuelve multiples filas
async function all(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

// Helper: query que devuelve una sola fila
async function get(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows[0] || null;
}

// Helper: INSERT, UPDATE, DELETE
async function run(sql, params = []) {
  const [result] = await pool.query(sql, params);
  return { lastID: result.insertId, changes: result.affectedRows };
}

module.exports = { pool, run, get, all };
