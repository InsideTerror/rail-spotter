/* Loco Log — fully offline locomotive-spotting logbook.
 * Storage: IndexedDB. No network calls except optional reverse-geocoding-free
 * raw lat/lon capture via the Geolocation API (also works offline on iOS).
 */

const DB_NAME = "loco-log";
const DB_VERSION = 1;
let db;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const _db = e.target.result;
      if (!_db.objectStoreNames.contains("classes")) {
        _db.createObjectStore("classes", { keyPath: "code" });
      }
      if (!_db.objectStoreNames.contains("units")) {
        _db.createObjectStore("units", { keyPath: "number" });
      }
      if (!_db.objectStoreNames.contains("encounters")) {
        const store = _db.createObjectStore("encounters", { keyPath: "id", autoIncrement: true });
        store.createIndex("byUnit", "unitNumber", { unique: false });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

function tx(storeNames, mode) {
  return db.transaction(storeNames, mode);
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getAll(storeName) {
  const store = tx([storeName], "readonly").objectStore(storeName);
  return reqToPromise(store.getAll());
}

async function put(storeName, value) {
  const t = tx([storeName], "readwrite");
  const store = t.objectStore(storeName);
  return reqToPromise(store.put(value));
}

async function clearStore(storeName) {
  const t = tx([storeName], "readwrite");
  return reqToPromise(t.objectStore(storeName).clear());
}

async function seedClassesIfEmpty() {
  const existing = await getAll("classes");
  if (existing.length === 0) {
    const t = tx(["classes"], "readwrite");
    const store = t.objectStore("classes");
    for (const c of SEED_LOCO_CLASSES) store.put(c);
    await new Promise((res) => (t.oncomplete = res));
  }
}

/* ---------- class resolution ---------- */

function digitsOnly(str) {
  return (str || "").replace(/\D/g, "");
}

async function resolveClass(rawNumber) {
  const digits = digitsOnly(rawNumber);
  if (!digits) return null;
  const classes = await getAll("classes");
  // longest matching prefix wins
  let best = null;
  for (const c of classes) {
    if (digits.startsWith(c.prefix)) {
      if (!best || c.prefix.length > best.prefix.length) best = c;
    }
  }
  return best;
}

function normalizeNumber(raw) {
  const digits = digitsOnly(raw);
  if (!digits) return "";
  // Format as "NNN NNN" (loco class + running number), keep any remainder.
  if (digits.length <= 3) return digits;
  return digits.slice(0, 3) + " " + digits.slice(3);
}

/* ---------- app state ---------- */

let currentClass = null;
let selectedUnitNumber = null;

/* ---------- tabs ---------- */

function showTab(name) {
  document.querySelectorAll(".tab").forEach((el) => {
    el.classList.toggle("hidden", el.dataset.tab !== name);
  });
  document.querySelectorAll(".tabbtn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.target === name);
  });
  if (name === "roster") renderRoster();
  if (name === "stats") renderStats();
}

document.getElementById("tabbar").addEventListener("click", (e) => {
  const btn = e.target.closest(".tabbtn");
  if (!btn) return;
  showTab(btn.dataset.target);
});

document.getElementById("unitBack").addEventListener("click", () => showTab("roster"));

/* ---------- LOG tab ---------- */

const numberInput = document.getElementById("numberInput");
const resolvePreview = document.getElementById("resolvePreview");
const nicknameInput = document.getElementById("nicknameInput");
const noteInput = document.getElementById("noteInput");
const logBtn = document.getElementById("logBtn");
const logFeedback = document.getElementById("logFeedback");

numberInput.addEventListener("input", onNumberInput);

async function onNumberInput() {
  const digits = digitsOnly(numberInput.value);
  if (!digits) {
    resolvePreview.className = "resolve-preview empty";
    resolvePreview.innerHTML = `<span class="rp-hint">Enter a number to identify the class.</span>`;
    logBtn.disabled = true;
    currentClass = null;
    nicknameInput.value = "";
    return;
  }
  currentClass = await resolveClass(digits);
  const existingUnit = await reqToPromise(
    tx(["units"], "readonly").objectStore("units").get(normalizeNumber(digits))
  );
  if (existingUnit && existingUnit.nickname) {
    nicknameInput.value = existingUnit.nickname;
  }

  if (currentClass) {
    resolvePreview.className = "resolve-preview match";
    resolvePreview.innerHTML = `
      <div class="rp-class">${escapeHtml(currentClass.name)}${currentClass.nickname ? " — “" + escapeHtml(currentClass.nickname) + "”" : ""}</div>
      <div class="rp-meta">${escapeHtml(currentClass.builder || "")}${currentClass.era ? " · " + escapeHtml(currentClass.era) : ""}</div>
      ${existingUnit ? `<div class="rp-meta">Seen ${existingUnit.encounterCount || 0}× before</div>` : `<div class="rp-meta">New unit</div>`}
    `;
  } else {
    resolvePreview.className = "resolve-preview nomatch";
    resolvePreview.innerHTML = `<div class="rp-class">Unknown class</div><div class="rp-meta">No matching prefix in reference data — you can still log it.</div>`;
  }
  logBtn.disabled = false;
}

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

async function getLocation(timeoutMs = 6000) {
  if (!("geolocation" in navigator)) return null;
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(null), timeoutMs);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(t);
        resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      () => {
        clearTimeout(t);
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 15000 }
    );
  });
}

logBtn.addEventListener("click", async () => {
  const digits = digitsOnly(numberInput.value);
  if (!digits) return;
  const number = normalizeNumber(digits);
  logBtn.disabled = true;
  logBtn.textContent = "LOGGING…";
  logFeedback.className = "log-feedback";
  logFeedback.textContent = "";

  let location = null;
  if (document.getElementById("withLocation").checked) {
    location = await getLocation();
  }

  const now = Date.now();
  let unit = await reqToPromise(tx(["units"], "readonly").objectStore("units").get(number));
  const nickname = nicknameInput.value.trim();

  if (!unit) {
    unit = {
      number,
      classCode: currentClass ? currentClass.code : null,
      nickname,
      notes: "",
      firstSeen: now,
      lastSeen: now,
      encounterCount: 1,
    };
  } else {
    unit.lastSeen = now;
    unit.encounterCount = (unit.encounterCount || 0) + 1;
    if (nickname) unit.nickname = nickname;
    if (!unit.classCode && currentClass) unit.classCode = currentClass.code;
  }
  await put("units", unit);

  const encounter = {
    unitNumber: number,
    timestamp: now,
    lat: location ? location.lat : null,
    lon: location ? location.lon : null,
    note: noteInput.value.trim(),
  };
  await put("encounters", encounter);

  logFeedback.textContent = location
    ? "Logged with location."
    : (document.getElementById("withLocation").checked ? "Logged (location unavailable)." : "Logged.");

  noteInput.value = "";
  logBtn.textContent = "LOG ENCOUNTER";
  logBtn.disabled = false;
  renderRecent();
});

async function renderRecent() {
  const encounters = await getAll("encounters");
  encounters.sort((a, b) => b.timestamp - a.timestamp);
  const recent = encounters.slice(0, 8);
  const list = document.getElementById("recentList");
  if (recent.length === 0) {
    list.innerHTML = `<li class="empty-state">No encounters logged yet.</li>`;
    return;
  }
  const units = await getAll("units");
  const unitMap = Object.fromEntries(units.map((u) => [u.number, u]));
  const classes = await getAll("classes");
  const classMap = Object.fromEntries(classes.map((c) => [c.code, c]));

  list.innerHTML = recent
    .map((enc) => {
      const unit = unitMap[enc.unitNumber];
      const cls = unit && unit.classCode ? classMap[unit.classCode] : null;
      const label = unit && unit.nickname ? unit.nickname : cls ? cls.name : "Unclassified";
      return `<li class="encounter-row">
        <span class="row-num">${escapeHtml(enc.unitNumber)}</span>
        <span class="row-main">
          <div class="row-class">${escapeHtml(label)}</div>
          <div class="row-sub">${formatDateTime(enc.timestamp)}${enc.lat ? " · GPS" : ""}</div>
        </span>
      </li>`;
    })
    .join("");
}

function formatDateTime(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

/* ---------- ROSTER tab ---------- */

document.getElementById("rosterSearch").addEventListener("input", renderRoster);
document.getElementById("rosterSort").addEventListener("change", renderRoster);

async function renderRoster() {
  const units = await getAll("units");
  const classes = await getAll("classes");
  const classMap = Object.fromEntries(classes.map((c) => [c.code, c]));
  const q = document.getElementById("rosterSearch").value.trim().toLowerCase();
  const sortMode = document.getElementById("rosterSort").value;

  let filtered = units.filter((u) => {
    const cls = u.classCode ? classMap[u.classCode] : null;
    const hay = [u.number, u.nickname, cls && cls.name, cls && cls.nickname]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return !q || hay.includes(q);
  });

  if (sortMode === "recent") filtered.sort((a, b) => b.lastSeen - a.lastSeen);
  else if (sortMode === "count") filtered.sort((a, b) => (b.encounterCount || 0) - (a.encounterCount || 0));
  else filtered.sort((a, b) => a.number.localeCompare(b.number));

  const list = document.getElementById("rosterList");
  if (filtered.length === 0) {
    list.innerHTML = `<li class="empty-state">No locomotives match.</li>`;
    return;
  }
  list.innerHTML = filtered
    .map((u) => {
      const cls = u.classCode ? classMap[u.classCode] : null;
      return `<li class="roster-row" data-number="${escapeHtml(u.number)}">
        <span class="row-num">${escapeHtml(u.number)}</span>
        <span class="row-main">
          <div class="row-class">${escapeHtml(u.nickname || (cls ? cls.name : "Unclassified"))}</div>
          <div class="row-sub">${cls ? escapeHtml(cls.name) : "Unknown class"} · last seen ${formatDateTime(u.lastSeen)}</div>
        </span>
        <span class="row-count">${u.encounterCount || 0}×</span>
      </li>`;
    })
    .join("");

  list.querySelectorAll(".roster-row").forEach((row) => {
    row.addEventListener("click", () => openUnitDetail(row.dataset.number));
  });
}

async function openUnitDetail(number) {
  selectedUnitNumber = number;
  const unit = await reqToPromise(tx(["units"], "readonly").objectStore("units").get(number));
  const classes = await getAll("classes");
  const classMap = Object.fromEntries(classes.map((c) => [c.code, c]));
  const cls = unit.classCode ? classMap[unit.classCode] : null;

  const allEnc = await getAll("encounters");
  const history = allEnc
    .filter((e) => e.unitNumber === number)
    .sort((a, b) => b.timestamp - a.timestamp);

  const detail = document.getElementById("unitDetail");
  detail.innerHTML = `
    <div class="unit-head">${escapeHtml(number)}</div>
    <div class="unit-class">${cls ? escapeHtml(cls.name) + (cls.nickname ? " — “" + escapeHtml(cls.nickname) + "”" : "") : "Unknown class"}</div>

    <label class="field-label" for="unitNickname">Nickname</label>
    <input id="unitNickname" class="text-input" type="text" value="${escapeHtml(unit.nickname || "")}" maxlength="40">

    <label class="field-label" for="unitNotes">Notes</label>
    <textarea id="unitNotes" class="text-input" rows="3">${escapeHtml(unit.notes || "")}</textarea>

    <button id="saveUnit" class="btn-primary" style="margin-top:14px">SAVE</button>
    <div id="saveFeedback" class="log-feedback"></div>

    <h2 class="section-heading">History (${history.length})</h2>
    ${history
      .map(
        (e) => `<div class="history-row">
          <div class="history-time">${formatDateTime(e.timestamp)}</div>
          ${e.lat ? `<div class="history-loc">${e.lat.toFixed(4)}, ${e.lon.toFixed(4)}</div>` : ""}
          ${e.note ? `<div class="history-note">${escapeHtml(e.note)}</div>` : ""}
        </div>`
      )
      .join("") || `<div class="empty-state">No history.</div>`}
  `;

  document.getElementById("saveUnit").addEventListener("click", async () => {
    unit.nickname = document.getElementById("unitNickname").value.trim();
    unit.notes = document.getElementById("unitNotes").value.trim();
    await put("units", unit);
    document.getElementById("saveFeedback").textContent = "Saved.";
  });

  showTab("unit");
}

/* ---------- STATS tab ---------- */

async function renderStats() {
  const units = await getAll("units");
  const encounters = await getAll("encounters");
  const classes = await getAll("classes");
  const classMap = Object.fromEntries(classes.map((c) => [c.code, c]));

  document.getElementById("statSummary").innerHTML = `
    <div class="stat-tile"><div class="stat-num">${units.length}</div><div class="stat-label">Unique locos</div></div>
    <div class="stat-tile"><div class="stat-num">${encounters.length}</div><div class="stat-label">Total encounters</div></div>
  `;

  const byClass = {};
  for (const u of units) {
    const key = u.classCode || "unknown";
    byClass[key] = (byClass[key] || 0) + (u.encounterCount || 1);
  }
  const rows = Object.entries(byClass).sort((a, b) => b[1] - a[1]);
  const max = rows.length ? rows[0][1] : 1;

  document.getElementById("classBars").innerHTML =
    rows
      .map(([code, count]) => {
        const cls = classMap[code];
        const label = cls ? cls.name : "Unclassified";
        const pct = Math.round((count / max) * 100);
        return `<div class="bar-item">
          <div class="bar-head"><span>${escapeHtml(label)}</span><span>${count}</span></div>
          <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
        </div>`;
      })
      .join("") || `<div class="empty-state">Log a locomotive to see stats.</div>`;

  const top = [...units].sort((a, b) => (b.encounterCount || 0) - (a.encounterCount || 0)).slice(0, 5);
  document.getElementById("topFive").innerHTML =
    top
      .map((u, i) => {
        const cls = u.classCode ? classMap[u.classCode] : null;
        return `<li class="top-item">
          <span class="top-rank">${i + 1}</span>
          <span class="row-main">
            <div class="row-class">${escapeHtml(u.nickname || u.number)}</div>
            <div class="row-sub">${escapeHtml(u.number)}${cls ? " · " + escapeHtml(cls.name) : ""}</div>
          </span>
          <span class="row-count">${u.encounterCount || 0}×</span>
        </li>`;
      })
      .join("") || `<div class="empty-state">Nothing logged yet.</div>`;
}

/* ---------- SETTINGS tab ---------- */

document.getElementById("exportJson").addEventListener("click", async () => {
  const [units, encounters, classes] = await Promise.all([getAll("units"), getAll("encounters"), getAll("classes")]);
  downloadBlob(
    JSON.stringify({ exportedAt: Date.now(), units, encounters, classes }, null, 2),
    "loco-log-backup.json",
    "application/json"
  );
});

document.getElementById("exportCsv").addEventListener("click", async () => {
  const encounters = await getAll("encounters");
  const header = "unitNumber,timestamp,iso_date,lat,lon,note\n";
  const rows = encounters
    .map((e) =>
      [e.unitNumber, e.timestamp, new Date(e.timestamp).toISOString(), e.lat ?? "", e.lon ?? "", csvEscape(e.note || "")].join(",")
    )
    .join("\n");
  downloadBlob(header + rows, "loco-log-encounters.csv", "text/csv");
});

function csvEscape(s) {
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

document.getElementById("importFile").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const fb = document.getElementById("importFeedback");
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (data.units) for (const u of data.units) await put("units", u);
    if (data.encounters) for (const enc of data.encounters) await put("encounters", enc);
    if (data.classes) for (const c of data.classes) await put("classes", c);
    fb.className = "log-feedback";
    fb.textContent = "Backup imported.";
    renderRecent();
  } catch (err) {
    fb.className = "log-feedback err";
    fb.textContent = "Could not read that file: " + err.message;
  }
  e.target.value = "";
});

document.getElementById("importClasses").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const list = Array.isArray(data) ? data : data.classes;
    for (const c of list) await put("classes", c);
    await renderClassCount();
  } catch (err) {
    alert("Could not read that file: " + err.message);
  }
  e.target.value = "";
});

document.getElementById("clearAll").addEventListener("click", async () => {
  if (!confirm("Delete all logged locomotives and encounters? This cannot be undone.")) return;
  await clearStore("units");
  await clearStore("encounters");
  renderRecent();
  renderRoster();
  renderStats();
  alert("All logged data cleared.");
});

async function renderClassCount() {
  const classes = await getAll("classes");
  document.getElementById("classCount").textContent = classes.length + " classes";
}

/* ---------- boot ---------- */

(async function init() {
  db = await openDb();
  await seedClassesIfEmpty();
  await renderRecent();
  await renderClassCount();

  if (!("geolocation" in navigator)) {
    document.getElementById("withLocation").checked = false;
    document.getElementById("withLocation").disabled = true;
  }

  if (!navigator.onLine) {
    document.getElementById("statusDot").classList.add("offline");
  }
  window.addEventListener("online", () => document.getElementById("statusDot").classList.remove("offline"));
  window.addEventListener("offline", () => document.getElementById("statusDot").classList.add("offline"));

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
