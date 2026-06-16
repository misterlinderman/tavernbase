# Auth0 Setup — Barry O's Old Market Tavern

Staff dashboard authentication uses [Auth0](https://auth0.com) on the client and JWT validation on the Express API. Public site pages do not require login.

---

## 1. Create the Auth0 tenant resources

### Application (SPA — client login)

1. Auth0 Dashboard → **Applications → Applications → Create Application**
2. Name: `Barry O's Staff` (or similar)
3. Type: **Single Page Application**
4. **Settings** tab — configure:

| Field | Value |
|-------|-------|
| **Allowed Callback URLs** | `http://localhost:5173`, `https://barryostavern.com` |
| **Allowed Logout URLs** | `http://localhost:5173`, `https://barryostavern.com` |
| **Allowed Web Origins** | `http://localhost:5173`, `https://barryostavern.com` |

For league self-service registration, the same callback URL handles redirects from `/register/*`, `/captain/login`, and `/player/login`. No separate Auth0 application is required.

5. Save changes
6. Copy **Domain** and **Client ID** from the same Settings page

### API (server JWT validation)

1. Auth0 Dashboard → **Applications → APIs → Create API**
2. Name: `Barry O's API`
3. **Identifier (Audience):** `http://localhost:3001/api` for local dev  
   (Use your production API URL in production, e.g. `https://api.barryostavern.com/api`)
4. Signing Algorithm: **RS256** (default)
5. Copy the **Identifier** — this is your audience

### Authorize the SPA to use the API (required)

Newer Auth0 tenants require an explicit link between your SPA and API. Without this, login fails with:

> Client "…" is not authorized to access resource server "http://localhost:3001/api"

1. Auth0 Dashboard → **Applications → APIs** → select **Barry O's API**
2. Open the **Application Access** tab (or **Machine to Machine** / **Applications** on older dashboards)
3. Find your **Single Page Application** in the list (Client ID must match `VITE_AUTH0_CLIENT_ID`)
4. Click **Edit** (or the toggle) and **enable User-delegated access** for that application
5. Save — you should see a green checkmark in the User-delegated Access column

Do **not** use the Auth0 "Test Application" client ID in `client/.env` — use the Client ID from your real SPA's Settings page.

---

## 2. Populate environment files

### `client/.env`

```env
VITE_API_URL=http://localhost:3001/api
VITE_AUTH0_DOMAIN=your-tenant.us.auth0.com
VITE_AUTH0_CLIENT_ID=your-spa-client-id
VITE_AUTH0_AUDIENCE=http://localhost:3001/api
```

| Variable | Source |
|----------|--------|
| `VITE_AUTH0_DOMAIN` | SPA Application → Settings → **Domain** |
| `VITE_AUTH0_CLIENT_ID` | SPA Application → Settings → **Client ID** |
| `VITE_AUTH0_AUDIENCE` | API → Settings → **Identifier** |

Restart Vite after editing (`npm run dev`).

### `server/.env`

```env
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_AUDIENCE=http://localhost:3001/api
```

| Variable | Source |
|----------|--------|
| `AUTH0_DOMAIN` | Same **Domain** as client (must match exactly) |
| `AUTH0_AUDIENCE` | Same **Identifier** as `VITE_AUTH0_AUDIENCE` |

---

## 3. Seed the first manager user

Auth0 proves *who* someone is; MongoDB stores *whether* they are staff and their role. After a staff member logs in once, their Auth0 `sub` claim must exist in the `User` collection.

### Get your Auth0 `sub`

1. Fill in Auth0 env vars and run `npm run dev`
2. Open `http://localhost:5173/admin` and log in via Auth0
3. In browser DevTools → **Application → Local Storage** or decode the access token at [jwt.io](https://jwt.io)
4. Copy the `sub` claim (format: `auth0\|abc123...` or `google-oauth2\|...`)

### Add seed vars to `server/.env`

```env
ADMIN_AUTH0_SUB=auth0|your-sub-here
ADMIN_EMAIL=owner@example.com
ADMIN_NAME=Barry O
```

### Run the seed script (safe to re-run)

From the repository root:

```bash
npx ts-node server/src/scripts/seedAdmin.ts
```

Or from the `server/` directory:

```bash
npx ts-node src/scripts/seedAdmin.ts
```

Expected output:

```
MongoDB connected
Admin user upserted: owner@example.com (manager)
```

The script upserts by `auth0Sub` — running it again updates name/email without creating duplicates.

### Optional: league-only admin (`league_admin`)

Use this role when someone should manage leagues (CRUD, schedules, disputes, CSV import) but not edit site settings, events, or photo moderation.

1. Have the person log in at `/admin/login` once and copy their Auth0 `sub`
2. Add to `server/.env`:

```env
LEAGUE_ADMIN_AUTH0_SUB=auth0|their-sub-here
LEAGUE_ADMIN_EMAIL=leagues@example.com
LEAGUE_ADMIN_NAME=League Coordinator
```

3. Run:

```bash
npx ts-node server/src/scripts/seedLeagueAdmin.ts
```

`league_admin` users see **Overview** and **Leagues** in the dashboard only. They cannot `PUT /api/admin/site` (including sports toggles).

---

## Captain portal onboarding

Team captains submit match scoresheets at `/captain/login`. They use the same Auth0 SPA and API as staff — no separate Auth0 application is required.

Self-service team registration (`/register`) also creates captain accounts — see [League self-service registration](#league-self-service-registration).

### Normal path (recommended)

1. In **Admin → Leagues → [league] → Players**, add the captain with their **email address**
2. Under **Teams**, assign that player as the team captain
3. Click **Invite captain** on the team row — copy the generated email and send it to them
4. Captain opens `/captain/login` and signs in with Auth0 using **the same email**
5. On first login, the API links their Auth0 account to the player record automatically

No Auth0 `sub` paste is required for invited captains.

### Auth0 email in the access token

Auto-linking matches the JWT `email` claim to the invited player. Ensure your Auth0 tenant includes email in tokens:

1. Auth0 Dashboard → **Applications → APIs → Barry O's API**
2. Open **Settings** (or **Token Settings**)
3. Confirm **Add email to access tokens** (or equivalent) is enabled for your login connection

If captains see “account not registered” after login, verify they used the invited email and that the token includes `email` (decode at [jwt.io](https://jwt.io)).

### Manual link (advanced / legacy)

For captains who already have an Auth0 account with a different workflow:

1. Have them sign in once at `/captain/login`
2. Copy their Auth0 `sub` from the access token
3. In **Players & captain logins**, use **Link captain login** with player, sub, email, and name

Or run `npx ts-node server/src/scripts/seedCaptain.ts` with env vars (see script header).

Manually seeded captains continue to work — invite flow does not replace them.

### Optional: Auth0 Management API (automated invite emails)

By default, invites return a copy/paste email template for staff to send manually. To have Auth0 email captains and players automatically when you click **Invite** or **Resend invite**, create a Machine-to-Machine (M2M) application with Management API access.

#### Create the M2M application

1. Auth0 Dashboard → **Applications → Applications → Create Application**
2. Name: `Tavern Base Management` (or similar)
3. Type: **Machine to Machine Applications**
4. Authorize it for the **Auth0 Management API**
5. Enable these scopes (minimum):
   - `create:users`
   - `read:users`
   - `update:users`
6. Copy **Client ID** and **Client Secret** from the M2M app Settings page

#### Database connection

Invites create users on the **Username-Password-Authentication** database connection (same connection your SPA uses for email/password login). Ensure that connection is enabled for your SPA application.

#### Server environment variables

Add to `server/.env`:

```env
AUTH0_MGMT_CLIENT_ID=your-m2m-client-id
AUTH0_MGMT_CLIENT_SECRET=your-m2m-client-secret

# Optional — defaults to Username-Password-Authentication
AUTH0_MGMT_CONNECTION=Username-Password-Authentication

# Optional — SPA client ID used in password-reset ticket redirects
AUTH0_SPA_CLIENT_ID=your-spa-client-id
```

| Variable | Source |
|----------|--------|
| `AUTH0_MGMT_CLIENT_ID` | M2M Application → Settings → **Client ID** |
| `AUTH0_MGMT_CLIENT_SECRET` | M2M Application → Settings → **Client Secret** |
| `AUTH0_MGMT_CONNECTION` | Auth0 → **Authentication → Database** → connection name |
| `AUTH0_SPA_CLIENT_ID` | Same as `VITE_AUTH0_CLIENT_ID` (optional) |

Restart the API after editing env vars.

#### How automated invites work

When M2M credentials are configured:

1. Staff clicks **Invite captain**, **Link login → Send invite**, or **Resend invite**
2. The API creates or finds the Auth0 user by email
3. Auth0 sends a **password change / set password** email (acts as the invite link)
4. The captain or player sets their password, then signs in at `/captain/login` or `/player/login`
5. First login still auto-links via email match — no Auth0 `sub` paste required

When M2M credentials are **not** configured, behavior is unchanged: the API returns `{ emailSubject, emailBody }` for manual copy/paste.

#### Security notes

- Management API tokens are fetched server-side only — never exposed to the browser
- Invite endpoints are rate-limited to **5 sends per hour per player**
- If Auth0 delivery fails (misconfigured scopes, etc.), the API falls back to the manual email template

### Player portal (read-only standings)

Roster players (not captains) view standings at `/player/login`.

1. Add the player under **Players**, assign them to a team **Roster** on the league detail page
2. Player signs in at `/player/login` with the email on their player record — account links automatically on first login
3. They see every league they are on across pool, darts, and volleyball

Captains should use `/captain/login` instead — the player portal rejects team captains.

Manual link: **Link player login** in admin, or `npx ts-node server/src/scripts/seedPlayer.ts` (player must be on a team roster first).

---

## League self-service registration

Public league and tournament sign-up uses the **same Auth0 SPA and API** as staff, captains, and players. Auth0 proves identity; MongoDB stores rosters, registration status, and payments.

### End-to-end flow

```
Visitor → /register (browse open sessions)
       → /register/:leagueId (summary + rules)
       → Auth0 Universal Login (sign in or create account)
       → returnTo via appState (e.g. /register/:id/team)
       → POST /api/register/team/:id or /api/register/player/:id
       → optional pending approval / payment / waitlist
       → /captain or /player portal after approval
```

**Identity vs authorization (do not skip):**

| Step | Who decides |
|------|-------------|
| Auth0 login / sign-up | Who you are (`sub`, `email`) |
| `POST /api/captain/activate` or `/api/player/activate` | Links Auth0 to a `Player` record |
| `POST /api/register/*` | Creates a `Registration` row; may create `Team` or append to division |
| MongoDB `User.role` | Captain vs player vs staff — never trust Auth0 roles alone |

The React app **always** calls activate APIs after redirect when entering captain/player portals. Registration submit endpoints create or upgrade `User` records as part of the flow.

### 1. Enable Universal Login sign-up

1. Auth0 Dashboard → **Authentication → Database** → **Username-Password-Authentication**
2. Enable **Requires Username** and allow **Sign Ups**
3. Optional: **Authentication → Social** — enable Google etc. for the same SPA
4. SPA Application → **Settings** — confirm sign-up is allowed

### 2. Add `email`, `name`, and `email_verified` to access tokens

The API auto-links accounts by JWT `email` and blocks unverified users from **paid** registration when `email_verified` is present.

**Option A — Auth0 Action (recommended)**

1. Dashboard → **Actions → Library → Build Custom**
2. Name: `Tavern Base registration claims`
3. Trigger: **Login / Post User Registration**
4. Paste the code from [`docs/auth0/post-login-registration-action.js`](auth0/post-login-registration-action.js)
5. **Deploy**, then add the Action to the **Login** flow (drag after the trigger)

**Option B — API token settings (legacy)**

API → **Settings → Token Settings** → add `email` to the access token. Prefer the Action above so `email_verified` is included consistently.

### 3. Sign-up redirect pattern (`screen_hint` + `returnTo`)

Registration pages send new users to Auth0 with a return path stored in `appState`:

```typescript
loginWithRedirect({
  authorizationParams: {
    screen_hint: 'signup', // show Create Account on Universal Login
    login_hint: email,     // optional — pre-fill from a form field
  },
  appState: { returnTo: `/register/${leagueId}/player` },
});
```

After Auth0 redirects back, `client/src/main.tsx` reads `appState.returnTo` and navigates there. Captain and player login pages also accept `?returnTo=/path` for deep links.

### 4. Email verification before paid registration

1. Auth0 Dashboard → **Authentication → Database** → enable **Requires Email Verification**
2. Ensure the Action (or token settings) adds `email_verified` to access tokens
3. The API middleware `requireEmailVerifiedForRegistration` runs on `POST /api/register/*`:
   - **`email_verified` absent** → allow (backward compatible — invited captains with older tokens unaffected)
   - **`email_verified: true`** → allow
   - **`email_verified: false`** and league **entry fee &gt; 0** → `403` with a plain-English message
   - **Free registration** → allow even if unverified

Verify locally: decode your access token at [jwt.io](https://jwt.io) and confirm `email`, `name`, and `email_verified` when using the Action.

### 5. M2M vs self-service — decision tree

| Scenario | Path | Auth0 setup |
|----------|------|-------------|
| Staff dashboard | `/admin/login` | Seed `User` with `seedAdmin.ts` — no public sign-up |
| Captain invited by staff | Admin **Invite captain** → `/captain/login` | Optional M2M for automated email; auto-link by email on activate |
| Player on existing roster | Add to team → `/player/login` | Auto-link by email on activate |
| **New team — open registration** | `/register` → team form | Self-service sign-up; `activateCaptainFromAuth` when open team registration exists |
| **Singles tournament entry** | `/register` → player form | Self-service sign-up; `activatePlayerFromAuth` when open player registration exists |
| Manual link (legacy) | Admin **Link login** or seed scripts | Paste Auth0 `sub` — bypasses invite email |

**Use M2M (Management API)** when staff invite captains/players who are not self-registering — see [Optional: Auth0 Management API](#optional-auth0-management-api-automated-invite-emails) above.

**Use self-service** when registration is enabled on a league — no M2M required; users create their own Auth0 account at Universal Login.

### 6. Production checklist (registration)

Add these paths to the SPA **Callback**, **Logout**, and **Web Origins** (same origin is enough — paths are client-side routes):

- `/register`, `/register/:leagueId`, `/register/:leagueId/team`, `/register/:leagueId/player`
- `/captain/login`, `/captain`
- `/player/login`, `/player`

Rate limiting on public registration endpoints is recommended before high-traffic launch (see server route configuration).

### 7. Verify registration auth helpers

```bash
# Pure logic assertions (no MongoDB)
npx ts-node server/src/scripts/verifyRegistrationAuth.ts

# Vitest suite (from server/)
npm test -- requireEmailVerified
```

---

## 4. How auth works in code

```
Browser → Auth0 login → JWT (includes sub + audience)
       → API request with Authorization: Bearer <token>
       → checkJwt validates signature + audience
       → extractAuth0Sub(req) → User lookup
       → requireRole('manager' | 'staff' | 'league_admin') → 403 if not authorized
```

| Middleware | File | Purpose |
|------------|------|---------|
| `checkJwt` | `server/src/middleware/auth.ts` | Validates Auth0 JWT |
| `extractAuth0Sub` | `server/src/middleware/auth.ts` | Reads `sub` claim for User lookup |
| `requireRole` | `server/src/middleware/requireRole.ts` | Enforces staff role from MongoDB |
| `requireLeagueRead` | `server/src/middleware/requireLeagueAdmin.ts` | League GET routes (manager, staff, league_admin) |
| `requireLeagueWrite` | `server/src/middleware/requireLeagueAdmin.ts` | League mutations (manager, league_admin) |
| `requireCaptain` | `server/src/middleware/requireCaptain.ts` | Captain scoresheet routes |
| `requirePlayer` | `server/src/middleware/requirePlayer.ts` | Player read-only league routes |
| `requireEmailVerifiedForRegistration` | `server/src/middleware/requireEmailVerified.ts` | Paid `POST /api/register/*` when JWT includes `email_verified: false` |

Example route usage:

```typescript
router.delete(
  '/submissions/:id',
  checkJwt,
  requireRole('manager'),
  asyncHandler(handler)
);
```

Managers can access routes gated with `requireRole('staff')`.

---

## 5. Production checklist

When deploying to Vercel (client) and Railway (server):

1. Add production URLs to Auth0 SPA **Callback**, **Logout**, and **Web Origins**
2. Create or reuse an API with production audience identifier
3. Set production env vars in Vercel and Railway dashboards
4. Re-run `seedAdmin` against production MongoDB (or add staff users manually)
5. Deploy the **Post Login** Action and enable **Requires Email Verification** if using paid registration
6. Confirm `/register/*`, `/captain/*`, and `/player/*` routes work on the production origin

---

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Login redirect loop | Callback URL mismatch — add exact origin to Auth0 SPA settings |
| `invalid_request` — client not authorized to access resource server | SPA not authorized on API → **Application Access** tab → enable User-delegated access |
| `401 Unauthorized` on API | Missing/expired token, or `AUTH0_AUDIENCE` mismatch |
| `403 Forbidden — user not registered` | User logged into Auth0 but no `User` document — run seed script |
| `403 Forbidden — insufficient role` | User exists but role is `staff`; route requires `manager` |
| `403` — verify your email before paid registration | JWT has `email_verified: false` and league has an entry fee — verify email in Auth0, sign in again |
| Captain “account not registered” after invite | Token missing `email` claim — deploy Post Login Action or add email to API token settings |
| CORS errors | Client origin not in server CORS config or Auth0 Web Origins |
