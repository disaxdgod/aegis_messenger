import {
  API_VERSION,
  APP_NAME,
  SOCKET_EVENTS,
} from "@aegis/shared";
import type { EncryptedMessageDTO, SendMessageRequestDTO } from "@aegis/shared";
import { Presence } from "@prisma/client";
import type { Server as IOServer, Socket } from "socket.io";

import { getSocketIo } from "../io-holder.js";
import { HttpError } from "../lib/http-error.js";
import { prismaPresenceToApi } from "../lib/mappers.js";
import { verifyAccessToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";
import { logger } from "../logger.js";
import { distinctPeerUserIdsForUser } from "../services/chat-participants.js";
import { setChatLastReadToMessageBoundary } from "../services/chat.service.js";
import { createMessageAndBroadcast } from "../services/message.service.js";

import { attachCallSignalingHandlers, endAllCallsForUser } from "./call-signaling.js";
import { socketPresenceRegistry } from "./presence-registry.js";

type MessageSendAck =
  | { ok: true; data: EncryptedMessageDTO }
  | { ok: false; error: string };

export function attachSocket(io: IOServer): void {
  io.use(async (socket, next) => {
    try {
      const token =
        typeof socket.handshake.auth?.token === "string"
          ? socket.handshake.auth.token.trim()
          : bearerFromHeader(socket.handshake.headers.authorization);
      if (!token) {
        return next(
          new HttpError(401, "Нет токена для Socket.IO", {
            apiCode: "UNAUTHORIZED",
          }),
        );
      }
      const claims = verifyAccessToken(token);
      attachAuthData(socket, claims.sub, claims.username);
      next();
    } catch (e) {
      next(
        e instanceof Error ?
          e
        : new HttpError(401, "Токен сокета отклонён", {
            apiCode: "UNAUTHORIZED",
          }),
      );
    }
  });

  io.on("connection", (socket: Socket) => {
    void onSocketConnected(socket).catch((e: unknown) => {
      logger.error({ err: e }, "socket connect");
    });

    attachCallSignalingHandlers(socket, io);

    socket.on(
      SOCKET_EVENTS.messageSend,
      async (payload: unknown, cb?: (ack: MessageSendAck) => void) => {
        await handleMessageSend(socket, payload, cb).catch((e: unknown) => {
          logger.error({ err: e }, SOCKET_EVENTS.messageSend);
        });
      },
    );

    socket.on(SOCKET_EVENTS.messageRead, (raw: unknown) => {
      void handleSocketMessageRead(socket, raw).catch((e: unknown) => {
        logger.error({ err: e }, SOCKET_EVENTS.messageRead);
      });
    });

    socket.on(SOCKET_EVENTS.chatTypingStart, (raw: unknown) => {
      void handleTyping(socket, raw, true).catch(() => {});
    });

    socket.on(SOCKET_EVENTS.chatTypingStop, (raw: unknown) => {
      void handleTyping(socket, raw, false).catch(() => {});
    });

    socket.on("disconnect", () => {
      void onSocketDisconnected(socket).catch((e: unknown) => {
        logger.error({ err: e }, "socket disconnect");
      });
    });
  });
}

export function bearerFromHeader(authorization?: string): string | undefined {
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }
  return undefined;
}

function attachAuthData(socket: Socket, userId: string, username: string): void {
  const bag = socket.data as Record<string, string>;
  bag.authUserId = userId;
  bag.authUsername = username;
}

function authUserIdOf(socket: Socket): string | undefined {
  const id = (socket.data as Record<string, string | undefined>).authUserId;
  return typeof id === "string" ? id : undefined;
}

async function socketJoinChatRooms(socket: Socket, userId: string): Promise<void> {
  const links = await prisma.chatMember.findMany({
    where: { userId },
    select: { chatId: true },
  });
  for (const { chatId } of links) {
    socket.join(`chat:${chatId}`);
  }
}

async function broadcastPresencePeers(userId: string): Promise<void> {
  const io = getSocketIo();
  if (!io) return;
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) return;
  const peers = await distinctPeerUserIdsForUser(userId);
  const payload = {
    userId,
    presence: prismaPresenceToApi(user.presence),
    lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
  };
  for (const peerId of peers) {
    io.to(`user:${peerId}`).emit(SOCKET_EVENTS.presenceUpdate, payload);
  }
}

async function onSocketConnected(socket: Socket): Promise<void> {
  const userId = authUserIdOf(socket);
  if (!userId) return;

  socket.join(`user:${userId}`);
  socketPresenceRegistry.addSocket(userId, socket.id);

  await prisma.user.update({
    where: { id: userId },
    data: { presence: Presence.ONLINE, lastSeenAt: null },
  });

  await socketJoinChatRooms(socket, userId);
  await broadcastPresencePeers(userId);

  socket.emit(SOCKET_EVENTS.hello, {
    app: APP_NAME,
    apiVersion: API_VERSION,
    at: new Date().toISOString(),
    userId,
  });
}

async function onSocketDisconnected(socket: Socket): Promise<void> {
  const userId = authUserIdOf(socket);
  if (!userId) return;
  socketPresenceRegistry.removeSocket(userId, socket.id);
  if (socketPresenceRegistry.socketCount(userId) > 0) return;

  const io = getSocketIo();
  if (io) {
    endAllCallsForUser(io, userId);
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      presence: Presence.OFFLINE,
      lastSeenAt: new Date(),
    },
  });

  await broadcastPresencePeers(userId);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function handleMessageSend(
  socket: Socket,
  payload: unknown,
  cb?: (ack: MessageSendAck) => void,
): Promise<void> {
  const userId = authUserIdOf(socket);
  if (!userId) {
    cb?.({ ok: false, error: "Не авторизован" });
    return;
  }

  if (!isPlainObject(payload)) {
    cb?.({ ok: false, error: "Неверное тело сообщения" });
    return;
  }

  const body = payload as Partial<SendMessageRequestDTO>;

  try {
    if (
      typeof body.chatId !== "string" ||
      typeof body.clientId !== "string" ||
      typeof body.iv !== "string" ||
      typeof body.ciphertext !== "string" ||
      typeof body.algo !== "string" ||
      typeof body.senderEphemeralPublicKey !== "string"
    ) {
      throw new HttpError(
        400,
        "Нехватает полей ciphertext / iv / clientId для E2EE",
        {
          apiCode: "VALIDATION",
        },
      );
    }

    const dto = await createMessageAndBroadcast({
      senderId: userId,
      chatId: body.chatId,
      body: {
        clientId: body.clientId,
        iv: body.iv,
        ciphertext: body.ciphertext,
        algo: body.algo as SendMessageRequestDTO["algo"],
        senderEphemeralPublicKey: body.senderEphemeralPublicKey,
        attachmentIds:
          Array.isArray(body.attachmentIds) ?
            body.attachmentIds.filter((x): x is string => typeof x === "string")
          : undefined,
      },
    });

    cb?.({ ok: true, data: dto });
  } catch (e: unknown) {
    const errorText = e instanceof Error ? e.message : "Ошибка отправки";
    cb?.({ ok: false, error: errorText });
  }
}

async function handleSocketMessageRead(socket: Socket, raw: unknown): Promise<void> {
  const userId = authUserIdOf(socket);
  if (!userId || !isPlainObject(raw)) return;
  if (typeof raw.chatId !== "string" || typeof raw.messageId !== "string") {
    return;
  }
  await setChatLastReadToMessageBoundary({
    chatId: raw.chatId,
    viewerUserId: userId,
    messageId: raw.messageId,
  });
}

async function handleTyping(
  socket: Socket,
  raw: unknown,
  isTyping: boolean,
): Promise<void> {
  const userId = authUserIdOf(socket);
  if (!userId || !isPlainObject(raw) || typeof raw.chatId !== "string") {
    return;
  }

  try {
    const member = await prisma.chatMember.findFirst({
      where: { chatId: raw.chatId, userId },
    });
    if (!member) return;
  } catch {
    return;
  }

  const payload = {
    chatId: raw.chatId,
    userId,
    isTyping,
  };
  socket.broadcast.to(`chat:${raw.chatId}`).emit(SOCKET_EVENTS.typing, payload);
}
