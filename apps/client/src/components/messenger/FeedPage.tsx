import { PostCard } from "@/components/messenger/PostCard";
import { PostComposer } from "@/components/messenger/PostComposer";
import { cn } from "@/lib/utils";
import { usePostsStore } from "@/stores/posts-store";
import { useState } from "react";

const SURFACE = "#272727";
const CARD = "#1e1e1e";
const TAB_TRACK = "#222222";
const TAB_ACTIVE = "#333333";

type FeedTab = "foryou" | "subscriptions";

export function FeedPage() {
  const posts = usePostsStore((s) => s.posts);
  const [feedTab, setFeedTab] = useState<FeedTab>("foryou");

  const showPosts = feedTab === "foryou" ? posts : [];
  const emptySubscriptions =
    feedTab === "subscriptions" && showPosts.length === 0;

  return (
    <div className="font-sans text-white">
      <h1 className="mb-4 text-2xl font-bold tracking-tight">Лента</h1>

      <div
        className="mb-5 flex rounded-full border border-white/[0.06] p-1 sm:mb-6"
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
              ? "text-white"
              : "text-neutral-500 hover:text-neutral-300",
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
              ? "text-white"
              : "text-neutral-500 hover:text-neutral-300",
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
        className="rounded-3xl border border-white/[0.06] p-5 sm:p-6"
        style={{ backgroundColor: CARD }}
      >
        <PostComposer
          className="rounded-2xl p-4 sm:p-5"
          style={{ backgroundColor: SURFACE }}
        />
        {showPosts.length > 0 ? (
          <div className="mt-6 flex flex-col gap-4">
            {showPosts.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        ) : (
          <div className="mt-8 py-12 text-center text-sm text-neutral-500">
            {emptySubscriptions
              ? "Пока нет постов от подписок"
              : "Нет постов"}
          </div>
        )}
      </section>
    </div>
  );
}
