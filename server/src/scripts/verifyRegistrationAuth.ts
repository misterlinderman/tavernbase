/**
 * Dev assertion script for registration auth helpers (mock JWT claims).
 * Run: npx ts-node server/src/scripts/verifyRegistrationAuth.ts
 */
import { shouldBlockUnverifiedPaidRegistration } from '../utils/registrationEmailVerification';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function run(): void {
  assert(!shouldBlockUnverifiedPaidRegistration(null, 2500), 'missing claim allows paid');
  assert(!shouldBlockUnverifiedPaidRegistration(true, 2500), 'verified allows paid');
  assert(shouldBlockUnverifiedPaidRegistration(false, 2500), 'unverified blocks paid');
  assert(!shouldBlockUnverifiedPaidRegistration(false, 0), 'unverified allows free');

  const invitedCaptain: { sub: string; email: string; email_verified?: boolean } = {
    sub: 'auth0|captain',
    email: 'captain@example.com',
  };
  const invitedVerified =
    typeof invitedCaptain.email_verified === 'boolean' ? invitedCaptain.email_verified : null;

  assert(invitedVerified === null, 'invited captain token has no email_verified claim');
  assert(
    !shouldBlockUnverifiedPaidRegistration(invitedVerified, 2000),
    'invited captain unaffected when claim absent'
  );

  console.log('verifyRegistrationAuth: all assertions passed');
}

run();
