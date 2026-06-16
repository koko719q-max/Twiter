
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
  doc,
  updateDoc,
  increment
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 🔥 FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyDJ7jamMsm5UMZEHAbGkolTmxpd-VLaCWQ",
  authDomain: "twiter-e3dff.firebaseapp.com",
  projectId: "twiter-e3dff",
  storageBucket: "twiter-e3dff.appspot.com",
  messagingSenderId: "1085021108337",
  appId: "1:1085021108337:web:48c5558d973d79d21b03d0",
  measurementId: "G-CZYEY3VMZ5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// =========================
// USERS CACHE (USERNAME FIX)
// =========================
let usersCache = [];

// =========================
// LOAD USERS
// =========================
async function loadUsers() {
  const snap = await getDocs(collection(db, "users"));
  usersCache = snap.docs.map(d => d.data());
}

// =========================
// UI
// =========================
function showRegister() {
  document.getElementById("loginBox").style.display = "none";
  document.getElementById("registerBox").style.display = "block";
}

function showLogin() {
  document.getElementById("loginBox").style.display = "block";
  document.getElementById("registerBox").style.display = "none";
}

// =========================
// REGISTER
// =========================
async function register() {
  const username = document.getElementById("regUserName").value.trim();
  const email = document.getElementById("regUser").value.trim();
  const pass = document.getElementById("regPass").value.trim();

  if (!username || !email || !pass) return alert("Fill all fields");

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);

    await addDoc(collection(db, "users"), {
      uid: cred.user.uid,
      username,
      email
    });

    alert("Registered!");
    showLogin();

  } catch (err) {
    alert(err.message);
  }
}

// =========================
// LOGIN
// =========================
async function login() {
  const email = document.getElementById("loginUser").value.trim();
  const pass = document.getElementById("loginPass").value.trim();

  if (!email || !pass) return alert("Fill all fields");

  try {
    await signInWithEmailAndPassword(auth, email, pass);
    document.getElementById("auth").style.display = "none";
    await loadUsers();
    render();
  } catch (err) {
    alert("Login failed: " + err.message);
  }
}

// =========================
// LOGOUT
// =========================
function logout() {
  signOut(auth);
}

// =========================
// AUTH STATE
// =========================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    await loadUsers();
    document.getElementById("auth").style.display = "none";
  } else {
    document.getElementById("auth").style.display = "flex";
  }
  render();
});

// =========================
// ADD TWEET
// =========================
async function addTweet() {
  const input = document.getElementById("tweetInput");
  const text = input.value.trim();
  const user = auth.currentUser;

  if (!user) return alert("Login first");
  if (!text) return;

  const dbUser = usersCache.find(u => u.uid === user.uid);

  await addDoc(collection(db, "tweets"), {
    user: dbUser ? dbUser.username : user.email,
    uid: user.uid,
    text,
    likes: 0,
    comments: 0,
    retweets: 0,
    created: Date.now()
  });

  input.value = "";
  render();
}

// =========================
// LIKE
// =========================
async function like(id) {
  await updateDoc(doc(db, "tweets", id), {
    likes: increment(1)
  });
  render();
}

// =========================
// RETWEET
// =========================
async function retweet(id) {
  await updateDoc(doc(db, "tweets", id), {
    retweets: increment(1)
  });
  render();
}

// =========================
// COMMENT
// =========================
async function comment(id) {
  await updateDoc(doc(db, "tweets", id), {
    comments: increment(1)
  });
  render();
}

// =========================
// PROFILE
// =========================
async function openProfile(username) {
  document.querySelector(".layout").style.display = "none";
  document.getElementById("profilePage").style.display = "block";

  document.getElementById("profileName").innerText = username;

  const container = document.getElementById("profileTweets");
  container.innerHTML = "";

  const snap = await getDocs(collection(db, "tweets"));

  snap.forEach((docSnap) => {
    const t = docSnap.data();
    if (t.user !== username) return;

    const div = document.createElement("div");
    div.className = "tweet";

    div.innerHTML = `
      <p>${t.text}</p>
      <div class="actions">
        💬 ${t.comments} 🔁 ${t.retweets} ❤️ ${t.likes}
      </div>
    `;

    container.appendChild(div);
  });
}

// =========================
// MY PROFILE
// =========================
function openMyProfile() {
  const user = auth.currentUser;
  if (!user) return alert("Login first");

  const dbUser = usersCache.find(u => u.uid === user.uid);

  openProfile(dbUser ? dbUser.username : user.email);
}

function closeProfile() {
  document.getElementById("profilePage").style.display = "none";
  document.querySelector(".layout").style.display = "flex";
}

// =========================
// RENDER
// =========================
async function render() {
  const container = document.getElementById("tweets");
  if (!container) return;

  container.innerHTML = "";

  const snap = await getDocs(collection(db, "tweets"));

  snap.forEach((docSnap) => {
    const t = docSnap.data();
    const id = docSnap.id;

    const div = document.createElement("div");
    div.className = "tweet";

    div.innerHTML = `
      <b onclick="openProfile('${t.user}')" style="cursor:pointer;">
        ${t.user}
      </b>
      <p>${t.text}</p>

      <div class="actions">
        <span onclick="comment('${id}')">💬 ${t.comments}</span>
        <span onclick="retweet('${id}')">🔁 ${t.retweets}</span>
        <span onclick="like('${id}')">❤️ ${t.likes}</span>
      </div>
    `;

    container.appendChild(div);
  });
}

// =========================
// GLOBALS
// =========================
window.login = login;
window.register = register;
window.logout = logout;

window.addTweet = addTweet;
window.like = like;
window.comment = comment;
window.retweet = retweet;

window.openProfile = openProfile;
window.openMyProfile = openMyProfile;
window.closeProfile = closeProfile;

window.showLogin = showLogin;
window.showRegister = showRegister;
