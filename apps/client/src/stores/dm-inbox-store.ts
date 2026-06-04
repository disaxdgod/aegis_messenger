import {
  DEMO_SEED_CHATS,
  DEMO_SEED_MESSAGES,
  demoEmployeeDmChatSeed,
} from "@/data/demo-seed";
import { isDmChatUnlocked } from "@/lib/social-graph";
import { useAuthorSubscriptionsStore } from "@/stores/author-subscriptions-store";
import { useProfileStore } from "@/stores/profile-store";
import { create } from "zustand";

/** Совпадает с прежними типами в MessagesPage — общее хранилище списка чатов и сообщений. */
export type InboxChatItem = {
  id: string;
  /** ID чата из API для DM (Prisma Chat.id); без него недоступен серверный сигналинг звонков. */
  backendChatId?: string;
  /** id собеседника в API */
  peerUserId?: string;
  name: string;
  handle: string;
  lastMessage: string;
  lastAt: string;
  unread: number;
  presence: "online" | "offline" | "dnd";
};

/** Превью опроса во вложении пересланной записи. */
export type InboxPollPreview = {
  question: string;
  optionTexts: string[];
};

/** Вложенная карточка репоста из ленты (отображение в стиле Telegram). */
export type InboxForwardEmbed = {
  postId: string;
  comment?: string;
  authorLine: string;
  summaryLine: string;
  bodyLine: string;
  mediaUrls?: string[];
  pollPreview?: InboxPollPreview;
  /** Unix ms — дата оригинальной записи в ленте */
  postCreatedAt?: number;
};

export type InboxMessageItem = {
  id: string;
  fromMe: boolean;
  text: string;
  time: string;
  status?: "sent" | "delivered" | "read";
  attachment?: {
    kind: "image" | "video" | "file" | "voice" | "video_note";
    url: string;
    name: string;
    mime: string;
    size: number;
    compressed: boolean;
    durationSec?: number;
  };
  forwardEmbed?: InboxForwardEmbed;
};

export function inboxNowTimeLabel() {
  return new Date().toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function newMessageId() {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

type InboxState = {
  chats: InboxChatItem[];
  messagesByChat: Record<string, InboxMessageItem[]>;
  typingByChatId: Record<string, true>;
  pendingOpenChatId: string | null;
  patchChatPreview: (
    chatId: string,
    lastMessage: string,
    lastAt: string,
    incrementUnread?: boolean,
  ) => void;
  markChatRead: (chatId: string) => void;
  requestOpenChat: (chatId: string) => void;
  consumePendingOpenChat: () => string | null;
  setChatTyping: (chatId: string, typing: boolean) => void;
  appendOutgoingMessage: (
    chatId: string,
    body: Omit<InboxMessageItem, "id"> & { id?: string },
  ) => void;
  appendIncomingMessage: (
    chatId: string,
    body: Omit<InboxMessageItem, "id" | "fromMe"> & { id?: string },
  ) => void;
  clearChatMessages: (chatId: string) => void;
  removeChat: (chatId: string) => void;
  /** Репост записи ленты в выбранный диалог (как пересылка в Telegram). */
  forwardFeedPostToChat: (
    chatId: string,
    payload: {
      comment?: string;
      authorLine: string;
      summaryLine: string;
      bodyLine: string;
      postId: string;
      mediaUrls?: string[];
      postCreatedAt?: number;
      pollPreview?: InboxPollPreview;
    },
  ) => void;
  /** Добавляет личный чат с сотрудником после взаимной подписки. */
  ensureEmployeeDmChat: (employeeUsername: string) => string | null;
};

function triggerDemoPeerReply(chatId: string) {
  void import("@/lib/demo-dm-auto-reply").then((m) => {
    m.scheduleDemoPeerAutoReply(chatId);
  });
}

export const useDmInboxStore = create<InboxState>((set, get) => ({
  chats: DEMO_SEED_CHATS,
  messagesByChat: DEMO_SEED_MESSAGES,
  typingByChatId: {},
  pendingOpenChatId: null,

  patchChatPreview(chatId, lastMessage, lastAt, incrementUnread = false) {
    set((s) => ({
      chats: s.chats.map((c) =>
        c.id !== chatId
          ? c
          : {
              ...c,
              lastMessage,
              lastAt,
              unread: incrementUnread ? c.unread + 1 : 0,
            },
      ),
    }));
  },

  markChatRead(chatId) {
    set((s) => ({
      chats: s.chats.map((c) =>
        c.id !== chatId
          ? c
          : {
              ...c,
              unread: 0,
            },
      ),
    }));
  },

  requestOpenChat(chatId) {
    set({ pendingOpenChatId: chatId });
  },

  consumePendingOpenChat() {
    const chatId = get().pendingOpenChatId;
    if (!chatId) {
      return null;
    }
    set({ pendingOpenChatId: null });
    return chatId;
  },

  setChatTyping(chatId, typing) {
    set((s) => {
      const next = { ...s.typingByChatId };
      if (typing) {
        next[chatId] = true;
      } else {
        delete next[chatId];
      }
      return { typingByChatId: next };
    });
  },

  appendOutgoingMessage(chatId, body) {
    const id = body.id ?? newMessageId();
    const { id: _omit, ...rest } = body as InboxMessageItem & { id?: string };
    const message: InboxMessageItem = { ...rest, id };
    set((s) => ({
      messagesByChat: {
        ...s.messagesByChat,
        [chatId]: [...(s.messagesByChat[chatId] ?? []), message],
      },
    }));
    triggerDemoPeerReply(chatId);
  },

  appendIncomingMessage(chatId, body) {
    const id = body.id ?? newMessageId();
    const { id: _omit, ...rest } = body;
    const message: InboxMessageItem = { ...rest, id, fromMe: false };
    set((s) => ({
      messagesByChat: {
        ...s.messagesByChat,
        [chatId]: [...(s.messagesByChat[chatId] ?? []), message],
      },
    }));
  },

  clearChatMessages(chatId) {
    set((s) => {
      const { [chatId]: _typing, ...typingRest } = s.typingByChatId;
      return {
        messagesByChat: { ...s.messagesByChat, [chatId]: [] },
        typingByChatId: typingRest,
      };
    });
  },

  removeChat(chatId) {
    set((s) => {
      const { [chatId]: _, ...rest } = s.messagesByChat;
      const { [chatId]: __, ...typingRest } = s.typingByChatId;
      return {
        chats: s.chats.filter((c) => c.id !== chatId),
        messagesByChat: rest,
        typingByChatId: typingRest,
      };
    });
  },

  forwardFeedPostToChat(chatId, payload) {
    const time = inboxNowTimeLabel();
    const comment = payload.comment?.trim();
    const header = "⟲ Репост из ленты";
    const summaryForMeta =
      payload.summaryLine.trim() ||
      (payload.pollPreview
        ? (() => {
            const q = payload.pollPreview.question.trim();
            return q.length > 0
              ? q.length > 140
                ? `Опрос · ${q.slice(0, 140)}…`
                : `Опрос · ${q}`
              : "Опрос";
          })()
        : "");
    const bodyForMeta =
      payload.bodyLine.trim() || payload.summaryLine.trim() || summaryForMeta;
    const meta = `${payload.authorLine}\n${summaryForMeta}`;
    const block = [header, meta, bodyForMeta]
      .filter((p) => p.length > 0)
      .join("\n\n");
    const fullText = comment ? `${comment}\n\n${block}` : block;
    const preview =
      comment && comment.length > 0
        ? comment.length > 42
          ? `${comment.slice(0, 42)}…`
          : comment
        : payload.pollPreview
          ? (() => {
              const q = payload.pollPreview.question.trim();
              if (q.length > 0) {
                return q.length > 42
                  ? `Репост: Опрос · ${q.slice(0, 42)}…`
                  : `Репост: Опрос · ${q}`;
              }
              return "Репост: Опрос";
            })()
          : payload.summaryLine.trim()
            ? `Репост: ${payload.summaryLine.slice(0, 56)}${payload.summaryLine.length > 56 ? "…" : ""}`
            : "Репост из ленты";

    get().appendOutgoingMessage(chatId, {
      fromMe: true,
      text: fullText,
      time,
      status: "sent",
      forwardEmbed: {
        postId: payload.postId,
        comment: comment || undefined,
        authorLine: payload.authorLine,
        summaryLine: payload.summaryLine,
        bodyLine: payload.bodyLine,
        mediaUrls: payload.mediaUrls,
        postCreatedAt: payload.postCreatedAt,
        pollPreview: payload.pollPreview,
      },
    });
    get().patchChatPreview(chatId, preview, time);
  },

  ensureEmployeeDmChat(employeeUsername) {
    const seed = demoEmployeeDmChatSeed(employeeUsername);
    if (!seed) {
      return null;
    }
    const existing = get().chats.find(
      (c) => c.id === seed.id || c.handle === seed.handle,
    );
    if (existing) {
      return existing.id;
    }
    set((s) => ({
      chats: [...s.chats, seed],
      messagesByChat: {
        ...s.messagesByChat,
        [seed.id]: s.messagesByChat[seed.id] ?? [],
      },
    }));
    return seed.id;
  },
}));

export function useUnreadMessagesCount() {
  const chats = useDmInboxStore((s) => s.chats);
  const messagesByChat = useDmInboxStore((s) => s.messagesByChat);
  const username = useProfileStore((s) => s.username);
  const subscribedKeys = useAuthorSubscriptionsStore((s) => s.subscribedKeys);
  return chats
    .filter((chat) =>
      isDmChatUnlocked(chat, username, subscribedKeys, {
        messageCount: (messagesByChat[chat.id] ?? []).length,
      }),
    )
    .reduce((total, chat) => total + chat.unread, 0);
}
