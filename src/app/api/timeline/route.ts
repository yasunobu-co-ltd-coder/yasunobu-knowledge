import { NextRequest, NextResponse } from "next/server";
import { getTimeline } from "@/lib/knowledge";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const client_name = searchParams.get("client_name") ?? undefined;
    const source_type = searchParams.get("source_type") as
      | "memo"
      | "minutes"
      | undefined;
    const search = searchParams.get("search") ?? undefined;
    const limit = searchParams.get("limit")
      ? Number(searchParams.get("limit"))
      : 50;
    const offset = searchParams.get("offset")
      ? Number(searchParams.get("offset"))
      : 0;

    const data = await getTimeline({
      client_name,
      source_type,
      search,
      limit,
      offset,
    });

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
