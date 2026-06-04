import { demoAvatar } from "@/data/demo-seed";
import { cn } from "@/lib/utils";
import {
  formatAlertTime,
  useDemoNotificationStore,
} from "@/stores/demo-notification-store";
import { useAppNavStore } from "@/stores/app-nav-store";
import { useDmInboxStore } from "@/stores/dm-inbox-store";

function getAvatarFallback(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return "?";
  }
  return trimmed[0]?.toUpperCase() ?? "?";
}

export function AlertsPage() {
  const alerts = useDemoNotificationStore((s) => s.alerts);
  const markAlertRead = useDemoNotificationStore((s) => s.markAlertRead);
  const markAllAlertsRead = useDemoNotificationStore((s) => s.markAllAlertsRead);
  const setScreen = useAppNavStore((s) => s.setScreen);
  const requestOpenChat = useDmInboxStore((s) => s.requestOpenChat);
  const unreadCount = alerts.filter((a) => !a.read).length;

  function openAlert(alertId: string) {
    const alert = alerts.find((a) => a.id === alertId);
    markAlertRead(alertId);
    if (alert?.chatId) {
      requestOpenChat(alert.chatId);
    }
    setScreen("messages");
  }

  return (
    <div className="font-sans text-theme-text">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Уведомления</h1>
        {unreadCount > 0 ? (
          <button
            type="button"
            className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium text-theme-text-2 transition-colors hover:bg-theme-hover hover:text-theme-text"
            onClick={markAllAlertsRead}
          >
            Прочитать все
          </button>
        ) : null}
      </div>

      {alerts.length > 0 ? (
        <ul
          className="overflow-hidden rounded-3xl border border-theme-border"
          style={{ backgroundColor: "var(--block-bg)" }}
        >
          {alerts.map((alert, index) => {
            const avatarUrl = demoAvatar(alert.senderHandle);
            return (
              <li key={alert.id}>
                <button
                  type="button"
                  onClick={() => openAlert(alert.id)}
                  className={cn(
                    "flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-theme-hover",
                    index > 0 && "border-t border-theme-border",
                    !alert.read && "bg-[var(--accent-primary)]/[0.06]",
                  )}
                >
                  <div className="relative shrink-0">
                    <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-theme-border bg-theme-card-2 text-sm text-theme-text">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span aria-hidden>{getAvatarFallback(alert.senderName)}</span>
                      )}
                    </div>
                    {!alert.read ? (
                      <span
                        className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[var(--accent-primary)] ring-2 ring-[var(--block-bg)]"
                        aria-hidden
                      />
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-theme-text">
                        {alert.senderName}
                      </p>
                      <span className="shrink-0 text-[11px] text-theme-text-2">
                        {formatAlertTime(alert.createdAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.06em] text-emerald-500/90">
                      {alert.title}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm leading-snug text-theme-text-2">
                      {alert.body}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div
          className="rounded-3xl border border-theme-border px-6 py-16 text-center text-sm text-theme-text-2"
          style={{ backgroundColor: "var(--block-bg)" }}
        >
          Пока нет уведомлений
        </div>
      )}
    </div>
  );
}
