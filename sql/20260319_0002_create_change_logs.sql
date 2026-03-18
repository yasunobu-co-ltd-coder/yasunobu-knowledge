-- File: 20260319_0002_create_change_logs.sql
-- Purpose: TODO/決定事項などの変更履歴を記録
-- Created: 2026-03-19

-- =============================================================================
-- 1. change_logs テーブル
-- =============================================================================
CREATE TABLE IF NOT EXISTS change_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name   text,
  source_type   text NOT NULL,           -- 'todo', 'decision', 'memo', 'minutes' etc.
  source_id     text NOT NULL,           -- 変更対象のレコードID
  change_type   text NOT NULL,           -- 'status_update', 'content_update', 'create', 'delete'
  before_value  text,                    -- 変更前の値（JSONまたはプレーンテキスト）
  after_value   text,                    -- 変更後の値
  note          text,                    -- 変更メモ（「AI提案をもとに更新」等）
  thread_id     uuid REFERENCES chat_threads(id), -- AI提案経由ならスレッドIDを記録
  created_by    text,                    -- 操作者
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 顧客別の変更履歴
CREATE INDEX IF NOT EXISTS idx_change_logs_client
  ON change_logs (client_name, created_at DESC);

-- 対象レコード別
CREATE INDEX IF NOT EXISTS idx_change_logs_source
  ON change_logs (source_type, source_id);

-- RLS
ALTER TABLE change_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON change_logs
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);
