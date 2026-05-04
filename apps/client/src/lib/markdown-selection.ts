import type { RefObject } from "react";

export type SelectionSnapshot = { start: number; end: number };

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function wrapMarkdown(
  value: string,
  snap: SelectionSnapshot,
  mode: "bold" | "italic" | "strike" | "code",
): { next: string; selStart: number; selEnd: number } {
  const { start, end } = snap;
  const selected = value.slice(start, end);
  let wrapped: string;
  switch (mode) {
    case "bold":
      wrapped = `**${selected}**`;
      break;
    case "italic":
      wrapped = `*${selected}*`;
      break;
    case "strike":
      wrapped = `~~${selected}~~`;
      break;
    case "code":
      wrapped = `\`${selected}\``;
      break;
    default:
      wrapped = selected;
  }
  const next = value.slice(0, start) + wrapped + value.slice(end);
  const innerLen = selected.length;
  let prefixLen = 0;
  if (mode === "bold") {
    prefixLen = 2;
  } else if (mode === "italic") {
    prefixLen = 1;
  } else if (mode === "strike") {
    prefixLen = 2;
  } else {
    prefixLen = 1;
  }
  const innerStart = start + prefixLen;
  const innerEnd = innerStart + innerLen;
  return { next, selStart: innerStart, selEnd: innerEnd };
}

export function wrapMarkdownLink(
  value: string,
  snap: SelectionSnapshot,
  url: string,
): { next: string; selStart: number; selEnd: number } {
  const { start, end } = snap;
  const selected = value.slice(start, end);
  const label = selected.trim() || "ссылка";
  const wrapped = `[${label}](${url})`;
  const next = value.slice(0, start) + wrapped + value.slice(end);
  const selEnd = start + wrapped.length;
  return { next, selStart: start, selEnd };
}

export function focusTextareaRange(
  ref: RefObject<HTMLTextAreaElement | null>,
  selStart: number,
  selEnd: number,
) {
  requestAnimationFrame(() => {
    const ta = ref.current;
    if (!ta) {
      return;
    }
    ta.focus();
    ta.setSelectionRange(selStart, selEnd);
  });
}
