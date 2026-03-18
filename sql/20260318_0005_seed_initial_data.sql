-- File: 20260318_0005_seed_initial_data.sql
-- Purpose: 既存データから新規テーブルへ初期データを投入
--   - clients: yasunobu-memo / pocket-yasunobu の client_name を集約
--   - todos: pocket-yasunobu の todos(jsonb) を個別行に展開
--   - decisions: pocket-yasunobu の decisions(jsonb) を個別行に展開
-- Created: 2026-03-18
-- ※ 本番実行前に SELECT で件数を確認してから INSERT すること

-- =============================================================================
-- 1. clients 初期投入
--    既存の client_name を集約して顧客マスタを生成
-- =============================================================================
INSERT INTO clients (name)
SELECT DISTINCT client_name
FROM (
  SELECT client_name FROM "yasunobu-memo"
  WHERE client_name IS NOT NULL AND client_name != ''
  UNION
  SELECT client_name FROM "pocket-yasunobu"
  WHERE client_name IS NOT NULL AND client_name != ''
) AS all_clients
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- 2. todos 初期投入
--    pocket-yasunobu の todos(jsonb配列) を1行ずつ展開
-- =============================================================================
INSERT INTO todos (source_type, source_id, content, client_name, status)
SELECT
  'minutes',
  p.id::text,
  todo_item,
  p.client_name,
  'open'
FROM "pocket-yasunobu" p,
LATERAL jsonb_array_elements_text(p.todos) AS todo_item
WHERE p.todos IS NOT NULL
  AND p.todos != 'null'::jsonb
  AND jsonb_array_length(p.todos) > 0;

-- =============================================================================
-- 3. decisions 初期投入
--    pocket-yasunobu の decisions(jsonb配列) を1行ずつ展開
-- =============================================================================
INSERT INTO decisions (source_type, source_id, content, client_name)
SELECT
  'minutes',
  p.id::text,
  decision_item,
  p.client_name
FROM "pocket-yasunobu" p,
LATERAL jsonb_array_elements_text(p.decisions) AS decision_item
WHERE p.decisions IS NOT NULL
  AND p.decisions != 'null'::jsonb
  AND jsonb_array_length(p.decisions) > 0;
