import { NextRequest } from "next/server";
import OpenAI from "openai";
import { buildClientContext } from "@/lib/client-context";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  createTodo,
  updateTodoStatus,
  updateDecisionStatus,
  recordChangeLog,
} from "@/lib/knowledge";

export const runtime = "nodejs";
export const maxDuration = 60;

const today = () => new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });

const SYSTEM_PROMPT = `あなたは安信工業の業務支援AIアシスタントです。
与えられた顧客のナレッジデータ（メモ・議事録・TODO・決定事項）をもとに質問に回答してください。

回答のルール:
- 事実に基づいて回答し、データにないことは推測と明示してください
- 回答にはできるだけ根拠となるデータの日付や内容を引用してください
- 「この顧客の状況を要約して」と聞かれたら、最新の状況・未完了TODO・直近の決定事項を整理してください
- 「次にやるべきことは？」と聞かれたら、未完了TODOと直近の議事録から次アクションを提案してください
- 簡潔に、ビジネス文書として適切な日本語で回答してください
- 回答はMarkdown形式で構造化してください

データ変更のルール:
- ユーザーが新しい情報や変更を伝えたら、適切なツールを使ってデータベースを更新してください
- 「○○をTODOに追加して」→ create_todo を使う
- 「○○は完了した」「○○をキャンセル」→ update_todo_status を使う
- 「○○に決まった」「○○と決定」→ create_decision を使う
- 「○○の決定は取り消し」「○○は変更になった」→ 古い決定を update_decision_status で revised にし、新しい決定を create_decision で作る
- 「メモしておいて」「記録して」→ create_memo を使う
- ユーザーが変更情報を伝えた場合（例:「MTGが19日に変更になった」）、自動的にメモ作成や決定事項の更新を行ってください
- ツールを使った後は、何をしたかを簡潔に報告してください`;

// ===================================================
// OpenAI Function Calling ツール定義
// ===================================================

const TOOLS: OpenAI.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "create_todo",
      description: "新しいTODOを作成する",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string", description: "TODOの内容" },
          assignee: { type: "string", description: "担当者（省略可）" },
          due_date: { type: "string", description: "期限（YYYY-MM-DD形式、省略可）" },
        },
        required: ["content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_todo_status",
      description: "既存TODOのステータスを変更する。ナレッジデータに記載されているTODOのIDを使うこと。",
      parameters: {
        type: "object",
        properties: {
          todo_id: { type: "string", description: "TODOのID（UUID）" },
          status: { type: "string", enum: ["open", "in_progress", "done", "cancelled"], description: "新しいステータス" },
          note: { type: "string", description: "変更の備考（省略可）" },
        },
        required: ["todo_id", "status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_decision",
      description: "新しい決定事項を記録する",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string", description: "決定事項の内容" },
        },
        required: ["content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_decision_status",
      description: "既存の決定事項のステータスを変更する。ナレッジデータに記載されている決定事項のIDを使うこと。",
      parameters: {
        type: "object",
        properties: {
          decision_id: { type: "string", description: "決定事項のID（UUID）" },
          status: { type: "string", enum: ["active", "revised", "cancelled"], description: "新しいステータス" },
          note: { type: "string", description: "変更の備考（省略可）" },
        },
        required: ["decision_id", "status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_memo",
      description: "新しいメモを記録する。ユーザーが新情報を伝えた時や変更があった場合に使用する。",
      parameters: {
        type: "object",
        properties: {
          body: { type: "string", description: "メモの内容" },
          importance: { type: "string", enum: ["高", "中", "低"], description: "重要度（デフォルト: 中）" },
        },
        required: ["body"],
      },
    },
  },
];

// ===================================================
// ツール実行
// ===================================================

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  clientName: string,
  threadId: string,
  userName?: string
): Promise<{ success: boolean; message: string }> {
  try {
    switch (name) {
      case "create_todo": {
        const todo = await createTodo({
          source_type: "memo",
          source_id: threadId,
          content: args.content as string,
          client_name: clientName,
          assignee: (args.assignee as string) || null,
          due_date: (args.due_date as string) || null,
        });
        await recordChangeLog({
          client_name: clientName,
          source_type: "todo",
          source_id: todo.id,
          change_type: "create",
          after_value: args.content as string,
          note: "AIチャット経由で作成",
          thread_id: threadId,
          created_by: userName,
        });
        return { success: true, message: `TODO「${args.content}」を作成しました (ID: ${todo.id})` };
      }

      case "update_todo_status": {
        await updateTodoStatus(
          args.todo_id as string,
          args.status as "open" | "in_progress" | "done" | "cancelled",
          { note: (args.note as string) || "AIチャット経由で変更", thread_id: threadId, created_by: userName }
        );
        return { success: true, message: `TODOのステータスを「${args.status}」に変更しました` };
      }

      case "create_decision": {
        if (!isSupabaseConfigured || !supabase) throw new Error("DB not configured");
        const { data, error } = await supabase
          .from("decisions")
          .insert({
            source_type: "memo",
            source_id: threadId,
            content: args.content as string,
            client_name: clientName,
            status: "active",
          })
          .select()
          .single();
        if (error) throw error;
        await recordChangeLog({
          client_name: clientName,
          source_type: "decision",
          source_id: data.id,
          change_type: "create",
          after_value: args.content as string,
          note: "AIチャット経由で作成",
          thread_id: threadId,
          created_by: userName,
        });
        return { success: true, message: `決定事項「${args.content}」を記録しました (ID: ${data.id})` };
      }

      case "update_decision_status": {
        await updateDecisionStatus(
          args.decision_id as string,
          args.status as "active" | "revised" | "cancelled",
          { note: (args.note as string) || "AIチャット経由で変更", thread_id: threadId, created_by: userName }
        );
        return { success: true, message: `決定事項のステータスを「${args.status}」に変更しました` };
      }

      case "create_memo": {
        if (!isSupabaseConfigured || !supabase) throw new Error("DB not configured");
        const { error } = await supabase
          .from("yasunobu-memo")
          .insert({
            client_name: clientName,
            memo: args.body as string,
            importance: (args.importance as string) || "中",
            urgency: "低",
            profit: "中",
            assignment_type: "自分で",
            assignee: "AI",
            status: "open",
            created_by: "ai-chat",
          });
        if (error) throw error;
        return { success: true, message: `メモ「${(args.body as string).slice(0, 30)}...」を記録しました` };
      }

      default:
        return { success: false, message: `未知のツール: ${name}` };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `エラー: ${msg}` };
  }
}

// ===================================================
// DB操作
// ===================================================

async function saveMessage(
  threadId: string,
  role: "user" | "assistant",
  content: string
) {
  if (!isSupabaseConfigured || !supabase) return;
  await supabase.from("chat_messages").insert({
    thread_id: threadId,
    role,
    content,
  });
  await supabase
    .from("chat_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", threadId);
}

async function autoTitle(threadId: string, message: string) {
  if (!isSupabaseConfigured || !supabase) return;
  const { data } = await supabase
    .from("chat_threads")
    .select("title")
    .eq("id", threadId)
    .single();
  if (data?.title === "新しいチャット") {
    const title = message.slice(0, 40) + (message.length > 40 ? "..." : "");
    await supabase
      .from("chat_threads")
      .update({ title })
      .eq("id", threadId);
  }
}

// ===================================================
// POST ハンドラ
// ===================================================

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const { name } = await params;
    const clientName = decodeURIComponent(name);
    const body = await req.json();
    const { message, thread_id, user_name } = body as {
      message: string;
      thread_id: string;
      user_name?: string;
    };

    if (!message || !thread_id) {
      return new Response(
        JSON.stringify({ error: "message and thread_id are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // ユーザーメッセージをDB保存
    await saveMessage(thread_id, "user", message);
    await autoTitle(thread_id, message);

    // 過去の会話履歴をDBから取得（最新20件）
    let history: { role: "user" | "assistant"; content: string }[] = [];
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase
        .from("chat_messages")
        .select("role, content")
        .eq("thread_id", thread_id)
        .order("created_at", { ascending: true })
        .limit(20);
      if (data) {
        history = data as { role: "user" | "assistant"; content: string }[];
      }
    }

    // 顧客コンテキスト収集
    const context = await buildClientContext(clientName);

    const openai = new OpenAI({ apiKey });

    // メッセージ組み立て
    const chatMessages: OpenAI.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `${SYSTEM_PROMPT}\n\n今日の日付: ${today()}\n\n--- 以下は「${clientName}」のナレッジデータです ---\n\n${context}`,
      },
    ];

    for (const h of history) {
      chatMessages.push({ role: h.role, content: h.content });
    }

    // ストリーミング + function calling
    let fullResponse = "";
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          let currentMessages = [...chatMessages];
          const maxRounds = 3;

          for (let round = 0; round < maxRounds; round++) {
            const stream = await openai.chat.completions.create({
              model: "gpt-4o",
              temperature: 0.3,
              max_tokens: 2000,
              messages: currentMessages,
              tools: TOOLS,
              stream: true,
            });

            const toolCallsMap = new Map<number, { id: string; name: string; args: string }>();
            let hasToolCalls = false;

            for await (const chunk of stream) {
              const delta = chunk.choices[0]?.delta;

              // ツールコール蓄積
              if (delta?.tool_calls) {
                hasToolCalls = true;
                for (const tc of delta.tool_calls) {
                  const existing = toolCallsMap.get(tc.index) || { id: "", name: "", args: "" };
                  if (tc.id) existing.id = tc.id;
                  if (tc.function?.name) existing.name = tc.function.name;
                  if (tc.function?.arguments) existing.args += tc.function.arguments;
                  toolCallsMap.set(tc.index, existing);
                }
              }

              // テキスト部分はそのままストリーム
              if (delta?.content) {
                fullResponse += delta.content;
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ text: delta.content })}\n\n`)
                );
              }
            }

            // ツールコールがなければ完了
            if (!hasToolCalls) break;

            // ツール実行
            const toolCalls = Array.from(toolCallsMap.values());

            // assistant メッセージ（tool_calls付き）を追加
            currentMessages.push({
              role: "assistant",
              tool_calls: toolCalls.map((tc) => ({
                id: tc.id,
                type: "function" as const,
                function: { name: tc.name, arguments: tc.args },
              })),
            });

            // 各ツールを実行して結果を追加
            const actionResults: string[] = [];
            for (const tc of toolCalls) {
              let parsedArgs: Record<string, unknown>;
              try {
                parsedArgs = JSON.parse(tc.args);
              } catch {
                parsedArgs = {};
              }

              const result = await executeTool(tc.name, parsedArgs, clientName, thread_id, user_name);
              actionResults.push(result.message);

              currentMessages.push({
                role: "tool",
                tool_call_id: tc.id,
                content: JSON.stringify(result),
              });
            }

            // アクション結果をクライアントに通知
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ actions: actionResults })}\n\n`)
            );
          }

          // アシスタント回答をDB保存
          if (fullResponse) {
            await saveMessage(thread_id, "assistant", fullResponse);
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          if (fullResponse) {
            await saveMessage(thread_id, "assistant", fullResponse);
          }
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: String(err) })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
