/**
 * Paid registration policy when Auth0 includes email_verified in the access token.
 * When the claim is absent (null), allow — backward compatible with invited captains.
 */
export function shouldBlockUnverifiedPaidRegistration(
  emailVerified: boolean | null,
  entryFeeCents: number
): boolean {
  return emailVerified === false && entryFeeCents > 0;
}
