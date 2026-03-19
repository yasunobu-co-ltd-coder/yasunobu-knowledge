"use client";

import { useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "@/lib/swr";
import type { ClientProfile, KnowledgeTimelineEntry, ChangeLog } from "@/types/database";
import EntryDetailModal from "@/components/EntryDetailModal";
import ClientChat from "@/components/ClientChat";
import { SkeletonList } from "@/components/Skeleton";

type Tab = "karte" | "chat" | "logs";

export default function ClientDetailPage() {
  const params = useParams();
  const clientName = decodeURIComponent(params.name as string);
  const [tab, setTab] = useState<Tab>("karte");
  const [selected, setSelected] = useState<KnowledgeTimelineEntry | null>(null);

  const apiBase = `/api/clients/${encodeURIComponent(clientName)}`;

  const { data: profile, isLoading, mutate } = useSWR<ClientProfile>(
    apiBase,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 10000 }
  );

  // TODO操作のロック
  const busyIds = useRef<Set<string>>(new Set());

  const handleTodoAction = useCallback(
    async (id: string, action: "done" | "delete") => {
      if (busyIds.current.has(id)) return;
      busyIds.current.add(id);
      try {
        if (action === "done") {
          await fetch(`/api/todos/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "done" }),
          });
        } else {
          await fetch(`/api/todos/${id}`, { method: "DELETE" });
        }
        mutate();
      } finally {
        busyIds.current.delete(id);
      }
    },
    [mutate]
  );

  // 変更履歴は「logs」タブ選択時のみ取得
  const { data: changeLogs } = useSWR<ChangeLog[]>(
    tab === "logs" ? `${apiBase}/change-logs` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  if (isLoading)
    return <SkeletonList count={3} lines={3} />;
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
        {(profile.aliases.length > 0 || (profile.variants && profile.variants.length > 0)) && (
          <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "#16a34a" }}>統合:</span>
            {profile.variants?.map((v) => (
              <span
                key={v}
                style={{
                  background: "#dcfce7",
                  borderRadius: 4,
                  padding: "1px 8px",
                  fontSize: 11,
                  color: "#15803d",
                }}
              >
                {v}
              </span>
            ))}
            {profile.aliases.map((a) => (
              <span
                key={a.id}
                style={{
                  background: "#dbeafe",
                  borderRadius: 4,
                  padding: "1px 8px",
                  fontSize: 11,
                  color: "#1d4ed8",
                }}
              >
                {a.alias}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* タブ切替 */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: "1px solid #e2e8f0",
          overflow: "auto",
        }}
      >
        {(
          [
            { key: "karte", label: "カルテ" },
            { key: "chat", label: "AIチャット" },
            { key: "logs", label: "変更履歴" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              background: "none",
              border: "none",
              borderBottom: tab === t.key ? "2px solid #15803d" : "2px solid transparent",
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 600,
              color: tab === t.key ? "#15803d" : "#94a3b8",
              cursor: "pointer",
              whiteSpace: "nowrap",
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
                      background: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      padding: "10px 12px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
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
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginTop: 8,
                      }}
                    >
                      <div style={{ display: "flex", gap: 4, fontSize: 11, color: "#94a3b8" }}>
                        {todo.due_date && <span>期限: {todo.due_date}</span>}
                        {todo.assignee && <span>/ {todo.assignee}</span>}
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => handleTodoAction(todo.id, "done")}
                          style={{
                            background: "#dcfce7",
                            color: "#15803d",
                            border: "none",
                            borderRadius: 6,
                            padding: "4px 10px",
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          完了
                        </button>
                        <button
                          onClick={() => handleTodoAction(todo.id, "delete")}
                          style={{
                            background: "#fee2e2",
                            color: "#991b1b",
                            border: "none",
                            borderRadius: 6,
                            padding: "4px 10px",
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          削除
                        </button>
                      </div>
                    </div>
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

      {/* 変更履歴タブ */}
      {tab === "logs" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {!changeLogs ? (
            <SkeletonList count={3} lines={1} />
          ) : changeLogs.length === 0 ? (
            <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: "32px 0" }}>
              変更履歴はまだありません
            </p>
          ) : (
            changeLogs.map((log) => (
              <div
                key={log.id}
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  padding: "10px 12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span
                    style={{
                      borderRadius: 4,
                      padding: "2px 8px",
                      fontSize: 11,
                      fontWeight: 600,
                      background: changeTypeColor(log.change_type).bg,
                      color: changeTypeColor(log.change_type).text,
                    }}
                  >
                    {changeTypeLabel(log.change_type)}
                  </span>
                  <span
                    style={{
                      borderRadius: 4,
                      padding: "2px 8px",
                      fontSize: 11,
                      background: "#f1f5f9",
                      color: "#475569",
                    }}
                  >
                    {log.source_type}
                  </span>
                  {log.thread_id && (
                    <span
                      style={{
                        borderRadius: 4,
                        padding: "2px 8px",
                        fontSize: 10,
                        background: "#dbeafe",
                        color: "#1d4ed8",
                      }}
                    >
                      AI提案経由
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: "auto" }}>
                    {new Date(log.created_at).toLocaleString("ja-JP", {
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div style={{ marginTop: 6, fontSize: 13, color: "#334155" }}>
                  {log.before_value && log.after_value && (
                    <span>
                      <span style={{ textDecoration: "line-through", color: "#94a3b8" }}>
                        {log.before_value}
                      </span>
                      {" → "}
                      <span style={{ fontWeight: 600 }}>{log.after_value}</span>
                    </span>
                  )}
                  {log.note && (
                    <p style={{ marginTop: 4, fontSize: 12, color: "#64748b" }}>
                      {log.note}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 詳細モーダル */}
      {selected && (
        <EntryDetailModal entry={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function changeTypeLabel(type: string): string {
  switch (type) {
    case "status_update": return "ステータス変更";
    case "content_update": return "内容変更";
    case "create": return "新規作成";
    case "delete": return "削除";
    default: return type;
  }
}

function changeTypeColor(type: string): { bg: string; text: string } {
  switch (type) {
    case "status_update": return { bg: "#fef3c7", text: "#92400e" };
    case "content_update": return { bg: "#dbeafe", text: "#1e40af" };
    case "create": return { bg: "#dcfce7", text: "#15803d" };
    case "delete": return { bg: "#fee2e2", text: "#991b1b" };
    default: return { bg: "#f1f5f9", text: "#475569" };
  }
}
