import type { AttachmentKind as ApiAttachmentKind } from "@aegis/shared";
import type { AttachmentKind as PrismaAttachmentKind } from "@prisma/client";

import { HttpError } from "./http-error.js";

export function apiAttachmentKindToPrisma(
  kind: string,
): PrismaAttachmentKind {
  switch (kind) {
    case "image":
      return "IMAGE";
    case "video":
      return "VIDEO";
    case "file":
      return "FILE";
    case "voice":
      return "VOICE";
    case "video_note":
      return "VIDEO_NOTE";
    default:
      throw new HttpError(400, `Неверный kind вложения: ${kind}`, {
        apiCode: "VALIDATION",
      });
  }
}

export function isApiAttachmentKind(
  kind: unknown,
): kind is ApiAttachmentKind {
  return (
    kind === "image" ||
    kind === "video" ||
    kind === "file" ||
    kind === "voice" ||
    kind === "video_note"
  );
}
