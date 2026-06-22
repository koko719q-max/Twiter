import { db, auth } from "./config.js";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export let usersCache = [];

export const OWNER_EMAIL = "matej22441@gmail.com";
export const GIRL_EMAIL  = "dunovic@gmail.com";

// ── Cache ──────────────────────────────────────────────

export async function loadUsers() {
  const snap = await getDocs(collection(db, "users"));
  usersCache = snap.docs.map(d => d.data());
}

export function getUserByUid(uid) {
  return usersCache.find(u => u.uid === uid);
}

// ── Badges ────────────────────────────────────────────

export function ownerBadgeHtml(user) {
  if (user?.role === "owner") return `<span class="owner-badge">👑 OWNER</span>`;
  if (user?.role === "girl")  return `<span class="member-badge">💖 Punca</span>`;
  return `<span class="member-badge">MEMBER</span>`;
}

// ── Avatars ───────────────────────────────────────────

export function setAvatarEl(el, user, fallbackName) {
  el.innerHTML = "";
  const name = user?.username || fallbackName || "?";
  if (user?.photoURL) {
    el.style.backgroundImage = `url(${user.photoURL})`;
    el.innerText = "";
  } else {
    el.style.backgroundImage = "none";
    el.innerText = name.charAt(0).toUpperCase();
  }
}

export function avatarHtml(user, fallbackName, sizeClass) {
  const name = user?.username || fallbackName || "?";
  if (user?.photoURL) {
    return `<div class="avatar ${sizeClass}" style="background-image:url(${user.photoURL})"></div>`;
  }
  return `<div class="avatar ${sizeClass}">${name.charAt(0).toUpperCase()}</div>`;
}

// ── Roles ─────────────────────────────────────────────

async function setRole(authUser, email, role) {
  if (!authUser || authUser.email !== email) return;
  const dbUser = getUserByUid(authUser.uid);
  if (dbUser?.role === role) return;
  try {
    const q = query(collection(db, "users"), where("uid", "==", authUser.uid));
    const snap = await getDocs(q);
    if (!snap.empty) {
      await updateDoc(doc(db, "users", snap.docs[0].id), { role });
      await loadUsers();
    }
  } catch (err) {
    console.error(err);
  }
}

export function ensureOwnerRole(authUser) {
  return setRole(authUser, OWNER_EMAIL, "owner");
}

export function ensureGirlRole(authUser) {
  return setRole(authUser, GIRL_EMAIL, "girl");
}
