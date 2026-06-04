import type { AuthResponseDTO, MeDTO, SignInRequestDTO, SignUpRequestDTO } from "@aegis/shared";

import { AuthApiError } from "@/lib/auth-api";

const STORAGE_KEY = "aegis-local-accounts-v1";

type LocalAccount = {
  id: string;
  username: string;
  email: string;
  /** Только локальный режим без сервера (не для production). */
  password: string;
  firstName: string;
  lastName: string;
  publicKey: string;
  publicKeyAlgo: "ECDH-P256" | "X25519";
  createdAt: string;
};

function loadAccounts(): LocalAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (row): row is LocalAccount =>
        !!row &&
        typeof row === "object" &&
        typeof (row as LocalAccount).id === "string" &&
        typeof (row as LocalAccount).username === "string" &&
        typeof (row as LocalAccount).email === "string" &&
        typeof (row as LocalAccount).password === "string",
    );
  } catch {
    return [];
  }
}

function saveAccounts(accounts: LocalAccount[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

function accountToMe(account: LocalAccount): MeDTO {
  const displayName =
    [account.firstName.trim(), account.lastName.trim()].filter(Boolean).join(" ") ||
    account.username;
  return {
    id: account.id,
    username: account.username,
    email: account.email,
    firstName: account.firstName,
    lastName: account.lastName,
    displayName,
    avatarUrl: null,
    bannerUrl: null,
    status: "",
    presence: "online",
    lastSeenAt: null,
    birthDate: null,
    createdAt: account.createdAt,
  };
}

function buildAuthResponse(account: LocalAccount): AuthResponseDTO {
  return {
    token: `local.${account.id}.${crypto.randomUUID()}`,
    tokenType: "Bearer",
    expiresIn: 7 * 24 * 60 * 60,
    me: accountToMe(account),
  };
}

function ensureDefaultAccounts(): void {
  const accounts = loadAccounts();
  if (accounts.some((a) => a.username === "d_biryukov")) {
    return;
  }
  accounts.push({
    id: "local-denis-biryukov",
    username: "d_biryukov",
    email: "denis.biryukov@hanin.local",
    password: "Aegis2026!",
    firstName: "Денис",
    lastName: "Бирюков",
    publicKey: "local-dev-public-key-placeholder-not-used-without-server",
    publicKeyAlgo: "ECDH-P256",
    createdAt: new Date().toISOString(),
  });
  saveAccounts(accounts);
}

if (typeof window !== "undefined") {
  try {
    ensureDefaultAccounts();
  } catch {
    /* private mode / quota */
  }
}

export async function localSignUp(body: SignUpRequestDTO): Promise<AuthResponseDTO> {
  ensureDefaultAccounts();
  const username = body.username.trim().toLowerCase();
  const email = body.email.trim().toLowerCase();
  const accounts = loadAccounts();

  if (accounts.some((a) => a.username === username)) {
    throw new AuthApiError(409, "Логин уже занят", {
      apiCode: "CONFLICT",
      fields: { username: "Этот логин уже зарегистрирован." },
    });
  }
  if (accounts.some((a) => a.email === email)) {
    throw new AuthApiError(409, "Email уже занят", {
      apiCode: "CONFLICT",
      fields: { email: "Этот email уже используется." },
    });
  }

  const account: LocalAccount = {
    id: `local-${crypto.randomUUID()}`,
    username,
    email,
    password: body.password,
    firstName: "",
    lastName: "",
    publicKey: body.publicKey,
    publicKeyAlgo: body.publicKeyAlgo,
    createdAt: new Date().toISOString(),
  };
  saveAccounts([...accounts, account]);
  return buildAuthResponse(account);
}

export async function localSignIn(body: SignInRequestDTO): Promise<AuthResponseDTO> {
  ensureDefaultAccounts();
  const login = body.login.trim().toLowerCase();
  const accounts = loadAccounts();
  const account = accounts.find((a) =>
    login.includes("@") ? a.email === login : a.username === login,
  );

  if (!account) {
    throw new AuthApiError(401, "Пользователь не найден", {
      apiCode: "UNAUTHORIZED",
    });
  }

  return buildAuthResponse(account);
}
