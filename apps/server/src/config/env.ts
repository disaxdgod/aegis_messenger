import path from "node:path";
import { fileURLToPath } from "node:url";

import { resolveDatabaseConnectionString } from "../lib/database-connection-string.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const defaultUploads = path.join(__dirname, "..", "..", "uploads");

function resolveTrustProxy(): number {
  const raw = process.env.TRUST_PROXY?.trim();
  if (raw) {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n)) return Math.max(0, n);
  }
  return process.env.NODE_ENV === "production" ? 1 : 0;
}

export const env = {
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
  port: Number(process.env.PORT) || 3000,
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  /** Хоп reverse-proxy для Express `trust proxy` (за nginx / ALB). */
  trustProxy: resolveTrustProxy(),
  get databaseUrl() {
    return resolveDatabaseConnectionString();
  },
  jwtSecret:
    process.env.JWT_SECRET?.trim() ||
    resolveJwtSecretFallback(),
  jwtExpiresIn:
    process.env.JWT_EXPIRES_IN?.trim()?.length ?
      process.env.JWT_EXPIRES_IN.trim()
    : process.env.NODE_ENV === "production" ? "15m"
    : "7d",
  refreshTokenDays: Math.max(
    1,
    Number(process.env.REFRESH_TOKEN_DAYS ?? 30),
  ),
  uploadsDir: process.env.UPLOAD_DIR?.trim() || defaultUploads,
};

function resolveJwtSecretFallback(): string {
  if (process.env.NODE_ENV === "production") {
    console.error("[aegis-server] JWT_SECRET is required in production");
    process.exit(1);
  }
  console.warn("[aegis-server] JWT_SECRET unset — using dev default (unsafe)");
  return "dev-jwt-secret-change-me";
}
