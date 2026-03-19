"use client";

import { useEffect, useState, useCallback } from "react";
import { useUser } from "@/lib/user-context";
import { supabase } from "@/lib/supabase";

const NAV_ITEMS = [
  { href: "/", label: "ホーム", icon: "\u{1F3E0}" },
  { href: "/timeline", label: "タイムライン", icon: "\u{1F4D1}" },
  { href: "/clients", label: "顧客", icon: "\u{1F465}" },
  { href: "/calendar", label: "カレンダー", icon: "\u{1F4C5}" },
  { href: "/team-chat", label: "チャット", icon: "\u{1F4AC}" },
];

export default function BottomNav() {
  const { user } = useUser();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/team-chat/unread?user_id=${user.id}`);
      const data = await res.json();
      setUnreadCount(data.count || 0);
    } catch { /* ignore */ }
  }, [user]);

  // 初回 + 定期ポーリング
  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000); // 30秒ごと
    return () => clearInterval(interval);
  }, [fetchUnread]);

  // Supabase Realtimeで新着時に即更新
  useEffect(() => {
    if (!supabase || !user) return;

    const channel = supabase
      .channel("bottom-nav-unread")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "team_messages" },
        (payload) => {
          // 自分のメッセージは除外
          if (payload.new && (payload.new as { user_id: string }).user_id !== user.id) {
            setUnreadCount((prev) => prev + 1);
            // ブラウザ通知
            sendBrowserNotification(payload.new as { user_name: string; content: string });
          }
        }
      )
      .subscribe();

    return () => {
      supabase!.removeChannel(channel);
    };
  }, [user]);

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 600,
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderTop: "1px solid #e2e8f0",
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        padding: "8px 0",
        paddingBottom: "calc(8px + env(safe-area-inset-bottom))",
        zIndex: 50,
      }}
    >
      {NAV_ITEMS.map((item) => (
        <a
          key={item.href}
          href={item.href}
          style={{
            textDecoration: "none",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            fontSize: 10,
            color: "#64748b",
            padding: "4px 8px",
            position: "relative",
          }}
        >
          <span style={{ fontSize: 20 }}>{item.icon}</span>
          <span>{item.label}</span>
          {item.href === "/team-chat" && unreadCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                background: "#ef4444",
                color: "#fff",
                fontSize: 9,
                fontWeight: 700,
                borderRadius: 10,
                minWidth: 16,
                height: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 4px",
              }}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </a>
      ))}
    </nav>
  );
}

/** ブラウザ通知を送信 */
function sendBrowserNotification(msg: { user_name: string; content: string }) {
  const enabled = localStorage.getItem("yasunobu-knowledge-notifications") !== "off";
  if (!enabled) return;
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  // ページがフォアグラウンドならスキップ
  if (document.visibilityState === "visible") return;

  new Notification(`${msg.user_name}`, {
    body: msg.content.slice(0, 100),
    icon: "/icon-192.png",
    tag: "team-chat",
  });
}
