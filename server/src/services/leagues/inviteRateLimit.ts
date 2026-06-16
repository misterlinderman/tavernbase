const WINDOW_MS = 60 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const attemptsByPlayer = new Map<string, number[]>();

export class InviteRateLimitError extends Error {
  constructor() {
    super('Too many invites for this player. Try again in an hour.');
    this.name = 'InviteRateLimitError';
  }
}

export function assertInviteRateLimit(playerId: string): void {
  const key = String(playerId);
  const now = Date.now();
  const recent = (attemptsByPlayer.get(key) ?? []).filter((timestamp) => now - timestamp < WINDOW_MS);

  if (recent.length >= MAX_ATTEMPTS) {
    throw new InviteRateLimitError();
  }

  recent.push(now);
  attemptsByPlayer.set(key, recent);
}

export function resetInviteRateLimitForTests(): void {
  attemptsByPlayer.clear();
}
