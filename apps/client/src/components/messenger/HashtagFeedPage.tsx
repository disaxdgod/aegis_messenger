import { PostCard } from "@/components/messenger/PostCard";
import { postMatchesHashtag } from "@/lib/hashtags";
import { useAppNavStore } from "@/stores/app-nav-store";
import { usePostsStore } from "@/stores/posts-store";
import { useMemo } from "react";

export function HashtagFeedPage() {
  const posts = usePostsStore((s) => s.posts);
  const key = useAppNavStore((s) => s.activeHashtagKey);
  const display = useAppNavStore((s) => s.activeHashtagDisplay);
  const closeHashtagFeed = useAppNavStore((s) => s.closeHashtagFeed);

  const filtered = useMemo(() => {
    if (!key) {
      return [];
    }
    return posts.filter((p) => postMatchesHashtag(p.text, key));
  }, [posts, key]);

  const title = display ? `#${display}` : key ? `#${key}` : "#…";

  return (
    <div className="font-sans text-theme-text">
      <button
        type="button"
        onClick={closeHashtagFeed}
        className="mb-4 flex items-center gap-1.5 text-sm font-medium text-theme-text-2 transition-[color,transform] duration-150 hover:text-theme-text active:scale-95"
      >
        <svg
          viewBox="0 0 24 24"
          width={18}
          height={18}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        Назад
      </button>

      <h1 className="mb-6 text-2xl font-bold tracking-tight text-theme-accent">
        {title}
      </h1>

      {filtered.length > 0 ? (
        <div className="flex flex-col gap-4">
          {filtered.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      ) : (
        <div
          className="rounded-3xl border border-theme-border px-6 py-16 text-center text-sm text-theme-text-2"
          style={{ backgroundColor: "var(--block-bg)" }}
        >
          Пока нет постов с этим хештегом
        </div>
      )}
    </div>
  );
}
