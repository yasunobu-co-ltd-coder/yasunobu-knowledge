import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

/** POST /api/team-chat/read → チャンネルを既読にする（UPSERT） */
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured || !supabase) {
    return NextResponse.json({ ok: true });
  }

  const { user_id, channel_id } = await req.json();
  if (!user_id || !channel_id) {
    return NextResponse.json({ error: "user_id and channel_id required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("team_read_status")
    .upsert(
      { user_id, channel_id, last_read_at: new Date().toISOString() },
      { onConflict: "user_id,channel_id" }
    );

  if (error) {
    console.error("team_read_status upsert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
