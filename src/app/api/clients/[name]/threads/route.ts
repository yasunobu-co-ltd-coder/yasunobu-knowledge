import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

/** GET: 顧客のスレッド一覧取得 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  if (!isSupabaseConfigured || !supabaseAdmin) {
    return NextResponse.json([]);
  }

  const { name } = await params;
  const clientName = decodeURIComponent(name);

  const { data, error } = await supabaseAdmin
    .from("chat_threads")
    .select("*")
    .eq("client_name", clientName)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

/** POST: 新規スレッド作成 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  if (!isSupabaseConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  }

  const { name } = await params;
  const clientName = decodeURIComponent(name);
  const body = await req.json().catch(() => ({}));
  const title = body.title || "新しいチャット";

  const { data, error } = await supabaseAdmin
    .from("chat_threads")
    .insert({ client_name: clientName, title })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
