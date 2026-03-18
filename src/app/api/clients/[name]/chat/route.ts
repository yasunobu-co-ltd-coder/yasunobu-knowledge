import { NextRequest } from "next/server";
import OpenAI from "openai";
import { buildClientContext } from "@/lib/client-context";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `あなたは安信工業の業務支援AIアシスタントです。
与えられた顧客のナレッジデータ（メモ・議事録・TODO・決定事項）をもとに質問に回答してください。

回答のルール:
- 事実に基づいて回答し、データにないことは推測と明示してください
- 回答にはできるだけ根拠となるデータの日付や内容を引用してください
- 「この顧客の状況を要約して」と聞かれたら、最新の状況・未完了TODO・直近の決定事項を整理してください
- 「次にやるべきことは？」と聞かれたら、未完了TODOと直近の議事録から次アクションを提案してください
- 簡潔に、ビジネス文書として適切な日本語で回答してください
- 回答はMarkdown形式で構造化してください`;

/** DBにメッセージを保存 */
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
  // スレッドの updated_at を更新
  await supabase
    .from("chat_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", threadId);
}

/** スレッドのタイトルを最初のユーザーメッセージから自動設定 */
async function autoTitle(threadId: string, message: string) {
  if (!isSupabaseConfigured || !supabase) return;
  // タイトルが「新しいチャット」のままなら最初のメッセージで更新
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
    const { message, thread_id } = body as {
      message: string;
      thread_id: string;
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
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `${SYSTEM_PROMPT}\n\n--- 以下は「${clientName}」のナレッジデータです ---\n\n${context}`,
      },
    ];

    for (const h of history) {
      messages.push({ role: h.role, content: h.content });
    }

    // ストリーミングレスポンス + 完了時にDB保存
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.3,
      max_tokens: 2000,
      messages,
      stream: true,
    });

    let fullResponse = "";
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content;
            if (text) {
              fullResponse += text;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
              );
            }
          }
          // アシスタントの回答をDB保存
          if (fullResponse) {
            await saveMessage(thread_id, "assistant", fullResponse);
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          // エラーでも途中までの回答は保存
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
