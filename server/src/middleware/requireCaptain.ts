import { Request, Response, NextFunction } from 'express';
import { User } from '../models';
import type { IUser } from '../models/User';
import { extractAuth0Sub, extractAuthEmail, extractAuthName } from './auth';
import { createError } from './errorHandler';
import { activateCaptainFromAuth } from '../services/leagues/captainActivation';

export type CaptainRequest = Request & {
  captainUser?: IUser;
};

export async function requireCaptain(
  req: CaptainRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const auth0Sub = extractAuth0Sub(req);

    if (!auth0Sub) {
      next(createError('Unauthorized', 401));
      return;
    }

    let user = await User.findOne({ auth0Sub });

    if (!user) {
      const email = extractAuthEmail(req);

      if (email) {
        try {
          await activateCaptainFromAuth({
            auth0Sub,
            email,
            name: extractAuthName(req),
          });
          user = await User.findOne({ auth0Sub });
        } catch {
          // Invited captains must activate via email match; fall through to 403.
        }
      }
    }

    if (!user) {
      next(createError('Forbidden — account not registered', 403));
      return;
    }

    if (user.role !== 'captain') {
      next(createError('Forbidden — captain access only', 403));
      return;
    }

    if (!user.playerId) {
      next(createError('Forbidden — captain account is missing player link', 403));
      return;
    }

    req.captainUser = user;
    next();
  } catch (error) {
    next(error);
  }
}
