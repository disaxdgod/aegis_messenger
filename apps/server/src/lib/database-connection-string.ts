/** Единственный источник дефолтного локального URL (docker-compose Postgres). */
export const DEFAULT_DATABASE_URL =
  "postgresql://postgres:postgres@127.0.0.1:5433/aegis?schema=public";

/**
 * Строка для Prisma/pg из `DATABASE_URL`: убираем BOM и внешние кавычки из `.env`
 * на Windows и отбрасываем заведомо неверные значения.
 */
export function resolveDatabaseConnectionString(): string {
  let raw = process.env["DATABASE_URL"];
  if (raw === undefined || raw === "") {
    return DEFAULT_DATABASE_URL;
  }
  raw = raw.replace(/^\uFEFF/, "").trim();
  while (raw.length >= 2) {
    const dq = raw.startsWith('"') && raw.endsWith('"');
    const sq = raw.startsWith("'") && raw.endsWith("'");
    if (!dq && !sq) break;
    raw = raw.slice(1, -1).trim();
  }
  if (raw.startsWith("postgresql:") || raw.startsWith("postgres:")) {
    return raw;
  }
  return DEFAULT_DATABASE_URL;
}
