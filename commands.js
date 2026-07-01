import { db, auth } from "./config.js";
import { getUserByUid } from "./users.js";
import { showToast } from "./notifications.js";
import {
  collection,
  addDoc,
  getDocs,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let alertsUnsub   = null;
let alertsLoaded  = false;

// ── /alert ────────────────────────────────────────────

export async function handleAlertCommand(rawText) {
  const user = auth.currentUser;
  if (!user) return;
  const dbUser = getUserByUid(user.uid);
  if (dbUser?.role !== "owner") { alert("Ta ukaz lahko uporabi samo OWNER"); return; }

  const message = rawText.slice(6).trim();
  if (!message) { alert("Uporaba: /alert tvoje sporočilo"); return; }

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

// ── /backup ───────────────────────────────────────────

export async function handleBackupCommand() {
  const user = auth.currentUser;
  if (!user) return;
  const dbUser = getUserByUid(user.uid);
  if (dbUser?.role !== "owner") { alert("Ta ukaz lahko uporabi samo OWNER"); return; }

  try {
    showToast("⏳ Pripravljam backup...");
    const [tweetsSnap, commentsSnap, usersSnap, friendsSnap] = await Promise.all([
      getDocs(collection(db, "tweets")),
      getDocs(collection(db, "comments")),
      getDocs(collection(db, "users")),
      getDocs(collection(db, "friends"))
    ]);

    const backup = {
      exportedAt: new Date().toISOString(),
      tweets:   tweetsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      comments: commentsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      users:    usersSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      friends:  friendsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("✅ Backup uspešno izvožen!");
  } catch (err) {
    console.error(err);
    alert("Napaka pri izvozu backupa");
  }
}

// ── listenAlerts ──────────────────────────────────────

export function listenAlerts() {
  if (alertsUnsub) alertsUnsub();
  alertsLoaded = false;

  alertsUnsub = onSnapshot(collection(db, "alerts"), (snap) => {
    snap.docChanges().forEach(change => {
      if (change.type === "added" && alertsLoaded) {
        const data   = change.doc.data();
        const sender = getUserByUid(data.createdBy);
        alert(`📢 OBVESTILO od ${sender?.username || "OWNER"}\n\n${data.message}`);
      }
    });
    alertsLoaded = true;
  });
}

export function stopAlerts() {
  if (alertsUnsub) { alertsUnsub(); alertsUnsub = null; }
}
