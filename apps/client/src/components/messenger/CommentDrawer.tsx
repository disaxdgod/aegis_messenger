import { cn } from "@/lib/utils";
import { useCommentsStore } from "@/stores/comments-store";
import { useProfileStore } from "@/stores/profile-store";
import { useEffect, useMemo, useRef, useState } from "react";
import { MarkdownEmojiText } from "@/components/messenger/MarkdownEmojiText";

/* ───────── helpers ───────── */

function formatTime(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "только что";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} мин.`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} ч.`;
  return new Date(ts).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ───────── icons ───────── */

function IconHeart({ filled, className }: { filled?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function IconPaperclip({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function IconMic({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function IconChevronDown({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function IconClose({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/* ───────── UserAvatar ───────── */

function UserAvatar({
  src,
  name,
  size = 32,
}: {
  src: string | null;
  name: string;
  size?: number;
}) {
  const initials = name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="shrink-0 overflow-hidden rounded-full bg-[#1a1a1a] border border-white/[0.07] flex items-center justify-center text-xs font-semibold text-neutral-300"
      style={{ width: size, height: size }}
    >
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden>{initials || "?"}</span>
      )}
    </div>
  );
}

/* ───────── single comment row ───────── */

type CommentRowProps = {
  id: string;
  postId: string;
  parentId: string | null;
  text: string;
  createdAt: number;
  authorName: string;
  authorAvatar: string | null;
  likes: number;
  liked: boolean;
  isReply?: boolean;
  currentUserName: string;
  currentUserAvatar: string | null;
  onReplyTarget: (id: string, name: string) => void;
  replies: CommentRowProps[];
};

function CommentRow({
  id,
  text,
  createdAt,
  authorName,
  authorAvatar,
  likes,
  liked,
  isReply = false,
  currentUserName,
  currentUserAvatar,
  onReplyTarget,
  replies,
}: CommentRowProps) {
  const toggleLike = useCommentsStore((s) => s.toggleLike);

  return (
    <div className={cn("flex gap-2.5", isReply && "pl-10 mt-1")}>
      {isReply && (
        <div className="absolute left-10 w-px self-stretch bg-white/[0.07]" />
      )}
      <UserAvatar src={authorAvatar} name={authorName} size={isReply ? 28 : 34} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-[13px] font-semibold text-white leading-none">
            {authorName}
          </span>
          <span className="text-[11px] text-neutral-600 leading-none">
            {formatTime(createdAt)}
          </span>
        </div>
        <p className="mt-1 text-[13px] leading-snug text-neutral-200 whitespace-pre-wrap break-words">
          <MarkdownEmojiText text={text} />
        </p>
        <div className="mt-1.5 flex items-center gap-4">
          <button
            type="button"
            className="text-[12px] text-neutral-500 hover:text-neutral-300 transition-colors"
            onClick={() => onReplyTarget(id, authorName)}
          >
            Ответить
          </button>
          <button
            type="button"
            onClick={() => toggleLike(id)}
            className={cn(
              "flex items-center gap-1 text-[12px] transition-colors",
              liked
                ? "text-rose-400"
                : "text-neutral-500 hover:text-rose-400",
            )}
            aria-label={liked ? "Убрать лайк" : "Поставить лайк"}
          >
            <IconHeart
              filled={liked}
              className={cn("h-[13px] w-[13px]", liked && "fill-rose-400 stroke-rose-400")}
            />
            <span>{likes}</span>
          </button>
        </div>

        {/* nested replies */}
        {replies.length > 0 && (
          <div className="mt-2 space-y-3 relative border-l border-white/[0.07] pl-3">
            {replies.map((r) => (
              <CommentRow
                key={r.id}
                {...r}
                isReply
                currentUserName={currentUserName}
                currentUserAvatar={currentUserAvatar}
                onReplyTarget={onReplyTarget}
                replies={[]}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────── sort types ───────── */

type SortMode = "popular" | "new";

const SORT_LABELS: Record<SortMode, string> = {
  popular: "Популярные",
  new: "Новые",
};

/* ───────── main drawer ───────── */

type CommentDrawerProps = {
  open: boolean;
  postId: string;
  onClose: () => void;
};

export function CommentDrawer({ open, postId, onClose }: CommentDrawerProps) {
  const avatarObjectUrl = useProfileStore((s) => s.avatarObjectUrl);
  const firstName = useProfileStore((s) => s.firstName);
  const lastName = useProfileStore((s) => s.lastName);
  const addComment = useCommentsStore((s) => s.addComment);
  /** Нельзя `.filter()` прямо в селекторе — каждый вызов новый массив → бесконечный цикл useSyncExternalStore. */
  const comments = useCommentsStore((s) => s.comments);
  const allComments = useMemo(
    () => comments.filter((c) => c.postId === postId),
    [comments, postId],
  );

  const [sort, setSort] = useState<SortMode>("popular");
  const [sortOpen, setSortOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [replyTarget, setReplyTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  const displayName =
    [firstName.trim(), lastName.trim()].filter(Boolean).join(" ") ||
    "Диса Бендер";

  /* close on Escape */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (sortOpen) {
          setSortOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, sortOpen]);

  /* close sort dropdown on outside click */
  useEffect(() => {
    if (!sortOpen) return;
    const onDown = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [sortOpen]);

  /* focus input when clicking reply */
  function handleReplyTarget(id: string, name: string) {
    setReplyTarget({ id, name });
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function clearReply() {
    setReplyTarget(null);
  }

  function submit() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    addComment({
      postId,
      parentId: replyTarget?.id ?? null,
      text: trimmed,
      authorName: displayName,
      authorAvatar: avatarObjectUrl,
    });
    setDraft("");
    setReplyTarget(null);
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }, 60);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  /* build tree: top-level comments + their replies */
  const roots = allComments.filter((c) => c.parentId === null);
  const replies = allComments.filter((c) => c.parentId !== null);

  const sortedRoots = [...roots].sort((a, b) => {
    if (sort === "popular") {
      const ad = replies.filter((r) => r.parentId === a.id).length + a.likes;
      const bd = replies.filter((r) => r.parentId === b.id).length + b.likes;
      return bd - ad;
    }
    return b.createdAt - a.createdAt;
  });

  const totalCount = allComments.length;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col bg-[#1a1a1a]"
      role="dialog"
      aria-modal="true"
      aria-label="Комментарии"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3 shrink-0">
        <p className="text-[15px] font-semibold text-white">
          Комментарии
          {totalCount > 0 && (
            <span className="ml-1.5 text-sm font-normal text-neutral-500">
              {totalCount}
            </span>
          )}
        </p>
        <button
          type="button"
          className="rounded-full p-1.5 text-neutral-400 hover:bg-white/[0.07] hover:text-white transition-colors"
          onClick={onClose}
          aria-label="Закрыть"
        >
          <IconClose className="h-5 w-5" />
        </button>
      </div>

      {/* Sort bar */}
      <div className="flex items-center border-b border-white/[0.05] px-4 py-2 shrink-0">
        <div ref={sortRef} className="relative">
          <button
            type="button"
            onClick={() => setSortOpen((o) => !o)}
            className="flex items-center gap-1 text-[13px] font-medium text-neutral-300 hover:text-white transition-colors"
          >
            {SORT_LABELS[sort]}
            <IconChevronDown className="h-3.5 w-3.5 text-neutral-500" />
          </button>
          {sortOpen && (
            <div className="absolute left-0 top-full z-10 mt-1 min-w-[140px] overflow-hidden rounded-xl border border-white/[0.1] bg-[#252525] py-1 shadow-xl">
              {(["popular", "new"] as SortMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  className={cn(
                    "flex w-full px-4 py-2.5 text-left text-sm transition-colors",
                    sort === m
                      ? "text-white"
                      : "text-neutral-400 hover:bg-white/[0.06] hover:text-white",
                  )}
                  onClick={() => {
                    setSort(m);
                    setSortOpen(false);
                  }}
                >
                  {SORT_LABELS[m]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Comment list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <p className="text-neutral-500 text-sm">Комментариев пока нет</p>
            <p className="text-neutral-600 text-xs mt-1">
              Будьте первым, кто оставит комментарий
            </p>
          </div>
        ) : (
          sortedRoots.map((root) => {
            const rootReplies = replies
              .filter((r) => r.parentId === root.id)
              .sort((a, b) => a.createdAt - b.createdAt)
              .map((r) => ({
                ...r,
                isReply: true,
                currentUserName: displayName,
                currentUserAvatar: avatarObjectUrl,
                onReplyTarget: handleReplyTarget,
                replies: [],
              }));

            return (
              <CommentRow
                key={root.id}
                {...root}
                currentUserName={displayName}
                currentUserAvatar={avatarObjectUrl}
                onReplyTarget={handleReplyTarget}
                replies={rootReplies}
              />
            );
          })
        )}
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-white/[0.07] bg-[#1a1a1a] pb-[env(safe-area-inset-bottom,0px)]">
        {replyTarget && (
          <div className="flex items-center gap-2 border-b border-white/[0.05] px-4 py-1.5">
            <span className="text-[12px] text-neutral-500">
              Ответ для{" "}
              <span className="text-neutral-300 font-medium">
                {replyTarget.name}
              </span>
            </span>
            <button
              type="button"
              className="ml-auto text-neutral-600 hover:text-neutral-300 transition-colors"
              onClick={clearReply}
              aria-label="Отменить ответ"
            >
              <IconClose className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2 px-3 py-2.5">
          <UserAvatar src={avatarObjectUrl} name={displayName} size={32} />
          <button
            type="button"
            className="text-neutral-500 hover:text-neutral-300 transition-colors p-1"
            aria-label="Прикрепить файл"
          >
            <IconPaperclip className="h-5 w-5" />
          </button>
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Написать комментарий..."
            className="flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-neutral-500"
          />
          {draft.trim() ? (
            <button
              type="button"
              onClick={submit}
              className="shrink-0 rounded-full bg-white px-3.5 py-1.5 text-[13px] font-semibold text-black hover:bg-neutral-200 transition-colors"
            >
              Отправить
            </button>
          ) : (
            <button
              type="button"
              className="text-neutral-500 hover:text-neutral-300 transition-colors p-1"
              aria-label="Голосовое сообщение"
            >
              <IconMic className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
