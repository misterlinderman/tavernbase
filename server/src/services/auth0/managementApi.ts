const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_MGMT_CLIENT_ID = process.env.AUTH0_MGMT_CLIENT_ID;
const AUTH0_MGMT_CLIENT_SECRET = process.env.AUTH0_MGMT_CLIENT_SECRET;
const AUTH0_MGMT_CONNECTION =
  process.env.AUTH0_MGMT_CONNECTION ?? 'Username-Password-Authentication';
const AUTH0_SPA_CLIENT_ID = process.env.AUTH0_SPA_CLIENT_ID;

export interface Auth0ManagementUser {
  user_id: string;
  email: string;
  name?: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

export function isAuth0ManagementConfigured(): boolean {
  return Boolean(AUTH0_DOMAIN && AUTH0_MGMT_CLIENT_ID && AUTH0_MGMT_CLIENT_SECRET);
}

export async function getManagementToken(): Promise<string> {
  if (!isAuth0ManagementConfigured()) {
    throw new Error('Auth0 Management API is not configured');
  }

  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const domain = AUTH0_DOMAIN!;
  const response = await fetch(`https://${domain}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: AUTH0_MGMT_CLIENT_ID,
      client_secret: AUTH0_MGMT_CLIENT_SECRET,
      audience: `https://${domain}/api/v2/`,
      grant_type: 'client_credentials',
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Auth0 Management API token request failed: ${response.status} ${text}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return data.access_token;
}

async function mgmtFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getManagementToken();
  const domain = AUTH0_DOMAIN!;

  return fetch(`https://${domain}/api/v2${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

export async function getUserByEmail(email: string): Promise<Auth0ManagementUser | null> {
  const encoded = encodeURIComponent(email.trim().toLowerCase());
  const response = await mgmtFetch(`/users-by-email?email=${encoded}`);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Auth0 getUserByEmail failed: ${response.status} ${text}`);
  }

  const users = (await response.json()) as Auth0ManagementUser[];
  return users.length > 0 ? users[0] : null;
}

export async function createAuth0User(options: {
  email: string;
  name: string;
  connection?: string;
}): Promise<Auth0ManagementUser> {
  const connection = options.connection ?? AUTH0_MGMT_CONNECTION;
  const email = options.email.trim().toLowerCase();

  const response = await mgmtFetch('/users', {
    method: 'POST',
    body: JSON.stringify({
      email,
      name: options.name.trim(),
      connection,
      email_verified: false,
      verify_email: false,
    }),
  });

  if (response.status === 409) {
    const existing = await getUserByEmail(email);

    if (existing) {
      return existing;
    }
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Auth0 createUser failed: ${response.status} ${text}`);
  }

  return response.json() as Promise<Auth0ManagementUser>;
}

export async function sendPasswordResetTicket(options: {
  email: string;
  userId?: string;
  resultUrl?: string;
}): Promise<void> {
  let userId = options.userId;

  if (!userId) {
    const user = await getUserByEmail(options.email);

    if (!user) {
      throw new Error('Auth0 user not found for password reset ticket');
    }

    userId = user.user_id;
  }

  const body: Record<string, unknown> = {
    user_id: userId,
    mark_email_as_verified: true,
    ttl_sec: 432_000,
  };

  if (AUTH0_SPA_CLIENT_ID) {
    body.client_id = AUTH0_SPA_CLIENT_ID;
  }

  if (options.resultUrl) {
    body.result_url = options.resultUrl;
  }

  const response = await mgmtFetch('/tickets/password-change', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Auth0 password reset ticket failed: ${response.status} ${text}`);
  }
}

export async function ensureAuth0UserAndSendInvite(options: {
  email: string;
  name: string;
  loginUrl: string;
}): Promise<void> {
  let user = await getUserByEmail(options.email);

  if (!user) {
    user = await createAuth0User({
      email: options.email,
      name: options.name,
    });
  }

  await sendPasswordResetTicket({
    email: options.email,
    userId: user.user_id,
    resultUrl: options.loginUrl,
  });
}
