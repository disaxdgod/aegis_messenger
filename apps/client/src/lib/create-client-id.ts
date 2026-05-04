/** Стабильный ID без привязки к Secure Context (в отличие от `crypto.randomUUID()` на http по IP). */
export function createClientId(): string {
  try {
    const fn = globalThis.crypto?.randomUUID;
    if (typeof fn === "function") {
      return fn.call(globalThis.crypto);
    }
  } catch {
    /* randomUUID может кинуть вне localhost / https */
  }
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}
