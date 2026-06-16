import { describe, expect, it } from 'vitest';
import { shouldBlockUnverifiedPaidRegistration } from '../../utils/registrationEmailVerification';

describe('shouldBlockUnverifiedPaidRegistration', () => {
  it('allows when email_verified claim is absent (backward compat)', () => {
    expect(shouldBlockUnverifiedPaidRegistration(null, 2500)).toBe(false);
  });

  it('allows verified email for paid registration', () => {
    expect(shouldBlockUnverifiedPaidRegistration(true, 2500)).toBe(false);
  });

  it('blocks unverified email for paid registration', () => {
    expect(shouldBlockUnverifiedPaidRegistration(false, 2500)).toBe(true);
  });

  it('allows unverified email for free registration', () => {
    expect(shouldBlockUnverifiedPaidRegistration(false, 0)).toBe(false);
  });
});

describe('registration auth flow (mock JWT claims)', () => {
  it('simulates activate → submit path for invited captain (no email_verified claim)', () => {
    const tokenClaims = {
      sub: 'auth0|invited-captain',
      email: 'captain@example.com',
    };

    const emailVerified =
      typeof tokenClaims.email_verified === 'boolean' ? tokenClaims.email_verified : null;
    const entryFeeCents = 0;

    expect(emailVerified).toBeNull();
    expect(shouldBlockUnverifiedPaidRegistration(emailVerified, entryFeeCents)).toBe(false);
  });

  it('simulates self-service paid registration blocked until verified', () => {
    const unverifiedClaims = {
      sub: 'auth0|new-player',
      email: 'player@example.com',
      email_verified: false,
    };

    expect(
      shouldBlockUnverifiedPaidRegistration(unverifiedClaims.email_verified, 1500)
    ).toBe(true);

    const verifiedClaims = { ...unverifiedClaims, email_verified: true };

    expect(
      shouldBlockUnverifiedPaidRegistration(verifiedClaims.email_verified, 1500)
    ).toBe(false);
  });
});
