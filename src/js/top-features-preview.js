import { db, IS_FIREBASE_CONFIGURED } from "./firebase-config.js";
import { FEATURES } from "./features-data.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

async function renderTopPreview() {
  const el = document.getElementById("top-features-preview");
  if (!IS_FIREBASE_CONFIGURED || !el) return;
  try {
    const results = await Promise.all(
      FEATURES.map(async (f) => {
        const snap = await getDocs(collection(db, "features", f.id, "ratings"));
        let sum = 0;
        snap.forEach((d) => (sum += d.data().score || 0));
        return { title: f.title, average: snap.size ? sum / snap.size : 0, count: snap.size };
      })
    );
    const top = results
      .filter((r) => r.count > 0)
      .sort((a, b) => b.average - a.average)
      .slice(0, 3);
    el.innerHTML = top
      .map(
        (r) =>
          `<div class="teaser-preview-row"><span>${r.title}</span><span>${r.average.toFixed(1)} ★</span></div>`
      )
      .join("");
  } catch (err) {
    console.error("Не вдалося завантажити прев'ю оцінок", err);
  }
}

renderTopPreview();
