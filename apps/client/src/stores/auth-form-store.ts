import { create } from "zustand";

export type AuthMode = "sign-in" | "sign-up";

export type AuthField = "login" | "email" | "password" | "confirmPassword";

export type AuthFieldErrors = Partial<Record<AuthField | "banner", string>>;

type AuthFormState = {
  mode: AuthMode;
  login: string;
  email: string;
  password: string;
  confirmPassword: string;
  showPassword: boolean;
  showConfirmPassword: boolean;
  errors: AuthFieldErrors;
  setMode: (mode: AuthMode) => void;
  setLogin: (v: string) => void;
  setEmail: (v: string) => void;
  setPassword: (v: string) => void;
  setConfirmPassword: (v: string) => void;
  toggleShowPassword: () => void;
  toggleShowConfirmPassword: () => void;
  /** Полная замена ошибок (валидация формы или сброс). */
  setErrors: (errors: AuthFieldErrors) => void;
  /** Сообщение поверх формы (OAuth и т.п.), не затирает полевые ошибки. */
  setBanner: (message: string | null) => void;
  clearFieldError: (field: AuthField | "banner") => void;
  clearAllErrors: () => void;
  /** Пароли и ошибки — при выходе, чтобы секреты не оставались в памяти Zustand. */
  clearSensitive: () => void;
};

export const useAuthFormStore = create<AuthFormState>((set) => ({
  mode: "sign-up",
  login: "",
  email: "",
  password: "",
  confirmPassword: "",
  showPassword: false,
  showConfirmPassword: false,
  errors: {},
  setMode: (mode) => set({ mode, errors: {} }),
  setLogin: (login) => set({ login }),
  setEmail: (email) => set({ email }),
  setPassword: (password) => set({ password }),
  setConfirmPassword: (confirmPassword) => set({ confirmPassword }),
  toggleShowPassword: () => set((s) => ({ showPassword: !s.showPassword })),
  toggleShowConfirmPassword: () =>
    set((s) => ({ showConfirmPassword: !s.showConfirmPassword })),
  setErrors: (errors) => set({ errors }),
  setBanner: (message) =>
    set((s) => {
      if (!message) {
        const next = { ...s.errors };
        delete next.banner;
        return { errors: next };
      }
      return { errors: { ...s.errors, banner: message } };
    }),
  clearFieldError: (field) =>
    set((s) => {
      const next = { ...s.errors };
      delete next[field];
      return { errors: next };
    }),
  clearAllErrors: () => set({ errors: {} }),
  clearSensitive: () =>
    set({
      password: "",
      confirmPassword: "",
      showPassword: false,
      showConfirmPassword: false,
      errors: {},
    }),
}));
