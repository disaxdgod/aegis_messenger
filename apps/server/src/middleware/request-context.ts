import { randomUUID } from "node:crypto";

import type { NextFunction, Request, Response } from "express";

import { logger } from "../logger.js";

export function requestContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const idSource = typeof req.headers["x-request-id"] === "string"
    ? req.headers["x-request-id"].slice(0, 64).trim()
    : "";
  req.requestId = idSource || randomUUID();
  res.setHeader("X-Request-Id", req.requestId);

  const start = Date.now();
  const logRequest = (): void => {
    const ms = Date.now() - start;
    logger.info(
      {
        reqId: req.requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        ms,
      },
      "request",
    );
  };
  res.on("finish", logRequest);

  next();
}
