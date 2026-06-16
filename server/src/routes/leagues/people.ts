import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { isSport, type Sport } from '../../constants/leagues';
import { extractAuth0Sub } from '../../middleware/auth';
import { asyncHandler, createError } from '../../middleware/errorHandler';
import { User } from '../../models';
import type { PendingInviteRole } from '../../models/leagues/PendingInvite';
import {
  getPeopleDirectory,
  type PeopleLoginStatus,
} from '../../services/leagues/peopleDirectory';
import {
  createPlayerLoginInvite,
  isPlayerLoginLinked,
  linkPlayerLoginManual,
  resendPlayerLoginInvite,
  unlinkPlayerLogin,
} from '../../services/leagues/playerLoginLink';
import { InviteRateLimitError } from '../../services/leagues/inviteRateLimit';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res: Response) => {
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const role = req.query.role as string | undefined;
    const loginStatus = req.query.loginStatus as string | undefined;
    const sport = req.query.sport as string | undefined;
    const page = req.query.page ? Number(req.query.page) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    if (role && role !== 'captain' && role !== 'player' && role !== 'unlinked') {
      throw createError('role must be captain, player, or unlinked', 400);
    }

    const allowedLoginStatuses: PeopleLoginStatus[] = ['linked', 'invited', 'unlinked'];

    if (loginStatus && !allowedLoginStatuses.includes(loginStatus as PeopleLoginStatus)) {
      throw createError('loginStatus must be linked, invited, or unlinked', 400);
    }

    if (sport && !isSport(sport)) {
      throw createError('Invalid sport filter', 400);
    }

    if (page !== undefined && (!Number.isInteger(page) || page < 1)) {
      throw createError('page must be a positive integer', 400);
    }

    if (limit !== undefined && (!Number.isInteger(limit) || limit < 1)) {
      throw createError('limit must be a positive integer', 400);
    }

    const result = await getPeopleDirectory({
      q,
      role: role as 'captain' | 'player' | 'unlinked' | undefined,
      loginStatus: loginStatus as PeopleLoginStatus | undefined,
      sport: sport as Sport | undefined,
      page,
      limit,
    });

    res.json({
      data: result.entries,
      meta: result.meta,
    });
  })
);

router.post(
  '/:playerId/link-login',
  asyncHandler(async (req, res: Response) => {
    const { playerId } = req.params;

    if (!mongoose.isValidObjectId(playerId)) {
      throw createError('Invalid player id', 400);
    }

    const { mode, auth0Sub, email, name, role } = req.body as {
      mode?: 'invite' | 'manual';
      auth0Sub?: string;
      email?: string;
      name?: string;
      role?: PendingInviteRole;
    };

    if (mode !== 'invite' && mode !== 'manual') {
      throw createError('mode must be invite or manual', 400);
    }

    if (role !== 'captain' && role !== 'player') {
      throw createError('role must be captain or player', 400);
    }

    if (mode === 'manual') {
      const auth0SubClaim = extractAuth0Sub(req);
      const actor = auth0SubClaim ? await User.findOne({ auth0Sub: auth0SubClaim }) : null;

      if (!actor || actor.role !== 'manager') {
        throw createError('Manual Auth0 linking requires manager role', 403);
      }

      try {
        const user = await linkPlayerLoginManual({
          playerId,
          auth0Sub: auth0Sub ?? '',
          email: email ?? '',
          name: name ?? '',
          role,
        });

        res.status(201).json({ data: user.toObject() });
      } catch (error) {
        throw createError(error instanceof Error ? error.message : 'Could not link login', 400);
      }

      return;
    }

    const auth0SubClaim = extractAuth0Sub(req);
    const actor = auth0SubClaim ? await User.findOne({ auth0Sub: auth0SubClaim }) : null;

    try {
      const result = await createPlayerLoginInvite({
        playerId,
        email: email ?? '',
        role,
        invitedBy: actor?._id,
      });

      res.json({ data: result });
    } catch (error) {
      if (error instanceof InviteRateLimitError) {
        throw createError(error.message, 429);
      }

      throw createError(error instanceof Error ? error.message : 'Could not create invite', 400);
    }
  })
);

router.post(
  '/:playerId/resend-invite',
  asyncHandler(async (req, res: Response) => {
    const { playerId } = req.params;

    if (!mongoose.isValidObjectId(playerId)) {
      throw createError('Invalid player id', 400);
    }

    const { role } = req.body as { role?: PendingInviteRole };

    if (role !== 'captain' && role !== 'player') {
      throw createError('role must be captain or player', 400);
    }

    const auth0SubClaim = extractAuth0Sub(req);
    const actor = auth0SubClaim ? await User.findOne({ auth0Sub: auth0SubClaim }) : null;

    try {
      const result = await resendPlayerLoginInvite({
        playerId,
        role,
        invitedBy: actor?._id,
      });

      res.json({ data: result });
    } catch (error) {
      if (error instanceof InviteRateLimitError) {
        throw createError(error.message, 429);
      }

      throw createError(error instanceof Error ? error.message : 'Could not resend invite', 400);
    }
  })
);

router.delete(
  '/:playerId/link-login',
  asyncHandler(async (req, res: Response) => {
    const { playerId } = req.params;

    if (!mongoose.isValidObjectId(playerId)) {
      throw createError('Invalid player id', 400);
    }

    const linked = await isPlayerLoginLinked(playerId);

    if (!linked) {
      await unlinkPlayerLogin(playerId);
      res.json({ data: { unlinked: true } });
      return;
    }

    try {
      await unlinkPlayerLogin(playerId);
      res.json({ data: { unlinked: true } });
    } catch (error) {
      throw createError(error instanceof Error ? error.message : 'Could not unlink login', 400);
    }
  })
);

export default router;
