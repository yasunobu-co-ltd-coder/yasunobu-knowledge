-- File: 20260318_0008_update_view_with_alias_resolution.sql
-- Purpose: v_knowledge_timeline のclient_nameをエイリアス解決付きに更新
--   - 既存テーブルの「マティップ 赤木さん」→ View上は「マティップ」と表示
--   - 既存テーブルのデータは一切変更しない
-- Created: 2026-03-18

-- =============================================================================
-- 名寄せ解決関数（テキスト→テキスト版、View用）
-- =============================================================================
CREATE OR REPLACE FUNCTION resolve_client_display_name(input_name text)
RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    -- aliasに一致したら、親のnameを返す
    (SELECT c.name FROM client_aliases a JOIN clients c ON c.id = a.client_id WHERE a.alias = input_name),
    -- clientsに直接一致したらそのまま返す
    (SELECT name FROM clients WHERE name = input_name),
    -- どちらにもなければ元のまま
    input_name
  );
$$;

-- =============================================================================
-- View再作成（client_nameを名寄せ解決付きに）
-- =============================================================================
CREATE OR REPLACE VIEW v_knowledge_timeline AS

SELECT
  m.id::text                        AS id,
  'memo'::text                      AS source_type,
  resolve_client_display_name(m.client_name) AS client_name,
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
  NULL::jsonb                       AS decisions_json,
  NULL::jsonb                       AS todos_json,
  NULL::jsonb                       AS keywords,
  NULL::text                        AS next_schedule,
  m.created_at
FROM "yasunobu-memo" m

UNION ALL

SELECT
  p.id::text                        AS id,
  'minutes'::text                   AS source_type,
  resolve_client_display_name(p.client_name) AS client_name,
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
  p.decisions                       AS decisions_json,
  p.todos                           AS todos_json,
  p.keywords::jsonb                 AS keywords,
  p.next_schedule::text             AS next_schedule,
  p.created_at
FROM "pocket-yasunobu" p;
