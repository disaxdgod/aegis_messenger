import type { ChatDTO, ChatListDTO } from "@aegis/shared";
import type {
  Message,
  MessageAttachment,
  Prisma,
} from "@prisma/client";

import { HttpError } from "../lib/http-error.js";
import {
  prismaChatTypeToApi,
  prismaMessageToDTO,
  prismaUserToUserDTO,
} from "../lib/mappers.js";
import { prisma } from "../lib/prisma.js";

export function directPairKey(userIdA: string, userIdB: string): string {
  return [userIdA, userIdB].sort().join(":");
}

export async function ensureMember(chatId: string, userId: string) {
  const m = await prisma.chatMember.findFirst({
    where: { chatId, userId },
    include: { chat: true },
  });
  if (!m) {
    throw new HttpError(403, "Нет доступа к этому чату", {
      apiCode: "FORBIDDEN",
    });
  }
  return m;
}

const chatDetailInclude = {
  members: { include: { user: true } },
  messages: {
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" as const },
    take: 1,
    include: { attachments: true },
  },
} satisfies Prisma.ChatInclude;

export type ChatDetailed = Prisma.ChatGetPayload<{
  include: typeof chatDetailInclude;
}>;

async function lastReadBoundaryForMember(memberPrimaryId: string): Promise<Date | null> {
  const cm = await prisma.chatMember.findUnique({
    where: { id: memberPrimaryId },
    include: { lastReadMessage: true },
  });
  return cm?.lastReadMessage?.createdAt ?? null;
}

async function unreadCountForMember(
  chatId: string,
  viewerUserId: string,
  lastReadBoundary: Date | null,
): Promise<number> {
  return prisma.message.count({
    where: {
      chatId,
      senderId: { not: viewerUserId },
      deletedAt: null,
      ...(lastReadBoundary
        ? { createdAt: { gt: lastReadBoundary } }
        : {}),
    },
  });
}

async function fetchChatDetailed(chatId: string): Promise<ChatDetailed | null> {
  return prisma.chat.findUnique({
    where: { id: chatId },
    include: chatDetailInclude,
  });
}

async function chatDetailedToDTO(
  viewerId: string,
  chat: ChatDetailed,
): Promise<ChatDTO> {
  const myMember = chat.members.find((m) => m.userId === viewerId);
  if (!myMember) {
    throw new HttpError(
      403,
      'Вы не состоите в этом чате',
      { apiCode: "FORBIDDEN" },
    );
  }

  const boundary = await lastReadBoundaryForMember(myMember.id);
  const unreadCount = await unreadCountForMember(
    chat.id,
    viewerId,
    boundary,
  );

  const rawLast = chat.messages[0];
  const lastMsg = rawLast
    ? prismaMessageToDTO(
        rawLast as Message & { attachments: MessageAttachment[] },
      )
    : null;

  return {
    id: chat.id,
    type: prismaChatTypeToApi(chat.type),
    title: chat.type === "GROUP" ? chat.title : null,
    createdAt: chat.createdAt.toISOString(),
    members: chat.members.map((m) => prismaUserToUserDTO(m.user)),
    lastMessage: lastMsg,
    unreadCount,
  };
}

export async function createOrOpenDirect(params: {
  userId: string;
  peerUserId: string;
}) {
  const { userId, peerUserId } = params;
  if (!peerUserId || peerUserId === userId) {
    throw new HttpError(400, 'Нужен второй пользователь диалога', {
      apiCode: "BAD_REQUEST",
    });
  }
  const peer = await prisma.user.findUnique({ where: { id: peerUserId } });
  if (!peer) {
    throw new HttpError(404, "Собеседник не найден", {
      apiCode: "NOT_FOUND",
    });
  }

  const key = directPairKey(userId, peerUserId);

  await prisma.chat.upsert({
    where: { directKey: key },
    create: {
      type: "DIRECT",
      directKey: key,
      createdById: userId,
      members: {
        create: [
          { userId, role: "MEMBER" },
          { userId: peerUserId, role: "MEMBER" },
        ],
      },
    },
    update: {},
    select: { id: true },
  });

  const row = await prisma.chat.findUniqueOrThrow({
    where: { directKey: key },
    include: chatDetailInclude,
  });

  return chatDetailedToDTO(userId, row as ChatDetailed);
}

export async function createGroupChat(params: {
  creatorId: string;
  title: string;
  memberIds: string[];
}) {
  const title = params.title.trim();
  if (!title) {
    throw new HttpError(400, "Название чата обязательно", {
      apiCode: "VALIDATION",
    });
  }
  const uniq = [...new Set([params.creatorId, ...params.memberIds])];
  const countUsers = await prisma.user.count({
    where: { id: { in: uniq } },
  });
  if (countUsers !== uniq.length) {
    throw new HttpError(404, "Один или несколько участников не найдены", {
      apiCode: "NOT_FOUND",
    });
  }

  const created = await prisma.chat.create({
    data: {
      type: "GROUP",
      title,
      createdById: params.creatorId,
      members: {
        create: uniq.map((id) =>
          id === params.creatorId
            ? { userId: id, role: "OWNER" as const }
            : { userId: id, role: "MEMBER" as const },
        ),
      },
    },
    include: chatDetailInclude,
  });

  return chatDetailedToDTO(
    params.creatorId,
    created as ChatDetailed,
  );
}

export async function listChats(viewerId: string): Promise<ChatListDTO> {
  const links = await prisma.chatMember.findMany({
    where: { userId: viewerId },
    include: {
      chat: { include: chatDetailInclude },
    },
    orderBy: { chat: { updatedAt: "desc" } },
  });

  const chats: ChatDTO[] = [];
  for (const link of links) {
    chats.push(
      await chatDetailedToDTO(
        viewerId,
        link.chat as ChatDetailed,
      ),
    );
  }
  return { chats };
}

export async function getChatDetail(viewerId: string, chatId: string) {
  await ensureMember(chatId, viewerId);
  const chat = await fetchChatDetailed(chatId);
  if (!chat) {
    throw new HttpError(404, "Чат не найден", { apiCode: "NOT_FOUND" });
  }
  return chatDetailedToDTO(viewerId, chat);
}

/** Установить позицию «прочитано до» указанного сообщения. */
export async function setChatLastReadToMessageBoundary(params: {
  chatId: string;
  viewerUserId: string;
  messageId: string;
}): Promise<void> {
  await ensureMember(params.chatId, params.viewerUserId);

  const msg = await prisma.message.findFirst({
    where: {
      id: params.messageId,
      chatId: params.chatId,
      deletedAt: null,
    },
    select: { id: true, createdAt: true },
  });
  if (!msg) {
    throw new HttpError(404, "Сообщение не найдено в этом чате", {
      apiCode: "NOT_FOUND",
    });
  }

  const membership = await prisma.chatMember.findUnique({
    where: {
      chatId_userId: {
        chatId: params.chatId,
        userId: params.viewerUserId,
      },
    },
    include: {
      lastReadMessage: {
        select: { id: true, createdAt: true },
      },
    },
  });
  if (!membership) {
    throw new HttpError(403, "Вы не состоите в этом чате", {
      apiCode: "FORBIDDEN",
    });
  }

  const current = membership.lastReadMessage;
  const shouldAdvance =
    !current?.createdAt
    || msg.createdAt > current.createdAt
    ||
    (msg.createdAt.getTime() === current.createdAt.getTime()
      && msg.id > current.id);

  if (!shouldAdvance) return;

  await prisma.chatMember.update({
    where: { id: membership.id },
    data: { lastReadMessageId: msg.id },
  });
}
