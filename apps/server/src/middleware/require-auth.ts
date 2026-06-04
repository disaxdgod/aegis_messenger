import type { NextFunction, Request, Response } from "express";

import { HttpError } from "../lib/http-error.js";
import { verifyAccessToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";

/** Bearer JWT обязательно; задаёт `req.userId`, `req.authUser`. */
export async function requireAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const hdrRaw = req.headers.authorization;
    if (!hdrRaw?.startsWith("Bearer ")) {
      throw new HttpError(401, 'Ожидался заголовок Authorization: Bearer <token>', {
        apiCode: "UNAUTHORIZED",
      });
    }
    const token = hdrRaw.slice("Bearer ".length).trim();
    if (!token) {
      throw new HttpError(
        401,
        'Пустой токен',
        { apiCode: "UNAUTHORIZED" },
      );
    }

    const claims = verifyAccessToken(token);
    const user = await prisma.user.findUnique({ where: { id: claims.sub } });
    if (!user) {
      throw new HttpError(401, 'Пользователь не найден', {
        apiCode: "UNAUTHORIZED",
      });
    }

    req.userId = claims.sub;
    req.authUser = user;
    next();
  } catch (e) {
    next(e);
  }
}
