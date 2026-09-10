"use strict";
const { run } = require("./db");

// Correcciones: [titulo_actual_parcial, titulo_correcto, autor_correcto, categoria]
const correcciones = [
  // Acción
  ["virgilio la eneida",              "La Eneida",                         "Virgilio",                 "Acción"],
  ["Cantar de Roldán",                "Cantar de Roldán",                  "Anónimo",                  "Acción"],
  ["isabel allende compress",         "Zorro",                             "Isabel Allende",            "Acción"],
  ["Ernst Hemingway Por quien",       "Por Quién Doblan las Campanas",     "Ernest Hemingway",         "Acción"],
  ["La Ilíada",                       "La Ilíada",                         "Homero",                   "Acción"],
  ["Odisea",                          "La Odisea",                         "Homero",                   "Acción"],
  ["El viejo y el mar",               "El Viejo y el Mar",                 "Ernest Hemingway",         "Acción"],
  // Aventura
  ["ElLlamadoDeLaSelva1",             "El Llamado de la Selva",            "Jack London",              "Aventura"],
  ["LaVueltaAlMundoEn80Dias",         "La Vuelta al Mundo en 80 Días",     "Julio Verne",              "Aventura"],
  ["ViajeAlCentroDeLaTierra",         "Viaje al Centro de la Tierra",      "Julio Verne",              "Aventura"],
  ["Herman Melville",                 "Moby Dick",                         "Herman Melville",          "Aventura"],
  ["robinson crusoe",                 "Robinson Crusoe",                   "Daniel Defoe",             "Aventura"],
  ["ElCorsarioNegro",                 "El Corsario Negro",                 "Emilio Salgari",           "Aventura"],
  ["La isla del tesoro",              "La Isla del Tesoro",                "Robert Louis Stevenson",   "Aventura"],
  // Ciencia Ficción
  ["de la tierra a la luna",          "De la Tierra a la Luna",            "Julio Verne",              "Ciencia Ficción"],
  ["H. G. Wells, el hombre visible",  "El Hombre Invisible",               "H. G. Wells",              "Ciencia Ficción"],
  ["Herbert George Wells La Guerra",  "La Guerra de los Mundos",           "H. G. Wells",              "Ciencia Ficción"],
  ["La isla del doctor moreau",       "La Isla del Doctor Moreau",         "H. G. Wells",              "Ciencia Ficción"],
  ["La máquina del tiempo",           "La Máquina del Tiempo",             "H. G. Wells",              "Ciencia Ficción"],
  ["Cronicas Marcianas",              "Crónicas Marcianas",                "Ray Bradbury",             "Ciencia Ficción"],
  ["lostrescerditos ilustrado",       "Los Tres Cerditos",                 "Anónimo",                  "Ciencia Ficción"],
  ["primeros",                        "Los Primeros Hombres en la Luna",   "H. G. Wells",              "Ciencia Ficción"],
  // Comedia
  ["elcasamientoeng00cerv",           "El Casamiento Engañoso",            "Miguel de Cervantes",      "Comedia"],
  ["elmdicopaloscome1799moli",        "El Médico a Palos",                 "Molière",                  "Comedia"],
  ["elsombrerode00alar",              "El Sombrero de Tres Picos",         "Pedro Alarcón",            "Comedia"],
  ["tartarndetaras00daud",            "Tartarín de Tarascón",              "Alphonse Daudet",          "Comedia"],
  ["las alegres comadres de windsor", "Las Alegres Comadres de Windsor",   "William Shakespeare",      "Comedia"],
  ["Lazarillo de Tormes",             "Lazarillo de Tormes",               "Anónimo",                  "Comedia"],
  // Drama
  ["chejov la gaviota",               "La Gaviota",                        "Antón Chéjov",             "Drama"],
  ["BodasSangre GciaLorca",           "Bodas de Sangre",                   "Federico García Lorca",    "Drama"],
  ["El Tio Vania",                    "El Tío Vania",                      "Antón Chéjov",             "Drama"],
  ["elgranteatrodelm00cald",          "El Gran Teatro del Mundo",          "Calderón de la Barca",     "Drama"],
  ["Yerma",                           "Yerma",                             "Federico García Lorca",    "Drama"],
  ["García Lorca Federico La Casa",   "La Casa de Bernarda Alba",          "Federico García Lorca",    "Drama"],
  ["Casa De Muñecas",                 "Casa de Muñecas",                   "Henrik Ibsen",             "Drama"],
  ["William Shakespeare",             "Macbeth",                           "William Shakespeare",      "Drama"],
  ["Otelo. Biblioteca Tepeyac",       "Otelo",                             "William Shakespeare",      "Drama"],
  // Fantasía
  ["en el pais de las Maravillas",    "Alicia en el País de las Maravillas","Lewis Carroll",           "Fantasía"],
  ["cervantes don quijote",           "Don Quijote de la Mancha",          "Miguel de Cervantes",      "Fantasía"],
  ["Jonathan Swift",                  "Los Viajes de Gulliver",            "Jonathan Swift",           "Fantasía"],
  ["paraiso (1)",                     "El Paraíso Perdido",                "John Milton",              "Fantasía"],
  ["peter pan (1)",                   "Peter Pan",                         "J. M. Barrie",             "Fantasía"],
  ["peter pan",                       "Peter Pan",                         "J. M. Barrie",             "Fantasía"],
  ["El maravilloso Mago de Oz",       "El Maravilloso Mago de Oz",         "L. Frank Baum",            "Fantasía"],
  // Histórico
  ["A Tale of Two Cities",            "Historia de Dos Ciudades",          "Charles Dickens",          "Histórico"],
  ["charles perrault",                "Caperucita Roja",                   "Charles Perrault",         "Histórico"],
  ["download",                        "Sin título",                        "Desconocido",              "Histórico"],
  ["los miserables",                  "Los Miserables",                    "Victor Hugo",              "Histórico"],
  ["mohicano",                        "El Último Mohicano",                "James Fenimore Cooper",    "Histórico"],
  ["vadis",                           "Quo Vadis",                         "Henryk Sienkiewicz",       "Histórico"],
  ["Guerra y Paz",                    "Guerra y Paz",                      "León Tolstói",             "Histórico"],
  ["Ivanhoe",                         "Ivanhoe",                           "Walter Scott",             "Histórico"],
  // Misterio
  ["Fiodor Mijailovich Dostoyevski",  "Crimen y Castigo",                  "Fiodor Dostoyevski",       "Misterio"],
  ["CrimenesCalleMorgue",             "Los Crímenes de la Calle Morgue",   "Edgar Allan Poe",          "Misterio"],
  ["Christie Agatha",                 "Diez Negritos",                     "Agatha Christie",          "Misterio"],
  ["El Proceso",                      "El Proceso",                        "Franz Kafka",              "Misterio"],
  ["EstudioenEscarlata",              "Estudio en Escarlata",              "Arthur Conan Doyle",       "Misterio"],
  ["El escarabajo de oro",            "El Escarabajo de Oro",              "Edgar Allan Poe",          "Misterio"],
  // Romance
  ["Leon Tolstoi",                    "Ana Karenina",                      "León Tolstói",             "Romance"],
  ["colera",                          "El Amor en los Tiempos del Cólera", "Gabriel García Márquez",   "Romance"],
  ["Charlotte Bronte",                "Jane Eyre",                         "Charlotte Brontë",         "Romance"],
  ["William Shakespeare",             "Romeo y Julieta",                   "William Shakespeare",      "Romance"],
  // Suspenso
  ["halc n malt s autor Dashiell",    "El Halcón Maltés",                  "Dashiell Hammett",         "Suspenso"],
  ["el gran gatsby",                  "El Gran Gatsby",                    "F. Scott Fitzgerald",      "Suspenso"],
  ["Dostoyevski Fiodor",              "El Jugador",                        "Fiodor Dostoyevski",       "Suspenso"],
  ["conrad joseph el agente secreto", "El Agente Secreto",                 "Joseph Conrad",            "Suspenso"],
  ["Rebecca rus web",                 "Rebecca",                           "Daphne du Maurier",        "Suspenso"],
  // Terror
  ["CaidaCasaUsher",                  "La Caída de la Casa Usher",         "Edgar Allan Poe",          "Terror"],
  ["CorazonDelator",                  "El Corazón Delator",                "Edgar Allan Poe",          "Terror"],
  ["DraculaDeBramStoker",             "Drácula",                           "Bram Stoker",              "Terror"],
  ["retrato de Dorian Gray",          "El Retrato de Dorian Gray",         "Oscar Wilde",              "Terror"],
  ["ElExtranoCasoDe",                 "El Extraño Caso del Dr. Jekyll",    "R. L. Stevenson",          "Terror"],
  ["el castillo de otranto",          "El Castillo de Otranto",            "Horace Walpole",           "Terror"],
  ["Oscar Wilde",                     "El Fantasma de Canterville",        "Oscar Wilde",              "Terror"],
  ["El horla",                        "El Horla",                          "Guy de Maupassant",        "Terror"],
  ["cuervo poe",                      "El Cuervo",                         "Edgar Allan Poe",          "Terror"],
  // Basura
  ["pldi 09",                         null, null, null], // eliminar
  ["763224",                          null, null, null], // eliminar
  ["773473",                          null, null, null], // eliminar
];

(async () => {
  const { all } = require("./db");
  const libros = await all("SELECT id, titulo FROM libros");

  let actualizados = 0;
  let eliminados   = 0;

  for (const [buscar, titulo, autor, categoria] of correcciones) {
    // Buscar el libro que contenga el texto
    const libro = libros.find(l => l.titulo && l.titulo.toLowerCase().includes(buscar.toLowerCase()));
    if (!libro) continue;

    if (titulo === null) {
      // Eliminar
      await run("DELETE FROM libros WHERE id = ?", [libro.id]);
      console.log(`🗑  Eliminado: ${libro.titulo}`);
      eliminados++;
    } else {
      // Actualizar
      await run("UPDATE libros SET titulo=?, autor=?, categoria=? WHERE id=?",
        [titulo, autor, categoria, libro.id]);
      console.log(`✏️  ${libro.titulo} → ${titulo}`);
      actualizados++;
    }
  }

  console.log(`\n✅ Actualizados: ${actualizados} | 🗑 Eliminados: ${eliminados}`);
  process.exit(0);
})().catch(e => { console.error(e.message); process.exit(1); });
