import { addDoc, collection } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ─────────────────────────────
   SYSTEM STATE
──────────────────────────── */
let systemCounter = 0;
let systemRunning = false;
let systemTimer = null;

/* ─────────────────────────────
   PANEL TOGGLE
──────────────────────────── */
function toggleSystemPanel() {
  document.getElementById("systemPanel").classList.toggle("hidden");
}
window.toggleSystemPanel = toggleSystemPanel;

/* ─────────────────────────────
   CORE SYSTEM COMMAND
──────────────────────────── */
window.handleSystemCommand = async function (
  rawText,
  db,
  auth,
  getUserByUid
) {
  const user = auth.currentUser;
  if (!user) return;

  const dbUser = getUserByUid(user.uid);

  if (dbUser?.role !== "owner") {
    alert("Ta ukaz lahko uporablja samo OWNER");
    return;
  }

  const args = rawText.split(" ");
  const cmd = args[1];

  /* HELP */
  if (cmd === "help") {
    alert(
`🤖 SYSTEM KOMANDE:

/system send <msg> <count> <interval>
/system alert <msg> <count> <interval>
/system stop
/system status
/system help`
    );
    return;
  }

  /* STATUS */
  if (cmd === "status") {
    alert(`🤖 SYSTEM poslanih: ${systemCounter}`);
    return;
  }

  /* STOP */
  if (cmd === "stop") {
    systemRunning = false;
    if (systemTimer) clearInterval(systemTimer);
    alert("🛑 SYSTEM ustavljen");
    return;
  }

  /* SEND / ALERT */
  if (cmd === "send" || cmd === "alert") {
    if (args.length < 5) {
      alert("Uporaba: /system send|alert msg count interval");
      return;
    }

    const mode = cmd;
    const count = parseInt(args[args.length - 2]);
    const interval = parseInt(args[args.length - 1]);
    const message = args.slice(2, -2).join(" ");

    systemCounter = 0;
    systemRunning = true;

    systemTimer = setInterval(async () => {
      try {
        await addDoc(collection(db, "tweets"), {
          uid: "system",
          user: "🤖 SYSTEM",
          rank: "Developer",
          text: message,
          imageUrl: null,
          likes: 0,
          comments: 0,
          retweets: 0,
          created: Date.now(),
          system: true,
          mode
        });

        systemCounter++;

        /* ALERT UI */
        if (mode === "alert") {
          const chatBox = document.getElementById("chatBox");
          if (chatBox) {
            const div = document.createElement("div");
            div.className = "system-alert";
            div.innerText = `🚨 SYSTEM ALERT: ${message}`;
            chatBox.appendChild(div);
          }
        }

        if (systemCounter >= count) {
          systemRunning = false;
          clearInterval(systemTimer);
        }
      } catch (err) {
        console.error(err);
        systemRunning = false;
        clearInterval(systemTimer);
      }
    }, interval * 1000);
  }
};

/* ─────────────────────────────
   GUI ACTIONS
──────────────────────────── */
function getValues() {
  return {
    message: document.getElementById("sysMessage").value,
    count: parseInt(document.getElementById("sysCount").value),
    interval: parseInt(document.getElementById("sysInterval").value)
  };
}

window.startSystemSend = function () {
  const { message, count, interval } = getValues();
  if (!message || !count || !interval) return alert("Manjkajo podatki");

  window.handleSystemCommand(`/system send ${message} ${count} ${interval}`);
};

window.startSystemAlert = function () {
  const { message, count, interval } = getValues();
  if (!message || !count || !interval) return alert("Manjkajo podatki");

  window.handleSystemCommand(`/system alert ${message} ${count} ${interval}`);
};

window.stopSystem = function () {
  window.handleSystemCommand(`/system stop`);
};

window.systemStatus = function () {
  window.handleSystemCommand(`/system status`);
};

/* optional */
window.handleTweetStatusCommand = function () {
  if (!systemRunning) {
    alert("Ni aktivnega /system.");
    return;
  }
  alert(`🤖 SYSTEM poslal: ${systemCounter}`);
};