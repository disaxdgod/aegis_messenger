import { IconBell, IconCalendar, IconUser } from "@/components/messenger/nav-icons";
import { BannerDrawModal } from "@/components/messenger/BannerDrawModal";
import { PostCard } from "@/components/messenger/PostCard";
import { PostComposer } from "@/components/messenger/PostComposer";
import { IconDesignTheme } from "@/components/messenger/design-theme-icons";
import { AvatarCropModal } from "@/components/messenger/AvatarCropModal";
import { PresenceStatusMenu } from "@/components/messenger/PresenceStatusMenu";
import { cn } from "@/lib/utils";
import { usePostsStore } from "@/stores/posts-store";
import { useProfileStore } from "@/stores/profile-store";
import { useSessionStore } from "@/stores/session-store";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

type ProfileTab = "posts" | "likes";

const PAGE_BG = "var(--bg-primary)";
const CARD = "var(--block-bg)";
const SURFACE_LIFT = "var(--block-bg-secondary)";
const TAB_TRACK = "var(--bg-secondary)";
const TAB_ACTIVE = "var(--block-hover-bg)";

function getAvatarFallback(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return "?";
  }
  return trimmed[0]?.toUpperCase() ?? "?";
}

function AvatarBlock({
  onPick,
  displayName,
}: {
  onPick: (file: File) => void;
  displayName: string;
}) {
  const avatarObjectUrl = useProfileStore((s) => s.avatarObjectUrl);

  return (
    <div className="relative shrink-0">
      <label className="group relative flex h-[112px] w-[112px] cursor-pointer sm:h-[120px] sm:w-[120px]">
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file?.type.startsWith("image/")) {
              onPick(file);
            }
            e.target.value = "";
          }}
        />
        <span
          className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-[5px] bg-theme-card text-[2.65rem] text-theme-text sm:text-[2.85rem]"
          style={{ borderColor: PAGE_BG }}
        >
          {avatarObjectUrl ? (
            <img
              src={avatarObjectUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span aria-hidden>{getAvatarFallback(displayName)}</span>
          )}
        </span>
        <span
          className={cn(
            "pointer-events-none absolute inset-0 flex flex-col items-center justify-center rounded-full bg-black/0 text-center text-[11px] font-medium leading-tight text-white opacity-0 transition-opacity duration-200",
            "group-hover:bg-black/55 group-hover:opacity-100",
          )}
        >
          <span className="px-2">Сменить фото</span>
        </span>
      </label>
      <PresenceStatusMenu />
    </div>
  );
}

export function ProfilePage() {
  const signOut = useSessionStore((s) => s.signOut);
  const username = useProfileStore((s) => s.username);
  const firstName = useProfileStore((s) => s.firstName);
  const lastName = useProfileStore((s) => s.lastName);
  const status = useProfileStore((s) => s.status);
  const setUsername = useProfileStore((s) => s.setUsername);
  const setFirstName = useProfileStore((s) => s.setFirstName);
  const setLastName = useProfileStore((s) => s.setLastName);
  const setStatus = useProfileStore((s) => s.setStatus);
  const setAvatarFromBlob = useProfileStore((s) => s.setAvatarFromBlob);
  const setBannerFromBlob = useProfileStore((s) => s.setBannerFromBlob);
  const bannerObjectUrl = useProfileStore((s) => s.bannerObjectUrl);
  const posts = usePostsStore((s) => s.posts);

  const [tab, setTab] = useState<ProfileTab>("posts");

  const initialPostIds = useRef<Set<string> | null>(null);
  if (initialPostIds.current === null) {
    initialPostIds.current = new Set(posts.map((p) => p.id));
  }
  const [bannerEditorOpen, setBannerEditorOpen] = useState(false);
  const [postComposerOpen, setPostComposerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"account" | "security" | "privacy" | "alerts">(
    "account",
  );
  const [draftDisplayName, setDraftDisplayName] = useState("");
  const [draftUsername, setDraftUsername] = useState("");
  const [draftStatus, setDraftStatus] = useState("");

  // Privacy
  const [privacyWall, setPrivacyWall] = useState<"all" | "friends" | "nobody">("all");
  const [privacyLikes, setPrivacyLikes] = useState<"all" | "friends" | "nobody">("all");
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);

  // Notifications
  const [notifAll, setNotifAll] = useState(true);
  const [notifSound, setNotifSound] = useState(true);
  const [notifSubscriptions, setNotifSubscriptions] = useState(true);
  const [notifWallPosts, setNotifWallPosts] = useState(true);
  const [notifLikes, setNotifLikes] = useState(true);
  const [notifComments, setNotifComments] = useState(true);
  const [notifMentions, setNotifMentions] = useState(true);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const cropSrcRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (cropSrcRef.current) {
        URL.revokeObjectURL(cropSrcRef.current);
        cropSrcRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!settingsOpen) {
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [settingsOpen]);

  const displayName =
    [firstName.trim(), lastName.trim()].filter(Boolean).join(" ") ||
    "Диса Бендер";

  function openSettings() {
    setDraftDisplayName(displayName);
    setDraftUsername(username);
    setDraftStatus(status);
    setSettingsTab("account");
    setSettingsOpen(true);
  }

  function saveSettings() {
    const normalizedUsername = draftUsername.trim().replace(/^@+/, "");
    const normalizedName = draftDisplayName.trim();
    if (normalizedName) {
      const [first, ...rest] = normalizedName.split(/\s+/);
      setFirstName(first ?? "");
      setLastName(rest.join(" "));
    } else {
      setFirstName("");
      setLastName("");
    }
    setUsername(normalizedUsername);
    setStatus(draftStatus.trim());
    setSettingsOpen(false);
  }

  function openCropForFile(file: File) {
    if (cropSrcRef.current) {
      URL.revokeObjectURL(cropSrcRef.current);
      cropSrcRef.current = null;
    }
    const url = URL.createObjectURL(file);
    cropSrcRef.current = url;
    setCropSrc(url);
  }

  function closeCropModal() {
    if (cropSrcRef.current) {
      URL.revokeObjectURL(cropSrcRef.current);
      cropSrcRef.current = null;
    }
    setCropSrc(null);
  }

  function applyCroppedAvatar(blob: Blob) {
    setAvatarFromBlob(blob);
    closeCropModal();
  }

  return (
    <div className="font-sans text-theme-text">
      {cropSrc ? (
        <AvatarCropModal
          imageSrc={cropSrc}
          onClose={closeCropModal}
          onComplete={applyCroppedAvatar}
        />
      ) : null}

      <BannerDrawModal
        open={bannerEditorOpen}
        onClose={() => setBannerEditorOpen(false)}
        onComplete={(blob) => setBannerFromBlob(blob)}
      />
      {postComposerOpen ? (
        <div
          className="fixed inset-0 z-[96] flex items-end bg-black/70 p-0 backdrop-blur-sm sm:p-4 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Новая публикация"
          onClick={() => setPostComposerOpen(false)}
        >
          <div
            className="max-h-[90dvh] w-full overflow-auto rounded-t-3xl border border-theme-border bg-theme-card sm:mx-auto sm:max-w-[640px] sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-theme-border bg-[color-mix(in_srgb,var(--block-bg)_95%,transparent)] px-4 py-3 backdrop-blur-md">
              <p className="text-sm font-semibold text-theme-text">Новая публикация</p>
              <button
                type="button"
                className="rounded-full px-3 py-1 text-xs text-neutral-400 transition-[color,background-color,transform] duration-150 hover:bg-white/10 hover:text-white active:scale-95"
                onClick={() => setPostComposerOpen(false)}
              >
                Закрыть
              </button>
            </div>
            <PostComposer
              className="rounded-none p-4 sm:p-5"
              style={{ backgroundColor: SURFACE_LIFT }}
            />
            <div className="h-[max(12px,env(safe-area-inset-bottom))]" aria-hidden />
          </div>
        </div>
      ) : null}
      {settingsOpen ? (
        <div
          className="fixed inset-0 z-[97] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Настройки профиля"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-theme-border bg-theme-card shadow-[0_-8px_48px_rgba(0,0,0,0.4)] sm:h-[min(90dvh,620px)] sm:max-h-none sm:max-w-[860px] sm:flex-row sm:rounded-2xl sm:shadow-[0_24px_72px_rgba(0,0,0,0.5)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile: drag handle */}
            <div className="flex shrink-0 justify-center pb-1 pt-3 sm:hidden" aria-hidden>
              <span className="h-1 w-10 rounded-full bg-white/20" />
            </div>

            {/* Mobile: horizontal icon tab bar */}
            <nav className="flex shrink-0 items-center justify-around border-b border-white/[0.07] px-4 py-2 sm:hidden">
              {(
                [
                  { id: "account", icon: <IconUser className="h-5 w-5" /> },
                  { id: "security", icon: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6l-8-4z" /></svg> },
                  { id: "privacy", icon: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M18 11V7a6 6 0 0 0-12 0v4" /><rect x="3" y="11" width="18" height="11" rx="2" /><circle cx="12" cy="16" r="1.5" fill="currentColor" /></svg> },
                  { id: "alerts", icon: <IconBell className="h-5 w-5" /> },
                ] as { id: string; icon: ReactNode }[]
              ).map(({ id, icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSettingsTab(id as typeof settingsTab)}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl transition-[background-color,color] duration-150",
                    settingsTab === id ? "bg-theme-active text-theme-text" : "text-theme-text-2",
                  )}
                >
                  {icon}
                </button>
              ))}
            </nav>

            {/* Desktop: vertical sidebar */}
            <aside className="hidden w-[200px] shrink-0 border-r border-theme-border bg-theme-bg p-3 sm:block">
              <p className="px-3 pb-2 pt-2 text-[15px] font-bold tracking-tight text-theme-text">
                Настройки
              </p>
              <nav className="mt-1 space-y-0.5">
                {(
                  [
                    {
                      id: "account",
                      label: "Аккаунт",
                      icon: <IconUser className="h-[15px] w-[15px]" />,
                    },
                    {
                      id: "security",
                      label: "Безопасность",
                      icon: (
                        <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6l-8-4z" />
                        </svg>
                      ),
                    },
                    {
                      id: "privacy",
                      label: "Приватность",
                      icon: (
                        <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M18 11V7a6 6 0 0 0-12 0v4" />
                          <rect x="3" y="11" width="18" height="11" rx="2" />
                          <circle cx="12" cy="16" r="1.5" fill="currentColor" />
                        </svg>
                      ),
                    },
                    {
                      id: "alerts",
                      label: "Уведомления",
                      icon: <IconBell className="h-[15px] w-[15px]" />,
                    },
                  ] as { id: string; label: string; icon: ReactNode }[]
                ).map(({ id, label, icon }) => (
                  <button
                    key={id}
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[14px] font-medium transition-[color,background-color] duration-150 active:scale-[0.97]",
                      settingsTab === id
                        ? "bg-theme-hover text-theme-text"
                        : "text-theme-text-2 hover:bg-theme-hover hover:text-theme-text",
                    )}
                    onClick={() => setSettingsTab(id as typeof settingsTab)}
                  >
                    <span className="shrink-0">{icon}</span>
                    {label}
                  </button>
                ))}
              </nav>
            </aside>

            {/* Main panel */}
            <div className="flex min-w-0 flex-1 flex-col bg-theme-card">
              {/* Header */}
              <div className="flex shrink-0 items-center justify-between border-b border-theme-border px-5 py-3 sm:px-6 sm:py-4">
                <h2 className="text-[17px] font-bold text-theme-text">
                  {settingsTab === "account"
                    ? "Аккаунт"
                    : settingsTab === "security"
                      ? "Безопасность"
                      : settingsTab === "privacy"
                        ? "Приватность"
                        : "Уведомления"}
                </h2>
                <button
                  type="button"
                  className="grid h-8 w-8 place-items-center rounded-full bg-white/[0.06] text-[18px] text-neutral-400 transition-[background-color,color] duration-150 hover:bg-white/[0.1] hover:text-white active:scale-90"
                  onClick={() => setSettingsOpen(false)}
                  aria-label="Закрыть настройки"
                >
                  ×
                </button>
              </div>

              {/* Content */}
              <div className="min-h-0 flex-1 overflow-y-auto">

                {/* ── Аккаунт ── */}
                {settingsTab === "account" ? (
                  <div className="flex h-full flex-col">
                    <div className="flex-1 overflow-y-auto px-5 py-2 sm:px-6">

                      {/* Имя */}
                      <div className="border-b border-theme-border py-4 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:py-5">
                        <div className="sm:shrink-0">
                          <p className="text-[15px] font-semibold text-theme-text">Имя</p>
                          <p className="mt-0.5 text-[13px] text-theme-text-2">Ваше отображаемое имя</p>
                        </div>
                        <input
                          value={draftDisplayName}
                          onChange={(e) => setDraftDisplayName(e.target.value)}
                          className="mt-2.5 h-10 w-full rounded-xl bg-theme-card-2 px-3.5 text-[14px] text-theme-text outline-none placeholder:text-theme-text-2 focus:ring-1 focus:ring-theme-border sm:mt-0 sm:w-[210px] sm:shrink-0"
                          placeholder="Ваше имя"
                        />
                      </div>

                      {/* Username */}
                      <div className="border-b border-theme-border py-4 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:py-5">
                        <div className="sm:min-w-0 sm:shrink">
                          <p className="text-[15px] font-semibold text-theme-text">Username</p>
                          <p className="mt-0.5 text-[13px] leading-snug text-theme-text-2">
                            Ваш уникальный идентификатор (только латиница, цифры и _)
                          </p>
                        </div>
                        <input
                          value={draftUsername}
                          onChange={(e) => setDraftUsername(e.target.value)}
                          className="mt-2.5 h-10 w-full rounded-xl bg-theme-card-2 px-3.5 text-[14px] text-theme-text outline-none placeholder:text-theme-text-2 focus:ring-1 focus:ring-theme-border sm:mt-0 sm:w-[210px] sm:shrink-0"
                          placeholder="username"
                        />
                      </div>

                      {/* О себе */}
                      <div className="py-4 sm:py-5">
                        <p className="text-[15px] font-semibold text-theme-text">О себе</p>
                        <p className="mt-0.5 text-[13px] text-theme-text-2">Расскажите немного о себе</p>
                        <textarea
                          rows={4}
                          value={draftStatus}
                          onChange={(e) => setDraftStatus(e.target.value)}
                          className="mt-3 w-full resize-none rounded-xl bg-theme-card-2 px-3.5 py-3 text-[14px] text-theme-text outline-none placeholder:text-theme-text-2 focus:ring-1 focus:ring-theme-border"
                          placeholder="Пример текста"
                        />
                      </div>

                      {/* Выйти / Удалить — только на мобиле */}
                      <div className="space-y-3 py-4 sm:hidden">
                        <button
                          type="button"
                          onClick={signOut}
                          className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/50 px-4 py-3 text-[14px] font-semibold text-red-400 transition-[background-color,transform] duration-150 hover:bg-red-500/10 active:scale-[0.98]"
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                          </svg>
                          Выйти из аккаунта
                        </button>
                        <button
                          type="button"
                          className="w-full py-2 text-[14px] font-medium text-red-500/80 transition-colors hover:text-red-400"
                        >
                          Удалить аккаунт
                        </button>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center justify-end gap-2 border-t border-white/[0.05] px-5 py-4 sm:px-6">
                      <button type="button" className="rounded-full border border-theme-border px-4 py-1.5 text-sm text-theme-text-2 transition-[background-color,transform] duration-150 hover:bg-theme-hover active:scale-[0.96]" onClick={() => setSettingsOpen(false)}>Отмена</button>
                      <button type="button" className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-black transition-[background-color,transform] duration-150 hover:bg-neutral-200 active:scale-[0.96]" onClick={saveSettings}>Сохранить</button>
                    </div>
                  </div>
                ) : null}

                {/* ── Безопасность ── */}
                {settingsTab === "security" ? (
                  <div className="px-5 py-2 sm:px-6">
                    <div className="flex items-center justify-between gap-6 border-b border-theme-border py-5">
                      <div>
                        <p className="text-[15px] font-semibold text-theme-text">Пароль</p>
                        <p className="mt-0.5 text-[13px] text-theme-text-2">Изменить пароль от аккаунта</p>
                      </div>
                      <button
                        type="button"
                        className="shrink-0 rounded-full bg-white px-4 py-2 text-[14px] font-semibold text-black transition-[background-color,transform] duration-150 hover:bg-neutral-200 active:scale-[0.96]"
                      >
                        Сменить пароль
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* ── Приватность ── */}
                {settingsTab === "privacy" ? (
                  <div className="px-5 py-2 sm:px-6">
                    {/* Стена */}
                    <div className="flex items-center justify-between gap-6 border-b border-theme-border py-5">
                      <div>
                        <p className="text-[15px] font-semibold text-theme-text">Стена</p>
                        <p className="mt-0.5 text-[13px] text-theme-text-2">Кто может писать на вашей стене</p>
                      </div>
                      <select
                        value={privacyWall}
                        onChange={(e) => setPrivacyWall(e.target.value as typeof privacyWall)}
                        className="h-10 w-[130px] shrink-0 cursor-pointer appearance-none rounded-xl bg-theme-card-2 px-3.5 pr-8 text-[14px] text-theme-text outline-none focus:ring-1 focus:ring-theme-border"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}
                      >
                        <option value="all">Все</option>
                        <option value="friends">Друзья</option>
                        <option value="nobody">Никто</option>
                      </select>
                    </div>
                    {/* Лайки */}
                    <div className="flex items-center justify-between gap-6 border-b border-theme-border py-5">
                      <div>
                        <p className="text-[15px] font-semibold text-theme-text">Лайки</p>
                        <p className="mt-0.5 text-[13px] text-theme-text-2">Кто может видеть ваши лайкнутые посты</p>
                      </div>
                      <select
                        value={privacyLikes}
                        onChange={(e) => setPrivacyLikes(e.target.value as typeof privacyLikes)}
                        className="h-10 w-[130px] shrink-0 cursor-pointer appearance-none rounded-xl bg-theme-card-2 px-3.5 pr-8 text-[14px] text-theme-text outline-none focus:ring-1 focus:ring-theme-border"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}
                      >
                        <option value="all">Все</option>
                        <option value="friends">Друзья</option>
                        <option value="nobody">Никто</option>
                      </select>
                    </div>
                    {/* Онлайн-статус */}
                    <div className="flex items-center justify-between gap-6 border-b border-theme-border py-5">
                      <div>
                        <p className="text-[15px] font-semibold text-theme-text">Онлайн-статус</p>
                        <p className="mt-0.5 text-[13px] text-theme-text-2">Показывать время последнего визита</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={showOnlineStatus}
                        onClick={() => setShowOnlineStatus((v) => !v)}
                        className={cn(
                          "relative h-[28px] w-[50px] shrink-0 rounded-full transition-colors duration-200",
                          showOnlineStatus ? "bg-[#53a5ea]" : "bg-theme-card-3",
                        )}
                      >
                        <span className="absolute left-[3px] top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow-sm transition-[left] duration-200" style={{ left: showOnlineStatus ? 25 : 3 }} />
                      </button>
                    </div>
                    {/* Чёрный список */}
                    <div className="pt-5">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">Чёрный список</p>
                      <p className="mt-6 text-center text-[14px] text-neutral-500">Чёрный список пуст</p>
                    </div>
                  </div>
                ) : null}

                {/* ── Уведомления ── */}
                {settingsTab === "alerts" ? (
                  <div className="flex h-full flex-col">
                    <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">

                      {/* ОСНОВНЫЕ */}
                      <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-neutral-500">Основные</p>
                      {[
                        {
                          label: "Уведомления",
                          desc: "Включение или отключение всех уведомлений",
                          value: notifAll,
                          set: setNotifAll,
                          bg: "bg-[#3b82f6]",
                          icon: (
                            <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="currentColor" aria-hidden><path d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2zm6-6V11a6 6 0 1 0-12 0v5l-2 2v1h16v-1l-2-2z"/></svg>
                          ),
                        },
                        {
                          label: "Уведомления со звуком",
                          desc: "Воспроизводить звуки уведомлений",
                          value: notifSound,
                          set: setNotifSound,
                          bg: "bg-[#3b82f6]",
                          icon: (
                            <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                          ),
                        },
                      ].map(({ label, desc, value, set, bg, icon }) => (
                        <div key={label} className="flex items-center gap-3 border-b border-theme-border py-4">
                          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", bg)}>{icon}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[14px] font-semibold text-theme-text">{label}</p>
                            <p className="text-[12px] text-theme-text-2">{desc}</p>
                          </div>
                          <button type="button" role="switch" aria-checked={value} onClick={() => set((v) => !v)} className={cn("relative h-[28px] w-[50px] shrink-0 rounded-full transition-colors duration-200", value ? "bg-[#53a5ea]" : "bg-theme-card-3")}>
                            <span className="absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow-sm transition-[left] duration-200" style={{ left: value ? 25 : 3 }} />
                          </button>
                        </div>
                      ))}

                      {/* ПОЛЬЗОВАТЕЛИ */}
                      <p className="mb-3 mt-5 text-[11px] font-semibold uppercase tracking-widest text-neutral-500">Пользователи</p>
                      {[
                        {
                          label: "Подписки",
                          desc: "Уведомления о подписках и запросах в друзья",
                          value: notifSubscriptions,
                          set: setNotifSubscriptions,
                          bg: "bg-[#3b82f6]",
                          icon: (
                            <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                          ),
                        },
                        {
                          label: "Посты на стене",
                          desc: "Уведомления о новых постах на вашей стене",
                          value: notifWallPosts,
                          set: setNotifWallPosts,
                          bg: "bg-[#3b82f6]",
                          icon: (
                            <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                          ),
                        },
                      ].map(({ label, desc, value, set, bg, icon }) => (
                        <div key={label} className="flex items-center gap-3 border-b border-theme-border py-4">
                          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", bg)}>{icon}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[14px] font-semibold text-theme-text">{label}</p>
                            <p className="text-[12px] text-theme-text-2">{desc}</p>
                          </div>
                          <button type="button" role="switch" aria-checked={value} onClick={() => set((v) => !v)} className={cn("relative h-[28px] w-[50px] shrink-0 rounded-full transition-colors duration-200", value ? "bg-[#53a5ea]" : "bg-theme-card-3")}>
                            <span className="absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow-sm transition-[left] duration-200" style={{ left: value ? 25 : 3 }} />
                          </button>
                        </div>
                      ))}

                      {/* ПОСТЫ */}
                      <p className="mb-3 mt-5 text-[11px] font-semibold uppercase tracking-widest text-neutral-500">Посты</p>
                      {[
                        {
                          label: "Лайки и реакции",
                          desc: "Уведомления о реакциях на ваши посты и комментарии",
                          value: notifLikes,
                          set: setNotifLikes,
                          bg: "bg-[#ef4444]",
                          icon: (
                            <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="currentColor" aria-hidden><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                          ),
                        },
                        {
                          label: "Комментарии и ответы",
                          desc: "Уведомления о новых комментариях и ответах",
                          value: notifComments,
                          set: setNotifComments,
                          bg: "bg-[#3b82f6]",
                          icon: (
                            <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                          ),
                        },
                        {
                          label: "Упоминания",
                          desc: "Уведомления когда вас упоминают в постах",
                          value: notifMentions,
                          set: setNotifMentions,
                          bg: "bg-[#8b5cf6]",
                          icon: (
                            <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/></svg>
                          ),
                        },
                      ].map(({ label, desc, value, set, bg, icon }) => (
                        <div key={label} className="flex items-center gap-3 border-b border-theme-border py-4">
                          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", bg)}>{icon}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[14px] font-semibold text-theme-text">{label}</p>
                            <p className="text-[12px] text-theme-text-2">{desc}</p>
                          </div>
                          <button type="button" role="switch" aria-checked={value} onClick={() => set((v) => !v)} className={cn("relative h-[28px] w-[50px] shrink-0 rounded-full transition-colors duration-200", value ? "bg-[#53a5ea]" : "bg-theme-card-3")}>
                            <span className="absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow-sm transition-[left] duration-200" style={{ left: value ? 25 : 3 }} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex shrink-0 items-center justify-end gap-2 border-t border-theme-border px-5 py-4 sm:px-6">
                      <button type="button" className="rounded-full border border-theme-border px-4 py-1.5 text-sm text-theme-text-2 transition-[background-color,transform] duration-150 hover:bg-theme-hover active:scale-[0.96]" onClick={() => setSettingsOpen(false)}>Отмена</button>
                      <button type="button" className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-black transition-[background-color,transform] duration-150 hover:bg-neutral-200 active:scale-[0.96]" onClick={() => setSettingsOpen(false)}>Сохранить</button>
                    </div>
                  </div>
                ) : null}

              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mb-5 flex justify-end lg:hidden">
        <button
          type="button"
          onClick={signOut}
          className="rounded-full border border-theme-border bg-theme-card px-4 py-2 text-xs font-medium text-theme-text-2 transition-[color,border-color,transform] duration-150 hover:border-theme-border hover:text-theme-text active:scale-[0.96]"
        >
          Выйти
        </button>
      </div>

      <section
        className="rounded-3xl shadow-[0_12px_48px_rgba(0,0,0,0.45)]"
        style={{ backgroundColor: CARD }}
        aria-label="Профиль"
      >
        <div
          className="relative h-[176px] overflow-hidden rounded-t-3xl sm:h-[192px]"
          style={{ backgroundColor: SURFACE_LIFT }}
        >
          {bannerObjectUrl ? (
            <img
              src={bannerObjectUrl}
              alt=""
              className="absolute inset-0 z-0 h-full w-full object-fill object-center"
              draggable={false}
            />
          ) : null}
          {/* Лёгкий градиент снизу — читаемость кнопки на светлом баннере */}
          <div
            className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent"
            aria-hidden
          />
          <button
            type="button"
            onClick={() => setBannerEditorOpen(true)}
            className={cn(
              "absolute bottom-3 right-3 z-[30] flex h-10 w-10 items-center justify-center rounded-xl",
              "border border-theme-border bg-theme-card text-theme-text shadow-[0_4px_20px_rgba(0,0,0,0.2)] backdrop-blur-md",
              "transition-[color,background-color,border-color,transform] duration-200 ease-out",
              "hover:border-theme-border hover:bg-theme-card-2 hover:text-theme-text",
              "active:scale-[0.96] motion-reduce:active:scale-100",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ds-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
            )}
            aria-label="Изменить баннер профиля"
          >
            <IconDesignTheme className="h-[20px] w-[20px] opacity-95" />
          </button>
        </div>

        <div className="relative rounded-b-3xl px-5 pb-8 pt-0 sm:px-8 sm:pb-10">
          <div className="relative z-10 -mt-[58px] flex flex-wrap items-end justify-between gap-4 sm:-mt-[62px]">
            <AvatarBlock onPick={openCropForFile} displayName={displayName} />
            <div className="mb-1 flex flex-wrap items-center justify-end gap-2 sm:gap-2.5">
              <button
                type="button"
                onClick={openSettings}
                className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition-[background-color,transform] duration-150 hover:bg-neutral-100 active:scale-[0.96] active:bg-neutral-200"
              >
                Редактировать
              </button>
            </div>
          </div>

          <div className="mt-6 sm:mt-7">
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <h1 className="text-[1.35rem] font-bold tracking-tight text-theme-text sm:text-2xl">
                {displayName}
              </h1>
              <span className="text-[15px] text-neutral-500">@{username}</span>
            </div>
            {status.trim() ? (
              <p className="mt-2 text-[1.02rem] text-theme-text">{status.trim()}</p>
            ) : null}

            <p className="mt-3 text-sm text-neutral-500">
              <span className="font-semibold text-theme-text">0</span> подписчиков ·{" "}
              <span className="font-semibold text-theme-text">0</span> подписок
            </p>

            <p className="mt-2.5 flex items-center gap-2 text-xs text-neutral-500">
              <IconCalendar className="h-[14px] w-[14px] shrink-0 text-neutral-500" />
              Регистрация: апрель 2026 г.
            </p>
          </div>

          <div
            className="mt-8 flex rounded-full p-1"
            style={{ backgroundColor: TAB_TRACK }}
          >
            <button
              type="button"
              onClick={() => setTab("posts")}
              className={cn(
                "flex-1 rounded-full py-2.5 text-sm font-medium transition-[color,transform,background-color] duration-150 active:scale-[0.97]",
                tab === "posts"
                  ? "text-theme-text"
                  : "text-theme-text-2 hover:text-theme-text",
              )}
              style={
                tab === "posts"
                  ? { backgroundColor: TAB_ACTIVE }
                  : undefined
              }
            >
              Посты
            </button>
            <button
              type="button"
              onClick={() => setTab("likes")}
              className={cn(
                "flex-1 rounded-full py-2.5 text-sm font-medium transition-[color,transform,background-color] duration-150 active:scale-[0.97]",
                tab === "likes"
                  ? "text-theme-text"
                  : "text-theme-text-2 hover:text-theme-text",
              )}
              style={
                tab === "likes"
                  ? { backgroundColor: TAB_ACTIVE }
                  : undefined
              }
            >
              Лайки
            </button>
          </div>

          <div className="mt-5 hidden lg:block">
            <PostComposer
              className="rounded-2xl p-4 sm:p-5"
              style={{ backgroundColor: SURFACE_LIFT }}
            />
          </div>
          <div className="mt-5 lg:hidden">
            <button
              type="button"
              className="h-11 w-full rounded-full px-4 text-sm font-semibold tracking-tight text-theme-text transition-[transform,opacity] duration-150 active:scale-[0.97] active:opacity-85"
              style={{ backgroundColor: TAB_ACTIVE }}
              onClick={() => setPostComposerOpen(true)}
            >
              Создать публикацию
            </button>
          </div>

          {tab === "posts" ? (
            posts.length > 0 ? (
              <div className="mt-6 flex flex-col gap-4">
                {posts.map((p) => (
                  <div
                    key={p.id}
                    style={
                      !initialPostIds.current!.has(p.id)
                        ? { animation: "aegis-post-in 0.30s cubic-bezier(0.25, 1, 0.5, 1)" } as CSSProperties
                        : undefined
                    }
                  >
                    <PostCard post={p} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-8 py-16 text-center text-sm text-neutral-500">
                Нет постов
              </div>
            )
          ) : (
            <div className="mt-8 py-16 text-center text-sm text-neutral-500">
              Нет лайков
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
