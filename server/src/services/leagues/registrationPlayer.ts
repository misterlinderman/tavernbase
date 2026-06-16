import { REGISTRATION_SPOT_STATUSES } from '../../constants/leagues';
import { PendingInvite, Player, Registration } from '../../models';
import { listOpenRegistrations } from './registration';

export async function resolveRegistrationPlayer(email: string) {
  const normalized = email.trim().toLowerCase();

  const pendingInvite = await PendingInvite.findOne({
    email: normalized,
    role: 'player',
  }).lean();

  if (pendingInvite) {
    return Player.findById(pendingInvite.playerId);
  }

  const player = await Player.findOne({ email: normalized });

  if (!player) {
    return null;
  }

  const hasPlayerRegistration = await Registration.exists({
    submittedByPlayerId: player._id,
    entrantType: 'player',
    status: { $in: REGISTRATION_SPOT_STATUSES },
  });

  if (hasPlayerRegistration) {
    return player;
  }

  return null;
}

export async function hasOpenPlayerRegistration(): Promise<boolean> {
  const listings = await listOpenRegistrations();
  return listings.some((listing) => listing.entrantType === 'player');
}
