// planes.js — Planes conectado a la API REST
"use strict";

// API y SESSION_KEY ya están definidos en script.js

const PLANES = {
  free:    { key: "free",    name: "Gratis",   icon: "📖", price: "$0",    days: null },
  silver:  { key: "silver",  name: "Plata",    icon: "🥈", price: "$2.50", days: 60   },
  diamond: { key: "diamond", name: "Diamante", icon: "💎", price: "$5.00", days: 120  }
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

// ── Actualiza los botones según el plan activo ────────────────────────────────
async function updateUI() {
  const session = getSession();
  if (!session?.id) return;

  // Obtener estado real desde la BD
  let planKey = "free";
  let expDate = "";
  let diasRestantes = null;

  try {
    const res  = await fetch(`${API}/api/membresia/${session.id}`);
    const json = await res.json();
    if (json.ok) {
      planKey       = json.data.plan || "free";
      diasRestantes = json.data.days_remaining;
      expDate       = json.data.expiration_date
        ? new Date(json.data.expiration_date).toLocaleDateString("es-ES")
        : "";
      // Actualizar sesión local si cambió
      updateSession({ plan: planKey, planExpiry: json.data.expiration_date });
    }
  } catch { /* usar sesión local como fallback */ planKey = session.plan || "free"; }

  const banner = document.getElementById("planActualBanner");
  if (banner && planKey !== "free") {
    const plan = PLANES[planKey];
    banner.textContent =
      `${plan.icon} Plan ${plan.name} activo` +
      (expDate ? ` · Vence el ${expDate}` : "") +
      (diasRestantes ? ` · ${diasRestantes} días restantes` : "");
    banner.classList.remove("hidden");
  } else if (banner) {
    banner.classList.add("hidden");
  }

  const btnMap = { free: "btnFree", silver: "btnSilver", diamond: "btnDiamond" };
  Object.entries(btnMap).forEach(([key, btnId]) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = false;
    btn.classList.remove("plan-btn-active");
    if (key === planKey) {
      btn.textContent = key === "free" ? "Plan actual" :
        `Plan activo${diasRestantes ? ` · ${diasRestantes} días` : ""}`;
      btn.disabled = true;
      btn.classList.add("plan-btn-active");
    }
  });
}

// ── Lógica principal: ¿tiene mes gratis disponible? ───────────────────────────
const payDialog     = document.getElementById("payDialog");
const successDialog = document.getElementById("successDialog");
let pendingPlan     = null;

async function intentarAdquirir(planKey) {
  const session = getSession();
  if (!session) { window.location.href = "login.html"; return; }

  if (!session.id) {
    alert("Tu sesión no tiene ID. Por favor cierra sesión e inicia de nuevo.");
    return;
  }

  pendingPlan = planKey;

  // Plata y Diamante siempre piden tarjeta — sin mes gratis
  const plan = PLANES[planKey];
  document.getElementById("payIcon").textContent       = plan.icon;
  document.getElementById("payTitle").textContent      = `Plan ${plan.name}`;
  document.getElementById("payDesc").textContent       = `${plan.price} — ${plan.days ? plan.days + " días de acceso" : "acceso permanente"}`;
  document.getElementById("paySimNote").textContent    = `⚠️ Ingresa tus datos bancarios simulados para activar el Plan ${plan.name}.`;
  document.getElementById("payConfirm").textContent    = "Confirmar y activar";
  document.getElementById("payConfirm").dataset.gratis = "0";

  // Asegurar que los campos de tarjeta estén visibles
  document.querySelectorAll(".pay-field, .pay-field-row").forEach(el => el.style.display = "");

  payDialog.showModal();
}

// ── Validar tarjeta y procesar pago ──────────────────────────────────────────
async function confirmPay() {
  if (!pendingPlan) return;
  const session = getSession();
  if (!session?.id) { alert("Sesion no valida. Por favor inicia sesion de nuevo."); return; }

  const esGratis = document.getElementById("payConfirm").dataset.gratis === "1";

  if (!esGratis) {
    // Validar campos de tarjeta
    const cardNum  = document.getElementById("payCardNum")?.value.replace(/\s/g, "") || "";
    const cardExp  = document.getElementById("payCardExp")?.value.trim() || "";
    const cardCvv  = document.getElementById("payCardCvv")?.value.trim() || "";
    const cardName = document.getElementById("payCardName")?.value.trim() || "";

    if (cardNum.length < 13)              { alert("Ingresa un número de tarjeta válido.");        return; }
    if (!/^\d{2}\/\d{2}$/.test(cardExp)) { alert("La expiración debe tener formato MM/AA.");     return; }
    if (cardCvv.length < 3)              { alert("El CVV debe tener 3 dígitos.");                return; }
    if (cardName.length < 3)             { alert("Ingresa el nombre que aparece en la tarjeta."); return; }
  }

  const btn = document.getElementById("payConfirm");
  if (btn) { btn.disabled = true; btn.textContent = esGratis ? "Activando..." : "Verificando con el banco simulado..."; }

  // Simular delay bancario
  await new Promise(r => setTimeout(r, esGratis ? 800 : 2000));

  try {
    await activarPlan(pendingPlan, esGratis);

    // Limpiar campos de tarjeta
    ["payCardNum","payCardExp","payCardCvv","payCardName"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });

    payDialog.close();
  } catch {
    alert("No se pudo conectar con el servidor. Verifica que el backend este activo.");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Confirmar y activar"; btn.dataset.gratis = "0"; }
  }
}

// ── Activa el plan en la base de datos via nuevo sistema de membresías ─────────
async function activarPlan(planKey, esPrueba) {
  const session = getSession();
  if (!session?.id) return;

  // Usar el nuevo endpoint de membresías
  const res  = await fetch(`${API}/api/membresia/${session.id}/suscribir`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ plan: planKey })
  });
  const json = await res.json();
  if (!json.ok) { alert(json.error || "Error al activar el plan."); return; }

  // Actualizar sesión local con los datos del servidor
  const plan   = PLANES[planKey];
  const expiry = json.data.expiration_date
    ? new Date(json.data.expiration_date).toISOString()
    : null;
  updateSession({ plan: planKey, planExpiry: expiry });

  const expDate      = expiry ? new Date(expiry).toLocaleDateString("es-ES") : "";
  const diasRestantes = json.data.days_remaining;

  // Mensaje de éxito con días restantes
  document.getElementById("successMessage").innerHTML =
    `${plan.icon} <strong>¡Suscripción Activada!</strong><br><br>` +
    `Plan: <strong>${plan.name.toUpperCase()}</strong><br>` +
    (expDate ? `Vence el: <strong>${expDate}</strong><br>` : "") +
    (diasRestantes ? `Días restantes: <strong>${diasRestantes}</strong>` : "") +
    `<br><br>¡Disfruta tu lectura!`;

  successDialog.showModal();
  updateUI();
  pendingPlan = null;
}

// ── Eventos ───────────────────────────────────────────────────────────────────
document.getElementById("btnSilver") ?.addEventListener("click", () => intentarAdquirir("silver"));
document.getElementById("btnDiamond")?.addEventListener("click", () => intentarAdquirir("diamond"));
document.getElementById("payConfirm")?.addEventListener("click", confirmPay);
document.getElementById("payCancel") ?.addEventListener("click", () => payDialog.close());
document.getElementById("closePayDialog")?.addEventListener("click", () => payDialog.close());
document.getElementById("goLibrary") ?.addEventListener("click", () => {
  successDialog.close();
  window.location.href = "index.html";
});

// Formato automático número de tarjeta (grupos de 4)
document.getElementById("payCardNum")?.addEventListener("input", function () {
  let val = this.value.replace(/\D/g, "").slice(0, 16);
  this.value = val.match(/.{1,4}/g)?.join(" ") || val;
});

// Formato automático expiración MM/AA
document.getElementById("payCardExp")?.addEventListener("input", function () {
  let val = this.value.replace(/\D/g, "").slice(0, 4);
  if (val.length >= 3) val = val.slice(0, 2) + "/" + val.slice(2);
  this.value = val;
});

// Solo números en CVV
document.getElementById("payCardCvv")?.addEventListener("input", function () {
  this.value = this.value.replace(/\D/g, "").slice(0, 3);
});

updateUI();
