import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "prisma/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

function resolveDatabaseUrl(): string {
  const raw = process.env["DATABASE_URL"]?.trim();
  const fallback = "file:./dev.db";
  if (!raw) {
    return fallback;
  }
  if (
    raw.startsWith("file:") ||
    raw.startsWith("postgresql:") ||
    raw.startsWith("postgres:")
  ) {
    return raw;
  }
  // Игнорируем невалидные/чужие значения из окружения (иначе Prisma падает на db push).
  return fallback;
}

export default defineConfig({
  schema: path.join(rootDir, "prisma", "schema.prisma"),
  migrations: {
    path: path.join(rootDir, "prisma", "migrations"),
  },
  datasource: {
    url: resolveDatabaseUrl(),
  },
});
