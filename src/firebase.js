// あなたの Firebase プロジェクトの値に置き換えてください
import { initializeApp, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCj5DqageKdTk23HVpv2ktSLHyOdlq2ksI",
  authDomain: "golf-score-app56.firebaseapp.com",
  projectId: "golf-score-app56",
  storageBucket: "golf-score-app56.appspot.com", // ← 修正
  messagingSenderId: "984454469289",
  appId: "1:984454469289:web:5cdedf6eb40d0a50befbb8",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
auth.languageCode = "ja";
export const db = getFirestore(app);

// デバッグ（一度だけ使う）: 実際に SDK が持っているキーを確認
console.log("Firebase apiKey:", getApp().options.apiKey);
