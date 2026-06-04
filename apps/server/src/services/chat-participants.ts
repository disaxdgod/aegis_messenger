import { prisma } from "../lib/prisma.js";

/** Все userId тех, кто состоит в общих чатах с пользователем (кроме него самого). */
export async function distinctPeerUserIdsForUser(
  userId: string,
): Promise<string[]> {
  const rows = await prisma.$queryRaw<Array<{ peer_id: string }>>`
    SELECT DISTINCT m2."userId" AS peer_id
    FROM "ChatMember" AS m1
    INNER JOIN "ChatMember" AS m2 ON m2."chatId" = m1."chatId"
    WHERE m1."userId" = ${userId} AND m2."userId" <> ${userId}
  `;
  return rows.map((r) => r.peer_id);
}

export async function userIdsInChatExcludingUser(
  chatId: string,
  excludeUserId: string,
): Promise<string[]> {
  const rows = await prisma.chatMember.findMany({
    where: { chatId, userId: { not: excludeUserId } },
    select: { userId: true },
  });
  return rows.map((r) => r.userId);
}
