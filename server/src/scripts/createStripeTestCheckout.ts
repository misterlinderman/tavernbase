/**
 * Creates a Stripe test-mode Checkout Session for a pending_payment registration.
 *
 * Prerequisites:
 * - STRIPE_SECRET_KEY (test mode sk_test_...)
 * - MONGODB_URI
 * - A Registration with status pending_payment and league entryFeeCents > 0
 *
 * Run:
 *   REGISTRATION_ID=... CUSTOMER_EMAIL=captain@example.com \
 *   npx ts-node server/src/scripts/createStripeTestCheckout.ts
 */
import dotenv from 'dotenv';

dotenv.config();

import { connectDatabase } from '../config/db';
import { createRegistrationCheckout } from '../services/payments/registrationPayment';
import { isStripeConfigured } from '../services/payments/stripe';

async function main(): Promise<void> {
  const registrationId = process.env.REGISTRATION_ID;
  const customerEmail = process.env.CUSTOMER_EMAIL;

  if (!registrationId || !customerEmail) {
    throw new Error('Set REGISTRATION_ID and CUSTOMER_EMAIL environment variables');
  }

  if (!isStripeConfigured()) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }

  await connectDatabase();

  const result = await createRegistrationCheckout(registrationId, customerEmail);

  console.log('Stripe test checkout created:');
  console.log(`  paymentId: ${result.paymentId}`);
  console.log(`  sessionId: ${result.stripeSessionId}`);
  console.log(`  checkoutUrl: ${result.checkoutUrl}`);
  console.log('');
  console.log('Forward webhooks locally:');
  console.log('  stripe listen --forward-to localhost:3001/api/webhooks/stripe');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
