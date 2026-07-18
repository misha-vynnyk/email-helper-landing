import { db, IS_FIREBASE_CONFIGURED } from "./firebase-config.js";
import { FEATURES } from "./features-data.js";
import {
  collection,
  getDocs,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// This is a curtain, not real security: the password lives in this file,
// which ships to every browser as plain JS. Firestore data is already
// public-readable (see firestore.rules) — the point is only to keep casual
// visitors from stumbling onto the raw comment feed, not to guard secrets.
const ADMIN_PASSWORD = "flexibuilder2026";
const SESSION_KEY = "flexibuilder-admin-unlocked";

const gateEl = document.getElementById("admin-gate");
const gateForm = document.getElementById("admin-gate-form");
const gateError = document.getElementById("admin-gate-error");
const passwordInput = document.getElementById("admin-password");
const contentEl = document.getElementById("admin-content");
const noticeEl = document.getElementById("admin-notice");
const listEl = document.getElementById("admin-list");
const metaEl = document.getElementById("admin-meta");
const sortEl = document.getElementById("admin-sort");
const loadingEl = document.getElementById("admin-loading");

let entries = [];

function unlock() {
  gateEl.hidden = true;
  contentEl.hidden = false;
  loadAdmin();
}

gateForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (passwordInput.value === ADMIN_PASSWORD) {
    sessionStorage.setItem(SESSION_KEY, "1");
    unlock();
  } else {
    gateError.textContent = "Невірний пароль";
    passwordInput.value = "";
    passwordInput.focus();
  }
});

if (sessionStorage.getItem(SESSION_KEY) === "1") {
  unlock();
}

async function loadCustomFeatures() {
  const q = query(collection(db, "features"), where("predefined", "==", false));
  const snap = await getDocs(q);
  const custom = [];
  snap.forEach((d) => custom.push({ id: d.id, ...d.data() }));
  return custom;
}

async function loadRatings(featureId) {
  const snap = await getDocs(collection(db, "features", featureId, "ratings"));
  const ratings = [];
  snap.forEach((d) => ratings.push(d.data()));
  ratings.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  return ratings;
}

function formatDate(timestamp) {
  if (!timestamp?.seconds) return "";
  return new Date(timestamp.seconds * 1000).toLocaleString("uk-UA", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function renderFeature(feature, ratings, avg, count) {
  const card = document.createElement("article");
  card.className = "card admin-feature";

  const head = document.createElement("div");
  head.className = "admin-feature__head";
  head.innerHTML = `
    <h2>${feature.title}</h2>
    <span class="admin-feature__avg">${count ? `${avg.toFixed(1)} ★ · ${count} ${count === 1 ? "оцінка" : "оцінок"}` : "ще немає оцінок"}</span>
  `;
  card.appendChild(head);

  if (feature.module) {
    const mod = document.createElement("div");
    mod.className = "admin-feature__module";
    mod.textContent = feature.module;
    card.appendChild(mod);
  }

  if (!count) {
    const empty = document.createElement("div");
    empty.className = "admin-no-ratings";
    empty.textContent = "Ще немає оцінок для цієї фічі.";
    card.appendChild(empty);
    listEl.appendChild(card);
    return;
  }

  const list = document.createElement("div");
  list.className = "admin-rating-list";
  ratings.forEach((r) => {
    const item = document.createElement("div");
    item.className = "admin-rating-item";
    const hasComment = r.comment && r.comment.trim();
    item.innerHTML = `
      <span class="admin-rating-item__score">${r.score ?? "–"}</span>
      <div class="admin-rating-item__body">
        <p class="admin-rating-item__comment${hasComment ? "" : " admin-rating-item__comment--empty"}">${hasComment ? escapeHtml(r.comment) : "без коментаря"
      }</p>
        <span class="admin-rating-item__date">${formatDate(r.createdAt)}</span>
      </div>
    `;
    list.appendChild(item);
  });
  card.appendChild(list);

  listEl.appendChild(card);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

const SORTERS = {
  default: (a, b) => a.order - b.order,
  "avg-desc": (a, b) => b.avg - a.avg || b.count - a.count,
  "avg-asc": (a, b) => (a.count ? a.avg : Infinity) - (b.count ? b.avg : Infinity) || a.order - b.order,
  "count-desc": (a, b) => b.count - a.count || b.avg - a.avg,
  recent: (a, b) => (b.lastRatingAt || 0) - (a.lastRatingAt || 0),
  title: (a, b) => a.feature.title.localeCompare(b.feature.title, "uk"),
};

function renderList() {
  const sorted = [...entries].sort(SORTERS[sortEl.value] || SORTERS.default);
  listEl.innerHTML = "";
  sorted.forEach(({ feature, ratings, avg, count }) => renderFeature(feature, ratings, avg, count));
}

sortEl.addEventListener("change", renderList);

async function loadAdmin() {
  if (!IS_FIREBASE_CONFIGURED) {
    loadingEl.hidden = true;
    noticeEl.textContent = "Firebase ще не налаштовано — немає даних для показу.";
    noticeEl.hidden = false;
    return;
  }

  loadingEl.hidden = false;
  listEl.innerHTML = "";

  let custom = [];
  try {
    custom = await loadCustomFeatures();
  } catch (err) {
    console.error("Не вдалося завантажити запропоновані фічі", err);
  }
  const allFeatures = [...FEATURES, ...custom];

  // Fetch every feature's ratings in parallel — sequential awaits here left
  // #admin-list empty for a couple seconds with zero loading feedback, which
  // read as "sorting is broken" if you touched the select during that gap.
  const results = await Promise.allSettled(allFeatures.map((feature) => loadRatings(feature.id)));

  entries = [];
  let totalRatings = 0;
  results.forEach((result, i) => {
    const feature = allFeatures[i];
    if (result.status === "rejected") {
      console.error(`Не вдалося завантажити оцінки для ${feature.id}`, result.reason);
      return;
    }
    const ratings = result.value;
    const count = ratings.length;
    const avg = count ? ratings.reduce((sum, r) => sum + (r.score || 0), 0) / count : 0;
    const lastRatingAt = ratings.reduce((max, r) => Math.max(max, r.createdAt?.seconds || 0), 0);
    totalRatings += count;
    entries.push({ feature, ratings, avg, count, lastRatingAt, order: i });
  });

  metaEl.textContent = `${totalRatings} ${totalRatings === 1 ? "оцінка" : "оцінок"} · ${allFeatures.length} ${
    allFeatures.length === 1 ? "фіча" : "фіч"
  }`;
  loadingEl.hidden = true;
  renderList();
}
