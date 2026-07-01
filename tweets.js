import { db, auth } from "./config.js";
import { avatarHtml, ownerBadgeHtml, getUserByUid, usersCache } from "./users.js";
import { expandedComments, loadComments, toggleComments, addComment } from "./comments.js";
import { sendNotification, showToast } from "./notifications.js";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  increment,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let unsub = null;

// ── Lightbox ──────────────────────────────────────────

export function openLightbox(tweetId) {
  const img = document.querySelector(`img[onclick="openLightbox('${tweetId}')"]`);
  if (!img) return;
  const src = img.dataset.src || img.src;
  const lb = document.getElementById("lightbox");
  const lbImg = document.getElementById("lightboxImg");
  if (!lb || !lbImg) return;
  lbImg.src = src;
  lb.classList.add("active");
}

export function closeLightbox() {
  const lb = document.getElementById("lightbox");
  const lbImg = document.getElementById("lightboxImg");
  if (lb) lb.classList.remove("active");
  if (lbImg) lbImg.src = "";
}

document.getElementById("lightbox")?.addEventListener("click", function (e) {
  if (e.target === this) closeLightbox();
});

// ── Image preview (tweet) ─────────────────────────────

export let selectedTweetImageFile = null;

function resizeTweetImage(file, maxW = 1080, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxW) { h = Math.round(h * (maxW / w)); w = maxW; }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export function previewImage(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 8 * 1024 * 1024) {
    alert("Slika je prevelika. Največja dovoljena velikost je 8 MB.");
    event.target.value = "";
    return;
  }
  selectedTweetImageFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById("imagePreview").src = e.target.result;
    document.getElementById("imagePreviewWrap").style.display = "block";
  };
  reader.readAsDataURL(file);
}

export function removeImage() {
  selectedTweetImageFile = null;
  document.getElementById("imagePreview").src = "";
  document.getElementById("imagePreviewWrap").style.display = "none";
  document.getElementById("imageInput").value = "";
}

// ── Feed listener ─────────────────────────────────────

export function listenTweets() {
  if (unsub) unsub();
  const tweetsEl = document.getElementById("tweets");
  let tweetsLoaded = false;

  unsub = onSnapshot(collection(db, "tweets"), (snap) => {
    tweetsEl.innerHTML = "";

    snap.docs
      .slice()
      .sort((a, b) => (b.data().created || 0) - (a.data().created || 0))
      .forEach(d => {
        const t = d.data();
        const u = getUserByUid(t.uid);
        const div = document.createElement("div");
        div.className = "tweet";

        const imageHtml = t.imageUrl
          ? `<img
               class="tweet-image"
               src="${t.imageUrl}"
               alt="Tweet slika"
               onclick="openLightbox('${d.id}')"
               data-src="${t.imageUrl}"
             >`
          : "";

        div.innerHTML = `
          ${avatarHtml(u, t.user, "avatar-small")}
          <div class="tweet-body">
            <b class="tweet-user" onclick="openProfile('${t.uid}')">${t.user}</b> ${ownerBadgeHtml(u)}
            <p>${t.text}</p>
            ${imageHtml}
            <div class="like-row">
              ❤️ ${t.likes} 🔁 ${t.retweets}
            </div>
            <div class="comment-toggle" onclick="toggleComments('${d.id}')">💬 ${t.comments} komentarjev</div>
            <div id="comments-${d.id}" class="comments-section" style="display:none;">
              <div id="commentsList-${d.id}"></div>
              <div class="comment-input-row">
                <input id="commentInput-${d.id}" placeholder="Dodaj komentar...">
                <button onclick="addComment('${d.id}')">Objavi</button>
              </div>
            </div>
          </div>
        `;

        tweetsEl.appendChild(div);

        if (expandedComments.has(d.id)) {
          const section = document.getElementById(`comments-${d.id}`);
          if (section) section.style.display = "block";
          loadComments(d.id);
        }
      });

    if (tweetsLoaded) {
      snap.docChanges().forEach(change => {
        if (change.type === "added") {
          const t = change.doc.data();
          if (t.uid !== auth.currentUser?.uid) {
            sendNotification(`📝 ${t.user}`, t.text.slice(0, 80));
          }
        }
      });
    }

    tweetsLoaded = true;
  });
}

export function getUnsub() { return unsub; }
export function setUnsub(fn) { unsub = fn; }

// ── Like ──────────────────────────────────────────────

export async function like(id) {
  try {
    await updateDoc(doc(db, "tweets", id), { likes: increment(1) });
  } catch (err) {
    console.error(err);
  }
}

// ── Add tweet ─────────────────────────────────────────

export async function addTweet() {
  const tweetInput = document.getElementById("tweetInput");
  const text = tweetInput.value.trim();
  if (!text && !selectedTweetImageFile) return;

  // Commands — delegated to commands.js via window
  if (text.toLowerCase().startsWith("/warn")) {
    await window.handleWarnCommand(text);
    tweetInput.value = "";
    return;
  }
  if (text.toLowerCase() === "/tweet") {
    window.handleTweetStatusCommand();
    tweetInput.value = "";
    return;
  }
  if (text.toLowerCase() === "/clear") {
    await clearAllTweets();
    tweetInput.value = "";
    return;
  }
  if (text.toLowerCase().startsWith("/system")) {
    await window.handleSystemCommand(text, db, auth, getUserByUid);
    tweetInput.value = "";
    return;
  }
  if (text.toLowerCase().startsWith("/alert")) {
    await window.handleAlertCommand(text);
    tweetInput.value = "";
    return;
  }
  if (text.toLowerCase() === "/backup") {
    await window.handleBackupCommand();
    tweetInput.value = "";
    return;
  }

  const user = auth.currentUser;
  if (!user) return;
  const dbUser = usersCache.find(u => u.uid === user.uid);

  try {
    showToast("⏳ Objavljam...");
    let finalText = text;
    if (dbUser?.role === "owner" && window.applyColors && text) {
      finalText = window.applyColors(text);
    }
    let imageUrl = null;
    if (selectedTweetImageFile) {
      imageUrl = await resizeTweetImage(selectedTweetImageFile);
    }
    await addDoc(collection(db, "tweets"), {
      uid: user.uid,
      user: dbUser?.username || user.email,
      text: finalText,
      imageUrl,
      likes: 0,
      comments: 0,
      retweets: 0,
      created: Date.now()
    });
    tweetInput.value = "";
    removeImage();
    showToast("✅ Objavljeno!");
  } catch (err) {
    console.error(err);
    if (err.message?.includes("400") || err.message?.includes("too large")) {
      alert("Slika je prevelika za shranjevanje. Poskusi z manjšo sliko.");
    } else {
      alert("Napaka pri objavi tweeta");
    }
  }
}

// ── Clear all tweets ──────────────────────────────────

export async function clearAllTweets() {
  const confirmed = confirm(
    "Si prepričan? To bo trajno izbrisalo VSE tweete in komentarje (za vse uporabnike) iz Firebase."
  );
  if (!confirmed) return;
  try {
    const tweetsSnap   = await getDocs(collection(db, "tweets"));
    const commentsSnap = await getDocs(collection(db, "comments"));
    const deletions = [];
    tweetsSnap.forEach(d => deletions.push(deleteDoc(doc(db, "tweets", d.id))));
    commentsSnap.forEach(d => deletions.push(deleteDoc(doc(db, "comments", d.id))));
    await Promise.all(deletions);
    expandedComments.clear();
    alert("Vsi tweeti in komentarji so izbrisani");
  } catch (err) {
    console.error(err);
    alert("Napaka pri brisanju tweetov");
  }
}
