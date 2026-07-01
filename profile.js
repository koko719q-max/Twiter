import { db, auth } from "./config.js";
import { getUserByUid, loadUsers, setAvatarEl, ownerBadgeHtml } from "./users.js";
import { hideAllPages } from "./ui.js";
import { applyColors, escapeHtml } from "./color.js";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Helper: varen prikaz imena (barve za owner, escape za vse ostale) ──

function renderName(dbUser, rawName) {
  return dbUser?.role === "owner" ? applyColors(rawName) : escapeHtml(rawName);
}

// ── Resize profile pic ────────────────────────────────

function resizeImage(file, maxSize = 200, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > h) { if (w > maxSize) { h = Math.round(h * (maxSize / w)); w = maxSize; } }
        else        { if (h > maxSize) { w = Math.round(w * (maxSize / h)); h = maxSize; } }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ── Upload profile pic ────────────────────────────────

export async function uploadProfilePic() {
  const profilePicInput = document.getElementById("profilePicInput");
  const file = profilePicInput.files[0];
  if (!file) { alert("Najprej izberi sliko"); return; }

  const user = auth.currentUser;
  try {
    const dataUrl = await resizeImage(file, 200, 0.7);
    const q = query(collection(db, "users"), where("uid", "==", user.uid));
    const snap = await getDocs(q);
    if (snap.empty) { alert("Uporabniškega profila ni mogoče najti"); return; }

    await updateDoc(doc(db, "users", snap.docs[0].id), { photoURL: dataUrl });
    await loadUsers();

    const profileAvatar = document.getElementById("profileAvatar");
    const profileName   = document.getElementById("profileName");
    setAvatarEl(profileAvatar, getUserByUid(user.uid), profileName.innerText);
    profilePicInput.value = "";
    alert("Profilna slika posodobljena");
  } catch (err) {
    console.error(err);
    alert("Napaka pri nalaganju slike");
  }
}

// ── Update username ───────────────────────────────────
//
// ✔️ FIX: v Firestore se shrani SUROVO ime (kot ga uporabnik natipka),
// barve/escape se aplicirajo šele ob PRIKAZU (renderName). Tako:
//  - "Uredi ime" polje po ponovnem odpiranju prikaže pravo, urejeno besedilo
//    (ne pokvarjen HTML s <span> tagi).
//  - Owner lahko uporabi barvne tage (<red>, <rainbow>, <neon>, ...).
//  - Vsi ostali uporabniki so vedno varno escape-ani (brez XSS).

export async function updateUsername() {
  const usernameInput = document.getElementById("usernameInput");
  const rawName = usernameInput.value.trim();
  if (!rawName) { alert("Vnesi novo uporabniško ime"); return; }

  const user = auth.currentUser;
  try {
    const q = query(collection(db, "users"), where("uid", "==", user.uid));
    const snap = await getDocs(q);
    if (snap.empty) { alert("Uporabniškega profila ni mogoče najti"); return; }

    await updateDoc(doc(db, "users", snap.docs[0].id), { username: rawName });
    await loadUsers();

    const updatedUser = getUserByUid(user.uid);
    const displayName = updatedUser?.username || rawName;

    document.getElementById("profileName").innerHTML = renderName(updatedUser, displayName);
    document.getElementById("profileBadge").innerHTML = ownerBadgeHtml(updatedUser);
    setAvatarEl(document.getElementById("profileAvatar"), updatedUser, displayName);
    usernameInput.value = "";
    alert("Uporabniško ime posodobljeno. Opomba: že objavljeni tweeti ohranijo staro ime.");
  } catch (err) {
    console.error(err);
    alert("Napaka pri posodabljanju imena");
  }
}

// ── Open / close profile ──────────────────────────────

export async function openProfile(uid) {
  hideAllPages();
  document.getElementById("profilePage").style.display = "block";

  const user = getUserByUid(uid);
  const displayName = user?.username || "Profile";

  document.getElementById("profileName").innerHTML = renderName(user, displayName);
  document.getElementById("profileBadge").innerHTML = ownerBadgeHtml(user);
  setAvatarEl(document.getElementById("profileAvatar"), user, displayName);

  const isOwnProfile = auth.currentUser && auth.currentUser.uid === uid;
  document.getElementById("photoEditWrap").classList.toggle("hidden", !isOwnProfile);
  document.getElementById("logoutBtn").classList.toggle("hidden", !isOwnProfile);

  if (isOwnProfile) {
    // Surovo ime (brez barvnih tagov v HTML obliki) — pravilno za urejanje
    document.getElementById("usernameInput").value = user?.username || "";
  }
}

export function closeProfile() {
  hideAllPages();
  document.querySelector(".feed").style.display = "block";
}

export function openMyProfile() {
  if (!auth.currentUser) return;
  openProfile(auth.currentUser.uid);
}
