// あなたの Firebase プロジェクトの値に置き換えてください
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
      apiKey: "AIzaSyCj5DqageKdTk23HVpv2ktSLHyOd1q2ksI",
      authDomain: "golf-score-app56.firebaseapp.com",
      projectId: "golf-score-app56",
      storageBucket: "golf-score-app56.firebasestorage.app",
      messagingSenderId: "984454469289",
      appId: "1:984454469289:web:5cdedf6eb40d0a50befbb8"
};
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
auth.languageCode = "ja";
export const db = getFirestore(app);
