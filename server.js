const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

/* ===== MIDDLEWARE ===== */
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/* ===== DB ===== */
const DB_FILE = path.join(__dirname, "players.json");

const loadDB = () => {
  if (!fs.existsSync(DB_FILE)) return {};
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
};

const saveDB = db => {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
};

let players = loadDB();

/* ===== SKINS ===== */
const SKINS = [
  { name: "Разработчик Артём", price: 110, chance: 7 },
  { name: "Класуха разработчика Артёма", price: 1, chance: 24 },
  { name: "Лудаман Валера", price: 60, chance: 3 },
  { name: "Кссер Саня", price: 70, chance: 3 },
  { name: "РКН", price: 3, chance: 20 },
  { name: "Гномы Валеро Крады", price: 18, chance: 21 },
  { name: "Репыши", price: 20, chance: 19 }
];

function rollSkin() {
  const total = SKINS.reduce((s, i) => s + i.chance, 0);
  let r = Math.random() * total;

  for (const skin of SKINS) {
    if ((r -= skin.chance) <= 0) return skin;
  }
}

/* ===== PLAYER ===== */
function getPlayer(id = "guest") {
  if (!players[id]) {
    players[id] = {
      balance: 100,
      opened: 0,
      inventory: {}
    };
    saveDB(players);
  }
  return players[id];
}

/* ===== ROUTES ===== */
app.get("/", (_, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/stats", (req, res) => {
  const player = getPlayer(req.query.id);
  res.json({
    balance: player.balance,
    opened: player.opened,
    inventory: player.inventory,
    online: Object.keys(players).length
  });
});

app.get("/open", (req, res) => {
  const player = getPlayer(req.query.id);

  if (player.balance < 10) {
    return res.json({ error: "NO_MONEY" });
  }

  player.balance -= 10;
  player.opened++;

  const skin = rollSkin();
  player.inventory[skin.name] ??= { ...skin, qty: 0 };
  player.inventory[skin.name].qty++;

  saveDB(players);
  res.json({ skin });
});

app.get("/sell", (req, res) => {
  const player = getPlayer(req.query.id);

  let sum = 0;
  for (const item of Object.values(player.inventory)) {
    sum += item.price * item.qty;
  }

  player.balance += sum;
  player.inventory = {};
  saveDB(players);

  res.json({ sold: sum, balance: player.balance });
});

/* ===== START SERVER (ВАЖНО!) ===== */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server started on http://0.0.0.0:${PORT}`);
});