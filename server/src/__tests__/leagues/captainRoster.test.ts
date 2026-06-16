import { describe, expect, it } from 'vitest';
import {
  canCaptainEditTeamRoster,
  describeCaptainRosterEditBlock,
} from '../../services/leagues/captainRoster';

describe('canCaptainEditTeamRoster', () => {
  it('allows edits in draft leagues', () => {
    expect(
      canCaptainEditTeamRoster({
        status: 'draft',
        registration: { enabled: false, currency: 'usd', requiresApproval: false },
      })
    ).toBe(true);
  });

  it('allows edits during an open registration window', () => {
    expect(
      canCaptainEditTeamRoster({
        status: 'active',
        registration: {
          enabled: true,
          currency: 'usd',
          requiresApproval: false,
          opensAt: new Date('2026-06-01T00:00:00.000Z'),
          closesAt: new Date('2026-06-30T23:59:59.000Z'),
        },
      })
    ).toBe(true);
  });

  it('allows edits when manager enables captainRosterEdits', () => {
    expect(
      canCaptainEditTeamRoster({
        status: 'active',
        registration: {
          enabled: false,
          currency: 'usd',
          requiresApproval: false,
          captainRosterEdits: true,
        },
      })
    ).toBe(true);
  });

  it('blocks edits for completed leagues', () => {
    expect(
      canCaptainEditTeamRoster({
        status: 'completed',
        registration: { enabled: true, currency: 'usd', requiresApproval: false },
      })
    ).toBe(false);

    expect(
      describeCaptainRosterEditBlock({
        status: 'completed',
        registration: { enabled: true, currency: 'usd', requiresApproval: false },
      })
    ).toContain('ended');
  });
});
