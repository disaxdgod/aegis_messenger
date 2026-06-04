import type {
  AuthResponseDTO,
  SignInRequestDTO,
  SignUpRequestDTO,
} from "@aegis/shared";
import type { User } from "@prisma/client";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";

import { HttpError } from "../lib/http-error.js";
import { apiPublicKeyAlgoToPrisma, prismaUserToMeDTO } from "../lib/mappers.js";
import { signAccessToken } from "../lib/jwt.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { prisma } from "../lib/prisma.js";
import {
  issueRefreshPair,
  refreshTtlSeconds,
  revokeAllRefreshTokens,
  revokeRefreshToken,
  rotateRefreshToken,
} from "./refresh-token.service.js";

function extractTokenTtlSeconds(token: string): number {
  const decoded = jwt.decode(token);
  if (
    !decoded ||
    typeof decoded !== "object" ||
    typeof decoded.exp !== "number"
  ) {
    return 7 * 24 * 60 * 60;
  }
  const nowSec = Math.floor(Date.now() / 1000);
  return Math.max(60, decoded.exp - nowSec);
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function validateSignup(input: SignUpRequestDTO): void {
  const u = normalizeUsername(input.username);
  const e = normalizeEmail(input.email);
  if (!/^[a-z0-9_]{3,32}$/.test(u)) {
    throw new HttpError(400, "Логин: 3–32 символа, латиница, цифры и _.", {
      apiCode: "VALIDATION",
      fields: {
        username:
          "Допускаются строчные латинские буквы, цифры и подчёркивание, длина 3–32.",
      },
    });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
    throw new HttpError(400, "Неверный формат email", {
      apiCode: "VALIDATION",
      fields: { email: "Укажите корректный email." },
    });
  }
  if (input.password.length < 8) {
    throw new HttpError(400, "Пароль минимум 8 символов", {
      apiCode: "VALIDATION",
      fields: { password: "Минимальная длина — 8 символов." },
    });
  }
  if (
    typeof input.publicKey !== "string" ||
    input.publicKey.trim().length < 32
  ) {
    throw new HttpError(
      400,
      'Неверный или слишком короткий publicKey для E2EE',
      {
        apiCode: "VALIDATION",
        fields: {
          publicKey: "Необходим публичный ключ клиента для шифрования.",
        },
      },
    );
  }
  if (input.publicKeyAlgo !== "ECDH-P256" && input.publicKeyAlgo !== "X25519") {
    throw new HttpError(400, 'Неверный publicKeyAlgo', {
      apiCode: "VALIDATION",
    });
  }
}

async function buildAuthResponse(user: User): Promise<AuthResponseDTO> {
  const token = signAccessToken(user.id, user.username);
  const { rawRefresh } = await issueRefreshPair(user.id);
  return {
    token,
    tokenType: "Bearer",
    expiresIn: extractTokenTtlSeconds(token),
    refreshToken: rawRefresh,
    refreshExpiresIn: refreshTtlSeconds(),
    me: prismaUserToMeDTO(user),
  };
}

export async function refreshTokensService(
  rawRefresh: string,
): Promise<AuthResponseDTO> {
  const trimmed = rawRefresh.trim();
  if (!trimmed) {
    throw new HttpError(400, "Нужен refreshToken", {
      apiCode: "VALIDATION",
    });
  }
  try {
    const rotated = await rotateRefreshToken(trimmed);
    const user = await prisma.user.findUnique({
      where: { id: rotated.userId },
    });
    if (!user) {
      throw new HttpError(
        401,
        "Пользователь не найден",
        { apiCode: "UNAUTHORIZED" },
      );
    }
    const token = signAccessToken(user.id, user.username);
    return {
      token,
      tokenType: "Bearer",
      expiresIn: extractTokenTtlSeconds(token),
      refreshToken: rotated.newRawRefresh,
      refreshExpiresIn: rotated.refreshExpiresIn,
      me: prismaUserToMeDTO(user),
    };
  } catch (e: unknown) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(
      401,
      "Сессия истекла или отозвана",
      { apiCode: "UNAUTHORIZED" },
    );
  }
}

export async function logoutSessionService(rawRefresh: string): Promise<void> {
  const trimmed = rawRefresh.trim();
  if (!trimmed) {
    throw new HttpError(400, "Нужен refreshToken", {
      apiCode: "VALIDATION",
    });
  }
  await revokeRefreshToken(trimmed);
}

export async function logoutAllSessionsService(userId: string): Promise<void> {
  await revokeAllRefreshTokens(userId);
}

export async function signUpService(
  input: SignUpRequestDTO,
): Promise<AuthResponseDTO> {
  validateSignup(input);

  const username = normalizeUsername(input.username);
  const email = normalizeEmail(input.email);

  try {
    const passwordHash = await hashPassword(input.password);
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        publicKey: input.publicKey.trim(),
        publicKeyAlgo: apiPublicKeyAlgoToPrisma(input.publicKeyAlgo),
        publicKeyAt: new Date(),
      },
    });
    return buildAuthResponse(user);
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      throw new HttpError(
        409,
        "Логин или email уже заняты.",
        {
          apiCode: "CONFLICT",
        },
      );
    }
    throw e;
  }
}

export async function signInService(
  input: SignInRequestDTO,
): Promise<AuthResponseDTO> {
  const loginRaw = input.login.trim();
  if (!loginRaw || !input.password) {
    throw new HttpError(400, "Укажите логин и пароль", {
      apiCode: "VALIDATION",
    });
  }

  const isEmailLike = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginRaw);

  let user;
  if (isEmailLike) {
    const emailNorm = normalizeEmail(loginRaw);
    user = await prisma.user.findUnique({
      where: { email: emailNorm },
    });
  } else {
    const handle = normalizeUsername(loginRaw);
    if (!/^[a-z0-9_]{3,32}$/.test(handle)) {
      throw new HttpError(
        400,
        "Логин: 3–32 символа, латиница, цифры и подчёркивание (или укажите email).",
        {
          apiCode: "VALIDATION",
          fields: {
            login:
              "Введите корректный email или логин (латиница, цифры, _, 3–32 символа).",
          },
        },
      );
    }
    user = await prisma.user.findUnique({
      where: { username: handle },
    });
  }

  if (!user) {
    throw new HttpError(401, "Неверная пара логин/пароль", {
      apiCode: "UNAUTHORIZED",
    });
  }

  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) {
    throw new HttpError(401, "Неверная пара логин/пароль", {
      apiCode: "UNAUTHORIZED",
    });
  }

  return buildAuthResponse(user);
}
