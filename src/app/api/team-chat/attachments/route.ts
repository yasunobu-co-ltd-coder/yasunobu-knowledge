import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

type AttachmentItem = {
  id: string;
  type: "memo" | "minutes" | "todo" | "decision";
  label: string;
  client_name: string | null;
};

/** GET /api/team-chat/attachments?q=検索語 — メモ・議事録・TODO・決定を横断検索 */
export async function GET(req: NextRequest) {
  if (!isSupabaseConfigured || !supabase) return NextResponse.json([]);

  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const results: AttachmentItem[] = [];

  // メモ（yasunobu-memo）
  const memoQ = supabase
    .from("yasunobu-memo")
    .select("id, body, client_name")
    .order("created_at", { ascending: false })
    .limit(20);
  if (q) memoQ.ilike("body", `%${q}%`);
  const { data: memos } = await memoQ;
  memos?.forEach((m) =>
    results.push({ id: m.id, type: "memo", label: (m.body || "").slice(0, 60), client_name: m.client_name })
  );

  // 議事録（pocket-yasunobu）
  const minQ = supabase
    .from("pocket-yasunobu")
    .select("id, summary, client_name")
    .order("created_at", { ascending: false })
    .limit(20);
  if (q) minQ.ilike("summary", `%${q}%`);
  const { data: minutes } = await minQ;
  minutes?.forEach((m) =>
    results.push({ id: m.id, type: "minutes", label: (m.summary || "").slice(0, 60), client_name: m.client_name })
  );

  // TODO
  const todoQ = supabase
    .from("todos")
    .select("id, content, client_name")
    .order("created_at", { ascending: false })
    .limit(20);
  if (q) todoQ.ilike("content", `%${q}%`);
  const { data: todos } = await todoQ;
  todos?.forEach((t) =>
    results.push({ id: t.id, type: "todo", label: (t.content || "").slice(0, 60), client_name: t.client_name })
  );

  // 決定事項
  const decQ = supabase
    .from("decisions")
    .select("id, content, client_name")
    .order("created_at", { ascending: false })
    .limit(20);
  if (q) decQ.ilike("content", `%${q}%`);
  const { data: decisions } = await decQ;
  decisions?.forEach((d) =>
    results.push({ id: d.id, type: "decision", label: (d.content || "").slice(0, 60), client_name: d.client_name })
  );

  return NextResponse.json(results);
}
