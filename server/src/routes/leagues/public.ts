import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { isSport, type Sport } from '../../constants/leagues';
import { asyncHandler, createError } from '../../middleware/errorHandler';
import { Division, League, Match, SiteSettings, Team } from '../../models';
import {
  collectMatchParticipantIds,
  formatMatchSides,
  loadParticipantNameMaps,
} from '../../services/leagues/matchLabels';
import { poolHandicapBadge } from '../../services/leagues/poolHandicap';
import { buildPublicRegistrationInfo, listOpenRegistrations } from '../../services/leagues/registration';
import { assertLeagueIsPublic, getEnabledSports } from '../../services/leagues/publicLeague';
import { getStandingsViews } from '../../services/leagues/standings';

const router = Router();

async function assertLeagueIsPublicLeague(league: { sport: Sport; status: string }): Promise<void> {
  await assertLeagueIsPublic(league);
}

router.get(
  '/',
  asyncHandler(async (_req, res: Response) => {
    const settings = await SiteSettings.findOne().lean();
    const enabledSports = settings ? getEnabledSports(settings) : [];

    if (enabledSports.length === 0) {
      res.json({ data: [], meta: { count: 0 } });
      return;
    }

    const leagues = await League.find({
      sport: { $in: enabledSports },
      status: { $in: ['active', 'completed'] },
    })
      .sort({ seasonStart: -1 })
      .lean();

    res.json({ data: leagues, meta: { count: leagues.length } });
  })
);

router.get(
  '/registration-open',
  asyncHandler(async (_req, res: Response) => {
    const data = await listOpenRegistrations();
    res.json({ data, meta: { count: data.length } });
  })
);

router.get(
  '/:leagueId',
  asyncHandler(async (req, res: Response) => {
    const { leagueId } = req.params;

    if (!mongoose.isValidObjectId(leagueId)) {
      throw createError('Invalid league id', 400);
    }

    const league = await League.findById(leagueId).lean();

    if (!league) {
      throw createError('League not found', 404);
    }

    await assertLeagueIsPublicLeague(league);

    const [divisionCount, teamCount] = await Promise.all([
      Division.countDocuments({ leagueId }),
      Team.countDocuments({ leagueId }),
    ]);

    res.json({
      data: {
        ...league,
        divisionCount,
        teamCount,
      },
    });
  })
);

router.get(
  '/:leagueId/divisions',
  asyncHandler(async (req, res: Response) => {
    const { leagueId } = req.params;

    if (!mongoose.isValidObjectId(leagueId)) {
      throw createError('Invalid league id', 400);
    }

    const league = await League.findById(leagueId).lean();

    if (!league) {
      throw createError('League not found', 404);
    }

    await assertLeagueIsPublicLeague(league);

    const divisions = await Division.find({ leagueId })
      .sort({ order: 1 })
      .select('_id name order')
      .lean();

    res.json({
      data: divisions.map((division) => ({
        _id: String(division._id),
        name: division.name,
        order: division.order,
      })),
      meta: { count: divisions.length },
    });
  })
);

router.get(
  '/:leagueId/registration',
  asyncHandler(async (req, res: Response) => {
    const { leagueId } = req.params;

    if (!mongoose.isValidObjectId(leagueId)) {
      throw createError('Invalid league id', 400);
    }

    const league = await League.findById(leagueId).lean();

    if (!league) {
      throw createError('League not found', 404);
    }

    await assertLeagueIsPublicLeague(league);

    const data = await buildPublicRegistrationInfo(league);
    res.json({ data });
  })
);

router.get(
  '/:leagueId/standings',
  asyncHandler(async (req, res: Response) => {
    const { leagueId } = req.params;
    const divisionId = req.query.divisionId as string | undefined;

    if (!mongoose.isValidObjectId(leagueId)) {
      throw createError('Invalid league id', 400);
    }

    if (divisionId && !mongoose.isValidObjectId(divisionId)) {
      throw createError('Invalid divisionId', 400);
    }

    const league = await League.findById(leagueId);

    if (!league) {
      throw createError('League not found', 404);
    }

    await assertLeagueIsPublicLeague(league);

    const data = await getStandingsViews(leagueId, divisionId);
    res.json({ data, meta: { count: data.length } });
  })
);

router.get(
  '/:leagueId/matches',
  asyncHandler(async (req, res: Response) => {
    const { leagueId } = req.params;
    const divisionId = req.query.divisionId as string | undefined;

    if (!mongoose.isValidObjectId(leagueId)) {
      throw createError('Invalid league id', 400);
    }

    const league = await League.findById(leagueId);

    if (!league) {
      throw createError('League not found', 404);
    }

    await assertLeagueIsPublicLeague(league);

    const filter: Record<string, unknown> = {
      leagueId,
      status: { $ne: 'cancelled' },
    };

    if (divisionId) {
      if (!mongoose.isValidObjectId(divisionId)) {
        throw createError('Invalid divisionId', 400);
      }
      filter.divisionId = divisionId;
    }

    const matches = await Match.find(filter)
      .sort({ roundNumber: 1, scheduledAt: 1 })
      .lean();

    const divisionIds = new Set<string>();
    for (const match of matches) {
      divisionIds.add(String(match.divisionId));
    }

    const { teamIds, playerIds } = collectMatchParticipantIds(matches);
    const [{ teamNameById, playerNameById }, divisions] = await Promise.all([
      loadParticipantNameMaps(teamIds, playerIds),
      Division.find({ _id: { $in: [...divisionIds] } })
        .select('_id name handicapRules')
        .lean(),
    ]);

    const divisionNameById = Object.fromEntries(
      divisions.map((division) => [String(division._id), division.name])
    );
    const handicapLabelByDivisionId = Object.fromEntries(
      divisions.map((division) => [
        String(division._id),
        poolHandicapBadge(division.handicapRules),
      ])
    );

    const data = matches.map((match) => {
      const poolMatch =
        league.sport === 'pool'
          ? (match as { poolFormat?: '8_ball' | '9_ball'; raceTo?: number })
          : undefined;
      const sides = formatMatchSides(match, teamNameById, playerNameById);

      return {
        _id: match._id,
        roundNumber: match.roundNumber,
        scheduledAt: match.scheduledAt,
        status: match.status,
        divisionId: match.divisionId,
        divisionName: divisionNameById[String(match.divisionId)] ?? 'Division',
        ...sides,
        ...(poolMatch?.poolFormat ? { poolFormat: poolMatch.poolFormat } : {}),
        ...(poolMatch?.raceTo ? { raceTo: poolMatch.raceTo } : {}),
        ...(handicapLabelByDivisionId[String(match.divisionId)]
          ? { handicapLabel: handicapLabelByDivisionId[String(match.divisionId)] }
          : {}),
        result: match.result
          ? {
              homeScore: match.result.homeScore,
              awayScore: match.result.awayScore,
              winnerTeamId: match.result.winnerTeamId
                ? String(match.result.winnerTeamId)
                : undefined,
              winnerPlayerId: match.result.winnerPlayerId
                ? String(match.result.winnerPlayerId)
                : undefined,
            }
          : undefined,
      };
    });

    res.json({ data, meta: { count: data.length } });
  })
);

export default router;
