import { EmojiMartModal } from "@/components/messenger/EmojiMartModal";
import { IconSmile } from "@/components/messenger/nav-icons";
import { cn } from "@/lib/utils";
import { useEffect, useId, useRef, useState } from "react";

export type SendMediaAttachmentPayload = {
  file: File;
  /** Для фото/видео: true — оригинал как файл, false — медиа (сжатие для изображений). */
  asDocument: boolean;
  caption: string;
};

type SendMediaAttachmentModalProps = {
  open: boolean;
  file: File | null;
  /** Идёт именно сжатие (Web Worker работает). */
  compressing?: boolean;
  /** Идёт финальная отправка после сжатия. */
  sending?: boolean;
  onClose: () => void;
  onSend: (payload: SendMediaAttachmentPayload) => void | Promise<void>;
};

function formatBytesBrief(n: number): string {
  if (n < 1024) {
    return `${n} B`;
  }
  if (n < 1024 * 1024) {
    return `${(n / 1024).toFixed(1)} KB`;
  }
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function modalTitle(file: File): string {
  if (file.type.startsWith("image/")) {
    return "Отправить изображение";
  }
  if (file.type.startsWith("video/")) {
    return "Отправить видео";
  }
  return "Отправить файл";
}

export function SendMediaAttachmentModal({
  open,
  file,
  compressing = false,
  sending = false,
  onClose,
  onSend,
}: SendMediaAttachmentModalProps) {
  const busy = sending || compressing;
  const dialogTitleId = useId();
  const sendAsFileCheckboxId = useId();
  const captionInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [asDocument, setAsDocument] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);

  const isMedia = Boolean(
    file?.type.startsWith("image/") || file?.type.startsWith("video/"),
  );

  useEffect(() => {
    if (!open || !file) {
      return;
    }
    setCaption("");
    setAsDocument(false);
    setEmojiOpen(false);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
      setPreviewUrl(null);
    };
  }, [open, file]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") {
        return;
      }
      if (emojiOpen) {
        e.preventDefault();
        setEmojiOpen(false);
        return;
      }
      onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, emojiOpen]);

  useEffect(() => {
    if (open && file) {
      const t = window.setTimeout(() => captionInputRef.current?.focus(), 120);
      return () => window.clearTimeout(t);
    }
  }, [open, file]);

  function insertCaptionEmoji(emoji: string) {
    const input = captionInputRef.current;
    if (!input) {
      setCaption((prev) => prev + emoji);
      return;
    }
    const start = input.selectionStart ?? caption.length;
    const end = input.selectionEnd ?? caption.length;
    setCaption((prev) => prev.slice(0, start) + emoji + prev.slice(end));
    const pos = start + emoji.length;
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(pos, pos);
    });
  }

  if (!open || !file) {
    return null;
  }

  const selectedFile = file;

  async function submit() {
    await onSend({
      file: selectedFile,
      asDocument: isMedia ? asDocument : true,
      caption,
    });
  }

  return (
    <>
    <div
      className="fixed inset-0 z-[165] flex items-end justify-center bg-black/65 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={dialogTitleId}
      onClick={onClose}
    >
      <div
        className={cn(
          "flex max-h-[min(92dvh,760px)] w-full max-w-[440px] flex-col overflow-hidden rounded-t-[18px] border border-theme-border bg-theme-card shadow-[0_-8px_48px_rgba(0,0,0,0.3)] sm:rounded-2xl",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-theme-border px-4 py-3 sm:px-4">
          <h2
            id={dialogTitleId}
            className="min-w-0 truncate text-[17px] font-semibold tracking-tight text-theme-text"
          >
            {modalTitle(file)}
          </h2>
          <button
            type="button"
            className="shrink-0 rounded-xl px-3 py-1.5 text-[15px] font-medium text-[#53a5ea] transition-colors hover:bg-theme-hover"
            onClick={onClose}
          >
            Закрыть
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-3">
          <div className="relative overflow-hidden rounded-xl border border-theme-border bg-theme-bg">
            {previewUrl && file.type.startsWith("image/") ? (
              <button
                type="button"
                className="block max-h-[min(52vh,440px)] w-full outline-none focus-visible:ring-2 focus-visible:ring-[#53a5ea]/35"
                onClick={() => window.open(previewUrl, "_blank", "noopener,noreferrer")}
                aria-label="Открыть изображение в новой вкладке"
              >
                <img
                  src={previewUrl}
                  alt=""
                  className="mx-auto block max-h-[min(52vh,440px)] w-auto max-w-full object-contain"
                />
              </button>
            ) : null}
            {previewUrl && file.type.startsWith("video/") ? (
              <video
                src={previewUrl}
                controls
                playsInline
                className="mx-auto block max-h-[min(52vh,440px)] w-full bg-black object-contain"
              />
            ) : null}
            {!file.type.startsWith("image/") && !file.type.startsWith("video/") ? (
              <div className="flex min-h-[120px] flex-col justify-center gap-1 px-4 py-6">
                <p className="truncate text-[15px] font-medium text-theme-text">{file.name}</p>
                <p className="text-[13px] text-theme-text-2">{formatBytesBrief(file.size)}</p>
              </div>
            ) : null}
          </div>

          {file.type.startsWith("image/") ? (
            <p className="mt-2 text-center text-[12px] text-theme-text-2">
              Нажмите на фото, чтобы открыть в новой вкладке.
            </p>
          ) : null}

          {isMedia ? (
            <label
              htmlFor={sendAsFileCheckboxId}
              className="mt-4 flex cursor-pointer select-none items-center gap-3 py-1"
            >
              <span className="relative h-[18px] w-[18px] shrink-0">
                <input
                  id={sendAsFileCheckboxId}
                  type="checkbox"
                  checked={asDocument}
                  onChange={(e) => setAsDocument(e.target.checked)}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
                <span
                  className={cn(
                    "pointer-events-none absolute inset-0 flex items-center justify-center rounded-[5px] border-2 transition-all duration-150",
                    asDocument
                      ? "border-[#53a5ea] bg-[#53a5ea]"
                      : "border-theme-border bg-transparent",
                  )}
                >
                  {asDocument && (
                    <svg
                      className="h-[9px] w-[9px] text-white"
                      fill="none"
                      viewBox="0 0 9 9"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      aria-hidden
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M1 4.5l2.5 2.5 5-5" />
                    </svg>
                  )}
                </span>
              </span>
              <span
                className={cn(
                  "text-[14px] font-medium transition-colors duration-150",
                  asDocument ? "text-theme-text" : "text-theme-text-2",
                )}
              >
                Отправить как файл
              </span>
            </label>
          ) : null}

          <div className="mt-5">
            <label
              htmlFor={`send-media-caption-${dialogTitleId}`}
              className="block text-[13px] font-medium text-[#53a5ea]"
            >
              Подпись
            </label>
            <div className="relative mt-1.5 border-b border-[#53a5ea]/35 pb-1 focus-within:border-[#53a5ea]/55">
              <input
                ref={captionInputRef}
                id={`send-media-caption-${dialogTitleId}`}
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Добавить подпись…"
                className="w-full bg-transparent pr-11 text-[15px] text-theme-text outline-none placeholder:text-theme-text-2"
              />
              <button
                type="button"
                className="absolute right-0 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-theme-text-2 transition-[color,background-color] hover:bg-theme-hover hover:text-theme-text"
                aria-label="Эмодзи"
                onClick={() => setEmojiOpen(true)}
              >
                <IconSmile className="h-[18px] w-[18px]" aria-hidden />
              </button>
            </div>
          </div>
        </div>

        <footer className="flex shrink-0 items-center justify-end gap-5 border-t border-theme-border px-4 py-3">
          <button
            type="button"
            className="text-[15px] font-medium text-[#53a5ea] transition-colors hover:text-[#6eb6f0] disabled:opacity-50"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            Отмена
          </button>
          <button
            type="button"
            className="flex items-center gap-2 text-[15px] font-semibold text-[#53a5ea] transition-colors hover:text-[#6eb6f0] disabled:opacity-50"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              void submit();
            }}
          >
            {compressing ? (
              <>
                <span
                  className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#53a5ea]/30 border-t-[#53a5ea]"
                  aria-hidden
                />
                Сжатие…
              </>
            ) : sending ? (
              <>
                <span
                  className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#53a5ea]/30 border-t-[#53a5ea]"
                  aria-hidden
                />
                Отправка…
              </>
            ) : (
              "Отправить"
            )}
          </button>
        </footer>
      </div>
    </div>

    <EmojiMartModal
      open={emojiOpen}
      onClose={() => setEmojiOpen(false)}
      onPick={insertCaptionEmoji}
      closeOnEscape={false}
      overlayClassName="z-[175]"
    />
    </>
  );
}
