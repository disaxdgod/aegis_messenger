import type {
  EncryptedMessageDTO,
  MessagePageDTO,
  PatchMessageRequestDTO,
  SendMessageRequestDTO,
} from "@aegis/shared";
import { SOCKET_EVENTS } from "@aegis/shared";
import { Prisma } from "@prisma/client";
import type { Message, MessageAttachment } from "@prisma/client";

import { getSocketIo } from "../io-holder.js";
import { HttpError } from "../lib/http-error.js";
import { prismaMessageToDTO } from "../lib/mappers.js";
import { prisma } from "../lib/prisma.js";
import { ensureMember } from "./chat.service.js";

const DEFAULT_LIMIT = 40;

const STAGING_TTL_MS = 24 * 60 * 60 * 1000;

async function emitToChatSockets(
  chatId: string,
  event: string,
  payload: unknown,
): Promise<void> {
  const io = getSocketIo();
  if (!io) return;
  const rows = await prisma.chatMember.findMany({
    where: { chatId },
    select: { userId: true },
  });
  for (const { userId } of rows) {
    io.to(`user:${userId}`).emit(event, payload);
  }
}

export async function createMessageAndBroadcast(params: {
  senderId: string;
  body: Omit<SendMessageRequestDTO, "chatId">;
  chatId: string;
}): Promise<EncryptedMessageDTO> {
  const {
    ciphertext,
    iv,
    algo,
    senderEphemeralPublicKey,
    clientId,
    attachmentIds,
  } = params.body;

  if (algo !== "AES-GCM") {
    throw new HttpError(400, "Поддерживается только algo AES-GCM", {
      apiCode: "VALIDATION",
    });
  }
  if (!clientId.trim()) {
    throw new HttpError(400, "clientId обязателен", {
      apiCode: "VALIDATION",
    });
  }

  await ensureMember(params.chatId, params.senderId);

  const uniqAttachIds = [...new Set(attachmentIds ?? [])];

  let saved: Message & { attachments: MessageAttachment[] };
  try {
    saved = await prisma.$transaction(async (tx) => {
      if (uniqAttachIds.length) {
        const stagedRows =
          uniqAttachIds.length ?
            await tx.messageAttachmentStaging.findMany({
              where: {
                id: { in: uniqAttachIds },
                userId: params.senderId,
              },
            })
          : [];

        if (stagedRows.length !== uniqAttachIds.length) {
          throw new HttpError(
            400,
            "Одно или несколько вложений не найдены или не ваши.",
            {
              apiCode: "VALIDATION",
            },
          );
        }

        const nowTs = Date.now();
        const expired = stagedRows.some(
          (s) => nowTs - s.createdAt.getTime() > STAGING_TTL_MS,
        );
        if (expired) {
          throw new HttpError(
            410,
            "Срок действия загруженного файла истёк. Загрузите вложение снова.",
            { apiCode: "BAD_REQUEST" },
          );
        }
      }

      const msg = await tx.message.create({
        data: {
          chatId: params.chatId,
          senderId: params.senderId,
          clientId: clientId.trim(),
          ciphertext,
          iv,
          algo,
          senderEphemeralPublicKey,
        },
      });

      if (uniqAttachIds.length) {
        const stagedRowsInner =
          uniqAttachIds.length ?
            await tx.messageAttachmentStaging.findMany({
              where: {
                id: { in: uniqAttachIds },
                userId: params.senderId,
              },
            })
          : [];

        for (const row of stagedRowsInner) {
          await tx.messageAttachment.create({
            data: {
              messageId: msg.id,
              kind: row.kind,
              mime: row.mime,
              sizeBytes: row.sizeBytes,
              durationSec: row.durationSec,
              storageKey: row.storageKey,
              iv: row.iv,
              encryptedKey: row.encryptedKey,
            },
          });
          await tx.messageAttachmentStaging.delete({ where: { id: row.id } });
        }
      }

      await tx.chat.update({
        where: { id: params.chatId },
        data: { updatedAt: new Date() },
      });

      return tx.message.findUniqueOrThrow({
        where: { id: msg.id },
        include: { attachments: true },
      });
    });
  } catch (e: unknown) {
    if (e instanceof HttpError) throw e;
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      const existing = await prisma.message.findFirst({
        where: {
          chatId: params.chatId,
          senderId: params.senderId,
          clientId: clientId.trim(),
        },
        include: { attachments: true },
      });
      if (existing) {
        const dtoExisting = prismaMessageToDTO(existing);
        await emitMessageNewPayload(params.chatId, dtoExisting);
        return dtoExisting;
      }
    }
    throw e;
  }

  const dto = prismaMessageToDTO(saved);
  await emitMessageNewPayload(params.chatId, dto);
  return dto;
}

async function emitMessageNewPayload(
  chatId: string,
  messageDto: EncryptedMessageDTO,
): Promise<void> {
  await emitToChatSockets(chatId, SOCKET_EVENTS.messageNew, {
    message: messageDto,
  });
}

export async function patchMessageAndBroadcast(params: {
  senderId: string;
  chatId: string;
  messageId: string;
  body: PatchMessageRequestDTO;
}): Promise<EncryptedMessageDTO> {
  await ensureMember(params.chatId, params.senderId);

  const { ciphertext, iv, senderEphemeralPublicKey } = params.body;
  if (
    ciphertext === undefined &&
    iv === undefined &&
    senderEphemeralPublicKey === undefined
  ) {
    throw new HttpError(400, "Нет полей для обновления", {
      apiCode: "VALIDATION",
    });
  }

  const existing = await prisma.message.findFirst({
    where: {
      id: params.messageId,
      chatId: params.chatId,
      deletedAt: null,
    },
  });
  if (!existing) {
    throw new HttpError(404, "Сообщение не найдено", { apiCode: "NOT_FOUND" });
  }
  if (existing.senderId !== params.senderId) {
    throw new HttpError(403, "Редактировать можно только свои сообщения", {
      apiCode: "FORBIDDEN",
    });
  }

  const updated = await prisma.message.update({
    where: { id: existing.id },
    data: {
      ...(ciphertext !== undefined ? { ciphertext } : {}),
      ...(iv !== undefined ? { iv } : {}),
      ...(senderEphemeralPublicKey !== undefined ?
        { senderEphemeralPublicKey }
      : {}),
      editedAt: new Date(),
    },
    include: { attachments: true },
  });

  const dto = prismaMessageToDTO(updated);
  await emitToChatSockets(params.chatId, SOCKET_EVENTS.messageEdited, {
    message: dto,
  });
  return dto;
}

export async function softDeleteMessageAndBroadcast(params: {
  senderId: string;
  chatId: string;
  messageId: string;
}): Promise<void> {
  await ensureMember(params.chatId, params.senderId);

  const existing = await prisma.message.findFirst({
    where: {
      id: params.messageId,
      chatId: params.chatId,
      deletedAt: null,
    },
  });
  if (!existing) {
    throw new HttpError(404, "Сообщение не найдено", { apiCode: "NOT_FOUND" });
  }
  if (existing.senderId !== params.senderId) {
    throw new HttpError(403, "Удалить можно только свои сообщения", {
      apiCode: "FORBIDDEN",
    });
  }

  await prisma.message.update({
    where: { id: existing.id },
    data: { deletedAt: new Date() },
  });

  await emitToChatSockets(params.chatId, SOCKET_EVENTS.messageDeleted, {
    chatId: params.chatId,
    messageId: params.messageId,
  });
}

export async function pageMessages(params: {
  viewerId: string;
  chatId: string;
  /** id самого старого из уже загруженных сообщений → подгружает более старые. */
  cursor?: string;
  limit?: number;
}): Promise<MessagePageDTO> {
  const take = Math.min(Math.max(params.limit ?? DEFAULT_LIMIT, 1), 80);
  await ensureMember(params.chatId, params.viewerId);

  let boundary: { createdAt: Date; id: string } | null = null;
  if (params.cursor) {
    const b = await prisma.message.findFirst({
      where: { id: params.cursor, chatId: params.chatId, deletedAt: null },
      select: { createdAt: true, id: true },
    });
    if (!b) {
      throw new HttpError(
        404,
        "Указатель истории недействителен для этого чата",
        {
          apiCode: "NOT_FOUND",
        },
      );
    }
    boundary = b;
  }

  const rowsDesc = await prisma.message.findMany({
    where: {
      chatId: params.chatId,
      deletedAt: null,
      ...(boundary
        ? {
            OR: [
              { createdAt: { lt: boundary.createdAt } },
              {
                AND: [
                  { createdAt: boundary.createdAt },
                  { id: { lt: boundary.id } },
                ],
              },
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
    include: { attachments: true },
  });

  const hasMore = rowsDesc.length > take;
  const sliceDesc = hasMore ? rowsDesc.slice(0, take) : rowsDesc;

  /** Хронология снизу вверх: старый → новый. */
  const chronologicalAsc = [...sliceDesc].reverse();
  const items = chronologicalAsc.map((m) =>
    prismaMessageToDTO(m as Message & { attachments: MessageAttachment[] }),
  );

  /** Клиент передаёт id самого верхнего (старого из пачки) для следующего запроса «ещё ниже». */
  const nextCursor =
    hasMore && chronologicalAsc.length > 0
      ? chronologicalAsc[0]?.id ?? null
      : null;

  return { items, nextCursor };
}
