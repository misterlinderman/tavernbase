import type { PaymentStatus } from '../types/payments';

export const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded', 'waived'] as const;

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Pending',
  paid: 'Paid',
  failed: 'Failed',
  refunded: 'Refunded',
  waived: 'Waived',
};

export const PAYMENT_STATUS_BADGE_CLASS: Record<PaymentStatus, string> = {
  pending: 'paymentBadgePending',
  paid: 'paymentBadgePaid',
  failed: 'paymentBadgeFailed',
  refunded: 'paymentBadgeRefunded',
  waived: 'paymentBadgeWaived',
};
