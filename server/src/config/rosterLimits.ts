import { loadEstablishmentConfig } from './establishment';

const DEFAULT_TEAM_ROSTER_MIN = 3;
const DEFAULT_TEAM_ROSTER_MAX = 12;

function parsePositiveInt(value: unknown, fallback: number): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

export interface TeamRosterLimits {
  min: number;
  max: number;
}

export function getTeamRosterLimits(): TeamRosterLimits {
  const config = loadEstablishmentConfig();
  const leagues = config.modules?.leagues as
    | { teamRosterMin?: number; teamRosterMax?: number }
    | undefined;

  const min = parsePositiveInt(
    process.env.TEAM_ROSTER_MIN ?? leagues?.teamRosterMin,
    DEFAULT_TEAM_ROSTER_MIN
  );
  const max = parsePositiveInt(
    process.env.TEAM_ROSTER_MAX ?? leagues?.teamRosterMax,
    DEFAULT_TEAM_ROSTER_MAX
  );

  return {
    min: Math.min(min, max),
    max: Math.max(min, max),
  };
}
