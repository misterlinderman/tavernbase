import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey);
  }

  return stripeClient;
}

function resolveClientOrigin(): string {
  return (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '');
}

function resolveSuccessUrl(): string {
  const configured = process.env.STRIPE_SUCCESS_URL?.trim();

  if (configured) {
    return configured.includes('{CHECKOUT_SESSION_ID}')
      ? configured
      : `${configured}${configured.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`;
  }

  return `${resolveClientOrigin()}/register/payment/success?session_id={CHECKOUT_SESSION_ID}`;
}

function resolveCancelUrl(): string {
  return process.env.STRIPE_CANCEL_URL?.trim() || `${resolveClientOrigin()}/register`;
}

export interface CreateCheckoutSessionInput {
  registrationId: string;
  amountCents: number;
  currency: string;
  customerEmail: string;
  metadata?: Record<string, string>;
  productName?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export async function createCheckoutSession(
  input: CreateCheckoutSessionInput
): Promise<Stripe.Checkout.Session> {
  if (input.amountCents <= 0) {
    throw new Error('Checkout amount must be greater than zero');
  }

  const stripe = getStripeClient();
  const currency = input.currency.trim().toLowerCase() || 'usd';

  return stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: input.customerEmail,
    line_items: [
      {
        price_data: {
          currency,
          unit_amount: input.amountCents,
          product_data: {
            name: input.productName || 'League registration',
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      registrationId: input.registrationId,
      ...input.metadata,
    },
    success_url: input.successUrl ?? resolveSuccessUrl(),
    cancel_url: input.cancelUrl ?? resolveCancelUrl(),
  });
}

export function constructWebhookEvent(rawBody: Buffer, signature: string | string[] | undefined): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }

  if (!signature || Array.isArray(signature)) {
    throw new Error('Missing Stripe-Signature header');
  }

  return getStripeClient().webhooks.constructEvent(rawBody, signature, webhookSecret);
}

export async function createRefund(paymentIntentId: string): Promise<Stripe.Refund> {
  const intentId = paymentIntentId.trim();

  if (!intentId) {
    throw new Error('Payment intent id is required');
  }

  return getStripeClient().refunds.create({ payment_intent: intentId });
}
