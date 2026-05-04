import ru from "@emoji-mart/data/i18n/ru.json";
import Picker from "@emoji-mart/react";
import { cn } from "@/lib/utils";
import {
  EMOJI_MART_SET,
  emojiMartData,
  ensureEmojiMartData,
} from "@/lib/emoji-mart-init";
import { useEffect } from "react";

type EmojiMartModalProps = {
  open: boolean;
  onClose: () => void;
  onPick: (emojiNative: string) => void;
};

/** Окно emoji-mart без дополнительной рамки: только пикер на затемнённом фоне (закрытие — клик вне или Escape). */
export function EmojiMartModal({ open, onClose, onPick }: EmojiMartModalProps) {
  useEffect(() => {
    if (open) {
      void ensureEmojiMartData();
    }
  }, [open]);

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
      className="fixed inset-0 z-[125] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Эмодзи"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] max-h-[min(88dvh,640px)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={cn(
            "[&_em-emoji-picker]:!h-[min(85dvh,600px)] [&_em-emoji-picker]:!max-h-[min(85dvh,600px)] [&_em-emoji-picker]:!w-full",
          )}
        >
          <Picker
            data={emojiMartData}
            i18n={ru}
            locale="ru"
            theme="dark"
            set={EMOJI_MART_SET}
            /** На Windows emoji-mart по умолчанию скрывает флаги; с Apple-спрайтами их нужно показывать явно. */
            noCountryFlags={false}
            previewPosition="none"
            navPosition="top"
            searchPosition="sticky"
            skinTonePosition="none"
            dynamicWidth
            perLine={8}
            emojiButtonSize={40}
            emojiSize={26}
            maxFrequentRows={3}
            autoFocus
            onEmojiSelect={(emoji: { native: string }) => {
              onPick(emoji.native);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}
