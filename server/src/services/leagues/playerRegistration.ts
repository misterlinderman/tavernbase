import mongoose from 'mongoose';
import type { RegistrationStatus } from '../../constants/leagues';
import { REGISTRATION_SPOT_STATUSES } from '../../constants/leagues';
import { getEstablishmentSlug } from '../../config/establishment';
import { Division, League, Player, Registration, User } from '../../models';
import type { ILeague } from '../../models/leagues/League';
import type { IPlayer } from '../../models/leagues/Player';
import type { IUser } from '../../models/User';
import { appendPlayerToDivision } from './registrationActions';
import { attachRegistrationCheckout } from './registrationOwner';
import { dispatchRegistrationEmail } from '../notifications/registrationEmail';
import {
  buildPublicRegistrationInfo,
  resolveLeagueRegistration,
} from './registration';

export interface SubmitPlayerRegistrationInput {
  leagueId: string;
  auth0Sub: string;
  email: string;
  name?: string | null;
  displayName?: string;
  divisionId?: string;
  waiverAccepted: boolean;
}

export interface PlayerRegistrationResult {
  registrationId: string;
  status: RegistrationStatus;
  playerId: string;
  nextStep: 'payment' | 'approval' | 'waitlist' | 'complete';
  checkoutUrl?: string;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function parsePlayerRegistrationBody(body: unknown): {
  waiverAccepted: boolean;
  divisionId?: string;
  displayName?: string;
} {
  if (typeof body !== 'object' || body === null) {
    throw new Error('Request body must be an object');
  }

  const input = body as Record<string, unknown>;

  if (input.waiverAccepted !== true) {
    throw new Error('You must accept the waiver to register');
  }

  const divisionId =
    typeof input.divisionId === 'string' && input.divisionId.trim()
      ? input.divisionId.trim()
      : undefined;

  const displayName =
    typeof input.displayName === 'string' && input.displayName.trim()
      ? input.displayName.trim()
      : undefined;

  return {
    waiverAccepted: true,
    divisionId,
    displayName,
  };
}

async function assertLeagueAcceptsPlayerRegistration(league: ILeague): Promise<void> {
  if (league.status !== 'active') {
    throw new Error('Registration is not open for this league');
  }

  if (league.entrantType !== 'player') {
    throw new Error('This league accepts team registration only');
  }

  const info = await buildPublicRegistrationInfo(league);

  if (!info.isOpen) {
    throw new Error('Registration is closed for this league');
  }
}

async function resolveDivisionId(
  leagueId: mongoose.Types.ObjectId,
  divisionId?: string
): Promise<mongoose.Types.ObjectId> {
  const divisions = await Division.find({ leagueId }).sort({ order: 1 }).lean();

  if (divisions.length === 0) {
    throw new Error('This league has no divisions yet — contact league staff');
  }

  if (divisionId) {
    if (!mongoose.isValidObjectId(divisionId)) {
      throw new Error('Invalid divisionId');
    }

    const division = divisions.find((entry) => String(entry._id) === divisionId);

    if (!division) {
      throw new Error('Division not found in this league');
    }

    return division._id;
  }

  if (divisions.length > 1) {
    throw new Error('Choose a division to enter');
  }

  return divisions[0]._id;
}

async function ensurePlayerRegistrant(input: {
  auth0Sub: string;
  email: string;
  name?: string | null;
  displayName?: string;
}): Promise<{ user: IUser; player: IPlayer }> {
  const auth0Sub = input.auth0Sub.trim();
  const email = normalizeEmail(input.email);
  const establishmentSlug = getEstablishmentSlug();
  const staffRoles = new Set(['manager', 'staff', 'league_admin']);

  let user = await User.findOne({ auth0Sub });

  if (user && staffRoles.has(user.role)) {
    throw new Error('Staff accounts cannot register as league entrants');
  }

  const preferredName = input.displayName?.trim() || input.name?.trim();

  if (user?.playerId) {
    const player = await Player.findById(user.playerId);

    if (!player) {
      throw new Error('Account is missing a player profile');
    }

    if (preferredName && player.name !== preferredName) {
      player.name = preferredName;
      await player.save();
    }

    if (player.auth0Sub !== auth0Sub) {
      player.auth0Sub = auth0Sub;
      await player.save();
    }

    if (user.role !== 'player' && user.role !== 'captain') {
      throw new Error('This account cannot register as a league player');
    }

    return { user, player };
  }

  let player = await Player.findOne({ email });

  if (!player) {
    player = await Player.create({
      name: preferredName || email.split('@')[0] || 'Player',
      email,
      establishmentSlug,
      auth0Sub,
    });
  } else {
    if (player.auth0Sub && player.auth0Sub !== auth0Sub) {
      throw new Error('This email is already linked to another login');
    }

    if (preferredName) {
      player.name = preferredName;
    }

    if (player.auth0Sub !== auth0Sub) {
      player.auth0Sub = auth0Sub;
    }

    await player.save();
  }

  const emailOwner = await User.findOne({ email });

  if (emailOwner && emailOwner.auth0Sub !== auth0Sub) {
    throw new Error('This email is already linked to another account');
  }

  const role = user?.role === 'captain' ? 'captain' : 'player';

  user = await User.findOneAndUpdate(
    { auth0Sub },
    {
      auth0Sub,
      email,
      name: preferredName || player.name,
      role,
      playerId: player._id,
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );

  if (!user) {
    throw new Error('Could not create player account');
  }

  return { user, player };
}

function resolveInitialStatus(
  entryFeeCents: number,
  requiresApproval: boolean,
  isFull: boolean
): RegistrationStatus {
  if (isFull) {
    return 'waitlisted';
  }

  if (entryFeeCents > 0) {
    return 'pending_payment';
  }

  if (requiresApproval) {
    return 'pending_approval';
  }

  return 'approved';
}

function resolveNextStep(status: RegistrationStatus): PlayerRegistrationResult['nextStep'] {
  if (status === 'pending_payment') {
    return 'payment';
  }

  if (status === 'pending_approval') {
    return 'approval';
  }

  if (status === 'waitlisted') {
    return 'waitlist';
  }

  return 'complete';
}

export async function submitPlayerRegistration(
  input: SubmitPlayerRegistrationInput
): Promise<PlayerRegistrationResult> {
  if (!mongoose.isValidObjectId(input.leagueId)) {
    throw new Error('Invalid league id');
  }

  const league = await League.findById(input.leagueId);

  if (!league) {
    throw new Error('League not found');
  }

  await assertLeagueAcceptsPlayerRegistration(league);

  const { player } = await ensurePlayerRegistrant({
    auth0Sub: input.auth0Sub,
    email: input.email,
    name: input.name,
    displayName: input.displayName,
  });

  const existingRegistration = await Registration.findOne({
    leagueId: league._id,
    submittedByPlayerId: player._id,
    entrantType: 'player',
    status: { $in: REGISTRATION_SPOT_STATUSES },
  }).select('_id');

  if (existingRegistration) {
    throw new Error('You already have a registration in progress for this league');
  }

  const divisionObjectId = await resolveDivisionId(league._id, input.divisionId);

  const alreadyEntered = await Division.exists({
    _id: divisionObjectId,
    playerIds: player._id,
  });

  if (alreadyEntered) {
    throw new Error('You are already entered in this division');
  }

  const activeSpotsUsed = await Registration.countDocuments({
    leagueId: league._id,
    status: { $in: ['pending_payment', 'pending_approval', 'approved'] },
  });
  const registrationSettings = resolveLeagueRegistration(league.registration);
  const maxEntrants = registrationSettings.maxEntrants;
  const isFull = maxEntrants !== undefined && activeSpotsUsed >= maxEntrants;

  const waiverTextSnapshot =
    registrationSettings.waiverText?.trim() ||
    'I agree to participate under league rules and venue policies.';

  const status = resolveInitialStatus(
    registrationSettings.entryFeeCents ?? 0,
    registrationSettings.requiresApproval,
    isFull
  );

  const registration = await Registration.create({
    leagueId: league._id,
    divisionId: divisionObjectId,
    entrantType: 'player',
    status,
    submittedByPlayerId: player._id,
    playerIds: [player._id],
    waiverAccepted: true,
    waiverTextSnapshot,
  });

  if (status === 'approved') {
    await appendPlayerToDivision(divisionObjectId, player._id);
    await dispatchRegistrationEmail(registration, 'registrationApproved');
  } else {
    await dispatchRegistrationEmail(registration, 'registrationReceived');
  }

  let checkoutUrl: string | undefined;

  if (status === 'pending_payment') {
    try {
      checkoutUrl = await attachRegistrationCheckout(registration, normalizeEmail(input.email));
    } catch (error) {
      await Registration.findByIdAndDelete(registration._id);
      throw error;
    }
  }

  return {
    registrationId: String(registration._id),
    status: registration.status,
    playerId: String(player._id),
    nextStep: resolveNextStep(registration.status),
    checkoutUrl,
  };
}
