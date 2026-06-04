import type {
  EncryptedAttachmentDTO,
  EncryptedMessageDTO,
  MeDTO,
  UserDTO,
  UserPublicKeyDTO,
} from "@aegis/shared";
import { API_PREFIX } from "@aegis/shared";
import type {
  AttachmentKind as PrismaAttachmentKind,
  ChatType as PrismaChatType,
  Message,
  MessageAttachment,
  Presence,
  PublicKeyAlgo,
  User,
} from "@prisma/client";

export function prismaPresenceToApi(p: Presence): UserDTO["presence"] {
  const map = {
    ONLINE: "online",
    OFFLINE: "offline",
    DND: "dnd",
    INVISIBLE: "invisible",
  } as const;
  return map[p];
}

export function prismaPublicKeyAlgoToApi(a: PublicKeyAlgo): UserPublicKeyDTO["publicKeyAlgo"] {
  switch (a) {
    case "ECDH_P256":
      return "ECDH-P256";
    case "X25519":
      return "X25519";
  }
}

export function apiPublicKeyAlgoToPrisma(
  a: UserPublicKeyDTO["publicKeyAlgo"],
): PublicKeyAlgo {
  switch (a) {
    case "ECDH-P256":
      return "ECDH_P256";
    case "X25519":
      return "X25519";
  }
}

function displayNameOf(u: User): string {
  const joined = [u.firstName ?? "", u.lastName ?? ""].join(" ").trim();
  return joined.length > 0 ? joined : u.username;
}

export function prismaUserToUserDTO(user: User): UserDTO {
  return {
    id: user.id,
    username: user.username,
    displayName: displayNameOf(user),
    avatarUrl: user.avatarUrl,
    bannerUrl: user.bannerUrl,
    status: user.status,
    presence: prismaPresenceToApi(user.presence),
    lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

export function prismaUserToMeDTO(user: User): MeDTO {
  return {
    ...prismaUserToUserDTO(user),
    email: user.email,
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    birthDate: user.birthDate
      ? user.birthDate.toISOString().slice(0, 10)
      : null,
  };
}

function attachmentKindFromPrisma(k: PrismaAttachmentKind): EncryptedAttachmentDTO["kind"] {
  switch (k) {
    case "IMAGE":
      return "image";
    case "VIDEO":
      return "video";
    case "FILE":
      return "file";
    case "VOICE":
      return "voice";
    case "VIDEO_NOTE":
      return "video_note";
  }
}

export function prismaAttachmentToDTO(
  chatId: string,
  a: MessageAttachment,
): EncryptedAttachmentDTO {
  return {
    id: a.id,
    kind: attachmentKindFromPrisma(a.kind),
    mime: a.mime,
    sizeBytes: a.sizeBytes,
    durationSec: a.durationSec ?? null,
    downloadUrl: `${API_PREFIX}/chats/${chatId}/attachments/${a.id}/file`,
    iv: a.iv,
    encryptedKey: a.encryptedKey,
  };
}

export function prismaMessageToDTO(
  m: Message & { attachments: MessageAttachment[] },
): EncryptedMessageDTO {
  const chatId = m.chatId;
  return {
    id: m.id,
    chatId,
    senderId: m.senderId,
    ciphertext: m.ciphertext,
    iv: m.iv,
    algo: m.algo as EncryptedMessageDTO["algo"],
    senderEphemeralPublicKey: m.senderEphemeralPublicKey,
    attachments: m.attachments.map((a) => prismaAttachmentToDTO(chatId, a)),
    createdAt: m.createdAt.toISOString(),
    editedAt: m.editedAt?.toISOString() ?? null,
    deletedAt: m.deletedAt?.toISOString() ?? null,
  };
}

export function prismaChatTypeToApi(
  t: PrismaChatType,
): import("@aegis/shared").ChatDTO["type"] {
  return t === "DIRECT" ? "direct" : "group";
}
