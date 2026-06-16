import type { ReturningTeamRegistrationPreview } from '../types/captain';
import type { RegistrationStatus } from '../constants/leagues';
import { API_BASE_URL } from '../config/api';

export interface PublicDivisionOption {
  _id: string;
  name: string;
  order: number;
}

export interface TeamRegistrationRosterEntry {
  name: string;
  email: string;
}

export interface SubmitTeamRegistrationPayload {
  divisionId?: string;
  teamName: string;
  roster: TeamRegistrationRosterEntry[];
  waiverAccepted: boolean;
}

export interface TeamRegistrationResult {
  registrationId: string;
  status: RegistrationStatus;
  teamId?: string;
  teamName: string;
  nextStep: 'payment' | 'approval' | 'complete';
  checkoutUrl?: string;
}

type RegisterFetch = <T>(path: string, options?: RequestInit) => Promise<T>;

export async function getPublicDivisions(leagueId: string): Promise<PublicDivisionOption[]> {
  const res = await fetch(`${API_BASE_URL}/leagues/${leagueId}/divisions`);

  if (!res.ok) {
    throw new Error('Failed to load divisions');
  }

  const json = await res.json();
  return json.data as PublicDivisionOption[];
}

export async function submitTeamRegistration(
  registerFetch: RegisterFetch,
  leagueId: string,
  payload: SubmitTeamRegistrationPayload
): Promise<TeamRegistrationResult> {
  return registerFetch<TeamRegistrationResult>(`/register/team/${leagueId}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export interface PlayerRegistrationResult {
  registrationId: string;
  status: RegistrationStatus;
  playerId: string;
  nextStep: 'payment' | 'approval' | 'waitlist' | 'complete';
  checkoutUrl?: string;
}

export interface SubmitPlayerRegistrationPayload {
  waiverAccepted: boolean;
  divisionId?: string;
  displayName?: string;
}

export async function submitPlayerRegistration(
  registerFetch: RegisterFetch,
  leagueId: string,
  payload: SubmitPlayerRegistrationPayload
): Promise<PlayerRegistrationResult> {
  return registerFetch<PlayerRegistrationResult>(`/register/player/${leagueId}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export interface RegistrationStatusResult {
  registrationId: string;
  leagueId: string;
  status: RegistrationStatus;
  nextStep: 'payment' | 'approval' | 'waitlist' | 'complete';
  entrantType: 'team' | 'player';
  teamName?: string;
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded' | 'waived';
}

export async function getRegistrationStatus(
  registerFetch: RegisterFetch,
  registrationId: string
): Promise<RegistrationStatusResult> {
  return registerFetch<RegistrationStatusResult>(`/register/registrations/${registrationId}/status`);
}

export async function retryRegistrationCheckout(
  registerFetch: RegisterFetch,
  registrationId: string
): Promise<{ checkoutUrl: string }> {
  return registerFetch<{ checkoutUrl: string }>(`/register/registrations/${registrationId}/checkout`, {
    method: 'POST',
  });
}

export async function getReturningTeamRegistrationPreview(
  registerFetch: RegisterFetch,
  targetLeagueId: string,
  priorTeamId: string
): Promise<ReturningTeamRegistrationPreview> {
  return registerFetch<ReturningTeamRegistrationPreview>(
    `/register/team/${targetLeagueId}/returning/preview?priorTeamId=${encodeURIComponent(priorTeamId)}`
  );
}

export interface SubmitReturningTeamRegistrationPayload extends SubmitTeamRegistrationPayload {
  priorTeamId: string;
}

export async function submitReturningTeamRegistration(
  registerFetch: RegisterFetch,
  targetLeagueId: string,
  payload: SubmitReturningTeamRegistrationPayload
): Promise<TeamRegistrationResult> {
  return registerFetch<TeamRegistrationResult>(`/register/team/${targetLeagueId}/returning`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
