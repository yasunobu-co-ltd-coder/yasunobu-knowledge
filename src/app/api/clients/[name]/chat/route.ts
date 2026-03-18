import { NextRequest } from "next/server";
import OpenAI from "openai";
import { buildClientContext } from "@/lib/client-context";

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
    const { message, history } = body as {
      message: string;
      history?: { role: "user" | "assistant"; content: string }[];
    };

    if (!message) {
      return new Response(
        JSON.stringify({ error: "message is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
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

    // 直近の会話履歴（最大10往復まで）
    if (history && Array.isArray(history)) {
      const recentHistory = history.slice(-20);
      for (const h of recentHistory) {
        messages.push({ role: h.role, content: h.content });
      }
    }

    messages.push({ role: "user", content: message });

    // ストリーミングレスポンス
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.3,
      max_tokens: 2000,
      messages,
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content;
            if (text) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
              );
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
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
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
