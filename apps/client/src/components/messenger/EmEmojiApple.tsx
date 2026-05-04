import { EMOJI_MART_SET } from "@/lib/emoji-mart-init";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

type EmEmojiAppleProps = {
  native: string;
  className?: string;
};

/**
 * Один эмодзи в стиле Apple (emoji-mart + спрайт).
 * Создаём `em-emoji` через DOM: так гарантированно применяются `native` и `set`,
 * иначе React иногда оставляет системный шрифт (Segoe UI Emoji на Windows).
 */
export function EmEmojiApple({ native, className }: EmEmojiAppleProps) {
  const wrapRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const host = wrapRef.current;
    if (!host) {
      return;
    }
    host.replaceChildren();
    const el = document.createElement("em-emoji");
    el.setAttribute("native", native);
    el.setAttribute("set", EMOJI_MART_SET);
    el.setAttribute("size", "1.15em");
    host.appendChild(el);
    return () => {
      el.remove();
    };
  }, [native]);

  return (
    <span
      ref={wrapRef}
      className={cn("inline-block align-[-0.2em] leading-none", className)}
      aria-hidden
    />
  );
}
