import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { normalizeClientName } from "@/lib/normalize-client";

type AttachmentItem = {
  id: string;
  type: "memo" | "minutes" | "todo" | "decision";
  label: string;
  client_name: string | null;
  date: string | null;
};

/** GET /api/team-chat/attachments?client_name=顧客名&q=検索語 */
export async function GET(req: NextRequest) {
  if (!isSupabaseConfigured || !supabaseAdmin) return NextResponse.json([]);

  const clientName = req.nextUrl.searchParams.get("client_name")?.trim() || "";
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";

  // client_nameが指定された場合、正規化名でバリアントを取得
  let variants: string[] = [];
  if (clientName) {
    const { data: allClients } = await supabaseAdmin.from("clients").select("name");
    variants = (allClients ?? [])
      .map((c: { name: string }) => c.name)
      .filter((n: string) => normalizeClientName(n) === clientName);
    if (variants.length === 0) variants = [clientName];
  }

  // 4テーブル並列クエリ
  const memoQ = supabaseAdmin.from("yasunobu-memo").select("id, memo, client_name, due_date").order("created_at", { ascending: false }).limit(30);
  const minQ = supabaseAdmin.from("pocket-yasunobu").select("id, summary, client_name, created_at").order("created_at", { ascending: false }).limit(30);
  const todoQ = supabaseAdmin.from("todos").select("id, content, client_name, due_date").order("created_at", { ascending: false }).limit(30);
  const decQ = supabaseAdmin.from("decisions").select("id, content, client_name, created_at").order("created_at", { ascending: false }).limit(30);

  if (variants.length > 0) {
    memoQ.in("client_name", variants);
    minQ.in("client_name", variants);
    todoQ.in("client_name", variants);
    decQ.in("client_name", variants);
  }
  if (q) {
    memoQ.ilike("memo", `%${q}%`);
    minQ.ilike("summary", `%${q}%`);
    todoQ.ilike("content", `%${q}%`);
    decQ.ilike("content", `%${q}%`);
  }

  const [memoRes, minRes, todoRes, decRes] = await Promise.all([memoQ, minQ, todoQ, decQ]);

  const results: AttachmentItem[] = [];
  memoRes.data?.forEach((m) => results.push({ id: m.id, type: "memo", label: (m.memo || "").slice(0, 60), client_name: m.client_name, date: m.due_date || null }));
  minRes.data?.forEach((m) => results.push({ id: String(m.id), type: "minutes", label: (m.summary || "").slice(0, 60), client_name: m.client_name, date: m.created_at?.slice(0, 10) || null }));
  todoRes.data?.forEach((t) => results.push({ id: t.id, type: "todo", label: (t.content || "").slice(0, 60), client_name: t.client_name, date: t.due_date || null }));
  decRes.data?.forEach((d) => results.push({ id: d.id, type: "decision", label: (d.content || "").slice(0, 60), client_name: d.client_name, date: d.created_at?.slice(0, 10) || null }));

  return NextResponse.json(results);
}
