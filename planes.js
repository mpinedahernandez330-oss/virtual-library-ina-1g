// planes.js — Suscripciones conectadas a la API
"use strict";

const API         = "https://virtual-library-ina-1g.onrender.com/api";
const SESSION_KEY = "vl-user-session";

const PLANES = {
  free:    { key: "free",    name: "Gratis",   icon: "📖", price: "$0",    days: null, canDownload: false, dailyLimit: 5        },
  silver:  { key: "silver",  name: "Plata",    icon: "🥈", price: "$2.50", days: 21,   canDownload: false, dailyLimit: Infinity },
  diamond: { key: "diamond", name: "Diamante", icon: "💎", price: "$5.00", days: 30,   canDownload: true,  dailyLimit: Infinity }
};

// ── Sesion ────────────────────────────────────────────────────────────────────
function getSession() {
  const s = sessionStorage.getItem(SESSION_KEY);
  return s ? JSON.parse(s) : null;
}
function updateSession(data) {
  const session = getSession();
  if (!session) return;
  const updated = { ...session, ...data };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(updated));
}

// ── UI: marcar plan activo ────────────────────────────────────────────────────
function updateUI() {
  const session = getSession();
  if (!session) return;

  // Si el plan expiro, revertir a free visualmente
  let planKey = session.plan || "free";
  if (planKey !== "free" && session.planExpiry && Date.now() > new Date(session.planExpiry).getTime()) {
    planKey = "free";
  }

  // Banner plan activo
  const banner = document.getElementById("planActualBanner");
  if (banner && planKey !== "free" && session.planExpiry) {
    const plan    = PLANES[planKey];
    const expDate = new Date(session.planExpiry).toLocaleDateString("es-ES");
    banner.textContent = `${plan.icon} Tienes el plan ${plan.name} activo hasta el ${expDate}`;
    banner.classList.remove("hidden");
  }

  // Marcar boton del plan activo
  const btnMap = { free: "btnFree", silver: "btnSilver", diamond: "btnDiamond" };
  Object.entries(btnMap).forEach(([key, btnId]) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    if (key === planKey) {
      btn.textContent = "Tienes este plan";
      btn.disabled    = true;
      btn.classList.add("plan-btn-active");
    }
  });
}

// ── Modal de pago ─────────────────────────────────────────────────────────────
const payDialog     = document.getElementById("payDialog");
const successDialog = document.getElementById("successDialog");
let pendingPlan     = null;

function openPayDialog(planKey) {
  const session = getSession();
  if (!session) { window.location.href = "login.html"; return; }

  const plan  = PLANES[planKey];
  pendingPlan = planKey;

  document.getElementById("payIcon").textContent  = plan.icon;
  document.getElementById("payTitle").textContent = `Plan ${plan.name}`;
  document.getElementById("payDesc").textContent  =
    `${plan.price} — ${plan.days ? plan.days + " dias de acceso" : "acceso permanente"}`;

  payDialog.showModal();
}

async function confirmPay() {
  const session = getSession();
  if (!session?.id || !pendingPlan) return;

  const confirmBtn = document.getElementById("payConfirm");
  if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.textContent = "Procesando..."; }

  try {
    const res  = await fetch(API + "/users/" + session.id + "/plan", {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ plan: pendingPlan })
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error);

    // Calcular nueva fecha de expiracion localmente para actualizar sessionStorage
    const plan   = PLANES[pendingPlan];
    const expiry = plan.days ? new Date(Date.now() + plan.days * 86400000).toISOString() : null;
    updateSession({ plan: pendingPlan, planExpiry: expiry });

    payDialog.close();
    const expDate = expiry ? new Date(expiry).toLocaleDateString("es-ES") : "";
    document.getElementById("successMessage").textContent =
      `${plan.icon} Plan ${plan.name} activado${expDate ? " hasta el " + expDate : ""}. Disfruta tu lectura!`;
    successDialog.showModal();
    updateUI();
  } catch (err) {
    alert("No se pudo actualizar el plan: " + (err.message || "Error de conexion."));
  } finally {
    if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = "Confirmar pago"; }
    pendingPlan = null;
  }
}

// ── Listeners ─────────────────────────────────────────────────────────────────
document.getElementById("btnSilver") ?.addEventListener("click", () => openPayDialog("silver"));
document.getElementById("btnDiamond")?.addEventListener("click", () => openPayDialog("diamond"));
document.getElementById("payConfirm")?.addEventListener("click", confirmPay);
document.getElementById("payCancel") ?.addEventListener("click", () => payDialog.close());
document.getElementById("closePayDialog")?.addEventListener("click", () => payDialog.close());
document.getElementById("goLibrary") ?.addEventListener("click", () => {
  successDialog.close();
  window.location.href = "index.html";
});

// ── Inicio ────────────────────────────────────────────────────────────────────
updateUI();
