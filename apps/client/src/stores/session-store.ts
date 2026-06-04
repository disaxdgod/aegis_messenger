import type { AuthResponseDTO, MeDTO } from "@aegis/shared";
import { API_PREFIX } from "@aegis/shared";
import { create } from "zustand";

import { isBackendEnabled } from "@/config/backend";
import {
  clearAuthTokensFromStorage,
  loadAuthTokensFromStorage,
  loadMeSnapshot,
  persistAuthTokens,
  persistMeSnapshot,
} from "@/lib/auth-tokens-storage";
import { useAuthFormStore } from "@/stores/auth-form-store";
import {
  type PresenceStatus as ProfilePresence,
  useProfileStore,
} from "@/stores/profile-store";

export type SignInOptions = {
  message?: string | null;
  /** После регистрации — модальное окно «Расскажите о себе». */
  openOnboarding?: boolean;
};

function mapPresence(p: MeDTO["presence"]): ProfilePresence {
  return p === "dnd"
    ?
      "dnd"
    :
    p === "invisible"
      ? "invisible"
      : "online";
}

function isMeDTO(value: unknown): value is MeDTO {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof (v as { id?: unknown }).id === "string" &&
    typeof v.username === "string"
    &&
    typeof v.email === "string"
    &&
    typeof v.firstName === "string"
    &&
    typeof v.lastName === "string"
    &&
    typeof v.presence === "string"
  );
}

function applyMeToProfile(me: MeDTO): void {
  const p = useProfileStore.getState();
  p.setUserId(me.id);
  p.setUsername(me.username);
  p.setFirstName(me.firstName);
  p.setLastName(me.lastName);
  p.setStatus(me.status);
  p.setBirthDate(me.birthDate ?? "");
  p.setPresence(mapPresence(me.presence));
}

async function revokeSessionOnServer(refreshToken: string | null): Promise<void> {
  if (!isBackendEnabled()) return;
  if (!refreshToken?.trim()) return;
  try {
    await fetch(`${API_PREFIX}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ refreshToken: refreshToken.trim() }),
    });
  } catch {
    /* сеть уже не мешает выходу с клиента */
  }
}

type SessionState = {
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  authSuccessMessage: string | null;
  showOnboarding: boolean;

  /** Восстановить сессию из localStorage после перезагрузки. */
  hydrateFromStorage: () => void;
  establishSession: (dto: AuthResponseDTO, options?: SignInOptions) => void;
  dismissAuthSuccess: () => void;
  completeOnboarding: () => void;
  signOut: () => Promise<void>;
};

export const useSessionStore = create<SessionState>((set, get) => ({
  isAuthenticated: false,
  accessToken: null,
  refreshToken: null,
  authSuccessMessage: null,
  showOnboarding: false,

  hydrateFromStorage: () => {
    const { accessToken, refreshToken } = loadAuthTokensFromStorage();
    if (!accessToken) return;
    const snapshot = loadMeSnapshot();
    if (isMeDTO(snapshot)) {
      applyMeToProfile(snapshot);
    }
    set({
      isAuthenticated: true,
      accessToken,
      refreshToken,
    });
  },

  establishSession: (dto, options) => {
    const access = dto.token;
    const refresh = dto.refreshToken?.trim() ?? "";
    persistAuthTokens(access, refresh);
    persistMeSnapshot(dto.me);
    applyMeToProfile(dto.me);
    set({
      isAuthenticated: true,
      accessToken: access,
      refreshToken: refresh.length > 0 ? refresh : null,
      authSuccessMessage: options?.message ?? null,
      showOnboarding: options?.openOnboarding ?? false,
    });
  },

  dismissAuthSuccess: () => set({ authSuccessMessage: null }),
  completeOnboarding: () => set({ showOnboarding: false }),

  signOut: async () => {
    await revokeSessionOnServer(get().refreshToken);
    clearAuthTokensFromStorage();
    useAuthFormStore.getState().clearSensitive();
    useProfileStore.getState().reset();
    set({
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      authSuccessMessage: null,
      showOnboarding: false,
    });
  },
}));

if (typeof window !== "undefined") {
  try {
    useSessionStore.getState().hydrateFromStorage();
  } catch {
    /* некорректный localStorage / приватный режим */
  }
}
