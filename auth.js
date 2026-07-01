import { auth } from "./config.js";
import { loadUsers, ensureOwnerRole, ensureGirlRole } from "./users.js";
import { listenTweets, getUnsub, setUnsub } from "./tweets.js";
import { listenAlerts, stopAlerts } from "./commands.js";
import { requestNotificationPermission } from "./notifications.js";
import { showLogin } from "./ui.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db } from "./config.js";

const authUI = document.getElementById("auth");
const layout = document.querySelector(".layout");

// ── Auth state ────────────────────────────────────────

onAuthStateChanged(auth, async (user) => {
  if (user) {
    authUI.style.display = "none";
    layout.style.display = "flex";
    await loadUsers();
    await ensureOwnerRole(user);
    await ensureGirlRole(user);
    await requestNotificationPermission();
    listenTweets();
    listenAlerts();
  } else {
    authUI.style.display = "flex";
    layout.style.display = "none";
  }
});

// ── Register ──────────────────────────────────────────

export async function register() {
  const username = document.getElementById("regUserName").value.trim();
  const email    = document.getElementById("regUser").value.trim();
  const pass     = document.getElementById("regPass").value;

  if (!username || !email || !pass) { alert("Izpolni vsa polja"); return; }

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await addDoc(collection(db, "users"), {
      uid: cred.user.uid,
      username,
      email,
      photoURL: null
    });
    document.getElementById("regUserName").value = "";
    document.getElementById("regUser").value     = "";
    document.getElementById("regPass").value     = "";
    showLogin();
  } catch (err) {
    console.error(err);
    let msg = "Napaka pri registraciji";
    if (err.code === "auth/email-already-in-use") msg = "Ta email je že registriran";
    if (err.code === "auth/weak-password")        msg = "Geslo je preveč šibko (vsaj 6 znakov)";
    if (err.code === "auth/invalid-email")        msg = "Neveljaven email naslov";
    alert(msg);
  }
}

// ── Login ─────────────────────────────────────────────

export async function login() {
  const email = document.getElementById("loginUser").value.trim();
  const pass  = document.getElementById("loginPass").value;

  if (!email || !pass) { alert("Vnesi email in geslo"); return; }

  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (err) {
    console.error(err);
    alert("Napaka pri prijavi: napačen email ali geslo");
  }
}

// ── Logout ────────────────────────────────────────────

export function logout() {
  const unsub = getUnsub();
  if (unsub) { unsub(); setUnsub(null); }
  stopAlerts();
  signOut(auth);
}
