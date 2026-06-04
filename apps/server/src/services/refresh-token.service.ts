import { prisma } from "../lib/prisma.js";
import { hashRefreshToken, opaqueRefreshToken } from "../lib/refresh-token-crypto.js";
import { env } from "../config/env.js";

function refreshTtlSeconds(): number {
  return Math.round(env.refreshTokenDays * 24 * 60 * 60);
}

export async function issueRefreshPair(userId: string): Promise<{
  rawRefresh: string;
  expiresAt: Date;
}> {
  const rawRefresh = opaqueRefreshToken();
  const tokenHash = hashRefreshToken(rawRefresh);
  const expiresAt = new Date(Date.now() + refreshTtlSeconds() * 1000);
  await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt },
  });
  return { rawRefresh, expiresAt };
}

export async function rotateRefreshToken(rawRefresh: string): Promise<{
  userId: string;
  newRawRefresh: string;
  refreshExpiresIn: number;
}> {
  const tokenHash = hashRefreshToken(rawRefresh);
  const row = await prisma.refreshToken.findUnique({
    where: { tokenHash },
  });
  if (!row || row.expiresAt.getTime() <= Date.now()) {
    throw new Error("REFRESH_INVALID");
  }
  const newRaw = opaqueRefreshToken();
  const newHash = hashRefreshToken(newRaw);
  const expiresAt = new Date(Date.now() + refreshTtlSeconds() * 1000);
  await prisma.$transaction([
    prisma.refreshToken.delete({ where: { id: row.id } }),
    prisma.refreshToken.create({
      data: { userId: row.userId, tokenHash: newHash, expiresAt },
    }),
  ]);
  return {
    userId: row.userId,
    newRawRefresh: newRaw,
    refreshExpiresIn: refreshTtlSeconds(),
  };
}

export async function revokeRefreshToken(rawRefresh: string): Promise<void> {
  const tokenHash = hashRefreshToken(rawRefresh);
  await prisma.refreshToken.deleteMany({ where: { tokenHash } });
}

export async function revokeAllRefreshTokens(userId: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { userId } });
}

export { refreshTtlSeconds };
