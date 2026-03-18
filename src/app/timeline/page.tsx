"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr";
import type { KnowledgeTimelineEntry, SourceType } from "@/types/database";
import EntryDetailModal from "@/components/EntryDetailModal";
import { SkeletonList } from "@/components/Skeleton";

export default function TimelinePage() {
  const [filter, setFilter] = useState<SourceType | "">("");
  const [search, setSearch] = useState("");
  const [searchKey, setSearchKey] = useState("");
  const [selected, setSelected] = useState<KnowledgeTimelineEntry | null>(null);

  const params = new URLSearchParams({ limit: "50" });
  if (filter) params.set("source_type", filter);
  if (searchKey) params.set("search", searchKey);

  const { data: entries, isLoading } = useSWR<KnowledgeTimelineEntry[]>(
    `/api/timeline?${params}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 5000 }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchKey(search);
  };

  const kw = (entry: KnowledgeTimelineEntry) =>
    Array.isArray(entry.keywords) ? entry.keywords : [];

  const list = entries ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, color: "#1e293b" }}>タイムライン</h1>

      {/* フィルタ + 検索 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {(["", "memo", "minutes"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              style={{
                border: "none",
                borderRadius: 20,
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                background: filter === v ? "#15803d" : "#f1f5f9",
                color: filter === v ? "#fff" : "#64748b",
              }}
            >
              {v === "" ? "すべて" : v === "memo" ? "メモ" : "議事録"}
            </button>
          ))}
        </div>
        <form onSubmit={handleSearch} style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            name="search"
            autoComplete="off"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="検索..."
            style={{
              flex: 1,
              border: "1px solid #d1d5db",
              borderRadius: 10,
              padding: "8px 12px",
              fontSize: 13,
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
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            検索
          </button>
        </form>
      </div>

      {/* 一覧 */}
      {isLoading ? (
        <SkeletonList count={5} lines={2} />
      ) : list.length === 0 ? (
        <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: "32px 0" }}>
          データがありません
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {list.map((entry) => (
            <div
              key={`${entry.source_type}-${entry.id}`}
              onClick={() => setSelected(entry)}
              style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: "14px 16px",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span
                  style={{
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
                    onClick={(e) => e.stopPropagation()}
                    style={{ fontSize: 13, fontWeight: 600, color: "#15803d", textDecoration: "none" }}
                  >
                    {entry.client_name}
                  </a>
                )}
                <span style={{ fontSize: 11, color: "#94a3b8" }}>
                  {new Date(entry.created_at).toLocaleDateString("ja-JP")}
                </span>
                {entry.importance && (
                  <span
                    style={{
                      borderRadius: 4,
                      padding: "2px 8px",
                      fontSize: 10,
                      background: "#fefce8",
                      color: "#a16207",
                    }}
                  >
                    重要度: {entry.importance}
                  </span>
                )}
              </div>
              <p
                style={{
                  marginTop: 8,
                  fontSize: 13,
                  color: "#334155",
                  lineHeight: 1.6,
                  display: "-webkit-box",
                  WebkitLineClamp: 4,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  whiteSpace: "pre-wrap",
                }}
              >
                {entry.body || entry.summary || ""}
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

      {selected && (
        <EntryDetailModal entry={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
