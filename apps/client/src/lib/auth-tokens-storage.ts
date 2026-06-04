import type { MeDTO } from "@aegis/shared";

/** Ключи localStorage для сессии (не использовать с XSS). */
export const STORAGE_ACCESS_TOKEN = "aegis:accessToken";
export const STORAGE_REFRESH_TOKEN = "aegis:refreshToken";
/** Кэш `me` после логина, чтобы после F5 восстановить профиль без лишнего запроса. */
export const STORAGE_ME_SNAPSHOT = "aegis:meSnapshot";

export function persistAuthTokens(access: string, refresh: string): void {
  localStorage.setItem(STORAGE_ACCESS_TOKEN, access);
  if (refresh.trim()) {
    localStorage.setItem(STORAGE_REFRESH_TOKEN, refresh);
  } else {
    localStorage.removeItem(STORAGE_REFRESH_TOKEN);
  }
}

export function persistMeSnapshot(me: MeDTO): void {
  try {
    localStorage.setItem(STORAGE_ME_SNAPSHOT, JSON.stringify(me));
  } catch {
    localStorage.removeItem(STORAGE_ME_SNAPSHOT);
  }
}

export function loadMeSnapshot(): unknown {
  try {
    const raw = localStorage.getItem(STORAGE_ME_SNAPSHOT);
    if (!raw) return undefined;
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

export function loadAuthTokensFromStorage(): {
  accessToken: string | null;
  refreshToken: string | null;
} {
  return {
    accessToken: localStorage.getItem(STORAGE_ACCESS_TOKEN),
    refreshToken: localStorage.getItem(STORAGE_REFRESH_TOKEN),
  };
}

export function clearAuthTokensFromStorage(): void {
  localStorage.removeItem(STORAGE_ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_REFRESH_TOKEN);
  localStorage.removeItem(STORAGE_ME_SNAPSHOT);
}
