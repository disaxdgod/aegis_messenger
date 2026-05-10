import {
  IconBell,
  IconFeed,
  IconLogout,
  IconMessages,
  IconSearch,
  IconUser,
} from "@/components/messenger/nav-icons";
import { IconDesignMoon, IconDesignSun } from "@/components/messenger/design-theme-icons";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import { useAppNavStore } from "@/stores/app-nav-store";
import { useSessionStore } from "@/stores/session-store";

const navItem =
  "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-[15px] font-medium text-theme-text-2 touch-manipulation " +
  "transition-all duration-150 hover:bg-theme-hover hover:text-theme-text active:scale-[0.97] active:bg-theme-active";

export function MessengerSidebar() {
  const signOut = useSessionStore((s) => s.signOut);
  const screen = useAppNavStore((s) => s.screen);
  const setScreen = useAppNavStore((s) => s.setScreen);
  const { isDark, toggle: toggleTheme } = useTheme();

  const profileActive = screen === "profile";
  const feedActive = screen === "feed";
  const searchActive = screen === "search" || screen === "hashtag-feed";
  const messagesActive = screen === "messages";
  const alertsActive = screen === "alerts";

  return (
    <aside
      className={cn(
        "flex w-64 shrink-0 flex-col p-6",
        "min-h-[calc(100dvh-5.5rem)] max-h-[calc(100dvh-5.5rem)]",
      )}
      aria-label="Основное меню"
    >
      <div className="mb-8 shrink-0">
        <span className="text-lg font-bold tracking-tight text-theme-text">Aegis</span>
        <span className="ml-1.5 text-sm font-normal text-theme-text-2">v0.1.1</span>
      </div>

      <nav className="flex shrink-0 flex-col gap-2" aria-label="Разделы">
        {([
          { screen: "profile", active: profileActive, Icon: IconUser, label: "Профиль" },
          { screen: "feed", active: feedActive, Icon: IconFeed, label: "Лента" },
          { screen: "search", active: searchActive, Icon: IconSearch, label: "Поиск" },
          { screen: "messages", active: messagesActive, Icon: IconMessages, label: "Сообщения" },
          { screen: "alerts", active: alertsActive, Icon: IconBell, label: "Уведомления" },
        ] as const).map(({ screen: s, active, Icon, label }) => (
          <button
            key={s}
            type="button"
            onClick={() => setScreen(s)}
            className={cn(
              navItem,
              active
                ? "rounded-full bg-theme-card text-theme-text shadow-inner shadow-black/20 hover:bg-theme-card-2 hover:text-theme-text"
                : "",
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="shrink-0 transition-transform duration-150 group-active:scale-90" />
            {label}
          </button>
        ))}
      </nav>

      <div className="mt-auto flex shrink-0 flex-col gap-2 border-t border-theme-border pt-6">
        <button
          type="button"
          className={navItem}
          onClick={toggleTheme}
          aria-label={isDark ? "Переключить на светлую тему" : "Переключить на тёмную тему"}
        >
          {isDark ? (
            <>
              <IconDesignSun />
              Светлая тема
            </>
          ) : (
            <>
              <IconDesignMoon />
              Тёмная тема
            </>
          )}
        </button>
        <button
          type="button"
          className={cn(navItem, "hover:text-red-400 active:text-red-400")}
          onClick={signOut}
        >
          <IconLogout />
          Выйти
        </button>
      </div>
    </aside>
  );
}
