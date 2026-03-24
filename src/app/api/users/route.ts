import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

export async function GET() {
  if (!isSupabaseConfigured || !supabaseAdmin) {
    return NextResponse.json([]);
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, name, sort_order")
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? [], {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}

/** sort_order一括更新 */
export async function PATCH(req: NextRequest) {
  if (!isSupabaseConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  }

  const { orders } = (await req.json()) as { orders: { id: string; sort_order: number }[] };

  await Promise.all(
    orders.map((o) =>
      supabaseAdmin!.from("users").update({ sort_order: o.sort_order }).eq("id", o.id)
    )
  );

  return NextResponse.json({ ok: true });
}
