import mongoose from 'mongoose';
import type { RegistrationStatus } from '../../constants/leagues';
import { Division, League, Registration, Team } from '../../models';
import type { IRegistration } from '../../models/leagues/Registration';
import {
  dispatchRegistrationEmail,
  type RegistrationEmailNotification,
} from '../notifications/registrationEmail';
import {
  listLeagueRegistrations,
  resolveLeagueRegistration,
  type RegistrationListEntry,
} from './registration';

const ACTIVE_REGISTRATION_STATUSES: RegistrationStatus[] = [
  'pending_payment',
  'pending_approval',
  'approved',
];

export interface RegistrationActionResult {
  registration: RegistrationListEntry;
  notification: RegistrationEmailNotification | null;
}

async function countActiveRegistrationSpots(
  leagueId: mongoose.Types.ObjectId | string
): Promise<number> {
  return Registration.countDocuments({
    leagueId,
    status: { $in: ACTIVE_REGISTRATION_STATUSES },
  });
}

export async function appendPlayerToDivision(
  divisionId: mongoose.Types.ObjectId | string,
  playerId: mongoose.Types.ObjectId | string
): Promise<void> {
  const division = await Division.findById(divisionId);

  if (!division) {
    throw new Error('Division not found');
  }

  const playerObjectId = new mongoose.Types.ObjectId(String(playerId));

  if (division.playerIds.some((id) => id.equals(playerObjectId))) {
    return;
  }

  division.playerIds.push(playerObjectId);
  await division.save();
}

export async function createTeamFromRegistration(
  leagueId: mongoose.Types.ObjectId | string,
  registration: IRegistration
): Promise<void> {
  if (!registration.divisionId || !registration.teamName || !registration.playerIds?.length) {
    throw new Error('Registration is missing team details');
  }

  const existingTeam = registration.teamId
    ? await Team.findById(registration.teamId)
    : null;

  if (existingTeam) {
    registration.status = 'approved';
    registration.reviewedAt = new Date();
    await registration.save();
    return;
  }

  const duplicate = await Team.findOne({
    leagueId,
    divisionId: registration.divisionId,
    name: new RegExp(`^${registration.teamName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
  }).select('_id');

  if (duplicate) {
    throw new Error('A team with this name already exists in the division');
  }

  const team = await Team.create({
    leagueId,
    divisionId: registration.divisionId,
    name: registration.teamName,
    captainPlayerId: registration.submittedByPlayerId,
    playerIds: registration.playerIds,
  });

  registration.teamId = team._id;
  registration.status = 'approved';
  registration.reviewedAt = new Date();
  await registration.save();
}

async function fulfillApprovedRegistration(registration: IRegistration): Promise<void> {
  if (registration.entrantType === 'player') {
    if (!registration.divisionId) {
      throw new Error('Registration is missing a division');
    }

    await appendPlayerToDivision(registration.divisionId, registration.submittedByPlayerId);
    return;
  }

  await createTeamFromRegistration(registration.leagueId, registration);
}

export async function completeRegistrationAfterPayment(
  registrationId: mongoose.Types.ObjectId | string
): Promise<void> {
  const registration = await Registration.findById(registrationId);

  if (!registration) {
    throw new Error('Registration not found');
  }

  if (registration.status !== 'pending_payment') {
    return;
  }

  await dispatchRegistrationEmail(registration, 'paymentReceipt');

  const league = await League.findById(registration.leagueId).select('registration').lean();
  const requiresApproval = resolveLeagueRegistration(league?.registration).requiresApproval;

  if (requiresApproval) {
    registration.status = 'pending_approval';
    await registration.save();
    return;
  }

  registration.status = 'approved';
  registration.reviewedAt = new Date();
  await registration.save();
  await fulfillApprovedRegistration(registration);
  await dispatchRegistrationEmail(registration, 'registrationApproved');
}

async function getRegistrationForLeague(
  leagueId: mongoose.Types.ObjectId | string,
  registrationId: mongoose.Types.ObjectId | string
): Promise<IRegistration> {
  if (!mongoose.isValidObjectId(String(registrationId))) {
    throw new Error('Invalid registration id');
  }

  const registration = await Registration.findOne({
    _id: registrationId,
    leagueId,
  });

  if (!registration) {
    throw new Error('Registration not found');
  }

  return registration;
}

function hasOpenSpot(league: { registration?: unknown }, activeSpotsUsed: number): boolean {
  const maxEntrants = resolveLeagueRegistration(
    league.registration as Parameters<typeof resolveLeagueRegistration>[0]
  ).maxEntrants;
  return maxEntrants === undefined || activeSpotsUsed < maxEntrants;
}

async function loadRegistrationActionEntry(
  leagueId: mongoose.Types.ObjectId | string,
  registrationId: mongoose.Types.ObjectId | string
): Promise<RegistrationListEntry> {
  const entries = await listLeagueRegistrations({ leagueId });
  const match = entries.find((item) => item._id === String(registrationId));

  if (!match) {
    throw new Error('Could not load registration');
  }

  return match;
}

export async function approveRegistration(options: {
  leagueId: string;
  registrationId: string;
  reviewedBy?: mongoose.Types.ObjectId | string;
}): Promise<RegistrationActionResult> {
  const league = await League.findById(options.leagueId);

  if (!league) {
    throw new Error('League not found');
  }

  const registration = await getRegistrationForLeague(league._id, options.registrationId);

  if (!['pending_approval', 'waitlisted', 'pending_payment'].includes(registration.status)) {
    throw new Error('Only pending registrations can be approved');
  }

  if (registration.status === 'waitlisted') {
    const activeSpotsUsed = await countActiveRegistrationSpots(league._id);

    if (!hasOpenSpot(league, activeSpotsUsed)) {
      throw new Error('Registration is full — reject or cancel another entrant first');
    }
  }

  registration.status = 'approved';
  registration.reviewedAt = new Date();

  if (options.reviewedBy && mongoose.isValidObjectId(String(options.reviewedBy))) {
    registration.reviewedBy = new mongoose.Types.ObjectId(String(options.reviewedBy));
  }

  await registration.save();
  await fulfillApprovedRegistration(registration);
  const notification = await dispatchRegistrationEmail(registration, 'registrationApproved');

  return {
    registration: await loadRegistrationActionEntry(league._id, registration._id),
    notification,
  };
}

export async function rejectRegistration(options: {
  leagueId: string;
  registrationId: string;
  notes?: string;
  reviewedBy?: mongoose.Types.ObjectId | string;
}): Promise<RegistrationActionResult> {
  const registration = await getRegistrationForLeague(options.leagueId, options.registrationId);

  if (!['pending_approval', 'waitlisted', 'pending_payment'].includes(registration.status)) {
    throw new Error('Only pending registrations can be rejected');
  }

  registration.status = 'rejected';
  registration.reviewedAt = new Date();
  registration.notes = options.notes?.trim() || registration.notes;

  if (options.reviewedBy && mongoose.isValidObjectId(String(options.reviewedBy))) {
    registration.reviewedBy = new mongoose.Types.ObjectId(String(options.reviewedBy));
  }

  await registration.save();
  const notification = await dispatchRegistrationEmail(registration, 'registrationRejected', {
    reason: options.notes,
  });

  return {
    registration: await loadRegistrationActionEntry(options.leagueId, registration._id),
    notification,
  };
}

export async function promoteWaitlistedRegistration(options: {
  leagueId: string;
  registrationId: string;
}): Promise<RegistrationActionResult> {
  const league = await League.findById(options.leagueId);

  if (!league) {
    throw new Error('League not found');
  }

  const registration = await getRegistrationForLeague(league._id, options.registrationId);

  if (registration.status !== 'waitlisted') {
    throw new Error('Only waitlisted registrations can be promoted');
  }

  const activeSpotsUsed = await countActiveRegistrationSpots(league._id);

  if (!hasOpenSpot(league, activeSpotsUsed)) {
    throw new Error('Registration is full — no spots available to promote');
  }

  const settings = resolveLeagueRegistration(league.registration);
  const entryFeeCents = settings.entryFeeCents ?? 0;

  let nextStatus: RegistrationStatus;

  if (entryFeeCents > 0) {
    nextStatus = 'pending_payment';
  } else if (settings.requiresApproval) {
    nextStatus = 'pending_approval';
  } else {
    nextStatus = 'approved';
  }

  registration.status = nextStatus;
  await registration.save();

  let notification: RegistrationEmailNotification | null = null;

  if (nextStatus === 'approved') {
    await fulfillApprovedRegistration(registration);
    notification = await dispatchRegistrationEmail(registration, 'registrationApproved');
  } else {
    notification = await dispatchRegistrationEmail(registration, 'registrationReceived');
  }

  return {
    registration: await loadRegistrationActionEntry(league._id, registration._id),
    notification,
  };
}
