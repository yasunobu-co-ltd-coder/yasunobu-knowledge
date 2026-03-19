import { supabase, isSupabaseConfigured } from "./supabase";
import { normalizeClientName } from "./normalize-client";
import type {
  KnowledgeTimelineEntry,
  Todo,
  TodoFilter,
  Decision,
  DecisionFilter,
  Client,
  ClientAlias,
  ChangeLog,
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
  if (!isSupabaseConfigured || !supabase) return [];

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

/** 全テーブルからclient_nameを横断収集（正規化名→バリアント名のMap） */
async function collectAllClientNames(): Promise<Map<string, Set<string>>> {
  if (!isSupabaseConfigured || !supabase) return new Map();

  const [c1, c2, c3, c4, c5] = await Promise.all([
    supabase.from("clients").select("name"),
    supabase.from("yasunobu-memo").select("client_name"),
    supabase.from("pocket-yasunobu").select("client_name"),
    supabase.from("todos").select("client_name"),
    supabase.from("decisions").select("client_name"),
  ]);

  const allNames = new Set<string>();
  c1.data?.forEach((r) => { if (r.name) allNames.add(r.name); });
  c2.data?.forEach((r) => { if (r.client_name) allNames.add(r.client_name); });
  c3.data?.forEach((r) => { if (r.client_name) allNames.add(r.client_name); });
  c4.data?.forEach((r) => { if (r.client_name) allNames.add(r.client_name); });
  c5.data?.forEach((r) => { if (r.client_name) allNames.add(r.client_name); });

  const groups = new Map<string, Set<string>>();
  for (const n of allNames) {
    const key = normalizeClientName(n);
    if (!groups.has(key)) groups.set(key, new Set());
    groups.get(key)!.add(n);
  }
  return groups;
}

/** 顧客一覧取得（全テーブル横断で名前を正規化して統合） */
export async function getClients() {
  if (!isSupabaseConfigured || !supabase) return [];

  const [clientsRes, allGroups] = await Promise.all([
    supabase.from("clients").select("*").order("name"),
    collectAllClientNames(),
  ]);
  if (clientsRes.error) throw clientsRes.error;

  const raw = clientsRes.data as Client[];

  // clientsテーブルのレコードを正規化名でグルーピング
  const clientGroups = new Map<string, Client[]>();
  for (const c of raw) {
    const key = normalizeClientName(c.name);
    if (!clientGroups.has(key)) clientGroups.set(key, []);
    clientGroups.get(key)!.push(c);
  }

  // 横断収集で見つかったがclientsテーブルにない正規化名も追加
  for (const normName of allGroups.keys()) {
    if (!clientGroups.has(normName)) {
      // clientsテーブルに無い場合、仮のClientレコードを作成
      clientGroups.set(normName, [{
        id: `virtual-${normName}`,
        name: normName,
        notes: null,
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }]);
    }
  }

  const merged: Client[] = [];
  for (const [normName, members] of clientGroups) {
    members.sort((a, b) => a.created_at.localeCompare(b.created_at));
    const representative = { ...members[0] };
    representative.name = normName;
    const allNotes = members.map((m) => m.notes).filter(Boolean).join("\n");
    if (allNotes) representative.notes = allNotes;
    merged.push(representative);
  }

  merged.sort((a, b) => a.name.localeCompare(b.name, "ja"));
  return merged;
}

/** 正規化名に一致するDB上の全名前バリアントを取得 */
async function getClientVariants(normalizedName: string): Promise<string[]> {
  const groups = await collectAllClientNames();
  const variants = groups.get(normalizedName);
  return variants ? [...variants] : [normalizedName];
}

/** 顧客カルテ取得（顧客情報 + タイムライン + TODO + 決定事項） */
export async function getClientProfile(clientName: string) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      client: null,
      aliases: [] as ClientAlias[],
      timeline: [] as KnowledgeTimelineEntry[],
      activeTodos: [] as Todo[],
      activeDecisions: [] as Decision[],
    };
  }

  // 正規化名に一致する全バリアントを取得
  const variants = await getClientVariants(clientName);

  // 代表クライアント（最初にヒットしたもの）
  const clientRes = await supabase
    .from("clients")
    .select("*")
    .in("name", variants)
    .order("created_at")
    .limit(1)
    .single();

  const clientId = clientRes.data?.id ?? "";

  // 全バリアント名でタイムライン・TODO・決定事項を取得
  const [aliases, timelineResults, todoResults, decisionResults] = await Promise.all([
    supabase.from("client_aliases").select("*").eq("client_id", clientId),
    Promise.all(variants.map((v) => getTimeline({ client_name: v }))),
    Promise.all(variants.map((v) => getTodos({ client_name: v, status: "open" }))),
    Promise.all(variants.map((v) => getDecisions({ client_name: v, status: "active" }))),
  ]);

  const timeline = timelineResults.flat().sort((a, b) => b.created_at.localeCompare(a.created_at));
  const activeTodos = todoResults.flat();
  const activeDecisions = decisionResults.flat();

  // 正規化名以外のバリアントを「別名」として表示用に返す
  const variantAliases = variants.filter((v) => v !== clientName);

  return {
    client: clientRes.data as Client,
    aliases: (aliases.data ?? []) as ClientAlias[],
    variants: variantAliases,
    timeline,
    activeTodos,
    activeDecisions,
  };
}

// ===================================================
// TODO
// ===================================================

/** TODO一覧取得 */
export async function getTodos(filter?: TodoFilter) {
  if (!isSupabaseConfigured || !supabase) return [];

  let query = supabase
    .from("todos")
    .select("*")
    .order("sort_order")
    .order("created_at", { ascending: false });

  if (filter?.status) {
    query = query.eq("status", filter.status);
  } else {
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

/** TODO ステータス更新（変更ログ付き） */
export async function updateTodoStatus(
  id: string,
  status: Todo["status"],
  opts?: { note?: string; thread_id?: string; created_by?: string }
) {
  if (!isSupabaseConfigured || !supabase)
    throw new Error("Supabase not configured");

  // 変更前を取得
  const { data: before } = await supabase
    .from("todos")
    .select("status, client_name")
    .eq("id", id)
    .single();

  const { data, error } = await supabase
    .from("todos")
    .update({ status })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;

  // 変更ログ記録
  if (before && before.status !== status) {
    await recordChangeLog({
      client_name: before.client_name,
      source_type: "todo",
      source_id: id,
      change_type: "status_update",
      before_value: before.status,
      after_value: status,
      note: opts?.note,
      thread_id: opts?.thread_id,
      created_by: opts?.created_by,
    });
  }

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
  if (!isSupabaseConfigured || !supabase)
    throw new Error("Supabase not configured");

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
  if (!isSupabaseConfigured || !supabase) return [];

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

/** 決定事項のステータス更新（変更ログ付き） */
export async function updateDecisionStatus(
  id: string,
  status: Decision["status"],
  opts?: { note?: string; thread_id?: string; created_by?: string }
) {
  if (!isSupabaseConfigured || !supabase)
    throw new Error("Supabase not configured");

  // 変更前を取得
  const { data: before } = await supabase
    .from("decisions")
    .select("status, client_name")
    .eq("id", id)
    .single();

  const { data, error } = await supabase
    .from("decisions")
    .update({ status })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;

  // 変更ログ記録
  if (before && before.status !== status) {
    await recordChangeLog({
      client_name: before.client_name,
      source_type: "decision",
      source_id: id,
      change_type: "status_update",
      before_value: before.status,
      after_value: status,
      note: opts?.note,
      thread_id: opts?.thread_id,
      created_by: opts?.created_by,
    });
  }

  return data as Decision;
}

// ===================================================
// 変更ログ
// ===================================================

/** 変更ログを記録 */
export async function recordChangeLog(log: {
  client_name?: string | null;
  source_type: string;
  source_id: string;
  change_type: string;
  before_value?: string | null;
  after_value?: string | null;
  note?: string | null;
  thread_id?: string | null;
  created_by?: string | null;
}) {
  if (!isSupabaseConfigured || !supabase) return;
  await supabase.from("change_logs").insert(log);
}

/** 顧客の変更ログ取得 */
export async function getChangeLogs(clientName: string, limit = 30) {
  if (!isSupabaseConfigured || !supabase) return [];

  const { data, error } = await supabase
    .from("change_logs")
    .select("*")
    .eq("client_name", clientName)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as ChangeLog[];
}
