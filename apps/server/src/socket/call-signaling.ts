
import {
  SOCKET_EVENTS,
  type SerializedIceCandidateDTO,
  type SerializedSessionDescriptionDTO,
} from "@aegis/shared";
import type { Server as IOServer, Socket } from "socket.io";

import { prisma } from "../lib/prisma.js";
import { logger } from "../logger.js";
import { resolveDirectDmPeerUserId } from "../services/direct-chat-peer.js";

type CallSessionRecord = {
  callId: string;
  chatId: string;
  fromUserId: string;
  toUserId: string;
  /** audio | video */
  kind: string;
};

/** Активные звонки: callId → сессия */
const sessions = new Map<string, CallSessionRecord>();

function peerFor(session: CallSessionRecord, userId: string): string | undefined {
  if (session.fromUserId === userId) return session.toUserId;
  if (session.toUserId === userId) return session.fromUserId;
  return undefined;
}

function otherUserRoom(userId: string): string {
  return `user:${userId}`;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeCallKind(kind: unknown): "audio" | "video" | null {
  if (kind === "audio" || kind === "video") return kind;
  return null;
}

function isIceCandidate(raw: unknown): raw is SerializedIceCandidateDTO {
  if (!isPlainRecord(raw)) return false;
  if (typeof raw.candidate !== "string") return false;
  const mid = raw["sdpMid"];
  if (mid !== undefined && mid !== null && typeof mid !== "string") return false;
  const line = raw["sdpMLineIndex"];
  if (
    line !== undefined &&
    line !== null &&
    typeof line !== "number"
  ) {
    return false;
  }
  return true;
}

async function disposeCall(io: IOServer, callId: string): Promise<void> {
  const session = sessions.get(callId);
  sessions.delete(callId);
  if (!session) return;
  const payload = { callId };
  io.to(otherUserRoom(session.fromUserId)).emit(SOCKET_EVENTS.callEnded, payload);
  io.to(otherUserRoom(session.toUserId)).emit(SOCKET_EVENTS.callEnded, payload);
}

/** Уведомляет вторую сторону и чистит внутреннее состояние (без рассылки ended). */
function removeSessionQuiet(callId: string): CallSessionRecord | undefined {
  const s = sessions.get(callId);
  if (s) sessions.delete(callId);
  return s;
}

/** Убираем все активные звонки пользователя (disconnect / выход из чата не реализован). */
export function endAllCallsForUser(io: IOServer, userId: string): void {
  for (const [callId, s] of [...sessions.entries()]) {
    if (s.fromUserId !== userId && s.toUserId !== userId) continue;
    void disposeCall(io, callId).catch(() => {});
  }
}

/** Регистрация событий сигналинга на одном сокете. */
export function attachCallSignalingHandlers(socket: Socket, io: IOServer): void {
  socket.on(SOCKET_EVENTS.callInvite, (raw: unknown) => {
    void (async () => {
      const userId = authUserId(socket);
      if (!userId || !isPlainRecord(raw)) return;
      const callId = typeof raw.callId === "string" ? raw.callId.trim() : "";
      const chatId = typeof raw.chatId === "string" ? raw.chatId.trim() : "";
      const kind = normalizeCallKind(raw.kind);
      if (!callId.length || !chatId.length || !kind) {
        return;
      }
      try {
        if (sessions.has(callId)) {
          return;
        }
        const peerId = await resolveDirectDmPeerUserId(chatId, userId);
        if (!peerId) return;

        const fromProfile = await prisma.user.findUnique({
          where: { id: userId },
          select: { username: true },
        });

        sessions.set(callId, {
          callId,
          chatId,
          fromUserId: userId,
          toUserId: peerId,
          kind,
        });

        io.to(otherUserRoom(peerId)).emit(SOCKET_EVENTS.callRing, {
          callId,
          chatId,
          kind,
          fromUserId: userId,
          fromUsername: fromProfile?.username ?? "",
        });
      } catch (e: unknown) {
        logger.warn({ err: e }, SOCKET_EVENTS.callInvite);
      }
    })();
  });

  socket.on(SOCKET_EVENTS.callAccept, (raw: unknown) => {
    void (async () => {
      const userId = authUserId(socket);
      if (!userId || !isPlainRecord(raw)) return;
      const callId = typeof raw.callId === "string" ? raw.callId.trim() : "";
      if (!callId.length) return;
      const session = sessions.get(callId);
      if (!session || session.toUserId !== userId) return;
      io.to(otherUserRoom(session.fromUserId)).emit(SOCKET_EVENTS.callAccepted, {
        callId,
      });
    })();
  });

  socket.on(SOCKET_EVENTS.callReject, (raw: unknown) => {
    const userId = authUserId(socket);
    if (!userId || !isPlainRecord(raw)) return;
    const callId = typeof raw.callId === "string" ? raw.callId.trim() : "";
    if (!callId.length) return;
    const session = sessions.get(callId);
    if (!session || session.toUserId !== userId) return;
    removeSessionQuiet(callId);
    io.to(otherUserRoom(session.fromUserId)).emit(SOCKET_EVENTS.callRejected, {
      callId,
    });
  });

  socket.on(SOCKET_EVENTS.callEnd, (raw: unknown) => {
    const userId = authUserId(socket);
    if (!userId || !isPlainRecord(raw)) return;
    const callId = typeof raw.callId === "string" ? raw.callId.trim() : "";
    if (!callId.length) return;
    const session = sessions.get(callId);
    if (
      !session ||
      (session.fromUserId !== userId && session.toUserId !== userId)
    )
      return;
    void disposeCall(io, callId).catch(() => {});
  });

  socket.on(SOCKET_EVENTS.webrtcOffer, (raw: unknown) => {
    const userId = authUserId(socket);
    if (!userId || !isPlainRecord(raw)) return;
    const callId = typeof raw.callId === "string" ? raw.callId.trim() : "";
    const description = raw.description;
    const session =
      callId.length ? sessions.get(callId)
      : undefined;
    const peer =
      session && participantValid(session, userId)
        ? peerFor(session, userId)
      : undefined;
    if (
      !peer ||
      !session ||
      !isSessionDescription(description) ||
      session.fromUserId !== userId
    )
      return;
    io.to(otherUserRoom(peer)).emit(SOCKET_EVENTS.webrtcOffer, {
      callId,
      description,
    });
  });

  socket.on(SOCKET_EVENTS.webrtcAnswer, (raw: unknown) => {
    const userId = authUserId(socket);
    if (!userId || !isPlainRecord(raw)) return;
    const callId = typeof raw.callId === "string" ? raw.callId.trim() : "";
    const description = raw.description;
    const session =
      callId.length ? sessions.get(callId)
      : undefined;
    const peer =
      session && participantValid(session, userId)
        ? peerFor(session, userId)
      : undefined;
    if (
      !peer ||
      !session ||
      !isSessionDescription(description) ||
      session.toUserId !== userId
    )
      return;
    io.to(otherUserRoom(peer)).emit(SOCKET_EVENTS.webrtcAnswer, {
      callId,
      description,
    });
  });

  socket.on(SOCKET_EVENTS.webrtcIce, (raw: unknown) => {
    const userId = authUserId(socket);
    if (!userId || !isPlainRecord(raw)) return;
    const callId = typeof raw.callId === "string" ? raw.callId.trim() : "";
    const candidate = raw.candidate;
    const session =
      callId.length ? sessions.get(callId)
      : undefined;
    const peer =
      session && participantValid(session, userId)
        ? peerFor(session, userId)
      : undefined;
    if (
      !peer ||
      !session ||
      typeof candidate !== "object" ||
      candidate === null ||
      !isIceCandidate(candidate as unknown)
    )
      return;
    io.to(otherUserRoom(peer)).emit(SOCKET_EVENTS.webrtcIce, {
      callId,
      candidate,
    });
  });
}

function authUserId(socket: Socket): string | undefined {
  const id = (socket.data as Record<string, string | undefined>).authUserId;
  return typeof id === "string" ? id : undefined;
}

function participantValid(session: CallSessionRecord, userId: string): boolean {
  return session.fromUserId === userId || session.toUserId === userId;
}

function isSessionDescription(
  raw: unknown,
): raw is SerializedSessionDescriptionDTO {
  if (!isPlainRecord(raw)) return false;
  if (typeof raw.type !== "string" || typeof raw.sdp !== "string")
    return false;
  const t = raw.type;
  return t === "offer" || t === "answer" || t === "pranswer";
}
