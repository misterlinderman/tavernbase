import type { EntrantType } from '../constants/leagues';

export const MAX_ENTRY_FEE_CENTS = 999_999;
export const MAX_ENTRY_FEE_DOLLARS = MAX_ENTRY_FEE_CENTS / 100;

export function formatEntryFeeDollars(cents?: number): string {
  if (!cents) {
    return '';
  }

  return (cents / 100).toFixed(2);
}

export function parseEntryFeeDollars(value: string): number {
  const parsed = Number.parseFloat(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  const cents = Math.round(parsed * 100);
  return Math.min(cents, MAX_ENTRY_FEE_CENTS);
}

export function formatEntryFeeDisplay(cents: number, currency = 'usd'): string {
  if (cents <= 0) {
    return 'Free';
  }

  if (currency === 'usd') {
    return `$${(cents / 100).toFixed(2)}`;
  }

  return `${cents} ${currency.toUpperCase()}`;
}

export function formatRegistrationFeePreview(
  entryFeeCents: number,
  entrantType: EntrantType
): string {
  if (entryFeeCents <= 0) {
    return 'Free — registrants skip payment at signup';
  }

  const entrantLabel = entrantType === 'player' ? 'Players' : 'Teams';
  return `${entrantLabel} will pay ${formatEntryFeeDisplay(entryFeeCents)} at registration via Stripe Checkout`;
}

export function entryFeeRequiresPayment(entryFeeCents: number): boolean {
  return entryFeeCents > 0;
}
