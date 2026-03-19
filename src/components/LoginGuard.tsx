"use client";

import { useState, useEffect } from "react";
import { useUser, AppUser } from "@/lib/user-context";

const APP_VERSION = "v0.1";
const COMMIT_SHA = process.env.NEXT_PUBLIC_COMMIT_SHA || "dev";
const VALID_PIN = process.env.NEXT_PUBLIC_APP_PIN || "";

export default function LoginGuard({ children }: { children: React.ReactNode }) {
  const { user, login } = useUser();
  const [stage, setStage] = useState<"loading" | "pin" | "select" | "ready">("loading");
  const [users, setUsers] = useState<AppUser[]>([]);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const pinOk = !VALID_PIN || sessionStorage.getItem("yasunobu_knowledge_pin_verified") === "true";

    if (user && pinOk) {
      setStage("ready");
      return;
    }

    if (!pinOk) {
      setStage("pin");
      return;
    }

    // PIN済み but ユーザー未選択 → ユーザー選択へ
    fetchUsers().then(() => setStage("select"));
  }, [user]);

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

      // PIN通った後にユーザーが既にlocalStorageにいればready
      const stored = localStorage.getItem("yasunobu-knowledge-user");
      if (stored) {
        try {
          login(JSON.parse(stored));
          setTimeout(() => setStage("ready"), 300);
          return;
        } catch { /* ignore */ }
      }

      // ユーザー一覧取得してselect画面へ
      await fetchUsers();
      setTimeout(() => setStage("select"), 300);
    } else {
      setError("PINコードが正しくありません");
    }
  };

  const handleSelectUser = (u: AppUser) => {
    login(u);
    setTimeout(() => setStage("ready"), 300);
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

        {/* PIN入力（最初のステップ） */}
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

        {/* ユーザー選択（PIN通過後） */}
        {stage === "select" && (
          <>
            <div style={{ fontSize: 14, color: "#334155", fontWeight: 600, marginBottom: 16 }}>
              ユーザーを選択してください
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {users.length === 0 ? (
                <div style={{ fontSize: 13, color: "#94a3b8", padding: "16px 0" }}>
                  ユーザーが見つかりません
                </div>
              ) : (
                users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleSelectUser(u)}
                    style={{
                      padding: "14px 16px",
                      borderRadius: 12,
                      border: "2px solid #e2e8f0",
                      background: "#fff",
                      cursor: "pointer",
                      fontSize: 15,
                      fontWeight: 600,
                      color: "#1e293b",
                      textAlign: "left",
                      transition: "all 0.15s",
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.borderColor = "#22c55e";
                      e.currentTarget.style.background = "#f0fdf4";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.borderColor = "#e2e8f0";
                      e.currentTarget.style.background = "#fff";
                    }}
                  >
                    {u.name}
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
