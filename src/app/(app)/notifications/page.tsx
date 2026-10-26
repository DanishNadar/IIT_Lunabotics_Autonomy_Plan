import { loadContext } from "@/lib/server/data";
import { NotificationsClient } from "./notifications-client";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const { db, actor } = await loadContext();
  return (
    <NotificationsClient
      items={db.notifications.filter((n) => n.memberId === actor.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 200)}
      disabled={db.notificationPreferences.find((p) => p.memberId === actor.id)?.disabledKinds ?? []}
    />
  );
}
