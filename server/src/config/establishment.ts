import fs from 'fs';
import path from 'path';
import { SPORTS, type Sport } from '../constants/leagues';
import { createError } from '../middleware/errorHandler';

export type LicensedLeagueSports = Record<Sport, boolean>;

export interface EstablishmentConfig {
  slug?: string;
  name?: string;
  consent?: {
    photoSubmissionText?: string;
  };
  modules?: {
    leagues?: Partial<LicensedLeagueSports>;
  };
}

const DEFAULT_LICENSED_SPORTS: LicensedLeagueSports = {
  pool: true,
  darts: true,
  volleyball: true,
};

let cachedConfig: EstablishmentConfig | null = null;
let configPath: string | null = null;

function resolveEstablishmentPath(): string | null {
  const candidates = [
    path.resolve(process.cwd(), 'config/establishment.json'),
    path.resolve(process.cwd(), '../config/establishment.json'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function loadEstablishmentConfig(): EstablishmentConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const resolvedPath = resolveEstablishmentPath();
  configPath = resolvedPath;

  if (!resolvedPath) {
    cachedConfig = {};
    return cachedConfig;
  }

  try {
    const raw = fs.readFileSync(resolvedPath, 'utf8');
    cachedConfig = JSON.parse(raw) as EstablishmentConfig;
    return cachedConfig;
  } catch (error) {
    console.warn(
      `[establishment] Could not read ${resolvedPath}: ${
        error instanceof Error ? error.message : 'unknown error'
      }`
    );
    cachedConfig = {};
    return cachedConfig;
  }
}

/** Per-sport league module flags from establishment.json licensing tier. */
export function getLicensedLeagueSports(): LicensedLeagueSports {
  const config = loadEstablishmentConfig();
  const leagues = config.modules?.leagues;

  if (!leagues) {
    return { ...DEFAULT_LICENSED_SPORTS };
  }

  return {
    pool: Boolean(leagues.pool),
    darts: Boolean(leagues.darts),
    volleyball: Boolean(leagues.volleyball),
  };
}

export function isSportLicensed(sport: Sport): boolean {
  return getLicensedLeagueSports()[sport];
}

export function assertSportLicensed(sport: Sport): void {
  if (!isSportLicensed(sport)) {
    throw createError(`Sport "${sport}" is not licensed for this deployment`, 403);
  }
}

export function getLicensedSportsList(): Sport[] {
  const licensed = getLicensedLeagueSports();
  return SPORTS.filter((sport) => licensed[sport]);
}

export function intersectSportsWithLicense<T extends Record<Sport, boolean>>(
  enabled: T
): LicensedLeagueSports {
  const licensed = getLicensedLeagueSports();

  return {
    pool: Boolean(enabled.pool && licensed.pool),
    darts: Boolean(enabled.darts && licensed.darts),
    volleyball: Boolean(enabled.volleyball && licensed.volleyball),
  };
}

export function getEstablishmentSlug(): string {
  const config = loadEstablishmentConfig();
  const slug = config.slug?.trim();
  return slug || 'default';
}

export function getEstablishmentConfigPath(): string | null {
  loadEstablishmentConfig();
  return configPath;
}

export function getEstablishmentName(): string {
  const name = loadEstablishmentConfig().name?.trim();
  return name || 'Your Tavern';
}

export function getPhotoConsentText(): string {
  const config = loadEstablishmentConfig();
  const venueName = getEstablishmentName();
  const template = config.consent?.photoSubmissionText?.trim();

  if (template) {
    return template.replace(/\{venueName\}/g, venueName);
  }

  return `I took this photo (or have permission to share it), everyone pictured is okay with it being posted, and I give ${venueName} permission to use it on their website and social media.`;
}
