import { Router, Response } from 'express';
import mongoose from 'mongoose';
import {
  isEntrantType,
  isLeagueFormat,
  isLeagueKind,
  isLeagueStatus,
  isPoolFormat,
  isSport,
  DEFAULT_POOL_PLAYER_RACE_TO,
  type EntrantType,
  type LeagueFormat,
  type LeagueKind,
  type LeagueStatus,
  type PoolFormat,
  type Sport,
} from '../../constants/leagues';
import { assertSportLicensed } from '../../config/establishment';
import { checkJwt, extractAuth0Sub } from '../../middleware/auth';
import { requireLeagueRead, requireLeagueWrite } from '../../middleware/requireLeagueAdmin';
import { asyncHandler, createError } from '../../middleware/errorHandler';
import {
  Division,
  League,
  Match,
  Player,
  PoolMatch,
  DartsMatch,
  VolleyballMatch,
  Scoresheet,
  StandingsSnapshot,
  Team,
  User,
} from '../../models';
import {
  finalizeMatchFromPayload,
} from '../../services/leagues/scoresheet';
import { getScoresheetValidator } from '../../services/leagues/scoresheets';
import {
  getStandingsViews,
  recomputeStandingsForDivision,
  recomputeStandingsForLeague,
} from '../../services/leagues/standings';
import { runCsvImport, type CsvImportType } from '../../services/leagues/import/csvImport';
import { parsePoolHandicapRules, type PoolHandicapRules } from '../../types/leagues';
import {
  generateRoundRobinPairings,
  parseMatchTime,
  scheduledAtForRound,
  type RoundRobinPairing,
} from '../../services/leagues/schedule/roundRobin';
import { generateLadderPairings } from '../../services/leagues/schedule/ladder';
import { generateBracketPairings } from '../../services/leagues/schedule/bracket';
import { buildCaptainInviteResult } from '../../services/leagues/captainInvite';
import { isCaptainPlayerLinked } from '../../services/leagues/captainActivation';
import {
  collectMatchParticipantIds,
  formatMatchSides,
  isPlayerMatch,
  loadParticipantNameMaps,
} from '../../services/leagues/matchLabels';
import {
  defaultPoolFormatForLeague,
  MAX_DIVISION_ENTRANTS,
  resolveEntrantType,
  resolveLeagueKind,
  validateLeagueFields,
} from '../../services/leagues/leagueValidation';
import { getLeaguesOverview } from '../../services/leagues/overview';

const router = Router();

const leagueReadGate = requireLeagueRead;
const leagueWriteGate = requireLeagueWrite;

router.use((req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD') {
    return leagueReadGate(req, res, next);
  }

  return leagueWriteGate(req, res, next);
});

function parseDate(value: unknown, field: string): Date {
  if (value === undefined || value === null || value === '') {
    throw createError(`${field} is required`, 400);
  }

  const parsed = new Date(String(value));

  if (Number.isNaN(parsed.getTime())) {
    throw createError(`Invalid ${field}`, 400);
  }

  return parsed;
}

async function getLeagueOrThrow(leagueId: string) {
  if (!mongoose.isValidObjectId(leagueId)) {
    throw createError('Invalid league id', 400);
  }

  const league = await League.findById(leagueId);

  if (!league) {
    throw createError('League not found', 404);
  }

  return league;
}

function assertPlayerEntrantLeague(league: { entrantType?: EntrantType }): void {
  if (resolveEntrantType(league.entrantType) !== 'player') {
    throw createError('This league uses team entrants, not division player lists', 400);
  }
}

async function getDivisionOrThrow(leagueId: string, divisionId: string) {
  if (!mongoose.isValidObjectId(divisionId)) {
    throw createError('Invalid division id', 400);
  }

  const division = await Division.findOne({ _id: divisionId, leagueId });

  if (!division) {
    throw createError('Division not found', 404);
  }

  return division;
}

function applyHandicapRulesUpdate(
  league: { sport: Sport },
  body: Record<string, unknown>,
  division: { handicapRules?: PoolHandicapRules }
): void {
  if (body.handicapRules === undefined) {
    return;
  }

  if (league.sport !== 'pool') {
    throw createError('handicapRules only applies to pool leagues', 400);
  }

  if (body.handicapRules === null) {
    division.handicapRules = undefined;
    return;
  }

  try {
    division.handicapRules = parsePoolHandicapRules(body.handicapRules);
  } catch (error) {
    throw createError(error instanceof Error ? error.message : 'Invalid handicapRules', 400);
  }
}

async function deleteLeagueCascade(leagueId: mongoose.Types.ObjectId): Promise<void> {
  const matchIds = await Match.find({ leagueId }).distinct('_id');

  await Promise.all([
    Scoresheet.deleteMany({ matchId: { $in: matchIds } }),
    Match.deleteMany({ leagueId }),
    StandingsSnapshot.deleteMany({ leagueId }),
    Team.deleteMany({ leagueId }),
    Division.deleteMany({ leagueId }),
    League.findByIdAndDelete(leagueId),
  ]);
}

// ─── Players (must be before /:leagueId routes) ───────────────────────────────

router.get(
  '/players',
  asyncHandler(async (_req, res: Response) => {
    const players = await Player.find().sort({ name: 1 }).lean();
    res.json({ data: players, meta: { count: players.length } });
  })
);

router.post(
  '/players',
  asyncHandler(async (req, res: Response) => {
    const { name, email, phone, establishmentSlug } = req.body as {
      name?: string;
      email?: string;
      phone?: string;
      establishmentSlug?: string;
    };

    if (!name?.trim()) {
      throw createError('name is required', 400);
    }

    const player = await Player.create({
      name: name.trim(),
      email: email?.trim() || undefined,
      phone: phone?.trim() || undefined,
      establishmentSlug: establishmentSlug?.trim() || 'default',
    });

    res.status(201).json({ data: player.toObject() });
  })
);

router.post(
  '/captain-users',
  asyncHandler(async (req, res: Response) => {
    const { auth0Sub, email, name, playerId } = req.body as {
      auth0Sub?: string;
      email?: string;
      name?: string;
      playerId?: string;
    };

    if (!auth0Sub?.trim() || !email?.trim() || !name?.trim()) {
      throw createError('auth0Sub, email, and name are required', 400);
    }

    if (!playerId || !mongoose.isValidObjectId(playerId)) {
      throw createError('playerId is required', 400);
    }

    const player = await Player.findById(playerId);

    if (!player) {
      throw createError('Player not found', 404);
    }

    const user = await User.findOneAndUpdate(
      { auth0Sub: auth0Sub.trim() },
      {
        auth0Sub: auth0Sub.trim(),
        email: email.trim().toLowerCase(),
        name: name.trim(),
        role: 'captain',
        playerId: player._id,
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    if (player.auth0Sub !== auth0Sub.trim()) {
      player.auth0Sub = auth0Sub.trim();
      await player.save();
    }

    res.status(201).json({ data: user.toObject() });
  })
);

router.post(
  '/player-users',
  asyncHandler(async (req, res: Response) => {
    const { auth0Sub, email, name, playerId } = req.body as {
      auth0Sub?: string;
      email?: string;
      name?: string;
      playerId?: string;
    };

    if (!auth0Sub?.trim() || !email?.trim() || !name?.trim()) {
      throw createError('auth0Sub, email, and name are required', 400);
    }

    if (!playerId || !mongoose.isValidObjectId(playerId)) {
      throw createError('playerId is required', 400);
    }

    const player = await Player.findById(playerId);

    if (!player) {
      throw createError('Player not found', 404);
    }

    const onRoster = await Team.exists({ playerIds: player._id });

    if (!onRoster) {
      throw createError('Add this player to a team roster before linking their login', 400);
    }

    const user = await User.findOneAndUpdate(
      { auth0Sub: auth0Sub.trim() },
      {
        auth0Sub: auth0Sub.trim(),
        email: email.trim().toLowerCase(),
        name: name.trim(),
        role: 'player',
        playerId: player._id,
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    if (player.auth0Sub !== auth0Sub.trim()) {
      player.auth0Sub = auth0Sub.trim();
      await player.save();
    }

    res.status(201).json({ data: user.toObject() });
  })
);

// ─── Leagues ─────────────────────────────────────────────────────────────────

router.get(
  '/overview',
  asyncHandler(async (_req, res: Response) => {
    const data = await getLeaguesOverview();
    res.json({ data });
  })
);

router.get(
  '/',
  asyncHandler(async (req, res: Response) => {
    const sport = req.query.sport as string | undefined;
    const filter: Record<string, unknown> = {};

    if (sport) {
      if (!isSport(sport)) {
        throw createError('Invalid sport filter', 400);
      }
      filter.sport = sport;
    }

    const leagues = await League.find(filter).sort({ seasonStart: -1 }).lean();
    res.json({ data: leagues, meta: { count: leagues.length } });
  })
);

router.post(
  '/',
  asyncHandler(async (req, res: Response) => {
    const { sport, name, seasonStart, seasonEnd, format, status, poolFormat, kind, entrantType } =
      req.body as {
        sport?: Sport;
        name?: string;
        seasonStart?: string;
        seasonEnd?: string;
        format?: LeagueFormat;
        status?: LeagueStatus;
        poolFormat?: PoolFormat;
        kind?: LeagueKind;
        entrantType?: EntrantType;
      };

    if (!isSport(sport)) {
      throw createError('sport is required and must be pool, darts, or volleyball', 400);
    }

    assertSportLicensed(sport);

    if (!name?.trim()) {
      throw createError('name is required', 400);
    }

    const start = parseDate(seasonStart, 'seasonStart');
    const end = parseDate(seasonEnd, 'seasonEnd');

    if (end < start) {
      throw createError('seasonEnd must be on or after seasonStart', 400);
    }

    if (kind !== undefined && !isLeagueKind(kind)) {
      throw createError('Invalid kind', 400);
    }

    if (entrantType !== undefined && !isEntrantType(entrantType)) {
      throw createError('Invalid entrantType', 400);
    }

    const resolvedKind = resolveLeagueKind(kind);
    const resolvedEntrantType = resolveEntrantType(entrantType);
    const resolvedFormat = format ?? (resolvedKind === 'tournament' ? 'bracket' : 'round_robin');

    if (!isLeagueFormat(resolvedFormat)) {
      throw createError('Invalid format', 400);
    }

    if (status !== undefined && !isLeagueStatus(status)) {
      throw createError('Invalid status', 400);
    }

    if (poolFormat !== undefined && !isPoolFormat(poolFormat)) {
      throw createError('Invalid poolFormat', 400);
    }

    if (sport !== 'pool' && poolFormat !== undefined) {
      throw createError('poolFormat only applies to pool leagues', 400);
    }

    validateLeagueFields({
      kind: resolvedKind,
      entrantType: resolvedEntrantType,
      format: resolvedFormat,
      seasonStart: start,
      seasonEnd: end,
    });

    const resolvedPoolFormat = defaultPoolFormatForLeague(resolvedKind, sport, poolFormat);

    const league = await League.create({
      sport,
      name: name.trim(),
      seasonStart: start,
      seasonEnd: end,
      kind: resolvedKind,
      entrantType: resolvedEntrantType,
      format: resolvedFormat,
      status: status ?? 'draft',
      ...(resolvedPoolFormat !== undefined ? { poolFormat: resolvedPoolFormat } : {}),
    });

    res.status(201).json({ data: league.toObject() });
  })
);

router.get(
  '/:leagueId',
  asyncHandler(async (req, res: Response) => {
    const league = await getLeagueOrThrow(req.params.leagueId);
    const [divisionCount, teamCount] = await Promise.all([
      Division.countDocuments({ leagueId: league._id }),
      Team.countDocuments({ leagueId: league._id }),
    ]);

    res.json({
      data: {
        ...league.toObject(),
        divisionCount,
        teamCount,
      },
    });
  })
);

router.patch(
  '/:leagueId',
  asyncHandler(async (req, res: Response) => {
    const league = await getLeagueOrThrow(req.params.leagueId);
    const body = req.body as Record<string, unknown>;

    if (body.sport !== undefined) {
      if (!isSport(body.sport)) {
        throw createError('Invalid sport', 400);
      }
      assertSportLicensed(body.sport);
      league.sport = body.sport;
    }

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || !body.name.trim()) {
        throw createError('name must be a non-empty string', 400);
      }
      league.name = body.name.trim();
    }

    if (body.seasonStart !== undefined) {
      league.seasonStart = parseDate(body.seasonStart, 'seasonStart');
    }

    if (body.seasonEnd !== undefined) {
      league.seasonEnd = parseDate(body.seasonEnd, 'seasonEnd');
    }

    if (league.seasonEnd < league.seasonStart) {
      throw createError('seasonEnd must be on or after seasonStart', 400);
    }

    if (body.format !== undefined) {
      if (!isLeagueFormat(body.format)) {
        throw createError('Invalid format', 400);
      }
      league.format = body.format;
    }

    if (body.kind !== undefined) {
      if (!isLeagueKind(body.kind)) {
        throw createError('Invalid kind', 400);
      }
      league.kind = body.kind;
    }

    if (body.entrantType !== undefined) {
      if (!isEntrantType(body.entrantType)) {
        throw createError('Invalid entrantType', 400);
      }
      league.entrantType = body.entrantType;
    }

    validateLeagueFields({
      kind: resolveLeagueKind(league.kind),
      entrantType: resolveEntrantType(league.entrantType),
      format: league.format,
      seasonStart: league.seasonStart,
      seasonEnd: league.seasonEnd,
    });

    if (body.status !== undefined) {
      if (!isLeagueStatus(body.status)) {
        throw createError('Invalid status', 400);
      }
      league.status = body.status;
    }

    if (body.poolFormat !== undefined) {
      if (!isPoolFormat(body.poolFormat)) {
        throw createError('Invalid poolFormat', 400);
      }

      if (league.sport !== 'pool') {
        throw createError('poolFormat only applies to pool leagues', 400);
      }

      league.poolFormat = body.poolFormat;
    }

    if (league.sport === 'pool') {
      league.poolFormat =
        defaultPoolFormatForLeague(resolveLeagueKind(league.kind), league.sport, league.poolFormat) ??
        league.poolFormat;
    } else {
      league.poolFormat = undefined;
    }

    await league.save();
    res.json({ data: league.toObject() });
  })
);

router.delete(
  '/:leagueId',
  asyncHandler(async (req, res: Response) => {
    const league = await getLeagueOrThrow(req.params.leagueId);
    await deleteLeagueCascade(league._id);
    res.json({ data: { id: league._id } });
  })
);

// ─── Divisions ───────────────────────────────────────────────────────────────

router.get(
  '/:leagueId/divisions',
  asyncHandler(async (req, res: Response) => {
    await getLeagueOrThrow(req.params.leagueId);

    const divisions = await Division.find({ leagueId: req.params.leagueId })
      .sort({ order: 1, name: 1 })
      .lean();

    res.json({ data: divisions, meta: { count: divisions.length } });
  })
);

router.post(
  '/:leagueId/divisions',
  asyncHandler(async (req, res: Response) => {
    const league = await getLeagueOrThrow(req.params.leagueId);

    const { name, order, handicapRules } = req.body as {
      name?: string;
      order?: number;
      handicapRules?: unknown;
    };

    if (!name?.trim()) {
      throw createError('name is required', 400);
    }

    const divisionPayload: {
      leagueId: string;
      name: string;
      order: number;
      handicapRules?: PoolHandicapRules;
    } = {
      leagueId: req.params.leagueId,
      name: name.trim(),
      order: typeof order === 'number' ? order : 0,
    };

    if (handicapRules !== undefined) {
      applyHandicapRulesUpdate(league, { handicapRules }, divisionPayload);
    }

    const division = await Division.create(divisionPayload);

    res.status(201).json({ data: division.toObject() });
  })
);

router.patch(
  '/:leagueId/divisions/:divisionId',
  asyncHandler(async (req, res: Response) => {
    const league = await getLeagueOrThrow(req.params.leagueId);
    const division = await getDivisionOrThrow(req.params.leagueId, req.params.divisionId);
    const body = req.body as Record<string, unknown>;

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || !body.name.trim()) {
        throw createError('name must be a non-empty string', 400);
      }
      division.name = body.name.trim();
    }

    if (body.order !== undefined) {
      if (typeof body.order !== 'number') {
        throw createError('order must be a number', 400);
      }
      division.order = body.order;
    }

    applyHandicapRulesUpdate(league, body, division);

    await division.save();
    res.json({ data: division.toObject() });
  })
);

router.delete(
  '/:leagueId/divisions/:divisionId',
  asyncHandler(async (req, res: Response) => {
    const division = await getDivisionOrThrow(req.params.leagueId, req.params.divisionId);
    const teamIds = await Team.find({ divisionId: division._id }).distinct('_id');
    const matchIds = await Match.find({
      leagueId: division.leagueId,
      divisionId: division._id,
    }).distinct('_id');

    await Promise.all([
      Scoresheet.deleteMany({ matchId: { $in: matchIds } }),
      Match.deleteMany({ divisionId: division._id }),
      StandingsSnapshot.deleteMany({ divisionId: division._id }),
      Team.deleteMany({ divisionId: division._id }),
      division.deleteOne(),
    ]);

    res.json({ data: { id: division._id, teamsRemoved: teamIds.length } });
  })
);

router.post(
  '/:leagueId/divisions/:divisionId/entrants',
  asyncHandler(async (req, res: Response) => {
    const league = await getLeagueOrThrow(req.params.leagueId);
    assertPlayerEntrantLeague(league);

    const division = await getDivisionOrThrow(req.params.leagueId, req.params.divisionId);
    const { playerId, name, email, phone, establishmentSlug } = req.body as {
      playerId?: string;
      name?: string;
      email?: string;
      phone?: string;
      establishmentSlug?: string;
    };

    if (division.playerIds.length >= MAX_DIVISION_ENTRANTS) {
      throw createError(`A division can have at most ${MAX_DIVISION_ENTRANTS} entrants`, 400);
    }

    let player;

    if (playerId) {
      if (!mongoose.isValidObjectId(playerId)) {
        throw createError('Invalid playerId', 400);
      }

      player = await Player.findById(playerId);

      if (!player) {
        throw createError('Player not found', 404);
      }
    } else if (name?.trim()) {
      player = await Player.create({
        name: name.trim(),
        email: email?.trim() || undefined,
        phone: phone?.trim() || undefined,
        establishmentSlug: establishmentSlug?.trim() || 'default',
      });
    } else {
      throw createError('playerId or name is required', 400);
    }

    const alreadyEntered = division.playerIds.some(
      (id) => String(id) === String(player!._id)
    );

    if (alreadyEntered) {
      throw createError('Player is already in this division', 400);
    }

    division.playerIds.push(player!._id);
    await division.save();

    res.status(201).json({ data: division.toObject() });
  })
);

router.delete(
  '/:leagueId/divisions/:divisionId/entrants/:playerId',
  asyncHandler(async (req, res: Response) => {
    const league = await getLeagueOrThrow(req.params.leagueId);
    assertPlayerEntrantLeague(league);

    const division = await getDivisionOrThrow(req.params.leagueId, req.params.divisionId);

    if (!mongoose.isValidObjectId(req.params.playerId)) {
      throw createError('Invalid playerId', 400);
    }

    const before = division.playerIds.length;
    division.playerIds = division.playerIds.filter(
      (id) => String(id) !== req.params.playerId
    );

    if (division.playerIds.length === before) {
      throw createError('Player is not in this division', 404);
    }

    await division.save();
    res.json({ data: division.toObject() });
  })
);

router.patch(
  '/:leagueId/divisions/:divisionId/entrants/reorder',
  asyncHandler(async (req, res: Response) => {
    const league = await getLeagueOrThrow(req.params.leagueId);
    assertPlayerEntrantLeague(league);

    const division = await getDivisionOrThrow(req.params.leagueId, req.params.divisionId);
    const { playerIds } = req.body as { playerIds?: string[] };

    if (!Array.isArray(playerIds)) {
      throw createError('playerIds must be an array', 400);
    }

    if (playerIds.length !== division.playerIds.length) {
      throw createError('playerIds must include every entrant in this division', 400);
    }

    const currentIds = new Set(division.playerIds.map((id) => String(id)));

    for (const id of playerIds) {
      if (!mongoose.isValidObjectId(id) || !currentIds.has(id)) {
        throw createError('playerIds must match entrants in this division', 400);
      }
    }

    division.playerIds = playerIds.map((id) => new mongoose.Types.ObjectId(id));
    await division.save();

    res.json({ data: division.toObject() });
  })
);

// ─── Teams ───────────────────────────────────────────────────────────────────

router.get(
  '/:leagueId/teams',
  asyncHandler(async (req, res: Response) => {
    await getLeagueOrThrow(req.params.leagueId);

    const filter: Record<string, unknown> = { leagueId: req.params.leagueId };
    const divisionId = req.query.divisionId as string | undefined;

    if (divisionId) {
      if (!mongoose.isValidObjectId(divisionId)) {
        throw createError('Invalid divisionId', 400);
      }
      filter.divisionId = divisionId;
    }

    const teams = await Team.find(filter).sort({ name: 1 }).lean();
    res.json({ data: teams, meta: { count: teams.length } });
  })
);

router.post(
  '/:leagueId/teams',
  asyncHandler(async (req, res: Response) => {
    await getLeagueOrThrow(req.params.leagueId);

    const { divisionId, name, captainPlayerId, playerIds } = req.body as {
      divisionId?: string;
      name?: string;
      captainPlayerId?: string;
      playerIds?: string[];
    };

    if (!divisionId || !mongoose.isValidObjectId(divisionId)) {
      throw createError('divisionId is required', 400);
    }

    await getDivisionOrThrow(req.params.leagueId, divisionId);

    if (!name?.trim()) {
      throw createError('name is required', 400);
    }

    if (captainPlayerId && !mongoose.isValidObjectId(captainPlayerId)) {
      throw createError('Invalid captainPlayerId', 400);
    }

    const rosterIds = Array.isArray(playerIds)
      ? playerIds.filter((id) => mongoose.isValidObjectId(id))
      : [];

    const team = await Team.create({
      leagueId: req.params.leagueId,
      divisionId,
      name: name.trim(),
      captainPlayerId: captainPlayerId || undefined,
      playerIds: rosterIds,
    });

    res.status(201).json({ data: team.toObject() });
  })
);

router.post(
  '/:leagueId/teams/:teamId/invite-captain',
  asyncHandler(async (req, res: Response) => {
    await getLeagueOrThrow(req.params.leagueId);

    if (!mongoose.isValidObjectId(req.params.teamId)) {
      throw createError('Invalid team id', 400);
    }

    const team = await Team.findOne({
      _id: req.params.teamId,
      leagueId: req.params.leagueId,
    });

    if (!team) {
      throw createError('Team not found', 404);
    }

    if (!team.captainPlayerId) {
      throw createError('Assign a captain to this team before sending an invite', 400);
    }

    const player = await Player.findById(team.captainPlayerId);

    if (!player) {
      throw createError('Captain player not found', 404);
    }

    if (!player.email?.trim()) {
      throw createError('Captain player needs an email address before you can invite them', 400);
    }

    const alreadyLinked = await isCaptainPlayerLinked(player._id);
    const invitedAt = new Date();

    if (!alreadyLinked) {
      player.captainInvitedAt = invitedAt;
      await player.save();
    }

    const data = buildCaptainInviteResult({
      player,
      team,
      alreadyLinked,
      invitedAt: player.captainInvitedAt ?? invitedAt,
    });

    res.json({ data });
  })
);

router.patch(
  '/:leagueId/teams/:teamId',
  asyncHandler(async (req, res: Response) => {
    await getLeagueOrThrow(req.params.leagueId);

    if (!mongoose.isValidObjectId(req.params.teamId)) {
      throw createError('Invalid team id', 400);
    }

    const team = await Team.findOne({
      _id: req.params.teamId,
      leagueId: req.params.leagueId,
    });

    if (!team) {
      throw createError('Team not found', 404);
    }

    const body = req.body as Record<string, unknown>;

    if (body.divisionId !== undefined) {
      if (!mongoose.isValidObjectId(String(body.divisionId))) {
        throw createError('Invalid divisionId', 400);
      }
      await getDivisionOrThrow(req.params.leagueId, String(body.divisionId));
      team.divisionId = new mongoose.Types.ObjectId(String(body.divisionId));
    }

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || !body.name.trim()) {
        throw createError('name must be a non-empty string', 400);
      }
      team.name = body.name.trim();
    }

    if (body.captainPlayerId !== undefined) {
      if (body.captainPlayerId === null || body.captainPlayerId === '') {
        team.captainPlayerId = undefined;
      } else if (!mongoose.isValidObjectId(String(body.captainPlayerId))) {
        throw createError('Invalid captainPlayerId', 400);
      } else {
        team.captainPlayerId = new mongoose.Types.ObjectId(String(body.captainPlayerId));
      }
    }

    if (body.playerIds !== undefined) {
      if (!Array.isArray(body.playerIds)) {
        throw createError('playerIds must be an array', 400);
      }
      team.playerIds = body.playerIds
        .filter((id) => mongoose.isValidObjectId(String(id)))
        .map((id) => new mongoose.Types.ObjectId(String(id)));
    }

    await team.save();
    res.json({ data: team.toObject() });
  })
);

router.delete(
  '/:leagueId/teams/:teamId',
  asyncHandler(async (req, res: Response) => {
    await getLeagueOrThrow(req.params.leagueId);

    if (!mongoose.isValidObjectId(req.params.teamId)) {
      throw createError('Invalid team id', 400);
    }

    const team = await Team.findOneAndDelete({
      _id: req.params.teamId,
      leagueId: req.params.leagueId,
    });

    if (!team) {
      throw createError('Team not found', 404);
    }

    res.json({ data: { id: team._id } });
  })
);

// ─── Matches & schedule ──────────────────────────────────────────────────────

router.get(
  '/:leagueId/matches',
  asyncHandler(async (req, res: Response) => {
    await getLeagueOrThrow(req.params.leagueId);

    const filter: Record<string, unknown> = { leagueId: req.params.leagueId };
    const divisionId = req.query.divisionId as string | undefined;

    if (divisionId) {
      if (!mongoose.isValidObjectId(divisionId)) {
        throw createError('Invalid divisionId', 400);
      }
      await getDivisionOrThrow(req.params.leagueId, divisionId);
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
        .select('_id name')
        .lean(),
    ]);

    const divisionNameById = Object.fromEntries(
      divisions.map((division) => [String(division._id), division.name])
    );

    const data = matches.map((match) => ({
      ...match,
      ...formatMatchSides(match, teamNameById, playerNameById),
      divisionName: divisionNameById[String(match.divisionId)] ?? 'Unknown division',
    }));

    res.json({ data, meta: { count: data.length } });
  })
);

router.post(
  '/:leagueId/schedule/generate',
  asyncHandler(async (req, res: Response) => {
    const league = await getLeagueOrThrow(req.params.leagueId);

    const {
      divisionId,
      startDate,
      roundIntervalDays,
      matchTime,
      replaceExisting,
      setsToWin,
      poolFormat,
      raceTo,
    } = req.body as {
      divisionId?: string;
      startDate?: string;
      roundIntervalDays?: number;
      matchTime?: string;
      replaceExisting?: boolean;
      setsToWin?: 2 | 3;
      poolFormat?: PoolFormat;
      raceTo?: number;
    };

    if (!divisionId || !mongoose.isValidObjectId(divisionId)) {
      throw createError('divisionId is required', 400);
    }

    const division = await getDivisionOrThrow(req.params.leagueId, divisionId);
    const playerEntrantLeague = resolveEntrantType(league.entrantType) === 'player';

    let entrantIds: string[];

    if (playerEntrantLeague) {
      entrantIds = (division.playerIds ?? []).map((id) => String(id));

      if (entrantIds.length < 2) {
        throw createError('At least two players are required to generate a schedule', 400);
      }
    } else {
      const teams = await Team.find({ leagueId: league._id, divisionId }).sort({ name: 1 }).lean();

      if (teams.length < 2) {
        throw createError('At least two teams are required to generate a schedule', 400);
      }

      entrantIds = teams.map((team) => String(team._id));
    }

    const existingCount = await Match.countDocuments({
      leagueId: league._id,
      divisionId,
    });

    if (existingCount > 0 && !replaceExisting) {
      throw createError(
        'A schedule already exists for this division. Set replaceExisting to true to regenerate.',
        409
      );
    }

    if (replaceExisting) {
      const lockedCount = await Match.countDocuments({
        leagueId: league._id,
        divisionId,
        status: { $ne: 'scheduled' },
      });

      if (lockedCount > 0) {
        throw createError(
          'Cannot replace schedule while matches are in progress or final.',
          409
        );
      }

      const scheduledMatchIds = await Match.find({
        leagueId: league._id,
        divisionId,
        status: 'scheduled',
      }).distinct('_id');

      await Promise.all([
        Scoresheet.deleteMany({ matchId: { $in: scheduledMatchIds } }),
        Match.deleteMany({
          leagueId: league._id,
          divisionId,
          status: 'scheduled',
        }),
      ]);
    }

    const intervalDays =
      typeof roundIntervalDays === 'number' && roundIntervalDays > 0
        ? Math.floor(roundIntervalDays)
        : 7;

    let parsedMatchTime: string;

    try {
      parsedMatchTime = parseMatchTime(matchTime);
    } catch (error) {
      throw createError(error instanceof Error ? error.message : 'Invalid matchTime', 400);
    }

    const firstNight = parseDate(startDate, 'startDate');

    let pairings: RoundRobinPairing[];

    switch (league.format) {
      case 'round_robin':
        pairings = generateRoundRobinPairings(entrantIds);
        break;
      case 'ladder':
        pairings = generateLadderPairings(entrantIds);
        break;
      case 'bracket':
        try {
          pairings = generateBracketPairings(entrantIds);
        } catch (error) {
          throw createError(
            error instanceof Error ? error.message : 'Invalid bracket schedule',
            400
          );
        }
        break;
      default:
        throw createError(`Unsupported league format: ${league.format}`, 400);
    }

    if (pairings.length === 0) {
      throw createError('Could not generate any matches for this division', 400);
    }

    let volleyballSetsToWin: 2 | 3 = 2;

    if (league.sport === 'volleyball') {
      if (setsToWin !== undefined && setsToWin !== 2 && setsToWin !== 3) {
        throw createError('setsToWin must be 2 (best of 3) or 3 (best of 5)', 400);
      }

      volleyballSetsToWin = setsToWin ?? 2;
    }

    let poolFormatResolved: PoolFormat = '8_ball';

    if (league.sport === 'pool') {
      if (poolFormat !== undefined && !isPoolFormat(poolFormat)) {
        throw createError('Invalid poolFormat', 400);
      }

      poolFormatResolved = poolFormat ?? league.poolFormat ?? '8_ball';
    }

    let poolRaceTo = DEFAULT_POOL_PLAYER_RACE_TO;

    if (league.sport === 'pool' && playerEntrantLeague) {
      if (raceTo !== undefined) {
        if (!Number.isInteger(raceTo) || raceTo < 1) {
          throw createError('raceTo must be a positive integer', 400);
        }

        poolRaceTo = raceTo;
      }
    }

    const matchDocs = pairings.map((pairing) => {
      const participants = playerEntrantLeague
        ? {
            homePlayerId: new mongoose.Types.ObjectId(pairing.homeTeamId),
            awayPlayerId: new mongoose.Types.ObjectId(pairing.awayTeamId),
          }
        : {
            homeTeamId: new mongoose.Types.ObjectId(pairing.homeTeamId),
            awayTeamId: new mongoose.Types.ObjectId(pairing.awayTeamId),
          };

      const base = {
        sport: league.sport,
        leagueId: league._id,
        divisionId: new mongoose.Types.ObjectId(divisionId),
        ...participants,
        roundNumber: pairing.roundNumber,
        scheduledAt: scheduledAtForRound({
          startDate: firstNight,
          roundNumber: pairing.roundNumber,
          roundIntervalDays: intervalDays,
          matchTime: parsedMatchTime,
        }),
        status: 'scheduled' as const,
      };

      if (league.sport === 'darts') {
        return {
          ...base,
          dartsFormat: '501' as const,
          legsToWin: 2,
          isDoubles: false,
        };
      }

      if (league.sport === 'volleyball') {
        return {
          ...base,
          setsToWin: volleyballSetsToWin,
        };
      }

      if (league.sport === 'pool') {
        return {
          ...base,
          poolFormat: poolFormatResolved,
          ...(playerEntrantLeague ? { raceTo: poolRaceTo } : {}),
        };
      }

      return base;
    });

    const created =
      league.sport === 'pool'
        ? await PoolMatch.insertMany(matchDocs)
        : league.sport === 'darts'
          ? await DartsMatch.insertMany(matchDocs)
          : league.sport === 'volleyball'
            ? await VolleyballMatch.insertMany(matchDocs)
            : await Match.insertMany(matchDocs);

    const rounds = pairings.reduce((max, pairing) => Math.max(max, pairing.roundNumber), 0);

    res.status(201).json({
      data: {
        matchesCreated: created.length,
        rounds,
        divisionId,
      },
    });
  })
);

router.get(
  '/:leagueId/standings',
  asyncHandler(async (req, res: Response) => {
    await getLeagueOrThrow(req.params.leagueId);

    const divisionId = req.query.divisionId as string | undefined;

    if (divisionId && !mongoose.isValidObjectId(divisionId)) {
      throw createError('Invalid divisionId', 400);
    }

    const data = await getStandingsViews(req.params.leagueId, divisionId);
    res.json({ data, meta: { count: data.length } });
  })
);

router.post(
  '/:leagueId/standings/recalculate',
  asyncHandler(async (req, res: Response) => {
    await getLeagueOrThrow(req.params.leagueId);

    const divisionId = (req.body as { divisionId?: string }).divisionId;

    if (divisionId) {
      if (!mongoose.isValidObjectId(divisionId)) {
        throw createError('Invalid divisionId', 400);
      }

      await getDivisionOrThrow(req.params.leagueId, divisionId);
      await recomputeStandingsForDivision(req.params.leagueId, divisionId);
    } else {
      await recomputeStandingsForLeague(req.params.leagueId);
    }

    const data = await getStandingsViews(req.params.leagueId, divisionId);
    res.json({ data, meta: { count: data.length } });
  })
);

const IMPORT_TYPES: CsvImportType[] = ['teams', 'players', 'schedule', 'results'];

router.post(
  '/:leagueId/import',
  asyncHandler(async (req, res: Response) => {
    await getLeagueOrThrow(req.params.leagueId);

    const { type, csv, defaultDivisionName } = req.body as {
      type?: CsvImportType;
      csv?: string;
      defaultDivisionName?: string;
    };

    if (!type || !IMPORT_TYPES.includes(type)) {
      throw createError('type must be teams, players, schedule, or results', 400);
    }

    if (!csv?.trim()) {
      throw createError('csv content is required', 400);
    }

    const result = await runCsvImport(req.params.leagueId, type, csv, {
      defaultDivisionName,
    });

    res.status(201).json({ data: result });
  })
);

router.get(
  '/:leagueId/disputes',
  asyncHandler(async (req, res: Response) => {
    await getLeagueOrThrow(req.params.leagueId);

    const matchIds = await Match.find({ leagueId: req.params.leagueId }).distinct('_id');
    const disputedSheets = await Scoresheet.find({
      matchId: { $in: matchIds },
      status: 'disputed',
    }).lean();

    const uniqueMatchIds = [...new Set(disputedSheets.map((sheet) => String(sheet.matchId)))];

    const matches = await Match.find({ _id: { $in: uniqueMatchIds } }).lean();
    const allSheets = await Scoresheet.find({ matchId: { $in: uniqueMatchIds } }).lean();

    const { teamIds, playerIds } = collectMatchParticipantIds(matches);
    const { teamNameById, playerNameById } = await loadParticipantNameMaps(teamIds, playerIds);

    const data = matches.map((match) => {
      const sheets = allSheets.filter((sheet) => String(sheet.matchId) === String(match._id));
      return {
        match,
        ...formatMatchSides(match, teamNameById, playerNameById),
        scoresheets: {
          home: sheets.find((sheet) => sheet.submittedBy === 'home') ?? null,
          away: sheets.find((sheet) => sheet.submittedBy === 'away') ?? null,
        },
      };
    });

    res.json({ data, meta: { count: data.length } });
  })
);

router.post(
  '/:leagueId/matches/:matchId/resolve',
  asyncHandler(async (req, res: Response) => {
    await getLeagueOrThrow(req.params.leagueId);

    if (!mongoose.isValidObjectId(req.params.matchId)) {
      throw createError('Invalid match id', 400);
    }

    const match = await Match.findOne({
      _id: req.params.matchId,
      leagueId: req.params.leagueId,
    });

    if (!match) {
      throw createError('Match not found', 404);
    }

    let payload: Record<string, unknown>;

    try {
      payload = getScoresheetValidator(match.sport).validate(req.body?.payload ?? req.body, {
        match,
      });
    } catch (error) {
      throw createError(error instanceof Error ? error.message : 'Invalid scoresheet', 400);
    }

    const sheets = await Scoresheet.find({ matchId: match._id });
    const homeSheet = sheets.find((sheet) => sheet.submittedBy === 'home');
    const awaySheet = sheets.find((sheet) => sheet.submittedBy === 'away');

    if (!homeSheet || !awaySheet) {
      throw createError('Both captain scoresheets are required to resolve', 400);
    }

    const auth0Sub = extractAuth0Sub(req);
    const reviewer = auth0Sub ? await User.findOne({ auth0Sub }) : null;

    homeSheet.payload = { ...payload };
    awaySheet.payload = { ...payload };
    homeSheet.status = 'approved';
    awaySheet.status = 'approved';
    homeSheet.reviewedBy = reviewer?._id;
    awaySheet.reviewedBy = reviewer?._id;
    homeSheet.reviewedAt = new Date();
    awaySheet.reviewedAt = new Date();

    await Promise.all([
      homeSheet.save(),
      awaySheet.save(),
      finalizeMatchFromPayload(match, payload),
    ]);

    res.json({
      data: {
        match: match.toObject(),
        scoresheets: {
          home: homeSheet.toObject(),
          away: awaySheet.toObject(),
        },
      },
    });
  })
);

router.post(
  '/:leagueId/matches/:matchId/finalize',
  asyncHandler(async (req, res: Response) => {
    await getLeagueOrThrow(req.params.leagueId);

    if (!mongoose.isValidObjectId(req.params.matchId)) {
      throw createError('Invalid match id', 400);
    }

    const match = await Match.findOne({
      _id: req.params.matchId,
      leagueId: req.params.leagueId,
    });

    if (!match) {
      throw createError('Match not found', 404);
    }

    if (match.status === 'final' || match.status === 'cancelled') {
      throw createError('This match is already closed', 400);
    }

    let payload: Record<string, unknown>;

    try {
      payload = getScoresheetValidator(match.sport).validate(req.body?.payload ?? req.body, {
        match,
      });
    } catch (error) {
      throw createError(error instanceof Error ? error.message : 'Invalid scoresheet', 400);
    }

    const auth0Sub = extractAuth0Sub(req);
    const reviewer = auth0Sub ? await User.findOne({ auth0Sub }) : null;

    const homePlayerId = isPlayerMatch(match) ? match.homePlayerId : undefined;
    const awayPlayerId = isPlayerMatch(match) ? match.awayPlayerId : undefined;

    if (isPlayerMatch(match) && (!homePlayerId || !awayPlayerId)) {
      throw createError('Player match is missing participant ids', 400);
    }

    let homeCaptainPlayerId = homePlayerId;
    let awayCaptainPlayerId = awayPlayerId;

    if (!isPlayerMatch(match)) {
      const [homeTeam, awayTeam] = await Promise.all([
        match.homeTeamId ? Team.findById(match.homeTeamId).select('captainPlayerId').lean() : null,
        match.awayTeamId ? Team.findById(match.awayTeamId).select('captainPlayerId').lean() : null,
      ]);

      homeCaptainPlayerId = homeTeam?.captainPlayerId ?? homePlayerId;
      awayCaptainPlayerId = awayTeam?.captainPlayerId ?? awayPlayerId;
    }

    if (!homeCaptainPlayerId || !awayCaptainPlayerId) {
      throw createError('Cannot finalize — missing participant player ids for audit trail', 400);
    }

    const upsertApprovedSheet = async (side: 'home' | 'away', playerId: mongoose.Types.ObjectId) => {
      const sheet = await Scoresheet.findOneAndUpdate(
        { matchId: match._id, submittedBy: side },
        {
          matchId: match._id,
          submittedBy: side,
          submittedByPlayerId: playerId,
          payload: { ...payload },
          status: 'approved',
          reviewedBy: reviewer?._id,
          reviewedAt: new Date(),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      return sheet;
    };

    const [homeSheet, awaySheet] = await Promise.all([
      upsertApprovedSheet('home', homeCaptainPlayerId),
      upsertApprovedSheet('away', awayCaptainPlayerId),
      finalizeMatchFromPayload(match, payload),
    ]);

    res.json({
      data: {
        match: (await Match.findById(match._id))?.toObject(),
        scoresheets: {
          home: homeSheet.toObject(),
          away: awaySheet.toObject(),
        },
      },
    });
  })
);

export default router;
