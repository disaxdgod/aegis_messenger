import { ProfileLink } from "@/components/messenger/ProfileLink";
import type { SocialProfile } from "@/lib/social-graph";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

type ProfileConnectionsModalProps = {
  open: boolean;
  title: string;
  emptyText: string;
  profiles: SocialProfile[];
  onClose: () => void;
};

function getAvatarFallback(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return "?";
  }
  return trimmed[0]?.toUpperCase() ?? "?";
}

export function ProfileConnectionsModal({
  open,
  title,
  emptyText,
  profiles,
  onClose,
}: ProfileConnectionsModalProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return profiles;
    }
    return profiles.filter(
      (p) =>
        p.displayName.toLowerCase().includes(q) ||
        p.username.toLowerCase().includes(q) ||
        p.roleLine.toLowerCase().includes(q),
    );
  }, [profiles, search]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[160] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-connections-title"
      onClick={() => {
        setSearch("");
        onClose();
      }}
    >
      <div
        className="w-full max-w-[520px] rounded-2xl border border-theme-border bg-theme-card p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p id="profile-connections-title" className="text-base font-semibold text-theme-text">
          {title}
        </p>
        <p className="mt-1 text-xs text-theme-text-2">
          {profiles.length}{" "}
          {profiles.length === 1 ? "человек" : profiles.length < 5 ? "человека" : "человек"}
        </p>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по имени или @username"
          className="mt-3 w-full rounded-lg border border-theme-border bg-theme-hover px-3 py-2 text-sm text-theme-text outline-none placeholder:text-theme-text-2 focus-visible:border-theme-border"
        />

        {filtered.length > 0 ? (
          <ul className="mt-3 max-h-[340px] space-y-1.5 overflow-auto pr-1">
            {filtered.map((profile) => (
              <li key={profile.username}>
                <ProfileLink
                  username={profile.username}
                  displayName={profile.displayName}
                  onNavigate={() => {
                    setSearch("");
                    onClose();
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg border border-theme-border bg-theme-hover px-2.5 py-2",
                  )}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-theme-border bg-theme-card-2 text-xs text-theme-text">
                    {profile.avatarUrl ? (
                      <img
                        src={profile.avatarUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span aria-hidden>{getAvatarFallback(profile.displayName)}</span>
                    )}
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="truncate text-sm font-medium text-theme-text">
                      {profile.displayName}
                    </p>
                    <p className="truncate text-xs text-theme-text-2">@{profile.username}</p>
                    <p className="truncate text-[11px] text-neutral-500">{profile.roleLine}</p>
                  </div>
                </ProfileLink>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-6 py-8 text-center text-sm text-neutral-500">
            {search.trim() ? "Ничего не найдено" : emptyText}
          </p>
        )}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            className="rounded-full border border-theme-border px-4 py-1.5 text-sm text-theme-text-2 transition-all duration-150 hover:bg-theme-hover active:scale-95 active:bg-theme-active"
            onClick={() => {
              setSearch("");
              onClose();
            }}
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
