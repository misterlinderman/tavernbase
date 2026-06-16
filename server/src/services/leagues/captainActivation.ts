import mongoose from 'mongoose';
import { Player, Team, User } from '../../models';
import type { IUser } from '../../models/User';
import { getEstablishmentSlug } from '../../config/establishment';
import {
  hasOpenTeamRegistration,
  resolveRegistrationCaptain,
} from './registrationCaptain';

export interface ActivateCaptainInput {
  auth0Sub: string;
  email: string;
  name?: string | null;
}

export async function activateCaptainFromAuth(input: ActivateCaptainInput): Promise<IUser> {
  const auth0Sub = input.auth0Sub.trim();
  const email = input.email.trim().toLowerCase();

  const existingBySub = await User.findOne({ auth0Sub });

  if (existingBySub) {
    if (existingBySub.role !== 'captain') {
      throw new Error('This Auth0 account is registered as staff, not a captain');
    }

    if (!existingBySub.playerId) {
      throw new Error('Captain account is missing a player link');
    }

    return existingBySub;
  }

  let player = await Player.findOne({ email });

  if (!player) {
    player = await resolveRegistrationCaptain(email);

    if (!player && (await hasOpenTeamRegistration())) {
      player = await Player.create({
        name: input.name?.trim() || email.split('@')[0] || 'Captain',
        email,
        establishmentSlug: getEstablishmentSlug(),
        auth0Sub,
      });
    }
  }

  if (!player) {
    throw new Error(
      'No captain invite found for this email. Use the same email your league manager invited, or register for an open league session.'
    );
  }

  const isTeamCaptain = await Team.exists({ captainPlayerId: player._id });
  const isRegistrationCaptain = Boolean(await resolveRegistrationCaptain(email));

  if (!isTeamCaptain && !isRegistrationCaptain && !(await hasOpenTeamRegistration())) {
    throw new Error('This player is not assigned as a team captain');
  }

  const existingCaptainUser = await User.findOne({ playerId: player._id, role: 'captain' });

  if (existingCaptainUser && existingCaptainUser.auth0Sub !== auth0Sub) {
    throw new Error('This captain profile is already linked to another login');
  }

  const emailOwner = await User.findOne({ email });

  if (emailOwner && emailOwner.auth0Sub !== auth0Sub) {
    throw new Error('This email is already linked to another account');
  }

  const user = await User.findOneAndUpdate(
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

  if (player.auth0Sub !== auth0Sub) {
    player.auth0Sub = auth0Sub;
    await player.save();
  }

  return user;
}

export async function isCaptainPlayerLinked(
  playerId: mongoose.Types.ObjectId | string
): Promise<boolean> {
  const [player, captainUser] = await Promise.all([
    Player.findById(playerId).select('auth0Sub').lean(),
    User.findOne({ playerId, role: 'captain' }).select('_id').lean(),
  ]);

  return Boolean(player?.auth0Sub || captainUser);
}
