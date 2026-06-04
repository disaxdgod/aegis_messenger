import { prisma } from "../lib/prisma.js";

/**
 * Если `chatId` — DIRECT с ровно двумя участниками и среди них `requesterId`,
 * возвращает второго пользователя (собеседника).
 */
export async function resolveDirectDmPeerUserId(
  chatId: string,
  requesterId: string,
): Promise<string | null> {
  const chat = await prisma.chat.findFirst({
    where: { id: chatId, type: "DIRECT" },
    select: {
      members: { select: { userId: true } },
    },
  });
  if (!chat || chat.members.length !== 2) return null;
  const ids = chat.members.map((m) => m.userId);
  if (!ids.includes(requesterId)) return null;
  const peer = ids.find((id) => id !== requesterId);
  return typeof peer === "string" ? peer : null;
}
