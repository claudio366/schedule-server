/*
 * Servidor para Schedule (Node 18+, sin dependencias).
 *   BOT_TOKEN=123:ABC  PORT=3000  node server.js
 *
 * Qué hace:
 *  - Valida que cada petición venga de Telegram (firma HMAC de initData).
 *  - Cuenta invitados: cuando alguien abre la app con ?startapp=ref_<ID>, suma 1 al invitador (una sola vez por usuario).
 *  - Reclamo de hitos de invitación (1, 3, 10 amigos) validado en el servidor, una sola vez por hito.
 *
 * Qué NO hace (todavía): pagos en USDT, ni verificar tareas de canal/X ni los puntos del juego.
 * Los datos se guardan en data.json (para producción usa una base de datos).
 */
const http = require("http"), crypto = require("crypto"), fs = require("fs");
const TOKEN = process.env.BOT_TOKEN || "", PORT = +process.env.PORT || 3000;
const ORIGIN = process.env.ALLOW_ORIGIN || "*", FILE = process.env.DATA_FILE || "data.json";
const REWARDS = { i1: [1, 100], i3: [3, 400], i10: [10, 1500] }; // hito: [amigos, puntos]
let db = {}; try { db = JSON.parse(fs.readFileSync(FILE, "utf8")); } catch (e) {}
let dirty = false;
setInterval(() => { if (dirty) { dirty = false; fs.writeFile(FILE + ".tmp", JSON.stringify(db), e => { if (!e) fs.rename(FILE + ".tmp", FILE, () => {}); }); } }, 2000);

function verify(initData) {
  if (!TOKEN || !initData) return null;
  const p = new URLSearchParams(initData), hash = p.get("hash");
  if (!hash) return null;
  p.delete("hash");
  const str = [...p.entries()].map(([k, v]) => k + "=" + v).sort().join("\n");
  const secret = crypto.createHmac("sha256", "WebAppData").update(TOKEN).digest();
  const calc = crypto.createHmac("sha256", secret).update(str).digest("hex");
  const a = Buffer.from(calc), b = Buffer.from(hash);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  if (Date.now() / 1000 - Number(p.get("auth_date") || 0) > 86400) return null; // caduca en 24 h
  try { const u = JSON.parse(p.get("user")); return u && u.id ? { id: String(u.id), start: p.get("start_param") || "" } : null; } catch (e) { return null; }
}
function user(id) { return db[id] || (db[id] = { inv: 0, ref: "", claimed: [], created: Date.now() }); }
function send(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json", "Access-Control-Allow-Origin": ORIGIN, "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "POST,GET,OPTIONS" });
  res.end(JSON.stringify(obj));
}
http.createServer((req, res) => {
  if (req.method === "OPTIONS") return send(res, 204, {});
  if (req.method === "GET" && req.url === "/health") return send(res, 200, { ok: true });
  if (req.method !== "POST") return send(res, 404, { error: "not found" });
  let body = ""; req.on("data", c => { body += c; if (body.length > 1e5) req.destroy(); });
  req.on("end", () => {
    let j; try { j = JSON.parse(body || "{}"); } catch (e) { return send(res, 400, { error: "bad json" }); }
    const v = verify(j.initData);
    if (!v) return send(res, 401, { error: "unauthorized" });
    const known = !!db[v.id], u = user(v.id);
    if (req.url === "/api/me") {
      // Primera vez que vemos a este usuario: acreditar al invitador (si lo hay y no es él mismo)
      if (!known && /^ref_\d+$/.test(v.start)) {
        const r = v.start.slice(4);
        if (r !== v.id) { u.ref = r; user(r).inv++; }
      }
      dirty = true;
      return send(res, 200, { inv: u.inv, claimed: u.claimed });
    }
    if (req.url === "/api/claim") {
      const m = REWARDS[j.id];
      if (!m) return send(res, 400, { error: "bad id" });
      if (u.inv < m[0] || u.claimed.includes(j.id)) return send(res, 200, { ok: false });
      u.claimed.push(j.id); dirty = true;
      return send(res, 200, { ok: true, pts: m[1] });
    }
    send(res, 404, { error: "not found" });
  });
}).listen(PORT, () => console.log("Schedule server en puerto " + PORT + (TOKEN ? "" : " (¡falta BOT_TOKEN!)")));
