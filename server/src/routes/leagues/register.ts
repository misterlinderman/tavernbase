import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { checkJwt, extractAuth0Sub, extractAuthEmail, extractAuthName } from '../../middleware/auth';
import { requireEmailVerifiedForRegistration } from '../../middleware/requireEmailVerified';
import { asyncHandler, createError } from '../../middleware/errorHandler';
import { League } from '../../models';
import { assertLeagueIsPublic } from '../../services/leagues/publicLeague';
import {
  getReturningTeamRegistrationPreview,
  parseReturningTeamRegistrationBody,
  submitReturningTeamRegistration,
} from '../../services/leagues/returningTeamRegistration';
import {
  ensureRegistrantPlayer,
  parseTeamRegistrationBody,
  submitTeamRegistration,
} from '../../services/leagues/teamRegistration';
import {
  parsePlayerRegistrationBody,
  submitPlayerRegistration,
} from '../../services/leagues/playerRegistration';
import {
  getRegistrationStatusForOwner,
  retryRegistrationCheckout,
} from '../../services/leagues/registrationOwner';

const router = Router();

function mapRegistrationOwnerError(error: unknown): never {
  const message = error instanceof Error ? error.message : 'Request failed';

  if (message === 'Unauthorized') {
    throw createError('Unauthorized', 401);
  }

  if (message === 'Registration not found') {
    throw createError(message, 404);
  }

  if (
    message === 'Invalid registration id' ||
    message.includes('not awaiting payment') ||
    message.includes('does not require payment') ||
    message.includes('already paid')
  ) {
    throw createError(message, 400);
  }

  if (message.includes('Stripe is not configured')) {
    throw createError('Online payment is not available right now', 503);
  }

  throw createError(message, 400);
}

async function respondWithRegistrationStatus(
  req: Parameters<typeof extractAuth0Sub>[0],
  res: Response,
  registrationId: string
): Promise<void> {
  const auth0Sub = extractAuth0Sub(req);
  const email = extractAuthEmail(req);

  if (!auth0Sub) {
    throw createError('Unauthorized', 401);
  }

  if (!email) {
    throw createError('Email not found in your login', 400);
  }

  try {
    const data = await getRegistrationStatusForOwner(registrationId, auth0Sub, email);
    res.json({ data });
  } catch (error) {
    mapRegistrationOwnerError(error);
  }
}

router.get(
  '/registrations/:id',
  checkJwt,
  asyncHandler(async (req, res: Response) => {
    await respondWithRegistrationStatus(req, res, req.params.id);
  })
);

router.get(
  '/registrations/:id/status',
  checkJwt,
  asyncHandler(async (req, res: Response) => {
    await respondWithRegistrationStatus(req, res, req.params.id);
  })
);

router.post(
  '/registrations/:id/checkout',
  checkJwt,
  requireEmailVerifiedForRegistration,
  asyncHandler(async (req, res: Response) => {
    const auth0Sub = extractAuth0Sub(req);
    const email = extractAuthEmail(req);

    if (!auth0Sub) {
      throw createError('Unauthorized', 401);
    }

    if (!email) {
      throw createError('Email not found in your login', 400);
    }

    try {
      const data = await retryRegistrationCheckout(req.params.id, auth0Sub, email);
      res.json({ data });
    } catch (error) {
      mapRegistrationOwnerError(error);
    }
  })
);

router.get(
  '/team/:leagueId/returning/preview',
  checkJwt,
  asyncHandler(async (req, res: Response) => {
    const auth0Sub = extractAuth0Sub(req);
    const email = extractAuthEmail(req);
    const priorTeamId = req.query.priorTeamId as string | undefined;

    if (!auth0Sub) {
      throw createError('Unauthorized', 401);
    }

    if (!email) {
      throw createError('Email not found in your login', 400);
    }

    if (!priorTeamId || !mongoose.isValidObjectId(priorTeamId)) {
      throw createError('priorTeamId is required', 400);
    }

    if (!mongoose.isValidObjectId(req.params.leagueId)) {
      throw createError('Invalid league id', 400);
    }

    try {
      const { player } = await ensureRegistrantPlayer({
        auth0Sub,
        email,
        name: extractAuthName(req),
      });

      const data = await getReturningTeamRegistrationPreview({
        targetLeagueId: req.params.leagueId,
        priorTeamId,
        captainPlayerId: player._id,
      });

      res.json({ data });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load returning registration';
      const status = message.includes('Forbidden') ? 403 : 400;
      throw createError(message, status);
    }
  })
);

router.post(
  '/team/:leagueId/returning',
  checkJwt,
  requireEmailVerifiedForRegistration,
  asyncHandler(async (req, res: Response) => {
    const { leagueId } = req.params;
    const auth0Sub = extractAuth0Sub(req);
    const email = extractAuthEmail(req);

    if (!auth0Sub) {
      throw createError('Unauthorized', 401);
    }

    if (!email) {
      throw createError(
        'Email not found in your login. Sign in with the email you want on the team roster.',
        400
      );
    }

    if (!mongoose.isValidObjectId(leagueId)) {
      throw createError('Invalid league id', 400);
    }

    let body;

    try {
      body = parseReturningTeamRegistrationBody(req.body);
    } catch (error) {
      throw createError(error instanceof Error ? error.message : 'Invalid registration', 400);
    }

    try {
      const data = await submitReturningTeamRegistration({
        leagueId,
        auth0Sub,
        email,
        name: extractAuthName(req),
        ...body,
      });

      res.status(201).json({ data });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not submit registration';
      const status =
        message.includes('not open') ||
        message.includes('closed') ||
        message.includes('Forbidden')
          ? 403
          : 400;
      throw createError(message, status);
    }
  })
);

router.post(
  '/team/:leagueId',
  checkJwt,
  requireEmailVerifiedForRegistration,
  asyncHandler(async (req, res: Response) => {
    const { leagueId } = req.params;
    const auth0Sub = extractAuth0Sub(req);
    const email = extractAuthEmail(req);

    if (!auth0Sub) {
      throw createError('Unauthorized', 401);
    }

    if (!email) {
      throw createError(
        'Email not found in your login. Sign in with the email you want on the team roster.',
        400
      );
    }

    if (!mongoose.isValidObjectId(leagueId)) {
      throw createError('Invalid league id', 400);
    }

    const league = await League.findById(leagueId).lean();

    if (!league) {
      throw createError('League not found', 404);
    }

    await assertLeagueIsPublic(league);

    let body;

    try {
      body = parseTeamRegistrationBody(req.body);
    } catch (error) {
      throw createError(error instanceof Error ? error.message : 'Invalid registration', 400);
    }

    try {
      const data = await submitTeamRegistration({
        leagueId,
        auth0Sub,
        email,
        name: extractAuthName(req),
        ...body,
      });

      res.status(201).json({ data });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not submit registration';
      const status = message.includes('not open') || message.includes('closed') ? 403 : 400;
      throw createError(message, status);
    }
  })
);

router.post(
  '/player/:leagueId',
  checkJwt,
  requireEmailVerifiedForRegistration,
  asyncHandler(async (req, res: Response) => {
    const { leagueId } = req.params;
    const auth0Sub = extractAuth0Sub(req);
    const email = extractAuthEmail(req);

    if (!auth0Sub) {
      throw createError('Unauthorized', 401);
    }

    if (!email) {
      throw createError(
        'Email not found in your login. Sign in with the email you want on the entry list.',
        400
      );
    }

    if (!mongoose.isValidObjectId(leagueId)) {
      throw createError('Invalid league id', 400);
    }

    const league = await League.findById(leagueId).lean();

    if (!league) {
      throw createError('League not found', 404);
    }

    await assertLeagueIsPublic(league);

    let body;

    try {
      body = parsePlayerRegistrationBody(req.body);
    } catch (error) {
      throw createError(error instanceof Error ? error.message : 'Invalid registration', 400);
    }

    try {
      const data = await submitPlayerRegistration({
        leagueId,
        auth0Sub,
        email,
        name: extractAuthName(req),
        ...body,
      });

      res.status(201).json({ data });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not submit registration';
      const status = message.includes('not open') || message.includes('closed') ? 403 : 400;
      throw createError(message, status);
    }
  })
);

export default router;
