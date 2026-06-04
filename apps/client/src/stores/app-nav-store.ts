import { normalizeHashtagKey } from "@/lib/hashtags";
import {
  normalizeProfileUsername,
  resolveProfileUsername,
} from "@/lib/profile-directory";
import { usePostCommentsRouteStore } from "@/stores/post-comments-route-store";
import { useProfileStore } from "@/stores/profile-store";
import { create } from "zustand";

export type AppMainScreen =
  | "profile"
  | "search"
  | "hashtag-feed"
  | "feed"
  | "messages"
  | "alerts";

type ParsedRoute = {
  screen: AppMainScreen;
  hashtag?: string;
  /** `null` — свой профиль (`/profile`); строка — чужой (`/profile/{username}`). */
  profileUsername?: string | null;
};

export type OpenProfileInput =
  | string
  | null
  | undefined
  | {
      username?: string | null;
      displayName?: string | null;
    };

type AppNavState = {
  screen: AppMainScreen;
  activeHashtagKey: string | null;
  activeHashtagDisplay: string | null;
  hashtagBackTarget: AppMainScreen | null;
  /** Чей профиль открыт; `null` — текущий пользователь. */
  profileViewUsername: string | null;
  setScreen: (screen: AppMainScreen) => void;
  openProfile: (input?: OpenProfileInput) => void;
  openHashtagFeed: (rawTag: string, from?: AppMainScreen) => void;
  closeHashtagFeed: () => void;
  applyRouteFromLocation: () => void;
  navigateToFeedWithPostComments: (postSeq: number) => void;
};

function profilePath(username: string | null): string {
  if (!username) {
    return "/profile";
  }
  return `/profile/${encodeURIComponent(username)}`;
}

function screenToPath(
  screen: Exclude<AppMainScreen, "hashtag-feed">,
  profileUsername: string | null = null,
): string {
  switch (screen) {
    case "profile":
      return profilePath(profileUsername);
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
    return {
      screen: "hashtag-feed",
      hashtag: decodeURIComponent(parts[1]),
    };
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
  if (parts[0] === "profile") {
    const rawUser = parts[1] ? decodeURIComponent(parts[1]) : null;
    return {
      screen: "profile",
      profileUsername: rawUser ? normalizeProfileUsername(rawUser) : null,
    };
  }
  return { screen: "profile", profileUsername: null };
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

function resolveOpenProfileTarget(input?: OpenProfileInput): string | null {
  if (input == null) {
    return null;
  }
  if (typeof input === "string") {
    return resolveProfileUsername({ username: input });
  }
  return resolveProfileUsername(input);
}

function isOwnProfileUsername(target: string | null): boolean {
  const self = normalizeProfileUsername(useProfileStore.getState().username);
  if (!target) {
    return true;
  }
  if (!self) {
    return false;
  }
  return target === self;
}

export const useAppNavStore = create<AppNavState>((set, get) => ({
  screen: "profile",
  activeHashtagKey: null,
  activeHashtagDisplay: null,
  hashtagBackTarget: null,
  profileViewUsername: null,

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
      profileViewUsername: null,
    });
  },

  openProfile: (input) => {
    const target = resolveOpenProfileTarget(input);
    const own = isOwnProfileUsername(target);
    const viewUsername = own ? null : target;
    pushPath(profilePath(viewUsername));
    set({
      screen: "profile",
      activeHashtagKey: null,
      activeHashtagDisplay: null,
      hashtagBackTarget: null,
      profileViewUsername: viewUsername,
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
      profileViewUsername: null,
    });
  },

  closeHashtagFeed: () => {
    const raw = get().hashtagBackTarget ?? "search";
    const pathScreen: Exclude<AppMainScreen, "hashtag-feed"> =
      raw === "hashtag-feed" ? "search" : raw;
    pushPath(screenToPath(pathScreen));
    set({
      screen: pathScreen,
      activeHashtagKey: null,
      activeHashtagDisplay: null,
      hashtagBackTarget: null,
      profileViewUsername: null,
    });
  },

  applyRouteFromLocation: () => {
    if (typeof window === "undefined") {
      return;
    }
    const route = parseRoute(window.location.pathname);

    if (route.screen === "hashtag-feed" && route.hashtag) {
      const key = normalizeHashtagKey(route.hashtag);
      set((s) => ({
        screen: "hashtag-feed",
        activeHashtagKey: key,
        activeHashtagDisplay: route.hashtag ?? null,
        hashtagBackTarget:
          s.screen === "hashtag-feed"
            ? (s.hashtagBackTarget ?? "search")
            : s.screen,
        profileViewUsername: null,
      }));
      return;
    }

    set({
      screen: route.screen,
      activeHashtagKey: null,
      activeHashtagDisplay: null,
      hashtagBackTarget: null,
      profileViewUsername:
        route.screen === "profile" ? (route.profileUsername ?? null) : null,
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
      profileViewUsername: null,
    });
    usePostCommentsRouteStore.getState().syncFromLocation();
  },
}));
