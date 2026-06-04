import {
  DEMO_EMPLOYEES,
  demoEmployeeDisplayName,
} from "@/data/demo-seed";
import { authorSubscriptionKey } from "@/lib/author-subscription-key";
import { syncMutualDmAfterSubscriptionChange } from "@/lib/mutual-dm-sync";
import { create } from "zustand";

export { authorSubscriptionKey } from "@/lib/author-subscription-key";

/** С кем уже взаимная подписка при старте демо (остальные — только подписчики). */
const DEMO_INITIAL_MUTUAL_FOLLOWS = ["german_h", "a_sokolova", "e_kuznetsova"] as const;

function buildInitialSubscriptions(): Record<string, true> {
  const byUsername = Object.fromEntries(
    DEMO_EMPLOYEES.map((e) => [e.username, e]),
  );
  const entries: [string, true][] = [];
  for (const username of DEMO_INITIAL_MUTUAL_FOLLOWS) {
    const employee = byUsername[username];
    if (!employee) {
      continue;
    }
    entries.push([authorSubscriptionKey(demoEmployeeDisplayName(employee)), true]);
  }
  return Object.fromEntries(entries);
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
    subscribedKeys: buildInitialSubscriptions(),
    subscribe: (authorName) => {
      const k = authorSubscriptionKey(authorName);
      if (!k) return;
      set((s) => ({
        subscribedKeys: { ...s.subscribedKeys, [k]: true },
      }));
      syncMutualDmAfterSubscriptionChange(authorName);
    },
    unsubscribe: (authorName) => {
      const k = authorSubscriptionKey(authorName);
      set((s) => {
        const { [k]: _, ...rest } = s.subscribedKeys;
        return { subscribedKeys: rest };
      });
      syncMutualDmAfterSubscriptionChange(authorName);
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
