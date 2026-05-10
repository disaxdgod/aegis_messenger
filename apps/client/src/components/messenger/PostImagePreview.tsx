import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";

type PostImagePreviewProps = {
  urls: string[];
  initialIndex: number;
  onClose: () => void;
};

/**
 * Полноэкранный просмотр: горизонтальный свайп между фото (touch + snap),
 * индикатор слайда, закрытие по фону или Escape.
 */
export function PostImagePreview({
  urls,
  initialIndex,
  onClose,
}: PostImagePreviewProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(initialIndex);

  const syncIndexFromScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || urls.length === 0) {
      return;
    }
    const w = el.clientWidth;
    if (w <= 0) {
      return;
    }
    const i = Math.round(el.scrollLeft / w);
    setIndex(Math.min(urls.length - 1, Math.max(0, i)));
  }, [urls.length]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) {
      return;
    }
    const ro = new ResizeObserver(() => syncIndexFromScroll());
    ro.observe(el);
    return () => ro.disconnect();
  }, [syncIndexFromScroll]);

  useEffect(() => {
    setIndex(initialIndex);
    const el = scrollerRef.current;
    if (!el || urls.length === 0) {
      return;
    }
    requestAnimationFrame(() => {
      el.scrollLeft = initialIndex * el.clientWidth;
    });
  }, [initialIndex, urls]);

  const goTo = useCallback(
    (next: number) => {
      const el = scrollerRef.current;
      if (!el || urls.length === 0) {
        return;
      }
      const clamped = Math.max(0, Math.min(urls.length - 1, next));
      el.scrollTo({
        left: clamped * el.clientWidth,
        behavior: "smooth",
      });
      setIndex(clamped);
    },
    [urls.length],
  );

  useEffect(() => {
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (urls.length <= 1) {
        return;
      }
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") {
        return;
      }
      const el = scrollerRef.current;
      if (!el) {
        return;
      }
      const w = el.clientWidth;
      if (w <= 0) {
        return;
      }
      const current = Math.round(el.scrollLeft / w);
      e.preventDefault();
      goTo(e.key === "ArrowLeft" ? current - 1 : current + 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [urls.length, onClose, goTo]);

  if (urls.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[160] bg-black/92 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Просмотр изображений"
      onClick={onClose}
    >
      <div
        ref={scrollerRef}
        onScroll={syncIndexFromScroll}
        onClick={(e) => e.stopPropagation()}
        style={{ WebkitOverflowScrolling: "touch" }}
        className={cn(
          "flex h-full w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth",
          "[touch-action:pan-x_pan-y] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        )}
      >
        {urls.map((url, i) => (
          <div
            key={`${url}-${i}`}
            className="flex min-h-0 min-w-full shrink-0 snap-center snap-always items-center justify-center px-3 py-6 sm:px-6"
          >
            <img
              src={url}
              alt=""
              className="max-h-[min(92dvh,920px)] w-auto max-w-[min(96vw,1200px)] select-none object-contain"
              draggable={false}
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        aria-label="Закрыть"
        className="absolute right-3 top-3 z-[1] grid h-11 min-w-11 place-items-center rounded-full bg-white/10 px-3 text-lg text-white backdrop-blur-sm transition-colors hover:bg-white/20 active:scale-95"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        ✕
      </button>

      {urls.length > 1 ? (
        <div
          className="pointer-events-none absolute bottom-6 left-0 right-0 flex justify-center gap-2"
          aria-hidden
        >
          {urls.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-2 w-2 rounded-full transition-colors duration-200",
                i === index ? "bg-white" : "bg-white/40",
              )}
            />
          ))}
        </div>
      ) : null}

      {urls.length > 1 ? (
        <>
          <button
            type="button"
            aria-label="Предыдущее фото"
            className="absolute left-2 top-1/2 z-[1] hidden -translate-y-1/2 items-center justify-center rounded-full bg-black/45 p-3 text-white backdrop-blur-sm sm:flex"
            onClick={(e) => {
              e.stopPropagation();
              goTo(index - 1);
            }}
            disabled={index <= 0}
          >
            <span className="text-xl leading-none opacity-90">‹</span>
          </button>
          <button
            type="button"
            aria-label="Следующее фото"
            className="absolute right-2 top-1/2 z-[1] hidden -translate-y-1/2 items-center justify-center rounded-full bg-black/45 p-3 text-white backdrop-blur-sm sm:flex"
            onClick={(e) => {
              e.stopPropagation();
              goTo(index + 1);
            }}
            disabled={index >= urls.length - 1}
          >
            <span className="text-xl leading-none opacity-90">›</span>
          </button>
        </>
      ) : null}
    </div>
  );
}
