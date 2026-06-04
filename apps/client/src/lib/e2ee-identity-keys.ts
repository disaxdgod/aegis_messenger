/** Сохраняем пару ECDH-P256 локально после регистрации (дальше для E2EE). */
export const STORAGE_IDENTITY_SPKI_B64 = "aegis:identity:publicSpkiB64";
export const STORAGE_IDENTITY_PKCS8_B64 = "aegis:identity:privatePkcs8B64";

/** WebCrypto `subtle` есть только в [secure contexts](https://developer.mozilla.org/docs/Web/API/Window/crypto#secure_context). */
export class WebCryptoUnavailableError extends Error {
  readonly code = "WEBCRYPTO_UNAVAILABLE" as const;
  constructor() {
    super(
      "Этот адрес недоступен для генерации ключей E2EE. Откройте приложение как " +
        "http://localhost:5173 или https://… (не http://IP:порт в локальной сети). " +
        "Либо включите HTTPS у Vite (mkcert + VITE_DEV_HTTPS_KEY/CERT).",
    );
    this.name = "WebCryptoUnavailableError";
  }
}

export function assertSubtleCrypto(): Crypto {
  const c = globalThis.crypto;
  if (!c || typeof c.subtle?.generateKey !== "function") {
    throw new WebCryptoUnavailableError();
  }
  return c;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/** Новая пара и сохранение в localStorage — для первичной регистрации аккаунта. */
export async function createStoredIdentityKeys(): Promise<{
  publicKey: string;
  publicKeyAlgo: "ECDH-P256";
}> {
  const cryptoApi = assertSubtleCrypto();
  const pair = await cryptoApi.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    ["deriveBits"],
  );

  const spki = await cryptoApi.subtle.exportKey("spki", pair.publicKey);
  const pkcs8 = await cryptoApi.subtle.exportKey("pkcs8", pair.privateKey);

  const publicKey = uint8ArrayToBase64(new Uint8Array(spki));
  const privatePkcs8 = uint8ArrayToBase64(new Uint8Array(pkcs8));

  localStorage.setItem(STORAGE_IDENTITY_SPKI_B64, publicKey);
  localStorage.setItem(STORAGE_IDENTITY_PKCS8_B64, privatePkcs8);

  return {
    publicKey,
    publicKeyAlgo: "ECDH-P256",
  };
}

export function clearStoredIdentityKeys(): void {
  localStorage.removeItem(STORAGE_IDENTITY_SPKI_B64);
  localStorage.removeItem(STORAGE_IDENTITY_PKCS8_B64);
}
