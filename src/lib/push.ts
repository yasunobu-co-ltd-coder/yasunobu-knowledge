import webpush from "web-push";
import { supabaseAdmin, isSupabaseConfigured } from "./supabase";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:dev@example.com";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

/** チャンネルメンバー（送信者除く）にPush通知を送信 */
export async function sendPushToChannelMembers(
  channelId: string,
  senderUserId: string,
  payload: PushPayload
) {
  if (!isSupabaseConfigured || !supabaseAdmin || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;

  // チャンネルメンバー取得（送信者除外）
  const { data: members } = await supabaseAdmin
    .from("team_channel_members")
    .select("user_id")
    .eq("channel_id", channelId)
    .neq("user_id", senderUserId);

  if (!members || members.length === 0) return;

  const memberIds = members.map((m) => m.user_id);

  // メンバーのPushサブスクリプション取得
  const { data: subs } = await supabaseAdmin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .in("user_id", memberIds)
    .eq("enabled", true);

  if (!subs || subs.length === 0) return;

  const body = JSON.stringify(payload);

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
          { TTL: 3600 }
        );
      } catch (err: unknown) {
        // 410/404 = expired subscription
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 410 || status === 404) {
          await supabaseAdmin!
            .from("push_subscriptions")
            .update({ enabled: false })
            .eq("endpoint", sub.endpoint);
        }
      }
    })
  );
}
