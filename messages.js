import { db, auth } from "./config.js";
import { avatarHtml, getUserByUid } from "./users.js";
import { hideAllPages } from "./ui.js";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
  limit
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let messagesCache = [];
let currentChatUid = null;
let messageListener = null;

// ── Load messages ─────────────────────────────────────────

export async function loadMessages(otherUid) {
  const user = auth.currentUser;
  if (!user) return;

  currentChatUid = otherUid;

  const container = document.getElementById("messagesContainer");

  try {
    const q = query(
      collection(db, "messages"),
      where("conversation", "==", createConversationId(user.uid, otherUid)),
      orderBy("timestamp", "asc"),
      limit(100)
    );

    if (messageListener) {
      messageListener();
      messageListener = null;
    }

    messageListener = onSnapshot(q, (snapshot) => {
      messagesCache = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      renderMessages();
      setTimeout(() => {
        const mc = document.getElementById("messagesContainer");
        if (mc) mc.scrollTop = mc.scrollHeight;
      }, 100);
    }, (error) => {
      console.error("onSnapshot napaka:", error);
      if (container) {
        container.innerHTML = `<p class="section-empty">Napaka pri nalaganju: ${error.message}</p>`;
      }
    });

  } catch (err) {
    console.error("Napaka pri nalaganju sporočil:", err);
    if (container) {
      container.innerHTML = `<p class="section-empty">Napaka: ${err.message}</p>`;
    }
  }
}

// ── Helper functions ──────────────────────────────────────

function createConversationId(uid1, uid2) {
  return [uid1, uid2].sort().join("_");
}

function formatTime(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ── Render messages ───────────────────────────────────────

export function renderMessages() {
  const container = document.getElementById("messagesContainer");
  const user = auth.currentUser;
  if (!container || !user) return;

  if (messagesCache.length === 0) {
    container.innerHTML = `<p class="section-empty">Začni se pogovarjati!</p>`;
    return;
  }

  container.innerHTML = messagesCache.map(msg => {
    const isOwn = msg.from === user.uid;
    const sender = getUserByUid(msg.from);
    const senderName = sender?.username || "Neznan";

    return `
      <div class="message-item ${isOwn ? 'own-message' : 'other-message'}">
        <div class="message-header">
          <span class="message-sender">${escapeHtml(senderName)}</span>
          <span class="message-time">${formatTime(msg.timestamp)}</span>
        </div>
        <div class="message-content">${escapeHtml(msg.text)}</div>
        ${isOwn ? `<button class="btn-delete-msg" onclick="deleteMessage('${msg.id}')">Izbriši</button>` : ''}
      </div>
    `;
  }).join("");
}

// ── Send message ──────────────────────────────────────────

export async function sendMessage() {
  const user = auth.currentUser;
  if (!user || !currentChatUid) return;

  const input = document.getElementById("messageInput");
  const text = (input?.value || "").trim();

  if (!text) return;

  try {
    await addDoc(collection(db, "messages"), {
      conversation: createConversationId(user.uid, currentChatUid),
      from: user.uid,
      to: currentChatUid,
      text: text,
      timestamp: Date.now()
    });

    input.value = "";
    input.focus();
  } catch (err) {
    console.error("Napaka pri pošiljanju sporočila:", err);
    alert("Napaka pri pošiljanju sporočila: " + err.message);
  }
}

// ── Delete message ────────────────────────────────────────

export async function deleteMessage(messageId) {
  const user = auth.currentUser;
  if (!user) return;

  if (!confirm("Briši sporočilo?")) return;

  try {
    await deleteDoc(doc(db, "messages", messageId));
  } catch (err) {
    console.error("Napaka pri brisanju sporočila:", err);
    alert("Napaka pri brisanju sporočila: " + err.message);
  }
}

// ── Load conversations list ───────────────────────────────

export async function loadConversations() {
  const user = auth.currentUser;
  if (!user) return;

  const container = document.getElementById("conversationsList");
  if (container) container.innerHTML = `<p class="section-empty">Nalagam pogovore...</p>`;

  try {
    const [sentSnap, receivedSnap] = await Promise.all([
      getDocs(query(collection(db, "messages"), where("from", "==", user.uid))),
      getDocs(query(collection(db, "messages"), where("to", "==", user.uid)))
    ]);

    const conversations = new Map();

    sentSnap.forEach(d => {
      const data = d.data();
      const existing = conversations.get(data.conversation);
      if (!existing || data.timestamp > existing.timestamp) {
        conversations.set(data.conversation, data);
      }
    });

    receivedSnap.forEach(d => {
      const data = d.data();
      const existing = conversations.get(data.conversation);
      if (!existing || data.timestamp > existing.timestamp) {
        conversations.set(data.conversation, data);
      }
    });

    const sorted = Array.from(conversations.values())
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    renderConversations(sorted);
  } catch (err) {
    console.error("Napaka pri nalaganju pogovorov:", err);
    if (container) {
      container.innerHTML = `<p class="section-empty">Napaka: ${err.message}</p>`;
    }
  }
}

export function renderConversations(conversations) {
  const container = document.getElementById("conversationsList");
  if (!container) return;

  const user = auth.currentUser;
  if (!user) return;

  const uniqueUsers = new Set();
  const grouped = [];

  conversations.forEach(conv => {
    const otherUid = conv.from === user.uid ? conv.to : conv.from;
    if (!uniqueUsers.has(otherUid)) {
      uniqueUsers.add(otherUid);
      grouped.push({ otherUid, lastMessage: conv, timestamp: conv.timestamp });
    }
  });

  if (grouped.length === 0) {
    container.innerHTML = `<p class="section-empty">Še ni sporočil</p>`;
    return;
  }

  container.innerHTML = grouped.map(item => {
    const otherUser = getUserByUid(item.otherUid);
    const msgText = item.lastMessage.text || "";
    const preview = msgText.substring(0, 50) + (msgText.length > 50 ? "..." : "");

    return `
      <div class="conversation-item" onclick="openChat('${item.otherUid}')">
        ${avatarHtml(otherUser, otherUser?.username || "?", "avatar-small")}
        <div class="conversation-info">
          <b>${escapeHtml(otherUser?.username || "Neznan")}</b>
          <p class="conversation-preview">${escapeHtml(preview)}</p>
        </div>
        <span class="conversation-time">${formatTime(item.timestamp)}</span>
      </div>
    `;
  }).join("");
}

// ── Open chat ─────────────────────────────────────────────

export async function openChat(otherUid) {
  if (!auth.currentUser) return;

  const otherUser = getUserByUid(otherUid);
  if (!otherUser) {
    alert("Uporabnik ni najden");
    return;
  }

  hideAllPages();

  const chatPage = document.getElementById("chatPage");
  if (!chatPage) {
    alert("Chat stran ni najdena");
    return;
  }

  chatPage.style.display = "flex";
  chatPage.style.flexDirection = "column";

  const chatHeader = document.getElementById("chatHeader");
  if (chatHeader) chatHeader.innerHTML = `<b>${escapeHtml(otherUser.username)}</b>`;

  const messagesContainer = document.getElementById("messagesContainer");
  if (messagesContainer) messagesContainer.innerHTML = "<p>Nalagam...</p>";

  const messageInput = document.getElementById("messageInput");
  if (messageInput) {
    messageInput.value = "";
    // Odstrani stare listenerje
    messageInput.onkeydown = null;
    messageInput.onkeypress = null;
    // Dodaj samo enega
    messageInput.onkeydown = (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    };
  }

  await loadMessages(otherUid);
}

// ── Close chat ────────────────────────────────────────────

export function closeChat() {
  if (messageListener) {
    messageListener();
    messageListener = null;
  }
  currentChatUid = null;
  messagesCache = [];

  const messageInput = document.getElementById("messageInput");
  if (messageInput) {
    messageInput.onkeydown = null;
    messageInput.onkeypress = null;
  }

  const chatPage = document.getElementById("chatPage");
  if (chatPage) chatPage.style.display = "none";
}

// ── Open messages page ────────────────────────────────────

export async function openMessages() {
  hideAllPages();
  const messagesPage = document.getElementById("messagesPage");
  if (messagesPage) messagesPage.style.display = "block";
  await loadConversations();
}

// ── Back to feed from chat ────────────────────────────────

export function backToFeedFromChat() {
  closeChat();
  const messagesPage = document.getElementById("messagesPage");
  if (messagesPage) messagesPage.style.display = "none";
}