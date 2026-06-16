import { SPORTS, type Sport } from '../../constants/leagues';
import { isSportLicensed } from '../../config/establishment';
import { createError } from '../../middleware/errorHandler';
import { SiteSettings } from '../../models';

export async function assertLeagueIsPublic(league: { sport: Sport; status: string }): Promise<void> {
  if (league.status === 'draft') {
    throw createError('League not found', 404);
  }

  if (!isSportLicensed(league.sport)) {
    throw createError('League not found', 404);
  }

  const settings = await SiteSettings.findOne().lean();

  if (settings && !settings.sportsEnabled?.[league.sport]) {
    throw createError('League not found', 404);
  }
}

export function getEnabledSports(settings: { sportsEnabled?: Record<Sport, boolean> }): Sport[] {
  return SPORTS.filter(
    (sport) => isSportLicensed(sport) && settings.sportsEnabled?.[sport]
  );
}
