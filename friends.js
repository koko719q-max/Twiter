import { db } from "./firebase.js";
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, query, where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export let friendsCache = [];

export async function loadFriends(uid) {
  const q1 = query(collection(db, "friends"), where("from", "==", uid));
  const q2 = query(collection(db, "friends"), where("to", "==", uid));

  const [a, b] = await Promise.all([getDocs(q1), getDocs(q2)]);

  const map = new Map();
  a.forEach(d => map.set(d.id, { id: d.id, ...d.data() }));
  b.forEach(d => map.set(d.id, { id: d.id, ...d.data() }));

  friendsCache = [...map.values()];
}

export async function addFriend(from, to) {
  return addDoc(collection(db, "friends"), {
    from,
    to,
    status: "pending",
    created: Date.now()
  });
}

export async function acceptFriend(id) {
  return updateDoc(doc(db, "friends", id), { status: "accepted" });
}

export async function declineFriend(id) {
  return deleteDoc(doc(db, "friends", id));
}

