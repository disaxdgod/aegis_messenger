import { cn } from "@/lib/utils";
import type { PostPollData } from "@/stores/posts-store";
import { useEffect, useState } from "react";

type PollCreateModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (poll: PostPollData) => void;
};

export function PollCreateModal({
  open,
  onClose,
  onSubmit,
}: PollCreateModalProps) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  useEffect(() => {
    if (open) {
      setQuestion("");
      setOptions(["", ""]);
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
    onSubmit({ question: question.trim(), options: filled });
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
            className="mt-2 text-sm text-cyan-400/90 hover:text-cyan-300"
            onClick={addOption}
          >
            + Добавить вариант
          </button>
        ) : null}

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
