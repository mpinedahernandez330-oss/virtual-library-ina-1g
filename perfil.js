// perfil.js — Pagina de perfil del usuario
"use strict";

const API         = "http://localhost:3000/api";
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

// ── Avatar (guardado como base64 en localStorage) ─────────────────────────────
function getAvatarKey(email) { return "vl-avatar-" + email; }

function applyAvatar(email) {
  const saved    = localStorage.getItem(getAvatarKey(email));
  const avatarEl = document.getElementById("perfilAvatar");
  if (!avatarEl) return;
  if (saved) {
    avatarEl.style.backgroundImage    = `url('${saved}')`;
    avatarEl.style.backgroundSize     = "cover";
    avatarEl.style.backgroundPosition = "center";
    avatarEl.style.color              = "transparent";
    avatarEl.textContent              = "";
  }
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

// ── Render del perfil ─────────────────────────────────────────────────────────
async function renderPerfil() {
  const session = getSession();
  if (!session) return;

  // Avatar o iniciales
  const initials = session.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const avatarEl = document.getElementById("perfilAvatar");
  const saved    = localStorage.getItem(getAvatarKey(session.email));
  if (avatarEl) {
    if (saved) {
      avatarEl.style.backgroundImage    = `url('${saved}')`;
      avatarEl.style.backgroundSize     = "cover";
      avatarEl.style.backgroundPosition = "center";
      avatarEl.style.color              = "transparent";
    } else {
      avatarEl.textContent = initials;
    }
  }

  document.getElementById("perfilNombre").textContent = session.name;
  document.getElementById("perfilEmail").textContent  = session.email;

  // Badge del plan
  const planExpiry = session.planExpiry ? new Date(session.planExpiry).getTime() : null;
  const expired    = planExpiry && Date.now() > planExpiry;
  const planKey    = (expired || !session.plan) ? "free" : session.plan;
  const badges     = {
    free:    { label: "Gratis",   cls: "plan-badge-free"    },
    silver:  { label: "Plata",    cls: "plan-badge-silver"  },
    diamond: { label: "Diamante", cls: "plan-badge-diamond" }
  };
  const badge    = document.getElementById("perfilPlanBadge");
  const badgeInfo = badges[planKey] || badges.free;
  if (badge) {
    badge.textContent = badgeInfo.label;
    badge.classList.add(badgeInfo.cls);
  }

  // Historial desde la API
  let history = [];
  if (session.id) {
    try {
      const res = await fetch(API + "/history/" + session.id);
      const json = await res.json();
      if (json.ok) history = json.data;
    } catch { /* sin conexion */ }
  }

  document.getElementById("statLeidos").textContent = history.length;

  renderPlanCard(session, planKey, expired, planExpiry);
  renderHistorial(history);
  setupAvatarUpload(session.email);
}

function renderPlanCard(session, planKey, expired, planExpiry) {
  const card  = document.getElementById("planCard");
  if (!card) return;
  const plans = {
    free:    { name: "Gratis",   desc: "5 libros por dia, acceso al catalogo."  },
    silver:  { name: "Plata",    desc: "Lectura ilimitada por 3 semanas."        },
    diamond: { name: "Diamante", desc: "Lectura ilimitada + descarga por 1 mes." }
  };
  const p = plans[planKey] || plans.free;
  let expText = "";
  if (planKey !== "free" && planExpiry) {
    const expDate  = new Date(planExpiry).toLocaleDateString("es-ES");
    const daysLeft = Math.ceil((planExpiry - Date.now()) / 86400000);
    expText = expired
      ? `<span class="plan-expired-tag">Expirado</span>`
      : `<span class="plan-exp-tag">Vence el ${expDate} (${daysLeft} dias restantes)</span>`;
  }
  card.innerHTML = `
    <div class="perfil-plan-inner">
      <div>
        <strong class="perfil-plan-name">Plan ${p.name}</strong>
        <p class="perfil-plan-desc">${p.desc}</p>
        ${expText}
      </div>
    </div>`;
}

function renderHistorial(history) {
  const list  = document.getElementById("historialList");
  const empty = document.getElementById("historialEmpty");
  if (!list || !empty) return;

  if (!history.length) { empty.classList.add("show"); return; }
  empty.classList.remove("show");
  list.innerHTML = "";

  history.slice(0, 20).forEach(entry => {
    const fecha = new Date(entry.read_at).toLocaleDateString("es-ES");
    const row   = document.createElement("div");
    row.className = "historial-row";
    row.innerHTML = `
      <div class="historial-cover" style="${
        entry.cover
          ? `background-image:url('${entry.cover}');background-size:cover;background-position:center;`
          : `background:${entry.color || "#1f8a70"}`
      }">
        ${entry.cover ? "" : `<span>${(entry.title || "?")[0]}</span>`}
      </div>
      <div class="historial-info">
        <strong>${escapeHtml(entry.title || "")}</strong>
        <span>${escapeHtml(entry.author || "")}</span>
        <span class="historial-fecha">${fecha}</span>
      </div>`;
    list.appendChild(row);
  });
}

// ── Logout ────────────────────────────────────────────────────────────────────
document.getElementById("logoutBtn")?.addEventListener("click", () => {
  sessionStorage.removeItem(SESSION_KEY);
  window.location.href = "login.html";
});

// ── Arranque ──────────────────────────────────────────────────────────────────
renderPerfil();
