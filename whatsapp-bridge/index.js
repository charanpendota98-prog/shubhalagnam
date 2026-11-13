/**
 * Mana Vivaha — WhatsApp Bridge (optional service)
 * ===============================================
 * Baileys tho WhatsApp Web session — groups / newsletter / community ki post cheyyadaniki.
 *
 * Endpoints:
 *   POST /send        { target, text, typingMs? }   → composing presence + text
 *   POST /send-image  { target, caption, imagePath | imageUrl, typingMs? }
 *   POST /presence    { target, state: composing|paused }  → "type chesthunnattu" simulation
 *   GET  /status      { connected, groups, sent, uptimeSec }
 *   GET  /auth/status → protected, metadata-only login state
 *   GET  /auth/qr     → protected QR payload for the backend admin proxy
 *   POST /auth/pairing-code { phone } → protected, rate-limited one-time code
 *   GET  /qr          → legacy protected QR page (prefer the backend admin proxy)
 *
 * NOTE (anti-ban): delay logic Python side lo undi (backend/wa_antiban.py) — bridge ki
 * 'typingMs' vaste, aa time antha "composing" presence chupistundi (manishi la kanipistundi).
 *
 * Startup:
 *   docker-compose up -d whatsapp-bridge
 *   → owner control portal lo QR/pairing flow use cheyyandi
 *   → WhatsApp lo link ayyaka session save (isolated SESSION_DIR volume)
 *
 * Env:
 *   PORT=3001   SESSION_DIR=./session
 */
const crypto = require("crypto");
const dns = require("dns").promises;
const express = require("express");
const fs = require("fs");
const net = require("net");
const path = require("path");
const pino = require("pino");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");

const PORT = process.env.PORT || 3001;
const BRIDGE_TOKEN = (process.env.BRIDGE_TOKEN || "").trim();
const BRIDGE_NAME = (process.env.BRIDGE_NAME || "wa1").trim();  // logs/status lo kanipisthundi
const BRIDGE_REQUIRE_TOKEN = /^(1|true|yes|on)$/i.test(
  String(process.env.BRIDGE_REQUIRE_TOKEN || (process.env.NODE_ENV === "production" ? "true" : "false"))
);
const ALLOWED_MEDIA_DIR = path.resolve(process.env.MEDIA_DIR || path.join(__dirname, "media"));
const ALLOWED_IMAGE_HOSTS = new Set(
  String(process.env.BRIDGE_ALLOWED_IMAGE_HOSTS || "backend")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean)
);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

// Every bridge management and send endpoint is protected when this is enabled.
// Production must fail closed rather than silently running an unauthenticated
// WhatsApp sender. Local development can explicitly opt out with false.
function authOk(req) {
  if (!BRIDGE_TOKEN) return !BRIDGE_REQUIRE_TOKEN;
  const candidate = String(req.headers["x-bridge-token"] || "");
  const expectedBuf = Buffer.from(BRIDGE_TOKEN, "utf8");
  const candidateBuf = Buffer.from(candidate, "utf8");
  if (expectedBuf.length !== candidateBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, candidateBuf);
}
const requireAuth = (req, res, next) => (authOk(req) ? next() : res.status(401).json({ ok: false, error: "bridge authentication required" }));
if (BRIDGE_REQUIRE_TOKEN && !BRIDGE_TOKEN) {
  console.error("[WA] BRIDGE_TOKEN is required; management and send endpoints will remain unavailable");
}
const SESSION_DIR = process.env.SESSION_DIR || path.join(__dirname, "session");

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(requireAuth);   // X-Bridge-Token (set cheyyakapote open)

let sock = null;
let authState = null;
let connected = false;
let connectionState = "starting";
let lastQR = null;
let qrIssuedAt = 0;
let groups = [];
let lastAuthError = "";
let lastPairingRequestAt = 0;
const PAIRING_COOLDOWN_MS = Math.max(30_000, Number(process.env.PAIRING_COOLDOWN_MS || 60_000));
let sentCount = 0;
const startedAt = Date.now();

// presence simulate — "type chesthunnattu" (manishi la kanipinchadaniki)
async function simulateTyping(jid, ms) {
  const wait = Math.min(Math.max(Number(ms) || 0, 0), 15000);
  if (!wait) return;
  try {
    await sock.presenceSubscribe(jid);
    await sock.sendPresenceUpdate("composing", jid);
    await new Promise((r) => setTimeout(r, wait));
    await sock.sendPresenceUpdate("paused", jid);
  } catch (e) {
    console.log("[WA] presence skip");
  }
}

function safeBridgeError() {
  return "bridge request failed";
}

function normalizePhone(value) {
  const raw = String(value || "").trim();
  if (!/^\+?[1-9][0-9]{7,14}$/.test(raw)) return "";
  return raw.replace(/^\+/, "");
}

function isBlockedIp(ip) {
  const version = net.isIP(ip);
  if (version === 4) {
    const parts = ip.split(".").map(Number);
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true; // cloud metadata / link-local
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    return false;
  }
  if (version === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::1" || lower === "::" || lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd")) {
      return true;
    }
    if (lower.startsWith("::ffff:")) {
      return isBlockedIp(lower.slice(7));
    }
    return false;
  }
  return true;
}

async function validateImageUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(String(rawUrl));
  } catch {
    throw new Error("invalid imageUrl");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("unsupported imageUrl protocol");
  }
  if (parsed.username || parsed.password) {
    throw new Error("credentials not allowed in imageUrl");
  }
  const hostname = parsed.hostname.toLowerCase();
  if (hostname === "169.254.169.254" || hostname === "metadata.google.internal") {
    throw new Error("metadata host blocked");
  }
  if (!ALLOWED_IMAGE_HOSTS.has(hostname)) {
    if (net.isIP(hostname)) {
      if (isBlockedIp(hostname)) throw new Error("private imageUrl IP blocked");
    } else {
      const records = await dns.lookup(hostname, { all: true });
      if (!records.length || records.some((r) => isBlockedIp(r.address))) {
        throw new Error("private imageUrl target blocked");
      }
    }
  }
  return parsed.toString();
}

function resolveSafeMediaPath(rawPath) {
  const candidate = path.resolve(ALLOWED_MEDIA_DIR, String(rawPath));
  const rel = path.relative(ALLOWED_MEDIA_DIR, candidate);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("imagePath outside ALLOWED_MEDIA_DIR");
  }
  const stat = fs.lstatSync(candidate);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_IMAGE_BYTES) {
    throw new Error("invalid media file");
  }
  return candidate;
}

async function loadImage({ imagePath, imageUrl }) {
  if (imagePath) {
    const safePath = resolveSafeMediaPath(imagePath);
    return fs.readFileSync(safePath);
  }
  if (imageUrl) {
    const safeUrl = await validateImageUrl(imageUrl);
    const res = await fetch(safeUrl, { redirect: "error", signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`imageUrl fetch failed: ${res.status}`);
    const ab = await res.arrayBuffer();
    if (ab.byteLength > MAX_IMAGE_BYTES) throw new Error("imageUrl exceeds limit");
    return Buffer.from(ab);
  }
  return null;
}

async function startSock() {
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  authState = state;
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    browser: ["Mana Vivaha", "Chrome", "1.0.0"],
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (u) => {
    const { connection, lastDisconnect, qr } = u;
    if (qr) {
      connectionState = "awaiting_qr";
      lastQR = qr;
      qrIssuedAt = Date.now();
      // Keep the raw QR only in process memory. The owner application proxy
      // retrieves it over the authenticated bridge connection and renders it.
      console.log("[WA] QR ready (use the authenticated admin proxy; direct bridge access is disabled in production)");
    }
    if (connection === "open") {
      connected = true;
      connectionState = "connected";
      lastQR = null;
      qrIssuedAt = 0;
      lastAuthError = "";
      console.log("[WA] ✅ Connected to WhatsApp");
      try {
        const all = await sock.groupFetchAllParticipating();
        groups = Object.values(all).map((g) => ({ id: g.id, name: g.subject }));
        console.log(`[WA] ${groups.length} groups kanipisthunnayi`);
      } catch (e) {
        console.log("[WA] group list unavailable");
      }
    }
    if (connection === "close") {
      connected = false;
      const code = lastDisconnect?.error?.output?.statusCode;
      const retry = code !== DisconnectReason.loggedOut;
      connectionState = retry ? "reconnecting" : "logged_out";
      lastAuthError = retry ? "" : "session logged out";
      lastQR = null;
      qrIssuedAt = 0;
      console.log(`[WA] connection closed; retry=${retry}`);
      if (retry) setTimeout(startSock, 4000);
    }
  });
}

function normalizeTarget(target) {
  if (!target) return target;
  if (target.includes("@")) return target;
  const digits = target.replace(/[^0-9]/g, "");
  return `${digits}@s.whatsapp.net`;
}

app.get("/auth/status", (req, res) => {
  res.set("Cache-Control", "no-store");
  const registered = Boolean(authState?.creds?.registered);
  res.json({
    ok: true,
    name: BRIDGE_NAME,
    connected,
    registered,
    state: connectionState,
    qr_available: Boolean(lastQR) && !connected,
    pairing_available: !registered && Boolean(sock),
    qr_age_seconds: lastQR && qrIssuedAt ? Math.max(0, Math.floor((Date.now() - qrIssuedAt) / 1000)) : null,
    error_state: lastAuthError || "",
  });
});

app.get("/auth/qr", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ ok: true, name: BRIDGE_NAME, connected, qr: connected ? "" : (lastQR || ""),
    qr_age_seconds: lastQR && qrIssuedAt ? Math.max(0, Math.floor((Date.now() - qrIssuedAt) / 1000)) : null });
});

app.post("/auth/pairing-code", async (req, res) => {
  res.set("Cache-Control", "no-store");
  const phone = normalizePhone(req.body?.phone);
  if (!phone) return res.status(400).json({ ok: false, error: "authorized phone number with country code required" });
  if (!sock || !authState) return res.status(503).json({ ok: false, error: "bridge session is starting" });
  if (authState.creds.registered || connected) return res.status(409).json({ ok: false, error: "bridge is already authenticated" });
  const now = Date.now();
  const remaining = PAIRING_COOLDOWN_MS - (now - lastPairingRequestAt);
  if (remaining > 0) {
    return res.status(429).set("Retry-After", String(Math.ceil(remaining / 1000)))
      .json({ ok: false, error: "pairing code cooldown active" });
  }
  lastPairingRequestAt = now;
  try {
    const code = await sock.requestPairingCode(phone);
    // Never log, persist, or include the phone number. The code exists only in
    // this response and Baileys' in-memory session until WhatsApp links it.
    res.json({ ok: true, pairing_code: String(code || "").slice(0, 32), expires_in_sec: 60 });
  } catch (e) {
    res.status(502).json({ ok: false, error: safeBridgeError() });
  }
});

app.post("/send", async (req, res) => {
  const { target, text, typingMs } = req.body || {};
  if (!connected) return res.status(503).json({ ok: false, error: "WhatsApp not connected — QR scan chey" });
  if (!target || !text) return res.status(400).json({ ok: false, error: "target + text kavali" });
  try {
    const jid = normalizeTarget(target);
    await simulateTyping(jid, typingMs);
    const r = await sock.sendMessage(jid, { text });
    sentCount += 1;
    res.json({ ok: true, id: r?.key?.id, sent: sentCount });
  } catch (e) {
    res.status(500).json({ ok: false, error: safeBridgeError() });
  }
});

app.post("/presence", async (req, res) => {
  const { target, state } = req.body || {};
  if (!connected) return res.status(503).json({ ok: false, error: "not connected" });
  try {
    const jid = normalizeTarget(target);
    await sock.presenceSubscribe(jid);
    await sock.sendPresenceUpdate(state === "paused" ? "paused" : "composing", jid);
    res.json({ ok: true, state: state || "composing" });
  } catch (e) {
    res.status(500).json({ ok: false, error: safeBridgeError() });
  }
});

app.post("/send-image", async (req, res) => {
  const { target, imagePath, imageUrl, caption, typingMs } = req.body || {};
  if (!connected) return res.status(503).json({ ok: false, error: "WhatsApp not connected" });
  if (!target) return res.status(400).json({ ok: false, error: "target kavali" });
  try {
    const image = await loadImage({ imagePath, imageUrl });
    if (!image) return res.status(400).json({ ok: false, error: "imagePath leda imageUrl kavali" });
    const jid = normalizeTarget(target);
    await simulateTyping(jid, typingMs);
    const r = await sock.sendMessage(jid, { image, caption: caption || "" });
    sentCount += 1;
    res.json({ ok: true, id: r?.key?.id, withImage: true, sent: sentCount });
  } catch (e) {
    res.status(500).json({ ok: false, error: safeBridgeError() });
  }
});

app.get("/health", (req, res) => res.json({ ok: true, name: BRIDGE_NAME, connected }));
app.get("/status", (req, res) => res.json({
  name: BRIDGE_NAME,
  connected,
  groups: groups.length,
  groupList: groups.slice(0, 50),
  sent: sentCount,
  uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
}));
app.get("/groups", (req, res) => res.json({ connected, count: groups.length, groups }));
app.get("/qr", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.send(connected
    ? `<h2 style="color:green;font-family:sans-serif">✅ WhatsApp connected!</h2>`
    : `<h2 style="font-family:sans-serif">Use the authenticated owner application console for QR login.</h2>`);
});

app.listen(PORT, "0.0.0.0", () => console.log(`[WA] bridge listening on 0.0.0.0:${PORT}`));
startSock().catch((e) => console.error("[WA] start error: bridge startup failed"));
