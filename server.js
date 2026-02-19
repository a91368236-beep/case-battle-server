const express = require("express");
const app = express();

const players = {};
const feed = [];

const ITEMS = [
  { weapon:"AK-47", skin:"Redline", rarity:"classified", chance:5, price:120 },
  { weapon:"AWP", skin:"Asiimov", rarity:"covert", chance:2, price:350 },
  { weapon:"M4A1-S", skin:"Decimator", rarity:"restricted", chance:15, price:60 },
  { weapon:"Glock-18", skin:"Water Elemental", rarity:"mil", chance:30, price:25 },
  { weapon:"P250", skin:"Sand Dune", rarity:"common", chance:48, price:3 }
];

function getPlayer(id) {
  if (!players[id]) {
    players[id] = {
      balance: 100,
      spent: 0,
      opened: 0,
      inventory: {}
    };
  }
  return players[id];
}

function rollItem() {
  let r = Math.random() * 100;
  let sum = 0;
  for (let i of ITEMS) {
    sum += i.chance;
    if (r < sum) return i;
  }
  return ITEMS[ITEMS.length - 1];
}

app.use(express.json());
app.use(express.static("public")); // ← САЙТ

// ===== STATS =====
app.get("/stats", (req, res) => {
  const { id } = req.query;
  if (!id) return res.json({ error: "no_id" });

  const player = getPlayer(id);
  res.json({
    ...player,
    online: Object.keys(players).length
  });
});

// ===== OPEN CASES =====
app.get("/open", (req, res) => {
  const { id, count = 1 } = req.query;
  if (!id) return res.json({ error: "no_id" });

  const c = Math.min(15, Math.max(1, Number(count)));
  const cost = c * 10;

  const player = getPlayer(id);
  if (player.balance < cost) {
    return res.json({ error: "no_money" });
  }

  const drops = [];
  for (let i = 0; i < c; i++) {
    const item = rollItem();
    drops.push(item);

    const key = item.weapon + " | " + item.skin;
    player.inventory[key] ??= { ...item, qty: 0 };
    player.inventory[key].qty++;

    feed.unshift({
      player: id.slice(0, 4),
      item: key,
      rarity: item.rarity
    });
  }

  feed.length = 25;
  player.balance -= cost;
  player.spent += cost;
  player.opened += c;

  res.json({ drops });
});

// ===== SELL =====
app.get("/sell", (req, res) => {
  const { id } = req.query;
  if (!id) return res.json({ error: "no_id" });

  const player = getPlayer(id);
  let profit = 0;

  for (let k in player.inventory) {
    profit += player.inventory[k].price * player.inventory[k].qty;
  }

  player.inventory = {};
  player.balance += profit;

  res.json({ profit });
});

// ===== FEED =====
app.get("/feed", (req, res) => {
  res.json(feed);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
