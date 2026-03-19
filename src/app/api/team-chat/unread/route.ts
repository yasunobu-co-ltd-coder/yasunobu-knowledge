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

  // チャンネル一覧と既読位置を並列取得
  const [chRes, rsRes] = await Promise.all([
    supabase.from("team_channels").select("id"),
    supabase.from("team_read_status").select("channel_id, last_read_at").eq("user_id", userId),
  ]);

  const channels = chRes.data;
  if (!channels || channels.length === 0) {
    return NextResponse.json({ count: 0 });
  }

  const readMap = new Map<string, string>();
  rsRes.data?.forEach((rs) => readMap.set(rs.channel_id, rs.last_read_at));

  // 全チャンネルの未読数を並列カウント
  const counts = await Promise.all(
    channels.map((ch) => {
      const lastRead = readMap.get(ch.id);
      let query = supabase!
        .from("team_messages")
        .select("id", { count: "exact", head: true })
        .eq("channel_id", ch.id)
        .neq("user_id", userId);
      if (lastRead) query = query.gt("created_at", lastRead);
      return query;
    })
  );

  const totalUnread = counts.reduce((sum, r) => sum + (r.count || 0), 0);
  return NextResponse.json({ count: totalUnread });
}
