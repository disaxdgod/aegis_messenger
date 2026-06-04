import "dotenv/config";

import fs from "node:fs";
import http from "node:http";
import https from "node:https";

import {
  API_PREFIX,
  APP_NAME,
} from "@aegis/shared";
import type { Application as ExpressApplication } from "express";
import { Server as SocketIOServer } from "socket.io";

import { createExpressApp } from "./create-app.js";
import { env } from "./config/env.js";
import { setSocketIo } from "./io-holder.js";
import { prisma } from "./lib/prisma.js";
import { attachSocket } from "./socket/register-socket.js";

function createHttpLikeServer(
  app: ExpressApplication,
): http.Server | https.Server {
  const keyPath = process.env["HTTPS_KEY_PATH"]?.trim();
  const certPath = process.env["HTTPS_CERT_PATH"]?.trim();
  if (keyPath && certPath) {
    const key = fs.readFileSync(keyPath);
    const cert = fs.readFileSync(certPath);
    return https.createServer({ key, cert }, app);
  }
  return http.createServer(app);
}

async function bootstrap(): Promise<void> {
  const startedAt = Date.now();

  const app = createExpressApp(startedAt);
  const PORT = env.port;

  const httpServer = createHttpLikeServer(app);

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.isProduction ? env.clientOrigin : true,
      credentials: true,
    },
  });

  setSocketIo(io);
  attachSocket(io);

  try {
    await prisma.$connect();
  } catch (e) {
    console.error(
      `[${APP_NAME}] Нет соединения с PostgreSQL.\n` +
        "Поднимите БД (`pnpm compose:postgres`), проверьте DATABASE_URL,\n" +
        "при первом разе: `pnpm db:migrate` или для dev — `pnpm db:push`.",
    );
    console.error(e);
    process.exit(1);
  }

  httpServer.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `\n[${APP_NAME}] Порт ${PORT} уже занят (EADDRINUSE).\n` +
          `Освободите порт или задайте PORT в .env.`,
      );
    } else {
      console.error(err);
    }
    process.exit(1);
  });

  httpServer.listen(PORT, () => {
    const scheme =
      process.env["HTTPS_KEY_PATH"]?.trim() &&
      process.env["HTTPS_CERT_PATH"]?.trim() ?
        "https"
      : "http";
    console.log(
      `[${APP_NAME}] ${scheme}://localhost:${PORT} · REST ${API_PREFIX} · WebSocket тот же хост`,
    );
  });
}

bootstrap().catch((e) => {
  console.error(e);
  process.exit(1);
});
