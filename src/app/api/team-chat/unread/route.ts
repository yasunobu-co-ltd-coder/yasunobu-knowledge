import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

/** GET /api/team-chat/unread?user_id=xxx → 未読メッセージ総数（RPC 1クエリ） */
export async function GET(req: NextRequest) {
  if (!isSupabaseConfigured || !supabaseAdmin) {
    return NextResponse.json({ count: 0 });
  }

  const userId = req.nextUrl.searchParams.get("user_id");
  if (!userId) {
    return NextResponse.json({ count: 0 });
  }

  const { data, error } = await supabaseAdmin.rpc("get_unread_count", { p_user_id: userId });

  if (error) {
    console.error("get_unread_count error:", error);
    return NextResponse.json({ count: 0 });
  }

  return NextResponse.json({ count: data ?? 0 });
}
