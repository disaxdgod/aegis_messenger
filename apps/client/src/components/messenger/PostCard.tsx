import { CommentDrawer } from "@/components/messenger/CommentDrawer";
import { MessengerConfirmModal } from "@/components/messenger/MessengerConfirmModal";
import { IconMessages } from "@/components/messenger/nav-icons";
import { MarkdownEmojiText } from "@/components/messenger/MarkdownEmojiText";
import { TextFormatSelectionModal } from "@/components/messenger/TextFormatSelectionModal";
import { cn } from "@/lib/utils";
import type { SelectionSnapshot } from "@/lib/markdown-selection";
import type { PostEntity } from "@/stores/posts-store";
import { usePostsStore } from "@/stores/posts-store";
import { useAppNavStore } from "@/stores/app-nav-store";
import { useCommentsStore } from "@/stores/comments-store";
import { useProfileStore } from "@/stores/profile-store";
import { useEffect, useRef, useState } from "react";

function formatPostTime(ts: number) {
  const d = new Date(ts);
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60_000) {
    return "только что";
  }
  if (diff < 3600_000) {
    return `${Math.floor(diff / 60_000)} мин.`;
  }
  if (diff < 86400_000) {
    return `${Math.floor(diff / 3600_000)} ч.`;
  }
  return d.toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtCount(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return String(n);
}

/* ————— SVG-иконки ————— */
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

function IconRepost({ className }: { className?: string }) {
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
      <path d="M17 1l4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="M7 23l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

function IconEye({ className }: { className?: string }) {
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
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconDots({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </svg>
  );
}

type PostEditModalProps = {
  open: boolean;
  post: PostEntity;
  onClose: () => void;
};

function PostEditModal({ open, post, onClose }: PostEditModalProps) {
  const updatePost = usePostsStore((s) => s.updatePost);
  const [draft, setDraft] = useState(post.text);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [fmtOpen, setFmtOpen] = useState(false);
  const [fmtSnap, setFmtSnap] = useState<SelectionSnapshot | null>(null);
  const fmtTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(post.text);
    } else {
      setFmtOpen(false);
      setFmtSnap(null);
    }
  }, [open, post.id, post.text]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") {
        return;
      }
      if (fmtOpen) {
        setFmtOpen(false);
        setFmtSnap(null);
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, fmtOpen]);

  useEffect(() => {
    return () => {
      if (fmtTimerRef.current) {
        clearTimeout(fmtTimerRef.current);
      }
    };
  }, []);

  function scheduleFormatOpen() {
    if (fmtTimerRef.current) {
      clearTimeout(fmtTimerRef.current);
    }
    fmtTimerRef.current = setTimeout(() => {
      fmtTimerRef.current = null;
      const ta = editTextareaRef.current;
      if (!ta) {
        return;
      }
      const s = ta.selectionStart;
      const e = ta.selectionEnd;
      if (s < e) {
        setFmtSnap({ start: s, end: e });
        setFmtOpen(true);
      }
    }, 220);
  }

  if (!open) {
    return null;
  }

  function save() {
    updatePost(post.id, { text: draft.trim() });
    onClose();
  }

  return (
    <>
      <TextFormatSelectionModal
        open={fmtOpen}
        snapshot={fmtSnap}
        text={draft}
        textareaRef={editTextareaRef}
        onApply={(next) => {
          setDraft(next);
        }}
        onClose={() => {
          setFmtOpen(false);
          setFmtSnap(null);
        }}
      />
      <div
        className="fixed inset-0 z-[140] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-edit-title"
        onClick={onClose}
      >
        <div
          className="w-full max-w-[480px] rounded-2xl border border-white/[0.08] bg-[#1e1e1e] p-5 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h2
            id="post-edit-title"
            className="text-lg font-semibold tracking-tight text-white"
          >
            Редактировать пост
          </h2>
          <p className="mt-1 text-xs text-neutral-500">
            Выделите фрагмент текста — откроется форматирование (Markdown).
          </p>
          <label
            htmlFor={`post-edit-${post.id}`}
            className="mt-4 block text-sm text-neutral-400"
          >
            Текст
          </label>
          <textarea
            ref={editTextareaRef}
            id={`post-edit-${post.id}`}
            rows={5}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onMouseUp={scheduleFormatOpen}
            onSelect={scheduleFormatOpen}
            className="mt-1.5 w-full resize-y rounded-xl border border-white/10 bg-[#151515] px-3 py-2.5 text-[15px] text-white outline-none placeholder:text-neutral-600 focus-visible:border-white/20"
            placeholder="Текст поста…"
          />
          {(post.media.length > 0 || post.poll) ? (
            <p className="mt-2 text-xs text-neutral-500">
              Вложения и опрос при редактировании не меняются.
            </p>
          ) : null}
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-neutral-300 hover:bg-white/5"
              onClick={onClose}
            >
              Отмена
            </button>
            <button
              type="button"
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-neutral-200"
              onClick={save}
            >
              Сохранить
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

type PostCardProps = {
  post: PostEntity;
};

export function PostCard({ post }: PostCardProps) {
  const avatarObjectUrl = useProfileStore((s) => s.avatarObjectUrl);
  const firstName = useProfileStore((s) => s.firstName);
  const lastName = useProfileStore((s) => s.lastName);
  const toggleLike = usePostsStore((s) => s.toggleLike);
  const incrementViews = usePostsStore((s) => s.incrementViews);
  const removePost = usePostsStore((s) => s.removePost);
  const openHashtagFeed = useAppNavStore((s) => s.openHashtagFeed);

  const commentCount = useCommentsStore(
    (s) => s.comments.filter((c) => c.postId === post.id).length,
  );

  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    function onDocMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  function showToast(msg: string) {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setActionToast(msg);
    toastTimerRef.current = setTimeout(() => {
      setActionToast(null);
      toastTimerRef.current = null;
    }, 2800);
  }

  function handleDelete() {
    setDeleteConfirmOpen(true);
    setMenuOpen(false);
  }

  function confirmDeletePost() {
    removePost(post.id);
  }

  function handleReport() {
    showToast("Жалоба отправлена. Спасибо, что помогаете сообществу.");
    setMenuOpen(false);
  }

  function openEdit() {
    setEditOpen(true);
    setMenuOpen(false);
  }

  const viewedRef = useRef(false);
  useEffect(() => {
    if (!viewedRef.current) {
      viewedRef.current = true;
      incrementViews(post.id);
    }
  }, [post.id, incrementViews]);

  const displayName =
    [firstName.trim(), lastName.trim()].filter(Boolean).join(" ") ||
    "Диса Бендер";

  const { likes, reposts, views, liked } = post.stats;

  return (
    <article
      className="relative rounded-2xl border border-white/[0.06] bg-[#242424] p-4 sm:p-5"
    >
      <PostEditModal
        open={editOpen}
        post={post}
        onClose={() => setEditOpen(false)}
      />

      <CommentDrawer
        open={commentsOpen}
        postId={post.id}
        onClose={() => setCommentsOpen(false)}
      />

      <MessengerConfirmModal
        open={deleteConfirmOpen}
        title="Удалить пост?"
        description="Пост будет удалён без возможности восстановления."
        confirmLabel="Удалить"
        cancelLabel="Отмена"
        variant="danger"
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDeletePost}
      />

      {actionToast ? (
        <div
          className="pointer-events-none absolute bottom-3 left-1/2 z-[80] max-w-[min(100%,280px)] -translate-x-1/2 rounded-full border border-white/10 bg-[#2a2a2a] px-4 py-2 text-center text-xs text-neutral-200 shadow-lg"
          role="status"
        >
          {actionToast}
        </div>
      ) : null}

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/[0.06] bg-[#1a1a1a] text-lg text-neutral-200">
            {avatarObjectUrl ? (
              <img
                src={avatarObjectUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span aria-hidden>💀</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold leading-snug text-white">
              {displayName}
            </p>
            <p className="text-xs text-neutral-500">
              <span>{formatPostTime(post.createdAt)}</span>
              {post.editedAt != null ? (
                <span className="ml-1.5 text-neutral-600">· ред.</span>
              ) : null}
            </p>
          </div>
        </div>
        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            className={cn(
              "mt-0.5 rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-white/[0.06] hover:text-neutral-300",
              menuOpen && "bg-white/[0.06] text-neutral-300",
            )}
            aria-label="Действия с постом"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <IconDots className="h-4 w-4" />
          </button>
          {menuOpen ? (
            <div
              className="absolute right-0 top-full z-[70] mt-1 min-w-[220px] overflow-hidden rounded-xl border border-white/[0.1] bg-[#1a1a1a] py-1 shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
              role="menu"
              aria-orientation="vertical"
            >
              <button
                type="button"
                role="menuitem"
                className="flex w-full px-4 py-2.5 text-left text-sm text-white transition-colors hover:bg-white/[0.06]"
                onClick={openEdit}
              >
                Редактировать пост
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full px-4 py-2.5 text-left text-sm text-red-400 transition-colors hover:bg-red-500/10"
                onClick={handleDelete}
              >
                Удалить пост
              </button>
              <div className="my-0.5 h-px bg-white/[0.06]" aria-hidden />
              <button
                type="button"
                role="menuitem"
                className="flex w-full px-4 py-2.5 text-left text-sm text-neutral-300 transition-colors hover:bg-white/[0.06]"
                onClick={handleReport}
              >
                Пожаловаться
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Body */}
      <div className="mt-3 space-y-3">
        {post.text ? (
          <p className="text-[15px] leading-relaxed text-white">
            <MarkdownEmojiText
              text={post.text}
              onHashtagClick={(key) => openHashtagFeed(key)}
            />
          </p>
        ) : null}

        {post.media.length > 0 ? (
          <div
            className={cn(
              "grid gap-2",
              post.media.length === 1 ? "grid-cols-1" : "grid-cols-2",
            )}
          >
            {post.media.map((m) =>
              m.kind === "video" ? (
                <video
                  key={m.id}
                  src={m.url}
                  controls
                  className="max-h-[min(70vh,420px)] w-full rounded-xl border border-white/[0.06] bg-black object-contain"
                />
              ) : (
                <img
                  key={m.id}
                  src={m.url}
                  alt=""
                  className="max-h-[min(70vh,420px)] w-full rounded-xl border border-white/[0.06] object-contain"
                />
              ),
            )}
          </div>
        ) : null}

        {post.poll ? (
          <div className="rounded-xl border border-white/[0.08] bg-[#1a1a1a] p-4">
            <p className="font-medium text-white">
                <MarkdownEmojiText text={post.poll.question} />
            </p>
            <ul className="mt-3 space-y-2">
              {post.poll.options.map((opt, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-neutral-200"
                >
                    <MarkdownEmojiText text={opt} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {/* Footer — счётчики */}
      <div className="mt-4 flex items-center justify-between border-t border-white/[0.05] pt-3">
        <div className="flex items-center gap-4">
          {/* Лайк */}
          <button
            type="button"
            onClick={() => toggleLike(post.id)}
            className={cn(
              "group flex items-center gap-1.5 text-sm transition-colors",
              liked
                ? "text-rose-400"
                : "text-neutral-500 hover:text-rose-400",
            )}
            aria-label={liked ? "Убрать лайк" : "Поставить лайк"}
            aria-pressed={liked}
          >
            <IconHeart
              filled={liked}
              className={cn(
                "h-[18px] w-[18px] transition-transform active:scale-90",
                liked && "fill-rose-400 stroke-rose-400",
              )}
            />
            <span>{fmtCount(likes)}</span>
          </button>

          {/* Комментарии */}
          <button
            type="button"
            className="flex items-center gap-1.5 text-sm text-neutral-500 transition-colors hover:text-neutral-300"
            aria-label="Комментарии"
            onClick={() => setCommentsOpen(true)}
          >
            <IconMessages className="h-[18px] w-[18px]" />
            <span>{fmtCount(commentCount)}</span>
          </button>

          {/* Репост */}
          <button
            type="button"
            className="flex items-center gap-1.5 text-sm text-neutral-500 transition-colors hover:text-neutral-300"
            aria-label="Репост"
          >
            <IconRepost className="h-[18px] w-[18px]" />
            <span>{fmtCount(reposts)}</span>
          </button>
        </div>

        {/* Просмотры */}
        <div
          className="flex items-center gap-1.5 text-sm text-neutral-600"
          aria-label={`${views} просмотров`}
        >
          <IconEye className="h-[18px] w-[18px]" />
          <span>{fmtCount(views)}</span>
        </div>
      </div>
    </article>
  );
}
