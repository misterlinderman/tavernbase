import mongoose from 'mongoose';
import type { LeagueStatus, RegistrationStatus, Sport } from '../../constants/leagues';
import { REGISTRATION_SPOT_STATUSES } from '../../constants/leagues';
import { League, Registration, Team } from '../../models';
import type { ILeague } from '../../models/leagues/League';
import { buildPublicRegistrationInfo, resolveLeagueRegistration } from './registration';

export interface CaptainTeamRegistrationSummary {
  isOpen: boolean;
  enabled: boolean;
  opensAt?: string;
  closesAt?: string;
  entryFeeDisplay: string;
  requiresApproval: boolean;
  registrationId?: string;
  registrationStatus?: RegistrationStatus;
}

export interface CaptainTeamSummary {
  teamId: string;
  teamName: string;
  leagueId: string;
  leagueName: string;
  sport: Sport;
  status: LeagueStatus;
  registration: CaptainTeamRegistrationSummary;
}

export interface CaptainReturningSeasonOption {
  priorTeamId: string;
  priorTeamName: string;
  priorLeagueId: string;
  priorLeagueName: string;
  targetLeagueId: string;
  targetLeagueName: string;
  entryFeeDisplay: string;
  requiresApproval: boolean;
  isOpen: boolean;
  registrationId?: string;
  registrationStatus?: RegistrationStatus;
}

async function buildTeamSummary(
  team: { _id: mongoose.Types.ObjectId; name: string; leagueId: mongoose.Types.ObjectId },
  league: Pick<
    ILeague,
    '_id' | 'name' | 'sport' | 'kind' | 'entrantType' | 'status' | 'registration'
  >,
  captainRegistration?: { _id: mongoose.Types.ObjectId; status: RegistrationStatus } | null
): Promise<CaptainTeamSummary> {
  const publicRegistration = await buildPublicRegistrationInfo(league);

  return {
    teamId: String(team._id),
    teamName: team.name,
    leagueId: String(league._id),
    leagueName: league.name,
    sport: league.sport,
    status: league.status,
    registration: {
      isOpen: publicRegistration.isOpen,
      enabled: publicRegistration.enabled,
      opensAt: publicRegistration.opensAt,
      closesAt: publicRegistration.closesAt,
      entryFeeDisplay: publicRegistration.entryFeeDisplay,
      requiresApproval: publicRegistration.requiresApproval,
      registrationId: captainRegistration ? String(captainRegistration._id) : undefined,
      registrationStatus: captainRegistration?.status,
    },
  };
}

export async function buildCaptainProfileTeams(playerId: mongoose.Types.ObjectId): Promise<{
  teams: CaptainTeamSummary[];
  pastTeams: CaptainTeamSummary[];
}> {
  const teams = await Team.find({ captainPlayerId: playerId }).sort({ name: 1 }).lean();

  if (teams.length === 0) {
    return { teams: [], pastTeams: [] };
  }

  const leagueIds = [...new Set(teams.map((team) => String(team.leagueId)))];
  const leagues = await League.find({ _id: { $in: leagueIds } }).lean();
  const leagueById = Object.fromEntries(leagues.map((league) => [String(league._id), league]));

  const captainRegistrations = await Registration.find({
    leagueId: { $in: leagueIds },
    submittedByPlayerId: playerId,
    entrantType: 'team',
    status: { $in: REGISTRATION_SPOT_STATUSES },
  })
    .select('_id leagueId status')
    .lean();

  const registrationByLeagueId = Object.fromEntries(
    captainRegistrations.map((registration) => [String(registration.leagueId), registration])
  );

  const summaries: CaptainTeamSummary[] = [];

  for (const team of teams) {
    const league = leagueById[String(team.leagueId)];

    if (!league) {
      continue;
    }

    summaries.push(
      await buildTeamSummary(
        team,
        league as Pick<
          ILeague,
          '_id' | 'name' | 'sport' | 'kind' | 'entrantType' | 'status' | 'registration'
        >,
        registrationByLeagueId[String(league._id)] ?? null
      )
    );
  }

  summaries.sort((left, right) => left.leagueName.localeCompare(right.leagueName));

  return {
    teams: summaries.filter((summary) => summary.status !== 'completed'),
    pastTeams: summaries.filter((summary) => summary.status === 'completed'),
  };
}

export async function buildReturningSeasonOptions(
  playerId: mongoose.Types.ObjectId
): Promise<CaptainReturningSeasonOption[]> {
  const priorTeams = await Team.find({ captainPlayerId: playerId }).lean();

  if (priorTeams.length === 0) {
    return [];
  }

  const priorLeagueObjectIds = [
    ...new Map(priorTeams.map((team) => [String(team.leagueId), team.leagueId])).values(),
  ];
  const targetLeagues = await League.find({
    status: 'active',
    entrantType: 'team',
    'registration.priorLeagueId': { $in: priorLeagueObjectIds },
  }).lean();

  if (targetLeagues.length === 0) {
    return [];
  }

  const targetLeagueIds = targetLeagues.map((league) => league._id);
  const existingRegistrations = await Registration.find({
    leagueId: { $in: targetLeagueIds },
    submittedByPlayerId: playerId,
    entrantType: 'team',
    status: { $in: REGISTRATION_SPOT_STATUSES },
  })
    .select('_id leagueId status')
    .lean();

  const registrationByTargetLeagueId = Object.fromEntries(
    existingRegistrations.map((registration) => [String(registration.leagueId), registration])
  );

  const options: CaptainReturningSeasonOption[] = [];

  for (const targetLeague of targetLeagues) {
    const priorLeagueObjectId = resolveLeagueRegistration(targetLeague.registration).priorLeagueId;

    if (!priorLeagueObjectId) {
      continue;
    }

    const priorTeam = priorTeams.find((team) => team.leagueId.equals(priorLeagueObjectId));

    if (!priorTeam) {
      continue;
    }

    const registrationInfo = await buildPublicRegistrationInfo(
      targetLeague as Pick<
        ILeague,
        '_id' | 'name' | 'sport' | 'kind' | 'entrantType' | 'status' | 'registration'
      >
    );

    if (!registrationInfo.isOpen) {
      continue;
    }

    const priorLeague = await League.findById(priorLeagueObjectId).select('name').lean();
    const existing = registrationByTargetLeagueId[String(targetLeague._id)];

    options.push({
      priorTeamId: String(priorTeam._id),
      priorTeamName: priorTeam.name,
      priorLeagueId: String(priorLeagueObjectId),
      priorLeagueName: priorLeague?.name ?? 'Prior season',
      targetLeagueId: String(targetLeague._id),
      targetLeagueName: targetLeague.name,
      entryFeeDisplay: registrationInfo.entryFeeDisplay,
      requiresApproval: registrationInfo.requiresApproval,
      isOpen: registrationInfo.isOpen,
      registrationId: existing ? String(existing._id) : undefined,
      registrationStatus: existing?.status,
    });
  }

  options.sort((left, right) => left.targetLeagueName.localeCompare(right.targetLeagueName));

  return options;
}
