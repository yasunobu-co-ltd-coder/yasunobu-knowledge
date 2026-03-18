"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { ClientProfile, KnowledgeTimelineEntry } from "@/types/database";
import EntryDetailModal from "@/components/EntryDetailModal";
import ClientChat from "@/components/ClientChat";

type Tab = "karte" | "chat";

export default function ClientDetailPage() {
  const params = useParams();
  const clientName = decodeURIComponent(params.name as string);
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("karte");
  const [selected, setSelected] = useState<KnowledgeTimelineEntry | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch(
        `/api/clients/${encodeURIComponent(clientName)}`
      );
      if (res.ok) {
        setProfile(await res.json());
      }
      setLoading(false);
    })();
  }, [clientName]);

  if (loading)
    return (
      <p style={{ padding: "32px 0", textAlign: "center", fontSize: 13, color: "#94a3b8" }}>
        読み込み中...
      </p>
    );
  if (!profile)
    return (
      <p style={{ padding: "32px 0", textAlign: "center", fontSize: 13, color: "#94a3b8" }}>
        顧客が見つかりません
      </p>
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* 顧客ヘッダー */}
      <div
        style={{
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: 12,
          padding: "14px 16px",
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#14532d", margin: 0 }}>
          {profile.client.name}
        </h1>
        {profile.client.notes && (
          <p style={{ fontSize: 13, color: "#15803d", marginTop: 4 }}>
            {profile.client.notes}
          </p>
        )}
        {profile.aliases.length > 0 && (
          <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "#16a34a" }}>別名:</span>
            {profile.aliases.map((a) => (
              <span
                key={a.id}
                style={{
                  background: "#dcfce7",
                  borderRadius: 4,
                  padding: "1px 8px",
                  fontSize: 11,
                  color: "#15803d",
                }}
              >
                {a.alias}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* タブ切替 */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #e2e8f0", paddingBottom: 0 }}>
        {(
          [
            { key: "karte", label: "カルテ" },
            { key: "chat", label: "AIチャット" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              background: "none",
              border: "none",
              borderBottom: tab === t.key ? "2px solid #15803d" : "2px solid transparent",
              padding: "8px 16px",
              fontSize: 14,
              fontWeight: 600,
              color: tab === t.key ? "#15803d" : "#94a3b8",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* カルテタブ */}
      {tab === "karte" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* 未完了TODO */}
          {profile.activeTodos.length > 0 && (
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>
                未完了TODO ({profile.activeTodos.length})
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {profile.activeTodos.map((todo) => (
                  <div
                    key={todo.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      background: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      padding: "10px 12px",
                    }}
                  >
                    <span
                      style={{
                        borderRadius: 4,
                        padding: "2px 8px",
                        fontSize: 11,
                        fontWeight: 600,
                        flexShrink: 0,
                        background:
                          todo.status === "open" ? "#fefce8" : "#dbeafe",
                        color:
                          todo.status === "open" ? "#a16207" : "#1d4ed8",
                      }}
                    >
                      {todo.status}
                    </span>
                    <span style={{ fontSize: 13, color: "#334155", flex: 1 }}>
                      {todo.content}
                    </span>
                    {todo.due_date && (
                      <span style={{ fontSize: 11, color: "#94a3b8", flexShrink: 0 }}>
                        期限: {todo.due_date}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 有効な決定事項 */}
          {profile.activeDecisions.length > 0 && (
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>
                決定事項 ({profile.activeDecisions.length})
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {profile.activeDecisions.map((d) => (
                  <div
                    key={d.id}
                    style={{
                      background: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      padding: "10px 12px",
                      fontSize: 13,
                      color: "#334155",
                    }}
                  >
                    {d.content}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* タイムライン */}
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>
              履歴 ({profile.timeline.length})
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {profile.timeline.map((entry) => (
                <div
                  key={`${entry.source_type}-${entry.id}`}
                  onClick={() => setSelected(entry)}
                  style={{
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 10,
                    padding: "12px 14px",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span
                      style={{
                        borderRadius: 4,
                        padding: "2px 8px",
                        fontSize: 11,
                        fontWeight: 600,
                        background:
                          entry.source_type === "memo" ? "#dcfce7" : "#d1fae5",
                        color:
                          entry.source_type === "memo" ? "#15803d" : "#047857",
                      }}
                    >
                      {entry.source_type === "memo" ? "メモ" : "議事録"}
                    </span>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>
                      {new Date(entry.created_at).toLocaleDateString("ja-JP")}
                    </span>
                  </div>
                  <p
                    style={{
                      marginTop: 6,
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
                    {entry.body || entry.summary || ""}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* チャットタブ */}
      {tab === "chat" && <ClientChat clientName={clientName} />}

      {/* 詳細モーダル */}
      {selected && (
        <EntryDetailModal entry={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
