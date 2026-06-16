import mongoose from 'mongoose';
import type { EntrantType, RegistrationStatus } from '../../constants/leagues';
import type { PaymentStatus } from '../../constants/payments';
import { League, Payment, Player, Registration } from '../../models';
import type { IRegistration } from '../../models/leagues/Registration';
import { formatEntryFeeDisplay, resolveLeagueRegistration } from '../leagues/registration';
import { approveRegistration } from '../leagues/registrationActions';
import { createRefund, isStripeConfigured } from './stripe';

export interface PaymentLedgerEntry {
  registrationId: string;
  paymentId?: string;
  entrantType: EntrantType;
  entrantName: string;
  submittedByPlayerId: string;
  submittedByPlayerName?: string;
  registrationStatus: RegistrationStatus;
  paymentStatus: PaymentStatus | null;
  amountCents: number;
  amountDisplay: string;
  currency: string;
  paidAt?: string;
  refundedAt?: string;
  submittedAt: string;
}

async function getRegistrationForLeague(
  leagueId: mongoose.Types.ObjectId | string,
  registrationId: mongoose.Types.ObjectId | string
): Promise<IRegistration> {
  if (!mongoose.isValidObjectId(String(registrationId))) {
    throw new Error('Invalid registration id');
  }

  const registration = await Registration.findOne({
    _id: registrationId,
    leagueId,
  });

  if (!registration) {
    throw new Error('Registration not found');
  }

  return registration;
}

function resolveEntrantName(
  registration: {
    entrantType: EntrantType;
    teamName?: string;
  },
  playerNameById: Record<string, string>,
  submittedByPlayerId: string
): string {
  if (registration.entrantType === 'team') {
    return registration.teamName?.trim() || 'Team entry';
  }

  return playerNameById[submittedByPlayerId] ?? 'Player entry';
}

export async function listLeaguePayments(
  leagueId: mongoose.Types.ObjectId | string
): Promise<PaymentLedgerEntry[]> {
  const league = await League.findById(leagueId).select('registration').lean();

  if (!league) {
    throw new Error('League not found');
  }

  const registrationSettings = resolveLeagueRegistration(league.registration);
  const defaultAmountCents = registrationSettings.entryFeeCents ?? 0;
  const currency = registrationSettings.currency ?? 'usd';

  if (defaultAmountCents <= 0) {
    const paidOnly = await Payment.find({ leagueId }).sort({ createdAt: -1 }).lean();

    if (paidOnly.length === 0) {
      return [];
    }
  }

  const registrations = await Registration.find({ leagueId }).sort({ createdAt: -1 }).lean();

  if (registrations.length === 0) {
    return [];
  }

  const playerIds = new Set<string>();

  for (const registration of registrations) {
    playerIds.add(String(registration.submittedByPlayerId));
  }

  const [players, payments] = await Promise.all([
    Player.find({ _id: { $in: [...playerIds] } })
      .select('_id name')
      .lean(),
    Payment.find({ leagueId }).lean(),
  ]);

  const playerNameById = Object.fromEntries(players.map((player) => [String(player._id), player.name]));
  const paymentByRegistrationId = Object.fromEntries(
    payments.map((payment) => [String(payment.registrationId), payment])
  );

  const entries: PaymentLedgerEntry[] = [];

  for (const registration of registrations) {
    const payment = registration.paymentId
      ? payments.find((item) => String(item._id) === String(registration.paymentId))
      : paymentByRegistrationId[String(registration._id)];

    const amountCents = payment?.amountCents ?? defaultAmountCents;
    const hasFeeContext = defaultAmountCents > 0 || Boolean(payment) || registration.status === 'pending_payment';

    if (!hasFeeContext) {
      continue;
    }

    entries.push({
      registrationId: String(registration._id),
      paymentId: payment ? String(payment._id) : undefined,
      entrantType: registration.entrantType,
      entrantName: resolveEntrantName(
        registration,
        playerNameById,
        String(registration.submittedByPlayerId)
      ),
      submittedByPlayerId: String(registration.submittedByPlayerId),
      submittedByPlayerName: playerNameById[String(registration.submittedByPlayerId)],
      registrationStatus: registration.status,
      paymentStatus: payment?.status ?? (registration.status === 'pending_payment' ? 'pending' : null),
      amountCents,
      amountDisplay: formatEntryFeeDisplay(amountCents, currency),
      currency,
      paidAt: payment?.paidAt?.toISOString(),
      refundedAt: payment?.refundedAt?.toISOString(),
      submittedAt: registration.createdAt.toISOString(),
    });
  }

  return entries;
}

export async function waiveRegistrationFee(options: {
  leagueId: string;
  registrationId: string;
  reviewedBy?: mongoose.Types.ObjectId | string;
}): Promise<PaymentLedgerEntry> {
  const league = await League.findById(options.leagueId);

  if (!league) {
    throw new Error('League not found');
  }

  const registration = await getRegistrationForLeague(league._id, options.registrationId);

  if (registration.status !== 'pending_payment') {
    throw new Error('Only registrations awaiting payment can have the fee waived');
  }

  const settings = resolveLeagueRegistration(league.registration);
  const amountCents = settings.entryFeeCents ?? 0;

  let payment = registration.paymentId ? await Payment.findById(registration.paymentId) : null;

  if (payment?.status === 'paid') {
    throw new Error('Registration is already paid — use refund instead');
  }

  if (payment?.status === 'refunded') {
    throw new Error('Payment was already refunded');
  }

  if (!payment) {
    payment = await Payment.create({
      registrationId: registration._id,
      leagueId: registration.leagueId,
      provider: 'stripe',
      amountCents,
      currency: settings.currency ?? 'usd',
      status: 'waived',
    });
    registration.paymentId = payment._id;
    await registration.save();
  } else {
    payment.status = 'waived';
    await payment.save();
  }

  await approveRegistration({
    leagueId: options.leagueId,
    registrationId: options.registrationId,
    reviewedBy: options.reviewedBy,
  });

  const ledger = await listLeaguePayments(options.leagueId);
  const match = ledger.find((entry) => entry.registrationId === options.registrationId);

  if (!match) {
    throw new Error('Could not load waived registration payment');
  }

  return match;
}

export async function refundRegistrationPayment(options: {
  leagueId: string;
  registrationId: string;
  reviewedBy?: mongoose.Types.ObjectId | string;
  notes?: string;
}): Promise<PaymentLedgerEntry> {
  const registration = await getRegistrationForLeague(options.leagueId, options.registrationId);

  if (!registration.paymentId) {
    throw new Error('Registration has no payment on file');
  }

  const payment = await Payment.findById(registration.paymentId);

  if (!payment) {
    throw new Error('Payment not found');
  }

  if (payment.status !== 'paid') {
    throw new Error('Only paid registrations can be refunded');
  }

  if (!payment.stripePaymentIntentId) {
    throw new Error('Payment is missing a Stripe payment intent — refund manually in Stripe');
  }

  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured');
  }

  await createRefund(payment.stripePaymentIntentId);

  payment.status = 'refunded';
  payment.refundedAt = new Date();
  await payment.save();

  registration.status = 'cancelled';
  registration.reviewedAt = new Date();
  registration.notes =
    options.notes?.trim() ||
    registration.notes ||
    'Registration cancelled after payment refund';

  if (options.reviewedBy && mongoose.isValidObjectId(String(options.reviewedBy))) {
    registration.reviewedBy = new mongoose.Types.ObjectId(String(options.reviewedBy));
  }

  await registration.save();

  const ledger = await listLeaguePayments(options.leagueId);
  const match = ledger.find((entry) => entry.registrationId === options.registrationId);

  if (!match) {
    throw new Error('Could not load refunded registration payment');
  }

  return match;
}
