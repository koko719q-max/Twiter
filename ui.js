import { initStore } from "./store.js";

/* ─────────────────────────────────────────────
   ELEMENT HELPERS
───────────────────────────────────────────── */
function getBottomNavbar() {
  return document.querySelector(".bottom-navbar");
}

/* ─────────────────────────────────────────────
   BOTTOM NAVBAR CONTROL
───────────────────────────────────────────── */
function toggleBottomNavbar(show) {
  const nav = getBottomNavbar();
  if (!nav) return;

  nav.style.display = show ? "flex" : "none";
}

/* ─────────────────────────────────────────────
   HIDE ALL PAGES
───────────────────────────────────────────── */
export function hideAllPages() {
  const pages = [
    ".feed",
    "#friendsPage",
    "#profilePage",
    "#messagesPage",
    "#chatPage",
    "#rewardsPage",
    "#rulesPage",
  ];

  pages.forEach((selector) => {
    const el = selector.startsWith(".")
      ? document.querySelector(selector)
      : document.getElementById(selector.replace("#", ""));

    if (el) el.style.display = "none";
  });
}

/* ─────────────────────────────────────────────
   FEED
───────────────────────────────────────────── */
export function backToFeed() {
  hideAllPages();

  const feed = document.querySelector(".feed");
  if (feed) feed.style.display = "block";

  toggleBottomNavbar(true);
}

export function goHome() {
  backToFeed();
}

/* ─────────────────────────────────────────────
   MESSAGES
───────────────────────────────────────────── */
export function openMessages() {
  hideAllPages();

  const messages = document.getElementById("messagesPage");
  if (messages) messages.style.display = "block";

  toggleBottomNavbar(false);
}

export function backFromMessages() {
  backToFeed();
}

/* ─────────────────────────────────────────────
   CHAT
───────────────────────────────────────────── */
export function openChat() {
  hideAllPages();

  const chat = document.getElementById("chatPage");
  if (chat) chat.style.display = "flex";

  toggleBottomNavbar(false);
}

export function closeChat() {
  backToFeed();
}

/* ─────────────────────────────────────────────
   AUTH UI
───────────────────────────────────────────── */
export function showRegister() {
  const login = document.getElementById("loginBox");
  const register = document.getElementById("registerBox");

  if (login) login.style.display = "none";
  if (register) register.style.display = "block";
}

export function showLogin() {
  const login = document.getElementById("loginBox");
  const register = document.getElementById("registerBox");

  if (login) login.style.display = "block";
  if (register) register.style.display = "none";
}

/* ─────────────────────────────────────────────
   RESET UI ON LOAD
───────────────────────────────────────────── */
function resetUI() {
  hideAllPages();

  const feed = document.querySelector(".feed");
  if (feed) feed.style.display = "block";

  toggleBottomNavbar(true);
}

/* ─────────────────────────────────────────────
   INIT
───────────────────────────────────────────── */
export function initUI() {
  initStore();

  window.addEventListener("load", resetUI);
}