import type { Sport } from '../../../constants/leagues';
import type { IMatch, IMatchResult } from '../../../models/leagues/Match';

export interface ScoresheetValidationContext {
  match?: IMatch;
}

export interface ScoresheetPayloadValidator {
  sport: Sport;
  validate(payload: unknown, context?: ScoresheetValidationContext): Record<string, unknown>;
  payloadsMatch(a: Record<string, unknown>, b: Record<string, unknown>): boolean;
  toMatchResult(match: IMatch, payload: Record<string, unknown>): IMatchResult;
}
