import type { SVGProps } from "react";

const eyeStroke = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Пароль скрыт — показать (открытый глаз). */
export function EyeOpenGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={20}
      height={20}
      aria-hidden
      {...eyeStroke}
      {...props}
    >
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/** Пароль виден — скрыть (глаз с перечёркиванием). */
export function EyeOffGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={20}
      height={20}
      aria-hidden
      {...eyeStroke}
      {...props}
    >
      <path d="M3 3l18 18" />
      <path d="M10.73 5.08A10.3 10.3 0 0 1 12 5c6 0 10 7 10 7a18.5 18.5 0 0 1-5.06 5.97M6.53 6.53A9.77 9.77 0 0 0 2 12s4 7 10 7a9.9 9.9 0 0 0 5.39-1.61" />
      <path d="M9.88 9.88A3 3 0 1 0 14.12 14.12" />
    </svg>
  );
}
