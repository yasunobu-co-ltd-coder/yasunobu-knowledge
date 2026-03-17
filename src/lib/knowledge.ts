import { supabase } from "./supabase";
import type {
  KnowledgeTimelineEntry,
  Todo,
  TodoFilter,
  Decision,
  DecisionFilter,
  Client,
  ClientAlias,
} from "@/types/database";

// ===================================================
// 横断タイムライン（v_knowledge_timeline）
// ===================================================

/** 横断タイムライン取得 */
export async function getTimeline(options?: {
  client_name?: string;
  source_type?: "memo" | "minutes";
  search?: string;
  limit?: number;
  offset?: number;
}) {
  let query = supabase
    .from("v_knowledge_timeline")
    .select("*")
    .order("created_at", { ascending: false });

  if (options?.client_name) {
    query = query.eq("client_name", options.client_name);
  }
  if (options?.source_type) {
    query = query.eq("source_type", options.source_type);
  }
  if (options?.search) {
    query = query.or(
      `body.ilike.%${options.search}%,summary.ilike.%${options.search}%`
    );
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(
      options.offset,
      options.offset + (options?.limit ?? 50) - 1
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as KnowledgeTimelineEntry[];
}

// ===================================================
// 顧客（clients）
// ===================================================

/** 顧客一覧取得 */
export async function getClients() {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("name");
  if (error) throw error;
  return data as Client[];
}

/** 顧客カルテ取得（顧客情報 + タイムライン + TODO + 決定事項） */
export async function getClientProfile(clientName: string) {
  const [client, aliases, timeline, todos, decisions] = await Promise.all([
    supabase.from("clients").select("*").eq("name", clientName).single(),
    supabase
      .from("client_aliases")
      .select("*")
      .eq(
        "client_id",
        (
          await supabase
            .from("clients")
            .select("id")
            .eq("name", clientName)
            .single()
        ).data?.id ?? ""
      ),
    getTimeline({ client_name: clientName }),
    getTodos({ client_name: clientName, status: "open" }),
    getDecisions({ client_name: clientName, status: "active" }),
  ]);

  return {
    client: client.data as Client,
    aliases: (aliases.data ?? []) as ClientAlias[],
    timeline,
    activeTodos: todos,
    activeDecisions: decisions,
  };
}

// ===================================================
// TODO
// ===================================================

/** TODO一覧取得 */
export async function getTodos(filter?: TodoFilter) {
  let query = supabase
    .from("todos")
    .select("*")
    .order("sort_order")
    .order("created_at", { ascending: false });

  if (filter?.status) {
    query = query.eq("status", filter.status);
  } else {
    // デフォルトは未完了のみ
    query = query.not("status", "in", '("done","cancelled")');
  }
  if (filter?.client_name) {
    query = query.eq("client_name", filter.client_name);
  }
  if (filter?.assignee) {
    query = query.eq("assignee", filter.assignee);
  }
  if (filter?.source_type) {
    query = query.eq("source_type", filter.source_type);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Todo[];
}

/** TODO ステータス更新 */
export async function updateTodoStatus(
  id: string,
  status: Todo["status"]
) {
  const { data, error } = await supabase
    .from("todos")
    .update({ status })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Todo;
}

/** TODO 新規作成 */
export async function createTodo(
  todo: Pick<
    Todo,
    "source_type" | "source_id" | "content" | "client_name"
  > &
    Partial<Pick<Todo, "assignee" | "due_date" | "sort_order">>
) {
  const { data, error } = await supabase
    .from("todos")
    .insert(todo)
    .select()
    .single();
  if (error) throw error;
  return data as Todo;
}

// ===================================================
// 決定事項
// ===================================================

/** 決定事項一覧取得 */
export async function getDecisions(filter?: DecisionFilter) {
  let query = supabase
    .from("decisions")
    .select("*")
    .order("sort_order")
    .order("created_at", { ascending: false });

  if (filter?.status) {
    query = query.eq("status", filter.status);
  } else {
    query = query.eq("status", "active");
  }
  if (filter?.client_name) {
    query = query.eq("client_name", filter.client_name);
  }
  if (filter?.source_type) {
    query = query.eq("source_type", filter.source_type);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Decision[];
}

/** 決定事項のステータス更新 */
export async function updateDecisionStatus(
  id: string,
  status: Decision["status"]
) {
  const { data, error } = await supabase
    .from("decisions")
    .update({ status })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Decision;
}
