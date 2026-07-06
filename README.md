# Loco Log

[![Status - Operational](https://img.shields.io/badge/Status-Operational-2ea44f)](https://rail-spotter.vercel.app/)

An offline-first locomotive-spotting logbook. Identify a class from a running
number, log an encounter (time + optional GPS, automatically), give
individual locomotives nicknames, and see stats: unique locos seen, per-class
frequency, and your top 5 most-encountered units.

Everything is stored locally in the browser's IndexedDB. No server, no
account, no data leaves the device.

## Try it locally first (on your Linux machine)

```bash
cd loco-log
python3 -m http.server 8000
```

Open `http://localhost:8000` in a desktop browser. Service workers are
allowed on `localhost` without HTTPS, so this is a faithful test of the
offline behavior — open it once, then try disabling your network connection
and reloading.

## Getting it onto your iPhone (no Mac required)

iOS Safari requires the page to be served over **HTTPS** (not just your LAN)
before "Add to Home Screen" will register the service worker and make it
installable. The easiest free route from Linux is **GitHub Pages**:

1. Create a new GitHub repository (public or private both work).
2. Push this folder's contents to it:
   ```bash
   git init
   git add .
   git commit -m "Loco Log"
   git branch -M main
   git remote add origin https://github.com/<you>/loco-log.git
   git push -u origin main
   ```
3. In the repo on GitHub: **Settings → Pages → Source → Deploy from branch →
   main / (root)**. Save.
4. After a minute, GitHub gives you a URL like
   `https://<you>.github.io/loco-log/`.
5. On your iPhone, open that URL in **Safari** (must be Safari, not another
   browser, for "Add to Home Screen" to create an installable app).
6. Tap the Share icon → **Add to Home Screen**.
7. Launch it from the home screen icon from now on — after that first load,
   it works with airplane mode on, no wifi or signal needed at all.

If you'd rather not use GitHub, any static host works the same way
(Netlify, Cloudflare Pages, Vercel) — just drag-and-drop this folder.

## Editing the locomotive class reference data

`data.js` ships with a small, hand-picked starter set (V43, M43, M62, Vectron,
M41) — **not** a verified, exhaustive roster. Before relying on it, check it
against a proper source (Hungarian Wikipedia's "MÁV mozdonysorozatok",
vasutikocsi.hu, vonatosszeallitas.hu) and expand it. Each entry looks like:

```js
{
  code: "480",        // internal id, must be unique
  prefix: "480",       // matched against the digits-only running number
  name: "Siemens Vectron MS",
  nickname: "",
  builder: "Siemens Mobility",
  era: "2015–present",
  traction: "electric, multi-system",
  notes: "…"
}
```

Longer prefixes win over shorter ones, so you can add a specific sub-batch
(e.g. `"4321"`) alongside a general class (`"432"`) if a particular sub-series
deserves its own entry.

You can also update the class list without redeploying: **Settings → Import
classes JSON**, pointing at a JSON file that's either a plain array of
objects in the shape above, or `{ "classes": [...] }`.

## Backing up your data

**Settings → Export JSON** downloads everything (units, encounters, and your
current class list) as one file — re-import it any time via **Settings →
Import JSON backup**, including after reinstalling the app or moving to a
new phone. **Export encounters (CSV)** gives you just the sighting log for
use in a spreadsheet.
