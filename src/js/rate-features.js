import { db, IS_FIREBASE_CONFIGURED } from "./firebase-config.js";
import { FEATURES } from "./features-data.js";
import {
  collection,
  doc,
  setDoc,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const listEl = document.getElementById("rate-list");
const noticeEl = document.getElementById("rate-notice");
const suggestForm = document.getElementById("suggest-form");
const suggestStatus = document.getElementById("suggest-status");

// No login, so "already rated" can only be tracked client-side — a user
// clearing localStorage or switching browsers can rate again. Good enough
// for an internal team survey, not a fraud-proof vote.
const RATED_STORAGE_KEY = "flexibuilder-rated-features";

function getRatedMap() {
  try {
    return JSON.parse(localStorage.getItem(RATED_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function markRated(featureId, score) {
  const map = getRatedMap();
  map[featureId] = score;
  localStorage.setItem(RATED_STORAGE_KEY, JSON.stringify(map));
}

async function getAggregate(featureId) {
  const ratingsSnap = await getDocs(collection(db, "features", featureId, "ratings"));
  let sum = 0;
  ratingsSnap.forEach((d) => {
    sum += d.data().score || 0;
  });
  const count = ratingsSnap.size;
  return { average: count ? sum / count : 0, count };
}

function renderScorePicker(featureId) {
  const wrap = document.createElement("div");
  wrap.className = "score-picker";
  for (let i = 1; i <= 5; i++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "score-picker__btn";
    btn.textContent = String(i);
    btn.dataset.score = String(i);
    btn.addEventListener("click", () => {
      wrap.querySelectorAll(".score-picker__btn").forEach((b) => b.classList.remove("is-selected"));
      btn.classList.add("is-selected");
      wrap.dataset.selected = String(i);
    });
    wrap.appendChild(btn);
  }
  return wrap;
}

function renderCard(feature) {
  const card = document.createElement("article");
  card.className = "card rate-card";

  const head = document.createElement("div");
  head.className = "rate-card__head";

  const titleWrap = document.createElement("div");
  const titleRow = document.createElement("div");
  titleRow.className = "rate-card__title";
  const h3 = document.createElement("h3");
  h3.textContent = `${feature.icon || "⭐"} ${feature.title}`;
  titleRow.appendChild(h3);
  if (feature.enabled === false) {
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = "🚧 вимкнено";
    titleRow.appendChild(badge);
  }
  titleWrap.appendChild(titleRow);
  if (feature.module) {
    const mod = document.createElement("div");
    mod.className = "rate-card__module";
    mod.textContent = feature.module;
    titleWrap.appendChild(mod);
  }
  const desc = document.createElement("p");
  desc.className = "rate-card__desc";
  desc.textContent = feature.description || "";
  titleWrap.appendChild(desc);
  head.appendChild(titleWrap);

  const stats = document.createElement("div");
  stats.className = "rate-card__stats";
  stats.innerHTML = `<span class="rate-card__avg">–</span><span class="rate-card__count">0 оцінок</span>`;
  head.appendChild(stats);

  card.appendChild(head);

  const formArea = document.createElement("div");
  card.appendChild(formArea);

  const existingScore = getRatedMap()[feature.id];
  if (existingScore) {
    renderAlreadyRated(formArea, existingScore);
  } else {
    renderRatingForm(formArea, feature, stats);
  }

  listEl.appendChild(card);
  getAggregate(feature.id)
    .then((agg) => updateStats(stats, agg))
    .catch(() => {});
}

function renderAlreadyRated(formArea, score) {
  formArea.className = "rate-card__form";
  formArea.innerHTML = `<p class="rate-card__desc">✅ Ти вже оцінив цю фічу на ${score}/5. Дякуємо!</p>`;
}

function renderRatingForm(formArea, feature, stats) {
  formArea.className = "rate-card__form";
  const picker = renderScorePicker(feature.id);
  const textarea = document.createElement("textarea");
  textarea.className = "rate-card__comment";
  textarea.placeholder = "Коментар (необов'язково)";
  textarea.maxLength = 500;

  const actions = document.createElement("div");
  actions.className = "rate-card__actions";
  const submitBtn = document.createElement("button");
  submitBtn.type = "button";
  submitBtn.className = "btn btn-primary";
  submitBtn.textContent = "Надіслати оцінку";
  const status = document.createElement("span");
  status.className = "rate-card__status";
  actions.appendChild(submitBtn);
  actions.appendChild(status);

  formArea.appendChild(picker);
  formArea.appendChild(textarea);
  formArea.appendChild(actions);

  submitBtn.addEventListener("click", async () => {
    const score = Number(picker.dataset.selected || 0);
    if (!score) {
      picker.querySelectorAll(".score-picker__btn").forEach((b) => b.classList.add("is-selected"));
      return;
    }
    submitBtn.disabled = true;
    try {
      await setDoc(
        doc(db, "features", feature.id),
        {
          title: feature.title,
          description: feature.description || "",
          module: feature.module || "",
          predefined: feature.predefined !== false,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
      await addDoc(collection(db, "features", feature.id, "ratings"), {
        score,
        comment: textarea.value.slice(0, 500),
        createdAt: serverTimestamp(),
      });
      markRated(feature.id, score);
      const agg = await getAggregate(feature.id);
      updateStats(stats, agg);
      renderAlreadyRated(formArea, score);
    } catch (err) {
      console.error("Не вдалося надіслати оцінку", err);
      status.textContent = "Помилка. Спробуйте пізніше.";
      status.style.color = "var(--color-warn)";
      status.classList.add("is-visible");
      submitBtn.disabled = false;
    }
  });
}

function updateStats(statsEl, { average, count }) {
  statsEl.querySelector(".rate-card__avg").textContent = count ? average.toFixed(1) : "–";
  statsEl.querySelector(".rate-card__count").textContent = `${count} ${count === 1 ? "оцінка" : "оцінок"}`;
}

async function loadCustomFeatures() {
  const q = query(collection(db, "features"), where("predefined", "==", false));
  const snap = await getDocs(q);
  const custom = [];
  snap.forEach((d) => custom.push({ id: d.id, ...d.data(), icon: "💡" }));
  return custom;
}

async function init() {
  if (!IS_FIREBASE_CONFIGURED) {
    noticeEl.textContent =
      "Firebase ще не налаштовано — оцінки не зберігаються. Дивись README.md для інструкції.";
    noticeEl.hidden = false;
    FEATURES.forEach((f) => renderStaticOnly(f));
    return;
  }

  FEATURES.forEach(renderCard);
  try {
    const custom = await loadCustomFeatures();
    custom.forEach(renderCard);
  } catch (err) {
    console.error("Не вдалося завантажити запропоновані фічі", err);
  }
}

function renderStaticOnly(feature) {
  const card = document.createElement("article");
  card.className = "card rate-card";
  card.innerHTML = `
    <div class="rate-card__head">
      <div>
        <div class="rate-card__title"><h3>${feature.icon || "⭐"} ${feature.title}</h3></div>
        <p class="rate-card__desc">${feature.description || ""}</p>
      </div>
    </div>
  `;
  listEl.appendChild(card);
}

if (suggestForm) {
  suggestForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!IS_FIREBASE_CONFIGURED) return;
    const formData = new FormData(suggestForm);
    const title = String(formData.get("title") || "").trim();
    const description = String(formData.get("description") || "").trim();
    if (!title) return;
    try {
      await addDoc(collection(db, "features"), {
        title,
        description,
        module: "",
        predefined: false,
        createdAt: serverTimestamp(),
      });
      suggestForm.reset();
      suggestStatus.textContent = "Дякуємо! Фічу додано до списку.";
      suggestStatus.classList.add("is-visible");
    } catch (err) {
      console.error("Не вдалося додати фічу", err);
      suggestStatus.textContent = "Помилка. Спробуйте пізніше.";
      suggestStatus.classList.add("is-visible");
    }
  });
}

init();
