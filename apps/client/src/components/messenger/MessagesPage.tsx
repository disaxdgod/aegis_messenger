import { EmojiMartModal } from "@/components/messenger/EmojiMartModal";
import { MarkdownEmojiText } from "@/components/messenger/MarkdownEmojiText";
import { MessengerConfirmModal } from "@/components/messenger/MessengerConfirmModal";
import { IconMessages, IconPaperclip, IconSearch, IconSmile } from "@/components/messenger/nav-icons";
import { splitEmojiAware } from "@/lib/split-emoji-text";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

type ChatItem = {
  id: string;
  name: string;
  handle: string;
  lastMessage: string;
  lastAt: string;
  unread: number;
  presence: "online" | "offline" | "dnd";
};

type MessageItem = {
  id: string;
  fromMe: boolean;
  text: string;
  time: string;
  status?: "sent" | "delivered" | "read";
  attachment?: {
    kind: "image" | "video" | "file" | "voice" | "video_note";
    url: string;
    name: string;
    mime: string;
    size: number;
    compressed: boolean;
    /** Длительность для голоса / видеокружка, сек. */
    durationSec?: number;
  };
};

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

const CHATS: ChatItem[] = [
  {
    id: "c-1",
    name: "Анна Петрова",
    handle: "ann_pet",
    lastMessage: "Отправила макет карточек, посмотри пожалуйста",
    lastAt: "21:14",
    unread: 2,
    presence: "online",
  },
  {
    id: "c-2",
    name: "Design Team",
    handle: "aegis_design",
    lastMessage: "Новая иконка репоста уже в папке design",
    lastAt: "20:58",
    unread: 0,
    presence: "dnd",
  },
  {
    id: "c-3",
    name: "Максим",
    handle: "max_dev",
    lastMessage: "Ок, после релиза подчищу store",
    lastAt: "18:06",
    unread: 0,
    presence: "offline",
  },
  {
    id: "c-4",
    name: "QA Squad",
    handle: "qa_team",
    lastMessage: "Проверили мобильный таббар, все ок",
    lastAt: "вчера",
    unread: 7,
    presence: "online",
  },
];

/** Список с подписями в узкой колонке (показываем текст раньше, чтобы не терять полезное место). */
const SIDEBAR_LIST_EXPANDED_MIN = 96;
const VIDEO_NOTE_MAX_DURATION_SEC = 60;

const MESSAGES_BY_CHAT: Record<string, MessageItem[]> = {
  "c-1": [
    { id: "m-1", fromMe: false, text: "Привет! Ты на месте?", time: "20:54" },
    {
      id: "m-2",
      fromMe: true,
      text: "Да, смотрю задачи по мессенджеру.",
      time: "20:56",
      status: "read",
    },
    {
      id: "m-3",
      fromMe: false,
      text: "Отправила макет карточек, посмотри пожалуйста",
      time: "21:14",
    },
  ],
  "c-2": [
    { id: "m-4", fromMe: false, text: "Новая иконка репоста уже в папке design", time: "20:58" },
    {
      id: "m-5",
      fromMe: true,
      text: "Отлично, сейчас подключу.",
      time: "21:01",
      status: "delivered",
    },
  ],
  "c-3": [
    {
      id: "m-6",
      fromMe: true,
      text: "Прогоню фиксы и вернусь к тебе",
      time: "17:51",
      status: "sent",
    },
    { id: "m-7", fromMe: false, text: "Ок, после релиза подчищу store", time: "18:06" },
  ],
  "c-4": [
    { id: "m-8", fromMe: false, text: "Проверили мобильный таббар, все ок", time: "вчера" },
  ],
};

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

function presenceLabel(presence: ChatItem["presence"]) {
  if (presence === "online") {
    return "В сети";
  }
  if (presence === "dnd") {
    return "Не беспокоить";
  }
  return "Не в сети";
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

function nowTimeLabel() {
  return new Date().toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MessageStatusTicks({ status }: { status: "sent" | "delivered" | "read" }) {
  const tone = status === "sent" ? "text-[#9AD0FF]" : "text-[#6BBFFF]";
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

function IconSendPlane({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <g fill="none" fillRule="evenodd">
        <path
          fill="currentColor"
          d="M5.739 15.754q-1.029 2.782-1.293 3.91c-.553 2.362-.956 2.894 1.107 1.771 2.062-1.122 12.046-6.683 14.274-7.919 2.904-1.611 2.942-1.485-.156-3.196-2.36-1.302-12.227-6.718-14.118-7.782-1.892-1.063-1.66-.59-1.107 1.772q.268 1.142 1.311 3.944a4 4 0 0 0 2.988 2.531l5.765 1.117a.1.1 0 0 1 0 .196l-5.778 1.116a4 4 0 0 0-2.993 2.54"
        />
      </g>
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
  className,
}: {
  src: string;
  durationSec?: number;
  fromMe: boolean;
  className?: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(() => (durationProp && durationProp > 0 ? durationProp : 0));

  const barCount = 52;
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

  const remaining = duration > 0 ? Math.max(0, duration - current) : 0;
  const timeLabel = duration > 0 ? formatVoiceClock(Math.floor(remaining)) : "—";

  return (
    <div
      className={cn(
        "flex min-w-[220px] max-w-[min(100%,340px)] items-center gap-2 rounded-2xl border px-2.5 py-2",
        fromMe
          ? "border-[color:var(--accent-primary)]/35 bg-[color:color-mix(in_srgb,var(--accent-primary)_18%,#1f2430)]"
          : "border-white/[0.08] bg-[#25262b]",
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
          "grid h-9 w-9 shrink-0 place-items-center rounded-full text-white shadow-sm transition-[transform,background-color] active:scale-95",
          "bg-[var(--accent-primary)] hover:brightness-110",
        )}
        aria-label={playing ? "Пауза" : "Воспроизвести"}
      >
        {playing ? (
          <VoicePauseGlyph className="h-[17px] w-[17px]" />
        ) : (
          <VoicePlayGlyph className="h-[18px] w-[18px] translate-x-[2px]" />
        )}
      </button>
      <div className="flex h-9 min-w-0 flex-1 items-center justify-center gap-[2px] px-0.5">
        {factors.map((f, i) => {
          const edge = activeThru - i;
          const playedFull = edge >= 1;
          const partial = edge > 0 && edge < 1;
          const hPx = Math.round(4 + f * 20);
          const opacity =
            playedFull ? 1 : partial ? 0.28 + edge * 0.72 : 0.26;
          return (
            <div
              key={i}
              className={cn(
                "w-[2px] shrink-0 rounded-full transition-[opacity,height,background-color] duration-100 ease-out",
                playedFull || partial ? "bg-[var(--accent-primary)]" : "bg-neutral-500/65",
              )}
              style={{ height: `${hPx}px`, opacity }}
            />
          );
        })}
      </div>
      <span
        className={cn(
          "min-w-[40px] shrink-0 rounded-md bg-black/20 px-1.5 py-0.5 text-center tabular-nums text-[11px] font-medium tracking-tight",
          fromMe ? "text-neutral-200" : "text-neutral-300",
        )}
      >
        {timeLabel}
      </span>
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

async function compressImageFile(file: File): Promise<File> {
  const imageUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Image load failed"));
      el.src = imageUrl;
    });
    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("No canvas context");
    }
    ctx.drawImage(img, 0, 0, width, height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (!result) {
          reject(new Error("Canvas export failed"));
          return;
        }
        resolve(result);
      }, "image/jpeg", 0.78);
    });
    const base = file.name.replace(/\.[^.]+$/u, "");
    return new File([blob], `${base}-compressed.jpg`, { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
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
  const [chats, setChats] = useState(CHATS);
  const [messagesByChat, setMessagesByChat] = useState(MESSAGES_BY_CHAT);
  const [query, setQuery] = useState("");
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingRecordedAttachment, setPendingRecordedAttachment] =
    useState<PendingRecordedAttachment | null>(null);
  const [sendingCompressed, setSendingCompressed] = useState(false);
  const [leftPaneWidth, setLeftPaneWidth] = useState(92);
  const [isResizingPane, setIsResizingPane] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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
  const voiceUiModeRef = useRef(voiceUiMode);
  voiceUiModeRef.current = voiceUiMode;
  const expandedLeftPane = leftPaneWidth >= SIDEBAR_LIST_EXPANDED_MIN;

  function openChat(chatId: string) {
    setActiveChatId(chatId);
    setMobileChatOpen(true);
    setDraft("");
    setPendingFile(null);
    clearPendingRecordedAttachment();
    setVoiceUiMode("mic");
  }

  function closeChat() {
    setMobileChatOpen(false);
    setHeaderMenuOpen(false);
  }

  useEffect(() => {
    return () => {
      stopRecordingVisualizer();
      if (recordHoldTimerRef.current) {
        clearTimeout(recordHoldTimerRef.current);
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
      setLeftPaneWidth(Math.max(64, Math.min(180, next)));
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

  const filteredChats = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return chats;
    }
    return chats.filter(
      (chat) =>
        chat.name.toLowerCase().includes(needle) ||
        chat.handle.toLowerCase().includes(needle) ||
        chat.lastMessage.toLowerCase().includes(needle),
    );
  }, [query, chats]);

  const desktopActiveChatId = activeChatId ?? filteredChats[0]?.id ?? null;
  const activeChat =
    filteredChats.find((chat) => chat.id === desktopActiveChatId) ?? null;
  const messages = activeChat ? (messagesByChat[activeChat.id] ?? []) : [];

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

  function updateChatPreview(chatId: string, text: string, time: string) {
    setChats((prev) =>
      prev.map((chat) =>
        chat.id !== chatId
          ? chat
          : {
              ...chat,
              lastMessage: text,
              lastAt: time,
              unread: 0,
            },
      ),
    );
  }

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
    const time = nowTimeLabel();
    setMessagesByChat((prev) => ({
      ...prev,
      [targetChatId]: [
        ...(prev[targetChatId] ?? []),
        {
          id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          fromMe: true,
          text: clean,
          time,
          status: "sent",
          attachment,
        },
      ],
    }));
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
    updateChatPreview(targetChatId, previewText, time);
    const resetComposer =
      opts?.forChatId == null || (!!activeChat && opts.forChatId === activeChat.id);
    if (resetComposer) {
      setDraft("");
      setEmojiOpen(false);
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
        const barsCount = 28;
        const animateBars = () => {
          const node = recordAnalyserRef.current;
          const data = recordAnalyserDataRef.current;
          if (!node || !data) {
            return;
          }
          node.getByteTimeDomainData(data);
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
    if (pendingRecordedAttachment) {
      sendRecordedByMic();
      return;
    }
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
    if (pendingRecordedAttachment) {
      sendRecordedByMic();
      return;
    }
    if (isRecordingMedia) {
      finalizeMediaRecording();
    }
  }

  async function sendPendingAttachment(compress: boolean) {
    if (!pendingFile) {
      return;
    }
    if (compress) {
      setSendingCompressed(true);
    }
    try {
      const isImage = pendingFile.type.startsWith("image/");
      const isVideo = pendingFile.type.startsWith("video/");
      const fileForSend =
        compress && isImage ? await compressImageFile(pendingFile) : pendingFile;
      const url = URL.createObjectURL(fileForSend);
      attachmentUrlsRef.current.push(url);
      const kind: "image" | "video" | "file" = isImage ? "image" : isVideo ? "video" : "file";
      sendMessage("", {
        kind,
        url,
        name: fileForSend.name,
        mime: fileForSend.type || "application/octet-stream",
        size: fileForSend.size,
        compressed: compress && (isImage || isVideo),
      });
      setPendingFile(null);
    } finally {
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
  const showSendPlane = trimmedDraft.length > 0;
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
      <div className="border-b border-white/[0.06] p-3 lg:px-2.5">
        <div className="lg:hidden">
          <label
            htmlFor="messages-search-mobile"
            className="flex min-w-0 items-center gap-2 rounded-xl border border-white/[0.08] bg-[#2a2a2a] px-3 py-2"
          >
            <IconSearch className="h-4 w-4 shrink-0 text-neutral-500" />
            <input
              id="messages-search-mobile"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск"
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-neutral-600"
            />
          </label>
        </div>
        <div className="hidden lg:block">
          <label
            htmlFor="messages-search"
            className="flex w-full min-w-0 items-center gap-2 rounded-xl border border-white/[0.08] bg-[#2a2a2a] px-3 py-2"
          >
            <IconSearch className="h-4 w-4 shrink-0 text-neutral-500" />
            <input
              id="messages-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск"
              aria-label="Поиск по чатам"
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-neutral-600"
            />
          </label>
        </div>
      </div>
      <ul className="flex-1 overflow-y-auto overflow-x-hidden">
        {filteredChats.map((chat) => {
          const active = chat.id === desktopActiveChatId;
          const dotCls = presenceDotClass(chat.presence);
          return (
            <li key={chat.id}>
              <button
                type="button"
                onClick={() => openChat(chat.id)}
                className={cn(
                  "flex w-full items-center gap-3 border-b border-white/[0.04] px-4 py-3 text-left transition-colors lg:px-0.5 lg:py-2",
                  "lg:gap-2",
                  expandedLeftPane
                    ? "lg:items-start lg:justify-start"
                    : "lg:justify-center",
                  active ? "bg-[#2b2b2b]" : "hover:bg-white/[0.03]",
                )}
                title={`${chat.name} (@${chat.handle})`}
              >
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/[0.1] bg-[#2a2a2a] text-sm text-neutral-200 lg:h-11 lg:w-11">
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
                    <p className="truncate text-sm font-semibold text-white">{chat.name}</p>
                    <span className="shrink-0 text-[11px] text-neutral-500">{chat.lastAt}</span>
                  </div>
                  <p className="truncate text-xs text-neutral-500">{presenceLabel(chat.presence)}</p>
                  <p className="mt-0.5 truncate text-xs text-neutral-400">{chat.lastMessage}</p>
                </div>
              </button>
            </li>
          );
        })}
        {filteredChats.length === 0 ? (
          <li className="px-4 py-10 text-center text-sm text-neutral-500">Чаты не найдены</li>
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

      <header className="relative z-10 flex shrink-0 items-center gap-3 border-b border-white/[0.06] px-4 py-3">
        <button
          type="button"
          className="mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-xl text-neutral-400 transition-colors hover:bg-white/[0.06] hover:text-white lg:hidden"
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
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.1] bg-[#2a2a2a] text-sm text-neutral-200">
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
            <p className="truncate text-sm font-semibold text-white">{activeChat.name}</p>
            <p className="truncate text-xs text-neutral-500">{presenceLabel(activeChat.presence)}</p>
          </div>
          <div className="shrink-0">
            <button
              type="button"
              className="grid h-8 w-8 place-items-center rounded-xl text-neutral-400 transition-colors hover:bg-white/[0.06] hover:text-white"
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
              className="absolute right-0 top-full z-[20] mt-1.5 w-56 max-w-[min(14rem,calc(100%-0.25rem))] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#262626] py-1 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-neutral-200 hover:bg-white/[0.07]"
                onClick={() => setHeaderMenuOpen(false)}
              >
                <IconPhoneOutline className="h-4 w-4 shrink-0 text-neutral-400" />
                <span>Позвонить</span>
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-neutral-200 hover:bg-white/[0.07]"
                onClick={() => setHeaderMenuOpen(false)}
              >
                <IconVideoOutline className="h-4 w-4 shrink-0 text-neutral-400" />
                <span>Видеозвонок</span>
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-neutral-200 hover:bg-white/[0.07]"
                onClick={() => setHeaderMenuOpen(false)}
              >
                <IconSearch className="h-4 w-4 shrink-0 text-neutral-400" />
                <span>Поиск</span>
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-neutral-200 hover:bg-white/[0.07]"
                onClick={() => {
                  setHeaderMenuOpen(false);
                  messagesScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                <IconChevronsUp className="h-4 w-4 shrink-0 text-neutral-400" />
                <span>В начало</span>
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-red-300/95 hover:bg-red-600/15"
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
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-red-400 hover:bg-red-700/18"
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
        className="relative z-[1] flex-1 space-y-3 overflow-y-auto overflow-x-hidden bg-[#1d1d1d] px-4 py-4"
      >
        {messages.map((message) => {
          const showMessageBubble = message.text.trim().length > 0;
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

          return (
          <div
            key={message.id}
            className={cn("flex", message.fromMe ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[82%] text-sm leading-relaxed",
                hasBubble
                  ? "rounded-2xl px-3 py-2"
                  : "px-0 py-0",
                message.fromMe
                  ? hasBubble
                    ? "rounded-br-md border border-[var(--accent-primary)]/28 bg-[#356492] text-[var(--text-primary)] shadow-[0_1px_6px_rgba(0,0,0,0.22)]"
                    : "text-[var(--text-primary)]"
                  : hasBubble
                    ? "rounded-bl-md bg-[#2a2a2a] text-neutral-200"
                    : "text-neutral-200",
              )}
            >
              {message.text ? (
                singleEmojiMessage ? (
                  // Один смайлик — большой, без фона
                  <div className="flex items-end gap-1.5">
                    <div className="leading-none" style={{ fontSize: "2.8em" }}>
                      <MarkdownEmojiText text={message.text} emojiSize="2.8em" />
                    </div>
                    <p
                      className={cn(
                        "mb-[2px] flex shrink-0 items-center gap-1 text-[13px] leading-none lg:text-[12px]",
                        message.fromMe ? "text-[#9AD0FF] lg:text-[#7FC1FF]" : "text-neutral-400",
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
                        message.fromMe ? "text-[#9AD0FF] lg:text-[#7FC1FF]" : "text-neutral-400",
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
                      <MarkdownEmojiText text={message.text} emojiSize="1.15em" />
                    </div>
                    <p
                      className={cn(
                        "mb-[1px] flex shrink-0 items-center gap-1 text-[13px] leading-none lg:text-[12px]",
                        message.fromMe ? "text-[#9AD0FF] lg:text-[#7FC1FF]" : "text-neutral-400",
                      )}
                    >
                      <span>{message.time}</span>
                      {message.fromMe && message.status ? (
                        <MessageStatusTicks status={message.status} />
                      ) : null}
                    </p>
                  </div>
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
                  const compactMedia =
                    a.compressed && (a.kind === "image" || a.kind === "video");
                  if (compactMedia) {
                    return (
                      <div
                        className={cn(
                          "flex min-w-0 gap-3 rounded-xl p-2.5",
                          message.text ? "mt-2" : "",
                          message.fromMe ? "bg-black/18" : "bg-black/22",
                        )}
                      >
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-black/35 ring-1 ring-white/[0.08]">
                          {a.kind === "image" ? (
                            <img src={a.url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <video
                              src={a.url}
                              className="h-full w-full object-cover"
                              muted
                              playsInline
                              preload="metadata"
                            />
                          )}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
                          <p className="truncate text-sm font-semibold text-white">{a.name}</p>
                          <p className="text-xs text-neutral-400">{formatFileSize(a.size)}</p>
                          <a
                            href={a.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 w-fit text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--link-color)] hover:text-[var(--accent-hover)]"
                          >
                            Открыть
                          </a>
                        </div>
                      </div>
                    );
                  }
                  if (a.kind === "image") {
                    return (
                      <div className={cn("space-y-2", message.text ? "mt-2" : "")}>
                        <img
                          src={a.url}
                          alt={a.name}
                          className="max-h-56 w-full rounded-xl border border-white/10 object-cover"
                        />
                        <div className="flex items-center justify-between gap-2 text-[11px] text-neutral-400">
                          <span className="truncate">
                            Изображение как файл · {formatFileSize(a.size)}
                          </span>
                          <a
                            href={a.url}
                            download={a.name}
                            className="shrink-0 rounded-full border border-white/15 px-2 py-0.5 text-neutral-300 hover:bg-white/5"
                          >
                            Скачать
                          </a>
                        </div>
                      </div>
                    );
                  }
                  if (a.kind === "video") {
                    return (
                      <div className={cn("space-y-2", message.text ? "mt-2" : "")}>
                        <video
                          src={a.url}
                          className="max-h-56 w-full rounded-xl border border-white/10 object-cover"
                          controls
                          playsInline
                          preload="metadata"
                        />
                        <div className="flex items-center justify-between gap-2 text-[11px] text-neutral-400">
                          <span className="truncate">Видео · {formatFileSize(a.size)}</span>
                          <a
                            href={a.url}
                            download={a.name}
                            className="shrink-0 rounded-full border border-white/15 px-2 py-0.5 text-neutral-300 hover:bg-white/5"
                          >
                            Скачать
                          </a>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div
                      className={cn(
                        "rounded-xl border border-white/10 bg-black/10 p-2",
                        message.text ? "mt-2" : "",
                      )}
                    >
                      <p className="truncate text-xs text-neutral-300">{a.name}</p>
                      <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-neutral-400">
                        <span>{formatFileSize(a.size)}</span>
                        <a
                          href={a.url}
                          download={a.name}
                          className="rounded-full border border-white/15 px-2 py-0.5 text-neutral-300 hover:bg-white/5"
                        >
                          Скачать
                        </a>
                      </div>
                    </div>
                  );
                })()
              ) : null}
              {!message.text ? (
                <p
                  className={cn(
                    "mt-1 flex items-center justify-end gap-1 text-[13px] leading-none lg:text-[12px]",
                    message.fromMe ? "text-[#9AD0FF] lg:text-[#7FC1FF]" : "text-neutral-400",
                  )}
                >
                  <span>{message.time}</span>
                  {message.fromMe && message.status ? (
                    <MessageStatusTicks status={message.status} />
                  ) : null}
                </p>
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

      <footer className="mt-auto border-t border-white/[0.06] bg-[#202020] p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        {pendingFile ? (
          <div className="mb-2 rounded-xl border border-white/[0.08] bg-[#2a2a2a] p-2.5">
            <p className="truncate text-xs text-neutral-300">
              Вложение: {pendingFile.name} · {formatFileSize(pendingFile.size)}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {pendingFile.type.startsWith("image/") || pendingFile.type.startsWith("video/") ? (
                <>
                  <button
                    type="button"
                    className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-neutral-200 hover:bg-white/5"
                    onClick={() => sendPendingAttachment(false)}
                  >
                    Отправить как файл
                  </button>
                  <button
                    type="button"
                    disabled={sendingCompressed}
                    className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-black hover:bg-neutral-200 disabled:opacity-60"
                    onClick={() => sendPendingAttachment(true)}
                  >
                    {sendingCompressed ? "Сжимаю..." : "Сжать и отправить"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-black hover:bg-neutral-200"
                  onClick={() => sendPendingAttachment(false)}
                >
                  Отправить файл
                </button>
              )}
              <button
                type="button"
                className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-neutral-400 hover:bg-white/5"
                onClick={() => setPendingFile(null)}
              >
                Отмена
              </button>
            </div>
          </div>
        ) : null}
        <div className={cn("flex gap-2 rounded-2xl border border-white/[0.08] bg-[#2a2a2a] p-2", isRecordingMedia ? "items-center" : "items-end")}>
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
            className="rounded-lg p-2 text-neutral-500 transition-colors hover:bg-white/[0.06] hover:text-neutral-200"
            aria-label="Прикрепить файл"
            onClick={() => fileInputRef.current?.click()}
          >
            <IconPaperclip className="h-[18px] w-[18px]" />
          </button>
          {isRecordingMedia || pendingRecordedAttachment ? (
            <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl bg-[#1f1f1f] px-2.5 py-2">
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
                <span className="shrink-0 font-mono text-xs text-neutral-200">
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
                  <span className="truncate text-xs text-neutral-300">
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
                className="shrink-0 text-xs text-neutral-400 transition-colors hover:text-neutral-200"
                onClick={() =>
                  isRecordingMedia
                    ? finalizeMediaRecording({ discard: true })
                    : clearPendingRecordedAttachment()
                }
              >
                Отмена
              </button>
              {!isRecordingMedia && pendingRecordedAttachment ? (
                <button
                  type="button"
                  className="shrink-0 text-xs text-neutral-200 transition-colors hover:text-white"
                  onClick={sendRecordedByMic}
                >
                  Отправить
                </button>
              ) : null}
            </div>
          ) : (
            <>
              <textarea
                ref={textareaRef}
                rows={1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendComposerMessage();
                  }
                }}
                placeholder="Написать сообщение..."
                className="max-h-28 min-h-[36px] flex-1 resize-none bg-transparent px-1 py-1.5 text-sm text-white outline-none placeholder:text-neutral-600"
              />
              <button
                type="button"
                className="rounded-lg p-2 text-neutral-500 transition-colors hover:bg-white/[0.06] hover:text-neutral-200"
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
              className="grid h-9 w-9 place-items-center rounded-xl text-neutral-300 transition-colors hover:bg-white/[0.06] hover:text-white"
              onClick={sendComposerMessage}
              aria-label="Отправить"
            >
              <IconSendPlane className="h-5 w-5" />
            </button>
          ) : showVoiceUi ? (
            <button
              type="button"
              className={cn(
                "grid h-9 w-9 place-items-center rounded-xl text-neutral-300 transition-[color,background-color,transform,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] select-none touch-none",
                isRecordingMedia
                  ? "bg-red-600/20 text-red-200 ring-2 ring-red-500/55"
                  : "hover:bg-white/[0.06] hover:text-white",
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
                  : pendingRecordedAttachment
                    ? "Нажмите, чтобы отправить запись"
                  : voiceUiMode === "circle"
                    ? "Видеокружок: удерживайте для записи, нажмите для голоса"
                    : "Голос: удерживайте для записи, нажмите для видеокружка"
              }
            >
              {pendingRecordedAttachment ? (
                <IconMic className="h-[18px] w-[18px]" />
              ) : voiceUiMode === "circle" ? (
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
    <div className="grid flex-1 place-items-center bg-[#1d1d1d] p-6 text-center">
      <div>
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-[#2a2a2a] text-neutral-300">
          <IconMessages className="h-6 w-6" />
        </div>
        <p className="text-sm text-neutral-300">Выберите чат, чтобы начать переписку</p>
      </div>
    </div>
  );

  return (
    <div className="itd-messages-root flex min-h-0 flex-col overflow-hidden font-sans text-white lg:h-[calc(100dvh-8.5rem)] lg:min-h-[calc(100dvh-8.5rem)] lg:pt-6">
      <EmojiMartModal
        open={emojiOpen}
        onClose={() => setEmojiOpen(false)}
        onPick={insertEmoji}
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
            setMessagesByChat((prev) => ({ ...prev, [activeChat.id]: [] }));
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
            setChats((prev) => prev.filter((c) => c.id !== activeChat.id));
            setMessagesByChat((prev) => {
              const next = { ...prev };
              delete next[activeChat.id];
              return next;
            });
          }
          setConfirmDeleteOpen(false);
          setHeaderMenuOpen(false);
          setActiveChatId(null);
          setMobileChatOpen(false);
        }}
        onClose={() => setConfirmDeleteOpen(false)}
      />

      {/* Заголовок: скрываем при полноэкранном чате на мобильном */}
      <h1 className={cn("mb-4 text-2xl font-bold tracking-tight", !isDesktopLg && mobileChatOpen && "hidden")}>
        Сообщения
      </h1>

      {!isDesktopLg ? (
        <div
          className="min-h-0 flex-1 overflow-hidden"
        >
          {!mobileChatOpen ? (
            <section className="h-full overflow-hidden rounded-3xl border border-white/[0.06] bg-[#202020]">
              {chatListPanel}
            </section>
          ) : (
            <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-white/[0.06] bg-[#1e1e1e]">
              {chatViewPanel}
            </section>
          )}
        </div>
      ) : (
        <section className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-white/[0.06] bg-[#1e1e1e]">
          <div
            ref={panelRef}
            className="grid h-[calc(100dvh-13rem)] min-h-0 w-full lg:[grid-template-columns:var(--messages-cols)]"
            style={{ ["--messages-cols" as string]: `${leftPaneWidth}px minmax(0, 8px) minmax(0, 1fr)` }}
          >
            <aside className="h-full overflow-hidden border-r border-white/[0.06] bg-[#202020]">
              {chatListPanel}
            </aside>

            <div
              className="relative cursor-col-resize bg-[#1e1e1e]"
              onMouseDown={() => setIsResizingPane(true)}
              role="separator"
              aria-orientation="vertical"
              aria-label="Изменить ширину панели чатов"
            >
              <span className="absolute left-1/2 top-1/2 h-14 w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/20" />
            </div>

            <div className="flex h-full min-h-0 flex-col overflow-hidden">
              {chatViewPanel}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
