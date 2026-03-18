-- File: 20260318_0009_improve_sync_trigger_with_alias.sql
-- Purpose: sync_client_name トリガーを改良
--   - 新しいclient_nameが来た時、既存aliasに一致するか確認
--   - 一致しなければ新規clientとして追加（従来通り）
--   - 一致すれば何もしない（既に名寄せ済みとみなす）
-- Created: 2026-03-18

CREATE OR REPLACE FUNCTION sync_client_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.client_name IS NOT NULL AND NEW.client_name != '' THEN
    -- aliasにも既存clientにも存在しない場合のみ追加
    IF NOT EXISTS (SELECT 1 FROM clients WHERE name = NEW.client_name)
       AND NOT EXISTS (SELECT 1 FROM client_aliases WHERE alias = NEW.client_name)
    THEN
      INSERT INTO clients (name)
      VALUES (NEW.client_name)
      ON CONFLICT (name) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
