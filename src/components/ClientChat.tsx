"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { ChatMessage } from "@/types/database";
import { useUser } from "@/lib/user-context";

const QUICK_PROMPTS = [
  "この顧客の状況を要約して",
  "未完了のTODOを教えて",
  "次にやるべきことは？",
  "直近の決定事項をまとめて",
];

export default function ClientChat({ clientName }: { clientName: string }) {
  const { user } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // チャット内検索
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [matchIndices, setMatchIndices] = useState<number[]>([]);
  const [matchCurrent, setMatchCurrent] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);
  const msgRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const apiBase = `/api/clients/${encodeURIComponent(clientName)}`;

  // 初回: 既存スレッドを取得 or 作成
  const initThread = useCallback(async () => {
    const res = await fetch(`${apiBase}/threads`);
    if (!res.ok) { setInitialized(true); return; }
    const threads = await res.json();

    let tid: string;
    if (Array.isArray(threads) && threads.length > 0) {
      // 最新のスレッドを使う
      tid = threads[0].id;
    } else {
      // なければ作成
      const createRes = await fetch(`${apiBase}/threads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: clientName }),
      });
      if (!createRes.ok) { setInitialized(true); return; }
      const newThread = await createRes.json();
      tid = newThread.id;
    }

    setThreadId(tid);

    // メッセージ読み込み
    const msgRes = await fetch(`${apiBase}/threads/${tid}/messages`);
    if (msgRes.ok) {
      const data = await msgRes.json();
      setMessages(Array.isArray(data) ? data : []);
    }
    setInitialized(true);
  }, [apiBase, clientName]);

  useEffect(() => {
    initThread();
  }, [initThread]);

  // 最下部へスクロール
  useEffect(() => {
    if (!searchOpen) {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, streamingText, searchOpen]);

  // 検索実行
  useEffect(() => {
    if (!searchQuery.trim()) {
      setMatchIndices([]);
      setMatchCurrent(0);
      return;
    }
    const q = searchQuery.toLowerCase();
    const indices = messages
      .map((m, i) => (m.content.toLowerCase().includes(q) ? i : -1))
      .filter((i) => i >= 0);
    setMatchIndices(indices);
    setMatchCurrent(0);
    // 最初のマッチにスクロール
    if (indices.length > 0) {
      msgRefs.current.get(indices[0])?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [searchQuery, messages]);

  // 検索ナビゲーション
  const goToMatch = (dir: 1 | -1) => {
    if (matchIndices.length === 0) return;
    const next = (matchCurrent + dir + matchIndices.length) % matchIndices.length;
    setMatchCurrent(next);
    msgRefs.current.get(matchIndices[next])?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // メッセージ送信
  const sendMessage = async (text: string) => {
    if (!text.trim() || streaming || sendingRef.current || !threadId) return;
    sendingRef.current = true;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      thread_id: threadId,
      role: "user",
      content: text.trim(),
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setStreaming(true);
    setStreamingText("");

    try {
      const res = await fetch(`${apiBase}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim(), thread_id: threadId, user_name: user?.name, user_id: user?.id }),
      });

      if (!res.ok) {
        const err = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            thread_id: threadId,
            role: "assistant",
            content: `エラー: ${err.error || res.statusText}`,
            created_at: new Date().toISOString(),
          },
        ]);
        setStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No reader");

      let fullText = "";
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") break;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.text) {
              fullText += parsed.text;
              setStreamingText(fullText);
            }
            if (parsed.actions) {
              // ツール実行結果をシステムメッセージとして追加
              for (const action of parsed.actions as string[]) {
                setMessages((prev) => [
                  ...prev,
                  {
                    id: crypto.randomUUID(),
                    thread_id: threadId,
                    role: "assistant" as const,
                    content: `[実行] ${action}`,
                    created_at: new Date().toISOString(),
                  },
                ]);
              }
              setStreamingText("");
              fullText = "";
            }
          } catch { /* ignore */ }
        }
      }

      if (fullText) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            thread_id: threadId,
            role: "assistant",
            content: fullText,
            created_at: new Date().toISOString(),
          },
        ]);
      }
      setStreamingText("");
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          thread_id: threadId,
          role: "assistant",
          content: `通信エラー: ${err instanceof Error ? err.message : String(err)}`,
          created_at: new Date().toISOString(),
        },
      ]);
      setStreamingText("");
    } finally {
      setStreaming(false);
      sendingRef.current = false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // 検索ハイライト
  const highlightText = (text: string) => {
    if (!searchQuery.trim()) return text;
    const q = searchQuery.toLowerCase();
    const idx = text.toLowerCase().indexOf(q);
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark style={{ background: "#fef08a", borderRadius: 2, padding: "0 1px" }}>
          {text.slice(idx, idx + searchQuery.length)}
        </mark>
        {text.slice(idx + searchQuery.length)}
      </>
    );
  };

  if (!initialized) {
    return (
      <div style={{ padding: "32px 0", textAlign: "center", fontSize: 13, color: "#94a3b8" }}>
        チャットを準備中...
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 220px)",
        minHeight: 400,
      }}
    >
      {/* ヘッダー: 検索バー */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          paddingBottom: 8,
          borderBottom: "1px solid #e2e8f0",
          marginBottom: 4,
        }}
      >
        <span style={{ flex: 1, fontSize: 13, color: "#64748b", fontWeight: 600 }}>
          {clientName} チャット
          {messages.length > 0 && (
            <span style={{ fontWeight: 400, marginLeft: 6, fontSize: 11, color: "#94a3b8" }}>
              ({messages.length}件)
            </span>
          )}
        </span>
        <button
          onClick={() => { setSearchOpen(!searchOpen); setSearchQuery(""); }}
          style={{
            background: searchOpen ? "#15803d" : "#f1f5f9",
            color: searchOpen ? "#fff" : "#475569",
            border: "none",
            borderRadius: 8,
            padding: "5px 10px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          検索
        </button>
      </div>

      {/* 検索入力 */}
      {searchOpen && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 0",
            borderBottom: "1px solid #e2e8f0",
            marginBottom: 4,
          }}
        >
          <input
            type="text"
            name="chat-search"
            autoComplete="off"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="チャット内を検索..."
            autoFocus
            style={{
              flex: 1,
              border: "1px solid #d1d5db",
              borderRadius: 8,
              padding: "6px 10px",
              fontSize: 13,
              outline: "none",
            }}
          />
          {matchIndices.length > 0 && (
            <>
              <span style={{ fontSize: 11, color: "#64748b", whiteSpace: "nowrap" }}>
                {matchCurrent + 1}/{matchIndices.length}
              </span>
              <button onClick={() => goToMatch(-1)} style={navBtnStyle}>▲</button>
              <button onClick={() => goToMatch(1)} style={navBtnStyle}>▼</button>
            </>
          )}
          {searchQuery && matchIndices.length === 0 && (
            <span style={{ fontSize: 11, color: "#94a3b8" }}>0件</span>
          )}
        </div>
      )}

      {/* チャット履歴 */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflow: "auto",
          padding: "8px 0",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {messages.length === 0 && !streaming ? (
          <div style={{ padding: "20px 0", textAlign: "center" }}>
            <p style={{ fontSize: 14, color: "#64748b", marginBottom: 16 }}>
              {clientName} について質問してみましょう
            </p>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                justifyContent: "center",
              }}
            >
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  style={{
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: 20,
                    padding: "8px 16px",
                    fontSize: 13,
                    color: "#15803d",
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => {
              const isMatch = matchIndices.includes(idx);
              const isCurrentMatch = matchIndices[matchCurrent] === idx;
              const isAction = msg.content.startsWith("[実行] ");
              if (isAction) {
                return (
                  <div
                    key={msg.id}
                    ref={(el) => { if (el) msgRefs.current.set(idx, el); }}
                    style={{ display: "flex", justifyContent: "center" }}
                  >
                    <div
                      style={{
                        background: "#f0fdf4",
                        border: "1px solid #bbf7d0",
                        borderRadius: 20,
                        padding: "6px 16px",
                        fontSize: 12,
                        color: "#15803d",
                        fontWeight: 600,
                      }}
                    >
                      {msg.content.slice(5)}
                    </div>
                  </div>
                );
              }
              return (
                <div
                  key={msg.id}
                  ref={(el) => { if (el) msgRefs.current.set(idx, el); }}
                  style={{
                    display: "flex",
                    justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "85%",
                      padding: "10px 14px",
                      borderRadius:
                        msg.role === "user"
                          ? "16px 16px 4px 16px"
                          : "16px 16px 16px 4px",
                      background: msg.role === "user" ? "#15803d" : "#f1f5f9",
                      color: msg.role === "user" ? "#fff" : "#1e293b",
                      fontSize: 14,
                      lineHeight: 1.7,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      outline: isCurrentMatch
                        ? "2px solid #f59e0b"
                        : isMatch
                          ? "1px solid #fbbf24"
                          : "none",
                    }}
                  >
                    {isMatch ? highlightText(msg.content) : msg.content}
                    <div style={{ fontSize: 10, color: msg.role === "user" ? "rgba(255,255,255,0.5)" : "#94a3b8", marginTop: 4 }}>
                      {new Date(msg.created_at).toLocaleString("ja-JP", {
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
            {streaming && streamingText && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div
                  style={{
                    maxWidth: "85%",
                    padding: "10px 14px",
                    borderRadius: "16px 16px 16px 4px",
                    background: "#f1f5f9",
                    color: "#1e293b",
                    fontSize: 14,
                    lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {streamingText}
                  <span style={{ opacity: 0.4 }}>|</span>
                </div>
              </div>
            )}
            {streaming && !streamingText && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: "16px 16px 16px 4px",
                    background: "#f1f5f9",
                    color: "#94a3b8",
                    fontSize: 14,
                  }}
                >
                  考え中...
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 入力欄 */}
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          gap: 8,
          padding: "12px 0 0",
          borderTop: "1px solid #e2e8f0",
        }}
      >
        <textarea
          name="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="質問を入力..."
          rows={1}
          disabled={streaming}
          style={{
            flex: 1,
            border: "1px solid #d1d5db",
            borderRadius: 12,
            padding: "10px 14px",
            fontSize: 14,
            outline: "none",
            background: "#fff",
            resize: "none",
            fontFamily: "inherit",
            minHeight: 42,
            maxHeight: 120,
          }}
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          style={{
            background: streaming || !input.trim() ? "#94a3b8" : "#15803d",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            padding: "10px 18px",
            fontSize: 14,
            fontWeight: 600,
            cursor: streaming || !input.trim() ? "default" : "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {streaming ? "..." : "送信"}
        </button>
      </form>
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  background: "#f1f5f9",
  border: "none",
  borderRadius: 4,
  padding: "2px 8px",
  fontSize: 12,
  cursor: "pointer",
  color: "#475569",
};
