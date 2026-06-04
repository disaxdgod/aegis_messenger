/** Статус активности пользователя для UI списков чата / профиля. */
export type PresenceStatus =
  /** Подключён по сокету (или считается в сети). */
  | "online"
  /** Выход / таймаут сокета. */
  | "offline"
  | "dnd"
  | "invisible";

/** Видима другими участниками. */
export interface UserDTO {
  id: string;
  /** Логин / handle без @. */
  username: string;
  /** Отображаемое имя (напр. имя фамилия или username). */
  displayName: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  /** Короткая строка статуса профиля. */
  status: string;
  presence: PresenceStatus;
  /** Последний визит ISO; может быть скрыто настройкой приватности. */
  lastSeenAt: string | null;
  createdAt: string;
}

/** Данные «я» после JWT: собственная почта и разбитое имя. */
export interface MeDTO extends UserDTO {
  email: string;
  firstName: string;
  lastName: string;
  /** Дата рождения `yyyy-mm-dd` или null. */
  birthDate: string | null;
}

/** Публичный ключ для E2EE (загружает отправитель сообщений до шифрования). */
export interface UserPublicKeyDTO {
  userId: string;
  /** Base64 (SPKI) сырья ключа аутентификации ECDH или X25519. */
  publicKey: string;
  publicKeyAlgo: "ECDH-P256" | "X25519";
  publishedAt: string;
}
