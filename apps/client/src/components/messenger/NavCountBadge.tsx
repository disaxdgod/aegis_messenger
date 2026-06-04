import { cn } from "@/lib/utils";

type NavCountBadgeProps = {
  count: number;
  className?: string;
  /** На иконке в мобильной навигации. */
  overlay?: boolean;
};

export function NavCountBadge({ count, className, overlay = false }: NavCountBadgeProps) {
  if (count <= 0) {
    return null;
  }

  const label = count > 99 ? "99+" : String(count);

  if (overlay) {
    return (
      <span className={cn("itd-mnav-badge", className)} aria-hidden>
        {label}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "ml-auto grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1",
        "bg-[var(--accent-primary)] text-[10px] font-semibold leading-none text-white",
        className,
      )}
      aria-label={`${label} непрочитанных`}
    >
      {label}
    </span>
  );
}
