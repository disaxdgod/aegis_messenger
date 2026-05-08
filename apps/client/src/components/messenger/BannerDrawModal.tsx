import { cn } from "@/lib/utils";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

const COLORS = [
  "#000000",
  "#ffffff",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#a855f7",
  "#ec4899",
  "#9ca3af",
  "#0e7490",
  "#171717",
] as const;

const BRUSH_SIZES = [2, 4, 8, 12, 18] as const;
const BANNER_CANVAS_WIDTH = 900;
const BANNER_CANVAS_HEIGHT = 300;

type Tool = "pen" | "eraser" | "line" | "rect" | "circle";

type BannerDrawModalProps = {
  open: boolean;
  onClose: () => void;
  onComplete: (blob: Blob) => void;
};

function canvasPos(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
) {
  const r = canvas.getBoundingClientRect();
  /**
   * Важно: рисуем в "логических" координатах (900x300), потому что контекст
   * уже масштабирован через ctx.setTransform(dpr, ...). Если умножать на
   * canvas.width/canvas.height (в device px), курсор уезжает на DPR-экранах.
   */
  const sx = BANNER_CANVAS_WIDTH / r.width;
  const sy = BANNER_CANVAS_HEIGHT / r.height;
  return {
    x: (clientX - r.left) * sx,
    y: (clientY - r.top) * sy,
  };
}

export function BannerDrawModal({
  open,
  onClose,
  onComplete,
}: BannerDrawModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<ImageData[]>([]);
  const historyIndexRef = useRef(0);
  const drawingRef = useRef(false);
  const startRef = useRef({ x: 0, y: 0 });
  const snapshotRef = useRef<ImageData | null>(null);

  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState<string>(COLORS[0]);
  const [brushIdx, setBrushIdx] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [isLandscapeMobile, setIsLandscapeMobile] = useState(false);

  const brushSize = BRUSH_SIZES[brushIdx];

  const syncHistoryTip = useCallback(() => {
    const c = canvasRef.current;
    if (!c) {
      return;
    }
    const ctx = c.getContext("2d");
    if (!ctx) {
      return;
    }
    const img = ctx.getImageData(0, 0, c.width, c.height);
    const past = historyRef.current.slice(0, historyIndexRef.current + 1);
    past.push(img);
    historyRef.current = past.slice(-20);
    historyIndexRef.current = historyRef.current.length - 1;
  }, []);

  const applyUndoRedo = useCallback((nextIndex: number) => {
    const c = canvasRef.current;
    if (!c) {
      return;
    }
    const ctx = c.getContext("2d");
    if (!ctx) {
      return;
    }
    const h = historyRef.current;
    if (nextIndex < 0 || nextIndex >= h.length) {
      return;
    }
    ctx.putImageData(h[nextIndex], 0, 0);
    historyIndexRef.current = nextIndex;
  }, []);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const w = BANNER_CANVAS_WIDTH;
    const h = BANNER_CANVAS_HEIGHT;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    const snap = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height);
    historyRef.current = [snap];
    historyIndexRef.current = 0;
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    initCanvas();
  }, [open, initCanvas]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || typeof window === "undefined") {
      return;
    }
    const mq = window.matchMedia("(max-width: 932px) and (orientation: landscape)");
    const sync = () => setIsLandscapeMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [open]);

  function commitStroke() {
    syncHistoryTip();
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!canvasRef.current) {
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = canvasPos(canvasRef.current, e.clientX, e.clientY);
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) {
      return;
    }
    drawingRef.current = true;
    startRef.current = { x, y };

    if (tool === "pen" || tool === "eraser") {
      /* старт сегмента — дальше в move рисуем отрезками */
    } else {
      snapshotRef.current = ctx.getImageData(
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height,
      );
    }
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || !canvasRef.current) {
      return;
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    const { x, y } = canvasPos(canvas, e.clientX, e.clientY);

    if (tool === "pen" || tool === "eraser") {
      const { x: x0, y: y0 } = startRef.current;
      ctx.globalCompositeOperation =
        tool === "eraser" ? "destination-out" : "source-over";
      ctx.strokeStyle = tool === "eraser" ? "#000000" : color;
      ctx.lineWidth = brushSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x, y);
      ctx.stroke();
      startRef.current = { x, y };
      return;
    }

    const snap = snapshotRef.current;
    if (!snap) {
      return;
    }
    ctx.putImageData(snap, 0, 0);
    const { x: x0, y: y0 } = startRef.current;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.fillStyle = color;
    ctx.globalCompositeOperation = "source-over";
    if (tool === "line") {
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (tool === "rect") {
      const rx = Math.min(x0, x);
      const ry = Math.min(y0, y);
      ctx.strokeRect(rx, ry, Math.abs(x - x0), Math.abs(y - y0));
    } else if (tool === "circle") {
      const r = Math.hypot(x - x0, y - y0);
      ctx.beginPath();
      ctx.arc(x0, y0, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function handlePointerUp(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || !canvasRef.current) {
      return;
    }
    if (tool !== "pen" && tool !== "eraser") {
      handlePointerMove(e);
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    drawingRef.current = false;
    commitStroke();
    snapshotRef.current = null;
  }

  function handleClear() {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    const w = BANNER_CANVAS_WIDTH;
    const h = BANNER_CANVAS_HEIGHT;
    const dpr = canvas.width / w;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    syncHistoryTip();
  }

  async function handleUpload() {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/png", 0.92),
    );
    if (blob) {
      onComplete(blob);
    }
    onClose();
  }

  if (!open) {
    return null;
  }

  const toolBtn = (t: Tool, label: string, node: React.ReactNode) => (
    <button
      key={t}
      type="button"
      aria-pressed={tool === t}
      aria-label={label}
      onClick={() => setTool(t)}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-lg text-neutral-300 transition-colors hover:bg-white/10 hover:text-white",
        tool === t && "bg-white/15 text-white",
      )}
    >
      {node}
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-[95] flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="banner-draw-title"
    >
      <div
        className={cn(
          "flex h-[100dvh] w-full max-w-[100vw] flex-col overflow-hidden border border-white/[0.08] bg-[#1a1a1a] shadow-2xl",
          "rounded-none sm:h-auto sm:max-h-[min(96dvh,920px)] sm:max-w-[min(96vw,920px)] sm:rounded-2xl",
        )}
      >
        <div
          className={cn(
            "flex flex-wrap items-center gap-2 border-b border-white/[0.08] px-3 py-2.5 sm:px-4 sm:py-3",
            isLandscapeMobile && "gap-1.5 px-2 py-2",
          )}
        >
          <div className="flex w-full items-center gap-1 overflow-x-auto pb-1 pr-1 sm:w-auto sm:max-w-full">
            {toolBtn(
              "pen",
              "Карандаш",
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M12 19l7-7 3 3-7 7-3-3z" />
                <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
              </svg>,
            )}
            {toolBtn(
              "eraser",
              "Ластик",
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
                <path d="M22 21H7M5 11l9 9" />
              </svg>,
            )}
            {toolBtn(
              "line",
              "Линия",
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M5 19L19 5" />
              </svg>,
            )}
            {toolBtn(
              "rect",
              "Прямоугольник",
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75">
                <rect x="4" y="6" width="16" height="12" rx="1" />
              </svg>,
            )}
            {toolBtn(
              "circle",
              "Круг",
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75">
                <circle cx="12" cy="12" r="8" />
              </svg>,
            )}
          </div>

          <div className="mx-1 hidden h-6 w-px bg-white/10 md:block" aria-hidden />

          <div className={cn("flex items-center gap-2", isLandscapeMobile && "gap-1.5")}>
            {BRUSH_SIZES.map((s, i) => (
              <button
                key={s}
                type="button"
                aria-label={`Толщина ${s}`}
                aria-pressed={brushIdx === i}
                onClick={() => setBrushIdx(i)}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md border border-transparent",
                  brushIdx === i && "border-white/40 bg-white/10",
                )}
              >
                <span
                  className="rounded-full bg-neutral-300"
                  style={{ width: Math.max(4, s), height: Math.max(4, s) }}
                />
              </button>
            ))}
          </div>

          <div className="mx-1 hidden h-6 w-px bg-white/10 md:block" aria-hidden />

          <div
            className={cn(
              "flex w-full flex-wrap items-center gap-1.5 sm:flex-1 sm:w-auto",
              isLandscapeMobile && "gap-1",
            )}
          >
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Цвет ${c}`}
                aria-pressed={color === c}
                onClick={() => setColor(c)}
                className={cn(
                  "h-7 w-7 shrink-0 rounded-full border-2 transition-transform hover:scale-110",
                  isLandscapeMobile && "h-6 w-6",
                  color === c ? "border-white ring-1 ring-white/50" : "border-transparent",
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <div
            className={cn(
              "ml-auto flex shrink-0 items-center gap-1 border-l border-white/10 pl-2 sm:pl-3",
              isLandscapeMobile && "pl-1.5",
            )}
          >
            <button
              type="button"
              className="rounded-md px-2 py-1 text-lg text-neutral-400 hover:bg-white/10 hover:text-white"
              aria-label="Уменьшить"
              onClick={() => setZoom((z) => Math.max(50, z - 6))}
            >
              −
            </button>
            <span className="min-w-[3rem] text-center text-xs text-neutral-400">{zoom}%</span>
            <button
              type="button"
              className="rounded-md px-2 py-1 text-lg text-neutral-400 hover:bg-white/10 hover:text-white"
              aria-label="Увеличить"
              onClick={() => setZoom((z) => Math.min(160, z + 6))}
            >
              +
            </button>
          </div>
        </div>

        <div
          className={cn(
            "flex items-center gap-2 border-b border-white/[0.06] px-3 py-2 sm:px-4",
            isLandscapeMobile && "gap-1 px-2 py-1.5",
          )}
        >
          <button
            type="button"
            className="rounded-md p-2 text-neutral-400 hover:bg-white/10 hover:text-white"
            aria-label="Отменить"
            onClick={() =>
              applyUndoRedo(Math.max(0, historyIndexRef.current - 1))
            }
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M3 7v6h6" />
              <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
            </svg>
          </button>
          <button
            type="button"
            className="rounded-md p-2 text-neutral-400 hover:bg-white/10 hover:text-white"
            aria-label="Вернуть"
            onClick={() =>
              applyUndoRedo(
                Math.min(historyRef.current.length - 1, historyIndexRef.current + 1),
              )
            }
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M21 7v6h-6" />
              <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
            </svg>
          </button>
          <button
            type="button"
            className="rounded-md p-2 text-neutral-400 hover:bg-white/10 hover:text-white"
            aria-label="Очистить холст"
            onClick={handleClear}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            </svg>
          </button>
        </div>

        <div className={cn("min-h-0 flex-1 overflow-auto bg-[#141414] p-2.5 sm:p-4", isLandscapeMobile && "p-2")}>
          <div
            className="mx-auto flex justify-center"
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: "top center",
            }}
          >
            <canvas
              ref={canvasRef}
              className="block max-w-full cursor-crosshair touch-none select-none bg-white shadow-inner"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={(e) => {
                if (drawingRef.current) {
                  handlePointerUp(e);
                }
              }}
            />
          </div>
        </div>

        <div
          className={cn(
            "flex items-center justify-end gap-3 border-t border-white/[0.08] px-3 py-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:px-4 sm:py-4",
            isLandscapeMobile && "gap-2 px-2 py-2 pb-[max(8px,env(safe-area-inset-bottom))]",
          )}
        >
          <h2 id="banner-draw-title" className="sr-only">
            Редактор баннера
          </h2>
          <button
            type="button"
            className={cn(
              "w-1/2 rounded-full border border-white/20 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 sm:w-auto",
              isLandscapeMobile && "px-4 py-1.5 text-xs",
            )}
            onClick={onClose}
          >
            Отмена
          </button>
          <button
            type="button"
            className={cn(
              "w-1/2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition-colors hover:bg-neutral-200 sm:w-auto",
              isLandscapeMobile && "px-4 py-1.5 text-xs",
            )}
            onClick={handleUpload}
          >
            Загрузить баннер
          </button>
        </div>
      </div>
    </div>
  );
}
