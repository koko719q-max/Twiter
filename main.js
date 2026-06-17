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
  updateDoc,
  increment,
  doc,
  onSnapshot,
  getDocs
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
// STATE
// =========================
let usersCache = [];
let unsubscribeTweets = null;

// =========================
// DOM
// =========================
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

// =========================
// USERS
// =========================
async function loadUsers() {
  const snap = await getDocs(collection(db, "users"));
  usersCache = snap.docs.map(d => d.data());
}

// =========================
// UI SWITCH
// =========================
function showRegister() {
  loginBox.style.display = "none";
  registerBox.style.display = "block";
}

function showLogin() {
  loginBox.style.display = "block";
  registerBox.style.display = "none";
}

// =========================
// REGISTER
// =========================
async function register() {
  const username = regUserName.value.trim();
  const email = regUser.value.trim();
  const pass = regPass.value.trim();

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
  const email = loginUser.value.trim();
  const pass = loginPass.value.trim();

  if (!email || !pass) return alert("Fill all fields");

  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (err) {
    alert(err.message);
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
    authUI.style.display = "none";
    layout.style.display = "flex";

    await loadUsers();
    listenTweets();
  } else {
    authUI.style.display = "flex";
    layout.style.display = "none";

    if (unsubscribeTweets) unsubscribeTweets();
  }
});

// =========================
// REALTIME TWEETS
// =========================
function listenTweets() {
  if (unsubscribeTweets) unsubscribeTweets();

  unsubscribeTweets = onSnapshot(collection(db, "tweets"), (snap) => {
    tweets.innerHTML = "";

    snap.forEach((docSnap) => {
      const t = docSnap.data();
      const id = docSnap.id;

      const div = document.createElement("div");
      div.className = "tweet";

      div.innerHTML = `
        <b onclick="openProfile('${t.uid}')" style="cursor:pointer;">
          ${t.user}
        </b>
        <p>${t.text}</p>

        <div>
          💬 ${t.comments}
          🔁 ${t.retweets}
          ❤️ ${t.likes}
        </div>

        <button onclick="like('${id}')">Like</button>
        <button onclick="comment('${id}')">Comment</button>
        <button onclick="retweet('${id}')">Retweet</button>
      `;

      tweets.appendChild(div);
    });
  });
}

// =========================
// ADD TWEET
// =========================
async function addTweet() {
  const text = tweetInput.value.trim();
  const user = auth.currentUser;

  if (!user) return alert("Login first");
  if (!text) return;

  const dbUser = usersCache.find(u => u.uid === user.uid);

  await addDoc(collection(db, "tweets"), {
    uid: user.uid,
    user: dbUser ? dbUser.username : user.email,
    text,
    likes: 0,
    comments: 0,
    retweets: 0,
    created: Date.now()
  });

  tweetInput.value = "";
}

// =========================
// ACTIONS
// =========================
async function like(id) {
  await updateDoc(doc(db, "tweets", id), {
    likes: increment(1)
  });
}

async function comment(id) {
  await updateDoc(doc(db, "tweets", id), {
    comments: increment(1)
  });
}

async function retweet(id) {
  await updateDoc(doc(db, "tweets", id), {
    retweets: increment(1)
  });
}

// =========================
// PROFILE (FIXED UID)
// =========================
async function openProfile(uid) {
  document.querySelector(".layout").style.display = "none";
  document.getElementById("profilePage").style.display = "block";

  const name = usersCache.find(u => u.uid === uid)?.username || "User";

  document.getElementById("profileName").innerText = name;

  const container = document.getElementById("profileTweets");
  container.innerHTML = "";

  const snap = await getDocs(collection(db, "tweets"));

  snap.forEach((docSnap) => {
    const t = docSnap.data();
    if (t.uid !== uid) return;

    const div = document.createElement("div");
    div.className = "tweet";

    div.innerHTML = `
      <p>${t.text}</p>
      💬 ${t.comments} 🔁 ${t.retweets} ❤️ ${t.likes}
    `;

    container.appendChild(div);
  });
}

// =========================
// MY PROFILE
// =========================
function openMyProfile() {
  const user = auth.currentUser;
  if (!user) return;

  openProfile(user.uid);
}

function closeProfile() {
  document.getElementById("profilePage").style.display = "none";
  document.querySelector(".layout").style.display = "flex";
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
