import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { sendPushToChannelMembers } from "@/lib/push";

export async function GET(req: NextRequest) {
  if (!isSupabaseConfigured || !supabase) {
    return NextResponse.json([]);
  }

  const channelId = req.nextUrl.searchParams.get("channel_id");
  if (!channelId) {
    return NextResponse.json({ error: "channel_id required" }, { status: 400 });
  }

  const limit = Number(req.nextUrl.searchParams.get("limit") || "50");

  const { data, error } = await supabase
    .from("team_messages")
    .select("*")
    .eq("channel_id", channelId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured || !supabase) {
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  }

  const { channel_id, user_id, user_name, content } = await req.json();

  if (!channel_id || !user_id || !user_name || !content) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("team_messages")
    .insert({ channel_id, user_id, user_name, content })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // チャンネル名取得してPush通知（非同期）
  supabase
    .from("team_channels")
    .select("name")
    .eq("id", channel_id)
    .single()
    .then(({ data: ch }) => {
      sendPushToChannelMembers(channel_id, user_id, {
        title: `${ch?.name || "チャット"} - ${user_name}`,
        body: content.slice(0, 100),
        url: "/team-chat",
      });
    });

  return NextResponse.json(data);
}
