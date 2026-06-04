import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";
import { resolveDatabaseConnectionString } from "./src/lib/database-connection-string.js";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
/** Корень монорепозитория (`d:/aegis`), если `prisma.config.ts` лежит в `apps/server`. */
const monorepoRoot = path.resolve(rootDir, "..", "..");

// Сначала `.env` в корне репозитория, затем приоритет у `apps/server/.env`
// (pnpm `exec prisma db push` может иметь cwd в корне — иначе P1000 / «credentials not valid»).
dotenv.config({ path: path.join(monorepoRoot, ".env") });
dotenv.config({ path: path.join(rootDir, ".env"), override: true });
dotenv.config({ path: path.join(rootDir, ".env.local"), override: true });

export default defineConfig({
  schema: path.join(rootDir, "prisma", "schema.prisma"),
  migrations: {
    path: path.join(rootDir, "prisma", "migrations"),
  },
  datasource: {
    url: resolveDatabaseConnectionString(),
  },
});
