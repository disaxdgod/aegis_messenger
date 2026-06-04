const authBackgroundPhoto = new URL(
  "../../../../../design/background photo.png",
  import.meta.url,
).href;

/**
 * Правая колонка: фон из `design/background photo.png`.
 */
export function AuthVisual() {
  return (
    <div
      className="relative isolate mx-auto hidden aspect-[561/772] w-full max-w-[520px] overflow-hidden rounded-[28px] bg-[#0a0a0c] shadow-inner shadow-black/50 md:block md:max-h-[min(78vh,640px)] lg:max-h-[min(82vh,720px)]"
      aria-hidden
    >
      <img
        src={authBackgroundPhoto}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
        decoding="async"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/20" />
    </div>
  );
}
