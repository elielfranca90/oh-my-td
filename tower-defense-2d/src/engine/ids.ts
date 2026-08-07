let fallbackCounter = 0;

/**
 * Collision-free entity id. `Date.now()` used to collide whenever two entities were
 * created inside the same millisecond (boss reinforcements, towers placed by script).
 */
export function createId(prefix: string): string {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return `${prefix}-${cryptoObj.randomUUID()}`;
  }
  fallbackCounter++;
  return `${prefix}-${fallbackCounter}-${Math.random().toString(36).slice(2, 10)}`;
}
