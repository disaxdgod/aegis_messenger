import { HttpError } from "../lib/http-error.js";
import {
  prismaPublicKeyAlgoToApi,
  prismaUserToMeDTO,
  prismaUserToUserDTO,
} from "../lib/mappers.js";
import { prisma } from "../lib/prisma.js";

/** Полный профиль после JWT из БД. */
export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new HttpError(401, "Сессия недействительна", {
      apiCode: "UNAUTHORIZED",
    });
  }
  return prismaUserToMeDTO(user);
}

/** Поиск по username содержит q; свой id исключается. */
export async function searchUsers(userId: string, qRaw: string) {
  const q = qRaw.trim().toLowerCase();
  if (q.length < 2) return [];
  const users = await prisma.user.findMany({
    where: {
      id: { not: userId },
      username: { contains: q, mode: "insensitive" },
    },
    take: 24,
    orderBy: { username: "asc" },
  });
  return users.map((u) => prismaUserToUserDTO(u));
}

/** Публичный ключ собеседника (требуется существование DIRECT между пользователями). */
export async function getPublicKeyForUser(
  requestingUserId: string,
  targetUserId: string,
) {
  if (!targetUserId) {
    throw new HttpError(400, "Неверный id", { apiCode: "BAD_REQUEST" });
  }

  const other = await prisma.user.findUnique({ where: { id: targetUserId } });

  if (!other) {
    throw new HttpError(404, "Пользователь не найден", {
      apiCode: "NOT_FOUND",
    });
  }

  const shared = await prisma.chatMember.count({
    where: {
      userId: requestingUserId,
      chat: {
        type: "DIRECT",
        members: { some: { userId: targetUserId } },
      },
    },
  });
  if (shared === 0) {
    throw new HttpError(
      403,
      "Нет общего диалога с пользователем",
      { apiCode: "FORBIDDEN" },
    );
  }

  if (!other.publicKey || !other.publicKeyAlgo) {
    throw new HttpError(
      404,
      "У пользователя не опубликован ключ E2EE",
      {
        apiCode: "NOT_FOUND",
      },
    );
  }

  return {
    userId: other.id,
    publicKey: other.publicKey,
    publicKeyAlgo: prismaPublicKeyAlgoToApi(other.publicKeyAlgo),
    publishedAt:
      other.publicKeyAt?.toISOString() ?? other.createdAt.toISOString(),
  };
}

export async function setAvatarUrl(userId: string, publicRelativeUrl: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: publicRelativeUrl },
  });
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  return prismaUserToMeDTO(user);
}
