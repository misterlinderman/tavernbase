import { describe, expect, it } from 'vitest';
import { generateBracketPairings } from '../../services/leagues/schedule/bracket';

describe('generateBracketPairings', () => {
  it('creates seven matches for eight entrants', () => {
    const entrantIds = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'];
    const pairings = generateBracketPairings(entrantIds);

    expect(pairings).toHaveLength(7);
    expect(new Set(pairings.map((pairing) => pairing.roundNumber))).toEqual(new Set([1, 2, 3]));
  });

  it('still supports team ids as entrant ids', () => {
    const pairings = generateBracketPairings(['t1', 't2', 't3', 't4']);

    expect(pairings).toHaveLength(3);
  });
});
