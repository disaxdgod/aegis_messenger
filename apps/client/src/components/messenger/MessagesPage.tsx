import { EmojiMartModal } from "@/components/messenger/EmojiMartModal";
import { MarkdownEmojiText } from "@/components/messenger/MarkdownEmojiText";
import { TextFormatSelectionModal } from "@/components/messenger/TextFormatSelectionModal";
import { MessengerConfirmModal } from "@/components/messenger/MessengerConfirmModal";
import { PostImagePreview } from "@/components/messenger/PostImagePreview";
import { SendMediaAttachmentModal } from "@/components/messenger/SendMediaAttachmentModal";
import { useWebRtcCalls } from "@/components/calls/webrtc-call-provider";
import {
  IconMessages,
  IconPaperclip,
  IconSearch,
  IconSendPlane,
  IconSmile,
} from "@/components/messenger/nav-icons";
import {
  COMPRESSIBLE_IMAGE_TYPES,
  compressImageIfNeeded,
} from "@/lib/compress-image-if-needed";
import { splitEmojiAware } from "@/lib/split-emoji-text";
import {
  clearAllDemoPeerReplyTimers,
  registerDmActiveChatResolver,
} from "@/lib/demo-dm-auto-reply";
import { syncAllMutualDmChats } from "@/lib/mutual-dm-sync";
import type { SelectionSnapshot } from "@/lib/markdown-selection";
import { isDmChatUnlocked } from "@/lib/social-graph";
import { cn } from "@/lib/utils";
import type { InboxChatItem as ChatItem } from "@/stores/dm-inbox-store";
import { inboxNowTimeLabel, useDmInboxStore } from "@/stores/dm-inbox-store";
import { useAppNavStore } from "@/stores/app-nav-store";
import { useAuthorSubscriptionsStore } from "@/stores/author-subscriptions-store";
import { usePostsStore } from "@/stores/posts-store";
import { useProfileStore } from "@/stores/profile-store";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

type PendingRecordedAttachment = {
  chatId: string;
  kind: "voice" | "video_note";
  url: string;
  name: string;
  mime: string;
  size: number;
  durationSec: number;
};

function IconDotsHorizontal({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <g fill="currentColor">
        <circle cx="6" cy="12" r="1.4" />
        <circle cx="12" cy="12" r="1.4" />
        <circle cx="18" cy="12" r="1.4" />
      </g>
    </svg>
  );
}

function IconPhoneOutline({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function IconVideoOutline({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="2" y="6" width="14" height="12" rx="2" />
      <path d="M16 10l6-3v10l-6-3v-4z" />
    </svg>
  );
}

function IconChevronsUp({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M17 11l-5-5-5 5M17 18l-5-5-5 5" />
    </svg>
  );
}

function IconClearHistory({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 4v4h4" />
      <path d="M7 12h10" />
    </svg>
  );
}

function IconTrashOutline({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
    </svg>
  );
}

/** Список с подписями в узкой колонке (показываем текст раньше, чтобы не терять полезное место). */
const SIDEBAR_LIST_EXPANDED_MIN = 96;
/** Минимум ширины колонки переписки при ручном ресайзе (px). */
const MESSAGES_RIGHT_PANE_MIN = 260;
/** Максимум ширины списка чатов (px); фактический предел не выше «ширина панели − разделитель − MESSAGES_RIGHT_PANE_MIN». */
const MESSAGES_LEFT_PANE_MAX = 440;
const MESSAGES_PANE_SEPARATOR_W = 8;
const MESSAGES_LEFT_PANE_MIN = 64;
const VIDEO_NOTE_MAX_DURATION_SEC = 60;

function avatarFallback(name: string) {
  return name.trim()[0]?.toUpperCase() ?? "?";
}

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

type ForwardedFeedPost = {
  comment: string | null;
  author: string;
  summary: string;
  body: string;
  mediaUrls?: string[];
  postId?: string;
  postDate?: number;
  pollPreview?: { question: string; optionTexts: string[] };
};

function parseForwardedFeedPost(text: string): ForwardedFeedPost | null {
  const marker = "⟲ Репост из ленты";
  const markerIndex = text.indexOf(marker);
  if (markerIndex < 0) {
    return null;
  }
  const comment = text.slice(0, markerIndex).trim() || null;
  const payloadRaw = text.slice(markerIndex + marker.length).trim();
  if (!payloadRaw) {
    return null;
  }
  const chunks = payloadRaw.split(/\n\s*\n/);
  const metaChunk = chunks[0]?.trim();
  if (!metaChunk) {
    return null;
  }
  const metaLines = metaChunk
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const author = metaLines[0] ?? "Автор";
  const summary = metaLines.slice(1).join(" ").trim() || "Запись";
  const body = chunks.slice(1).join("\n\n").trim() || summary;
  return { comment, author, summary, body };
}

function formatForwardedPostTimestamp(ts: number) {
  const d = new Date(ts);
  const datePart = d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
  });
  const timePart = d.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${datePart} в ${timePart}`;
}

function ForwardMediaStrip({ urls }: { urls: string[] }) {
  if (urls.length === 0) {
    return null;
  }
  const extra = urls.length > 4 ? urls.length - 4 : 0;
  const display = urls.slice(0, 4);

  if (display.length === 1) {
    return (
      <div className="px-2 pb-2">
        <img
          src={display[0]}
          alt=""
          className="max-h-52 w-full rounded-xl border border-theme-border object-cover"
        />
      </div>
    );
  }

  if (display.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-0.5 px-2 pb-2">
        {display.map((u) => (
          <img
            key={u}
            src={u}
            alt=""
            className="h-28 w-full rounded-lg object-cover sm:h-32"
          />
        ))}
      </div>
    );
  }

  if (display.length === 3) {
    const [a, b, c] = display;
    return (
      <div className="grid grid-cols-2 gap-0.5 px-2 pb-2">
        <img src={a} alt="" className="h-24 w-full rounded-lg object-cover sm:h-28" />
        <img src={b} alt="" className="h-24 w-full rounded-lg object-cover sm:h-28" />
        <div className="relative col-span-2">
          <img src={c} alt="" className="h-32 w-full rounded-lg object-cover sm:h-36" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-0.5 px-2 pb-2">
      {display.map((u, index) => (
        <div
          key={`${u}-${index}`}
          className="relative aspect-[4/3] overflow-hidden rounded-lg border border-theme-border"
        >
          <img src={u} alt="" className="h-full w-full object-cover" />
          {index === 3 && extra > 0 ? (
            <span className="absolute inset-0 grid place-items-center bg-black/55 text-lg font-semibold text-white">
              +{extra}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function DmTelegramStyleForwardCard({
  fromMe,
  data,
  onOpenPost,
}: {
  fromMe: boolean;
  data: ForwardedFeedPost;
  onOpenPost: () => void;
}) {
  const sameBody = data.body === data.summary;
  const hasTextBlock = Boolean(data.summary.trim() || data.body.trim());
  const hasPoll =
    data.pollPreview != null &&
    (data.pollPreview.question.trim().length > 0 ||
      data.pollPreview.optionTexts.length > 0);

  return (
    <div className="space-y-2">
      {data.comment ? (
        <div className="text-[15px] leading-snug">
          <MarkdownEmojiText text={data.comment} emojiSize="1.24em" />
        </div>
      ) : null}

      <div
        className={cn(
          "overflow-hidden rounded-2xl border shadow-[0_2px_12px_rgba(0,0,0,0.35)]",
          fromMe
            ? "border-[#4d8ec4]/40 bg-[#1a2838]"
            : "border-theme-border bg-theme-card-2",
        )}
      >
        <div className="flex gap-2.5 border-b border-theme-border px-3 py-2.5">
          <div
            className={cn(
              "grid h-10 w-10 shrink-0 place-items-center rounded-full border text-[15px] font-semibold text-theme-text",
              fromMe
                ? "border-[#5a9fd4]/35 bg-[#254a68]"
                : "border-theme-border bg-theme-card-3",
            )}
          >
            {avatarFallback(data.author)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold leading-tight text-[#53a5ea]">
              {data.author}
            </p>
            <p className="mt-0.5 truncate text-[13px] text-theme-text-2">
              {data.postDate != null
                ? formatForwardedPostTimestamp(data.postDate)
                : "Запись из ленты"}
            </p>
          </div>
        </div>

        <ForwardMediaStrip urls={data.mediaUrls ?? []} />

        {hasTextBlock ? (
          <div className="space-y-2 px-3 pb-2 pt-3">
            {sameBody ? (
              <div className="text-[15px] font-semibold leading-snug text-theme-text">
                <MarkdownEmojiText text={data.body} emojiSize="1.2em" />
              </div>
            ) : (
              <>
                <p className="text-[15px] font-bold leading-snug text-theme-text">{data.summary}</p>
                <div className="text-[14px] leading-relaxed text-theme-text">
                  <MarkdownEmojiText text={data.body} emojiSize="1.15em" />
                </div>
              </>
            )}
          </div>
        ) : null}

        {hasPoll && data.pollPreview ? (
          <div className="space-y-2 px-3 pb-2 pt-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-theme-text-2">
              Опрос
            </p>
            {data.pollPreview.question.trim().length > 0 ? (
              <div className="text-[15px] font-semibold leading-snug text-theme-text">
                <MarkdownEmojiText
                  text={data.pollPreview.question}
                  emojiSize="1.2em"
                />
              </div>
            ) : null}
            {data.pollPreview.optionTexts.length > 0 ? (
              <ul className="space-y-1.5" role="list">
                {data.pollPreview.optionTexts.map((t, i) => (
                  <li
                    key={`${i}-${t.slice(0, 24)}`}
                    className="rounded-xl border border-theme-border bg-theme-hover px-3 py-2 text-[14px] leading-snug text-theme-text"
                  >
                    <MarkdownEmojiText text={t} emojiSize="1.1em" />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <div className="px-3 pb-3">
          <button
            type="button"
            className={cn(
              "w-full rounded-full border py-2.5 text-[15px] font-medium transition-colors",
              "border-[#3390ec] text-[#53a5ea] hover:bg-[#3390ec]/12 active:bg-[#3390ec]/18",
            )}
            onClick={onOpenPost}
          >
            Открыть пост
          </button>
        </div>
      </div>
    </div>
  );
}

function presenceLabel(presence: ChatItem["presence"]) {
  if (presence === "online") {
    return "В сети";
  }
  if (presence === "dnd") {
    return "Не беспокоить";
  }
  return "Не в сети";
}

function chatSubtitle(chat: ChatItem, isTyping: boolean) {
  if (isTyping) {
    return "Печатает...";
  }
  return presenceLabel(chat.presence);
}

function presenceDotClass(presence: ChatItem["presence"]) {
  if (presence === "online") {
    return "bg-emerald-400";
  }
  if (presence === "dnd") {
    return "bg-rose-400";
  }
  return null;
}

function MessageStatusTicks({ status }: { status: "sent" | "delivered" | "read" }) {
  const tone = "text-white/65";
  if (status === "sent") {
    return (
      <svg viewBox="0 0 16 16" className={cn("h-[15px] w-[15px]", tone)} aria-hidden>
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="M10.782 4.721a.75.75 0 0 1 0 1.06l-6 6a.75.75 0 0 1-1.06 0l-2.502-2.5A.75.75 0 0 1 2.28 8.22l1.971 1.97 5.47-5.469a.75.75 0 0 1 1.06 0"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" className={cn("h-[15px] w-[15px]", tone)} aria-hidden>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M10.782 4.721a.75.75 0 0 1 0 1.06l-6 6a.75.75 0 0 1-1.06 0l-2.502-2.5A.75.75 0 0 1 2.28 8.22l1.971 1.97 5.47-5.469a.75.75 0 0 1 1.06 0zm4.248 0a.75.75 0 0 1 0 1.06l-6 6a.75.75 0 1 1-1.06-1.06l6-6a.75.75 0 0 1 1.06 0"
        clipRule="evenodd"
      />
    </svg>
  );
}

function IconMic({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
    </svg>
  );
}

/** Режим «кружка» (видеосообщение), как в Telegram. */
function IconVideoCircle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" fill="currentColor" />
    </svg>
  );
}

/** Как в Telegram: `00:03`. */
function formatVoiceClock(totalSec: number) {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
}

/** Стабильные амплитуды полосок (псевдо-волна, как в Telegram). */
function voiceWaveFactors(seed: string, count: number): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const raw: number[] = [];
  for (let i = 0; i < count; i++) {
    h ^= (i + 1) * 374761393;
    h = Math.imul(h, 2654435761);
    const u = (h >>> 0) / 4294967296;
    raw.push(0.2 + u * 0.8);
  }
  // Лёгкое сглаживание соседей — более «живой» силуэт полосок.
  const out = raw.slice();
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < count; i++) {
      const prev = raw[i - 1] ?? raw[i];
      const next = raw[i + 1] ?? raw[i];
      out[i] = (prev * 0.22 + raw[i] * 0.56 + next * 0.22);
    }
    for (let i = 0; i < count; i++) {
      raw[i] = out[i];
    }
  }
  return out;
}

function VoicePlayGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7L8 5z" />
    </svg>
  );
}

function VoicePauseGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
    </svg>
  );
}

function VideoNotePlayGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M10 8.5v7l5.25-3.5L10 8.5z" />
    </svg>
  );
}

function VoiceAttachmentPlayer({
  src,
  durationSec: durationProp,
  fromMe,
  messageTime,
  status,
  className,
}: {
  src: string;
  durationSec?: number;
  fromMe: boolean;
  messageTime?: string;
  status?: "sent" | "delivered" | "read";
  className?: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(() => (durationProp && durationProp > 0 ? durationProp : 0));

  const barCount = 42;
  const factors = useMemo(() => voiceWaveFactors(src, barCount), [src]);

  useEffect(() => {
    if (durationProp != null && durationProp > 0) {
      setDuration(durationProp);
    }
  }, [durationProp]);

  function toggle() {
    const el = audioRef.current;
    if (!el) {
      return;
    }
    if (el.paused) {
      void el.play().catch(() => {});
    } else {
      el.pause();
    }
  }

  const progress = duration > 0 ? Math.min(1, current / duration) : 0;
  const activeThru = progress * factors.length;

  const durationLabel =
    duration > 0
      ? formatVoiceClock(Math.floor(playing || current > 0 ? current : duration))
      : "—";

  const waveActive = fromMe ? "var(--dm-voice-wave)" : "var(--accent-primary)";
  const waveMuted = fromMe
    ? "var(--dm-voice-wave-muted)"
    : "color-mix(in srgb, var(--accent-primary) 30%, transparent)";

  return (
    <div
      className={cn(
        "flex min-w-[232px] max-w-[min(100%,300px)] items-start gap-2.5",
        className,
      )}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        className="hidden"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrent(0);
        }}
        onTimeUpdate={() => {
          const el = audioRef.current;
          setCurrent(el?.currentTime ?? 0);
        }}
        onLoadedMetadata={() => {
          const el = audioRef.current;
          if (el && Number.isFinite(el.duration) && el.duration > 0 && !(durationProp && durationProp > 0)) {
            setDuration(el.duration);
          }
        }}
      />
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-full transition-[transform,filter] active:scale-95",
          fromMe
            ? "bg-[var(--dm-voice-play-bg)] text-[#15263d] shadow-[0_2px_10px_rgba(0,0,0,0.18)] hover:brightness-105"
            : "bg-[var(--accent-primary)] text-white hover:brightness-110",
        )}
        aria-label={playing ? "Пауза" : "Воспроизвести"}
      >
        {playing ? (
          <VoicePauseGlyph className="h-[15px] w-[15px]" />
        ) : (
          <VoicePlayGlyph className="h-[17px] w-[17px] translate-x-[1px]" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex h-9 items-end gap-[2px] px-0.5">
          {factors.map((f, i) => {
            const edge = activeThru - i;
            const playedFull = edge >= 1;
            const partial = edge > 0 && edge < 1;
            const hPx = Math.round(4 + f * 24);
            return (
              <div
                key={i}
                className="w-[2px] shrink-0 rounded-full transition-[height,background-color,opacity] duration-100 ease-out"
                style={{
                  height: `${hPx}px`,
                  backgroundColor: playedFull || partial ? waveActive : waveMuted,
                  opacity: partial ? 0.42 + edge * 0.58 : 1,
                }}
              />
            );
          })}
        </div>
        <div className="mt-1 flex items-center justify-between gap-3 pr-0.5">
          <span
            className={cn(
              "shrink-0 tabular-nums text-[12px] font-medium leading-none tracking-tight",
              fromMe ? "text-[var(--dm-voice-duration)]" : "text-[var(--accent-primary)]",
            )}
          >
            {durationLabel}
          </span>
          {messageTime ? (
            <p
              className={cn(
                "flex shrink-0 items-center gap-1 text-[12px] leading-none",
                fromMe ? "text-white/62" : "text-theme-text-2",
              )}
            >
              <span>{messageTime}</span>
              {fromMe && status ? <MessageStatusTicks status={status} /> : null}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function VideoNoteCirclePlayer({
  src,
  durationSec,
  className,
}: {
  src: string;
  durationSec?: number;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(() =>
    durationSec != null && durationSec > 0 ? durationSec : 0,
  );

  useEffect(() => {
    if (durationSec != null && durationSec > 0) {
      setTotalDuration(durationSec);
    }
  }, [durationSec]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) {
      return;
    }
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => setCurrentTime(v.currentTime);
    const onMeta = () => {
      if (Number.isFinite(v.duration) && v.duration > 0) {
        setTotalDuration(v.duration);
      }
    };
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
    };
  }, [src]);

  function toggle() {
    const v = videoRef.current;
    if (!v) {
      return;
    }
    if (v.paused) {
      void v.play().catch(() => {});
    } else {
      v.pause();
    }
  }

  const r = 47;
  const c = 2 * Math.PI * r;
  const dur = totalDuration > 0 ? totalDuration : 1;
  const progress = Math.min(1, Math.max(0, currentTime / dur));
  const dash = c * (1 - progress);

  return (
    <div className={cn("inline-flex", className)}>
      <div
        role="button"
        tabIndex={0}
        aria-label={playing ? "Пауза" : "Воспроизвести видеокружок"}
        aria-pressed={playing}
        className="relative aspect-square w-44 max-w-[72vw] cursor-pointer [-webkit-tap-highlight-color:transparent] select-none outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1d1d1d]"
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            toggle();
          }
        }}
      >
        <div className="absolute inset-0 overflow-hidden rounded-full bg-black/50 shadow-lg shadow-black/45">
          <video
            ref={videoRef}
            src={src}
            playsInline
            preload="metadata"
            disablePictureInPicture
            tabIndex={-1}
            className="pointer-events-none h-full w-full object-cover outline-none [transform:scaleX(-1)]"
          />
          {!playing ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/18">
              <div className="grid h-[52px] w-[52px] place-items-center rounded-full bg-black/55 text-white backdrop-blur-[4px]">
                <VideoNotePlayGlyph className="h-7 w-7 translate-x-1" />
              </div>
            </div>
          ) : null}
        </div>
        {playing ? (
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full -rotate-90"
            viewBox="0 0 100 100"
            aria-hidden
          >
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="2.5"
            />
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke="var(--accent-primary)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={dash}
              className="transition-[stroke-dashoffset] duration-150 ease-linear"
            />
          </svg>
        ) : null}
      </div>
    </div>
  );
}

function pickAudioMime(): string {
  if (typeof MediaRecorder === "undefined") {
    return "";
  }
  for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]) {
    if (MediaRecorder.isTypeSupported(t)) {
      return t;
    }
  }
  return "";
}

function pickVideoNoteMime(): string {
  if (typeof MediaRecorder === "undefined") {
    return "";
  }
  for (const t of ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"]) {
    if (MediaRecorder.isTypeSupported(t)) {
      return t;
    }
  }
  return "";
}

/** Тот же breakpoint, что и Tailwind `lg:` (1024px) — чтобы не монтировать чат дважды. */
const DESKTOP_LG_MEDIA = "(min-width: 1024px)";

function useDesktopLgLayout() {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(DESKTOP_LG_MEDIA).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_LG_MEDIA);
    setMatches(mq.matches);
    const fn = () => setMatches(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return matches;
}

export function MessagesPage() {
  const isDesktopLg = useDesktopLgLayout();
  const setScreen = useAppNavStore((s) => s.setScreen);
  const navigateToFeedWithPostComments = useAppNavStore(
    (s) => s.navigateToFeedWithPostComments,
  );
  const chats = useDmInboxStore((s) => s.chats);
  const messagesByChat = useDmInboxStore((s) => s.messagesByChat);
  const username = useProfileStore((s) => s.username);
  const subscribedKeys = useAuthorSubscriptionsStore((s) => s.subscribedKeys);
  const typingByChatId = useDmInboxStore((s) => s.typingByChatId);
  const patchChatPreview = useDmInboxStore((s) => s.patchChatPreview);
  const markChatRead = useDmInboxStore((s) => s.markChatRead);
  const pendingOpenChatId = useDmInboxStore((s) => s.pendingOpenChatId);
  const consumePendingOpenChat = useDmInboxStore((s) => s.consumePendingOpenChat);
  const appendOutgoingMessage = useDmInboxStore((s) => s.appendOutgoingMessage);
  const clearChatMessagesStore = useDmInboxStore((s) => s.clearChatMessages);
  const removeChatStore = useDmInboxStore((s) => s.removeChat);
  const [query, setQuery] = useState("");
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [fmtOpen, setFmtOpen] = useState(false);
  const [fmtSnap, setFmtSnap] = useState<SelectionSnapshot | null>(null);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingRecordedAttachment, setPendingRecordedAttachment] =
    useState<PendingRecordedAttachment | null>(null);
  const [sendingCompressed, setSendingCompressed] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [dmImagePreview, setDmImagePreview] = useState<{ urls: string[]; index: number } | null>(null);
  const [leftPaneWidth, setLeftPaneWidth] = useState(92);
  const [isResizingPane, setIsResizingPane] = useState(false);
  const initialMsgIds = useRef<Map<string, Set<string>>>(new Map());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fmtTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const attachmentUrlsRef = useRef<string[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);
  const recordHoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordPressingRef = useRef(false);
  const recordSessionRef = useRef<{
    kind: "voice" | "video_note";
    chatId: string;
    recorder: MediaRecorder;
    stream: MediaStream;
    chunks: Blob[];
    startTs: number;
  } | null>(null);
  const [voiceUiMode, setVoiceUiMode] = useState<"mic" | "circle">("mic");
  const webrtcCalls = useWebRtcCalls();
  const [isRecordingMedia, setIsRecordingMedia] = useState(false);
  const [voiceControlLiftPx, setVoiceControlLiftPx] = useState(0);
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(null);
  const [recordingElapsedSec, setRecordingElapsedSec] = useState(0);
  const [recordingBars, setRecordingBars] = useState<number[]>(() => Array.from({ length: 28 }, () => 0.18));
  const recordDiscardRef = useRef(false);
  const startedByCurrentPressRef = useRef(false);
  const recordingAtPointerDownRef = useRef(false);
  const suppressNextVoiceClickRef = useRef(false);
  const recordAudioCtxRef = useRef<AudioContext | null>(null);
  const recordAnalyserRef = useRef<AnalyserNode | null>(null);
  const recordAnalyserDataRef = useRef<Uint8Array | null>(null);
  const recordAnimFrameRef = useRef<number | null>(null);
  const recordBarsPhaseRef = useRef(0);
  const recordingPreviewVideoRef = useRef<HTMLVideoElement>(null);
  const videoNoteAutoStopRef = useRef(false);
  const voicePointerStartYRef = useRef(0);
  const voicePointerTypeRef = useRef<"mouse" | "touch" | "pen" | null>(null);
  const voiceDragIntentRef = useRef(false);
  const prevMessagesStateRef = useRef<{
    chatId: string | null;
    count: number;
  }>({
    chatId: null,
    count: 0,
  });
  const viewingChatIdRef = useRef<string | null>(null);
  const voiceUiModeRef = useRef(voiceUiMode);
  voiceUiModeRef.current = voiceUiMode;
  const expandedLeftPane = leftPaneWidth >= SIDEBAR_LIST_EXPANDED_MIN;

  function closeFormatModal() {
    setFmtOpen(false);
    setFmtSnap(null);
  }

  function scheduleFormatOpen() {
    if (fmtTimerRef.current) {
      clearTimeout(fmtTimerRef.current);
    }
    fmtTimerRef.current = setTimeout(() => {
      fmtTimerRef.current = null;
      const ta = textareaRef.current;
      if (!ta) {
        return;
      }
      const s = ta.selectionStart;
      const e = ta.selectionEnd;
      if (s < e) {
        setFmtSnap({ start: s, end: e });
        setFmtOpen(true);
        return;
      }
      closeFormatModal();
    }, 220);
  }

  function openChat(chatId: string) {
    setActiveChatId(chatId);
    markChatRead(chatId);
    setMobileChatOpen(true);
    setDraft("");
    closeFormatModal();
    setPendingFile(null);
    clearPendingRecordedAttachment();
    setVoiceUiMode("mic");
  }

  function closeChat() {
    setMobileChatOpen(false);
    setHeaderMenuOpen(false);
  }

  useEffect(() => {
    registerDmActiveChatResolver((chatId) => viewingChatIdRef.current === chatId);
    return () => {
      registerDmActiveChatResolver(null);
      clearAllDemoPeerReplyTimers();
    };
  }, []);

  useEffect(() => {
    if (!pendingOpenChatId) {
      return;
    }
    const chatId = consumePendingOpenChat();
    if (chatId) {
      openChat(chatId);
    }
  }, [pendingOpenChatId, consumePendingOpenChat]);

  useEffect(() => {
    return () => {
      stopRecordingVisualizer();
      if (recordHoldTimerRef.current) {
        clearTimeout(recordHoldTimerRef.current);
      }
      if (fmtTimerRef.current) {
        clearTimeout(fmtTimerRef.current);
      }
      const s = recordSessionRef.current;
      if (s) {
        try {
          s.recorder.stop();
        } catch {
          /* noop */
        }
        s.stream.getTracks().forEach((t) => t.stop());
        recordSessionRef.current = null;
      }
      for (const url of attachmentUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
      attachmentUrlsRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!headerMenuOpen) {
      return;
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setHeaderMenuOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [headerMenuOpen]);

  useEffect(() => {
    if (!isResizingPane) {
      return;
    }
    function onMove(e: MouseEvent) {
      const host = panelRef.current;
      if (!host) {
        return;
      }
      const rect = host.getBoundingClientRect();
      const next = Math.round(e.clientX - rect.left);
      const maxByLayout = Math.round(
        rect.width - MESSAGES_PANE_SEPARATOR_W - MESSAGES_RIGHT_PANE_MIN,
      );
      const upper = Math.min(
        MESSAGES_LEFT_PANE_MAX,
        Math.max(MESSAGES_LEFT_PANE_MIN, maxByLayout),
      );
      setLeftPaneWidth(Math.max(MESSAGES_LEFT_PANE_MIN, Math.min(upper, next)));
    }
    function onUp() {
      setIsResizingPane(false);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isResizingPane]);

  function stopRecordingVisualizer() {
    if (recordAnimFrameRef.current != null) {
      cancelAnimationFrame(recordAnimFrameRef.current);
      recordAnimFrameRef.current = null;
    }
    recordAnalyserRef.current = null;
    recordAnalyserDataRef.current = null;
    const ctx = recordAudioCtxRef.current;
    recordAudioCtxRef.current = null;
    if (ctx) {
      void ctx.close().catch(() => {});
    }
    setRecordingBars(Array.from({ length: 28 }, () => 0.18));
  }

  useEffect(() => {
    if (!isRecordingMedia || recordingStartedAt == null) {
      setRecordingElapsedSec(0);
      return;
    }
    const tick = () => {
      setRecordingElapsedSec(Math.max(0, (Date.now() - recordingStartedAt) / 1000));
    };
    tick();
    const timer = window.setInterval(tick, 40);
    return () => window.clearInterval(timer);
  }, [isRecordingMedia, recordingStartedAt]);

  useEffect(() => {
    const video = recordingPreviewVideoRef.current;
    if (!video) {
      return;
    }
    const session = recordSessionRef.current;
    if (isRecordingMedia && session?.kind === "video_note") {
      video.srcObject = session.stream;
      void video.play().catch(() => {});
      return;
    }
    video.srcObject = null;
  }, [isRecordingMedia]);

  useEffect(() => {
    const cls = "itd-chat-open-mobile";
    if (!isDesktopLg && mobileChatOpen) {
      document.body.classList.add(cls);
    } else {
      document.body.classList.remove(cls);
    }
    return () => {
      document.body.classList.remove(cls);
    };
  }, [isDesktopLg, mobileChatOpen]);

  useEffect(() => {
    const cls = "itd-messenger-mobile";
    if (!isDesktopLg) {
      document.body.classList.add(cls);
    } else {
      document.body.classList.remove(cls);
    }
    return () => {
      document.body.classList.remove(cls);
    };
  }, [isDesktopLg]);

  useEffect(() => {
    const cls = "itd-messages-page";
    document.documentElement.classList.add(cls);
    document.body.classList.add(cls);
    return () => {
      document.documentElement.classList.remove(cls);
      document.body.classList.remove(cls);
    };
  }, []);

  useEffect(() => {
    syncAllMutualDmChats();
  }, [username, subscribedKeys]);

  const visibleChats = useMemo(
    () =>
      chats.filter((chat) =>
        isDmChatUnlocked(chat, username, subscribedKeys, {
          messageCount: (messagesByChat[chat.id] ?? []).length,
        }),
      ),
    [chats, username, subscribedKeys, messagesByChat],
  );

  useEffect(() => {
    if (
      activeChatId &&
      !visibleChats.some((chat) => chat.id === activeChatId)
    ) {
      setActiveChatId(null);
      setMobileChatOpen(false);
    }
  }, [activeChatId, visibleChats]);

  const filteredChats = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return visibleChats;
    }
    return visibleChats.filter(
      (chat) =>
        chat.name.toLowerCase().includes(needle) ||
        chat.handle.toLowerCase().includes(needle) ||
        chat.lastMessage.toLowerCase().includes(needle),
    );
  }, [query, visibleChats]);

  const desktopActiveChatId = activeChatId ?? filteredChats[0]?.id ?? null;
  const activeChat =
    filteredChats.find((chat) => chat.id === desktopActiveChatId) ?? null;
  const messages = activeChat ? (messagesByChat[activeChat.id] ?? []) : [];
  viewingChatIdRef.current = isDesktopLg
    ? desktopActiveChatId
    : mobileChatOpen
      ? activeChatId
      : null;
  const activeChatTyping = activeChat ? Boolean(typingByChatId[activeChat.id]) : false;

  function initiateDmCall(kind: "audio" | "video"): void {
    setHeaderMenuOpen(false);
    if (!activeChat) return;
    const backendId = activeChat.backendChatId?.trim();
    if (!backendId) {
      window.alert(
        "Звонок доступен только для реального диалога: укажите backendChatId у чата (ID из API после интеграции списка DM).",
      );
      return;
    }
    if (!webrtcCalls.socketConnected) {
      window.alert(
        "Нет живого Socket.IO (войдите в аккаунт и держите сервер запущенным).",
      );
      return;
    }
    webrtcCalls.startOutgoingChatCall(backendId, kind, activeChat.name);
  }

  useEffect(() => {
    const prev = prevMessagesStateRef.current;
    const currentChatId = activeChat?.id ?? null;
    const currentCount = messages.length;

    // При переключении чата не автоскроллим, только обновляем baseline.
    if (prev.chatId !== currentChatId) {
      prevMessagesStateRef.current = {
        chatId: currentChatId,
        count: currentCount,
      };
      return;
    }

    const last = messages[currentCount - 1];
    const hasNewMessage = currentCount > prev.count;

    if (hasNewMessage && last?.fromMe) {
      requestAnimationFrame(() => {
        const host = messagesScrollRef.current;
        if (!host) {
          return;
        }
        host.scrollTo({ top: host.scrollHeight, behavior: "smooth" });
      });
    }

    prevMessagesStateRef.current = {
      chatId: currentChatId,
      count: currentCount,
    };
  }, [activeChat?.id, messages]);

  function sendMessage(
    text: string,
    attachment?: {
      kind: "image" | "video" | "file" | "voice" | "video_note";
      url: string;
      name: string;
      mime: string;
      size: number;
      compressed: boolean;
      durationSec?: number;
    },
    opts?: { forChatId?: string },
  ) {
    const targetChatId = opts?.forChatId ?? activeChat?.id;
    if (!targetChatId) {
      return;
    }
    const clean = text.trim();
    if (!clean && !attachment) {
      return;
    }
    const time = inboxNowTimeLabel();
    appendOutgoingMessage(targetChatId, {
      fromMe: true,
      text: clean,
      time,
      status: "sent",
      attachment,
    });
    const previewText =
      clean ||
      (attachment
        ? attachment.kind === "image"
          ? `🖼️ ${attachment.compressed ? "Сжатое фото" : "Фото как файл"}`
          : attachment.kind === "video"
            ? `🎬 ${attachment.compressed ? "Сжатое видео" : "Видео"}`
            : attachment.kind === "voice"
              ? "🎤 Голосовое сообщение"
              : attachment.kind === "video_note"
                ? "📹 Видеосообщение"
                : `📎 ${attachment.name}`
        : "");
    patchChatPreview(targetChatId, previewText, time);
    const resetComposer =
      opts?.forChatId == null || (!!activeChat && opts.forChatId === activeChat.id);
    if (resetComposer) {
      setDraft("");
      setEmojiOpen(false);
      closeFormatModal();
    }
  }

  function handlePickFile(file: File | null) {
    if (!file) {
      return;
    }
    setPendingFile(file);
  }

  function clearPendingRecordedAttachment() {
    setPendingRecordedAttachment((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev.url);
      }
      return null;
    });
  }

  function sendComposerMessage() {
    sendMessage(draft);
  }

  function sendRecordedByMic() {
    if (!pendingRecordedAttachment) {
      return;
    }
    sendMessage(
      "",
      {
        kind: pendingRecordedAttachment.kind,
        url: pendingRecordedAttachment.url,
        name: pendingRecordedAttachment.name,
        mime: pendingRecordedAttachment.mime,
        size: pendingRecordedAttachment.size,
        compressed: false,
        durationSec: pendingRecordedAttachment.durationSec,
      },
      { forChatId: pendingRecordedAttachment.chatId },
    );
    setPendingRecordedAttachment(null);
  }

  function insertEmoji(emoji: string) {
    const ta = textareaRef.current;
    if (!ta) {
      setDraft((prev) => prev + emoji);
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    setDraft((prev) => prev.slice(0, start) + emoji + prev.slice(end));
    const pos = start + emoji.length;
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(pos, pos);
    });
  }

  function cancelRecordHoldTimer() {
    if (recordHoldTimerRef.current) {
      clearTimeout(recordHoldTimerRef.current);
      recordHoldTimerRef.current = null;
    }
  }

  async function startMediaRecord(mediaKind: "voice" | "video_note") {
    if (!activeChat || !navigator.mediaDevices?.getUserMedia) {
      return;
    }
    if (recordSessionRef.current) {
      return;
    }
    try {
      const constraints: MediaStreamConstraints =
        mediaKind === "voice"
          ? { audio: true }
          : {
              audio: true,
              video: {
                facingMode: "user",
                width: { ideal: 480 },
                height: { ideal: 480 },
              },
            };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        const audioCtx = new AudioContext();
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.86;
        const source = audioCtx.createMediaStreamSource(new MediaStream([audioTrack]));
        source.connect(analyser);
        const timeData = new Uint8Array(analyser.fftSize);
        recordAudioCtxRef.current = audioCtx;
        recordAnalyserRef.current = analyser;
        recordAnalyserDataRef.current = timeData;
        const animateBars = () => {
          const node = recordAnalyserRef.current;
          const data = recordAnalyserDataRef.current;
          if (!node || !data) {
            return;
          }
          node.getByteTimeDomainData(
            data as unknown as Parameters<
              typeof node.getByteTimeDomainData
            >[0],
          );
          let sumSq = 0;
          for (let i = 0; i < data.length; i++) {
            const centered = (data[i] - 128) / 128;
            sumSq += centered * centered;
          }
          const rms = Math.sqrt(sumSq / data.length);
          const level = Math.max(0, Math.min(1, rms * 4.2));
          recordBarsPhaseRef.current += 0.16;
          setRecordingBars((prev) => {
            return prev.map((old, i) => {
              // Вся линия движется целиком: живая форма + уровень микрофона.
              const a = (Math.sin(recordBarsPhaseRef.current + i * 0.58) + 1) * 0.5;
              const b = (Math.sin(recordBarsPhaseRef.current * 1.35 + i * 0.27) + 1) * 0.5;
              const shape = a * 0.72 + b * 0.28;
              // База не нулевая, чтобы полосы "дышали" даже в тишине.
              const base = 0.06 + shape * 0.06;
              const target = base + level * (0.42 + shape * 1.08);
              // Плавная атака/затухание без залипания высоких значений.
              const smooth = old + (target - old) * 0.33;
              return Math.max(0.04, Math.min(1, smooth));
            });
          });
          recordAnimFrameRef.current = requestAnimationFrame(animateBars);
        };
        recordAnimFrameRef.current = requestAnimationFrame(animateBars);
      }
      const mime = mediaKind === "voice" ? pickAudioMime() : pickVideoNoteMime();
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: Blob[] = [];
      const startTs = Date.now();
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      recorder.start(250);
      recordSessionRef.current = {
        kind: mediaKind,
        chatId: activeChat.id,
        recorder,
        stream,
        chunks,
        startTs,
      };
      recordDiscardRef.current = false;
      setRecordingStartedAt(startTs);
      setIsRecordingMedia(true);
    } catch {
      setIsRecordingMedia(false);
      setRecordingStartedAt(null);
      setRecordingElapsedSec(0);
      stopRecordingVisualizer();
      recordSessionRef.current = null;
    }
  }

  function finalizeMediaRecording(options?: { discard?: boolean }) {
    const session = recordSessionRef.current;
    recordSessionRef.current = null;
    recordDiscardRef.current = Boolean(options?.discard);
    if (!session) {
      setIsRecordingMedia(false);
      setRecordingStartedAt(null);
      setRecordingElapsedSec(0);
      return;
    }
    const { recorder, stream, chunks, startTs, kind, chatId } = session;

    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      setIsRecordingMedia(false);
      setRecordingStartedAt(null);
      setRecordingElapsedSec(0);
      stopRecordingVisualizer();
      if (recordDiscardRef.current) {
        recordDiscardRef.current = false;
        return;
      }
      const durationSec = Math.max(1, Math.round((Date.now() - startTs) / 1000));
      const blob = new Blob(chunks, {
        type: recorder.mimeType || (kind === "voice" ? "audio/webm" : "video/webm"),
      });
      if (blob.size < 32) {
        return;
      }
      const url = URL.createObjectURL(blob);
      attachmentUrlsRef.current.push(url);
      const ext = blob.type.includes("mp4") ? "mp4" : "webm";
      const name =
        kind === "voice" ? `voice-${Date.now()}.${ext}` : `circle-${Date.now()}.${ext}`;
      setPendingRecordedAttachment({
        chatId,
        kind,
        url,
        name,
        mime: blob.type,
        size: blob.size,
        durationSec,
      });
    };

    try {
      if (recorder.state === "recording") {
        recorder.stop();
      } else {
        stream.getTracks().forEach((t) => t.stop());
        setIsRecordingMedia(false);
        setRecordingStartedAt(null);
        setRecordingElapsedSec(0);
        stopRecordingVisualizer();
      }
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      setIsRecordingMedia(false);
      setRecordingStartedAt(null);
      setRecordingElapsedSec(0);
      stopRecordingVisualizer();
    }
  }

  function onVoiceControlPointerDown(e: ReactPointerEvent<HTMLButtonElement>) {
    if (pendingFile) {
      return;
    }
    if (pendingRecordedAttachment) {
      return;
    }
    recordingAtPointerDownRef.current = Boolean(recordSessionRef.current);
    startedByCurrentPressRef.current = false;
    voicePointerStartYRef.current = e.clientY;
    voicePointerTypeRef.current = e.pointerType as "mouse" | "touch" | "pen";
    voiceDragIntentRef.current = false;
    setVoiceControlLiftPx(0);
    e.preventDefault();
    if (recordingAtPointerDownRef.current) {
      return;
    }
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    recordPressingRef.current = true;
    cancelRecordHoldTimer();
    recordHoldTimerRef.current = setTimeout(() => {
      recordHoldTimerRef.current = null;
      if (!recordPressingRef.current) {
        return;
      }
      startedByCurrentPressRef.current = true;
      const kind: "voice" | "video_note" =
        voiceUiModeRef.current === "circle" ? "video_note" : "voice";
      void startMediaRecord(kind);
    }, 320);
  }

  function onVoiceControlPointerUp(e: ReactPointerEvent<HTMLButtonElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    recordPressingRef.current = false;
    cancelRecordHoldTimer();
    const hadDragIntent = voiceDragIntentRef.current;
    voiceDragIntentRef.current = false;
    setVoiceControlLiftPx(0);
    if (recordSessionRef.current) {
      if (!recordingAtPointerDownRef.current && startedByCurrentPressRef.current) {
        // Отпускание после long-press не останавливает запись.
        suppressNextVoiceClickRef.current = true;
      }
      return;
    }
    if (hadDragIntent) {
      return;
    }
    if (!pendingFile) {
      setVoiceUiMode((m) => (m === "mic" ? "circle" : "mic"));
    }
  }

  function onVoiceControlPointerCancel(e: ReactPointerEvent<HTMLButtonElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    recordPressingRef.current = false;
    cancelRecordHoldTimer();
    voiceDragIntentRef.current = false;
    setVoiceControlLiftPx(0);
    if (recordSessionRef.current) {
      finalizeMediaRecording();
    }
  }

  function onVoiceControlPointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    if (!recordPressingRef.current) {
      return;
    }
    const lift = Math.max(0, voicePointerStartYRef.current - e.clientY);
    const isTouch = voicePointerTypeRef.current === "touch";
    const dragThreshold = isTouch ? 5 : 8;
    const maxLift = isTouch ? 28 : 20;
    voiceDragIntentRef.current = voiceDragIntentRef.current || lift > dragThreshold;
    setVoiceControlLiftPx(Math.min(maxLift, lift));
  }

  function onVoiceControlClick() {
    if (suppressNextVoiceClickRef.current) {
      suppressNextVoiceClickRef.current = false;
      return;
    }
    if (isRecordingMedia) {
      finalizeMediaRecording();
    }
  }

  async function sendPickedAttachment(
    file: File,
    isSendAsFile: boolean,
    caption: string,
  ) {
    if (!activeChat?.id) {
      return;
    }
    setSendingCompressed(true);
    setIsCompressing(true);
    try {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");

      // Для статичных изображений — через browser-image-compression.
      // Для видео, gif, документов — оригинал (либо если выбрано "как файл").
      const fileForSend = await compressImageIfNeeded(file, isSendAsFile);

      setIsCompressing(false);

      const url = URL.createObjectURL(fileForSend);
      attachmentUrlsRef.current.push(url);
      // Если «отправить как файл» — всегда kind="file", чтобы в чате
      // отображалась карточка-документ, а не встроенное медиа.
      const kind: "image" | "video" | "file" = isSendAsFile
        ? "file"
        : isImage
          ? "image"
          : isVideo
            ? "video"
            : "file";
      const wasCompressed = !isSendAsFile && COMPRESSIBLE_IMAGE_TYPES.has(file.type);
      sendMessage(caption.trim(), {
        kind,
        url,
        name: fileForSend.name,
        mime: fileForSend.type || "application/octet-stream",
        size: fileForSend.size,
        compressed: wasCompressed,
      });
      setPendingFile(null);
    } finally {
      setIsCompressing(false);
      setSendingCompressed(false);
    }
  }

  const trimmedDraft = draft.trim();
  const isRecordingVideoNote =
    isRecordingMedia && recordSessionRef.current?.kind === "video_note";
  const isPendingVideoNote = pendingRecordedAttachment?.kind === "video_note";
  const videoNoteRemainingSec = Math.max(
    0,
    VIDEO_NOTE_MAX_DURATION_SEC - recordingElapsedSec,
  );
  const showSendPlane = trimmedDraft.length > 0 || Boolean(pendingRecordedAttachment);
  const showVoiceUi = !pendingFile && !showSendPlane;

  useEffect(() => {
    if (!isRecordingVideoNote) {
      videoNoteAutoStopRef.current = false;
      return;
    }
    if (
      recordingElapsedSec >= VIDEO_NOTE_MAX_DURATION_SEC &&
      !videoNoteAutoStopRef.current
    ) {
      videoNoteAutoStopRef.current = true;
      finalizeMediaRecording();
    }
  }, [isRecordingVideoNote, recordingElapsedSec]);

  const chatListPanel = (
    <div className="flex h-full flex-col">
      <div className="border-b border-theme-border p-3 lg:px-2.5">
        <div className="lg:hidden">
          <label
            htmlFor="messages-search-mobile"
            className="flex min-w-0 items-center gap-2 rounded-xl border border-theme-border bg-theme-card-2 px-3 py-2"
          >
            <IconSearch className="h-4 w-4 shrink-0 text-theme-text-2" />
            <input
              id="messages-search-mobile"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск"
              className="min-w-0 flex-1 bg-transparent text-sm text-theme-text outline-none placeholder:text-theme-text-2"
            />
          </label>
        </div>
        <div className="hidden lg:block">
          <label
            htmlFor="messages-search"
            className="flex w-full min-w-0 items-center gap-2 rounded-xl border border-theme-border bg-theme-card-2 px-3 py-2"
          >
            <IconSearch className="h-4 w-4 shrink-0 text-theme-text-2" />
            <input
              id="messages-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск"
              aria-label="Поиск по чатам"
              className="min-w-0 flex-1 bg-transparent text-sm text-theme-text outline-none placeholder:text-theme-text-2"
            />
          </label>
        </div>
      </div>
      <ul className="flex-1 overflow-y-auto overflow-x-hidden">
        {filteredChats.map((chat) => {
          const active = chat.id === desktopActiveChatId;
          const dotCls = presenceDotClass(chat.presence);
          const isTyping = Boolean(typingByChatId[chat.id]);
          return (
            <li key={chat.id}>
              <button
                type="button"
                onClick={() => openChat(chat.id)}
                className={cn(
                  "flex w-full items-center gap-3 border-b border-theme-border px-4 py-3 text-left transition-[background-color,transform] duration-150 lg:px-0.5 lg:py-2",
                  "lg:gap-2",
                  expandedLeftPane
                    ? "lg:items-start lg:justify-start"
                    : "lg:justify-center",
                  active ? "bg-theme-card-2" : "hover:bg-theme-hover active:scale-[0.985]",
                )}
                title={`${chat.name} (@${chat.handle})`}
              >
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-theme-border bg-theme-card-2 text-sm text-theme-text lg:h-11 lg:w-11">
                  {avatarFallback(chat.name)}
                  {dotCls ? (
                    <span
                      className={cn(
                        "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-[#202020]",
                        dotCls,
                      )}
                    />
                  ) : null}
                  {chat.unread > 0 ? (
                    <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--accent-primary)] px-1 text-[10px] font-semibold text-white shadow-sm">
                      {chat.unread > 99 ? "99+" : chat.unread}
                    </span>
                  ) : null}
                </div>
                <div className={cn("min-w-0 flex-1", !expandedLeftPane && "lg:hidden")}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-theme-text">{chat.name}</p>
                    <span className="shrink-0 text-[11px] text-theme-text-2">{chat.lastAt}</span>
                  </div>
                  <p
                    className={cn(
                      "truncate text-xs",
                      isTyping ? "text-emerald-400" : "text-theme-text-2",
                    )}
                  >
                    {chatSubtitle(chat, isTyping)}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-theme-text-2">{chat.lastMessage}</p>
                </div>
              </button>
            </li>
          );
        })}
        {filteredChats.length === 0 ? (
          <li className="px-4 py-10 text-center text-sm text-theme-text-2">Чаты не найдены</li>
        ) : null}
      </ul>
    </div>
  );

  const chatViewPanel = activeChat ? (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {headerMenuOpen ? (
        <button
          type="button"
          className="absolute inset-0 z-[8] cursor-default border-0 bg-black/30 p-0"
          aria-label="Закрыть меню чата"
          onClick={() => setHeaderMenuOpen(false)}
        />
      ) : null}

      <header className="relative z-10 flex shrink-0 items-center gap-3 border-b border-theme-border px-4 py-3">
        <button
          type="button"
          className="mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-xl text-theme-text-2 transition-[color,background-color,transform] duration-150 hover:bg-theme-hover hover:text-theme-text active:scale-90 lg:hidden"
          onClick={closeChat}
          aria-label="Назад к чатам"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
            <path
              d="M15 18l-6-6 6-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-theme-border bg-theme-card-2 text-sm text-theme-text">
          {avatarFallback(activeChat.name)}
          {presenceDotClass(activeChat.presence) ? (
            <span
              className={cn(
                "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-[#1e1e1e]",
                presenceDotClass(activeChat.presence),
              )}
            />
          ) : null}
        </div>
        <div className="relative flex min-w-0 flex-1 items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-theme-text">{activeChat.name}</p>
            <p
              className={cn(
                "truncate text-xs",
                activeChatTyping ? "text-emerald-400" : "text-theme-text-2",
              )}
            >
              {chatSubtitle(activeChat, activeChatTyping)}
            </p>
          </div>
          <div className="shrink-0">
            <button
              type="button"
              className="grid h-8 w-8 place-items-center rounded-xl text-theme-text-2 transition-[color,background-color,transform] duration-150 hover:bg-theme-hover hover:text-theme-text active:scale-90"
              aria-label="Действия с чатом"
              aria-expanded={headerMenuOpen}
              aria-haspopup="menu"
              onClick={() => setHeaderMenuOpen((v) => !v)}
            >
              <IconDotsHorizontal className="h-4 w-4" />
            </button>
          </div>

          {headerMenuOpen ? (
            <div
              role="menu"
              aria-orientation="vertical"
              className="absolute right-0 top-full z-[20] mt-1.5 w-56 max-w-[min(14rem,calc(100%-0.25rem))] overflow-hidden rounded-2xl border border-theme-border bg-theme-card py-1 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-theme-text transition-[background-color,transform] duration-150 hover:bg-theme-hover active:scale-[0.97]"
                onClick={() => initiateDmCall("audio")}
              >
                <IconPhoneOutline className="h-4 w-4 shrink-0 text-theme-text-2" />
                <span>Позвонить</span>
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-theme-text transition-[background-color,transform] duration-150 hover:bg-theme-hover active:scale-[0.97]"
                onClick={() => initiateDmCall("video")}
              >
                <IconVideoOutline className="h-4 w-4 shrink-0 text-theme-text-2" />
                <span>Видеозвонок</span>
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-theme-text transition-[background-color,transform] duration-150 hover:bg-theme-hover active:scale-[0.97]"
                onClick={() => setHeaderMenuOpen(false)}
              >
                <IconSearch className="h-4 w-4 shrink-0 text-theme-text-2" />
                <span>Поиск</span>
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-theme-text transition-[background-color,transform] duration-150 hover:bg-theme-hover active:scale-[0.97]"
                onClick={() => {
                  setHeaderMenuOpen(false);
                  messagesScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                <IconChevronsUp className="h-4 w-4 shrink-0 text-theme-text-2" />
                <span>В начало</span>
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-red-300/95 transition-[background-color,transform] duration-150 hover:bg-red-600/15 active:scale-[0.97]"
                onClick={() => {
                  setHeaderMenuOpen(false);
                  setConfirmClearOpen(true);
                }}
              >
                <IconClearHistory className="h-4 w-4 shrink-0 text-red-400/90" />
                <span>Очистить историю</span>
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-red-400 transition-[background-color,transform] duration-150 hover:bg-red-700/18 active:scale-[0.97]"
                onClick={() => {
                  setHeaderMenuOpen(false);
                  setConfirmDeleteOpen(true);
                }}
              >
                <IconTrashOutline className="h-4 w-4 shrink-0 text-red-400/95" />
                <span>Удалить чат</span>
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <div
        ref={messagesScrollRef}
        className="relative z-[1] flex-1 space-y-3 overflow-y-auto overflow-x-hidden bg-theme-bg px-4 py-4"
      >
        {messages.map((message) => {
          const forwardedPost: ForwardedFeedPost | null = message.forwardEmbed
            ? {
                comment: message.forwardEmbed.comment ?? null,
                author: message.forwardEmbed.authorLine,
                summary: message.forwardEmbed.summaryLine,
                body: message.forwardEmbed.bodyLine,
                mediaUrls: message.forwardEmbed.mediaUrls,
                postId: message.forwardEmbed.postId,
                postDate: message.forwardEmbed.postCreatedAt,
                pollPreview: message.forwardEmbed.pollPreview,
              }
            : message.attachment
              ? null
              : parseForwardedFeedPost(message.text);
          const isVoiceOnly =
            !message.text.trim() && message.attachment?.kind === "voice";
          const showMessageBubble =
            message.text.trim().length > 0 || isVoiceOnly;
          const emojiParts = showMessageBubble && !message.attachment
            ? splitEmojiAware(message.text).filter(
                (p) => p.kind === "emoji" || p.value.trim().length > 0,
              )
            : [];
          const emojiOnlyMessage = emojiParts.length > 0 && emojiParts.every((p) => p.kind === "emoji");
          const singleEmojiMessage = emojiOnlyMessage && emojiParts.length === 1;
          const multiEmojiMessage = emojiOnlyMessage && emojiParts.length > 1;

          // Bubble: одиночный смайлик — без фона/рамки
          const hasBubble = showMessageBubble && !singleEmojiMessage;

          // Lazy-init начальный набор ID для этого чата
          const chatId = activeChat!.id;
          if (!initialMsgIds.current.has(chatId)) {
            initialMsgIds.current.set(chatId, new Set(messages.map((m) => m.id)));
          }
          const isNew = !initialMsgIds.current.get(chatId)!.has(message.id);
          const msgAnim = isNew
            ? (message.fromMe
                ? "aegis-msg-in-me 0.24s cubic-bezier(0.25, 1, 0.5, 1)"
                : "aegis-msg-in-other 0.24s cubic-bezier(0.25, 1, 0.5, 1)")
            : undefined;

          return (
          <div
            key={message.id}
            style={msgAnim ? { animation: msgAnim } : undefined}
            className={cn("flex", message.fromMe ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "text-sm leading-relaxed",
                forwardedPost
                  ? "w-2/3 min-w-0 shrink-0"
                  : "max-w-[82%]",
                hasBubble
                  ? isVoiceOnly
                    ? "rounded-[18px] px-2.5 py-2"
                    : "rounded-2xl px-3 py-2"
                  : "px-0 py-0",
                message.fromMe
                  ? hasBubble
                    ? forwardedPost
                      ? "rounded-2xl rounded-br-md border-transparent bg-transparent px-1 py-1 text-[var(--text-primary)] shadow-none"
                      : "rounded-br-md bg-[var(--dm-bubble-bg)] text-white shadow-[0_1px_6px_rgba(0,0,0,0.18)]"
                    : "text-[var(--text-primary)]"
                  : hasBubble
                    ? forwardedPost
                      ? "rounded-2xl rounded-bl-md border-transparent bg-transparent px-1 py-1 text-theme-text shadow-none"
                      : "rounded-bl-md bg-theme-card-2 text-theme-text"
                    : "text-theme-text",
              )}
            >
              {message.text ? (
                forwardedPost ? (
                  <DmTelegramStyleForwardCard
                    fromMe={message.fromMe}
                    data={forwardedPost}
                    onOpenPost={() => {
                      const pid = forwardedPost.postId;
                      if (!pid) {
                        setScreen("feed");
                        return;
                      }
                      const post = usePostsStore
                        .getState()
                        .posts.find((p) => p.id === pid);
                      if (!post) {
                        setScreen("feed");
                        return;
                      }
                      navigateToFeedWithPostComments(post.seq);
                    }}
                  />
                ) : (
                singleEmojiMessage ? (
                  // Один смайлик — большой, без фона
                  <div className="flex items-end gap-1.5">
                    <div className="leading-none" style={{ fontSize: "2.8em" }}>
                      <MarkdownEmojiText text={message.text} emojiSize="2.8em" />
                    </div>
                    <p
                      className={cn(
                        "mb-[2px] flex shrink-0 items-center gap-1 text-[13px] leading-none lg:text-[12px]",
                        message.fromMe ? "text-white/65" : "text-theme-text-2",
                      )}
                    >
                      <span>{message.time}</span>
                      {message.fromMe && message.status ? (
                        <MessageStatusTicks status={message.status} />
                      ) : null}
                    </p>
                  </div>
                ) : multiEmojiMessage ? (
                  // Несколько смайликов — в bubble, время снизу
                  <>
                    <div className="leading-snug" style={{ fontSize: "1.65em" }}>
                      <MarkdownEmojiText text={message.text} emojiSize="1.65em" />
                    </div>
                    <p
                      className={cn(
                        "mt-0.5 flex items-center justify-end gap-1 text-[13px] leading-none lg:text-[12px]",
                        message.fromMe ? "text-white/65" : "text-theme-text-2",
                      )}
                    >
                      <span>{message.time}</span>
                      {message.fromMe && message.status ? (
                        <MessageStatusTicks status={message.status} />
                      ) : null}
                    </p>
                  </>
                ) : (
                  // Текст (с возможными смайликами) — inline время
                  <div className="flex min-w-0 items-end gap-2">
                    <div className="min-w-0 flex-1 text-[15px] leading-snug">
                      <MarkdownEmojiText
                        text={message.text}
                        emojiSize="1.24em"
                      />
                    </div>
                    <p
                      className={cn(
                        "mb-[1px] flex shrink-0 items-center gap-1 text-[13px] leading-none lg:text-[12px]",
                        message.fromMe ? "text-white/65" : "text-theme-text-2",
                      )}
                    >
                      <span>{message.time}</span>
                      {message.fromMe && message.status ? (
                        <MessageStatusTicks status={message.status} />
                      ) : null}
                    </p>
                  </div>
                )
                )
              ) : null}
              {message.attachment ? (
                (() => {
                  const a = message.attachment;
                  if (a.kind === "voice") {
                    return (
                      <div className={cn(message.text ? "mt-2" : "")}>
                        <VoiceAttachmentPlayer
                          src={a.url}
                          durationSec={a.durationSec}
                          fromMe={message.fromMe}
                          messageTime={isVoiceOnly ? message.time : undefined}
                          status={isVoiceOnly ? message.status : undefined}
                        />
                      </div>
                    );
                  }
                  if (a.kind === "video_note") {
                    return (
                      <VideoNoteCirclePlayer
                        src={a.url}
                        durationSec={a.durationSec}
                        className={message.text ? "mt-2" : ""}
                      />
                    );
                  }
                  if (a.kind === "image") {
                    return (
                      <button
                        type="button"
                        className={cn(
                          "group block w-full overflow-hidden rounded-xl border border-theme-border transition-all duration-150 hover:border-theme-border hover:brightness-105 active:scale-[0.99] active:brightness-95",
                          message.text ? "mt-2" : "",
                        )}
                        aria-label="Открыть изображение"
                        onClick={() => setDmImagePreview({ urls: [a.url], index: 0 })}
                      >
                        <img
                          src={a.url}
                          alt=""
                          className="max-h-[min(70vh,420px)] w-full object-cover transition-transform duration-200 group-hover:scale-[1.01]"
                        />
                      </button>
                    );
                  }
                  if (a.kind === "video") {
                    return (
                      <div className={cn(message.text ? "mt-2" : "")}>
                        <video
                          src={a.url}
                          className="max-h-[min(70vh,420px)] w-full rounded-xl border border-theme-border object-cover"
                          controls
                          playsInline
                          preload="metadata"
                        />
                      </div>
                    );
                  }
                  return (
                    <div
                      className={cn(
                        "rounded-xl border border-theme-border bg-theme-hover p-2",
                        message.text ? "mt-2" : "",
                      )}
                    >
                      <p className="truncate text-xs text-theme-text">{a.name}</p>
                      <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-theme-text-2">
                        <span>{formatFileSize(a.size)}</span>
                        <a
                          href={a.url}
                          download={a.name}
                          className="rounded-full border border-theme-border px-2 py-0.5 text-theme-text-2 hover:bg-theme-hover"
                        >
                          Скачать
                        </a>
                      </div>
                    </div>
                  );
                })()
              ) : null}
              {!message.text || forwardedPost ? (
                !isVoiceOnly ? (
                <p
                  className={cn(
                    "mt-1 flex items-center justify-end gap-1 text-[13px] leading-none lg:text-[12px]",
                    message.fromMe ? "text-white/65" : "text-theme-text-2",
                  )}
                >
                  <span>{message.time}</span>
                  {message.fromMe && message.status ? (
                    <MessageStatusTicks status={message.status} />
                  ) : null}
                </p>
                ) : null
              ) : null}
            </div>
          </div>
          );
        })}
      </div>
      {isRecordingVideoNote ? (
        <div className="pointer-events-none absolute inset-x-0 top-[72px] bottom-[92px] z-[6] grid place-items-center">
          <div className="relative">
            <video
              ref={recordingPreviewVideoRef}
              muted
              playsInline
              autoPlay
              className="h-[300px] w-[300px] rounded-full bg-black object-cover shadow-[0_20px_50px_rgba(0,0,0,0.55)] [transform:scaleX(-1)] sm:h-[320px] sm:w-[320px]"
            />
            <svg
              viewBox="0 0 100 100"
              className="absolute -inset-[10px] h-[320px] w-[320px] sm:h-[340px] sm:w-[340px]"
              aria-hidden
            >
              {(() => {
                const r = 48;
                const c = Math.PI * 2 * r;
                const progress = 1 - videoNoteRemainingSec / VIDEO_NOTE_MAX_DURATION_SEC;
                return (
                  <circle
                    cx="50"
                    cy="50"
                    r={r}
                    fill="none"
                    stroke="white"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                    strokeDasharray={`${Math.max(0.01, c * progress)} ${c}`}
                    strokeDashoffset="0"
                    className="transition-[stroke-dasharray] duration-75 ease-linear"
                  />
                );
              })()}
            </svg>
            <div className="absolute inset-0 rounded-full ring-1 ring-black/35" aria-hidden />
          </div>
        </div>
      ) : null}

      <footer className="mt-auto border-t border-theme-border bg-theme-card p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-1.5 rounded-2xl border border-theme-border bg-theme-card-2 px-2 py-1.5">
          <input
            ref={fileInputRef}
            type="file"
            className="sr-only"
            onChange={(e) => {
              handlePickFile(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-theme-text-2 transition-[color,background-color,transform] duration-150 hover:bg-theme-hover hover:text-theme-text active:scale-90"
            aria-label="Прикрепить файл"
            onClick={() => fileInputRef.current?.click()}
          >
            <IconPaperclip className="h-[18px] w-[18px]" />
          </button>
          {isRecordingMedia || pendingRecordedAttachment ? (
            <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl bg-theme-bg px-2.5 py-2">
              {!isRecordingVideoNote && !isPendingVideoNote ? (
                <span
                  className={cn(
                    "h-2.5 w-2.5 shrink-0 rounded-full bg-red-500",
                    isRecordingMedia && "animate-pulse",
                  )}
                  aria-hidden
                />
              ) : null}
              {!isRecordingVideoNote && !isPendingVideoNote ? (
                <span className="shrink-0 font-mono text-xs text-theme-text">
                  {formatVoiceClock(
                    isRecordingMedia
                      ? recordingElapsedSec
                      : (pendingRecordedAttachment?.durationSec ?? 0),
                  )}
                </span>
              ) : null}
              {isRecordingVideoNote ? (
                <div className="min-w-0 flex-1" />
              ) : pendingRecordedAttachment?.kind === "video_note" ? (
                <div className="flex min-w-0 flex-1 items-center">
                  <span className="truncate text-xs text-theme-text-2">
                    Кружок готов к отправке
                  </span>
                </div>
              ) : (
                <div
                  className="grid h-6 min-w-0 flex-1 items-center gap-x-[2px]"
                  style={{ gridTemplateColumns: `repeat(${recordingBars.length}, minmax(2px, 1fr))` }}
                >
                  {recordingBars.map((bar, i) => {
                    const t =
                      recordingBars.length > 1 ? i / (recordingBars.length - 1) : 0;
                    const edgeDist = Math.abs(t * 2 - 1); // 0 в центре, 1 на краях
                    const envelope = 1 - edgeDist * 0.72; // волновой профиль по ширине
                    const h = Math.min(16, 2 + bar * 14 * envelope + envelope * 2.6);
                    return (
                      <span
                        key={i}
                        className="mx-auto w-[2px] rounded-[2px] bg-neutral-400/80 transition-[height,opacity] duration-75"
                        style={{
                          height: `${h}px`,
                          opacity: 0.3 + bar * 0.7,
                        }}
                      />
                    );
                  })}
                </div>
              )}
              <button
                type="button"
                className="shrink-0 text-xs text-theme-text-2 transition-[color,transform] duration-150 hover:text-theme-text active:scale-90"
                onClick={() =>
                  isRecordingMedia
                    ? finalizeMediaRecording({ discard: true })
                    : clearPendingRecordedAttachment()
                }
              >
                Отмена
              </button>
            </div>
          ) : (
            <>
              <textarea
                ref={textareaRef}
                rows={1}
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  if (fmtOpen && e.target.selectionStart === e.target.selectionEnd) {
                    closeFormatModal();
                  }
                }}
                onMouseUp={scheduleFormatOpen}
                onSelect={scheduleFormatOpen}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendComposerMessage();
                  }
                }}
                placeholder="Написать сообщение..."
                className="m-0 max-h-28 min-h-[40px] min-w-0 flex-1 resize-none bg-transparent px-1.5 py-2.5 text-sm leading-5 text-theme-text outline-none placeholder:text-theme-text-2"
              />
              <button
                type="button"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-theme-text-2 transition-[color,background-color,transform] duration-150 hover:bg-theme-hover hover:text-theme-text active:scale-90"
                aria-label="Эмодзи"
                onClick={() => setEmojiOpen(true)}
              >
                <IconSmile className="h-[18px] w-[18px]" />
              </button>
            </>
          )}
          {showSendPlane ? (
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-xl text-theme-text-2 transition-[color,background-color,transform] duration-150 hover:bg-theme-hover hover:text-theme-text active:scale-90"
              onClick={() => {
                if (pendingRecordedAttachment) {
                  sendRecordedByMic();
                } else {
                  sendComposerMessage();
                }
              }}
              aria-label={
                pendingRecordedAttachment ? "Отправить запись" : "Отправить"
              }
            >
              <IconSendPlane className="h-5 w-5" />
            </button>
          ) : showVoiceUi ? (
            <button
              type="button"
              className={cn(
                "grid h-9 w-9 place-items-center rounded-xl text-theme-text-2 transition-[color,background-color,transform,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] select-none touch-none",
                isRecordingMedia
                  ? "bg-red-600/20 text-red-200 ring-2 ring-red-500/55"
                  : "hover:bg-theme-hover hover:text-theme-text",
                voiceControlLiftPx > 1 &&
                  "z-10 bg-red-600/25 text-red-100 shadow-[0_8px_20px_rgba(239,68,68,0.35)] ring-2 ring-red-500/60",
              )}
              style={{
                transform:
                  voiceControlLiftPx > 0
                    ? `translateY(${-voiceControlLiftPx}px) scale(${1 + voiceControlLiftPx * 0.0045})`
                    : undefined,
              }}
              onPointerDown={onVoiceControlPointerDown}
              onPointerMove={onVoiceControlPointerMove}
              onPointerUp={onVoiceControlPointerUp}
              onPointerCancel={onVoiceControlPointerCancel}
              onClick={onVoiceControlClick}
              aria-label={
                isRecordingMedia
                  ? "Отпустите, чтобы остановить запись"
                  : voiceUiMode === "circle"
                    ? "Видеокружок: удерживайте для записи, нажмите для голоса"
                    : "Голос: удерживайте для записи, нажмите для видеокружка"
              }
            >
              {voiceUiMode === "circle" ? (
                <IconVideoCircle className="h-[18px] w-[18px]" />
              ) : (
                <IconMic className="h-[18px] w-[18px]" />
              )}
            </button>
          ) : (
            <div className="h-9 w-9 shrink-0" aria-hidden />
          )}
        </div>
      </footer>
    </div>
  ) : (
    <div className="grid flex-1 place-items-center bg-theme-bg p-6 text-center">
      <div>
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-theme-card-2 text-theme-text-2">
          <IconMessages className="h-6 w-6" />
        </div>
        <p className="text-sm text-theme-text-2">Выберите чат, чтобы начать переписку</p>
      </div>
    </div>
  );

  return (
    <div className="itd-messages-root flex min-h-0 flex-col overflow-hidden font-sans text-theme-text lg:h-[calc(100dvh-4.5rem)] lg:min-h-[calc(100dvh-4.5rem)]">
      <EmojiMartModal
        open={emojiOpen}
        onClose={() => setEmojiOpen(false)}
        onPick={insertEmoji}
      />
      <TextFormatSelectionModal
        open={fmtOpen}
        snapshot={fmtSnap}
        text={draft}
        textareaRef={textareaRef}
        onApply={(next) => {
          setDraft(next);
        }}
        onClose={closeFormatModal}
      />

      {dmImagePreview && (
        <PostImagePreview
          urls={dmImagePreview.urls}
          initialIndex={dmImagePreview.index}
          onClose={() => setDmImagePreview(null)}
        />
      )}

      <SendMediaAttachmentModal
        open={pendingFile !== null}
        file={pendingFile}
        compressing={isCompressing}
        sending={sendingCompressed && !isCompressing}
        onClose={() => setPendingFile(null)}
        onSend={async ({ file, asDocument, caption }) => {
          await sendPickedAttachment(file, asDocument, caption);
        }}
      />

      <MessengerConfirmModal
        open={confirmClearOpen}
        title="Очистить историю чата?"
        description="Сообщения этого диалога будут удалены только для вас."
        confirmLabel="Очистить"
        cancelLabel="Отмена"
        variant="danger"
        onConfirm={() => {
          if (activeChat) {
            clearChatMessagesStore(activeChat.id);
          }
          setConfirmClearOpen(false);
        }}
        onClose={() => setConfirmClearOpen(false)}
      />
      <MessengerConfirmModal
        open={confirmDeleteOpen}
        title="Удалить чат?"
        description="Диалог полностью исчезнет из списка. Сообщения для собеседника могут сохраниться."
        confirmLabel="Удалить чат"
        cancelLabel="Отмена"
        variant="danger"
        onConfirm={() => {
          if (activeChat) {
            removeChatStore(activeChat.id);
          }
          setConfirmDeleteOpen(false);
          setHeaderMenuOpen(false);
          setActiveChatId(null);
          setMobileChatOpen(false);
        }}
        onClose={() => setConfirmDeleteOpen(false)}
      />

      {/* Заголовок: скрываем при полноэкранном чате на мобильном */}
      <h1
        className={cn(
          "mb-4 text-2xl font-bold tracking-tight lg:mb-2",
          !isDesktopLg && mobileChatOpen && "hidden",
        )}
      >
        Сообщения
      </h1>

      {!isDesktopLg ? (
        <div
          className="min-h-0 flex-1 overflow-hidden"
        >
          {!mobileChatOpen ? (
            <section className="h-full overflow-hidden rounded-3xl border border-theme-border bg-theme-card">
              {chatListPanel}
            </section>
          ) : (
            <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-theme-border bg-theme-card">
              {chatViewPanel}
            </section>
          )}
        </div>
      ) : (
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-theme-border bg-theme-card">
          <div
            ref={panelRef}
            className="grid min-h-0 w-full flex-1 lg:[grid-template-columns:var(--messages-cols)]"
            style={{ ["--messages-cols" as string]: `${leftPaneWidth}px minmax(0, 8px) minmax(0, 1fr)` }}
          >
            <aside className="h-full overflow-hidden bg-theme-card">
              {chatListPanel}
            </aside>

            <div
              className="relative cursor-col-resize bg-theme-card"
              onMouseDown={() => setIsResizingPane(true)}
              role="separator"
              aria-orientation="vertical"
              aria-label="Изменить ширину панели чатов"
            />

            <div className="flex h-full min-h-0 flex-col overflow-hidden">
              {chatViewPanel}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
