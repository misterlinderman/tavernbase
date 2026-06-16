import mongoose from 'mongoose';
import { Match, Player, Scoresheet, Team } from '../../models';
import type { IPlayer } from '../../models/leagues/Player';
import type { ITeam } from '../../models/leagues/Team';

function logTeamAudit(entry: Record<string, unknown>): void {
  console.info('[audit:team]', JSON.stringify({ ...entry, at: new Date().toISOString() }));
}

export async function getTeamInLeagueOrThrow(
  leagueId: mongoose.Types.ObjectId | string,
  teamId: mongoose.Types.ObjectId | string
): Promise<ITeam> {
  if (!mongoose.isValidObjectId(teamId)) {
    throw new Error('Invalid team id');
  }

  const team = await Team.findOne({ _id: teamId, leagueId });

  if (!team) {
    throw new Error('Team not found');
  }

  return team;
}

export async function transferTeamCaptain(options: {
  leagueId: mongoose.Types.ObjectId | string;
  teamId: mongoose.Types.ObjectId | string;
  newCaptainPlayerId: mongoose.Types.ObjectId | string;
  actorAuth0Sub?: string;
}): Promise<ITeam> {
  const team = await getTeamInLeagueOrThrow(options.leagueId, options.teamId);

  if (!mongoose.isValidObjectId(String(options.newCaptainPlayerId))) {
    throw new Error('Invalid newCaptainPlayerId');
  }

  const newCaptainId = new mongoose.Types.ObjectId(String(options.newCaptainPlayerId));
  const previousCaptainId = team.captainPlayerId ? String(team.captainPlayerId) : null;

  if (previousCaptainId === String(newCaptainId)) {
    return team;
  }

  const onRoster = team.playerIds.some((id) => id.equals(newCaptainId));

  if (!onRoster) {
    throw new Error('New captain must be on the team roster — add them first');
  }

  const player = await Player.findById(newCaptainId);

  if (!player) {
    throw new Error('Player not found');
  }

  team.captainPlayerId = newCaptainId;
  await team.save();

  logTeamAudit({
    action: 'transfer-captain',
    leagueId: String(options.leagueId),
    teamId: String(options.teamId),
    teamName: team.name,
    fromCaptainPlayerId: previousCaptainId,
    toCaptainPlayerId: String(newCaptainId),
    actorAuth0Sub: options.actorAuth0Sub,
  });

  return team;
}

export async function addTeamPlayer(options: {
  leagueId: mongoose.Types.ObjectId | string;
  teamId: mongoose.Types.ObjectId | string;
  playerId?: string;
  name?: string;
  email?: string;
  phone?: string;
  establishmentSlug?: string;
}): Promise<{ team: ITeam; player: IPlayer }> {
  const team = await getTeamInLeagueOrThrow(options.leagueId, options.teamId);

  let player: IPlayer | null = null;

  if (options.playerId) {
    if (!mongoose.isValidObjectId(options.playerId)) {
      throw new Error('Invalid playerId');
    }

    player = await Player.findById(options.playerId);

    if (!player) {
      throw new Error('Player not found');
    }
  } else if (options.name?.trim()) {
    player = await Player.create({
      name: options.name.trim(),
      email: options.email?.trim() || undefined,
      phone: options.phone?.trim() || undefined,
      establishmentSlug: options.establishmentSlug?.trim() || 'default',
    });
  } else {
    throw new Error('playerId or name is required');
  }

  if (team.playerIds.some((id) => id.equals(player!._id))) {
    throw new Error('Player is already on this roster');
  }

  team.playerIds.push(player._id);
  await team.save();

  return { team, player };
}

export async function removeTeamPlayer(options: {
  leagueId: mongoose.Types.ObjectId | string;
  teamId: mongoose.Types.ObjectId | string;
  playerId: mongoose.Types.ObjectId | string;
}): Promise<ITeam> {
  const team = await getTeamInLeagueOrThrow(options.leagueId, options.teamId);

  if (!mongoose.isValidObjectId(String(options.playerId))) {
    throw new Error('Invalid player id');
  }

  const playerObjectId = new mongoose.Types.ObjectId(String(options.playerId));

  if (team.captainPlayerId?.equals(playerObjectId)) {
    throw new Error('Transfer captain before removing this player from the roster');
  }

  const before = team.playerIds.length;
  team.playerIds = team.playerIds.filter((id) => !id.equals(playerObjectId));

  if (team.playerIds.length === before) {
    throw new Error('Player is not on this roster');
  }

  await team.save();
  return team;
}

export async function deleteTeamWithGuard(options: {
  leagueId: mongoose.Types.ObjectId | string;
  teamId: mongoose.Types.ObjectId | string;
  actorAuth0Sub?: string;
}): Promise<{ id: string; scheduledMatchesRemoved: number }> {
  const team = await getTeamInLeagueOrThrow(options.leagueId, options.teamId);

  const blockingMatch = await Match.findOne({
    leagueId: options.leagueId,
    status: { $ne: 'scheduled' },
    $or: [{ homeTeamId: team._id }, { awayTeamId: team._id }],
  })
    .select('_id status')
    .lean();

  if (blockingMatch) {
    throw new Error(
      'Cannot delete a team with matches in progress or finalized — resolve or cancel them first'
    );
  }

  const scheduledMatchIds = await Match.find({
    leagueId: options.leagueId,
    $or: [{ homeTeamId: team._id }, { awayTeamId: team._id }],
  }).distinct('_id');

  await Promise.all([
    Scoresheet.deleteMany({ matchId: { $in: scheduledMatchIds } }),
    Match.deleteMany({ _id: { $in: scheduledMatchIds } }),
    team.deleteOne(),
  ]);

  logTeamAudit({
    action: 'delete-team',
    leagueId: String(options.leagueId),
    teamId: String(options.teamId),
    teamName: team.name,
    divisionId: String(team.divisionId),
    scheduledMatchesRemoved: scheduledMatchIds.length,
    actorAuth0Sub: options.actorAuth0Sub,
  });

  return {
    id: String(team._id),
    scheduledMatchesRemoved: scheduledMatchIds.length,
  };
}
