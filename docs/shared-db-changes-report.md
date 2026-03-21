# yasunobu-memo プロジェクト 変更レポート（全範囲）

**作成日:** 2026-03-22
**対象:** yasunobu-memo リポジトリのコード変更 + 共有DB（yasunobu-memo / pocket-yasunobu テーブル）への変更

---

## Part 1: yasunobu-memo アプリコードの変更一覧

以下は yasunobu-memo リポジトリに対して行われた全コミットの一覧です（直近30コミット）。

### UI/機能の変更

| 日付 | コミット | 変更内容 |
|------|---------|---------|
| 03/15 | `057a6b7` | **期限リマインド通知（Vercel Cron）** — 期限当日・1日前のメモに対してPush通知を送るCronジョブ追加 |
| 03/15 | `562712a` | **音声入力で過去の顧客名を類推マッチング** — 音声入力時に既存顧客名と照合して補正 |
| 03/15 | `5ecb25b` | **カード内テキスト改行対応・フッター位置修正** |
| 03/12 | `fa6319f` | **PINコードをハードコードから環境変数に移行** |
| 03/11 | `331c052` | **下スワイプでPull to Refresh** — データ再読み込み機能追加 |
| 03/11 | `c386e37` | **通知設定を「すべての案件」「自分の案件のみ」に分離** |
| 03/11 | `1e8a354` | **代理人が異なる場合の通知に両者の名前を表示** |
| 03/11 | `90a6955` | **担当者選択画面に更新案内カードを追加** |
| 03/10 | `acca5a1` | **OGPメタデータ追加** — リンクプレビューにアイコン・説明文を表示 |
| 03/10 | `1111c55` | **PIN画面左上にバージョン+コミットSHA表記を追加** |
| 03/10 | `d769a38` | **PWA更新戦略の実装** + localStorage me復元修正 |

### パフォーマンス改善

| 日付 | コミット | 変更内容 |
|------|---------|---------|
| 03/09 | `24a7a6f` | **Push通知をNext.js after()に移行** — fire-and-forget→waitUntil相当 |
| 03/09 | `a083259` | **Supabase接続プリウォーム・Push通知非同期化・SWキャッシュエラー修正** |
| 03/09 | `6a73373` | **初期ロード並列化 & 計測ログ追加** |
| 03/08 | `653e817` | **Supabaseクエリ最適化** — カラム限定・limit追加・N+1解消・再フェッチ抑制 |

### バグ修正

| 日付 | コミット | 変更内容 |
|------|---------|---------|
| 03/12 | `d0adf79` | 担当ラベルのhtmlFor削除（条件表示のselectと不一致のため） |
| 03/12 | `7bfc9dc` | データがない場合もフッターが画面下部に固定されるよう修正 |
| 03/12 | `5bc7c37` | バージョン表示をカードの外側に配置 |
| 03/12 | `c050f0f` | PIN画面のバージョン表示もロゴ上に移動 |
| 03/12 | `b24409f` | 担当者選択画面のバージョン表示をロゴ上に移動 |
| 03/12 | `0f523ef` | フォームのlabel/id紐づけ追加（ブラウザ警告解消） |
| 03/11 | `6b74470` | 全input/selectにname属性追加（ブラウザ警告解消） |
| 03/11 | `0d1de17` | 通知OFF時のDB削除修正、バージョン表示追加、input警告修正 |
| 03/11 | `451b7be` | 通知のuser_idを登録時に固定し、別ユーザーで入っても上書きしない |
| 03/11 | `64f8523` | PIN入力後に担当者選択画面がスキップされるバグを修正 |
| 03/09 | `36d2f21` | カレンダーモーダルの担当者表示をUUID→名前に修正 |
| 03/08 | `2f098af` | .single()を.maybeSingle()に変更（レコード未存在時の406エラー修正） |
| 03/08 | `7b2224b` | JOINのFK指定をカラム名ベースに変更（406エラー修正） |
| 03/08 | `5039ae9` | アプリ名をyasunobu-memoに統一 & unreadテーブルのuser_id修正 |

### 変更されたファイル一覧

```
app/api/cron/deadline-reminders/route.ts  — 新規: Cron期限リマインド通知
app/api/push/subscribe/route.ts           — 変更: Push通知サブスクリプション
app/api/transcribe/route.ts               — 変更: 音声入力に顧客名マッチング追加
app/api/yasunobu-memo/create/route.ts     — 変更: メモ作成API
app/components/PullToRefresh.tsx           — 新規: 下スワイプ再読み込み
app/components/PushNotificationUI.tsx      — 変更: 通知設定UI改善
app/components/ServiceWorkerRegistration.tsx — 変更: PWA更新戦略
app/components/UpdateNotice.tsx            — 新規: 更新案内カード
app/components/usePushSubscription.ts      — 変更: Push通知フック
app/globals.css                            — 変更: スタイル微調整
app/layout.tsx                             — 変更: レイアウト調整
app/page.tsx                               — 変更: メインUI（複数変更）
docs/debugging-and-optimization-guide.md   — 新規: デバッグガイド
lib/deals.ts                               — 変更: クエリ最適化
lib/push.ts                                — 変更: Push通知処理改善
lib/unread.ts                              — 変更: 未読管理
lib/users.ts                               — 変更: ユーザー管理
next.config.ts                             — 変更: 設定変更
public/sw.js                               — 変更: ServiceWorker更新
public/manifest.json                       — 変更: PWAマニフェスト
sql/20260311_add_notify_mode.sql           — 新規: 通知モードSQL
vercel.json                                — 新規: Vercel設定
```

---

## Part 2: 共有DB（Supabase）への変更

yasunobu-knowledge プロジェクトから、既存テーブルに対して行った変更です。

**重要: 既存テーブルのカラム・データの変更は一切行っていません。**

### 2-1. View の作成（読み取り専用）

**SQL:** `20260318_0004_create_v_knowledge_timeline.sql`

`yasunobu-memo` と `pocket-yasunobu` を UNION ALL で束ねた読み取り専用View。

```sql
CREATE OR REPLACE VIEW v_knowledge_timeline AS
SELECT m.id::text AS id, 'memo'::text AS source_type, m.client_name, m.memo AS body, ...
FROM "yasunobu-memo" m
UNION ALL
SELECT p.id::text AS id, 'minutes'::text AS source_type, p.client_name, p.summary, ...
FROM "pocket-yasunobu" p;
```

- データ書き込みは発生しない
- 削除: `DROP VIEW IF EXISTS v_knowledge_timeline;`

### 2-2. トリガーの追加

**SQL:** `20260318_0006_create_sync_triggers.sql`

INSERT/UPDATE時に `clients` テーブルへ `client_name` を自動登録するトリガー。

```sql
-- yasunobu-memo INSERT/UPDATE時
CREATE TRIGGER trg_memo_sync_client AFTER INSERT ON "yasunobu-memo" ...
CREATE TRIGGER trg_memo_sync_client_update AFTER UPDATE OF client_name ON "yasunobu-memo" ...

-- pocket-yasunobu INSERT/UPDATE時
CREATE TRIGGER trg_pocket_sync_client AFTER INSERT ON "pocket-yasunobu" ...
CREATE TRIGGER trg_pocket_sync_client_update AFTER UPDATE OF client_name ON "pocket-yasunobu" ...
```

- 元テーブルのデータには影響しない（別テーブルへのINSERTのみ）
- 削除:
  ```sql
  DROP TRIGGER IF EXISTS trg_memo_sync_client ON "yasunobu-memo";
  DROP TRIGGER IF EXISTS trg_memo_sync_client_update ON "yasunobu-memo";
  DROP TRIGGER IF EXISTS trg_pocket_sync_client ON "pocket-yasunobu";
  DROP TRIGGER IF EXISTS trg_pocket_sync_client_update ON "pocket-yasunobu";
  DROP FUNCTION IF EXISTS sync_client_name();
  ```

### 2-3. インデックスの追加

**SQL:** `20260318_0004` + `20260321_0001_performance_indexes.sql`

#### yasunobu-memo テーブル
```sql
CREATE INDEX IF NOT EXISTS idx_memo_client_name ON "yasunobu-memo"(client_name);
CREATE INDEX IF NOT EXISTS idx_memo_due_date ON "yasunobu-memo"(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_memo_created_at ON "yasunobu-memo"(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memo_status ON "yasunobu-memo"(status);
```

#### pocket-yasunobu テーブル
```sql
CREATE INDEX IF NOT EXISTS idx_pocket_client_name ON "pocket-yasunobu"(client_name);
CREATE INDEX IF NOT EXISTS idx_pocket_next_schedule ON "pocket-yasunobu"(next_schedule) WHERE next_schedule IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pocket_created_at ON "pocket-yasunobu"(created_at DESC);
```

- SELECT の高速化のみ（メモ・議事録アプリ側も恩恵あり）
- 削除:
  ```sql
  DROP INDEX IF EXISTS idx_memo_client_name;
  DROP INDEX IF EXISTS idx_memo_due_date;
  DROP INDEX IF EXISTS idx_memo_created_at;
  DROP INDEX IF EXISTS idx_memo_status;
  DROP INDEX IF EXISTS idx_pocket_client_name;
  DROP INDEX IF EXISTS idx_pocket_next_schedule;
  DROP INDEX IF EXISTS idx_pocket_created_at;
  ```

### 2-4. ナレッジDBからの書き込み

| 操作 | テーブル | 条件 |
|------|---------|------|
| INSERT | yasunobu-memo | AIチャットからカレンダー予定・メモを追加する場合のみ |

---

## Part 3: 変更していないもの（明示）

- `yasunobu-memo` テーブルのカラム構造
- `pocket-yasunobu` テーブルのカラム構造
- `users` テーブルのカラム構造
- 既存データの内容
- RLSポリシー
- 既存のトリガー・関数（メモアプリ側が定義したもの）

---

## 全ロールバックSQL（DB変更を全て元に戻す場合）

```sql
-- トリガー削除
DROP TRIGGER IF EXISTS trg_memo_sync_client ON "yasunobu-memo";
DROP TRIGGER IF EXISTS trg_memo_sync_client_update ON "yasunobu-memo";
DROP TRIGGER IF EXISTS trg_pocket_sync_client ON "pocket-yasunobu";
DROP TRIGGER IF EXISTS trg_pocket_sync_client_update ON "pocket-yasunobu";
DROP FUNCTION IF EXISTS sync_client_name();

-- View削除
DROP VIEW IF EXISTS v_knowledge_timeline;

-- インデックス削除（yasunobu-memo）
DROP INDEX IF EXISTS idx_memo_client_name;
DROP INDEX IF EXISTS idx_memo_due_date;
DROP INDEX IF EXISTS idx_memo_created_at;
DROP INDEX IF EXISTS idx_memo_status;

-- インデックス削除（pocket-yasunobu）
DROP INDEX IF EXISTS idx_pocket_client_name;
DROP INDEX IF EXISTS idx_pocket_next_schedule;
DROP INDEX IF EXISTS idx_pocket_created_at;
```
