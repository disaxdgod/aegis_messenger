import "dotenv/config";
import {
  API_HEALTH_PATH,
  API_VERSION,
  APP_NAME,
  SOCKET_SERVER_EVENTS,
} from "@aegis/shared";
import type { HealthResponseDTO } from "@aegis/shared";
import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { prisma } from "./lib/prisma.js";

const startedAt = Date.now();

const PORT = Number(process.env.PORT) || 3000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";
const isProduction = process.env.NODE_ENV === "production";

const app = express();
app.use(
  cors({
    origin: isProduction ? CLIENT_ORIGIN : true,
    credentials: true,
  }),
);
app.use(express.json({ limit: "256kb" }));

app.get(API_HEALTH_PATH, async (_req, res) => {
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

const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: { origin: isProduction ? CLIENT_ORIGIN : true },
});

io.on("connection", (socket) => {
  socket.emit(SOCKET_SERVER_EVENTS.hello, {
    app: APP_NAME,
    apiVersion: API_VERSION,
    at: new Date().toISOString(),
  });
});

httpServer.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `\n[${APP_NAME}] Порт ${PORT} уже занят (EADDRINUSE).\n` +
        `Освободите порт или запустите сервер на другом:\n` +
        `  PowerShell — кто слушает порт:\n` +
        `    Get-NetTCPConnection -LocalPort ${PORT} -ErrorAction SilentlyContinue | Select-Object LocalAddress,LocalPort,OwningProcess\n` +
        `  Остановить процесс (подставьте PID из колонки OwningProcess):\n` +
        `    Stop-Process -Id <PID> -Force\n` +
        `  Либо другой порт для сервера и прокси Vite:\n` +
        `    $env:PORT="3001"; pnpm --filter @aegis/server dev\n` +
        `    В apps/client скопируйте .env.development.example → .env.development и укажите VITE_API_TARGET=http://127.0.0.1:3001\n`,
    );
  } else {
    console.error(err);
  }
  process.exit(1);
});

httpServer.listen(PORT, () => {
  console.log(
    `[${APP_NAME}] HTTP + WebSocket: http://localhost:${PORT} (CORS: ${CLIENT_ORIGIN})`,
  );
});
