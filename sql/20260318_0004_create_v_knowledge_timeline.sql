-- File: 20260318_0004_create_v_knowledge_timeline.sql
-- Purpose: memo と pocket を横断するView を作成
--   - 既存テーブルは一切変更しない
--   - UNION ALL で束ねるだけ
--   - 顧客カルテ・横断検索・タイムラインの基盤
-- Created: 2026-03-18

-- =============================================================================
-- 1. 横断View
-- =============================================================================
CREATE OR REPLACE VIEW v_knowledge_timeline AS

-- ===== matip-memo（手動メモ） =====
SELECT
  m.id::text                        AS id,
  'memo'::text                      AS source_type,
  m.client_name,
  m.memo                            AS body,
  NULL::text                        AS summary,
  NULL::text                        AS transcript,
  m.status,
  m.importance,
  m.profit,
  m.urgency,
  m.due_date::text                  AS due_date,
  m.assignment_type,
  m.assignee::text                  AS assignee,
  m.created_by::text                AS user_id,
  m.image_url,
  NULL::jsonb                       AS decisions_json,
  NULL::jsonb                       AS todos_json,
  NULL::text[]                      AS keywords,
  NULL::text                        AS next_schedule,
  m.created_at
FROM "matip-memo" m

UNION ALL

-- ===== pocket-matip（議事録） =====
SELECT
  p.id::text                        AS id,
  'minutes'::text                   AS source_type,
  p.client_name,
  NULL::text                        AS body,
  p.summary,
  p.transcript,
  'done'::text                      AS status,
  NULL::text                        AS importance,
  NULL::text                        AS profit,
  NULL::text                        AS urgency,
  NULL::text                        AS due_date,
  NULL::text                        AS assignment_type,
  NULL::text                        AS assignee,
  p.user_id::text                   AS user_id,
  NULL::text                        AS image_url,
  p.decisions                       AS decisions_json,
  p.todos                           AS todos_json,
  p.keywords,
  p.next_schedule::text             AS next_schedule,
  p.created_at
FROM "pocket-matip" p;

-- =============================================================================
-- 2. 既存テーブルへのインデックス追加（データ・カラムに影響なし、読取高速化のみ）
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_memo_client_name
  ON "matip-memo" (client_name);
CREATE INDEX IF NOT EXISTS idx_memo_created_at
  ON "matip-memo" (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pocket_client_name
  ON "pocket-matip" (client_name);
CREATE INDEX IF NOT EXISTS idx_pocket_created_at
  ON "pocket-matip" (created_at DESC);
