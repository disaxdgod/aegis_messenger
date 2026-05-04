import { IconCalendar } from "@/components/messenger/nav-icons";
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
import { useEffect, useRef, useState } from "react";

type ProfileTab = "posts" | "likes";

/** Фон страницы — обводка аватара как на макете ИТД. */
const PAGE_BG = "#121212";
/** Карточка профиля и зона под баннером. */
const CARD = "#1e1e1e";
/** Баннер и композер — чуть светлее для глубины. */
const SURFACE_LIFT = "#272727";
const TAB_TRACK = "#222222";
const TAB_ACTIVE = "#333333";

function AvatarBlock({ onPick }: { onPick: (file: File) => void }) {
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
          className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-[5px] bg-[#1a1a1a] text-[2.65rem] text-neutral-200 sm:text-[2.85rem]"
          style={{ borderColor: PAGE_BG }}
        >
          {avatarObjectUrl ? (
            <img
              src={avatarObjectUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span aria-hidden>💀</span>
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
  const setAvatarFromBlob = useProfileStore((s) => s.setAvatarFromBlob);
  const setBannerFromBlob = useProfileStore((s) => s.setBannerFromBlob);
  const bannerObjectUrl = useProfileStore((s) => s.bannerObjectUrl);
  const posts = usePostsStore((s) => s.posts);

  const [tab, setTab] = useState<ProfileTab>("posts");
  const [bannerEditorOpen, setBannerEditorOpen] = useState(false);
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

  const displayName =
    [firstName.trim(), lastName.trim()].filter(Boolean).join(" ") ||
    "Диса Бендер";

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
    <div className="font-sans text-white">
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

      <div className="mb-5 flex justify-end lg:hidden">
        <button
          type="button"
          onClick={signOut}
          className="rounded-full border border-white/10 bg-[#1e1e1e] px-4 py-2 text-xs font-medium text-neutral-500 transition-colors hover:border-white/15 hover:text-neutral-300"
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
              "absolute bottom-3 right-3 z-[2] flex h-10 w-10 items-center justify-center rounded-xl",
              "border border-white/[0.12] bg-[#1a1a1a]/85 text-neutral-200 shadow-[0_4px_20px_rgba(0,0,0,0.35)] backdrop-blur-md",
              "transition-[color,background-color,border-color,transform] duration-200 ease-out",
              "hover:border-white/20 hover:bg-[#222]/95 hover:text-white",
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
            <AvatarBlock onPick={openCropForFile} />
            <div className="mb-1 flex flex-wrap items-center justify-end gap-2 sm:gap-2.5">
              <button
                type="button"
                className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition-colors hover:bg-neutral-100"
              >
                Редактировать
              </button>
            </div>
          </div>

          <div className="mt-6 sm:mt-7">
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <h1 className="text-[1.35rem] font-bold tracking-tight text-white sm:text-2xl">
                {displayName}
              </h1>
              <span className="text-[15px] text-neutral-500">@{username}</span>
            </div>

            <p className="mt-3 text-sm text-neutral-500">
              <span className="font-semibold text-white">0</span> подписчиков ·{" "}
              <span className="font-semibold text-white">0</span> подписок
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
                "flex-1 rounded-full py-2.5 text-sm font-medium transition-colors duration-200",
                tab === "posts"
                  ? "text-white"
                  : "text-neutral-500 hover:text-neutral-300",
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
                "flex-1 rounded-full py-2.5 text-sm font-medium transition-colors duration-200",
                tab === "likes"
                  ? "text-white"
                  : "text-neutral-500 hover:text-neutral-300",
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

          <div className="mt-5">
            <PostComposer
              className="rounded-2xl p-4 sm:p-5"
              style={{ backgroundColor: SURFACE_LIFT }}
            />
          </div>

          {tab === "posts" ? (
            posts.length > 0 ? (
              <div className="mt-6 flex flex-col gap-4">
                {posts.map((p) => (
                  <PostCard key={p.id} post={p} />
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
