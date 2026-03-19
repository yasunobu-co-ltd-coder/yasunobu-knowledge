-- チームチャット: チャンネル
CREATE TABLE IF NOT EXISTS team_channels (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text NOT NULL,
  client_name text,  -- NULLなら全体チャンネル
  created_at  timestamptz DEFAULT now()
);

-- チームチャット: メッセージ
CREATE TABLE IF NOT EXISTS team_messages (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id  uuid NOT NULL REFERENCES team_channels(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id),
  user_name   text NOT NULL,
  content     text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_messages_channel
  ON team_messages(channel_id, created_at);

-- デフォルトの全体チャンネルを作成
INSERT INTO team_channels (name, client_name)
VALUES ('全体', NULL)
ON CONFLICT DO NOTHING;

-- Supabase Realtime を有効にする
ALTER PUBLICATION supabase_realtime ADD TABLE team_messages;
