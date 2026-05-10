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

const ENTER_MS = 380;
const VISIBLE_MS = 2600;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

function CheckGlyph() {
  return (
    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 shadow-[0_2px_8px_rgba(16,185,129,0.35)]">
      <svg
        viewBox="0 0 14 11"
        width="10"
        height="8"
        className="text-white"
        fill="none"
        aria-hidden
      >
        <path
          d="M1.5 5.5 5.2 9.2 12.5 1.5"
          stroke="currentColor"
          strokeWidth="1.5"
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
    if (dismissedRef.current) return;
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
      if (rafIdsRef.current.a != null) cancelAnimationFrame(rafIdsRef.current.a);
      if (rafIdsRef.current.b != null) cancelAnimationFrame(rafIdsRef.current.b);
      if (exitTimerRef.current != null) clearTimeout(exitTimerRef.current);
    };
  }, [message]);

  useEffect(() => {
    if (!exiting) return;
    const fallback = window.setTimeout(() => finishExit(), ENTER_MS + 120);
    return () => clearTimeout(fallback);
  }, [exiting, finishExit]);

  function handleTransitionEnd(e: TransitionEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget || e.propertyName !== "transform") return;
    if (exiting) finishExit();
  }

  if (!message) return null;

  const offscreen = !entered || exiting;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-24 z-[80] flex justify-center px-4",
        "lg:bottom-8",
      )}
    >
      <div
        onTransitionEnd={handleTransitionEnd}
        style={{
          transitionProperty: "transform, opacity",
          transitionDuration: `${ENTER_MS}ms`,
          transitionTimingFunction: EASE,
          transform: offscreen ? "translateY(calc(100% + 28px))" : "translateY(0)",
          opacity: offscreen ? 0 : 1,
        }}
        className={cn(
          "pointer-events-auto inline-flex w-max max-w-[min(calc(100vw-2rem),400px)] items-center gap-3 will-change-transform",
          "rounded-2xl border border-white/[0.09] bg-[#1e1e20]/95 px-4 py-3.5 shadow-[0_8px_40px_rgba(0,0,0,0.55)]",
          "backdrop-blur-xl",
        )}
      >
        <CheckGlyph />

        <p className="min-w-0 shrink text-left text-[14px] font-medium leading-snug text-white/90">
          {message}
        </p>

        <button
          type="button"
          className={cn(
            "ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl",
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
  );
}
