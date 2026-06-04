import type { UserDTO } from "./user.js";
import type { EncryptedMessageDTO } from "./message.js";

export type ChatType = "direct" | "group";

export interface ChatDTO {
  id: string;
  type: ChatType;
  /** Для group; для direct UI подставляет peer. */
  title: string | null;
  createdAt: string;
  members: UserDTO[];
  /** Для превью в списке (последний по времени ciphertext). */
  lastMessage: EncryptedMessageDTO | null;
  unreadCount: number;
}

export interface CreateDirectChatRequestDTO {
  peerUserId: string;
}

export interface CreateGroupChatRequestDTO {
  title: string;
  memberIds: string[];
}

export interface ChatListDTO {
  chats: ChatDTO[];
}
