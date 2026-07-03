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
    code: "460",
    prefix: "460",
    name: "V46 (460)",
    nickname: "Szöcske",
    builder: "Ganz-MÁVAG / Ganz Villamossági Művek",
    era: "1983–1992",
    traction: "electric",
    notes: "Shunting locomotive, unable to heat cars on its own."
  },
  {
    code: "431",
    prefix: "431",
    name: "V43 (431)",
    nickname: "Szili",
    builder: "Ganz-MÁVAG",
    era: "1963-1982",
    traction: "electric",
    notes: "The original batch, analog control."
  },
  {
    code: "432",
    prefix: "432",
    name: "V43",
    nickname: "Szili",
    builder: "Ganz-MÁVAG",
    era: "1999-2007",
    traction: "electric",
    notes: "V6EE-rebuilt V43s with digital remote control, compatible with BDt control cars."
  },
  {
    code: "433",
    prefix: "433",
    name: "V43",
    nickname: "Szili",
    builder: "Ganz-MÁVAG",
    era: "2007-2008",
    traction: "electric",
    notes: "Updated control schema, compatible with Hlabesrtadt type control cars."
  },
  {
    code: "630",
    prefix: "630",
    name: "V63",
    nickname: "Gigant",
    builder: "Ganz-MÁVAG",
    era: "1975-1992",
    traction: "electric",
    notes: "6 axle heavy freight locomotive"
  },
  {
    code: "480",
    prefix: "480",
    name: "Bombardier TRAXX",
    nickname: "TRAXX",
    builder: "Bombardier",
    era: "2010-2012",
    traction: "electric, multi-system",
    notes: "MÁV-START's newer InterCity electric fleet."
  },
  {
    code: "470",
    prefix: "470",
    name: "Siemens Eurosprinter",
    nickname: "Taurus",
    builder: "Siemens",
    era: "2002-2006",
    traction: "electric",
    notes: "Most powrful locomotive in MÁV fleet, also used by ÖBB"
  }
];
