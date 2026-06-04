/**
 * Включён ли API/PostgreSQL/Socket.IO.
 * По умолчанию выключено — достаточно `pnpm dev` (только клиент).
 * Полный стек: `VITE_BACKEND_ENABLED=1` + `pnpm dev:full` + `pnpm compose:postgres`.
 */
export function isBackendEnabled(): boolean {
  const raw = import.meta.env.VITE_BACKEND_ENABLED?.trim().toLowerCase();
  if (raw === "1" || raw === "true" || raw === "yes" || raw === "on") {
    return true;
  }
  if (raw === "0" || raw === "false" || raw === "no" || raw === "off") {
    return false;
  }
  return false;
}
