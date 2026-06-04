import { SOCKET_EVENTS } from "@aegis/shared";
import type { PostMessageReceiptRequestDTO } from "@aegis/shared";
import { Prisma, ReceiptState } from "@prisma/client";

import { getSocketIo } from "../io-holder.js";
import { HttpError } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";

import { ensureMember, setChatLastReadToMessageBoundary } from "./chat.service.js";

function apiReceiptToPrisma(s: PostMessageReceiptRequestDTO["state"]): ReceiptState {
  return s === "read" ? "READ" : "DELIVERED";
}

export async function postMessageReceiptService(params: {
  viewerUserId: string;
  chatId: string;
  messageId: string;
  body: PostMessageReceiptRequestDTO;
}): Promise<void> {
  const stateOk =
    params.body?.state === "delivered"
    || params.body?.state === "read";
  if (!stateOk) {
    throw new HttpError(
      400,
      "Нужно state: delivered или read",
      { apiCode: "VALIDATION" },
    );
  }

  await ensureMember(params.chatId, params.viewerUserId);

  const message = await prisma.message.findFirst({
    where: {
      id: params.messageId,
      chatId: params.chatId,
      deletedAt: null,
    },
  });
  if (!message) {
    throw new HttpError(404, "Сообщение не найдено", { apiCode: "NOT_FOUND" });
  }

  if (message.senderId === params.viewerUserId) {
    throw new HttpError(
      400,
      "Квитанции не выставляются на собственные сообщения",
      { apiCode: "VALIDATION" },
    );
  }

  const state = apiReceiptToPrisma(params.body.state);
  try {
    await prisma.messageReceipt.create({
      data: {
        messageId: params.messageId,
        userId: params.viewerUserId,
        state,
      },
    });
  } catch (e: unknown) {
    if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) {
      throw e;
    }
  }

  if (params.body.state === "read") {
    await setChatLastReadToMessageBoundary({
      chatId: params.chatId,
      viewerUserId: params.viewerUserId,
      messageId: params.messageId,
    });
  }

  const at = new Date().toISOString();
  const io = getSocketIo();
  const rows = await prisma.chatMember.findMany({
    where: { chatId: params.chatId },
    select: { userId: true },
  });

  const payload = {
    chatId: params.chatId,
    messageId: params.messageId,
    byUserId: params.viewerUserId,
    state: params.body.state as "delivered" | "read",
    at,
  };

  for (const { userId } of rows) {
    io?.to(`user:${userId}`).emit(SOCKET_EVENTS.messageReceipt, payload);
  }
}
