import { db, auth } from "./firebase.js";
import {
  collection, addDoc, onSnapshot, updateDoc, doc, increment
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export let unsubTweets = null;

export function listenTweets(callback) {
  if (unsubTweets) unsubTweets();

  unsubTweets = onSnapshot(collection(db, "tweets"), (snap) => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(data);
  });
}

export async function addTweet(text, user, username) {
  return await addDoc(collection(db, "tweets"), {
    uid: user.uid,
    user: username,
    text,
    likes: 0,
    comments: 0,
    retweets: 0,
    created: Date.now()
  });
}

export async function likeTweet(id) {
  return await updateDoc(doc(db, "tweets", id), {
    likes: increment(1)
  });
}

