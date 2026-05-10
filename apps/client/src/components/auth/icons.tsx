import type { SVGProps } from "react";

export function GoogleGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={24}
      height={24}
      aria-hidden
      {...props}
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function YandexGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={24}
      height={24}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      {...props}
    >
      <rect width="24" height="24" rx="12" fill="#FF0000" />
      <path
        d="M13.4624 7.60621H12.5336C10.8307 7.60621 9.93631 8.46063 9.93631 9.72504C9.93631 11.1604 10.5555 11.8268 11.8284 12.6812L12.8775 13.3818L9.85032 17.8758H7.59703L10.3147 13.8602C8.74946 12.7495 7.87221 11.673 7.87221 9.84466C7.87221 7.555 9.47187 6 12.5163 6H15.5436V17.8758H13.4624V7.60621Z"
        fill="white"
      />
    </svg>
  );
}

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
