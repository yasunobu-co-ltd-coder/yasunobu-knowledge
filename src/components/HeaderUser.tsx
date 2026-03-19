"use client";

import { useUser } from "@/lib/user-context";

export default function HeaderUser() {
  const { user, logout } = useUser();
  if (!user) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>
        {user.name}
      </span>
      <button
        onClick={() => {
          sessionStorage.removeItem("yasunobu_knowledge_pin_verified");
          logout();
          window.location.href = "/";
        }}
        style={{
          fontSize: 10,
          color: "#94a3b8",
          background: "none",
          border: "1px solid #e2e8f0",
          borderRadius: 6,
          padding: "3px 8px",
          cursor: "pointer",
        }}
      >
        切替
      </button>
    </div>
  );
}
