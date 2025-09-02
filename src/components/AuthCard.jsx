// src/components/AuthCard.jsx
import React, { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "../firebase";

const errMsg = (code) => {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "メールアドレスまたはパスワードが違います。";
    case "auth/user-not-found":
      return "ユーザーが見つかりません。新規登録してください。";
    case "auth/invalid-email":
      return "メールアドレスの形式が正しくありません。";
    case "auth/too-many-requests":
      return "リクエストが多すぎます。しばらくしてからお試しください。";
    case "auth/network-request-failed":
      return "ネットワークエラーが発生しました。";
    case "auth/operation-not-allowed":
      return "この認証方法は無効です（Firebase Console を確認）。";
    default:
      return "処理に失敗しました。入力内容をご確認ください。";
  }
};

export default function AuthCard() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");

  const onSignUp = async () => {
    setError("");
    try {
      await createUserWithEmailAndPassword(auth, email, pw);
    } catch (e) {
      console.error(e);
      setError(errMsg(e.code));
    }
  };

  const onLogin = async () => {
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, pw);
    } catch (e) {
      console.error(e);
      setError(errMsg(e.code));
    }
  };

  const onReset = async () => {
    setError("");
    try {
      if (!email) {
        setError("パスワード再設定用のメールアドレスを入力してください。");
        return;
      }
      await sendPasswordResetEmail(auth, email);
      alert("パスワード再設定メールを送信しました。");
    } catch (e) {
      console.error(e);
      setError(errMsg(e.code));
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 bg-white/95 rounded-xl shadow-xl p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">ゴルフスコア管理</h1>

      <label className="block text-sm text-gray-600 mb-1">メールアドレス</label>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full border rounded-lg px-3 py-2 mb-4"
        placeholder="you@example.com"
      />

      <label className="block text-sm text-gray-600 mb-1">パスワード</label>
      <input
        type="password"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        className="w-full border rounded-lg px-3 py-2 mb-4"
        placeholder="6文字以上"
      />

      <div className="flex gap-3">
        <button
          onClick={onSignUp}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg"
        >
          新規登録
        </button>
        <button
          onClick={onLogin}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg"
        >
          ログイン
        </button>
      </div>

      <button
        onClick={onReset}
        className="mt-3 text-sm text-indigo-600 hover:underline"
      >
        パスワードを忘れた？
      </button>

      {error && (
        <div className="mt-4 bg-red-50 text-red-700 border border-red-200 rounded-lg p-3">
          {error}
        </div>
      )}
    </div>
  );
}
