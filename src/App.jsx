import React, { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "./firebase";
import AuthCard from "./components/AuthCard.jsx";
import GolfScoreMemoApp from "./components/GolfScoreMemoApp.jsx";

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  if (!user) return <AuthCard />;

  return <GolfScoreMemoApp user={user} db={db} onLogout={() => signOut(auth)} />;
}
