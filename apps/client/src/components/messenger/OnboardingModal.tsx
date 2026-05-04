import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfileStore } from "@/stores/profile-store";
import { useSessionStore } from "@/stores/session-store";
import { cn } from "@/lib/utils";
import type { FormEvent } from "react";

const fieldClass =
  "h-11 rounded-[12px] border border-white/[0.1] bg-[#242424] text-[0.9375rem] text-white placeholder:text-neutral-500 shadow-none transition-colors hover:border-white/16 focus-visible:border-white/20 focus-visible:ring-1 focus-visible:ring-white/15";

const pillPrimary =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-white px-6 text-sm font-medium text-black transition-colors hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1a1a]";

const pillSecondary =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-white/[0.14] bg-[#242424] px-6 text-sm font-medium text-white transition-colors hover:border-white/22 hover:bg-[#2c2c2c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1a1a]";

export function OnboardingModal() {
  const show = useSessionStore((s) => s.showOnboarding);
  const completeOnboarding = useSessionStore((s) => s.completeOnboarding);
  const firstName = useProfileStore((s) => s.firstName);
  const lastName = useProfileStore((s) => s.lastName);
  const status = useProfileStore((s) => s.status);
  const birthDate = useProfileStore((s) => s.birthDate);
  const setFirstName = useProfileStore((s) => s.setFirstName);
  const setLastName = useProfileStore((s) => s.setLastName);
  const setStatus = useProfileStore((s) => s.setStatus);
  const setBirthDate = useProfileStore((s) => s.setBirthDate);

  if (!show) {
    return null;
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    completeOnboarding();
  }

  function handleSkip() {
    completeOnboarding();
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div
        className={cn(
          "w-full max-w-[440px] rounded-[22px] border border-white/[0.08] bg-[#1a1a1a] p-6 shadow-2xl sm:p-8",
        )}
      >
        <h2
          id="onboarding-title"
          className="text-xl font-semibold tracking-tight text-white"
        >
          Расскажите о себе
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-500">
          Эти данные можно изменить позже в профиле. Поля необязательны.
        </p>

        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ob-first" className="text-sm font-medium text-white">
              Имя
            </Label>
            <Input
              id="ob-first"
              value={firstName}
              onChange={(ev) => setFirstName(ev.target.value)}
              className={fieldClass}
              placeholder="Иван"
              autoComplete="given-name"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ob-last" className="text-sm font-medium text-white">
              Фамилия
            </Label>
            <Input
              id="ob-last"
              value={lastName}
              onChange={(ev) => setLastName(ev.target.value)}
              className={fieldClass}
              placeholder="Иванов"
              autoComplete="family-name"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ob-status" className="text-sm font-medium text-white">
              Статус
            </Label>
            <Input
              id="ob-status"
              value={status}
              onChange={(ev) => setStatus(ev.target.value)}
              className={fieldClass}
              placeholder="Коротко о себе"
              autoComplete="off"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ob-birth" className="text-sm font-medium text-white">
              Дата рождения
            </Label>
            <Input
              id="ob-birth"
              type="date"
              value={birthDate}
              onChange={(ev) => setBirthDate(ev.target.value)}
              className={cn(fieldClass, "scheme-dark")}
            />
          </div>

          <div className="mt-3 flex flex-col gap-2.5 sm:flex-row sm:justify-end sm:gap-3">
            <button
              type="button"
              className={cn(pillSecondary, "w-full sm:w-auto sm:min-w-[132px]")}
              onClick={handleSkip}
            >
              Пропустить
            </button>
            <button
              type="submit"
              className={cn(pillPrimary, "w-full sm:w-auto sm:min-w-[140px]")}
            >
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
