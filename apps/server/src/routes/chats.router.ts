import type {
  ChatDTO,
  CreateDirectChatRequestDTO,
  CreateGroupChatRequestDTO,
  MessagePageDTO,
  PatchMessageRequestDTO,
  PostMessageReceiptRequestDTO,
  SendMessageRequestDTO,
  SetChatLastReadRequestDTO,
} from "@aegis/shared";
import { Router } from "express";

import { HttpError } from "../lib/http-error.js";
import { requireAuthMiddleware } from "../middleware/require-auth.js";
import { openMessageAttachmentStream } from "../services/message-attachments.service.js";
import { postMessageReceiptService } from "../services/receipt.service.js";
import {
  createGroupChat,
  createOrOpenDirect,
  getChatDetail,
  listChats,
  setChatLastReadToMessageBoundary,
} from "../services/chat.service.js";
import {
  createMessageAndBroadcast,
  pageMessages,
  patchMessageAndBroadcast,
  softDeleteMessageAndBroadcast,
} from "../services/message.service.js";

/** `${API_PREFIX}/chats`. */
export function createChatsRouter(): Router {
  const r = Router();
  r.use(requireAuthMiddleware);

  r.post("/direct", async (req, res, next) => {
    try {
      const { peerUserId } = req.body as CreateDirectChatRequestDTO;
      const chat: ChatDTO = await createOrOpenDirect({
        userId: req.userId!,
        peerUserId,
      });
      res.status(201).json(chat);
    } catch (e) {
      next(e);
    }
  });

  r.post("/group", async (req, res, next) => {
    try {
      const { title, memberIds } = req.body as CreateGroupChatRequestDTO;
      const chat: ChatDTO = await createGroupChat({
        creatorId: req.userId!,
        title,
        memberIds,
      });
      res.status(201).json(chat);
    } catch (e) {
      next(e);
    }
  });

  r.get("/", async (req, res, next) => {
    try {
      res.json(await listChats(req.userId!));
    } catch (e) {
      next(e);
    }
  });

  r.patch("/:chatId/read", async (req, res, next) => {
    try {
      const { messageId } = req.body as SetChatLastReadRequestDTO;
      if (typeof messageId !== "string" || !messageId.trim()) {
        throw new HttpError(400, "Нужно поле messageId", {
          apiCode: "VALIDATION",
        });
      }
      await setChatLastReadToMessageBoundary({
        chatId: req.params.chatId,
        viewerUserId: req.userId!,
        messageId: messageId.trim(),
      });
      res.status(204).end();
    } catch (e) {
      next(e);
    }
  });

  r.get("/:chatId/attachments/:attachmentId/file", async (req, res, next) => {
    try {
      const { stream, mime } = await openMessageAttachmentStream({
        viewerId: req.userId!,
        chatId: req.params.chatId,
        attachmentId: req.params.attachmentId,
      });
      res.setHeader("Content-Type", mime);
      res.setHeader("Cache-Control", "private, max-age=3600");
      stream.on("error", (streamErr: unknown) => {
        if (!res.writableEnded) next(streamErr);
      });
      stream.pipe(res);
    } catch (e) {
      next(e);
    }
  });

  r.get("/:chatId/messages", async (req, res, next) => {
    try {
      const cursor =
        typeof req.query.cursor === "string"
          ?
            req.query.cursor
          :
            undefined;
      const limitRaw = Number(req.query.limit);
      const limit = Number.isFinite(limitRaw)
        ?
          limitRaw
        :
          undefined;
      const page: MessagePageDTO = await pageMessages({
        viewerId: req.userId!,
        chatId: req.params.chatId,
        cursor,
        limit,
      });
      res.json(page);
    } catch (e) {
      next(e);
    }
  });

  r.post("/:chatId/messages", async (req, res, next) => {
    try {
      const body = req.body as Omit<SendMessageRequestDTO, "chatId">;
      const message = await createMessageAndBroadcast({
        senderId: req.userId!,
        chatId: req.params.chatId,
        body,
      });
      res.status(201).json(message);
    } catch (e) {
      next(e);
    }
  });

  r.patch("/:chatId/messages/:messageId", async (req, res, next) => {
    try {
      const body = req.body as PatchMessageRequestDTO;
      const message = await patchMessageAndBroadcast({
        senderId: req.userId!,
        chatId: req.params.chatId,
        messageId: req.params.messageId,
        body,
      });
      res.json(message);
    } catch (e) {
      next(e);
    }
  });

  r.delete("/:chatId/messages/:messageId", async (req, res, next) => {
    try {
      await softDeleteMessageAndBroadcast({
        senderId: req.userId!,
        chatId: req.params.chatId,
        messageId: req.params.messageId,
      });
      res.status(204).end();
    } catch (e) {
      next(e);
    }
  });

  r.post("/:chatId/messages/:messageId/receipt", async (req, res, next) => {
    try {
      await postMessageReceiptService({
        viewerUserId: req.userId!,
        chatId: req.params.chatId,
        messageId: req.params.messageId,
        body: req.body as PostMessageReceiptRequestDTO,
      });
      res.status(204).end();
    } catch (e) {
      next(e);
    }
  });

  r.get("/:chatId", async (req, res, next) => {
    try {
      res.json(
        await getChatDetail(req.userId!, req.params.chatId),
      );
    } catch (e) {
      next(e);
    }
  });

  return r;
}
