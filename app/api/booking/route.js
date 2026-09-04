import { NextResponse } from "next/server";

function buildHeaders() {
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

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const cinema_id = searchParams.get("cinema_id");
  const film_id = searchParams.get("film_id");
  const date = searchParams.get("date");
  const time = searchParams.get("time");

  if (!cinema_id || !film_id || !date || !time) {
    return new Response("Missing required parameters", { status: 400 });
  }

  const mgUrl =
    `https://api-gate2.movieglu.com/purchaseConfirmation/` +
    `?cinema_id=${encodeURIComponent(cinema_id)}` +
    `&film_id=${encodeURIComponent(film_id)}` +
    `&date=${encodeURIComponent(date)}` +
    `&time=${encodeURIComponent(time)}`;

  let res;
  try {
    res = await fetch(mgUrl, { headers: buildHeaders(), redirect: "manual" });
  } catch (err) {
    return new Response(`Upstream error: ${err.message}`, { status: 502 });
  }

  const bookingCache = "public, s-maxage=300, stale-while-revalidate=60";

  // MovieGlu purchaseConfirmation typically returns a 302 redirect to the cinema's booking page
  const location = res.headers.get("location");
  if (location) {
    const r = NextResponse.redirect(location);
    r.headers.set("Cache-Control", bookingCache);
    return r;
  }

  // Fallback: some responses may return JSON containing the booking URL
  if (res.status < 400) {
    try {
      const data = await res.json();
      const url = data.booking_url ?? data.url ?? data.redirect_url ?? data.link;
      if (url) {
        const r = NextResponse.redirect(url);
        r.headers.set("Cache-Control", bookingCache);
        return r;
      }
    } catch {}
  }

  // Fallback: chain website, or Google search as last resort
  const cinemaName = searchParams.get("cinema_name") || "";
  const name = cinemaName.toLowerCase();
  const CHAIN_URLS = [
    ["odeon",          "https://www.odeon.co.uk/cinemas/"],
    ["vue",            "https://www.myvue.com/cinema/"],
    ["cineworld",      "https://www.cineworld.co.uk/cinemas/"],
    ["curzon",         "https://www.curzon.com/venues/"],
    ["everyman",       "https://www.everymancinema.com/venues-list"],
    ["picturehouse",   "https://www.picturehouses.com/cinemas"],
    ["ritzy",          "https://www.picturehouses.com/cinemas"],
    ["bfi",            "https://whatson.bfi.org.uk/Online/"],
    ["genesis",        "https://www.genesiscinema.co.uk/"],
    ["prince charles", "https://princecharlescinema.com/"],
    ["peckhamplex",    "https://www.peckhamplex.london/"],
    ["rich mix",       "https://richmix.org.uk/cinema/"],
    ["ica",            "https://www.ica.art/films"],
    ["barbican",       "https://www.barbican.org.uk/whats-on/cinema"],
  ];
  const match = CHAIN_URLS.find(([chain]) => name.includes(chain));
  const fallbackUrl = match
    ? match[1]
    : `https://www.google.com/search?q=${encodeURIComponent(cinemaName + " book tickets")}`;
  const r = NextResponse.redirect(fallbackUrl);
  r.headers.set("Cache-Control", bookingCache);
  return r;
}
