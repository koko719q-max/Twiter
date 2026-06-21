import { addDoc, collection } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let systemCounter = 0;
let systemRunning = false;

window.handleSystemCommand = async function (
  rawText,
  db,
  auth,
  getUserByUid
) {
  const user = auth.currentUser;
  if (!user) return;

  const dbUser = getUserByUid(user.uid);

  // samo OWNER
  if (dbUser?.role !== "owner") {
    alert("Ta ukaz lahko uporablja samo OWNER");
    return;
  }

  const args = rawText.split(" ");

  if (args.length < 4) {
    alert("Uporaba: /system besedilo stevilo interval");
    return;
  }

  const repeatCount = parseInt(args[args.length - 2]);
  const intervalSec = parseInt(args[args.length - 1]);
  const message = args.slice(1, -2).join(" ");

  if (!message || isNaN(repeatCount) || isNaN(intervalSec)) {
    alert("Napaka v ukazu");
    return;
  }

  systemCounter = 0;
  systemRunning = true;

  const timer = setInterval(async () => {
    try {
      await addDoc(collection(db, "tweets"), {
        uid: "system",
        user: "🤖 SYSTEM",
        text: message,
        imageUrl: null,
        likes: 0,
        comments: 0,
        retweets: 0,
        created: Date.now(),
        system: true
      });

      systemCounter++;

      if (systemCounter >= repeatCount) {
        systemRunning = false;
        clearInterval(timer);
      }
    } catch (err) {
      console.error(err);
      systemRunning = false;
      clearInterval(timer);
    }
  }, intervalSec * 1000);
};

window.handleTweetStatusCommand = function () {
  if (!systemRunning) {
    alert("Ni aktivnega /system pošiljanja.");
    return;
  }

  alert(`🤖 SYSTEM je poslal že ${systemCounter} sporočil.`);
};
