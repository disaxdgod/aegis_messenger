import type { EncryptedMessageDTO } from "./message.js";
import type { PresenceStatus } from "./user.js";

/** Имена событий Socket.IO (контракт клиент ↔ сервер). */
export const SOCKET_EVENTS = {
  hello: "server:hello",

  /** Входящий звонок (сервер → получатель после `call:invite`). */
  callRing: "call:ring",
  /** Принято (сервер → инициатору после `call:accept`). */
  callAccepted: "call:accepted",
  /** Отклонено (сервер → инициатору). */
  callRejected: "call:rejected",
  /** Любая сторона завершила или сеть разорвалась */
  callEnded: "call:ended",

  /** Инициатор пригласил собеседника (только DM, 2 участника). */
  callInvite: "call:invite",
  callAccept: "call:accept",
  callReject: "call:reject",
  callEnd: "call:end",

  /** WebRTC сигналинг (SDP / ICE через сервер-ретранслятор). */
  webrtcOffer: "webrtc:offer",
  webrtcAnswer: "webrtc:answer",
  webrtcIce: "webrtc:ice",

  /** Сервер сообщил участникам о новом зашифрованном сообщении. */
  messageNew: "message:new",
  messageReceipt: "message:receipt",
  presenceUpdate: "presence:update",
  typing: "chat:typing",

  /** Клиент просит разослать сообщение членам комнаты (после записи в БД). */
  messageSend: "message:send",
  messageRead: "message:read",
  /** Сообщение изменено отправителем (редактирование ciphertext). */
  messageEdited: "message:edited",
  /** Soft-delete сообщения. */
  messageDeleted: "message:deleted",
  chatTypingStart: "chat:typing:start",
  chatTypingStop: "chat:typing:stop",
} as const;

/** @deprecated Используйте `SOCKET_EVENTS` — сохранены те же строковые значения. */
export const SOCKET_SERVER_EVENTS = SOCKET_EVENTS;

export interface ServerHelloPayload {
  app: string;
  apiVersion: string;
  at: string;
  /** После аутентификации по сокету (Шаг 5). */
  userId?: string;
}

export interface MessageNewPayload {
  message: EncryptedMessageDTO;
}

export interface MessageEditedPayload {
  message: EncryptedMessageDTO;
}

export interface MessageDeletedPayload {
  chatId: string;
  messageId: string;
}

export type ReceiptState = "delivered" | "read";

export interface MessageReceiptPayload {
  chatId: string;
  messageId: string;
  byUserId: string;
  state: ReceiptState;
  at: string;
}

export interface PresenceUpdatePayload {
  userId: string;
  presence: PresenceStatus;
  lastSeenAt: string | null;
}

export interface ChatTypingPayload {
  chatId: string;
  userId: string;
  isTyping: boolean;
}

/** audio — только голос; video — камера + микрофон. */
export type CallKind = "audio" | "video";

export interface SerializedSessionDescriptionDTO {
  type: string;
  sdp: string;
}

export interface SerializedIceCandidateDTO {
  candidate: string | null;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
}

export interface CallInviteEmitPayload {
  callId: string;
  chatId: string;
  kind: CallKind;
}

/** Сервер дополняет поля перед `call:ring`. */
export interface CallRingPayload {
  callId: string;
  chatId: string;
  kind: CallKind;
  fromUserId: string;
  fromUsername: string;
}

export interface CallIdPayload {
  callId: string;
}

export interface WebRtcOfferPayload {
  callId: string;
  description: SerializedSessionDescriptionDTO;
}

export interface WebRtcAnswerPayload {
  callId: string;
  description: SerializedSessionDescriptionDTO;
}

export interface WebRtcIcePayload {
  callId: string;
  candidate: SerializedIceCandidateDTO;
}
