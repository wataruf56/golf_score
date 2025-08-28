import React, { useEffect, useMemo, useState } from "react";
import {
  Download, Plus, ChevronLeft, ChevronRight, Save, Flag, List
} from "lucide-react";
import {
  collection, doc, setDoc, deleteDoc, onSnapshot,
  serverTimestamp, query, orderBy
} from "firebase/firestore";

export default function GolfScoreMemoApp({ user, db, onLogout }) {
  const [rounds, setRounds] = useState([]);
  const [currentRound, setCurrentRound] = useState(null);
  const [currentHole, setCurrentHole] = useState(1);
  const [showRoundSetup, setShowRoundSetup] = useState(false);
  const [playMode, setPlayMode] = useState(false);
  const [showRoundList, setShowRoundList] = useState(false);

  // Firestore 参照
  const roundsCol = useMemo(
    () => collection(db, "users", user.uid, "rounds"),
    [db, user.uid]
  );

  // クラブの選択肢
  const clubs = ["1W","3W","5W","7W","2UT","3UT","4UT","5UT","3I","4I","5I","6I","7I","8I","9I","PW","AW","SW","LW","PT","なし"];

  // 初期詳細データ
  const initialHoleDetail = {
    score: 4, putts: 2,
    shot1Club: "1W", shot1DirectionStart: "真っ直ぐ", shot1DirectionCurve: "真っ直ぐ", shot1Result: "○", shot1OB: false, shot1Penalty: false,
    shot2Club: "7I", shot2DirectionStart: "真っ直ぐ", shot2DirectionCurve: "真っ直ぐ", shot2Result: "○", shot2OB: false, shot2Penalty: false,
    shot3Club: "なし", shot3DirectionStart: "真っ直ぐ", shot3DirectionCurve: "真っ直ぐ", shot3Result: "○", shot3OB: false, shot3Penalty: false,
    shot4Club: "なし", shot4DirectionStart: "真っ直ぐ", shot4DirectionCurve: "真っ直ぐ", shot4Result: "○", shot4OB: false, shot4Penalty: false,
    within100Yards: 2, ob: 0, bunker: 0, penalty: 0, completed: false
  };

  // 新規ラウンド
  const createNewRound = () => {
    const holes = {};
    for (let i = 1; i <= 18; i++) holes[i] = { ...initialHoleDetail };
    const id = Date.now();
    return {
      id,
      date: new Date().toISOString().split("T")[0],
      courseName: "",
      memo: "",
      frontCourseName: "",
      frontStartHole: "1番",
      backCourseName: "",
      backStartHole: "10番",
      holes,
      inProgress: true,
      updatedAt: new Date().toISOString(),
    };
  };

  // Firestore同期
  useEffect(() => {
    const q = query(roundsCol, orderBy("updatedAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: Number(d.id) || d.id, ...d.data() }));
      setRounds(list);
      if (list.length === 0) setShowRoundList(true);
    });
    return () => unsub();
  }, [roundsCol]);

  const saveRoundToDB = async (round) => {
    await setDoc(
      doc(roundsCol, String(round.id)),
      { ...round, updatedAt: serverTimestamp() },
      { merge: true }
    );
  };
  const deleteRoundFromDB = async (roundId) => {
    await deleteDoc(doc(roundsCol, String(roundId)));
  };

  // 矢印画像
  const ArrowImage = ({ start, curve, size = 40 }) => {
    let path = "";
    let color = "#333";
    if (start === "ちょろ") {
      path = "M 50 80 L 50 70"; color = "#ff6b6b";
    } else if (start === "てんぷら") {
      path = "M 50 80 Q 50 30, 50 40"; color = "#4ecdc4";
    } else {
      const startAngles = { "左45°": -45, "左15°": -15, "真っ直ぐ": 0, "右15°": 15, "右45°": 45 };
      const angle = startAngles[start] || 0;
      let curveOffset = 0, controlOffset = 0;
      if (curve === "左") { curveOffset = -30; controlOffset = -15; }
      else if (curve === "右") { curveOffset = 30; controlOffset = 15; }
      if ((start.includes("右") && curve === "左") || (start.includes("左") && curve === "右")) {
        curveOffset *= 1.5; controlOffset *= 2;
      }
      const startX = 50, startY = 80;
      const midX = 50 + Math.sin(angle * Math.PI / 180) * 30;
      const midY = 80 - Math.cos(angle * Math.PI / 180) * 30;
      const endX = midX + curveOffset, endY = 20;
      const control1X = 50 + Math.sin(angle * Math.PI / 180) * 15, control1Y = 60;
      const control2X = midX + controlOffset, control2Y = 40;

      if (curve === "真っ直ぐ") {
        const ex = 50 + Math.sin(angle * Math.PI / 180) * 50;
        const ey = 80 - Math.cos(angle * Math.PI / 180) * 50;
        path = `M ${startX} ${startY} L ${ex} ${ey}`;
      } else {
        path = `M ${startX} ${startY} C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${endX} ${endY}`;
      }
    }
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" className="border rounded bg-white">
        <path d={path} stroke={color} strokeWidth="2.5" fill="none" markerEnd="url(#arrowhead)" />
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="0" refY="3" orient="auto">
            <polygon points="0 0, 6 3, 0 6" fill={color} />
          </marker>
        </defs>
      </svg>
    );
  };

  // 1ホール入力
  const HoleInputScreen = () => {
    const [holeData, setHoleData] = useState(() => ({
      ...initialHoleDetail,
      ...(currentRound?.holes[currentHole] || {}),
    }));

    const directionStarts = ["左45°","左15°","真っ直ぐ","右15°","右45°","ちょろ","てんぷら"];
    const directionCurves = ["左","真っ直ぐ","右"];
    const results = ["◎","○","△","×"];

    const updateHoleData = (field, value) =>
      setHoleData((prev) => ({ ...prev, [field]: value }));

    const persist = async (roundObj) => {
      setCurrentRound(roundObj);
      setRounds((prev) => prev.map((r) => (r.id === roundObj.id ? roundObj : r)));
      await saveRoundToDB(roundObj);
    };

    const saveHole = async () => {
      const updatedRound = {
        ...currentRound,
        holes: { ...currentRound.holes, [currentHole]: { ...holeData, completed: true } },
        updatedAt: new Date().toISOString(),
      };
      await persist(updatedRound);

      if (currentHole < 18) {
        const next = currentHole + 1;
        setCurrentHole(next);
        setHoleData({ ...initialHoleDetail, ...(updatedRound.holes[next] || {}) });
      } else {
        alert("18ホール完了！お疲れ様でした！");
        const finished = { ...updatedRound, inProgress: false };
        await persist(finished);
        setPlayMode(false);
        setShowRoundList(true);
      }
    };

    const navigateHole = (dir) => {
      const newHole = dir === "prev" ? Math.max(1, currentHole - 1) : Math.min(18, currentHole + 1);
      setCurrentHole(newHole);
      setHoleData({ ...initialHoleDetail, ...(currentRound.holes[newHole] || {}) });
    };

    const courseName = currentHole <= 9 ? currentRound.frontCourseName : currentRound.backCourseName;

    return (
      <div className="max-w-lg mx-auto p-2 h-screen overflow-y-auto bg-gray-50">
        {/* ヘッダー */}
        <div className="sticky top-0 z-10 bg-white shadow-sm rounded-b-lg mb-3">
          <div className="p-3">
            <div className="flex justify-between items-center mb-2">
              <button onClick={() => navigateHole("prev")} disabled={currentHole === 1}
                className="p-2 rounded-full bg-gray-100 disabled:opacity-50">
                <ChevronLeft size={20} />
              </button>
              <div className="text-center">
                <h2 className="text-xl font-bold">{currentHole}番ホール</h2>
                <div className="text-xs text-gray-600">
                  {currentRound.courseName} - {courseName}
                </div>
              </div>
              <button onClick={() => navigateHole("next")} disabled={currentHole === 18}
                className="p-2 rounded-full bg-gray-100 disabled:opacity-50">
                <ChevronRight size={20} />
              </button>
            </div>
            <div className="flex gap-1">
              {[...Array(18)].map((_, i) => (
                <div
                  key={i + 1}
                  className={`flex-1 h-1 rounded ${
                    currentRound.holes[i + 1]?.completed
                      ? "bg-green-500"
                      : i + 1 === currentHole
                      ? "bg-blue-500"
                      : "bg-gray-300"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-3 space-y-3">
          {/* スコア情報 */}
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="text-xs font-medium block mb-1">スコア</label>
              <select
                value={holeData.score}
                onChange={(e) => updateHoleData("score", parseInt(e.target.value))}
                className="w-full p-2 border rounded text-center font-bold"
              >
                {[...Array(10)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">パット</label>
              <select
                value={holeData.putts}
                onChange={(e) => updateHoleData("putts", parseInt(e.target.value))}
                className="w-full p-2 border rounded text-center"
              >
                {[...Array(10)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">100Y以内</label>
              <select
                value={holeData.within100Yards}
                onChange={(e) =>
                  updateHoleData("within100Yards", parseInt(e.target.value))
                }
                className="w-full p-2 border rounded text-center"
              >
                {[...Array(10)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">アプローチ</label>
              <div className="w-full p-2 border rounded text-center bg-gray-100">
                {holeData.within100Yards - holeData.putts}
              </div>
            </div>
          </div>

          {/* OB/バンカー/ペナルティ */}
          <div className="grid grid-cols-3 gap-2">
            {["ob", "bunker", "penalty"].map((k) => (
              <div key={k}>
                <label className="text-xs font-medium block mb-1">
                  {k === "ob" ? "OB" : k === "bunker" ? "バンカー" : "ペナルティ"}
                </label>
                <select
                  value={holeData[k]}
                  onChange={(e) => updateHoleData(k, parseInt(e.target.value))}
                  className="w-full p-2 border rounded text-center"
                >
                  {[...Array(6)].map((_, i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* 各ショット */}
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="border rounded-lg p-2 bg-gray-50">
              <div className="font-semibold text-sm mb-2">{n}打目</div>

              <div className="grid grid-cols-3 gap-2 mb-2">
                <div>
                  <label className="text-xs block mb-1">クラブ</label>
                  <select
                    value={holeData[`shot${n}Club`]}
                    onChange={(e) => updateHoleData(`shot${n}Club`, e.target.value)}
                    className="w-full p-1 text-xs border rounded"
                  >
                    {clubs.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs block mb-1">出だし</label>
                  <select
                    value={holeData[`shot${n}DirectionStart`]}
                    onChange={(e) =>
                      updateHoleData(`shot${n}DirectionStart`, e.target.value)
                    }
                    className="w-full p-1 text-xs border rounded"
                  >
                    {["左45°", "左15°", "真っ直ぐ", "右15°", "右45°", "ちょろ", "てんぷら"].map(
                      (d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div>
                  <label className="text-xs block mb-1">曲がり</label>
                  <select
                    value={holeData[`shot${n}DirectionCurve`]}
                    onChange={(e) =>
                      updateHoleData(`shot${n}DirectionCurve`, e.target.value)
                    }
                    className="w-full p-1 text-xs border rounded"
                  >
                    {["左", "真っ直ぐ", "右"].map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between mb-2">
                <div className="flex gap-1">
                  {["◎", "○", "△", "×"].map((r) => (
                    <button
                      key={r}
                      onClick={() => updateHoleData(`shot${n}Result`, r)}
                      className={`px-3 py-1 text-sm font-bold rounded ${
                        holeData[`shot${n}Result`] === r
                          ? "bg-blue-500 text-white"
                          : "bg-gray-200"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <ArrowImage
                  start={holeData[`shot${n}DirectionStart`]}
                  curve={holeData[`shot${n}DirectionCurve`]}
                  size={35}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {["OB", "Penalty"].map((kind) => {
                  const key = `shot${n}${kind}`;
                  return (
                    <div key={key}>
                      <label className="text-xs block mb-1">
                        {kind === "OB" ? "OB" : "ペナルティ"}
                      </label>
                      <select
                        value={holeData[key] ? 1 : 0}
                        onChange={(e) => updateHoleData(key, e.target.value === "1")}
                        className="w-full p-1 text-xs border rounded text-center"
                      >
                        <option value={0}>なし</option>
                        <option value={1}>あり</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* 保存 */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={saveHole}
              className="flex-1 py-3 bg-green-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2"
            >
              <Save size={20} />
              このホールを保存
              {currentHole < 18 && " → 次へ"}
            </button>
            <button
              onClick={() => {
                setShowRoundList(true);
                setPlayMode(false);
              }}
              className="px-4 py-3 bg-gray-400 text-white rounded-lg"
            >
              <List size={20} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ラウンド設定
  const RoundSetupForm = () => {
    const [formData, setFormData] = useState(currentRound || createNewRound());

    const handleSave = async () => {
      const newRound = { ...formData, inProgress: true, updatedAt: new Date().toISOString() };
      setCurrentRound(newRound);
      setShowRoundSetup(false);
      setPlayMode(true);
      setCurrentHole(1);
      setShowRoundList(false);
      await saveRoundToDB(newRound);
    };

    return (
      <div className="max-w-lg mx-auto p-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-6">ラウンド設定</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">日付</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">ゴルフ場名</label>
              <input
                type="text"
                value={formData.courseName}
                onChange={(e) => setFormData({ ...formData, courseName: e.target.value })}
                className="w-full p-2 border rounded"
                placeholder="〇〇カントリークラブ"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">前半コース名</label>
                <input
                  type="text"
                  value={formData.frontCourseName}
                  onChange={(e) =>
                    setFormData({ ...formData, frontCourseName: e.target.value })
                  }
                  className="w-full p-2 border rounded"
                  placeholder="OUT/IN等"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">前半スタート</label>
                <select
                  value={formData.frontStartHole}
                  onChange={(e) =>
                    setFormData({ ...formData, frontStartHole: e.target.value })
                  }
                  className="w-full p-2 border rounded"
                >
                  <option value="1番">1番</option>
                  <option value="10番">10番</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">後半コース名</label>
                <input
                  type="text"
                  value={formData.backCourseName}
                  onChange={(e) =>
                    setFormData({ ...formData, backCourseName: e.target.value })
                  }
                  className="w-full p-2 border rounded"
                  placeholder="OUT/IN等"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">後半スタート</label>
                <select
                  value={formData.backStartHole}
                  onChange={(e) =>
                    setFormData({ ...formData, backStartHole: e.target.value })
                  }
                  className="w-full p-2 border rounded"
                >
                  <option value="10番">10番</option>
                  <option value="1番">1番</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">メモ</label>
              <textarea
                value={formData.memo}
                onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                className="w-full p-2 border rounded h-20"
                placeholder="今日のラウンドメモ（300文字まで）"
                maxLength={300}
              />
              <div className="text-xs text-gray-500 mt-1">{formData.memo.length}/300文字</div>
            </div>
          </div>

          <div className="flex gap-4 mt-6">
            <button
              onClick={handleSave}
              className="flex-1 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-semibold"
            >
              プレイ開始
            </button>
            <button
              onClick={() => {
                setShowRoundSetup(false);
                setCurrentRound(null);
                setShowRoundList(true);
              }}
              className="flex-1 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              キャンセル
            </button>
          </div>
        </div>
      </div>
    );
  };

  // CSV出力（完了ラウンドのみ）
  const exportToCSV = () => {
    const headers = [
      "日時","ゴルフ場名","メモ","コース名","ホール","スコア","パット数",
      "1打目クラブ","1打目方向","1打目結果","1打目OB","1打目ペナルティ",
      "2打目クラブ","2打目方向","2打目結果","2打目OB","2打目ペナルティ",
      "3打目クラブ","3打目方向","3打目結果","3打目OB","3打目ペナルティ",
      "4打目クラブ","4打目方向","4打目結果","4打目OB","4打目ペナルティ",
      "100Y以内","アプローチ数","OB","バンカー","ペナルティ",
    ];
    let csv = headers.join(",") + "\n";

    rounds.filter((r) => !r.inProgress).forEach((round) => {
      for (let i = 1; i <= 18; i++) {
        const h = round.holes[i];
        const cname = i <= 9 ? round.frontCourseName : round.backCourseName;
        const approach = h.within100Yards - h.putts;
        const row = [
          round.date, round.courseName, `"${(round.memo || "").replace(/"/g, '""')}"`,
          cname, `${i}番`,
          h.score, h.putts,
          h.shot1Club, `${h.shot1DirectionStart}→${h.shot1DirectionCurve}`, h.shot1Result, (h.shot1OB ? "○" : ""), (h.shot1Penalty ? "○" : ""),
          h.shot2Club, `${h.shot2DirectionStart}→${h.shot2DirectionCurve}`, h.shot2Result, (h.shot2OB ? "○" : ""), (h.shot2Penalty ? "○" : ""),
          h.shot3Club, `${h.shot3DirectionStart}→${h.shot3DirectionCurve}`, h.shot3Result, (h.shot3OB ? "○" : ""), (h.shot3Penalty ? "○" : ""),
          h.shot4Club, `${h.shot4DirectionStart}→${h.shot4DirectionCurve}`, h.shot4Result, (h.shot4OB ? "○" : ""), (h.shot4Penalty ? "○" : ""),
          h.within100Yards, approach, h.ob, h.bunker, h.penalty,
        ];
        csv += row.join(",") + "\n";
      }
    });

    const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
    const blob = new Blob([bom, csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `golf_scores_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  // ラウンド一覧
  const RoundList = () => {
    const total = (r) => Object.values(r.holes).reduce((s, h) => s + (h?.score || 0), 0);
    const inProgressRound = rounds.find((r) => r.inProgress);

    return (
      <div className="max-w-lg mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">ゴルフスコアメモ</h1>
          <div className="flex gap-2">
            {inProgressRound ? (
              <button
                onClick={() => {
                  setCurrentRound(inProgressRound);
                  setPlayMode(true);
                  setShowRoundList(false);
                  const firstIncomplete = Object.keys(inProgressRound.holes)
                    .map(Number)
                    .find((h) => !inProgressRound.holes[h].completed) || 1;
                  setCurrentHole(firstIncomplete);
                }}
                className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2 text-sm"
              >
                <Flag size={18} />
                プレイ再開
              </button>
            ) : (
              <button
                onClick={() => {
                  setCurrentRound(null);
                  setShowRoundSetup(true);
                  setShowRoundList(false);
                }}
                className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 text-sm"
              >
                <Plus size={18} />
                新規ラウンド
              </button>
            )}

            {rounds.filter((r) => !r.inProgress).length > 0 && (
              <button
                onClick={exportToCSV}
                className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center gap-2 text-sm"
              >
                <Download size={18} />
                CSV
              </button>
            )}
          </div>
        </div>

        {rounds.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500 mb-4">まだラウンドが登録されていません</p>
            <button
              onClick={() => {
                setCurrentRound(null);
                setShowRoundSetup(true);
                setShowRoundList(false);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              最初のラウンドを開始
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {rounds.map((round) => {
              const completed = Object.values(round.holes).filter((h) => h.completed).length;
              return (
                <div
                  key={round.id}
                  className={`border rounded-lg p-4 ${
                    round.inProgress ? "border-green-500 bg-green-50" : "bg-white"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{round.date}</span>
                        {round.inProgress && (
                          <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded">
                            {completed}/18
                          </span>
                        )}
                      </div>
                      <div className="font-bold mb-1">{round.courseName || "未設定"}</div>
                      {!round.inProgress && (
                        <div className="text-lg font-bold text-blue-600">スコア: {total(round)}</div>
                      )}
                      {round.memo && (
                        <div className="mt-1 text-xs text-gray-600">{round.memo.substring(0, 50)}...</div>
                      )}
                    </div>
                    <button
                      onClick={async () => {
                        if (confirm("削除しますか？")) {
                          await deleteRoundFromDB(round.id);
                          setRounds((prev) => prev.filter((r) => r.id !== round.id));
                        }
                      }}
                      className="text-red-500 text-sm"
                    >
                      削除
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // 初期画面
  useEffect(() => {
    if (rounds.length === 0 && !showRoundSetup && !playMode) setShowRoundList(true);
  }, [rounds.length, showRoundSetup, playMode]);

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(1000px 700px at 10% -10%, #7b74f0, transparent 60%)," +
          "radial-gradient(1000px 700px at 120% 110%, #5c59d6, transparent 60%)," +
          "linear-gradient(180deg,#5a57d0,#7a72ef)",
      }}
    >
      <div className="max-w-3xl mx-auto px-4 py-4 text-white font-bold flex items-center justify-between">
        <div>ログイン中: {user.email}</div>
        <button
          onClick={onLogout}
          className="bg-rose-500 hover:bg-rose-600 px-3 py-1.5 rounded-lg"
        >
          ログアウト
        </button>
      </div>

      {playMode ? (
        <HoleInputScreen />
      ) : showRoundSetup ? (
        <RoundSetupForm />
      ) : (
        <RoundList />
      )}
    </div>
  );
}
