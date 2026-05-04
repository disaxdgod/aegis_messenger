import { useAuthFormStore } from "@/stores/auth-form-store";
import { useProfileStore } from "@/stores/profile-store";
import { create } from "zustand";

export type SignInOptions = {
  message?: string | null;
  /** После регистрации — модальное окно «Расскажите о себе». */
  openOnboarding?: boolean;
};

type SessionState = {
  isAuthenticated: boolean;
  authSuccessMessage: string | null;
  showOnboarding: boolean;
  signIn: (options?: SignInOptions) => void;
  dismissAuthSuccess: () => void;
  completeOnboarding: () => void;
  signOut: () => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  isAuthenticated: false,
  authSuccessMessage: null,
  showOnboarding: false,
  signIn: (options) =>
    set({
      isAuthenticated: true,
      authSuccessMessage: options?.message ?? null,
      showOnboarding: options?.openOnboarding ?? false,
    }),
  dismissAuthSuccess: () => set({ authSuccessMessage: null }),
  completeOnboarding: () => set({ showOnboarding: false }),
  signOut: () => {
    useAuthFormStore.getState().clearSensitive();
    useProfileStore.getState().reset();
    set({
      isAuthenticated: false,
      authSuccessMessage: null,
      showOnboarding: false,
    });
  },
}));
