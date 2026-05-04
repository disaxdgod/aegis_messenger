import { useState } from "react";

/**
 * Правая колонка в стиле референса: тёмное полотно + мягкие «орбы» и лёгкий слой изображения.
 */
export function AuthVisual() {
  const [imgHidden, setImgHidden] = useState(false);

  return (
    <div
      className="relative isolate mx-auto hidden aspect-[561/772] w-full max-w-[520px] overflow-hidden rounded-[28px] bg-[#0a0a0c] shadow-inner shadow-black/50 md:block md:max-h-[min(78vh,640px)] lg:max-h-[min(82vh,720px)]"
      aria-hidden
    >
      <div className="pointer-events-none absolute -left-[22%] top-[4%] h-[52%] w-[52%] rounded-full bg-white/[0.13] blur-[88px]" />
      <div className="pointer-events-none absolute right-[-8%] top-[28%] h-[42%] w-[42%] rounded-full bg-neutral-200/[0.09] blur-[76px]" />
      <div className="pointer-events-none absolute bottom-[-18%] left-[18%] h-[48%] w-[55%] rounded-full bg-white/[0.07] blur-[96px]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/35" />
      {!imgHidden ? (
        <img
          src="/auth-reference.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-[0.12] mix-blend-screen"
          loading="lazy"
          decoding="async"
          onError={() => setImgHidden(true)}
        />
      ) : null}
    </div>
  );
}
