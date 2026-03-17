import { NextRequest, NextResponse } from "next/server";
import { getTodos, createTodo } from "@/lib/knowledge";
import type { TodoStatus } from "@/types/database";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status") as TodoStatus | undefined;
    const client_name = searchParams.get("client_name") ?? undefined;
    const assignee = searchParams.get("assignee") ?? undefined;
    const source_type = searchParams.get("source_type") as
      | "memo"
      | "minutes"
      | undefined;

    const data = await getTodos({
      status,
      client_name,
      assignee,
      source_type,
    });

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await createTodo(body);
    return NextResponse.json(data, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
