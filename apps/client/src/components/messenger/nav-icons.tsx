import type { ReactNode, SVGProps } from "react";

function Icon(props: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  const { children, className, ...rest } = props;
  return (
    <svg
      viewBox="0 0 24 24"
      width={22}
      height={22}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  );
}

export function IconFeed(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M4 6h16M4 12h10M4 18h14" />
    </Icon>
  );
}

export function IconSearch(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </Icon>
  );
}

export function IconEvent(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.5 1.5" />
    </Icon>
  );
}

export function IconBell(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </Icon>
  );
}

/** Иконка из `design/message.svg` (заливка currentColor). */
export function IconMessages(props: SVGProps<SVGSVGElement>) {
  const { className, ...rest } = props;
  return (
    <svg
      viewBox="0 0 20 20"
      width={22}
      height={22}
      className={className}
      aria-hidden
      {...rest}
    >
      <path
        fill="currentColor"
        fillRule="nonzero"
        d="M6.83 15.75c.2-.23.53-.31.82-.2.81.3 1.7.45 2.6.45 3.77 0 6.75-2.7 6.75-6s-2.98-6-6.75-6S3.5 6.7 3.5 10c0 1.21.4 2.37 1.14 3.35.1.14.16.31.15.49-.04.76-.4 1.78-1.08 3.13 1.48-.11 2.5-.53 3.12-1.22ZM3.24 18.5a1.2 1.2 0 0 1-1.1-1.77A10.77 10.77 0 0 0 3.26 14 7 7 0 0 1 2 10c0-4.17 3.68-7.5 8.25-7.5S18.5 5.83 18.5 10s-3.68 7.5-8.25 7.5c-.92 0-1.81-.13-2.66-.4-1 .89-2.46 1.34-4.35 1.4Z"
      />
    </svg>
  );
}

/** Иконка из `design/profile.svg` (заливка через currentColor). */
export function IconUser(props: SVGProps<SVGSVGElement>) {
  const { className, ...rest } = props;
  return (
    <svg
      viewBox="0 0 24 24"
      width={22}
      height={22}
      className={className}
      aria-hidden
      {...rest}
    >
      <path
        fill="currentColor"
        d="M16 6C16 8.20914 14.2091 10 12 10C9.79086 10 8 8.20914 8 6C8 3.79086 9.79086 2 12 2C14.2091 2 16 3.79086 16 6Z"
      />
      <path
        fill="currentColor"
        d="M19 18C19 20.2091 15.866 22 12 22C8.13401 22 5 20.2091 5 18C5 15.7909 8.13401 14 12 14C15.866 14 19 15.7909 19 18Z"
      />
    </svg>
  );
}

export function IconStar(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7L12 17.8 5.7 21 8 14 2 9.4h7.6L12 2z" />
    </Icon>
  );
}

export function IconLogout(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </Icon>
  );
}

export function IconCalendar(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </Icon>
  );
}

/** Тема / ночной режим (круглая кнопка в шапке профиля). */
export function IconMoon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </Icon>
  );
}

/** Светлая тема (будущий свитчер темы). */
export function IconSun(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </Icon>
  );
}

export function IconPaperclip(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </Icon>
  );
}

export function IconSmile(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
    </Icon>
  );
}

export function IconPoll(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M18 20V10M12 20V4M6 20v-6" />
    </Icon>
  );
}

/** Иконка репоста (заливка currentColor, как у кнопки в карточке поста). */
export function IconRepost(props: SVGProps<SVGSVGElement>) {
  const { className, ...rest } = props;
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...rest}>
      <g fill="none" fillRule="evenodd">
        <path
          fill="currentColor"
          fillRule="nonzero"
          d="M11.996 3.725A2.15 2.15 0 0 0 10 5.87l-.001 2.117-.02.005a9.904 9.904 0 0 0-7.827 10.721c.083.811 1.116 1.103 1.611.455l.187-.237a9.08 9.08 0 0 1 5.836-3.265l.213-.026.001 2.494a2.15 2.15 0 0 0 3.476 1.692l7.824-6.132a2.15 2.15 0 0 0 0-3.384l-7.824-6.132a2.15 2.15 0 0 0-1.326-.458zm.154 1.795a.35.35 0 0 1 .216.075l7.824 6.132a.35.35 0 0 1 0 .55l-7.824 6.133a.35.35 0 0 1-.566-.276l-.001-3.447a.9.9 0 0 0-.915-.9l-.233.004-.342.017a10.9 10.9 0 0 0-6.119 2.365l-.174.144.024-.135a8.1 8.1 0 0 1 6.968-6.537.9.9 0 0 0 .791-.893L11.8 5.87a.35.35 0 0 1 .35-.35"
        />
      </g>
    </svg>
  );
}

/** Отправка сообщения (как в композере личных сообщений). */
export function IconSendPlane(props: SVGProps<SVGSVGElement>) {
  const { className, ...rest } = props;
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...rest}>
      <g fill="none" fillRule="evenodd">
        <path
          fill="currentColor"
          d="M5.739 15.754q-1.029 2.782-1.293 3.91c-.553 2.362-.956 2.894 1.107 1.771 2.062-1.122 12.046-6.683 14.274-7.919 2.904-1.611 2.942-1.485-.156-3.196-2.36-1.302-12.227-6.718-14.118-7.782-1.892-1.063-1.66-.59-1.107 1.772q.268 1.142 1.311 3.944a4 4 0 0 0 2.988 2.531l5.765 1.117a.1.1 0 0 1 0 .196l-5.778 1.116a4 4 0 0 0-2.993 2.54"
        />
      </g>
    </svg>
  );
}

export function IconCheckVerified(props: SVGProps<SVGSVGElement>) {
  const { className, ...rest } = props;
  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      className={className}
      aria-hidden
      {...rest}
    >
      <circle cx="12" cy="12" r="10" fill="#3b82f6" />
      <path
        d="m9 12 2 2 4-4"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
