import { supabase, isSupabaseConfigured } from "./supabase";
import { normalizeClientName } from "./normalize-client";

// コンテキストキャッシュ（5分間有効）
const _ctxCache = new Map<string, { text: string; ts: number }>();
const CTX_TTL = 5 * 60_000;

/**
 * 顧客に紐づく全データをテキストコンテキストとしてまとめる（キャッシュ付き）
 */
export async function buildClientContext(clientName: string): Promise<string> {
  if (!isSupabaseConfigured || !supabase) return "（データベース未接続）";

  // キャッシュヒット
  const cached = _ctxCache.get(clientName);
  if (cached && Date.now() - cached.ts < CTX_TTL) return cached.text;

  // 正規化名に一致する全バリアントを取得
  const { data: allClients } = await supabase.from("clients").select("name");
  const variants = (allClients ?? [])
    .map((c: { name: string }) => c.name)
    .filter((n: string) => normalizeClientName(n) === clientName);
  if (variants.length === 0) variants.push(clientName);

  // 必要列のみ取得 + .in() で一括（バリアントごとにクエリ分けない）
  const [memoRes, minutesRes, todoRes, decRes] = await Promise.all([
    supabase.from("v_knowledge_timeline")
      .select("created_at, body, status, importance, urgency, profit, due_date, assignee")
      .in("client_name", variants).eq("source_type", "memo")
      .order("created_at", { ascending: false }).limit(30),
    supabase.from("v_knowledge_timeline")
      .select("created_at, summary, keywords, transcript, decisions_json, todos_json, next_schedule")
      .in("client_name", variants).eq("source_type", "minutes")
      .order("created_at", { ascending: false }).limit(20),
    supabase.from("todos")
      .select("id, status, content, due_date, assignee, created_at")
      .in("client_name", variants)
      .order("created_at", { ascending: false }).limit(30),
    supabase.from("decisions")
      .select("id, status, content, created_at")
      .in("client_name", variants)
      .order("created_at", { ascending: false }).limit(20),
  ]);

  const sections: string[] = [];

  // メモ
  const memos = memoRes.data ?? [];
  if (memos.length > 0) {
    sections.push("## メモ一覧");
    for (const m of memos) {
      const date = new Date(m.created_at).toLocaleDateString("ja-JP");
      const meta = [
        m.status && `状態:${m.status}`,
        m.importance && `重要度:${m.importance}`,
        m.urgency && `急ぎ:${m.urgency}`,
        m.profit && `利益度:${m.profit}`,
        m.due_date && `期限:${m.due_date}`,
        m.assignee && `担当:${m.assignee}`,
      ].filter(Boolean).join(" / ");
      sections.push(`### [${date}] ${meta}\n${m.body || ""}`);
    }
  }

  // 議事録
  const mins = minutesRes.data ?? [];
  if (mins.length > 0) {
    sections.push("\n## 議事録一覧");
    for (const p of mins) {
      const date = new Date(p.created_at).toLocaleDateString("ja-JP");
      const kw = Array.isArray(p.keywords) ? p.keywords.join(", ") : "";
      let block = `### [${date}]`;
      if (kw) block += ` キーワード: ${kw}`;
      if (p.summary) block += `\n要約: ${p.summary}`;
      if (p.transcript) block += `\n文字起こし(抜粋): ${p.transcript.slice(0, 2000)}`;
      const decs = Array.isArray(p.decisions_json) ? p.decisions_json : [];
      if (decs.length > 0) block += `\n決定事項: ${decs.map((d: unknown) => (typeof d === "string" ? d : JSON.stringify(d))).join(" / ")}`;
      const tds = Array.isArray(p.todos_json) ? p.todos_json : [];
      if (tds.length > 0) block += `\nTODO: ${tds.map((t: unknown) => (typeof t === "string" ? t : JSON.stringify(t))).join(" / ")}`;
      if (p.next_schedule) block += `\n次回予定: ${p.next_schedule}`;
      sections.push(block);
    }
  }

  // TODO
  const todos = todoRes.data ?? [];
  if (todos.length > 0) {
    sections.push("\n## TODO一覧");
    for (const t of todos) {
      const date = new Date(t.created_at).toLocaleDateString("ja-JP");
      sections.push(`- [${t.status}] (ID:${t.id}) ${t.content}${t.due_date ? ` (期限:${t.due_date})` : ""}${t.assignee ? ` 担当:${t.assignee}` : ""} (${date})`);
    }
  }

  // 決定事項
  const decs = decRes.data ?? [];
  if (decs.length > 0) {
    sections.push("\n## 決定事項一覧");
    for (const d of decs) {
      const date = new Date(d.created_at).toLocaleDateString("ja-JP");
      sections.push(`- [${d.status}] (ID:${d.id}) ${d.content} (${date})`);
    }
  }

  const text = sections.length === 0
    ? `「${clientName}」に関するデータはまだありません。`
    : `# ${clientName} のナレッジデータ\n\n${sections.join("\n")}`;

  _ctxCache.set(clientName, { text, ts: Date.now() });
  return text;
}
