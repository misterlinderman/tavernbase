import { Router, Response } from 'express';
import express from 'express';
import { asyncHandler, createError } from '../../middleware/errorHandler';
import { constructWebhookEvent } from '../../services/payments/stripe';
import {
  handleStripeWebhookEvent,
  StripeWebhookError,
} from '../../services/payments/stripeWebhook';

const router = Router();

router.post(
  '/',
  express.raw({ type: 'application/json' }),
  asyncHandler(async (req, res: Response) => {
    const signature = req.headers['stripe-signature'];
    const rawBody = req.body;

    if (!Buffer.isBuffer(rawBody)) {
      throw createError('Stripe webhook requires raw request body', 400);
    }

    try {
      const event = constructWebhookEvent(rawBody, signature);
      await handleStripeWebhookEvent(event);
      res.json({ received: true });
    } catch (error) {
      if (error instanceof StripeWebhookError) {
        throw createError(error.message, error.statusCode);
      }

      const message = error instanceof Error ? error.message : 'Stripe webhook failed';
      throw createError(message, 400);
    }
  })
);

export default router;
