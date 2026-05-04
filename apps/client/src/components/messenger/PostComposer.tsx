import { BannerDrawModal } from "@/components/messenger/BannerDrawModal";
import { EmojiMartModal } from "@/components/messenger/EmojiMartModal";
import { IconDesignTheme } from "@/components/messenger/design-theme-icons";
import { IconPaperclip, IconPoll, IconSmile } from "@/components/messenger/nav-icons";
import { PollCreateModal } from "@/components/messenger/PollCreateModal";
import { MarkdownEmojiText } from "@/components/messenger/MarkdownEmojiText";
import { createClientId } from "@/lib/create-client-id";
import { cn } from "@/lib/utils";
import type { PostMediaItem, PostPollData } from "@/stores/posts-store";
import { usePostsStore } from "@/stores/posts-store";
import { useProfileStore } from "@/stores/profile-store";
import { useEffect, useRef, useState, type CSSProperties } from "react";

type PostComposerProps = {
  className?: string;
  style?: CSSProperties;
};

export function PostComposer({ className, style }: PostComposerProps) {
  const avatarObjectUrl = useProfileStore((s) => s.avatarObjectUrl);
  const addPost = usePostsStore((s) => s.addPost);

  const [text, setText] = useState("");
  const [media, setMedia] = useState<PostMediaItem[]>([]);
  const [poll, setPoll] = useState<PostPollData | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [pollModalOpen, setPollModalOpen] = useState(false);
  const [sketchOpen, setSketchOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const draftMediaRef = useRef<PostMediaItem[]>([]);
  draftMediaRef.current = media;
  useEffect(() => {
    return () => {
      for (const m of draftMediaRef.current) {
        URL.revokeObjectURL(m.url);
      }
    };
  }, []);

  const canPublish = Boolean(text.trim()) || media.length > 0 || poll !== null;

  function removeMediaItem(id: string) {
    setMedia((prev) => {
      const item = prev.find((m) => m.id === id);
      if (item) URL.revokeObjectURL(item.url);
      return prev.filter((m) => m.id !== id);
    });
  }

  function onFilesSelected(files: FileList | null) {
    if (!files?.length) return;
    const next: PostMediaItem[] = [];
    for (const file of Array.from(files)) {
      const mime = file.type;
      let kind: "image" | "video" | null = null;
      if (mime.startsWith("image/")) kind = "image";
      else if (mime.startsWith("video/")) kind = "video";
      if (!kind) continue;
      next.push({ id: createClientId(), url: URL.createObjectURL(file), mime, kind });
    }
    if (next.length) setMedia((m) => [...m, ...next]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function insertEmoji(emoji: string) {
    const ta = textareaRef.current;
    if (!ta) {
      setText((t) => t + emoji);
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    setText((prev) => prev.slice(0, start) + emoji + prev.slice(end));
    const pos = start + emoji.length;
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(pos, pos);
    });
  }

  function onSketchComplete(blob: Blob) {
    const url = URL.createObjectURL(blob);
    setMedia((m) => [
      ...m,
      { id: createClientId(), url, mime: "image/png", kind: "image" as const },
    ]);
    setSketchOpen(false);
  }

  function publish() {
    if (!canPublish) return;
    addPost({ text: text.trim(), media, poll });
    setText("");
    setMedia([]);
    setPoll(null);
  }

  return (
    <>
      <BannerDrawModal
        open={sketchOpen}
        onClose={() => setSketchOpen(false)}
        onComplete={onSketchComplete}
      />
      <PollCreateModal
        open={pollModalOpen}
        onClose={() => setPollModalOpen(false)}
        onSubmit={(p) => setPoll(p)}
      />

      <EmojiMartModal
        open={emojiOpen}
        onClose={() => setEmojiOpen(false)}
        onPick={insertEmoji}
      />

      <div className={cn("rounded-2xl p-4 sm:p-5", className)} style={style}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="sr-only"
          aria-hidden
          tabIndex={-1}
          onChange={(e) => onFilesSelected(e.target.files)}
        />
        <div className="flex gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/[0.06] bg-[#1a1a1a] text-lg text-neutral-200">
            {avatarObjectUrl ? (
              <img src={avatarObjectUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span aria-hidden>💀</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <label htmlFor="composer" className="sr-only">
              Новый пост
            </label>
            <textarea
              ref={textareaRef}
              id="composer"
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && canPublish) {
                  e.preventDefault();
                  publish();
                }
              }}
              placeholder="Что нового?"
              className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-white outline-none placeholder:text-neutral-500"
            />

            {media.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {media.map((m) => (
                  <div
                    key={m.id}
                    className="relative h-20 w-20 overflow-hidden rounded-lg border border-white/[0.08] bg-black"
                  >
                    {m.kind === "video" ? (
                      <video src={m.url} className="h-full w-full object-cover" muted />
                    ) : (
                      <img src={m.url} alt="" className="h-full w-full object-cover" />
                    )}
                    <button
                      type="button"
                      className="absolute right-0.5 top-0.5 flex h-6 w-6 items-center justify-center rounded-md bg-black/70 text-sm text-white hover:bg-black/90"
                      aria-label="Убрать вложение"
                      onClick={() => removeMediaItem(m.id)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {poll && (
              <div className="mt-3 rounded-xl border border-white/[0.08] bg-[#1a1a1a] p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-white">
                      <MarkdownEmojiText text={poll.question} />
                    </p>
                    <p className="mt-1 text-neutral-500">{poll.options.length} вариантов</p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 text-neutral-400 hover:text-white"
                    onClick={() => setPoll(null)}
                  >
                    Убрать
                  </button>
                </div>
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
              <div className="flex items-center gap-0.5 text-neutral-500">
                <button
                  type="button"
                  className="rounded-lg p-2 transition-colors hover:bg-white/[0.06] hover:text-neutral-300"
                  aria-label="Прикрепить фото или видео"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <IconPaperclip className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className={cn(
                    "rounded-lg p-2 transition-colors hover:bg-white/[0.06] hover:text-neutral-300",
                    emojiOpen && "bg-white/[0.06] text-neutral-300",
                  )}
                  aria-label="Эмодзи"
                  aria-expanded={emojiOpen}
                  aria-haspopup="dialog"
                  onClick={() => setEmojiOpen(true)}
                >
                  <IconSmile className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className="rounded-lg p-2 transition-colors hover:bg-white/[0.06] hover:text-neutral-300"
                  aria-label="Нарисовать изображение для поста"
                  onClick={() => setSketchOpen(true)}
                >
                  <IconDesignTheme className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className="rounded-lg p-2 transition-colors hover:bg-white/[0.06] hover:text-neutral-300"
                  aria-label="Опрос"
                  onClick={() => setPollModalOpen(true)}
                >
                  <IconPoll className="h-5 w-5" />
                </button>
              </div>
              <button
                type="button"
                disabled={!canPublish}
                className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={publish}
              >
                Опубликовать
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
