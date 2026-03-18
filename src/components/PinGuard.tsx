"use client";

import { useState, useEffect } from "react";

const APP_VERSION = "v0.1";
const COMMIT_SHA = process.env.NEXT_PUBLIC_COMMIT_SHA || "dev";
const VALID_PIN = process.env.NEXT_PUBLIC_APP_PIN || "";
const STORAGE_KEY = "yasunobu_knowledge_pin_verified";

export default function PinGuard({ children }: { children: React.ReactNode }) {
  const [verified, setVerified] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [verifiedAt, setVerifiedAt] = useState(0);

  useEffect(() => {
    // PINが未設定ならスキップ
    if (!VALID_PIN) {
      setVerified(true);
      return;
    }
    if (sessionStorage.getItem(STORAGE_KEY) === "true") {
      setVerified(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === VALID_PIN) {
      setVerifiedAt(Date.now());
      setVerified(true);
      sessionStorage.setItem(STORAGE_KEY, "true");
      setError("");
    } else {
      setError("PINコードが正しくありません");
    }
  };

  // ゴーストクリック防止（800ms）
  if (verified && Date.now() - verifiedAt < 800) {
    return null;
  }

  if (verified) {
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
            width: 72,
            height: 72,
            borderRadius: 18,
            background: "linear-gradient(135deg, #15803d, #22c55e)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            fontSize: 36,
          }}
        >
          <img
            src="/icon-192.png"
            alt="icon"
            style={{ width: 56, height: 56, borderRadius: 12 }}
          />
        </div>

        {/* アプリ名 + バージョン */}
        <div
          style={{
            fontWeight: 800,
            fontSize: 20,
            color: "#15803d",
            letterSpacing: "-0.02em",
          }}
        >
          yasunobu-knowledge
        </div>
        <div
          style={{
            fontSize: 11,
            color: "#94a3b8",
            marginTop: 4,
            marginBottom: 28,
            fontFamily: "monospace",
          }}
        >
          {APP_VERSION} / {COMMIT_SHA}
        </div>

        {/* PIN入力 */}
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            name="pin"
            autoComplete="off"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setError("");
            }}
            placeholder="PIN"
            style={{
              width: "100%",
              boxSizing: "border-box",
              textAlign: "center",
              fontSize: 24,
              letterSpacing: 8,
              fontWeight: 700,
              border: error ? "2px solid #ef4444" : "2px solid #e2e8f0",
              borderRadius: 12,
              padding: "14px 16px",
              outline: "none",
              background: "#f8fafc",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => {
              if (!error) e.currentTarget.style.borderColor = "#22c55e";
            }}
            onBlur={(e) => {
              if (!error) e.currentTarget.style.borderColor = "#e2e8f0";
            }}
            autoFocus
          />
          {error && (
            <div style={{ color: "#ef4444", fontSize: 12, marginTop: 8 }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            style={{
              marginTop: 16,
              width: "100%",
              padding: "14px",
              borderRadius: 12,
              border: "none",
              background: "linear-gradient(135deg, #15803d, #22c55e)",
              color: "#fff",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              letterSpacing: "0.02em",
            }}
          >
            ログイン
          </button>
        </form>
      </div>
    </div>
  );
}
