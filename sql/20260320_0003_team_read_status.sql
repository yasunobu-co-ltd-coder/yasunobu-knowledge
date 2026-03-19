-- 未読管理: ユーザーごとのチャンネル既読位置
CREATE TABLE IF NOT EXISTS team_read_status (
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_id  uuid NOT NULL REFERENCES team_channels(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, channel_id)
);

-- RLS
ALTER TABLE team_read_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team_read_status_all" ON team_read_status FOR ALL USING (true) WITH CHECK (true);
