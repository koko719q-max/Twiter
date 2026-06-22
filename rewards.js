import { db, auth } from "./config.js";
import { hideAllPages } from "./ui.js";
import {
  collection,
  getDocs,
  query,
  where
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

function nextBadgeForType(type, currentCount) {
  const badgesOfType = BADGE_DEFS
    .filter(b => b.type === type)
    .sort((a, b) => a.threshold - b.threshold);

  const next = badgesOfType.find(b => currentCount < b.threshold);
  const prevThreshold = badgesOfType
    .filter(b => currentCount >= b.threshold)
    .reduce((max, b) => Math.max(max, b.threshold), 0);

  return { next, prevThreshold };
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

function progressBarHtml(type, count) {
  const { label, icon } = TYPE_LABELS[type];
  const { next, prevThreshold } = nextBadgeForType(type, count);

  if (!next) {
    return `
      <div class="reward-progress-block complete">
        <div class="reward-progress-head">
          <span><span class="reward-type-icon">${icon}</span>${label}</span>
          <span class="reward-progress-count">${count}</span>
        </div>
        <div class="reward-progress-track">
          <div class="reward-progress-fill" style="width:100%"></div>
        </div>
        <div class="reward-progress-done">✓ Vsi badge-i v tej kategoriji pridobljeni</div>
      </div>
    `;
  }

  const span = Math.max(next.threshold - prevThreshold, 1);
  const done = Math.min(Math.max(count - prevThreshold, 0), span);
  const pct = Math.round((done / span) * 100);

  return `
    <div class="reward-progress-block">
      <div class="reward-progress-head">
        <span><span class="reward-type-icon">${icon}</span>${label}</span>
        <span class="reward-progress-count">${count} / ${next.threshold}</span>
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

  let stats;
  try {
    stats = await countUserStats(user.uid);
  } catch (err) {
    console.error(err);
    page.innerHTML = `<div class="section-empty">Napaka pri nalaganju dosežkov.</div>`;
    return;
  }

  const unlockedCount = BADGE_DEFS.filter(b => stats[b.type] >= b.threshold).length;

  const progressHtml = Object.keys(TYPE_LABELS)
    .map(type => progressBarHtml(type, stats[type] || 0))
    .join("");

  const badgesHtml = BADGE_DEFS
    .map(b => badgeCardHtml(b, stats[b.type] >= b.threshold))
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
