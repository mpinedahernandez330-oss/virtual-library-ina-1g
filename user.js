// user.js — Login y Registro con localStorage (sin backend)
"use strict";

const SESSION_KEY = "vl-user-session";
const USERS_KEY   = "vl-users";

// ── Helpers ───────────────────────────────────────────────────────────────────
function getUsers() {
  const u = localStorage.getItem(USERS_KEY);
  if (u) return JSON.parse(u);
  // Usuarios de prueba por defecto
  const defaults = [
    { name: "Estudiante Demo",   email: "demo@gmail.com",    password: "123456", plan: "free",    planExpiry: null },
    { name: "Usuario Plata",     email: "plata@gmail.com",   password: "123456", plan: "silver",  planExpiry: null },
    { name: "Usuario Diamante",  email: "diamante@gmail.com",password: "123456", plan: "diamond", planExpiry: null }
  ];
  localStorage.setItem(USERS_KEY, JSON.stringify(defaults));
  return defaults;
}
function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}
function setSession(user) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
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

// ── Toggle contrasena ─────────────────────────────────────────────────────────
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

// ── LOGIN ─────────────────────────────────────────────────────────────────────
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();
    hideError("loginError");

    const email    = document.getElementById("loginEmail").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value;

    if (!isValidEmail(email)) { showError("loginError", "Escribe un correo valido."); return; }
    if (!password)             { showError("loginError", "Escribe tu contrasena."); return; }
    if (!email.endsWith("@gmail.com")) { showError("loginError", "Solo se aceptan correos @gmail.com."); return; }

    const users = getUsers();
    const user  = users.find(u => u.email === email && u.password === password);
    if (!user) { showError("loginError", "Correo o contrasena incorrectos."); return; }

    setSession(user);
    window.location.href = "index.html";
  });
}

// ── REGISTRO ──────────────────────────────────────────────────────────────────
const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", function (e) {
    e.preventDefault();
    hideError("registerError");
    const successEl = document.getElementById("registerSuccess");
    if (successEl) successEl.classList.add("hidden");

    const name     = document.getElementById("regName").value.trim();
    const email    = document.getElementById("regEmail").value.trim().toLowerCase();
    const password = document.getElementById("regPassword").value;

    if (!name)                         { showError("registerError", "Escribe tu nombre completo."); return; }
    if (!email.endsWith("@gmail.com")) { showError("registerError", "Solo se aceptan correos @gmail.com."); return; }
    if (!password)                     { showError("registerError", "Escribe una contrasena."); return; }

    const users  = getUsers();
    const exists = users.find(u => u.email === email);
    if (exists) { showError("registerError", "Ese correo ya esta registrado."); return; }

    users.push({ name, email, password, plan: "free", planExpiry: null });
    saveUsers(users);

    if (successEl) successEl.classList.remove("hidden");
    registerForm.reset();
    setTimeout(() => showScreen("screenLogin"), 2000);
  });
}

// ── RECUPERAR CONTRASENA ──────────────────────────────────────────────────────
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

// ── Navegacion ────────────────────────────────────────────────────────────────
document.getElementById("goRegister")         ?.addEventListener("click", () => showScreen("screenRegister"));
document.getElementById("goForgot")           ?.addEventListener("click", () => showScreen("screenForgot"));
document.getElementById("goLoginFromRegister")?.addEventListener("click", () => showScreen("screenLogin"));
document.getElementById("goLoginFromForgot")  ?.addEventListener("click", () => {
  document.getElementById("forgotSubmitBtn")?.classList.remove("hidden");
  showScreen("screenLogin");
});

// ── Tema ──────────────────────────────────────────────────────────────────────
if (localStorage.getItem("vl-theme") === "dark") document.body.classList.add("dark");
