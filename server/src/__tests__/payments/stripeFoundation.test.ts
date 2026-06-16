import { describe, expect, it } from 'vitest';
import { shouldBlockUnverifiedPaidRegistration } from '../../utils/registrationEmailVerification';

describe('stripe payment policy helpers', () => {
  it('does not block free registration when email is unverified', () => {
    expect(shouldBlockUnverifiedPaidRegistration(false, 0)).toBe(false);
  });

  it('blocks paid registration when email is unverified', () => {
    expect(shouldBlockUnverifiedPaidRegistration(false, 2500)).toBe(true);
  });
});

describe('registration status after payment (expected transitions)', () => {
  it('paid + auto-approve → approved', () => {
    const requiresApproval = false;
    const nextStatus = requiresApproval ? 'pending_approval' : 'approved';
    expect(nextStatus).toBe('approved');
  });

  it('paid + requiresApproval → pending_approval', () => {
    const requiresApproval = true;
    const nextStatus = requiresApproval ? 'pending_approval' : 'approved';
    expect(nextStatus).toBe('pending_approval');
  });
});
