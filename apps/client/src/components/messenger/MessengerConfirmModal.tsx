import { cn } from "@/lib/utils";
import { useEffect } from "react";

type MessengerConfirmModalProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** danger — красная кнопка подтверждения (удаление и т.п.) */
  variant?: "danger" | "default";
  onConfirm: () => void;
  onClose: () => void;
};

/** Подтверждение в стиле остальных модалок мессенджера (PostEdit, Poll). */
export function MessengerConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Отмена",
  variant = "default",
  onConfirm,
  onClose,
}: MessengerConfirmModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[142] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="messenger-confirm-title"
      aria-describedby={description ? "messenger-confirm-desc" : undefined}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[400px] rounded-2xl border border-white/[0.08] bg-[#1e1e1e] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="messenger-confirm-title"
          className="text-lg font-semibold tracking-tight text-white"
        >
          {title}
        </h2>
        {description ? (
          <p
            id="messenger-confirm-desc"
            className="mt-2 text-sm leading-relaxed text-neutral-400"
          >
            {description}
          </p>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-white/5"
            onClick={onClose}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              variant === "danger"
                ? "bg-red-600 text-white hover:bg-red-500"
                : "bg-white text-black hover:bg-neutral-200",
            )}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
