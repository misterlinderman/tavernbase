import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { contactRateLimit } from '../middleware/rateLimit';
import { ContactMessage } from '../models/ContactMessage';

const router = Router();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

router.post(
  '/',
  contactRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    const { email, phone, message } = req.body as {
      email?: string;
      phone?: string;
      message?: string;
    };

    const trimmedEmail = email?.trim().toLowerCase() ?? '';
    const trimmedPhone = phone?.trim() ?? '';
    const trimmedMessage = message?.trim() ?? '';

    if (!trimmedEmail) {
      throw createError('Email is required', 400);
    }

    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      throw createError('Please enter a valid email address', 400);
    }

    if (!trimmedMessage) {
      throw createError('Message is required', 400);
    }

    await ContactMessage.create({
      email: trimmedEmail,
      phone: trimmedPhone || undefined,
      message: trimmedMessage,
      submitterIpHash: hashIp(req.ip || ''),
    });

    res.status(201).json({
      message: "Thanks — we'll get back to you soon.",
    });
  }),
);

export default router;
