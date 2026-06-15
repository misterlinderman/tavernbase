import type { PoolHandicapRules } from '../../types/leagues';

const HANDICAP_LABELS: Record<NonNullable<PoolHandicapRules['system']>, string> = {
  none: '',
  apa: 'APA',
  vnea: 'VNEA',
};

export function poolHandicapBadge(rules?: PoolHandicapRules | null): string | undefined {
  if (!rules || rules.system === 'none') {
    return undefined;
  }

  const label = HANDICAP_LABELS[rules.system];

  return label ? `Handicap: ${label}` : undefined;
}
