import { requireRole } from './requireRole';

/** Manager, staff, or league_admin — league list and read endpoints. */
export const requireLeagueRead = requireRole('staff');

/** Manager or league_admin only — league CRUD, schedule, import, disputes. */
export const requireLeagueWrite = requireRole('league_admin');
