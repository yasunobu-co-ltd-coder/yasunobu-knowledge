-- File: 20260319_0001_create_chat_tables.sql
-- Purpose: チャット履歴を永続化するテーブル
-- Created: 2026-03-19

-- =============================================================================
-- 1. chat_threads（スレッド）
-- =============================================================================
CREATE TABLE IF NOT EXISTS chat_threads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  title       text NOT NULL DEFAULT '新しいチャット',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_threads_client
  ON chat_threads (client_name, updated_at DESC);

-- updated_at 自動更新
CREATE TRIGGER set_chat_threads_updated_at
  BEFORE UPDATE ON chat_threads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON chat_threads
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- =============================================================================
-- 2. chat_messages（メッセージ）
-- =============================================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   uuid NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('user', 'assistant')),
  content     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_thread
  ON chat_messages (thread_id, created_at ASC);

-- RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON chat_messages
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);
