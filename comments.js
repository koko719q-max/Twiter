

import { db } from "./firebase.js";
import {
  collection, addDoc, query, where, getDocs,
  updateDoc, doc, increment
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export async function loadComments(tweetId) {
  const q = query(collection(db, "comments"), where("tweetId", "==", tweetId));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
}

export async function addComment(tweetId, user, username, text) {
  await addDoc(collection(db, "comments"), {
    tweetId,
    uid: user.uid,
    user: username,
    text,
    created: Date.now()
  });

  await updateDoc(doc(db, "tweets", tweetId), {
    comments: increment(1)
  });
}