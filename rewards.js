import { db, auth } from "./config.js";
import { hideAllPages } from "./ui.js";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Badge definicije ──────────────────────────────────
// type: "tweets" | "likes" | "comments" | "friends"
// threshold: koliko je potrebno za pridobitev badga

const BADGE_DEFS = [
  { id: "first_tweet",   type: "tweets",   threshold: 1,    icon: "📝", title: "Prvi tweet",      desc: "Objavi svoj prvi tweet" },
  { id: "tweets_10",     type: "tweets",   threshold: 10,   icon: "🗞️", title: "Pisatelj",         desc: "Objavi 10 tweetov" },
  { id: "tweets_50",     type: "tweets",   threshold: 50,   icon: "📚", title: "Kroničar",         desc: "Objavi 50 tweetov" },
  { id: "tweets_100",    type: "tweets",   threshold: 100,  icon: "🏛️", title: "Legenda feeda",    desc: "Objavi 100 tweetov" },

  { id: "likes_10",      type: "likes",    threshold: 10,   icon: "❤️", title: "Priljubljen",      desc: "Zberi 10 likeov skupno" },
  { id: "likes_100",     type: "likes",    threshold: 100,  icon: "💖", title: "100 likeov",       desc: "Zberi 100 likeov skupno" },
  { id: "likes_500",     type: "likes",    threshold: 500,  icon: "🔥", title: "Viralno",          desc: "Zberi 500 likeov skupno" },

  { id: "comments_5",    type: "comments", threshold: 5,    icon: "💬", title: "Sogovornik",       desc: "Napiši 5 komentarjev" },
  { id: "comments_25",   type: "comments", threshold: 25,   icon: "🗣️", title: "Razpravljavec",    desc: "Napiši 25 komentarjev" },

  { id: "friends_1",     type: "friends",  threshold: 1,    icon: "🤝", title: "Prvi prijatelj",   desc: "Pridobi 1 prijatelja" },
  { id: "friends_10",    type: "friends",  threshold: 10,   icon: "👥", title: "Družaben",         desc: "Pridobi 10 prijateljev" },
];

const TYPE_LABELS = {
  tweets:   { icon: "📝", label: "Tweeti" },
  likes:    { icon: "❤️", label: "Likes" },
  comments: { icon: "💬", label: "Komentarji" },
  friends:  { icon: "🤝", label: "Prijatelji" },
};

// ── Trajno shranjeni dosežki (Firestore) ──────────────
// Zbirka "userRewards", dokument id = uid uporabnika
// { unlocked: ["first_tweet", "tweets_10", ...] }

async function getUnlockedFromStorage(uid) {
  try {
    const ref = doc(db, "userRewards", uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return new Set(snap.data().unlocked || []);
    }
  } catch (err) {
    console.error("Napaka pri branju shranjenih dosežkov:", err);
  }
  return new Set();
}

async function saveUnlockedToStorage(uid, unlockedSet) {
  try {
    const ref = doc(db, "userRewards", uid);
    await setDoc(ref, { unlocked: Array.from(unlockedSet) }, { merge: true });
  } catch (err) {
    console.error("Napaka pri shranjevanju dosežkov:", err);
  }
}

// ── Pomožne funkcije za štetje ────────────────────────

async function countUserStats(uid) {
  const stats = { tweets: 0, likes: 0, comments: 0, friends: 0 };

  // Tweeti uporabnika + skupno število likeov na njih
  const tweetsSnap = await getDocs(query(collection(db, "tweets"), where("uid", "==", uid)));
  tweetsSnap.forEach(d => {
    stats.tweets += 1;
    stats.likes += (d.data().likes || 0);
  });

  // Komentarji uporabnika
  try {
    const commentsSnap = await getDocs(query(collection(db, "comments"), where("uid", "==", uid)));
    stats.comments = commentsSnap.size;
  } catch (err) {
    console.error("Napaka pri branju komentarjev za dosežke:", err);
  }

  // Prijatelji (sprejeti) — preverimo obe smeri povezave
  try {
    const sentSnap = await getDocs(query(
      collection(db, "friends"),
      where("from", "==", uid),
      where("status", "==", "accepted")
    ));
    const receivedSnap = await getDocs(query(
      collection(db, "friends"),
      where("to", "==", uid),
      where("status", "==", "accepted")
    ));
    stats.friends = sentSnap.size + receivedSnap.size;
  } catch (err) {
    console.error("Napaka pri branju prijateljev za dosežke:", err);
  }

  return stats;
}

// ── Združi trenutne statistike z trajno shranjenimi badge-i ──

async function resolveUnlockedBadges(uid) {
  const [stats, storedUnlocked] = await Promise.all([
    countUserStats(uid),
    getUnlockedFromStorage(uid)
  ]);

  const unlockedNow = new Set(storedUnlocked);
  let hasNewUnlock = false;

  BADGE_DEFS.forEach(b => {
    if (!unlockedNow.has(b.id) && stats[b.type] >= b.threshold) {
      unlockedNow.add(b.id);
      hasNewUnlock = true;
    }
  });

  if (hasNewUnlock) {
    await saveUnlockedToStorage(uid, unlockedNow);
  }

  return { stats, unlockedSet: unlockedNow };
}

function nextBadgeForType(type, currentCount, unlockedSet) {
  const badgesOfType = BADGE_DEFS
    .filter(b => b.type === type)
    .sort((a, b) => a.threshold - b.threshold);

  // "Trenutni efektivni count" za prikaz progresa upošteva tudi trajno
  // odklenjene badge-e, tudi če je trenutno število nižje (npr. po brisanju).
  const highestUnlockedThreshold = badgesOfType
    .filter(b => unlockedSet.has(b.id))
    .reduce((max, b) => Math.max(max, b.threshold), 0);

  const effectiveCount = Math.max(currentCount, highestUnlockedThreshold);

  const next = badgesOfType.find(b => !unlockedSet.has(b.id));
  const prevThreshold = badgesOfType
    .filter(b => unlockedSet.has(b.id))
    .reduce((max, b) => Math.max(max, b.threshold), 0);

  return { next, prevThreshold, effectiveCount };
}

// ── Render: hero z krožnim napredkom ──────────────────

function heroHtml(unlockedCount, totalCount) {
  const pct = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  return `
    <div class="reward-hero">
      <div class="reward-hero-title">
        <span class="reward-hero-icon">🎁</span>
        <span>Dosežki</span>
      </div>
      <p class="reward-hero-sub">Sledi svojemu napredku na platformi</p>

      <div class="reward-ring-row">
        <div class="reward-ring" style="--pct:${pct}">
          <span class="reward-ring-label">${pct}%</span>
        </div>
        <div class="reward-ring-text">
          <strong>${unlockedCount} / ${totalCount} odklenjenih</strong>
          <span>${unlockedCount === totalCount ? "Vsi badge-i pridobljeni 🎉" : "Nadaljuj z aktivnostjo, da odklepaš več"}</span>
        </div>
      </div>
    </div>
  `;
}

// ── Render: progress bloki ─────────────────────────────

function progressBarHtml(type, count, unlockedSet) {
  const { label, icon } = TYPE_LABELS[type];
  const { next, prevThreshold, effectiveCount } = nextBadgeForType(type, count, unlockedSet);

  if (!next) {
    return `
      <div class="reward-progress-block complete">
        <div class="reward-progress-head">
          <span><span class="reward-type-icon">${icon}</span>${label}</span>
          <span class="reward-progress-count">${effectiveCount}</span>
        </div>
        <div class="reward-progress-track">
          <div class="reward-progress-fill" style="width:100%"></div>
        </div>
        <div class="reward-progress-done">✓ Vsi badge-i v tej kategoriji pridobljeni</div>
      </div>
    `;
  }

  const span = Math.max(next.threshold - prevThreshold, 1);
  const done = Math.min(Math.max(effectiveCount - prevThreshold, 0), span);
  const pct = Math.round((done / span) * 100);

  return `
    <div class="reward-progress-block">
      <div class="reward-progress-head">
        <span><span class="reward-type-icon">${icon}</span>${label}</span>
        <span class="reward-progress-count">${effectiveCount} / ${next.threshold}</span>
      </div>
      <div class="reward-progress-track">
        <div class="reward-progress-fill" style="width:${pct}%"></div>
      </div>
      <div class="reward-progress-next">Naslednji: ${next.icon} ${next.title}</div>
    </div>
  `;
}

// ── Render: badge kartice ──────────────────────────────

function badgeCardHtml(badge, unlocked) {
  return `
    <div class="reward-badge-card ${unlocked ? "unlocked" : "locked"}">
      <div class="reward-badge-icon">${badge.icon}</div>
      <div class="reward-badge-info">
        <div class="reward-badge-title">${badge.title}</div>
        <div class="reward-badge-desc">${badge.desc}</div>
      </div>
      <div class="reward-badge-status">
        ${unlocked ? '<div class="reward-badge-check">✓</div>' : '<div class="reward-badge-lock">🔒</div>'}
      </div>
    </div>
  `;
}

// ── Glavni render ──────────────────────────────────────

async function renderRewardsPage() {
  const page = document.getElementById("rewardsPage");
  if (!page) return;

  page.innerHTML = `<div class="reward-loading">Nalagam dosežke...</div>`;

  const user = auth.currentUser;
  if (!user) {
    page.innerHTML = `<div class="section-empty">Prijavi se, da vidiš svoje dosežke.</div>`;
    return;
  }

  let stats, unlockedSet;
  try {
    const result = await resolveUnlockedBadges(user.uid);
    stats = result.stats;
    unlockedSet = result.unlockedSet;
  } catch (err) {
    console.error(err);
    page.innerHTML = `<div class="section-empty">Napaka pri nalaganju dosežkov.</div>`;
    return;
  }

  const unlockedCount = BADGE_DEFS.filter(b => unlockedSet.has(b.id)).length;

  const progressHtml = Object.keys(TYPE_LABELS)
    .map(type => progressBarHtml(type, stats[type] || 0, unlockedSet))
    .join("");

  const badgesHtml = BADGE_DEFS
    .map(b => badgeCardHtml(b, unlockedSet.has(b.id)))
    .join("");

  page.innerHTML = `
    ${heroHtml(unlockedCount, BADGE_DEFS.length)}

    <h3>Napredek</h3>
    ${progressHtml}

    <h3>Vsi badge-i</h3>
    <div class="reward-badge-list">
      ${badgesHtml}
    </div>
  `;
}

// ── Odpiranje strani ──────────────────────────────────

export function openRewards() {
  hideAllPages();
  const page = document.getElementById("rewardsPage");
  if (page) page.style.display = "block";
  renderRewardsPage();
}
