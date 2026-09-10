// perfil.js — Perfil conectado a la API REST
"use strict";

const API         = "http://localhost:3000";
const SESSION_KEY = "vl-user-session";

function getSession() {
  const s = sessionStorage.getItem(SESSION_KEY);
  return s ? JSON.parse(s) : null;
}
function escapeHtml(text) {
  const el = document.createElement("div");
  el.textContent = String(text);
  return el.innerHTML;
}
function getAvatarKey(email) { return "vl-avatar-" + email; }

async function renderPerfil() {
  const session = getSession();
  if (!session) return;

  // Avatar
  const initials = session.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const avatarEl = document.getElementById("perfilAvatar");
  const savedAvatar = localStorage.getItem(getAvatarKey(session.email));
  if (avatarEl) {
    if (savedAvatar) {
      avatarEl.style.backgroundImage    = `url('${savedAvatar}')`;
      avatarEl.style.backgroundSize     = "cover";
      avatarEl.style.backgroundPosition = "center";
      avatarEl.style.color              = "transparent";
    } else {
      avatarEl.textContent = initials;
    }
  }

  document.getElementById("perfilNombre").textContent = session.name;
  document.getElementById("perfilEmail").textContent  = session.email;

  setupAvatarUpload(session.email);

  // Cargar membresía real desde la BD (equivalente a loadMembership() del PHP)
  await loadMembership(session);

  // Historial desde la API
  await loadHistorial(session.email);
}

async function loadHistorial(email) {
  try {
    const res  = await fetch(`${API}/api/historial/${encodeURIComponent(email)}`);
    const json = await res.json();
    const historial = json.ok ? json.data : [];

    const statEl = document.getElementById("statLeidos");
    if (statEl) statEl.textContent = historial.length;

    renderHistorial(historial);
  } catch {
    const statEl = document.getElementById("statLeidos");
    if (statEl) statEl.textContent = "—";
    const list  = document.getElementById("historialList");
    const empty = document.getElementById("historialEmpty");
    if (list)  list.innerHTML = "";
    if (empty) { empty.textContent = "Error al cargar el historial."; empty.classList.add("show"); }
  }
}

// loadMembership — equivalente al PHP membership.php
async function loadMembership(session) {
  const badge = document.getElementById("perfilPlanBadge");

  try {
    const res  = await fetch(`${API}/api/membresia/${session.id}`);
    const json = await res.json();
    if (!json.ok) throw new Error("sin datos");
    const m = json.data;

    // Badge del plan en el header
    const badges = {
      free:    { label: "Gratis",   cls: "plan-badge-free"    },
      silver:  { label: "Plata",    cls: "plan-badge-silver"  },
      diamond: { label: "Diamante", cls: "plan-badge-diamond" }
    };
    const bInfo = badges[m.plan] || badges.free;
    if (badge) { badge.textContent = bInfo.label; badge.className = "plan-badge " + bInfo.cls; }

    // Actualizar sesión local
    const s  = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "{}");
    s.plan   = m.plan;
    s.planExpiry = m.expiration_date ? new Date(m.expiration_date).getTime() : null;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));

    // Rellenar los campos del HTML (los mismos IDs del PHP)
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    set("membershipName",  m.name);
    set("membershipPrice", Number(m.price).toFixed(2));
    set("booksUsed",       m.books_used_today ?? 0);
    set("availableBooks",  m.book_limit >= 999999 ? "∞" : m.available_books);
    set("expirationDate",  m.expiration_date
      ? new Date(m.expiration_date).toLocaleDateString("es-ES")
      : "Sin vencimiento");
    set("daysRemaining",   m.days_remaining === null ? "∞" : m.days_remaining);

    const statusEl = document.getElementById("membershipStatus");
    if (statusEl) {
      statusEl.textContent = m.active ? "Activa" : "Expirada";
      statusEl.className   = m.active ? "plan-active-tag" : "plan-expired-tag";
    }

    // Marcar el botón del plan activo
    highlightActivePlan(m.plan);

  } catch {
    const planKey = session.plan || "free";
    const badges  = {
      free:    { label: "Gratis",   cls: "plan-badge-free"    },
      silver:  { label: "Plata",    cls: "plan-badge-silver"  },
      diamond: { label: "Diamante", cls: "plan-badge-diamond" }
    };
    const bInfo = badges[planKey] || badges.free;
    if (badge) { badge.textContent = bInfo.label; badge.className = "plan-badge " + bInfo.cls; }
    const nm = document.getElementById("membershipName");
    if (nm) nm.textContent = bInfo.label;
  }
}

function highlightActivePlan(plan) {
  const map = { free: 1, silver: 2, diamond: 3 };
  const btns = document.querySelectorAll(".perfil-planes-grid .plan-btn");
  btns.forEach(btn => {
    btn.disabled = false;
    btn.classList.remove("plan-btn-active");
  });
  const idx = (map[plan] || 1) - 1;
  if (btns[idx]) {
    btns[idx].textContent = "Plan actual";
    btns[idx].disabled    = true;
    btns[idx].classList.add("plan-btn-active");
  }
}

// selectMembership — equivalente a activate_membership.php
window.selectMembership = async function(membershipId, planKey) {
  const session = getSession();
  if (!session?.id) { alert("Debes iniciar sesión."); return; }

  if (!planKey || planKey === "free") {
    alert("El plan Gratis es el predeterminado. No requiere activación.");
    return;
  }

  if (!confirm(`¿Activar el plan ${planKey === "silver" ? "Silver" : "Diamond"}?`)) return;

  try {
    const res  = await fetch(`${API}/api/membresia/${session.id}/suscribir`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ plan: planKey })
    });
    const json = await res.json();
    alert(json.ok ? `¡Membresía activada! ${json.data?.message || ""}` : (json.error || "Error al activar."));
    if (json.ok) await loadMembership(session);
  } catch {
    alert("No se pudo procesar la membresía.");
  }
};

function renderPlanCard() { /* reemplazado por loadMembership */ }

function renderHistorial(historial) {
  const list  = document.getElementById("historialList");
  const empty = document.getElementById("historialEmpty");
  if (!list || !empty) return;
  if (!historial.length) { empty.classList.add("show"); return; }
  empty.classList.remove("show");
  list.innerHTML = "";
  historial.slice(0, 20).forEach(entry => {
    const fecha = new Date(entry.leido_en).toLocaleDateString("es-ES");
    const row   = document.createElement("div");
    row.className = "historial-row";

    const portadaUrl = entry.portada ? `${API}${entry.portada}` : "";
    row.innerHTML = `
      <div class="historial-cover" style="${
        portadaUrl
          ? `background-image:url('${portadaUrl}');background-size:cover;background-position:center;`
          : `background:${entry.color || "#1f8a70"}`
      }">
        ${portadaUrl ? "" : `<span>${(entry.titulo || "?")[0]}</span>`}
      </div>
      <div class="historial-info">
        <strong>${escapeHtml(entry.titulo || "")}</strong>
        <span>${escapeHtml(entry.autor || "")}</span>
        <span class="historial-fecha">${fecha}</span>
      </div>`;
    list.appendChild(row);
  });
}

function setupAvatarUpload(email) {
  const wrap     = document.getElementById("perfilAvatarWrap");
  const input    = document.getElementById("avatarFileInput");
  const avatarEl = document.getElementById("perfilAvatar");
  if (!wrap || !input || !avatarEl) return;
  wrap.addEventListener("click", () => input.click());
  input.addEventListener("change", () => {
    const file = input.files[0];
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 3 * 1024 * 1024) { alert("Imagen muy grande. Maximo 3 MB."); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      const base64 = ev.target.result;
      localStorage.setItem(getAvatarKey(email), base64);
      avatarEl.style.backgroundImage    = `url('${base64}')`;
      avatarEl.style.backgroundSize     = "cover";
      avatarEl.style.backgroundPosition = "center";
      avatarEl.style.color              = "transparent";
      avatarEl.textContent              = "";
    };
    reader.readAsDataURL(file);
  });
}

document.getElementById("logoutBtn")?.addEventListener("click", () => {
  sessionStorage.removeItem(SESSION_KEY);
  window.location.href = "login.html";
});

renderPerfil();
