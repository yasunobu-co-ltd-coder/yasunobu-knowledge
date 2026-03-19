// ===================================================
// 既存テーブルの型定義（参照用・変更しない）
// ===================================================

/** yasunobu-memo テーブル */
export type MemoRecord = {
  id: string;
  created_at: string;
  created_by: string;
  client_name: string;
  memo: string;
  due_date: string | null;
  importance: "高" | "中" | "低";
  profit: "高" | "中" | "低";
  urgency: "高" | "中" | "低";
  assignment_type: "任せる" | "自分で";
  assignee: string;
  status: "open" | "未着手" | "対応中" | "done";
};

/** pocket-yasunobu テーブル */
export type MinutesRecord = {
  id: string | number;
  created_at: string;
  client_name: string;
  summary: string;
  transcript?: string;
  user_id: string;
  customer?: string;
  project?: string;
  decisions: string[];
  todos: string[];
  next_schedule?: string;
  keywords: string[];
};

// ===================================================
// 新規テーブルの型定義
// ===================================================

/** clients テーブル */
export type Client = {
  id: string;
  name: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

/** client_aliases テーブル */
export type ClientAlias = {
  id: string;
  client_id: string;
  alias: string;
  created_at: string;
};

/** todos テーブル */
export type Todo = {
  id: string;
  source_type: "memo" | "minutes";
  source_id: string;
  content: string;
  assignee: string | null;
  due_date: string | null;
  status: TodoStatus;
  sort_order: number;
  client_name: string | null;
  created_at: string;
  updated_at: string;
};

export type TodoStatus = "open" | "in_progress" | "done" | "cancelled";

/** decisions テーブル */
export type Decision = {
  id: string;
  source_type: "memo" | "minutes";
  source_id: string;
  content: string;
  status: DecisionStatus;
  revised_by: string | null;
  sort_order: number;
  client_name: string | null;
  created_at: string;
};

export type DecisionStatus = "active" | "revised" | "cancelled";

// ===================================================
// v_knowledge_timeline View の型定義
// ===================================================

export type SourceType = "memo" | "minutes";

export type KnowledgeTimelineEntry = {
  id: string;
  source_type: SourceType;
  client_name: string | null;
  body: string | null;
  summary: string | null;
  transcript: string | null;
  status: string | null;
  importance: string | null;
  profit: string | null;
  urgency: string | null;
  due_date: string | null;
  assignment_type: string | null;
  assignee: string | null;
  user_id: string | null;
  decisions_json: string[] | null;
  todos_json: string[] | null;
  keywords: string[] | null;
  next_schedule: string | null;
  created_at: string;
};

// ===================================================
// API レスポンス用
// ===================================================

/** 顧客カルテ */
export type ClientProfile = {
  client: Client;
  aliases: ClientAlias[];
  variants: string[];
  timeline: KnowledgeTimelineEntry[];
  activeTodos: Todo[];
  activeDecisions: Decision[];
};

/** TODO一覧のフィルタ */
export type TodoFilter = {
  status?: TodoStatus;
  client_name?: string;
  assignee?: string;
  source_type?: SourceType;
};

/** 決定事項一覧のフィルタ */
export type DecisionFilter = {
  status?: DecisionStatus;
  client_name?: string;
  source_type?: SourceType;
};

// ===================================================
// チャット履歴
// ===================================================

/** chat_threads テーブル */
export type ChatThread = {
  id: string;
  client_name: string;
  title: string;
  created_at: string;
  updated_at: string;
};

/** chat_messages テーブル */
export type ChatMessage = {
  id: string;
  thread_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

// ===================================================
// 変更ログ
// ===================================================

/** change_logs テーブル */
export type ChangeLog = {
  id: string;
  client_name: string | null;
  source_type: string;
  source_id: string;
  change_type: string;
  before_value: string | null;
  after_value: string | null;
  note: string | null;
  thread_id: string | null;
  created_by: string | null;
  created_at: string;
};
