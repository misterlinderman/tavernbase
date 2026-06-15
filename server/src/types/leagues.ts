export const POOL_HANDICAP_SYSTEMS = ['none', 'apa', 'vnea'] as const;
export type PoolHandicapSystem = (typeof POOL_HANDICAP_SYSTEMS)[number];

export interface PoolHandicapRules {
  system: 'apa' | 'vnea' | 'none';
  skillLevelRange?: [number, number];
  handicapPerSkillLevel?: number;
}

function isPoolHandicapSystem(value: unknown): value is PoolHandicapSystem {
  return typeof value === 'string' && POOL_HANDICAP_SYSTEMS.includes(value as PoolHandicapSystem);
}

export function parsePoolHandicapRules(value: unknown): PoolHandicapRules {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('handicapRules must be an object');
  }

  const raw = value as Record<string, unknown>;

  if (!isPoolHandicapSystem(raw.system)) {
    throw new Error('handicapRules.system must be none, apa, or vnea');
  }

  if (raw.system === 'none') {
    return { system: 'none' };
  }

  const range = raw.skillLevelRange;

  if (!Array.isArray(range) || range.length !== 2) {
    throw new Error('handicapRules.skillLevelRange must be a two-number array');
  }

  const [min, max] = range;

  if (
    typeof min !== 'number' ||
    typeof max !== 'number' ||
    !Number.isFinite(min) ||
    !Number.isFinite(max)
  ) {
    throw new Error('handicapRules.skillLevelRange values must be numbers');
  }

  if (min > max) {
    throw new Error('handicapRules.skillLevelRange min must be less than or equal to max');
  }

  const handicapPerSkillLevel = raw.handicapPerSkillLevel;

  if (
    typeof handicapPerSkillLevel !== 'number' ||
    !Number.isFinite(handicapPerSkillLevel)
  ) {
    throw new Error('handicapRules.handicapPerSkillLevel must be a number');
  }

  return {
    system: raw.system,
    skillLevelRange: [min, max],
    handicapPerSkillLevel,
  };
}
