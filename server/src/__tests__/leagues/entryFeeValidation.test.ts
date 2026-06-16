import { describe, expect, it } from 'vitest';
import {
  assertValidEntryFeeCents,
  MAX_ENTRY_FEE_CENTS,
} from '../../services/leagues/registration';

describe('assertValidEntryFeeCents', () => {
  it('accepts zero and positive integer cents', () => {
    expect(() => assertValidEntryFeeCents(0)).not.toThrow();
    expect(() => assertValidEntryFeeCents(2500)).not.toThrow();
    expect(() => assertValidEntryFeeCents(MAX_ENTRY_FEE_CENTS)).not.toThrow();
  });

  it('rejects negative and non-integer values', () => {
    expect(() => assertValidEntryFeeCents(-1)).toThrow();
    expect(() => assertValidEntryFeeCents(10.5)).toThrow();
  });

  it('rejects fees above the configured maximum', () => {
    expect(() => assertValidEntryFeeCents(MAX_ENTRY_FEE_CENTS + 1)).toThrow(
      /cannot exceed/
    );
  });
});
