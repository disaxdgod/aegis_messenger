import { MarkdownEmojiText } from "@/components/messenger/MarkdownEmojiText";
import { IconRepost, IconSendPlane } from "@/components/messenger/nav-icons";
import { PostImagePreview } from "@/components/messenger/PostImagePreview";
import { cn } from "@/lib/utils";
import {
  authorSubscriptionKey,
  useAuthorSubscriptionsStore,
  useIsSubscribedToAuthor,
} from "@/stores/author-subscriptions-store";
import { useAppNavStore } from "@/stores/app-nav-store";
import { useCommentsStore } from "@/stores/comments-store";
import type { PostEntity } from "@/stores/posts-store";
import { usePostsStore } from "@/stores/posts-store";
import { useProfileStore } from "@/stores/profile-store";
import { useEffect, useMemo, useRef, useState } from "react";

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

function IconSmileOutline({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.65}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
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

function fmtCountPost(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return String(n);
}

function formatVkRelativeTime(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "только что";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} мин.`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} ч.`;
  const days = Math.floor(diff / 86400_000);
  if (days === 1) return "вчера";
  if (days < 7) return `${days} д назад`;
  return new Date(ts).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
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

/* ───────── Превью поста (как в ленте VK внутри модалки) ───────── */

function CommentModalPostPreview({
  post,
  authorName,
  authorAvatar,
  onClose,
  onImageClick,
}: {
  post: PostEntity;
  authorName: string;
  authorAvatar: string | null;
  onClose: () => void;
  onImageClick: (imageUrl: string) => void;
}) {
  const openHashtagFeed = useAppNavStore((s) => s.openHashtagFeed);
  const setScreen = useAppNavStore((s) => s.setScreen);
  const toggleLike = usePostsStore((s) => s.toggleLike);
  const voteInPoll = usePostsStore((s) => s.voteInPoll);
  const postLive = usePostsStore((s) => s.posts.find((p) => p.id === post.id));
  const effectivePost = postLive ?? post;
  const { likes, reposts, liked } = effectivePost.stats;

  const firstName = useProfileStore((s) => s.firstName);
  const lastName = useProfileStore((s) => s.lastName);
  const username = useProfileStore((s) => s.username);
  const avatarObjectUrl = useProfileStore((s) => s.avatarObjectUrl);
  const myDisplayName =
    [firstName.trim(), lastName.trim()].filter(Boolean).join(" ") ||
    "Диса Бендер";
  const voterId = username.trim().toLowerCase() || myDisplayName.toLowerCase();
  const isSelf =
    authorSubscriptionKey(authorName) === authorSubscriptionKey(myDisplayName);
  const isSubscribed = useIsSubscribedToAuthor(authorName);
  const toggleSubscribe = useAuthorSubscriptionsStore((s) => s.toggleSubscribe);

  const [votersListOpen, setVotersListOpen] = useState(false);
  const [selectedPollOptionId, setSelectedPollOptionId] = useState<string | null>(
    null,
  );
  const [votersSearch, setVotersSearch] = useState("");

  const pollEnabledSettings = effectivePost.poll
    ? [
        effectivePost.poll.anonymous ? "Анонимный опрос" : null,
        !effectivePost.poll.allowVoteCancel ? "переголосовать нельзя" : null,
      ].filter((setting): setting is string => setting !== null)
    : [];
  const allPollVotes = effectivePost.poll
    ? effectivePost.poll.options.flatMap((option) => option.votes)
    : [];
  const uniquePollVoters = Array.from(
    new Map(allPollVotes.map((vote) => [vote.voterId, vote])).values(),
  );
  const visiblePollVoters = uniquePollVoters.slice(0, 4);
  const pollVotesByOption = effectivePost.poll
    ? effectivePost.poll.options.map((option) => ({
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
  const pollHintText = effectivePost.poll
    ? effectivePost.poll.endsAt !== null && Date.now() > effectivePost.poll.endsAt
      ? "Опрос закрыт, голоса больше не принимаются."
      : effectivePost.poll.allowMultiple
        ? null
        : hasVotedByCurrentUser
          ? null
          : "Нажмите по варианту, чтобы проголосовать."
    : null;

  return (
    <div className="border-b border-theme-border bg-theme-card px-4 pb-4 pt-3">
      {effectivePost.poll && !effectivePost.poll.anonymous && votersListOpen ? (
        <div
          className="fixed inset-0 z-[160] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`comment-poll-voters-${effectivePost.id}`}
          onClick={() => setVotersListOpen(false)}
        >
          <div
            className="w-full max-w-[520px] rounded-2xl border border-theme-border bg-theme-card p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p
              id={`comment-poll-voters-${effectivePost.id}`}
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
                            <p className="truncate text-xs text-theme-text-2">
                              @{vote.username}
                            </p>
                          ) : null}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
                {filteredSelectedVotes.length === 0 ? (
                  <p className="mt-3 text-xs text-neutral-600">Ничего не найдено</p>
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
                        <p className="mt-2 text-xs text-neutral-600">Нет голосов</p>
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

      <div className="flex items-center gap-3">
        <UserAvatar src={authorAvatar} name={authorName} size={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold leading-snug text-[var(--link-color)]">
            {authorName}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!isSelf ? (
            <button
              type="button"
              onClick={() => toggleSubscribe(authorName)}
              className={cn(
                "rounded-xl border px-3 py-2 text-[13px] font-medium transition-[color,background-color,transform] duration-150 active:scale-[0.98]",
                isSubscribed
                  ? "border-theme-border bg-theme-card-2 text-theme-text hover:bg-theme-hover"
                  : "border-[var(--accent-primary)]/35 bg-[var(--accent-primary)]/12 text-[var(--accent-hover)] hover:bg-[var(--accent-primary)]/18",
              )}
            >
              {isSubscribed ? "Отписаться" : "Подписаться"}
            </button>
          ) : null}
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-xl text-theme-text-2 transition-[color,background-color,transform] duration-150 hover:bg-theme-hover hover:text-theme-text active:scale-90"
            onClick={onClose}
            aria-label="Закрыть"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </div>
      </div>

      {effectivePost.text.trim().length > 0 ? (
        <div className="mt-3 text-[15px] leading-relaxed text-[var(--text-primary)]">
          <MarkdownEmojiText
            text={effectivePost.text}
            onHashtagClick={(key) => openHashtagFeed(key)}
          />
        </div>
      ) : null}

      {effectivePost.media.length > 0 ? (
        <div
          className={cn(
            "mt-3 grid gap-1.5",
            effectivePost.media.length === 1 ? "grid-cols-1" : "grid-cols-2",
          )}
        >
          {effectivePost.media.map((m) =>
            m.kind === "video" ? (
              <div
                key={m.id}
                className="flex justify-center overflow-hidden rounded-xl border border-white/10 bg-black"
              >
                <video
                  src={m.url}
                  controls
                  className="max-h-[min(88vh,640px)] w-auto max-w-full object-contain"
                />
              </div>
            ) : (
              <button
                key={m.id}
                type="button"
                className="group flex w-full justify-center overflow-hidden rounded-xl border border-white/10 transition-all duration-200 hover:border-white/15 hover:brightness-105 active:scale-[0.99] active:brightness-95"
                aria-label="Открыть изображение"
                onClick={() => onImageClick(m.url)}
              >
                <img
                  src={m.url}
                  alt=""
                  className="max-h-[min(88vh,640px)] w-auto max-w-full object-contain transition-transform duration-300 group-hover:scale-[1.01]"
                />
              </button>
            ),
          )}
        </div>
      ) : null}

      {effectivePost.poll ? (
        <div className="mt-3 rounded-xl border border-theme-border bg-theme-card p-4">
          <p className="font-medium text-[var(--text-primary)]">
            <MarkdownEmojiText text={effectivePost.poll.question} />
          </p>
          {pollEnabledSettings.length > 0 ? (
            <p className="mt-1 text-xs text-theme-text-2">
              {pollEnabledSettings.join(" · ")}
            </p>
          ) : null}
          {effectivePost.poll.endsAt ? (
            <p className="mt-1 text-xs text-theme-text-2">
              {Date.now() > effectivePost.poll.endsAt
                ? "Голосование завершено"
                : `Осталось: ${formatRemainingPollTime(effectivePost.poll.endsAt)}`}
            </p>
          ) : null}
          <ul className="mt-3 space-y-2">
            {effectivePost.poll.options.map((opt) => {
              const totalVotes = effectivePost.poll
                ? effectivePost.poll.options.reduce((acc, x) => acc + x.votes.length, 0)
                : 0;
              const percent =
                totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
              const votedByMe = opt.votes.some((v) => v.voterId === voterId);
              const pollEndsAt = effectivePost.poll?.endsAt ?? null;
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
                      voteInPoll(effectivePost.id, opt.id, {
                        voterId,
                        name: myDisplayName,
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
          {!effectivePost.poll.anonymous && uniquePollVoters.length > 0 ? (
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

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-theme-border pt-3">
        <div className="flex flex-wrap items-center gap-4 text-[13px] text-theme-text-2">
          <button
            type="button"
            onClick={() => toggleLike(effectivePost.id)}
            className={cn(
              "flex items-center gap-1.5 transition-colors hover:text-theme-text",
              liked && "text-[var(--accent-like)] hover:text-[var(--accent-like)]",
            )}
            aria-label={liked ? "Убрать лайк" : "Лайк"}
            aria-pressed={liked}
          >
            <IconHeart
              filled={liked}
              className={cn(
                "h-[18px] w-[18px]",
                liked && "fill-[var(--accent-like)] stroke-[var(--accent-like)]",
              )}
            />
            <span className="tabular-nums text-theme-text-2">{fmtCountPost(likes)}</span>
          </button>
          <span className="flex items-center gap-1.5">
            <IconRepost className="h-[18px] w-[18px]" />
            <span className="tabular-nums text-theme-text-2">{fmtCountPost(reposts)}</span>
          </span>
        </div>
        <span className="text-[12px] text-theme-text-2">
          {formatVkRelativeTime(effectivePost.createdAt)}
          {effectivePost.editedAt != null ? (
            <span className="text-neutral-600"> · ред.</span>
          ) : null}
        </span>
      </div>
    </div>
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
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-theme-border bg-theme-card-2 text-xs font-semibold text-theme-text"
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
    <div className={cn("flex gap-2.5", isReply && "mt-1 pl-10")}>
      <UserAvatar src={authorAvatar} name={authorName} size={isReply ? 28 : 34} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-[13px] font-semibold leading-none text-[var(--link-color)]">
            {authorName}
          </span>
          <span className="text-[11px] leading-none text-theme-text-2">
            {formatTime(createdAt)}
          </span>
        </div>
        <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-snug text-theme-text">
          <MarkdownEmojiText text={text} />
        </p>
        <div className="mt-1.5 flex items-center gap-4">
          <button
            type="button"
            className="text-[12px] text-theme-text-2 transition-[color,transform] duration-150 hover:text-theme-text active:scale-90"
            onClick={() => onReplyTarget(id, authorName)}
          >
            Ответить
          </button>
          <button
            type="button"
            onClick={() => toggleLike(id)}
            className={cn(
              "flex items-center gap-1 text-[12px] transition-[color,transform] duration-150 active:scale-90",
              liked
                ? "text-[var(--accent-like)]"
                : "text-theme-text-2 hover:text-[var(--accent-like)]",
            )}
            aria-label={liked ? "Убрать лайк" : "Поставить лайк"}
          >
            <IconHeart
              filled={liked}
              className={cn(
                "h-[13px] w-[13px]",
                liked && "fill-[var(--accent-like)] stroke-[var(--accent-like)]",
              )}
            />
            <span>{likes}</span>
          </button>
        </div>

        {/* nested replies */}
        {replies.length > 0 && (
          <div className="relative mt-2 space-y-3 border-l border-theme-border pl-3">
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

/* ───────── main drawer ───────── */

type CommentDrawerProps = {
  open: boolean;
  postId: string;
  /** Запись, к которой открыты комментарии (превью сверху, как в VK). */
  post: PostEntity | null;
  postAuthorName: string;
  postAuthorAvatar: string | null;
  onClose: () => void;
};

export function CommentDrawer({
  open,
  postId,
  post,
  postAuthorName,
  postAuthorAvatar,
  onClose,
}: CommentDrawerProps) {
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

  const [draft, setDraft] = useState("");
  const [replyTarget, setReplyTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [imagePreview, setImagePreview] = useState<{
    urls: string[];
    index: number;
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const displayName =
    [firstName.trim(), lastName.trim()].filter(Boolean).join(" ") ||
    "Диса Бендер";

  useEffect(() => {
    if (!open) {
      setImagePreview(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || imagePreview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, imagePreview]);

  function openPostImagePreview(url: string) {
    if (!post) return;
    const urls = post.media.filter((m) => m.kind === "image").map((m) => m.url);
    const idx = urls.indexOf(url);
    setImagePreview({
      urls,
      index: idx >= 0 ? idx : 0,
    });
  }

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
    const ad = replies.filter((r) => r.parentId === a.id).length + a.likes;
    const bd = replies.filter((r) => r.parentId === b.id).length + b.likes;
    return bd - ad;
  });

  const totalCount = allComments.length;

  if (!open) return null;

  return (
    <>
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="flex h-[min(94dvh,800px)] w-full max-w-[520px] flex-col overflow-hidden rounded-t-[20px] border border-theme-border bg-theme-card shadow-2xl sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={`Комментарии${totalCount > 0 ? `, ${totalCount}` : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto bg-theme-card"
        >
          {post ? (
            <CommentModalPostPreview
              post={post}
              authorName={postAuthorName}
              authorAvatar={postAuthorAvatar}
              onClose={onClose}
              onImageClick={openPostImagePreview}
            />
          ) : (
            <div className="flex items-center justify-end border-b border-theme-border bg-theme-card px-4 py-3">
              <button
                type="button"
                className="grid h-9 w-9 place-items-center rounded-xl text-theme-text-2 transition-[color,background-color,transform] duration-150 hover:bg-theme-hover hover:text-theme-text active:scale-90"
                onClick={onClose}
                aria-label="Закрыть"
              >
                <IconClose className="h-5 w-5" />
              </button>
            </div>
          )}

          <div className="space-y-5 px-4 py-4">
            {totalCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-sm text-theme-text-2">Комментариев пока нет</p>
                <p className="mt-1 text-xs text-theme-text-2">
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
        </div>

      <footer className="mt-auto shrink-0 border-t border-theme-border bg-theme-card p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        {replyTarget && (
          <div className="mb-2 flex items-center gap-2 rounded-xl border border-theme-border bg-theme-card-2 px-3 py-2">
            <span className="text-[12px] text-theme-text-2">
              Ответ для{" "}
              <span className="font-medium text-theme-text">{replyTarget.name}</span>
            </span>
            <button
              type="button"
              className="ml-auto grid h-7 w-7 place-items-center rounded-lg text-theme-text-2 transition-[color,background-color,transform] duration-150 hover:bg-theme-hover hover:text-theme-text active:scale-90"
              onClick={clearReply}
              aria-label="Отменить ответ"
            >
              <IconClose className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <UserAvatar src={avatarObjectUrl} name={displayName} size={36} />
          <div className="flex min-w-0 flex-1 items-center gap-1 rounded-2xl border border-theme-border bg-theme-card-2 px-2 py-1.5">
            <button
              type="button"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-theme-text-2 transition-[color,background-color,transform] duration-150 hover:bg-theme-hover hover:text-theme-text active:scale-90"
              aria-label="Прикрепить файл"
            >
              <IconPaperclip className="h-[18px] w-[18px]" />
            </button>
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Написать комментарий..."
              className="min-w-0 flex-1 bg-transparent py-1.5 text-[15px] text-[var(--text-primary)] outline-none placeholder:text-neutral-600"
            />
            <button
              type="button"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-theme-text-2 transition-[color,background-color,transform] duration-150 hover:bg-theme-hover hover:text-theme-text active:scale-90"
              aria-label="Эмодзи"
              onClick={() => inputRef.current?.focus()}
            >
              <IconSmileOutline className="h-[18px] w-[18px]" />
            </button>
          </div>
          <button
            type="button"
            disabled={!draft.trim()}
            onClick={() => submit()}
            className={cn(
              "grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-[color,transform,opacity,background-color] duration-150",
              draft.trim()
                ? "text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/12 active:scale-90"
                : "cursor-not-allowed text-neutral-600/50",
            )}
            aria-label="Отправить"
          >
            <IconSendPlane className="h-5 w-5" />
          </button>
        </div>
      </footer>
      </div>
    </div>
    {imagePreview ? (
      <PostImagePreview
        urls={imagePreview.urls}
        initialIndex={imagePreview.index}
        onClose={() => setImagePreview(null)}
      />
    ) : null}
    </>
  );
}
