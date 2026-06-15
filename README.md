# Barry O's Old Market Tavern

**barryostavern.com · Royal Oak, MI · Est. 1985**

Custom MERN application replacing the legacy WordPress site. A dark Irish-pub marketing site for patrons, plus an Auth0-gated staff dashboard for day-to-day content management.

## What’s in the build

### Public site

| Feature | Route | Notes |
|---------|-------|-------|
| Home | `/` | Hero video, announcement bar, events preview, Christmas CTA, photo gallery, footer |
| Event calendar | `/calendar` | Full upcoming schedule with descriptions; empty calendar shows EvergreenPanel |
| Share a photo | `/submit` | Consent-gated UGC upload; rate-limited server-side |
| Thank you | `/thank-you` | Post-submission confirmation |
| Christmas tickets | `/christmas-party` | Ticket page when Christmas party is enabled |

**Events on the homepage:** compact cards with a “View Full Calendar” link. When no upcoming events exist, the site shows the EvergreenPanel (“Nothing big on the books — we’re still open”) — never an error or “no events” message.

**Event schedule types** (staff-managed):

- **Specific date** — one-time event on a single day
- **Multiple days** — back-to-back consecutive days (e.g. College World Series Thu–Sun)
- **Weekly** — repeats every week during a season (e.g. Monday Night Football through December)

### Staff dashboard

| Page | Route | Purpose |
|------|-------|---------|
| Overview | `/admin` | Pending photos, upcoming events, live toggles |
| Photo submissions | `/admin/submissions` | Approve / reject / delete patron photos |
| Events | `/admin/events` | Add, edit, delete events (all three schedule types) |
| Announcement bar | `/admin/announcement` | Toggle + message + link target, live preview |
| Christmas party | `/admin/christmas` | Toggle, date, note, ticket URL, live preview |
| Hours & info | `/admin/hours` | Footer hours, address, phone, about |
| Media & social | `/admin/media` | Hero video upload, Instagram handle, gallery toggle |

All `/admin/*` routes require Auth0. Plain-English labels throughout (“Showing on site”, “Multiple days”, etc.).

### Safety & moderation (non-negotiable)

- No patron photo reaches the public gallery without explicit staff approval
- Consent checkbox enforced **server-side** on `POST /api/submissions`
- EXIF metadata stripped from every upload via `sharp`
- Pending images stored in private Cloudinary folder until approved
- Rate limiting active on photo submissions

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | Vite + React 18 + TypeScript |
| Styling | Tailwind CSS + CSS custom properties (design tokens) |
| Routing | React Router v6 |
| Backend | Express.js + TypeScript |
| Database | MongoDB Atlas + Mongoose |
| Auth | Auth0 (SPA + JWT on admin routes) |
| Media | Cloudinary (pending / gallery / hero folders) |
| Deploy | Vercel (client) · Railway (server) |

Repository layout: `client/` and `server/` are siblings at the repo root.

```
./
├── client/src/
│   ├── components/public/   # Nav, Hero, Events, Gallery, Footer, …
│   ├── components/admin/    # Sidebar, ModerationQueue, editors, …
│   ├── pages/public/        # Home, Calendar, Submit, Christmas, …
│   ├── pages/admin/         # Overview, Events, Submissions, …
│   ├── hooks/               # useEvents, useSiteSettings, useAdminApi, …
│   ├── services/            # API fetch helpers
│   └── types/               # Shared TypeScript interfaces
├── server/src/
│   ├── models/              # Event, Submission, SiteSettings, User
│   ├── routes/              # public, admin, submissions, contact
│   ├── middleware/          # auth, rateLimit, upload, imagePipeline
│   └── utils/               # eventSchedule, storage helpers
└── docs/                    # Architecture, contexts, deploy guides
```

---

## Quick start

### Prerequisites

- Node.js 18+
- MongoDB Atlas cluster
- Auth0 tenant (SPA + API)
- Cloudinary account

### Install & configure

```bash
git clone <repo-url>
cd "Barry O's Tavern"
npm run install:all

cp .env.example .env
cp client/.env.example client/.env
cp server/.env.example server/.env
# Fill in MongoDB, Auth0, and Cloudinary values (see SETUP.md)
```

### Run locally

From the repository root:

```bash
npm run dev
```

- Frontend: http://localhost:5173  
- API: http://localhost:3001  

See [SETUP.md](SETUP.md) for Auth0, MongoDB, Cloudinary, and admin seeding steps.

---

## Environment variables

### Client (`client/.env`)

```env
VITE_API_URL=http://localhost:3001/api
VITE_AUTH0_DOMAIN=your-tenant.auth0.com
VITE_AUTH0_CLIENT_ID=your-client-id
VITE_AUTH0_AUDIENCE=http://localhost:3001/api
```

### Server (`server/.env`)

```env
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb+srv://...
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=http://localhost:3001/api
CLOUDINARY_URL=cloudinary://...
CLOUDINARY_PENDING_FOLDER=barryos/pending
CLOUDINARY_PUBLIC_FOLDER=barryos/gallery
MAX_UPLOAD_BYTES=8000000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_SUBMISSIONS=10
CLIENT_URL=http://localhost:5173
```

Full examples: `client/.env.example`, `server/.env.example`.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start API + Vite together |
| `npm run dev:client` | Frontend only (port 5173) |
| `npm run dev:server` | API only (port 3001) |
| `npm run build` | Production build (client + server) |
| `npm run install:all` | Install root, client, and server deps |
| `npm run lint` | ESLint on client and server |
| `npm run format` | Prettier on common file types |

---

## API overview

### Public (no auth)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/site` | Public site settings |
| GET | `/api/events` | Active upcoming events only (dated, multi-day, weekly) |
| GET | `/api/gallery` | Approved photo submissions |
| POST | `/api/submissions` | Create pending photo submission (multipart, rate-limited) |
| POST | `/api/contact` | Contact form submission |

### Admin (Auth0 JWT required)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/overview` | Dashboard stats |
| GET/PATCH/DELETE | `/api/admin/submissions` | Moderation queue |
| GET/POST/PATCH/DELETE | `/api/admin/events` | Event CRUD |
| GET/PUT | `/api/admin/site` | Site settings |
| POST | `/api/admin/media/hero` | Hero video upload |

---

## Documentation

| Document | Purpose |
|----------|---------|
| [SETUP.md](SETUP.md) | Local dev setup, Auth0, MongoDB, Cloudinary, admin seed |
| [AGENTS.md](AGENTS.md) | Quick orientation for AI coding assistants |
| [docs/README.md](docs/README.md) | Full documentation index |
| [docs/architecture/ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md) | System design, routing, data flows |
| [docs/DEPLOY.md](docs/DEPLOY.md) | Vercel + Railway production deploy |
| [docs/SETUP_AUTH0.md](docs/SETUP_AUTH0.md) | Auth0 configuration details |
| [docs/GIT_CONVENTIONS.md](docs/GIT_CONVENTIONS.md) | Commits, branches, PRs |
| [docs/contexts/](docs/contexts/) | Feature-specific context for AI sessions |
| `.cursorrules` | Project conventions and non-negotiables |

---

## Deployment

- **Client:** Vercel — root directory `client/`, build `npm run build`, output `dist/`
- **Server:** Railway — start `npm start`, health check `GET /api/health`

Production URLs: `https://barryostavern.com` (client) · `https://api.barryostavern.com` (API)

See [docs/DEPLOY.md](docs/DEPLOY.md) for env var checklists and Auth0 production settings.

---

## License

MIT
