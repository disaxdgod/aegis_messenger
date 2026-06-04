import type { ApiErrorDTO, ApiErrorCode } from "@aegis/shared";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { env } from "../config/env.js";
import { HttpError } from "../lib/http-error.js";
import { logger } from "../logger.js";

/** Единый JSON-ответ об ошибках для REST API. */
export function errorHandlerMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  logger.error(
    {
      err,
      reqId: req.requestId,
    },
    req.path,
  );

  const send = (
    status: number,
    code: ApiErrorCode,
    message: string,
    fields?: Record<string, string>,
  ) => {
    const errorBody: ApiErrorDTO["error"] = { code, message };
    if (fields && Object.keys(fields).length > 0) {
      errorBody.fields = fields;
    }
    const body: ApiErrorDTO = { error: errorBody };
    res.status(status).json(body);
  };

  if (err instanceof HttpError) {
    send(
      err.statusCode,
      err.apiCode ?? "BAD_REQUEST",
      err.message,
      err.fields,
    );
    return;
  }

  if (err instanceof jwt.JsonWebTokenError) {
    send(401, "UNAUTHORIZED", "Недействительный токен");
    return;
  }

  if (err instanceof jwt.TokenExpiredError) {
    send(401, "UNAUTHORIZED", "Токен истёк");
    return;
  }

  const detail = err instanceof Error ? err.message : undefined;
  send(
    500,
    "INTERNAL",
    env.isProduction ? "Внутренняя ошибка сервера" : (detail ?? "Ошибка"),
  );
}
