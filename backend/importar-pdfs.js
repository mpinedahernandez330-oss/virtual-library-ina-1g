"use strict";
// Importa todos los PDFs de uploads/pdfs/ a la tabla libros
const fs   = require("fs");
const path = require("path");
const { run, get, all } = require("./db");

const PDF_BASE = path.join(__dirname, "uploads", "pdfs");
const COLORS   = ["#1f8a70","#2d6cdf","#d75a4a","#7c3aed","#b7791f","#0f766e","#dc2626","#ea580c","#0284c7","#7e22ce"];

// Extrae título y autor del nombre del archivo
function parsearNombre(filename) {
  // Quitar extensión
  let name = filename.replace(/\.pdf$/i, "").trim();

  // Intentar separar "Autor - Titulo" o "Titulo - Autor"
  let titulo = name;
  let autor  = "Desconocido";

  // Patrones: "Apellido Nombre - Titulo" o "Titulo - Apellido Nombre"
  const guion = name.match(/^(.+?)\s*[-–]\s*(.+)$/);
  if (guion) {
    // Heurística: si la primera parte tiene menos palabras → es el autor
    const parte1 = guion[1].trim();
    const parte2 = guion[2].trim();
    if (parte1.split(" ").length <= 3) {
      autor  = parte1;
      titulo = parte2;
    } else {
      titulo = parte1;
      autor  = parte2;
    }
  }

  // Limpiar caracteres raros
  titulo = titulo.replace(/[_\-]+/g, " ").replace(/\s+/g, " ").trim();
  autor  = autor.replace(/[_\-]+/g, " ").replace(/\s+/g, " ").trim();

  return { titulo, autor };
}

// Detecta categoría por nombre de carpeta
function detectarCategoria(carpeta) {
  const map = {
    "Acción":          "Acción",
    "Aventura":        "Aventura",
    "Ciencia Ficción": "Ciencia Ficción",
    "Comedia":         "Comedia",
    "Drama":           "Drama",
    "Fantasía":        "Fantasía",
    "Terror":          "Terror",
    "Romance":         "Romance",
    "Misterio":        "Misterio",
    "Historia":        "Historia",
    "Clásicos":        "Clásicos",
    "Novela":          "Novela",
  };
  return map[carpeta] || carpeta || "Sin categoría";
}

async function importar() {
  // Obtener PDFs ya registrados
  const existentes = await all("SELECT enlace FROM libros WHERE enlace IS NOT NULL");
  const enlacesExistentes = new Set(existentes.map(r => r.enlace));

  let contador   = 0;
  let omitidos   = 0;
  let colorIndex = 0;

  // Recorrer carpetas y archivos
  const items = fs.readdirSync(PDF_BASE);

  for (const item of items) {
    const itemPath = path.join(PDF_BASE, item);
    const stat     = fs.statSync(itemPath);

    if (stat.isDirectory()) {
      // Es una carpeta (categoría)
      const categoria = detectarCategoria(item);
      const archivos  = fs.readdirSync(itemPath).filter(f => f.toLowerCase().endsWith(".pdf"));

      for (const archivo of archivos) {
        const enlace = `/uploads/pdfs/${item}/${archivo}`;
        if (enlacesExistentes.has(enlace)) { omitidos++; continue; }

        const { titulo, autor } = parsearNombre(archivo);
        const id    = Date.now().toString() + Math.floor(Math.random() * 1000);
        const color = COLORS[colorIndex++ % COLORS.length];

        await run(
          "INSERT INTO libros (id,titulo,autor,categoria,enlace,disponible,color,favorito,destacado,access_level) VALUES (?,?,?,?,?,1,?,0,0,'free')",
          [id, titulo, autor, categoria, enlace, color]
        );
        console.log(`✓ [${categoria}] ${titulo}`);
        contador++;
      }

    } else if (item.toLowerCase().endsWith(".pdf")) {
      // PDF en la raíz (sin carpeta)
      const enlace = `/uploads/pdfs/${item}`;
      if (enlacesExistentes.has(enlace)) { omitidos++; continue; }

      const { titulo, autor } = parsearNombre(item);
      const id    = Date.now().toString() + Math.floor(Math.random() * 1000);
      const color = COLORS[colorIndex++ % COLORS.length];

      await run(
        "INSERT INTO libros (id,titulo,autor,categoria,enlace,disponible,color,favorito,destacado,access_level) VALUES (?,?,?,?,?,1,?,0,0,'free')",
        [id, titulo, autor, "Sin categoría", enlace, color]
      );
      console.log(`✓ [Sin categoría] ${titulo}`);
      contador++;
    }
  }

  console.log(`\n✅ Importados: ${contador} libros`);
  console.log(`⏭  Omitidos (ya existían): ${omitidos}`);
  process.exit(0);
}

importar().catch(e => { console.error("Error:", e.message); process.exit(1); });
