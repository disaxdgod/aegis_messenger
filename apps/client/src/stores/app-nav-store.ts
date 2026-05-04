import { normalizeHashtagKey } from "@/lib/hashtags";
import { create } from "zustand";

export type AppMainScreen =
  | "profile"
  | "search"
  | "hashtag-feed"
  | "feed"
  | "alerts";

type AppNavState = {
  screen: AppMainScreen;
  /** Ключ хештега в нижнем регистре, без `#`. */
  activeHashtagKey: string | null;
  /** Как показывать в заголовке (сохраняем регистр ввода / клика). */
  activeHashtagDisplay: string | null;
  /** Куда вернуться по «Назад» из ленты хештега. */
  hashtagBackTarget: AppMainScreen | null;
  setScreen: (screen: AppMainScreen) => void;
  openHashtagFeed: (rawTag: string, from?: AppMainScreen) => void;
  closeHashtagFeed: () => void;
};

export const useAppNavStore = create<AppNavState>((set, get) => ({
  screen: "profile",
  activeHashtagKey: null,
  activeHashtagDisplay: null,
  hashtagBackTarget: null,

  setScreen: (screen) => {
    if (screen === "hashtag-feed") {
      return;
    }
    set({
      screen,
      activeHashtagKey: null,
      activeHashtagDisplay: null,
      hashtagBackTarget: null,
    });
  },

  openHashtagFeed: (rawTag, from) => {
    const stripped = rawTag.trim().replace(/^#+/u, "");
    if (!stripped) {
      return;
    }
    const key = normalizeHashtagKey(stripped);
    const prev = from ?? get().screen;
    const back =
      prev === "hashtag-feed"
        ? (get().hashtagBackTarget ?? "search")
        : prev;
    set({
      screen: "hashtag-feed",
      activeHashtagKey: key,
      activeHashtagDisplay: stripped,
      hashtagBackTarget: back,
    });
  },

  closeHashtagFeed: () => {
    const target = get().hashtagBackTarget ?? "search";
    set({
      screen: target,
      activeHashtagKey: null,
      activeHashtagDisplay: null,
      hashtagBackTarget: null,
    });
  },
}));
