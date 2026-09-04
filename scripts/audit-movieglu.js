#!/usr/bin/env node
// audit-movieglu.js — one-off API audit, no code changes
// Usage: node scripts/audit-movieglu.js

const fs = require("fs");
const path = require("path");
const https = require("https");

// Load .env.local
const envVars = {};
fs.readFileSync(path.join(__dirname, "../.env.local"), "utf8")
  .split("\n").forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) envVars[m[1].trim()] = m[2].trim();
  });

function makeHeaders(extra = {}) {
  return {
    client: envVars.MOVIEGLU_CLIENT,
    "x-api-key": envVars.MOVIEGLU_API_KEY,
    authorization: envVars.MOVIEGLU_AUTH,
    territory: envVars.MOVIEGLU_TERRITORY,
    "api-version": "v201",
    "device-datetime": new Date().toISOString().slice(0, 19),
    geolocation: "51.505;-0.09",
    ...extra,
  };
}

function mgGet(endpoint, params = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`https://api-gate2.movieglu.com${endpoint}/`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    https.get(url.toString(), { headers: makeHeaders() }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body }));
    }).on("error", reject);
  });
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

const TODAY = new Date().toISOString().slice(0, 10);

// Cinemas from today's live data (cinema_id from booking URLs)
// Using actual MovieGlu cinema_ids and film_ids observed in today's cache
const TARGETS = [
  { chain: "Odeon",       name: "ODEON Luxe London Leicester Square", cinema_id: 8795,  film_id: 359232, time: "14:00" },
  { chain: "Vue",         name: "Vue - London West End",              cinema_id: 8923,  film_id: 359232, time: "10:15" },
  { chain: "Curzon",      name: "Curzon Aldgate",                     cinema_id: 43607, film_id: 359232, time: "11:40" },
  { chain: "Everyman",    name: "Everyman Borough Yards",             cinema_id: 51876, film_id: 359232, time: "12:45" },
  { chain: "Independent", name: "BFI Southbank",                      cinema_id: 9541,  film_id: 371618, time: "14:40" },
];

// Distinct film IDs to audit
const FILM_IDS = [359232, 371618, 359371];

// Cinema IDs to pull raw showTimes from (spread across types)
const SHOWTIMES_CINEMAS = [
  { cinema_id: 8795,  name: "ODEON Luxe London Leicester Square" },
  { cinema_id: 51876, name: "Everyman Borough Yards" },
  { cinema_id: 9541,  name: "BFI Southbank" },
];

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(70));
  console.log("MovieGlu API Audit —", TODAY);
  console.log("=".repeat(70));

  // ── 1. purchaseConfirmation ──────────────────────────────────────────────
  console.log("\n\n━━━ 1. purchaseConfirmation ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  for (const t of TARGETS) {
    await sleep(400);
    const { status, body } = await mgGet("/purchaseConfirmation", {
      cinema_id: t.cinema_id,
      film_id: t.film_id,
      date: TODAY,
      time: t.time,
    });
    let parsed = null;
    try { parsed = JSON.parse(body); } catch {}

    console.log(`[${t.chain}] ${t.name} (cinema_id=${t.cinema_id})`);
    console.log(`  film_id=${t.film_id}  date=${TODAY}  time=${t.time}`);
    console.log(`  HTTP ${status}`);
    if (parsed) {
      console.log("  Response:", JSON.stringify(parsed, null, 4).replace(/\n/g, "\n  "));
    } else if (body.trim()) {
      console.log("  Body:", body.slice(0, 300));
    } else {
      console.log("  (empty body)");
    }
    console.log();
  }

  // ── 2. filmDetails ───────────────────────────────────────────────────────
  console.log("\n━━━ 2. filmDetails ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  for (const film_id of FILM_IDS) {
    await sleep(400);
    const { status, body } = await mgGet("/filmDetails", { film_id });
    console.log(`film_id=${film_id}  HTTP ${status}`);
    let parsed = null;
    try { parsed = JSON.parse(body); } catch {}
    if (parsed) {
      console.log(JSON.stringify(parsed, null, 2));
    } else {
      console.log("Raw:", body.slice(0, 500));
    }
    console.log();
  }

  // ── 3. Raw cinemaShowTimes — all version keys ────────────────────────────
  console.log("\n━━━ 3. cinemaShowTimes — raw version keys ━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const allVersionKeys = new Set();

  for (const c of SHOWTIMES_CINEMAS) {
    await sleep(400);
    const { status, body } = await mgGet("/cinemaShowTimes", {
      cinema_id: c.cinema_id,
      date: TODAY,
    });
    console.log(`[${c.name}] cinema_id=${c.cinema_id}  HTTP ${status}`);

    let parsed = null;
    try { parsed = JSON.parse(body); } catch {}
    if (!parsed || !parsed.films) { console.log("  No films / parse error\n"); continue; }

    const cinemaVersions = new Set();
    for (const film of parsed.films) {
      const versions = Object.keys(film.showings || {});
      versions.forEach((v) => { cinemaVersions.add(v); allVersionKeys.add(v); });
    }

    console.log(`  Films: ${parsed.films.length}`);
    console.log(`  Version keys: ${[...cinemaVersions].join(" | ")}`);

    // Print one example film in full to see the showings structure
    const sampleFilm = parsed.films[0];
    if (sampleFilm) {
      console.log(`\n  Sample film — "${sampleFilm.film_name}" (film_id=${sampleFilm.film_id})`);
      // Show keys on the film object itself
      console.log("  Film-level keys:", Object.keys(sampleFilm).join(", "));
      // Show one showings entry in full
      const firstVersion = Object.keys(sampleFilm.showings || {})[0];
      if (firstVersion) {
        console.log(`  showings["${firstVersion}"] sample:`,
          JSON.stringify(sampleFilm.showings[firstVersion], null, 4).replace(/\n/g, "\n    "));
      }
      // Print genres array in full
      if (sampleFilm.genres) {
        console.log("  genres:", JSON.stringify(sampleFilm.genres));
      }
    }
    console.log();
  }

  console.log("━".repeat(70));
  console.log("ALL UNIQUE VERSION KEYS ACROSS ALL CINEMAS:");
  [...allVersionKeys].sort().forEach((k) => console.log("  •", k));
  console.log("━".repeat(70));
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
