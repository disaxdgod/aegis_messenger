/** Имя продукта (PWA, UI, логи). */
export const APP_NAME = "Aegis";

/** Версия API для клиента; меняйте при несовместимых изменениях контракта. */
export const API_VERSION = "0.1.0";

export const API_PREFIX = "/api";

export const API_HEALTH_PATH = `${API_PREFIX}/health`;

/** События Socket.IO (контракт клиент ↔ сервер). */
export const SOCKET_SERVER_EVENTS = {
  /** Приветствие после подключения. */
  hello: "server:hello",
} as const;

export interface UserDTO {
  id: string;
  username: string;
  createdAt: string;
}

export interface EncryptedMessageDTO {
  id: string;
  chatId: string;
  senderId: string;
  ciphertext: string;
  iv: string;
  createdAt: string;
}

export interface HealthResponseDTO {
  ok: true;
  app: string;
  apiVersion: string;
  database: "up" | "down";
  uptimeSeconds: number;
}
