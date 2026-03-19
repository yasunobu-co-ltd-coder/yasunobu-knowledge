import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export type CalendarEvent = {
  id: string;
  date: string; // YYYY-MM-DD
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

  // 月の開始・終了
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate =
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`;

  const events: CalendarEvent[] = [];

  // 1. メモ（期限あり）
  const { data: memos } = await supabase
    .from("yasunobu-memo")
    .select("id, due_date, memo, client_name, status")
    .not("due_date", "is", null)
    .gte("due_date", startDate)
    .lt("due_date", endDate);

  if (memos) {
    for (const m of memos) {
      events.push({
        id: `memo-${m.id}`,
        date: m.due_date,
        label: (m.memo || "").slice(0, 40),
        type: "memo",
        client_name: m.client_name,
        status: m.status,
      });
    }
  }

  // 2. TODO（期限あり）
  const { data: todos } = await supabase
    .from("todos")
    .select("id, due_date, content, client_name, status")
    .not("due_date", "is", null)
    .gte("due_date", startDate)
    .lt("due_date", endDate);

  if (todos) {
    for (const t of todos) {
      events.push({
        id: `todo-${t.id}`,
        date: t.due_date,
        label: t.content.slice(0, 40),
        type: "todo",
        client_name: t.client_name,
        status: t.status,
      });
    }
  }

  // 3. 決定事項（作成日ベース）
  const { data: decisions } = await supabase
    .from("decisions")
    .select("id, created_at, content, client_name, status")
    .gte("created_at", startDate)
    .lt("created_at", endDate);

  if (decisions) {
    for (const d of decisions) {
      events.push({
        id: `dec-${d.id}`,
        date: d.created_at.slice(0, 10),
        label: d.content.slice(0, 40),
        type: "decision",
        client_name: d.client_name,
        status: d.status,
      });
    }
  }

  // 4. 議事録（次回予定あり）
  const { data: minutes } = await supabase
    .from("pocket-yasunobu")
    .select("id, next_schedule, client_name, summary")
    .not("next_schedule", "is", null);

  if (minutes) {
    for (const m of minutes) {
      // next_schedule は自由テキストだが日付っぽいものを抽出
      const dateMatch = String(m.next_schedule).match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
      if (dateMatch) {
        const d = `${dateMatch[1]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[3].padStart(2, "0")}`;
        if (d >= startDate && d < endDate) {
          events.push({
            id: `min-${m.id}`,
            date: d,
            label: `次回: ${(m.summary || "").slice(0, 30)}`,
            type: "minutes",
            client_name: m.client_name,
          });
        }
      }
    }
  }

  return NextResponse.json(events);
}
