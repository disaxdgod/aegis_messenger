import { IconCheckVerified, IconSearch } from "@/components/messenger/nav-icons";
import {
  DEMO_EMPLOYEES,
  demoAvatar,
  demoEmployeeDisplayName,
} from "@/data/demo-seed";
import { currentUserDisplayName, currentUserHandle } from "@/lib/current-user-display";
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

const CARD = "var(--block-bg)";
const SURFACE = "var(--block-bg-secondary)";
const HASHTAG_PLAQUE_BG = "var(--block-bg)";
const HASHTAG_BLUE = "var(--link-color)";

type SearchPerson = {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string;
  role: string;
  verified?: boolean;
};

function searchNeedle(raw: string): string {
  return raw.trim().toLowerCase().replace(/^[@#]+/u, "");
}

/** Строка «Люди» (аватар + текст). */
const RESULT_ROW_CLASS =
  "flex w-full items-center gap-3 rounded-2xl border border-theme-border px-3 py-3 text-left transition-[border-color,background-color,transform] duration-150 hover:border-theme-border hover:bg-theme-hover active:scale-[0.985]";

const AVATAR_BOX_CLASS =
  "flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-theme-border bg-theme-card text-xl leading-none";

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
        "w-full rounded-[22px] px-5 py-3.5 text-left transition-[border-color,background-color,transform] duration-150",
            "border border-theme-border hover:border-theme-border hover:bg-theme-hover active:scale-[0.985]",
      )}
      style={{ backgroundColor: HASHTAG_PLAQUE_BG }}
    >
      <div
        className="truncate text-[15px] font-semibold leading-snug"
        style={{ color: HASHTAG_BLUE }}
      >
        #{tag.display}
      </div>
      <div className="mt-1 truncate text-[13px] leading-snug text-theme-text-2">
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
  const openProfile = useAppNavStore((s) => s.openProfile);
  const [query, setQuery] = useState("");

  const trimmed = query.trim();
  const needle = useMemo(() => searchNeedle(query), [query]);
  const showLiveResults = trimmed.length > 0;

  const selfPerson: SearchPerson = useMemo(() => {
    const handle = currentUserHandle(username);
    const displayName = currentUserDisplayName(firstName, lastName, username);
    return {
      id: "me",
      displayName,
      username: handle,
      avatarUrl: avatarObjectUrl ?? demoAvatar(handle),
      role: "Практикант",
      verified: true,
    };
  }, [firstName, lastName, username, avatarObjectUrl]);

  const directoryPeople = useMemo(
    () =>
      DEMO_EMPLOYEES.map((e) => ({
        id: e.id,
        displayName: demoEmployeeDisplayName(e),
        username: e.username,
        avatarUrl: demoAvatar(e.username),
        role: `${e.role} · ${e.department}`,
        verified: e.verified,
      })),
    [],
  );

  const hashtagIndex = useMemo(
    () => aggregateHashtagStats(posts).sort((a, b) => b.count - a.count),
    [posts],
  );

  const filteredPeople = useMemo(() => {
    if (!needle) {
      return [];
    }
    const merged = directoryPeople.map((p) =>
      p.username === selfPerson.username ? selfPerson : p,
    );
    return merged.filter(
      (p) =>
        p.displayName.toLowerCase().includes(needle) ||
        p.username.toLowerCase().includes(needle) ||
        p.role.toLowerCase().includes(needle),
    );
  }, [directoryPeople, selfPerson, needle]);

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
      if (handle) {
        openProfile({ username: handle });
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
    <div className="font-sans text-theme-text">
      <h1 className="mb-5 text-2xl font-bold tracking-tight">Поиск</h1>

      <form onSubmit={onSubmit} className="mb-6">
        <label htmlFor="global-search" className="sr-only">
          Поиск людей и хештегов
        </label>
        <div
          className="flex items-center gap-3 rounded-full border border-theme-border px-4 py-3"
          style={{ backgroundColor: SURFACE }}
        >
          <IconSearch
            className="shrink-0 text-theme-text-2"
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
            className="min-w-0 flex-1 bg-transparent text-[15px] text-theme-text outline-none placeholder:text-theme-text-2"
            autoComplete="off"
            enterKeyHint="search"
          />
        </div>
      </form>

      {showLiveResults ? (
        <div className="space-y-8">
          <section aria-label="Люди">
            <h2 className="mb-3 text-lg font-semibold text-theme-text">Люди</h2>
            {filteredPeople.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {filteredPeople.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => openProfile({ username: p.username, displayName: p.displayName })}
                      className={RESULT_ROW_CLASS}
                      style={{ backgroundColor: SURFACE }}
                    >
                      <div className={AVATAR_BOX_CLASS}>
                        <img
                          src={p.avatarUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[15px] font-semibold text-theme-text">
                            {p.displayName}
                          </span>
                          {p.verified ? (
                            <IconCheckVerified className="shrink-0" />
                          ) : null}
                        </div>
                        <div className="truncate text-sm text-theme-text-2">
                          @{p.username}
                        </div>
                        <div className="truncate text-xs text-theme-text-2">
                          {p.role}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p
                className="rounded-2xl border border-theme-border px-4 py-6 text-center text-sm text-theme-text-2"
                style={{ backgroundColor: SURFACE }}
              >
                Никого не найдено
              </p>
            )}
          </section>

          <section aria-label="Хештеги">
            <h2 className="mb-3 text-lg font-semibold text-theme-text">Хештеги</h2>
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
                className="rounded-2xl border border-theme-border px-4 py-6 text-center text-sm text-theme-text-2"
                style={{ backgroundColor: SURFACE }}
              >
                Хештегов не найдено
              </p>
            )}
          </section>
        </div>
      ) : (
        <div className="space-y-8">
          <section aria-label="Коллеги">
            <h2 className="mb-4 text-lg font-semibold text-theme-text">
              Сотрудники организации
            </h2>
            <ul className="flex flex-col gap-2">
              {directoryPeople.map((p) => {
                const person =
                  p.username === selfPerson.username ? selfPerson : p;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (person.id === "me" || person.username === selfPerson.username) {
                          openProfile();
                        } else {
                          openProfile({ username: person.username, displayName: person.displayName });
                        }
                      }}
                      className={RESULT_ROW_CLASS}
                      style={{ backgroundColor: SURFACE }}
                    >
                      <div className={AVATAR_BOX_CLASS}>
                        <img
                          src={person.avatarUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[15px] font-semibold text-theme-text">
                            {person.displayName}
                          </span>
                          {person.verified ? (
                            <IconCheckVerified className="shrink-0" />
                          ) : null}
                        </div>
                        <div className="truncate text-sm text-theme-text-2">
                          @{person.username}
                        </div>
                        <div className="truncate text-xs text-theme-text-2">
                          {person.role}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section
            className="rounded-3xl border border-theme-border p-5 sm:p-6"
            style={{ backgroundColor: CARD }}
            aria-label="Популярные хештеги"
          >
          <h2 className="mb-4 text-lg font-semibold text-theme-text">
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
              className="rounded-2xl border border-theme-border px-4 py-10 text-center text-sm text-theme-text-2"
              style={{ backgroundColor: SURFACE }}
            >
              Пока нет хештегов — добавьте #тег в текст поста
            </p>
          )}
        </section>
        </div>
      )}
    </div>
  );
}
