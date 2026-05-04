/** Уникальные хештеги из текста (без `#`), порядок — появление в тексте. */
export function extractHashtagTokens(text: string): string[] {
  const re = /#([\p{L}\p{N}_]+)/gu;
  const seen = new Set<string>();
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const key = m[1].toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(m[1]);
    }
  }
  return out;
}

export function normalizeHashtagKey(input: string): string {
  return input.trim().replace(/^#+/u, "").toLowerCase();
}

export function postMatchesHashtag(postText: string, key: string): boolean {
  const k = key.toLowerCase();
  return extractHashtagTokens(postText).some((t) => t.toLowerCase() === k);
}

export type HashtagStat = { key: string; display: string; count: number };

/** Сводка по всем постам: уникальный тег на пост считается один раз. */
export function aggregateHashtagStats(
  items: readonly { text: string }[],
): HashtagStat[] {
  const map = new Map<string, { display: string; count: number }>();
  for (const item of items) {
    const seenInPost = new Set<string>();
    for (const t of extractHashtagTokens(item.text)) {
      const k = t.toLowerCase();
      if (seenInPost.has(k)) {
        continue;
      }
      seenInPost.add(k);
      const cur = map.get(k);
      if (cur) {
        cur.count += 1;
      } else {
        map.set(k, { display: t, count: 1 });
      }
    }
  }
  return [...map.entries()]
    .map(([key, v]) => ({ key, display: v.display, count: v.count }))
    .sort((a, b) => b.count - a.count);
}

export function fmtCountShort(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return String(n);
}
