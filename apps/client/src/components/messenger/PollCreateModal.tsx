import { cn } from "@/lib/utils";
import { createClientId } from "@/lib/create-client-id";
import type { PostPollData } from "@/stores/posts-store";
import { useEffect, useState } from "react";

type PollCreateModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (poll: PostPollData) => void;
};

type PollSettingCheckboxProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
};

function PollSettingCheckbox({
  checked,
  onChange,
  label,
}: PollSettingCheckboxProps) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 transition-colors hover:bg-white/[0.05]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span className="grid h-4 w-4 place-items-center rounded-[4px] border border-white/30 bg-[#1a1a1a] text-transparent transition-colors peer-checked:border-white peer-checked:bg-[#202020] peer-checked:text-white">
        <svg
          viewBox="0 0 16 16"
          className="h-3 w-3"
          aria-hidden
        >
          <path
            d="M3.5 8.2 6.4 11l6.1-6.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="text-sm text-neutral-200">{label}</span>
    </label>
  );
}

export function PollCreateModal({
  open,
  onClose,
  onSubmit,
}: PollCreateModalProps) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [anonymous, setAnonymous] = useState(false);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [allowVoteCancel, setAllowVoteCancel] = useState(true);
  const [limitedTime, setLimitedTime] = useState(false);
  const [durationHours, setDurationHours] = useState("24");

  useEffect(() => {
    if (open) {
      setQuestion("");
      setOptions(["", ""]);
      setAnonymous(false);
      setAllowMultiple(false);
      setAllowVoteCancel(true);
      setLimitedTime(false);
      setDurationHours("24");
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const filled = options.map((o) => o.trim()).filter(Boolean);
  const valid =
    question.trim().length > 0 && filled.length >= 2 && filled.length <= 5;

  function addOption() {
    if (options.length >= 5) {
      return;
    }
    setOptions((o) => [...o, ""]);
  }

  function setOption(i: number, v: string) {
    setOptions((prev) => prev.map((x, j) => (j === i ? v : x)));
  }

  function removeOption(i: number) {
    if (options.length <= 2) {
      return;
    }
    setOptions((prev) => prev.filter((_, j) => j !== i));
  }

  function handleSubmit() {
    if (!valid) {
      return;
    }
    onSubmit({
      question: question.trim(),
      anonymous,
      allowMultiple,
      allowVoteCancel,
      endsAt: limitedTime ? Date.now() + Number(durationHours) * 3600_000 : null,
      options: filled.map((text) => ({
        id: createClientId(),
        text,
        votes: [],
      })),
    });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="poll-create-title"
    >
      <div
        className={cn(
          "w-full max-w-[420px] rounded-2xl border border-white/[0.08] bg-[#1a1a1a] p-6 shadow-2xl",
        )}
      >
        <h2
          id="poll-create-title"
          className="text-lg font-semibold tracking-tight text-white"
        >
          Новый опрос
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Вопрос и от 2 до 5 вариантов ответа.
        </p>

        <label className="mt-5 block text-sm font-medium text-neutral-300">
          Вопрос
        </label>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#242424] px-3 py-2.5 text-[15px] text-white outline-none placeholder:text-neutral-600 focus-visible:border-white/20"
          placeholder="Задайте вопрос…"
          maxLength={200}
        />

        <p className="mt-4 text-sm font-medium text-neutral-300">Варианты</p>
        <div className="mt-2 flex flex-col gap-2">
          {options.map((opt, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={opt}
                onChange={(e) => setOption(i, e.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#242424] px-3 py-2 text-sm text-white outline-none focus-visible:border-white/20"
                placeholder={`Вариант ${i + 1}`}
                maxLength={120}
              />
              {options.length > 2 ? (
                <button
                  type="button"
                  className="shrink-0 rounded-lg px-2 text-neutral-500 hover:bg-white/10 hover:text-white"
                  aria-label="Удалить вариант"
                  onClick={() => removeOption(i)}
                >
                  ×
                </button>
              ) : null}
            </div>
          ))}
        </div>

        {options.length < 5 ? (
          <button
            type="button"
            className="mt-2 text-sm text-[var(--link-color)] hover:text-[var(--accent-hover)]"
            onClick={addOption}
          >
            + Добавить вариант
          </button>
        ) : null}

        <p className="mt-4 text-sm font-medium text-neutral-300">Настройки опроса</p>
        <div className="mt-2 space-y-2">
          <PollSettingCheckbox
            checked={anonymous}
            onChange={setAnonymous}
            label="Анонимный опрос"
          />
          <PollSettingCheckbox
            checked={allowMultiple}
            onChange={setAllowMultiple}
            label="Выбор нескольких вариантов"
          />
          <PollSettingCheckbox
            checked={!allowVoteCancel}
            onChange={(next) => setAllowVoteCancel(!next)}
            label="Переголосовать нельзя"
          />
          <PollSettingCheckbox
            checked={limitedTime}
            onChange={setLimitedTime}
            label="Ограниченное время голосования"
          />
          {limitedTime ? (
            <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
              <label className="block text-xs text-neutral-400">Длительность</label>
              <select
                value={durationHours}
                onChange={(e) => setDurationHours(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#242424] px-3 py-2 text-sm text-white outline-none focus-visible:border-white/20"
              >
                <option value="1">1 час</option>
                <option value="6">6 часов</option>
                <option value="12">12 часов</option>
                <option value="24">24 часа</option>
                <option value="48">2 дня</option>
                <option value="168">7 дней</option>
              </select>
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-neutral-300 hover:bg-white/5"
            onClick={onClose}
          >
            Отмена
          </button>
          <button
            type="button"
            disabled={!valid}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-40 hover:bg-neutral-200"
            onClick={handleSubmit}
          >
            Добавить в пост
          </button>
        </div>
      </div>
    </div>
  );
}
