import { NextResponse } from "next/server";
import { getClients } from "@/lib/knowledge";

export async function GET() {
  try {
    const data = await getClients();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
