import { describe, expect, it } from 'vitest';
import { parseReturningTeamRegistrationBody } from '../../services/leagues/returningTeamRegistration';

describe('parseReturningTeamRegistrationBody', () => {
  it('requires priorTeamId', () => {
    expect(() =>
      parseReturningTeamRegistrationBody({
        teamName: 'Sharks',
        roster: [{ name: 'Alex', email: 'alex@example.com' }],
        waiverAccepted: true,
      })
    ).toThrow('priorTeamId is required');
  });

  it('parses returning registration payload', () => {
    const priorTeamId = '507f1f77bcf86cd799439011';

    expect(
      parseReturningTeamRegistrationBody({
        priorTeamId,
        teamName: 'Sharks',
        roster: [
          { name: 'Alex', email: 'alex@example.com' },
          { name: 'Jamie', email: 'jamie@example.com' },
        ],
        waiverAccepted: true,
      })
    ).toEqual({
      priorTeamId,
      teamName: 'Sharks',
      roster: [
        { name: 'Alex', email: 'alex@example.com' },
        { name: 'Jamie', email: 'jamie@example.com' },
      ],
      waiverAccepted: true,
    });
  });
});
