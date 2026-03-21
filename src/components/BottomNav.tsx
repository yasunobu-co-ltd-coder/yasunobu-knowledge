"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useUser } from "@/lib/user-context";
import { supabase } from "@/lib/supabase";
import { Home, List, Users, CalendarDays, MessageCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const NAV_ITEMS: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: "/", label: "ホーム", Icon: Home },
  { href: "/timeline", label: "タイムライン", Icon: List },
  { href: "/clients", label: "顧客", Icon: Users },
  { href: "/calendar", label: "カレンダー", Icon: CalendarDays },
  { href: "/team-chat", label: "チャット", Icon: MessageCircle },
];

export default function BottomNav() {
  const { user } = useUser();
  const [unreadCount, setUnreadCount] = useState(0);
  const realtimeOk = useRef(false);

  const fetchUnread = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/team-chat/unread?user_id=${user.id}`);
      const data = await res.json();
      setUnreadCount(data.count || 0);
    } catch { /* ignore */ }
  }, [user]);

  // 初回 + ポーリング（Realtime未接続時は10秒、接続時は60秒）
  useEffect(() => {
    fetchUnread();
    const interval = setInterval(() => {
      fetchUnread();
    }, realtimeOk.current ? 60000 : 10000);
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
          if (payload.new && (payload.new as { user_id: string }).user_id !== user.id) {
            setUnreadCount((prev) => prev + 1);
            sendBrowserNotification(payload.new as { user_name: string; content: string });
          }
        }
      )
      .subscribe((status) => {
        realtimeOk.current = status === "SUBSCRIBED";
      });

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
        background: "#fff",
        borderTop: "1px solid #e2e8f0",
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        padding: "12px 0",
        paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
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
          <item.Icon style={{ width: 22, height: 22 }} />
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
  if (document.visibilityState === "visible" && window.location.pathname === "/team-chat") return;

  new Notification(`${msg.user_name}`, {
    body: msg.content.slice(0, 100),
    icon: "/icon-192.png",
    tag: "team-chat",
  });
}
