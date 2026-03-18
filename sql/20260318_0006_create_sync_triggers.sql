-- File: 20260318_0006_create_sync_triggers.sql
-- Purpose: 既存テーブルに新規レコードが入った時、clients を自動追加するトリガー
--   - 既存テーブルのカラム・データには一切影響しない
--   - INSERT 時に client_name → clients へ ON CONFLICT DO NOTHING で追加するだけ
-- Created: 2026-03-18

-- =============================================================================
-- 1. 共通関数: client_name を clients テーブルに自動追加
-- =============================================================================
CREATE OR REPLACE FUNCTION sync_client_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.client_name IS NOT NULL AND NEW.client_name != '' THEN
    INSERT INTO clients (name)
    VALUES (NEW.client_name)
    ON CONFLICT (name) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 2. yasunobu-memo への INSERT トリガー
-- =============================================================================
CREATE TRIGGER trg_memo_sync_client
  AFTER INSERT ON "yasunobu-memo"
  FOR EACH ROW
  EXECUTE FUNCTION sync_client_name();

-- =============================================================================
-- 3. pocket-yasunobu への INSERT トリガー
-- =============================================================================
CREATE TRIGGER trg_pocket_sync_client
  AFTER INSERT ON "pocket-yasunobu"
  FOR EACH ROW
  EXECUTE FUNCTION sync_client_name();

-- =============================================================================
-- 4. UPDATE 時にも client_name が変わったら追加
-- =============================================================================
CREATE TRIGGER trg_memo_sync_client_update
  AFTER UPDATE OF client_name ON "yasunobu-memo"
  FOR EACH ROW
  WHEN (NEW.client_name IS DISTINCT FROM OLD.client_name)
  EXECUTE FUNCTION sync_client_name();

CREATE TRIGGER trg_pocket_sync_client_update
  AFTER UPDATE OF client_name ON "pocket-yasunobu"
  FOR EACH ROW
  WHEN (NEW.client_name IS DISTINCT FROM OLD.client_name)
  EXECUTE FUNCTION sync_client_name();
