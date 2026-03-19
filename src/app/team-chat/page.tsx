"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr";
import { useUser } from "@/lib/user-context";
import { supabase } from "@/lib/supabase";

type Channel = {
  id: string;
  name: string;
  client_name: string | null;
  created_at: string;
};

type TeamMessage = {
  id: string;
  channel_id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
};

export default function TeamChatPage() {
  const { user } = useUser();
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);

  // チャンネル一覧
  const { data: channels, mutate: mutateChannels } = useSWR<Channel[]>(
    "/api/team-chat/channels",
    fetcher,
    { dedupingInterval: 30000 }
  );

  // 初期チャンネル選択
  useEffect(() => {
    if (channels && channels.length > 0 && !activeChannelId) {
      setActiveChannelId(channels[0].id);
    }
  }, [channels, activeChannelId]);

  // 既読更新
  const markAsRead = useCallback(async (channelId: string) => {
    if (!user) return;
    fetch("/api/team-chat/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.id, channel_id: channelId }),
    });
  }, [user]);

  // メッセージ取得
  const loadMessages = useCallback(async (channelId: string) => {
    try {
      const res = await fetch(`/api/team-chat/messages?channel_id=${channelId}&limit=100`);
      const data = await res.json();
      if (Array.isArray(data)) setMessages(data);
      // チャンネルを開いたら既読にする
      markAsRead(channelId);
    } catch { /* ignore */ }
  }, [markAsRead]);

  useEffect(() => {
    if (activeChannelId) loadMessages(activeChannelId);
  }, [activeChannelId, loadMessages]);

  // Supabase Realtime
  useEffect(() => {
    if (!activeChannelId || !supabase) return;

    const channel = supabase
      .channel(`team-chat-${activeChannelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "team_messages",
          filter: `channel_id=eq.${activeChannelId}`,
        },
        (payload) => {
          const newMsg = payload.new as TeamMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          // 表示中なので既読更新
          markAsRead(activeChannelId);
        }
      )
      .subscribe();

    return () => {
      supabase!.removeChannel(channel);
    };
  }, [activeChannelId]);

  // 自動スクロール
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !user || !activeChannelId || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);

    try {
      const res = await fetch("/api/team-chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel_id: activeChannelId,
          user_id: user.id,
          user_name: user.name,
          content: input.trim(),
        }),
      });
      if (res.ok) {
        const newMsg = await res.json();
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        setInput("");
      }
    } finally {
      setSending(false);
      sendingRef.current = false;
    }
  };

  const createChannel = async () => {
    if (!newChannelName.trim()) return;
    try {
      const res = await fetch("/api/team-chat/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newChannelName.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`チャンネル作成エラー: ${err.error || res.statusText}`);
        return;
      }
      setNewChannelName("");
      setShowNewChannel(false);
      mutateChannels();
    } catch (e) {
      alert(`通信エラー: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const activeChannel = channels?.find((c) => c.id === activeChannelId);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, height: "calc(100dvh - 160px)" }}>
      {/* チャンネルタブ */}
      <div style={{ display: "flex", gap: 6, padding: "0 0 8px", overflowX: "auto", flexShrink: 0 }}>
        {channels?.map((ch) => (
          <button
            key={ch.id}
            onClick={() => setActiveChannelId(ch.id)}
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              border: ch.id === activeChannelId ? "2px solid #15803d" : "1px solid #e2e8f0",
              background: ch.id === activeChannelId ? "#f0fdf4" : "#fff",
              color: ch.id === activeChannelId ? "#15803d" : "#64748b",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {ch.name}
          </button>
        ))}
        <button
          onClick={() => setShowNewChannel(true)}
          style={{
            padding: "6px 12px",
            borderRadius: 20,
            border: "1px dashed #cbd5e1",
            background: "#fff",
            color: "#94a3b8",
            fontSize: 13,
            cursor: "pointer",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          +
        </button>
      </div>

      {/* 新規チャンネル作成 */}
      {showNewChannel && (
        <div style={{ display: "flex", gap: 6, padding: "4px 0 8px", flexShrink: 0 }}>
          <input
            name="channel-name"
            value={newChannelName}
            onChange={(e) => setNewChannelName(e.target.value)}
            placeholder="チャンネル名"
            style={{
              flex: 1, padding: "8px 12px", borderRadius: 8,
              border: "1px solid #e2e8f0", fontSize: 13, outline: "none",
            }}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && createChannel()}
          />
          <button onClick={createChannel} style={actionBtnStyle}>作成</button>
          <button onClick={() => setShowNewChannel(false)} style={{ ...actionBtnStyle, background: "#f1f5f9", color: "#64748b" }}>
            取消
          </button>
        </div>
      )}

      {/* チャンネルヘッダー */}
      {activeChannel && (
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", padding: "4px 0 8px", flexShrink: 0 }}>
          {activeChannel.name}
          {activeChannel.client_name && (
            <span style={{ fontSize: 11, color: "#64748b", fontWeight: 400, marginLeft: 8 }}>
              ({activeChannel.client_name})
            </span>
          )}
        </div>
      )}

      {/* メッセージ一覧 */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 4,
          padding: "8px 0",
          minHeight: 0,
        }}
      >
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: "40px 0" }}>
            メッセージがありません
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.user_id === user?.id;
          const time = new Date(msg.created_at).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
          return (
            <div
              key={msg.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: isMe ? "flex-end" : "flex-start",
              }}
            >
              {!isMe && (
                <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 2, paddingLeft: 4 }}>
                  {msg.user_name}
                </span>
              )}
              <div
                style={{
                  maxWidth: "85%",
                  padding: "8px 12px",
                  borderRadius: isMe ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                  background: isMe ? "#15803d" : "#f1f5f9",
                  color: isMe ? "#fff" : "#1e293b",
                  fontSize: 14,
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {msg.content}
              </div>
              <span style={{ fontSize: 10, color: "#94a3b8", marginTop: 2, padding: "0 4px" }}>
                {time}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* 入力欄 */}
      <div style={{ display: "flex", gap: 8, padding: "8px 0 0", flexShrink: 0 }}>
        <input
          name="team-message"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder="メッセージを入力..."
          style={{
            flex: 1, padding: "10px 14px", borderRadius: 12,
            border: "1px solid #e2e8f0", fontSize: 14, outline: "none",
          }}
          disabled={!user || !activeChannelId}
        />
        <button
          onClick={sendMessage}
          disabled={sending || !input.trim() || !user}
          style={{
            padding: "10px 20px",
            borderRadius: 12,
            border: "none",
            background: sending || !input.trim() ? "#94a3b8" : "#15803d",
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            cursor: sending || !input.trim() ? "default" : "pointer",
          }}
        >
          送信
        </button>
      </div>
    </div>
  );
}

const actionBtnStyle: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "none",
  background: "#15803d",
  color: "#fff",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};
