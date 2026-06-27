import mongoose from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDivisionFindById = vi.fn();
const mockLeagueFindById = vi.fn();
const mockRegistrationFindOne = vi.fn();
const mockRegistrationCountDocuments = vi.fn();
const mockTeamFindById = vi.fn();
const mockTeamFindOne = vi.fn();
const mockTeamCreate = vi.fn();
const mockListLeagueRegistrations = vi.fn();
const mockDispatchRegistrationEmail = vi.fn();

vi.mock('../../models', () => ({
  Division: {
    findById: (...args: unknown[]) => mockDivisionFindById(...args),
  },
  League: {
    findById: (...args: unknown[]) => mockLeagueFindById(...args),
  },
  Registration: {
    findOne: (...args: unknown[]) => mockRegistrationFindOne(...args),
    countDocuments: (...args: unknown[]) => mockRegistrationCountDocuments(...args),
  },
  Team: {
    findById: (...args: unknown[]) => mockTeamFindById(...args),
    findOne: (...args: unknown[]) => mockTeamFindOne(...args),
    create: (...args: unknown[]) => mockTeamCreate(...args),
  },
}));

vi.mock('../../services/notifications/registrationEmail', () => ({
  dispatchRegistrationEmail: (...args: unknown[]) => mockDispatchRegistrationEmail(...args),
}));

vi.mock('../../services/leagues/registration', () => ({
  listLeagueRegistrations: (...args: unknown[]) => mockListLeagueRegistrations(...args),
  resolveLeagueRegistration: (registration?: { maxEntrants?: number; requiresApproval?: boolean; entryFeeCents?: number }) => ({
    enabled: registration?.enabled ?? false,
    entryFeeCents: registration?.entryFeeCents ?? 0,
    currency: 'usd',
    maxEntrants: registration?.maxEntrants,
    requiresApproval: registration?.requiresApproval ?? false,
    captainRosterEdits: false,
  }),
}));

import {
  appendPlayerToDivision,
  approveRegistration,
  createTeamFromRegistration,
  promoteWaitlistedRegistration,
} from '../../services/leagues/registrationActions';

function mockRegistrationDoc(overrides: Record<string, unknown> = {}) {
  const doc = {
    _id: new mongoose.Types.ObjectId(),
    leagueId: new mongoose.Types.ObjectId(),
    divisionId: new mongoose.Types.ObjectId(),
    entrantType: 'team',
    status: 'pending_approval',
    submittedByPlayerId: new mongoose.Types.ObjectId(),
    teamName: 'Sharks',
    playerIds: [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()],
    waiverAccepted: true,
    waiverTextSnapshot: 'I agree',
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  return doc;
}

describe('createTeamFromRegistration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTeamFindById.mockResolvedValue(null);
    mockTeamFindOne.mockReturnValue({ select: vi.fn().mockResolvedValue(null) });
  });

  it('creates a new team and marks the registration approved', async () => {
    const registration = mockRegistrationDoc();
    const teamId = new mongoose.Types.ObjectId();

    mockTeamCreate.mockResolvedValue({ _id: teamId });

    await createTeamFromRegistration(registration.leagueId, registration);

    expect(mockTeamCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        leagueId: registration.leagueId,
        divisionId: registration.divisionId,
        name: 'Sharks',
        captainPlayerId: registration.submittedByPlayerId,
        playerIds: registration.playerIds,
      })
    );
    expect(registration.teamId).toEqual(teamId);
    expect(registration.status).toBe('approved');
    expect(registration.reviewedAt).toBeInstanceOf(Date);
    expect(registration.save).toHaveBeenCalled();
  });

  it('rejects duplicate team names in the same division', async () => {
    const registration = mockRegistrationDoc();

    mockTeamFindOne.mockReturnValue({
      select: vi.fn().mockResolvedValue({ _id: new mongoose.Types.ObjectId() }),
    });

    await expect(createTeamFromRegistration(registration.leagueId, registration)).rejects.toThrow(
      'A team with this name already exists in the division'
    );
    expect(mockTeamCreate).not.toHaveBeenCalled();
  });
});

describe('appendPlayerToDivision', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('appends a player id when not already on the division', async () => {
    const divisionId = new mongoose.Types.ObjectId();
    const playerId = new mongoose.Types.ObjectId();
    const save = vi.fn().mockResolvedValue(undefined);
    const division = {
      playerIds: [] as mongoose.Types.ObjectId[],
      save,
    };

    mockDivisionFindById.mockResolvedValue(division);

    await appendPlayerToDivision(divisionId, playerId);

    expect(save).toHaveBeenCalled();
    expect(division.playerIds).toHaveLength(1);
    expect(division.playerIds[0].equals(playerId)).toBe(true);
  });

  it('is idempotent when the player is already listed', async () => {
    const divisionId = new mongoose.Types.ObjectId();
    const playerId = new mongoose.Types.ObjectId();
    const save = vi.fn().mockResolvedValue(undefined);

    mockDivisionFindById.mockResolvedValue({
      playerIds: [playerId],
      save,
    });

    await appendPlayerToDivision(divisionId, playerId);

    expect(save).not.toHaveBeenCalled();
  });
});

describe('approveRegistration', () => {
  const leagueId = new mongoose.Types.ObjectId();
  const registrationId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    vi.clearAllMocks();
    mockDispatchRegistrationEmail.mockResolvedValue(null);
    mockTeamFindById.mockResolvedValue(null);
    mockTeamFindOne.mockReturnValue({ select: vi.fn().mockResolvedValue(null) });
    mockTeamCreate.mockResolvedValue({ _id: new mongoose.Types.ObjectId() });
    mockListLeagueRegistrations.mockResolvedValue([
      { _id: String(registrationId), status: 'approved', entrantType: 'team' },
    ]);
  });

  it('fulfills a pending team registration by creating a team', async () => {
    const registration = mockRegistrationDoc({
      _id: registrationId,
      leagueId,
      status: 'pending_approval',
    });

    mockLeagueFindById.mockResolvedValue({
      _id: leagueId,
      registration: { maxEntrants: 8 },
    });
    mockRegistrationFindOne.mockResolvedValue(registration);

    const result = await approveRegistration({
      leagueId: String(leagueId),
      registrationId: String(registrationId),
    });

    expect(mockTeamCreate).toHaveBeenCalled();
    expect(mockDispatchRegistrationEmail).toHaveBeenCalledWith(registration, 'registrationApproved');
    expect(result.registration.status).toBe('approved');
  });

  it('appends an approved player entrant to the division roster', async () => {
    const playerId = new mongoose.Types.ObjectId();
    const divisionId = new mongoose.Types.ObjectId();
    const save = vi.fn().mockResolvedValue(undefined);

    const registration = mockRegistrationDoc({
      _id: registrationId,
      leagueId,
      entrantType: 'player',
      status: 'pending_approval',
      submittedByPlayerId: playerId,
      divisionId,
      teamName: undefined,
      playerIds: undefined,
    });

    mockLeagueFindById.mockResolvedValue({
      _id: leagueId,
      registration: { maxEntrants: 16 },
    });
    mockRegistrationFindOne.mockResolvedValue(registration);
    mockDivisionFindById.mockResolvedValue({ playerIds: [], save });
    mockListLeagueRegistrations.mockResolvedValue([
      { _id: String(registrationId), status: 'approved', entrantType: 'player' },
    ]);

    await approveRegistration({
      leagueId: String(leagueId),
      registrationId: String(registrationId),
    });

    expect(mockTeamCreate).not.toHaveBeenCalled();
    expect(save).toHaveBeenCalled();
  });
});

describe('promoteWaitlistedRegistration', () => {
  const leagueId = new mongoose.Types.ObjectId();
  const registrationId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    vi.clearAllMocks();
    mockDispatchRegistrationEmail.mockResolvedValue(null);
    mockListLeagueRegistrations.mockResolvedValue([
      { _id: String(registrationId), status: 'pending_approval' },
    ]);
  });

  it('blocks promotion when maxEntrants is already reached', async () => {
    const registration = mockRegistrationDoc({
      _id: registrationId,
      leagueId,
      status: 'waitlisted',
    });

    mockLeagueFindById.mockResolvedValue({
      _id: leagueId,
      registration: { maxEntrants: 2 },
    });
    mockRegistrationFindOne.mockResolvedValue(registration);
    mockRegistrationCountDocuments.mockResolvedValue(2);

    await expect(
      promoteWaitlistedRegistration({
        leagueId: String(leagueId),
        registrationId: String(registrationId),
      })
    ).rejects.toThrow('Registration is full — no spots available to promote');
  });

  it('moves a waitlisted entrant to pending approval when a spot opens', async () => {
    const registration = mockRegistrationDoc({
      _id: registrationId,
      leagueId,
      status: 'waitlisted',
    });

    mockLeagueFindById.mockResolvedValue({
      _id: leagueId,
      registration: { maxEntrants: 4, requiresApproval: true, entryFeeCents: 0 },
    });
    mockRegistrationFindOne.mockResolvedValue(registration);
    mockRegistrationCountDocuments.mockResolvedValue(2);

    const result = await promoteWaitlistedRegistration({
      leagueId: String(leagueId),
      registrationId: String(registrationId),
    });

    expect(registration.status).toBe('pending_approval');
    expect(registration.save).toHaveBeenCalled();
    expect(mockDispatchRegistrationEmail).toHaveBeenCalledWith(registration, 'registrationReceived');
    expect(result.registration.status).toBe('pending_approval');
  });
});
