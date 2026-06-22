import { db, auth } from "./config.js";
import { hideAllPages } from "./ui.js";
import { getCoins, addCoins } from "./coins.js";
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

const BADGE_DEFS = [
  { id: "first_tweet", type: "tweets", threshold: 1, icon: "📝", title: "Prvi tweet", desc: "Objavi svoj prvi tweet", reward: 5 },
  { id: "tweets_10", type: "tweets", threshold: 10, icon: "🗞️", title: "Pisatelj", desc: "Objavi 10 tweetov", reward: 15 },
  { id: "tweets_50", type: "tweets", threshold: 50, icon: "📚", title: "Kroničar", desc: "Objavi 50 tweetov", reward: 50 },
  { id: "tweets_100", type: "tweets", threshold: 100, icon: "🏛️", title: "Legenda feeda", desc: "Objavi 100 tweetov", reward: 120 },

  { id: "likes_10", type: "likes", threshold: 10, icon: "❤️", title: "Priljubljen", desc: "Zberi 10 likeov skupno", reward: 10 },
  { id: "likes_100", type: "likes", threshold: 100, icon: "💖", title: "100 likeov", desc: "Zberi 100 likeov skupno", reward: 60 },
  { id: "likes_500", type: "likes", threshold: 500, icon: "🔥", title: "Viralno", desc: "Zberi 500 likeov skupno", reward: 200 },

  { id: "comments_5", type: "comments", threshold: 5, icon: "💬", title: "Sogovornik", desc: "Napiši 5 komentarjev", reward: 10 },
  { id: "comments_25", type: "comments", threshold: 25, icon: "🗣️", title: "Razpravljavec", desc: "Napiši 25 komentarjev", reward: 40 },

  { id: "friends_1", type: "friends", threshold: 1, icon: "🤝", title: "Prvi prijatelj", desc: "Pridobi 1 prijatelja", reward: 20 },
  { id: "friends_10", type: "friends", threshold: 10, icon: "👥", title: "Družaben", desc: "Pridobi 10 prijateljev", reward: 100 },
];

const TYPE_LABELS = {
  tweets: { icon: "📝", label: "Tweeti" },
  likes: { icon: "❤️", label: "Likes" },
  comments: { icon: "💬", label: "Komentarji" },
  friends: { icon: "🤝", label: "Prijatelji" },
};

// ── Firestore ─────────────────────────────────────────

async function loadRewardDoc(uid) {
  const ref = doc(db, "userRewards", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    return { unlocked: new Set(), maxStats: {} };
  }

  const data = snap.data();

  return {
    unlocked: new Set(data.unlocked || []),
    maxStats: data.maxStats || {}
  };
}

async function saveRewardDoc(uid, unlocked, maxStats) {
  const ref = doc(db, "userRewards", uid);

  await setDoc(ref, {
    unlocked: Array.from(unlocked),
    maxStats
  }, { merge: true });
}

// ── Stats ─────────────────────────────────────────────

async function countUserStats(uid) {
  const stats = { tweets: 0, likes: 0, comments: 0, friends: 0 };

  const tweetsSnap = await getDocs(query(collection(db, "tweets"), where("uid", "==", uid)));
  tweetsSnap.forEach(d => {
    stats.tweets += 1;
    stats.likes += d.data().likes || 0;
  });

  const commentsSnap = await getDocs(query(collection(db, "comments"), where("uid", "==", uid)));
  stats.comments = commentsSnap.size;

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

  return stats;
}

// ── Badge logic + COINS REWARD ───────────────────────

async function resolveUnlockedBadges(uid) {
  const [currentStats, rewardData, coins] = await Promise.all([
    countUserStats(uid),
    loadRewardDoc(uid),
    getCoins(uid)
  ]);

  const { unlocked: storedUnlocked, maxStats: storedMax } = rewardData;

  const effectiveStats = {};
  for (const type of Object.keys(TYPE_LABELS)) {
    effectiveStats[type] = Math.max(
      currentStats[type] || 0,
      storedMax[type] || 0
    );
  }

  const newMaxStats = { ...storedMax };
  let changed = false;

  for (const type of Object.keys(TYPE_LABELS)) {
    if ((currentStats[type] || 0) > (storedMax[type] || 0)) {
      newMaxStats[type] = currentStats[type];
      changed = true;
    }
  }

  const unlocked = new Set(storedUnlocked);
  let newUnlock = false;

  let totalRewardCoins = 0;

  BADGE_DEFS.forEach(b => {
    if (!unlocked.has(b.id) && effectiveStats[b.type] >= b.threshold) {
      unlocked.add(b.id);
      newUnlock = true;
      totalRewardCoins += b.reward || 0;
    }
  });

  // 💰 AUTO GIVE COINS FOR NEW BADGES
  if (totalRewardCoins > 0) {
    await addCoins(uid, totalRewardCoins);
  }

  if (newUnlock || changed || totalRewardCoins > 0) {
    await saveRewardDoc(uid, unlocked, newMaxStats);
  }

  return {
    stats: effectiveStats,
    unlockedSet: unlocked,
    coins: coins + totalRewardCoins
  };
}

// ── Progress ──────────────────────────────────────────

function nextBadgeForType(type, effectiveCount, unlockedSet) {
  const badgesOfType = BADGE_DEFS
    .filter(b => b.type === type)
    .sort((a, b) => a.threshold - b.threshold);

  const next = badgesOfType.find(b => !unlockedSet.has(b.id));

  const prevThreshold = badgesOfType
    .filter(b => unlockedSet.has(b.id))
    .reduce((max, b) => Math.max(max, b.threshold), 0);

  return { next, prevThreshold, effectiveCount };
}

// ── UI (UNCHANGED) ────────────────────────────────────

function heroHtml(unlockedCount, totalCount, coins = 0) {
  const pct = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  return `
    <div class="reward-hero">
      <div class="reward-hero-title">
        <span class="reward-hero-icon">🎁</span>
        <span>Dosežki</span>
      </div>

      <div style="display:flex; gap:10px; align-items:center;">
        <p class="reward-hero-sub">Sledi svojemu napredku na platformi</p>

        <button id="storeBtn" class="reward-store-btn">
          🛒 Store
        </button>
      </div>

      <div class="reward-ring-row">
        <div class="reward-ring" style="--pct:${pct}">
          <span class="reward-ring-label">${pct}%</span>
        </div>

        <div class="reward-ring-text">
          <strong>${unlockedCount} / ${totalCount} odklenjenih</strong>
          <span>${unlockedCount === totalCount ? "Vsi badge-i pridobljeni 🎉" : "Nadaljuj z aktivnostjo"}</span>
        </div>
      </div>

      <div style="margin-top:10px;">
        💰 Coins: <b>${coins}</b>
      </div>
    </div>
  `;
}

function progressBarHtml(type, effectiveCount, unlockedSet) {
  const { label, icon } = TYPE_LABELS[type];

  const badgesOfType = BADGE_DEFS
    .filter(b => b.type === type)
    .sort((a, b) => a.threshold - b.threshold);

  const next = badgesOfType.find(b => !unlockedSet.has(b.id));

  const prevThreshold = badgesOfType
    .filter(b => unlockedSet.has(b.id))
    .reduce((max, b) => Math.max(max, b.threshold), 0);

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
        <div class="reward-progress-done">✓ dokončano</div>
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

      <div class="reward-progress-next">
        Naslednji: ${next.icon} ${next.title}
      </div>
    </div>
  `;
}

function badgeCardHtml(badge, unlocked) {
  return `
    <div class="reward-badge-card ${unlocked ? "unlocked" : "locked"}">
      <div class="reward-badge-icon">${badge.icon}</div>
      <div class="reward-badge-info">
        <div class="reward-badge-title">${badge.title}</div>
        <div class="reward-badge-desc">${badge.desc}</div>
      </div>
      <div class="reward-badge-status">
        ${unlocked ? "✓" : "🔒"}
      </div>
    </div>
  `;
}

// ── Render page ───────────────────────────────────────

async function renderRewardsPage() {
  const page = document.getElementById("rewardsPage");
  if (!page) return;

  page.innerHTML = "Loading...";

  const user = auth.currentUser;
  if (!user) {
    page.innerHTML = "Login first";
    return;
  }

  const { stats, unlockedSet, coins } = await resolveUnlockedBadges(user.uid);

  const unlockedCount = BADGE_DEFS.filter(b => unlockedSet.has(b.id)).length;

  page.innerHTML = `
    ${heroHtml(unlockedCount, BADGE_DEFS.length, coins)}

    <h3>Progress</h3>
    ${Object.keys(TYPE_LABELS)
      .map(t => progressBarHtml(t, stats[t] || 0, unlockedSet))
      .join("")}

    <h3>Badges</h3>
    ${BADGE_DEFS.map(b => badgeCardHtml(b, unlockedSet.has(b.id))).join("")}
  `;
}

// ── Open page ─────────────────────────────────────────

export function openRewards() {
  hideAllPages();
  document.getElementById("rewardsPage").style.display = "block";
  renderRewardsPage();
}