import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('joins truthy class names', () => {
    expect(cn('btn', 'btn-primary')).toBe('btn btn-primary');
  });

  it('filters falsy values', () => {
    expect(cn('card', undefined, false && 'hidden', null, '')).toBe('card');
  });
});
