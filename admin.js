// admin.js — Panel de Administrador conectado a la API REST
"use strict";

const API            = "http://localhost:3000";
const SESSION_KEY    = "vl-admin-session";
const SAVED_USER_KEY = "vl-admin-saved-user";

// ── Helpers ───────────────────────────────────────────────────────────────────
function norm(t) {
  return String(t).toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z\s]/g, "").trim();
}
function escapeHtml(t) {
  const el = document.createElement("div");
  el.textContent = String(t);
  return el.innerHTML;
}
function showToast(msg) {
  const t = document.createElement("div");
  t.className = "admin-toast"; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add("show"), 50);
  setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 400); }, 3000);
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

// ── Login ─────────────────────────────────────────────────────────────────────
function loadSavedUser() {
  const saved = localStorage.getItem(SAVED_USER_KEY);
  if (!saved) return;
  const initials = saved.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  savedUserAvatar.textContent      = initials;
  savedUserName.textContent        = saved;
  loginUserInput.dataset.savedUser = norm(saved);
  savedUserBox.classList.remove("hidden");
  userFieldWrap.classList.add("hidden");
  loginPassInput.focus();
}

changeUserBtn.addEventListener("click", () => {
  localStorage.removeItem(SAVED_USER_KEY);
  loginUserInput.value             = "";
  loginUserInput.dataset.savedUser = "";
  savedUserBox.classList.add("hidden");
  userFieldWrap.classList.remove("hidden");
  loginUserInput.focus();
});

loginForm.addEventListener("submit", async function (e) {
  e.preventDefault();
  loginError.classList.add("hidden");

  // Si hay usuario guardado usamos su valor normalizado como usuario
  const usuario = loginUserInput.dataset.savedUser || norm(loginUserInput.value);
  const pass    = loginPassInput.value;

  if (!usuario || !pass) {
    loginError.textContent = "Completa todos los campos.";
    loginError.classList.remove("hidden");
    return;
  }

  const submitBtn = loginForm.querySelector("button[type=submit]");
  submitBtn.disabled = true; submitBtn.textContent = "Ingresando...";

  try {
    const res  = await fetch(`${API}/api/admin/login`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ usuario, password: pass })
    });
    const json = await res.json();

    if (!json.ok) {
      loginError.textContent = json.error || "Usuario o contrasena incorrectos.";
      loginError.classList.remove("hidden");
      loginPassInput.value = "";
      loginPassInput.focus();
      return;
    }

    const admin   = json.data;
    const display = [admin.nombre, admin.apellidos].filter(Boolean)
      .map(p => p.split(" ").map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(" "))
      .join(" ");
    localStorage.setItem(SAVED_USER_KEY, display || admin.usuario);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: admin.id, usuario: admin.usuario, nombre: display }));
    showAdminPanel();
  } catch {
    loginError.textContent = "No se pudo conectar con el servidor. Verifica que el backend este activo.";
    loginError.classList.remove("hidden");
  } finally {
    submitBtn.disabled = false; submitBtn.textContent = "Ingresar";
  }
});

logoutButton.addEventListener("click", () => {
  sessionStorage.removeItem(SESSION_KEY);
  adminPanel.classList.add("hidden");
  loginOverlay.classList.remove("hidden");
  document.body.classList.remove("is-admin", "panel-open");
  loginPassInput.value             = "";
  loginUserInput.dataset.savedUser = "";
  loadSavedUser();
});

// ── Panel ─────────────────────────────────────────────────────────────────────
function showAdminPanel() {
  loginOverlay.classList.add("hidden");
  adminPanel.classList.remove("hidden");
  document.body.classList.add("is-admin");
  loadCategorias();
  renderBooks();
}

// ── Categorias ────────────────────────────────────────────────────────────────
let categories = [];

async function loadCategorias() {
  try {
    const res  = await fetch(`${API}/api/categorias`);
    const json = await res.json();
    categories = json.ok ? json.data : [];
    renderCategoryList();
  } catch { /* silencioso */ }
}

function rebuildCategorySelects() {
  document.querySelectorAll("#categoryInput,#editCategory,#categoryFilter").forEach(sel => {
    const prev   = sel.value;
    const hasAll = sel.id === "categoryFilter";
    sel.innerHTML = "";
    if (hasAll) {
      const o = document.createElement("option");
      o.value = "Todas"; o.textContent = "Todas";
      sel.appendChild(o);
    }
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
  const nombre = newCatInput.value.trim();
  if (!nombre || categories.includes(nombre)) return;
  try {
    const res  = await fetch(`${API}/api/categorias`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ nombre })
    });
    const json = await res.json();
    if (!json.ok) { alert(json.error || "Error al agregar categoria."); return; }
    newCatInput.value = "";
    await loadCategorias();
  } catch { alert("Error de conexion."); }
}

async function deleteCategory(catName) {
  if (!confirm(`Eliminar la categoria "${catName}"?`)) return;
  try {
    const res  = await fetch(`${API}/api/categorias/${encodeURIComponent(catName)}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.ok) { alert(json.error || "Error al eliminar categoria."); return; }
    await loadCategorias();
  } catch { alert("Error de conexion."); }
}

addCategoryBtn.addEventListener("click", addCategory);
newCatInput.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); addCategory(); } });
categoryListEl.addEventListener("click", e => {
  const b = e.target.closest(".delete-cat-btn");
  if (b) deleteCategory(b.dataset.cat);
});

// ── Portada ───────────────────────────────────────────────────────────────────
const coverInput       = document.getElementById("coverInput");
const coverUploadArea  = document.getElementById("coverUploadArea");
const coverPreview     = document.getElementById("coverPreview");
const coverPlaceholder = document.getElementById("coverPlaceholder");
const coverRemoveBtn   = document.getElementById("coverRemoveBtn");
let currentCoverFile   = null;   // File object para subir como multipart
let currentCoverBase64 = null;   // Fallback base64

function showCoverPreview(base64, file) {
  currentCoverBase64 = base64;
  currentCoverFile   = file || null;
  coverPreview.src   = base64;
  coverPreview.classList.remove("hidden");
  coverPlaceholder.classList.add("hidden");
  coverRemoveBtn.classList.remove("hidden");
}
function clearCoverPreview() {
  currentCoverBase64 = null;
  currentCoverFile   = null;
  coverPreview.src   = "";
  coverPreview.classList.add("hidden");
  coverPlaceholder.classList.remove("hidden");
  coverRemoveBtn.classList.add("hidden");
  coverInput.value   = "";
}
function readImageFile(file) {
  if (!file || !file.type.startsWith("image/")) return;
  if (file.size > 2 * 1024 * 1024) { alert("Imagen muy grande. Max 2 MB."); return; }
  const r = new FileReader();
  r.onload = ev => showCoverPreview(ev.target.result, file);
  r.readAsDataURL(file);
}

coverUploadArea.addEventListener("click",    e => { if (e.target !== coverRemoveBtn) coverInput.click(); });
coverInput.addEventListener("change",        () => readImageFile(coverInput.files[0]));
coverRemoveBtn.addEventListener("click",     e => { e.stopPropagation(); clearCoverPreview(); });
coverUploadArea.addEventListener("dragover", e => { e.preventDefault(); coverUploadArea.classList.add("drag-over"); });
coverUploadArea.addEventListener("dragleave",() => coverUploadArea.classList.remove("drag-over"));
coverUploadArea.addEventListener("drop",     e => { e.preventDefault(); coverUploadArea.classList.remove("drag-over"); readImageFile(e.dataTransfer.files[0]); });

// ── Libros: render ────────────────────────────────────────────────────────────
let books = [];

const booksGrid      = document.getElementById("booksGrid");
const emptyState     = document.getElementById("emptyState");
const searchInput    = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const sortFilter     = document.getElementById("sortFilter");

async function renderBooks() {
  if (!booksGrid) return;
  try {
    const search    = searchInput?.value.trim()  || "";
    const categoria = categoryFilter?.value      || "Todas";
    const sort      = sortFilter?.value          || "titulo";
    const params    = new URLSearchParams();
    if (search)                      params.set("search",    search);
    if (categoria !== "Todas")       params.set("categoria", categoria);
    if (sort)                        params.set("sort",      sort);

    const res  = await fetch(`${API}/api/libros?${params}`);
    const json = await res.json();
    books = json.ok ? json.data : [];
  } catch {
    booksGrid.innerHTML = `<p style="color:var(--muted);padding:24px;">Error al conectar con el servidor.</p>`;
    return;
  }

  booksGrid.innerHTML = "";
  emptyState.classList.toggle("show", books.length === 0);

  books.forEach((book, idx) => {
    const card = document.createElement("article");
    card.className = "book-card";
    card.style.animationDelay = `${Math.min(idx * 0.05, 0.4)}s`;

    const portadaUrl = book.portada ? `${API}${book.portada}` : "";
    const coverStyle = portadaUrl
      ? `background-image:url('${portadaUrl}');background-size:cover;background-position:center;`
      : `--cover-color:${book.color || "#1f8a70"}`;
    const coverImg = portadaUrl
      ? `<img src="${portadaUrl}" alt="Portada" class="book-cover-img" style="width:100%;height:100%;object-fit:cover;">`
      : `<strong>${escapeHtml(book.titulo)}</strong>`;
    const featBadge = book.destacado ? `<span class="featured-badge">Destacado</span>` : "";

    card.innerHTML = `
      <div class="book-cover ${portadaUrl ? "has-cover" : ""}" style="${coverStyle}">
        ${coverImg}${featBadge}
      </div>
      <div class="book-body">
        <div class="book-meta">
          <span class="badge">${escapeHtml(book.categoria || "")}</span>
          <span>${book.anio || ""}</span>
        </div>
        <h2 class="book-title">${escapeHtml(book.titulo)}</h2>
        <p class="book-author">${escapeHtml(book.autor)}</p>
        <p class="book-description">${escapeHtml(book.descripcion || "Sin descripcion.")}</p>
        <div class="card-actions">
          <button class="read-button"    data-action="read"     data-id="${book.id}" type="button">Leer</button>
          <button class="favorite-button ${book.favorito ? "is-favorite" : ""}" data-action="favorite" data-id="${book.id}" type="button">${book.favorito ? "★" : "☆"}</button>
          <button class="featured-toggle-btn ${book.destacado ? "is-featured" : ""}" data-action="featured" data-id="${book.id}" type="button" title="Destacar">★</button>
          <button class="edit-button"   data-action="edit"     data-id="${book.id}" type="button">Editar</button>
          <button class="delete-button" data-action="delete"   data-id="${book.id}" type="button">&#x2715;</button>
        </div>
      </div>`;
    booksGrid.appendChild(card);
  });
  updateStats();
}

async function updateStats() {
  try {
    const res  = await fetch(`${API}/api/stats`);
    const json = await res.json();
    if (!json.ok) return;
    const d = json.data;
    const t = document.getElementById("totalBooks");
    const f = document.getElementById("favoriteBooks");
    const a = document.getElementById("availableBooks");
    if (t) t.textContent = d.total_libros       ?? "";
    if (a) a.textContent = d.libros_disponibles ?? "";
    // favoritos no está en /api/stats, lo calculamos de los libros cargados
    if (f) f.textContent = books.filter(b => b.favorito).length;
  } catch { /* silencioso */ }
}

if (searchInput)    searchInput.addEventListener("input",    renderBooks);
if (categoryFilter) categoryFilter.addEventListener("change", renderBooks);
if (sortFilter)     sortFilter.addEventListener("change",    renderBooks);
if (booksGrid)      booksGrid.addEventListener("click",      handleBookAction);

// ── Acciones ──────────────────────────────────────────────────────────────────
function handleBookAction(e) {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const { action, id } = btn.dataset;
  if (action === "read")     openBookViewer(id);
  if (action === "favorite") toggleFavorite(id, btn);
  if (action === "featured") toggleFeatured(id, btn);
  if (action === "delete")   deleteBook(id);
  if (action === "edit")     openEditDialog(id);
}

async function toggleFavorite(id, btn) {
  try {
    const res  = await fetch(`${API}/api/libros/${id}/favorito`, { method: "PATCH" });
    const json = await res.json();
    if (!json.ok) return;
    const b = books.find(x => String(x.id) === String(id));
    if (b) b.favorito = json.data.favorito;
    if (btn) {
      btn.classList.toggle("is-favorite", !!json.data.favorito);
      btn.textContent = json.data.favorito ? "★" : "☆";
    }
    updateStats();
  } catch { /* silencioso */ }
}

async function toggleFeatured(id, btn) {
  try {
    const res  = await fetch(`${API}/api/libros/${id}/destacado`, { method: "PATCH" });
    const json = await res.json();
    if (!json.ok) return;
    const b = books.find(x => String(x.id) === String(id));
    if (b) b.destacado = json.data.destacado;
    if (btn) btn.classList.toggle("is-featured", !!json.data.destacado);
    // Refrescar para reordenar (los destacados van primero)
    renderBooks();
  } catch { /* silencioso */ }
}

async function deleteBook(id) {
  const book = books.find(x => String(x.id) === String(id));
  if (!book) return;
  if (!confirm(`Eliminar "${book.titulo}"?`)) return;
  try {
    const res  = await fetch(`${API}/api/libros/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.ok) { alert(json.error || "Error al eliminar."); return; }
    renderBooks();
  } catch { alert("Error de conexion."); }
}

// ── Visor PDF / Drive ─────────────────────────────────────────────────────────
function toDriveEmbed(url) {
  if (!url) return url;
  if (url.startsWith("/uploads/")) return `${API}${url}`;
  const m1 = url.match(/\/file\/d\/([^/]+)/);
  if (m1) return `https://drive.google.com/file/d/${m1[1]}/preview`;
  const m2 = url.match(/[?&]id=([^&]+)/);
  if (m2) return `https://drive.google.com/file/d/${m2[1]}/preview`;
  return url;
}

function openBookViewer(id) {
  const book = books.find(b => String(b.id) === String(id));
  if (!book) return;
  if (book.enlace && book.enlace.trim()) { openDriveViewer(book); return; }
  const dlg = document.getElementById("bookDialog");
  if (!dlg) return;
  const cv = document.getElementById("dialogCover");
  cv.style.setProperty("--cover-color", book.color || "#1f8a70");
  const portadaUrl = book.portada ? `${API}${book.portada}` : "";
  cv.style.backgroundImage = portadaUrl ? `url('${portadaUrl}')` : "";
  cv.classList.toggle("has-cover", !!portadaUrl);
  document.getElementById("dialogCategory").textContent    = book.categoria || "";
  document.getElementById("dialogTitle").textContent       = book.titulo;
  document.getElementById("dialogAuthor").textContent      = book.autor;
  document.getElementById("dialogDescription").textContent = book.descripcion || "Sin descripcion.";
  document.getElementById("dialogYear").textContent        = `Año: ${book.anio || ""}`;
  document.getElementById("dialogStatus").textContent      = book.disponible ? "Disponible" : "No disponible";
  document.getElementById("dialogReadLink").classList.add("hidden");
  dlg.showModal();
}

function openDriveViewer(book) {
  document.getElementById("adminDriveViewer")?.remove();
  const embed  = toDriveEmbed(book.enlace);
  const viewer = document.createElement("div");
  viewer.id = "adminDriveViewer"; viewer.className = "pdf-viewer-overlay";
  viewer.innerHTML = `
    <div class="pdf-viewer-box" id="driveViewerBox">
      <div class="pdf-viewer-header">
        <div>
          <span class="eyebrow">${escapeHtml(book.categoria || "")}</span>
          <h2 style="margin:2px 0;font-size:16px;">${escapeHtml(book.titulo)}</h2>
          <p style="margin:0;color:var(--muted);font-size:13px;">${escapeHtml(book.autor)}</p>
        </div>
        <div class="pdf-viewer-actions">
          <button class="pdf-expand-btn" id="driveAgrandarBtn" type="button">Agrandar</button>
          <button class="close-button"   id="closeAdminViewer" type="button">&#x2715;</button>
        </div>
      </div>
      <iframe class="pdf-frame" id="driveFrame" src="${escapeHtml(embed)}" allowfullscreen allow="autoplay"></iframe>
    </div>`;
  document.body.appendChild(viewer);
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

document.getElementById("closeDialogButton")?.addEventListener("click", () => document.getElementById("bookDialog")?.close());

// ── Agregar libro ─────────────────────────────────────────────────────────────
bookForm.addEventListener("submit", async function (e) {
  e.preventDefault();
  const enlace = document.getElementById("linkInput").value.trim();
  if (enlace && !enlace.startsWith("http")) { alert("El enlace debe empezar con http:// o https://"); return; }

  const submitBtn = bookForm.querySelector("button[type=submit]");
  submitBtn.disabled = true; submitBtn.textContent = "Guardando...";

  try {
    const formData = new FormData();
    formData.append("titulo",      document.getElementById("titleInput").value.trim());
    formData.append("autor",       document.getElementById("authorInput").value.trim());
    formData.append("categoria",   document.getElementById("categoryInput").value);
    formData.append("anio",        document.getElementById("yearInput").value || "");
    formData.append("descripcion", document.getElementById("descriptionInput").value.trim());
    formData.append("enlace",      enlace);
    formData.append("disponible",  document.getElementById("availableInput").checked ? "true" : "false");

    if (currentCoverFile) {
      formData.append("portada", currentCoverFile);
    } else if (currentCoverBase64) {
      formData.append("portada_base64", currentCoverBase64);
    }

    const res  = await fetch(`${API}/api/libros`, { method: "POST", body: formData });
    const json = await res.json();
    if (!json.ok) { alert(json.error || "Error al guardar el libro."); return; }

    bookForm.reset();
    document.getElementById("yearInput").value = new Date().getFullYear();
    clearCoverPreview();
    renderBooks();
    showToast(`"${json.data.titulo}" agregado correctamente.`);
  } catch { alert("Error de conexion al guardar el libro."); }
  finally { submitBtn.disabled = false; submitBtn.textContent = "Agregar libro"; }
});

// ── Editar libro ──────────────────────────────────────────────────────────────
const editDialog   = document.getElementById("editDialog");
const editForm     = document.getElementById("editForm");
const closeEditBtn = document.getElementById("closeEditDialog");

function openEditDialog(id) {
  const book = books.find(b => String(b.id) === String(id));
  if (!book) return;
  const sel = document.getElementById("editCategory");
  sel.innerHTML = "";
  categories.forEach(cat => {
    const o = document.createElement("option");
    o.value = cat; o.textContent = cat;
    if (cat === book.categoria) o.selected = true;
    sel.appendChild(o);
  });
  document.getElementById("editBookId").value      = book.id;
  document.getElementById("editTitle").value       = book.titulo;
  document.getElementById("editAuthor").value      = book.autor;
  document.getElementById("editYear").value        = book.anio || "";
  document.getElementById("editLink").value        = book.enlace || "";
  document.getElementById("editDescription").value = book.descripcion || "";
  document.getElementById("editAvailable").checked = !!book.disponible;
  editDialog.showModal();
}

if (closeEditBtn) closeEditBtn.addEventListener("click", () => editDialog.close());

editForm.addEventListener("submit", async function (e) {
  e.preventDefault();
  const id  = document.getElementById("editBookId").value;
  const btn = editForm.querySelector("button[type=submit]");
  btn.disabled = true; btn.textContent = "Guardando...";

  try {
    const body = {
      titulo:      document.getElementById("editTitle").value.trim(),
      autor:       document.getElementById("editAuthor").value.trim(),
      categoria:   document.getElementById("editCategory").value,
      anio:        document.getElementById("editYear").value || null,
      enlace:      document.getElementById("editLink").value.trim(),
      descripcion: document.getElementById("editDescription").value.trim(),
      disponible:  document.getElementById("editAvailable").checked ? "true" : "false"
    };
    const res  = await fetch(`${API}/api/libros/${id}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body)
    });
    const json = await res.json();
    if (!json.ok) { alert(json.error || "Error al actualizar."); return; }
    renderBooks();
    editDialog.close();
    showToast("Libro actualizado correctamente.");
  } catch { alert("Error de conexion."); }
  finally { btn.disabled = false; btn.textContent = "Guardar cambios"; }
});

// ── Panel Ver Libros ──────────────────────────────────────────────────────────
verLibrosBtn.addEventListener("click",   () => { librosPanel.classList.remove("hidden"); document.body.classList.add("panel-open"); renderBooks(); });
closeLibrosBtn.addEventListener("click", () => { librosPanel.classList.add("hidden"); document.body.classList.remove("panel-open"); });

// ── Estadisticas desde API ────────────────────────────────────────────────────
statsToggleBtn.addEventListener("click", async () => {
  try {
    const [statsRes, usersRes] = await Promise.all([
      fetch(`${API}/api/stats`),
      fetch(`${API}/api/usuarios`)
    ]);
    const statsJson = await statsRes.json();
    const usersJson = await usersRes.json();

    const d     = statsJson.ok ? statsJson.data : {};
    const users = usersJson.ok ? usersJson.data : [];

    document.getElementById("adminStatsGrid").innerHTML = `
      <div class="admin-stat-card"><strong>${d.total_libros       ?? 0}</strong><span>Libros</span></div>
      <div class="admin-stat-card"><strong>${users.length}</strong><span>Usuarios</span></div>
      <div class="admin-stat-card"><strong>${d.total_lecturas     ?? 0}</strong><span>Lecturas</span></div>
      <div class="admin-stat-card"><strong>${d.total_resenas      ?? 0}</strong><span>Resenas</span></div>
      <div class="admin-stat-card"><strong>${d.libros_disponibles ?? 0}</strong><span>Disponibles</span></div>`;

    // Top libros mas leidos
    const topEl = document.getElementById("topBooksList");
    const top   = d.top_libros || [];
    topEl.innerHTML = top.length
      ? top.map(b => {
          const portadaUrl = b.portada ? `${API}${b.portada}` : "";
          return `
            <div class="top-book-row">
              <div class="top-book-cover" style="${portadaUrl ? `background-image:url('${portadaUrl}');background-size:cover` : `background:${b.color}`}"></div>
              <div><strong>${escapeHtml(b.titulo)}</strong><span> — ${escapeHtml(b.autor)}</span></div>
              <span class="top-book-count">${b.lecturas} lecturas</span>
            </div>`;
        }).join("")
      : `<p style="color:var(--muted);font-size:14px;">Sin lecturas aun.</p>`;

    // Lista de usuarios
    const uEl = document.getElementById("usersList");
    uEl.innerHTML = users.length
      ? users.map(u => `
          <div class="stats-user-row">
            <div class="stats-user-avatar">${escapeHtml((u.nombre || u.email).split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase())}</div>
            <div><strong>${escapeHtml(u.nombre || "")}</strong><span class="stats-user-email">${escapeHtml(u.email)}</span></div>
            <span class="stats-user-plan">${u.plan}</span>
          </div>`).join("")
      : `<p style="color:var(--muted);">Sin usuarios registrados aun.</p>`;

    statsDialog.showModal();
  } catch {
    alert("No se pudo cargar las estadisticas. Verifica que el backend este activo.");
  }
});

document.getElementById("closeStatsDialog").addEventListener("click", () => statsDialog.close());

// ── Arranque ──────────────────────────────────────────────────────────────────
if (sessionStorage.getItem(SESSION_KEY)) {
  showAdminPanel();
} else {
  loadSavedUser();
}
