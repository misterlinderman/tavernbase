import { describe, expect, it } from 'vitest';
import { resolveRegistrationNextStep } from '../../services/leagues/registrationOwner';

describe('resolveRegistrationNextStep', () => {
  it('returns payment for pending_payment', () => {
    expect(resolveRegistrationNextStep('pending_payment')).toBe('payment');
  });

  it('returns approval for pending_approval', () => {
    expect(resolveRegistrationNextStep('pending_approval')).toBe('approval');
  });

  it('returns waitlist for waitlisted', () => {
    expect(resolveRegistrationNextStep('waitlisted')).toBe('waitlist');
  });

  it('returns complete for approved and other terminal states', () => {
    expect(resolveRegistrationNextStep('approved')).toBe('complete');
    expect(resolveRegistrationNextStep('rejected')).toBe('complete');
    expect(resolveRegistrationNextStep('refunded')).toBe('complete');
  });
});
