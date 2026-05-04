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
    if (open && linkStep) {
      linkInputRef.current?.focus();
      linkInputRef.current?.select();
    }
  }, [open, linkStep]);

  if (!open || !snapshot) {
    return null;
  }

  const preview = text.slice(snapshot.start, snapshot.end);
  const previewShort =
    preview.length > 120 ? `${preview.slice(0, 117)}…` : preview;

  function apply(
    mode: "bold" | "italic" | "strike" | "code",
    e?: React.MouseEvent,
  ) {
    e?.stopPropagation();
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
    <div
      className="fixed inset-0 z-[145] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fmt-modal-title"
      onClick={onClose}
    >
      <div
        className={cn(
          "w-full max-w-[400px] rounded-2xl border border-white/[0.1] bg-[#1c1c1c] p-5 shadow-2xl",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="fmt-modal-title"
          className="text-base font-semibold tracking-tight text-white"
        >
          Форматирование
        </h2>
        <p className="mt-1 text-xs text-neutral-500">
          Markdown: выделенный фрагмент будет обёрнут в разметку.
        </p>
        <div className="mt-3 max-h-24 overflow-y-auto rounded-lg border border-white/[0.06] bg-black/30 px-3 py-2 text-sm text-neutral-300">
          {previewShort ? (
            <span className="whitespace-pre-wrap">{previewShort}</span>
          ) : (
            <span className="text-neutral-600">(пусто)</span>
          )}
        </div>

        {!linkStep ? (
          <>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <button
                type="button"
                className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm font-medium text-white hover:bg-white/[0.08]"
                onClick={(e) => apply("bold", e)}
              >
                Жирный
              </button>
              <button
                type="button"
                className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm font-medium text-white hover:bg-white/[0.08]"
                onClick={(e) => apply("italic", e)}
              >
                Курсив
              </button>
              <button
                type="button"
                className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm font-medium text-white hover:bg-white/[0.08]"
                onClick={(e) => apply("strike", e)}
              >
                Зачёркнутый
              </button>
              <button
                type="button"
                className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm font-medium text-white hover:bg-white/[0.08]"
                onClick={(e) => apply("code", e)}
              >
                Моноширинный
              </button>
              <button
                type="button"
                className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2.5 text-sm font-medium text-cyan-200 hover:bg-cyan-500/15 sm:col-span-2"
                onClick={startLink}
              >
                Ссылка…
              </button>
            </div>
          </>
        ) : (
          <div className="mt-4 space-y-3">
            <label className="block text-xs font-medium text-neutral-400">
              URL (https:// или mailto:)
            </label>
            <input
              ref={linkInputRef}
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#151515] px-3 py-2 text-sm text-white outline-none focus-visible:border-white/25"
              placeholder="https://"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-full border border-white/15 px-4 py-2 text-sm text-neutral-300 hover:bg-white/5"
                onClick={cancelLink}
              >
                Назад
              </button>
              <button
                type="button"
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-neutral-200"
                onClick={confirmLink}
              >
                Вставить ссылку
              </button>
            </div>
          </div>
        )}

        {!linkStep ? (
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              className="rounded-full px-4 py-2 text-sm text-neutral-500 hover:text-neutral-300"
              onClick={onClose}
            >
              Закрыть
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
