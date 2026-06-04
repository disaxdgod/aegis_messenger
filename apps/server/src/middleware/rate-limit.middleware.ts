import type { RateLimitRequestHandler } from "express-rate-limit";
import rateLimit from "express-rate-limit";

import type { ApiErrorDTO } from "@aegis/shared";

/** Общий лимит запросов к `/api/**` за окно времени (кроме подпутей исключений). */
export function apiRateLimiter(windowMs?: number): RateLimitRequestHandler {
  const window = windowMs ?? 15 * 60 * 1000;
  return rateLimit({
    windowMs: window,
    limit: Number(process.env.RATE_LIMIT_GLOBAL_MAX ?? 400),
    legacyHeaders: false,
    standardHeaders: true,
    skip: (req) => req.path === "/health",
    handler: (_req, res, _next, opts) => {
      const body: ApiErrorDTO = {
        error: {
          code: "RATE_LIMIT",
          message: "Слишком много запросов, повторите позже.",
        },
      };
      res.status(opts.statusCode).json(body);
    },
  });
}

/** Более жёсткий лимит на `/api/auth/*` (пер IP). */
export function authBurstLimiter(): RateLimitRequestHandler {
  return rateLimit({
    windowMs: 60 * 1000,
    limit: Number(process.env.RATE_LIMIT_AUTH_PER_MIN ?? 30),
    legacyHeaders: false,
    standardHeaders: true,
    handler: (_req, res, _next, opts) => {
      const body: ApiErrorDTO = {
        error: {
          code: "RATE_LIMIT",
          message: "Слишком много попыток аутентификации.",
        },
      };
      res.status(opts.statusCode).json(body);
    },
  });
}
