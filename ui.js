import { initStore } from "./store.js";

// ── HIDE ALL PAGES ────────────────────────────────
export function hideAllPages() {
  document.querySelector(".feed").style.display = "none";
  document.getElementById("friendsPage").style.display = "none";
  document.getElementById("profilePage").style.display = "none";

  const rewardsPage = document.getElementById("rewardsPage");
  if (rewardsPage) rewardsPage.style.display = "none";

  // ✅ ADDED: rules page
  const rulesPage = document.getElementById("rulesPage");
  if (rulesPage) rulesPage.style.display = "none";
}

// ── NAVIGATION ────────────────────────────────────
export function backToFeed() {
  hideAllPages();
  document.querySelector(".feed").style.display = "block";
}

export function goHome() {
  backToFeed();
}

// ── AUTH UI ───────────────────────────────────────
export function showRegister() {
  document.getElementById("loginBox").style.display = "none";
  document.getElementById("registerBox").style.display = "block";
}

export function showLogin() {
  document.getElementById("loginBox").style.display = "block";
  document.getElementById("registerBox").style.display = "none";
}

// ── UI INIT ───────────────────────────────────────
export function initUI() {
  initStore();
}
