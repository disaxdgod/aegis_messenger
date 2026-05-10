import { CommentDrawer } from "@/components/messenger/CommentDrawer";
import { MessengerConfirmModal } from "@/components/messenger/MessengerConfirmModal";
import { PostImagePreview } from "@/components/messenger/PostImagePreview";
import { PostMediaCarousel } from "@/components/messenger/PostMediaCarousel";
import {
  RepostToDirectModal,
  type RepostForwardPayload,
  type RepostPollPreview,
} from "@/components/messenger/RepostToDirectModal";
import { SuccessToast } from "@/components/messenger/SuccessToast";
import { IconMessages, IconRepost } from "@/components/messenger/nav-icons";
import { MarkdownEmojiText } from "@/components/messenger/MarkdownEmojiText";
import { TextFormatSelectionModal } from "@/components/messenger/TextFormatSelectionModal";
import { cn } from "@/lib/utils";
import type { SelectionSnapshot } from "@/lib/markdown-selection";
import type { PostEntity, PostMediaItem } from "@/stores/posts-store";
import { useDmInboxStore } from "@/stores/dm-inbox-store";
import { usePostsStore } from "@/stores/posts-store";
import { useAppNavStore } from "@/stores/app-nav-store";
import { useCommentsStore } from "@/stores/comments-store";
import { usePostCommentsRouteStore } from "@/stores/post-comments-route-store";
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

function formatPeopleCount(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return `${n} человек`;
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${n} человека`;
  }
  return `${n} человек`;
}

function formatVotedLabel(n: number): string {
  return n === 1
    ? `Проголосовал ${formatPeopleCount(n)}`
    : `Проголосовало ${formatPeopleCount(n)}`;
}

function formatRemainingPollTime(endsAt: number): string {
  const remainingMs = endsAt - Date.now();
  if (remainingMs <= 0) {
    return "0 минут";
  }
  const totalMinutes = Math.ceil(remainingMs / 60_000);
  const totalHours = Math.ceil(remainingMs / 3_600_000);
  const totalDays = Math.ceil(remainingMs / 86_400_000);

  if (totalMinutes <= 60) {
    return `${totalMinutes} минут`;
  }
  if (totalHours <= 24) {
    return `${totalHours} часов`;
  }
  return `${totalDays} дн.`;
}

function getAvatarFallback(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return "?";
  }
  return trimmed[0]?.toUpperCase() ?? "?";
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
          className="w-full max-w-[480px] rounded-2xl border border-theme-border bg-theme-card p-5 shadow-2xl"
          style={{ animation: "aegis-modal-in 0.22s cubic-bezier(0.22,1,0.36,1)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <h2
            id="post-edit-title"
            className="text-lg font-semibold tracking-tight text-theme-text"
          >
            Редактировать пост
          </h2>
          <p className="mt-1 text-xs text-theme-text-2">
            Выделите фрагмент текста — откроется форматирование (Markdown).
          </p>
          <label
            htmlFor={`post-edit-${post.id}`}
            className="mt-4 block text-sm text-theme-text-2"
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
            className="mt-1.5 w-full resize-y rounded-xl border border-theme-border bg-theme-bg px-3 py-2.5 text-[15px] text-theme-text outline-none placeholder:text-theme-text-2 focus-visible:border-theme-border"
            placeholder="Текст поста…"
          />
          {(post.media.length > 0 || post.poll) ? (
            <p className="mt-2 text-xs text-theme-text-2">
              Вложения и опрос при редактировании не меняются.
            </p>
          ) : null}
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-full border border-theme-border px-4 py-2 text-sm font-medium text-theme-text-2 transition-all duration-150 hover:bg-theme-hover active:scale-95 active:bg-theme-active"
              onClick={onClose}
            >
              Отмена
            </button>
            <button
              type="button"
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition-all duration-150 hover:bg-neutral-200 active:scale-95 active:bg-neutral-300"
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

/** Заполняем ширину поста; вертикаль обрезается по max-height без боковых полос. */
const FEED_MEDIA_MAX_H = "max-h-[min(92vh,720px)]";
const feedImageClass = cn(
  FEED_MEDIA_MAX_H,
  "block w-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.01]",
);

function MediaAttachmentsBlock({
  media,
  onImageClick,
}: {
  media: PostMediaItem[];
  onImageClick: (url: string) => void;
}) {
  const photos = media.filter((m) => m.kind === "image");
  const videos = media.filter((m) => m.kind === "video");

  if (photos.length >= 2) {
    return (
      <div className="space-y-2">
        <PostMediaCarousel items={photos} onImageClick={onImageClick} />
        {videos.length > 0 ? (
          <div
            className={cn(
              "grid gap-2",
              videos.length === 1 ? "grid-cols-1" : "grid-cols-2",
            )}
          >
            {videos.map((m) => (
              <div
                key={m.id}
                className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-black"
              >
                <video
                  src={m.url}
                  controls
                  className={`block w-full ${FEED_MEDIA_MAX_H} object-cover object-center`}
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid gap-2",
        media.length === 1 ? "grid-cols-1" : "grid-cols-2",
      )}
    >
      {media.map((m) =>
        m.kind === "video" ? (
          <div
            key={m.id}
            className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-black"
          >
            <video
              src={m.url}
              controls
              className={`block w-full ${FEED_MEDIA_MAX_H} object-cover object-center`}
            />
          </div>
        ) : (
          <button
            key={m.id}
            type="button"
            className="group relative block w-full overflow-hidden rounded-xl border border-white/[0.06] transition-all duration-200 hover:border-white/[0.12] hover:brightness-105 active:scale-[0.99] active:brightness-95"
            aria-label="Открыть изображение"
            onClick={() => onImageClick(m.url)}
          >
            <img src={m.url} alt="" className={feedImageClass} />
          </button>
        ),
      )}
    </div>
  );
}

function pollPreviewFromPost(poll: NonNullable<PostEntity["poll"]>): RepostPollPreview {
  return {
    question: poll.question,
    optionTexts: poll.options.map((o) => o.text),
  };
}

function buildRepostForwardPayload(
  post: PostEntity,
  authorLine: string,
): RepostForwardPayload {
  const pollPreview = post.poll ? pollPreviewFromPost(post.poll) : undefined;
  const rawText = post.text.trim();
  if (rawText.length > 0) {
    return {
      postId: post.id,
      authorLine,
      summaryLine: rawText.length > 140 ? `${rawText.slice(0, 140)}…` : rawText,
      bodyLine: rawText.length > 480 ? `${rawText.slice(0, 480)}…` : rawText,
      pollPreview,
    };
  }
  if (post.poll) {
    return {
      postId: post.id,
      authorLine,
      summaryLine: "",
      bodyLine: "",
      pollPreview,
    };
  }
  if (post.media.length > 0) {
    return {
      postId: post.id,
      authorLine,
      summaryLine: "",
      bodyLine: "",
    };
  }
  return {
    postId: post.id,
    authorLine,
    summaryLine: "Запись без текста",
    bodyLine: "Пустая запись.",
    pollPreview,
  };
}

type PostCardProps = {
  post: PostEntity;
};

export function PostCard({ post }: PostCardProps) {
  const avatarObjectUrl = useProfileStore((s) => s.avatarObjectUrl);
  const firstName = useProfileStore((s) => s.firstName);
  const lastName = useProfileStore((s) => s.lastName);
  const username = useProfileStore((s) => s.username);
  const toggleLike = usePostsStore((s) => s.toggleLike);
  const incrementReposts = usePostsStore((s) => s.incrementReposts);
  const incrementViews = usePostsStore((s) => s.incrementViews);
  const removePost = usePostsStore((s) => s.removePost);
  const voteInPoll = usePostsStore((s) => s.voteInPoll);
  const openHashtagFeed = useAppNavStore((s) => s.openHashtagFeed);
  const setScreen = useAppNavStore((s) => s.setScreen);

  const commentCount = useCommentsStore(
    (s) => s.comments.filter((c) => c.postId === post.id).length,
  );

  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const postQueryValue = usePostCommentsRouteStore((s) => s.postQueryValue);
  const pushPostQuery = usePostCommentsRouteStore((s) => s.pushPostQuery);
  const closePostQuery = usePostCommentsRouteStore((s) => s.closePostQuery);
  const commentsOpen =
    postQueryValue !== null &&
    (postQueryValue === String(post.seq) || postQueryValue === post.id);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [votersListOpen, setVotersListOpen] = useState(false);
  const [selectedPollOptionId, setSelectedPollOptionId] = useState<string | null>(null);
  const [votersSearch, setVotersSearch] = useState("");
  const [imagePreview, setImagePreview] = useState<{
    urls: string[];
    index: number;
  } | null>(null);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [repostModalOpen, setRepostModalOpen] = useState(false);
  const [repostPayload, setRepostPayload] = useState<RepostForwardPayload | null>(
    null,
  );
  const menuRef = useRef<HTMLDivElement>(null);

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
    if (!votersListOpen) {
      setSelectedPollOptionId(null);
      setVotersSearch("");
    }
  }, [votersListOpen]);

  function handleDelete() {
    setDeleteConfirmOpen(true);
    setMenuOpen(false);
  }

  function confirmDeletePost() {
    removePost(post.id);
  }

  function handleReport() {
    setActionToast("Жалоба отправлена");
    setMenuOpen(false);
  }

  function openEdit() {
    setEditOpen(true);
    setMenuOpen(false);
  }

  function openImagePreview(url: string) {
    const urls = post.media.filter((m) => m.kind === "image").map((m) => m.url);
    const idx = urls.indexOf(url);
    setImagePreview({
      urls,
      index: idx >= 0 ? idx : 0,
    });
  }

  function handleRepostSendToDirect(chatId: string, comment: string) {
    if (!repostPayload) {
      return;
    }
    useDmInboxStore.getState().forwardFeedPostToChat(chatId, {
      comment,
      authorLine: repostPayload.authorLine,
      summaryLine: repostPayload.summaryLine,
      bodyLine: repostPayload.bodyLine,
      postId: repostPayload.postId,
      postCreatedAt: post.createdAt,
      pollPreview: repostPayload.pollPreview,
      mediaUrls: post.media
        .filter((m) => m.kind === "image")
        .slice(0, 4)
        .map((m) => m.url),
    });
    incrementReposts(post.id);
    const peerName =
      useDmInboxStore.getState().chats.find((c) => c.id === chatId)?.name ?? "";
    setActionToast(peerName ? `Отправлено · ${peerName}` : "Отправлено");
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
  const voterId = username.trim().toLowerCase() || displayName.toLowerCase();
  const pollEnabledSettings = post.poll
    ? [
        post.poll.anonymous ? "Анонимный опрос" : null,
        !post.poll.allowVoteCancel ? "переголосовать нельзя" : null,
      ].filter((setting): setting is string => setting !== null)
    : [];
  const allPollVotes = post.poll
    ? post.poll.options.flatMap((option) => option.votes)
    : [];
  const uniquePollVoters = Array.from(
    new Map(allPollVotes.map((vote) => [vote.voterId, vote])).values(),
  );
  const visiblePollVoters = uniquePollVoters.slice(0, 4);
  const pollVotesByOption = post.poll
    ? post.poll.options.map((option) => ({
        id: option.id,
        text: option.text,
        votes: option.votes,
        previewVotes: option.votes.slice(0, 4),
      }))
    : [];
  const selectedPollOption =
    pollVotesByOption.find((option) => option.id === selectedPollOptionId) ?? null;
  const filteredSelectedVotes = selectedPollOption
    ? selectedPollOption.votes.filter((vote) => {
        const q = votersSearch.trim().toLowerCase();
        if (!q) {
          return true;
        }
        return (
          vote.name.toLowerCase().includes(q) ||
          vote.username.toLowerCase().includes(q)
        );
      })
    : [];
  const hasVotedByCurrentUser = uniquePollVoters.some(
    (vote) => vote.voterId === voterId,
  );
  const pollHintText = post.poll
    ? post.poll.endsAt !== null && Date.now() > post.poll.endsAt
      ? "Опрос закрыт, голоса больше не принимаются."
      : post.poll.allowMultiple
        ? null
        : hasVotedByCurrentUser
          ? null
          : "Нажмите по варианту, чтобы проголосовать."
    : null;

  const { likes, reposts, views, liked } = post.stats;

  return (
    <article
      className="relative rounded-2xl border border-theme-border bg-theme-card p-4 sm:p-5"
    >
      <PostEditModal
        open={editOpen}
        post={post}
        onClose={() => setEditOpen(false)}
      />

      <CommentDrawer
        open={commentsOpen}
        postId={post.id}
        post={post}
        postAuthorName={displayName}
        postAuthorAvatar={avatarObjectUrl}
        onClose={closePostQuery}
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
      {post.poll && !post.poll.anonymous && votersListOpen ? (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`poll-voters-title-${post.id}`}
          onClick={() => setVotersListOpen(false)}
        >
          <div
            className="w-full max-w-[520px] rounded-2xl border border-theme-border bg-theme-card p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p
              id={`poll-voters-title-${post.id}`}
              className="text-base font-semibold text-theme-text"
            >
              {selectedPollOption ? "Кто выбрал вариант" : "Кто проголосовал"}
            </p>
            <p className="mt-1 text-xs text-theme-text-2">
              {formatVotedLabel(uniquePollVoters.length)}
            </p>
            {selectedPollOption ? (
              <>
                <div className="mt-3 rounded-lg border border-theme-border bg-theme-hover p-2.5">
                  <p className="text-sm text-theme-text">
                    <MarkdownEmojiText text={selectedPollOption.text} />
                  </p>
                  <input
                    type="text"
                    value={votersSearch}
                    onChange={(e) => setVotersSearch(e.target.value)}
                    placeholder="Поиск по имени или @username"
                    className="mt-2 w-full rounded-lg border border-theme-border bg-theme-card px-3 py-2 text-sm text-theme-text outline-none placeholder:text-theme-text-2 focus-visible:border-theme-border"
                  />
                </div>
                <ul className="mt-3 max-h-[300px] space-y-1.5 overflow-auto pr-1">
                  {filteredSelectedVotes.map((vote) => (
                    <li key={vote.voterId}>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-lg border border-theme-border bg-theme-hover px-2.5 py-2 text-left hover:bg-theme-active"
                        onClick={() => {
                          setVotersListOpen(false);
                          setSelectedPollOptionId(null);
                          setVotersSearch("");
                          setScreen("profile");
                        }}
                      >
                        <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-theme-border bg-theme-card-2 text-xs text-theme-text">
                          {vote.avatarUrl ? (
                            <img
                              src={vote.avatarUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span aria-hidden>{getAvatarFallback(vote.name)}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm text-theme-text">{vote.name}</p>
                          {vote.username ? (
                            <p className="truncate text-xs text-theme-text-2">@{vote.username}</p>
                          ) : null}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
                {filteredSelectedVotes.length === 0 ? (
                  <p className="mt-3 text-xs text-theme-text-2">Ничего не найдено</p>
                ) : null}
              </>
            ) : (
              <ul className="mt-3 max-h-[340px] space-y-2 overflow-auto pr-1">
                {pollVotesByOption.map((option) => (
                  <li key={option.id}>
                    <button
                      type="button"
                      className="w-full rounded-lg border border-theme-border bg-theme-hover p-2.5 text-left hover:bg-theme-active"
                      onClick={() => {
                        setSelectedPollOptionId(option.id);
                        setVotersSearch("");
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="min-w-0 truncate text-sm text-theme-text">
                          <MarkdownEmojiText text={option.text} />
                        </p>
                        <span className="shrink-0 text-xs text-theme-text-2">
                          {option.votes.length}
                        </span>
                      </div>
                      {option.previewVotes.length > 0 ? (
                        <div className="mt-2 flex items-center gap-1.5">
                          {option.previewVotes.map((vote) => (
                            <button
                              key={vote.voterId}
                              type="button"
                              className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-theme-border bg-theme-card-2 text-xs text-theme-text"
                              onClick={(e) => {
                                e.stopPropagation();
                                setVotersListOpen(false);
                                setSelectedPollOptionId(null);
                                setVotersSearch("");
                                setScreen("profile");
                              }}
                            >
                              {vote.avatarUrl ? (
                                <img
                                  src={vote.avatarUrl}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span aria-hidden>{getAvatarFallback(vote.name)}</span>
                              )}
                            </button>
                          ))}
                          {option.votes.length > option.previewVotes.length ? (
                            <span className="text-xs text-theme-text-2">
                              +{option.votes.length - option.previewVotes.length}
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-theme-text-2">Нет голосов</p>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex items-center justify-end gap-2">
              {selectedPollOption ? (
                <button
                  type="button"
                  className="rounded-full border border-theme-border px-4 py-1.5 text-sm text-theme-text-2 transition-all duration-150 hover:bg-theme-hover active:scale-95 active:bg-theme-active"
                  onClick={() => {
                    setSelectedPollOptionId(null);
                    setVotersSearch("");
                  }}
                >
                  ← Назад
                </button>
              ) : null}
              <button
                type="button"
                className="rounded-full border border-theme-border px-4 py-1.5 text-sm text-theme-text-2 transition-all duration-150 hover:bg-theme-hover active:scale-95 active:bg-theme-active"
                onClick={() => setVotersListOpen(false)}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {imagePreview ? (
        <PostImagePreview
          urls={imagePreview.urls}
          initialIndex={imagePreview.index}
          onClose={() => setImagePreview(null)}
        />
      ) : null}

      <SuccessToast
        message={actionToast}
        onDismiss={() => setActionToast(null)}
      />

      <RepostToDirectModal
        open={repostModalOpen}
        payload={repostPayload}
        onClose={() => {
          setRepostModalOpen(false);
          setRepostPayload(null);
        }}
        onConfirmSend={handleRepostSendToDirect}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-theme-border bg-theme-card text-lg text-theme-text transition-transform duration-200 hover:scale-105 active:scale-95">
            {avatarObjectUrl ? (
              <img
                src={avatarObjectUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span aria-hidden>{getAvatarFallback(displayName)}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold leading-snug text-theme-text">
              {displayName}
            </p>
            <p className="text-xs text-theme-text-2">
              <span>{formatPostTime(post.createdAt)}</span>
              {post.editedAt != null ? (
                <span className="ml-1.5 text-theme-text-2">· ред.</span>
              ) : null}
            </p>
          </div>
        </div>
        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            className={cn(
              "mt-0.5 rounded-lg p-1.5 text-theme-text-2 transition-all duration-150 hover:bg-theme-hover hover:text-theme-text active:scale-90 active:bg-theme-active",
              menuOpen && "bg-theme-hover text-theme-text",
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
              className="absolute right-0 top-full z-[70] mt-1 min-w-[220px] overflow-hidden rounded-xl border border-theme-border bg-theme-card py-1 shadow-[0_12px_40px_rgba(0,0,0,0.3)]"
              role="menu"
              aria-orientation="vertical"
              style={{ animation: "aegis-menu-in 0.15s cubic-bezier(0.22,1,0.36,1)" }}
            >
              <button
                type="button"
                role="menuitem"
                className="flex w-full px-4 py-2.5 text-left text-sm text-theme-text transition-all duration-150 hover:bg-theme-hover active:bg-theme-active active:scale-[0.98]"
                onClick={openEdit}
              >
                Редактировать пост
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full px-4 py-2.5 text-left text-sm text-red-500 transition-all duration-150 hover:bg-red-500/10 active:bg-red-500/15 active:scale-[0.98]"
                onClick={handleDelete}
              >
                Удалить пост
              </button>
              <div className="my-0.5 h-px bg-theme-border" aria-hidden />
              <button
                type="button"
                role="menuitem"
                className="flex w-full px-4 py-2.5 text-left text-sm text-theme-text-2 transition-all duration-150 hover:bg-theme-hover active:bg-theme-active active:scale-[0.98]"
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
          <p className="text-[15px] leading-relaxed text-theme-text">
            <MarkdownEmojiText
              text={post.text}
              onHashtagClick={(key) => openHashtagFeed(key)}
            />
          </p>
        ) : null}

        {post.media.length > 0 ? (
          <MediaAttachmentsBlock
            media={post.media}
            onImageClick={(url) => openImagePreview(url)}
          />
        ) : null}

        {post.poll ? (
          <div className="rounded-xl border border-theme-border bg-theme-card p-4">
            <p className="font-medium text-theme-text">
              <MarkdownEmojiText text={post.poll.question} />
            </p>
            {pollEnabledSettings.length > 0 ? (
              <p className="mt-1 text-xs text-theme-text-2">
                {pollEnabledSettings.join(" · ")}
              </p>
            ) : null}
            {post.poll.endsAt ? (
              <p className="mt-1 text-xs text-theme-text-2">
                {Date.now() > post.poll.endsAt
                  ? "Голосование завершено"
                  : `Осталось: ${formatRemainingPollTime(post.poll.endsAt)}`}
              </p>
            ) : null}
            <ul className="mt-3 space-y-2">
              {post.poll.options.map((opt) => {
                const totalVotes = post.poll
                  ? post.poll.options.reduce((acc, x) => acc + x.votes.length, 0)
                  : 0;
                const percent =
                  totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
                const votedByMe = opt.votes.some((v) => v.voterId === voterId);
                const pollEndsAt = post.poll?.endsAt ?? null;
                const pollEnded = pollEndsAt !== null && Date.now() > pollEndsAt;
                return (
                  <li key={opt.id}>
                    <button
                      type="button"
                      disabled={pollEnded}
                      className={cn(
                        "w-full overflow-hidden rounded-lg border border-theme-border text-left transition-colors disabled:cursor-not-allowed disabled:opacity-80",
                        votedByMe
                          ? "bg-[var(--accent-primary)]/15"
                          : "bg-theme-hover hover:bg-theme-active",
                      )}
                      onClick={() =>
                        voteInPoll(post.id, opt.id, {
                          voterId,
                          name: displayName,
                          username,
                          avatarUrl: avatarObjectUrl ?? null,
                        })
                      }
                    >
                      <div className="relative px-3 py-2">
                        <div
                          className="pointer-events-none absolute inset-y-0 left-0 bg-[var(--accent-primary)]/22"
                          style={{ width: `${percent}%` }}
                          aria-hidden
                        />
                        <div className="relative flex items-center justify-between gap-3 text-sm text-theme-text">
                          <MarkdownEmojiText text={opt.text} />
                          <span className="shrink-0 text-xs text-theme-text-2">
                            {percent}% · {opt.votes.length}
                          </span>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
            {!post.poll.anonymous && uniquePollVoters.length > 0 ? (
              <button
                type="button"
                className="mt-3 flex items-center gap-2 px-1"
                onClick={() => setVotersListOpen(true)}
              >
                <div className="flex items-center">
                  {visiblePollVoters.map((vote, index) => (
                    <div
                      key={vote.voterId}
                      className={cn(
                        "flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-theme-border bg-theme-card-2 text-xs text-theme-text",
                        index > 0 && "-ml-5",
                      )}
                    >
                      {vote.avatarUrl ? (
                        <img
                          src={vote.avatarUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span aria-hidden>{getAvatarFallback(vote.name)}</span>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-theme-text-2">
                  {formatVotedLabel(uniquePollVoters.length)}
                </p>
              </button>
            ) : null}
            {pollHintText ? (
              <p className="mt-3 text-xs text-theme-text-2">{pollHintText}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Footer — счётчики */}
      <div className="mt-4 flex items-center justify-between border-t border-theme-border pt-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => toggleLike(post.id)}
            className={cn(
              "group flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm transition-all duration-150 touch-manipulation",
              "active:scale-90",
              liked
                ? "text-rose-400 hover:bg-rose-500/10"
                : "text-theme-text-2 hover:bg-theme-hover hover:text-rose-400",
            )}
            aria-label={liked ? "Убрать лайк" : "Поставить лайк"}
            aria-pressed={liked}
          >
            <IconHeart
              filled={liked}
              className={cn(
                "h-[18px] w-[18px] shrink-0",
                liked
                  ? "fill-rose-400 stroke-rose-400 aegis-heart-liked"
                  : "transition-transform group-active:scale-75",
              )}
            />
            <span className="tabular-nums">{fmtCount(likes)}</span>
          </button>

          <button
            type="button"
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm text-theme-text-2 transition-all duration-150 touch-manipulation",
              "hover:bg-theme-hover hover:text-theme-text active:scale-90 active:bg-theme-active",
            )}
            aria-label="Комментарии"
            onClick={() => pushPostQuery(String(post.seq))}
          >
            <IconMessages className="h-[18px] w-[18px] transition-transform group-active:scale-75" />
            <span className="tabular-nums">{fmtCount(commentCount)}</span>
          </button>

          <button
            type="button"
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm text-theme-text-2 transition-all duration-150 touch-manipulation",
              "hover:bg-theme-hover hover:text-[var(--accent-repost)] active:scale-90 active:bg-theme-active",
            )}
            aria-label="Репост"
            onClick={() => {
              setRepostPayload(buildRepostForwardPayload(post, displayName));
              setRepostModalOpen(true);
            }}
          >
            <IconRepost className="h-[18px] w-[18px]" />
            <span className="tabular-nums">{fmtCount(reposts)}</span>
          </button>
        </div>

        <div
          className="flex shrink-0 items-center gap-1.5 text-sm text-theme-text-2"
          aria-label={`${views} просмотров`}
        >
          <IconEye className="h-[18px] w-[18px] shrink-0" />
          <span className="tabular-nums">{fmtCount(views)}</span>
        </div>
      </div>
    </article>
  );
}
