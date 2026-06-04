import { API_PREFIX, type AuthResponseDTO, type ApiErrorDTO } from "@aegis/shared";
import type { SignInRequestDTO, SignUpRequestDTO } from "@aegis/shared";

import { isBackendEnabled } from "@/config/backend";
import { localSignIn, localSignUp } from "@/lib/auth-local";
export class AuthApiError extends Error {
  readonly statusCode: number;
  readonly apiCode?: string;
  readonly fields?: Record<string, string>;

  constructor(
    statusCode: number,
    message: string,
    opts?: { apiCode?: string; fields?: Record<string, string> },
  ) {
    super(message);
    this.name = "AuthApiError";
    this.statusCode = statusCode;
    this.apiCode = opts?.apiCode;
    this.fields = opts?.fields;
  }
}

async function parseJsonSafe(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

async function apiPostJson<T>(
  path: string,
  body: unknown,
): Promise<T> {
  const url = `${API_PREFIX}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    credentials: "same-origin",
  });

  if (res.ok) {
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  const raw = (await parseJsonSafe(res.clone())) as
    | ApiErrorDTO
    | undefined;
  const errMsg = raw?.error?.message ?? res.statusText;
  const apiCode =
    typeof raw?.error?.code === "string" ? raw?.error.code : undefined;
  const fields =
    raw?.error?.fields && typeof raw.error.fields === "object"
      ? raw.error.fields
      : undefined;
  throw new AuthApiError(res.status, errMsg, { apiCode, fields });
}

export async function apiSignUp(
  body: SignUpRequestDTO,
): Promise<AuthResponseDTO> {
  if (!isBackendEnabled()) {
    return localSignUp(body);
  }
  return apiPostJson<AuthResponseDTO>("/auth/sign-up", body);
}

export async function apiSignIn(
  body: SignInRequestDTO,
): Promise<AuthResponseDTO> {
  if (!isBackendEnabled()) {
    return localSignIn(body);
  }
  return apiPostJson<AuthResponseDTO>("/auth/sign-in", body);
}
