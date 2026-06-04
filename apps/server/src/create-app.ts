import {
  API_PREFIX,
  API_VERSION,
  APP_NAME,
} from "@aegis/shared";
import type { ApiErrorDTO, HealthResponseDTO } from "@aegis/shared";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import helmet from "helmet";

import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";
import { errorHandlerMiddleware } from "./middleware/error-handler.js";
import { apiRateLimiter, authBurstLimiter } from "./middleware/rate-limit.middleware.js";
import { requestContextMiddleware } from "./middleware/request-context.js";
import { createAuthRouter } from "./routes/auth.router.js";
import { createChatsRouter } from "./routes/chats.router.js";
import { createUploadsRouter } from "./routes/uploads.router.js";
import { createUsersRouter } from "./routes/users.router.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** HTTP-приложение (REST + статика аватаров; SPA в проде). */
export function createExpressApp(startedAt: number): express.Application {
  const app = express();

  if (env.trustProxy > 0) {
    app.set("trust proxy", env.trustProxy);
  }

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: false,
    }),
  );
  app.use(requestContextMiddleware);

  fs.mkdirSync(path.join(env.uploadsDir, "avatars"), { recursive: true });
  fs.mkdirSync(path.join(env.uploadsDir, "msg-staging"), { recursive: true });

  app.use(
    cors({
      origin: env.isProduction ? env.clientOrigin : true,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "768kb" }));

  app.use(
    "/uploads/avatars",
    express.static(path.join(env.uploadsDir, "avatars")),
  );

  const apiRouter = express.Router();

  /** GET /health при монтировании на API_PREFIX совпадает с API_HEALTH_PATH. */
  apiRouter.get("/health", async (_req, res) => {
    let database: HealthResponseDTO["database"] = "down";
    try {
      await prisma.$queryRaw`SELECT 1`;
      database = "up";
    } catch {
      database = "down";
    }
    const body: HealthResponseDTO = {
      ok: true,
      app: APP_NAME,
      apiVersion: API_VERSION,
      database,
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    };
    res.json(body);
  });

  apiRouter.use(apiRateLimiter());
  apiRouter.use("/auth", authBurstLimiter(), createAuthRouter());
  apiRouter.use("/users", createUsersRouter());
  apiRouter.use("/chats", createChatsRouter());
  apiRouter.use("/uploads", createUploadsRouter());

  apiRouter.use((_req, res) => {
    const payload: ApiErrorDTO = {
      error: {
        code: "NOT_FOUND",
        message: "Маршрут не найден",
      },
    };
    res.status(404).json(payload);
  });

  app.use(API_PREFIX, apiRouter);

  app.use(errorHandlerMiddleware);

  if (env.isProduction) {
    const clientDist =
      process.env.CLIENT_DIST_PATH?.trim() ||
      path.join(__dirname, "..", "..", "..", "apps", "client", "dist");
    app.use(express.static(clientDist));
    app.get(/^(?!\/api\/)(?!\/uploads\/).*$/, (_req, res) => {
      res.sendFile(path.join(clientDist, "index.html"));
    });
  }

  return app;
}
