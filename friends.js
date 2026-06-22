import { db, auth } from "./config.js";
import { avatarHtml, ownerBadgeHtml, getUserByUid, usersCache } from "./users.js";
import { hideAllPages } from "./ui.js";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export let friendsCache = [];

// ── Load ──────────────────────────────────────────────

export async function loadFriends() {
  const user = auth.currentUser;
  if (!user) { friendsCache = []; return; }

  try {
    const q1 = query(collection(db, "friends"), where("from", "==", user.uid));
    const q2 = query(collection(db, "friends"), where("to",   "==", user.uid));
    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

    const map = new Map();
    snap1.forEach(d => map.set(d.id, { id: d.id, ...d.data() }));
    snap2.forEach(d => map.set(d.id, { id: d.id, ...d.data() }));
    friendsCache = Array.from(map.values());
  } catch (err) {
    console.error(err);
    friendsCache = [];
  }
}

// ── Helpers ───────────────────────────────────────────

export function getRelationship(otherUid) {
  const myUid = auth.currentUser?.uid;
  return friendsCache.find(
    f => (f.from === myUid && f.to === otherUid) || (f.from === otherUid && f.to === myUid)
  ) || null;
}

// ── Render ────────────────────────────────────────────

export function renderFriendRequests() {
  const myUid = auth.currentUser?.uid;
  const list = document.getElementById("friendRequestsList");
  if (!list) return;

  const requests = friendsCache.filter(f => f.to === myUid && f.status === "pending");
  if (requests.length === 0) {
    list.innerHTML = `<p class="section-empty">Trenutno ni novih zahtev</p>`;
    return;
  }

  list.innerHTML = requests.map(r => {
    const u = getUserByUid(r.from);
    return `
      <div class="friend-item">
        ${avatarHtml(u, u?.username, "avatar-small")}
        <b>${u?.username || "Neznan uporabnik"}</b> ${ownerBadgeHtml(u)}
        <button class="btn-auto" onclick="confirmFriend('${r.id}')">Potrdi</button>
        <button class="btn-auto btn-decline" onclick="declineFriend('${r.id}')">Zavrni</button>
      </div>
    `;
  }).join("");
}

export function renderMyFriends() {
  const myUid = auth.currentUser?.uid;
  const list = document.getElementById("myFriendsList");
  if (!list) return;

  const friends = friendsCache.filter(f => f.status === "accepted");
  if (friends.length === 0) {
    list.innerHTML = `<p class="section-empty">Še nimaš prijateljev</p>`;
    return;
  }

  list.innerHTML = friends.map(f => {
    const otherUid = f.from === myUid ? f.to : f.from;
    const u = getUserByUid(otherUid);
    return `
      <div class="friend-item" style="cursor:pointer;" onclick="openProfile('${otherUid}')">
        ${avatarHtml(u, u?.username, "avatar-small")}
        <b>${u?.username || "Neznan uporabnik"}</b> ${ownerBadgeHtml(u)}
        <span class="friend-status">✓ Prijatelja</span>
      </div>
    `;
  }).join("");
}

// ── Actions ───────────────────────────────────────────

export async function addFriend(uid) {
  const user = auth.currentUser;
  if (!user) return;
  if (user.uid === uid) { alert("Ne moreš dodati samega sebe"); return; }

  const rel = getRelationship(uid);
  if (rel) {
    if (rel.status === "accepted")       alert("Ta uporabnik je že tvoj prijatelj");
    else if (rel.from === user.uid)      alert("Zahteva je že poslana, čakaš na potrditev");
    else                                 alert("Ta uporabnik ti je že poslal zahtevo — potrdi jo zgoraj");
    return;
  }

  try {
    await addDoc(collection(db, "friends"), {
      from: user.uid,
      to: uid,
      status: "pending",
      created: Date.now()
    });
    await loadFriends();
    searchUsers();
    renderFriendRequests();
    renderMyFriends();
    alert("Zahteva za prijateljstvo poslana");
  } catch (err) {
    console.error(err);
    alert("Napaka pri pošiljanju zahteve");
  }
}

export async function confirmFriend(requestId) {
  try {
    await updateDoc(doc(db, "friends", requestId), { status: "accepted" });
    await loadFriends();
    renderFriendRequests();
    renderMyFriends();
    const searchUser = document.getElementById("searchUser");
    if (searchUser?.value) searchUsers();
  } catch (err) {
    console.error(err);
    alert("Napaka pri potrditvi prijateljstva");
  }
}

export async function declineFriend(requestId) {
  try {
    await deleteDoc(doc(db, "friends", requestId));
    await loadFriends();
    renderFriendRequests();
    const searchUser = document.getElementById("searchUser");
    if (searchUser?.value) searchUsers();
  } catch (err) {
    console.error(err);
    alert("Napaka pri zavrnitvi zahteve");
  }
}

// ── Search ────────────────────────────────────────────

export function searchUsers() {
  const searchUser = document.getElementById("searchUser");
  const usersList  = document.getElementById("usersList");
  const q = searchUser.value.toLowerCase();
  usersList.innerHTML = "";

  usersCache
    .filter(u => (u.username || "").toLowerCase().includes(q))
    .filter(u => u.uid !== auth.currentUser?.uid)
    .forEach(u => {
      const rel = getRelationship(u.uid);
      let actionHtml = `<button class="btn-auto" onclick="addFriend('${u.uid}')">Add</button>`;

      if (rel) {
        if (rel.status === "accepted")
          actionHtml = `<span class="friend-status">✓ Prijatelja</span>`;
        else if (rel.from === auth.currentUser?.uid)
          actionHtml = `<span class="friend-pending">Zahteva poslana</span>`;
        else
          actionHtml = `<button class="btn-auto" onclick="confirmFriend('${rel.id}')">Potrdi</button>`;
      }

      const div = document.createElement("div");
      div.className = "friend-item";
      div.innerHTML = `
        ${avatarHtml(u, u.username, "avatar-small")}
        <b>${u.username || u.email}</b> ${ownerBadgeHtml(u)}
        ${actionHtml}
      `;
      usersList.appendChild(div);
    });
}

// ── Page ──────────────────────────────────────────────

export async function openFriends() {
  hideAllPages();
  document.getElementById("friendsPage").style.display = "block";
  await loadFriends();
  renderFriendRequests();
  renderMyFriends();
  document.getElementById("usersList").innerHTML = "";
  document.getElementById("searchUser").value = "";
}
