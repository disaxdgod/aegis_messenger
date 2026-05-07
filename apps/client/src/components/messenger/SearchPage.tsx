import { IconCheckVerified, IconSearch } from "@/components/messenger/nav-icons";
import { cn } from "@/lib/utils";
import {
  aggregateHashtagStats,
  fmtCountShort,
  normalizeHashtagKey,
} from "@/lib/hashtags";
import { useAppNavStore } from "@/stores/app-nav-store";
import { usePostsStore } from "@/stores/posts-store";
import { useProfileStore } from "@/stores/profile-store";
import { useMemo, useState, type FormEvent } from "react";

const CARD = "#1e1e1e";
const SURFACE = "#272727";
/** Плашка хештега (как на макете): тёмный фон, две строки текста. */
const HASHTAG_PLAQUE_BG = "#242424";
const HASHTAG_BLUE = "#71AAEB";

type SearchPerson = {
  id: string;
  displayName: string;
  username: string;
  emoji: string | null;
  verified?: boolean;
};

function searchNeedle(raw: string): string {
  return raw.trim().toLowerCase().replace(/^[@#]+/u, "");
}

/** Строка «Люди» (аватар + текст). */
const RESULT_ROW_CLASS =
  "flex w-full items-center gap-3 rounded-2xl border border-white/[0.06] px-3 py-3 text-left transition-colors hover:border-white/[0.12] hover:bg-white/[0.03]";

const AVATAR_BOX_CLASS =
  "flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/[0.08] bg-[#1a1a1a] text-xl leading-none";

function getAvatarFallback(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return "?";
  }
  return trimmed[0]?.toUpperCase() ?? "?";
}

function HashtagResultRow({
  tag,
  onPick,
}: {
  tag: { key: string; display: string; count: number };
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        "w-full rounded-[22px] px-5 py-3.5 text-left transition-colors",
        "border border-white/[0.05] hover:border-white/[0.1] hover:bg-white/[0.03]",
      )}
      style={{ backgroundColor: HASHTAG_PLAQUE_BG }}
    >
      <div
        className="truncate text-[15px] font-semibold leading-snug"
        style={{ color: HASHTAG_BLUE }}
      >
        #{tag.display}
      </div>
      <div className="mt-1 truncate text-[13px] leading-snug text-neutral-500">
        {fmtCountShort(tag.count)} постов
      </div>
    </button>
  );
}

export function SearchPage() {
  const posts = usePostsStore((s) => s.posts);
  const username = useProfileStore((s) => s.username);
  const firstName = useProfileStore((s) => s.firstName);
  const lastName = useProfileStore((s) => s.lastName);
  const avatarObjectUrl = useProfileStore((s) => s.avatarObjectUrl);
  const openHashtagFeed = useAppNavStore((s) => s.openHashtagFeed);
  const setScreen = useAppNavStore((s) => s.setScreen);
  const [query, setQuery] = useState("");

  const trimmed = query.trim();
  const needle = useMemo(() => searchNeedle(query), [query]);
  const showLiveResults = trimmed.length > 0;

  const selfPerson: SearchPerson = useMemo(() => {
    const displayName =
      [firstName.trim(), lastName.trim()].filter(Boolean).join(" ") ||
      "Диса Бендер";
    return {
      id: "me",
      displayName,
      username,
      emoji: null,
      verified: true,
    };
  }, [firstName, lastName, username]);

  const hashtagIndex = useMemo(
    () => aggregateHashtagStats(posts).sort((a, b) => b.count - a.count),
    [posts],
  );

  const filteredPeople = useMemo(() => {
    if (!needle) {
      return [];
    }
    const p = selfPerson;
    if (
      p.displayName.toLowerCase().includes(needle) ||
      p.username.toLowerCase().includes(needle)
    ) {
      return [p];
    }
    return [];
  }, [selfPerson, needle]);

  const filteredHashtags = useMemo(() => {
    if (!needle) {
      return [];
    }
    return hashtagIndex.filter(
      (t) =>
        t.key.includes(needle) || t.display.toLowerCase().includes(needle),
    );
  }, [hashtagIndex, needle]);

  function runSearch(raw: string) {
    const q = raw.trim();
    if (!q) {
      return;
    }
    if (q.startsWith("@")) {
      const handle = q.slice(1).trim().split(/\s+/u)[0] ?? "";
      if (handle.toLowerCase() === username.toLowerCase()) {
        setScreen("profile");
        setQuery("");
        return;
      }
    }
    const token = q.replace(/^#+/u, "").trim().split(/\s+/u)[0] ?? "";
    if (normalizeHashtagKey(token)) {
      openHashtagFeed(token, "search");
      setQuery("");
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    runSearch(query);
  }

  return (
    <div className="font-sans text-white">
      <h1 className="mb-5 text-2xl font-bold tracking-tight">Поиск</h1>

      <form onSubmit={onSubmit} className="mb-6">
        <label htmlFor="global-search" className="sr-only">
          Поиск людей и хештегов
        </label>
        <div
          className="flex items-center gap-3 rounded-full border border-white/[0.06] px-4 py-3"
          style={{ backgroundColor: SURFACE }}
        >
          <IconSearch
            className="shrink-0 text-neutral-500"
            width={20}
            height={20}
            aria-hidden
          />
          <input
            id="global-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск людей и хештегов"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-neutral-500"
            autoComplete="off"
            enterKeyHint="search"
          />
        </div>
      </form>

      {showLiveResults ? (
        <div className="space-y-8">
          <section aria-label="Люди">
            <h2 className="mb-3 text-lg font-semibold text-white">Люди</h2>
            {filteredPeople.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {filteredPeople.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setScreen("profile")}
                      className={RESULT_ROW_CLASS}
                      style={{ backgroundColor: SURFACE }}
                    >
                      <div className={AVATAR_BOX_CLASS}>
                        {avatarObjectUrl ? (
                          <img
                            src={avatarObjectUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span aria-hidden>{getAvatarFallback(p.displayName)}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[15px] font-semibold text-white">
                            {p.displayName}
                          </span>
                          {p.verified ? (
                            <IconCheckVerified className="shrink-0" />
                          ) : null}
                        </div>
                        <div className="truncate text-sm text-neutral-500">
                          @{p.username}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p
                className="rounded-2xl border border-white/[0.06] px-4 py-6 text-center text-sm text-neutral-500"
                style={{ backgroundColor: SURFACE }}
              >
                Никого не найдено
              </p>
            )}
          </section>

          <section aria-label="Хештеги">
            <h2 className="mb-3 text-lg font-semibold text-white">Хештеги</h2>
            {filteredHashtags.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {filteredHashtags.map((t) => (
                  <li key={t.key}>
                    <HashtagResultRow
                      tag={t}
                      onPick={() => openHashtagFeed(t.display, "search")}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p
                className="rounded-2xl border border-white/[0.06] px-4 py-6 text-center text-sm text-neutral-500"
                style={{ backgroundColor: SURFACE }}
              >
                Хештегов не найдено
              </p>
            )}
          </section>
        </div>
      ) : (
        <section
          className="rounded-3xl border border-white/[0.06] p-5 sm:p-6"
          style={{ backgroundColor: CARD }}
          aria-label="Популярные хештеги"
        >
          <h2 className="mb-4 text-lg font-semibold text-white">
            Популярные хештеги
          </h2>
          {hashtagIndex.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {hashtagIndex.map((t) => (
                <li key={t.key}>
                  <HashtagResultRow
                    tag={t}
                    onPick={() => openHashtagFeed(t.display, "search")}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p
              className="rounded-2xl border border-white/[0.06] px-4 py-10 text-center text-sm text-neutral-500"
              style={{ backgroundColor: SURFACE }}
            >
              Пока нет хештегов — добавьте #тег в текст поста
            </p>
          )}
        </section>
      )}
    </div>
  );
}
