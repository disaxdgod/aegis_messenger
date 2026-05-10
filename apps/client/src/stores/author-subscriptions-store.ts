import { create } from "zustand";

export function authorSubscriptionKey(name: string) {
  return name.trim().toLowerCase();
}

type AuthorSubscriptionsState = {
  /** Ключ — нормализованное имя автора (демо без id пользователя). */
  subscribedKeys: Record<string, true>;
  subscribe: (authorName: string) => void;
  unsubscribe: (authorName: string) => void;
  toggleSubscribe: (authorName: string) => void;
};

export const useAuthorSubscriptionsStore = create<AuthorSubscriptionsState>(
  (set, get) => ({
    subscribedKeys: {},
    subscribe: (authorName) => {
      const k = authorSubscriptionKey(authorName);
      if (!k) return;
      set((s) => ({
        subscribedKeys: { ...s.subscribedKeys, [k]: true },
      }));
    },
    unsubscribe: (authorName) => {
      const k = authorSubscriptionKey(authorName);
      set((s) => {
        const { [k]: _, ...rest } = s.subscribedKeys;
        return { subscribedKeys: rest };
      });
    },
    toggleSubscribe: (authorName) => {
      const k = authorSubscriptionKey(authorName);
      if (!k) return;
      if (get().subscribedKeys[k]) {
        get().unsubscribe(authorName);
      } else {
        get().subscribe(authorName);
      }
    },
  }),
);

export function useIsSubscribedToAuthor(authorName: string) {
  const k = authorSubscriptionKey(authorName);
  return useAuthorSubscriptionsStore((s) => !!s.subscribedKeys[k]);
}
