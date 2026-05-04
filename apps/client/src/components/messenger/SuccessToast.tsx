import { cn } from "@/lib/utils";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type TransitionEvent,
} from "react";

type SuccessToastProps = {
  message: string | null;
  onDismiss: () => void;
};

const ENTER_MS = 360;
const VISIBLE_MS = 2000;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

function CheckGlyph() {
  return (
    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600">
      <svg
        viewBox="0 0 14 11"
        width="11"
        height="9"
        className="text-white"
        fill="none"
        aria-hidden
      >
        <path
          d="M1.5 5.5 5.2 9.2 12.5 1.5"
          stroke="currentColor"
          strokeWidth="1.85"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function SuccessToast({ message, onDismiss }: SuccessToastProps) {
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
    if (!message) {
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
  }, [message]);

  useEffect(() => {
    if (!exiting) {
      return;
    }
    const fallback = window.setTimeout(() => {
      finishExit();
    }, ENTER_MS + 120);
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

  if (!message) {
    return null;
  }

  const offscreen = !entered || exiting;

  return (
    <div
      role="status"
      className={cn(
        "fixed left-1/2 z-[70] flex w-full max-w-[min(92vw,440px)] -translate-x-1/2 justify-center px-4",
        "bottom-24 lg:bottom-8",
      )}
    >
      <div
        onTransitionEnd={handleTransitionEnd}
        style={{
          transitionProperty: "transform, opacity",
          transitionDuration: `${ENTER_MS}ms`,
          transitionTimingFunction: EASE,
          transform: offscreen ? "translateY(calc(100% + 32px))" : "translateY(0)",
          opacity: offscreen ? 0 : 1,
        }}
        className={cn(
          "inline-flex max-w-full items-center gap-2.5 rounded-[10px] bg-zinc-800 px-5 py-3.5 outline outline-1 outline-offset-[-1px] outline-zinc-800 will-change-transform",
        )}
      >
        <CheckGlyph />
        <div className="min-w-0 max-w-[min(72vw,320px)] text-left text-xl font-medium leading-5 text-white">
          {message}
        </div>
        <button
          type="button"
          className="ml-0.5 shrink-0 self-center rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
          aria-label="Закрыть уведомление"
          onClick={() => {
            if (exitTimerRef.current != null) {
              clearTimeout(exitTimerRef.current);
              exitTimerRef.current = null;
            }
            setExiting(true);
          }}
        >
          <span className="block text-lg leading-none">×</span>
        </button>
      </div>
    </div>
  );
}
