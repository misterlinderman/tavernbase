import crypto from 'crypto';
import { Router, Request, Response, NextFunction } from 'express';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { uploadMiddleware } from '../middleware/upload';
import { submissionRateLimit } from '../middleware/rateLimit';
import { processAndUpload } from '../services/imagePipeline';
import { getPhotoConsentText } from '../config/establishment';
import { Submission } from '../models';

const router = Router();

function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

function handleUpload(req: Request, res: Response, next: NextFunction): void {
  uploadMiddleware.single('photo')(req, res, (err: unknown) => {
    if (err instanceof Error) {
      next(createError(err.message, 400));
      return;
    }
    if (err) {
      next(err);
      return;
    }
    next();
  });
}

router.post(
  '/',
  submissionRateLimit,
  handleUpload,
  asyncHandler(async (req: Request, res: Response) => {
    const { submitterName, caption, consent } = req.body as {
      submitterName?: string;
      caption?: string;
      consent?: string | boolean;
    };

    if (consent !== 'true' && consent !== true) {
      throw createError('Consent is required', 400);
    }

    if (!submitterName?.trim()) {
      throw createError('Submitter name is required', 400);
    }

    if (!req.file) {
      throw createError('A photo is required', 400);
    }

    const { imageUrl, thumbnailUrl, cloudinaryPublicId } = await processAndUpload(req.file.buffer);

    await Submission.create({
      submitterName: submitterName.trim(),
      caption: (caption || '').trim(),
      imageUrl,
      thumbnailUrl,
      cloudinaryPublicId,
      cloudinaryFolder: 'pending',
      status: 'pending',
      consent: true,
      consentText: getPhotoConsentText(),
      exifStripped: true,
      submitterIpHash: hashIp(req.ip || ''),
    });

    res.status(201).json({
      message: "Got it — a staff member will review your photo before it goes live.",
    });
  })
);

export default router;
