import { NextRequest, NextResponse } from "next/server";
import { getClientProfile } from "@/lib/knowledge";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const clientName = decodeURIComponent(name);
    const profile = await getClientProfile(clientName);

    if (!profile.client) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(profile);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
