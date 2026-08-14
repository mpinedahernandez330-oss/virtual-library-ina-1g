// user.js — Login y Registro conectado al backend (MySQL via API REST)
"use strict";

const API         = "https://virtual-library-ina-1g.onrender.com/api";
const SESSION_KEY = "vl-user-session";

// ── Helpers de sesion ─────────────────────────────────────────────────────────
function setSession(user) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    id:         user.id,
    name:       user.name,
    email:      user.email,
    plan:       user.plan       || "free",
    planExpiry: user.planExpiry || null
  }));
}

// ── Navegacion entre pantallas ────────────────────────────────────────────────
const screens = ["screenLogin", "screenRegister", "screenForgot"];

function showScreen(id) {
  screens.forEach(s => {
    const el = document.getElementById(s);
    if (el) el.classList.toggle("hidden", s !== id);
  });
  document.querySelectorAll(".auth-error, .auth-success, .forgot-confirm").forEach(el => {
    el.classList.add("hidden");
  });
}

// ── Toggle mostrar/ocultar contrasena ─────────────────────────────────────────
document.querySelectorAll(".toggle-pass").forEach(btn => {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.target);
    if (!input) return;
    const isPass    = input.type === "password";
    input.type      = isPass ? "text" : "password";
    btn.textContent = isPass ? "Ocultar" : "Ver";
  });
});

// ── Validaciones ──────────────────────────────────────────────────────────────
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.remove("hidden");
}
function hideError(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add("hidden");
}
function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled    = loading;
  btn.textContent = loading ? "Cargando..." : btn.dataset.label || btn.textContent;
}

// ── LOGIN ─────────────────────────────────────────────────────────────────────
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  const btn = loginForm.querySelector("button[type=submit]");
  if (btn) btn.dataset.label = btn.textContent;

  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    hideError("loginError");

    const email    = document.getElementById("loginEmail").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value;

    if (!isValidEmail(email)) { showError("loginError", "Escribe un correo valido."); return; }
    if (!password)             { showError("loginError", "Escribe tu contrasena."); return; }

    setLoading("loginSubmitBtn", true);
    try {
      const res  = await fetch(API + "/users/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, password })
      });
      const json = await res.json();
      if (!json.ok) { showError("loginError", json.error); return; }
      setSession(json.data);
      window.location.href = "index.html";
    } catch {
      showError("loginError", "No se pudo conectar al servidor. Verifica que Laragon este corriendo.");
    } finally {
      setLoading("loginSubmitBtn", false);
    }
  });
}

// ── REGISTRO ──────────────────────────────────────────────────────────────────
const registerForm = document.getElementById("registerForm");
if (registerForm) {
  const btn = registerForm.querySelector("button[type=submit]");
  if (btn) btn.dataset.label = btn.textContent;

  registerForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    hideError("registerError");
    const successEl = document.getElementById("registerSuccess");
    if (successEl) successEl.classList.add("hidden");

    const name     = document.getElementById("regName").value.trim();
    const email    = document.getElementById("regEmail").value.trim().toLowerCase();
    const password = document.getElementById("regPassword").value;

    if (!name)                    { showError("registerError", "Escribe tu nombre completo."); return; }
    if (!email.endsWith("@gmail.com")) { showError("registerError", "Solo se aceptan correos @gmail.com."); return; }
    if (password.length < 6)      { showError("registerError", "La contrasena debe tener minimo 6 caracteres."); return; }

    setLoading("registerSubmitBtn", true);
    try {
      const res  = await fetch(API + "/users/register", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name, email, password })
      });
      const json = await res.json();
      if (!json.ok) { showError("registerError", json.error); return; }
      if (successEl) successEl.classList.remove("hidden");
      registerForm.reset();
      setTimeout(() => showScreen("screenLogin"), 2000);
    } catch {
      showError("registerError", "No se pudo conectar al servidor. Verifica que Laragon este corriendo.");
    } finally {
      setLoading("registerSubmitBtn", false);
    }
  });
}

// ── RECUPERAR CONTRASENA (informativo, sin backend) ───────────────────────────
const forgotForm = document.getElementById("forgotForm");
if (forgotForm) {
  forgotForm.addEventListener("submit", function (e) {
    e.preventDefault();
    hideError("forgotError");
    const confirmEl = document.getElementById("forgotConfirm");
    if (confirmEl) confirmEl.classList.add("hidden");

    const email = document.getElementById("forgotEmail").value.trim().toLowerCase();
    if (!isValidEmail(email)) { showError("forgotError", "Escribe un correo valido."); return; }

    const shownEl = document.getElementById("forgotEmailShown");
    if (shownEl) shownEl.textContent = email;
    if (confirmEl) confirmEl.classList.remove("hidden");
    const submitBtn = document.getElementById("forgotSubmitBtn");
    if (submitBtn) submitBtn.classList.add("hidden");
  });
}

// ── Navegacion de pantallas ───────────────────────────────────────────────────
const nav = {
  goRegister:        () => showScreen("screenRegister"),
  goForgot:          () => showScreen("screenForgot"),
  goLoginFromReg:    () => showScreen("screenLogin"),
  goLoginFromForgot: () => {
    const btn = document.getElementById("forgotSubmitBtn");
    if (btn) btn.classList.remove("hidden");
    showScreen("screenLogin");
  }
};
document.getElementById("goRegister")        ?.addEventListener("click", nav.goRegister);
document.getElementById("goForgot")          ?.addEventListener("click", nav.goForgot);
document.getElementById("goLoginFromRegister")?.addEventListener("click", nav.goLoginFromReg);
document.getElementById("goLoginFromForgot") ?.addEventListener("click", nav.goLoginFromForgot);

// ── Tema guardado ─────────────────────────────────────────────────────────────
if (localStorage.getItem("vl-theme") === "dark") document.body.classList.add("dark");
