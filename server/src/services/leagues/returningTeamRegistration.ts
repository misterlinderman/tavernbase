import mongoose from 'mongoose';
import { getTeamRosterLimits } from '../../config/rosterLimits';
import { Division, League, Player, Team } from '../../models';
import type { ILeague } from '../../models/leagues/League';
import type { ITeam } from '../../models/leagues/Team';
import {
  buildPublicRegistrationInfo,
  resolveLeagueRegistration,
  type PublicRegistrationInfo,
} from './registration';
import {
  ensureRegistrantPlayer,
  parseTeamRegistrationBody,
  submitTeamRegistration,
  type TeamRegistrationResult,
  type TeamRegistrationRosterEntry,
} from './teamRegistration';

export interface ReturningRosterPlayerPreview {
  playerId: string;
  name: string;
  email: string;
  isCaptain: boolean;
}

export interface ReturningTeamRegistrationPreview {
  priorTeamId: string;
  priorTeamName: string;
  priorLeagueId: string;
  priorLeagueName: string;
  targetLeagueId: string;
  targetLeagueName: string;
  teamName: string;
  roster: ReturningRosterPlayerPreview[];
  registration: Pick<
    PublicRegistrationInfo,
    | 'isOpen'
    | 'entryFeeDisplay'
    | 'requiresApproval'
    | 'waiverText'
    | 'opensAt'
    | 'closesAt'
  >;
  rosterMin: number;
  rosterMax: number;
  divisions: Array<{ _id: string; name: string; order: number }>;
}

export interface SubmitReturningTeamRegistrationInput {
  leagueId: string;
  priorTeamId: string;
  auth0Sub: string;
  email: string;
  name?: string | null;
  divisionId?: string;
  teamName: string;
  roster: TeamRegistrationRosterEntry[];
  waiverAccepted: boolean;
}

export function parseReturningTeamRegistrationBody(body: unknown): {
  priorTeamId: string;
  divisionId?: string;
  teamName: string;
  roster: TeamRegistrationRosterEntry[];
  waiverAccepted: boolean;
} {
  if (typeof body !== 'object' || body === null) {
    throw new Error('Request body must be an object');
  }

  const input = body as Record<string, unknown>;
  const priorTeamId =
    typeof input.priorTeamId === 'string' && input.priorTeamId.trim()
      ? input.priorTeamId.trim()
      : '';

  if (!priorTeamId || !mongoose.isValidObjectId(priorTeamId)) {
    throw new Error('priorTeamId is required');
  }

  const parsed = parseTeamRegistrationBody(body);

  return {
    priorTeamId,
    ...parsed,
  };
}

async function loadReturningContext(options: {
  targetLeagueId: string;
  priorTeamId: string;
  captainPlayerId: mongoose.Types.ObjectId;
}): Promise<{
  priorTeam: ITeam;
  priorLeague: ILeague;
  targetLeague: ILeague;
}> {
  if (!mongoose.isValidObjectId(options.targetLeagueId)) {
    throw new Error('Invalid league id');
  }

  if (!mongoose.isValidObjectId(options.priorTeamId)) {
    throw new Error('Invalid prior team id');
  }

  const priorTeam = await Team.findById(options.priorTeamId);

  if (!priorTeam) {
    throw new Error('Prior team not found');
  }

  if (!priorTeam.captainPlayerId?.equals(options.captainPlayerId)) {
    throw new Error('Forbidden — not your prior team');
  }

  const [priorLeague, targetLeague] = await Promise.all([
    League.findById(priorTeam.leagueId),
    League.findById(options.targetLeagueId),
  ]);

  if (!priorLeague) {
    throw new Error('Prior league not found');
  }

  if (!targetLeague) {
    throw new Error('League not found');
  }

  if (targetLeague.entrantType === 'player') {
    throw new Error('This league accepts individual player registration only');
  }

  const targetRegistration = resolveLeagueRegistration(targetLeague.registration);
  const configuredPriorLeagueId = targetRegistration.priorLeagueId;

  if (!configuredPriorLeagueId) {
    throw new Error('This league is not configured for returning team registration');
  }

  if (!configuredPriorLeagueId.equals(priorTeam.leagueId)) {
    throw new Error('This prior team is not eligible for the selected season');
  }

  const registrationInfo = await buildPublicRegistrationInfo(targetLeague);

  if (!registrationInfo.isOpen) {
    throw new Error('Registration is closed for this league');
  }

  return { priorTeam, priorLeague, targetLeague };
}

export async function getReturningTeamRegistrationPreview(options: {
  targetLeagueId: string;
  priorTeamId: string;
  captainPlayerId: mongoose.Types.ObjectId;
}): Promise<ReturningTeamRegistrationPreview> {
  const { priorTeam, priorLeague, targetLeague } = await loadReturningContext(options);
  const limits = getTeamRosterLimits();
  const registrationInfo = await buildPublicRegistrationInfo(targetLeague);

  const players = await Player.find({ _id: { $in: priorTeam.playerIds } })
    .select('_id name email')
    .lean();

  const playerById = Object.fromEntries(players.map((player) => [String(player._id), player]));
  const roster: ReturningRosterPlayerPreview[] = [];

  for (const playerObjectId of priorTeam.playerIds) {
    const player = playerById[String(playerObjectId)];

    if (!player) {
      continue;
    }

    roster.push({
      playerId: String(player._id),
      name: player.name,
      email: player.email ?? '',
      isCaptain: priorTeam.captainPlayerId?.equals(player._id) ?? false,
    });
  }

  const divisions = await Division.find({ leagueId: targetLeague._id })
    .sort({ order: 1 })
    .select('_id name order')
    .lean();

  return {
    priorTeamId: String(priorTeam._id),
    priorTeamName: priorTeam.name,
    priorLeagueId: String(priorLeague._id),
    priorLeagueName: priorLeague.name,
    targetLeagueId: String(targetLeague._id),
    targetLeagueName: targetLeague.name,
    teamName: priorTeam.name,
    roster,
    registration: {
      isOpen: registrationInfo.isOpen,
      entryFeeDisplay: registrationInfo.entryFeeDisplay,
      requiresApproval: registrationInfo.requiresApproval,
      waiverText: registrationInfo.waiverText,
      opensAt: registrationInfo.opensAt,
      closesAt: registrationInfo.closesAt,
    },
    rosterMin: limits.min,
    rosterMax: limits.max,
    divisions: divisions.map((division) => ({
      _id: String(division._id),
      name: division.name,
      order: division.order,
    })),
  };
}

export async function submitReturningTeamRegistration(
  input: SubmitReturningTeamRegistrationInput
): Promise<TeamRegistrationResult> {
  const { player } = await ensureRegistrantPlayer({
    auth0Sub: input.auth0Sub,
    email: input.email,
    name: input.name,
  });

  const { priorTeam } = await loadReturningContext({
    targetLeagueId: input.leagueId,
    priorTeamId: input.priorTeamId,
    captainPlayerId: player._id,
  });

  return submitTeamRegistration({
    leagueId: input.leagueId,
    auth0Sub: input.auth0Sub,
    email: input.email,
    name: input.name,
    divisionId: input.divisionId,
    teamName: input.teamName,
    roster: input.roster,
    waiverAccepted: input.waiverAccepted,
    returningTeamId: String(priorTeam._id),
  });
}
