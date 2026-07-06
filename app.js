/* Loco Log — fully offline locomotive-spotting logbook.
 * Storage: IndexedDB. No network calls except optional reverse-geocoding-free
 * raw lat/lon capture via the Geolocation API (also works offline on iOS).
 */

const DB_NAME = "loco-log";
const DB_VERSION = 2;
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
      if (!_db.objectStoreNames.contains("routes")) {
        _db.createObjectStore("routes", { keyPath: "label" });
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

async function deleteKey(storeName, key) {
  const t = tx([storeName], "readwrite");
  const store = t.objectStore(storeName);
  return reqToPromise(store.delete(key));
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
    if (c.prefix && digits.startsWith(c.prefix)) {
      if (!best || c.prefix.length > best.prefix.length) best = c;
    }
  }
  if (best) return best;
  // fallback: plain numeric-range match, for classes (like Bzmot railbuses)
  // whose colloquial running number has no embedded class-code prefix
  const num = parseInt(digits, 10);
  for (const c of classes) {
    if (c.range && num >= c.range.min && num <= c.range.max) return c;
  }
  return null;
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
let rosterMode = "units"; // "units" | "routes"

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
  if (name === "log") updateTint(currentClass);
  else clearTint();
}

document.getElementById("tabbar").addEventListener("click", (e) => {
  const btn = e.target.closest(".tabbtn");
  if (!btn) return;
  showTab(btn.dataset.target);
});

document.getElementById("unitBack").addEventListener("click", () => showTab("roster"));
document.getElementById("routeBack").addEventListener("click", () => showTab("roster"));

/* ---------- LOG tab ---------- */

const numberInput = document.getElementById("numberInput");
const resolvePreview = document.getElementById("resolvePreview");
const nicknameInput = document.getElementById("nicknameInput");
const noteInput = document.getElementById("noteInput");
const routeInput = document.getElementById("routeInput");
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
    clearTint();
    return;
  }
  currentClass = await resolveClass(digits);
  updateTint(currentClass);
  const existingUnit = await reqToPromise(
    tx(["units"], "readonly").objectStore("units").get(normalizeNumber(digits))
  );
  if (existingUnit && existingUnit.nickname) {
    nicknameInput.value = existingUnit.nickname;
  }

  if (currentClass) {
    resolvePreview.className = "resolve-preview match";
    resolvePreview.innerHTML = `
      <div class="rp-class">${formatClassName(currentClass)}${currentClass.nickname ? " — “" + escapeHtml(currentClass.nickname) + "”" : ""}</div>
      <div class="rp-meta">${escapeHtml(currentClass.builder || "")}${currentClass.era ? " · " + escapeHtml(currentClass.era) : ""}</div>
      ${currentClass.topSpeed ? `<div class="rp-meta">Max ${escapeHtml(currentClass.topSpeed)}${currentClass.count ? " · fleet of " + currentClass.count : ""}</div>` : ""}
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

// Some classes (currently just Bzmot) aren't identified by an embedded
// class-code prefix the way real running numbers are — displayItalic marks
// those so the UI visually flags "this one works a bit differently."
function formatClassName(cls) {
  const safe = escapeHtml(cls.name);
  return cls.displayItalic ? `<em>${safe}</em>` : safe;
}

/* ---------- traction tint ---------- */

function updateTint(cls) {
  document.body.classList.remove("tint-diesel", "tint-electric");
  if (!cls || !cls.traction) return;
  const t = cls.traction.toLowerCase();
  if (t.includes("diesel")) {
    document.body.classList.add("tint-diesel");
  } else if (t.includes("electric")) {
    document.body.classList.add("tint-electric");
  }
}

function clearTint() {
  document.body.classList.remove("tint-diesel", "tint-electric");
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

const DUPLICATE_WINDOW_MS = 2 * 60 * 1000; // 2 minutes

async function findRecentDuplicate(number, now) {
  const all = await getAll("encounters");
  const recentSame = all
    .filter((e) => e.unitNumber === number && now - e.timestamp < DUPLICATE_WINDOW_MS)
    .sort((a, b) => b.timestamp - a.timestamp);
  return recentSame[0] || null;
}

logBtn.addEventListener("click", async () => {
  const digits = digitsOnly(numberInput.value);
  if (!digits) return;
  const number = normalizeNumber(digits);
  const now = Date.now();

  const dup = await findRecentDuplicate(number, now);
  if (dup) {
    const secondsAgo = Math.round((now - dup.timestamp) / 1000);
    const ago = secondsAgo < 60 ? `${secondsAgo}s ago` : `${Math.round(secondsAgo / 60)} min ago`;
    if (!confirm(`You already logged ${number} ${ago}. Log it again?`)) {
      logFeedback.className = "log-feedback";
      logFeedback.textContent = "Log cancelled.";
      return;
    }
  }

  logBtn.disabled = true;
  logBtn.textContent = "LOGGING…";
  logFeedback.className = "log-feedback";
  logFeedback.textContent = "";

  let location = null;
  if (document.getElementById("withLocation").checked) {
    location = await getLocation();
  }

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

  const route = routeInput.value.trim();
  const encounter = {
    unitNumber: number,
    timestamp: now,
    lat: location ? location.lat : null,
    lon: location ? location.lon : null,
    note: noteInput.value.trim(),
    route,
  };
  await put("encounters", encounter);
  if (route) {
    await touchRoute(route);
    renderRouteSuggestions();
  }

  logFeedback.textContent = location
    ? "Logged with location."
    : (document.getElementById("withLocation").checked ? "Logged (location unavailable)." : "Logged.");

  noteInput.value = "";
  routeInput.value = "";
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
      const labelHtml = unit && unit.nickname ? escapeHtml(unit.nickname) : cls ? formatClassName(cls) : "Unclassified";
      return `<li class="encounter-row" data-row-id="${enc.id}">
        <span class="row-num">${escapeHtml(enc.unitNumber)}</span>
        <span class="row-main">
          <div class="row-class">${labelHtml}</div>
          <div class="row-sub">${formatDateTime(enc.timestamp)}${enc.lat ? " · GPS" : ""}</div>
          ${enc.route ? `<div class="route-badge">${escapeHtml(enc.route)}</div>` : ""}
        </span>
        <span class="row-actions">
          <button class="btn-delete btn-edit" data-encounter-id="${enc.id}" title="Edit this encounter" aria-label="Edit this encounter">✎</button>
          <button class="btn-delete" data-encounter-id="${enc.id}" title="Delete this encounter" aria-label="Delete this encounter">✕</button>
        </span>
      </li>`;
    })
    .join("");

  list.querySelectorAll(".btn-edit").forEach((btn) => {
    btn.addEventListener("click", () => {
      const row = btn.closest(".encounter-row");
      openEncounterEditor(row, Number(btn.dataset.encounterId), (changed) => {
        renderRecent();
      });
    });
  });

  list.querySelectorAll(".btn-delete:not(.btn-edit)").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await deleteEncounter(Number(btn.dataset.encounterId));
      renderRecent();
    });
  });
}

function formatDateTime(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

/* ---------- delete logic ---------- */

// Deletes one encounter, then recalculates (or removes) its unit's summary
// fields so counts/last-seen stay accurate.
async function deleteEncounter(id) {
  const encounter = await reqToPromise(tx(["encounters"], "readonly").objectStore("encounters").get(id));
  if (!encounter) return;
  await deleteKey("encounters", id);
  if (encounter.route) {
    await untouchRoute(encounter.route);
    renderRouteSuggestions();
  }

  const remaining = (await getAll("encounters")).filter((e) => e.unitNumber === encounter.unitNumber);
  const unit = await reqToPromise(tx(["units"], "readonly").objectStore("units").get(encounter.unitNumber));
  if (!unit) return;

  if (remaining.length === 0) {
    // No sightings left for this unit — remove it too rather than leaving a
    // zero-encounter "ghost" entry in the roster.
    await deleteKey("units", encounter.unitNumber);
  } else {
    unit.encounterCount = remaining.length;
    unit.lastSeen = Math.max(...remaining.map((e) => e.timestamp));
    unit.firstSeen = Math.min(...remaining.map((e) => e.timestamp));
    await put("units", unit);
  }
}

async function deleteUnit(number) {
  const all = await getAll("encounters");
  const owned = all.filter((e) => e.unitNumber === number);
  for (const e of owned) if (e.route) await untouchRoute(e.route);
  const t = tx(["encounters"], "readwrite");
  const store = t.objectStore("encounters");
  for (const e of owned) store.delete(e.id);
  await new Promise((res) => (t.oncomplete = res));
  await deleteKey("units", number);
  renderRouteSuggestions();
}

/* ---------- route/service tags ----------
 * Routes are stored as their own records (like units), so they persist and
 * can be browsed/renamed/deleted independently of any one encounter. A tag
 * is just free text the user types — never prerecorded or validated.
 */

async function touchRoute(label) {
  if (!label) return;
  const existing = await reqToPromise(tx(["routes"], "readonly").objectStore("routes").get(label));
  const rec = existing || { label, count: 0, firstUsed: Date.now() };
  rec.count += 1;
  rec.lastUsed = Date.now();
  await put("routes", rec);
}

async function untouchRoute(label) {
  if (!label) return;
  const existing = await reqToPromise(tx(["routes"], "readonly").objectStore("routes").get(label));
  if (!existing) return;
  existing.count = Math.max(0, existing.count - 1);
  if (existing.count === 0) await deleteKey("routes", label);
  else await put("routes", existing);
}

async function renderRouteSuggestions() {
  const routes = await getAll("routes");
  routes.sort((a, b) => b.lastUsed - a.lastUsed);
  document.getElementById("routeSuggestions").innerHTML = routes
    .map((r) => `<option value="${escapeHtml(r.label)}">`)
    .join("");
}

/* ---------- shared inline edit form for an encounter ---------- */

function encounterEditFormHtml(enc) {
  const locVal = enc.lat != null && enc.lon != null ? `${enc.lat}, ${enc.lon}` : "";
  return `<div class="edit-form">
    <label class="field-label">Note</label>
    <textarea class="text-input ef-note" rows="2">${escapeHtml(enc.note || "")}</textarea>
    <label class="field-label">Route / service</label>
    <input class="text-input ef-route" list="routeSuggestions" maxlength="60" value="${escapeHtml(enc.route || "")}" placeholder="e.g. 30, Kék Hullám, 19707">
    <label class="field-label">Location (lat, lon)</label>
    <input class="text-input ef-loc" value="${escapeHtml(locVal)}" placeholder="leave blank to clear">
    <div class="btn-row" style="margin-top:12px">
      <button type="button" class="btn-secondary ef-cancel">Cancel</button>
      <button type="button" class="btn-primary ef-save" style="margin-top:0">Save</button>
    </div>
  </div>`;
}

// Swaps `rowEl`'s content into an edit form for encounter `encId`.
// `onDone(changed)` is called after Save (changed=true) or Cancel (false)
// so the caller can decide how to re-render.
async function openEncounterEditor(rowEl, encId, onDone) {
  const enc = await reqToPromise(tx(["encounters"], "readonly").objectStore("encounters").get(encId));
  rowEl.innerHTML = encounterEditFormHtml(enc);
  rowEl.querySelector(".ef-cancel").addEventListener("click", () => onDone(false));
  rowEl.querySelector(".ef-save").addEventListener("click", async () => {
    const fresh = await reqToPromise(tx(["encounters"], "readonly").objectStore("encounters").get(encId));
    const oldRoute = fresh.route || "";
    fresh.note = rowEl.querySelector(".ef-note").value.trim();
    const newRoute = rowEl.querySelector(".ef-route").value.trim();
    const locRaw = rowEl.querySelector(".ef-loc").value.trim();
    if (!locRaw) {
      fresh.lat = null;
      fresh.lon = null;
    } else {
      const parts = locRaw.split(",").map((s) => parseFloat(s.trim()));
      if (parts.length === 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
        fresh.lat = parts[0];
        fresh.lon = parts[1];
      }
    }
    fresh.route = newRoute;
    await put("encounters", fresh);
    if (oldRoute !== newRoute) {
      await untouchRoute(oldRoute);
      await touchRoute(newRoute);
      renderRouteSuggestions();
    }
    onDone(true);
  });
}

/* ---------- ROSTER tab ---------- */

document.getElementById("rosterSearch").addEventListener("input", renderRoster);
document.getElementById("rosterSort").addEventListener("change", renderRoster);
document.getElementById("rosterModeToggle").addEventListener("click", (e) => {
  const btn = e.target.closest(".seg-btn");
  if (!btn) return;
  rosterMode = btn.dataset.mode;
  document.querySelectorAll("#rosterModeToggle .seg-btn").forEach((b) => b.classList.toggle("active", b === btn));
  document.getElementById("rosterSearch").placeholder =
    rosterMode === "routes" ? "Search routes/services…" : "Search number, class, nickname…";
  renderRoster();
});

async function renderRoster() {
  if (rosterMode === "routes") return renderRoutesList();

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
      const classLabelHtml = u.nickname ? escapeHtml(u.nickname) : cls ? formatClassName(cls) : "Unclassified";
      return `<li class="roster-row" data-number="${escapeHtml(u.number)}">
        <span class="row-num">${escapeHtml(u.number)}</span>
        <span class="row-main">
          <div class="row-class">${classLabelHtml}</div>
          <div class="row-sub">${cls ? formatClassName(cls) : "Unknown class"} · last seen ${formatDateTime(u.lastSeen)}</div>
        </span>
        <span class="row-count">${u.encounterCount || 0}×</span>
      </li>`;
    })
    .join("");

  list.querySelectorAll(".roster-row").forEach((row) => {
    row.addEventListener("click", () => openUnitDetail(row.dataset.number));
  });
}

async function renderRoutesList() {
  const routes = await getAll("routes");
  const q = document.getElementById("rosterSearch").value.trim().toLowerCase();
  const sortMode = document.getElementById("rosterSort").value;

  let filtered = routes.filter((r) => !q || r.label.toLowerCase().includes(q));
  if (sortMode === "count") filtered.sort((a, b) => b.count - a.count);
  else if (sortMode === "number") filtered.sort((a, b) => a.label.localeCompare(b.label));
  else filtered.sort((a, b) => b.lastUsed - a.lastUsed);

  const list = document.getElementById("rosterList");
  if (filtered.length === 0) {
    list.innerHTML = `<li class="empty-state">No routes or services tagged yet — add one from the Log tab.</li>`;
    return;
  }
  list.innerHTML = filtered
    .map(
      (r) => `<li class="roster-row" data-route="${escapeHtml(r.label)}">
        <span class="row-main">
          <div class="row-class">${escapeHtml(r.label)}</div>
          <div class="row-sub">last used ${formatDateTime(r.lastUsed)}</div>
        </span>
        <span class="row-count">${r.count}×</span>
      </li>`
    )
    .join("");

  list.querySelectorAll(".roster-row").forEach((row) => {
    row.addEventListener("click", () => openRouteDetail(row.dataset.route));
  });
}

async function openRouteDetail(label) {
  const allEnc = await getAll("encounters");
  const tagged = allEnc.filter((e) => e.route === label).sort((a, b) => b.timestamp - a.timestamp);
  const units = await getAll("units");
  const unitMap = Object.fromEntries(units.map((u) => [u.number, u]));
  const classes = await getAll("classes");
  const classMap = Object.fromEntries(classes.map((c) => [c.code, c]));

  const detail = document.getElementById("routeDetail");
  detail.innerHTML = `
    <div class="unit-head" style="font-size:24px">${escapeHtml(label)}</div>
    <div class="unit-class">${tagged.length} logged encounter${tagged.length === 1 ? "" : "s"}</div>

    <label class="field-label" for="routeRename">Rename this route/service</label>
    <input id="routeRename" class="text-input" type="text" value="${escapeHtml(label)}" maxlength="60">
    <button id="saveRouteRename" class="btn-primary" style="margin-top:14px">SAVE</button>
    <div id="routeSaveFeedback" class="log-feedback"></div>

    <h2 class="section-heading">Encounters</h2>
    <div id="routeHistory">
    ${tagged
      .map((e) => {
        const unit = unitMap[e.unitNumber];
        const cls = unit && unit.classCode ? classMap[unit.classCode] : null;
        const label2Html = unit && unit.nickname ? escapeHtml(unit.nickname) : cls ? formatClassName(cls) : "Unclassified";
        return `<div class="history-row" data-row-id="${e.id}">
          <div class="history-row-top">
            <div class="history-time">${escapeHtml(e.unitNumber)} — ${label2Html}<br><span style="color:var(--paper-dim);font-size:11.5px">${formatDateTime(e.timestamp)}</span></div>
            <span class="row-actions">
              <button class="btn-delete btn-edit" data-encounter-id="${e.id}" title="Edit this encounter" aria-label="Edit this encounter">✎</button>
              <button class="btn-delete" data-encounter-id="${e.id}" title="Delete this encounter" aria-label="Delete this encounter">✕</button>
            </span>
          </div>
          ${e.note ? `<div class="history-note">${escapeHtml(e.note)}</div>` : ""}
        </div>`;
      })
      .join("") || `<div class="empty-state">No encounters.</div>`}
    </div>

    <h2 class="section-heading">Danger zone</h2>
    <button id="deleteRouteBtn" class="btn-danger">Remove this tag from all ${tagged.length} encounter(s)</button>
  `;

  document.getElementById("saveRouteRename").addEventListener("click", async () => {
    const newLabel = document.getElementById("routeRename").value.trim();
    const fb = document.getElementById("routeSaveFeedback");
    if (!newLabel) {
      fb.className = "log-feedback err";
      fb.textContent = "Route name can't be empty.";
      return;
    }
    if (newLabel === label) {
      fb.textContent = "No change.";
      return;
    }
    for (const e of tagged) {
      const fresh = await reqToPromise(tx(["encounters"], "readonly").objectStore("encounters").get(e.id));
      fresh.route = newLabel;
      await put("encounters", fresh);
    }
    await deleteKey("routes", label).catch(() => {});
    const existingTarget = await reqToPromise(tx(["routes"], "readonly").objectStore("routes").get(newLabel));
    const rec = existingTarget || { label: newLabel, count: 0, firstUsed: Date.now() };
    rec.count += tagged.length;
    rec.lastUsed = Date.now();
    await put("routes", rec);
    renderRouteSuggestions();
    openRouteDetail(newLabel);
  });

  detail.querySelectorAll(".btn-edit").forEach((btn) => {
    btn.addEventListener("click", () => {
      const row = btn.closest(".history-row");
      openEncounterEditor(row, Number(btn.dataset.encounterId), () => openRouteDetail(label));
    });
  });

  detail.querySelectorAll(".btn-delete:not(.btn-edit)").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await deleteEncounter(Number(btn.dataset.encounterId));
      openRouteDetail(label);
      renderRecent();
    });
  });

  document.getElementById("deleteRouteBtn").addEventListener("click", async () => {
    if (!confirm(`Remove the "${label}" tag from all ${tagged.length} encounter(s)? The encounters themselves are kept — only the tag is cleared.`)) return;
    for (const e of tagged) {
      const fresh = await reqToPromise(tx(["encounters"], "readonly").objectStore("encounters").get(e.id));
      fresh.route = "";
      await put("encounters", fresh);
    }
    await deleteKey("routes", label).catch(() => {});
    renderRouteSuggestions();
    showTab("roster");
    renderRoster();
  });

  showTab("route");
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
    <div class="unit-class">${cls ? formatClassName(cls) + (cls.nickname ? " — “" + escapeHtml(cls.nickname) + "”" : "") : "Unknown class"}</div>
    ${cls && cls.topSpeed ? `<div class="rp-meta" style="margin-bottom:14px">Max ${escapeHtml(cls.topSpeed)} · ${escapeHtml(cls.builder || "")}${cls.era ? " · " + escapeHtml(cls.era) : ""}</div>` : ""}

    <label class="field-label" for="unitNickname">Nickname</label>
    <input id="unitNickname" class="text-input" type="text" value="${escapeHtml(unit.nickname || "")}" maxlength="40">

    <label class="field-label" for="unitNotes">Notes</label>
    <textarea id="unitNotes" class="text-input" rows="3">${escapeHtml(unit.notes || "")}</textarea>

    <button id="saveUnit" class="btn-primary" style="margin-top:14px">SAVE</button>
    <div id="saveFeedback" class="log-feedback"></div>

    <h2 class="section-heading">History (${history.length})</h2>
    <div id="unitHistory">
    ${history
      .map(
        (e) => `<div class="history-row" data-row-id="${e.id}">
          <div class="history-row-top">
            <div class="history-time">${formatDateTime(e.timestamp)}</div>
            <span class="row-actions">
              <button class="btn-delete btn-edit" data-encounter-id="${e.id}" title="Edit this encounter" aria-label="Edit this encounter">✎</button>
              <button class="btn-delete" data-encounter-id="${e.id}" title="Delete this encounter" aria-label="Delete this encounter">✕</button>
            </span>
          </div>
          ${e.lat ? `<div class="history-loc">${e.lat.toFixed(4)}, ${e.lon.toFixed(4)}</div>` : ""}
          ${e.note ? `<div class="history-note">${escapeHtml(e.note)}</div>` : ""}
          ${e.route ? `<div class="route-badge">${escapeHtml(e.route)}</div>` : ""}
        </div>`
      )
      .join("") || `<div class="empty-state">No history.</div>`}
    </div>

    <h2 class="section-heading">Danger zone</h2>
    <button id="deleteUnitBtn" class="btn-danger">Delete this locomotive &amp; all its history</button>
  `;

  document.getElementById("deleteUnitBtn").addEventListener("click", async () => {
    if (!confirm(`Delete ${number} and all ${history.length} logged encounter(s)? This cannot be undone.`)) return;
    await deleteUnit(number);
    showTab("roster");
    renderRoster();
    renderRecent();
  });

  detail.querySelectorAll(".btn-edit").forEach((btn) => {
    btn.addEventListener("click", () => {
      const row = btn.closest(".history-row");
      openEncounterEditor(row, Number(btn.dataset.encounterId), (changed) => {
        openUnitDetail(number);
      });
    });
  });

  detail.querySelectorAll(".btn-delete:not(.btn-edit)").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await deleteEncounter(Number(btn.dataset.encounterId));
      const stillExists = await reqToPromise(tx(["units"], "readonly").objectStore("units").get(number));
      if (stillExists) {
        openUnitDetail(number);
      } else {
        showTab("roster");
        renderRoster();
      }
      renderRecent();
    });
  });
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
        const labelHtml = cls ? formatClassName(cls) : "Unclassified";
        const pct = Math.round((count / max) * 100);
        return `<div class="bar-item">
          <div class="bar-head"><span>${labelHtml}</span><span>${count}</span></div>
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
            <div class="row-sub">${escapeHtml(u.number)}${cls ? " · " + formatClassName(cls) : ""}</div>
          </span>
          <span class="row-count">${u.encounterCount || 0}×</span>
        </li>`;
      })
      .join("") || `<div class="empty-state">Nothing logged yet.</div>`;
}

/* ---------- SETTINGS tab ---------- */

document.getElementById("exportJson").addEventListener("click", async () => {
  const [units, encounters, classes, routes] = await Promise.all([
    getAll("units"),
    getAll("encounters"),
    getAll("classes"),
    getAll("routes"),
  ]);
  downloadBlob(
    JSON.stringify({ exportedAt: Date.now(), units, encounters, classes, routes }, null, 2),
    "loco-log-backup.json",
    "application/json"
  );
});

document.getElementById("exportCsv").addEventListener("click", async () => {
  const encounters = await getAll("encounters");
  const header = "unitNumber,timestamp,iso_date,lat,lon,route,note\n";
  const rows = encounters
    .map((e) =>
      [
        e.unitNumber,
        e.timestamp,
        new Date(e.timestamp).toISOString(),
        e.lat ?? "",
        e.lon ?? "",
        csvEscape(e.route || ""),
        csvEscape(e.note || ""),
      ].join(",")
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
    if (data.routes) for (const r of data.routes) await put("routes", r);
    fb.className = "log-feedback";
    fb.textContent = "Backup imported.";
    renderRecent();
    renderRouteSuggestions();
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
  if (!confirm("Delete all logged locomotives, encounters, and route tags? This cannot be undone.")) return;
  await clearStore("units");
  await clearStore("encounters");
  await clearStore("routes");
  renderRecent();
  renderRoster();
  renderStats();
  renderRouteSuggestions();
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
  await renderRouteSuggestions();

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
