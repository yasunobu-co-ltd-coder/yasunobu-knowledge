"use client";

import { useState, useEffect, useRef } from "react";
import { useUser, AppUser } from "@/lib/user-context";

const APP_VERSION = "v0.1";
const COMMIT_SHA = process.env.NEXT_PUBLIC_COMMIT_SHA || "dev";
const VALID_PIN = process.env.NEXT_PUBLIC_APP_PIN || "";

export default function LoginGuard({ children }: { children: React.ReactNode }) {
  const { user, initialized, login } = useUser();
  const [stage, setStage] = useState<"loading" | "pin" | "select" | "ready">("loading");
  const [users, setUsers] = useState<AppUser[]>([]);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  // Drag & Drop
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStartYRef = useRef(0);

  useEffect(() => {
    // UserProviderの初期化を待つ（race condition防止）
    if (!initialized) return;

    const pinOk = !VALID_PIN || sessionStorage.getItem("yasunobu_knowledge_pin_verified") === "true";

    if (user && pinOk) {
      setStage("ready");
      return;
    }

    if (!pinOk) {
      setStage("pin");
      return;
    }

    // PIN済み but ユーザー未選択
    fetchUsers().then(() => setStage("select"));
  }, [user, initialized]);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data);
    } catch { /* ignore */ }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === VALID_PIN) {
      sessionStorage.setItem("yasunobu_knowledge_pin_verified", "true");
      setError("");

      const stored = localStorage.getItem("yasunobu-knowledge-user");
      if (stored) {
        try {
          login(JSON.parse(stored));
          setTimeout(() => setStage("ready"), 300);
          return;
        } catch { /* ignore */ }
      }

      await fetchUsers();
      setTimeout(() => setStage("select"), 300);
    } else {
      setError("PINコードが正しくありません");
    }
  };

  const handleSelectUser = (u: AppUser) => {
    if (isDragging) return;
    login(u);
    setTimeout(() => setStage("ready"), 300);
  };

  // --- Drag & Drop handlers ---
  const handleDragStart = (index: number, clientY: number) => {
    dragStartYRef.current = clientY;
    longPressTimerRef.current = setTimeout(() => {
      setDragIndex(index);
      setDragOverIndex(index);
      setIsDragging(true);
      if (navigator.vibrate) navigator.vibrate(30);
    }, 250);
  };

  const handleDragMove = (clientY: number) => {
    if (!isDragging || dragIndex === null) {
      if (longPressTimerRef.current && Math.abs(clientY - dragStartYRef.current) > 10) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      return;
    }
    const cards = document.querySelectorAll("[data-user-index]");
    cards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      if (clientY >= rect.top && clientY <= rect.bottom) {
        const idx = parseInt(card.getAttribute("data-user-index") || "0");
        setDragOverIndex(idx);
      }
    });
  };

  const handleDragEnd = async () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (isDragging && dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      const newUsers = [...users];
      const [moved] = newUsers.splice(dragIndex, 1);
      newUsers.splice(dragOverIndex, 0, moved);
      setUsers(newUsers);
      // sort_order をAPIで一括更新
      fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orders: newUsers.map((u, i) => ({ id: u.id, sort_order: i })) }),
      });
    }
    setDragIndex(null);
    setDragOverIndex(null);
    setIsDragging(false);
  };

  if (stage === "loading") {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }} />
    );
  }

  if (stage === "ready") {
    return <>{children}</>;
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #bbf7d0 100%)",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderRadius: 20,
          padding: "40px 32px",
          width: "100%",
          maxWidth: 340,
          textAlign: "center",
          boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
        }}
      >
        {/* アイコン */}
        <div
          style={{
            width: 72, height: 72, borderRadius: 18,
            background: "linear-gradient(135deg, #15803d, #22c55e)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <img src="/icon-192.png" alt="icon" style={{ width: 56, height: 56, borderRadius: 12 }} />
        </div>

        <div style={{ fontWeight: 800, fontSize: 20, color: "#15803d", letterSpacing: "-0.02em" }}>
          yasunobu-knowledge
        </div>
        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, marginBottom: 28, fontFamily: "monospace" }}>
          {APP_VERSION} / {COMMIT_SHA}
        </div>

        {/* PIN入力 */}
        {stage === "pin" && (
          <form onSubmit={handlePinSubmit}>
            <div style={{ fontSize: 14, color: "#334155", fontWeight: 600, marginBottom: 16 }}>
              PINコードを入力してください
            </div>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              name="pin"
              autoComplete="off"
              value={pin}
              onChange={(e) => { setPin(e.target.value); setError(""); }}
              placeholder="PIN"
              style={{
                width: "100%", boxSizing: "border-box", textAlign: "center",
                fontSize: 24, letterSpacing: 8, fontWeight: 700,
                border: error ? "2px solid #ef4444" : "2px solid #e2e8f0",
                borderRadius: 12, padding: "14px 16px", outline: "none",
                background: "#f8fafc", transition: "border-color 0.2s",
              }}
              onFocus={(e) => { if (!error) e.currentTarget.style.borderColor = "#22c55e"; }}
              onBlur={(e) => { if (!error) e.currentTarget.style.borderColor = "#e2e8f0"; }}
              autoFocus
            />
            {error && (
              <div style={{ color: "#ef4444", fontSize: 12, marginTop: 8 }}>{error}</div>
            )}
            <button
              type="submit"
              style={{
                marginTop: 16, width: "100%", padding: "14px", borderRadius: 12,
                border: "none", background: "linear-gradient(135deg, #15803d, #22c55e)",
                color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer",
              }}
            >
              次へ
            </button>
          </form>
        )}

        {/* ユーザー選択（ドラッグ並び替え対応） */}
        {stage === "select" && (
          <>
            <div style={{ fontSize: 14, color: "#334155", fontWeight: 600, marginBottom: 4 }}>
              {isDragging ? "ドラッグして並び替え" : "担当者を選択してください"}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 16 }}>
              長押しで並び替え
            </div>
            <div
              style={{ display: "flex", flexDirection: "column", gap: 8 }}
              onTouchMove={(e) => handleDragMove(e.touches[0].clientY)}
              onTouchEnd={handleDragEnd}
              onMouseMove={(e) => handleDragMove(e.clientY)}
              onMouseUp={handleDragEnd}
            >
              {users.length === 0 ? (
                <div style={{ fontSize: 13, color: "#94a3b8", padding: "16px 0" }}>
                  ユーザーが見つかりません
                </div>
              ) : (
                users.map((u, i) => (
                  <div
                    key={u.id}
                    data-user-index={i}
                    style={{
                      opacity: dragIndex === i ? 0.5 : 1,
                      transform:
                        dragOverIndex !== null && dragIndex !== null && dragIndex !== i
                          ? i > dragIndex && i <= dragOverIndex
                            ? "translateY(-8px)"
                            : i < dragIndex && i >= dragOverIndex
                              ? "translateY(8px)"
                              : "none"
                          : "none",
                      transition: isDragging ? "transform 0.15s ease" : "none",
                    }}
                  >
                    <button
                      onTouchStart={(e) => { e.stopPropagation(); handleDragStart(i, e.touches[0].clientY); }}
                      onMouseDown={(e) => { e.stopPropagation(); handleDragStart(i, e.clientY); }}
                      onClick={() => handleSelectUser(u)}
                      style={{
                        width: "100%",
                        padding: "14px 16px",
                        borderRadius: 12,
                        border: dragOverIndex === i && isDragging ? "2px solid #22c55e" : "2px solid #e2e8f0",
                        background: dragOverIndex === i && isDragging ? "#f0fdf4" : "#fff",
                        cursor: isDragging ? "grabbing" : "pointer",
                        fontSize: 15,
                        fontWeight: 600,
                        color: "#1e293b",
                        textAlign: "left",
                        transition: "all 0.15s",
                      }}
                    >
                      {u.name}
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
