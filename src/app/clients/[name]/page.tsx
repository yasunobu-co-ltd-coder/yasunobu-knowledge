"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { ClientProfile } from "@/types/database";

export default function ClientDetailPage() {
  const params = useParams();
  const clientName = decodeURIComponent(params.name as string);
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);

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
      <p className="py-8 text-center text-sm text-gray-400">読み込み中...</p>
    );
  if (!profile)
    return (
      <p className="py-8 text-center text-sm text-gray-400">
        顧客が見つかりません
      </p>
    );

  return (
    <div className="space-y-6">
      {/* 顧客ヘッダー */}
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <h1 className="text-2xl font-bold text-green-900">
          {profile.client.name}
        </h1>
        {profile.client.notes && (
          <p className="mt-1 text-sm text-green-700">{profile.client.notes}</p>
        )}
        {profile.aliases.length > 0 && (
          <div className="mt-2 flex gap-1">
            <span className="text-xs text-green-600">別名:</span>
            {profile.aliases.map((a) => (
              <span
                key={a.id}
                className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700"
              >
                {a.alias}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 未完了TODO */}
      {profile.activeTodos.length > 0 && (
        <div>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">
            未完了TODO ({profile.activeTodos.length})
          </h2>
          <div className="space-y-2">
            {profile.activeTodos.map((todo) => (
              <div
                key={todo.id}
                className="flex items-start gap-2 rounded border border-gray-200 bg-white p-3"
              >
                <span
                  className={`mt-0.5 rounded px-1.5 py-0.5 text-xs ${
                    todo.status === "open"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {todo.status}
                </span>
                <span className="text-sm text-gray-700">{todo.content}</span>
                {todo.due_date && (
                  <span className="ml-auto text-xs text-gray-400">
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
          <h2 className="mb-2 text-lg font-semibold text-gray-900">
            決定事項 ({profile.activeDecisions.length})
          </h2>
          <div className="space-y-2">
            {profile.activeDecisions.map((d) => (
              <div
                key={d.id}
                className="rounded border border-gray-200 bg-white p-3 text-sm text-gray-700"
              >
                {d.content}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* タイムライン */}
      <div>
        <h2 className="mb-2 text-lg font-semibold text-gray-900">
          履歴 ({profile.timeline.length})
        </h2>
        <div className="space-y-3">
          {profile.timeline.map((entry) => (
            <div
              key={`${entry.source_type}-${entry.id}`}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${
                    entry.source_type === "memo"
                      ? "bg-green-100 text-green-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {entry.source_type === "memo" ? "メモ" : "議事録"}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(entry.created_at).toLocaleDateString("ja-JP")}
                </span>
              </div>
              <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm text-gray-700">
                {entry.body || entry.summary || ""}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
