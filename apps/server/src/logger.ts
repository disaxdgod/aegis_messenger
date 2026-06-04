import pino from "pino";

/** Структурные логи (stdout JSON в проде; удобно для journald / сборщика). */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
});
