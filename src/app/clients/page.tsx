"use client";

import { useEffect, useState } from "react";
import type { Client } from "@/types/database";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/clients");
      const data = await res.json();
      setClients(Array.isArray(data) ? data : []);
      setLoading(false);
    })();
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, color: "#1e293b" }}>顧客一覧</h1>

      {loading ? (
        <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: "32px 0" }}>
          読み込み中...
        </p>
      ) : clients.length === 0 ? (
        <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: "32px 0" }}>
          顧客データがありません
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {clients.map((c) => (
            <a
              key={c.id}
              href={`/clients/${encodeURIComponent(c.name)}`}
              style={{
                textDecoration: "none",
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: "14px 16px",
                display: "block",
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 600, color: "#1e293b" }}>
                {c.name}
              </div>
              {c.notes && (
                <p
                  style={{
                    marginTop: 4,
                    fontSize: 12,
                    color: "#64748b",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {c.notes}
                </p>
              )}
              <div style={{ marginTop: 6, fontSize: 11, color: "#94a3b8" }}>
                登録: {new Date(c.created_at).toLocaleDateString("ja-JP")}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
