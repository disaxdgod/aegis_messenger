import { DEMO_GERMAN_CHAT_ID, DEMO_HR_CHAT_ID } from "@/data/demo-seed";
import { inboxNowTimeLabel, useDmInboxStore } from "@/stores/dm-inbox-store";

export { DEMO_GERMAN_CHAT_ID, DEMO_HR_CHAT_ID };

export const DEMO_GERMAN_BUSY_REPLY = "Извини я сейчас занят";
export const DEMO_HR_BUSY_REPLY = "Ой, извини! Хорошей сдачи!";

const TYPING_DELAY_MS = 1800;

const DEMO_PEER_REPLIES: Record<string, string> = {
  [DEMO_GERMAN_CHAT_ID]: DEMO_GERMAN_BUSY_REPLY,
  [DEMO_HR_CHAT_ID]: DEMO_HR_BUSY_REPLY,
};

const replyTimers = new Map<string, ReturnType<typeof setTimeout>>();

let isChatActive: ((chatId: string) => boolean) | null = null;

/** Регистрирует проверку: открыт ли чат сейчас на экране (для unread). */
export function registerDmActiveChatResolver(fn: ((chatId: string) => boolean) | null) {
  isChatActive = fn;
}

export function deliverDemoIncomingMessage(chatId: string, text: string) {
  const store = useDmInboxStore.getState();
  const time = inboxNowTimeLabel();
  store.appendIncomingMessage(chatId, { text, time });
  const active = isChatActive?.(chatId) ?? false;
  store.patchChatPreview(chatId, text, time, !active);
}

export function clearDemoPeerReplyTimer(chatId: string) {
  const timer = replyTimers.get(chatId);
  if (timer) {
    clearTimeout(timer);
    replyTimers.delete(chatId);
  }
}

/** Демо: после исходящего сообщения собеседник «печатает» и отвечает. */
export function scheduleDemoPeerAutoReply(chatId: string) {
  const reply = DEMO_PEER_REPLIES[chatId];
  if (!reply) {
    return;
  }

  clearDemoPeerReplyTimer(chatId);
  useDmInboxStore.getState().setChatTyping(chatId, true);

  const timer = setTimeout(() => {
    replyTimers.delete(chatId);
    const store = useDmInboxStore.getState();
    store.setChatTyping(chatId, false);
    deliverDemoIncomingMessage(chatId, reply);
  }, TYPING_DELAY_MS);

  replyTimers.set(chatId, timer);
}

/** @deprecated Используйте scheduleDemoPeerAutoReply */
export function scheduleDemoGermanBusyReply(chatId: string) {
  scheduleDemoPeerAutoReply(chatId);
}

export function clearAllDemoPeerReplyTimers() {
  for (const chatId of replyTimers.keys()) {
    clearDemoPeerReplyTimer(chatId);
    useDmInboxStore.getState().setChatTyping(chatId, false);
  }
}

/** @deprecated Используйте clearAllDemoPeerReplyTimers */
export function clearAllDemoGermanReplyTimers() {
  clearAllDemoPeerReplyTimers();
}
