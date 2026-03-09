/**
 * Collision-safe ID generation utilities.
 *
 * Replaces the old `Date.now()` pattern that could produce duplicate IDs
 * when two operations happen within the same millisecond.
 *
 * Uses `crypto.randomUUID()` which is available in all modern browsers
 * and Node ≥ 19. Falls back to a timestamp + random suffix for legacy
 * environments (should never trigger in our target browsers).
 */

/** Generate a globally-unique ID (UUID v4). */
export function uid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback: timestamp + 8-char random hex
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Generate a prefixed unique ID.
 * @example prefixedId('t')   → "t_a1b2c3d4-..."
 * @example prefixedId('inv') → "inv_a1b2c3d4-..."
 */
export function prefixedId(prefix: string): string {
  return `${prefix}_${uid()}`;
}
