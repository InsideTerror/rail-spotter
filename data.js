/*
 * Locomotive class reference data — transcribed from the MÁV-Start roster
 * table you provided (matches the structure of vonatosszeallitas.hu's
 * "MÁV-Start mozdonyok" page). This replaces the earlier small placeholder
 * seed, and also corrects it: 480 is a Bombardier TRAXX, not a Siemens
 * Vectron as originally guessed, and "M43" corresponds to class 438, not
 * 430 — both fixed here.
 *
 * "prefix" is matched against the digits-only running number, longest
 * prefix wins. Sub-batches that share a 3-digit class but differ in their
 * 4th digit (e.g. 630 000 vs 630 100) get 4-digit prefixes so they resolve
 * separately; general/undifferentiated batches keep the shorter 3-digit
 * prefix as a fallback.
 *
 * Only nicknames I'm reasonably confident are genuinely in common use
 * (Szili, Szergej, Gigant, Bobó) are filled in — everything else is left
 * blank rather than guessed. "topSpeed" and "count" are informational
 * only; the app doesn't require them.
 */
const SEED_LOCO_CLASSES = [
  // ---------- EMUs / DMUs ----------
  // These aren't locomotives, but the running/set number identifies the
  // whole multiple unit the same way a loco number identifies a loco — no
  // separate car records needed. "unitKind" just labels this for clarity,
  // the app treats them identically to locomotives for logging and stats.
  {
    code: "415",
    prefix: "415",
    name: "STALDER FLIRT",
    unitKind: "EMU",
    nickname: "",
    builder: "Stadler",
    era: "2006–2016",
    traction: "electric",
    topSpeed: "160 km/h",
    heating: "air-conditioned",
    count: 123,
    notes: "MÁV-START electric multiple unit, numbered 415 001–123."
  },
  {
    code: "815",
    prefix: "815",
    name: "STADLER KISS",
    unitKind: "EMU",
    nickname: "",
    builder: "Stadler",
    era: "2020–2022",
    traction: "electric",
    topSpeed: "160 km/h",
    heating: "air-conditioned",
    count: 40,
    notes: "Double-deck electric multiple unit, numbered 815 001–040."
  },
  {
    code: "426",
    prefix: "426",
    name: "Desiro",
    unitKind: "DMU",
    nickname: "",
    builder: "Siemens",
    era: "2003–2006",
    traction: "diesel-electric",
    topSpeed: "120 km/h",
    heating: "air-conditioned",
    count: 31,
    notes: "MÁV-START diesel multiple unit, numbered 426 001–031."
  },
  {
    code: "425",
    prefix: "425",
    name: "Talent",
    unitKind: "EMU",
    nickname: "",
    builder: "Bombardier",
    era: "2006",
    traction: "electric",
    topSpeed: "140 km/h",
    heating: "air-conditioned",
    count: 10,
    notes: "Electric multiple unit, numbered 425 001–010."
  },

  // ---------- Electric locomotives (MÁV-Start) ----------
  {
    code: "480",
    prefix: "480",
    name: "Bombardier TRAXX",
    nickname: "",
    builder: "Bombardier",
    era: "2010–2012",
    traction: "electric",
    topSpeed: "160 km/h",
    heating: "train-heating generator fitted",
    count: 25,
    notes: "MÁV-Start electric loco, no earlier Hungarian designation."
  },
  {
    code: "470",
    prefix: "470",
    name: "Siemens Taurus",
    nickname: "",
    builder: "Siemens",
    era: "2002–2006",
    traction: "electric",
    topSpeed: "230 km/h",
    heating: "train-heating generator fitted",
    count: 10,
    notes: "Ex-ÖBB-numbered 1047 series Taurus locomotives."
  },
  {
    code: "6301",
    prefix: "6301",
    name: "GANZ V63",
    nickname: "Gigant",
    builder: "Ganz, overhaul: Északi Járműjavító",
    era: "1975–1984, refurbished 1992",
    traction: "electric",
    topSpeed: "160 km/h",
    heating: "train-heating generator fitted",
    count: 45
  },
  {
    code: "6300",
    prefix: "6300",
    name: "GANZ V63",
    nickname: "Gigant",
    builder: "Ganz",
    era: "1975–1984",
    traction: "electric",
    topSpeed: "120 km/h",
    heating: "train-heating generator fitted",
    count: 10
  },
  {
    code: "433",
    prefix: "433",
    name: "GANZ V43",
    nickname: "Szili",
    builder: "Ganz, overhaul: Északi Járműjavító",
    era: "1971–1981, refurbished 2007–2008",
    traction: "electric",
    topSpeed: "120 km/h",
    heating: "train-heating generator fitted",
    count: 30
  },
  {
    code: "432",
    prefix: "432",
    name: "GANZ V43",
    nickname: "Szili",
    builder: "Ganz, overhaul: Északi Járműjavító",
    era: "1971–1982, refurbished 1999–2007",
    traction: "electric",
    topSpeed: "120 km/h",
    heating: "train-heating generator fitted",
    count: 56
  },
  {
    code: "431",
    prefix: "431",
    name: "GANZ V43",
    nickname: "Szili",
    builder: "Ganz",
    era: "1963–1982",
    traction: "electric",
    topSpeed: "120 km/h",
    heating: "train-heating generator fitted",
    count: 251,
    notes: "Hungary's most numerous electric loco class."
  },
  {
    code: "460",
    prefix: "460",
    name: "GANZ V46",
    nickname: "Szöcske",
    builder: "Ganz",
    era: "1983–1992",
    traction: "electric",
    topSpeed: "80 km/h",
    heating: "none",
    count: 60,
    notes: "Heavy shunting/hump-yard duty, no train heating."
  },

  // ---------- Diesel locomotives (MÁV-Start) ----------
  {
    code: "6283",
    prefix: "6283",
    name: "MÁV M62",
    nickname: "Szergej",
    builder: "Luhansk (Voroshilovgrad), overhaul: Északi Járműjavító",
    era: "1965–1974, refurbished 1999–2007",
    traction: "diesel-electric",
    topSpeed: "100 km/h",
    heating: "none",
    count: 34
  },
  {
    code: "628",
    prefix: "628",
    name: "MÁV M62",
    nickname: "Szergej",
    builder: "Luhansk (Voroshilovgrad)",
    era: "1965–1974",
    traction: "diesel-electric",
    topSpeed: "100 km/h",
    heating: "none",
    count: 48,
    notes: "Heavy freight diesel used across the former Eastern Bloc."
  },
  {
    code: "4183",
    prefix: "4183",
    name: "MÁV M41",
    nickname: "Csörgő",
    builder: "Ganz, overhaul: Északi Járműjavító",
    era: "1973–1984, refurbished 2002–2007",
    traction: "diesel-electric",
    topSpeed: "100 km/h",
    heating: "train-heating generator fitted",
    count: 35
  },
  {
    code: "418",
    prefix: "418",
    name: "MÁV M41",
    nickname: "Csörgő",
    builder: "Ganz",
    era: "1973–1980",
    traction: "diesel-electric",
    topSpeed: "100 km/h",
    heating: "train-heating generator fitted",
    count: 69
  },
  {
    code: "4083",
    prefix: "4083",
    name: "MÁV M40",
    nickname: "Púpos",
    builder: "Ganz, overhaul: Északi Járműjavító",
    era: "1963–1970",
    traction: "diesel-hydraulic",
    topSpeed: "100 km/h",
    heating: "none",
    count: 3
  },
  {
    code: "408",
    prefix: "408",
    name: "MÁV M40",
    nickname: "Púpos",
    builder: "Ganz",
    era: "1963–1970",
    traction: "diesel-hydraulic",
    topSpeed: "100 km/h",
    heating: "none",
    count: 20
  },
  {
    code: "4485",
    prefix: "4485",
    name: "MÁV M44",
    nickname: "Bobó",
    builder: "Ganz, overhaul: Szolnok",
    era: "1954–1971, refurbished through 2008",
    traction: "diesel-hydraulic",
    topSpeed: "80 km/h",
    heating: "none",
    count: 12
  },
  {
    code: "448",
    prefix: "448",
    name: "MÁV M44",
    nickname: "Bobó",
    builder: "Ganz",
    era: "1954–1971",
    traction: "diesel-hydraulic",
    topSpeed: "80 km/h",
    heating: "none",
    count: 67
  },
  {
    code: "4783",
    prefix: "4783",
    name: "MÁV M47",
    nickname: "Nagy Dácia",
    builder: "Augusztus 23. Művek, overhaul: Északi Járműjavító",
    era: "1974–1979",
    traction: "diesel-hydraulic",
    topSpeed: "70 km/h",
    heating: "none",
    count: 75
  },
  {
    code: "4782",
    prefix: "4782",
    name: "MÁV M47",
    nickname: "Nagy Dácia",
    builder: "Augusztus 23. Művek",
    era: "1974–1979",
    traction: "diesel-hydraulic",
    topSpeed: "70 km/h",
    heating: "none",
    count: 6
  },
  {
    code: "4381",
    prefix: "4381",
    name: "MÁV M43",
    nickname: "Kis Dácia",
    builder: "Augusztus 23. Művek, overhaul: Északi Járműjavító",
    era: "1974–1979",
    traction: "diesel-hydraulic",
    topSpeed: "60 km/h",
    heating: "none",
    count: 2
  },
  {
    code: "438",
    prefix: "438",
    name: "MÁV M43",
    nickname: "Kis Dácia",
    builder: "Augusztus 23. Művek",
    era: "1974–1979",
    traction: "diesel-hydraulic",
    topSpeed: "60 km/h",
    heating: "none",
    count: 31
  },
  {
    code: "2881",
    prefix: "2881",
    name: "MÁV M28",
    nickname: "Mazsola",
    builder: "Rába MVG (Győr)",
    era: "1955–1959",
    traction: "diesel-mechanical",
    topSpeed: "30 km/h",
    heating: "none",
    count: 14
  },
  {
    code: "2882",
    prefix: "2882",
    name: "MÁV M28",
    nickname: "Mazsola",
    builder: "Rába MVG (Győr)",
    era: "1955–1959",
    traction: "diesel-mechanical",
    topSpeed: "50 km/h",
    heating: "none",
    count: 6
  },
  {
    code: "2948",
    prefix: "2948",
    name: "2948 000 (ex-Mk48 000)",
    nickname: "",
    builder: "Rába MVG (Győr)",
    era: "1960–1961",
    traction: "diesel",
    topSpeed: "unknown",
    heating: "none",
    count: 2
  },

  // ---------- Diesel locomotives owned by MÁV Zrt. (infrastructure co.) ----------
  {
    code: "2945",
    prefix: "2945",
    name: "2945 (ex-Mk45 2001–2006)",
    nickname: "",
    builder: "Augusztus 23. Művek, overhaul: Szolnok (some units)",
    era: "built 1973, some refurbished in the 2010s",
    traction: "diesel-hydraulic",
    topSpeed: "40 km/h",
    heating: "none",
    count: 6,
    notes: "Owned by MÁV Zrt. rather than MÁV-Start; individual units 2945 001–006."
  },
  {
    code: "2920",
    prefix: "2920",
    name: "2920 703 (ex-C50 3703)",
    nickname: "",
    builder: "Északi, overhaul: Hűvösvölgy",
    era: "built 1952, refurbished 2011",
    traction: "diesel",
    topSpeed: "30 km/h",
    heating: "none",
    count: 11,
    notes: "Owned by MÁV Zrt.; Hűvösvölgy is the Children's Railway workshop."
  },

  // ---------- Steam locomotives owned by MÁV Zrt. (individually preserved) ----------
  {
    code: "490056",
    prefix: "490056",
    name: "490 056 (preserved steam)",
    nickname: "",
    builder: "MÁV Gépgyár, overhaul: Hűvösvölgy",
    era: "built 1950, refurbished 2002",
    traction: "steam",
    topSpeed: "35 km/h",
    heating: "none",
    count: 1
  },
  {
    code: "490039",
    prefix: "490039",
    name: "490 039 (preserved steam)",
    nickname: "",
    builder: "MÁV Gépgyár, overhaul: Székesfehérvár",
    era: "built 1942, refurbished 2007",
    traction: "steam",
    topSpeed: "35 km/h",
    heating: "none",
    count: 1
  },

  // ---------- Bzmot, kept last on purpose ----------
  // Given an explicit class code (117) rather than a string placeholder, so
  // it behaves consistently with every other entry (e.g. as an object key).
  // It's still matched by numeric range, not prefix — see resolveClass() in
  // app.js — since colloquial Bzmot numbers (e.g. "Bzmot 042") don't embed
  // a class code the way "443 001" does. displayItalic marks it in the UI
  // so it's visually clear this one works differently from the rest.
  {
    code: "117",
    range: { min: 1, max: 205 },
    name: "Bzmot (railbus)",
    unitKind: "DMU",
    displayItalic: true,
    nickname: "",
    builder: "Tatra Studenka",
    era: "1977–1984",
    traction: "diesel-mechanical",
    topSpeed: "80 km/h",
    heating: "none",
    count: 205,
    notes: "MÁV diesel railbus, numbered Bzmot 001–205. Enter just the running number, e.g. \"42\" for Bzmot 042. Given class code 117 here for internal consistency — this isn't an official MÁV class number."
  }
];
