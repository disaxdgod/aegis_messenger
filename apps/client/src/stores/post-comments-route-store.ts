import { create } from "zustand";

function readPostIdFromSearch(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  const id = new URLSearchParams(window.location.search).get("post");
  const t = id?.trim();
  return t || null;
}

type PostCommentsRouteState = {
  /** Значение `?post=` (номер поста `1`, `2` или старый uuid). */
  postQueryValue: string | null;
  /** Открыли через pushState — закрытие через «Назад» по истории */
  commentsUrlWasPushed: boolean;
  syncFromLocation: () => void;
  pushPostQuery: (postQueryValue: string) => void;
  closePostQuery: () => void;
};

export const usePostCommentsRouteStore = create<PostCommentsRouteState>((set, get) => ({
  postQueryValue: null,
  commentsUrlWasPushed: false,

  syncFromLocation: () => {
    set({
      postQueryValue: readPostIdFromSearch(),
      commentsUrlWasPushed: false,
    });
  },

  pushPostQuery: (postQueryValue) => {
    if (typeof window === "undefined") {
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set("post", postQueryValue);
    const q = url.searchParams.toString();
    const next = `${url.pathname}?${q}${url.hash}`;
    window.history.pushState(null, "", next);
    set({ postQueryValue, commentsUrlWasPushed: true });
  },

  closePostQuery: () => {
    if (typeof window === "undefined") {
      return;
    }
    const { commentsUrlWasPushed } = get();
    if (commentsUrlWasPushed) {
      set({ commentsUrlWasPushed: false });
      window.history.back();
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("post");
    const q = url.searchParams.toString();
    const next = `${url.pathname}${q ? `?${q}` : ""}${url.hash}`;
    window.history.replaceState(null, "", next);
    set({ postQueryValue: null, commentsUrlWasPushed: false });
  },
}));
