import type { PresenceStatus } from "@/stores/profile-store";
import { useProfileStore } from "@/stores/profile-store";
import { cn } from "@/lib/utils";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

function PresenceDot({ presence }: { presence: PresenceStatus }) {
  const base =
    "pointer-events-none block h-[14px] w-[14px] shrink-0 rounded-full border-[3px] shadow-[0_0_0_1px_rgba(0,0,0,0.2)]";
  if (presence === "online") {
    return (
      <span
        className={cn(
          base,
          "border-[#121212] bg-emerald-500",
          "shadow-[0_0_0_1px_rgba(0,0,0,0.2),0_0_10px_rgba(16,185,129,0.55)]",
        )}
        aria-hidden
      />
    );
  }
  if (presence === "dnd") {
    return (
      <span
        className={cn(
          base,
          "border-[#121212] bg-red-500",
          "shadow-[0_0_0_1px_rgba(0,0,0,0.2),0_0_10px_rgba(239,68,68,0.6)]",
        )}
        aria-hidden
      />
    );
  }
  return null;
}

const MENU_W = 280;

type RowProps = {
  onPick: () => void;
  icon: ReactNode;
  title: string;
  subtitle?: string;
  titleClassName?: string;
  iconWrapClassName?: string;
};

function MenuRow({
  onPick,
  icon,
  title,
  subtitle,
  titleClassName,
  iconWrapClassName,
}: RowProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onPick}
      className={cn(
        "flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors",
        "hover:bg-white/[0.06] focus-visible:bg-white/[0.06] focus-visible:outline-none",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center",
          iconWrapClassName,
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-[15px] font-medium text-neutral-100",
            titleClassName,
          )}
        >
          {title}
        </span>
        {subtitle ? (
          <span className="mt-0.5 block text-xs leading-snug text-neutral-500">
            {subtitle}
          </span>
        ) : null}
      </span>
    </button>
  );
}

function OnlineMenuIcon() {
  return (
    <span
      className="block h-4 w-4 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)]"
      aria-hidden
    />
  );
}

function DndMenuIcon() {
  return (
    <span
      className="block h-4 w-4 shrink-0 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]"
      aria-hidden
    />
  );
}

function InvisibleMenuIcon() {
  return (
    <span className="flex h-5 w-5 items-center justify-center" aria-hidden>
      <span className="h-4 w-4 rounded-full border-[2.5px] border-neutral-400 bg-transparent" />
    </span>
  );
}

export function PresenceStatusMenu() {
  const presence = useProfileStore((s) => s.presence);
  const setPresence = useProfileStore((s) => s.setPresence);

  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const showT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideT = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (showT.current) {
      clearTimeout(showT.current);
      showT.current = null;
    }
    if (hideT.current) {
      clearTimeout(hideT.current);
      hideT.current = null;
    }
  }, []);

  const scheduleOpen = useCallback(() => {
    clearTimers();
    showT.current = setTimeout(() => setOpen(true), 100);
  }, [clearTimers]);

  const scheduleClose = useCallback(() => {
    clearTimers();
    hideT.current = setTimeout(() => setOpen(false), 320);
  }, [clearTimers]);

  const cancelClose = useCallback(() => {
    if (hideT.current) {
      clearTimeout(hideT.current);
      hideT.current = null;
    }
  }, []);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !menuRef.current) {
      return;
    }
    const tr = triggerRef.current.getBoundingClientRect();
    const mh = menuRef.current.offsetHeight;
    const pad = 8;
    let top = tr.bottom + pad;
    if (top + mh > window.innerHeight - pad) {
      top = tr.top - mh - pad;
    }
    if (top < pad) {
      top = pad;
    }
    let left = tr.left + tr.width / 2 - MENU_W / 2;
    left = Math.max(pad, Math.min(left, window.innerWidth - MENU_W - pad));
    setCoords({ top, left });
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        menuRef.current?.contains(t) ||
        triggerRef.current?.contains(t)
      ) {
        return;
      }
      setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  function pick(p: PresenceStatus) {
    setPresence(p);
    setOpen(false);
    clearTimers();
  }

  const menu = open ? (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Выбор статуса"
      className={cn(
        "fixed z-[200] w-[280px] overflow-hidden rounded-lg border border-white/[0.08]",
        "bg-[#1e1f22] py-1 shadow-[0_16px_48px_rgba(0,0,0,0.55)]",
      )}
      style={{ top: coords.top, left: coords.left, width: MENU_W }}
      onMouseEnter={cancelClose}
      onMouseLeave={scheduleClose}
    >
      <MenuRow
        onPick={() => pick("online")}
        icon={<OnlineMenuIcon />}
        title="В сети"
      />
      <div className="my-1 h-px bg-white/[0.06]" role="separator" />
      <MenuRow
        onPick={() => pick("dnd")}
        icon={<DndMenuIcon />}
        title="Не беспокоить"
        subtitle="Вы не будете получать уведомления на рабочем столе"
      />
      <MenuRow
        onPick={() => pick("invisible")}
        icon={<InvisibleMenuIcon />}
        title="Невидимый"
        subtitle="У вас будет статус «Не в сети»"
      />
    </div>
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          "absolute bottom-1 right-1 z-20 flex h-[22px] w-[22px] cursor-pointer items-center justify-center rounded-full p-0.5",
          "ring-2 ring-transparent transition-[ring-color,transform] duration-150",
          "hover:ring-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ds-focus)]",
        )}
        aria-label="Статус: выберите состояние"
        aria-expanded={open}
        aria-haspopup="menu"
        onMouseEnter={scheduleOpen}
        onMouseLeave={scheduleClose}
        onClick={() => {
          clearTimers();
          setOpen((o) => !o);
        }}
      >
        <PresenceDot presence={presence} />
      </button>
      {typeof document !== "undefined" && menu
        ? createPortal(menu, document.body)
        : null}
    </>
  );
}
