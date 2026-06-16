import mongoose from 'mongoose';
import type { EntrantType, RegistrationStatus } from '../../constants/leagues';
import { Payment, Player, Registration, User } from '../../models';
import type { IRegistration } from '../../models/leagues/Registration';
import type { IPlayer } from '../../models/leagues/Player';
import { createRegistrationCheckout } from '../payments/registrationPayment';

export type RegistrationNextStep = 'payment' | 'approval' | 'waitlist' | 'complete';

export interface RegistrationOwnerStatus {
  registrationId: string;
  leagueId: string;
  status: RegistrationStatus;
  nextStep: RegistrationNextStep;
  entrantType: EntrantType;
  teamName?: string;
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded' | 'waived';
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function resolveRegistrationNextStep(status: RegistrationStatus): RegistrationNextStep {
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

export async function resolveAuthenticatedRegistrantPlayer(
  auth0Sub: string,
  email: string
): Promise<IPlayer | null> {
  const user = await User.findOne({ auth0Sub: auth0Sub.trim() }).select('playerId').lean();

  if (user?.playerId) {
    return Player.findById(user.playerId);
  }

  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return null;
  }

  return Player.findOne({ email: normalizedEmail });
}

export async function loadRegistrationForOwner(
  registrationId: string,
  auth0Sub: string,
  email: string
): Promise<{ registration: IRegistration; player: IPlayer }> {
  if (!mongoose.isValidObjectId(registrationId)) {
    throw new Error('Invalid registration id');
  }

  const player = await resolveAuthenticatedRegistrantPlayer(auth0Sub, email);

  if (!player) {
    throw new Error('Unauthorized');
  }

  const registration = await Registration.findById(registrationId);

  if (!registration) {
    throw new Error('Registration not found');
  }

  if (!registration.submittedByPlayerId.equals(player._id)) {
    throw new Error('Unauthorized');
  }

  return { registration, player };
}

export async function getRegistrationStatusForOwner(
  registrationId: string,
  auth0Sub: string,
  email: string
): Promise<RegistrationOwnerStatus> {
  const { registration } = await loadRegistrationForOwner(registrationId, auth0Sub, email);

  let paymentStatus: RegistrationOwnerStatus['paymentStatus'];

  if (registration.paymentId) {
    const payment = await Payment.findById(registration.paymentId).select('status').lean();
    paymentStatus = payment?.status;
  }

  return {
    registrationId: String(registration._id),
    leagueId: String(registration.leagueId),
    status: registration.status,
    nextStep: resolveRegistrationNextStep(registration.status),
    entrantType: registration.entrantType,
    teamName: registration.teamName,
    paymentStatus,
  };
}

export async function retryRegistrationCheckout(
  registrationId: string,
  auth0Sub: string,
  email: string
): Promise<{ checkoutUrl: string }> {
  await loadRegistrationForOwner(registrationId, auth0Sub, email);

  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    throw new Error('Email not found in your login');
  }

  const checkout = await createRegistrationCheckout(registrationId, normalizedEmail);

  return { checkoutUrl: checkout.checkoutUrl };
}

export async function attachRegistrationCheckout(
  registration: IRegistration,
  customerEmail: string
): Promise<string> {
  const checkout = await createRegistrationCheckout(String(registration._id), normalizeEmail(customerEmail));
  return checkout.checkoutUrl;
}
