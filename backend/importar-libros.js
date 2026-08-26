// importar-libros.js — Importa los libros del array antiguo a MySQL
// USO:
//   1. Copia los PDFs a: backend/uploads/pdfs/
//   2. Ejecuta: node importar-libros.js
// ============================================================================
"use strict";

require("dotenv").config();
const { pool } = require("./db");
const path      = require("path");
const fs        = require("fs");

// ── Carpeta donde deben estar los PDFs ───────────────────────────────────────
const PDF_DIR = path.join(__dirname, "uploads", "pdfs");

// ── Lista de libros a importar ───────────────────────────────────────────────
// Pon aquí el nombre exacto del archivo PDF tal como lo copiaste a uploads/pdfs/
const LIBROS = [
  {
    id:          "accion-1",
    titulo:      "Cantar de Roldán",
    autor:       "Anónimo",
    categoria:   "Literatura",
    anio:        1100,
    descripcion: "Cantar de gesta clásico de la literatura francesa medieval.",
    pdf:         "Cantar de Roldan.pdf",   // <-- nombre del archivo en uploads/pdfs/
    color:       "#2d6cdf",
    disponible:  1,
    destacado:   0
  },
  {
    id:          "accion-2",
    titulo:      "El viejo y el mar",
    autor:       "Ernest Hemingway",
    categoria:   "Literatura",
    anio:        1952,
    descripcion: "La heroica lucha de un viejo pescador cubano contra la naturaleza.",
    pdf:         "El viejo y el mar.pdf",
    color:       "#0f766e",
    disponible:  1,
    destacado:   1
  },
  {
    id:          "accion-3",
    titulo:      "Por quién doblan las campanas",
    autor:       "Ernest Hemingway",
    categoria:   "Literatura",
    anio:        1940,
    descripcion: "Clásico de la literatura bélica ambientado en la Guerra Civil Española.",
    pdf:         "Por quien Doblan las campanas.pdf",
    color:       "#d75a4a",
    disponible:  1,
    destacado:   0
  },
  {
    id:          "accion-4",
    titulo:      "La Ilíada",
    autor:       "Homero",
    categoria:   "Literatura",
    anio:        -800,
    descripcion: "Epopeya griega antigua sobre la cólera de Aquiles y la guerra de Troya.",
    pdf:         "La Iliada.pdf",
    color:       "#7c3aed",
    disponible:  1,
    destacado:   1
  },
  {
    id:          "accion-5",
    titulo:      "Odisea",
    autor:       "Homero",
    categoria:   "Literatura",
    anio:        -700,
    descripcion: "El largo y peligroso viaje de regreso de Odiseo a su patria Ítaca.",
    pdf:         "Odisea.pdf",
    color:       "#b7791f",
    disponible:  1,
    destacado:   0
  },
  {
    id:          "accion-6",
    titulo:      "La Eneida",
    autor:       "Virgilio",
    categoria:   "Literatura",
    anio:        -19,
    descripcion: "Epopeya latina que narra los viajes del héroe troyano Eneas.",
    pdf:         "La Eneida.pdf",
    color:       "#1f8a70",
    disponible:  1,
    destacado:   0
  },
  {
    id:          "accion-7",
    titulo:      "El Señor de las Moscas",
    autor:       "William Golding",
    categoria:   "Literatura",
    anio:        1954,
    descripcion: "Fábula moral sobre la condición humana y la pérdida de la inocencia.",
    pdf:         "El Senor de las Moscas.pdf",
    color:       "#2d6cdf",
    disponible:  1,
    destacado:   0
  },
  {
    id:          "accion-8",
    titulo:      "El Zorro",
    autor:       "Isabel Allende",
    categoria:   "Literatura",
    anio:        2005,
    descripcion: "La apasionante historia del nacimiento del legendario héroe.",
    pdf:         "El Zorro - Isabel Allende.pdf",
    color:       "#d75a4a",
    disponible:  1,
    destacado:   0
  }
];

// ── Script principal ─────────────────────────────────────────────────────────
async function importar() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║   Importador de Libros — Virtual Library  ║");
  console.log("╚══════════════════════════════════════════╝\n");

  let insertados = 0;
  let omitidos   = 0;
  let sinPdf     = 0;

  for (const libro of LIBROS) {
    const pdfPath = path.join(PDF_DIR, libro.pdf);
    const enlace  = `/uploads/pdfs/${libro.pdf}`;

    // Verificar si el PDF existe
    const pdfExiste = fs.existsSync(pdfPath);
    if (!pdfExiste) {
      console.warn(`  ⚠  PDF no encontrado: ${libro.pdf}`);
      sinPdf++;
    }

    try {
      // INSERT IGNORE para no duplicar si se corre el script más de una vez
      const [result] = await pool.query(
        `INSERT IGNORE INTO libros
           (id, titulo, autor, categoria, anio, descripcion, enlace, disponible, color, destacado, portada)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
        [
          libro.id,
          libro.titulo,
          libro.autor,
          libro.categoria,
          libro.anio || null,
          libro.descripcion,
          pdfExiste ? enlace : "",   // solo asigna la ruta si el PDF existe
          libro.disponible,
          libro.color,
          libro.destacado
        ]
      );

      if (result.affectedRows > 0) {
        console.log(`  ✓  "${libro.titulo}" insertado correctamente`);
        insertados++;
      } else {
        console.log(`  —  "${libro.titulo}" ya existía, omitido`);
        omitidos++;
      }
    } catch (err) {
      console.error(`  ✗  Error al insertar "${libro.titulo}":`, err.message);
    }
  }

  console.log("\n──────────────────────────────────────────");
  console.log(`  Insertados : ${insertados}`);
  console.log(`  Omitidos   : ${omitidos} (ya existían)`);
  console.log(`  Sin PDF    : ${sinPdf} (copia los archivos a uploads/pdfs/)`);
  console.log("──────────────────────────────────────────\n");

  if (sinPdf > 0) {
    console.log("IMPORTANTE: Los libros sin PDF se insertaron con enlace vacío.");
    console.log("Cuando copies los PDFs, edítalos desde el panel de admin.\n");
  }

  await pool.end();
  console.log("Importación finalizada. Recarga el catálogo en el navegador.");
}

importar().catch(err => {
  console.error("Error fatal:", err.message);
  process.exit(1);
});
