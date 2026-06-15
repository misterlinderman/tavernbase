import { Router, Response } from 'express';
import type { Sport } from '../../constants/leagues';
import type { IMatch } from '../../models/leagues/Match';
import mongoose from 'mongoose';
import { checkJwt, extractAuth0Sub, extractAuthEmail, extractAuthName } from '../../middleware/auth';
import { CaptainRequest, requireCaptain } from '../../middleware/requireCaptain';
import { asyncHandler, createError } from '../../middleware/errorHandler';
import { Division, League, Match, Player, Scoresheet, Team } from '../../models';
import {
  captainSideForTeam,
} from '../../services/leagues/scoresheet';
import { isPlayerMatch } from '../../services/leagues/matchLabels';
import { getScoresheetValidator } from '../../services/leagues/scoresheets';
import { submitMatchScoresheet } from '../../services/leagues/submitScoresheet';
import { resolveVolleyballSetsToWin } from '../../services/leagues/scoresheets/volleyball';
import { activateCaptainFromAuth } from '../../services/leagues/captainActivation';

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
        'Email not found in your login. Use the same email address your league manager invited.',
        400
      );
    }

    try {
      const user = await activateCaptainFromAuth({
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
        error instanceof Error ? error.message : 'Could not activate captain account';
      throw createError(message, 403);
    }
  })
);

router.use(checkJwt, requireCaptain);

async function getCaptainTeams(playerId: mongoose.Types.ObjectId) {
  return Team.find({ captainPlayerId: playerId }).lean();
}

async function enrichCaptainMatch(
  match: Record<string, unknown>,
  playerId: mongoose.Types.ObjectId,
  teamIds: mongoose.Types.ObjectId[]
) {
  const homeTeamId = new mongoose.Types.ObjectId(String(match.homeTeamId));
  const awayTeamId = new mongoose.Types.ObjectId(String(match.awayTeamId));

  const [homeTeam, awayTeam, division, league, sheets] = await Promise.all([
    Team.findById(homeTeamId).select('name captainPlayerId').lean(),
    Team.findById(awayTeamId).select('name captainPlayerId').lean(),
    Division.findById(match.divisionId).select('name').lean(),
    League.findById(match.leagueId).select('name sport').lean(),
    Scoresheet.find({ matchId: match._id }).lean(),
  ]);

  const myTeam = teamIds.find(
    (teamId) => teamId.equals(homeTeamId) || teamId.equals(awayTeamId)
  );

  const mySide = myTeam ? captainSideForTeam({ homeTeamId, awayTeamId }, myTeam) : null;
  const homeSheet = sheets.find((sheet) => sheet.submittedBy === 'home');
  const awaySheet = sheets.find((sheet) => sheet.submittedBy === 'away');
  const mySheet = mySide === 'home' ? homeSheet : mySide === 'away' ? awaySheet : undefined;
  const opponentSheet = mySide === 'home' ? awaySheet : mySide === 'away' ? homeSheet : undefined;

  let submissionState: 'awaiting_you' | 'awaiting_opponent' | 'disputed' | 'final' | 'scheduled' =
    'scheduled';

  if (match.status === 'final') {
    submissionState = 'final';
  } else if (homeSheet?.status === 'disputed' || awaySheet?.status === 'disputed') {
    submissionState = 'disputed';
  } else if (!mySheet || mySheet.status === 'draft') {
    submissionState = opponentSheet?.status === 'submitted' ? 'awaiting_you' : 'scheduled';
  } else {
    submissionState = 'awaiting_opponent';
  }

  const canSubmit =
    match.status !== 'final' &&
    match.status !== 'cancelled' &&
    mySide !== null &&
    (!mySheet || mySheet.status === 'draft');

  return {
    ...match,
    leagueName: league?.name ?? 'League',
    sport: (match.sport as Sport | undefined) ?? league?.sport,
    setsToWin:
      ((match.sport as string) ?? league?.sport) === 'volleyball'
        ? resolveVolleyballSetsToWin(match as unknown as IMatch)
        : undefined,
    divisionName: division?.name ?? 'Division',
    homeTeamName: homeTeam?.name ?? 'Home',
    awayTeamName: awayTeam?.name ?? 'Away',
    mySide,
    submissionState,
    canSubmit,
    scoresheets: {
      home: homeSheet ?? null,
      away: awaySheet ?? null,
    },
  };
}

router.get(
  '/me',
  asyncHandler(async (req: CaptainRequest, res: Response) => {
    const user = req.captainUser!;
    const player = await Player.findById(user.playerId).lean();
    const teams = await getCaptainTeams(user.playerId!);

    res.json({
      data: {
        name: user.name,
        email: user.email,
        playerId: user.playerId,
        playerName: player?.name ?? user.name,
        teams: teams.map((team) => ({ _id: team._id, name: team.name, leagueId: team.leagueId })),
      },
    });
  })
);

router.get(
  '/matches',
  asyncHandler(async (req: CaptainRequest, res: Response) => {
    const user = req.captainUser!;
    const teams = await getCaptainTeams(user.playerId!);
    const teamIds = teams.map((team) => team._id);

    if (teamIds.length === 0) {
      res.json({ data: [], meta: { count: 0 } });
      return;
    }

    const status = (req.query.status as string) || 'open';
    const statusFilter =
      status === 'all'
        ? {}
        : status === 'final'
          ? { status: 'final' }
          : { status: { $in: ['scheduled', 'in_progress'] } };

    const matches = await Match.find({
      ...statusFilter,
      $or: [{ homeTeamId: { $in: teamIds } }, { awayTeamId: { $in: teamIds } }],
    })
      .sort({ scheduledAt: 1 })
      .lean();

    const data = await Promise.all(
      matches.map((match) => enrichCaptainMatch(match, user.playerId!, teamIds))
    );

    res.json({ data, meta: { count: data.length } });
  })
);

router.get(
  '/matches/:matchId',
  asyncHandler(async (req: CaptainRequest, res: Response) => {
    const user = req.captainUser!;

    if (!mongoose.isValidObjectId(req.params.matchId)) {
      throw createError('Invalid match id', 400);
    }

    const teams = await getCaptainTeams(user.playerId!);
    const teamIds = teams.map((team) => team._id);

    const match = await Match.findById(req.params.matchId).lean();

    if (!match) {
      throw createError('Match not found', 404);
    }

    const isParticipant = teamIds.some(
      (teamId) =>
        (match.homeTeamId && teamId.equals(match.homeTeamId)) ||
        (match.awayTeamId && teamId.equals(match.awayTeamId))
    );

    if (!isParticipant) {
      throw createError('Forbidden — not your team match', 403);
    }

    const data = await enrichCaptainMatch(match, user.playerId!, teamIds);
    res.json({ data });
  })
);

router.post(
  '/matches/:matchId/scoresheet',
  asyncHandler(async (req: CaptainRequest, res: Response) => {
    const user = req.captainUser!;

    if (!mongoose.isValidObjectId(req.params.matchId)) {
      throw createError('Invalid match id', 400);
    }

    const match = await Match.findById(req.params.matchId);

    if (!match) {
      throw createError('Match not found', 404);
    }

    if (match.status === 'final' || match.status === 'cancelled') {
      throw createError('This match is closed for score entry', 400);
    }

    if (isPlayerMatch(match)) {
      throw createError('Use the player portal for individual matches', 403);
    }

    const teams = await getCaptainTeams(user.playerId!);
    const myTeam = teams.find(
      (team) =>
        (match.homeTeamId && team._id.equals(match.homeTeamId)) ||
        (match.awayTeamId && team._id.equals(match.awayTeamId))
    );

    if (!myTeam) {
      throw createError('Forbidden — not your team match', 403);
    }

    const side = captainSideForTeam(match, myTeam._id);

    if (!side) {
      throw createError('Could not determine home or away side', 400);
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
      const result = await submitMatchScoresheet(match, user.playerId!, side, payload);
      res.status(result.created ? 201 : 200).json({ data: result });
    } catch (error) {
      throw createError(error instanceof Error ? error.message : 'Could not submit scoresheet', 400);
    }
  })
);

export default router;
