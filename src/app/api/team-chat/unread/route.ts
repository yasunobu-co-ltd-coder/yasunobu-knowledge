import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

/** GET /api/team-chat/unread?user_id=xxx → 未読メッセージ総数 */
export async function GET(req: NextRequest) {
  if (!isSupabaseConfigured || !supabase) {
    return NextResponse.json({ count: 0 });
  }

  const userId = req.nextUrl.searchParams.get("user_id");
  if (!userId) {
    return NextResponse.json({ count: 0 });
  }

  // 全チャンネル取得
  const { data: channels } = await supabase
    .from("team_channels")
    .select("id");

  if (!channels || channels.length === 0) {
    return NextResponse.json({ count: 0 });
  }

  // ユーザーの既読位置取得
  const { data: readStatuses } = await supabase
    .from("team_read_status")
    .select("channel_id, last_read_at")
    .eq("user_id", userId);

  const readMap = new Map<string, string>();
  if (readStatuses) {
    for (const rs of readStatuses) {
      readMap.set(rs.channel_id, rs.last_read_at);
    }
  }

  // 各チャンネルの未読数を合算
  let totalUnread = 0;
  for (const ch of channels) {
    const lastRead = readMap.get(ch.id);
    let query = supabase
      .from("team_messages")
      .select("id", { count: "exact", head: true })
      .eq("channel_id", ch.id)
      .neq("user_id", userId); // 自分のメッセージは除外

    if (lastRead) {
      query = query.gt("created_at", lastRead);
    }

    const { count } = await query;
    totalUnread += count || 0;
  }

  return NextResponse.json({ count: totalUnread });
}
