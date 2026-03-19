-- チャンネル参加者管理
CREATE TABLE IF NOT EXISTS team_channel_members (
  channel_id  uuid NOT NULL REFERENCES team_channels(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at   timestamptz DEFAULT now(),
  PRIMARY KEY (channel_id, user_id)
);

ALTER TABLE team_channel_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team_channel_members_all" ON team_channel_members FOR ALL USING (true) WITH CHECK (true);

-- push通知サブスクリプション（memo同様のVAPID方式）
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint    text NOT NULL UNIQUE,
  p256dh      text NOT NULL,
  auth        text NOT NULL,
  enabled     boolean DEFAULT true,
  user_agent  text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id, enabled);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push_subscriptions_all" ON push_subscriptions FOR ALL USING (true) WITH CHECK (true);
