import type { Sport } from '../../../constants/leagues';
import { dartsScoresheetValidator } from './darts';
import { poolScoresheetValidator } from './pool';
import { volleyballScoresheetValidator } from './volleyball';
import type { ScoresheetPayloadValidator } from './types';

export type { ScoresheetPayloadValidator, ScoresheetValidationContext } from './types';
export {
  poolScoresheetValidator,
  validatePoolScoresheetPayload,
  type PoolScoresheetPayload,
} from './pool';
export {
  dartsScoresheetValidator,
  validateDartsScoresheetPayload,
  type DartsScoresheetPayload,
} from './darts';
export {
  volleyballScoresheetValidator,
  validateVolleyballScoresheetPayload,
  resolveVolleyballSetsToWin,
  type VolleyballScoresheetPayload,
} from './volleyball';

export function getScoresheetValidator(sport: Sport): ScoresheetPayloadValidator {
  switch (sport) {
    case 'pool':
      return poolScoresheetValidator;
    case 'darts':
      return dartsScoresheetValidator;
    case 'volleyball':
      return volleyballScoresheetValidator;
    default:
      throw new Error(`Unknown sport: ${String(sport)}`);
  }
}
