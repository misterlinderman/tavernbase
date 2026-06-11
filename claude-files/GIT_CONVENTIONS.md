# Barry O's — Git Conventions & Version Control

---

## Branch Strategy

```
main                    ← production-ready code only. Deploys automatically.
feat/phase-0-foundation
feat/phase-1-public-site
feat/phase-2-admin-dashboard
feat/phase-3-ugc-moderation
feat/phase-4-polish
feat/<ticket>           ← any other feature or fix branch
```

**Rules:**
- Never commit directly to `main`
- Each phase is a separate branch, merged via PR
- PRs require the phase acceptance criteria to pass before merging
- Hotfixes branch from `main` and merge back to `main` (and the current phase branch if active)

---

## Commit Message Format

```
type(scope): short description (≤72 chars)

[Optional body: what and why, not how]

[Optional footer: BREAKING CHANGE or closes #issue]
```

### Types

| Type | When to Use |
|---|---|
| `feat` | A new feature or user-visible behavior |
| `fix` | A bug fix |
| `chore` | Config, dependencies, tooling, no behavior change |
| `docs` | Documentation only |
| `refactor` | Code restructured, no behavior change |
| `test` | Test files only |
| `style` | Formatting, whitespace, no behavior change |
| `perf` | Performance improvement |

### Scopes

| Scope | Area |
|---|---|
| `client` | React frontend (general) |
| `server` | Express backend (general) |
| `api` | API routes |
| `models` | Mongoose models |
| `auth` | Auth0, login, JWT |
| `submissions` | Photo submission pipeline |
| `events` | Event CRUD |
| `settings` | SiteSettings management |
| `gallery` | Public photo gallery |
| `admin` | Admin dashboard pages/components |
| `public` | Public site components |
| `deploy` | Deployment config, CI |
| `docs` | Documentation files |

### Examples

```bash
feat(api): add GET /api/events returning upcoming-only events
feat(public): add EvergreenPanel for empty events state
feat(admin): build ModerationQueue with pending/approved/rejected tabs
feat(submissions): add sharp EXIF-stripping pipeline
fix(api): exclude past events from GET /api/gallery
fix(admin): pending badge now polls every 60s
chore(deps): install sharp, multer, cloudinary
chore(server): add Railway healthcheck route
refactor(public): extract useEvents hook from EventsSection
docs(contexts): add CONTEXT_image_pipeline.md
test(api): add tests for submission consent enforcement
```

---

## PR Process

### Before Opening a PR

- [ ] All acceptance criteria for the prompt/phase pass
- [ ] `npm run lint` passes (zero errors)
- [ ] `npm run build` completes without errors
- [ ] No `.env` values committed
- [ ] No `console.log` left in production code paths (use proper logging)

### PR Title

Same format as commit: `feat(scope): short description`

### PR Description Template

```markdown
## What this PR does
[One paragraph, plain English]

## Acceptance criteria
- [ ] [copy from the build prompt]
- [ ] [...]

## How to test
1. Start the dev server
2. [specific steps]
3. Expected result: [...]

## Screenshots (if UI change)
[before/after or new component screenshot]
```

---

## Commit Granularity Rules

**One logical change per commit.** Don't bundle unrelated changes.

Good granularity:
```
feat(models): add Submission schema with EXIF and consent fields
feat(pipeline): add sharp EXIF-stripping and thumbnail generation
feat(api): add POST /api/submissions with rate limit and consent check
```

Too coarse:
```
feat: add entire submission system
```

Too fine:
```
fix: add semicolon
fix: fix typo in comment
```

---

## What Never Gets Committed

```gitignore
# Already in .gitignore — confirm these are present:
.env
.env.local
.env.production
server/.env
client/.env
node_modules/
dist/
build/
*.log
.DS_Store
```

Also never commit:
- Auth0 client IDs or secrets
- Cloudinary API keys or URLs
- MongoDB connection strings
- Any real patron photo or submission data

---

## Tagging Releases

Tag each phase completion and each production deploy:

```bash
# Phase completion
git tag -a phase-0 -m "Foundation complete: models, auth, scaffold"
git tag -a phase-1 -m "Public site complete: hero, events, footer"
git tag -a phase-2 -m "Admin dashboard complete: all content editors"
git tag -a phase-3 -m "UGC complete: submission pipeline + moderation"

# Production deploys
git tag -a v1.0.0 -m "Initial production launch"
git tag -a v1.0.1 -m "Hotfix: rate limit tuning"
```

Push tags:
```bash
git push origin --tags
```

---

## Phase Branch Lifecycle

```
# Start a phase
git checkout main
git pull origin main
git checkout -b feat/phase-1-public-site

# Work in small commits
git add -p   # always stage selectively, never git add .
git commit -m "feat(api): add GET /api/events with date filter"

# Keep branch current if main moves
git fetch origin
git rebase origin/main

# Merge phase
git checkout main
git merge --no-ff feat/phase-1-public-site
git tag -a phase-1 -m "Public site complete"
git push origin main --tags
```

`--no-ff` keeps phase boundaries visible in the git history.

---

## Hotfix Process

```
git checkout main
git checkout -b hotfix/event-date-filter
# fix the bug
git commit -m "fix(api): correct date comparison for upcoming events filter"
git checkout main
git merge --no-ff hotfix/event-date-filter
git tag -a v1.0.1 -m "Fix event date filter"
git push origin main --tags

# If a phase branch is active, apply the fix there too
git checkout feat/phase-2-admin-dashboard
git cherry-pick <commit-hash>
```

---

## Useful Git Aliases (add to ~/.gitconfig)

```ini
[alias]
  lg = log --oneline --graph --decorate --all
  st = status -sb
  staged = diff --cached
  undo = reset HEAD~1 --soft
  wip = !git add -A && git commit -m "chore: WIP [skip ci]"
```

`git wip` is for end-of-day saves only — always clean up WIP commits before opening a PR (`git rebase -i` to squash/reword).
