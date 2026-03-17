"use client";

import { useEffect, useState } from "react";
import type { Client } from "@/types/database";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/clients");
      const data = await res.json();
      setClients(Array.isArray(data) ? data : []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">顧客一覧</h1>

      {loading ? (
        <p className="py-8 text-center text-sm text-gray-400">読み込み中...</p>
      ) : clients.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">
          顧客データがありません。初期データ投入SQLを実行してください。
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((c) => (
            <a
              key={c.id}
              href={`/clients/${encodeURIComponent(c.name)}`}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:border-green-400 hover:shadow"
            >
              <div className="text-base font-medium text-gray-900">
                {c.name}
              </div>
              {c.notes && (
                <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                  {c.notes}
                </p>
              )}
              <div className="mt-2 text-xs text-gray-400">
                登録: {new Date(c.created_at).toLocaleDateString("ja-JP")}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
