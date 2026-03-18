import { supabase, isSupabaseConfigured } from "./supabase";

/**
 * 顧客に紐づく全データをテキストコンテキストとしてまとめる
 * MVP: 全文送信（将来的にpgvectorでRAGに差し替え可能）
 */
export async function buildClientContext(clientName: string): Promise<string> {
  if (!isSupabaseConfigured || !supabase) {
    return "（データベース未接続）";
  }

  // 並列で取得
  const [memos, minutes, todos, decisions] = await Promise.all([
    supabase
      .from("v_knowledge_timeline")
      .select("*")
      .eq("client_name", clientName)
      .eq("source_type", "memo")
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("v_knowledge_timeline")
      .select("*")
      .eq("client_name", clientName)
      .eq("source_type", "minutes")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("todos")
      .select("*")
      .eq("client_name", clientName)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("decisions")
      .select("*")
      .eq("client_name", clientName)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const sections: string[] = [];

  // メモ
  if (memos.data && memos.data.length > 0) {
    sections.push("## メモ一覧");
    for (const m of memos.data) {
      const date = new Date(m.created_at).toLocaleDateString("ja-JP");
      const meta = [
        m.status && `状態:${m.status}`,
        m.importance && `重要度:${m.importance}`,
        m.urgency && `急ぎ:${m.urgency}`,
        m.profit && `利益度:${m.profit}`,
        m.due_date && `期限:${m.due_date}`,
        m.assignee && `担当:${m.assignee}`,
      ]
        .filter(Boolean)
        .join(" / ");
      sections.push(`### [${date}] ${meta}\n${m.body || ""}`);
    }
  }

  // 議事録
  if (minutes.data && minutes.data.length > 0) {
    sections.push("\n## 議事録一覧");
    for (const p of minutes.data) {
      const date = new Date(p.created_at).toLocaleDateString("ja-JP");
      const kw = Array.isArray(p.keywords)
        ? p.keywords.join(", ")
        : "";
      let block = `### [${date}]`;
      if (kw) block += ` キーワード: ${kw}`;
      if (p.summary) block += `\n要約: ${p.summary}`;
      if (p.transcript) {
        // 文字起こしは長すぎるので先頭2000文字まで
        block += `\n文字起こし(抜粋): ${p.transcript.slice(0, 2000)}`;
      }
      const decs = Array.isArray(p.decisions_json) ? p.decisions_json : [];
      if (decs.length > 0) {
        block += `\n決定事項: ${decs.map((d: unknown) => (typeof d === "string" ? d : JSON.stringify(d))).join(" / ")}`;
      }
      const tds = Array.isArray(p.todos_json) ? p.todos_json : [];
      if (tds.length > 0) {
        block += `\nTODO: ${tds.map((t: unknown) => (typeof t === "string" ? t : JSON.stringify(t))).join(" / ")}`;
      }
      if (p.next_schedule) block += `\n次回予定: ${p.next_schedule}`;
      sections.push(block);
    }
  }

  // TODO
  if (todos.data && todos.data.length > 0) {
    sections.push("\n## TODO一覧");
    for (const t of todos.data) {
      const date = new Date(t.created_at).toLocaleDateString("ja-JP");
      sections.push(
        `- [${t.status}] ${t.content}${t.due_date ? ` (期限:${t.due_date})` : ""}${t.assignee ? ` 担当:${t.assignee}` : ""} (${date})`
      );
    }
  }

  // 決定事項
  if (decisions.data && decisions.data.length > 0) {
    sections.push("\n## 決定事項一覧");
    for (const d of decisions.data) {
      const date = new Date(d.created_at).toLocaleDateString("ja-JP");
      sections.push(`- [${d.status}] ${d.content} (${date})`);
    }
  }

  if (sections.length === 0) {
    return `「${clientName}」に関するデータはまだありません。`;
  }

  return `# ${clientName} のナレッジデータ\n\n${sections.join("\n")}`;
}
