import { auth } from "./config.js";
import { getCoins, addCoins } from "./coins.js";

let storeOpen = false;

// ── ITEMS ─────────────────────────────────────────────

const STORE_ITEMS = [
  { id: "blue_theme", name: "🔵 Blue Theme", price: 20, type: "Theme" },
  { id: "dark_theme", name: "🌑 Dark Theme", price: 30, type: "Theme" },
  { id: "neon_theme", name: "⚡ Neon Theme", price: 60, type: "Theme" },

  { id: "gold_badge", name: "🏆 Gold Badge", price: 50, type: "Badge" },
  { id: "diamond_badge", name: "💎 Diamond Badge", price: 120, type: "Badge" },

  { id: "name_color_red", name: "🔴 Red Name", price: 25, type: "Cosmetic" },
  { id: "name_color_green", name: "🟢 Green Name", price: 25, type: "Cosmetic" },

  { id: "x2_coins_boost", name: "⚡ 2x Coins Boost", price: 80, type: "Boost" },
  { id: "xp_boost", name: "📈 XP Boost", price: 70, type: "Boost" }
];

// ── MODAL ─────────────────────────────────────────────

function ensureStoreModal() {
  if (document.getElementById("storeModal")) return;

  const modal = document.createElement("div");
  modal.id = "storeModal";

  modal.innerHTML = `
    <div class="store-backdrop"></div>

    <div class="store-box">

      <div class="store-header">
        <div>
          <h2>🛒 Store</h2>
          <p class="store-subtitle">Upgrade your profile</p>
        </div>
        <button id="closeStoreBtn" class="store-close">✖</button>
      </div>

      <div class="store-content">

        <div class="store-topbar">
          <div id="coinBalance" class="store-coins">💰 Loading...</div>
        </div>

        <div id="storeMsg" class="store-msg"></div>

        <div id="storeItems" class="store-grid"></div>

      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector(".store-backdrop").onclick = closeStore;
  modal.querySelector("#closeStoreBtn").onclick = closeStore;

  renderStoreItems();
}

// ── RENDER ITEMS ──────────────────────────────────────

function renderStoreItems() {
  const container = document.getElementById("storeItems");
  if (!container) return;

  container.innerHTML = STORE_ITEMS.map(item => `
    <div class="store-card" data-id="${item.id}" data-price="${item.price}">

      <div class="store-card-top">
        <div class="store-name">${item.name}</div>
        <div class="store-type">${item.type}</div>
      </div>

      <div class="store-card-bottom">
        <div class="store-price">💰 ${item.price}</div>
        <button class="buyBtn">Buy</button>
      </div>

    </div>
  `).join("");

  container.querySelectorAll(".store-card").forEach(card => {
    const btn = card.querySelector(".buyBtn");

    btn.onclick = () => {
      buyItem(card.dataset.id, Number(card.dataset.price));
    };
  });
}

// ── OPEN ──────────────────────────────────────────────

export async function openStore() {
  ensureStoreModal();

  const modal = document.getElementById("storeModal");
  modal.style.display = "flex";

  storeOpen = true;

  await refreshCoins();
  await updateBuyButtons();
}

// ── CLOSE ─────────────────────────────────────────────

export function closeStore() {
  const modal = document.getElementById("storeModal");
  if (modal) modal.style.display = "none";
  storeOpen = false;
}

// ── COINS ─────────────────────────────────────────────

async function refreshCoins() {
  const user = auth.currentUser;
  if (!user) return;

  const coins = await getCoins(user.uid);
  document.getElementById("coinBalance").textContent = `💰 ${coins} Coins`;
}

// ── BUTTON STATE ──────────────────────────────────────

async function updateBuyButtons() {
  const user = auth.currentUser;
  if (!user) return;

  const coins = await getCoins(user.uid);

  document.querySelectorAll(".store-card").forEach(card => {
    const price = Number(card.dataset.price);
    const btn = card.querySelector(".buyBtn");

    if (coins < price) {
      btn.disabled = true;
      btn.textContent = "Locked";
      card.classList.add("disabled");
    } else {
      btn.disabled = false;
      btn.textContent = "Buy";
      card.classList.remove("disabled");
    }
  });
}

// ── BUY LOGIC ────────────────────────────────────────

async function buyItem(itemId, price) {
  const user = auth.currentUser;
  const msg = document.getElementById("storeMsg");

  if (!user) {
    msg.textContent = "❌ Login first";
    return;
  }

  const coins = await getCoins(user.uid);

  if (coins < price) {
    msg.textContent = "❌ Not enough coins";
    return;
  }

  await addCoins(user.uid, -price);

  const item = STORE_ITEMS.find(i => i.id === itemId);

  msg.textContent = `✅ Bought: ${item?.name}`;

  msg.style.color = "#00ff88";

  await refreshCoins();
  await updateBuyButtons();

  setTimeout(() => {
    msg.textContent = "";
  }, 2000);
}

// ── INIT ─────────────────────────────────────────────

export function initStore() {
  document.addEventListener("click", (e) => {
    if (e.target && e.target.id === "storeBtn") {
      openStore();
    }
  });
}