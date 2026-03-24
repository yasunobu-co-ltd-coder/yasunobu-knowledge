import { NextRequest, NextResponse } from "next/server";
import { getTimeline } from "@/lib/knowledge";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;

    // source_id指定: 単一レコード取得（カレンダー詳細用）
    const sourceId = searchParams.get("source_id");
    const sourceTypeParam = searchParams.get("source_type") as
      | "memo"
      | "minutes"
      | undefined;

    if (sourceId && sourceTypeParam && isSupabaseConfigured && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from("v_knowledge_timeline")
        .select("*")
        .eq("id", sourceId)
        .eq("source_type", sourceTypeParam)
        .limit(1);
      if (error) throw error;
      return NextResponse.json(data ?? []);
    }

    const client_name = searchParams.get("client_name") ?? undefined;
    const search = searchParams.get("search") ?? undefined;
    const limit = searchParams.get("limit")
      ? Number(searchParams.get("limit"))
      : 50;
    const offset = searchParams.get("offset")
      ? Number(searchParams.get("offset"))
      : 0;

    const data = await getTimeline({
      client_name,
      source_type: sourceTypeParam,
      search,
      limit,
      offset,
    });

    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
