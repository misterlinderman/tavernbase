import { auth } from 'express-oauth2-jwt-bearer';
import { Request, Response, NextFunction } from 'express';

const domain = process.env.AUTH0_DOMAIN;
const audience = process.env.AUTH0_AUDIENCE;

if (!domain || !audience) {
  console.warn(
    'AUTH0_DOMAIN and AUTH0_AUDIENCE are not set — protected routes will fail until configured'
  );
}

export const checkJwt = auth({
  audience,
  issuerBaseURL: `https://${domain}/`,
  tokenSigningAlg: 'RS256',
});

export type AuthRequest = Request;

/** Returns the Auth0 `sub` claim — links JWT identity to our User.auth0Sub field. */
export const extractAuth0Sub = (req: Request): string | null => {
  const sub = req.auth?.payload?.sub;
  return typeof sub === 'string' ? sub : null;
};

/** Email from JWT — used to auto-link invited captains on first login. */
export const extractAuthEmail = (req: Request): string | null => {
  const email = req.auth?.payload?.email;
  return typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : null;
};

/** Display name from JWT when present. */
export const extractAuthName = (req: Request): string | null => {
  const name = req.auth?.payload?.name;
  return typeof name === 'string' && name.trim() ? name.trim() : null;
};

export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  checkJwt(req, res, (err) => {
    if (err) {
      next();
      return;
    }
    next();
  });
};
