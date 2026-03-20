import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export type CalendarEvent = {
  id: string;
  source_id: string;
  date: string;
  label: string;
  type: "memo" | "todo" | "decision" | "minutes";
  client_name: string | null;
  status?: string;
};

export async function GET(req: NextRequest) {
  if (!isSupabaseConfigured || !supabase) {
    return NextResponse.json([]);
  }

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
  const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate =
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`;

  // 4テーブル並列クエリ
  const [memoRes, todoRes, decRes, minRes] = await Promise.all([
    supabase.from("yasunobu-memo").select("id, due_date, memo, client_name, status").not("due_date", "is", null).gte("due_date", startDate).lt("due_date", endDate),
    supabase.from("todos").select("id, due_date, content, client_name, status").not("due_date", "is", null).gte("due_date", startDate).lt("due_date", endDate),
    supabase.from("decisions").select("id, created_at, content, client_name, status").gte("created_at", startDate).lt("created_at", endDate),
    supabase.from("pocket-yasunobu").select("id, next_schedule, client_name, summary").not("next_schedule", "is", null).gte("next_schedule", startDate).lt("next_schedule", endDate),
  ]);

  const events: CalendarEvent[] = [];

  memoRes.data?.forEach((m) => {
    events.push({ id: `memo-${m.id}`, source_id: String(m.id), date: m.due_date, label: (m.memo || "").slice(0, 40), type: "memo", client_name: m.client_name, status: m.status });
  });

  todoRes.data?.forEach((t) => {
    events.push({ id: `todo-${t.id}`, source_id: String(t.id), date: t.due_date, label: t.content.slice(0, 40), type: "todo", client_name: t.client_name, status: t.status });
  });

  decRes.data?.forEach((d) => {
    events.push({ id: `dec-${d.id}`, source_id: String(d.id), date: d.created_at.slice(0, 10), label: d.content.slice(0, 40), type: "decision", client_name: d.client_name, status: d.status });
  });

  minRes.data?.forEach((m) => {
    const dateMatch = String(m.next_schedule).match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
    if (dateMatch) {
      const d = `${dateMatch[1]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[3].padStart(2, "0")}`;
      if (d >= startDate && d < endDate) {
        events.push({ id: `min-${m.id}`, source_id: String(m.id), date: d, label: `次回: ${(m.summary || "").slice(0, 30)}`, type: "minutes", client_name: m.client_name });
      }
    }
  });

  return NextResponse.json(events, {
    headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30" },
  });
}
