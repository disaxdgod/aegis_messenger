import { useEffect, useState } from "react";

type LandingPageProps = { onOpenWebVersion: () => void };

const feedMockup = new URL("../../../../../design/lenta.png", import.meta.url).href;
const messagesMockup = new URL("../../../../../design/message.png", import.meta.url).href;
const profileMockup = new URL("../../../../../design/profile.png", import.meta.url).href;

/* ══════════════════════════════════════════════════════════
   ICONS
══════════════════════════════════════════════════════════ */

function IcoWindows() {
  return (
    <svg viewBox="0 0 88 88" fill="currentColor" className="h-8 w-8">
      <path d="M0 12.4 36 7v36H0zm40 0L88 5v38H40zM0 52h36v36L0 76zm40 2h48v36L40 84z" />
    </svg>
  );
}
function IcoApple() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11" />
    </svg>
  );
}
function IcoAndroid() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8">
      <path d="M17.523 15.34a.99.99 0 0 1-.993-.993.99.99 0 0 1 .993-.993.99.99 0 0 1 .993.993.99.99 0 0 1-.993.993m-11.046 0a.99.99 0 0 1-.993-.993.99.99 0 0 1 .993-.993.99.99 0 0 1 .993.993.99.99 0 0 1-.993.993m11.4-6.01 1.988-3.44a.414.414 0 0 0-.151-.566.414.414 0 0 0-.566.15l-2.013 3.49A11.86 11.86 0 0 0 12 8.003c-1.8 0-3.507.41-5.034 1.13L4.952 5.474a.414.414 0 0 0-.566-.15.414.414 0 0 0-.15.566l1.987 3.44A11.812 11.812 0 0 0 0 18h24a11.812 11.812 0 0 0-6.123-8.67" />
    </svg>
  );
}
function IcoIOS() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.56-1.701" />
    </svg>
  );
}
function IcoGlobe() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-8 w-8">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function PhoneFrame({ children, glow }: { children: React.ReactNode; glow?: string }) {
  return (
    <div
      className="relative flex-shrink-0"
      style={{
        width: 230,
        height: 490,
        filter: glow ? `drop-shadow(0 32px 64px ${glow})` : undefined,
      }}
    >
      <div
        className="absolute inset-0 rounded-[42px]"
        style={{
          background: "linear-gradient(160deg,#232326 0%,#18181b 60%,#101012 100%)",
          boxShadow:
            "0 0 0 1.5px rgba(255,255,255,0.11),inset 0 0 0 1px rgba(255,255,255,0.05),0 40px 80px rgba(0,0,0,0.7)",
        }}
      />
      <div className="absolute -left-[3.5px] top-[104px] h-7 w-[3.5px] rounded-l-full bg-white/[0.09]" />
      <div className="absolute -left-[3.5px] top-[145px] h-11 w-[3.5px] rounded-l-full bg-white/[0.09]" />
      <div className="absolute -left-[3.5px] top-[192px] h-11 w-[3.5px] rounded-l-full bg-white/[0.09]" />
      <div className="absolute -right-[3.5px] top-[130px] h-16 w-[3.5px] rounded-r-full bg-white/[0.09]" />
      <div
        className="absolute overflow-hidden bg-[#111113]"
        style={{ inset: 10, borderRadius: 34 }}
      >
        {children}
      </div>
    </div>
  );
}

/* ── Screen: Feed ── */
function ScreenFeed() {
  return (
    <img src={feedMockup} alt="Лента Aegis" className="h-full w-full object-cover object-top" />
  );
}

/* ── Screen: Messages ── */
function ScreenMessages() {
  return (
    <img src={messagesMockup} alt="Сообщения Aegis" className="h-full w-full object-cover object-top" />
  );
}

/* ── Screen: Profile ── */
function ScreenProfile() {
  return (
    <img src={profileMockup} alt="Профиль Aegis" className="h-full w-full object-cover object-top" />
  );
}

/* ══════════════════════════════════════════════════════════
   ANIMATED HERO WORD
══════════════════════════════════════════════════════════ */

const HERO_WORDS = ["быстрым", "безопасным", "твоим"];
const WORD_COLORS: Record<string, string> = {
  быстрым: "linear-gradient(135deg,#60a5fa 0%,#38bdf8 100%)",
  безопасным: "linear-gradient(135deg,#34d399 0%,#059669 100%)",
  твоим: "linear-gradient(135deg,#a78bfa 0%,#ec4899 100%)",
};

function AnimatedHeroWord() {
  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const t = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % HERO_WORDS.length);
        setFade(true);
      }, 350);
    }, 2800);
    return () => clearInterval(t);
  }, []);

  const word = HERO_WORDS[idx];
  return (
    <span
      className="inline-block bg-clip-text text-transparent"
      style={{
        backgroundImage: WORD_COLORS[word],
        opacity: fade ? 1 : 0,
        transform: fade ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 0.35s ease, transform 0.35s ease",
      }}
    >
      {word}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════ */

export function LandingPage({ onOpenWebVersion }: LandingPageProps) {
  return (
    <div className="min-h-dvh overflow-x-hidden bg-[#0c0c0e] font-sans text-white antialiased">

      {/* ══ NAVBAR ══ */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-[#0c0c0e]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-[60px] max-w-6xl items-center justify-between px-6 sm:px-8">
          <span className="text-[18px] font-bold tracking-tight">Aegis</span>
          <nav className="hidden items-center gap-7 text-[13px] font-medium text-white/50 sm:flex">
            <a href="#fast" className="transition-colors duration-200 hover:text-white">Скорость</a>
            <a href="#safe" className="transition-colors duration-200 hover:text-white">Безопасность</a>
            <a href="#yours" className="transition-colors duration-200 hover:text-white">Профиль</a>
            <a href="#platforms" className="transition-colors duration-200 hover:text-white">Платформы</a>
          </nav>
          <button
            type="button"
            onClick={onOpenWebVersion}
            className="rounded-full bg-white px-5 py-2 text-[13px] font-semibold text-[#0c0c0e] transition-all duration-200 hover:bg-white/90 active:scale-[0.97]"
          >
            Открыть веб-версию
          </button>
        </div>
      </header>

      {/* ══ HERO ══ */}
      <section className="relative flex min-h-dvh flex-col items-center justify-center px-6 pt-16 text-center sm:px-8">
        {/* ambient glow */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30"
            style={{ background: "radial-gradient(circle,#3b82f6 0%,transparent 65%)", filter: "blur(80px)" }} />
        </div>

        <p className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-white/[0.1] bg-white/[0.05] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#93c5fd]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#3b82f6]" />
          Aegis Messenger · Бета
        </p>

        <h1 className="max-w-[820px] text-[clamp(3rem,8vw,6.5rem)] font-semibold leading-[1.02] tracking-[-0.02em]">
          Мессенджер,<br />созданный быть<br />
          <AnimatedHeroWord />
        </h1>

        <p className="mt-7 max-w-lg text-[clamp(0.95rem,2vw,1.15rem)] leading-relaxed text-white/45">
          Общайтесь, делитесь важным и оставайтесь на связи — на компьютере, телефоне или прямо в браузере.
        </p>

        <div className="mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
          <button
            type="button"
            onClick={onOpenWebVersion}
            className="rounded-full bg-[#3b82f6] px-8 py-4 text-[14px] font-semibold text-white shadow-[0_0_40px_rgba(59,130,246,0.5)] transition-all duration-200 hover:bg-[#2563eb] hover:shadow-[0_0_50px_rgba(59,130,246,0.65)] active:scale-[0.97]"
          >
            Открыть веб-версию — бесплатно
          </button>
          <button
            type="button"
            className="rounded-full border border-white/[0.12] px-8 py-4 text-[14px] font-medium text-white/60 transition-all duration-200 hover:border-white/[0.25] hover:text-white active:scale-[0.97]"
          >
            Скачать приложение (скоро)
          </button>
        </div>

        <div className="absolute bottom-10 flex flex-col items-center gap-2 text-white/20">
          <span className="text-[10px] font-medium uppercase tracking-[0.15em]">Прокрутите</span>
          <svg className="h-4 w-4 animate-bounce" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </div>
      </section>

      {/* ══ SECTION: FAST — Лента ══ */}
      <section id="fast" className="py-28 sm:py-36">
        <div className="mx-auto grid max-w-6xl items-center gap-16 px-6 sm:px-8 lg:grid-cols-2 lg:gap-20">
          {/* text */}
          <div className="space-y-7">
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#60a5fa]">Скорость</p>
            <h2 className="text-[clamp(2rem,4vw,3rem)] font-semibold leading-tight tracking-tight">
              Общайся мгновенно.<br />
              <span className="text-white/35">Без задержек.</span>
            </h2>
            <p className="text-[15px] leading-relaxed text-white/45">
              Сообщения, реакции и уведомления доставляются в реальном времени. Лента обновляется мгновенно.
            </p>
            <ul className="space-y-5">
              {[
                ["Живая лента постов", "Публикуйте, читайте, реагируйте — всё работает без перезагрузки."],
                ["Реакции в один клик", "Лайк, репост и комментарий — всё под рукой."],
                ["Хэштеги и темы", "Фильтруйте ленту по интересам, находите авторов по теме."],
                ["Мгновенные уведомления", "Никогда не пропустите важное: ответы, упоминания, реакции."],
              ].map(([title, desc]) => (
                <li key={title as string} className="flex items-start gap-4">
                  <div className="mt-0.5 h-5 w-5 flex-shrink-0 rounded-full bg-[#3b82f6]/20 ring-1 ring-[#3b82f6]/40 flex items-center justify-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#3b82f6]" />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-white">{title}</p>
                    <p className="mt-0.5 text-[13px] text-white/40">{desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          {/* phone */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative">
              <div aria-hidden className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60"
                style={{ width: 320, height: 320, background: "radial-gradient(circle,rgba(59,130,246,0.2) 0%,transparent 70%)", filter: "blur(40px)" }} />
              <PhoneFrame glow="rgba(59,130,246,0.3)">
                <ScreenFeed />
              </PhoneFrame>
            </div>
          </div>
        </div>
      </section>

      {/* ══ SECTION: SAFE ══ */}
      <section id="safe" className="border-y border-white/[0.06] bg-[#080809] py-28 sm:py-36">
        <div className="mx-auto max-w-6xl px-6 sm:px-8">
          <div className="mb-16 text-center">
            <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.14em] text-[#34d399]">Безопасность</p>
            <h2 className="text-[clamp(2rem,4.5vw,3.2rem)] font-semibold leading-tight tracking-tight">
              Ваши данные в безопасности.<br />
              <span className="text-white/35">Всегда.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-white/45">
              Мы относимся к вашей конфиденциальности серьёзно. Только вы решаете, что и с кем делиться.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: "Защита аккаунта", desc: "Надёжная аутентификация и контроль доступа к вашему аккаунту." },
              { title: "Приватность данных", desc: "Личные данные хранятся безопасно и никогда не передаются третьим лицам." },
              { title: "Контроль видимости", desc: "Решайте сами, кто видит ваш профиль, посты и переписку." },
              { title: "Уведомления о входах", desc: "Получайте оповещения о каждом новом сеансе в вашем аккаунте." },
            ].map((item) => (
              <div key={item.title} className="group rounded-3xl border border-white/[0.06] bg-white/[0.025] p-6 transition-all duration-300 hover:border-[#34d399]/30 hover:bg-white/[0.04]">
                <span className="mb-4 block h-8 w-8 rounded-xl border border-emerald-400/30 bg-emerald-500/10" />
                <p className="mb-2 text-[14px] font-semibold text-white">{item.title}</p>
                <p className="text-[12.5px] leading-relaxed text-white/40">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ SECTION: YOURS — Профиль ══ */}
      <section id="yours" className="py-28 sm:py-36">
        <div className="mx-auto grid max-w-6xl items-center gap-16 px-6 sm:px-8 lg:grid-cols-2 lg:gap-20">
          {/* phone first on mobile */}
          <div className="flex justify-center lg:justify-start">
            <div className="relative">
              <div aria-hidden className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60"
                style={{ width: 320, height: 320, background: "radial-gradient(circle,rgba(167,139,250,0.2) 0%,transparent 70%)", filter: "blur(40px)" }} />
              <PhoneFrame glow="rgba(167,139,250,0.25)">
                <ScreenProfile />
              </PhoneFrame>
            </div>
          </div>
          {/* text */}
          <div className="space-y-7">
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#a78bfa]">Ваш профиль</p>
            <h2 className="text-[clamp(2rem,4vw,3rem)] font-semibold leading-tight tracking-tight">
              Сделайте Aegis<br />
              <span className="text-white/35">своим пространством.</span>
            </h2>
            <p className="text-[15px] leading-relaxed text-white/45">
              Ведите профиль, собирайте аудиторию и следите за теми, кто вам интересен.
            </p>
            <ul className="space-y-5">
              {[
                ["Профиль и биография", "Имя, аватар, статус и короткая биография — всё ваше, всё настраивается."],
                ["Подписки и подписчики", "Следите за авторами, которые вас вдохновляют. Растите свою аудиторию."],
                ["Сетка публикаций", "Все ваши посты в одном месте — красивая сетка, как в лучших соцсетях."],
                ["Статус онлайн", "Показывайте, что вы сейчас активны, или отключите — на ваш выбор."],
              ].map(([title, desc]) => (
                <li key={title as string} className="flex items-start gap-4">
                  <div className="mt-0.5 h-5 w-5 flex-shrink-0 rounded-full bg-[#a78bfa]/20 ring-1 ring-[#a78bfa]/40 flex items-center justify-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#a78bfa]" />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-white">{title}</p>
                    <p className="mt-0.5 text-[13px] text-white/40">{desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ══ SECTION: MESSAGES — Чаты ══ */}
      <section className="border-y border-white/[0.06] bg-[#080809] py-28 sm:py-36">
        <div className="mx-auto grid max-w-6xl items-center gap-16 px-6 sm:px-8 lg:grid-cols-2 lg:gap-20">
          {/* text */}
          <div className="space-y-7">
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#f472b6]">Сообщения</p>
            <h2 className="text-[clamp(2rem,4vw,3rem)] font-semibold leading-tight tracking-tight">
              Общайтесь лично<br />
              <span className="text-white/35">без ограничений.</span>
            </h2>
            <p className="text-[15px] leading-relaxed text-white/45">
              Личные переписки, групповые чаты, файлы и медиа — всё в одном приложении, всегда под рукой.
            </p>
            <ul className="space-y-5">
              {[
                ["Личные переписки", "Один-на-один — удобно, быстро, конфиденциально."],
                ["Групповые чаты", "Создавайте групповые беседы для команды, друзей или семьи."],
                ["Поиск по чатам", "Мгновенно находите нужный разговор или сообщение."],
                ["Счётчики непрочитанных", "Никогда не теряйте важные сообщения в потоке уведомлений."],
              ].map(([title, desc]) => (
                <li key={title as string} className="flex items-start gap-4">
                  <div className="mt-0.5 h-5 w-5 flex-shrink-0 rounded-full bg-[#f472b6]/20 ring-1 ring-[#f472b6]/40 flex items-center justify-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#f472b6]" />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-white">{title}</p>
                    <p className="mt-0.5 text-[13px] text-white/40">{desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          {/* phone */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative">
              <div aria-hidden className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60"
                style={{ width: 320, height: 320, background: "radial-gradient(circle,rgba(244,114,182,0.18) 0%,transparent 70%)", filter: "blur(40px)" }} />
              <PhoneFrame glow="rgba(244,114,182,0.22)">
                <ScreenMessages />
              </PhoneFrame>
            </div>
          </div>
        </div>
      </section>

      {/* ══ SECTION: PLATFORMS ══ */}
      <section id="platforms" className="py-28 sm:py-36">
        <div className="mx-auto max-w-5xl px-6 text-center sm:px-8">
          <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.14em] text-white/40">Платформы</p>
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-semibold leading-tight tracking-tight">
            Возьмите Aegis с собой
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-white/45">
            Загрузите Aegis на телефон или компьютер. Веб-версия уже доступна — без скачивания.
          </p>

          <div className="mt-14 flex flex-wrap justify-center gap-4">
            {[
              { icon: <IcoWindows />, label: "Windows", sub: "Скачать", badge: "Скоро", active: false },
              { icon: <IcoApple />, label: "macOS", sub: "Скачать", badge: "Скоро", active: false },
              { icon: <IcoAndroid />, label: "Android", sub: "Google Play", badge: "Скоро", active: false },
              { icon: <IcoIOS />, label: "iOS", sub: "App Store", badge: "Скоро", active: false },
              { icon: <IcoGlobe />, label: "Веб-версия", sub: "Открыть сейчас", badge: "Доступно", active: true },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={p.active ? onOpenWebVersion : undefined}
                className={[
                  "group flex w-[160px] flex-col items-center gap-3 rounded-3xl border px-6 py-7 text-center transition-all duration-300",
                  p.active
                    ? "cursor-pointer border-[#3b82f6]/40 bg-[#3b82f6]/[0.08] hover:border-[#3b82f6]/70 hover:bg-[#3b82f6]/[0.14] hover:shadow-[0_0_30px_rgba(59,130,246,0.2)]"
                    : "cursor-default border-white/[0.06] bg-white/[0.02] opacity-55 hover:opacity-75",
                ].join(" ")}
              >
                <span className={p.active ? "text-[#60a5fa]" : "text-white/40"}>{p.icon}</span>
                <div>
                  <p className="text-[13px] font-semibold text-white">{p.label}</p>
                  <p className="text-[11px] text-white/35">{p.sub}</p>
                </div>
                <span className={[
                  "rounded-full px-3 py-0.5 text-[10px] font-bold",
                  p.active ? "bg-[#3b82f6]/25 text-[#93c5fd]" : "bg-white/[0.04] text-white/25",
                ].join(" ")}>
                  {p.badge}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section className="px-6 pb-28 sm:px-8">
        <div
          className="mx-auto max-w-4xl overflow-hidden rounded-[2.5rem] px-8 py-20 text-center"
          style={{
            background: "linear-gradient(135deg,#1a2744 0%,#10183a 40%,#0c0c0e 100%)",
            boxShadow: "0 0 80px rgba(59,130,246,0.2), inset 0 0 0 1px rgba(255,255,255,0.06)",
          }}
        >
          <h2 className="text-[clamp(1.8rem,4.5vw,3rem)] font-semibold leading-tight tracking-tight">
            Начните прямо сейчас
          </h2>
          <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-white/45">
            Веб-версия Aegis бесплатна и работает без скачивания. Просто войдите и начните общаться.
          </p>
          <div className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
            <button
              type="button"
              onClick={onOpenWebVersion}
              className="rounded-full bg-white px-9 py-4 text-[14px] font-semibold text-[#0c0c0e] transition-all duration-200 hover:bg-white/90 hover:shadow-xl active:scale-[0.97]"
            >
              Открыть Aegis в браузере
            </button>
            <button
              type="button"
              className="rounded-full border border-white/[0.12] px-9 py-4 text-[14px] font-medium text-white/55 transition-all duration-200 hover:border-white/[0.25] hover:text-white active:scale-[0.97]"
            >
              Уведомить о выходе приложения
            </button>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="border-t border-white/[0.06] px-6 py-10 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 text-[13px] text-white/25 sm:flex-row">
          <span className="text-[15px] font-bold text-white/40">Aegis</span>
          <div className="flex flex-wrap justify-center gap-6">
            <a href="#" className="transition-colors duration-200 hover:text-white/55">Политика конфиденциальности</a>
            <a href="#" className="transition-colors duration-200 hover:text-white/55">Условия использования</a>
            <a href="#" className="transition-colors duration-200 hover:text-white/55">Поддержка</a>
            <a href="#" className="transition-colors duration-200 hover:text-white/55">Блог</a>
          </div>
          <span>© 2026 Aegis</span>
        </div>
      </footer>

    </div>
  );
}
