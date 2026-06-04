import { demoAvatar } from "@/data/demo-seed";
import { cn } from "@/lib/utils";
import {
  type DemoMessageNotification,
} from "@/stores/demo-notification-store";
import { useAppNavStore } from "@/stores/app-nav-store";
import { useDmInboxStore } from "@/stores/dm-inbox-store";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type TransitionEvent,
} from "react";

const ENTER_MS = 380;
const VISIBLE_MS = 5200;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

function getAvatarFallback(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return "?";
  }
  return trimmed[0]?.toUpperCase() ?? "?";
}

type MessageNotificationToastProps = {
  notification: DemoMessageNotification | null;
  onDismiss: () => void;
};

export function MessageNotificationToast({
  notification,
  onDismiss,
}: MessageNotificationToastProps) {
  const setScreen = useAppNavStore((s) => s.setScreen);
  const requestOpenChat = useDmInboxStore((s) => s.requestOpenChat);
  const [entered, setEntered] = useState(false);
  const [exiting, setExiting] = useState(false);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafIdsRef = useRef<{ a?: number; b?: number }>({});
  const dismissedRef = useRef(false);

  const finishExit = useCallback(() => {
    if (dismissedRef.current) {
      return;
    }
    dismissedRef.current = true;
    onDismiss();
  }, [onDismiss]);

  useEffect(() => {
    if (!notification) {
      setEntered(false);
      setExiting(false);
      dismissedRef.current = false;
      return;
    }

    dismissedRef.current = false;
    setEntered(false);
    setExiting(false);

    rafIdsRef.current.a = requestAnimationFrame(() => {
      rafIdsRef.current.b = requestAnimationFrame(() => {
        rafIdsRef.current.b = undefined;
        setEntered(true);
      });
    });

    exitTimerRef.current = setTimeout(() => {
      exitTimerRef.current = null;
      setExiting(true);
    }, ENTER_MS + VISIBLE_MS);

    return () => {
      if (rafIdsRef.current.a != null) {
        cancelAnimationFrame(rafIdsRef.current.a);
      }
      if (rafIdsRef.current.b != null) {
        cancelAnimationFrame(rafIdsRef.current.b);
      }
      if (exitTimerRef.current != null) {
        clearTimeout(exitTimerRef.current);
      }
    };
  }, [notification]);

  useEffect(() => {
    if (!exiting) {
      return;
    }
    const fallback = window.setTimeout(() => finishExit(), ENTER_MS + 120);
    return () => clearTimeout(fallback);
  }, [exiting, finishExit]);

  function handleTransitionEnd(e: TransitionEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget || e.propertyName !== "transform") {
      return;
    }
    if (exiting) {
      finishExit();
    }
  }

  function handleOpen() {
    if (notification?.chatId) {
      requestOpenChat(notification.chatId);
    }
    setScreen("messages");
    if (exitTimerRef.current != null) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
    setExiting(true);
  }

  if (!notification) {
    return null;
  }

  const offscreen = !entered || exiting;
  const avatarUrl = demoAvatar(notification.senderHandle);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed inset-x-4 bottom-24 z-[81] flex justify-end sm:inset-x-auto sm:bottom-8 sm:right-8 lg:bottom-8"
    >
      <div
        onTransitionEnd={handleTransitionEnd}
        style={{
          transitionProperty: "transform, opacity",
          transitionDuration: `${ENTER_MS}ms`,
          transitionTimingFunction: EASE,
          transform: offscreen ? "translateX(calc(100% + 24px))" : "translateX(0)",
          opacity: offscreen ? 0 : 1,
        }}
        className={cn(
          "pointer-events-auto w-full max-w-[min(calc(100vw-2rem),360px)] will-change-transform",
          "rounded-2xl border border-white/[0.09] bg-[#1e1e20]/95 p-3.5 shadow-[0_8px_40px_rgba(0,0,0,0.55)]",
          "backdrop-blur-xl",
        )}
      >
        <div className="flex items-start gap-3">
          <button
            type="button"
            className="flex min-w-0 flex-1 items-start gap-3 text-left"
            onClick={handleOpen}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5 text-sm text-white">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span aria-hidden>{getAvatarFallback(notification.senderName)}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-400">
                {notification.title}
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold text-white">
                {notification.senderName}
              </p>
              <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-white/75">
                {notification.body}
              </p>
            </div>
          </button>

          <button
            type="button"
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-xl",
              "text-white/30 transition-all duration-150",
              "hover:bg-white/[0.08] hover:text-white/70",
              "active:scale-90",
            )}
            aria-label="Закрыть уведомление"
            onClick={() => {
              if (exitTimerRef.current != null) {
                clearTimeout(exitTimerRef.current);
                exitTimerRef.current = null;
              }
              setExiting(true);
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-3.5 w-3.5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
