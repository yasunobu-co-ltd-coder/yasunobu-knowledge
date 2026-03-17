"use client";

import { useEffect, useState, useCallback } from "react";
import type { Decision, DecisionStatus } from "@/types/database";

const STATUS_LABELS: Record<DecisionStatus, string> = {
  active: "有効",
  revised: "改訂済",
  cancelled: "取消",
};

export default function DecisionsPage() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [filter, setFilter] = useState<DecisionStatus | "">("");
  const [loading, setLoading] = useState(true);

  const fetchDecisions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter) params.set("status", filter);
    const res = await fetch(`/api/decisions?${params}`);
    const data = await res.json();
    setDecisions(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchDecisions();
  }, [fetchDecisions]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">決定事項一覧</h1>

      {/* フィルタ */}
      <div className="flex gap-1">
        {(["", "active", "revised", "cancelled"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              filter === v
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {v === "" ? "有効のみ" : STATUS_LABELS[v]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-gray-400">読み込み中...</p>
      ) : decisions.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">
          決定事項がありません
        </p>
      ) : (
        <div className="space-y-2">
          {decisions.map((d) => (
            <div
              key={d.id}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`rounded px-1.5 py-0.5 text-xs ${
                    d.status === "active"
                      ? "bg-green-100 text-green-700"
                      : d.status === "revised"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {STATUS_LABELS[d.status]}
                </span>
                {d.client_name && (
                  <a
                    href={`/clients/${encodeURIComponent(d.client_name)}`}
                    className="text-xs font-medium text-green-700 hover:underline"
                  >
                    {d.client_name}
                  </a>
                )}
                <span className="rounded bg-gray-50 px-1.5 py-0.5 text-xs text-gray-400">
                  {d.source_type === "memo" ? "メモ" : "議事録"}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(d.created_at).toLocaleDateString("ja-JP")}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-700">{d.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
