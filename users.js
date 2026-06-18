import { db } from "./firebase.js";
import {
  collection, getDocs, updateDoc, doc, query, where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export let usersCache = [];

export async function loadUsers() {
  const snap = await getDocs(collection(db, "users"));
  usersCache = snap.docs.map(d => d.data());
}

export function getUserByUid(uid) {
  return usersCache.find(u => u.uid === uid);
}

export async function setOwnerRoleIfNeeded(authUser, OWNER_EMAIL) {
  if (!authUser || authUser.email !== OWNER_EMAIL) return;

  const q = query(collection(db, "users"), where("uid", "==", authUser.uid));
  const snap = await getDocs(q);

  if (!snap.empty) {
    const id = snap.docs[0].id;
    await updateDoc(doc(db, "users", id), { role: "owner" });
    await loadUsers();
  }
}

