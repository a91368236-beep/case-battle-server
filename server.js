const http = require("http");

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

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  const url = new URL(req.url, "http://localhost");
  const id = url.searchParams.get("id");
  if (!id) return res.end(JSON.stringify({ error: "no_id" }));

  const player = getPlayer(id);

  // ===== STATS =====
  if (url.pathname === "/stats") {
    return res.end(JSON.stringify({
      ...player,
      online: Object.keys(players).length
    }));
  }

  // ===== OPEN CASES =====
  if (url.pathname === "/open") {
    const count = Math.min(15, Math.max(1, Number(url.searchParams.get("count") || 1)));
    const cost = count * 10;
    if (player.balance < cost) {
      return res.end(JSON.stringify({ error: "no_money" }));
    }

    const drops = [];
    for (let i = 0; i < count; i++) {
      const item = rollItem();
      drops.push(item);

      player.inventory[item.weapon + " | " + item.skin] ??= {
        ...item,
        qty: 0
      };
      player.inventory[item.weapon + " | " + item.skin].qty++;

      feed.unshift({
        player: id.slice(0, 4),
        item: `${item.weapon} | ${item.skin}`,
        rarity: item.rarity
      });
    }

    feed.length = 25;
    player.balance -= cost;
    player.spent += cost;
    player.opened += count;

    return res.end(JSON.stringify({ drops }));
  }

  // ===== SELL =====
  if (url.pathname === "/sell") {
    let profit = 0;
    for (let k in player.inventory) {
      profit += player.inventory[k].price * player.inventory[k].qty;
    }
    player.inventory = {};
    player.balance += profit;
    return res.end(JSON.stringify({ profit }));
  }

  // ===== FEED =====
  if (url.pathname === "/feed") {
    return res.end(JSON.stringify(feed));
  }

  res.end(JSON.stringify({ ok: true }));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
