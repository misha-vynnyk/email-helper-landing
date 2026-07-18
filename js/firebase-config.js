// Firebase config placeholder — replace with your project's values.
// See README.md → "Налаштування Firebase" for step-by-step instructions.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD2gErJTF0rEe6a2AJiL3pwpy6_t2A0xWM",
  authDomain: "emailhelperlanding.firebaseapp.com",
  projectId: "emailhelperlanding",
  storageBucket: "emailhelperlanding.firebasestorage.app",
  messagingSenderId: "974679157111",
  appId: "1:974679157111:web:d59704894f12e84ee2d972",
};

export const IS_FIREBASE_CONFIGURED = firebaseConfig.apiKey !== "YOUR_API_KEY";

const app = IS_FIREBASE_CONFIGURED ? initializeApp(firebaseConfig) : null;
export const db = app ? getFirestore(app) : null;
