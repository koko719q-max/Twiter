import { auth } from "./config.js";
import { getCoins, addCoins } from "./coins.js";

let lastActionTime = 0;
let currentGame = "slots";

// ─────────────────────────────
// OPEN
// ─────────────────────────────

export async function openGamble() {
  let page = document.getElementById("gambleOverlay");

  if (!page) {
    page = document.createElement("div");
    page.id = "gambleOverlay";
    document.body.appendChild(page);
  }

  page.style.display = "flex";
  page.classList.add("fade-in");

  renderGamble();
}

// ─────────────────────────────
// RENDER UI
// ─────────────────────────────

async function renderGamble() {
  const page = document.getElementById("gambleOverlay");
  const user = auth.currentUser;

  if (!user) {
    page.innerHTML = `<div class="gamble-card">Login first</div>`;
    return;
  }

  const coins = await getCoins(user.uid);

  page.innerHTML = `
    <div class="gamble-backdrop"></div>

    <div class="gamble-card pop-in">

      <div class="gamble-header">
        <h2>🎰 Gamble House</h2>
        <button id="closeGamble">✖</button>
      </div>

      <div class="gamble-coins">💰 <b id="gambleCoins">${coins}</b></div>

      <div class="game-tabs">
        <button data-game="slots" class="tab active">🎰 Slots</button>
        <button data-game="dice" class="tab">🎲 Dice</button>
        <button data-game="coinflip" class="tab">🪙 Coinflip</button>
        <button data-game="box" class="tab">📦 Box</button>
        <button data-game="blackjack" class="tab">🃏 Blackjack</button>
      </div>

      <div class="game-area">
        <div id="gameVisual" class="game-visual">❔</div>
        <button id="actionBtn" class="spin-btn">PLAY (10💰)</button>
        <p id="gambleMsg"></p>
      </div>

    </div>
  `;

  document.querySelector(".gamble-backdrop").onclick = closeGamble;
  document.getElementById("closeGamble").onclick = closeGamble;
  document.getElementById("actionBtn").onclick = playGame;

  document.querySelectorAll(".tab").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentGame = btn.dataset.game;
      updateVisual("❔");
    };
  });
}

// ─────────────────────────────
// GAME ENGINE
// ─────────────────────────────

async function playGame() {
  const user = auth.currentUser;
  if (!user) return;

  const now = Date.now();
  if (now - lastActionTime < 1000) return;
  lastActionTime = now;

  const msg = document.getElementById("gambleMsg");
  const visual = document.getElementById("gameVisual");
  const coinsText = document.getElementById("gambleCoins");
  const card = document.querySelector(".gamble-card");

  let coins = await getCoins(user.uid);
  const cost = 10;

  if (coins < cost) {
    msg.textContent = "❌ Not enough coins!";
    return;
  }

  await addCoins(user.uid, -cost);
  coins -= cost;

  msg.textContent = "Playing...";
  visual.classList.add("spin-animation");
  card.classList.add("shake");

  setTimeout(async () => {
    let result = "";
    let reward = 0;

    // ───── SLOTS ─────
    if (currentGame === "slots") {
      const items = ["💀", "🍒", "💎", "⭐", "🔥", "💰"];
      result = items[Math.floor(Math.random() * items.length)];

      reward = {
        "💎": 50,
        "⭐": 25,
        "🔥": 15,
        "💰": 10,
        "🍒": 5,
        "💀": 0
      }[result];
    }

    // ───── DICE ─────
    if (currentGame === "dice") {
      const roll = Math.floor(Math.random() * 6) + 1;
      result = "🎲 " + roll;
      reward = roll === 6 ? 40 : roll === 5 ? 20 : 0;
    }

    // ───── COINFLIP ─────
    if (currentGame === "coinflip") {
      const flip = Math.random() < 0.5 ? "HEADS" : "TAILS";
      result = flip === "HEADS" ? "🙂 HEADS" : "😈 TAILS";
      reward = flip === "HEADS" ? 15 : 0;
    }

    // ───── BOX ─────
    if (currentGame === "box") {
      const boxes = ["🎁", "💰", "⭐", "☠️", "💥"];
      result = boxes[Math.floor(Math.random() * boxes.length)];

      reward = {
        "🎁": 30,
        "💰": 25,
        "⭐": 20,
        "💥": 10,
        "☠️": 0
      }[result];
    }

    // ───── BLACKJACK ─────
    if (currentGame === "blackjack") {
      const player = drawCard() + drawCard();
      const dealer = drawCard() + drawCard();

      let playerScore = player;
      let dealerScore = dealer;

      while (playerScore < 16) playerScore += drawCard();
      while (dealerScore < 17) dealerScore += drawCard();

      result = `🃏 ${playerScore} vs ${dealerScore}`;

      if (playerScore > 21) {
        reward = 0;
      } else if (dealerScore > 21 || playerScore > dealerScore) {
        reward = 35;
      } else if (playerScore === dealerScore) {
        reward = 10;
      } else {
        reward = 0;
      }
    }

    // ───── END ANIMATION ─────
    visual.classList.remove("spin-animation");
    card.classList.remove("shake");

    updateVisual(result);

    if (reward > 0) {
      await addCoins(user.uid, reward);
      coins += reward;
      msg.textContent = `🎉 +${reward} coins!`;
      visual.classList.add("win-glow");
    } else {
      msg.textContent = "💀 No win!";
      visual.classList.add("lose-pop");
    }

    coinsText.textContent = coins;

    setTimeout(() => {
      visual.classList.remove("win-glow", "lose-pop");
    }, 800);

  }, 900);
}

// ─────────────────────────────
// CARD HELPER
// ─────────────────────────────

function drawCard() {
  const deck = [1,2,3,4,5,6,7,8,9,10,10,10,10];
  return deck[Math.floor(Math.random() * deck.length)];
}

// ─────────────────────────────
// VISUAL
// ─────────────────────────────

function updateVisual(text) {
  const visual = document.getElementById("gameVisual");
  if (visual) visual.textContent = text;
}

// ─────────────────────────────
// CLOSE
// ─────────────────────────────

function closeGamble() {
  const page = document.getElementById("gambleOverlay");

  if (page) {
    page.classList.add("fade-out");

    setTimeout(() => {
      page.style.display = "none";
      page.classList.remove("fade-in", "fade-out");
    }, 200);
  }
}
