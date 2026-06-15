import { Request, Response, NextFunction } from 'express';
import { User } from '../models';
import type { IUser } from '../models/User';
import { extractAuth0Sub, extractAuthEmail, extractAuthName } from './auth';
import { createError } from './errorHandler';
import { activatePlayerFromAuth } from '../services/leagues/playerActivation';

export type PlayerRequest = Request & {
  playerUser?: IUser;
};

export async function requirePlayer(
  req: PlayerRequest,
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
          await activatePlayerFromAuth({
            auth0Sub,
            email,
            name: extractAuthName(req),
          });
          user = await User.findOne({ auth0Sub });
        } catch {
          // Fall through to 403.
        }
      }
    }

    if (!user) {
      next(createError('Forbidden — account not registered', 403));
      return;
    }

    if (user.role !== 'player') {
      next(createError('Forbidden — player access only', 403));
      return;
    }

    if (!user.playerId) {
      next(createError('Forbidden — player account is missing profile link', 403));
      return;
    }

    req.playerUser = user;
    next();
  } catch (error) {
    next(error);
  }
}
