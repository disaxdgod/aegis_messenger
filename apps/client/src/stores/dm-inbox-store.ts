import { create } from "zustand";

/** Совпадает с прежними типами в MessagesPage — общее хранилище списка чатов и сообщений. */
export type InboxChatItem = {
  id: string;
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

const INITIAL_CHATS: InboxChatItem[] = [
  {
    id: "c-1",
    name: "Анна Петрова",
    handle: "ann_pet",
    lastMessage: "Отправила макет карточек, посмотри пожалуйста",
    lastAt: "21:14",
    unread: 2,
    presence: "online",
  },
  {
    id: "c-2",
    name: "Design Team",
    handle: "aegis_design",
    lastMessage: "Новая иконка репоста уже в папке design",
    lastAt: "20:58",
    unread: 0,
    presence: "dnd",
  },
  {
    id: "c-3",
    name: "Максим",
    handle: "max_dev",
    lastMessage: "Ок, после релиза подчищу store",
    lastAt: "18:06",
    unread: 0,
    presence: "offline",
  },
  {
    id: "c-4",
    name: "QA Squad",
    handle: "qa_team",
    lastMessage: "Проверили мобильный таббар, все ок",
    lastAt: "вчера",
    unread: 7,
    presence: "online",
  },
];

const INITIAL_MESSAGES: Record<string, InboxMessageItem[]> = {
  "c-1": [
    { id: "m-1", fromMe: false, text: "Привет! Ты на месте?", time: "20:54" },
    {
      id: "m-2",
      fromMe: true,
      text: "Да, смотрю задачи по мессенджеру.",
      time: "20:56",
      status: "read",
    },
    {
      id: "m-3",
      fromMe: false,
      text: "Отправила макет карточек, посмотри пожалуйста",
      time: "21:14",
    },
  ],
  "c-2": [
    { id: "m-4", fromMe: false, text: "Новая иконка репоста уже в папке design", time: "20:58" },
    {
      id: "m-5",
      fromMe: true,
      text: "Отлично, сейчас подключу.",
      time: "21:01",
      status: "delivered",
    },
  ],
  "c-3": [
    {
      id: "m-6",
      fromMe: true,
      text: "Прогоню фиксы и вернусь к тебе",
      time: "17:51",
      status: "sent",
    },
    { id: "m-7", fromMe: false, text: "Ок, после релиза подчищу store", time: "18:06" },
  ],
  "c-4": [{ id: "m-8", fromMe: false, text: "Проверили мобильный таббар, все ок", time: "вчера" }],
};

type InboxState = {
  chats: InboxChatItem[];
  messagesByChat: Record<string, InboxMessageItem[]>;
  patchChatPreview: (chatId: string, lastMessage: string, lastAt: string) => void;
  appendOutgoingMessage: (
    chatId: string,
    body: Omit<InboxMessageItem, "id"> & { id?: string },
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
};

export const useDmInboxStore = create<InboxState>((set, get) => ({
  chats: INITIAL_CHATS,
  messagesByChat: INITIAL_MESSAGES,

  patchChatPreview(chatId, lastMessage, lastAt) {
    set((s) => ({
      chats: s.chats.map((c) =>
        c.id !== chatId
          ? c
          : {
              ...c,
              lastMessage,
              lastAt,
              unread: 0,
            },
      ),
    }));
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
  },

  clearChatMessages(chatId) {
    set((s) => ({
      messagesByChat: { ...s.messagesByChat, [chatId]: [] },
    }));
  },

  removeChat(chatId) {
    set((s) => {
      const { [chatId]: _, ...rest } = s.messagesByChat;
      return {
        chats: s.chats.filter((c) => c.id !== chatId),
        messagesByChat: rest,
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
}));
