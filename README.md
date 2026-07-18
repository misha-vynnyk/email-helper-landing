# FlexiBuilder Pro — Landing & Feature Rating

**Live:** https://misha-vynnyk.github.io/email-helper-landing/

Лендінг + анонімна оцінка фіч (1–5, Firestore) для [FlexiBuilder Pro](https://misha-vynnyk.github.io/email-helper/). HTML + чистий CSS + vanilla JS.

## Локальна розробка

```bash
npm install
npm run build   # копіює src/ у dist/
npm run serve   # dist/ на http://localhost:3000
```

## Firebase

`src/js/firebase-config.js` не в git (реальний ключ живе лише локально — безпеку дає `firestore.rules`, а не приховування ключа). Щоб оцінки зберігались:

1. Створити проєкт на [console.firebase.google.com](https://console.firebase.google.com), увімкнути Firestore
2. Скопіювати `firebaseConfig` з Project settings → Your apps
3. `cp src/js/firebase-config.example.js src/js/firebase-config.js` і вставити значення
4. Задеплоїти правила: `firebase deploy --only firestore:rules` (або вручну в консолі)

## Деплой

```bash
npm run deploy   # build + push у gh-pages
```
