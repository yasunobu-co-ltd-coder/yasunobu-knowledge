"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr";
import type { KnowledgeTimelineEntry } from "@/types/database";
import EntryDetailModal from "@/components/EntryDetailModal";
import { SkeletonList } from "@/components/Skeleton";
import { List, Users, CheckSquare, FileText, Bell, BellOff, Search } from "lucide-react";

const NOTIF_KEY = "yasunobu-knowledge-notifications";

export default function Home() {
  const [search, setSearch] = useState("");
  const [searchKey, setSearchKey] = useState("");
  const [selected, setSelected] = useState<KnowledgeTimelineEntry | null>(null);
  const [notifEnabled, setNotifEnabled] = useState(true);

  useEffect(() => {
    setNotifEnabled(localStorage.getItem(NOTIF_KEY) !== "off");
  }, []);

  const toggleNotif = async () => {
    if (!notifEnabled) {
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        await Notification.requestPermission();
      }
      localStorage.setItem(NOTIF_KEY, "on");
      setNotifEnabled(true);
    } else {
      localStorage.setItem(NOTIF_KEY, "off");
      setNotifEnabled(false);
    }
  };

  const params = new URLSearchParams({ limit: "20" });
  if (searchKey) params.set("search", searchKey);

  const { data: entries, isLoading } = useSWR<KnowledgeTimelineEntry[]>(
    `/api/timeline?${params}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 5000 }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchKey(search);
  };

  const kw = (entry: KnowledgeTimelineEntry) =>
    Array.isArray(entry.keywords) ? entry.keywords : [];

  const list = entries ?? [];

  const quickLinks = [
    { href: "/timeline", Icon: List, title: "タイムライン", sub: "memo + 議事録" },
    { href: "/clients", Icon: Users, title: "顧客一覧", sub: "顧客カルテ" },
    { href: "/todos", Icon: CheckSquare, title: "TODO", sub: "未完了タスク" },
    { href: "/decisions", Icon: FileText, title: "決定事項", sub: "決定事項追跡" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* 検索 */}
      <form onSubmit={handleSearch} style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          name="search"
          autoComplete="off"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="キーワードで横断検索..."
          style={{
            flex: 1,
            border: "1px solid #d1d5db",
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 14,
            outline: "none",
            background: "#fff",
          }}
        />
        <button
          type="submit"
          style={{
            background: "#15803d",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "10px 18px",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Search style={{ width: 16, height: 16 }} />
          検索
        </button>
      </form>

      {/* クイックリンク */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {quickLinks.map((item) => (
          <a
            key={item.href}
            href={item.href}
            style={{
              textDecoration: "none",
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <item.Icon style={{ width: 22, height: 22, color: "#15803d" }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>
              {item.title}
            </span>
            <span style={{ fontSize: 11, color: "#64748b" }}>{item.sub}</span>
          </a>
        ))}
      </div>

      {/* 通知設定 */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {notifEnabled
            ? <Bell style={{ width: 18, height: 18, color: "#15803d" }} />
            : <BellOff style={{ width: 18, height: 18, color: "#64748b" }} />
          }
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>
              チャット通知
            </div>
            <div style={{ fontSize: 11, color: "#64748b" }}>
              新着メッセージをブラウザ通知でお知らせ
            </div>
          </div>
        </div>
        <button
          onClick={toggleNotif}
          style={{
            width: 48,
            height: 28,
            borderRadius: 14,
            border: "none",
            background: notifEnabled ? "#15803d" : "#cbd5e1",
            cursor: "pointer",
            position: "relative",
            transition: "background 0.2s",
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 3,
              left: notifEnabled ? 23 : 3,
              width: 22,
              height: 22,
              borderRadius: 11,
              background: "#fff",
              transition: "left 0.2s",
              boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
            }}
          />
        </button>
      </div>

      {/* 最新エントリ */}
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", marginBottom: 10 }}>
          最新のナレッジ
        </h2>
        {isLoading ? (
          <SkeletonList count={4} lines={2} />
        ) : list.length === 0 ? (
          <p style={{ textAlign: "center", color: "#64748b", fontSize: 13, padding: "32px 0" }}>
            データがありません
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {list.map((entry) => (
              <div
                key={`${entry.source_type}-${entry.id}`}
                onClick={() => setSelected(entry)}
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: "14px 16px",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span
                    style={{
                      display: "inline-block",
                      borderRadius: 4,
                      padding: "2px 8px",
                      fontSize: 11,
                      fontWeight: 600,
                      background: entry.source_type === "memo" ? "#dcfce7" : "#d1fae5",
                      color: entry.source_type === "memo" ? "#15803d" : "#047857",
                    }}
                  >
                    {entry.source_type === "memo" ? "メモ" : "議事録"}
                  </span>
                  {entry.client_name && (
                    <a
                      href={`/clients/${encodeURIComponent(entry.client_name)}`}
                      onClick={(e) => e.stopPropagation()}
                      style={{ fontSize: 13, fontWeight: 600, color: "#15803d", textDecoration: "none" }}
                    >
                      {entry.client_name}
                    </a>
                  )}
                  <span style={{ fontSize: 11, color: "#64748b" }}>
                    {new Date(entry.created_at).toLocaleDateString("ja-JP")}
                  </span>
                </div>
                <p
                  style={{
                    marginTop: 8,
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
                  {entry.body || entry.summary || "(内容なし)"}
                </p>
                {kw(entry).length > 0 && (
                  <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {kw(entry).map((k, i) => (
                      <span
                        key={i}
                        style={{
                          borderRadius: 20,
                          background: "#f0fdf4",
                          padding: "2px 10px",
                          fontSize: 11,
                          color: "#16a34a",
                        }}
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <EntryDetailModal entry={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
