/**
 * Tests for utils/id.ts — collision-safe ID generation.
 */
import { describe, it, expect } from 'vitest';
import { uid, prefixedId } from '../../utils/id';

describe('uid()', () => {
  it('returns a non-empty string', () => {
    expect(uid().length).toBeGreaterThan(0);
  });

  it('returns unique values across 1000 calls', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => uid()));
    expect(ids.size).toBe(1000);
  });

  it('looks like a UUID v4 (8-4-4-4-12 hex pattern)', () => {
    const id = uid();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe('prefixedId()', () => {
  it('starts with the given prefix + underscore', () => {
    expect(prefixedId('task')).toMatch(/^task_/);
    expect(prefixedId('inv')).toMatch(/^inv_/);
  });

  it('generates unique values', () => {
    const a = prefixedId('t');
    const b = prefixedId('t');
    expect(a).not.toBe(b);
  });
});
