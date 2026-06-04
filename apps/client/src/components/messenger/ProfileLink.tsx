import { cn } from "@/lib/utils";
import { useAppNavStore } from "@/stores/app-nav-store";

type ProfileLinkProps = {
  username?: string | null;
  displayName?: string | null;
  className?: string;
  children: React.ReactNode;
  onNavigate?: () => void;
};

/** Кликабельная область — переход в профиль по @username или имени. */
export function ProfileLink({
  username,
  displayName,
  className,
  children,
  onNavigate,
}: ProfileLinkProps) {
  const openProfile = useAppNavStore((s) => s.openProfile);

  return (
    <button
      type="button"
      className={cn(
        "cursor-pointer text-left transition-opacity duration-150 hover:opacity-85 active:opacity-70",
        className,
      )}
      onClick={(e) => {
        e.stopPropagation();
        openProfile({ username, displayName });
        onNavigate?.();
      }}
    >
      {children}
    </button>
  );
}
