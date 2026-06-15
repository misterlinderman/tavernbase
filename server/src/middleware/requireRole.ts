import { Request, Response, NextFunction } from 'express';
import { User } from '../models';
import { extractAuth0Sub } from './auth';
import { createError } from './errorHandler';

type StaffRole = 'manager' | 'staff' | 'league_admin';

function hasRequiredRole(userRole: StaffRole, requiredRole: StaffRole): boolean {
  if (userRole === requiredRole) return true;
  if (requiredRole === 'staff' && (userRole === 'manager' || userRole === 'league_admin')) {
    return true;
  }
  if (requiredRole === 'league_admin' && userRole === 'manager') return true;
  return false;
}

/**
 * Role gate — use after checkJwt.
 * Looks up User by auth0Sub; returns 403 if role insufficient.
 *
 * @example router.delete('/submissions/:id', checkJwt, requireRole('manager'), handler)
 */
export function requireRole(requiredRole: StaffRole) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const auth0Sub = extractAuth0Sub(req);

      if (!auth0Sub) {
        next(createError('Unauthorized', 401));
        return;
      }

      const user = await User.findOne({ auth0Sub });

      if (!user) {
        next(createError('Forbidden — user not registered in staff database', 403));
        return;
      }

      if (!hasRequiredRole(user.role as StaffRole, requiredRole)) {
        next(createError('Forbidden — insufficient role', 403));
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
