// script.js — Catalogo Virtual Library (SQLite via API)
"use strict";

const API         = "http://localhost:3000/api";
const SESSION_KEY = "vl-user-session";
const REVIEWS_KEY = "vl-reviews";
const DAILY_KEY   = "vl-daily-reads";

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
async function apiFetch(path, options = {}) {
  const res  = await fetch(API + path, options);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Error de API");
  return json;
}

// ── Cargar libros ─────────────────────────────────────────────────────────────
async function loadBooks() {
  const params = new URLSearchParams();
  if (searchInput?.value)                                        params.set("search",    searchInput.value);
  if (categoryFilter?.value && categoryFilter.value !== "Todas") params.set("categoria", categoryFilter.value);
  if (sortFilter?.value)                                         params.set("sort",      sortFilter.value);
  const res = await apiFetch("/libros?" + params.toString());
  books = res.data;
}

// ── Cargar categorias ─────────────────────────────────────────────────────────
async function loadCategorias() {
  try {
    const res = await apiFetch("/categorias");
    if (!categoryFilter) return;
    const prev = categoryFilter.value;
    categoryFilter.innerHTML = `<option value="Todas">Todas</option>`;
    res.data.forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat; opt.textContent = cat;
      categoryFilter.appendChild(opt);
    });
    if ([...categoryFilter.options].some(o => o.value === prev)) categoryFilter.value = prev;
  } catch { /* mantener opciones del HTML */ }
}

// ── Reseñas (localStorage) ────────────────────────────────────────────────────
function getReviews()             { return JSON.parse(localStorage.getItem(REVIEWS_KEY) || "[]"); }
function saveReviews(r)           { localStorage.setItem(REVIEWS_KEY, JSON.stringify(r)); }
function getBookReviews(bookId)   { return getReviews().filter(r => String(r.bookId) === String(bookId)); }
function getBookAvgRating(bookId) {
  const revs = getBookReviews(bookId);
  if (!revs.length) return 0;
  return Math.round(revs.reduce((s, r) => s + r.rating, 0) / revs.length);
}

// ── Historial ─────────────────────────────────────────────────────────────────
async function addToHistory(bookId) {
  const session = getSession();
  if (!session?.email) return;
  try {
    await apiFetch("/historial", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ user_email: session.email, libro_id: bookId })
    });
  } catch { /* sin conexion */ }
}

// ── Limite diario ─────────────────────────────────────────────────────────────
function getDailyReads() {
  const today = new Date().toDateString();
  const saved = JSON.parse(localStorage.getItem(DAILY_KEY) || "{}");
  return saved.date !== today ? 0 : (saved.count || 0);
}
function incrementDailyReads() {
  const today = new Date().toDateString();
  localStorage.setItem(DAILY_KEY, JSON.stringify({ date: today, count: getDailyReads() + 1 }));
}
function getUserPlan() {
  const session = getSession();
  if (!session) return { key: "free", dailyLimit: 5 };
  if (session.plan !== "free" && session.planExpiry && Date.now() > session.planExpiry) {
    session.plan = "free"; session.planExpiry = null;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
  const plans = {
    free:    { key: "free",    dailyLimit: 5        },
    silver:  { key: "silver",  dailyLimit: Infinity },
    diamond: { key: "diamond", dailyLimit: Infinity }
  };
  return plans[session.plan || "free"] || plans.free;
}
function canReadMore() {
  const plan = getUserPlan();
  return plan.dailyLimit === Infinity || getDailyReads() < plan.dailyLimit;
}

// ── Filtrado local ────────────────────────────────────────────────────────────
function getFilteredBooks() {
  const search   = searchInput    ? normalizeText(searchInput.value) : "";
  const category = categoryFilter ? categoryFilter.value             : "Todas";
  const sortBy   = sortFilter     ? sortFilter.value                 : "titulo";

  return books
    .filter(book => {
      const matchSearch = !search ||
        normalizeText(book.titulo).includes(search)    ||
        normalizeText(book.autor).includes(search)     ||
        normalizeText(book.categoria || "").includes(search);
      return matchSearch &&
        (category === "Todas" || book.categoria === category) &&
        (!showFavoritesOnly || book.favorito);
    })
    .sort((a, b) => {
      if (a.destacado && !b.destacado) return -1;
      if (!a.destacado && b.destacado) return  1;
      if (sortBy === "anio") return Number(b.anio) - Number(a.anio);
      const campo = sortBy === "title" ? "titulo" : sortBy === "author" ? "autor" : sortBy;
      return normalizeText(a[campo] || "").localeCompare(normalizeText(b[campo] || ""));
    });
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderBooks() {
  if (!booksGrid) return;
  const filtered = getFilteredBooks();
  booksGrid.innerHTML = "";
  emptyState?.classList.toggle("show", filtered.length === 0);

  filtered.forEach((book, index) => {
    const card = document.createElement("article");
    card.className = "book-card";
    card.style.animationDelay = `${Math.min(index * 0.06, 0.5)}s`;

    const avg       = getBookAvgRating(book.id);
    const stars     = avg > 0 ? "★".repeat(avg) + "☆".repeat(5 - avg) : "☆☆☆☆☆";
    const revCount  = getBookReviews(book.id).length;
    const featBadge = book.destacado ? `<span class="featured-badge">Destacado</span>` : "";

    const coverStyle = book.portada
      ? `background-image:url('${book.portada}');background-size:cover;background-position:center;`
      : `--cover-color:${book.color || "#1f8a70"}`;
    const coverImg = book.portada
      ? `<img src="${book.portada}" alt="Portada" class="book-cover-img">`
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
          <span class="stars-display">${stars}</span>
          <span class="rating-count">${revCount} resena${revCount !== 1 ? "s" : ""}</span>
        </div>
        <div class="card-actions">
          <button class="read-button"     type="button" data-action="read"     data-id="${book.id}">Leer</button>
          <button class="favorite-button ${book.favorito ? "is-favorite" : ""}" type="button" data-action="favorite" data-id="${book.id}" aria-label="Favorito">${book.favorito ? "★" : "☆"}</button>
        </div>
      </div>`;
    booksGrid.appendChild(card);
  });
  updateStats();
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
  if (action === "read")       readBook(id);
  if (action === "favorite")   toggleFavorite(id);
  if (action === "openReview") openReviewDialog(id);
}

async function toggleFavorite(bookId) {
  try {
    const res = await apiFetch(`/libros/${bookId}/favorito`, { method: "PATCH" });
    const b   = books.find(x => String(x.id) === String(bookId));
    if (b) b.favorito = res.data.favorito;
  } catch {
    const b = books.find(x => String(x.id) === String(bookId));
    if (b) b.favorito = b.favorito ? 0 : 1;
  }
  renderBooks();
}

function readBook(bookId) {
  const book = books.find(b => String(b.id) === String(bookId));
  if (!book) return;
  if (!canReadMore()) { showLimitDialog(); return; }
  incrementDailyReads();
  addToHistory(bookId);
  if (book.enlace && book.enlace.trim()) openPdfViewer(book);
  else openBookDialog(bookId);
}

// ── Visor PDF ─────────────────────────────────────────────────────────────────
function toDriveEmbed(url) {
  if (!url) return url;
  if (url.startsWith("/uploads/")) return url;
  const matchFile = url.match(/\/file\/d\/([^/]+)/);
  if (matchFile) return `https://drive.google.com/file/d/${matchFile[1]}/preview`;
  const matchOpen = url.match(/[?&]id=([^&]+)/);
  if (matchOpen) return `https://drive.google.com/file/d/${matchOpen[1]}/preview`;
  return url;
}

function openPdfViewer(book) {
  document.getElementById("pdfViewerDialog")?.remove();
  const embedUrl = toDriveEmbed(book.enlace);
  const viewer   = document.createElement("div");
  viewer.id        = "pdfViewerDialog";
  viewer.className = "pdf-viewer-overlay";
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
  cover.style.backgroundImage = book.portada ? `url('${book.portada}')` : "";
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

function showLimitDialog() {
  let d = document.getElementById("limitDialog");
  if (!d) {
    d = document.createElement("dialog");
    d.id        = "limitDialog";
    d.className = "pay-dialog";
    d.innerHTML = `
      <div class="pay-dialog-content" style="text-align:center;">
        <div style="font-size:48px;margin-bottom:12px;">!</div>
        <h2 class="pay-title">Limite diario alcanzado</h2>
        <p class="pay-desc">Con el plan <strong>Gratis</strong> puedes leer 5 libros por dia.</p>
        <div style="display:grid;gap:10px;margin-top:16px;">
          <a class="primary-button" href="planes.html" style="text-decoration:none;display:flex;align-items:center;justify-content:center;min-height:42px;">Ver planes</a>
          <button class="pay-cancel-btn" id="closeLimitDialog" type="button">Cerrar</button>
        </div>
      </div>`;
    document.body.appendChild(d);
    document.getElementById("closeLimitDialog").addEventListener("click", () => d.close());
  }
  d.showModal();
}

// ── Reseñas ───────────────────────────────────────────────────────────────────
function openReviewDialog(bookId) {
  const book     = books.find(b => String(b.id) === String(bookId));
  if (!book) return;
  const session  = getSession();
  const reviews  = getBookReviews(bookId);
  const myReview = session ? reviews.find(r => r.email === session.email) : null;

  let rd = document.getElementById("reviewDialog");
  if (!rd) {
    rd = document.createElement("dialog");
    rd.id        = "reviewDialog";
    rd.className = "review-dialog";
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
  renderReviewForm(bookId, session, myReview);
  renderReviewsList(bookId);
  rd.showModal();
}

function renderReviewForm(bookId, session, myReview) {
  const sec = document.getElementById("reviewFormSection");
  if (!session) { sec.innerHTML = `<p class="review-login-msg">Inicia sesion para dejar una resena.</p>`; return; }
  const current = myReview ? myReview.rating : 0;
  sec.innerHTML = `
    <div class="review-form">
      <p class="review-form-label">${myReview ? "Tu resena:" : "Deja tu resena:"}</p>
      <div class="star-picker" id="starPicker">
        ${[1,2,3,4,5].map(n => `<button type="button" class="star-btn ${n <= current ? "active" : ""}" data-val="${n}">★</button>`).join("")}
      </div>
      <textarea id="reviewTextInput" rows="3" placeholder="Escribe un comentario (opcional)..." maxlength="200">${escapeHtml(myReview?.text || "")}</textarea>
      <button class="primary-button review-submit-btn" id="submitReviewBtn" type="button">${myReview ? "Actualizar resena" : "Publicar resena"}</button>
    </div>`;

  let selectedRating = current;
  document.querySelectorAll(".star-btn").forEach(btn => {
    btn.addEventListener("mouseenter", () => document.querySelectorAll(".star-btn").forEach(b => b.classList.toggle("active", Number(b.dataset.val) <= Number(btn.dataset.val))));
    btn.addEventListener("mouseleave", () => document.querySelectorAll(".star-btn").forEach(b => b.classList.toggle("active", Number(b.dataset.val) <= selectedRating)));
    btn.addEventListener("click",      () => { selectedRating = Number(btn.dataset.val); document.querySelectorAll(".star-btn").forEach(b => b.classList.toggle("active", Number(b.dataset.val) <= selectedRating)); });
  });

  document.getElementById("submitReviewBtn").addEventListener("click", () => {
    if (!selectedRating) { alert("Selecciona al menos 1 estrella."); return; }
    const txt     = document.getElementById("reviewTextInput").value.trim();
    let reviews   = getReviews().filter(r => !(String(r.bookId) === String(bookId) && r.email === session.email));
    const newReview = { bookId, email: session.email, name: session.name, rating: selectedRating, text: txt, date: Date.now() };
    reviews.push(newReview);
    saveReviews(reviews);
    renderReviewForm(bookId, session, newReview);
    renderReviewsList(bookId);
    renderBooks();
  });
}

function renderReviewsList(bookId) {
  const list    = document.getElementById("reviewsList");
  const reviews = getBookReviews(bookId);
  if (!reviews.length) { list.innerHTML = `<p class="empty-state show" style="margin-top:16px;">Se el primero en resenar este libro.</p>`; return; }
  list.innerHTML = `<h3 class="reviews-list-title">Resenas (${reviews.length})</h3>` +
    reviews.sort((a, b) => b.date - a.date).map(r => `
      <div class="review-item">
        <div class="review-item-header">
          <strong>${escapeHtml(r.name)}</strong>
          <span class="review-stars">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</span>
          <span class="review-date">${new Date(r.date).toLocaleDateString("es-ES")}</span>
        </div>
        ${r.text ? `<p class="review-item-text">${escapeHtml(r.text)}</p>` : ""}
      </div>`).join("");
}

// ── Vista favoritos ───────────────────────────────────────────────────────────
function setView(favoritesOnly) {
  showFavoritesOnly = favoritesOnly;
  viewAllButton      ?.classList.toggle("active", !favoritesOnly);
  viewFavoritesButton?.classList.toggle("active",  favoritesOnly);
  renderBooks();
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
if (searchInput)         searchInput.addEventListener("input",    renderBooks);
if (categoryFilter)      categoryFilter.addEventListener("change", renderBooks);
if (sortFilter)          sortFilter.addEventListener("change",    renderBooks);
if (booksGrid)           booksGrid.addEventListener("click",      handleBookAction);
if (viewAllButton)       viewAllButton.addEventListener("click",        () => setView(false));
if (viewFavoritesButton) viewFavoritesButton.addEventListener("click",  () => setView(true));
if (closeDialogButton)   closeDialogButton.addEventListener("click",    () => dialog?.close());

// ── Arranque ──────────────────────────────────────────────────────────────────
loadCategorias().then(() => {
  loadBooks()
    .then(() => renderBooks())
    .catch(() => {
      if (emptyState) {
        emptyState.classList.add("show");
        emptyState.textContent = "No se pudo conectar al servidor. Verifica que el servidor este corriendo.";
      }
    });
});
