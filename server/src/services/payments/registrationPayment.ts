import mongoose from 'mongoose';
import { League, Payment, Registration } from '../../models';
import type { IPayment } from '../../models/leagues/Payment';
import { createCheckoutSession, isStripeConfigured } from './stripe';
import { resolveLeagueRegistration } from '../leagues/registration';

function resolveClientOrigin(): string {
  return (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '');
}

function resolveRegistrationCheckoutUrls(registrationId: string): {
  successUrl: string;
  cancelUrl: string;
} {
  const origin = resolveClientOrigin();
  const id = encodeURIComponent(registrationId);

  return {
    successUrl: `${origin}/register/payment/success?registration_id=${id}&session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${origin}/register/payment/cancel?registration_id=${id}`,
  };
}

export interface RegistrationCheckoutResult {
  paymentId: string;
  checkoutUrl: string;
  stripeSessionId: string;
}

export async function createRegistrationCheckout(
  registrationId: mongoose.Types.ObjectId | string,
  customerEmail: string
): Promise<RegistrationCheckoutResult> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured');
  }

  const registration = await Registration.findById(registrationId);

  if (!registration) {
    throw new Error('Registration not found');
  }

  if (registration.status !== 'pending_payment') {
    throw new Error('Registration is not awaiting payment');
  }

  const league = await League.findById(registration.leagueId).select('name registration').lean();

  if (!league) {
    throw new Error('League not found');
  }

  const registrationSettings = resolveLeagueRegistration(league.registration);
  const amountCents = registrationSettings.entryFeeCents ?? 0;

  if (amountCents <= 0) {
    throw new Error('This registration does not require payment');
  }

  let payment: IPayment | null = null;

  if (registration.paymentId) {
    payment = await Payment.findById(registration.paymentId);
  }

  if (payment?.status === 'paid') {
    throw new Error('Registration is already paid');
  }

  if (!payment) {
    payment = await Payment.create({
      registrationId: registration._id,
      leagueId: registration.leagueId,
      provider: 'stripe',
      amountCents,
      currency: registrationSettings.currency ?? 'usd',
      status: 'pending',
    });

    registration.paymentId = payment._id;
    await registration.save();
  }

  const session = await createCheckoutSession({
    registrationId: String(registration._id),
    amountCents,
    currency: payment.currency,
    customerEmail,
    productName: `${league.name} registration`,
    metadata: {
      leagueId: String(registration.leagueId),
      paymentId: String(payment._id),
    },
    ...resolveRegistrationCheckoutUrls(String(registration._id)),
  });

  if (!session.url) {
    throw new Error('Stripe did not return a checkout URL');
  }

  payment.stripeSessionId = session.id;
  await payment.save();

  return {
    paymentId: String(payment._id),
    checkoutUrl: session.url,
    stripeSessionId: session.id,
  };
}
