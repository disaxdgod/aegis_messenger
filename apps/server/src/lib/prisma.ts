import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** Корень пакета `apps/server` (работает и из `src`, и из `dist`). */
function serverRootDir(): string {
  return path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
}

/** Путь к файлу SQLite; должен совпадать с `datasource.url` в `prisma.config.ts` (по умолчанию `file:./dev.db` → `dev.db` в корне пакета). */
function resolveSqliteFilePath(): string {
  const root = serverRootDir();
  const defaultPath = path.join(root, "dev.db");
  const raw = process.env["DATABASE_URL"]?.trim();
  if (!raw || raw.startsWith("postgresql:") || raw.startsWith("postgres:")) {
    return defaultPath;
  }
  if (!raw.startsWith("file:")) {
    return defaultPath;
  }
  try {
    const base = pathToFileURL(path.join(root, "package.json")).href;
    return fileURLToPath(new URL(raw, base));
  } catch {
    return defaultPath;
  }
}

function createPrismaClient(): PrismaClient {
  const dbPath = resolveSqliteFilePath();
  const adapter = new PrismaBetterSqlite3({ url: dbPath });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
