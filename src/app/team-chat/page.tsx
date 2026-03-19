"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr";
import { useUser, AppUser } from "@/lib/user-context";
import { supabase } from "@/lib/supabase";

type Channel = { id: string; name: string; client_name: string | null; created_at: string };
type TeamMessage = {
  id: string; channel_id: string; user_id: string; user_name: string; content: string; created_at: string;
  reply_to_id: string | null; attachment_type: string | null; attachment_id: string | null;
};
type ReadStatus = { user_id: string; last_read_at: string };
type AttachmentItem = { id: string; type: "memo" | "minutes" | "todo" | "decision"; label: string; client_name: string | null };

const TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  memo: { label: "メモ", color: "#1d4ed8", bg: "#dbeafe" },
  minutes: { label: "議事録", color: "#7c3aed", bg: "#f3e8ff" },
  todo: { label: "TODO", color: "#a16207", bg: "#fefce8" },
  decision: { label: "決定", color: "#15803d", bg: "#dcfce7" },
};

export default function TeamChatPage() {
  const { user } = useUser();
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [readStatuses, setReadStatuses] = useState<ReadStatus[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // チャンネル作成
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());

  // メンバー管理
  const [showMembers, setShowMembers] = useState(false);
  const [channelMembers, setChannelMembers] = useState<string[]>([]);

  // リプライ
  const [replyTo, setReplyTo] = useState<TeamMessage | null>(null);

  // 添付
  const [showAttachPanel, setShowAttachPanel] = useState(false);
  const [attachSearch, setAttachSearch] = useState("");
  const [attachResults, setAttachResults] = useState<AttachmentItem[]>([]);
  const [selectedAttachment, setSelectedAttachment] = useState<AttachmentItem | null>(null);
  const [attachLoading, setAttachLoading] = useState(false);
  const attachSearchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // ユーザー一覧
  const { data: allUsers } = useSWR<AppUser[]>("/api/users", fetcher, { dedupingInterval: 60000 });
  const { data: channels, mutate: mutateChannels } = useSWR<Channel[]>("/api/team-chat/channels", fetcher, { dedupingInterval: 30000 });

  // SW登録 + Push購読
  useEffect(() => {
    if (!user || typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").then(async (reg) => {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) return;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        if (Notification.permission !== "granted") return;
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
      }
      fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), user_id: user.id }),
      });
    }).catch(() => {});
  }, [user]);

  // 初期チャンネル選択
  useEffect(() => {
    if (channels && channels.length > 0 && !activeChannelId) {
      setActiveChannelId(channels[0].id);
    }
  }, [channels, activeChannelId]);

  const markAsRead = useCallback(async (channelId: string) => {
    if (!user) return;
    fetch("/api/team-chat/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.id, channel_id: channelId }),
    });
  }, [user]);

  const loadReadStatuses = useCallback(async (channelId: string) => {
    try {
      const res = await fetch(`/api/team-chat/readers?channel_id=${channelId}`);
      const data = await res.json();
      if (Array.isArray(data)) setReadStatuses(data);
    } catch { /* ignore */ }
  }, []);

  const loadMessages = useCallback(async (channelId: string) => {
    try {
      const res = await fetch(`/api/team-chat/messages?channel_id=${channelId}&limit=100`);
      const data = await res.json();
      if (Array.isArray(data)) setMessages(data);
      markAsRead(channelId);
      loadReadStatuses(channelId);
    } catch { /* ignore */ }
  }, [markAsRead, loadReadStatuses]);

  const loadChannelMembers = useCallback(async (channelId: string) => {
    try {
      const res = await fetch(`/api/team-chat/channels/${channelId}/members`);
      const data = await res.json();
      if (Array.isArray(data)) setChannelMembers(data.map((m: { user_id: string }) => m.user_id));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (activeChannelId) {
      loadMessages(activeChannelId);
      loadChannelMembers(activeChannelId);
    }
  }, [activeChannelId, loadMessages, loadChannelMembers]);

  // Realtime
  useEffect(() => {
    if (!activeChannelId || !supabase) return;
    const channel = supabase
      .channel(`team-chat-${activeChannelId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "team_messages", filter: `channel_id=eq.${activeChannelId}` },
        (payload) => {
          const newMsg = payload.new as TeamMessage;
          setMessages((prev) => prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]);
          markAsRead(activeChannelId);
          setTimeout(() => loadReadStatuses(activeChannelId), 1000);
        }
      )
      .subscribe();
    return () => { supabase!.removeChannel(channel); };
  }, [activeChannelId, markAsRead, loadReadStatuses]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // 既読人数計算
  const getReadCount = (msg: TeamMessage) => {
    if (msg.user_id !== user?.id) return null;
    const msgTime = new Date(msg.created_at).getTime();
    return readStatuses.filter((rs) => rs.user_id !== user?.id && new Date(rs.last_read_at).getTime() >= msgTime).length;
  };

  // 添付検索（デバウンス）
  const searchAttachments = useCallback((q: string) => {
    clearTimeout(attachSearchTimer.current);
    attachSearchTimer.current = setTimeout(async () => {
      setAttachLoading(true);
      try {
        const res = await fetch(`/api/team-chat/attachments?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (Array.isArray(data)) setAttachResults(data);
      } catch { /* ignore */ }
      setAttachLoading(false);
    }, 300);
  }, []);

  useEffect(() => {
    if (showAttachPanel) searchAttachments(attachSearch);
  }, [attachSearch, showAttachPanel, searchAttachments]);

  const sendMessage = async () => {
    if (!input.trim() || !user || !activeChannelId || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    try {
      const body: Record<string, unknown> = {
        channel_id: activeChannelId, user_id: user.id, user_name: user.name, content: input.trim(),
      };
      if (replyTo) body.reply_to_id = replyTo.id;
      if (selectedAttachment) {
        body.attachment_type = selectedAttachment.type;
        body.attachment_id = selectedAttachment.id;
      }
      const res = await fetch("/api/team-chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const newMsg = await res.json();
        setMessages((prev) => prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]);
        setInput("");
        setReplyTo(null);
        setSelectedAttachment(null);
      }
    } finally { setSending(false); sendingRef.current = false; }
  };

  const createChannel = async () => {
    if (!newChannelName.trim() || !user) return;
    try {
      const res = await fetch("/api/team-chat/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newChannelName.trim() }),
      });
      if (!res.ok) { alert(`エラー: ${(await res.json()).error}`); return; }
      const ch = await res.json();
      const memberIds = [...selectedMembers];
      if (!memberIds.includes(user.id)) memberIds.push(user.id);
      await fetch(`/api/team-chat/channels/${ch.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_ids: memberIds }),
      });
      setNewChannelName("");
      setSelectedMembers(new Set());
      setShowNewChannel(false);
      mutateChannels();
      setActiveChannelId(ch.id);
    } catch (e) { alert(`通信エラー: ${e instanceof Error ? e.message : String(e)}`); }
  };

  const toggleMember = async (userId: string) => {
    if (!activeChannelId) return;
    if (channelMembers.includes(userId)) {
      await fetch(`/api/team-chat/channels/${activeChannelId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      setChannelMembers((prev) => prev.filter((id) => id !== userId));
    } else {
      await fetch(`/api/team-chat/channels/${activeChannelId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_ids: [userId] }),
      });
      setChannelMembers((prev) => [...prev, userId]);
    }
  };

  // リプライ先のメッセージを探す
  const getReplyTarget = (msg: TeamMessage) => {
    if (!msg.reply_to_id) return null;
    return messages.find((m) => m.id === msg.reply_to_id) || null;
  };

  const activeChannel = channels?.find((c) => c.id === activeChannelId);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, height: "calc(100dvh - 160px)" }}>
      {/* チャンネルタブ */}
      <div style={{ display: "flex", gap: 6, padding: "0 0 8px", overflowX: "auto", flexShrink: 0 }}>
        {channels?.map((ch) => (
          <button key={ch.id} onClick={() => setActiveChannelId(ch.id)}
            style={{
              padding: "6px 14px", borderRadius: 20,
              border: ch.id === activeChannelId ? "2px solid #15803d" : "1px solid #e2e8f0",
              background: ch.id === activeChannelId ? "#f0fdf4" : "#fff",
              color: ch.id === activeChannelId ? "#15803d" : "#64748b",
              fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
            }}
          >{ch.name}</button>
        ))}
        <button onClick={() => setShowNewChannel(true)}
          style={{ padding: "6px 12px", borderRadius: 20, border: "1px dashed #cbd5e1", background: "#fff", color: "#94a3b8", fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}
        >+</button>
      </div>

      {/* 新規チャンネル作成 */}
      {showNewChannel && (
        <div style={{ padding: "8px 0", flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          <input name="channel-name" value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)}
            placeholder="チャンネル名" autoFocus onKeyDown={(e) => e.key === "Enter" && createChannel()}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none" }}
          />
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>参加者を選択:</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {allUsers?.map((u) => (
              <button key={u.id}
                onClick={() => setSelectedMembers((prev) => { const s = new Set(prev); s.has(u.id) ? s.delete(u.id) : s.add(u.id); return s; })}
                style={{
                  padding: "4px 12px", borderRadius: 16, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  border: selectedMembers.has(u.id) ? "2px solid #15803d" : "1px solid #e2e8f0",
                  background: selectedMembers.has(u.id) ? "#f0fdf4" : "#fff",
                  color: selectedMembers.has(u.id) ? "#15803d" : "#64748b",
                }}
              >{u.name}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={createChannel} style={actionBtnStyle}>作成</button>
            <button onClick={() => { setShowNewChannel(false); setSelectedMembers(new Set()); }}
              style={{ ...actionBtnStyle, background: "#f1f5f9", color: "#64748b" }}>取消</button>
          </div>
        </div>
      )}

      {/* チャンネルヘッダー */}
      {activeChannel && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0 8px", flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{activeChannel.name}</span>
          <button onClick={() => { setShowMembers(!showMembers); if (!showMembers) loadChannelMembers(activeChannelId!); }}
            style={{ fontSize: 11, color: "#64748b", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 12, padding: "2px 10px", cursor: "pointer" }}
          >{showMembers ? "閉じる" : `メンバー(${channelMembers.length})`}</button>
        </div>
      )}

      {/* メンバー管理パネル */}
      {showMembers && (
        <div style={{ padding: "4px 0 8px", flexShrink: 0 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {allUsers?.map((u) => (
              <button key={u.id} onClick={() => toggleMember(u.id)}
                style={{
                  padding: "4px 12px", borderRadius: 16, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  border: channelMembers.includes(u.id) ? "2px solid #15803d" : "1px solid #e2e8f0",
                  background: channelMembers.includes(u.id) ? "#f0fdf4" : "#fff",
                  color: channelMembers.includes(u.id) ? "#15803d" : "#94a3b8",
                }}
              >{u.name}{channelMembers.includes(u.id) ? " ✓" : ""}</button>
            ))}
          </div>
        </div>
      )}

      {/* メッセージ一覧 */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4, padding: "8px 0", minHeight: 0 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: "40px 0" }}>メッセージがありません</div>
        )}
        {messages.map((msg) => {
          const isMe = msg.user_id === user?.id;
          const time = new Date(msg.created_at).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
          const readCount = getReadCount(msg);
          const replyTarget = getReplyTarget(msg);
          const attType = msg.attachment_type ? TYPE_LABELS[msg.attachment_type] : null;

          return (
            <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
              {!isMe && (
                <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 2, paddingLeft: 4 }}>{msg.user_name}</span>
              )}

              {/* リプライ表示 */}
              {replyTarget && (
                <div style={{
                  maxWidth: "80%", padding: "4px 10px", marginBottom: 2,
                  borderLeft: "3px solid #94a3b8", borderRadius: 6,
                  background: "#f8fafc", fontSize: 11, color: "#64748b",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  <span style={{ fontWeight: 600 }}>{replyTarget.user_name}</span>: {replyTarget.content.slice(0, 50)}
                </div>
              )}

              {/* 添付カード */}
              {attType && (
                <div style={{
                  maxWidth: "80%", padding: "6px 10px", marginBottom: 2, borderRadius: 8,
                  background: attType.bg, border: `1px solid ${attType.color}20`,
                  fontSize: 11, color: attType.color, fontWeight: 600,
                }}>
                  {attType.label}を参照
                </div>
              )}

              {/* メッセージ本体 */}
              <div
                onClick={() => !isMe ? setReplyTo(msg) : undefined}
                onContextMenu={(e) => { e.preventDefault(); setReplyTo(msg); }}
                style={{
                  maxWidth: "85%", padding: "8px 12px",
                  borderRadius: isMe ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                  background: isMe ? "#15803d" : "#f1f5f9",
                  color: isMe ? "#fff" : "#1e293b",
                  fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word",
                  cursor: "pointer",
                }}>
                {msg.content}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 4px" }}>
                <span style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>{time}</span>
                {isMe && readCount !== null && readCount > 0 && (
                  <span style={{ fontSize: 10, color: "#15803d", marginTop: 2 }}>既読 {readCount}</span>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* リプライプレビュー */}
      {replyTo && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", flexShrink: 0,
          background: "#f0fdf4", borderRadius: "8px 8px 0 0", borderLeft: "3px solid #15803d",
        }}>
          <div style={{ flex: 1, fontSize: 12, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <span style={{ fontWeight: 600, color: "#15803d" }}>{replyTo.user_name}</span>に返信: {replyTo.content.slice(0, 40)}
          </div>
          <button onClick={() => setReplyTo(null)}
            style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 16, cursor: "pointer", padding: "0 4px" }}>✕</button>
        </div>
      )}

      {/* 添付プレビュー */}
      {selectedAttachment && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", flexShrink: 0,
          background: TYPE_LABELS[selectedAttachment.type]?.bg || "#f1f5f9",
          borderRadius: replyTo ? 0 : "8px 8px 0 0",
          borderLeft: `3px solid ${TYPE_LABELS[selectedAttachment.type]?.color || "#64748b"}`,
        }}>
          <div style={{ flex: 1, fontSize: 12, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <span style={{ fontWeight: 600, color: TYPE_LABELS[selectedAttachment.type]?.color }}>
              {TYPE_LABELS[selectedAttachment.type]?.label}
            </span>: {selectedAttachment.label}
          </div>
          <button onClick={() => setSelectedAttachment(null)}
            style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 16, cursor: "pointer", padding: "0 4px" }}>✕</button>
        </div>
      )}

      {/* 添付検索パネル */}
      {showAttachPanel && (
        <div style={{
          flexShrink: 0, padding: "8px 0", maxHeight: 200, display: "flex", flexDirection: "column", gap: 6,
        }}>
          <input name="attach-search" value={attachSearch} onChange={(e) => setAttachSearch(e.target.value)}
            placeholder="メモ・議事録・TODO・決定を検索..." autoFocus
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none" }}
          />
          <div style={{ overflowY: "auto", flex: 1 }}>
            {attachLoading && <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", padding: 8 }}>検索中...</div>}
            {!attachLoading && attachResults.length === 0 && attachSearch && (
              <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", padding: 8 }}>該当なし</div>
            )}
            {attachResults.map((item) => {
              const t = TYPE_LABELS[item.type];
              return (
                <button key={`${item.type}-${item.id}`}
                  onClick={() => { setSelectedAttachment(item); setShowAttachPanel(false); setAttachSearch(""); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "6px 10px",
                    border: "none", borderBottom: "1px solid #f1f5f9", background: "#fff", cursor: "pointer",
                    textAlign: "left", fontSize: 12,
                  }}
                >
                  <span style={{
                    padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700,
                    background: t?.bg, color: t?.color, flexShrink: 0,
                  }}>{t?.label}</span>
                  <span style={{ color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{item.label}</span>
                  {item.client_name && (
                    <span style={{ fontSize: 10, color: "#94a3b8", flexShrink: 0 }}>{item.client_name}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 入力欄 */}
      <div style={{ display: "flex", gap: 8, padding: "8px 0 0", flexShrink: 0, alignItems: "center" }}>
        <button
          onClick={() => { setShowAttachPanel(!showAttachPanel); if (showAttachPanel) setAttachSearch(""); }}
          style={{
            width: 38, height: 38, borderRadius: "50%", border: "1px solid #e2e8f0",
            background: showAttachPanel ? "#f0fdf4" : "#fff",
            color: showAttachPanel ? "#15803d" : "#64748b",
            fontSize: 20, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        >{showAttachPanel ? "✕" : "+"}</button>
        <input name="team-message" value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); sendMessage(); } }}
          placeholder="メッセージを入力..."
          style={{ flex: 1, padding: "10px 14px", borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 14, outline: "none" }}
          disabled={!user || !activeChannelId}
        />
        <button onClick={sendMessage} disabled={sending || !input.trim() || !user}
          style={{
            padding: "10px 20px", borderRadius: 12, border: "none",
            background: sending || !input.trim() ? "#94a3b8" : "#15803d",
            color: "#fff", fontSize: 14, fontWeight: 700, cursor: sending || !input.trim() ? "default" : "pointer",
            flexShrink: 0,
          }}
        >送信</button>
      </div>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

const actionBtnStyle: React.CSSProperties = {
  padding: "8px 14px", borderRadius: 8, border: "none",
  background: "#15803d", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
};
