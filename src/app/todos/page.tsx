"use client";

import { useEffect, useState, useCallback } from "react";
import type { Todo, TodoStatus } from "@/types/database";

const STATUS_LABELS: Record<TodoStatus, string> = {
  open: "未着手",
  in_progress: "対応中",
  done: "完了",
  cancelled: "取消",
};

export default function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filter, setFilter] = useState<TodoStatus | "">("");
  const [loading, setLoading] = useState(true);

  const fetchTodos = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter) params.set("status", filter);
    const res = await fetch(`/api/todos?${params}`);
    const data = await res.json();
    setTodos(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const updateStatus = async (id: string, status: TodoStatus) => {
    await fetch(`/api/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchTodos();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">TODO一覧</h1>

      {/* フィルタ */}
      <div className="flex gap-1">
        {(["", "open", "in_progress", "done", "cancelled"] as const).map(
          (v) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                filter === v
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {v === "" ? "未完了" : STATUS_LABELS[v]}
            </button>
          )
        )}
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-gray-400">読み込み中...</p>
      ) : todos.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">
          TODOがありません
        </p>
      ) : (
        <div className="space-y-2">
          {todos.map((todo) => (
            <div
              key={todo.id}
              className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              {/* ステータス変更ボタン */}
              <div className="flex flex-col gap-1">
                {todo.status !== "done" && (
                  <button
                    onClick={() => updateStatus(todo.id, "done")}
                    className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700 hover:bg-green-200"
                  >
                    完了
                  </button>
                )}
                {todo.status === "open" && (
                  <button
                    onClick={() => updateStatus(todo.id, "in_progress")}
                    className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-200"
                  >
                    着手
                  </button>
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs ${
                      todo.status === "open"
                        ? "bg-yellow-100 text-yellow-700"
                        : todo.status === "in_progress"
                          ? "bg-blue-100 text-blue-700"
                          : todo.status === "done"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {STATUS_LABELS[todo.status]}
                  </span>
                  {todo.client_name && (
                    <a
                      href={`/clients/${encodeURIComponent(todo.client_name)}`}
                      className="text-xs font-medium text-green-700 hover:underline"
                    >
                      {todo.client_name}
                    </a>
                  )}
                  <span className="rounded bg-gray-50 px-1.5 py-0.5 text-xs text-gray-400">
                    {todo.source_type === "memo" ? "メモ" : "議事録"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-700">{todo.content}</p>
                {todo.due_date && (
                  <p className="mt-1 text-xs text-gray-400">
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
