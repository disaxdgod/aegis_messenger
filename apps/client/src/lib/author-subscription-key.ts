/** Нормализованный ключ подписки по отображаемому имени автора. */
export function authorSubscriptionKey(name: string) {
  return name.trim().toLowerCase();
}
