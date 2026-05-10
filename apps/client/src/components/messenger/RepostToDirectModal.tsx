import { IconSearch } from "@/components/messenger/nav-icons";
import { cn } from "@/lib/utils";
import type { InboxChatItem } from "@/stores/dm-inbox-store";
import { useDmInboxStore } from "@/stores/dm-inbox-store";
import { useEffect, useMemo, useState } from "react";

/** Превью опроса для отображения во вложении «репост в ЛС». */
export type RepostPollPreview = {
  question: string;
  optionTexts: string[];
};

export type RepostForwardPayload = {
  postId: string;
  authorLine: string;
  summaryLine: string;
  bodyLine: string;
  pollPreview?: RepostPollPreview;
};

type RepostToDirectModalProps = {
  open: boolean;
  onClose: () => void;
  payload: RepostForwardPayload | null;
  onConfirmSend: (chatId: string, comment: string) => void;
};

function avatarFallback(name: string) {
  return name.trim()[0]?.toUpperCase() ?? "?";
}

function presenceDotClass(presence: InboxChatItem["presence"]) {
  if (presence === "online") {
    return "bg-emerald-400";
  }
  if (presence === "dnd") {
    return "bg-rose-400";
  }
  return null;
}

export function RepostToDirectModal({
  open,
  onClose,
  payload,
  onConfirmSend,
}: RepostToDirectModalProps) {
  const chats = useDmInboxStore((s) => s.chats);
  const [query, setQuery] = useState("");
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (!open) {
      setQuery("");
      setComment("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return chats;
    }
    return chats.filter(
      (c) =>
        c.name.toLowerCase().includes(needle) ||
        c.handle.toLowerCase().includes(needle),
    );
  }, [chats, query]);

  if (!open || !payload) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[145] flex items-end justify-center bg-black/65 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="repost-dm-title"
      onClick={onClose}
    >
      <div
        className={cn(
          "flex max-h-[min(92dvh,720px)] w-full max-w-[440px] flex-col overflow-hidden rounded-t-[18px] border border-theme-border bg-theme-card shadow-[0_-8px_48px_rgba(0,0,0,0.3)] sm:max-h-[min(85vh,640px)] sm:rounded-2xl",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-theme-border px-3 py-2.5 sm:px-4">
          <h2
            id="repost-dm-title"
            className="min-w-0 truncate text-[17px] font-semibold tracking-tight text-theme-text"
          >
            Поделиться
          </h2>
          <button
            type="button"
            className="shrink-0 rounded-xl px-3 py-1.5 text-[15px] font-medium text-[#53a5ea] transition-colors hover:bg-theme-hover"
            onClick={onClose}
          >
            Закрыть
          </button>
        </header>

        <div className="shrink-0 border-b border-theme-border px-4 py-3">
          <p className="text-[13px] font-medium uppercase tracking-wide text-theme-text-2">
            Комментарий
          </p>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Добавить подпись…"
            rows={2}
            className="mt-2 w-full resize-none rounded-xl border border-theme-border bg-theme-card-2 px-3 py-2.5 text-[15px] leading-snug text-theme-text outline-none placeholder:text-theme-text-2 focus-visible:border-[#53a5ea]/50 focus-visible:ring-2 focus-visible:ring-[#53a5ea]/25"
          />
        </div>

        <div className="shrink-0 px-4 pb-2 pt-1">
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-theme-text-2" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск"
              autoComplete="off"
              className="w-full rounded-xl border border-theme-border bg-theme-card-2 py-2.5 pl-10 pr-3 text-[15px] text-theme-text outline-none placeholder:text-theme-text-2 focus-visible:border-[#53a5ea]/45 focus-visible:ring-2 focus-visible:ring-[#53a5ea]/20"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2 sm:px-3">
          <ul className="pb-3 pt-1" role="listbox" aria-label="Контакты">
            {filtered.map((chat) => (
              <li key={chat.id}>
                <button
                  type="button"
                  role="option"
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-theme-hover active:bg-theme-active"
                  onClick={() => {
                    onConfirmSend(chat.id, comment);
                    onClose();
                  }}
                >
                  <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-theme-card-3 text-[17px] font-semibold text-theme-text">
                    {avatarFallback(chat.name)}
                    <span
                      className={cn(
                        "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#212121]",
                        presenceDotClass(chat.presence) ?? "bg-neutral-600",
                      )}
                      aria-hidden
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[16px] font-medium text-theme-text">
                      {chat.name}
                    </span>
                    <span className="block truncate text-[14px] text-theme-text-2">
                      @{chat.handle}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {filtered.length === 0 ? (
            <p className="px-3 pb-6 text-center text-sm text-theme-text-2">
              Ничего не найдено
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
