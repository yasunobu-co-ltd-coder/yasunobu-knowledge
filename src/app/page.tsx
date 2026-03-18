"use client";

import { useEffect, useState } from "react";
import type { KnowledgeTimelineEntry } from "@/types/database";

export default function Home() {
  const [entries, setEntries] = useState<KnowledgeTimelineEntry[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = async (searchText?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "20");
      if (searchText) params.set("search", searchText);
      const res = await fetch(`/api/timeline?${params}`);
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData(search);
  };

  const kw = (entry: KnowledgeTimelineEntry) =>
    Array.isArray(entry.keywords) ? entry.keywords : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* 検索 */}
      <form onSubmit={handleSearch} style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="キーワードで横断検索..."
          style={{
            flex: 1,
            border: "1px solid #d1d5db",
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 14,
            outline: "none",
            background: "#fff",
          }}
        />
        <button
          type="submit"
          style={{
            background: "#15803d",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "10px 18px",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          検索
        </button>
      </form>

      {/* クイックリンク */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
        }}
      >
        {[
          { href: "/timeline", icon: "\u{1F4D1}", title: "タイムライン", sub: "memo + 議事録" },
          { href: "/clients", icon: "\u{1F465}", title: "顧客一覧", sub: "顧客カルテ" },
          { href: "/todos", icon: "\u2611", title: "TODO", sub: "未完了タスク" },
          { href: "/decisions", icon: "\u{1F4DD}", title: "決定事項", sub: "決定事項追跡" },
        ].map((item) => (
          <a
            key={item.href}
            href={item.href}
            style={{
              textDecoration: "none",
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <span style={{ fontSize: 22 }}>{item.icon}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>
              {item.title}
            </span>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>{item.sub}</span>
          </a>
        ))}
      </div>

      {/* 最新エントリ */}
      <div>
        <h2
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "#1e293b",
            marginBottom: 10,
          }}
        >
          最新のナレッジ
        </h2>
        {loading ? (
          <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: "32px 0" }}>
            読み込み中...
          </p>
        ) : entries.length === 0 ? (
          <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: "32px 0" }}>
            データがありません
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {entries.map((entry) => (
              <div
                key={`${entry.source_type}-${entry.id}`}
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: "14px 16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span
                    style={{
                      display: "inline-block",
                      borderRadius: 4,
                      padding: "2px 8px",
                      fontSize: 11,
                      fontWeight: 600,
                      background: entry.source_type === "memo" ? "#dcfce7" : "#d1fae5",
                      color: entry.source_type === "memo" ? "#15803d" : "#047857",
                    }}
                  >
                    {entry.source_type === "memo" ? "メモ" : "議事録"}
                  </span>
                  {entry.client_name && (
                    <a
                      href={`/clients/${encodeURIComponent(entry.client_name)}`}
                      style={{ fontSize: 13, fontWeight: 600, color: "#15803d", textDecoration: "none" }}
                    >
                      {entry.client_name}
                    </a>
                  )}
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>
                    {new Date(entry.created_at).toLocaleDateString("ja-JP")}
                  </span>
                </div>
                <p
                  style={{
                    marginTop: 8,
                    fontSize: 13,
                    color: "#334155",
                    lineHeight: 1.6,
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {entry.body || entry.summary || "(内容なし)"}
                </p>
                {kw(entry).length > 0 && (
                  <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {kw(entry).map((k, i) => (
                      <span
                        key={i}
                        style={{
                          borderRadius: 20,
                          background: "#f0fdf4",
                          padding: "2px 10px",
                          fontSize: 11,
                          color: "#16a34a",
                        }}
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
