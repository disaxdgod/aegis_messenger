import { PostCard } from "@/components/messenger/PostCard";
import { PostComposer } from "@/components/messenger/PostComposer";
import { cn } from "@/lib/utils";
import { authorSubscriptionKey } from "@/stores/author-subscriptions-store";
import { useAuthorSubscriptionsStore } from "@/stores/author-subscriptions-store";
import { usePostsStore } from "@/stores/posts-store";
import { useRef, useState } from "react";

const SURFACE = "var(--block-bg-secondary)";
const CARD = "var(--block-bg)";
const TAB_TRACK = "var(--bg-secondary)";
const TAB_ACTIVE = "var(--block-hover-bg)";

type FeedTab = "foryou" | "subscriptions";

export function FeedPage() {
  const posts = usePostsStore((s) => s.posts);
  const subscribedKeys = useAuthorSubscriptionsStore((s) => s.subscribedKeys);
  const [feedTab, setFeedTab] = useState<FeedTab>("foryou");

  const initialPostIds = useRef<Set<string> | null>(null);
  if (initialPostIds.current === null) {
    initialPostIds.current = new Set(posts.map((p) => p.id));
  }

  const showPosts =
    feedTab === "foryou"
      ? posts
      : posts.filter(
          (p) => subscribedKeys[authorSubscriptionKey(p.author.name)],
        );
  const emptySubscriptions =
    feedTab === "subscriptions" && showPosts.length === 0;

  return (
    <div className="font-sans text-theme-text">
      <h1 className="mb-4 text-2xl font-bold tracking-tight">Лента</h1>

      <div
        className="mb-5 flex rounded-full border border-theme-border p-1 sm:mb-6"
        style={{ backgroundColor: TAB_TRACK }}
        role="tablist"
        aria-label="Режим ленты"
      >
        <button
          type="button"
          role="tab"
          aria-selected={feedTab === "foryou"}
          onClick={() => setFeedTab("foryou")}
          className={cn(
            "flex-1 rounded-full py-2.5 text-sm font-medium transition-colors duration-200",
            feedTab === "foryou"
              ? "text-theme-text"
              : "text-theme-text-2 hover:text-theme-text",
          )}
          style={
            feedTab === "foryou"
              ? { backgroundColor: TAB_ACTIVE }
              : undefined
          }
        >
          Для вас
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={feedTab === "subscriptions"}
          onClick={() => setFeedTab("subscriptions")}
          className={cn(
            "flex-1 rounded-full py-2.5 text-sm font-medium transition-colors duration-200",
            feedTab === "subscriptions"
              ? "text-theme-text"
              : "text-theme-text-2 hover:text-theme-text",
          )}
          style={
            feedTab === "subscriptions"
              ? { backgroundColor: TAB_ACTIVE }
              : undefined
          }
        >
          Подписки
        </button>
      </div>

      <section
        className="rounded-3xl border border-theme-border p-5 sm:p-6"
        style={{ backgroundColor: CARD }}
      >
        <PostComposer
          className="rounded-2xl p-4 sm:p-5"
          style={{ backgroundColor: SURFACE }}
        />
        {showPosts.length > 0 ? (
          <div className="mt-6 flex flex-col gap-4">
            {showPosts.map((p) => (
              <div
                key={p.id}
                style={
                  !initialPostIds.current!.has(p.id)
                    ? { animation: "aegis-post-in 0.30s cubic-bezier(0.25, 1, 0.5, 1)" }
                    : undefined
                }
              >
                <PostCard post={p} />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-8 py-12 text-center text-sm text-theme-text-2">
            {emptySubscriptions
              ? "Пока нет постов от подписок"
              : "Нет постов"}
          </div>
        )}
      </section>
    </div>
  );
}
