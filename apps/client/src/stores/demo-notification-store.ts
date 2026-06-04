import { DEMO_HR_CHAT_ID } from "@/data/demo-seed";
import { deliverDemoIncomingMessage } from "@/lib/demo-dm-auto-reply";
import { create } from "zustand";

export type DemoMessageNotification = {
  title: string;
  senderName: string;
  senderHandle: string;
  body: string;
  chatId?: string;
};

export type AlertFeedItem = {
  id: string;
  kind: "message";
  title: string;
  senderName: string;
  senderHandle: string;
  body: string;
  chatId?: string;
  createdAt: number;
  read: boolean;
};

type DemoNotificationState = {
  notification: DemoMessageNotification | null;
  alerts: AlertFeedItem[];
  show: (notification: DemoMessageNotification) => void;
  dismiss: () => void;
  pushAlert: (item: Omit<AlertFeedItem, "id" | "createdAt" | "read">) => void;
  markAlertRead: (id: string) => void;
  markAllAlertsRead: () => void;
};

const BANNER_DRAW_NOTIFICATION: DemoMessageNotification = {
  title: "Новое сообщение",
  senderName: "Анна · HR",
  senderHandle: "a_sokolova",
  body: "Денис, привет! Ты уже защитил диплом?",
  chatId: DEMO_HR_CHAT_ID,
};

let bannerDrawTimer: ReturnType<typeof setTimeout> | null = null;
let alertSeq = 0;

function newAlertId() {
  alertSeq += 1;
  return `alert-${Date.now()}-${alertSeq}`;
}

function deliverBannerDrawNotification() {
  const store = useDemoNotificationStore.getState();
  store.show(BANNER_DRAW_NOTIFICATION);
  store.pushAlert({
    kind: "message",
    title: BANNER_DRAW_NOTIFICATION.title,
    senderName: BANNER_DRAW_NOTIFICATION.senderName,
    senderHandle: BANNER_DRAW_NOTIFICATION.senderHandle,
    body: BANNER_DRAW_NOTIFICATION.body,
    chatId: BANNER_DRAW_NOTIFICATION.chatId,
  });

  if (BANNER_DRAW_NOTIFICATION.chatId) {
    deliverDemoIncomingMessage(
      BANNER_DRAW_NOTIFICATION.chatId,
      BANNER_DRAW_NOTIFICATION.body,
    );
  }
}

export const useDemoNotificationStore = create<DemoNotificationState>((set) => ({
  notification: null,
  alerts: [],

  show: (notification) => set({ notification }),

  dismiss: () => set({ notification: null }),

  pushAlert: (item) => {
    const entry: AlertFeedItem = {
      ...item,
      id: newAlertId(),
      createdAt: Date.now(),
      read: false,
    };
    set((s) => ({ alerts: [entry, ...s.alerts] }));
  },

  markAlertRead: (id) => {
    set((s) => ({
      alerts: s.alerts.map((a) => (a.id === id ? { ...a, read: true } : a)),
    }));
  },

  markAllAlertsRead: () => {
    set((s) => ({
      alerts: s.alerts.map((a) => ({ ...a, read: true })),
    }));
  },
}));

export function useUnreadAlertsCount() {
  return useDemoNotificationStore((s) => s.alerts.filter((a) => !a.read).length);
}

/** Через ~5 с после сохранения нарисованного баннера — toast, «Уведомления» и чат с HR. */
export function scheduleBannerDrawMessageNotification(delayMs = 5000) {
  if (bannerDrawTimer) {
    clearTimeout(bannerDrawTimer);
  }
  bannerDrawTimer = setTimeout(() => {
    bannerDrawTimer = null;
    deliverBannerDrawNotification();
  }, delayMs);
}

export function cancelBannerDrawMessageNotification() {
  if (bannerDrawTimer) {
    clearTimeout(bannerDrawTimer);
    bannerDrawTimer = null;
  }
}

export function formatAlertTime(ts: number): string {
  const diffMs = Date.now() - ts;
  if (diffMs < 60_000) {
    return "только что";
  }
  if (diffMs < 3_600_000) {
    const min = Math.max(1, Math.floor(diffMs / 60_000));
    return `${min} мин назад`;
  }
  return new Date(ts).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
