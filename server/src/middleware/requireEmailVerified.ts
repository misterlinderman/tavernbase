import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { League } from '../models';
import { resolveLeagueRegistration } from '../services/leagues/registration';
import { shouldBlockUnverifiedPaidRegistration } from '../utils/registrationEmailVerification';
import { extractEmailVerified } from './auth';
import { createError } from './errorHandler';

export { shouldBlockUnverifiedPaidRegistration } from '../utils/registrationEmailVerification';

export async function requireEmailVerifiedForRegistration(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const emailVerified = extractEmailVerified(req);

    if (emailVerified !== false) {
      next();
      return;
    }

    const { leagueId } = req.params;

    if (!leagueId || !mongoose.isValidObjectId(leagueId)) {
      next(createError('Invalid league id', 400));
      return;
    }

    const league = await League.findById(leagueId).select('registration').lean();
    const entryFeeCents = resolveLeagueRegistration(league?.registration).entryFeeCents ?? 0;

    if (shouldBlockUnverifiedPaidRegistration(emailVerified, entryFeeCents)) {
      next(
        createError(
          'Verify your email address before registering for a paid session. Check your inbox for the Auth0 verification link, then sign in again.',
          403
        )
      );
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
}
