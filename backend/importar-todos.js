// importar-todos.js — Importa todos los libros por categoría a MySQL
// USO: node importar-todos.js
"use strict";

require("dotenv").config();
const { pool } = require("./db");
const path = require("path");
const fs   = require("fs");

const BASE = path.join(__dirname, "uploads", "pdfs");

// ── Colores por categoría ─────────────────────────────────────────────────────
const COLORES = {
  "Acción":          "#d75a4a",
  "Aventura":        "#2d6cdf",
  "Ciencia Ficción": "#7c3aed",
  "Comedia":         "#f59e0b",
  "Drama":           "#0f766e",
  "Fantasía":        "#1f8a70",
  "Histórico":       "#b7791f",
  "Misterio":        "#374151",
  "Romance":         "#db2777",
  "Suspenso":        "#6d28d9",
  "Terror":          "#991b1b",
};

// ── Catálogo completo ─────────────────────────────────────────────────────────
const LIBROS = [

  // ── ACCIÓN ──────────────────────────────────────────────────────────────────
  { categoria:"Acción", titulo:"Cantar de Roldán",               autor:"Anónimo",           anio:1100, descripcion:"Cantar de gesta clásico de la literatura francesa medieval.",                                  pdf:"Acción/Anónimo. - Cantar de Roldán [ocr] [G] [1.pdf" },
  { categoria:"Acción", titulo:"El viejo y el mar",              autor:"Ernest Hemingway",  anio:1952, descripcion:"La heroica lucha de un viejo pescador cubano contra la naturaleza.",                          pdf:"Acción/El viejo y el mar.pdf" },
  { categoria:"Acción", titulo:"Por quién doblan las campanas",  autor:"Ernest Hemingway",  anio:1940, descripcion:"Clásico bélico ambientado en la Guerra Civil Española.",                                     pdf:"Acción/Ernst Hemingway   Por quien Doblan las ....pdf" },
  { categoria:"Acción", titulo:"La Ilíada",                      autor:"Homero",            anio:-800, descripcion:"Epopeya griega sobre la cólera de Aquiles y la guerra de Troya.",                           pdf:"Acción/Homero - La Ilíada.pdf" },
  { categoria:"Acción", titulo:"Odisea",                         autor:"Homero",            anio:-700, descripcion:"El largo viaje de regreso de Odiseo a su patria Ítaca.",                                    pdf:"Acción/Odisea.pdf" },
  { categoria:"Acción", titulo:"La Eneida",                      autor:"Virgilio",          anio:-19,  descripcion:"Epopeya latina que narra los viajes del héroe troyano Eneas.",                              pdf:"Acción/virgilio_la_eneida.pdf" },
  { categoria:"Acción", titulo:"El Señor de las Moscas",         autor:"William Golding",   anio:1954, descripcion:"Fábula moral sobre la condición humana y la pérdida de la inocencia.",                      pdf:"Acción/William Golding - El Señor de las Moscas....pdf" },
  { categoria:"Acción", titulo:"El Zorro",                       autor:"Isabel Allende",    anio:2005, descripcion:"La apasionante historia del nacimiento del legendario héroe.",                               pdf:"Acción/zorro-isabel-allende_compress.pdf" },

  // ── AVENTURA ─────────────────────────────────────────────────────────────────
  { categoria:"Aventura", titulo:"Los tres mosqueteros",         autor:"Alejandro Dumas",   anio:1844, descripcion:"Las aventuras de D'Artagnan y sus compañeros al servicio del rey de Francia.",              pdf:"Aventura/Dumas Alejandro - Los tres mosqueteros....pdf" },
  { categoria:"Aventura", titulo:"El conde de Montecristo",      autor:"Alejandro Dumas",   anio:1844, descripcion:"Historia de venganza y justicia de Edmond Dantès.",                                         pdf:"Aventura/El conde de Montecristo.pdf" },
  { categoria:"Aventura", titulo:"El llamado de la selva",       autor:"Jack London",       anio:1903, descripcion:"La historia de Buck, un perro que regresa a su naturaleza salvaje.",                        pdf:"Aventura/JackLondon-ElLlamadoDeLaSelva1.pdf" },
  { categoria:"Aventura", titulo:"La vuelta al mundo en 80 días",autor:"Julio Verne",       anio:1872, descripcion:"Phileas Fogg apuesta que puede dar la vuelta al mundo en ochenta días.",                    pdf:"Aventura/JulioVerne-LaVueltaAlMundoEn80Dias.pdf" },
  { categoria:"Aventura", titulo:"Viaje al centro de la Tierra", autor:"Julio Verne",       anio:1864, descripcion:"Una expedición extraordinaria al interior del planeta.",                                    pdf:"Aventura/JulioVerne-ViajeAlCentroDeLaTierra.pdf" },
  { categoria:"Aventura", titulo:"La isla del tesoro",           autor:"Robert Louis Stevenson", anio:1883, descripcion:"Jim Hawkins embarca en busca del tesoro del pirata Flint.",                           pdf:"Aventura/La isla del tesoro (SPA) - Robert Louis Ste....pdf" },
  { categoria:"Aventura", titulo:"Las minas del rey Salomón",    autor:"H. Rider Haggard",  anio:1885, descripcion:"Una expedición en busca de las legendarias minas del rey Salomón.",                        pdf:"Aventura/Las Minas del Rey salomon.pdf" },
  { categoria:"Aventura", titulo:"Moby Dick",                    autor:"Herman Melville",   anio:1851, descripcion:"La obsesiva búsqueda del capitán Ahab de la ballena blanca.",                              pdf:"Aventura/Moby_Dick-Herman_Melville.pdf" },
  { categoria:"Aventura", titulo:"Robinson Crusoe",              autor:"Daniel Defoe",      anio:1719, descripcion:"El naufragio y supervivencia de Robinson Crusoe en una isla desierta.",                    pdf:"Aventura/robinson_crusoe.pdf" },
  { categoria:"Aventura", titulo:"El corsario negro",            autor:"Emilio Salgari",    anio:1898, descripcion:"Las aventuras del temible corsario Emilio de Roccanera.",                                  pdf:"Aventura/SalgariEmilio-ElCorsarioNegro.pdf" },

  // ── CIENCIA FICCIÓN ───────────────────────────────────────────────────────────
  { categoria:"Ciencia Ficción", titulo:"20.000 leguas de viaje submarino", autor:"Julio Verne",        anio:1870, descripcion:"El misterioso capitán Nemo y su submarino el Nautilus.",                       pdf:"Ciencia Ficción/20.000 Leguas De Viaje Submarino - Julio ....pdf" },
  { categoria:"Ciencia Ficción", titulo:"1984",                              autor:"George Orwell",      anio:1949, descripcion:"Una distopía sobre el totalitarismo y el control del pensamiento.",            pdf:"Ciencia Ficción/1984.pdf" },
  { categoria:"Ciencia Ficción", titulo:"De la Tierra a la Luna",            autor:"Julio Verne",        anio:1865, descripcion:"Una expedición imaginaria para llegar a la Luna en proyectil.",               pdf:"Ciencia Ficción/de_la_tierra_a_la_luna.pdf" },
  { categoria:"Ciencia Ficción", titulo:"El hombre invisible",               autor:"H. G. Wells",        anio:1897, descripcion:"Un científico descubre la fórmula para volverse invisible con consecuencias fatales.", pdf:"Ciencia Ficción/H. G. Wells, el hombre visible.pdf" },
  { categoria:"Ciencia Ficción", titulo:"La guerra de los mundos",           autor:"H. G. Wells",        anio:1898, descripcion:"La invasión de la Tierra por los marcianos.",                                 pdf:"Ciencia Ficción/Herbert George Wells La Guerra de los M....pdf" },
  { categoria:"Ciencia Ficción", titulo:"La isla del doctor Moreau",         autor:"H. G. Wells",        anio:1896, descripcion:"Un científico que realiza experimentos perturbadores con animales.",          pdf:"Ciencia Ficción/La isla del doctor moreau, H.G. Wells.pdf" },
  { categoria:"Ciencia Ficción", titulo:"La máquina del tiempo",             autor:"H. G. Wells",        anio:1895, descripcion:"Un inventor viaja al futuro lejano de la humanidad.",                        pdf:"Ciencia Ficción/La máquina del tiempo - H. G. Wells.pdf" },
  { categoria:"Ciencia Ficción", titulo:"Fahrenheit 451",                    autor:"Ray Bradbury",       anio:1953, descripcion:"Un futuro donde los libros están prohibidos y los bomberos los queman.",     pdf:"Ciencia Ficción/primeros.pdf" },
  { categoria:"Ciencia Ficción", titulo:"Crónicas marcianas",                autor:"Ray Bradbury",       anio:1950, descripcion:"Una serie de relatos sobre la colonización humana de Marte.",                pdf:"Ciencia Ficción/Ray Bradbury - Cronicas Marcianas.pdf" },

  // ── COMEDIA ───────────────────────────────────────────────────────────────────
  { categoria:"Comedia", titulo:"Los papeles póstumos del Club Pickwick",    autor:"Charles Dickens",   anio:1837, descripcion:"Las aventuras cómicas del señor Pickwick y sus amigos.",                      pdf:"Comedia/10 Los papeles póstumos del Club Pickwi....pdf" },
  { categoria:"Comedia", titulo:"El Lazarillo de Tormes",                    autor:"Anónimo",           anio:1554, descripcion:"Primera novela picaresca española, narrada por el astuto Lázaro.",            pdf:"Comedia/Anónimo. - Lazarillo de Tormes [2012].pdf" },
  { categoria:"Comedia", titulo:"El casamiento engañoso",                    autor:"Miguel de Cervantes",anio:1613, descripcion:"Una de las novelas ejemplares de Cervantes llena de ironía.",               pdf:"Comedia/elcasamientoeng00cerv.pdf" },
  { categoria:"Comedia", titulo:"El médico a palos",                         autor:"Molière",           anio:1666, descripcion:"Comedia clásica francesa sobre un leñador obligado a hacerse pasar por médico.", pdf:"Comedia/elmdicopaloscome1799moli.pdf" },
  { categoria:"Comedia", titulo:"El sombrero de tres picos",                 autor:"Pedro Antonio de Alarcón", anio:1874, descripcion:"Novela costumbrista española llena de enredos y humor.",            pdf:"Comedia/elsombrerode00alar.pdf" },
  { categoria:"Comedia", titulo:"Tres hombres en una barca",                 autor:"Jerome K. Jerome",  anio:1889, descripcion:"Las desventuras cómicas de tres amigos y un perro remontando el Támesis.",   pdf:"Comedia/Jerome K. Jerome Tres hombres en una b....pdf" },
  { categoria:"Comedia", titulo:"Las alegres comadres de Windsor",           autor:"William Shakespeare",anio:1597, descripcion:"Comedia de Shakespeare llena de enredos amorosos y situaciones hilarantes.", pdf:"Comedia/las_alegres_comadres_de_windsor.pdf" },
  { categoria:"Comedia", titulo:"El avaro",                                  autor:"Molière",           anio:1668, descripcion:"Comedia sobre la avaricia extrema de Harpagón.",                              pdf:"Comedia/Moliere - El Avaro.pdf" },
  { categoria:"Comedia", titulo:"Tartarín de Tarascón",                      autor:"Alphonse Daudet",   anio:1872, descripcion:"Las ridículas aventuras del fanfarrón y soñador Tartarín.",                  pdf:"Comedia/tartarndetaras00daud.pdf" },

  // ── DRAMA ─────────────────────────────────────────────────────────────────────
  { categoria:"Drama", titulo:"La gaviota",                      autor:"Anton Chéjov",      anio:1896, descripcion:"Comedia en cuatro actos sobre el arte, el amor no correspondido y las aspiraciones humanas.", pdf:"Drama/anton-chejov-la-gaviota.pdf" },
  { categoria:"Drama", titulo:"Bodas de sangre",                 autor:"Federico García Lorca", anio:1932, descripcion:"Tragedia poética sobre el honor, la pasión y el destino fatal.",                   pdf:"Drama/BodasSangre_GciaLorca.pdf" },
  { categoria:"Drama", titulo:"El tío Vania",                    autor:"Anton Chéjov",      anio:1897, descripcion:"Drama sobre la desilusión y el tiempo perdido en la Rusia rural.",                      pdf:"Drama/El Tio Vania.pdf" },
  { categoria:"Drama", titulo:"El gran teatro del mundo",        autor:"Calderón de la Barca",anio:1655, descripcion:"Auto sacramental alegórico sobre la vida como teatro.",                               pdf:"Drama/elgranteatrodelm00cald.pdf" },
  { categoria:"Drama", titulo:"Yerma",                           autor:"Federico García Lorca", anio:1934, descripcion:"Tragedia sobre el deseo de maternidad y la frustración.",                           pdf:"Drama/García Lorca Federico - Yerma (1934).pdf" },
  { categoria:"Drama", titulo:"La casa de Bernarda Alba",        autor:"Federico García Lorca", anio:1936, descripcion:"Drama sobre la opresión femenina y el autoritarismo en España.",                    pdf:"Drama/García Lorca Federico_La Casa de Bernar....pdf" },
  { categoria:"Drama", titulo:"Casa de muñecas",                 autor:"Henrik Ibsen",      anio:1879, descripcion:"Drama moderno sobre la independencia de la mujer.",                                     pdf:"Drama/Ibsen, Henrik - Casa De Muñecas.pdf" },
  { categoria:"Drama", titulo:"Macbeth",                         autor:"William Shakespeare",anio:1606, descripcion:"Tragedia sobre la ambición, la traición y la culpa.",                                  pdf:"Drama/Macbeth-William-Shakespeare.pdf" },
  { categoria:"Drama", titulo:"Hamlet",                          autor:"William Shakespeare",anio:1603, descripcion:"El príncipe Hamlet busca venganza por el asesinato de su padre.",                     pdf:"Drama/William Shakespeare - Hamlet.pdf" },
  { categoria:"Drama", titulo:"Otelo",                           autor:"William Shakespeare",anio:1603, descripcion:"Tragedia sobre los celos destructivos del general moro Otelo.",                       pdf:"Drama/William Shakespeare - Otelo. Biblioteca T....pdf" },

  // ── FANTASÍA ──────────────────────────────────────────────────────────────────
  { categoria:"Fantasía", titulo:"Alicia en el País de las Maravillas", autor:"Lewis Carroll",   anio:1865, descripcion:"Las extraordinarias aventuras de Alicia en un mundo absurdo y mágico.",           pdf:"Fantasía/Alicia-en-el-pais-de-las-Maravillas_Lewis....pdf" },
  { categoria:"Fantasía", titulo:"Las mil y una noches",                autor:"Anónimo",          anio:800,  descripcion:"Colección de cuentos orientales narrados por Scheherezade.",                     pdf:"Fantasía/Anonimo - Las Mil y Una Noches.pdf" },
  { categoria:"Fantasía", titulo:"Don Quijote de la Mancha",            autor:"Miguel de Cervantes",anio:1605, descripcion:"Las aventuras del caballero andante más famoso de la literatura española.",   pdf:"Fantasía/cervantes don quijote.pdf" },
  { categoria:"Fantasía", titulo:"Cuentos de los Hermanos Grimm Vol.1", autor:"Hermanos Grimm",   anio:1812, descripcion:"Primera colección de cuentos populares alemanes recopilados por los Grimm.",    pdf:"Fantasía/Cuentos de Los Hermanos Grimm - Tom....pdf" },
  { categoria:"Fantasía", titulo:"El maravilloso Mago de Oz",           autor:"L. Frank Baum",    anio:1900, descripcion:"Dorothy y sus amigos buscan al mago de Oz para cumplir sus deseos.",             pdf:"Fantasía/El maravilloso Mago de Oz - Lyman Fran....pdf" },
  { categoria:"Fantasía", titulo:"La Divina Comedia",                   autor:"Dante Alighieri",  anio:1320, descripcion:"El viaje de Dante por el Infierno, el Purgatorio y el Paraíso.",                pdf:"Fantasía/La Divina Comedia.pdf" },
  { categoria:"Fantasía", titulo:"Los viajes de Gulliver",              autor:"Jonathan Swift",   anio:1726, descripcion:"Los fantásticos viajes de Lemuel Gulliver a tierras imaginarias.",              pdf:"Fantasía/Los_viajes_de_Gulliver_-_Jonathan_Swift....pdf" },
  { categoria:"Fantasía", titulo:"El paraíso perdido",                  autor:"John Milton",      anio:1667, descripcion:"Épica poética sobre la caída de Adán y Eva del Paraíso.",                       pdf:"Fantasía/paraiso (1).pdf" },
  { categoria:"Fantasía", titulo:"Peter Pan",                           autor:"J. M. Barrie",     anio:1904, descripcion:"El niño que nunca crece y sus aventuras en el País de Nunca Jamás.",            pdf:"Fantasía/peter_pan.PDF" },

  // ── HISTÓRICO ─────────────────────────────────────────────────────────────────
  { categoria:"Histórico", titulo:"Historia de dos ciudades",  autor:"Charles Dickens",     anio:1859, descripcion:"Drama ambientado en Londres y París durante la Revolución Francesa.",                pdf:"Histórico/A_Tale_of_Two_Cities_(1898).pdf" },
  { categoria:"Histórico", titulo:"Los miserables",            autor:"Victor Hugo",          anio:1862, descripcion:"La redención de Jean Valjean en la Francia del siglo XIX.",                         pdf:"Histórico/los_miserables.pdf" },
  { categoria:"Histórico", titulo:"El último mohicano",        autor:"James Fenimore Cooper",anio:1826, descripcion:"Aventuras en la América colonial durante la guerra franco-india.",                  pdf:"Histórico/mohicano.pdf" },
  { categoria:"Histórico", titulo:"Quo Vadis",                 autor:"Henryk Sienkiewicz",   anio:1896, descripcion:"Amor y fe en la Roma del emperador Nerón.",                                        pdf:"Histórico/Quo-vadis.pdf" },
  { categoria:"Histórico", titulo:"Guerra y paz",              autor:"León Tolstoi",         anio:1869, descripcion:"Épica novela sobre la sociedad rusa durante las guerras napoleónicas.",             pdf:"Histórico/Tolstoi León-Guerra y Paz.pdf" },
  { categoria:"Histórico", titulo:"Ivanhoe",                   autor:"Walter Scott",         anio:1820, descripcion:"Aventuras caballerescas en la Inglaterra medieval de Ricardo Corazón de León.",    pdf:"Histórico/Walter Scott - Ivanhoe.pdf" },

  // ── MISTERIO ──────────────────────────────────────────────────────────────────
  { categoria:"Misterio", titulo:"Crimen y castigo",                        autor:"Fiódor Dostoyevski",anio:1866, descripcion:"Un estudiante comete un crimen creyendo estar por encima de la moral.",    pdf:"Misterio/Crimen y castigo - Fiodor Mijailovich Do....pdf" },
  { categoria:"Misterio", titulo:"Los crímenes de la calle Morgue",         autor:"Edgar Allan Poe",   anio:1841, descripcion:"El primer relato de detectives de la historia de la literatura.",          pdf:"Misterio/CrimenesCAlleMorgue.pdf" },
  { categoria:"Misterio", titulo:"Diez negritos",                           autor:"Agatha Christie",   anio:1939, descripcion:"Diez desconocidos en una isla y un asesino entre ellos.",                 pdf:"Misterio/Diez_negritos-Christie_Agatha.pdf" },
  { categoria:"Misterio", titulo:"El fantasma de la Ópera",                 autor:"Gastón Leroux",     anio:1910, descripcion:"El misterioso enmascarado que habita los sótanos de la Ópera de París.",  pdf:"Misterio/El fantasma de la Ópera (Gaston Leroux [....pdf" },
  { categoria:"Misterio", titulo:"El misterio del cuarto amarillo",         autor:"Gastón Leroux",     anio:1907, descripcion:"El periodista Rouletabille resuelve un crimen en una habitación cerrada.", pdf:"Misterio/El misterio del cuarto amarillo (Gaston Le....pdf" },
  { categoria:"Misterio", titulo:"El nombre de la rosa",                    autor:"Umberto Eco",       anio:1980, descripcion:"Un monje medieval investiga misteriosas muertes en un monasterio.",        pdf:"Misterio/El nombre de la rosa.pdf" },
  { categoria:"Misterio", titulo:"El proceso",                              autor:"Franz Kafka",       anio:1925, descripcion:"Josef K. es arrestado y procesado por un crimen que nunca se revela.",     pdf:"Misterio/El Proceso.pdf" },
  { categoria:"Misterio", titulo:"Estudio en escarlata",                    autor:"Arthur Conan Doyle",anio:1887, descripcion:"La primera aparición del detective Sherlock Holmes.",                     pdf:"Misterio/EstudioenEscarlata.pdf" },
  { categoria:"Misterio", titulo:"El escarabajo de oro",                    autor:"Edgar Allan Poe",   anio:1843, descripcion:"Un hombre descifra un mensaje secreto para hallar un tesoro pirata.",     pdf:"Misterio/Poe Edgar Allan - El escarabajo de oro.pdf" },

  // ── ROMANCE ───────────────────────────────────────────────────────────────────
  { categoria:"Romance", titulo:"La dama de las camelias",    autor:"Alejandro Dumas hijo",anio:1848, descripcion:"El trágico amor de Armand Duval por la cortesana Marguerite Gautier.",              pdf:"Romance/Alejandro Dumas hijo - La Dama de las C....pdf" },
  { categoria:"Romance", titulo:"Ana Karenina",               autor:"León Tolstoi",        anio:1878, descripcion:"El destino trágico de una mujer que abandona su familia por amor.",                  pdf:"Romance/Ana Karenina - Leon Tolstoi.pdf" },
  { categoria:"Romance", titulo:"Sentido y sensibilidad",     autor:"Jane Austen",         anio:1811, descripcion:"Las hermanas Dashwood buscan el amor y el matrimonio en la Inglaterra regencia.",   pdf:"Romance/Austen, Jane - Sentido Y Sensibilidad.pdf" },
  { categoria:"Romance", titulo:"El amor en los tiempos del cólera",autor:"Gabriel García Márquez",anio:1985, descripcion:"Una historia de amor que espera más de cincuenta años para realizarse.", pdf:"Romance/colera.pdf" },
  { categoria:"Romance", titulo:"Cumbres borrascosas",        autor:"Emily Brontë",        anio:1847, descripcion:"El oscuro amor entre Heathcliff y Catherine en los páramos ingleses.",              pdf:"Romance/Cumbres Borrascosas.pdf" },
  { categoria:"Romance", titulo:"Emma",                       autor:"Jane Austen",         anio:1815, descripcion:"Emma Woodhouse, casamentera bien intencionada, aprende humildad y amor.",           pdf:"Romance/Jane Austen - Emma.pdf" },
  { categoria:"Romance", titulo:"Jane Eyre",                  autor:"Charlotte Brontë",    anio:1847, descripcion:"Una institutriz encuentra amor y misterio en Thornfield Hall.",                     pdf:"Romance/Jane Eyre - Charlotte Bronte.pdf" },
  { categoria:"Romance", titulo:"María",                      autor:"Jorge Isaacs",        anio:1867, descripcion:"Novela romántica colombiana considerada una de las más importantes de Latinoamérica.", pdf:"Romance/Maria.pdf" },
  { categoria:"Romance", titulo:"Orgullo y prejuicio",        autor:"Jane Austen",         anio:1813, descripcion:"Elizabeth Bennet y el señor Darcy superan prejuicios para encontrar el amor.",    pdf:"Romance/Orgullo y prejuicio.pdf" },
  { categoria:"Romance", titulo:"Romeo y Julieta",            autor:"William Shakespeare", anio:1597, descripcion:"El trágico amor de dos jóvenes de familias enemigas en Verona.",                   pdf:"Romance/Romeo y Julieta - William Shakespeare.pdf" },

  // ── SUSPENSO ──────────────────────────────────────────────────────────────────
  { categoria:"Suspenso", titulo:"El hombre que fue Jueves",   autor:"G. K. Chesterton",   anio:1908, descripcion:"Un poeta descubre una conspiración anarquista en un thriller filosófico.",         pdf:"Suspenso/Chesterton - El Hombre que fue Jueves.pdf" },
  { categoria:"Suspenso", titulo:"El conde de Montecristo",    autor:"Alejandro Dumas",    anio:1844, descripcion:"La venganza meticulosa de Edmond Dantès tras años de injusta prisión.",            pdf:"Suspenso/Dumas Alejandro - El conde de Montecristo....pdf" },
  { categoria:"Suspenso", titulo:"El gran Gatsby",             autor:"F. Scott Fitzgerald", anio:1925, descripcion:"La obsesión de Jay Gatsby por revivir el pasado en el Nueva York de los años 20.", pdf:"Suspenso/el_gran_gatsby.pdf" },
  { categoria:"Suspenso", titulo:"El jugador",                 autor:"Fiódor Dostoyevski", anio:1867, descripcion:"La adicción al juego de un joven tutor en un balneario europeo.",                  pdf:"Suspenso/El_jugador-Dostoyevski_Fiodor.pdf" },
  { categoria:"Suspenso", titulo:"El halcón maltés",           autor:"Dashiell Hammett",   anio:1930, descripcion:"El detective Sam Spade investiga asesinatos relacionados con una valiosa estatuilla.", pdf:"Suspenso/El-halc-n-malt-s-autor-Dashiell-Hamme....pdf" },
  { categoria:"Suspenso", titulo:"El agente secreto",          autor:"Joseph Conrad",      anio:1907, descripcion:"Un agente doble planea un atentado en Londres en este thriller político.",          pdf:"Suspenso/LXuv-conrad-joseph-el-agentesecretop....pdf" },
  { categoria:"Suspenso", titulo:"Nostromo",                   autor:"Joseph Conrad",      anio:1904, descripcion:"Una historia de corrupción y ambición en una república sudamericana ficticia.",    pdf:"Suspenso/Nostromo.pdf" },
  { categoria:"Suspenso", titulo:"Rebecca",                    autor:"Daphne du Maurier",  anio:1938, descripcion:"Una joven esposa vive bajo la sombra de la primera mujer de su marido.",           pdf:"Suspenso/Rebecca_rus_web.pdf" },

  // ── TERROR ────────────────────────────────────────────────────────────────────
  { categoria:"Terror", titulo:"La caída de la casa Usher",      autor:"Edgar Allan Poe",   anio:1839, descripcion:"La decadencia de la familia Usher en una mansión siniestra.",                    pdf:"Terror/CaidaCasaUsher.pdf" },
  { categoria:"Terror", titulo:"El corazón delator",             autor:"Edgar Allan Poe",   anio:1843, descripcion:"Un asesino oye el corazón de su víctima latir bajo el suelo.",                   pdf:"Terror/CorazonDelator.pdf" },
  { categoria:"Terror", titulo:"Drácula",                        autor:"Bram Stoker",       anio:1897, descripcion:"El cazador de vampiros Van Helsing enfrenta al conde Drácula.",                  pdf:"Terror/DraculaDeBramStoker.pdf" },
  { categoria:"Terror", titulo:"El castillo de Otranto",         autor:"Horace Walpole",    anio:1764, descripcion:"Primera novela gótica de la literatura inglesa.",                                 pdf:"Terror/el_castillo_de_otranto (1).pdf" },
  { categoria:"Terror", titulo:"El fantasma de Canterville",     autor:"Oscar Wilde",       anio:1887, descripcion:"Una familia americana convive con el fantasma de un castillo inglés.",            pdf:"Terror/El_fantasma_de_Canterville-Oscar_Wilde....pdf" },
  { categoria:"Terror", titulo:"El extraño caso del Dr. Jekyll", autor:"R. L. Stevenson",   anio:1886, descripcion:"Un científico descubre cómo separar el bien del mal en la personalidad humana.",  pdf:"Terror/ElExtranoCasoDe.pdf" },
  { categoria:"Terror", titulo:"El retrato de Dorian Gray",      autor:"Oscar Wilde",       anio:1890, descripcion:"Un joven vende su alma para que su retrato envejezca en su lugar.",              pdf:"Terror/El-retrato-de-Dorian-Gray-Oscar-Wilde.p....pdf" },
  { categoria:"Terror", titulo:"El horla",                       autor:"Guy de Maupassant", anio:1887, descripcion:"Un hombre siente la presencia de un ser invisible que lo domina.",               pdf:"Terror/Maupassant, Guy de - El horla.pdf" },
  { categoria:"Terror", titulo:"El cuervo",                      autor:"Edgar Allan Poe",   anio:1845, descripcion:"Poema narrativo sobre la desesperación de un hombre visitado por un cuervo.",    pdf:"Terror/poema-cuervo-poe.pdf" },
];

// ── Insertar categorías nuevas ─────────────────────────────────────────────────
async function insertarCategorias() {
  const cats = [...new Set(LIBROS.map(l => l.categoria))];
  for (const cat of cats) {
    try {
      await pool.query("INSERT IGNORE INTO categories (name) VALUES (?)", [cat]);
    } catch {}
  }
  console.log("✓ Categorías verificadas.");
}

// ── Script principal ───────────────────────────────────────────────────────────
async function importar() {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║   Importación masiva — Virtual Library INA 1G    ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  await insertarCategorias();

  let insertados = 0, omitidos = 0, sinPdf = 0;

  for (const libro of LIBROS) {
    const pdfPath = path.join(BASE, libro.pdf);
    const pdfExiste = fs.existsSync(pdfPath);
    if (!pdfExiste) { console.warn(`  ⚠  PDF no encontrado: ${libro.pdf}`); sinPdf++; }

    const id = `${libro.categoria.toLowerCase().replace(/\s+/g,"-")}-${libro.titulo.toLowerCase().replace(/\s+/g,"-").slice(0,30)}`;
    const color = COLORES[libro.categoria] || "#1f8a70";
    const enlace = pdfExiste ? `/uploads/pdfs/${libro.pdf}` : "";

    try {
      const [r] = await pool.query(
        `INSERT IGNORE INTO books (id,title,author,category,year,description,link,available,color,featured)
         VALUES (?,?,?,?,?,?,?,1,?,0)`,
        [id, libro.titulo, libro.autor, libro.categoria, libro.anio || null, libro.descripcion, enlace, color]
      );
      if (r.affectedRows > 0) { console.log(`  ✓  [${libro.categoria}] "${libro.titulo}"`); insertados++; }
      else                     { console.log(`  —  Ya existía: "${libro.titulo}"`);           omitidos++;  }
    } catch (err) {
      console.error(`  ✗  Error en "${libro.titulo}": ${err.message}`);
    }
  }

  console.log("\n──────────────────────────────────────────────────");
  console.log(`  Insertados : ${insertados}`);
  console.log(`  Omitidos   : ${omitidos} (ya existían)`);
  console.log(`  Sin PDF    : ${sinPdf} (copia los archivos a uploads/pdfs/)`);
  console.log("──────────────────────────────────────────────────\n");
  console.log("¡Importación finalizada! Recarga el catálogo en el navegador.");

  await pool.end();
}

importar().catch(err => { console.error("Error fatal:", err.message); process.exit(1); });
