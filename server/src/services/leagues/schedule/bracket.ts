import type { SchedulePairing } from './ladder';

function nextPowerOfTwo(count: number): number {
  let size = 1;

  while (size < count) {
    size *= 2;
  }

  return size;
}

/** Standard single-elimination slot order (seed index per bracket position). */
function bracketSlotOrder(bracketSize: number): number[] {
  if (bracketSize < 2 || (bracketSize & (bracketSize - 1)) !== 0) {
    throw new Error('bracketSize must be a power of 2');
  }

  if (bracketSize === 2) {
    return [0, 1];
  }

  const half = bracketSlotOrder(bracketSize / 2);
  const order: number[] = [];

  for (const seedIndex of half) {
    order.push(seedIndex);
    order.push(bracketSize - 1 - seedIndex);
  }

  return order;
}

function resolveBracketRound(
  entrants: Array<string | null>,
  roundNumber: number,
  pairings: SchedulePairing[]
): Array<string | null> {
  const nextEntrants: Array<string | null> = [];

  for (let index = 0; index < entrants.length; index += 2) {
    const home = entrants[index];
    const away = entrants[index + 1] ?? null;

    if (home && away) {
      pairings.push({
        roundNumber,
        homeTeamId: home,
        awayTeamId: away,
      });
      nextEntrants.push(home);
      continue;
    }

    if (home) {
      nextEntrants.push(home);
    } else if (away) {
      nextEntrants.push(away);
    }
  }

  return nextEntrants;
}

/**
 * Single-elimination bracket seeded by entrant order. Pads to the next power of two with byes.
 * Later-round matches use the home entrant from each feeder as a schedule placeholder until
 * results advance real winners.
 */
export function generateBracketPairings(entrantIds: string[]): SchedulePairing[] {
  const entrantCount = entrantIds.length;

  if (entrantCount < 2) {
    throw new Error('Bracket schedules need at least two entrants');
  }

  if (entrantCount > 64) {
    throw new Error('Bracket schedules support up to 64 entrants');
  }

  const bracketSize = nextPowerOfTwo(entrantCount);
  const slotOrder = bracketSlotOrder(bracketSize);
  const slots = slotOrder.map((seedIndex) => entrantIds[seedIndex] ?? null);

  const pairings: SchedulePairing[] = [];
  let entrants: Array<string | null> = slots;
  let roundNumber = 1;

  while (entrants.filter((entrantId) => entrantId !== null).length > 1) {
    entrants = resolveBracketRound(entrants, roundNumber, pairings);
    roundNumber += 1;
  }

  return pairings;
}
