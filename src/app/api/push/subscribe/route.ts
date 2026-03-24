import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

/** POST: サブスクリプション登録/更新 */
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured || !supabaseAdmin)
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const { subscription, user_id } = await req.json();
  const { endpoint, keys } = subscription;

  const { error } = await supabaseAdmin
    .from("push_subscriptions")
    .upsert(
      {
        user_id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        enabled: true,
        user_agent: req.headers.get("user-agent") || "",
      },
      { onConflict: "endpoint" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** DELETE: サブスクリプション削除 */
export async function DELETE(req: NextRequest) {
  if (!isSupabaseConfigured || !supabaseAdmin)
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const { endpoint, user_id } = await req.json();

  if (endpoint) {
    await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", endpoint);
  } else if (user_id) {
    await supabaseAdmin.from("push_subscriptions").delete().eq("user_id", user_id);
  }

  return NextResponse.json({ ok: true });
}
