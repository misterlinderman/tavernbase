# MERN Stack Starter Template

A modern, production-ready MERN stack boilerplate with TypeScript, Auth0 authentication, and Tailwind CSS.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vite + React 18 + TypeScript |
| Styling | Tailwind CSS |
| Routing | React Router v6 |
| Backend | Express.js + TypeScript |
| Database | MongoDB + Mongoose |
| Authentication | Auth0 (swappable for Shopify OAuth) |
| Dev Tools | ESLint, Prettier, Nodemon, Concurrently |

## Project Structure

Repository root is the app workspace: `client/` and `server/` sit beside shared tooling and docs (no extra wrapper folder).

```
./
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route-level components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API calls and external services
│   │   ├── context/        # React context providers
│   │   ├── styles/         # Global styles
│   │   └── types/          # TypeScript type definitions
│   └── public/
├── server/                 # Express backend
│   └── src/
│       ├── middleware/     # Express middleware
│       ├── models/         # Mongoose schemas
│       ├── routes/         # API route definitions
│       ├── config/         # Configuration files
│       └── types/          # TypeScript type definitions
├── docs/                   # Guides and architecture notes
├── .cursor/rules/          # Cursor project rules (optional; see also .cursorrules)
├── .env.example            # Root env template
├── package.json            # Root scripts (dev, build, lint)
├── README.md
└── SETUP.md
```

For a deeper layout and data flow, see [docs/architecture/ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md).

## Prerequisites

- Node.js 18+ (recommend using nvm)
- MongoDB Atlas account (or local MongoDB)
- Auth0 account (free tier works)
- Git installed
- Cursor IDE

---

## Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd <your-project-folder>

# Install all dependencies (root, client, and server)
npm run install:all
```

### 2. Environment Setup

Copy the example environment files:

```bash
cp .env.example .env
cp client/.env.example client/.env
cp server/.env.example server/.env
```

### 3. Configure Services

#### MongoDB Atlas Setup

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free cluster
3. Create a database user (Database Access → Add New Database User)
4. Whitelist your IP (Network Access → Add IP Address → Allow Access from Anywhere for dev)
5. Get connection string (Connect → Connect your application)
6. Add to `server/.env`:
   ```
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority
   ```

#### Auth0 Setup

1. Go to [Auth0](https://auth0.com) and create a free account
2. Create a new Application (Applications → Create Application → Single Page Application)
3. Configure Allowed Callback URLs: `http://localhost:5173`
4. Configure Allowed Logout URLs: `http://localhost:5173`
5. Configure Allowed Web Origins: `http://localhost:5173`
6. Create an API (Applications → APIs → Create API)
   - Name: `MERN Starter API`
   - Identifier: `http://localhost:3001/api` (this becomes your audience)
7. Add credentials to your `.env` files (see Environment Variables section)

### 4. Run the Application

From the **repository root** (where the root `package.json` lives), use a single command:

```bash
npm run dev
```

This starts the API and Vite together via `concurrently` (ports **3001** and **5173**). You do not need separate terminals unless you prefer them.

Optional — run only one side while debugging:

```bash
npm run dev:server   # API only — http://localhost:3001
npm run dev:client   # Frontend only — http://localhost:5173
```

If `npm run dev` errors with `concurrently` not found, run `npm install` at the repository root (or `npm run install:all` once).

---

## Environment Variables

### Root `.env`
```env
NODE_ENV=development
```

### Client `.env`
```env
VITE_API_URL=http://localhost:3001/api
VITE_AUTH0_DOMAIN=your-tenant.auth0.com
VITE_AUTH0_CLIENT_ID=your-client-id
VITE_AUTH0_AUDIENCE=http://localhost:3001/api
```

### Server `.env`
```env
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb+srv://...
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=http://localhost:3001/api
JWT_SECRET=your-fallback-secret-for-dev
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both client and server in development |
| `npm run dev:client` | Start only the frontend |
| `npm run dev:server` | Start only the backend |
| `npm run build` | Build both client and server |
| `npm run install:all` | Install dependencies for root, client, and server |
| `npm run lint` | Run ESLint on both projects |
| `npm run format` | Run Prettier on both projects |

---

## API Endpoints

### Public Routes
- `GET /api/health` - Health check

### Protected Routes (require Auth0 token)
- `GET /api/users/me` - Get current user profile
- `PUT /api/users/me` - Update current user profile
- `GET /api/items` - Get all items for user
- `POST /api/items` - Create new item
- `PUT /api/items/:id` - Update item
- `DELETE /api/items/:id` - Delete item

---

## Authentication Flow

1. User clicks "Login" → Redirected to Auth0
2. Auth0 authenticates → Returns to app with token
3. Frontend stores token and includes in API requests
4. Backend validates token with Auth0
5. Protected routes accessible

### Swapping for Shopify Auth

For Shopify embedded apps, replace the Auth0 provider with Shopify App Bridge:

1. Install `@shopify/app-bridge-react`
2. Replace `Auth0Provider` with `AppBridgeProvider`
3. Use Shopify session tokens instead of Auth0 JWT
4. See `docs/SHOPIFY_AUTH.md` for detailed instructions

---

## Deployment

### Frontend (Vercel/Netlify)
```bash
cd client
npm run build
# Deploy dist/ folder
```

### Backend (Railway/Render/Fly.io)
```bash
cd server
npm run build
# Deploy with start command: npm start
```

### Environment Variables for Production
- Update all URLs to production domains
- Set `NODE_ENV=production`
- Use production MongoDB connection string
- Configure Auth0 for production URLs

---

## Documentation and AI context

| Resource | Purpose |
|----------|---------|
| [docs/README.md](docs/README.md) | Index of guides |
| [docs/architecture/ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md) | System layout, auth, and request flow |
| [AGENTS.md](AGENTS.md) | Quick context for coding agents (stack, commands, conventions) |
| `.cursorrules` | Legacy Cursor rules (full conventions) |
| `.cursor/rules/` | Project rules in `.mdc` form |

---

## Cursor IDE Tips

### Recommended Extensions
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript Vue Plugin (Volar) - for better TS support

### Cursor AI Prompts

Use these prompts with Cursor's AI to extend the template:

**Add a new feature:**
> "Add a new protected route /api/posts with CRUD operations following the existing patterns in controllers and routes"

**Add a new page:**
> "Create a new Dashboard page component with a sidebar layout using Tailwind, following the existing page patterns"

**Database model:**
> "Create a new Mongoose model for Comments with author reference to User, following the existing model patterns"

---

## Troubleshooting

### MongoDB Connection Issues
- Ensure IP is whitelisted in Atlas
- Check username/password in connection string
- Verify cluster is active

### Auth0 Issues
- Verify callback URLs match exactly
- Check domain doesn't include `https://`
- Ensure audience matches API identifier

### Port Conflicts
- Change ports in respective `.env` files
- Update CORS and callback URLs accordingly

---

## License

MIT
