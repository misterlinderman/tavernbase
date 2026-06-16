import mongoose from 'mongoose';
import type { RegistrationStatus } from '../../constants/leagues';
import { REGISTRATION_SPOT_STATUSES } from '../../constants/leagues';
import { getEstablishmentSlug } from '../../config/establishment';
import { getTeamRosterLimits } from '../../config/rosterLimits';
import { Division, League, Player, Registration, Team, User } from '../../models';
import type { ILeague } from '../../models/leagues/League';
import type { IPlayer } from '../../models/leagues/Player';
import type { IUser } from '../../models/User';
import {
  buildPublicRegistrationInfo,
  countRegistrationSpotsUsed,
  resolveLeagueRegistration,
} from './registration';
import { createTeamFromRegistration } from './registrationActions';
import { attachRegistrationCheckout } from './registrationOwner';
import { dispatchRegistrationEmail } from '../notifications/registrationEmail';

export interface TeamRegistrationRosterEntry {
  name: string;
  email: string;
}

export interface SubmitTeamRegistrationInput {
  leagueId: string;
  auth0Sub: string;
  email: string;
  name?: string | null;
  divisionId?: string;
  teamName: string;
  roster: TeamRegistrationRosterEntry[];
  waiverAccepted: boolean;
  returningTeamId?: string;
}

export interface TeamRegistrationResult {
  registrationId: string;
  status: RegistrationStatus;
  teamId?: string;
  teamName: string;
  nextStep: 'payment' | 'approval' | 'complete';
  checkoutUrl?: string;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeTeamName(name: string): string {
  return name.trim();
}

export function parseTeamRegistrationBody(body: unknown): {
  divisionId?: string;
  teamName: string;
  roster: TeamRegistrationRosterEntry[];
  waiverAccepted: boolean;
} {
  if (typeof body !== 'object' || body === null) {
    throw new Error('Request body must be an object');
  }

  const input = body as Record<string, unknown>;

  if (typeof input.teamName !== 'string' || !input.teamName.trim()) {
    throw new Error('teamName is required');
  }

  if (input.waiverAccepted !== true) {
    throw new Error('You must accept the waiver to register');
  }

  if (!Array.isArray(input.roster) || input.roster.length === 0) {
    throw new Error('roster must include at least one player');
  }

  const roster: TeamRegistrationRosterEntry[] = [];

  for (const entry of input.roster) {
    if (typeof entry !== 'object' || entry === null) {
      throw new Error('Each roster entry must be an object');
    }

    const row = entry as Record<string, unknown>;
    const name = typeof row.name === 'string' ? row.name.trim() : '';
    const email = typeof row.email === 'string' ? normalizeEmail(row.email) : '';

    if (!name) {
      throw new Error('Each roster player needs a name');
    }

    if (!email || !email.includes('@')) {
      throw new Error('Each roster player needs a valid email');
    }

    roster.push({ name, email });
  }

  const divisionId =
    typeof input.divisionId === 'string' && input.divisionId.trim()
      ? input.divisionId.trim()
      : undefined;

  return {
    divisionId,
    teamName: normalizeTeamName(input.teamName),
    roster,
    waiverAccepted: true,
  };
}

async function assertLeagueAcceptsTeamRegistration(league: ILeague): Promise<void> {
  if (league.status !== 'active') {
    throw new Error('Registration is not open for this league');
  }

  if (league.entrantType === 'player') {
    throw new Error('This league accepts individual player registration only');
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
    throw new Error('Choose a division for your team');
  }

  return divisions[0]._id;
}

async function assertTeamNameAvailable(
  leagueId: mongoose.Types.ObjectId,
  divisionId: mongoose.Types.ObjectId,
  teamName: string
): Promise<void> {
  const pattern = new RegExp(`^${escapeRegex(teamName)}$`, 'i');

  const [existingTeam, existingRegistration] = await Promise.all([
    Team.findOne({ leagueId, divisionId, name: pattern }).select('_id').lean(),
    Registration.findOne({
      leagueId,
      divisionId,
      teamName: pattern,
      status: { $in: REGISTRATION_SPOT_STATUSES },
    })
      .select('_id')
      .lean(),
  ]);

  if (existingTeam || existingRegistration) {
    throw new Error('A team with this name is already registered in that division');
  }
}

async function findOrCreatePlayerByEmail(options: {
  name: string;
  email: string;
  establishmentSlug: string;
}): Promise<IPlayer> {
  const email = normalizeEmail(options.email);
  const existing = await Player.findOne({ establishmentSlug: options.establishmentSlug, email });

  if (existing) {
    if (!existing.name.trim() && options.name.trim()) {
      existing.name = options.name.trim();
      await existing.save();
    }

    return existing;
  }

  return Player.create({
    name: options.name.trim(),
    email,
    establishmentSlug: options.establishmentSlug,
  });
}

export async function ensureRegistrantPlayer(input: {
  auth0Sub: string;
  email: string;
  name?: string | null;
}): Promise<{ user: IUser; player: IPlayer; promotedFromPlayer: boolean }> {
  const auth0Sub = input.auth0Sub.trim();
  const email = normalizeEmail(input.email);
  const establishmentSlug = getEstablishmentSlug();

  const staffRoles = new Set(['manager', 'staff', 'league_admin']);
  let user = await User.findOne({ auth0Sub });
  let promotedFromPlayer = false;

  if (user && staffRoles.has(user.role)) {
    throw new Error('Staff accounts cannot register as league entrants');
  }

  if (user?.role === 'captain' && user.playerId) {
    const player = await Player.findById(user.playerId);

    if (!player) {
      throw new Error('Captain account is missing a player profile');
    }

    return { user, player, promotedFromPlayer: false };
  }

  if (user?.role === 'player' && user.playerId) {
    const player = await Player.findById(user.playerId);

    if (!player) {
      throw new Error('Player account is missing a profile link');
    }

    user.role = 'captain';
    await user.save();
    promotedFromPlayer = true;

    if (player.auth0Sub !== auth0Sub) {
      player.auth0Sub = auth0Sub;
      await player.save();
    }

    return { user, player, promotedFromPlayer };
  }

  let player = await Player.findOne({ email });

  if (!player) {
    player = await Player.create({
      name: input.name?.trim() || email.split('@')[0] || 'Captain',
      email,
      establishmentSlug,
      auth0Sub,
    });
  } else if (player.auth0Sub && player.auth0Sub !== auth0Sub) {
    throw new Error('This email is already linked to another login');
  } else if (player.auth0Sub !== auth0Sub) {
    player.auth0Sub = auth0Sub;
    await player.save();
  }

  const emailOwner = await User.findOne({ email });

  if (emailOwner && emailOwner.auth0Sub !== auth0Sub) {
    throw new Error('This email is already linked to another account');
  }

  user = await User.findOneAndUpdate(
    { auth0Sub },
    {
      auth0Sub,
      email,
      name: input.name?.trim() || player.name,
      role: 'captain',
      playerId: player._id,
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );

  if (!user) {
    throw new Error('Could not create captain account');
  }

  return { user, player, promotedFromPlayer };
}

function resolveInitialStatus(
  entryFeeCents: number,
  requiresApproval: boolean
): RegistrationStatus {
  if (entryFeeCents > 0) {
    return 'pending_payment';
  }

  if (requiresApproval) {
    return 'pending_approval';
  }

  return 'approved';
}

function resolveNextStep(status: RegistrationStatus): TeamRegistrationResult['nextStep'] {
  if (status === 'pending_payment') {
    return 'payment';
  }

  if (status === 'pending_approval') {
    return 'approval';
  }

  return 'complete';
}

export async function submitTeamRegistration(
  input: SubmitTeamRegistrationInput
): Promise<TeamRegistrationResult> {
  if (!mongoose.isValidObjectId(input.leagueId)) {
    throw new Error('Invalid league id');
  }

  const league = await League.findById(input.leagueId);

  if (!league) {
    throw new Error('League not found');
  }

  await assertLeagueAcceptsTeamRegistration(league);

  const parsed = {
    divisionId: input.divisionId,
    teamName: normalizeTeamName(input.teamName),
    roster: input.roster.map((entry) => ({
      name: entry.name.trim(),
      email: normalizeEmail(entry.email),
    })),
    waiverAccepted: input.waiverAccepted,
  };

  const limits = getTeamRosterLimits();

  if (parsed.roster.length < limits.min) {
    throw new Error(`Teams need at least ${limits.min} players on the roster`);
  }

  if (parsed.roster.length > limits.max) {
    throw new Error(`Teams can have at most ${limits.max} players on the roster`);
  }

  const rosterEmails = new Set<string>();

  for (const entry of parsed.roster) {
    if (rosterEmails.has(entry.email)) {
      throw new Error('Each email can only appear once on the roster');
    }

    rosterEmails.add(entry.email);
  }

  const registrantEmail = normalizeEmail(input.email);

  if (!rosterEmails.has(registrantEmail)) {
    throw new Error('Add yourself to the roster using the same email you signed in with');
  }

  const { user, player } = await ensureRegistrantPlayer({
    auth0Sub: input.auth0Sub,
    email: input.email,
    name: input.name,
  });

  const existingRegistration = await Registration.findOne({
    leagueId: league._id,
    submittedByPlayerId: player._id,
    entrantType: 'team',
    status: { $in: REGISTRATION_SPOT_STATUSES },
  }).select('_id');

  if (existingRegistration) {
    throw new Error('You already have a registration in progress for this league');
  }

  const divisionObjectId = await resolveDivisionId(league._id, parsed.divisionId);
  await assertTeamNameAvailable(league._id, divisionObjectId, parsed.teamName);

  const spotsUsed = await countRegistrationSpotsUsed(league._id);
  const registrationSettings = resolveLeagueRegistration(league.registration);
  const maxEntrants = registrationSettings.maxEntrants;

  if (maxEntrants !== undefined && spotsUsed >= maxEntrants) {
    throw new Error('Registration is full for this league');
  }

  const establishmentSlug = getEstablishmentSlug();
  const playerIds: mongoose.Types.ObjectId[] = [];

  for (const entry of parsed.roster) {
    const rosterPlayer = await findOrCreatePlayerByEmail({
      name: entry.name,
      email: entry.email,
      establishmentSlug,
    });

    playerIds.push(rosterPlayer._id);
  }

  const waiverTextSnapshot =
    registrationSettings.waiverText?.trim() ||
    'I agree to participate under league rules and venue policies.';

  const status = resolveInitialStatus(
    registrationSettings.entryFeeCents ?? 0,
    registrationSettings.requiresApproval
  );

  const registration = await Registration.create({
    leagueId: league._id,
    divisionId: divisionObjectId,
    entrantType: 'team',
    status,
    submittedByPlayerId: player._id,
    teamName: parsed.teamName,
    playerIds,
    returningTeamId:
      input.returningTeamId && mongoose.isValidObjectId(input.returningTeamId)
        ? new mongoose.Types.ObjectId(input.returningTeamId)
        : undefined,
    waiverAccepted: true,
    waiverTextSnapshot,
  });

  if (status === 'approved') {
    await createTeamFromRegistration(league._id, registration);
    await dispatchRegistrationEmail(registration, 'registrationApproved');
  } else {
    await dispatchRegistrationEmail(registration, 'registrationReceived');
  }

  if (user.role !== 'captain') {
    user.role = 'captain';
    await user.save();
  }

  let checkoutUrl: string | undefined;

  if (status === 'pending_payment') {
    try {
      checkoutUrl = await attachRegistrationCheckout(registration, registrantEmail);
    } catch (error) {
      await Registration.findByIdAndDelete(registration._id);
      throw error;
    }
  }

  return {
    registrationId: String(registration._id),
    status: registration.status,
    teamId: registration.teamId ? String(registration.teamId) : undefined,
    teamName: parsed.teamName,
    nextStep: resolveNextStep(registration.status),
    checkoutUrl,
  };
}
