import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import type { MessageAttachmentStagingResponseDTO } from "@aegis/shared";
import { Router } from "express";
import multer from "multer";

import { env } from "../config/env.js";
import { HttpError } from "../lib/http-error.js";
import { apiAttachmentKindToPrisma, isApiAttachmentKind } from "../lib/attachment-kind.js";
import { requireAuthMiddleware } from "../middleware/require-auth.js";
import { prisma } from "../lib/prisma.js";
import { setAvatarUrl } from "../services/user.service.js";

function guessExt(file: Express.Multer.File): string {
  switch (file.mimetype) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    default:
      return "";
  }
}

/** Поле multipart: **avatar**. Монтируется на `${API_PREFIX}/uploads`. */
export function createUploadsRouter(): Router {
  const r = Router();

  const avatarsDir = path.join(env.uploadsDir, "avatars");
  fs.mkdirSync(avatarsDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, avatarsDir);
    },
    filename: (_req, file, cb) => {
      cb(null, `${randomUUID()}${guessExt(file)}`);
    },
  });

  const upload = multer({
    storage,
    limits: { fileSize: 6 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const ok = /^image\/(jpeg|png|webp|gif)$/i.test(file.mimetype);
      cb(null, ok);
    },
  });

  const stagingDisk = multer.diskStorage({
    destination: (req, _file, cb) => {
      const uid = req.userId!;
      const dir = path.join(env.uploadsDir, "msg-staging", uid);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, _file, cb) => {
      cb(null, `${randomUUID()}.bin`);
    },
  });

  const stageUpload = multer({
    storage: stagingDisk,
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (_req, _file, cb) => cb(null, true),
  });

  r.post(
    "/avatar",
    requireAuthMiddleware,
    upload.single("avatar"),
    async (req, res, next) => {
      try {
        const file = req.file;
        if (!file?.filename) {
          throw new HttpError(400, "Файл не получен", {
            apiCode: "BAD_REQUEST",
          });
        }
        const publicRelative = `/uploads/avatars/${file.filename}`;
        const me = await setAvatarUrl(req.userId!, publicRelative);
        res.json(me);
      } catch (e) {
        next(e);
      }
    },
  );

  /** Загрузка ciphertext вложения перед отправкой сообщения (multipart: blob + текстовые поля). */
  r.post(
    "/message-stage",
    requireAuthMiddleware,
    stageUpload.single("blob"),
    async (req, res, next) => {
      try {
        const userId = req.userId!;
        const file = req.file;
        if (!file?.filename) {
          throw new HttpError(400, "Получите файл в поле blob", {
            apiCode: "BAD_REQUEST",
          });
        }

        const iv =
          typeof req.body.iv === "string"
            ? req.body.iv.trim()
            : "";
        const encryptedKey =
          typeof req.body.encryptedKey === "string"
            ? req.body.encryptedKey.trim()
            : "";
        const kindRaw = req.body.kind;
        if (!iv || !encryptedKey || !isApiAttachmentKind(kindRaw)) {
          const uploadedPath = path.join(file.destination, file.filename);
          try {
            fs.unlinkSync(uploadedPath);
          } catch {
            /* ignore cleanup */
          }
          throw new HttpError(
            400,
            "Нужны непустые поля iv, encryptedKey и kind (image | video | file | voice | video_note)",
            { apiCode: "VALIDATION" },
          );
        }

        let durationSec: number | null =
          typeof req.body.durationSec === "string"
            ?
              Number(req.body.durationSec)
            :
            typeof req.body.durationSec === "number"
              ? req.body.durationSec
              : null;
        if (durationSec !== null && !Number.isFinite(durationSec)) {
          durationSec = null;
        }
        if (
          typeof durationSec === "number" &&
          durationSec !== null &&
          durationSec <= 0
        ) {
          durationSec = null;
        }

        const mimeTrim =
          typeof req.body.mime === "string"
            ? req.body.mime.trim()
            : "";

        const kind = apiAttachmentKindToPrisma(kindRaw);
        const relKey = path.join(
          "msg-staging",
          userId,
          file.filename,
        ).replace(/\\/g, "/");
        const sizeBytes = typeof file.size === "number"
          ?
            file.size
          :
            fs.statSync(path.join(file.destination, file.filename)).size;

        const row = await prisma.messageAttachmentStaging.create({
          data: {
            userId,
            kind,
            mime: mimeTrim || file.mimetype || "application/octet-stream",
            sizeBytes,
            durationSec:
              typeof durationSec === "number"
                ?
                  Math.round(durationSec)
                : null,
            storageKey: relKey,
            iv,
            encryptedKey,
          },
        });

        const out: MessageAttachmentStagingResponseDTO = { id: row.id };
        res.status(201).json(out);
      } catch (e) {
        next(e);
      }
    },
  );

  return r;
}
