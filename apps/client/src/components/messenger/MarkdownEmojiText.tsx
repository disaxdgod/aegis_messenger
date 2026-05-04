import { EmEmojiApple } from "@/components/messenger/EmEmojiApple";
import { ensureEmojiMartData } from "@/lib/emoji-mart-init";
import { escapeHtml } from "@/lib/markdown-selection";
import { splitEmojiAware } from "@/lib/split-emoji-text";
import { cn } from "@/lib/utils";
import { createElement, useEffect, useState, type MouseEvent } from "react";

function miniMarkdownHtml(s: string, linkHashtags: boolean): string {
  let h = escapeHtml(s);
  h = h.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  h = h.replace(/~~(.+?)~~/g, "<del>$1</del>");
  h = h.replace(
    /`([^`]+)`/g,
    '<code class="rounded bg-white/10 px-1 py-0.5 text-[0.9em] font-mono text-neutral-100">$1</code>',
  );
  h = h.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_, label: string, url: string) => {
      const u = String(url).trim();
      if (!/^https?:\/\//i.test(u) && !/^mailto:/i.test(u)) {
        return escapeHtml(`[${label}](${url})`);
      }
      return `<a href="${escapeHtml(u)}" class="text-cyan-400 underline decoration-cyan-400/50 underline-offset-2 hover:text-cyan-300" target="_blank" rel="noopener noreferrer">${escapeHtml(String(label))}</a>`;
    },
  );
  h = h.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>");
  if (linkHashtags) {
    h = h.replace(/#([\p{L}\p{N}_]+)/gu, (_, tag: string) => {
      const safe = escapeHtml(tag);
      const key = escapeHtml(tag.toLowerCase());
      return `<span data-itd-h="${key}" class="cursor-pointer font-medium text-[#71AAEB] hover:underline">#${safe}</span>`;
    });
  }
  return h;
}

type MarkdownEmojiTextProps = {
  text: string;
  className?: string;
  /** Клик по #хештегу в тексте (ключ — в нижнем регистре, без `#`). */
  onHashtagClick?: (normalizedKey: string) => void;
};

/**
 * Текст поста/комментария: Markdown + эмодзи emoji-mart (**набор Apple**, как в iOS/Telegram).
 */
export function MarkdownEmojiText({
  text,
  className,
  onHashtagClick,
}: MarkdownEmojiTextProps) {
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
      <span className={cn("whitespace-pre-wrap break-words", className)}>
        {text}
      </span>
    );
  }

  const parts = splitEmojiAware(text);
  const linkTags = Boolean(onHashtagClick);

  function onRootClick(e: MouseEvent<HTMLSpanElement>) {
    if (!onHashtagClick) {
      return;
    }
    const el = (e.target as HTMLElement).closest("[data-itd-h]");
    if (!el || !e.currentTarget.contains(el)) {
      return;
    }
    e.preventDefault();
    const v = el.getAttribute("data-itd-h");
    if (v) {
      onHashtagClick(v);
    }
  }

  return (
    <span
      className={cn(
        "whitespace-pre-wrap break-words leading-relaxed [&_a]:break-all",
        "[&_em-emoji]:inline-block [&_em-emoji]:align-[-0.2em] [&_em-emoji]:leading-none",
        className,
      )}
      onClick={linkTags ? onRootClick : undefined}
    >
      {parts.map((p, i) =>
        p.kind === "emoji" ? (
          <EmEmojiApple key={`e-${i}-${p.value}`} native={p.value} />
        ) : (
          createElement("span", {
            key: `t-${i}`,
            dangerouslySetInnerHTML: {
              __html: miniMarkdownHtml(p.value, linkTags),
            },
          })
        ),
      )}
    </span>
  );
}
