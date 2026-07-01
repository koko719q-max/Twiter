import { doc, getDoc, setDoc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db } from "./config.js";

const REF = (uid) => doc(db, "userRewards", uid);


// ── GET COINS ─────────────────────────────────────────

export async function getCoins(uid) {
  const snap = await getDoc(REF(uid));

  if (!snap.exists()) return 0;

  return snap.data().coins || 0;
}


// ── ADD COINS (FAST + SAFE) ───────────────────────────

export async function addCoins(uid, amount) {
  const ref = REF(uid);

  await setDoc(
    ref,
    {
      coins: increment(amount)
    },
    { merge: true }
  );

  return getCoins(uid);
}


// ── REMOVE COINS (optional za shop) ───────────────────

export async function removeCoins(uid, amount) {
  const ref = REF(uid);

  await setDoc(
    ref,
    {
      coins: increment(-amount)
    },
    { merge: true }
  );

  return getCoins(uid);
}
