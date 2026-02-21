const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

/* ===== DB ===== */
const DB_FILE = path.join(__dirname, "players.json");

const loadDB = () =>
  fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE)) : {};

const saveDB = db =>
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

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
function getPlayer(id) {
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
app.get("/", (_, res) =>
  res.sendFile(path.join(__dirname, "public", "index.html"))
);

app.get("/stats", (req, res) => {
  const p = getPlayer(req.query.id);
  res.json({ ...p, online: Object.keys(players).length });
});

app.get("/open", (req, res) => {
  const p = getPlayer(req.query.id);
  if (p.balance < 10) return res.json({ error: true });

  p.balance -= 10;
  p.opened++;

  const skin = rollSkin();
  p.inventory[skin.name] ??= { ...skin, qty: 0 };
  p.inventory[skin.name].qty++;

  saveDB(players);
  res.json({ skin });
});

app.get("/sell", (req, res) => {
  const p = getPlayer(req.query.id);
  let sum = 0;

  for (const i of Object.values(p.inventory))
    sum += i.price * i.qty;

  p.balance += sum;
  p.inventory = {};
  saveDB(players);

  res.json({ sold: sum });
});

app.listen(PORT, () =>
  console.log("✅ Server started on", PORT)
);