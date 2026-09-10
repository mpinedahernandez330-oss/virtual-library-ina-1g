// script.js — Catalogo Virtual Library (API REST)
"use strict";

const API         = "http://localhost:3000";
const SESSION_KEY = "vl-user-session";

// ── Estado ────────────────────────────────────────────────────────────────────
let books             = [];
let showFavoritesOnly = false;

// ── DOM ───────────────────────────────────────────────────────────────────────
const booksGrid           = document.querySelector("#booksGrid");
const emptyState          = document.querySelector("#emptyState");
const searchInput         = document.querySelector("#searchInput");
const categoryFilter      = document.querySelector("#categoryFilter");
const sortFilter          = document.querySelector("#sortFilter");
const viewAllButton       = document.querySelector("#viewAllButton");
const viewFavoritesButton = document.querySelector("#viewFavoritesButton");
const totalBooksEl        = document.querySelector("#totalBooks");
const favoriteBooksEl     = document.querySelector("#favoriteBooks");
const availableBooksEl    = document.querySelector("#availableBooks");
const dialog              = document.querySelector("#bookDialog");
const closeDialogButton   = document.querySelector("#closeDialogButton");

// ── Helpers ───────────────────────────────────────────────────────────────────
function normalizeText(t) {
  return String(t).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}
function escapeHtml(text) {
  const el = document.createElement("div");
  el.textContent = String(text);
  return el.innerHTML;
}
function getSession() {
  const s = sessionStorage.getItem(SESSION_KEY);
  return s ? JSON.parse(s) : null;
}

// ── Libros desde API ──────────────────────────────────────────────────────────
async function loadBooks() {
  try {
    const search   = searchInput    ? normalizeText(searchInput.value)  : "";
    const category = categoryFilter ? categoryFilter.value              : "Todas";
    const sortBy   = sortFilter     ? sortFilter.value                  : "titulo";

    const params = new URLSearchParams();
    if (search)                     params.set("search",    search);
    if (category && category !== "Todas") params.set("categoria", category);
    if (sortBy)                     params.set("sort",      sortBy);

    const res  = await fetch(`${API}/api/libros?${params}`);
    const json = await res.json();
    books = json.ok ? json.data : [];

    // Filtrar favoritos localmente si es necesario (favorito es por usuario)
    let filtered = books;
    if (showFavoritesOnly) filtered = books.filter(b => b.favorito);

    renderBooks(filtered);
  } catch {
    if (booksGrid) booksGrid.innerHTML = `<p style="color:var(--muted);padding:24px;">Error al conectar con el servidor. Asegurate de que el backend este activo.</p>`;
  }
}

// ── Reseñas desde API ─────────────────────────────────────────────────────────
async function getBookReviews(bookId) {
  try {
    const res  = await fetch(`${API}/api/resenas?libroId=${bookId}`);
    const json = await res.json();
    return json.ok ? json.data : [];
  } catch { return []; }
}

async function getBookAvgRating(bookId) {
  const revs = await getBookReviews(bookId);
  if (!revs.length) return 0;
  return Math.round(revs.reduce((s, r) => s + r.calificacion, 0) / revs.length);
}

// ── Historial via API ─────────────────────────────────────────────────────────
async function addToHistory(bookId) {
  const session = getSession();
  if (!session) return;
  try {
    await fetch(`${API}/api/historial`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ user_email: session.email, libro_id: bookId })
    });
  } catch { /* silencioso */ }
}

// ── Membresía desde la BD ─────────────────────────────────────────────────────
let membresiaCache = null; // cache en memoria para no hacer fetch en cada clic

async function getMembresiaActual() {
  const session = getSession();
  if (!session?.id) return null;
  try {
    const res  = await fetch(`${API}/api/membresia/${session.id}`);
    const json = await res.json();
    if (json.ok) { membresiaCache = json.data; return json.data; }
  } catch { /* silencioso */ }
  return null;
}

async function canReadMore() {
  const m = await getMembresiaActual();
  if (!m) return false;
  // Ilimitado si book_limit es muy alto (silver/diamond)
  if (m.book_limit >= 999999) return true;
  // Free: chequea libros disponibles hoy
  return m.available_books > 0;
}

async function registrarLectura(bookId) {
  const session = getSession();
  if (!session?.id) return;
  try {
    await fetch(`${API}/api/membresia/${session.id}/leer`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ book_id: bookId })
    });
    membresiaCache = null; // invalidar cache
  } catch { /* silencioso */ }
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderBooks(filtered) {
  if (!booksGrid) return;
  booksGrid.innerHTML = "";
  emptyState?.classList.toggle("show", filtered.length === 0);

  filtered.forEach((book, index) => {
    const card = document.createElement("article");
    card.className = "book-card";
    card.style.animationDelay = `${Math.min(index * 0.06, 0.5)}s`;

    const featBadge = book.destacado ? `<span class="featured-badge">Destacado</span>` : "";
    const coverStyle = book.portada
      ? `background-image:url('${API}${book.portada}');background-size:cover;background-position:center;`
      : `--cover-color:${book.color || "#1f8a70"}`;
    const coverImg = book.portada
      ? `<img src="${API}${book.portada}" alt="Portada" class="book-cover-img">`
      : `<strong>${escapeHtml(book.titulo)}</strong>`;

    card.innerHTML = `
      <div class="book-cover ${book.portada ? "has-cover" : ""}" style="${coverStyle}">
        ${coverImg}${featBadge}
      </div>
      <div class="book-body">
        <div class="book-meta">
          <span class="badge">${escapeHtml(book.categoria || "Sin categoria")}</span>
          <span>${book.anio || ""}</span>
        </div>
        <h2 class="book-title">${escapeHtml(book.titulo)}</h2>
        <p class="book-author">${escapeHtml(book.autor)}</p>
        <p class="book-description">${escapeHtml(book.descripcion || "Sin descripcion.")}</p>
        <div class="book-rating" data-action="openReview" data-id="${book.id}" title="Ver resenas">
          <span class="stars-display" id="stars-${book.id}">☆☆☆☆☆</span>
          <span class="rating-count"  id="rcount-${book.id}">0 resenas</span>
        </div>
        <div class="card-actions">
          <button class="read-button"     type="button" data-action="read"     data-id="${book.id}">Leer</button>
          <button class="favorite-button ${book.favorito ? "is-favorite" : ""}" type="button" data-action="favorite" data-id="${book.id}" aria-label="Favorito">${book.favorito ? "★" : "☆"}</button>
        </div>
      </div>`;
    booksGrid.appendChild(card);

    // Cargar calificaciones de forma asíncrona sin bloquear el render
    loadBookRating(book.id);
  });
  updateStats();
}

async function loadBookRating(bookId) {
  const revs = await getBookReviews(bookId);
  const avg  = revs.length ? Math.round(revs.reduce((s, r) => s + r.calificacion, 0) / revs.length) : 0;
  const starsEl  = document.getElementById(`stars-${bookId}`);
  const rcountEl = document.getElementById(`rcount-${bookId}`);
  if (starsEl)  starsEl.textContent  = avg > 0 ? "★".repeat(avg) + "☆".repeat(5 - avg) : "☆☆☆☆☆";
  if (rcountEl) rcountEl.textContent = `${revs.length} resena${revs.length !== 1 ? "s" : ""}`;
}

function updateStats() {
  if (totalBooksEl)     totalBooksEl.textContent     = books.length;
  if (favoriteBooksEl)  favoriteBooksEl.textContent  = books.filter(b => b.favorito).length;
  if (availableBooksEl) availableBooksEl.textContent = books.filter(b => b.disponible).length;
}

// ── Acciones ──────────────────────────────────────────────────────────────────
function handleBookAction(e) {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const { action, id } = btn.dataset;
  if (action === "read")       readBook(id, btn);
  if (action === "favorite")   toggleFavorite(id, btn);
  if (action === "openReview") openReviewDialog(id);
}

async function toggleFavorite(bookId, btn) {
  try {
    const res  = await fetch(`${API}/api/libros/${bookId}/favorito`, { method: "PATCH" });
    const json = await res.json();
    if (!json.ok) return;
    const b = books.find(x => String(x.id) === String(bookId));
    if (b) b.favorito = json.data.favorito;
    if (btn) {
      btn.classList.toggle("is-favorite", !!json.data.favorito);
      btn.textContent = json.data.favorito ? "★" : "☆";
    }
    updateStats();
  } catch { /* silencioso */ }
}

// ── Animaciones de página 3D ──────────────────────────────────────────────────
function pasarSiguiente(card) {
  card.classList.remove("pasar-siguiente");
  void card.offsetWidth;                  // fuerza reflow → reinicia animación
  card.classList.add("pasar-siguiente");
}

function pasarAnterior(card) {
  card.classList.remove("pasar-anterior");
  void card.offsetWidth;
  card.classList.add("pasar-anterior");
}

async function readBook(bookId, triggerBtn) {
  const book = books.find(b => String(b.id) === String(bookId));
  if (!book) return;

  const session = getSession();
  if (!session?.email) {
    window.location.href = "login.html";
    return;
  }

  if (triggerBtn) triggerBtn.disabled = true;

  try {
    const res  = await fetch(`${API}/api/libros/${bookId}/leer`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ user_email: session.email })
    });
    const json = await res.json();

    if (!json.ok) {
      showLimitDialog(json.error);
      return;
    }
  } catch {
    showLimitDialog("No se pudo validar tu acceso. Comprueba la conexion con el servidor.");
    return;
  } finally {
    if (triggerBtn) triggerBtn.disabled = false;
  }

  // Animación 3D antes de abrir
  const card = triggerBtn ? triggerBtn.closest(".book-card") : null;

  function abrirLibro() {
    if (book.enlace && book.enlace.trim()) openPdfViewer(book);
    else openBookDialog(bookId);
  }

  if (card) {
    if (Number(bookId) % 2 === 0) pasarAnterior(card);
    else                           pasarSiguiente(card);
    card.addEventListener("animationend", function handler() {
      card.classList.remove("pasar-siguiente", "pasar-anterior");
      card.removeEventListener("animationend", handler);
      abrirLibro();
    });
  } else {
    abrirLibro();
  }
}

// ── Visor PDF ─────────────────────────────────────────────────────────────────
function toDriveEmbed(url) {
  if (!url) return url;
  if (url.startsWith("/uploads/")) return `${API}${url}`;
  const m1 = url.match(/\/file\/d\/([^/]+)/);
  if (m1) return `https://drive.google.com/file/d/${m1[1]}/preview`;
  const m2 = url.match(/[?&]id=([^&]+)/);
  if (m2) return `https://drive.google.com/file/d/${m2[1]}/preview`;
  return url;
}

function openPdfViewer(book) {
  const enlace = (book.enlace || "").trim();

  // PDFs locales → visor interactivo con animación de páginas
  if (enlace.startsWith("/uploads/")) {
    const pdfUrl    = encodeURIComponent(`${API}${enlace}`);
    const titulo    = encodeURIComponent(book.titulo || "");
    window.open(`/visor.html?pdf=${pdfUrl}&titulo=${titulo}`, "_blank");
    return;
  }

  // Google Drive u otros enlaces externos → iframe como fallback
  document.getElementById("pdfViewerDialog")?.remove();
  const embedUrl = toDriveEmbed(enlace);
  const viewer   = document.createElement("div");
  viewer.id = "pdfViewerDialog"; viewer.className = "pdf-viewer-overlay";
  viewer.innerHTML = `
    <div class="pdf-viewer-box" id="pdfViewerBox">
      <div class="pdf-viewer-header">
        <div>
          <span class="eyebrow">${escapeHtml(book.categoria || "")}</span>
          <h2 style="margin:2px 0 0;font-size:16px;">${escapeHtml(book.titulo)}</h2>
          <p style="margin:0;color:var(--muted);font-size:13px;">${escapeHtml(book.autor)}</p>
        </div>
        <div class="pdf-viewer-actions">
          <button class="pdf-expand-btn" id="pdfAgrandarBtn" type="button">Agrandar</button>
          <button class="close-button"   id="closePdfViewer" type="button">&#x2715;</button>
        </div>
      </div>
      <iframe id="pdfFrame" class="pdf-frame" src="${escapeHtml(embedUrl)}" allowfullscreen allow="autoplay"></iframe>
    </div>`;
  document.body.appendChild(viewer);
  document.body.style.overflow = "hidden";

  function closeViewer() {
    document.getElementById("pdfFrame").src = "";
    viewer.remove();
    document.body.style.overflow = "";
  }
  document.getElementById("closePdfViewer").addEventListener("click", closeViewer);
  viewer.addEventListener("click", e => { if (e.target === viewer) closeViewer(); });

  const box = document.getElementById("pdfViewerBox");
  const btn = document.getElementById("pdfAgrandarBtn");
  btn.addEventListener("click", () => {
    const expanded = box.classList.toggle("pdf-viewer-fullscreen");
    btn.textContent = expanded ? "Reducir" : "Agrandar";
  });
}

function openBookDialog(bookId) {
  const book = books.find(b => String(b.id) === String(bookId));
  if (!book || !dialog) return;
  const cover = document.querySelector("#dialogCover");
  cover.style.setProperty("--cover-color", book.color || "#1f8a70");
  cover.style.backgroundImage = book.portada ? `url('${API}${book.portada}')` : "";
  cover.classList.toggle("has-cover", !!book.portada);
  document.querySelector("#dialogCategory").textContent    = book.categoria || "";
  document.querySelector("#dialogTitle").textContent       = book.titulo;
  document.querySelector("#dialogAuthor").textContent      = book.autor;
  document.querySelector("#dialogDescription").textContent = book.descripcion || "Sin descripcion.";
  document.querySelector("#dialogYear").textContent        = `Año: ${book.anio || "Sin dato"}`;
  document.querySelector("#dialogStatus").textContent      = book.disponible ? "Disponible" : "No disponible";
  const readLink = document.querySelector("#dialogReadLink");
  if (readLink) {
    if (book.enlace) { readLink.href = book.enlace; readLink.classList.remove("hidden"); }
    else             { readLink.classList.add("hidden"); }
  }
  dialog.showModal();
}

function showLimitDialog(mensaje) {
  let d = document.getElementById("limitDialog");
  if (!d) {
    d = document.createElement("dialog");
    d.id = "limitDialog"; d.className = "pay-dialog";
    d.innerHTML = `
      <div class="pay-dialog-content" style="text-align:center;">
        <div style="font-size:48px;margin-bottom:12px;">!</div>
        <h2 class="pay-title">Acceso limitado</h2>
        <p class="pay-desc" id="limitDialogMsg"></p>
        <div style="display:grid;gap:10px;margin-top:16px;">
          <a class="primary-button" href="planes.html" style="text-decoration:none;display:flex;align-items:center;justify-content:center;min-height:42px;">Ver planes</a>
          <button class="pay-cancel-btn" id="closeLimitDialog" type="button">Cerrar</button>
        </div>
      </div>`;
    document.body.appendChild(d);
    document.getElementById("closeLimitDialog").addEventListener("click", () => d.close());
  }
  document.getElementById("limitDialogMsg").textContent =
    mensaje || "Has alcanzado el límite de tu plan. Actualiza para leer más.";
  d.showModal();
}

// ── Reseñas ───────────────────────────────────────────────────────────────────
async function openReviewDialog(bookId) {
  const book = books.find(b => String(b.id) === String(bookId));
  if (!book) return;
  const session = getSession();

  let rd = document.getElementById("reviewDialog");
  if (!rd) {
    rd = document.createElement("dialog");
    rd.id = "reviewDialog"; rd.className = "review-dialog";
    rd.innerHTML = `
      <div class="review-dialog-inner">
        <button class="close-button" id="closeReviewDialog" type="button">&#x2715;</button>
        <h2 id="reviewBookTitle"></h2>
        <p id="reviewBookAuthor"></p>
        <div id="reviewFormSection"></div>
        <div id="reviewsList"></div>
      </div>`;
    document.body.appendChild(rd);
    document.getElementById("closeReviewDialog").addEventListener("click", () => rd.close());
  }
  document.getElementById("reviewBookTitle").textContent  = book.titulo;
  document.getElementById("reviewBookAuthor").textContent = book.autor;

  const reviews  = await getBookReviews(bookId);
  const myReview = session ? reviews.find(r => r.user_email === session.email) : null;
  renderReviewForm(bookId, session, myReview);
  renderReviewsList(reviews);
  rd.showModal();
}

function renderReviewForm(bookId, session, myReview) {
  const sec = document.getElementById("reviewFormSection");
  if (!session) { sec.innerHTML = `<p class="review-login-msg">Inicia sesion para dejar una resena.</p>`; return; }
  const current = myReview ? myReview.calificacion : 0;
  sec.innerHTML = `
    <div class="review-form">
      <p class="review-form-label">${myReview ? "Tu resena:" : "Deja tu resena:"}</p>
      <div class="star-picker" id="starPicker">
        ${[1,2,3,4,5].map(n => `<button type="button" class="star-btn ${n <= current ? "active" : ""}" data-val="${n}">★</button>`).join("")}
      </div>
      <textarea id="reviewTextInput" rows="3" placeholder="Escribe un comentario (opcional)..." maxlength="200">${escapeHtml(myReview?.texto || "")}</textarea>
      <button class="primary-button" id="submitReviewBtn" type="button">${myReview ? "Actualizar resena" : "Publicar resena"}</button>
    </div>`;

  let selectedRating = current;
  document.querySelectorAll(".star-btn").forEach(btn => {
    btn.addEventListener("mouseenter", () => document.querySelectorAll(".star-btn").forEach(b => b.classList.toggle("active", Number(b.dataset.val) <= Number(btn.dataset.val))));
    btn.addEventListener("mouseleave", () => document.querySelectorAll(".star-btn").forEach(b => b.classList.toggle("active", Number(b.dataset.val) <= selectedRating)));
    btn.addEventListener("click",      () => { selectedRating = Number(btn.dataset.val); document.querySelectorAll(".star-btn").forEach(b => b.classList.toggle("active", Number(b.dataset.val) <= selectedRating)); });
  });

  document.getElementById("submitReviewBtn").addEventListener("click", async () => {
    if (!selectedRating) { alert("Selecciona al menos 1 estrella."); return; }
    const txt = document.getElementById("reviewTextInput").value.trim();
    const submitBtn = document.getElementById("submitReviewBtn");
    submitBtn.disabled = true; submitBtn.textContent = "Guardando...";
    try {
      const res  = await fetch(`${API}/api/resenas`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ libro_id: bookId, user_email: session.email, nombre: session.name, calificacion: selectedRating, texto: txt })
      });
      const json = await res.json();
      if (!json.ok) { alert("Error al guardar la resena."); return; }
      const reviews  = await getBookReviews(bookId);
      const updated  = reviews.find(r => r.user_email === session.email);
      renderReviewForm(bookId, session, updated || { calificacion: selectedRating, texto: txt });
      renderReviewsList(reviews);
      loadBookRating(bookId);
    } catch { alert("Error de conexion al guardar la resena."); }
    finally { submitBtn.disabled = false; }
  });
}

function renderReviewsList(reviews) {
  const list = document.getElementById("reviewsList");
  if (!reviews.length) { list.innerHTML = `<p class="empty-state show" style="margin-top:16px;">Se el primero en resenar este libro.</p>`; return; }
  list.innerHTML = `<h3 class="reviews-list-title">Resenas (${reviews.length})</h3>` +
    [...reviews].sort((a, b) => b.fecha - a.fecha).map(r => `
      <div class="review-item">
        <div class="review-item-header">
          <strong>${escapeHtml(r.nombre)}</strong>
          <span class="review-stars">${"★".repeat(r.calificacion)}${"☆".repeat(5 - r.calificacion)}</span>
          <span class="review-date">${new Date(r.fecha).toLocaleDateString("es-ES")}</span>
        </div>
        ${r.texto ? `<p class="review-item-text">${escapeHtml(r.texto)}</p>` : ""}
      </div>`).join("");
}

// ── Vista favoritos ───────────────────────────────────────────────────────────
function setView(favoritesOnly) {
  showFavoritesOnly = favoritesOnly;
  viewAllButton      ?.classList.toggle("active", !favoritesOnly);
  viewFavoritesButton?.classList.toggle("active",  favoritesOnly);
  loadBooks();
}

// ── Tema ──────────────────────────────────────────────────────────────────────
const themeToggle = document.querySelector("#themeToggle");
const themeIcon   = document.querySelector("#themeIcon");
const themeLabel  = document.querySelector("#themeLabel");
function applyTheme(dark) {
  document.body.classList.toggle("dark", dark);
  if (themeIcon)  themeIcon.textContent  = dark ? "☀" : "🌙";
  if (themeLabel) themeLabel.textContent = dark ? "Oscuro" : "Claro";
}
function toggleTheme() {
  const isDark = document.body.classList.contains("dark");
  localStorage.setItem("vl-theme", isDark ? "light" : "dark");
  applyTheme(!isDark);
}
applyTheme(localStorage.getItem("vl-theme") === "dark");
if (themeToggle) themeToggle.addEventListener("click", toggleTheme);

// ── Listeners ─────────────────────────────────────────────────────────────────
if (searchInput)         searchInput.addEventListener("input",    loadBooks);
if (categoryFilter)      categoryFilter.addEventListener("change", loadBooks);
if (sortFilter)          sortFilter.addEventListener("change",    loadBooks);
if (booksGrid)           booksGrid.addEventListener("click",      handleBookAction);
if (viewAllButton)       viewAllButton.addEventListener("click",       () => setView(false));
if (viewFavoritesButton) viewFavoritesButton.addEventListener("click", () => setView(true));
if (closeDialogButton)   closeDialogButton.addEventListener("click",   () => dialog?.close());

// ── Arranque ──────────────────────────────────────────────────────────────────
loadBooks();
