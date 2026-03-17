"use client";

import { useEffect, useState } from "react";
import type { KnowledgeTimelineEntry, SourceType } from "@/types/database";

export default function TimelinePage() {
  const [entries, setEntries] = useState<KnowledgeTimelineEntry[]>([]);
  const [filter, setFilter] = useState<SourceType | "">("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("limit", "50");
    if (filter) params.set("source_type", filter);
    if (search) params.set("search", search);
    const res = await fetch(`/api/timeline?${params}`);
    const data = await res.json();
    setEntries(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">タイムライン</h1>

      {/* フィルタ + 検索 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {(["", "memo", "minutes"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                filter === v
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {v === "" ? "すべて" : v === "memo" ? "メモ" : "議事録"}
            </button>
          ))}
        </div>
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="検索..."
            className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-green-600 px-4 py-1.5 text-sm text-white hover:bg-green-700"
          >
            検索
          </button>
        </form>
      </div>

      {/* 一覧 */}
      {loading ? (
        <p className="py-8 text-center text-sm text-gray-400">読み込み中...</p>
      ) : entries.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">
          データがありません
        </p>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={`${entry.source_type}-${entry.id}`}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center gap-2 text-sm">
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${
                    entry.source_type === "memo"
                      ? "bg-green-100 text-green-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {entry.source_type === "memo" ? "メモ" : "議事録"}
                </span>
                {entry.client_name && (
                  <a
                    href={`/clients/${encodeURIComponent(entry.client_name)}`}
                    className="font-medium text-green-700 hover:underline"
                  >
                    {entry.client_name}
                  </a>
                )}
                <span className="text-xs text-gray-400">
                  {new Date(entry.created_at).toLocaleDateString("ja-JP")}
                </span>
                {entry.importance && (
                  <span className="rounded bg-yellow-50 px-1.5 py-0.5 text-xs text-yellow-700">
                    重要度: {entry.importance}
                  </span>
                )}
              </div>
              <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm text-gray-700">
                {entry.body || entry.summary || ""}
              </p>
              {entry.keywords && entry.keywords.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {entry.keywords.map((kw, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-600"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
