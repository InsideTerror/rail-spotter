/*
 * STARTER reference data — locomotive classes, matched by running-number prefix.
 *
 * IMPORTANT: this is a small, hand-picked seed, not an exhaustive or
 * guaranteed-current roster. Verify and expand it yourself before relying on
 * it — good sources: hu.wikipedia.org "MÁV mozdonysorozatok", vasutikocsi.hu,
 * vonatosszeallitas.hu. Edit the array below (or import a JSON file of the
 * same shape from Settings) to add classes.
 *
 * "prefix" is matched against the digits-only running number, longest
 * prefix wins, so more specific entries (e.g. "4802" for a sub-batch) can
 * coexist with a shorter general one (e.g. "480").
 */
const SEED_LOCO_CLASSES = [
  {
    code: "431",
    prefix: "431",
    name: "V43 (431)",
    nickname: "Szili",
    builder: "Ganz-MÁVAG / Ganz Villamossági Művek",
    era: "1963–1982",
    traction: "electric",
    notes: "Hungary's most numerous electric loco class. Original analogue-control batch."
  },
  {
    code: "432",
    prefix: "432",
    name: "V43 (432)",
    nickname: "Szili",
    builder: "Ganz-MÁVAG (rebuilt)",
    era: "modernised from 1999",
    traction: "electric",
    notes: "V6EE-rebuilt V43s with digital remote control, compatible with BDt control cars."
  },
  {
    code: "430",
    prefix: "430",
    name: "M43",
    nickname: "Bobó",
    builder: "Ganz-MÁVAG",
    era: "1962–1966",
    traction: "diesel-electric",
    notes: "Shunting and light mainline duty."
  },
  {
    code: "628",
    prefix: "628",
    name: "M62",
    nickname: "Szergej",
    builder: "Voroshilovgrad (Luhansk), USSR",
    era: "1965–1974 (delivery to MÁV)",
    traction: "diesel-electric",
    notes: "Heavy freight diesel, widely used across the former Eastern Bloc."
  },
  {
    code: "480",
    prefix: "480",
    name: "Siemens Vectron MS",
    nickname: "",
    builder: "Siemens Mobility",
    era: "2015–present",
    traction: "electric, multi-system",
    notes: "MÁV-START's newer InterCity electric fleet."
  },
  {
    code: "418",
    prefix: "418",
    name: "M41",
    nickname: "",
    builder: "Ganz-MÁVAG / MÁVAG",
    era: "1963–1975",
    traction: "diesel-electric",
    notes: "Regional/branch-line diesel loco."
  }
];
