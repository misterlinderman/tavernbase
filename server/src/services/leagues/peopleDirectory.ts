import mongoose from 'mongoose';
import type { Sport } from '../../constants/leagues';
import { Division, League, PendingInvite, Player, Team, User } from '../../models';

export type PeopleLoginStatus = 'linked' | 'invited' | 'unlinked';
export type PeopleRole = 'captain' | 'player' | 'none';

export interface PeopleTeamEntry {
  teamId: string;
  teamName: string;
  leagueId: string;
  leagueName: string;
  sport: Sport;
  isCaptain: boolean;
}

export interface PeopleDirectoryEntry {
  _id: string;
  name: string;
  email?: string;
  auth0Sub?: string;
  establishmentSlug: string;
  role: PeopleRole;
  teams: PeopleTeamEntry[];
  loginStatus: PeopleLoginStatus;
  lastInvitedAt?: string;
}

export interface PeopleDirectoryQuery {
  q?: string;
  role?: 'captain' | 'player' | 'unlinked';
  loginStatus?: PeopleLoginStatus;
  sport?: Sport;
  page?: number;
  limit?: number;
}

export interface PeopleDirectoryResult {
  entries: PeopleDirectoryEntry[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function resolveLoginStatus(
  player: { auth0Sub?: string; captainInvitedAt?: Date; email?: string },
  hasUserLink: boolean,
  hasPendingInvite: boolean
): PeopleLoginStatus {
  if (player.auth0Sub || hasUserLink) {
    return 'linked';
  }

  if (hasPendingInvite || player.captainInvitedAt) {
    return 'invited';
  }

  return 'unlinked';
}

function resolveRole(isCaptain: boolean, onRoster: boolean): PeopleRole {
  if (isCaptain) {
    return 'captain';
  }

  if (onRoster) {
    return 'player';
  }

  return 'none';
}

async function collectLeaguePlayerIds(sport?: Sport): Promise<Set<string>> {
  const leagueFilter = sport ? { sport } : {};
  const leagues = await League.find(leagueFilter).select('_id').lean();
  const leagueIds = leagues.map((league) => league._id);

  if (leagueIds.length === 0) {
    return new Set();
  }

  const [teams, divisions] = await Promise.all([
    Team.find({ leagueId: { $in: leagueIds } })
      .select('captainPlayerId playerIds')
      .lean(),
    Division.find({ leagueId: { $in: leagueIds } })
      .select('playerIds')
      .lean(),
  ]);

  const playerIds = new Set<string>();

  for (const team of teams) {
    if (team.captainPlayerId) {
      playerIds.add(String(team.captainPlayerId));
    }

    for (const playerId of team.playerIds ?? []) {
      playerIds.add(String(playerId));
    }
  }

  for (const division of divisions) {
    for (const playerId of division.playerIds ?? []) {
      playerIds.add(String(playerId));
    }
  }

  return playerIds;
}

async function buildTeamEntriesForPlayers(
  playerIds: mongoose.Types.ObjectId[]
): Promise<Map<string, PeopleTeamEntry[]>> {
  if (playerIds.length === 0) {
    return new Map();
  }

  const [teams, divisions] = await Promise.all([
    Team.find({
      $or: [{ playerIds: { $in: playerIds } }, { captainPlayerId: { $in: playerIds } }],
    })
      .select('_id name leagueId captainPlayerId playerIds')
      .lean(),
    Division.find({ playerIds: { $in: playerIds } })
      .select('_id name leagueId playerIds')
      .lean(),
  ]);

  const leagueIds = [
    ...new Set([
      ...teams.map((team) => String(team.leagueId)),
      ...divisions.map((division) => String(division.leagueId)),
    ]),
  ].map((id) => new mongoose.Types.ObjectId(id));

  const leagues = await League.find({ _id: { $in: leagueIds } })
    .select('_id name sport')
    .lean();
  const leagueById = Object.fromEntries(leagues.map((league) => [String(league._id), league]));

  const teamsByPlayer = new Map<string, PeopleTeamEntry[]>();

  const appendTeam = (playerId: string, entry: PeopleTeamEntry) => {
    const existing = teamsByPlayer.get(playerId) ?? [];
    const duplicate = existing.some(
      (item) => item.teamId === entry.teamId && item.leagueId === entry.leagueId
    );

    if (!duplicate) {
      existing.push(entry);
      teamsByPlayer.set(playerId, existing);
    }
  };

  for (const team of teams) {
    const league = leagueById[String(team.leagueId)];

    if (!league) {
      continue;
    }

    const rosterIds = new Set((team.playerIds ?? []).map((id) => String(id)));

    if (team.captainPlayerId) {
      rosterIds.add(String(team.captainPlayerId));
    }

    for (const playerId of rosterIds) {
      appendTeam(playerId, {
        teamId: String(team._id),
        teamName: team.name,
        leagueId: String(league._id),
        leagueName: league.name,
        sport: league.sport as Sport,
        isCaptain: team.captainPlayerId ? String(team.captainPlayerId) === playerId : false,
      });
    }
  }

  for (const division of divisions) {
    const league = leagueById[String(division.leagueId)];

    if (!league) {
      continue;
    }

    for (const playerId of division.playerIds ?? []) {
      const playerKey = String(playerId);
      appendTeam(playerKey, {
        teamId: String(division._id),
        teamName: `${division.name} (individual)`,
        leagueId: String(league._id),
        leagueName: league.name,
        sport: league.sport as Sport,
        isCaptain: false,
      });
    }
  }

  for (const [playerId, entries] of teamsByPlayer.entries()) {
    entries.sort((left, right) => left.leagueName.localeCompare(right.leagueName));
    teamsByPlayer.set(playerId, entries);
  }

  return teamsByPlayer;
}

export async function getPeopleDirectory(query: PeopleDirectoryQuery): Promise<PeopleDirectoryResult> {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, query.limit ?? DEFAULT_LIMIT));

  const leaguePlayerIds = await collectLeaguePlayerIds(query.sport);

  if (leaguePlayerIds.size === 0) {
    return {
      entries: [],
      meta: { page, limit, total: 0, totalPages: 0 },
    };
  }

  const playerFilter: Record<string, unknown> = {
    _id: {
      $in: [...leaguePlayerIds].map((id) => new mongoose.Types.ObjectId(id)),
    },
  };

  if (query.q?.trim()) {
    const pattern = new RegExp(escapeRegex(query.q.trim()), 'i');
    playerFilter.$or = [{ name: pattern }, { email: pattern }];
  }

  const allMatchingPlayers = await Player.find(playerFilter).select('_id').lean();
  const allPlayerIds = allMatchingPlayers.map((player) => player._id);

  const teamsByPlayer = await buildTeamEntriesForPlayers(allPlayerIds);

  const users = await User.find({
    playerId: { $in: allPlayerIds },
    role: { $in: ['captain', 'player'] },
  })
    .select('playerId role')
    .lean();

  const pendingInvites = await PendingInvite.find({ playerId: { $in: allPlayerIds } })
    .select('playerId invitedAt role')
    .lean();

  const userByPlayerId = new Map<string, { role: 'captain' | 'player' }>();
  const pendingInviteByPlayerId = new Map<string, { invitedAt: Date }>();

  for (const user of users) {
    if (user.playerId) {
      userByPlayerId.set(String(user.playerId), { role: user.role as 'captain' | 'player' });
    }
  }

  for (const invite of pendingInvites) {
    const key = String(invite.playerId);
    const existing = pendingInviteByPlayerId.get(key);

    if (!existing || invite.invitedAt > existing.invitedAt) {
      pendingInviteByPlayerId.set(key, { invitedAt: invite.invitedAt });
    }
  }

  const players = await Player.find({ _id: { $in: allPlayerIds } })
    .sort({ name: 1 })
    .lean();

  let entries: PeopleDirectoryEntry[] = players.map((player) => {
    const playerKey = String(player._id);
    const teams = teamsByPlayer.get(playerKey) ?? [];
    const isCaptain = teams.some((team) => team.isCaptain);
    const onRoster = teams.length > 0;
    const hasUserLink = userByPlayerId.has(playerKey);
    const pendingInvite = pendingInviteByPlayerId.get(playerKey);
    const lastInvitedAt = pendingInvite?.invitedAt ?? player.captainInvitedAt;

    return {
      _id: playerKey,
      name: player.name,
      email: player.email,
      auth0Sub: player.auth0Sub,
      establishmentSlug: player.establishmentSlug,
      role: resolveRole(isCaptain, onRoster),
      teams,
      loginStatus: resolveLoginStatus(player, hasUserLink, Boolean(pendingInvite)),
      lastInvitedAt: lastInvitedAt?.toISOString(),
    };
  });

  if (query.role === 'captain') {
    entries = entries.filter((entry) => entry.role === 'captain');
  } else if (query.role === 'player') {
    entries = entries.filter((entry) => entry.role === 'player');
  } else if (query.role === 'unlinked') {
    entries = entries.filter((entry) => entry.loginStatus !== 'linked');
  }

  if (query.loginStatus) {
    entries = entries.filter((entry) => entry.loginStatus === query.loginStatus);
  }

  const total = entries.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const pagedEntries = entries.slice(start, start + limit);

  return {
    entries: pagedEntries,
    meta: { page, limit, total, totalPages },
  };
}
