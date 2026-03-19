import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export async function GET() {
  if (!isSupabaseConfigured || !supabase) {
    return NextResponse.json([]);
  }

  const { data, error } = await supabase
    .from("users")
    .select("id, name, sort_order")
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

/** sort_order一括更新 */
export async function PATCH(req: NextRequest) {
  if (!isSupabaseConfigured || !supabase) {
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  }

  const { orders } = (await req.json()) as { orders: { id: string; sort_order: number }[] };

  await Promise.all(
    orders.map((o) =>
      supabase!.from("users").update({ sort_order: o.sort_order }).eq("id", o.id)
    )
  );

  return NextResponse.json({ ok: true });
}
