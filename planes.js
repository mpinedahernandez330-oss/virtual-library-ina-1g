// planes.js — Planes conectado a la API REST
"use strict";

const API         = "http://localhost:3000";
const SESSION_KEY = "vl-user-session";

const PLANES = {
  free:    { key: "free",    name: "Gratis",   icon: "📖", price: "$0",    days: null },
  silver:  { key: "silver",  name: "Plata",    icon: "🥈", price: "$2.50", days: 21   },
  diamond: { key: "diamond", name: "Diamante", icon: "💎", price: "$5.00", days: 30   }
};

function getSession() {
  const s = sessionStorage.getItem(SESSION_KEY);
  return s ? JSON.parse(s) : null;
}
function updateSession(data) {
  const session = getSession();
  if (!session) return;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...session, ...data }));
}

function updateUI() {
  const session = getSession();
  if (!session) return;
  let planKey = session.plan || "free";
  if (planKey !== "free" && session.planExpiry && Date.now() > new Date(session.planExpiry).getTime()) planKey = "free";

  const banner = document.getElementById("planActualBanner");
  if (banner && planKey !== "free" && session.planExpiry) {
    const plan    = PLANES[planKey];
    const expDate = new Date(session.planExpiry).toLocaleDateString("es-ES");
    banner.textContent = `${plan.icon} Tienes el plan ${plan.name} activo hasta el ${expDate}`;
    banner.classList.remove("hidden");
  }

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
  document.getElementById("payDesc").textContent  = `${plan.price} — ${plan.days ? plan.days + " dias de acceso" : "acceso permanente"}`;
  payDialog.showModal();
}

async function confirmPay() {
  if (!pendingPlan) return;
  const session = getSession();
  if (!session?.id) { alert("Sesion no valida. Por favor inicia sesion de nuevo."); return; }

  const btn = document.getElementById("payConfirm");
  if (btn) { btn.disabled = true; btn.textContent = "Procesando..."; }

  try {
    const res  = await fetch(`${API}/api/usuarios/${session.id}/plan`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ plan: pendingPlan })
    });
    const json = await res.json();
    if (!json.ok) { alert(json.error || "Error al activar el plan."); return; }

    // Calcular expiry local para mostrar en UI (mismo calculo que el server)
    const plan   = PLANES[pendingPlan];
    const expiry = plan.days ? new Date(Date.now() + plan.days * 86400000).toISOString() : null;
    updateSession({ plan: pendingPlan, planExpiry: expiry });

    payDialog.close();
    const expDate = expiry ? new Date(expiry).toLocaleDateString("es-ES") : "";
    document.getElementById("successMessage").textContent =
      `${plan.icon} Plan ${plan.name} activado${expDate ? " hasta el " + expDate : ""}. Disfruta tu lectura!`;
    successDialog.showModal();
    updateUI();
    pendingPlan = null;
  } catch {
    alert("No se pudo conectar con el servidor. Verifica que el backend este activo.");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Confirmar"; }
  }
}

document.getElementById("btnSilver") ?.addEventListener("click", () => openPayDialog("silver"));
document.getElementById("btnDiamond")?.addEventListener("click", () => openPayDialog("diamond"));
document.getElementById("payConfirm")?.addEventListener("click", confirmPay);
document.getElementById("payCancel") ?.addEventListener("click", () => payDialog.close());
document.getElementById("closePayDialog")?.addEventListener("click", () => payDialog.close());
document.getElementById("goLibrary") ?.addEventListener("click", () => { successDialog.close(); window.location.href = "index.html"; });

updateUI();
