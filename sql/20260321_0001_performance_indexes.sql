-- ============================================
-- パフォーマンス改善用インデックス
-- ============================================

-- yasunobu-memo: カレンダー・タイムライン用
CREATE INDEX IF NOT EXISTS idx_memo_client_name ON "yasunobu-memo"(client_name);
CREATE INDEX IF NOT EXISTS idx_memo_due_date ON "yasunobu-memo"(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_memo_created_at ON "yasunobu-memo"(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memo_status ON "yasunobu-memo"(status);

-- pocket-yasunobu: カレンダー・議事録用
CREATE INDEX IF NOT EXISTS idx_pocket_client_name ON "pocket-yasunobu"(client_name);
CREATE INDEX IF NOT EXISTS idx_pocket_next_schedule ON "pocket-yasunobu"(next_schedule) WHERE next_schedule IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pocket_created_at ON "pocket-yasunobu"(created_at DESC);

-- todos: カルテ・カレンダー用
CREATE INDEX IF NOT EXISTS idx_todos_client_status ON todos(client_name, status);
CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_todos_assignee ON todos(assignee) WHERE assignee IS NOT NULL;

-- decisions: カルテ用
CREATE INDEX IF NOT EXISTS idx_decisions_client_status ON decisions(client_name, status);

-- change_logs: 変更履歴用
CREATE INDEX IF NOT EXISTS idx_changelogs_client ON change_logs(client_name, created_at DESC);

-- chat_threads: スレッド一覧用
CREATE INDEX IF NOT EXISTS idx_threads_client ON chat_threads(client_name, updated_at DESC);

-- chat_messages: メッセージ取得用
CREATE INDEX IF NOT EXISTS idx_chatmsg_thread ON chat_messages(thread_id, created_at DESC);

-- team_messages: チャンネル別メッセージ・未読カウント用
CREATE INDEX IF NOT EXISTS idx_teammsg_channel_created ON team_messages(channel_id, created_at);
CREATE INDEX IF NOT EXISTS idx_teammsg_channel_user ON team_messages(channel_id, user_id, created_at);

-- team_read_status: 未読計算用（PKとは別にuser_idでの検索を高速化）
CREATE INDEX IF NOT EXISTS idx_readstatus_user ON team_read_status(user_id);

-- clients: 名前検索用
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);

-- client_aliases: 参照用
CREATE INDEX IF NOT EXISTS idx_aliases_client ON client_aliases(client_id);
