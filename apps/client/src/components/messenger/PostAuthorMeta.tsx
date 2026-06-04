export function formatPostTime(ts: number): string {
  const d = new Date(ts);
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60_000) {
    return "только что";
  }
  if (diff < 3_600_000) {
    return `${Math.floor(diff / 60_000)} мин.`;
  }
  if (diff < 86_400_000) {
    return `${Math.floor(diff / 3_600_000)} ч.`;
  }
  return d.toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type PostAuthorMetaProps = {
  displayName: string;
  createdAt: number;
  editedAt?: number | null;
  className?: string;
};

/** Шапка поста: имя фамилия, под ним время. */
export function PostAuthorMeta({
  displayName,
  createdAt,
  editedAt = null,
  className,
}: PostAuthorMetaProps) {
  return (
    <div className={className ?? "min-w-0"}>
      <p className="truncate text-[15px] font-semibold leading-snug text-theme-text">
        {displayName}
      </p>
      <p className="truncate text-xs leading-snug text-theme-text-2">
        <span>{formatPostTime(createdAt)}</span>
        {editedAt != null ? (
          <span className="ml-1.5 text-theme-text-2">· ред.</span>
        ) : null}
      </p>
    </div>
  );
}
