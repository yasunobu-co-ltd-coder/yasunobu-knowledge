-- File: 20260318_0000_create_utility_functions.sql
-- Purpose: 共通ユーティリティ関数を作成
--   - updated_at 自動更新用のトリガー関数
-- Created: 2026-03-18
-- ※ 他のすべてのマイグレーションより先に実行すること

-- =============================================================================
-- 1. updated_at 自動更新関数
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
