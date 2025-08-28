import React, { useState } from "react";
import { auth } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";

const nice = (e) => {
  const map = {
    "auth/invalid-credential": "メールアドレスまたはパスワードが違います。",
    "auth/user-not-found": "このメールアドレスは登録がありません。",
    "auth/wrong-password": "メールアドレスまたはパスワードが違います。",
    "auth/invalid-email": "メールアドレスの形式が正しくありません。",
    "auth/email-already-in-use": "このメールアドレスは既に登録されています。",
    "auth/weak-password": "パスワードは6文字以上にしてください。",
    "auth/too-many-requests": "試行が多すぎます。時間をおいて再試行してください。",
    "auth/invalid-api-key": "APIキーが正しくありません（firebaseConfig を確認）。",
    "auth/domain-not-allowed":
      "このドメインからの認証は許可されていません（承認済みドメイン）。",
  };
  console.error(e);
  return map[e?.code] || "処理に失敗しました。入力内容をご確認ください。";
};

export default function AuthCard() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(true);
  const [busy, setBusy] = useState(false);

  const clearMsg = () => {
    setMsg("");
    setOk(true);
  };

  const signUp = async () => {
    clearMsg();
    setBusy(true);
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), pw);
      setOk(true);
      setMsg("アカウントを作成しました。");
    } catch (e) {
      setOk(false);
      setMsg(nice(e));
    } finally {
      setBusy(false);
    }
  };

  const signIn = async () => {
    clearMsg();
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pw);
      // 成功時の画面切替は App.jsx 側の onAuthStateChanged が行う
    } catch (e) {
      setOk(false);
      setMsg(nice(e));
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!email.trim()) {
      setOk(false);
      setMsg("まずメールアドレスを入力してください。");
      return;
    }
    clearMsg();
    setBusy(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setOk(true);
      setMsg("パスワード再設定メールを送信しました。メールをご確認ください。");
    } catch (e) {
      setOk(false);
      setMsg(nice(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background:
          "radial-gradient(1000px 700px at 10% -10%, #7b74f0, transparent 60%)," +
          "radial-gradient(1000px 700px at 120% 110%, #5c59d6, transparent 60%)," +
          "linear-gradient(180deg,#5a57d0,#7a72ef)",
      }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
        <h1 className="text-2xl font-bold mb-4">ゴルフスコア管理</h1>

        <label className="block text-sm text-gray-600 mb-1">メールアドレス</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 border rounded-lg focus:outline-none"
          placeholder="you@example.com"
          autoComplete="username"
        />

        <label className="block text-sm text-gray-600 mb-1 mt-3">パスワード</label>
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          className="w-full p-3 border rounded-lg focus:outline-none"
          placeholder="6文字以上"
          autoComplete="current-password"
        />

        <div className="grid grid-cols-2 gap-2 mt-4">
          <button
            onClick={signUp}
            disabled={busy}
            className="py-3 rounded-lg font-bold text-white"
            style={{ background: "#4f46e5" }}
          >
            新規登録
          </button>
          <button
            onClick={signIn}
            disabled={busy}
            className="py-3 rounded-lg font-bold text-white"
            style={{ background: "#22c55e" }}
          >
            ログイン
          </button>
        </div>

        <p className="text-center mt-2">
          <button onClick={reset} className="text-indigo-600 underline text-sm">
            パスワードを忘れた？
          </button>
        </p>

        {msg && (
          <div
            className={`mt-3 p-3 rounded-lg text-sm ${
              ok
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-rose-50 text-rose-700 border border-rose-200"
            }`}
          >
            {msg}
          </div>
        )}
      </div>
    </div>
  );
}
