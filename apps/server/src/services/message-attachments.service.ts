import fs from "node:fs";
import path from "node:path";

import { env } from "../config/env.js";
import { HttpError } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";

import { ensureMember } from "./chat.service.js";

function resolveUploadAbsolutePath(storageKey: string): string {
  const root = path.resolve(env.uploadsDir);
  const rel = path
    .normalize(storageKey.trim())
    .replace(/^[/\\]+/, "");
  if (rel.includes("..")) {
    throw new HttpError(400, "Некорректный ключ хранилища", {
      apiCode: "BAD_REQUEST",
    });
  }
  const abs = path.join(root, rel);
  if (!(abs === root || abs.startsWith(`${root}${path.sep}`))) {
    throw new HttpError(400, "Путь файла не в каталоге загрузок", {
      apiCode: "BAD_REQUEST",
    });
  }
  return abs;
}

export async function openMessageAttachmentStream(params: {
  viewerId: string;
  chatId: string;
  attachmentId: string;
}): Promise<{ stream: fs.ReadStream; mime: string }> {
  await ensureMember(params.chatId, params.viewerId);
  const att = await prisma.messageAttachment.findFirst({
    where: {
      id: params.attachmentId,
      message: { chatId: params.chatId, deletedAt: null },
    },
  });
  if (!att) {
    throw new HttpError(404, "Вложение не найдено", { apiCode: "NOT_FOUND" });
  }

  const abs = resolveUploadAbsolutePath(att.storageKey);
  if (!fs.existsSync(abs)) {
    throw new HttpError(
      404,
      "Файл недоступен на сервере",
      { apiCode: "NOT_FOUND" },
    );
  }

  return {
    stream: fs.createReadStream(abs),
    mime: att.mime || "application/octet-stream",
  };
}
