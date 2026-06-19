
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  increment,
  onSnapshot,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDJ7jamMsm5UMZEHAbGkolTmxpd-VLaCWQ",
  authDomain: "twiter-e3dff.firebaseapp.com",
  projectId: "twiter-e3dff"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM FIX (KLJUČNO)
const authUI = document.getElementById("auth");
const layout = document.querySelector(".layout");

const loginBox = document.getElementById("loginBox");
const registerBox = document.getElementById("registerBox");

const loginUser = document.getElementById("loginUser");
const loginPass = document.getElementById("loginPass");

const regUserName = document.getElementById("regUserName");
const regUser = document.getElementById("regUser");
const regPass = document.getElementById("regPass");

const tweetInput = document.getElementById("tweetInput");
const tweets = document.getElementById("tweets");

const searchUser = document.getElementById("searchUser");
const usersList = document.getElementById("usersList");

const profilePage = document.getElementById("profilePage");
const profileName = document.getElementById("profileName");
const profileBadge = document.getElementById("profileBadge");
const profileAvatar = document.getElementById("profileAvatar");
const photoEditWrap = document.getElementById("photoEditWrap");
const profilePicInput = document.getElementById("profilePicInput");
const usernameInput = document.getElementById("usernameInput");
const logoutBtn = document.getElementById("logoutBtn");

let usersCache = [];
let friendsCache = [];
let unsub = null;
let expandedComments = new Set();

// USERS
async function loadUsers() {
  const snap = await getDocs(collection(db, "users"));
  usersCache = snap.docs.map(d => d.data());
}

function getUserByUid(uid) {
  return usersCache.find(u => u.uid === uid);
}

// LASTNIK APLIKACIJE - ta email vedno dobi "owner" rank
const OWNER_EMAIL = "matej22441@gmail.com";
const GIRL_EMAIL = "dunovic@gmail.com";
function ownerBadgeHtml(user) {
  if (user?.role === "owner") {
    return `<span class="owner-badge">👑 OWNER</span>`;
  }
  if (user?.role === "girl") {
    return `<span class="member-badge">💖 Punca</span>`;
  }
  return `<span class="member-badge">MEMBER</span>`;
}
// PREVERI/NASTAVI OWNER RANK ZA TRENUTNEGA UPORABNIKA, CE SE UJEMA EMAIL
async function ensureOwnerRole(authUser) {
  if (!authUser || authUser.email !== OWNER_EMAIL) return;

  const dbUser = getUserByUid(authUser.uid);
  if (dbUser?.role === "owner") return;

  try {
    const q = query(collection(db, "users"), where("uid", "==", authUser.uid));
    const snap = await getDocs(q);

    if (!snap.empty) {
      const userDocId = snap.docs[0].id;
      await updateDoc(doc(db, "users", userDocId), { role: "owner" });
      await loadUsers();
    }
  } catch (err) {
    console.error(err);
  }
}

// PREVERI/NASTAVI GIRL RANK ZA TRENUTNEGA UPORABNIKA, CE SE UJEMA EMAIL
async function ensureGirlRole(authUser) {
  if (!authUser || authUser.email !== GIRL_EMAIL) return;

  const dbUser = getUserByUid(authUser.uid);
  if (dbUser?.role === "girl") return;

  try {
    const q = query(collection(db, "users"), where("uid", "==", authUser.uid));
    const snap = await getDocs(q);

    if (!snap.empty) {
      const userDocId = snap.docs[0].id;
      await updateDoc(doc(db, "users", userDocId), { role: "girl" });
      await loadUsers();
    }
  } catch (err) {
    console.error(err);
  }
}

// AVATARS - rendering helper, uporabi sliko ce obstaja, drugace prva crka uporabnika
function setAvatarEl(el, user, fallbackName) {
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

function avatarHtml(user, fallbackName, sizeClass) {
  const name = user?.username || fallbackName || "?";
  if (user?.photoURL) {
    return `<div class="avatar ${sizeClass}" style="background-image:url(${user.photoURL})"></div>`;
  }
  return `<div class="avatar ${sizeClass}">${name.charAt(0).toUpperCase()}</div>`;
}

// AUTH STATE
onAuthStateChanged(auth, async (user) => {
  if (user) {
    authUI.style.display = "none";
    layout.style.display = "flex";
    await loadUsers();
    await ensureOwnerRole(user);
    await ensureGirlRole(user);
    listenTweets();
    listenAlerts();
  } else {
    authUI.style.display = "flex";
    layout.style.display = "none";
  }
});

// REGISTER
async function register() {
  const username = regUserName.value.trim();
  const email = regUser.value.trim();
  const pass = regPass.value;

  if (!username || !email || !pass) {
    alert("Izpolni vsa polja");
    return;
  }

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);

    await addDoc(collection(db, "users"), {
      uid: cred.user.uid,
      username,
      email,
      photoURL: null
    });

    regUserName.value = "";
    regUser.value = "";
    regPass.value = "";

    showLogin();
  } catch (err) {
    console.error(err);
    let msg = "Napaka pri registraciji";
    if (err.code === "auth/email-already-in-use") msg = "Ta email je že registriran";
    if (err.code === "auth/weak-password") msg = "Geslo je preveč šibko (vsaj 6 znakov)";
    if (err.code === "auth/invalid-email") msg = "Neveljaven email naslov";
    alert(msg);
  }
}

// LOGIN
async function login() {
  const email = loginUser.value.trim();
  const pass = loginPass.value;

  if (!email || !pass) {
    alert("Vnesi email in geslo");
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (err) {
    console.error(err);
    alert("Napaka pri prijavi: napačen email ali geslo");
  }
}

// LOGOUT
function logout() {
  if (unsub) {
    unsub();
    unsub = null;
  }
  if (alertsUnsub) {
    alertsUnsub();
    alertsUnsub = null;
  }
  signOut(auth);
}

// TWEETS
function listenTweets() {
  if (unsub) unsub();

  unsub = onSnapshot(collection(db, "tweets"), (snap) => {
    tweets.innerHTML = "";

    snap.forEach(d => {
      const t = d.data();
      const u = getUserByUid(t.uid);

      const div = document.createElement("div");
      div.className = "tweet";

      div.innerHTML = `
        ${avatarHtml(u, t.user, "avatar-small")}
        <div class="tweet-body">
          <b class="tweet-user" onclick="openProfile('${t.uid}')">${t.user}</b> ${ownerBadgeHtml(u)}
          <p>${t.text}</p>
          <div class="like-row">
            ❤️ ${t.likes} 🔁 ${t.retweets}
          </div>
          <div class="comment-toggle" onclick="toggleComments('${d.id}')">💬 ${t.comments} komentarjev</div>
          <div id="comments-${d.id}" class="comments-section" style="display:none;">
            <div id="commentsList-${d.id}"></div>
            <div class="comment-input-row">
              <input id="commentInput-${d.id}" placeholder="Dodaj komentar...">
              <button onclick="addComment('${d.id}')">Objavi</button>
            </div>
          </div>
        </div>
      `;

      tweets.appendChild(div);

      if (expandedComments.has(d.id)) {
        const section = document.getElementById(`comments-${d.id}`);
        if (section) section.style.display = "block";
        loadComments(d.id);
      }
    });
  });
}

// ADD TWEET
async function addTweet() {
  const text = tweetInput.value.trim();
  if (!text) return;

  if (text.toLowerCase() === "/clear") {
    await clearAllTweets();
    tweetInput.value = "";
    return;
  }

  if (text.toLowerCase().startsWith("/alert")) {
    await handleAlertCommand(text);
    tweetInput.value = "";
    return;
  }

  const user = auth.currentUser;
  if (!user) return;

  const dbUser = usersCache.find(u => u.uid === user.uid);

  try {
    await addDoc(collection(db, "tweets"), {
      uid: user.uid,
      user: dbUser?.username || user.email,
      text,
      likes: 0,
      comments: 0,
      retweets: 0,
      created: Date.now()
    });

    tweetInput.value = "";
  } catch (err) {
    console.error(err);
    alert("Napaka pri objavi tweeta");
  }
}

// UKAZ /alert <besedilo> - samo OWNER lahko poslje obvestilo VSEM uporabnikom v zivo
async function handleAlertCommand(rawText) {
  const user = auth.currentUser;
  if (!user) return;

  const dbUser = getUserByUid(user.uid);
  if (dbUser?.role !== "owner") {
    alert("Ta ukaz lahko uporabi samo OWNER");
    return;
  }

  const message = rawText.slice(6).trim();
  if (!message) {
    alert("Uporaba: /alert tvoje sporočilo");
    return;
  }

  try {
    await addDoc(collection(db, "alerts"), {
      message,
      createdBy: user.uid,
      created: Date.now()
    });
  } catch (err) {
    console.error(err);
    alert("Napaka pri pošiljanju obvestila");
  }
}

// IZBRISI VSE TWEETE IN KOMENTARJE (UKAZ /clear)
async function clearAllTweets() {
  const confirmed = confirm(
    "Si prepričan? To bo trajno izbrisalo VSE tweete in komentarje (za vse uporabnike) iz Firebase."
  );
  if (!confirmed) return;

  try {
    const tweetsSnap = await getDocs(collection(db, "tweets"));
    const commentsSnap = await getDocs(collection(db, "comments"));

    const deletions = [];
    tweetsSnap.forEach(d => deletions.push(deleteDoc(doc(db, "tweets", d.id))));
    commentsSnap.forEach(d => deletions.push(deleteDoc(doc(db, "comments", d.id))));

    await Promise.all(deletions);

    expandedComments.clear();
    alert("Vsi tweeti in komentarji so izbrisani");
  } catch (err) {
    console.error(err);
    alert("Napaka pri brisanju tweetov");
  }
}

// POSLUSAJ GLOBALNA OBVESTILA (/alert) V ZIVO IN JIH PRIKAZI VSEM UPORABNIKOM
let alertsUnsub = null;
let alertsLoaded = false;

function listenAlerts() {
  if (alertsUnsub) alertsUnsub();
  alertsLoaded = false;

  alertsUnsub = onSnapshot(collection(db, "alerts"), (snap) => {
    snap.docChanges().forEach(change => {
      if (change.type === "added" && alertsLoaded) {
        const data = change.doc.data();
        const sender = getUserByUid(data.createdBy);
        alert(`📢 OBVESTILO od ${sender?.username || "OWNER"}\n\n${data.message}`);
      }
    });
    alertsLoaded = true;
  });
}

// LIKE
async function like(id) {
  try {
    await updateDoc(doc(db, "tweets", id), {
      likes: increment(1)
    });
  } catch (err) {
    console.error(err);
  }
}

// KOMENTARJI
async function toggleComments(tweetId) {
  const section = document.getElementById(`comments-${tweetId}`);
  if (!section) return;

  const isHidden = section.style.display === "none" || !section.style.display;

  if (isHidden) {
    expandedComments.add(tweetId);
    section.style.display = "block";
    await loadComments(tweetId);
  } else {
    expandedComments.delete(tweetId);
    section.style.display = "none";
  }
}

async function loadComments(tweetId) {
  const listEl = document.getElementById(`commentsList-${tweetId}`);
  if (!listEl) return;

  try {
    const q = query(collection(db, "comments"), where("tweetId", "==", tweetId));
    const snap = await getDocs(q);

    const comments = snap.docs
      .map(d => d.data())
      .sort((a, b) => a.created - b.created);

    listEl.innerHTML = comments
      .map(c => {
        const u = getUserByUid(c.uid);
        return `
          <div class="comment-item">
            ${avatarHtml(u, c.user, "avatar-small")}
            <div>
              <b>${c.user}</b> ${ownerBadgeHtml(u)}
              <p>${c.text}</p>
            </div>
          </div>
        `;
      })
      .join("");
  } catch (err) {
    console.error(err);
    listEl.innerHTML = "<p>Napaka pri nalaganju komentarjev</p>";
  }
}

async function addComment(tweetId) {
  const input = document.getElementById(`commentInput-${tweetId}`);
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  const user = auth.currentUser;
  if (!user) return;

  const dbUser = getUserByUid(user.uid);

  try {
    await addDoc(collection(db, "comments"), {
      tweetId,
      uid: user.uid,
      user: dbUser?.username || user.email,
      text,
      created: Date.now()
    });

    await updateDoc(doc(db, "tweets", tweetId), {
      comments: increment(1)
    });

    input.value = "";
    await loadComments(tweetId);
  } catch (err) {
    console.error(err);
    alert("Napaka pri dodajanju komentarja");
  }
}

// NAVIGACIJA - poskrbi, da je vedno vidna samo ena stran
function hideAllPages() {
  document.querySelector(".feed").style.display = "none";
  document.getElementById("friendsPage").style.display = "none";
  profilePage.style.display = "none";
}

// FRIENDS
async function openFriends() {
  hideAllPages();
  document.getElementById("friendsPage").style.display = "block";

  await loadFriends();
  renderFriendRequests();
  renderMyFriends();

  usersList.innerHTML = "";
  searchUser.value = "";
}

function backToFeed() {
  hideAllPages();
  document.querySelector(".feed").style.display = "block";
}

// NALOZI VSE ODNOSE (PRIJATELJSTVA + ZAHTEVE), KI VKLJUCUJEJO TRENUTNEGA UPORABNIKA
async function loadFriends() {
  const user = auth.currentUser;
  if (!user) {
    friendsCache = [];
    return;
  }

  try {
    const q1 = query(collection(db, "friends"), where("from", "==", user.uid));
    const q2 = query(collection(db, "friends"), where("to", "==", user.uid));

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

// NAJDI ODNOS Z DOLOCENIM UPORABNIKOM (null, pending ali accepted)
function getRelationship(otherUid) {
  const myUid = auth.currentUser?.uid;
  return (
    friendsCache.find(
      f =>
        (f.from === myUid && f.to === otherUid) ||
        (f.from === otherUid && f.to === myUid)
    ) || null
  );
}

// PRIKAZI PRISPELE ZAHTEVE ZA PRIJATELJSTVO
function renderFriendRequests() {
  const myUid = auth.currentUser?.uid;
  const list = document.getElementById("friendRequestsList");
  if (!list) return;

  const requests = friendsCache.filter(f => f.to === myUid && f.status === "pending");

  if (requests.length === 0) {
    list.innerHTML = `<p class="section-empty">Trenutno ni novih zahtev</p>`;
    return;
  }

  list.innerHTML = requests
    .map(r => {
      const u = getUserByUid(r.from);
      return `
        <div class="friend-item">
          ${avatarHtml(u, u?.username, "avatar-small")}
          <b>${u?.username || "Neznan uporabnik"}</b> ${ownerBadgeHtml(u)}
          <button class="btn-auto" onclick="confirmFriend('${r.id}')">Potrdi</button>
          <button class="btn-auto btn-decline" onclick="declineFriend('${r.id}')">Zavrni</button>
        </div>
      `;
    })
    .join("");
}

// PRIKAZI SEZNAM POTRJENIH PRIJATELJEV
function renderMyFriends() {
  const myUid = auth.currentUser?.uid;
  const list = document.getElementById("myFriendsList");
  if (!list) return;

  const friends = friendsCache.filter(f => f.status === "accepted");

  if (friends.length === 0) {
    list.innerHTML = `<p class="section-empty">Še nimaš prijateljev</p>`;
    return;
  }

  list.innerHTML = friends
    .map(f => {
      const otherUid = f.from === myUid ? f.to : f.from;
      const u = getUserByUid(otherUid);
      return `
        <div class="friend-item" style="cursor:pointer;" onclick="openProfile('${otherUid}')">
          ${avatarHtml(u, u?.username, "avatar-small")}
          <b>${u?.username || "Neznan uporabnik"}</b> ${ownerBadgeHtml(u)}
          <span class="friend-status">✓ Prijatelja</span>
        </div>
      `;
    })
    .join("");
}

// POSLJI ZAHTEVO ZA PRIJATELJSTVO
async function addFriend(uid) {
  const user = auth.currentUser;
  if (!user) return;

  if (user.uid === uid) {
    alert("Ne moreš dodati samega sebe");
    return;
  }

  const rel = getRelationship(uid);
  if (rel) {
    if (rel.status === "accepted") {
      alert("Ta uporabnik je že tvoj prijatelj");
    } else if (rel.from === user.uid) {
      alert("Zahteva je že poslana, čakaš na potrditev");
    } else {
      alert("Ta uporabnik ti je že poslal zahtevo - potrdi jo zgoraj");
    }
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

// POTRDI ZAHTEVO ZA PRIJATELJSTVO
async function confirmFriend(requestId) {
  try {
    await updateDoc(doc(db, "friends", requestId), { status: "accepted" });
    await loadFriends();
    renderFriendRequests();
    renderMyFriends();
    if (searchUser.value) searchUsers();
  } catch (err) {
    console.error(err);
    alert("Napaka pri potrditvi prijateljstva");
  }
}

// ZAVRNI ZAHTEVO ZA PRIJATELJSTVO
async function declineFriend(requestId) {
  try {
    await deleteDoc(doc(db, "friends", requestId));
    await loadFriends();
    renderFriendRequests();
    if (searchUser.value) searchUsers();
  } catch (err) {
    console.error(err);
    alert("Napaka pri zavrnitvi zahteve");
  }
}

// SEARCH USERS
async function searchUsers() {
  const q = searchUser.value.toLowerCase();
  usersList.innerHTML = "";

  usersCache
    .filter(u => (u.username || "").toLowerCase().includes(q))
    .filter(u => u.uid !== auth.currentUser?.uid)
    .forEach(u => {
      const rel = getRelationship(u.uid);
      let actionHtml = `<button class="btn-auto" onclick="addFriend('${u.uid}')">Add</button>`;

      if (rel) {
        if (rel.status === "accepted") {
          actionHtml = `<span class="friend-status">✓ Prijatelja</span>`;
        } else if (rel.from === auth.currentUser?.uid) {
          actionHtml = `<span class="friend-pending">Zahteva poslana</span>`;
        } else {
          actionHtml = `<button class="btn-auto" onclick="confirmFriend('${rel.id}')">Potrdi</button>`;
        }
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

// SLIKA - pomanjsa in stisne sliko preden jo shranimo v Firestore (base64)
function resizeImage(file, maxSize = 200, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        let w = img.width;
        let h = img.height;

        if (w > h) {
          if (w > maxSize) {
            h = Math.round(h * (maxSize / w));
            w = maxSize;
          }
        } else {
          if (h > maxSize) {
            w = Math.round(w * (maxSize / h));
            h = maxSize;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);

        resolve(canvas.toDataURL("image/jpeg", quality));
      };

      img.onerror = reject;
      img.src = e.target.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// SHRANI PROFILNO SLIKO
async function uploadProfilePic() {
  const file = profilePicInput.files[0];
  if (!file) {
    alert("Najprej izberi sliko");
    return;
  }

  const user = auth.currentUser;

  try {
    const dataUrl = await resizeImage(file, 200, 0.7);

    const q = query(collection(db, "users"), where("uid", "==", user.uid));
    const snap = await getDocs(q);

    if (snap.empty) {
      alert("Uporabniškega profila ni mogoče najti");
      return;
    }

    const userDocId = snap.docs[0].id;
    await updateDoc(doc(db, "users", userDocId), { photoURL: dataUrl });

    await loadUsers();
    setAvatarEl(profileAvatar, getUserByUid(user.uid), profileName.innerText);
    profilePicInput.value = "";
    alert("Profilna slika posodobljena");
  } catch (err) {
    console.error(err);
    alert("Napaka pri nalaganju slike");
  }
}

// SHRANI UPORABNIŠKO IME
async function updateUsername() {
  const newName = usernameInput.value.trim();
  if (!newName) {
    alert("Vnesi novo uporabniško ime");
    return;
  }

  const user = auth.currentUser;

  try {
    const q = query(collection(db, "users"), where("uid", "==", user.uid));
    const snap = await getDocs(q);

    if (snap.empty) {
      alert("Uporabniškega profila ni mogoče najti");
      return;
    }

    const userDocId = snap.docs[0].id;
    await updateDoc(doc(db, "users", userDocId), { username: newName });

    await loadUsers();

    const updatedUser = getUserByUid(user.uid);
    profileName.innerText = updatedUser?.username || newName;
    profileBadge.innerHTML = ownerBadgeHtml(updatedUser);
    setAvatarEl(profileAvatar, updatedUser, newName);
    usernameInput.value = "";

    alert("Uporabniško ime posodobljeno. Opomba: že objavljeni tweeti ohranijo staro ime.");
  } catch (err) {
    console.error(err);
    alert("Napaka pri posodabljanju imena");
  }
}

// PROFILE
async function openProfile(uid) {
  hideAllPages();
  profilePage.style.display = "block";

  const user = getUserByUid(uid);
  profileName.innerText = user?.username || "Profile";
  profileBadge.innerHTML = ownerBadgeHtml(user);
  setAvatarEl(profileAvatar, user, user?.username);

  const isOwnProfile = auth.currentUser && auth.currentUser.uid === uid;
  photoEditWrap.classList.toggle("hidden", !isOwnProfile);
  logoutBtn.classList.toggle("hidden", !isOwnProfile);

  if (isOwnProfile) {
    usernameInput.value = user?.username || "";
  }
}

function closeProfile() {
  hideAllPages();
  document.querySelector(".feed").style.display = "block";
}

function openMyProfile() {
  if (!auth.currentUser) return;
  openProfile(auth.currentUser.uid);
}

function goHome() {
  backToFeed();
}

// UI
function showRegister() {
  loginBox.style.display = "none";
  registerBox.style.display = "block";
}

function showLogin() {
  loginBox.style.display = "block";
  registerBox.style.display = "none";
}

// EXPORT TO WINDOW
window.login = login;
window.register = register;
window.addTweet = addTweet;
window.like = like;
window.openFriends = openFriends;
window.backToFeed = backToFeed;
window.searchUsers = searchUsers;
window.addFriend = addFriend;
window.openProfile = openProfile;
window.openMyProfile = openMyProfile;
window.closeProfile = closeProfile;
window.goHome = goHome;
window.showRegister = showRegister;
window.showLogin = showLogin;
window.uploadProfilePic = uploadProfilePic;
window.updateUsername = updateUsername;
window.toggleComments = toggleComments;
window.addComment = addComment;
window.logout = logout;
window.confirmFriend = confirmFriend;
window.declineFriend = declineFriend;

