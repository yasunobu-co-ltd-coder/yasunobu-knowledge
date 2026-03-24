import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

/** DELETE: スレッド削除（ON DELETE CASCADEでメッセージも消える） */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string; threadId: string }> }
) {
  if (!isSupabaseConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  }

  const { threadId } = await params;

  const { error } = await supabaseAdmin
    .from("chat_threads")
    .delete()
    .eq("id", threadId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
