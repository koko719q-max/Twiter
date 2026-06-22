import { auth } from "./config.js";
import { getCoins, addCoins } from "./coins.js";

let storeOpen = false;

// ── ITEMS ───────────────────────────────
const STORE_ITEMS = [
  // themes
  { id: "blue_theme", name: "🔵 Blue Theme", price: 20, type: "theme" },
  { id: "dark_theme", name: "🌑 Dark Theme", price: 30, type: "theme" },
  { id: "neon_theme", name: "⚡ Neon Theme", price: 60, type: "theme" },

  // badges
  { id: "gold_badge", name: "🏆 Gold Badge", price: 50, type: "badge" },
  { id: "diamond_badge", name: "💎 Diamond Badge", price: 120, type: "badge" },

  // fun items
  { id: "name_color_red", name: "🔴 Red Name Color", price: 25, type: "cosmetic" },
  { id: "name_color_green", name: "🟢 Green Name Color", price: 25, type: "cosmetic" },

  // boosts
  { id: "x2_coins_boost", name: "⚡ 2x Coins Boost (1h)", price: 80, type: "boost" },
  { id: "xp_boost", name: "📈 XP Boost", price: 70, type: "boost" }
];

// ── Create modal ─────────────────────────────
function ensureStoreModal() {
  if (document.getElementById("storeModal")) return;

  const modal = document.createElement("div");
  modal.id = "storeModal";

  modal.innerHTML = `
    <div class="store-backdrop"></div>

    <div class="store-box">
      <div class="store-header">
        <h2>🛒 Store</h2>
        <button id="closeStoreBtn">✖</button>
      </div>

      <div class="store-content">

        <div id="coinBalance">Coins: ...</div>

        <hr>

        <div id="storeItems"></div>

        <p id="storeMsg"></p>

      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector(".store-backdrop").onclick = closeStore;
  modal.querySelector("#closeStoreBtn").onclick = closeStore;

  renderStoreItems();
}

// ── Render items ─────────────────────────────
function renderStoreItems() {
  const container = document.getElementById("storeItems");
  if (!container) return;

  container.innerHTML = STORE_ITEMS.map(item => `
    <button class="buyBtn" data-id="${item.id}" data-price="${item.price}">
      ${item.name} - ${item.price} coins
    </button>
  `).join("");

  container.querySelectorAll(".buyBtn").forEach(btn => {
    btn.onclick = () => buyItem(btn.dataset.id, Number(btn.dataset.price));
  });
}

// ── Open store ───────────────────────────────
export async function openStore() {
  ensureStoreModal();
  document.getElementById("storeModal").style.display = "flex";
  storeOpen = true;

  await refreshCoins();
}

// ── Close store ──────────────────────────────
export function closeStore() {
  const modal = document.getElementById("storeModal");
  if (modal) modal.style.display = "none";
  storeOpen = false;
}

// ── Coins display ─────────────────────────────
async function refreshCoins() {
  const user = auth.currentUser;
  if (!user) return;

  const coins = await getCoins(user.uid);
  document.getElementById("coinBalance").textContent = `Coins: ${coins}`;
}

// ── Buy logic ────────────────────────────────
async function buyItem(itemId, price) {
  const user = auth.currentUser;
  const msg = document.getElementById("storeMsg");

  if (!user) {
    msg.textContent = "Login first!";
    return;
  }

  const coins = await getCoins(user.uid);

  if (coins < price) {
    msg.textContent = "❌ Not enough coins!";
    return;
  }

  await addCoins(user.uid, -price);

  const item = STORE_ITEMS.find(i => i.id === itemId);

  msg.textContent = `✅ Purchased: ${item?.name || itemId}`;

  await refreshCoins();
}

// ── Init button listener ─────────────────────
export function initStore() {
  document.addEventListener("click", (e) => {
    if (e.target && e.target.id === "storeBtn") {
      openStore();
    }
  });
}