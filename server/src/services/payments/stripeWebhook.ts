import mongoose from 'mongoose';
import type Stripe from 'stripe';
import { League, Payment, ProcessedStripeEvent, Registration } from '../../models';
import { resolveLeagueRegistration } from '../leagues/registration';
import { completeRegistrationAfterPayment } from '../leagues/registrationActions';

export class StripeWebhookError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400
  ) {
    super(message);
    this.name = 'StripeWebhookError';
  }
}

export async function isStripeEventProcessed(stripeEventId: string): Promise<boolean> {
  const existing = await ProcessedStripeEvent.exists({ stripeEventId });
  return Boolean(existing);
}

export async function markStripeEventProcessed(
  stripeEventId: string,
  eventType: string
): Promise<void> {
  try {
    await ProcessedStripeEvent.create({
      stripeEventId,
      eventType,
      processedAt: new Date(),
    });
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 11000) {
      return;
    }

    throw error;
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const sessionId = session.id;
  const payment = await Payment.findOne({ stripeSessionId: sessionId });

  if (!payment) {
    throw new StripeWebhookError(`No payment found for checkout session ${sessionId}`, 404);
  }

  if (payment.status === 'paid') {
    return;
  }

  payment.status = 'paid';
  payment.paidAt = new Date();

  if (typeof session.payment_intent === 'string') {
    payment.stripePaymentIntentId = session.payment_intent;
  } else if (session.payment_intent && typeof session.payment_intent === 'object') {
    payment.stripePaymentIntentId = session.payment_intent.id;
  }

  await payment.save();

  const registration = await Registration.findById(payment.registrationId);

  if (!registration) {
    throw new StripeWebhookError(`Registration not found for payment ${String(payment._id)}`, 404);
  }

  if (!registration.paymentId) {
    registration.paymentId = payment._id as mongoose.Types.ObjectId;
    await registration.save();
  }

  await completeRegistrationAfterPayment(String(registration._id));
}

export async function handleStripeWebhookEvent(event: Stripe.Event): Promise<void> {
  if (await isStripeEventProcessed(event.id)) {
    return;
  }

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    default:
      break;
  }

  await markStripeEventProcessed(event.id, event.type);
}
