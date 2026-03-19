import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

/** POST /api/team-chat/read → チャンネルを既読にする */
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured || !supabase) {
    return NextResponse.json({ ok: true });
  }

  const { user_id, channel_id } = await req.json();
  if (!user_id || !channel_id) {
    return NextResponse.json({ error: "user_id and channel_id required" }, { status: 400 });
  }

  const now = new Date().toISOString();

  // まず既存レコードを確認
  const { data: existing } = await supabase
    .from("team_read_status")
    .select("user_id")
    .eq("user_id", user_id)
    .eq("channel_id", channel_id)
    .maybeSingle();

  let error;
  if (existing) {
    ({ error } = await supabase
      .from("team_read_status")
      .update({ last_read_at: now })
      .eq("user_id", user_id)
      .eq("channel_id", channel_id));
  } else {
    ({ error } = await supabase
      .from("team_read_status")
      .insert({ user_id, channel_id, last_read_at: now }));
  }

  if (error) {
    console.error("team_read_status error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
