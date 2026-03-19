-- team_channels: RLSを無効化（社内ツールのため全員アクセス可）
ALTER TABLE team_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team_channels_all" ON team_channels FOR ALL USING (true) WITH CHECK (true);

-- team_messages: RLSを無効化（社内ツールのため全員アクセス可）
ALTER TABLE team_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team_messages_all" ON team_messages FOR ALL USING (true) WITH CHECK (true);
