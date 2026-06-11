# Barry O's — System Architecture

**Stack:** MongoDB Atlas · Express · React (Vite) · Node.js  
**Services:** Vercel · Railway · Auth0 · Cloudinary  
**Last updated:** June 2026

---

## System Overview

Two front-end experiences, one Express API, one MongoDB database.

```
┌──────────────────────────┐     ┌──────────────────────────┐
│  Public Site             │     │  Staff Dashboard          │
│  React (Vite, SSR-ready) │     │  React (auth-gated SPA)   │
│  Vercel (static/edge)    │     │  Vercel (same deploy)     │
└────────────┬─────────────┘     └─────────────┬────────────┘
             │ read + submit                    │ read/write/moderate
             └──────────────┬───────────────────┘
                            ▼
               ┌────────────────────────┐
               │  Express REST API      │
               │  Node.js · Railway     │
               │  Port 3001             │
               └──────┬─────────┬───────┘
                       │         │
          ┌────────────┘         └────────────────┐
          ▼                                       ▼
┌──────────────────┐                 ┌─────────────────────────┐
│  MongoDB Atlas   │                 │  Cloudinary             │
│  Collections:    │                 │  barryos/pending/       │
│  · Event         │                 │  barryos/gallery/       │
│  · Submission    │                 │  (hero video)           │
│  · SiteSettings  │                 └─────────────────────────┘
│  · User          │
└──────────────────┘

Auth flow:
Browser → Auth0 (login) → JWT → Express (checkJwt middleware) → /api/admin/*
```

---

## Client Architecture

### Routing

```
/                    → HomePage (public)
/submit              → SubmitPhotoPage (public)
/thank-you           → ThankYouPage (public)
/admin/login         → LoginPage (unauthenticated)
/admin               → Overview (protected)
/admin/submissions   → SubmissionsPage (protected)
/admin/events        → EventsPage (protected)
/admin/announcement  → AnnouncementPage (protected)
/admin/christmas     → ChristmasPage (protected)
/admin/hours         → HoursPage (protected)
/admin/media         → MediaPage (protected)
```

All `/admin/*` routes wrap with `<RequireAuth>` which checks Auth0 `isAuthenticated`. Unauthenticated users redirect to `/admin/login`.

### Component Tree (Public Site)

```
HomePage
├── <Nav />
├── <Hero />                   looping video + fallback gradient
├── <AnnouncementBar />        renders null when disabled
├── <EventsSection />
│   ├── <EventsGrid />         when upcoming events exist
│   └── <EvergreenPanel />     when calendar is empty
├── <ChristmasCTA />           renders null when disabled
├── <Gallery />                approved submissions only
├── <SubmitPhotoForm />        link / modal trigger
└── <Footer />                 hours, address, phone, about
```

### Component Tree (Admin Dashboard)

```
AdminLayout
├── <Sidebar />                nav + pending badge
└── <Outlet />
    ├── Overview               stat cards + live status
    ├── SubmissionsPage
    │   └── <ModerationQueue tabs="pending|approved|rejected" />
    ├── EventsPage
    │   ├── <EventForm />      add event
    │   └── <EventList />      all events, past greyed
    ├── AnnouncementPage
    │   ├── <ToggleField />
    │   ├── <MessageField />
    │   └── <AnnouncementPreview />
    ├── ChristmasPage
    │   ├── <ToggleField />
    │   ├── <DateField />
    │   ├── <TicketUrlField />
    │   └── <ChristmasPreview />
    ├── HoursPage              editable hours rows
    └── MediaPage              hero video swap, IG handle
```

### State Management

No global state library. Each page owns its data via custom hooks:

```typescript
useEvents()          → GET /api/admin/events  (admin) or /api/events (public)
useSubmissions(status) → GET /api/admin/submissions?status=
useSiteSettings()    → GET /api/admin/site   (admin) or /api/site (public)
```

Custom hooks handle loading/error/refetch. All mutations call service functions, then invalidate (refetch) their hook. No optimistic updates in v1 — correctness over speed.

---

## Server Architecture

### Middleware Stack (per request)

```
Request
  → cors()
  → helmet()
  → express.json()
  → morgan (logging)
  → /api/submissions  → rateLimit → multer → imagePipeline → route handler
  → /api/admin/*      → checkJwt (Auth0) → route handler
  → /api/*            → route handler
  → globalErrorHandler
Response
```

### Image Pipeline (POST /api/submissions)

```
multipart form data
  → multer (memoryStorage, 8MB limit, image/* only)
  → sharp: re-encode to JPEG, strip EXIF metadata
  → sharp: resize thumbnail (400px wide, same aspect)
  → cloudinary.uploader.upload (stream)
      folder: process.env.CLOUDINARY_PENDING_FOLDER
      resource_type: 'image'
  → cloudinary.uploader.upload (thumbnail stream)
  → Submission.create({ status: 'pending', consent: true, ... })
  → 201 { message: 'Received — we'll review it soon.' }
```

On **approve** (PATCH /api/admin/submissions/:id):
```
Submission.findById → verify status is 'pending'
→ cloudinary.uploader.rename(
    from: pending/{publicId},
    to:   gallery/{publicId}
  )
→ Submission.updateOne({ status: 'approved', imageUrl: newUrl })
→ 200
```

On **reject** or **delete**:
```
→ cloudinary.uploader.destroy(publicId)
→ Submission.updateOne({ status: 'rejected' })  // soft reject
→ or Submission.deleteOne + destroy             // hard delete
```

---

## Service Integrations

### Auth0

- Frontend: `@auth0/auth0-react` — `Auth0Provider` wraps the admin SPA subtree.
- Backend: `express-oauth2-jwt-bearer` — `checkJwt` middleware validates tokens against Auth0 JWKS endpoint.
- User role is stored in MongoDB `User.role`. Auth0 manages identity; we manage authorization.

**Login flow:**
```
Staff opens /admin/login
→ Auth0 Universal Login (hosted)
→ Callback to /admin (with token)
→ getAccessTokenSilently() injected into all admin API calls
→ Backend checkJwt validates; extracts sub (Auth0 user ID)
→ User.findOne({ auth0Sub }) for role
```

### Cloudinary

Two logical folders:
- `barryos/pending/` — private, not publicly accessible. Uploaded on submission.
- `barryos/gallery/` — public CDN delivery. Moved here on approval.

Transforms applied at delivery (not stored): `f_auto,q_auto,w_800` for gallery tiles.

Hero video: stored directly in `barryos/hero/`. URL saved to `SiteSettings.hero.videoUrl`.

### MongoDB Atlas

Connection via Mongoose. Single connection on server boot, reconnect on drop.

```typescript
// config/db.ts
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => { console.error(err); process.exit(1); });
```

SiteSettings is a singleton — enforced with `findOneAndUpdate({ }, defaults, { upsert: true })` on boot.

---

## Deployment Architecture

### Environments

| Environment | Client URL | API URL | Branch |
|---|---|---|---|
| Development | localhost:5173 | localhost:3001 | feature/* |
| Production | barryostavern.com | api.barryostavern.com | main |

### Vercel (Client)

- Build command: `cd client && npm run build`
- Output: `client/dist`
- Environment vars: `VITE_API_URL`, `VITE_AUTH0_*`
- SPA routing: `vercel.json` rewrites all non-asset paths to `index.html`

```json
// vercel.json
{
  "rewrites": [{ "source": "/((?!api/).*)", "destination": "/index.html" }]
}
```

### Railway (Server)

- Start command: `cd server && npm start`
- Build command: `cd server && npm run build`
- Environment vars: all server env vars in Railway dashboard
- Health check: `GET /api/health` → 200

### Auth0 Production Configuration

Callback URLs: `https://barryostavern.com, https://barryostavern.com/admin`  
Logout URLs: `https://barryostavern.com`  
Web Origins: `https://barryostavern.com`

---

## Security Model

| Layer | Control |
|---|---|
| All admin routes | Auth0 JWT via checkJwt middleware |
| Photo submission | Rate limit (10/15min per IP), MIME validation, size limit |
| Consent | Enforced server-side — submission rejected if consent !== true |
| Image storage | Pending images in non-public Cloudinary folder |
| EXIF | Stripped by sharp before upload — GPS data never stored |
| Secrets | Environment variables only — never in source code |
| HTTPS | Enforced by Vercel + Railway in production |
| CORS | Whitelist production domain + localhost:5173 in development |

---

## Data Flow: "Staff Adds an Event"

```
Admin → EventsPage → <EventForm onSubmit />
  → services/events.ts: POST /api/admin/events  (with Auth0 token)
  → Express checkJwt → validate body → Event.create()
  → 201 { data: event }
  → useEvents() refetch → EventList re-renders with new card
  → Public site: GET /api/events (date >= now) now includes new event
  → EventsGrid flips from EvergreenPanel to event cards automatically
```

## Data Flow: "Patron Submits a Photo"

```
Patron → /submit → <SubmitPhotoForm />
  → consent checkbox required (UI + server)
  → POST /api/submissions (multipart)
  → rateLimit → multer → imagePipeline
  → sharp: EXIF strip + thumbnail
  → cloudinary upload → barryos/pending/
  → Submission.create({ status: 'pending' })
  → 201 → ThankYou page shown
  [ nothing appears on the public site ]

Staff → /admin/submissions → ModerationQueue (Pending tab)
  → sees photo, caption, "Rights confirmed" indicator
  → clicks Approve
  → PATCH /api/admin/submissions/:id { status: 'approved' }
  → cloudinary.rename pending → gallery
  → Submission updated
  → GET /api/gallery now includes this photo
  [ photo appears in public gallery ]
```
