import { NextRequest, NextResponse } from "next/server";
import { getChangeLogs } from "@/lib/knowledge";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const clientName = decodeURIComponent(name);
    const logs = await getChangeLogs(clientName);
    return NextResponse.json(logs);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
