-- File: 20260318_0001_create_clients.sql
-- Purpose: 顧客マスタテーブルを作成
--   - 既存の yasunobu-memo / pocket-yasunobu の client_name を正規化する基盤
--   - 既存テーブルには一切変更を加えない
-- Created: 2026-03-18

-- =============================================================================
-- 1. clients テーブル（顧客マスタ）
-- =============================================================================
CREATE TABLE IF NOT EXISTS clients (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,              -- 正式名称
  notes       text,                       -- 顧客メモ
  created_by  uuid REFERENCES users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 名前でユニーク（名寄せの基点）
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_name
  ON clients (name);

-- =============================================================================
-- 2. client_aliases テーブル（名寄せ用の別名管理）
-- =============================================================================
CREATE TABLE IF NOT EXISTS client_aliases (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  alias       text NOT NULL,              -- 別名（「Ａ社」「a社」など）
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_aliases_alias
  ON client_aliases (alias);
CREATE INDEX IF NOT EXISTS idx_client_aliases_client
  ON client_aliases (client_id);

-- =============================================================================
-- 3. 名寄せ関数
--    入力テキストから client_id を解決する
-- =============================================================================
CREATE OR REPLACE FUNCTION resolve_client_name(input_name text)
RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    (SELECT id FROM clients WHERE name = input_name),
    (SELECT client_id FROM client_aliases WHERE alias = input_name)
  );
$$;

-- =============================================================================
-- 4. updated_at 自動更新トリガー
-- =============================================================================
CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON clients FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 5. RLS
-- =============================================================================
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON clients
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

ALTER TABLE client_aliases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON client_aliases
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);
