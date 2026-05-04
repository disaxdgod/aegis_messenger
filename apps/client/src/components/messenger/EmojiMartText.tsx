import { cn } from "@/lib/utils";
import {
  EMOJI_MART_SET,
  ensureEmojiMartData,
} from "@/lib/emoji-mart-init";
import { splitEmojiAware } from "@/lib/split-emoji-text";
import { createElement, useEffect, useState } from "react";

type EmojiMartTextProps = {
  text: string;
  className?: string;
};

/**
 * Текст с эмодзи через emoji-mart (`em-emoji`), тот же набор, что в пикере.
 */
export function EmojiMartText({ text, className }: EmojiMartTextProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void ensureEmojiMartData().then(() => {
      if (!cancelled) {
        setReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!text) {
    return null;
  }

  if (!ready) {
    return (
      <span className={cn("whitespace-pre-wrap", className)}>{text}</span>
    );
  }

  const parts = splitEmojiAware(text);
  return (
    <span className={cn("whitespace-pre-wrap leading-relaxed", className)}>
      {parts.map((p, i) =>
        p.kind === "emoji"
          ? createElement("em-emoji", {
              key: i,
              native: p.value,
              set: EMOJI_MART_SET,
              size: "1.15em",
            })
          : createElement("span", { key: i }, p.value),
      )}
    </span>
  );
}
