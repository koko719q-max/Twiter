

import { auth } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

export async function register(email, pass, username) {
  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  return cred;
}

export async function login(email, pass) {
  return await signInWithEmailAndPassword(auth, email, pass);
}

export async function logout() {
  return await signOut(auth);
}