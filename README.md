# FlexiBuilder Pro — Landing & Feature Rating

Маркетинговий лендінг + анонімна система оцінки фіч для [FlexiBuilder Pro](https://misha-vynnyk.github.io/email-helper/).

Стек: HTML + чистий CSS + мінімум vanilla JS, дані оцінок зберігаються у Firebase Firestore. Деплой — GitHub Pages.

## Сторінки

- `index.html` — лендінг: hero, bento-grid з 10 фічами, тизери на гайд і оцінку
- `guide.html` — заглушка гайду (розділи дописуються вручну)
- `features.html` — оцінка фіч: шкала 1–5 + коментар, анонімно, без логіну; форма "запропонувати фічу"

## Локальна розробка

```bash
npm install
npm run build   # копіює src/ у dist/
npm run serve   # піднімає dist/ на http://localhost:3000
```

Немає окремого build-кроку для CSS — `src/css/*.css` копіюється в `dist/` як є.

## Налаштування Firebase

Оцінки не зберігатимуться, поки `src/js/firebase-config.js` містить плейсхолдер-значення. Потрібно:

1. Створити проєкт на [console.firebase.google.com](https://console.firebase.google.com)
2. Увімкнути **Firestore Database** (production mode)
3. Додати Web App (⚙️ Project settings → Your apps → `</>`), скопіювати `firebaseConfig`
4. Вставити ці значення в `src/js/firebase-config.js` замість `YOUR_API_KEY` тощо
5. Встановити [Firebase CLI](https://firebase.google.com/docs/cli) і задеплоїти правила:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase deploy --only firestore:rules
   ```
   (або вручну вставити вміст `firestore.rules` у Firestore → Rules у консолі)

### Схема даних

```
features/{featureId}
  title: string
  description: string
  module: string
  predefined: boolean
  createdAt: timestamp

features/{featureId}/ratings/{ratingId}
  score: number (1-5)
  comment: string (optional, ≤500 символів)
  createdAt: timestamp
```

Середнє й кількість голосів рахуються на клієнті (`getDocs` по підколекції `ratings`) — команда невелика, Cloud Functions не потрібні.

**Свідомий компроміс:** оцінки анонімні, без автентифікації, тож немає надійного способу прив'язати запис до автора з клієнта. Тому `firestore.rules` дозволяє публічний `read` і `create`/`update` (для upsert батьківського документа фічі при кожній оцінці), але забороняє `delete` — видалити чи підмінити чужу оцінку з клієнта неможливо, але й відредагувати свою власну теж.

## Деплой на GitHub Pages

```bash
npm run deploy   # build + push у гілку gh-pages
```

Сайт буде доступний на `https://<username>.github.io/email-helper-landing/`.
