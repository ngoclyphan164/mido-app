/**
 * UUID v4 for the hangout create idempotency key. Prefers the platform's crypto
 * when present; the Math.random fallback is acceptable here because the API's
 * uniqueness constraint is per creator, not global.
 */
export function uuidv4(): string {
  const cryptoRef = globalThis.crypto as { randomUUID?: () => string } | undefined;
  if (typeof cryptoRef?.randomUUID === 'function') return cryptoRef.randomUUID();

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
