/**
 * Apple-набор: спрайты как в iOS / Telegram (не системный Segoe UI Emoji на Windows).
 * @see https://github.com/missive/emoji-mart — `set: "apple"`.
 */
import appleData from "@emoji-mart/data/sets/15/apple.json";
import { init } from "emoji-mart";
import { mergeRuKeywordsIntoEmojiData } from "@/lib/emoji-ru-keywords";

export const EMOJI_MART_SET = "apple" as const;

/** Данные Apple + русские keywords для поиска. */
export const emojiMartData = mergeRuKeywordsIntoEmojiData(
  structuredClone(appleData) as typeof appleData,
);

let initPromise: Promise<void> | null = null;

export function ensureEmojiMartData(): Promise<void> {
  if (!initPromise) {
    const p = init({
      data: emojiMartData,
      /** Без этого `em-emoji` может подставлять native / системный шрифт вместо Apple-спрайта. */
      set: EMOJI_MART_SET,
    }) as Promise<void> | void;
    initPromise = p instanceof Promise ? p : Promise.resolve();
  }
  return initPromise;
}
