export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'waived';

export interface PaymentLedgerEntry {
  registrationId: string;
  paymentId?: string;
  entrantType: 'team' | 'player';
  entrantName: string;
  submittedByPlayerId: string;
  submittedByPlayerName?: string;
  registrationStatus: string;
  paymentStatus: PaymentStatus | null;
  amountCents: number;
  amountDisplay: string;
  currency: string;
  paidAt?: string;
  refundedAt?: string;
  submittedAt: string;
}
