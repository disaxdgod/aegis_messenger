import { AuthVisual } from "@/components/auth/AuthVisual";
import { EyeOffGlyph, EyeOpenGlyph } from "@/components/auth/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AuthFieldErrors } from "@/stores/auth-form-store";
import { useAuthFormStore } from "@/stores/auth-form-store";
import { useSessionStore } from "@/stores/session-store";
import { apiSignIn, apiSignUp, AuthApiError } from "@/lib/auth-api";
import {
  createStoredIdentityKeys,
  WebCryptoUnavailableError,
} from "@/lib/e2ee-identity-keys";
import { cn } from "@/lib/utils";
import type { FormEvent } from "react";
import { useState } from "react";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function validateUsernameSignup(raw: string): string | undefined {
  const u = raw.trim().toLowerCase();
  if (!u) return "Укажите логин";
  if (!/^[a-z0-9_]{3,32}$/.test(u)) {
    return "Логин: 3–32 символа, латиница, цифры и _.";
  }
  return undefined;
}

function validateSignInCredential(raw: string): string | undefined {
  const x = raw.trim();
  if (!x) return "Укажите логин или email";
  if (x.includes("@"))
    return isValidEmail(x) ? undefined : "Некорректный email";
  return validateUsernameSignup(x);
}

const authInputClass =
  "rounded-lg border-zinc-800/90 bg-[#1a1a1c] text-[0.9375rem] placeholder:text-neutral-500 ring-offset-[#1a1a1c] hover:border-zinc-700";

function PasswordToggle(props: {
  pressed: boolean;
  onClick: () => void;
  labelShow: string;
  labelHide: string;
}) {
  const { pressed, onClick, labelShow, labelHide } = props;
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={pressed ? labelHide : labelShow}
      onClick={onClick}
      className={cn(
        "absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-neutral-500",
        "transition-[transform,color,background-color] duration-200 ease-out",
        "motion-reduce:transition-none",
        "hover:bg-white/5 hover:text-neutral-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ds-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1a1c]",
        "active:scale-95 motion-reduce:active:scale-100",
        pressed && "text-neutral-200",
      )}
    >
      {pressed ? <EyeOffGlyph /> : <EyeOpenGlyph />}
    </button>
  );
}

export function AuthScreen() {
  const [submitBusy, setSubmitBusy] = useState(false);

  const mode = useAuthFormStore((s) => s.mode);
  const login = useAuthFormStore((s) => s.login);
  const email = useAuthFormStore((s) => s.email);
  const password = useAuthFormStore((s) => s.password);
  const confirmPassword = useAuthFormStore((s) => s.confirmPassword);
  const showPassword = useAuthFormStore((s) => s.showPassword);
  const showConfirmPassword = useAuthFormStore((s) => s.showConfirmPassword);
  const errors = useAuthFormStore((s) => s.errors);
  const setMode = useAuthFormStore((s) => s.setMode);
  const setLogin = useAuthFormStore((s) => s.setLogin);
  const setEmail = useAuthFormStore((s) => s.setEmail);
  const setPassword = useAuthFormStore((s) => s.setPassword);
  const setConfirmPassword = useAuthFormStore((s) => s.setConfirmPassword);
  const toggleShowPassword = useAuthFormStore((s) => s.toggleShowPassword);
  const toggleShowConfirmPassword = useAuthFormStore(
    (s) => s.toggleShowConfirmPassword,
  );
  const setErrors = useAuthFormStore((s) => s.setErrors);
  const setBanner = useAuthFormStore((s) => s.setBanner);
  const clearFieldError = useAuthFormStore((s) => s.clearFieldError);
  const clearAllErrors = useAuthFormStore((s) => s.clearAllErrors);
  const establishSession = useSessionStore((s) => s.establishSession);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    clearAllErrors();

    const next: AuthFieldErrors = {};

    if (mode === "sign-in") {
      const credErr = validateSignInCredential(login);
      if (credErr) next.login = credErr;
      if (!password) {
        next.password = "Укажите пароль";
      }
    } else {
      const userErr = validateUsernameSignup(login);
      if (userErr) next.login = userErr;
      if (!email.trim()) {
        next.email = "Укажите email";
      } else if (!isValidEmail(email)) {
        next.email = "Некорректный email";
      }
      if (!password) {
        next.password = "Укажите пароль";
      } else if (password.length < 8) {
        next.password = "Не менее 8 символов";
      }
      if (password !== confirmPassword) {
        next.confirmPassword = "Пароли не совпадают";
      }
    }

    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    setSubmitBusy(true);
    try {
      if (mode === "sign-up") {
        const uname = login.trim().toLowerCase();
        const { publicKey, publicKeyAlgo } = await createStoredIdentityKeys();
        const dto = await apiSignUp({
          username: uname,
          email: email.trim().toLowerCase(),
          password,
          publicKey,
          publicKeyAlgo,
        });
        establishSession(dto, {
          message: "Аккаунт создан. Добро пожаловать!",
          openOnboarding: true,
        });
      } else {
        const dto = await apiSignIn({
          login: login.trim(),
          password,
        });
        establishSession(dto, {
          message: "Добро пожаловать!",
          openOnboarding: false,
        });
      }
    } catch (err) {
      if (err instanceof WebCryptoUnavailableError) {
        setBanner(err.message);
      } else if (err instanceof AuthApiError) {
        const f = err.fields;
        const fieldErrors: AuthFieldErrors = {};
        if (f?.username) fieldErrors.login = f.username;
        if (f?.login) fieldErrors.login = f.login;
        if (f?.email) fieldErrors.email = f.email;
        if (f?.password) fieldErrors.password = f.password;
        if (Object.keys(fieldErrors).length > 0) setErrors(fieldErrors);
        setBanner(err.message);
      } else {
        const text =
          err instanceof Error ?
            err.message
          : "Не удалось связаться с сервером.";
        setBanner(text);
      }
    } finally {
      setSubmitBusy(false);
    }
  }

  return (
    <div
      className="flex min-h-dvh justify-center bg-black px-4 py-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] font-sans sm:px-6 sm:py-8"
      data-auth-screen
    >
      <div className="flex w-full max-w-[min(1200px,96vw)] flex-1 items-center justify-center min-[1700px]:max-w-[min(1080px,94vw)]">
        <div
          className={cn(
            "w-full border border-white/[0.06] bg-[#121212] shadow-2xl shadow-black/60",
            "px-6 py-8 sm:px-10 sm:py-10 md:px-12 md:py-11 lg:px-14 lg:py-12",
            "rounded-[32px] md:rounded-[40px]",
          )}
        >
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.92fr)] lg:gap-12 xl:gap-14 2xl:gap-12">
            <div className="mx-auto flex w-full max-w-[480px] flex-col gap-7 lg:mx-0 lg:max-w-[500px]">
              <header className="flex flex-col gap-2.5 text-center sm:text-left">
                <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-[1.65rem]">
                  {mode === "sign-up" ? "Создать аккаунт" : "Вход"}
                </h1>
                <p className="text-base font-normal leading-relaxed text-neutral-500">
                  {mode === "sign-up"
                    ? "Присоединяйтесь и начните пользоваться Aegis уже сегодня."
                    : "Войдите по логину и паролю, чтобы продолжить."}
                </p>
              </header>

              <form
                className="flex flex-col gap-10"
                onSubmit={handleSubmit}
                noValidate
              >
                {errors.banner ? (
                  <p
                    className="rounded-lg border border-red-500/30 bg-red-950/25 px-3 py-2 text-center text-sm text-red-300"
                    role="status"
                  >
                    {errors.banner}
                  </p>
                ) : null}

                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-1.5">
                    <Label
                      htmlFor="auth-login"
                      className="text-base font-medium text-white"
                    >
                      Логин
                    </Label>
                    <Input
                      id="auth-login"
                      name="login"
                      autoComplete="username"
                      placeholder="IvanIvanov"
                      value={login}
                      invalid={Boolean(errors.login)}
                      onChange={(ev) => {
                        clearFieldError("login");
                        setLogin(ev.target.value);
                      }}
                      className={cn(authInputClass, "pr-3")}
                      inputMode="text"
                      enterKeyHint="next"
                    />
                    {errors.login ? (
                      <p className="text-sm text-red-400" role="alert">
                        {errors.login}
                      </p>
                    ) : null}
                  </div>

                  {mode === "sign-up" ? (
                    <div className="flex flex-col gap-1.5">
                      <Label
                        htmlFor="auth-email"
                        className="text-base font-medium text-white"
                      >
                        Email
                      </Label>
                      <Input
                        id="auth-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        placeholder="example@mail.com"
                        value={email}
                        invalid={Boolean(errors.email)}
                        onChange={(ev) => {
                          clearFieldError("email");
                          setEmail(ev.target.value);
                        }}
                        className={cn(authInputClass, "pr-3")}
                        inputMode="email"
                        enterKeyHint="next"
                      />
                      {errors.email ? (
                        <p className="text-sm text-red-400" role="alert">
                          {errors.email}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-1.5">
                    <Label
                      htmlFor="auth-password"
                      className="text-base font-medium text-white"
                    >
                      Пароль
                    </Label>
                    <div className="relative">
                      <Input
                        id="auth-password"
                        name="password"
                        autoComplete={
                          mode === "sign-up"
                            ? "new-password"
                            : "current-password"
                        }
                        placeholder="••••••••"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        invalid={Boolean(errors.password)}
                        onChange={(ev) => {
                          clearFieldError("password");
                          setPassword(ev.target.value);
                        }}
                        className={cn(authInputClass, "pr-12")}
                        enterKeyHint={
                          mode === "sign-up" ? "next" : "go"
                        }
                      />
                      <PasswordToggle
                        pressed={showPassword}
                        onClick={toggleShowPassword}
                        labelShow="Показать пароль"
                        labelHide="Скрыть пароль"
                      />
                    </div>
                    {errors.password ? (
                      <p className="text-sm text-red-400" role="alert">
                        {errors.password}
                      </p>
                    ) : mode === "sign-up" ? (
                      <p className="text-sm text-neutral-500">
                        Не менее 8 символов
                      </p>
                    ) : null}
                  </div>

                  {mode === "sign-up" ? (
                    <div className="flex flex-col gap-1.5">
                      <Label
                        htmlFor="auth-confirm"
                        className="text-base font-medium text-white"
                      >
                        Подтвердите пароль
                      </Label>
                      <div className="relative">
                        <Input
                          id="auth-confirm"
                          name="confirmPassword"
                          autoComplete="new-password"
                          placeholder="••••••••"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          invalid={Boolean(errors.confirmPassword)}
                          onChange={(ev) => {
                            clearFieldError("confirmPassword");
                            setConfirmPassword(ev.target.value);
                          }}
                          className={cn(authInputClass, "pr-12")}
                          enterKeyHint="done"
                        />
                        <PasswordToggle
                          pressed={showConfirmPassword}
                          onClick={toggleShowConfirmPassword}
                          labelShow="Показать подтверждение пароля"
                          labelHide="Скрыть подтверждение пароля"
                        />
                      </div>
                      {errors.confirmPassword ? (
                        <p className="text-sm text-red-400" role="alert">
                          {errors.confirmPassword}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-col items-stretch gap-3">
                  <button
                    type="submit"
                    disabled={submitBusy}
                    className={cn(
                      "h-12 w-full min-h-12 rounded-[10px] bg-white text-lg font-normal text-black",
                      "outline outline-1 outline-offset-[-1px] outline-black/80",
                      "transition-[transform,background-color,box-shadow] duration-200 ease-out",
                      "hover:bg-neutral-100 hover:shadow-md",
                      "active:scale-[0.99] active:bg-neutral-200 motion-reduce:active:scale-100",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ds-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212]",
                      "touch-manipulation disabled:pointer-events-none disabled:opacity-45",
                    )}
                  >
                    {mode === "sign-up" ? "Зарегистрироваться" : "Войти"}
                  </button>
                  <p className="text-center text-base text-neutral-400">
                    {mode === "sign-up" ? (
                      <>
                        Уже есть аккаунт?{" "}
                        <button
                          type="button"
                          className="touch-manipulation text-white underline underline-offset-[3px] transition-colors duration-200 hover:text-neutral-200 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ds-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212]"
                          onClick={() => setMode("sign-in")}
                        >
                          Войти
                        </button>
                      </>
                    ) : (
                      <>
                        Нет аккаунта?{" "}
                        <button
                          type="button"
                          className="touch-manipulation text-white underline underline-offset-[3px] transition-colors duration-200 hover:text-neutral-200 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ds-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212]"
                          onClick={() => setMode("sign-up")}
                        >
                          Зарегистрироваться
                        </button>
                      </>
                    )}
                  </p>
                </div>
              </form>
            </div>

            <div className="hidden lg:flex lg:justify-end">
              <AuthVisual />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
