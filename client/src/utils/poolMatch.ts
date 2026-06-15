import type { PoolHandicapSystem } from '../constants/leagues';

const HANDICAP_LABELS: Record<Exclude<PoolHandicapSystem, 'none'>, string> = {
  apa: 'APA',
  vnea: 'VNEA',
};

export function poolHandicapBadge(system?: PoolHandicapSystem | string): string | null {
  if (!system || system === 'none') {
    return null;
  }

  const label = HANDICAP_LABELS[system as Exclude<PoolHandicapSystem, 'none'>];

  return label ? `Handicap: ${label}` : null;
}

export function poolPlayerScoreLabels(): { home: string; away: string; unit: string } {
  return {
    home: 'Home games won',
    away: 'Away games won',
    unit: 'games',
  };
}
