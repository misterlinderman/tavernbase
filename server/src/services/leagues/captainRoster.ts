import mongoose from 'mongoose';
import { getEstablishmentSlug } from '../../config/establishment';
import { getTeamRosterLimits } from '../../config/rosterLimits';
import { League, Player, Registration, Team } from '../../models';
import type { ILeague, ILeagueRegistration } from '../../models/leagues/League';
import type { ITeam } from '../../models/leagues/Team';
import { resolveLeagueRegistration, isWithinRegistrationWindow } from './registration';
import { createPlayerLoginInvite, isPlayerLoginLinked } from './playerLoginLink';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function canCaptainEditTeamRoster(
  league: Pick<ILeague, 'status' | 'registration'>
): boolean {
  if (league.status === 'completed') {
    return false;
  }

  if (league.status === 'draft') {
    return true;
  }

  const registration = resolveLeagueRegistration(league.registration);

  if (registration.captainRosterEdits) {
    return true;
  }

  return registration.enabled && isWithinRegistrationWindow(registration);
}

export function describeCaptainRosterEditBlock(
  league: Pick<ILeague, 'status' | 'registration'>
): string {
  if (league.status === 'completed') {
    return 'This season has ended — roster changes are closed.';
  }

  if (canCaptainEditTeamRoster(league)) {
    return '';
  }

  const registration = resolveLeagueRegistration(league.registration);

  if (!registration.enabled) {
    return 'Registration is closed for this league. Ask league staff to enable captain roster edits.';
  }

  if (registration.opensAt && new Date() < registration.opensAt) {
    return 'Registration has not opened yet.';
  }

  if (registration.closesAt && new Date() > registration.closesAt) {
    return 'Registration has closed. Ask league staff to enable captain roster edits if you need a sub.';
  }

  return 'Roster changes are not allowed right now.';
}

async function assertCaptainOwnsTeam(
  teamId: mongoose.Types.ObjectId | string,
  captainPlayerId: mongoose.Types.ObjectId
): Promise<{ team: ITeam; league: ILeague }> {
  const team = await Team.findById(teamId);

  if (!team) {
    throw new Error('Team not found');
  }

  if (!team.captainPlayerId?.equals(captainPlayerId)) {
    throw new Error('Forbidden — not your team');
  }

  const league = await League.findById(team.leagueId);

  if (!league) {
    throw new Error('League not found');
  }

  return { team, league };
}

async function syncApprovedRegistrationRoster(team: ITeam): Promise<void> {
  await Registration.updateMany(
    {
      leagueId: team.leagueId,
      teamId: team._id,
      status: 'approved',
    },
    { $set: { playerIds: team.playerIds } }
  );
}

export interface CaptainRosterPlayerEntry {
  playerId: string;
  name: string;
  email?: string;
  isCaptain: boolean;
  loginLinked: boolean;
}

export interface CaptainTeamRosterView {
  teamId: string;
  teamName: string;
  leagueId: string;
  leagueName: string;
  sport: ILeague['sport'];
  leagueStatus: ILeague['status'];
  canEdit: boolean;
  editBlockedReason?: string;
  rosterMin: number;
  rosterMax: number;
  captainPlayerId: string;
  players: CaptainRosterPlayerEntry[];
}

export async function getCaptainTeamRoster(
  teamId: mongoose.Types.ObjectId | string,
  captainPlayerId: mongoose.Types.ObjectId
): Promise<CaptainTeamRosterView> {
  const { team, league } = await assertCaptainOwnsTeam(teamId, captainPlayerId);
  const limits = getTeamRosterLimits();
  const canEdit = canCaptainEditTeamRoster(league);
  const editBlockedReason = canEdit ? undefined : describeCaptainRosterEditBlock(league);

  const players = await Player.find({ _id: { $in: team.playerIds } })
    .select('_id name email')
    .lean();

  const playerById = Object.fromEntries(players.map((player) => [String(player._id), player]));
  const orderedPlayers: CaptainRosterPlayerEntry[] = [];

  for (const playerObjectId of team.playerIds) {
    const player = playerById[String(playerObjectId)];

    if (!player) {
      continue;
    }

    orderedPlayers.push({
      playerId: String(player._id),
      name: player.name,
      email: player.email,
      isCaptain: team.captainPlayerId?.equals(player._id) ?? false,
      loginLinked: await isPlayerLoginLinked(player._id, 'player'),
    });
  }

  return {
    teamId: String(team._id),
    teamName: team.name,
    leagueId: String(league._id),
    leagueName: league.name,
    sport: league.sport,
    leagueStatus: league.status,
    canEdit,
    editBlockedReason,
    rosterMin: limits.min,
    rosterMax: limits.max,
    captainPlayerId: String(team.captainPlayerId),
    players: orderedPlayers,
  };
}

async function findOrCreatePlayerByEmail(options: {
  name: string;
  email: string;
}): Promise<{ player: mongoose.HydratedDocument<import('../../models/leagues/Player').IPlayer>; created: boolean }> {
  const email = normalizeEmail(options.email);
  const establishmentSlug = getEstablishmentSlug();
  const existing = await Player.findOne({ establishmentSlug, email });

  if (existing) {
    if (!existing.name.trim() && options.name.trim()) {
      existing.name = options.name.trim();
      await existing.save();
    }

    return { player: existing, created: false };
  }

  const player = await Player.create({
    name: options.name.trim(),
    email,
    establishmentSlug,
  });

  return { player, created: true };
}

export async function addCaptainTeamRosterPlayer(options: {
  teamId: mongoose.Types.ObjectId | string;
  captainPlayerId: mongoose.Types.ObjectId;
  name: string;
  email: string;
}): Promise<{ roster: CaptainTeamRosterView; inviteSent: boolean; inviteNote?: string }> {
  const { team, league } = await assertCaptainOwnsTeam(options.teamId, options.captainPlayerId);

  if (!canCaptainEditTeamRoster(league)) {
    throw new Error(describeCaptainRosterEditBlock(league) || 'Roster changes are not allowed');
  }

  const limits = getTeamRosterLimits();
  const name = options.name.trim();
  const email = normalizeEmail(options.email);

  if (!name) {
    throw new Error('Player name is required');
  }

  if (!email.includes('@')) {
    throw new Error('A valid email is required');
  }

  if (team.playerIds.length >= limits.max) {
    throw new Error(`Teams can have at most ${limits.max} players`);
  }

  const emailOnRoster = await Player.find({
    _id: { $in: team.playerIds },
    email,
  }).select('_id');

  if (emailOnRoster.length > 0) {
    throw new Error('That email is already on your roster');
  }

  const { player } = await findOrCreatePlayerByEmail({ name, email });

  if (team.playerIds.some((id) => id.equals(player._id))) {
    throw new Error('Player is already on this roster');
  }

  team.playerIds.push(player._id);
  await team.save();
  await syncApprovedRegistrationRoster(team);

  let inviteSent = false;
  let inviteNote: string | undefined;

  try {
    const invite = await createPlayerLoginInvite({
      playerId: player._id,
      email,
      role: 'player',
    });

    inviteSent = !invite.alreadyLinked;
    inviteNote = invite.alreadyLinked
      ? 'Player already has portal access'
      : invite.delivery === 'auth0_email'
        ? 'Invite email sent'
        : 'Invite ready — share the player login link if email did not send';
  } catch (error) {
    inviteNote =
      error instanceof Error
        ? `Player added, but invite could not be sent: ${error.message}`
        : 'Player added, but invite could not be sent';
  }

  const roster = await getCaptainTeamRoster(options.teamId, options.captainPlayerId);

  return { roster, inviteSent, inviteNote };
}

export async function removeCaptainTeamRosterPlayer(options: {
  teamId: mongoose.Types.ObjectId | string;
  captainPlayerId: mongoose.Types.ObjectId;
  playerId: mongoose.Types.ObjectId | string;
}): Promise<CaptainTeamRosterView> {
  const { team, league } = await assertCaptainOwnsTeam(options.teamId, options.captainPlayerId);

  if (!canCaptainEditTeamRoster(league)) {
    throw new Error(describeCaptainRosterEditBlock(league) || 'Roster changes are not allowed');
  }

  const limits = getTeamRosterLimits();

  if (!mongoose.isValidObjectId(String(options.playerId))) {
    throw new Error('Invalid player id');
  }

  const playerObjectId = new mongoose.Types.ObjectId(String(options.playerId));

  if (team.captainPlayerId?.equals(playerObjectId)) {
    throw new Error('Transfer captain before removing yourself from the roster');
  }

  if (team.playerIds.length <= limits.min) {
    throw new Error(`Teams need at least ${limits.min} players on the roster`);
  }

  const before = team.playerIds.length;
  team.playerIds = team.playerIds.filter((id) => !id.equals(playerObjectId));

  if (team.playerIds.length === before) {
    throw new Error('Player is not on this roster');
  }

  await team.save();
  await syncApprovedRegistrationRoster(team);

  return getCaptainTeamRoster(options.teamId, options.captainPlayerId);
}
