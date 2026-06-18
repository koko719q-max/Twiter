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
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// CONFIG
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_DOMAIN",
  projectId: "YOUR_PROJECT_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ELEMENTI
const authUI = document.getElementById("auth");
const layout = document.querySelector(".layout");
const tweets = document.getElementById("tweets");
const tweetInput = document.getElementById("tweetInput");

// AUTH STATE
onAuthStateChanged(auth, (user) => {
  if (user) {
    authUI.style.display = "none";
    layout.style.display = "flex";
    loadTweets();
  } else {
    authUI.style.display = "flex";
    layout.style.display = "none";
  }
});

// REGISTER
window.register = async () => {
  await createUserWithEmailAndPassword(
    auth,
    regUser.value,
    regPass.value
  );
};

// LOGIN
window.login = async () => {
  await signInWithEmailAndPassword(
    auth,
    loginUser.value,
    loginPass.value
  );
};

// LOGOUT
window.logout = () => signOut(auth);

// ADD TWEET
window.addTweet = async () => {
  if (!tweetInput.value) return;

  await addDoc(collection(db, "tweets"), {
    text: tweetInput.value
  });

  tweetInput.value = "";
  loadTweets();
};

// LOAD TWEETS
async function loadTweets() {
  tweets.innerHTML = "";

  const snap = await getDocs(collection(db, "tweets"));
  snap.forEach(doc => {
    const t = doc.data();

    const div = document.createElement("div");
    div.className = "tweet";
    div.innerText = t.text;

    tweets.appendChild(div);
  });
}