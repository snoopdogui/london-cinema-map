// node scripts/add-booking-urls.js
const fs = require("fs");
const path = require("path");

const CHAIN_URLS = {
  Odeon: "https://www.odeon.co.uk",
  Vue: "https://www.myvue.com",
  Cineworld: "https://www.cineworld.co.uk",
  Curzon: "https://www.curzon.com",
  Everyman: "https://www.everymancinema.com",
  Picturehouse: "https://www.picturehouses.com",
  BFI: "https://www.bfi.org.uk/bfi-southbank",
  "Soho House": "https://www.electriccinema.co.uk",
};

const INDIE_URLS = {
  "Prince Charles Cinema": "https://princecharlescinema.com",
  "ICA Cinema": "https://www.ica.art/cinema",
  "Barbican Centre": "https://www.barbican.org.uk/whats-on/cinema",
  "Rich Mix": "https://richmix.org.uk",
  "The Rio": "https://riocinema.org.uk",
  "Phoenix Cinema": "https://phoenixcinema.co.uk",
  Peckhamplex: "https://www.peckhamplex.london",
  "Riverside Studios": "https://www.riversidestudios.co.uk",
  "The Garden Cinema": "https://www.thegardencinema.co.uk",
  "Regent Street Cinema": "https://www.regentstreetcinema.com",
  "Ciné Lumière": "https://www.institut-francais.org.uk/cine-lumiere",
  "The Castle Cinema": "https://thecastlecinema.com",
  "Genesis Cinema": "https://genesiscinema.co.uk",
  "The Lexi Cinema": "https://thelexicinema.co.uk",
  "Olympic Studios": "https://olympicstudios.co.uk",
  "Deptford Cinema": "https://deptfordcinema.org",
  "Close-Up Film Centre": "https://close-up.org.uk",
  "Whirled Cinema": "https://www.google.com/search?q=Whirled+Cinema+Brixton+London",
  "The Nickel Cinema": "https://www.google.com/search?q=Nickel+Cinema+Clerkenwell+London",
  "The Cinema at Selfridges": "https://www.selfridges.com/GB/en/features/articles/selfridges-cinema/",
  "The Arzner": "https://www.google.com/search?q=The+Arzner+cinema+Bermondsey+London",
  "Catford Mews Cinema": "https://www.google.com/search?q=Catford+Mews+Cinema+London",
  "The Cinema in the Power Station": "https://www.batterseapowerstation.co.uk/eat-drink-shop/cinema/",
  "Arthouse Crouch End": "https://www.google.com/search?q=Arthouse+Crouch+End+cinema+London",
  "ActOne Cinema": "https://www.google.com/search?q=ActOne+Cinema+Acton+London",
};

const filePath = path.join(__dirname, "../data/cinemas.js");
let content = fs.readFileSync(filePath, "utf8");

// Skip if already processed
if (content.includes("booking_url:")) {
  console.log("booking_url fields already present — skipping.");
  process.exit(0);
}

// Add booking_url for chain cinemas
for (const [chain, url] of Object.entries(CHAIN_URLS)) {
  content = content.replaceAll(
    `chain: "${chain}", neighborhood:`,
    `chain: "${chain}", booking_url: "${url}", neighborhood:`
  );
}

// Add booking_url for independent cinemas by name
for (const [name, url] of Object.entries(INDIE_URLS)) {
  // name appears as:  name: "CINEMA NAME", address:
  const namePattern = `name: "${name}", address:`;
  const replacement = `name: "${name}", address:`;
  // We need to insert booking_url on the chain line for this cinema
  // Pattern: the chain line for this cinema is: chain: "Independent", neighborhood:
  // But multiple cinemas share this pattern, so we need to target by proximity to name
  // Strategy: find the block containing this name and add booking_url there
  const blockPattern = new RegExp(
    `(name: "${escapeRegex(name)}"[\\s\\S]{0,400}?chain: "Independent", )neighborhood:`,
    "g"
  );
  content = content.replace(
    blockPattern,
    `$1booking_url: "${url}", neighborhood:`
  );
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

fs.writeFileSync(filePath, content);
console.log("Done. booking_url fields added.");
