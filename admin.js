// admin.js — Panel de Administrador Virtual Library INA 1G

const API            = "http://localhost:3000/api";
const SESSION_KEY    = "vl-admin-session";
const SAVED_USER_KEY = "vl-admin-saved-user";
const ADMIN_PASS     = "0310223542";

// Lista de palabras clave de cada administrador.
// Basta con que el usuario escriba CUALQUIER palabra de su nombre.
const ADMIN_NAMES = [
  "jose david maravilla pena",
  "josue nahum villanueva mendoza",
  "brayan alexander garcia fernandez",
  "miguel antonio pineda hernandez"
];

// Quita tildes y convierte a minusculas
function norm(t) {
  return String(t).toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z\s]/g, "").trim();
}

// Devuelve el nombre completo si lo que escribio el usuario
// coincide con alguna palabra del nombre del admin.
function findAdmin(input) {
  const words = norm(input).split(/\s+/).filter(Boolean);
  return ADMIN_NAMES.find(name => {
    const nameWords = norm(name).split(/\s+/);
    // Cada palabra escrita debe aparecer en el nombre
    return words.every(w => nameWords.some(nw => nw.startsWith(w) || nw === w));
  }) || null;
}

// ── Referencias DOM ───────────────────────────────────────────────────────────
const loginOverlay    = document.getElementById("loginOverlay");
const loginForm       = document.getElementById("loginForm");
const loginUserInput  = document.getElementById("loginUser");
const loginPassInput  = document.getElementById("loginPass");
const loginError      = document.getElementById("loginError");
const adminPanel      = document.getElementById("adminPanel");
const logoutButton    = document.getElementById("logoutButton");
const savedUserBox    = document.getElementById("savedUserBox");
const savedUserAvatar = document.getElementById("savedUserAvatar");
const savedUserName   = document.getElementById("savedUserName");
const changeUserBtn   = document.getElementById("changeUserBtn");
const userFieldWrap   = document.getElementById("userFieldWrap");
const bookForm        = document.getElementById("bookForm");
const addCategoryBtn  = document.getElementById("addCategoryButton");
const newCatInput     = document.getElementById("newCategoryInput");
const categoryListEl  = document.getElementById("categoryList");
const verLibrosBtn    = document.getElementById("verLibrosBtn");
const librosPanel     = document.getElementById("librosPanel");
const closeLibrosBtn  = document.getElementById("closeLibrosPanel");
const statsToggleBtn  = document.getElementById("statsToggleBtn");
const statsDialog     = document.getElementById("statsDialog");

function escapeHtml(t) {
  const el = document.createElement("div");
  el.textContent = String(t);
  return el.innerHTML;
}

async function apiFetch(path, opts = {}) {
  try {
    const r = await fetch(API + path, opts);
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || "Error");
    return j;
  } catch (err) {
    console.warn("[API]", path, err.message);
    throw err;
  }
}

// ── Login ─────────────────────────────────────────────────────────────────────
function loadSavedUser() {
  const saved = localStorage.getItem(SAVED_USER_KEY);
  if (!saved) return;
  // Mostrar avatar con iniciales
  const initials = saved.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  savedUserAvatar.textContent = initials;
  savedUserName.textContent   = saved;
  // IMPORTANTE: guardamos el nombre en el input pero como atributo data,
  // NO como valor visible, para que el usuario no tenga que reescribirlo.
  loginUserInput.dataset.savedName = norm(saved);
  savedUserBox.classList.remove("hidden");
  userFieldWrap.classList.add("hidden");
  loginPassInput.focus();
}

changeUserBtn.addEventListener("click", () => {
  localStorage.removeItem(SAVED_USER_KEY);
  loginUserInput.value = "";
  loginUserInput.dataset.savedName = "";
  savedUserBox.classList.add("hidden");
  userFieldWrap.classList.remove("hidden");
  loginUserInput.focus();
});

loginForm.addEventListener("submit", function (e) {
  e.preventDefault();

  // Si hay nombre guardado (saved user box visible), usarlo directamente
  const savedKey  = loginUserInput.dataset.savedName || "";
  const typedRaw  = loginUserInput.value;
  const inputNorm = savedKey || norm(typedRaw);
  const pass      = loginPassInput.value;

  const match = findAdmin(inputNorm);

  if (match && pass === ADMIN_PASS) {
    // Capitalizar para mostrar
    const display = match.split(" ").map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
    localStorage.setItem(SAVED_USER_KEY, display);
    sessionStorage.setItem(SESSION_KEY, "true");
    loginError.classList.add("hidden");
    showAdminPanel();
  } else {
    loginError.classList.remove("hidden");
    loginPassInput.value = "";
    loginPassInput.focus();
  }
});

logoutButton.addEventListener("click", () => {
  sessionStorage.removeItem(SESSION_KEY);
  adminPanel.classList.add("hidden");
  loginOverlay.classList.remove("hidden");
  document.body.classList.remove("is-admin", "panel-open");
  loginPassInput.value = "";
  loginUserInput.dataset.savedName = "";
  loadSavedUser();
});

// ── Mostrar panel ─────────────────────────────────────────────────────────────
async function showAdminPanel() {
  loginOverlay.classList.add("hidden");
  adminPanel.classList.remove("hidden");
  document.body.classList.add("is-admin");
  await loadCategories();
  renderCategoryList();
  await renderBooks();
}

// ── Categorias ────────────────────────────────────────────────────────────────
let categories = ["Programacion","Literatura","Ciencia","Historia","Matematicas"];

async function loadCategories() {
  try {
    const r  = await apiFetch("/categories");
    categories = r.data;
  } catch { /* usar defaults */ }
}

function rebuildCategorySelects() {
  document.querySelectorAll("#categoryInput,#editCategory,#categoryFilter").forEach(sel => {
    const prev   = sel.value;
    const hasAll = sel.id === "categoryFilter";
    sel.innerHTML = "";
    if (hasAll) { const o = document.createElement("option"); o.value="Todas"; o.textContent="Todas"; sel.appendChild(o); }
    categories.forEach(cat => {
      const o = document.createElement("option");
      o.value = cat; o.textContent = cat;
      sel.appendChild(o);
    });
    if ([...sel.options].some(o => o.value === prev)) sel.value = prev;
  });
}

function renderCategoryList() {
  categoryListEl.innerHTML = "";
  categories.forEach(cat => {
    const row = document.createElement("div");
    row.className = "category-row";
    row.innerHTML = `<span>${escapeHtml(cat)}</span>
      <button class="delete-cat-btn" data-cat="${escapeHtml(cat)}" type="button">x</button>`;
    categoryListEl.appendChild(row);
  });
  rebuildCategorySelects();
}

async function addCategory() {
  const name = newCatInput.value.trim();
  if (!name) return;
  try {
    await apiFetch("/categories", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ name })
    });
    await loadCategories();
  } catch {
    if (!categories.includes(name)) categories.push(name);
  }
  newCatInput.value = "";
  renderCategoryList();
}

async function deleteCategory(catName) {
  if (!confirm(`Eliminar la categoria "${catName}"?`)) return;
  try {
    await apiFetch(`/categories/${encodeURIComponent(catName)}`, { method:"DELETE" });
    await loadCategories();
  } catch {
    categories = categories.filter(c => c !== catName);
  }
  renderCategoryList();
}

addCategoryBtn.addEventListener("click", addCategory);
newCatInput.addEventListener("keydown", e => { if (e.key==="Enter"){ e.preventDefault(); addCategory(); } });
categoryListEl.addEventListener("click", e => {
  const b = e.target.closest(".delete-cat-btn");
  if (b) deleteCategory(b.dataset.cat);
});

// ── Portada (drag & drop + file input) ───────────────────────────────────────
const coverInput       = document.getElementById("coverInput");
const coverUploadArea  = document.getElementById("coverUploadArea");
const coverPreview     = document.getElementById("coverPreview");
const coverPlaceholder = document.getElementById("coverPlaceholder");
const coverRemoveBtn   = document.getElementById("coverRemoveBtn");
let currentCoverBase64 = null;

function showCoverPreview(base64) {
  currentCoverBase64  = base64;
  coverPreview.src    = base64;
  coverPreview.classList.remove("hidden");
  coverPlaceholder.classList.add("hidden");
  coverRemoveBtn.classList.remove("hidden");
}
function clearCoverPreview() {
  currentCoverBase64  = null;
  coverPreview.src    = "";
  coverPreview.classList.add("hidden");
  coverPlaceholder.classList.remove("hidden");
  coverRemoveBtn.classList.add("hidden");
  coverInput.value    = "";
}
function readImageFile(file) {
  if (!file || !file.type.startsWith("image/")) return;
  if (file.size > 2*1024*1024) { alert("Imagen muy grande. Max 2 MB."); return; }
  const r = new FileReader();
  r.onload = ev => showCoverPreview(ev.target.result);
  r.readAsDataURL(file);
}

coverUploadArea.addEventListener("click",    e => { if (e.target!==coverRemoveBtn) coverInput.click(); });
coverInput.addEventListener("change",        () => readImageFile(coverInput.files[0]));
coverRemoveBtn.addEventListener("click",     e => { e.stopPropagation(); clearCoverPreview(); });
coverUploadArea.addEventListener("dragover", e => { e.preventDefault(); coverUploadArea.classList.add("drag-over"); });
coverUploadArea.addEventListener("dragleave",() => coverUploadArea.classList.remove("drag-over"));
coverUploadArea.addEventListener("drop",     e => { e.preventDefault(); coverUploadArea.classList.remove("drag-over"); readImageFile(e.dataTransfer.files[0]); });

// ── Libros: estado y render ───────────────────────────────────────────────────
let books = [];
const colorPalette = ["#1f8a70","#2d6cdf","#d75a4a","#7c3aed","#b7791f","#0f766e"];

const booksGrid      = document.getElementById("booksGrid");
const emptyState     = document.getElementById("emptyState");
const searchInput    = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const sortFilter     = document.getElementById("sortFilter");

async function fetchBooks() {
  try {
    const params = new URLSearchParams();
    if (searchInput?.value)                        params.set("search",   searchInput.value);
    if (categoryFilter?.value && categoryFilter.value !== "Todas") params.set("category", categoryFilter.value);
    if (sortFilter?.value)                         params.set("sort",     sortFilter.value);
    const r = await apiFetch("/books?" + params.toString());
    books   = r.data;
    localStorage.setItem("virtual-library-books", JSON.stringify(books));
  } catch {
    const c = localStorage.getItem("virtual-library-books");
    books = c ? JSON.parse(c) : [];
  }
}

async function renderBooks() {
  if (!booksGrid) return;
  await fetchBooks();
  booksGrid.innerHTML = "";
  emptyState.classList.toggle("show", books.length === 0);

  books.forEach((book, idx) => {
    const card = document.createElement("article");
    card.className = "book-card";
    card.style.animationDelay = `${Math.min(idx * 0.05, 0.4)}s`;

    const coverStyle = book.cover
      ? `background-image:url('${book.cover}');background-size:cover;background-position:center;`
      : `--cover-color:${book.color || "#1f8a70"}`;
    const coverImg = book.cover
      ? `<img src="${book.cover}" alt="Portada" class="book-cover-img" style="width:100%;height:100%;object-fit:cover;">`
      : `<strong>${escapeHtml(book.title)}</strong>`;
    const featBadge = book.featured ? `<span class="featured-badge">Destacado</span>` : "";

    card.innerHTML = `
      <div class="book-cover ${book.cover?"has-cover":""}" style="${coverStyle}">
        ${coverImg}${featBadge}
      </div>
      <div class="book-body">
        <div class="book-meta">
          <span class="badge">${escapeHtml(book.category)}</span>
          <span>${book.year||""}</span>
        </div>
        <h2 class="book-title">${escapeHtml(book.title)}</h2>
        <p class="book-author">${escapeHtml(book.author)}</p>
        <p class="book-description">${escapeHtml(book.description||"Sin descripcion.")}</p>
        <div class="card-actions">
          <button class="read-button"    data-action="read"     data-id="${book.id}" type="button">Leer</button>
          <button class="favorite-button ${book.favorite?"is-favorite":""}" data-action="favorite" data-id="${book.id}" type="button">${book.favorite?"★":"☆"}</button>
          <button class="featured-toggle-btn ${book.featured?"is-featured":""}" data-action="featured" data-id="${book.id}" type="button" title="Destacar">★</button>
          <button class="edit-button"   data-action="edit"     data-id="${book.id}" type="button">Editar</button>
          <button class="delete-button" data-action="delete"   data-id="${book.id}" type="button">&#x2715;</button>
        </div>
      </div>`;
    booksGrid.appendChild(card);
  });
  updateStats();
}

function updateStats() {
  const t = document.getElementById("totalBooks");
  const f = document.getElementById("favoriteBooks");
  const a = document.getElementById("availableBooks");
  if (t) t.textContent = books.length;
  if (f) f.textContent = books.filter(b=>b.favorite).length;
  if (a) a.textContent = books.filter(b=>b.available).length;
}

if (searchInput)    searchInput.addEventListener("input",   renderBooks);
if (categoryFilter) categoryFilter.addEventListener("change", renderBooks);
if (sortFilter)     sortFilter.addEventListener("change",   renderBooks);
if (booksGrid)      booksGrid.addEventListener("click",     handleBookAction);

// ── Acciones en tarjetas ──────────────────────────────────────────────────────
function handleBookAction(e) {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const { action, id } = btn.dataset;
  if (action === "read")     openBookViewer(id);
  if (action === "favorite") toggleFavorite(id);
  if (action === "featured") toggleFeatured(id);
  if (action === "delete")   deleteBook(id);
  if (action === "edit")     openEditDialog(id);
}

async function toggleFavorite(id) {
  try {
    const r = await apiFetch(`/books/${id}/favorite`,{method:"PATCH"});
    const b = books.find(x=>String(x.id)===String(id));
    if (b) b.favorite = r.favorite;
  } catch {
    const b = books.find(x=>String(x.id)===String(id));
    if (b) { b.favorite = !b.favorite; saveLocalBooks(); }
  }
  renderBooks();
}

async function toggleFeatured(id) {
  try {
    const r = await apiFetch(`/books/${id}/featured`,{method:"PATCH"});
    const b = books.find(x=>String(x.id)===String(id));
    if (b) b.featured = r.featured;
  } catch {
    const b = books.find(x=>String(x.id)===String(id));
    if (b) { b.featured = !b.featured; saveLocalBooks(); }
  }
  renderBooks();
}

async function deleteBook(id) {
  const book = books.find(x=>String(x.id)===String(id));
  if (!book) return;
  if (!confirm(`Eliminar "${book.title}"?`)) return;
  try {
    await apiFetch(`/books/${id}`,{method:"DELETE"});
  } catch {
    books = books.filter(x=>String(x.id)!==String(id));
    saveLocalBooks();
  }
  renderBooks();
}

function saveLocalBooks() {
  localStorage.setItem("virtual-library-books", JSON.stringify(books));
}

// ── Visor de Drive ────────────────────────────────────────────────────────────
function toDriveEmbed(url) {
  if (!url) return url;
  const m1 = url.match(/\/file\/d\/([^/]+)/);
  if (m1) return `https://drive.google.com/file/d/${m1[1]}/preview`;
  const m2 = url.match(/[?&]id=([^&]+)/);
  if (m2) return `https://drive.google.com/file/d/${m2[1]}/preview`;
  return url;
}

function openBookViewer(id) {
  const book = books.find(b=>String(b.id)===String(id));
  if (!book) return;
  if (book.link && book.link.trim()) {
    openDriveViewer(book); return;
  }
  // Sin enlace: mostrar dialog de detalle
  const dlg = document.getElementById("bookDialog");
  if (!dlg) return;
  const cv = document.getElementById("dialogCover");
  cv.style.setProperty("--cover-color", book.color||"#1f8a70");
  cv.style.backgroundImage = book.cover ? `url('${book.cover}')` : "";
  cv.classList.toggle("has-cover", !!book.cover);
  document.getElementById("dialogCategory").textContent    = book.category;
  document.getElementById("dialogTitle").textContent       = book.title;
  document.getElementById("dialogAuthor").textContent      = book.author;
  document.getElementById("dialogDescription").textContent = book.description||"Sin descripcion.";
  document.getElementById("dialogYear").textContent        = `Año: ${book.year||""}`;
  document.getElementById("dialogStatus").textContent      = book.available ? "Disponible" : "No disponible";
  document.getElementById("dialogReadLink").classList.add("hidden");
  dlg.showModal();
}

function openDriveViewer(book) {
  document.getElementById("adminDriveViewer")?.remove();
  const embed  = toDriveEmbed(book.link);
  const viewer = document.createElement("div");
  viewer.id = "adminDriveViewer"; viewer.className = "pdf-viewer-overlay";
  viewer.innerHTML = `
    <div class="pdf-viewer-box" id="driveViewerBox">
      <div class="pdf-viewer-header">
        <div>
          <span class="eyebrow">${escapeHtml(book.category)}</span>
          <h2 style="margin:2px 0;font-size:16px;">${escapeHtml(book.title)}</h2>
          <p style="margin:0;color:var(--muted);font-size:13px;">${escapeHtml(book.author)}</p>
        </div>
        <div class="pdf-viewer-actions">
          <button class="pdf-expand-btn" id="driveAgrandarBtn" type="button">Agrandar</button>
          <button class="close-button" id="closeAdminViewer" type="button">&#x2715;</button>
        </div>
      </div>
      <iframe class="pdf-frame" id="driveFrame" src="${escapeHtml(embed)}" allowfullscreen allow="autoplay"></iframe>
    </div>`;
  document.body.appendChild(viewer);

  // Agrandar / Reducir
  const box = document.getElementById("driveViewerBox");
  const btn = document.getElementById("driveAgrandarBtn");
  btn.addEventListener("click", () => {
    const expanded = box.classList.toggle("pdf-viewer-fullscreen");
    btn.textContent = expanded ? "Reducir" : "Agrandar";
  });

  const close = () => { viewer.remove(); document.body.style.overflow = ""; };
  document.getElementById("closeAdminViewer").addEventListener("click", close);
  viewer.addEventListener("click", ev => { if (ev.target === viewer) close(); });
  document.body.style.overflow = "hidden";
}

const closeDialogBtn = document.getElementById("closeDialogButton");
if (closeDialogBtn) closeDialogBtn.addEventListener("click", () => document.getElementById("bookDialog")?.close());

// ── Agregar libro ─────────────────────────────────────────────────────────────
bookForm.addEventListener("submit", async function(e) {
  e.preventDefault();
  const link = document.getElementById("linkInput").value.trim();
  if (link && !link.startsWith("http")) { alert("El enlace debe empezar con http:// o https://"); return; }

  const newBook = {
    id:          crypto.randomUUID(),
    title:       document.getElementById("titleInput").value.trim(),
    author:      document.getElementById("authorInput").value.trim(),
    category:    document.getElementById("categoryInput").value,
    year:        document.getElementById("yearInput").value,
    description: document.getElementById("descriptionInput").value.trim(),
    link,
    available:   document.getElementById("availableInput").checked,
    cover:       currentCoverBase64 || null,
    color:       colorPalette[books.length % colorPalette.length],
    favorite:    false,
    featured:    false
  };

  try {
    const r = await apiFetch("/books", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ ...newBook, cover_base64: newBook.cover||"" })
    });
    books.unshift(r.data);
  } catch {
    books.unshift(newBook);
    saveLocalBooks();
  }

  bookForm.reset();
  document.getElementById("yearInput").value = new Date().getFullYear();
  clearCoverPreview();
  renderBooks();
  showToast(`"${newBook.title}" agregado correctamente.`);
});

function showToast(msg) {
  const t = document.createElement("div");
  t.className = "admin-toast"; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add("show"), 50);
  setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 400); }, 3000);
}

// ── Editar libro ──────────────────────────────────────────────────────────────
const editDialog   = document.getElementById("editDialog");
const editForm     = document.getElementById("editForm");
const closeEditBtn = document.getElementById("closeEditDialog");

function openEditDialog(id) {
  const book = books.find(b=>String(b.id)===String(id));
  if (!book) return;
  const sel = document.getElementById("editCategory");
  sel.innerHTML = "";
  categories.forEach(cat => {
    const o = document.createElement("option");
    o.value = cat; o.textContent = cat;
    if (cat === book.category) o.selected = true;
    sel.appendChild(o);
  });
  document.getElementById("editBookId").value       = book.id;
  document.getElementById("editTitle").value        = book.title;
  document.getElementById("editAuthor").value       = book.author;
  document.getElementById("editYear").value         = book.year||"";
  document.getElementById("editLink").value         = book.link||"";
  document.getElementById("editDescription").value  = book.description||"";
  document.getElementById("editAvailable").checked  = !!book.available;
  editDialog.showModal();
}

if (closeEditBtn) closeEditBtn.addEventListener("click", () => editDialog.close());

editForm.addEventListener("submit", async function(e) {
  e.preventDefault();
  const id   = document.getElementById("editBookId").value;
  const body = {
    title:       document.getElementById("editTitle").value.trim(),
    author:      document.getElementById("editAuthor").value.trim(),
    category:    document.getElementById("editCategory").value,
    year:        document.getElementById("editYear").value,
    link:        document.getElementById("editLink").value.trim(),
    description: document.getElementById("editDescription").value.trim(),
    available:   document.getElementById("editAvailable").checked
  };
  try {
    const r = await apiFetch(`/books/${id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    books = books.map(b=>String(b.id)===String(id)?r.data:b);
  } catch {
    books = books.map(b=>String(b.id)===String(id)?{...b,...body}:b);
    saveLocalBooks();
  }
  renderBooks();
  editDialog.close();
});

// ── Panel Ver Libros ──────────────────────────────────────────────────────────
verLibrosBtn.addEventListener("click",  () => { librosPanel.classList.remove("hidden"); document.body.classList.add("panel-open"); renderBooks(); });
closeLibrosBtn.addEventListener("click",() => { librosPanel.classList.add("hidden"); document.body.classList.remove("panel-open"); });

// ── Estadisticas ──────────────────────────────────────────────────────────────
statsToggleBtn.addEventListener("click", async () => {
  try {
    const r    = await apiFetch("/stats");
    const d    = r.data;
    document.getElementById("adminStatsGrid").innerHTML = `
      <div class="admin-stat-card"><strong>${d.total_books}</strong><span>Libros</span></div>
      <div class="admin-stat-card"><strong>${d.total_users}</strong><span>Usuarios</span></div>
      <div class="admin-stat-card"><strong>${d.total_reads}</strong><span>Lecturas</span></div>
      <div class="admin-stat-card"><strong>${d.total_reviews}</strong><span>Resenas</span></div>
      <div class="admin-stat-card"><strong>${d.plan_count.diamond}</strong><span>Diamante</span></div>
      <div class="admin-stat-card"><strong>${d.plan_count.silver}</strong><span>Plata</span></div>`;
    const topEl = document.getElementById("topBooksList");
    topEl.innerHTML = (d.top_books||[]).length
      ? d.top_books.map(b=>`<div class="top-book-row"><div class="top-book-cover" style="${b.cover?`background-image:url('${b.cover}');background-size:cover`:`background:${b.color}`}"></div><div><strong>${escapeHtml(b.title)}</strong><span> — ${escapeHtml(b.author)}</span></div><span class="top-book-count">${b.reads} lecturas</span></div>`).join("")
      : `<p style="color:var(--muted);font-size:14px;">Sin lecturas aun.</p>`;
    const usersR = await apiFetch("/users");
    const uEl = document.getElementById("usersList");
    uEl.innerHTML = usersR.data.length
      ? usersR.data.map(u=>`<div class="stats-user-row"><div class="stats-user-avatar">${escapeHtml(u.name.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase())}</div><div><strong>${escapeHtml(u.name)}</strong><span class="stats-user-email">${escapeHtml(u.email)}</span></div><span class="stats-user-plan">${u.plan}</span></div>`).join("")
      : `<p style="color:var(--muted);">Sin usuarios registrados.</p>`;
  } catch {
    document.getElementById("adminStatsGrid").innerHTML = `<p style="color:var(--muted);">Conecta el backend para ver estadisticas.</p>`;
  }
  statsDialog.showModal();
});
document.getElementById("closeStatsDialog").addEventListener("click", () => statsDialog.close());

// ── Arranque ──────────────────────────────────────────────────────────────────
if (sessionStorage.getItem(SESSION_KEY) === "true") {
  showAdminPanel();
} else {
  loadSavedUser();
}
