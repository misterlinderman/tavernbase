/**
 * Circle-method round robin pairings.
 * Odd team counts receive one bye per round (pairing skipped).
 */
export interface RoundRobinPairing {
  roundNumber: number;
  homeTeamId: string;
  awayTeamId: string;
}

const BYE = '__BYE__';

export function generateRoundRobinPairings(teamIds: string[]): RoundRobinPairing[] {
  if (teamIds.length < 2) {
    return [];
  }

  const participants = [...teamIds];

  if (participants.length % 2 === 1) {
    participants.push(BYE);
  }

  const count = participants.length;
  const rounds = count - 1;
  const half = count / 2;
  const pivot = participants[0];
  const rotating = participants.slice(1);
  const pairings: RoundRobinPairing[] = [];

  for (let round = 0; round < rounds; round += 1) {
    const roundTeams = [pivot, ...rotating];

    for (let i = 0; i < half; i += 1) {
      const teamA = roundTeams[i];
      const teamB = roundTeams[count - 1 - i];

      if (teamA === BYE || teamB === BYE) {
        continue;
      }

      const swapHomeAway = (round + i) % 2 === 1;

      pairings.push({
        roundNumber: round + 1,
        homeTeamId: swapHomeAway ? teamB : teamA,
        awayTeamId: swapHomeAway ? teamA : teamB,
      });
    }

    rotating.unshift(rotating.pop() as string);
  }

  return pairings;
}

export interface ScheduleRoundOptions {
  startDate: Date;
  roundNumber: number;
  roundIntervalDays: number;
  matchTime: string;
}

/** Returns scheduledAt for a given round, parsing matchTime as "HH:mm". */
export function scheduledAtForRound(options: ScheduleRoundOptions): Date {
  const { startDate, roundNumber, roundIntervalDays, matchTime } = options;
  const [hourPart, minutePart] = matchTime.split(':');
  const hour = Number(hourPart);
  const minute = Number(minutePart ?? 0);

  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new Error('matchTime hour must be 0–23');
  }

  if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
    throw new Error('matchTime minute must be 0–59');
  }

  const date = new Date(startDate);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + (roundNumber - 1) * roundIntervalDays);
  date.setHours(hour, minute, 0, 0);

  return date;
}

export function parseMatchTime(value: string | undefined): string {
  if (!value) return '19:00';

  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());

  if (!match) {
    throw new Error('matchTime must be in HH:mm format');
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error('matchTime must be a valid time');
  }

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
