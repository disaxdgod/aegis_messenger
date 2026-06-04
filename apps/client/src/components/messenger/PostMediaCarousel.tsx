import { cn } from "@/lib/utils";
import type { PostMediaItem } from "@/stores/posts-store";
import type { RefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

type PostMediaCarouselProps = {
  items: PostMediaItem[];
  onImageClick: (url: string) => void;
};

function ChevronLeft({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M14 6l-6 6 6 6"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M10 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Движение пальца/курсора выше порога — считаем жестом прокрутки, не тапом. */
const TAP_MOVE_THRESHOLD_PX = 20;
/** Если карусель реально сместилась по scrollLeft — превью не открываем. */
const SCROLL_IGNORE_OPEN_PX = 6;

function CarouselSlideImage({
  url,
  onOpen,
  scrollerRef,
}: {
  url: string;
  onOpen: () => void;
  scrollerRef: RefObject<HTMLDivElement | null>;
}) {
  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === "mouse" && e.button !== 0) {
      return;
    }

    const pointerId = e.pointerId;
    const startX = e.clientX;
    const startY = e.clientY;
    let maxMove = 0;
    const scrollAtStart = scrollerRef.current?.scrollLeft ?? 0;

    function onMove(ev: PointerEvent) {
      if (ev.pointerId !== pointerId) {
        return;
      }
      maxMove = Math.max(
        maxMove,
        Math.abs(ev.clientX - startX),
        Math.abs(ev.clientY - startY),
      );
    }

    function onEnd(ev: PointerEvent) {
      if (ev.pointerId !== pointerId) {
        return;
      }
      cleanup();
      const scrollNow = scrollerRef.current?.scrollLeft ?? 0;
      const carouselMoved =
        Math.abs(scrollNow - scrollAtStart) > SCROLL_IGNORE_OPEN_PX;
      if (carouselMoved) {
        return;
      }
      if (maxMove > TAP_MOVE_THRESHOLD_PX) {
        return;
      }
      onOpen();
    }

    function cleanup() {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onEnd);
      document.removeEventListener("pointercancel", onEnd);
    }

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerup", onEnd);
    document.addEventListener("pointercancel", onEnd);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className="group relative flex w-full cursor-grab select-none items-stretch overflow-hidden bg-black active:cursor-grabbing"
      onPointerDown={onPointerDown}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <img
        src={url}
        alt=""
        className="max-h-[min(92vh,720px)] min-h-0 w-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.005]"
        draggable={false}
      />
    </div>
  );
}

/**
 * Горизонтальная карусель: свайп тач/тачпад, перетаскивание мышью на десктопе,
 * snap, точки, стрелки.
 */
export function PostMediaCarousel({
  items,
  onImageClick,
}: PostMediaCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const mouseDragRef = useRef<{
    pointerId: number;
    startX: number;
    startScroll: number;
  } | null>(null);

  const syncIndexFromScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || items.length === 0) {
      return;
    }
    const w = el.clientWidth;
    if (w <= 0) {
      return;
    }
    const i = Math.round(el.scrollLeft / w);
    setIndex(Math.min(items.length - 1, Math.max(0, i)));
  }, [items.length]);

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
    setIndex(0);
    const el = scrollerRef.current;
    if (el) {
      el.scrollLeft = 0;
    }
  }, [items]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || items.length <= 1) {
      return;
    }
    const scroller = el;
    function onWheel(ev: WheelEvent) {
      const dx = ev.deltaX;
      const dy = ev.deltaY;
      const dominantHorizontal =
        Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 0.5;
      if (ev.shiftKey || dominantHorizontal) {
        scroller.scrollLeft += dominantHorizontal ? dx : dy;
        ev.preventDefault();
      }
    }
    scroller.addEventListener("wheel", onWheel, { passive: false });
    return () => scroller.removeEventListener("wheel", onWheel);
  }, [items.length]);

  const goTo = useCallback(
    (next: number) => {
      const el = scrollerRef.current;
      if (!el || items.length === 0) {
        return;
      }
      const clamped = Math.max(0, Math.min(items.length - 1, next));
      el.scrollTo({
        left: clamped * el.clientWidth,
        behavior: "smooth",
      });
      setIndex(clamped);
    },
    [items.length],
  );

  function onScrollerPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse" || e.button !== 0) {
      return;
    }
    const el = scrollerRef.current;
    if (!el || items.length <= 1) {
      return;
    }
    mouseDragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startScroll: el.scrollLeft,
    };
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  }

  function onScrollerPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const st = mouseDragRef.current;
    if (
      !st ||
      e.pointerId !== st.pointerId ||
      e.pointerType !== "mouse"
    ) {
      return;
    }
    const el = scrollerRef.current;
    if (!el) {
      return;
    }
    el.scrollLeft = st.startScroll - (e.clientX - st.startX);
  }

  function onScrollerPointerUpEnd(e: React.PointerEvent<HTMLDivElement>) {
    const st = mouseDragRef.current;
    if (!st || e.pointerId !== st.pointerId) {
      return;
    }
    mouseDragRef.current = null;
    try {
      scrollerRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-white/[0.06]"
      role="region"
      aria-roledescription="карусель"
      aria-label={`Фотографии поста, ${items.length} шт.`}
    >
      <div
        ref={scrollerRef}
        onScroll={syncIndexFromScroll}
        onPointerDown={onScrollerPointerDown}
        onPointerMove={onScrollerPointerMove}
        onPointerUp={onScrollerPointerUpEnd}
        onPointerCancel={onScrollerPointerUpEnd}
        style={{ WebkitOverflowScrolling: "touch" }}
        className={cn(
          "flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth",
          items.length > 1 && "cursor-grab active:cursor-grabbing",
          "[touch-action:pan-x_pan-y] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        )}
      >
        {items.map((m, i) => (
          <div
            key={m.id}
            className="min-w-full shrink-0 snap-center snap-always"
            aria-roledescription="слайд"
            aria-label={`Фото ${i + 1} из ${items.length}`}
          >
            <CarouselSlideImage
              url={m.url}
              scrollerRef={scrollerRef}
              onOpen={() => onImageClick(m.url)}
            />
          </div>
        ))}
      </div>

      {items.length > 1 ? (
        <>
          <div
            className="pointer-events-none absolute bottom-3 left-0 right-0 flex justify-center gap-1.5"
            aria-hidden
          >
            {items.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 w-1.5 rounded-full transition-colors duration-200",
                  i === index ? "bg-white" : "bg-white/35",
                )}
              />
            ))}
          </div>

          <button
            type="button"
            aria-label="Предыдущее фото"
            disabled={index <= 0}
            onClick={() => goTo(index - 1)}
            className={cn(
              "absolute left-2 top-1/2 z-[2] flex -translate-y-1/2 rounded-full bg-black/55 p-2 text-white backdrop-blur-sm transition-opacity",
              index <= 0 ? "cursor-default opacity-30" : "opacity-90 hover:bg-black/70",
            )}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Следующее фото"
            disabled={index >= items.length - 1}
            onClick={() => goTo(index + 1)}
            className={cn(
              "absolute right-2 top-1/2 z-[2] flex -translate-y-1/2 rounded-full bg-black/55 p-2 text-white backdrop-blur-sm transition-opacity",
              index >= items.length - 1
                ? "cursor-default opacity-30"
                : "opacity-90 hover:bg-black/70",
            )}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      ) : null}
    </div>
  );
}
