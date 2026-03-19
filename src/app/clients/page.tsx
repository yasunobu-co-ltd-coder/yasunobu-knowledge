"use client";

import { useEffect, useState, useMemo } from "react";
import type { Client } from "@/types/database";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/clients");
      const data = await res.json();
      setClients(Array.isArray(data) ? data : []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.trim().toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.notes && c.notes.toLowerCase().includes(q))
    );
  }, [clients, search]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, color: "#1e293b" }}>顧客一覧</h1>

      <input
        type="text"
        placeholder="顧客名で検索..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          padding: "10px 14px",
          border: "1px solid #e2e8f0",
          borderRadius: 10,
          fontSize: 14,
          outline: "none",
          background: "#fff",
        }}
      />

      {loading ? (
        <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: "32px 0" }}>
          読み込み中...
        </p>
      ) : filtered.length === 0 ? (
        <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: "32px 0" }}>
          {clients.length === 0 ? "顧客データがありません" : "該当する顧客がありません"}
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((c) => (
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
