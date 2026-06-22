import { db, auth } from "./config.js";
import { avatarHtml, ownerBadgeHtml, getUserByUid } from "./users.js";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  increment,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export const expandedComments = new Set();

export async function toggleComments(tweetId) {
  const section = document.getElementById(`comments-${tweetId}`);
  if (!section) return;

  const isHidden = section.style.display === "none" || !section.style.display;
  if (isHidden) {
    expandedComments.add(tweetId);
    section.style.display = "block";
    await loadComments(tweetId);
  } else {
    expandedComments.delete(tweetId);
    section.style.display = "none";
  }
}

export async function loadComments(tweetId) {
  const listEl = document.getElementById(`commentsList-${tweetId}`);
  if (!listEl) return;

  try {
    const q = query(collection(db, "comments"), where("tweetId", "==", tweetId));
    const snap = await getDocs(q);

    const comments = snap.docs
      .map(d => d.data())
      .sort((a, b) => a.created - b.created);

    listEl.innerHTML = comments.map(c => {
      const u = getUserByUid(c.uid);
      return `
        <div class="comment-item">
          ${avatarHtml(u, c.user, "avatar-small")}
          <div>
            <b>${c.user}</b> ${ownerBadgeHtml(u)}
            <p>${c.text}</p>
          </div>
        </div>
      `;
    }).join("");
  } catch (err) {
    console.error(err);
    listEl.innerHTML = "<p>Napaka pri nalaganju komentarjev</p>";
  }
}

export async function addComment(tweetId) {
  const input = document.getElementById(`commentInput-${tweetId}`);
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  const user = auth.currentUser;
  if (!user) return;

  const dbUser = getUserByUid(user.uid);

  try {
    await addDoc(collection(db, "comments"), {
      tweetId,
      uid: user.uid,
      user: dbUser?.username || user.email,
      text,
      created: Date.now()
    });
    await updateDoc(doc(db, "tweets", tweetId), { comments: increment(1) });
    input.value = "";
    await loadComments(tweetId);
  } catch (err) {
    console.error(err);
    alert("Napaka pri dodajanju komentarja");
  }
}
