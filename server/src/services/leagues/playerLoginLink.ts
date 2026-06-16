import mongoose from 'mongoose';
import { Division, PendingInvite, Player, Team, User } from '../../models';
import type { PendingInviteRole } from '../../models/leagues/PendingInvite';
import type { IUser } from '../../models/User';
import {
  ensureAuth0UserAndSendInvite,
  isAuth0ManagementConfigured,
} from '../auth0/managementApi';
import { isCaptainPlayerLinked } from './captainActivation';
import { assertInviteRateLimit } from './inviteRateLimit';

export type InviteDeliveryMethod = 'auth0_email' | 'manual_copy';

export interface PlayerLoginInviteResult {
  playerId: string;
  playerName: string;
  playerEmail: string;
  role: PendingInviteRole;
  loginUrl: string;
  invitedAt: string;
  alreadyLinked: boolean;
  emailSubject: string;
  emailBody: string;
  delivery: InviteDeliveryMethod;
  auth0EmailSent?: boolean;
}

function resolveLoginUrl(role: PendingInviteRole): string {
  const clientUrl = process.env.CLIENT_URL?.replace(/\/$/, '') ?? 'http://localhost:5173';
  return role === 'captain' ? `${clientUrl}/captain/login` : `${clientUrl}/player/login`;
}

function buildInviteEmail(options: {
  playerName: string;
  playerEmail: string;
  role: PendingInviteRole;
}): { emailSubject: string; emailBody: string } {
  const loginUrl = resolveLoginUrl(options.role);
  const portalLabel = options.role === 'captain' ? 'captain' : 'player';

  const emailSubject =
    options.role === 'captain'
      ? 'Captain login — league scoresheets'
      : 'Player login — league standings';

  const emailBody = [
    `Hi ${options.playerName},`,
    '',
    options.role === 'captain'
      ? 'You have been invited to submit match scoresheets for your team.'
      : 'You have been invited to view league standings for your team.',
    '',
    `1. Open ${loginUrl}`,
    `2. Sign in with Auth0 using this email: ${options.playerEmail}`,
    options.role === 'captain'
      ? '3. Submit scores after each match — both sides must enter matching results.'
      : '3. View standings for leagues you are entered in.',
    '',
    'If you have trouble signing in, contact your league manager.',
  ].join('\n');

  return { emailSubject, emailBody: `${emailBody}\n\n(${portalLabel} portal)` };
}

async function deliverLoginInvite(options: {
  email: string;
  name: string;
  role: PendingInviteRole;
}): Promise<{ delivery: InviteDeliveryMethod; auth0EmailSent?: boolean }> {
  if (!isAuth0ManagementConfigured()) {
    return { delivery: 'manual_copy' };
  }

  try {
    await ensureAuth0UserAndSendInvite({
      email: options.email,
      name: options.name,
      loginUrl: resolveLoginUrl(options.role),
    });

    return { delivery: 'auth0_email', auth0EmailSent: true };
  } catch (error) {
    console.error('Auth0 invite delivery failed; falling back to manual email template:', error);
    return { delivery: 'manual_copy', auth0EmailSent: false };
  }
}

function buildInviteResult(options: {
  playerId: string;
  playerName: string;
  playerEmail: string;
  role: PendingInviteRole;
  invitedAt: string;
  alreadyLinked: boolean;
  delivery: InviteDeliveryMethod;
  auth0EmailSent?: boolean;
}): PlayerLoginInviteResult {
  const { emailSubject, emailBody } = buildInviteEmail({
    playerName: options.playerName,
    playerEmail: options.playerEmail,
    role: options.role,
  });

  return {
    playerId: options.playerId,
    playerName: options.playerName,
    playerEmail: options.playerEmail,
    role: options.role,
    loginUrl: resolveLoginUrl(options.role),
    invitedAt: options.invitedAt,
    alreadyLinked: options.alreadyLinked,
    emailSubject,
    emailBody,
    delivery: options.delivery,
    auth0EmailSent: options.auth0EmailSent,
  };
}

export async function isPlayerLoginLinked(
  playerId: mongoose.Types.ObjectId | string,
  role?: PendingInviteRole
): Promise<boolean> {
  const player = await Player.findById(playerId).select('auth0Sub').lean();

  if (player?.auth0Sub) {
    return true;
  }

  const userFilter: Record<string, unknown> = {
    playerId,
    role: role ? role : { $in: ['captain', 'player'] },
  };

  return Boolean(await User.exists(userFilter));
}

export async function assertPlayerLoginEligible(
  playerId: mongoose.Types.ObjectId | string,
  role: PendingInviteRole
): Promise<void> {
  const playerObjectId =
    typeof playerId === 'string' ? new mongoose.Types.ObjectId(playerId) : playerId;

  if (role === 'captain') {
    const isCaptain = await Team.exists({ captainPlayerId: playerObjectId });

    if (!isCaptain) {
      throw new Error('This player is not assigned as a team captain');
    }

    return;
  }

  const [onRoster, isCaptain, onDivision] = await Promise.all([
    Team.exists({ playerIds: playerObjectId }),
    Team.exists({ captainPlayerId: playerObjectId }),
    Division.exists({ playerIds: playerObjectId }),
  ]);

  if (isCaptain) {
    throw new Error('Team captains should use the captain login, not the player login');
  }

  if (!onRoster && !onDivision) {
    throw new Error('Add this player to a team roster or tournament entrant list first');
  }
}

export async function createPlayerLoginInvite(options: {
  playerId: mongoose.Types.ObjectId | string;
  email: string;
  role: PendingInviteRole;
  invitedBy?: mongoose.Types.ObjectId;
}): Promise<PlayerLoginInviteResult> {
  const player = await Player.findById(options.playerId);

  if (!player) {
    throw new Error('Player not found');
  }

  await assertPlayerLoginEligible(player._id, options.role);

  const email = options.email.trim().toLowerCase();

  if (!email) {
    throw new Error('Email is required to send an invite');
  }

  const alreadyLinked = await isPlayerLoginLinked(player._id, options.role);

  if (alreadyLinked) {
    return buildInviteResult({
      playerId: String(player._id),
      playerName: player.name,
      playerEmail: player.email ?? email,
      role: options.role,
      invitedAt: new Date().toISOString(),
      alreadyLinked: true,
      delivery: 'manual_copy',
    });
  }

  assertInviteRateLimit(String(player._id));

  const invitedAt = new Date();

  if (player.email !== email) {
    player.email = email;
  }

  if (options.role === 'captain') {
    player.captainInvitedAt = invitedAt;
  }

  await player.save();

  await PendingInvite.findOneAndUpdate(
    { playerId: player._id, role: options.role },
    {
      playerId: player._id,
      email,
      role: options.role,
      invitedBy: options.invitedBy,
      invitedAt,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const delivery = await deliverLoginInvite({
    email,
    name: player.name,
    role: options.role,
  });

  return buildInviteResult({
    playerId: String(player._id),
    playerName: player.name,
    playerEmail: email,
    role: options.role,
    invitedAt: invitedAt.toISOString(),
    alreadyLinked: false,
    delivery: delivery.delivery,
    auth0EmailSent: delivery.auth0EmailSent,
  });
}

export async function resendPlayerLoginInvite(options: {
  playerId: mongoose.Types.ObjectId | string;
  role: PendingInviteRole;
  invitedBy?: mongoose.Types.ObjectId;
}): Promise<PlayerLoginInviteResult> {
  const pending = await PendingInvite.findOne({
    playerId: options.playerId,
    role: options.role,
  });

  if (!pending) {
    throw new Error('No pending invite found for this player and role');
  }

  return createPlayerLoginInvite({
    playerId: options.playerId,
    email: pending.email,
    role: options.role,
    invitedBy: options.invitedBy,
  });
}

export async function linkPlayerLoginManual(options: {
  playerId: mongoose.Types.ObjectId | string;
  auth0Sub: string;
  email: string;
  name: string;
  role: PendingInviteRole;
}): Promise<IUser> {
  const player = await Player.findById(options.playerId);

  if (!player) {
    throw new Error('Player not found');
  }

  await assertPlayerLoginEligible(player._id, options.role);

  const auth0Sub = options.auth0Sub.trim();
  const email = options.email.trim().toLowerCase();
  const name = options.name.trim();

  if (!auth0Sub || !email || !name) {
    throw new Error('auth0Sub, email, and name are required');
  }

  const existingRoleUser = await User.findOne({ playerId: player._id, role: options.role });

  if (existingRoleUser && existingRoleUser.auth0Sub !== auth0Sub) {
    throw new Error(`This player already has a ${options.role} login linked to another Auth0 account`);
  }

  const user = await User.findOneAndUpdate(
    { auth0Sub },
    {
      auth0Sub,
      email,
      name,
      role: options.role,
      playerId: player._id,
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );

  player.auth0Sub = auth0Sub;

  if (player.email !== email) {
    player.email = email;
  }

  await player.save();
  await PendingInvite.deleteMany({ playerId: player._id, role: options.role });

  return user;
}

export async function unlinkPlayerLogin(
  playerId: mongoose.Types.ObjectId | string
): Promise<void> {
  const player = await Player.findById(playerId);

  if (!player) {
    throw new Error('Player not found');
  }

  await User.deleteMany({ playerId: player._id, role: { $in: ['captain', 'player'] } });
  await PendingInvite.deleteMany({ playerId: player._id });

  player.auth0Sub = undefined;
  player.captainInvitedAt = undefined;
  await player.save();
}

export async function getPendingInvitesByPlayerIds(
  playerIds: mongoose.Types.ObjectId[]
): Promise<Map<string, Array<{ playerId: mongoose.Types.ObjectId; invitedAt: Date; role: PendingInviteRole }>>> {
  if (playerIds.length === 0) {
    return new Map();
  }

  const invites = await PendingInvite.find({ playerId: { $in: playerIds } })
    .select('playerId invitedAt role')
    .lean();

  const byPlayer = new Map<
    string,
    Array<{ playerId: mongoose.Types.ObjectId; invitedAt: Date; role: PendingInviteRole }>
  >();

  for (const invite of invites) {
    const key = String(invite.playerId);
    const existing = byPlayer.get(key) ?? [];
    existing.push({
      playerId: invite.playerId,
      invitedAt: invite.invitedAt,
      role: invite.role,
    });
    byPlayer.set(key, existing);
  }

  return byPlayer;
}

export { isCaptainPlayerLinked };
