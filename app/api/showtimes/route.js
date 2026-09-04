import { cinemas as mockCinemas } from "@/data/cinemas";
import fs from "fs";
import path from "path";
import os from "os";

const DISK_CACHE_DIR = path.join(os.tmpdir(), "movieglu-cache");
function diskCachePath(key) {
  return path.join(DISK_CACHE_DIR, `${key}.json`);
}
function readDiskCache(key) {
  try {
    const p = diskCachePath(key);
    const raw = fs.readFileSync(p, "utf8");
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts < CACHE_TTL_MS) return data;
  } catch {}
  return null;
}
function writeDiskCache(key, data) {
  try {
    fs.mkdirSync(DISK_CACHE_DIR, { recursive: true });
    fs.writeFileSync(diskCachePath(key), JSON.stringify({ ts: Date.now(), data }));
  } catch {}
}

// Credentials come from env only — see .env.example for the required names.
// If any are missing, mgFetch throws and the route falls back to mock data.
const REQUIRED_ENV = [
  "MOVIEGLU_CLIENT",
  "MOVIEGLU_API_KEY",
  "MOVIEGLU_AUTH",
  "MOVIEGLU_TERRITORY",
];

// Cache keyed by date string
const _cache = {};
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

// Cinema list cached separately — doesn't change by date
let _cinemaList = null;

async function getCinemaList() {
  if (_cinemaList) return _cinemaList;
  const fromDisk = readDiskCache("cinema-list");
  if (fromDisk) { _cinemaList = fromDisk; return _cinemaList; }
  const data = await mgFetch("/cinemasNearby", { n: 20, lat: 51.505, lng: -0.09 });
  _cinemaList = data.cinemas || [];
  writeDiskCache("cinema-list", _cinemaList);
  return _cinemaList;
}

function buildHeaders() {
  const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(`Missing MovieGlu env vars: ${missing.join(", ")}`);
  }
  return {
    client: process.env.MOVIEGLU_CLIENT,
    "x-api-key": process.env.MOVIEGLU_API_KEY,
    authorization: process.env.MOVIEGLU_AUTH,
    territory: process.env.MOVIEGLU_TERRITORY,
    "api-version": "v201",
    geolocation: "51.505;-0.09",
    "device-datetime": new Date().toISOString(),
  };
}

async function mgFetch(path, params = {}) {
  const url = new URL(`https://api-gate2.movieglu.com${path}/`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { headers: buildHeaders(), next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`MovieGlu ${path} → ${res.status} ${res.statusText}`);
  return res.json();
}

async function inBatches(items, fn, size = 5) {
  const results = [];
  for (let i = 0; i < items.length; i += size) {
    const batch = items.slice(i, i + size);
    results.push(...(await Promise.all(batch.map(fn))));
  }
  return results;
}

function normalizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
}

function findMockMatch(liveName) {
  const na = normalizeName(liveName);
  return mockCinemas.find((m) => {
    const nb = normalizeName(m.name);
    if (na === nb || na.includes(nb) || nb.includes(na)) return true;
    const wordsA = na.split(" ").filter((w) => w.length >= 3);
    const wordsB = new Set(nb.split(" ").filter((w) => w.length >= 3));
    return wordsA.filter((w) => wordsB.has(w)).length >= 2;
  }) || null;
}

function detectChain(name) {
  const n = name.toLowerCase();
  if (n.includes("odeon")) return "Odeon";
  if (n.includes("vue")) return "Vue";
  if (n.includes("cineworld")) return "Cineworld";
  if (n.includes("curzon")) return "Curzon";
  if (n.includes("picturehouse")) return "Picturehouse";
  if (n.includes("bfi")) return "BFI";
  if (n.includes("everyman")) return "Everyman";
  return "Independent";
}

function getPriceRange(chain) {
  if (["Curzon", "Everyman", "BFI"].includes(chain)) return "£££";
  if (["Odeon", "Vue", "Cineworld"].includes(chain)) return "£";
  return "££";
}

function mapGenre(genres) {
  if (!genres || genres.length === 0) return "Drama";
  const g = genres[0].genre_name?.toLowerCase() || "";
  if (g.includes("action") || g.includes("adventure")) return "Action";
  if (g.includes("comedy")) return "Comedy";
  if (g.includes("horror") || g.includes("thriller")) return "Horror";
  if (g.includes("documentary")) return "Documentary";
  if (g.includes("animation") || g.includes("family")) return "Comedy";
  return "Drama";
}

function extractNeighborhood(cinema) {
  // Try address2 first (e.g. "South Bank - Waterloo"), then city, then postcode area
  if (cinema.address2 && cinema.address2.trim()) return cinema.address2.trim().split(" - ").pop();
  if (cinema.city && cinema.city !== "London") return cinema.city;
  // Extract district from postcode (e.g. "SE1" from "SE1 9PA")
  if (cinema.postcode) return cinema.postcode.split(" ")[0];
  return "London";
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

async function fetchLiveData(date) {
  // Derive the day name from the *requested* date so showtimes always match the day selector
  const dayName = DAY_NAMES[new Date(date + "T12:00:00").getDay()];

  // 1. Nearby cinemas (cached across date requests)
  const cinemaList = await getCinemaList();
  if (cinemaList.length === 0) throw new Error("No cinemas returned");

  // 2. Showtimes for each cinema on the requested date
  const results = await inBatches(cinemaList, async (cinema) => {
    try {
      const data = await mgFetch("/cinemaShowTimes", { cinema_id: cinema.cinema_id, date });
      return { cinema, films: data.films || [] };
    } catch {
      return { cinema, films: [] };
    }
  });

  // 3. Shape into our data format
  let nextId = 1;
  return results
    .filter(({ films }) => films.length > 0)
    .map(({ cinema, films }) => {
      const mock = findMockMatch(cinema.cinema_name);
      const chain = mock?.chain ?? detectChain(cinema.cinema_name);

      const movies = films.flatMap((film) => {
        // Collect all times across all version types (Standard, Subtitled, etc.)
        const allShowtimes = Object.values(film.showings || {}).flatMap((version) =>
          (version.times || []).map((t) => ({
            time: t.start_time,
            day: dayName,
            booking_url: film.film_id
              ? `/api/booking?cinema_id=${cinema.cinema_id}&film_id=${film.film_id}&date=${date}&time=${encodeURIComponent(t.start_time)}&cinema_name=${encodeURIComponent(cinema.cinema_name)}`
              : null,
          }))
        );
        if (allShowtimes.length === 0) return [];
        return [{
          title: film.film_name,
          genre: mapGenre(film.genres),
          ticket_price: null,
          language: "English",
          has_subtitles: Object.keys(film.showings || {}).some((k) => k.toLowerCase().includes("subtitle")),
          showtimes: allShowtimes,
        }];
      });

      const liveHasSubtitles = films.some((f) =>
        Object.keys(f.showings || {}).some((k) => k.toLowerCase().includes("subtitle"))
      );
      const discounts = mock?.discounts ?? [];

      return {
        id: nextId++,
        name: cinema.cinema_name,
        address: [cinema.address, cinema.address2, cinema.city, cinema.postcode].filter(Boolean).join(", "),
        lat: parseFloat(cinema.lat),
        lng: parseFloat(cinema.lng),
        google_rating: mock?.google_rating ?? null,
        price_range: mock?.price_range ?? getPriceRange(chain),
        chain,
        neighborhood: mock?.neighborhood ?? extractNeighborhood(cinema),
        wheelchair_accessible: mock?.wheelchair_accessible ?? false,
        has_subtitled_screenings: mock?.has_subtitled_screenings ?? liveHasSubtitles,
        has_audio_description: mock?.has_audio_description ?? false,
        has_sensory_friendly: mock?.has_sensory_friendly ?? false,
        student_discount: discounts.some((d) => /student/i.test(d)),
        senior_discount: discounts.some((d) => /senior/i.test(d)),
        member_discount: discounts.some((d) => /member/i.test(d)),
        kids_discount: discounts.some((d) => /kids|child|junior|under/i.test(d)),
        movies,
      };
    });
}

export async function GET(request) {
const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || new Date().toISOString().slice(0, 10);

  const liveHeaders = { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=3600" };

  // Check memory cache
  const memCached = _cache[date];
  if (memCached && Date.now() - memCached.ts < CACHE_TTL_MS) {
    return Response.json({ source: "live", cinemas: memCached.data }, { headers: liveHeaders });
  }
  // Check disk cache (survives hot-reloads)
  const diskCached = readDiskCache(`showtimes-${date}`);
  if (diskCached) {
    _cache[date] = { data: diskCached, ts: Date.now() };
    return Response.json({ source: "live", cinemas: diskCached }, { headers: liveHeaders });
  }

  try {
    const cinemas = await fetchLiveData(date);
    _cache[date] = { data: cinemas, ts: Date.now() };
    writeDiskCache(`showtimes-${date}`, cinemas);
    return Response.json({ source: "live", cinemas }, { headers: liveHeaders });
  } catch (err) {
    console.error("MovieGlu fallback:", err.message);
    return Response.json({ source: "mock", cinemas: mockCinemas });
  }
}
