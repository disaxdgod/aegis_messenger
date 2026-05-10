export function AlertsPage() {
  return (
    <div className="font-sans text-theme-text">
      <h1 className="mb-5 text-2xl font-bold tracking-tight">Уведомления</h1>
      <div
        className="rounded-3xl border border-theme-border px-6 py-16 text-center text-sm text-theme-text-2"
        style={{ backgroundColor: "var(--block-bg)" }}
      >
        Пока нет уведомлений
      </div>
    </div>
  );
}
