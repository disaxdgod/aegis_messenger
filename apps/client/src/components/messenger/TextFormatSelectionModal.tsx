import { cn } from "@/lib/utils";
import {
  focusTextareaRange,
  wrapMarkdown,
  wrapMarkdownLink,
  type SelectionSnapshot,
} from "@/lib/markdown-selection";
import { useEffect, useRef, useState, type RefObject } from "react";

type TextFormatSelectionModalProps = {
  open: boolean;
  snapshot: SelectionSnapshot | null;
  text: string;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onApply: (next: string, selStart: number, selEnd: number) => void;
  onClose: () => void;
};

export function TextFormatSelectionModal({
  open,
  snapshot,
  text,
  textareaRef,
  onApply,
  onClose,
}: TextFormatSelectionModalProps) {
  const [linkStep, setLinkStep] = useState(false);
  const [linkUrl, setLinkUrl] = useState("https://");
  const linkInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setLinkStep(false);
      setLinkUrl("https://");
      return;
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    function onDocDown(e: MouseEvent) {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [open, onClose]);

  useEffect(() => {
    if (open && linkStep) {
      linkInputRef.current?.focus();
      linkInputRef.current?.select();
    }
  }, [open, linkStep]);

  if (!open || !snapshot) {
    return null;
  }

  const preview = text.slice(snapshot.start, snapshot.end);
  const previewShort = preview.length > 64 ? `${preview.slice(0, 61)}…` : preview;

  function apply(
    mode: "bold" | "italic" | "strike" | "underline" | "spoiler" | "code",
    e?: React.MouseEvent,
  ) {
    e?.stopPropagation();
    if (!snapshot) return;
    const { next, selStart, selEnd } = wrapMarkdown(text, snapshot, mode);
    onApply(next, selStart, selEnd);
    focusTextareaRange(textareaRef, selStart, selEnd);
    onClose();
  }

  function startLink(e: React.MouseEvent) {
    e.stopPropagation();
    setLinkStep(true);
  }

  function confirmLink(e: React.MouseEvent) {
    e.stopPropagation();
    const u = linkUrl.trim();
    if (!u || (!/^https?:\/\//i.test(u) && !/^mailto:/i.test(u))) {
      return;
    }
    if (!snapshot) return;
    const { next, selStart, selEnd } = wrapMarkdownLink(text, snapshot, u);
    onApply(next, selStart, selEnd);
    focusTextareaRange(textareaRef, selStart, selEnd);
    onClose();
  }

  function cancelLink(e: React.MouseEvent) {
    e.stopPropagation();
    setLinkStep(false);
    setLinkUrl("https://");
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[145]">
      <div
        ref={panelRef}
        className={cn(
          "pointer-events-auto fixed left-1/2 z-[145] w-[calc(100vw-16px)] -translate-x-1/2",
          "bottom-2 max-w-[560px] rounded-2xl border border-white/[0.12] bg-[#171717]/95 p-2.5 shadow-[0_16px_40px_rgba(0,0,0,0.45)] backdrop-blur-md",
          "sm:bottom-4 sm:w-auto sm:min-w-[420px]",
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Форматирование текста"
      >
        {!linkStep ? (
          <>
            <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
              <span className="text-[10px] uppercase tracking-[0.12em] text-neutral-500">
                Форматирование
              </span>
              <button
                type="button"
                className="rounded-full px-2.5 py-1 text-[11px] text-neutral-500 transition-colors hover:bg-white/5 hover:text-neutral-300"
                onClick={onClose}
              >
                Закрыть
              </button>
            </div>
            <div className="mb-2 rounded-lg border border-white/[0.06] bg-black/20 px-2.5 py-1.5 text-xs text-neutral-400">
              {previewShort || "(пусто)"}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/[0.08]"
                title="Жирный"
                aria-label="Жирный"
                onClick={(e) => apply("bold", e)}
              >
                B
              </button>
              <button
                type="button"
                className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs italic text-white transition-colors hover:bg-white/[0.08]"
                title="Курсив"
                aria-label="Курсив"
                onClick={(e) => apply("italic", e)}
              >
                <span className="-skew-x-12 inline-block">I</span>
              </button>
              <button
                type="button"
                className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs text-white transition-colors hover:bg-white/[0.08]"
                title="Зачёркнутый"
                aria-label="Зачёркнутый"
                onClick={(e) => apply("strike", e)}
              >
                <span className="line-through decoration-[1px]">abc</span>
              </button>
              <button
                type="button"
                className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs underline decoration-1 underline-offset-2 text-white transition-colors hover:bg-white/[0.08]"
                title="Подчёркнутый"
                aria-label="Подчёркнутый"
                onClick={(e) => apply("underline", e)}
              >
                U
              </button>
              <button
                type="button"
                className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/[0.08]"
                title="Спойлер"
                aria-label="Спойлер"
                onClick={(e) => apply("spoiler", e)}
              >
                Спойлер
              </button>
              <button
                type="button"
                className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 font-mono text-xs text-white transition-colors hover:bg-white/[0.08]"
                title="Моноширинный"
                aria-label="Моноширинный"
                onClick={(e) => apply("code", e)}
              >
                {"</>"}
              </button>
              <button
                type="button"
                className="rounded-lg border border-[var(--accent-primary)]/35 bg-[var(--accent-primary)]/10 px-2.5 py-1.5 text-xs font-medium text-neutral-200 transition-colors hover:bg-[var(--accent-primary)]/16"
                title="Вставить ссылку"
                aria-label="Вставить ссылку"
                onClick={startLink}
              >
                Ссылка
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-2 pt-0.5">
            <label className="block px-0.5 text-xs text-neutral-400">URL</label>
            <input
              ref={linkInputRef}
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#151515] px-3 py-2 text-sm text-white outline-none focus-visible:border-white/25"
              placeholder="https://"
            />
            <div className="flex justify-end gap-1.5">
              <button
                type="button"
                className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-neutral-300 transition-colors hover:bg-white/5"
                onClick={cancelLink}
              >
                Назад
              </button>
              <button
                type="button"
                className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-neutral-200"
                onClick={confirmLink}
              >
                Готово
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
