import type { MeDTO } from "./user.js";

export interface SignUpRequestDTO {
  username: string;
  email: string;
  password: string;
  /** Base64 SPKI публичного ключа клиента для E2EE. */
  publicKey: string;
  publicKeyAlgo: "ECDH-P256" | "X25519";
}

export interface SignInRequestDTO {
  /** Логин: username или email (нормализуется на сервере). */
  login: string;
  password: string;
}

export interface AuthResponseDTO {
  /** Короткоживущий access JWT (передаётся в `Authorization`). */
  token: string;
  tokenType: "Bearer";
  expiresIn: number;
  /** Opaque-токен обновления; хранится только клиентом, в БД — хеш. */
  refreshToken?: string;
  /** Срок жизни refresh в секундах (если refresh выдан). */
  refreshExpiresIn?: number;
  me: MeDTO;
}

/** Обмен refresh-токена на новую пару access (+ refresh rotation). */
export interface RefreshTokensRequestDTO {
  refreshToken: string;
}

/** Выход из одной сессии (устройства). */
export interface LogoutRequestDTO {
  refreshToken: string;
}
