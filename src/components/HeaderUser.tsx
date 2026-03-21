"use client";

import { useUser } from "@/lib/user-context";
import { LogOut } from "lucide-react";

export default function HeaderUser() {
  const { user, logout } = useUser();
  if (!user) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 12, color: "#475569", fontWeight: 600 }}>
        {user.name}
      </span>
      <button
        onClick={() => {
          logout();
          window.location.href = "/";
        }}
        style={{
          fontSize: 10,
          color: "#64748b",
          background: "none",
          border: "1px solid #e2e8f0",
          borderRadius: 6,
          padding: "3px 8px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 3,
        }}
      >
        <LogOut style={{ width: 14, height: 14 }} />
      </button>
    </div>
  );
}
