-- ============================================
-- RLSポリシー変更: anon = SELECT のみ
-- service_role はRLSバイパスなので影響なし
-- ============================================
-- 対象: knowledge専用テーブルのみ
-- yasunobu-memo / pocket-yasunobu は変更しない
-- ============================================

-- ■ todos
DROP POLICY IF EXISTS "todos_all" ON todos;
CREATE POLICY "todos_select_anon" ON todos FOR SELECT USING (true);
-- service_role は auth.role() = 'service_role' で全操作可能（RLSバイパス）

-- ■ decisions
DROP POLICY IF EXISTS "decisions_all" ON decisions;
CREATE POLICY "decisions_select_anon" ON decisions FOR SELECT USING (true);

-- ■ clients
DROP POLICY IF EXISTS "clients_all" ON clients;
CREATE POLICY "clients_select_anon" ON clients FOR SELECT USING (true);

-- ■ client_aliases
DROP POLICY IF EXISTS "client_aliases_all" ON client_aliases;
CREATE POLICY "client_aliases_select_anon" ON client_aliases FOR SELECT USING (true);

-- ■ change_logs
DROP POLICY IF EXISTS "change_logs_all" ON change_logs;
CREATE POLICY "change_logs_select_anon" ON change_logs FOR SELECT USING (true);

-- ■ chat_threads
DROP POLICY IF EXISTS "chat_threads_all" ON chat_threads;
CREATE POLICY "chat_threads_select_anon" ON chat_threads FOR SELECT USING (true);

-- ■ chat_messages
DROP POLICY IF EXISTS "chat_messages_all" ON chat_messages;
CREATE POLICY "chat_messages_select_anon" ON chat_messages FOR SELECT USING (true);

-- ■ team_channels
DROP POLICY IF EXISTS "team_channels_all" ON team_channels;
CREATE POLICY "team_channels_select_anon" ON team_channels FOR SELECT USING (true);

-- ■ team_messages（Realtimeで INSERT を受信するため SELECT のみでOK）
DROP POLICY IF EXISTS "team_messages_all" ON team_messages;
CREATE POLICY "team_messages_select_anon" ON team_messages FOR SELECT USING (true);

-- ■ team_read_status
DROP POLICY IF EXISTS "team_read_status_all" ON team_read_status;
CREATE POLICY "team_read_status_select_anon" ON team_read_status FOR SELECT USING (true);

-- ■ team_channel_members
DROP POLICY IF EXISTS "team_channel_members_all" ON team_channel_members;
CREATE POLICY "team_channel_members_select_anon" ON team_channel_members FOR SELECT USING (true);

-- ■ push_subscriptions
DROP POLICY IF EXISTS "push_subscriptions_all" ON push_subscriptions;
CREATE POLICY "push_subscriptions_select_anon" ON push_subscriptions FOR SELECT USING (true);

-- ============================================
-- 確認用: 変更後のポリシー一覧
-- ============================================
-- SELECT pg_policies.tablename, pg_policies.policyname, pg_policies.cmd
-- FROM pg_policies
-- WHERE pg_policies.schemaname = 'public'
-- ORDER BY tablename;
