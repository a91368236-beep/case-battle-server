const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

/* ================== MIDDLEWARE ================== */
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/* ================== DB ================== */
const DB_FILE = path.join(__dirname, "players.json");

function loadDB() {
  if (!fs.existsSync(DB_FILE)) return {};
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

let players = loadDB();

/* ================== ONE GLOBAL PLAYER ================== */
const GLOBAL_ID = "global_player";

function getPlayer() {
  if (!players[GLOBAL_ID]) {
    players[GLOBAL_ID] = {
      balance: 1000,
      spent: 0,
      opened: 0,
      inventory: {},
      lastSeen: Date.now()
    };
    saveDB(players);
  }
  return players[GLOBAL_ID];
}

/* ================== ROUTES ================== */

// 🔥 ГАРАНТИРОВАННАЯ ОТДАЧА FRONTEND
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// stats
app.get("/stats", (req, res) => {
  const p = getPlayer();
  res.json({
    balance: p.balance,
    opened: p.opened,
    inventory: p.inventory,
    online: 1
  });
});

// open cases
app.get("/open", (req, res) => {
  const p = getPlayer();
  const count = Math.max(1, Math.min(15, +req.query.count || 1));
  const price = count * 10;

  if (p.balance < price) {
    return res.json({ error: "no money" });
  }

  p.balance -= price;
  p.spent += price;
  p.opened += count;
  p.lastSeen = Date.now();

  const drops = [];

  for (let i = 0; i < count; i++) {
    const item = {
      weapon: "AK-47",
      skin: "Redline",
      rarity: "classified",
      qty: 1
    };

    const key = item.weapon + item.skin;
    p.inventory[key] ??= { ...item, qty: 0 };
    p.inventory[key].qty++;

    drops.push(item);
  }

  saveDB(players);
  res.json({ drops });
});

// sell all
app.get("/sell", (req, res) => {
  const p = getPlayer();

  let total = 0;
  for (const i of Object.values(p.inventory)) {
    total += i.qty * 5;
  }

  p.balance += total;
  p.inventory = {};
  p.lastSeen = Date.now();

  saveDB(players);
  res.json({ sold: total });
});

// feed (stub)
app.get("/feed", (req, res) => {
  res.json([]);
});

/* ================== START ================== */
app.listen(PORT, () => {
  console.log("✅ Server running on port", PORT);
});