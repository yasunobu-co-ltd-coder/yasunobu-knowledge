import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

/** GET /api/team-chat/readers?channel_id=xxx
 * チャンネルの各メンバーの既読位置を返す
 * → フロントでメッセージごとに「何人が既読か」を計算 */
export async function GET(req: NextRequest) {
  if (!isSupabaseConfigured || !supabaseAdmin) return NextResponse.json([]);

  const channelId = req.nextUrl.searchParams.get("channel_id");
  if (!channelId) return NextResponse.json([]);

  const { data, error } = await supabaseAdmin
    .from("team_read_status")
    .select("user_id, last_read_at")
    .eq("channel_id", channelId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
