-- メッセージにリプライ・添付機能を追加
ALTER TABLE team_messages
  ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES team_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS attachment_type text,      -- 'memo' | 'minutes' | 'todo' | 'decision'
  ADD COLUMN IF NOT EXISTS attachment_id   uuid;

CREATE INDEX IF NOT EXISTS idx_team_messages_reply ON team_messages(reply_to_id);
