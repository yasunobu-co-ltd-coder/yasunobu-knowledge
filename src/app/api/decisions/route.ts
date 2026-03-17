import { NextRequest, NextResponse } from "next/server";
import { getDecisions } from "@/lib/knowledge";
import type { DecisionStatus } from "@/types/database";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status") as
      | DecisionStatus
      | undefined;
    const client_name = searchParams.get("client_name") ?? undefined;
    const source_type = searchParams.get("source_type") as
      | "memo"
      | "minutes"
      | undefined;

    const data = await getDecisions({
      status,
      client_name,
      source_type,
    });

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
