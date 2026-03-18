"use client";

import { useEffect, useState, useCallback } from "react";
import type { Decision, DecisionStatus } from "@/types/database";

const STATUS_LABELS: Record<DecisionStatus, string> = {
  active: "有効",
  revised: "改訂済",
  cancelled: "取消",
};

const STATUS_COLORS: Record<DecisionStatus, { bg: string; color: string }> = {
  active: { bg: "#dcfce7", color: "#15803d" },
  revised: { bg: "#fef9c3", color: "#a16207" },
  cancelled: { bg: "#f1f5f9", color: "#64748b" },
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
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, color: "#1e293b" }}>決定事項一覧</h1>

      {/* フィルタ */}
      <div style={{ display: "flex", gap: 6 }}>
        {(["", "active", "revised", "cancelled"] as const).map((v) => (
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
            {v === "" ? "有効のみ" : STATUS_LABELS[v]}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: "32px 0" }}>
          読み込み中...
        </p>
      ) : decisions.length === 0 ? (
        <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: "32px 0" }}>
          決定事項がありません
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {decisions.map((d) => (
            <div
              key={d.id}
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
                    borderRadius: 4,
                    padding: "2px 8px",
                    fontSize: 11,
                    fontWeight: 600,
                    background: STATUS_COLORS[d.status].bg,
                    color: STATUS_COLORS[d.status].color,
                  }}
                >
                  {STATUS_LABELS[d.status]}
                </span>
                {d.client_name && (
                  <a
                    href={`/clients/${encodeURIComponent(d.client_name)}`}
                    style={{ fontSize: 12, fontWeight: 600, color: "#15803d", textDecoration: "none" }}
                  >
                    {d.client_name}
                  </a>
                )}
                <span style={{ fontSize: 10, color: "#94a3b8" }}>
                  {d.source_type === "memo" ? "メモ" : "議事録"}
                </span>
                <span style={{ fontSize: 11, color: "#94a3b8" }}>
                  {new Date(d.created_at).toLocaleDateString("ja-JP")}
                </span>
              </div>
              <p style={{ marginTop: 8, fontSize: 13, color: "#334155", lineHeight: 1.5 }}>
                {d.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
