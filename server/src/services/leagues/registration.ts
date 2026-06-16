import mongoose from 'mongoose';
import {
  REGISTRATION_SPOT_STATUSES,
  SPORTS,
  isRegistrationCurrency,
  type EntrantType,
  type LeagueFormat,
  type RegistrationStatus,
  type Sport,
} from '../../constants/leagues';
import { isSportLicensed } from '../../config/establishment';
import { League, Payment, Player, Registration, SiteSettings, Division } from '../../models';
import type { IPayment } from '../../models/leagues/Payment';
import type { PaymentStatus } from '../../constants/payments';
import type { ILeague, ILeagueRegistration } from '../../models/leagues/League';
import type { IRegistration } from '../../models/leagues/Registration';

export interface PublicRegistrationInfo {
  leagueId: string;
  leagueName: string;
  sport: ILeague['sport'];
  kind: ILeague['kind'];
  entrantType: EntrantType;
  enabled: boolean;
  opensAt?: string;
  closesAt?: string;
  entryFeeCents: number;
  entryFeeDisplay: string;
  currency: ILeagueRegistration['currency'];
  maxEntrants?: number;
  spotsRemaining: number | null;
  requiresApproval: boolean;
  isOpen: boolean;
  waiverText?: string;
}

export interface OpenRegistrationListing extends PublicRegistrationInfo {
  seasonStart: string;
  seasonEnd: string;
  format: LeagueFormat;
}

export interface RegistrationListEntry {
  _id: string;
  leagueId: string;
  divisionId?: string;
  entrantType: EntrantType;
  status: RegistrationStatus;
  submittedByPlayerId: string;
  submittedByPlayerName?: string;
  teamId?: string;
  teamName?: string;
  playerIds?: string[];
  waiverAccepted: boolean;
  reviewedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  paymentId?: string;
  paymentStatus?: PaymentStatus | null;
  amountCents?: number;
  amountDisplay?: string;
  paidAt?: string;
}

export function resolveLeagueRegistration(
  registration?: Partial<ILeagueRegistration> | null
): ILeagueRegistration {
  return {
    enabled: registration?.enabled ?? false,
    opensAt: registration?.opensAt,
    closesAt: registration?.closesAt,
    entryFeeCents: registration?.entryFeeCents ?? 0,
    currency: registration?.currency ?? 'usd',
    maxEntrants: registration?.maxEntrants,
    requiresApproval: registration?.requiresApproval ?? false,
    captainRosterEdits: registration?.captainRosterEdits ?? false,
    priorLeagueId: registration?.priorLeagueId,
    waiverText: registration?.waiverText,
  };
}

export function formatEntryFeeDisplay(entryFeeCents: number, currency: string): string {
  if (entryFeeCents <= 0) {
    return 'Free';
  }

  if (currency === 'usd') {
    return `$${(entryFeeCents / 100).toFixed(2)}`;
  }

  return `${entryFeeCents} ${currency.toUpperCase()}`;
}

export const MAX_ENTRY_FEE_CENTS = 999_999;

export function assertValidEntryFeeCents(entryFeeCents: number): void {
  if (!Number.isInteger(entryFeeCents) || entryFeeCents < 0) {
    throw new Error('registration.entryFeeCents must be a non-negative integer');
  }

  if (entryFeeCents > MAX_ENTRY_FEE_CENTS) {
    throw new Error(`registration.entryFeeCents cannot exceed ${MAX_ENTRY_FEE_CENTS}`);
  }
}

export async function validateRegistrationSettingsUpdate(
  league: Pick<ILeague, '_id' | 'registration'>,
  update: Partial<ILeagueRegistration>
): Promise<void> {
  if (update.entryFeeCents === undefined) {
    return;
  }

  assertValidEntryFeeCents(update.entryFeeCents);

  const currentFee = resolveLeagueRegistration(league.registration).entryFeeCents ?? 0;

  if (update.entryFeeCents === currentFee) {
    return;
  }

  const pendingPaymentCount = await Registration.countDocuments({
    leagueId: league._id,
    status: 'pending_payment',
  });

  if (pendingPaymentCount > 0) {
    throw new Error(
      'Cannot change entry fee while registrations are awaiting payment — wait for checkout to complete or cancel those registrations first'
    );
  }
}

export function parseRegistrationUpdate(body: unknown): Partial<ILeagueRegistration> {
  if (typeof body !== 'object' || body === null) {
    throw new Error('registration must be an object');
  }

  const input = body as Record<string, unknown>;
  const update: Partial<ILeagueRegistration> = {};

  if (input.enabled !== undefined) {
    if (typeof input.enabled !== 'boolean') {
      throw new Error('registration.enabled must be a boolean');
    }

    update.enabled = input.enabled;
  }

  if (input.requiresApproval !== undefined) {
    if (typeof input.requiresApproval !== 'boolean') {
      throw new Error('registration.requiresApproval must be a boolean');
    }

    update.requiresApproval = input.requiresApproval;
  }

  if (input.captainRosterEdits !== undefined) {
    if (typeof input.captainRosterEdits !== 'boolean') {
      throw new Error('registration.captainRosterEdits must be a boolean');
    }

    update.captainRosterEdits = input.captainRosterEdits;
  }

  if (input.priorLeagueId !== undefined) {
    if (input.priorLeagueId === null || input.priorLeagueId === '') {
      update.priorLeagueId = undefined;
    } else if (typeof input.priorLeagueId === 'string') {
      if (!mongoose.isValidObjectId(input.priorLeagueId)) {
        throw new Error('registration.priorLeagueId is invalid');
      }

      update.priorLeagueId = new mongoose.Types.ObjectId(input.priorLeagueId);
    } else {
      throw new Error('registration.priorLeagueId must be a league id');
    }
  }

  if (input.opensAt !== undefined) {
    if (input.opensAt === null || input.opensAt === '') {
      update.opensAt = undefined;
    } else {
      const parsed = new Date(String(input.opensAt));

      if (Number.isNaN(parsed.getTime())) {
        throw new Error('registration.opensAt is invalid');
      }

      update.opensAt = parsed;
    }
  }

  if (input.closesAt !== undefined) {
    if (input.closesAt === null || input.closesAt === '') {
      update.closesAt = undefined;
    } else {
      const parsed = new Date(String(input.closesAt));

      if (Number.isNaN(parsed.getTime())) {
        throw new Error('registration.closesAt is invalid');
      }

      update.closesAt = parsed;
    }
  }

  if (input.entryFeeCents !== undefined) {
    const fee = Number(input.entryFeeCents);

    assertValidEntryFeeCents(fee);
    update.entryFeeCents = fee;
  }

  if (input.currency !== undefined) {
    if (!isRegistrationCurrency(input.currency)) {
      throw new Error('registration.currency must be usd');
    }

    update.currency = input.currency;
  }

  if (input.maxEntrants !== undefined) {
    if (input.maxEntrants === null || input.maxEntrants === '') {
      update.maxEntrants = undefined;
    } else {
      const max = Number(input.maxEntrants);

      if (!Number.isInteger(max) || max < 1) {
        throw new Error('registration.maxEntrants must be a positive integer');
      }

      update.maxEntrants = max;
    }
  }

  if (input.waiverText !== undefined) {
    if (input.waiverText === null) {
      update.waiverText = undefined;
    } else if (typeof input.waiverText !== 'string') {
      throw new Error('registration.waiverText must be a string');
    } else {
      update.waiverText = input.waiverText.trim() || undefined;
    }
  }

  return update;
}

export function applyRegistrationUpdate(
  league: ILeague,
  update: Partial<ILeagueRegistration>
): void {
  const current = resolveLeagueRegistration(league.registration);
  league.registration = {
    ...current,
    ...update,
  };

  if (
    league.registration.opensAt &&
    league.registration.closesAt &&
    league.registration.closesAt < league.registration.opensAt
  ) {
    throw new Error('registration.closesAt must be on or after registration.opensAt');
  }
}

export async function countRegistrationSpotsUsed(
  leagueId: mongoose.Types.ObjectId | string
): Promise<number> {
  return Registration.countDocuments({
    leagueId,
    status: { $in: REGISTRATION_SPOT_STATUSES },
  });
}

export function isWithinRegistrationWindow(
  registration: ILeagueRegistration,
  now = new Date()
): boolean {
  if (registration.opensAt && now < registration.opensAt) {
    return false;
  }

  if (registration.closesAt && now > registration.closesAt) {
    return false;
  }

  return true;
}

export async function buildPublicRegistrationInfo(
  league: Pick<
    ILeague,
    '_id' | 'name' | 'sport' | 'kind' | 'entrantType' | 'status' | 'registration'
  >
): Promise<PublicRegistrationInfo> {
  const registration = resolveLeagueRegistration(league.registration);
  const spotsUsed = await countRegistrationSpotsUsed(league._id);
  const spotsRemaining =
    registration.maxEntrants !== undefined
      ? Math.max(registration.maxEntrants - spotsUsed, 0)
      : null;

  const entryFeeCents = registration.entryFeeCents ?? 0;
  const isOpen =
    league.status === 'active' &&
    registration.enabled &&
    isWithinRegistrationWindow(registration) &&
    (spotsRemaining === null || spotsRemaining > 0);

  return {
    leagueId: String(league._id),
    leagueName: league.name,
    sport: league.sport,
    kind: league.kind,
    entrantType: league.entrantType,
    enabled: registration.enabled,
    opensAt: registration.opensAt?.toISOString(),
    closesAt: registration.closesAt?.toISOString(),
    entryFeeCents,
    entryFeeDisplay: formatEntryFeeDisplay(entryFeeCents, registration.currency),
    currency: registration.currency,
    maxEntrants: registration.maxEntrants,
    spotsRemaining,
    requiresApproval: registration.requiresApproval,
    isOpen,
    waiverText: registration.waiverText,
  };
}

export async function listLeagueRegistrations(options: {
  leagueId: mongoose.Types.ObjectId | string;
  status?: RegistrationStatus;
}): Promise<RegistrationListEntry[]> {
  const filter: Record<string, unknown> = { leagueId: options.leagueId };

  if (options.status) {
    filter.status = options.status;
  }

  const registrations = await Registration.find(filter).sort({ createdAt: -1 }).lean();

  if (registrations.length === 0) {
    return [];
  }

  const playerIds = new Set<string>();

  for (const registration of registrations) {
    playerIds.add(String(registration.submittedByPlayerId));
  }

  const players = await Player.find({ _id: { $in: [...playerIds] } })
    .select('_id name')
    .lean();
  const playerNameById = Object.fromEntries(players.map((player) => [String(player._id), player.name]));

  const paymentIds = registrations
    .map((registration) => registration.paymentId)
    .filter(Boolean) as mongoose.Types.ObjectId[];

  const league = await League.findById(options.leagueId).select('registration').lean();
  const registrationSettings = resolveLeagueRegistration(league?.registration);
  const defaultAmountCents = registrationSettings.entryFeeCents ?? 0;
  const currency = registrationSettings.currency ?? 'usd';

  const payments =
    paymentIds.length > 0
      ? await Payment.find({ _id: { $in: paymentIds } }).lean()
      : [];
  const paymentById = Object.fromEntries(payments.map((payment) => [String(payment._id), payment]));

  return registrations.map((registration) =>
    shapeRegistrationListEntry(
      registration,
      playerNameById,
      registration.paymentId ? paymentById[String(registration.paymentId)] : undefined,
      defaultAmountCents,
      currency
    )
  );
}

function shapeRegistrationListEntry(
  registration: {
    _id: mongoose.Types.ObjectId;
    leagueId: mongoose.Types.ObjectId;
    divisionId?: mongoose.Types.ObjectId;
    entrantType: EntrantType;
    status: RegistrationStatus;
    submittedByPlayerId: mongoose.Types.ObjectId;
    teamId?: mongoose.Types.ObjectId;
    teamName?: string;
    playerIds?: mongoose.Types.ObjectId[];
    waiverAccepted: boolean;
    reviewedAt?: Date;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
    paymentId?: mongoose.Types.ObjectId;
  },
  playerNameById: Record<string, string>,
  payment?: Pick<IPayment, '_id' | 'status' | 'amountCents' | 'paidAt'>,
  defaultAmountCents = 0,
  currency = 'usd'
): RegistrationListEntry {
  const amountCents = payment?.amountCents ?? (defaultAmountCents > 0 ? defaultAmountCents : undefined);

  return {
    _id: String(registration._id),
    leagueId: String(registration.leagueId),
    divisionId: registration.divisionId ? String(registration.divisionId) : undefined,
    entrantType: registration.entrantType,
    status: registration.status,
    submittedByPlayerId: String(registration.submittedByPlayerId),
    submittedByPlayerName: playerNameById[String(registration.submittedByPlayerId)],
    teamId: registration.teamId ? String(registration.teamId) : undefined,
    teamName: registration.teamName,
    playerIds: registration.playerIds?.map((id) => String(id)),
    waiverAccepted: registration.waiverAccepted,
    reviewedAt: registration.reviewedAt?.toISOString(),
    notes: registration.notes,
    createdAt: registration.createdAt.toISOString(),
    updatedAt: registration.updatedAt.toISOString(),
    paymentId: payment ? String(payment._id) : registration.paymentId ? String(registration.paymentId) : undefined,
    paymentStatus:
      payment?.status ??
      (registration.status === 'pending_payment' && defaultAmountCents > 0 ? 'pending' : null),
    amountCents,
    amountDisplay:
      amountCents !== undefined ? formatEntryFeeDisplay(amountCents, currency) : undefined,
    paidAt: payment?.paidAt?.toISOString(),
  };
}

function getEnabledSports(settings: { sportsEnabled?: Record<Sport, boolean> }): Sport[] {
  return SPORTS.filter(
    (sport) => isSportLicensed(sport) && settings.sportsEnabled?.[sport]
  );
}

export async function listOpenRegistrations(): Promise<OpenRegistrationListing[]> {
  const settings = await SiteSettings.findOne().lean();
  const enabledSports = settings ? getEnabledSports(settings) : [];

  if (enabledSports.length === 0) {
    return [];
  }

  const leagues = await League.find({
    sport: { $in: enabledSports },
    status: 'active',
    'registration.enabled': true,
  })
    .sort({ 'registration.closesAt': 1, seasonStart: -1 })
    .lean();

  const openListings: OpenRegistrationListing[] = [];

  for (const league of leagues) {
    const info = await buildPublicRegistrationInfo(league);

    if (!info.isOpen) {
      continue;
    }

    openListings.push({
      ...info,
      seasonStart: league.seasonStart.toISOString(),
      seasonEnd: league.seasonEnd.toISOString(),
      format: league.format,
    });
  }

  return openListings;
}

export const REGISTRATION_QUEUE_STATUSES: RegistrationStatus[] = [
  'pending_approval',
  'waitlisted',
  'pending_payment',
];

export interface RegistrationQueueEntry extends RegistrationListEntry {
  leagueName: string;
  leagueSport: Sport;
  divisionName?: string;
}

export async function listRegistrationQueue(options: {
  status?: RegistrationStatus;
}): Promise<RegistrationQueueEntry[]> {
  const statusFilter =
    options.status !== undefined
      ? REGISTRATION_QUEUE_STATUSES.includes(options.status)
        ? [options.status]
        : null
      : REGISTRATION_QUEUE_STATUSES;

  if (!statusFilter) {
    throw new Error('Invalid registration queue status filter');
  }

  const registrations = await Registration.find({ status: { $in: statusFilter } })
    .sort({ createdAt: 1 })
    .lean();

  if (registrations.length === 0) {
    return [];
  }

  const leagueIds = [...new Set(registrations.map((registration) => String(registration.leagueId)))];
  const divisionIds = [
    ...new Set(
      registrations
        .map((registration) => registration.divisionId)
        .filter(Boolean)
        .map((divisionId) => String(divisionId))
    ),
  ];
  const playerIds = new Set<string>();

  for (const registration of registrations) {
    playerIds.add(String(registration.submittedByPlayerId));
  }

  const [leagues, divisions, players] = await Promise.all([
    League.find({ _id: { $in: leagueIds } })
      .select('_id name sport registration')
      .lean(),
    divisionIds.length > 0
      ? Division.find({ _id: { $in: divisionIds } })
          .select('_id name')
          .lean()
      : Promise.resolve([]),
    Player.find({ _id: { $in: [...playerIds] } })
      .select('_id name')
      .lean(),
  ]);

  const leagueById = Object.fromEntries(leagues.map((league) => [String(league._id), league]));
  const divisionNameById = Object.fromEntries(
    divisions.map((division) => [String(division._id), division.name])
  );
  const playerNameById = Object.fromEntries(players.map((player) => [String(player._id), player.name]));

  const paymentIds = registrations
    .map((registration) => registration.paymentId)
    .filter(Boolean) as mongoose.Types.ObjectId[];

  const payments =
    paymentIds.length > 0
      ? await Payment.find({ _id: { $in: paymentIds } }).lean()
      : [];
  const paymentById = Object.fromEntries(payments.map((payment) => [String(payment._id), payment]));

  return registrations.map((registration) => {
    const league = leagueById[String(registration.leagueId)];
    const registrationSettings = resolveLeagueRegistration(league?.registration);
    const defaultAmountCents = registrationSettings.entryFeeCents ?? 0;
    const currency = registrationSettings.currency ?? 'usd';
    const shaped = shapeRegistrationListEntry(
      registration,
      playerNameById,
      registration.paymentId ? paymentById[String(registration.paymentId)] : undefined,
      defaultAmountCents,
      currency
    );

    return {
      ...shaped,
      leagueName: league?.name ?? 'Unknown league',
      leagueSport: league?.sport ?? 'pool',
      divisionName: registration.divisionId
        ? divisionNameById[String(registration.divisionId)]
        : undefined,
    };
  });
}

async function getRegistrationRecord(
  registrationId: mongoose.Types.ObjectId | string
): Promise<IRegistration | null> {
  if (!mongoose.isValidObjectId(String(registrationId))) {
    return null;
  }

  return Registration.findById(registrationId);
}

export async function resolveRegistrationLeagueId(
  registrationId: string
): Promise<{ leagueId: string; registration: IRegistration }> {
  const registration = await getRegistrationRecord(registrationId);

  if (!registration) {
    throw new Error('Registration not found');
  }

  return {
    leagueId: String(registration.leagueId),
    registration,
  };
}
