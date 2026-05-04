import {
  IconBell,
  IconEvent,
  IconFeed,
  IconSearch,
  IconUser,
} from "@/components/messenger/nav-icons";
import { cn } from "@/lib/utils";
import {
  useAppNavStore,
  type AppMainScreen,
} from "@/stores/app-nav-store";
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const TABS = [
  { id: "feed", label: "Лента" },
  { id: "search", label: "Поиск" },
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
  const trackRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [pill, setPill] = useState({ left: 0, width: 0, ready: false });

  const measure = useCallback(() => {
    const track = trackRef.current;
    const idx = TABS.findIndex((t) => t.id === active);
    const btn = tabRefs.current[idx];
    if (!track || !btn) {
      setPill((p) => ({ ...p, ready: false }));
      return;
    }
    const tr = track.getBoundingClientRect();
    const br = btn.getBoundingClientRect();
    setPill({
      left: br.left - tr.left,
      width: br.width,
      ready: true,
    });
  }, [active]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) {
      return;
    }
    const ro = new ResizeObserver(() => measure());
    ro.observe(track);
    return () => ro.disconnect();
  }, [measure]);

  return (
    <div
      className="itd-mnav-root hidden max-lg:flex flex-col"
      aria-label="Мобильная навигация"
    >
      <div className="itd-mnav-bar">
        <button type="button" className="itd-mnav-event" aria-label="Ивент">
          <span className="itd-mnav-event-inner">
            <IconEvent
              className="itd-mnav-icon itd-mnav-icon--glow text-[color:var(--accent-secondary)]"
              width={24}
              height={24}
            />
          </span>
        </button>

        <div ref={trackRef} className="itd-mnav-track">
          <div
            className={cn("itd-mnav-pill", !pill.ready && "itd-mnav-pill--hidden")}
            style={{
              left: pill.left,
              width: pill.width,
            }}
            aria-hidden
          />
          {TABS.map((tab, i) => (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
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
