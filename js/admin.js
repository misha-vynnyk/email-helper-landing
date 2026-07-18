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

function renderFeature(feature, ratings) {
  const card = document.createElement("article");
  card.className = "card admin-feature";

  const count = ratings.length;
  const avg = count ? ratings.reduce((sum, r) => sum + (r.score || 0), 0) / count : 0;

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

async function loadAdmin() {
  if (!IS_FIREBASE_CONFIGURED) {
    noticeEl.textContent = "Firebase ще не налаштовано — немає даних для показу.";
    noticeEl.hidden = false;
    return;
  }

  listEl.innerHTML = "";
  let custom = [];
  try {
    custom = await loadCustomFeatures();
  } catch (err) {
    console.error("Не вдалося завантажити запропоновані фічі", err);
  }
  const allFeatures = [...FEATURES, ...custom];

  let totalRatings = 0;
  for (const feature of allFeatures) {
    try {
      const ratings = await loadRatings(feature.id);
      totalRatings += ratings.length;
      renderFeature(feature, ratings);
    } catch (err) {
      console.error(`Не вдалося завантажити оцінки для ${feature.id}`, err);
    }
  }

  metaEl.textContent = `${totalRatings} ${totalRatings === 1 ? "оцінка" : "оцінок"} · ${allFeatures.length} ${allFeatures.length === 1 ? "фіча" : "фіч"
    }`;
}
