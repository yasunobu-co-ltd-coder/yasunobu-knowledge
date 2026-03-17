-- File: 20260318_0002_create_todos.sql
-- Purpose: TODO追跡テーブルを作成
--   - 既存 pocket-matip の todos(jsonb) を個別行に展開して管理
--   - source_type + source_id で既存テーブルを参照（FKなし = 既存に影響ゼロ）
-- Created: 2026-03-18

-- =============================================================================
-- 1. todos テーブル
-- =============================================================================
CREATE TABLE IF NOT EXISTS todos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 既存テーブルへの参照（FKなし = 既存に影響ゼロ）
  source_type text NOT NULL CHECK (source_type IN ('memo', 'minutes')),
  source_id   text NOT NULL,             -- 既存テーブルのid（text統一で型差吸収）

  -- TODO本体
  content     text NOT NULL,
  assignee    uuid REFERENCES users(id),
  due_date    date,
  status      text NOT NULL DEFAULT 'open'
              CHECK (status IN ('open', 'in_progress', 'done', 'cancelled')),
  sort_order  integer DEFAULT 0,

  -- 顧客紐付け（横断検索用。冗長だが高速化のため保持）
  client_name text,

  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- 2. インデックス
-- =============================================================================

-- 元レコード別に取得（「この議事録のTODO一覧」）
CREATE INDEX IF NOT EXISTS idx_todos_source
  ON todos (source_type, source_id);

-- 未完了TODO一覧（「全体の未完了TODO」）
CREATE INDEX IF NOT EXISTS idx_todos_open
  ON todos (status, due_date)
  WHERE status NOT IN ('done', 'cancelled');

-- 担当者別（「自分のTODO」）
CREATE INDEX IF NOT EXISTS idx_todos_assignee
  ON todos (assignee)
  WHERE status NOT IN ('done', 'cancelled');

-- 顧客別（「A社のTODO一覧」）
CREATE INDEX IF NOT EXISTS idx_todos_client
  ON todos (client_name)
  WHERE status NOT IN ('done', 'cancelled');

-- =============================================================================
-- 3. updated_at 自動更新トリガー
-- =============================================================================
CREATE TRIGGER trg_todos_updated_at
  BEFORE UPDATE ON todos FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 4. RLS
-- =============================================================================
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON todos
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);
