import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { checkJwt, extractAuth0Sub, extractAuthEmail, extractAuthName } from '../../middleware/auth';
import { PlayerRequest, requirePlayer } from '../../middleware/requirePlayer';
import { asyncHandler, createError } from '../../middleware/errorHandler';
import type { IMatch } from '../../models/leagues/Match';
import { Match, Player } from '../../models';
import { activatePlayerFromAuth, playerBelongsToLeague } from '../../services/leagues/playerActivation';
import { getPlayerLeagueSummaries } from '../../services/leagues/playerLeagues';
import {
  assertPlayerMatchParticipant,
  enrichPlayerMatch,
  playerMatchParticipantFilter,
} from '../../services/leagues/playerMatches';
import { isPlayerMatch } from '../../services/leagues/matchLabels';
import { getScoresheetValidator } from '../../services/leagues/scoresheets';
import { submitMatchScoresheet } from '../../services/leagues/submitScoresheet';
import { getStandingsViews } from '../../services/leagues/standings';

const router = Router();

router.post(
  '/activate',
  checkJwt,
  asyncHandler(async (req, res: Response) => {
    const auth0Sub = extractAuth0Sub(req);
    const email = extractAuthEmail(req);

    if (!auth0Sub) {
      throw createError('Unauthorized', 401);
    }

    if (!email) {
      throw createError(
        'Email not found in your login. Use the same email address your league manager added.',
        400
      );
    }

    try {
      const user = await activatePlayerFromAuth({
        auth0Sub,
        email,
        name: extractAuthName(req),
      });

      res.json({
        data: {
          activated: true,
          playerId: user.playerId,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not activate player account';
      throw createError(message, 403);
    }
  })
);

router.use(checkJwt, requirePlayer);

router.get(
  '/me',
  asyncHandler(async (req: PlayerRequest, res: Response) => {
    const user = req.playerUser!;
    const player = await Player.findById(user.playerId).lean();
    const leagues = await getPlayerLeagueSummaries(user.playerId!);

    res.json({
      data: {
        name: user.name,
        email: user.email,
        playerId: user.playerId,
        playerName: player?.name ?? user.name,
        leagues,
      },
    });
  })
);

router.get(
  '/leagues',
  asyncHandler(async (req: PlayerRequest, res: Response) => {
    const data = await getPlayerLeagueSummaries(req.playerUser!.playerId!);
    res.json({ data, meta: { count: data.length } });
  })
);

router.get(
  '/leagues/:leagueId/standings',
  asyncHandler(async (req: PlayerRequest, res: Response) => {
    const { leagueId } = req.params;

    if (!mongoose.isValidObjectId(leagueId)) {
      throw createError('Invalid league id', 400);
    }

    const allowed = await playerBelongsToLeague(req.playerUser!.playerId!, leagueId);

    if (!allowed) {
      throw createError('Forbidden — you are not entered in this league', 403);
    }

    const views = await getStandingsViews(leagueId);
    const data = views.map((view) => ({
      ...view,
      divisionId: String(view.divisionId),
      computedAt: view.computedAt.toISOString(),
      entries: view.entries.map((entry) => ({
        ...entry,
        teamId: entry.teamId ? String(entry.teamId) : undefined,
        playerId: entry.playerId ? String(entry.playerId) : undefined,
      })),
    }));

    res.json({ data, meta: { count: data.length } });
  })
);

router.get(
  '/matches',
  asyncHandler(async (req: PlayerRequest, res: Response) => {
    const playerId = req.playerUser!.playerId!;
    const status = (req.query.status as string) || 'open';
    const statusFilter =
      status === 'all'
        ? {}
        : status === 'final'
          ? { status: 'final' }
          : { status: { $in: ['scheduled', 'in_progress'] } };

    const matches = await Match.find({
      ...statusFilter,
      ...playerMatchParticipantFilter(playerId),
    })
      .sort({ scheduledAt: 1 })
      .lean();

    const data = await Promise.all(
      matches.map((match) => enrichPlayerMatch(match, playerId))
    );

    res.json({ data, meta: { count: data.length } });
  })
);

router.get(
  '/matches/:matchId',
  asyncHandler(async (req: PlayerRequest, res: Response) => {
    const playerId = req.playerUser!.playerId!;

    if (!mongoose.isValidObjectId(req.params.matchId)) {
      throw createError('Invalid match id', 400);
    }

    const match = await Match.findById(req.params.matchId).lean();

    if (!match || !isPlayerMatch(match)) {
      throw createError('Match not found', 404);
    }

    try {
      await assertPlayerMatchParticipant(match as unknown as IMatch, playerId);
    } catch (error) {
      throw createError(error instanceof Error ? error.message : 'Forbidden', 403);
    }

    const data = await enrichPlayerMatch(match, playerId);
    res.json({ data });
  })
);

router.post(
  '/matches/:matchId/scoresheet',
  asyncHandler(async (req: PlayerRequest, res: Response) => {
    const playerId = req.playerUser!.playerId!;

    if (!mongoose.isValidObjectId(req.params.matchId)) {
      throw createError('Invalid match id', 400);
    }

    const match = await Match.findById(req.params.matchId);

    if (!match || !isPlayerMatch(match)) {
      throw createError('Match not found', 404);
    }

    if (match.status === 'final' || match.status === 'cancelled') {
      throw createError('This match is closed for score entry', 400);
    }

    let side;

    try {
      side = await assertPlayerMatchParticipant(match, playerId);
    } catch (error) {
      throw createError(error instanceof Error ? error.message : 'Forbidden', 403);
    }

    let payload: Record<string, unknown>;

    try {
      payload = getScoresheetValidator(match.sport).validate(req.body?.payload ?? req.body, {
        match,
      });
    } catch (error) {
      throw createError(error instanceof Error ? error.message : 'Invalid scoresheet', 400);
    }

    try {
      const result = await submitMatchScoresheet(match, playerId, side, payload);
      res.status(result.created ? 201 : 200).json({ data: result });
    } catch (error) {
      throw createError(error instanceof Error ? error.message : 'Could not submit scoresheet', 400);
    }
  })
);

export default router;
