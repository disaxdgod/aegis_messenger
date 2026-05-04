import emojiRegex from "emoji-regex-xs";

export type EmojiTextPart =
  | { kind: "text"; value: string }
  | { kind: "emoji"; value: string };

/** Разбивает строку на фрагменты текста и последовательности эмодзи (RGI-подобная модель). */
export function splitEmojiAware(text: string): EmojiTextPart[] {
  const re = emojiRegex();
  const out: EmojiTextPart[] = [];
  let i = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > i) {
      out.push({ kind: "text", value: text.slice(i, m.index) });
    }
    out.push({ kind: "emoji", value: m[0] });
    i = m.index + m[0].length;
    if (m[0].length === 0) {
      re.lastIndex += 1;
    }
  }
  if (i < text.length) {
    out.push({ kind: "text", value: text.slice(i) });
  }
  return out;
}
