# Barry O's — Phased Build Prompt Sequences

This document contains Cursor prompt sequences for each build phase. Paste the relevant prompt into Cursor's chat (with the context file attached) to execute that phase.

Each prompt is designed to be self-contained: it tells the AI exactly what to build, which files to create, and what the acceptance criteria are.

---

## PHASE 0: Foundation

**Goal:** MERN scaffolding adapted for Barry O's. Delete template boilerplate; wire real models, DB connection, and Auth0.

**Estimated time:** 2–3 hours  
**Branch:** `feat/phase-0-foundation`

---

### Prompt 0.1 — Adapt the base template

```
You are setting up the Barry O's Old Market Tavern project from a MERN base template.

Read .cursorrules for the full project context. The base template has generic placeholder 
models and routes (users, items). We need to:

1. DELETE the generic template models from server/src/models/:
   - Remove any User model that doesn't match our schema (we'll add ours)
   - Remove any Items/Posts model

2. CREATE the four Barry O's models in server/src/models/:
   - Event.ts
   - Submission.ts  
   - SiteSettings.ts
   - User.ts
   - index.ts (re-exports all four)

Use the exact schemas from docs/contexts/CONTEXT_server_models.md.

3. CREATE server/src/config/db.ts:
   - Mongoose connection with error handling
   - Log "MongoDB connected" on success, exit(1) on failure

4. CREATE server/src/services/settings.ts:
   - ensureSettings() function that creates the SiteSettings singleton if missing
   - Default hours: Mon–Thu 11AM–2AM, Fri–Sat 11AM–2:30AM, Sun 11AM–2AM
   - Default contact: 324 S. Main St., Royal Oak, MI 48067 / (248) 541-3539

5. UPDATE server/src/index.ts (or app.ts):
   - Import and call db connection on boot
   - Call ensureSettings() after DB connects
   - Register placeholder route files (we'll fill them in later):
     GET /api/health → 200 { status: 'ok' }

6. UPDATE client/src/App.tsx:
   - Remove all template routes (dashboard, items, etc.)
   - Add route structure:
     / → HomePage (placeholder)
     /submit → SubmitPage (placeholder)
     /thank-you → ThankYouPage (placeholder)
     /admin/login → LoginPage (placeholder)
     /admin → AdminLayout with nested routes:
       (index) → OverviewPage (placeholder)
       submissions → SubmissionsPage (placeholder)
       events → EventsPage (placeholder)
       announcement → AnnouncementPage (placeholder)
       christmas → ChristmasPage (placeholder)
       hours → HoursPage (placeholder)
       media → MediaPage (placeholder)
   - Wrap /admin routes in <RequireAuth> (existing pattern from template)

7. UPDATE .env.example files with the Barry O's env vars from .cursorrules.

Acceptance criteria:
- npm run dev starts without errors
- GET /api/health returns 200
- MongoDB connects and SiteSettings singleton is created on first boot
- All placeholder routes return 200 with a "Coming soon" response
```

---

### Prompt 0.2 — Auth0 configuration check

```
Review the existing Auth0 setup in the base template and adapt it for Barry O's:

1. The base template uses Auth0 for auth — keep this, don't replace it.

2. UPDATE server/src/middleware/auth.ts:
   - Ensure checkJwt uses AUTH0_DOMAIN and AUTH0_AUDIENCE from env
   - Add a helper extractAuth0Sub(req) that returns the 'sub' claim from the JWT
   - This sub is how we link Auth0 identity to our User model

3. CREATE server/src/middleware/requireRole.ts:
   - Middleware that takes a role ('manager' | 'staff')
   - After checkJwt, looks up User by auth0Sub
   - Returns 403 if role doesn't match
   - Usage: router.delete('/submissions/:id', checkJwt, requireRole('manager'), handler)

4. CREATE a seed script at server/src/scripts/seedAdmin.ts:
   - Creates one manager User in MongoDB
   - Reads ADMIN_AUTH0_SUB, ADMIN_EMAIL, ADMIN_NAME from env
   - Safe to run multiple times (upsert)
   - Run with: npx ts-node server/src/scripts/seedAdmin.ts

Document the Auth0 dashboard settings needed in docs/SETUP_AUTH0.md:
- Application type: Single Page Application
- Allowed Callback URLs: http://localhost:5173, https://barryostavern.com
- Allowed Logout URLs: http://localhost:5173, https://barryostavern.com
- Allowed Web Origins: http://localhost:5173, https://barryostavern.com
- API Audience: set in VITE_AUTH0_AUDIENCE
```

---

## PHASE 1: Public Site (Read-Only)

**Goal:** The public site renders correctly from live API data. Hero, announcement, events (both states), Christmas CTA, footer. No gallery yet.

**Branch:** `feat/phase-1-public-site`

---

### Prompt 1.1 — Public API routes

```
Create the public (no-auth) Express routes for the Barry O's site.
Read docs/contexts/CONTEXT_server_models.md for model shapes.
Read .cursorrules for the full API surface.

CREATE server/src/routes/public.ts with these routes:

GET /api/site
- Returns public-safe SiteSettings fields:
  announcement { enabled, message, linkTarget }
  christmasParty { enabled, title, date, note, ticketUrl }
  hero { videoUrl, posterUrl }
  hours (array, sorted by order field)
  contact { address, phone }
  about
  instagram { handle, showApprovedInGallery }
- Do NOT return internal fields

GET /api/events
- Returns events where date >= new Date() (upcoming only)
- Sort ascending by date
- Return: { data: Event[], meta: { count } }
- If no upcoming events: return { data: [], meta: { count: 0 } }
- NEVER return a 404 or error for empty results

GET /api/gallery
- Returns Submissions where status === 'approved'
- Sort descending by updatedAt (most recently approved first)
- Return: { data: Submission[], meta: { count } }
- Only return: _id, submitterName, caption, imageUrl, thumbnailUrl

Register these routes in server/src/index.ts:
  app.use('/api', publicRouter);

Acceptance criteria:
- GET /api/site returns settings data
- GET /api/events returns [] when no future events (not an error)
- GET /api/gallery returns [] when no approved submissions (not an error)
- Past events never appear in GET /api/events
```

---

### Prompt 1.2 — CSS design tokens and global styles

```
Set up the Barry O's design system in the React client.

Read docs/contexts/CONTEXT_public_site.md for the token values.
Reference barry-os-tavern.html for the full visual design.

1. CREATE client/src/styles/tokens.css:
   - All CSS custom properties from the mockup (--bg, --green, --green-bright, etc.)
   - @import for Google Fonts:
     Anton, Barlow (400/500/600/700), Kaushan Script, Oswald (400/500/600/700)

2. CREATE client/src/styles/global.css:
   - *, box-sizing: border-box, margin/padding reset
   - body: background var(--bg), color var(--text), font-family Barlow
   - .script: Kaushan Script
   - .display: Anton, uppercase
   - Common button base styles
   - Scrollbar styling (dark, green thumb)

3. UPDATE client/src/main.tsx:
   - Import tokens.css and global.css

4. CREATE client/src/styles/components.css:
   - .btn, .btn-green, .btn-outline (from mockup)
   - .pill (status indicators: pending/approved/rejected/live/off/past)
   - .section (standard section padding: 64px 0)
   - .wrap (max-width: 1080px, centered, horizontal padding)
   - .sec-head (section heading with decorative lines)

Do not add any component-specific styles here — those go in component files.
```

---

### Prompt 1.3 — Hero component

```
Build the Hero section for Barry O's homepage.
Reference barry-os-tavern.html section "HERO" for the exact design.
Read docs/contexts/CONTEXT_public_site.md for design rules.

CREATE client/src/components/public/Hero/index.tsx:

The Hero is the full-viewport opening section:
- <video> element: autoplay, muted, loop, playsInline
  - Video src comes from props.videoUrl (may be undefined — handle gracefully)
  - If no video file, the fallback renders instead (never a broken experience)
- Atmospheric fallback: a dark gradient with subtle warm light spots (CSS only, no image)
  - This renders BELOW the video; if video loads, it's covered. If not, fallback shows.
- Dark overlay gradient (top to bottom, 55% → transparent → 78%)
- Hero content (centered, z-index above video + overlay):
  - "EST ★ 1985" eyebrow with decorative clover SVG
  - h1: "A Neighborhood Tradition" (Anton font, clamp 46–96px)
  - Sub: "Old Market Tavern" (Oswald, green, wide letter-spacing)
  - CTA button: "About Barry O's" (btn-green, links to #about)
- Unmute/mute button: bottom-right, semi-transparent, appears only if videoUrl is set
- Entry animation: content fades/rises in sequence (staggered, 0.1s intervals)

Props:
  videoUrl?: string
  posterUrl?: string

The fallback gradient should evoke warm pub lighting:
  radial gradients for candlelight spots (amber/gold hues, low opacity)
  base: linear-gradient dark greens

Acceptance: renders cleanly with videoUrl=undefined; no layout shift when video loads.
```

---

### Prompt 1.4 — AnnouncementBar, EventsSection, EvergreenPanel

```
Build three interconnected components for Barry O's.
Read docs/contexts/CONTEXT_public_site.md carefully — the dual-state events section is critical.
Reference barry-os-event-states.html for both states visually.

1. CREATE client/src/components/public/AnnouncementBar/index.tsx:
Props: { enabled: boolean, message: string, linkTarget: string }
- If enabled=false: return null (no empty bar)
- Green gradient strip (from mockup: green-deep → green → green-deep)
- Left: megaphone icon, "ANNOUNCEMENT" label, message text
- Right: "[linkTarget] →" link with animated arrow
- Subtle diagonal stripe pattern overlay

2. CREATE client/src/components/public/EvergreenPanel/index.tsx:
No props needed.
- This shows when there are NO upcoming events
- Headline: "Nothing big on the books — we're still open"
- Kicker: "★ The Usual ★"
- Lead paragraph: "No watch party or special event lined up right now. But the games are 
  on every screen, the pints are cold, and there's always a stool with your name on it."
- Three pillars:
  - "Every Game On" / "All the screens, all season"
  - "Cold Pints, Always" / "Guinness on tap, Jameson neat"
  - "Open 7 Days" / "'Til 2AM most nights"
- Two CTAs: "Follow for Updates" and "See Hours & Find Us"
- Background: radial gradient (green tint) with a large watermark shamrock

3. CREATE client/src/components/public/EventCard/index.tsx:
Props: { event: Event }
- Shows: month abbreviation, day number, day-of-week
- Type badge (sports=green, holiday=gold, shuttle=blue, community=orange)
- Title (Anton), time (Oswald, muted), description
- Hover: lift -4px, border brightens, shadow

4. CREATE client/src/components/public/EventsSection/index.tsx:
Uses useEvents() hook.
- Loading: skeleton placeholder (same card shape, pulsing)
- events.length > 0: renders <EventsGrid> with 2-column grid
- events.length === 0: renders <EvergreenPanel>
- NEVER renders an error state or "no events" text to the public

5. CREATE client/src/hooks/useEvents.ts (public version):
Fetches GET /api/events — no auth required.

Acceptance criteria:
- With real upcoming events: cards appear
- With no upcoming events: EvergreenPanel appears (not an error, not empty text)
- Past events: never appear (filtered server-side)
- AnnouncementBar with enabled=false: DOM contains no announcement element
```

---

### Prompt 1.5 — ChristmasCTA, Footer, HomePage assembly

```
Complete the public site layout. 

1. CREATE client/src/components/public/ChristmasCTA/index.tsx:
Props: { christmasParty: SiteSettings['christmasParty'] }
- If enabled=false: return null
- Dark green gradient banner with ticket CTA
- Left: "BARRY O'S" label, "Christmas" (Kaushan Script), "PARTY" (Oswald)
- Center: headline, date, note text
- Right: "Get Tickets" button (white bg, dark green text) linking to ticketUrl
- CSS ticket graphic (from mockup — decorative, no images)

2. CREATE client/src/components/public/Footer/index.tsx:
Props: { settings: SiteSettings }
- 4-column grid: brand / contact / hours / tagline
- Brand: "Barry O's" (Kaushan Script), "EST. 1985", "OLD MARKET TAVERN"
- Contact: address with map pin icon, phone with phone icon
- Hours: map settings.hours array → "Day | Hours" rows
- Tagline: "Good Times. Cold Drinks. Great People." + shamrock
- Copyright line at bottom

3. CREATE client/src/pages/public/HomePage.tsx:
Assembles the full public site in order:
  <Nav />
  <Hero videoUrl={settings.hero?.videoUrl} />
  <AnnouncementBar {...settings.announcement} />
  <EventsSection />              ← handles its own data fetch
  <ChristmasCTA christmasParty={settings.christmasParty} />
  <Gallery />                    ← placeholder for now (Phase 3)
  <Footer settings={settings} />

Uses useSiteSettings() hook for settings data.
Shows a full-screen loading state only on first load (not on subsequent navigations).

4. CREATE client/src/hooks/useSiteSettings.ts:
Fetches GET /api/site.

Acceptance criteria:
- Page renders fully with all sections from API data
- With christmas.enabled=false: no ChristmasCTA in DOM
- With announcement.enabled=false: no AnnouncementBar in DOM  
- Footer hours match what's in SiteSettings
```

---

## PHASE 2: Admin Dashboard Content Management

**Goal:** Staff can manage events, announcement, Christmas, hours, and site info. No photo moderation yet.

**Branch:** `feat/phase-2-admin-dashboard`

---

### Prompt 2.1 — Admin API routes

```
Create the authenticated admin routes for content management.
Read .cursorrules for the full API surface and auth patterns.
Read docs/contexts/CONTEXT_admin_dashboard.md for what the UI expects.

CREATE server/src/routes/admin.ts with these authenticated routes.
All routes in this file use checkJwt middleware applied at the router level.

Events CRUD:
  GET    /api/admin/events          → ALL events incl. past, sorted by date asc
  POST   /api/admin/events          → create event, validate required fields
  PATCH  /api/admin/events/:id      → update event fields
  DELETE /api/admin/events/:id      → delete event

Site settings:
  GET    /api/admin/site            → full SiteSettings document
  PUT    /api/admin/site            → update settings (merge, don't replace entirely)
    - Validate announcement.linkTarget is one of the allowed enum values
    - Validate christmasParty.ticketUrl is a valid URL if provided

Media:
  POST   /api/admin/media/hero      → upload hero video (multipart)
    - Use multer for video/* MIME types, 500MB limit
    - Upload to Cloudinary barryos/hero/ folder
    - Update SiteSettings.hero.videoUrl

Overview stats (convenience endpoint):
  GET    /api/admin/overview        → {
    pendingSubmissions: number,
    upcomingEvents: number,
    announcement: { enabled, message },
    christmas: { enabled, daysUntil }
  }

Register in server/src/index.ts:
  app.use('/api/admin', adminRouter);

Return consistent shape: { data: T } on success, { error: string } on failure.

Acceptance criteria:
- All admin routes return 401 without a valid Auth0 token
- All admin routes work correctly with a valid token
- PUT /api/admin/site with partial data updates only those fields
- DELETE /api/admin/events/:id removes the event from the DB
```

---

### Prompt 2.2 — Admin layout and navigation

```
Build the admin dashboard shell: layout, sidebar, navigation.
Read docs/contexts/CONTEXT_admin_dashboard.md for the nav structure.
Reference barry-os-admin-dashboard.html for the visual design.

1. CREATE client/src/components/admin/AdminLayout/index.tsx:
- Two-column grid: 248px sidebar + flex-1 main
- Uses Auth0's useAuth0() — if !isAuthenticated, redirect to /admin/login
- Renders <Sidebar /> and <Outlet /> (React Router nested routes)

2. CREATE client/src/components/admin/Sidebar/index.tsx:
Props: { pendingCount: number }
- Brand section: "Barry O's" (Kaushan Script) + "Staff Dashboard" sub
- Nav items from CONTEXT_admin_dashboard.md
- "Photo Submissions" shows amber badge when pendingCount > 0
- Active state: green highlight
- Footer: "Signed in as [user name]" + logout button

3. CREATE client/src/pages/admin/LoginPage.tsx:
- Simple centered card with "Staff Login" heading
- "Sign in with Auth0" button → calls loginWithRedirect()
- Barry O's brand treatment (dark theme, green button)
- If already authenticated, redirect to /admin

4. CREATE client/src/components/admin/shared/Toggle.tsx:
Props: { checked: boolean, onChange: (v: boolean) => void, label: string }
- iOS-style toggle (matches mockup exactly)
- Label shows "Showing on site" or "Hidden" based on state

5. CREATE client/src/components/admin/shared/Toast.tsx + useToast hook:
- Toast context provider
- useToast() hook: toast('Message saved', 'success') | toast('Error', 'error')
- Bottom-center, auto-dismiss 1.8s
- Green for success, red for error

Acceptance criteria:
- /admin without auth → redirects to /admin/login
- /admin/login when authenticated → redirects to /admin
- Sidebar nav highlights active route
- Pending badge appears/disappears based on count
```

---

### Prompt 2.3 — Overview, Events, and Announcement pages

```
Build three admin pages: Overview, Events manager, and Announcement editor.
Read docs/contexts/CONTEXT_admin_dashboard.md for exact content requirements.

1. CREATE client/src/pages/admin/OverviewPage.tsx:
Uses useAdminApi to fetch GET /api/admin/overview.
- 4 stat cards (clickable → navigate to sub-page):
  · Photos to review (pendingSubmissions) — amber color
  · Upcoming events — green color
  · Announcement bar (On/Off text)
  · Christmas CTA (days until or Off)
- "Needs your attention" — list of pending submissions (photos with name, caption, 
  "Review" button linking to /admin/submissions)
- "Live on the site" — announcement status, events count, Christmas status

2. CREATE client/src/pages/admin/EventsPage.tsx:
Two sections:

Add Event form:
- Type dropdown (sports/holiday/shuttle/community with labels from CONTEXT)
- Date input (type="date")
- Time text input (placeholder: "e.g. 6:30 PM")
- Title text input
- Description textarea (max 400 chars, char count shown)
- Submit button: POST /api/admin/events

Event list:
- Fetches GET /api/admin/events (all events, incl. past)
- Past events: 55% opacity, "Past · hidden" pill
- Each row: date block (month/day), title, type pill, description, delete button
- Delete: confirm dialog → DELETE /api/admin/events/:id
- List refetches after add or delete

3. CREATE client/src/pages/admin/AnnouncementPage.tsx:
- <Toggle> for enabled state
- Message text input (live preview updates as user types)
- Link target dropdown
- Live preview: exact render of the announcement bar as it appears on the public site
- Auto-save on toggle change; explicit Save button for message/link edits
- PUT /api/admin/site with { announcement: { enabled, message, linkTarget } }

Acceptance criteria:
- Adding an event immediately appears in the list
- Deleting an event removes it from the list
- Toggling announcement off immediately PUTs to API
- Live preview of announcement bar matches the public site appearance exactly
```

---

### Prompt 2.4 — Christmas, Hours, and Media pages

```
Build the remaining three admin content pages.

1. CREATE client/src/pages/admin/ChristmasPage.tsx:
- <Toggle> showing "Showing on site / Hidden"
- Headline text input
- Date picker → computed "X days away" shown read-only
- Note text input
- Ticket URL input (validate URL format before saving)
- Save button: PUT /api/admin/site { christmasParty: { ... } }
- Live preview: Christmas CTA banner exactly as it appears on the public site
  (same component or a faithful copy — it must match)

2. CREATE client/src/pages/admin/HoursPage.tsx:
- Editable hours rows: [Day label input] [Hours input] [Remove button]
- Rows are reorderable (drag or up/down arrows — basic)
- "+ Add row" button appends a new blank row
- Save button: PUT /api/admin/site { hours: [...] }
- Also: address text input, phone text input, about textarea
- Save updates all contact + about info

3. CREATE client/src/pages/admin/MediaPage.tsx:
- Hero video section:
  · Shows current videoUrl filename (or "No video set")
  · Upload button → file picker (video/* types)
  · On select: POST /api/admin/media/hero (multipart)
  · Shows upload progress
  · On success: updates displayed URL
- Instagram section:
  · Handle text input (e.g. @barryostavern)
  · Toggle: "Show approved submissions in gallery"
  · Save: PUT /api/admin/site { instagram: { ... } }
  · Link to /admin/submissions

Acceptance criteria:
- Christmas live preview matches public ChristmasCTA component visually
- Hours changes save and are reflected in GET /api/site immediately
- Media upload shows progress and updates on completion
```

---

## PHASE 3: UGC Submission + Moderation

**Goal:** Public can submit photos; staff can approve/reject; approved photos appear in gallery.

**Branch:** `feat/phase-3-ugc-moderation`

---

### Prompt 3.1 — Image pipeline and submission route

```
Implement the photo submission system. This is safety-critical — read carefully.

Read docs/contexts/CONTEXT_image_pipeline.md for the full implementation.
Read .cursorrules section "CRITICAL NON-NEGOTIABLES" before starting.

1. INSTALL dependencies:
   cd server && npm install sharp multer cloudinary express-rate-limit

2. CREATE server/src/config/cloudinary.ts (from CONTEXT_image_pipeline.md)

3. CREATE server/src/middleware/upload.ts (from CONTEXT_image_pipeline.md)
   - memoryStorage, 8MB limit, image MIME validation only

4. CREATE server/src/middleware/rateLimit.ts (from CONTEXT_image_pipeline.md)
   - 10 submissions per 15 minutes per IP

5. CREATE server/src/services/imagePipeline.ts (from CONTEXT_image_pipeline.md)
   - processAndUpload(buffer): strips EXIF, re-encodes, uploads to pending folder
   - moveToGallery(publicId): renames Cloudinary asset to gallery folder
   - destroyImage(publicId): deletes from Cloudinary

6. CREATE server/src/routes/submissions.ts (from CONTEXT_image_pipeline.md)
   POST /api/submissions:
   - Rate limit → multer → processAndUpload → Submission.create
   - Reject if consent !== true (server-side check, return 400)
   - Return 201 with friendly message (no image URL in response)

7. UPDATE server/src/index.ts:
   Register: app.use('/api/submissions', submissionsRouter);

Acceptance criteria:
- POST /api/submissions without consent=true → 400 error
- POST /api/submissions with missing photo → 400 error
- POST /api/submissions with a non-image file → 400 error
- Successful submission: Submission created with status='pending', 
  exifStripped=true, cloudinaryFolder='pending'
- 11th submission within 15min from same IP → 429 error
- GPS coordinates in the original image are NOT present in the stored image
```

---

### Prompt 3.2 — Moderation queue (admin)

```
Build the admin moderation queue and approval/rejection flow.
Read docs/contexts/CONTEXT_admin_dashboard.md for the UI spec.
Reference barry-os-admin-dashboard.html for the visual design.

1. ADD admin submission routes to server/src/routes/admin.ts:
   GET    /api/admin/submissions?status=pending|approved|rejected
          → sorted by createdAt desc, include: name, caption, thumbnailUrl, 
            consent, when (formatted), status
   PATCH  /api/admin/submissions/:id   body: { status }
          → if approving: call moveToGallery(cloudinaryPublicId)
            update Submission.imageUrl to gallery URL
            update Submission.cloudinaryFolder to 'gallery'
            set review: { reviewedBy, reviewedAt }
          → if rejecting: update status only (keep asset in pending for 30 days)
          → if moving back to pending: update status only
   DELETE /api/admin/submissions/:id
          → call destroyImage(cloudinaryPublicId)
          → delete Submission document

2. CREATE client/src/hooks/useSubmissions.ts:
   Fetches GET /api/admin/submissions?status= with auth token.
   Returns { submissions, loading, refetch }.

3. CREATE client/src/pages/admin/SubmissionsPage.tsx:
   - Three tabs: Pending / Approved / Rejected (with counts)
   - Pending badge in tab header
   - Each submission item:
     · Thumbnail image (or placeholder if none)
     · Submitter name
     · Caption
     · "Rights confirmed" indicator (green checkmark)
     · Timestamp
     · For Pending: Approve + Reject buttons
     · For Approved/Rejected: status pill + "Move back to pending" button
   - Empty state per tab: "Nothing pending. Nice." etc.

4. UPDATE client/src/components/admin/Sidebar/index.tsx:
   - Pending count badge now reads from a real API call
   - Auto-refreshes every 60 seconds

5. UPDATE GET /api/gallery to return only approved submissions:
   - Confirm this is already correct from Phase 1
   - Confirm thumbnailUrl is being returned (for gallery tiles)

6. CREATE client/src/components/public/Gallery/index.tsx:
   Uses useGallery() hook → GET /api/gallery
   - Responsive grid (5 columns desktop, 3 tablet, 2 mobile)
   - Each tile: thumbnail image with hover Instagram-style overlay
   - If no approved photos: no gallery section rendered (don't show empty grid)
   - Instagram handle link above grid

Acceptance criteria:
- Approving a submission: it disappears from Pending tab, appears in Approved tab, 
  AND appears in the public gallery on next page load
- Rejecting: disappears from Pending, appears in Rejected
- Deleting: removed from DB and Cloudinary
- Public gallery: ONLY approved submissions visible — test by checking network tab
  (no pending/rejected URLs appear anywhere in public API responses)
```

---

### Prompt 3.3 — Public submission form

```
Build the public photo submission form that regulars will use.
Read docs/contexts/CONTEXT_public_site.md for form requirements.
Reference barry-os-admin-dashboard.html section "form" view for the design.

1. CREATE client/src/pages/public/SubmitPage.tsx:
Full-page public form (no login required):
- Heading: "Share a photo of Barry O's"
- Subheading: "Got a great shot from the bar? Send it our way..."
- Name field (required)
- Caption field (optional, 280 char max with counter)
- Photo upload:
  · Drag-and-drop zone OR click to select
  · Accepts image/* only
  · Shows filename + thumbnail preview after selection
  · Max 8MB (show error if exceeded before upload)
- Consent checkbox with full consent text:
  "I took this photo (or have permission to share it), everyone pictured is okay 
   with it being posted, and I give Barry O's permission to use it on their website 
   and social media."
- Submit button (disabled until: name filled + file selected + consent checked)
- POSTs multipart/form-data to /api/submissions
- On success: navigate to /thank-you
- On error: show error message in plain English above the button

2. CREATE client/src/pages/public/ThankYouPage.tsx:
Simple confirmation:
- Checkmark icon
- "Thanks — got it!"
- "A staff member will take a look before it goes up on the site."
- "Submit another photo" link → /submit

3. UPDATE client/src/App.tsx routes if not already done.

Acceptance criteria:
- Submit button is disabled until all three requirements are met
- Attempting to submit without consent: button stays disabled (can't bypass in UI)
- Server also rejects without consent: test by posting directly to API
- Success state: ThankYou page shown, new submission appears in admin Pending queue
- Photo does NOT appear on the public site
```

---

## PHASE 4: Polish, Accessibility & Launch

**Branch:** `feat/phase-4-polish`

---

### Prompt 4.1 — Accessibility and responsive QA

```
Perform an accessibility and responsive design pass on the complete application.

1. AUDIT all components for:
   - Semantic HTML (h1→h2→h3 hierarchy, no skipping)
   - All images have meaningful alt text (gallery: use caption or submitterName)
   - All interactive elements reachable by keyboard (Tab order logical)
   - Focus rings visible — use var(--green-bright) outline, not removed
   - All form inputs have associated <label> elements
   - Error messages are associated with inputs via aria-describedby
   - Buttons have descriptive text (not just "Delete" — "Delete event: [title]")
   - Color contrast: all text passes WCAG AA (4.5:1 for normal, 3:1 for large)
   - prefers-reduced-motion: video autoplay respects this; animations disabled

2. RESPONSIVE QA at three breakpoints:
   - 375px (mobile): all content readable, no horizontal scroll
   - 768px (tablet): events 2-col, gallery 3-col
   - 1080px+ (desktop): full layout as designed

3. ERROR AND EMPTY STATES review:
   - API down: public site shows graceful degradation (no crash, shows what it can)
   - Gallery empty: Gallery section not rendered (no empty grid)
   - Events empty: EvergreenPanel shown (already built, confirm it works)
   - No hero video: atmospheric fallback shows (no broken video element)

4. LOADING STATES:
   - All data-fetching components show appropriate skeleton/spinner
   - Skeletons should match the shape of the loaded content

5. META TAGS for SEO (update client/index.html and public pages):
   <title>Barry O's Old Market Tavern | Royal Oak, MI</title>
   <meta name="description" content="A neighborhood tradition since 1985.
     Cold pints, live music, and game-day atmosphere in Royal Oak, Michigan.">
   <meta property="og:..."> tags for social sharing
```

---

### Prompt 4.2 — Deployment configuration

```
Configure the project for production deployment on Vercel + Railway.

Read docs/architecture/ARCHITECTURE.md for the deployment model.

1. CREATE vercel.json in repo root:
{
  "rewrites": [{ "source": "/((?!api/).*)", "destination": "/index.html" }],
  "buildCommand": "cd client && npm run build",
  "outputDirectory": "client/dist"
}

2. CREATE railway.json (or Procfile) in repo root:
{
  "build": { "builder": "NIXPACKS" },
  "deploy": {
    "startCommand": "cd server && npm run build && npm start",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 30
  }
}

3. UPDATE server/src/index.ts:
   - Add CORS configuration:
     allowedOrigins: ['https://barryostavern.com', 'http://localhost:5173']
   - Add trust proxy for Railway: app.set('trust proxy', 1)
   - GET /api/health returns: { status: 'ok', timestamp: Date.now() }

4. CREATE docs/DEPLOY.md documenting:
   - Vercel: connect GitHub, set VITE_* env vars in Vercel dashboard
   - Railway: connect GitHub, set server env vars in Railway dashboard
   - MongoDB Atlas: whitelist Railway's IP range (or allow all for start)
   - Auth0: add production domain to allowed URLs
   - Cloudinary: confirm folder permissions
   - DNS: point barryostavern.com to Vercel, configure custom domain
   - Post-deploy checklist:
     □ GET /api/health returns 200
     □ Public site loads with real data
     □ Admin login works
     □ Submit a test photo → verify it appears in admin pending queue
     □ Approve test photo → verify it appears in public gallery
     □ Delete test photo

5. UPDATE client/.env.production (template):
   VITE_API_URL=https://api.barryostavern.com/api  (or Railway URL)
   VITE_AUTH0_DOMAIN=your-tenant.auth0.com
   VITE_AUTH0_CLIENT_ID=your-production-client-id
   VITE_AUTH0_AUDIENCE=https://api.barryostavern.com/api

Acceptance criteria:
- npm run build completes without errors
- Vercel preview deployment shows the public site
- Railway deployment responds to /api/health
- No environment secrets in source code
```

---

## Quick Reference: Prompt Cheat Sheet

| Phase | Prompt | What It Builds |
|---|---|---|
| 0 | 0.1 | Models, DB, route scaffold, App.tsx structure |
| 0 | 0.2 | Auth0 middleware, role guard, seed script |
| 1 | 1.1 | Public API routes (site, events, gallery) |
| 1 | 1.2 | CSS tokens, global styles |
| 1 | 1.3 | Hero component |
| 1 | 1.4 | AnnouncementBar, EventsSection, EvergreenPanel |
| 1 | 1.5 | ChristmasCTA, Footer, HomePage assembly |
| 2 | 2.1 | Admin API routes (events CRUD, site settings, media) |
| 2 | 2.2 | Admin layout, sidebar, login page |
| 2 | 2.3 | Overview, Events manager, Announcement editor |
| 2 | 2.4 | Christmas, Hours, Media pages |
| 3 | 3.1 | Image pipeline (sharp, Cloudinary, rate limit) |
| 3 | 3.2 | Admin moderation queue |
| 3 | 3.3 | Public submission form + thank-you page |
| 4 | 4.1 | Accessibility + responsive QA |
| 4 | 4.2 | Deployment configuration |
