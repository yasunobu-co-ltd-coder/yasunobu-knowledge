-- File: 20260318_0003_create_decisions.sql
-- Purpose: 決定事項追跡テーブルを作成
--   - 既存 pocket-matip の decisions(jsonb) を個別行に展開して管理
--   - revised_by で改訂チェーンを追跡可能
-- Created: 2026-03-18

-- =============================================================================
-- 1. decisions テーブル
-- =============================================================================
CREATE TABLE IF NOT EXISTS decisions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 既存テーブルへの参照
  source_type text NOT NULL CHECK (source_type IN ('memo', 'minutes')),
  source_id   text NOT NULL,

  -- 決定事項本体
  content     text NOT NULL,
  status      text NOT NULL DEFAULT 'active'
              CHECK (status IN ('active', 'revised', 'cancelled')),
  revised_by  uuid REFERENCES decisions(id),  -- 改訂された場合の新決定事項id
  sort_order  integer DEFAULT 0,

  -- 顧客紐付け
  client_name text,

  created_at  timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- 2. インデックス
-- =============================================================================

-- 元レコード別
CREATE INDEX IF NOT EXISTS idx_decisions_source
  ON decisions (source_type, source_id);

-- 顧客別の有効な決定事項
CREATE INDEX IF NOT EXISTS idx_decisions_active
  ON decisions (client_name, status)
  WHERE status = 'active';

-- =============================================================================
-- 3. RLS
-- =============================================================================
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON decisions
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);
