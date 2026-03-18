-- File: 20260318_0007_merge_duplicate_clients.sql
-- Purpose: 重複した顧客名を名寄せする
--   - 「○○社 ××」→「○○社」に統合
--   - 枝番をclient_aliasesに登録
--   - todos / decisions の client_name も親名に更新
--   - 重複clientsレコードを削除
-- Created: 2026-03-18
-- ※ 実行前にバックアップを推奨

-- =============================================================================
-- 1. AkoFactledgeLabo.株式会社 平井様 → AkoFactledgeLabo.株式会社
-- =============================================================================
INSERT INTO client_aliases (client_id, alias)
SELECT id, 'AkoFactledgeLabo.株式会社 平井様'
FROM clients WHERE name = 'AkoFactledgeLabo.株式会社'
ON CONFLICT (alias) DO NOTHING;

UPDATE todos SET client_name = 'AkoFactledgeLabo.株式会社'
WHERE client_name = 'AkoFactledgeLabo.株式会社 平井様';

UPDATE decisions SET client_name = 'AkoFactledgeLabo.株式会社'
WHERE client_name = 'AkoFactledgeLabo.株式会社 平井様';

DELETE FROM clients WHERE name = 'AkoFactledgeLabo.株式会社 平井様';

-- =============================================================================
-- 2. SKK88守分さん → SKK88守分
-- =============================================================================
INSERT INTO client_aliases (client_id, alias)
SELECT id, 'SKK88守分さん'
FROM clients WHERE name = 'SKK88守分'
ON CONFLICT (alias) DO NOTHING;

UPDATE todos SET client_name = 'SKK88守分'
WHERE client_name = 'SKK88守分さん';

UPDATE decisions SET client_name = 'SKK88守分'
WHERE client_name = 'SKK88守分さん';

DELETE FROM clients WHERE name = 'SKK88守分さん';

-- =============================================================================
-- 3. マティップ matip-memo / マティップ 赤木さん → マティップ
-- =============================================================================
INSERT INTO client_aliases (client_id, alias)
SELECT id, 'マティップ matip-memo'
FROM clients WHERE name = 'マティップ'
ON CONFLICT (alias) DO NOTHING;

INSERT INTO client_aliases (client_id, alias)
SELECT id, 'マティップ 赤木さん'
FROM clients WHERE name = 'マティップ'
ON CONFLICT (alias) DO NOTHING;

UPDATE todos SET client_name = 'マティップ'
WHERE client_name IN ('マティップ matip-memo', 'マティップ 赤木さん');

UPDATE decisions SET client_name = 'マティップ'
WHERE client_name IN ('マティップ matip-memo', 'マティップ 赤木さん');

DELETE FROM clients WHERE name IN ('マティップ matip-memo', 'マティップ 赤木さん');

-- =============================================================================
-- 4. PM MTG 2026_03_11 → PM MTG
-- =============================================================================
INSERT INTO client_aliases (client_id, alias)
SELECT id, 'PM MTG 2026_03_11'
FROM clients WHERE name = 'PM MTG'
ON CONFLICT (alias) DO NOTHING;

UPDATE todos SET client_name = 'PM MTG'
WHERE client_name = 'PM MTG 2026_03_11';

UPDATE decisions SET client_name = 'PM MTG'
WHERE client_name = 'PM MTG 2026_03_11';

DELETE FROM clients WHERE name = 'PM MTG 2026_03_11';
