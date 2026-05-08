import {
  IconBell,
  IconFeed,
  IconMessages,
  IconSearch,
  IconUser,
} from "@/components/messenger/nav-icons";
import { cn } from "@/lib/utils";
import {
  useAppNavStore,
  type AppMainScreen,
} from "@/stores/app-nav-store";
import { type ReactNode } from "react";

const TABS = [
  { id: "feed", label: "Лента" },
  { id: "search", label: "Поиск" },
  { id: "messages", label: "Чаты" },
  { id: "alerts", label: "Уведомления" },
  { id: "profile", label: "Профиль" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function tabIcon(id: TabId): ReactNode {
  const cls = "itd-mnav-icon shrink-0";
  switch (id) {
    case "feed":
      return <IconFeed className={cls} width={24} height={24} />;
    case "search":
      return <IconSearch className={cls} width={24} height={24} />;
    case "alerts":
      return <IconBell className={cls} width={24} height={24} />;
    case "messages":
      return <IconMessages className={cls} width={24} height={24} />;
    case "profile":
      return <IconUser className={cls} width={24} height={24} />;
    default:
      return null;
  }
}

/** Демо-счётчик уведомлений (позже — из стора). */
const ALERT_COUNT = 0;

function screenToTab(screen: AppMainScreen): TabId {
  switch (screen) {
    case "search":
    case "hashtag-feed":
      return "search";
    case "feed":
      return "feed";
    case "messages":
      return "messages";
    case "alerts":
      return "alerts";
    case "profile":
    default:
      return "profile";
  }
}

export function MobileNav() {
  const screen = useAppNavStore((s) => s.screen);
  const setScreen = useAppNavStore((s) => s.setScreen);
  const active = screenToTab(screen);

  return (
    <div
      className="itd-mnav-root hidden max-lg:flex flex-col"
      aria-label="Мобильная навигация"
    >
      <div className="itd-mnav-bar">
        <div className="itd-mnav-track">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={cn(
                "itd-mnav-tab",
                active === tab.id && "itd-mnav-tab--active",
              )}
              onClick={() => {
                switch (tab.id) {
                  case "profile":
                    setScreen("profile");
                    break;
                  case "search":
                    setScreen("search");
                    break;
                  case "feed":
                    setScreen("feed");
                    break;
                  case "alerts":
                    setScreen("alerts");
                    break;
                  case "messages":
                    setScreen("messages");
                    break;
                  default:
                    break;
                }
              }}
              aria-current={active === tab.id ? "page" : undefined}
            >
              <span className="itd-mnav-event-inner">
                {tabIcon(tab.id)}
                {tab.id === "alerts" && ALERT_COUNT > 0 ? (
                  <span className="itd-mnav-badge">
                    {ALERT_COUNT > 99 ? "99+" : ALERT_COUNT}
                  </span>
                ) : null}
              </span>
              <span className="itd-mnav-tab-label">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
