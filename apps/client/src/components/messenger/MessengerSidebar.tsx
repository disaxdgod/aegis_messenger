import {
  IconBell,
  IconFeed,
  IconLogout,
  IconMessages,
  IconSearch,
  IconUser,
} from "@/components/messenger/nav-icons";
import { IconDesignMoon, IconDesignSun } from "@/components/messenger/design-theme-icons";
import { cn } from "@/lib/utils";
import { useAppNavStore } from "@/stores/app-nav-store";
import { useSessionStore } from "@/stores/session-store";
import { useState } from "react";

const navItem =
  "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-[15px] font-medium text-neutral-400 transition-colors hover:bg-white/[0.06] hover:text-white";

export function MessengerSidebar() {
  const signOut = useSessionStore((s) => s.signOut);
  const screen = useAppNavStore((s) => s.screen);
  const setScreen = useAppNavStore((s) => s.setScreen);
  /** Заглушка под будущий свитчер темы (иконки из design/). */
  const [colorMode, setColorMode] = useState<"dark" | "light">("dark");

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
        <span className="text-lg font-bold tracking-tight text-white">Aegis</span>
        <span className="ml-1.5 text-sm font-normal text-neutral-500">v0.1.1</span>
      </div>

      <nav className="flex shrink-0 flex-col gap-2" aria-label="Разделы">
        <button
          type="button"
          onClick={() => setScreen("profile")}
          className={cn(
            navItem,
            profileActive &&
              "rounded-full bg-[#272727] text-white shadow-inner shadow-black/20 hover:bg-[#2f2f2f] hover:text-white",
          )}
          aria-current={profileActive ? "page" : undefined}
        >
          <IconUser />
          Профиль
        </button>
        <button
          type="button"
          onClick={() => setScreen("feed")}
          className={cn(
            navItem,
            feedActive &&
              "rounded-full bg-[#272727] text-white shadow-inner shadow-black/20 hover:bg-[#2f2f2f] hover:text-white",
          )}
          aria-current={feedActive ? "page" : undefined}
        >
          <IconFeed />
          Лента
        </button>
        <button
          type="button"
          onClick={() => setScreen("search")}
          className={cn(
            navItem,
            searchActive &&
              "rounded-full bg-[#272727] text-white shadow-inner shadow-black/20 hover:bg-[#2f2f2f] hover:text-white",
          )}
          aria-current={searchActive ? "page" : undefined}
        >
          <IconSearch />
          Поиск
        </button>
        <button
          type="button"
          onClick={() => setScreen("messages")}
          className={cn(
            navItem,
            messagesActive &&
              "rounded-full bg-[#272727] text-white shadow-inner shadow-black/20 hover:bg-[#2f2f2f] hover:text-white",
          )}
          aria-current={messagesActive ? "page" : undefined}
        >
          <IconMessages />
          Сообщения
        </button>
        <button
          type="button"
          onClick={() => setScreen("alerts")}
          className={cn(
            navItem,
            alertsActive &&
              "rounded-full bg-[#272727] text-white shadow-inner shadow-black/20 hover:bg-[#2f2f2f] hover:text-white",
          )}
          aria-current={alertsActive ? "page" : undefined}
        >
          <IconBell />
          Уведомления
        </button>
      </nav>

      <div className="mt-auto flex shrink-0 flex-col gap-2 border-t border-white/[0.06] pt-6">
        <button
          type="button"
          className={navItem}
          onClick={() => setColorMode((m) => (m === "dark" ? "light" : "dark"))}
          aria-label={
            colorMode === "dark"
              ? "Переключить на светлую тему"
              : "Переключить на тёмную тему"
          }
        >
          {colorMode === "dark" ? (
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
        <button type="button" className={navItem} onClick={signOut}>
          <IconLogout />
          Выйти
        </button>
      </div>
    </aside>
  );
}
