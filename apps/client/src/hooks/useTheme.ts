import { useEffect, useState } from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "aegis-theme";
const THEME_EVENT = "aegis-theme-change";

/** Читает атрибут из DOM (уже установлен FOUC-скриптом или дефолтом HTML). */
function readDomTheme(): Theme {
  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "light" ? "light" : "dark";
}

/** Применяет тему к DOM и сохраняет в localStorage. */
function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(STORAGE_KEY, theme);

  // Обновляем meta theme-color для браузера/PWA
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) {
    meta.content = theme === "dark" ? "#121212" : "#f5f5f5";
  }

  // Оповещаем другие экземпляры хука на этой вкладке
  window.dispatchEvent(new CustomEvent<Theme>(THEME_EVENT, { detail: theme }));
}

/**
 * Хук управления темой.
 * — читает начальное значение из DOM (установлено FOUC-скриптом)
 * — синхронизируется между несколькими useTheme() на одной вкладке
 * — синхронизируется между вкладками через StorageEvent
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readDomTheme);

  useEffect(() => {
    // Синхронизация между useTheme()-инстансами на одной вкладке
    function onLocalChange(e: Event) {
      setTheme((e as CustomEvent<Theme>).detail);
    }

    // Синхронизация между вкладками браузера
    function onStorageChange(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return;
      const next = e.newValue === "light" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      setTheme(next);
    }

    window.addEventListener(THEME_EVENT, onLocalChange);
    window.addEventListener("storage", onStorageChange);
    return () => {
      window.removeEventListener(THEME_EVENT, onLocalChange);
      window.removeEventListener("storage", onStorageChange);
    };
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  }

  return { theme, toggle, isDark: theme === "dark" } as const;
}
