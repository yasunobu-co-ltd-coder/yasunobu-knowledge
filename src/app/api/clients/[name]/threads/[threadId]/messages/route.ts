import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

/** GET: スレッドのメッセージ一覧取得 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string; threadId: string }> }
) {
  if (!isSupabaseConfigured || !supabase) {
    return NextResponse.json([]);
  }

  const { threadId } = await params;

  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
