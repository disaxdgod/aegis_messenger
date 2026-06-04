export type AttachmentKind =
  | "image"
  | "video"
  | "file"
  | "voice"
  | "video_note";

/** Метаданные зашифрованного вложения на сервере. */
export interface EncryptedAttachmentDTO {
  id: string;
  kind: AttachmentKind;
  mime: string;
  sizeBytes: number;
  durationSec: number | null;
  /** Абсолютный или префиксированный `/api`-путь загрузки сырого ciphertext. */
  downloadUrl: string;
  iv: string;
  /** Ключ сообщения для файла, зашифрованный общим симметричным сеансовым ключом. */
  encryptedKey: string;
}

/** Одно сохранённое E2EE-сообщение: сервер не расшифровывает ciphertext. */
export interface EncryptedMessageDTO {
  id: string;
  chatId: string;
  senderId: string;
  /** Base64 шифротекст текстовой части (может быть пустая строка при «только файл»). */
  ciphertext: string;
  iv: string;
  algo: "AES-GCM";
  /** Эфемерный публичный ключ отправителя (Base64 SPKI) для восстановления сессионного секрета. */
  senderEphemeralPublicKey: string;
  attachments: EncryptedAttachmentDTO[];
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
}

/** Клиент → сервер: отправить зашифрованное сообщение (REST или сокеты). */
export interface SendMessageRequestDTO {
  chatId: string;
  ciphertext: string;
  iv: string;
  algo: "AES-GCM";
  senderEphemeralPublicKey: string;
  /** UUID с клиента — идемпотентность / оптимистичный UI. */
  clientId: string;
  attachmentIds?: string[];
}

/** Частичное обновление E2EE-полезной нагрузки (отправитель). */
export interface PatchMessageRequestDTO {
  ciphertext?: string;
  iv?: string;
  senderEphemeralPublicKey?: string;
}

/** Обновление позиции «прочитано до сообщения». */
export interface SetChatLastReadRequestDTO {
  messageId: string;
}

/** Проставить доставку / прочтение сообщения участником чата. */
export interface PostMessageReceiptRequestDTO {
  state: "delivered" | "read";
}

/** После успешной загрузки ciphertext вложения перед отправкой сообщения. */
export interface MessageAttachmentStagingResponseDTO {
  id: string;
}

/** Cursor-пагинация истории по `messageId`. */
export interface MessagePageDTO {
  items: EncryptedMessageDTO[];
  nextCursor: string | null;
}
