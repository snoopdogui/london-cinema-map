#!/usr/bin/env node
// test-movieglu.js — compares MovieGlu live data against our mock cinema list
// Usage: node scripts/test-movieglu.js
// Budget: ~5 API calls (one per coordinate set)

const fs = require("fs");
const path = require("path");
const https = require("https");

// ---------------------------------------------------------------------------
// Load .env.local
// ---------------------------------------------------------------------------
const envPath = path.join(__dirname, "../.env.local");
const envVars = {};
fs.readFileSync(envPath, "utf8")
  .split("\n")
  .forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) envVars[m[1].trim()] = m[2].trim();
  });

const HEADERS = {
  client: envVars.MOVIEGLU_CLIENT,
  "x-api-key": envVars.MOVIEGLU_API_KEY,
  authorization: envVars.MOVIEGLU_AUTH,
  territory: envVars.MOVIEGLU_TERRITORY,
  "api-version": "v200",
  "device-datetime": new Date().toISOString().slice(0, 19),
  geolocation: "51.505;-0.09",
};

// ---------------------------------------------------------------------------
// Parse mock cinemas from data/cinemas.js (regex — avoids ESM import)
// ---------------------------------------------------------------------------
const cinemasFile = fs.readFileSync(
  path.join(__dirname, "../data/cinemas.js"),
  "utf8"
);

const mockCinemas = [];
// Each cinema block starts with "id: N, name: "...", address: "...", \n    lat: ..., lng: ..."
const cinemaBlockRe =
  /id:\s*(\d+),\s*name:\s*"([^"]+)",\s*address:\s*"([^"]+)",\s*\n\s*lat:\s*([\d.\-]+),\s*lng:\s*([\d.\-]+)/g;

let match;
while ((match = cinemaBlockRe.exec(cinemasFile)) !== null) {
  mockCinemas.push({
    id: parseInt(match[1]),
    name: match[2],
    address: match[3],
    lat: parseFloat(match[4]),
    lng: parseFloat(match[5]),
  });
}

// ---------------------------------------------------------------------------
// MovieGlu API helper
// ---------------------------------------------------------------------------
function mgFetch(lat, lng, n = 50) {
  return new Promise((resolve, reject) => {
    const url = `https://api-gate2.movieglu.com/cinemasNearby/?n=${n}&lat=${lat}&lng=${lng}`;
    const options = {
      headers: {
        ...HEADERS,
        geolocation: `${lat};${lng}`,
        "device-datetime": new Date().toISOString().slice(0, 19),
      },
    };
    https
      .get(url, options, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          if (res.statusCode !== 200) {
            reject(
              new Error(`HTTP ${res.statusCode}: ${body.slice(0, 200)}`)
            );
            return;
          }
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error(`JSON parse error: ${body.slice(0, 200)}`));
          }
        });
      })
      .on("error", reject);
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Name similarity helper (case-insensitive partial match)
// ---------------------------------------------------------------------------
function normalize(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
}

function namesMatch(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  // Check if significant words overlap (3+ char words)
  const wordsA = na.split(" ").filter((w) => w.length >= 3);
  const wordsB = new Set(nb.split(" ").filter((w) => w.length >= 3));
  const shared = wordsA.filter((w) => wordsB.has(w));
  return shared.length >= 2;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const COORDS = [
    { lat: 51.505, lng: -0.09 },   // Central (City/Southwark)
    { lat: 51.52, lng: -0.08 },    // East (Shoreditch/Stepney)
    { lat: 51.48, lng: -0.12 },    // South (Brixton/Camberwell)
    { lat: 51.53, lng: -0.15 },    // North-West (Camden/Kilburn)
    { lat: 51.49, lng: -0.02 },    // East (Greenwich direction)
  ];

  console.log("=".repeat(60));
  console.log("MovieGlu vs Mock Data Comparison");
  console.log(`Date: ${new Date().toISOString()}`);
  console.log(`Mock cinemas loaded: ${mockCinemas.length}`);
  console.log(`Credential territory: ${envVars.MOVIEGLU_TERRITORY}`);
  console.log("=".repeat(60));
  console.log(`\nMaking ${COORDS.length} API calls (n=50 each)...\n`);

  const allMovieGluCinemas = new Map(); // cinema_id -> cinema object
  let apiCallCount = 0;

  for (let i = 0; i < COORDS.length; i++) {
    const { lat, lng } = COORDS[i];
    console.log(`  [${i + 1}/${COORDS.length}] cinemasNearby lat=${lat} lng=${lng} ...`);
    try {
      const data = await mgFetch(lat, lng, 50);
      apiCallCount++;
      const cinemas = data.cinemas || [];
      let newCount = 0;
      for (const c of cinemas) {
        if (!allMovieGluCinemas.has(c.cinema_id)) {
          allMovieGluCinemas.set(c.cinema_id, c);
          newCount++;
        }
      }
      console.log(`    → ${cinemas.length} returned, ${newCount} new (total unique: ${allMovieGluCinemas.size})`);
    } catch (err) {
      apiCallCount++;
      console.error(`    → ERROR: ${err.message}`);
    }
    if (i < COORDS.length - 1) {
      await sleep(1000);
    }
  }

  const mgList = Array.from(allMovieGluCinemas.values());
  console.log(`\nTotal API calls used: ${apiCallCount}`);
  console.log(`Total unique MovieGlu cinemas found: ${mgList.length}`);

  // ---------------------------------------------------------------------------
  // Match
  // ---------------------------------------------------------------------------
  const matched = [];
  const missingFromApp = [];
  const notOnMovieGlu = [];

  for (const mg of mgList) {
    const mockMatch = mockCinemas.find((m) => namesMatch(m.name, mg.cinema_name));
    if (mockMatch) {
      matched.push({ mg, mock: mockMatch });
    } else {
      missingFromApp.push(mg);
    }
  }

  const matchedMockIds = new Set(matched.map((m) => m.mock.id));
  for (const mock of mockCinemas) {
    if (!matchedMockIds.has(mock.id)) {
      notOnMovieGlu.push(mock);
    }
  }

  // ---------------------------------------------------------------------------
  // Print report
  // ---------------------------------------------------------------------------
  console.log("\n" + "=".repeat(60));
  console.log(`MATCHED (${matched.length}) — in both MovieGlu and our app`);
  console.log("=".repeat(60));
  for (const { mg, mock } of matched.sort((a, b) =>
    a.mock.name.localeCompare(b.mock.name)
  )) {
    console.log(`  ✓ ${mock.name}`);
    if (normalize(mock.name) !== normalize(mg.cinema_name)) {
      console.log(`      MovieGlu name: "${mg.cinema_name}"`);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(`MISSING FROM APP (${missingFromApp.length}) — MovieGlu has these, we don't`);
  console.log("=".repeat(60));
  for (const c of missingFromApp.sort((a, b) =>
    a.cinema_name.localeCompare(b.cinema_name)
  )) {
    console.log(`  + ${c.cinema_name}`);
    if (c.address) console.log(`      Address: ${c.address}`);
    if (c.lat != null) console.log(`      Lat/Lng: ${c.lat}, ${c.lng}`);
  }

  console.log("\n" + "=".repeat(60));
  console.log(`NOT ON MOVIEGLU (${notOnMovieGlu.length}) — we have these, MovieGlu doesn't`);
  console.log("=".repeat(60));
  for (const m of notOnMovieGlu.sort((a, b) => a.name.localeCompare(b.name))) {
    console.log(`  - ${m.name} (${m.address})`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));
  console.log(`  API calls used this run : ${apiCallCount}`);
  console.log(`  MovieGlu cinemas found  : ${mgList.length}`);
  console.log(`  Mock cinemas in app     : ${mockCinemas.length}`);
  console.log(`  Matched                 : ${matched.length}`);
  console.log(`  Missing from app        : ${missingFromApp.length}`);
  console.log(`  Not on MovieGlu         : ${notOnMovieGlu.length}`);
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
