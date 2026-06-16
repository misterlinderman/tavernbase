import { REGISTRATION_SPOT_STATUSES } from '../../constants/leagues';
import { PendingInvite, Player, Registration } from '../../models';
import { listOpenRegistrations } from './registration';

export async function resolveRegistrationCaptain(email: string) {
  const normalized = email.trim().toLowerCase();

  const pendingInvite = await PendingInvite.findOne({
    email: normalized,
    role: 'captain',
  }).lean();

  if (pendingInvite) {
    return Player.findById(pendingInvite.playerId);
  }

  const player = await Player.findOne({ email: normalized });

  if (!player) {
    return null;
  }

  const hasTeamRegistration = await Registration.exists({
    submittedByPlayerId: player._id,
    entrantType: 'team',
    status: { $in: REGISTRATION_SPOT_STATUSES },
  });

  if (hasTeamRegistration) {
    return player;
  }

  return null;
}

export async function hasOpenTeamRegistration(): Promise<boolean> {
  const listings = await listOpenRegistrations();
  return listings.some((listing) => listing.entrantType !== 'player');
}
