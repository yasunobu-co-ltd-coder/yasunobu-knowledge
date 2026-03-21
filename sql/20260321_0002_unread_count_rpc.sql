-- 未読メッセージ数を1クエリで取得するRPC関数
CREATE OR REPLACE FUNCTION get_unread_count(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(cnt), 0)::integer
  FROM (
    SELECT COUNT(*) AS cnt
    FROM team_messages m
    JOIN team_channels c ON c.id = m.channel_id
    LEFT JOIN team_read_status rs
      ON rs.channel_id = m.channel_id AND rs.user_id = p_user_id
    WHERE m.user_id != p_user_id
      AND (rs.last_read_at IS NULL OR m.created_at > rs.last_read_at)
  ) sub;
$$;
