
// ─────────────────────────────────────────────
// WARN SYSTEM
// ─────────────────────────────────────────────

// HANDLE /warn COMMAND
async function handleWarnCommand(rawText) {
  const user = window.auth.currentUser;
  if (!user) return;

  const dbUser = window.getUserByUid(user.uid);

  if (dbUser?.role !== "owner") {
    alert("Samo OWNER lahko uporablja /warn");
    return;
  }

  const parts = rawText.trim().split(" ");
  if (parts.length < 3) {
    alert("Uporaba: /warn @uporabnik sporočilo");
    return;
  }

  // normalizacija (č, š, ž + lowercase)
  const normalize = (s) =>
    (s || "")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();

  const inputName = normalize(parts[1].replace("@", ""));
  const message = parts.slice(2).join(" ");

  const targetUser = window.usersCache.find(u =>
    normalize(u.username) === inputName
  );

  if (!targetUser) {
    alert("Uporabnik ni najden");
    return;
  }

  try {
    await window.addDoc(
      window.collection(window.db, "warnings"),
      {
        targetUid: targetUser.uid,
        targetUsername: targetUser.username,
        message,
        createdBy: user.uid,
        created: Date.now()
      }
    );

    window.showToast(`⚠️ Warning poslan @${targetUser.username}`);
  } catch (err) {
    console.error(err);
    alert("Napaka pri pošiljanju warninga");
  }
}

// ─────────────────────────────────────────────
// LISTENER ZA WARNINGS
// ─────────────────────────────────────────────

let unsubWarnings = null;
let warningsLoaded = false;

function listenWarnings() {
  const uid = window.auth.currentUser?.uid;
  if (!uid) return;

  const q = window.query(
    window.collection(window.db, "warnings"),
    window.where("targetUid", "==", uid)
  );

  warningsLoaded = false;

  unsubWarnings = window.onSnapshot(q, (snap) => {
    snap.docChanges().forEach(change => {
      if (change.type === "added" && warningsLoaded) {
        const data = change.doc.data();

        alert("⚠️ OPOZORILO:\n\n" + data.message);
        window.sendNotification("Opozorilo", data.message);
      }
    });

    warningsLoaded = true;
  });
}

// ─────────────────────────────────────────────
// EXPORT (DA DELA V APP.JS)
// ─────────────────────────────────────────────

window.handleWarnCommand = handleWarnCommand;
window.listenWarnings = listenWarnings;
