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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
        <p className="text-sm text-gray-500">
          memo / pocket を横断してナレッジを検索
        </p>
      </div>

      {/* 検索 */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="キーワードで横断検索..."
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        />
        <button
          type="submit"
          className="rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          検索
        </button>
      </form>

      {/* クイックリンク */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <a
          href="/timeline"
          className="rounded-lg border border-green-200 bg-white p-4 shadow-sm hover:border-green-400 hover:shadow"
        >
          <div className="text-2xl">&#128209;</div>
          <div className="mt-1 text-sm font-medium text-gray-900">
            タイムライン
          </div>
          <div className="text-xs text-gray-500">memo + 議事録を時系列表示</div>
        </a>
        <a
          href="/clients"
          className="rounded-lg border border-green-200 bg-white p-4 shadow-sm hover:border-green-400 hover:shadow"
        >
          <div className="text-2xl">&#128101;</div>
          <div className="mt-1 text-sm font-medium text-gray-900">
            顧客一覧
          </div>
          <div className="text-xs text-gray-500">顧客カルテ・履歴</div>
        </a>
        <a
          href="/todos"
          className="rounded-lg border border-green-200 bg-white p-4 shadow-sm hover:border-green-400 hover:shadow"
        >
          <div className="text-2xl">&#9745;</div>
          <div className="mt-1 text-sm font-medium text-gray-900">TODO</div>
          <div className="text-xs text-gray-500">未完了タスクの追跡</div>
        </a>
        <a
          href="/decisions"
          className="rounded-lg border border-green-200 bg-white p-4 shadow-sm hover:border-green-400 hover:shadow"
        >
          <div className="text-2xl">&#128221;</div>
          <div className="mt-1 text-sm font-medium text-gray-900">
            決定事項
          </div>
          <div className="text-xs text-gray-500">決定事項の追跡</div>
        </a>
      </div>

      {/* 最新エントリ */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          最新のナレッジ
        </h2>
        {loading ? (
          <div className="py-8 text-center text-sm text-gray-400">
            読み込み中...
          </div>
        ) : entries.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">
            データがありません。Supabase の接続設定を確認してください。
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <div
                key={`${entry.source_type}-${entry.id}`}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
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
                      className="text-sm font-medium text-green-700 hover:underline"
                    >
                      {entry.client_name}
                    </a>
                  )}
                  <span className="text-xs text-gray-400">
                    {new Date(entry.created_at).toLocaleDateString("ja-JP")}
                  </span>
                  {entry.status && (
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                      {entry.status}
                    </span>
                  )}
                </div>
                <p className="mt-2 line-clamp-3 text-sm text-gray-700">
                  {entry.body || entry.summary || "(内容なし)"}
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
    </div>
  );
}
