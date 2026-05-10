import { normalizeHashtagKey } from "@/lib/hashtags";
import { usePostCommentsRouteStore } from "@/stores/post-comments-route-store";
import { create } from "zustand";

export type AppMainScreen =
  | "profile"
  | "search"
  | "hashtag-feed"
  | "feed"
  | "messages"
  | "alerts";

type ParsedRoute =
  | { screen: Exclude<AppMainScreen, "hashtag-feed"> }
  | { screen: "hashtag-feed"; hashtag: string };

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
  applyRouteFromLocation: () => void;
  /** Лента + `?post=` (модалка комментариев), например из «Открыть пост» в ЛС. */
  navigateToFeedWithPostComments: (postSeq: number) => void;
};

function screenToPath(screen: Exclude<AppMainScreen, "hashtag-feed">): string {
  switch (screen) {
    case "profile":
      return "/profile";
    case "search":
      return "/search";
    case "feed":
      return "/feed";
    case "messages":
      return "/messages";
    case "alerts":
      return "/alerts";
    default:
      return "/profile";
  }
}

function parseRoute(pathname: string): ParsedRoute {
  const normalized = pathname.replace(/\/+$/u, "") || "/";
  const parts = normalized.split("/").filter(Boolean);

  if (parts[0] === "hashtag" && parts[1]) {
    return { screen: "hashtag-feed", hashtag: decodeURIComponent(parts[1]) };
  }
  if (parts[0] === "search") {
    return { screen: "search" };
  }
  if (parts[0] === "feed") {
    return { screen: "feed" };
  }
  if (parts[0] === "messages") {
    return { screen: "messages" };
  }
  if (parts[0] === "alerts") {
    return { screen: "alerts" };
  }
  return { screen: "profile" };
}

function pushPath(pathname: string, replace = false) {
  if (typeof window === "undefined") {
    return;
  }
  const url = new URL(window.location.href);
  url.pathname = pathname;
  url.searchParams.delete("post");
  const search = url.searchParams.toString();
  const next = `${pathname}${search ? `?${search}` : ""}${url.hash}`;
  const cur =
    window.location.pathname + window.location.search + window.location.hash;
  if (cur === next) {
    return;
  }
  if (replace) {
    window.history.replaceState(null, "", next);
  } else {
    window.history.pushState(null, "", next);
  }
  usePostCommentsRouteStore.getState().syncFromLocation();
}

export const useAppNavStore = create<AppNavState>((set, get) => ({
  screen: "profile",
  activeHashtagKey: null,
  activeHashtagDisplay: null,
  hashtagBackTarget: null,

  setScreen: (screen) => {
    if (screen === "hashtag-feed") {
      return;
    }
    pushPath(screenToPath(screen));
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
    pushPath(`/hashtag/${encodeURIComponent(key)}`);
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
    pushPath(screenToPath(target));
    set({
      screen: target,
      activeHashtagKey: null,
      activeHashtagDisplay: null,
      hashtagBackTarget: null,
    });
  },

  applyRouteFromLocation: () => {
    if (typeof window === "undefined") {
      return;
    }
    const route = parseRoute(window.location.pathname);

    if (route.screen === "hashtag-feed") {
      const key = normalizeHashtagKey(route.hashtag);
      set((s) => ({
        screen: "hashtag-feed",
        activeHashtagKey: key,
        activeHashtagDisplay: route.hashtag,
        hashtagBackTarget:
          s.screen === "hashtag-feed"
            ? (s.hashtagBackTarget ?? "search")
            : s.screen,
      }));
      return;
    }

    set({
      screen: route.screen,
      activeHashtagKey: null,
      activeHashtagDisplay: null,
      hashtagBackTarget: null,
    });
  },

  navigateToFeedWithPostComments: (postSeq) => {
    if (typeof window === "undefined") {
      return;
    }
    const qs = new URLSearchParams();
    qs.set("post", String(postSeq));
    const hash = window.location.hash ?? "";
    const next = `/feed?${qs.toString()}${hash}`;
    window.history.pushState(null, "", next);
    set({
      screen: "feed",
      activeHashtagKey: null,
      activeHashtagDisplay: null,
      hashtagBackTarget: null,
    });
    usePostCommentsRouteStore.getState().syncFromLocation();
  },
}));
