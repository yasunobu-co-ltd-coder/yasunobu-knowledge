import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

/** GET: チャンネルのメンバー一覧 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseConfigured || !supabaseAdmin) return NextResponse.json([]);
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from("team_channel_members")
    .select("user_id, joined_at, users:user_id(id, name)")
    .eq("channel_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

/** POST: メンバー追加 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseConfigured || !supabaseAdmin)
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  const { id } = await params;
  const { user_ids } = (await req.json()) as { user_ids: string[] };

  const rows = user_ids.map((uid) => ({ channel_id: id, user_id: uid }));
  const { error } = await supabaseAdmin
    .from("team_channel_members")
    .upsert(rows, { onConflict: "channel_id,user_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** DELETE: メンバー削除 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseConfigured || !supabaseAdmin)
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  const { id } = await params;
  const { user_id } = (await req.json()) as { user_id: string };

  const { error } = await supabaseAdmin
    .from("team_channel_members")
    .delete()
    .eq("channel_id", id)
    .eq("user_id", user_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
