// db.js — Conexion a MySQL usando mysql2/promise
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

// Verifica la conexion al arrancar
pool.getConnection()
  .then(conn => {
    console.log("[DB] MySQL conectado -> " + process.env.DB_NAME);
    conn.release();
  })
  .catch(err => {
    console.error("[DB] Error al conectar con MySQL:", err.message);
    console.error("     Asegurate de que Laragon este corriendo y la BD exista.");
    process.exit(1);
  });

module.exports = pool;
