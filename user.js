// user.js — Login y Registro conectado a la API REST
"use strict";

const API = "http://localhost:3000";
const SESSION_KEY = "vl-user-session";

function setSession(user) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    id:         user.id,
    name:       user.nombre,
    email:      user.email,
    plan:       user.plan       || "free",
    planExpiry: user.planExpiry || null
  }));
}

// ── Navegacion ────────────────────────────────────────────────────────────────
const screens = ["screenLogin", "screenRegister", "screenForgot"];
function showScreen(id) {
  screens.forEach(s => {
    const el = document.getElementById(s);
    if (el) el.classList.toggle("hidden", s !== id);
  });
  document.querySelectorAll(".auth-error, .auth-success, .forgot-confirm")
    .forEach(el => el.classList.add("hidden"));
}

// ── Toggle contraseña ─────────────────────────────────────────────────────────
document.querySelectorAll(".toggle-pass").forEach(btn => {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.target);
    if (!input) return;
    const isPass    = input.type === "password";
    input.type      = isPass ? "text" : "password";
    btn.textContent = isPass ? "Ocultar" : "Ver";
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function isValidEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()); }
function showError(id, msg)  { const el = document.getElementById(id); if (!el) return; el.textContent = msg; el.classList.remove("hidden"); }
function hideError(id)       { const el = document.getElementById(id); if (el) el.classList.add("hidden"); }
function setLoading(btn, loading) {
  btn.disabled     = loading;
  btn.dataset.orig = btn.dataset.orig || btn.textContent;
  btn.textContent  = loading ? "Cargando..." : btn.dataset.orig;
}

// ── LOGIN ─────────────────────────────────────────────────────────────────────
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    hideError("loginError");

    const email    = document.getElementById("loginEmail").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value;
    const btn      = loginForm.querySelector("button[type=submit]");

    if (!isValidEmail(email))          { showError("loginError", "Escribe un correo valido."); return; }
    if (!email.endsWith("@gmail.com")) { showError("loginError", "Solo se aceptan correos @gmail.com."); return; }
    if (!password)                     { showError("loginError", "Escribe tu contrasena."); return; }

    setLoading(btn, true);
    try {
      const res  = await fetch(`${API}/api/usuarios/login`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, password })
      });
      const json = await res.json();
      if (!json.ok) { showError("loginError", json.error || "Correo o contrasena incorrectos."); return; }
      setSession(json.data);
      window.location.href = "index.html";
    } catch {
      showError("loginError", "No se pudo conectar con el servidor. Verifica que el backend este activo.");
    } finally {
      setLoading(btn, false);
    }
  });
}

// ── REGISTRO ──────────────────────────────────────────────────────────────────
const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    hideError("registerError");
    const successEl = document.getElementById("registerSuccess");
    if (successEl) successEl.classList.add("hidden");

    const name     = document.getElementById("regName").value.trim();
    const email    = document.getElementById("regEmail").value.trim().toLowerCase();
    const password = document.getElementById("regPassword").value;
    const btn      = registerForm.querySelector("button[type=submit]");

    if (!name)                         { showError("registerError", "Escribe tu nombre completo."); return; }
    if (!isValidEmail(email))          { showError("registerError", "Escribe un correo valido."); return; }
    if (!email.endsWith("@gmail.com")) { showError("registerError", "Solo se aceptan correos @gmail.com."); return; }
    if (!password)                     { showError("registerError", "Escribe una contrasena."); return; }

    setLoading(btn, true);
    try {
      const res  = await fetch(`${API}/api/usuarios/registro`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ nombre: name, email, password })
      });
      const json = await res.json();
      if (!json.ok) { showError("registerError", json.error || "Error al registrar."); return; }
      if (successEl) successEl.classList.remove("hidden");
      registerForm.reset();
      setTimeout(() => showScreen("screenLogin"), 2000);
    } catch {
      showError("registerError", "No se pudo conectar con el servidor. Verifica que el backend este activo.");
    } finally {
      setLoading(btn, false);
    }
  });
}

// ── RECUPERAR CONTRASEÑA ──────────────────────────────────────────────────────
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
    document.getElementById("forgotSubmitBtn")?.classList.add("hidden");
  });
}

// ── Navegacion de pantallas ───────────────────────────────────────────────────
document.getElementById("goRegister")          ?.addEventListener("click", () => showScreen("screenRegister"));
document.getElementById("goForgot")            ?.addEventListener("click", () => showScreen("screenForgot"));
document.getElementById("goLoginFromRegister") ?.addEventListener("click", () => showScreen("screenLogin"));
document.getElementById("goLoginFromForgot")   ?.addEventListener("click", () => {
  document.getElementById("forgotSubmitBtn")?.classList.remove("hidden");
  showScreen("screenLogin");
});

// ── Tema ──────────────────────────────────────────────────────────────────────
if (localStorage.getItem("vl-theme") === "dark") document.body.classList.add("dark");
