/**
 * Dev assertion script for pool and darts scoresheet validators.
 * Run: npx ts-node server/src/scripts/verifyPoolScoresheetValidator.ts
 */
import { getScoresheetValidator } from '../services/leagues/scoresheets';
import { validateDartsScoresheetPayload } from '../services/leagues/scoresheets/darts';
import { validatePoolScoresheetPayload } from '../services/leagues/scoresheets/pool';
import { validateVolleyballScoresheetPayload } from '../services/leagues/scoresheets/volleyball';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function run(): void {
  const validator = getScoresheetValidator('pool');

  // Invalid payloads rejected
  try {
    validatePoolScoresheetPayload({ homeRaceWins: -1, awayRaceWins: 0 });
    throw new Error('Expected rejection for negative homeRaceWins');
  } catch (error) {
    assert(
      error instanceof Error && error.message.includes('homeRaceWins'),
      'negative homeRaceWins error message'
    );
  }

  try {
    validatePoolScoresheetPayload({ homeRaceWins: 0, awayRaceWins: 0 });
    throw new Error('Expected rejection for 0-0');
  } catch (error) {
    assert(
      error instanceof Error && error.message.includes('At least one team'),
      '0-0 error message'
    );
  }

  // Matching payloads
  assert(
    validator.payloadsMatch(
      { homeRaceWins: 5, awayRaceWins: 3 },
      { homeRaceWins: 5, awayRaceWins: 3 }
    ),
    'matching payloads'
  );

  // Differing payloads
  assert(
    !validator.payloadsMatch(
      { homeRaceWins: 5, awayRaceWins: 3 },
      { homeRaceWins: 4, awayRaceWins: 3 }
    ),
    'differing payloads'
  );

  // Darts validator
  const dartsValidator = getScoresheetValidator('darts');

  try {
    validateDartsScoresheetPayload({ homeLegsWon: 0, awayLegsWon: 0 });
    throw new Error('Expected rejection for darts 0-0');
  } catch (error) {
    assert(
      error instanceof Error && error.message.includes('At least one team'),
      'darts 0-0 error message'
    );
  }

  assert(
    dartsValidator.payloadsMatch(
      { homeLegsWon: 2, awayLegsWon: 1 },
      { homeLegsWon: 2, awayLegsWon: 1 }
    ),
    'darts matching payloads'
  );

  assert(
    !dartsValidator.payloadsMatch(
      { homeLegsWon: 2, awayLegsWon: 1 },
      { homeLegsWon: 1, awayLegsWon: 2 }
    ),
    'darts differing payloads'
  );

  // Pool payload rejected by darts validator
  try {
    dartsValidator.validate({ homeRaceWins: 5, awayRaceWins: 3 });
    throw new Error('Expected pool payload rejection on darts validator');
  } catch (error) {
    assert(
      error instanceof Error && error.message.includes('homeLegsWon'),
      'pool payload on darts validator'
    );
  }

  // Volleyball validator
  const volleyballValidator = getScoresheetValidator('volleyball');
  const volleyballMatch = { setsToWin: 2, sport: 'volleyball' } as unknown as import('../models/leagues/Match').IMatch;

  validateVolleyballScoresheetPayload({ homeSetWins: 2, awaySetWins: 0 }, 2);
  validateVolleyballScoresheetPayload({ homeSetWins: 2, awaySetWins: 1 }, 2);
  validateVolleyballScoresheetPayload({ homeSetWins: 0, awaySetWins: 2 }, 2);

  try {
    validateVolleyballScoresheetPayload({ homeSetWins: 2, awaySetWins: 2 }, 2);
    throw new Error('Expected rejection for volleyball 2-2');
  } catch (error) {
    assert(
      error instanceof Error && error.message.includes('cannot be tied'),
      'volleyball 2-2 tie error'
    );
  }

  try {
    validateVolleyballScoresheetPayload({ homeSetWins: 1, awaySetWins: 1 }, 2);
    throw new Error('Expected rejection for volleyball 1-1');
  } catch (error) {
    assert(
      error instanceof Error && error.message.includes('cannot be tied'),
      'volleyball 1-1 tie error'
    );
  }

  assert(
    volleyballValidator.payloadsMatch(
      { homeSetWins: 2, awaySetWins: 1 },
      { homeSetWins: 2, awaySetWins: 1 }
    ),
    'volleyball matching payloads'
  );

  volleyballValidator.validate(
    { homeSetWins: 2, awaySetWins: 1 },
    { match: volleyballMatch }
  );

  console.log('Pool, darts, and volleyball scoresheet validator checks passed.');
}

run();
