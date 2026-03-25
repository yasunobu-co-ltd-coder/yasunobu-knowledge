"use client";

import { useEffect, useState } from "react";
import type { KnowledgeTimelineEntry } from "@/types/database";

type Props = {
  entry: KnowledgeTimelineEntry;
  onClose: () => void;
};

// UUID→ユーザー名の変換キャッシュ
let _usersCache: { map: Map<string, string>; ts: number } | null = null;

export default function EntryDetailModal({ entry, onClose }: Props) {
  const [userMap, setUserMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (_usersCache && Date.now() - _usersCache.ts < 60_000) {
      setUserMap(_usersCache.map);
      return;
    }
    fetch("/api/users").then(r => r.json()).then((users: { id: string; name: string }[]) => {
      const m = new Map<string, string>();
      users.forEach(u => m.set(u.id, u.name));
      _usersCache = { map: m, ts: Date.now() };
      setUserMap(m);
    }).catch(() => {});
  }, []);

  const resolveUser = (id: string | null | undefined) => {
    if (!id) return null;
    return userMap.get(id) || id;
  };
  const isMemo = entry.source_type === "memo";
  const kw = Array.isArray(entry.keywords) ? entry.keywords : [];
  const decisions = Array.isArray(entry.decisions_json)
    ? entry.decisions_json
    : [];
  const todos = Array.isArray(entry.todos_json) ? entry.todos_json : [];

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 16,
          width: "100%",
          maxWidth: 440,
          maxHeight: "80vh",
          overflow: "auto",
          padding: "20px 18px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {/* ヘッダー */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                borderRadius: 6,
                padding: "3px 10px",
                fontSize: 12,
                fontWeight: 700,
                background: isMemo ? "#dcfce7" : "#d1fae5",
                color: isMemo ? "#15803d" : "#047857",
              }}
            >
              {isMemo ? "メモ" : "議事録"}
            </span>
            {entry.client_name && (
              <a
                href={`/clients/${encodeURIComponent(entry.client_name)}`}
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#15803d",
                  textDecoration: "none",
                }}
              >
                {entry.client_name}
              </a>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 20,
              color: "#94a3b8",
              cursor: "pointer",
              lineHeight: 1,
              padding: 4,
            }}
          >
            ×
          </button>
        </div>

        {/* メタ情報 */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            fontSize: 12,
            color: "#64748b",
          }}
        >
          <span>
            作成:{" "}
            {new Date(entry.created_at).toLocaleString("ja-JP", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {entry.status && entry.status !== "done" && (
            <span
              style={{
                background: "#fefce8",
                color: "#a16207",
                borderRadius: 4,
                padding: "1px 8px",
                fontWeight: 600,
              }}
            >
              {entry.status}
            </span>
          )}
        </div>

        {/* メモ固有: 重要度・急ぎ・利益度 */}
        {isMemo && (entry.importance || entry.urgency || entry.profit) && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {entry.importance && (
              <Tag label="重要度" value={entry.importance} bg="#fef3c7" color="#92400e" />
            )}
            {entry.urgency && (
              <Tag label="急ぎ" value={entry.urgency} bg="#fee2e2" color="#991b1b" />
            )}
            {entry.profit && (
              <Tag label="利益度" value={entry.profit} bg="#dbeafe" color="#1e40af" />
            )}
          </div>
        )}

        {/* メモ固有: 期限・担当 */}
        {isMemo && (entry.due_date || entry.assignee) && (
          <div style={{ display: "flex", gap: 12, fontSize: 13, color: "#475569" }}>
            {entry.due_date && <span>期限: {entry.due_date}</span>}
            {entry.assignee && <span>担当: {resolveUser(entry.assignee)}</span>}
            {entry.assignment_type && (
              <span
                style={{
                  background: "#f1f5f9",
                  borderRadius: 4,
                  padding: "1px 8px",
                  fontSize: 11,
                }}
              >
                {entry.assignment_type}
              </span>
            )}
          </div>
        )}

        {/* 本文 */}
        {(entry.body || entry.summary) && (
          <div>
            <SectionTitle>{isMemo ? "内容" : "要約"}</SectionTitle>
            <p
              style={{
                fontSize: 14,
                color: "#1e293b",
                lineHeight: 1.8,
                whiteSpace: "pre-wrap",
                margin: 0,
              }}
            >
              {entry.body || entry.summary}
            </p>
          </div>
        )}

        {/* 議事録固有: 文字起こし */}
        {!isMemo && entry.transcript && (
          <div>
            <SectionTitle>文字起こし</SectionTitle>
            <p
              style={{
                fontSize: 13,
                color: "#475569",
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
                margin: 0,
                maxHeight: 200,
                overflow: "auto",
                background: "#f8fafc",
                borderRadius: 8,
                padding: 12,
              }}
            >
              {entry.transcript}
            </p>
          </div>
        )}

        {/* 議事録固有: 決定事項 */}
        {decisions.length > 0 && (
          <div>
            <SectionTitle>決定事項</SectionTitle>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#334155", lineHeight: 1.8 }}>
              {decisions.map((d, i) => (
                <li key={i}>{typeof d === "string" ? d : JSON.stringify(d)}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 議事録固有: TODO */}
        {todos.length > 0 && (
          <div>
            <SectionTitle>TODO</SectionTitle>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#334155", lineHeight: 1.8 }}>
              {todos.map((t, i) => (
                <li key={i}>{typeof t === "string" ? t : JSON.stringify(t)}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 議事録固有: 次回予定 */}
        {entry.next_schedule && (
          <div style={{ fontSize: 13, color: "#475569" }}>
            <span style={{ fontWeight: 600 }}>次回予定:</span> {entry.next_schedule}
          </div>
        )}

        {/* キーワード */}
        {kw.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {kw.map((k, i) => (
              <span
                key={i}
                style={{
                  borderRadius: 20,
                  background: "#f0fdf4",
                  padding: "3px 12px",
                  fontSize: 12,
                  color: "#16a34a",
                  fontWeight: 500,
                }}
              >
                {k}
              </span>
            ))}
          </div>
        )}

        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          style={{
            marginTop: 4,
            width: "100%",
            padding: "10px 0",
            borderRadius: 10,
            border: "1px solid #d1d5db",
            background: "#f8fafc",
            fontSize: 14,
            fontWeight: 600,
            color: "#64748b",
            cursor: "pointer",
          }}
        >
          閉じる
        </button>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        fontSize: 12,
        fontWeight: 700,
        color: "#94a3b8",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 6,
      }}
    >
      {children}
    </h3>
  );
}

function Tag({
  label,
  value,
  bg,
  color,
}: {
  label: string;
  value: string;
  bg: string;
  color: string;
}) {
  return (
    <span
      style={{
        background: bg,
        color,
        borderRadius: 6,
        padding: "2px 10px",
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {label}: {value}
    </span>
  );
}
