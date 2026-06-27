# Setup Guide — Barry O's Old Market Tavern

Local development setup for the Barry O's MERN application.

---

## Prerequisites

```bash
node --version   # v18+
npm --version
git --version
```

You will also need accounts for:

- [MongoDB Atlas](https://www.mongodb.com/atlas) (database)
- [Auth0](https://auth0.com) (staff authentication)
- [Cloudinary](https://cloudinary.com) (image/video storage)

---

## 1. Clone and install

```bash
git clone <repo-url>
cd "Barry O's Tavern"
npm run install:all
```

---

## 2. Environment files

```bash
cp .env.example .env
cp client/.env.example client/.env
cp server/.env.example server/.env
```

---

## 3. MongoDB Atlas

1. Create a free cluster in MongoDB Atlas
2. Create a database user (Database Access → Add New Database User)
3. Whitelist your IP (Network Access → Add IP Address → Allow Access from Anywhere for dev)
4. Copy the connection string (Connect → Drivers)
5. Add to `server/.env`:

```env
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/barryos?retryWrites=true&w=majority
```

---

## 4. Auth0

1. Create an Auth0 tenant
2. Create a **Single Page Application** (Applications → Create Application)
3. Configure the SPA:
   - Allowed Callback URLs: `http://localhost:5173`
   - Allowed Logout URLs: `http://localhost:5173`
   - Allowed Web Origins: `http://localhost:5173`
4. Create an **API** (Applications → APIs → Create API):
   - Name: `Barry O's API`
   - Identifier: `http://localhost:3001/api` (this is the audience)
5. Add credentials:

**client/.env:**
```env
VITE_API_URL=http://localhost:3001/api
VITE_AUTH0_DOMAIN=your-tenant.auth0.com
VITE_AUTH0_CLIENT_ID=your-spa-client-id
VITE_AUTH0_AUDIENCE=http://localhost:3001/api
```

**server/.env:**
```env
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=http://localhost:3001/api
```

See [docs/SETUP_AUTH0.md](docs/SETUP_AUTH0.md) for additional Auth0 details.

---

## 5. Cloudinary

1. Create a Cloudinary account
2. Copy your `CLOUDINARY_URL` from the dashboard
3. Add to `server/.env`:

```env
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
CLOUDINARY_PENDING_FOLDER=barryos/pending
CLOUDINARY_PUBLIC_FOLDER=barryos/gallery
MAX_UPLOAD_BYTES=8000000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_SUBMISSIONS=10
```

Pending uploads go to `barryos/pending/`; approved photos move to `barryos/gallery/`. Hero video uploads use the hero folder via the admin media page.

---

## 6. Seed an admin user

After your first Auth0 login, seed your user record so the dashboard recognizes you:

1. Log in at http://localhost:5173/admin/login
2. Copy your Auth0 `sub` from the Auth0 dashboard or JWT
3. Add to `server/.env`:

```env
ADMIN_AUTH0_SUB=auth0|your-sub-here
ADMIN_EMAIL=you@example.com
ADMIN_NAME=Your Name
```

4. Run the seed script:

```bash
cd server && npx ts-node src/scripts/seedAdmin.ts
```

---

## 7. Start development

From the **repository root**:

```bash
npm run dev
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API | http://localhost:3001 |
| Health check | http://localhost:3001/api/health |

Optional — run one side only:

```bash
npm run dev:client   # port 5173
npm run dev:server   # port 3001
```

---

## 8. Verify setup

1. **Public home** — http://localhost:5173 loads hero, events section (EvergreenPanel if no events), footer
2. **Calendar** — http://localhost:5173/calendar shows full event list or EvergreenPanel
3. **Admin login** — http://localhost:5173/admin/login → Auth0 → redirects to `/admin` overview
4. **Add an event** — `/admin/events` → try all three schedule types (Specific date, Multiple days, Weekly)
5. **Photo submit** — `/submit` → upload with consent → lands on `/thank-you`; photo appears in `/admin/submissions` as pending (not on public gallery until approved)

---

## 9. League registration payments (optional)

Paid league sign-ups use **Stripe Checkout** (test mode for local dev). See [SETUP_AUTH0.md](docs/SETUP_AUTH0.md) for Auth0 registration flows.

1. Create a [Stripe](https://stripe.com) account and enable test mode
2. Add to `server/.env`:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_SUCCESS_URL=http://localhost:5173/register/payment/success?session_id={CHECKOUT_SESSION_ID}
STRIPE_CANCEL_URL=http://localhost:5173/register
CLIENT_URL=http://localhost:5173
```

3. Forward webhooks locally:

```bash
stripe listen --forward-to localhost:3001/api/webhooks/stripe
```

4. On league detail → **Registration settings**, set entry fee and open the window. Submit at `/register/:leagueId/team` redirects to Stripe when fee > 0.

Admin **payment ledger**, **waive fee**, and **refund** are on league detail. Cross-league approval queue: `/admin/leagues/registrations`.

---

## 10. League registration email (optional)

Registration notifications use a **two-phase** approach:

| Phase | When | Behavior |
|-------|------|----------|
| **Phase 1** (default) | No email provider configured | Server builds plain-text templates. Admin **approve/reject/promote** responses include the email body — the dashboard auto-copies it to your clipboard (same pattern as captain login invites). |
| **Phase 2** | `RESEND_API_KEY` set in `server/.env` | Same templates are sent automatically via [Resend](https://resend.com). Admin still receives the template in the API response as a fallback. |

**Templates:** registration received, approved, rejected, and payment receipt (includes amount + league name).

**Server env (Phase 2):**

```env
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=Barry O's <noreply@yourdomain.com>
```

Logs record only `registrationId`, `leagueId`, template name, and delivery status — **no recipient email or body** in server logs.

---

## Troubleshooting

### MongoDB connection failed
- Verify IP whitelist in Atlas
- Check username/password in connection string
- Ensure cluster is running

### Auth0 login error
- Callback URLs must match exactly (no trailing slash mismatch)
- Domain in `.env` should not include `https://`
- `VITE_AUTH0_AUDIENCE` must match `AUTH0_AUDIENCE` and the Auth0 API identifier

### API returns 401 on admin routes
- Confirm you are logged in
- Check Auth0 audience matches on client and server
- Verify admin user was seeded with correct `auth0Sub`

### Photo upload fails
- Confirm `CLOUDINARY_URL` is set
- Check file is JPEG/PNG/WebP and under 8 MB
- Consent checkbox must be checked (also enforced server-side)

### Port already in use
```bash
lsof -ti:3001 | xargs kill   # macOS/Linux
lsof -ti:5173 | xargs kill
```

---

## Next steps

- [README.md](README.md) — features, scripts, API overview
- [docs/architecture/ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md) — system design
- [docs/DEPLOY.md](docs/DEPLOY.md) — production deployment
- [.cursorrules](.cursorrules) — coding conventions

---

## Useful commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start client + server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
