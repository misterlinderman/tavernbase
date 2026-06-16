import type { PaymentLedgerEntry } from '../types/payments';
import { PAYMENT_STATUS_LABELS } from '../constants/payments';
import { REGISTRATION_STATUS_LABELS } from '../constants/leagues';
import type { RegistrationStatus } from '../constants/leagues';

function escapeCsvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function formatCsvDate(iso?: string): string {
  if (!iso) {
    return '';
  }

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString('en-US');
}

export function buildPaymentLedgerCsv(entries: PaymentLedgerEntry[]): string {
  const headers = [
    'Entrant',
    'Submitted by',
    'Registration status',
    'Payment status',
    'Amount',
    'Paid at',
    'Submitted at',
  ];

  const rows = entries.map((entry) => [
    entry.entrantName,
    entry.submittedByPlayerName ?? entry.submittedByPlayerId,
    REGISTRATION_STATUS_LABELS[entry.registrationStatus as RegistrationStatus] ??
      entry.registrationStatus,
    entry.paymentStatus ? PAYMENT_STATUS_LABELS[entry.paymentStatus] : '',
    entry.amountDisplay,
    formatCsvDate(entry.paidAt),
    formatCsvDate(entry.submittedAt),
  ]);

  return [headers, ...rows].map((row) => row.map((cell) => escapeCsvCell(cell)).join(',')).join('\n');
}

export function downloadPaymentLedgerCsv(entries: PaymentLedgerEntry[], filename: string): void {
  const csv = buildPaymentLedgerCsv(entries);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
