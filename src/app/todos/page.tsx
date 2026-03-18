"use client";

import { useState, useRef } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr";
import type { Todo, TodoStatus } from "@/types/database";
import { SkeletonList } from "@/components/Skeleton";

const STATUS_LABELS: Record<TodoStatus, string> = {
  open: "未着手",
  in_progress: "対応中",
  done: "完了",
  cancelled: "取消",
};

const STATUS_COLORS: Record<TodoStatus, { bg: string; color: string }> = {
  open: { bg: "#fef9c3", color: "#a16207" },
  in_progress: { bg: "#dbeafe", color: "#1d4ed8" },
  done: { bg: "#dcfce7", color: "#15803d" },
  cancelled: { bg: "#f1f5f9", color: "#64748b" },
};

export default function TodosPage() {
  const [filter, setFilter] = useState<TodoStatus | "">("");
  const updatingRef = useRef<Set<string>>(new Set());

  const params = new URLSearchParams();
  if (filter) params.set("status", filter);

  const { data: todos, isLoading, mutate } = useSWR<Todo[]>(
    `/api/todos?${params}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 5000 }
  );

  const list = todos ?? [];

  const updateStatus = async (id: string, status: TodoStatus) => {
    if (updatingRef.current.has(id)) return;
    updatingRef.current.add(id);
    try {
      await fetch(`/api/todos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      mutate();
    } finally {
      updatingRef.current.delete(id);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, color: "#1e293b" }}>TODO一覧</h1>

      {/* フィルタ */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {(["", "open", "in_progress", "done", "cancelled"] as const).map((v) => (
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
            {v === "" ? "未完了" : STATUS_LABELS[v]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <SkeletonList count={4} lines={2} />
      ) : list.length === 0 ? (
        <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: "32px 0" }}>
          TODOがありません
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {list.map((todo) => (
            <div
              key={todo.id}
              style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: "14px 16px",
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              {/* アクションボタン */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                {todo.status !== "done" && (
                  <button
                    onClick={() => updateStatus(todo.id, "done")}
                    disabled={updatingRef.current.has(todo.id)}
                    style={{
                      border: "none",
                      borderRadius: 6,
                      padding: "4px 10px",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                      background: "#dcfce7",
                      color: "#15803d",
                    }}
                  >
                    完了
                  </button>
                )}
                {todo.status === "open" && (
                  <button
                    onClick={() => updateStatus(todo.id, "in_progress")}
                    disabled={updatingRef.current.has(todo.id)}
                    style={{
                      border: "none",
                      borderRadius: 6,
                      padding: "4px 10px",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                      background: "#dbeafe",
                      color: "#1d4ed8",
                    }}
                  >
                    着手
                  </button>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span
                    style={{
                      borderRadius: 4,
                      padding: "2px 8px",
                      fontSize: 11,
                      fontWeight: 600,
                      background: STATUS_COLORS[todo.status].bg,
                      color: STATUS_COLORS[todo.status].color,
                    }}
                  >
                    {STATUS_LABELS[todo.status]}
                  </span>
                  {todo.client_name && (
                    <a
                      href={`/clients/${encodeURIComponent(todo.client_name)}`}
                      style={{ fontSize: 12, fontWeight: 600, color: "#15803d", textDecoration: "none" }}
                    >
                      {todo.client_name}
                    </a>
                  )}
                  <span style={{ fontSize: 10, color: "#94a3b8" }}>
                    {todo.source_type === "memo" ? "メモ" : "議事録"}
                  </span>
                </div>
                <p style={{ marginTop: 6, fontSize: 13, color: "#334155", lineHeight: 1.5 }}>
                  {todo.content}
                </p>
                {todo.due_date && (
                  <p style={{ marginTop: 4, fontSize: 11, color: "#94a3b8" }}>
                    期限: {todo.due_date}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
