// Copy this file to firebase-config.js and fill in your project's values.
// See README.md → "Налаштування Firebase" for step-by-step instructions.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

export const IS_FIREBASE_CONFIGURED = firebaseConfig.apiKey !== "YOUR_API_KEY";

const app = IS_FIREBASE_CONFIGURED ? initializeApp(firebaseConfig) : null;
export const db = app ? getFirestore(app) : null;
