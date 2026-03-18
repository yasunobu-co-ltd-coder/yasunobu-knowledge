"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { fetcher } from "@/lib/swr";
import type { ChatThread, ChatMessage } from "@/types/database";

const QUICK_PROMPTS = [
  "この顧客の状況を要約して",
  "未完了のTODOを教えて",
  "次にやるべきことは？",
  "直近の決定事項をまとめて",
];

export default function ClientChat({ clientName }: { clientName: string }) {
  const [activeThread, setActiveThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [showThreadList, setShowThreadList] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const apiBase = `/api/clients/${encodeURIComponent(clientName)}`;
  const threadsKey = `${apiBase}/threads`;

  // SWRでスレッド一覧をキャッシュ
  const { data: threadsData } = useSWR<ChatThread[]>(
    threadsKey,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 10000 }
  );
  const threads = threadsData ?? [];

  // メッセージ一覧取得（スレッド指定）
  const fetchMessages = useCallback(
    async (threadId: string) => {
      const res = await fetch(
        `${apiBase}/threads/${threadId}/messages`
      );
      if (res.ok) {
        const data = await res.json();
        setMessages(Array.isArray(data) ? data : []);
      }
    },
    [apiBase]
  );

  // スクロール
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, streamingText]);

  // 新規スレッド作成
  const createThread = async () => {
    const res = await fetch(`${apiBase}/threads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "新しいチャット" }),
    });
    if (res.ok) {
      const thread = await res.json();
      globalMutate(threadsKey);
      setActiveThread(thread);
      setMessages([]);
      setShowThreadList(false);
    }
  };

  // スレッド選択
  const selectThread = async (thread: ChatThread) => {
    setActiveThread(thread);
    setShowThreadList(false);
    await fetchMessages(thread.id);
  };

  // メッセージ送信
  const sendMessage = async (text: string) => {
    if (!text.trim() || streaming) return;

    // スレッドがなければ自動作成
    let threadId: string = activeThread?.id ?? "";
    if (!threadId) {
      const res = await fetch(`${apiBase}/threads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: text.trim().slice(0, 40) }),
      });
      if (!res.ok) return;
      const thread = await res.json();
      globalMutate(threadsKey);
      setActiveThread(thread);
      threadId = thread.id;
    }

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
        body: JSON.stringify({
          message: text.trim(),
          thread_id: threadId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            thread_id: threadId!,
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
          } catch {
            // ignore
          }
        }
      }

      // ストリーミング完了 → messagesに確定追加
      if (fullText) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            thread_id: threadId!,
            role: "assistant",
            content: fullText,
            created_at: new Date().toISOString(),
          },
        ]);
      }
      setStreamingText("");

      // スレッドタイトル更新を反映
      globalMutate(threadsKey);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          thread_id: threadId!,
          role: "assistant",
          content: `通信エラー: ${err instanceof Error ? err.message : String(err)}`,
          created_at: new Date().toISOString(),
        },
      ]);
      setStreamingText("");
    } finally {
      setStreaming(false);
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

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 220px)",
        minHeight: 400,
      }}
    >
      {/* スレッドバー */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          paddingBottom: 10,
          borderBottom: "1px solid #e2e8f0",
          marginBottom: 8,
        }}
      >
        <button
          onClick={() => setShowThreadList(!showThreadList)}
          style={{
            background: "#f1f5f9",
            border: "none",
            borderRadius: 8,
            padding: "6px 12px",
            fontSize: 13,
            color: "#475569",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          {showThreadList ? "×" : "履歴"}
          {threads.length > 0 && !showThreadList && (
            <span style={{ marginLeft: 4, fontSize: 11, color: "#94a3b8" }}>
              ({threads.length})
            </span>
          )}
        </button>
        <span
          style={{
            flex: 1,
            fontSize: 13,
            color: "#64748b",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {activeThread?.title || "新しいチャット"}
        </span>
        <button
          onClick={createThread}
          style={{
            background: "#15803d",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "6px 12px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + 新規
        </button>
      </div>

      {/* スレッド一覧（トグル） */}
      {showThreadList && (
        <div
          style={{
            maxHeight: 200,
            overflow: "auto",
            marginBottom: 8,
            background: "#f8fafc",
            borderRadius: 8,
            border: "1px solid #e2e8f0",
          }}
        >
          {threads.length === 0 ? (
            <p style={{ padding: 12, fontSize: 13, color: "#94a3b8", textAlign: "center" }}>
              チャット履歴なし
            </p>
          ) : (
            threads.map((t) => (
              <button
                key={t.id}
                onClick={() => selectThread(t)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  border: "none",
                  borderBottom: "1px solid #e2e8f0",
                  background:
                    activeThread?.id === t.id ? "#f0fdf4" : "transparent",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    color: "#1e293b",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t.title}
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                  {new Date(t.updated_at).toLocaleString("ja-JP", {
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </button>
            ))
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
            {messages.map((msg) => (
              <div
                key={msg.id}
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
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}
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
