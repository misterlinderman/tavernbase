# MERN Starter Setup Instructions

## For Cursor IDE + Claude Opus 4.5

Follow these steps to set up your development environment and connect with GitHub.

---

## Step 1: Prerequisites

Ensure you have the following installed:

```bash
# Check Node.js (need v18+)
node --version

# Check npm
npm --version

# Check Git
git --version
```

**Install if missing:**
- Node.js: https://nodejs.org (recommend LTS version)
- Git: https://git-scm.com

---

## Step 2: Create GitHub Repository

### Option A: GitHub Web Interface
1. Go to https://github.com/new
2. Name your repository (e.g., `my-mern-app`)
3. Keep it private or public as preferred
4. **Do NOT** initialize with README, .gitignore, or license (we have these)
5. Click "Create repository"
6. Copy the repository URL

### Option B: GitHub CLI
```bash
# Install GitHub CLI if needed: https://cli.github.com
gh repo create my-mern-app --private --source=. --remote=origin
```

---

## Step 3: Initialize Project in Cursor

### Open Cursor IDE and create project folder:

```bash
# Create and navigate to your project directory
mkdir my-mern-app
cd my-mern-app
```

### Copy all starter files into this directory

You can either:
1. Download and extract the starter template
2. Or have Claude generate the files directly in Cursor

### Initialize Git and connect to GitHub:

```bash
# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: MERN starter template"

# Add remote (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/my-mern-app.git

# Push to GitHub
git push -u origin main
```

---

## Step 4: Install Dependencies

```bash
# Install all dependencies (root, client, and server)
npm run install:all
```

This runs `npm install` in the root, client, and server directories.

---

## Step 5: Configure Environment Variables

### Copy example files:
```bash
cp .env.example .env
cp client/.env.example client/.env
cp server/.env.example server/.env
```

### Configure MongoDB Atlas:

1. Go to https://www.mongodb.com/atlas
2. Sign up or log in
3. Create a new project
4. Build a Database → Choose FREE tier
5. Create a cluster (default settings are fine)
6. Set up database access:
   - Security → Database Access → Add New Database User
   - Choose Password authentication
   - Save the username and password
7. Set up network access:
   - Security → Network Access → Add IP Address
   - Click "Allow Access from Anywhere" (for development)
8. Get connection string:
   - Deployment → Database → Connect → Connect your application
   - Copy the connection string
9. Add to `server/.env`:
   ```
   MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/baseapp?retryWrites=true&w=majority
   ```
   Replace USERNAME and PASSWORD with your database user credentials.

### Configure Auth0:

1. Go to https://auth0.com and sign up/log in
2. Create a new Application:
   - Applications → Create Application
   - Name: "MERN Starter" (or your app name)
   - Type: Single Page Application
   - Click Create
3. Configure application settings:
   - Allowed Callback URLs: `http://localhost:5173`
   - Allowed Logout URLs: `http://localhost:5173`
   - Allowed Web Origins: `http://localhost:5173`
   - Save Changes
4. Create an API:
   - Applications → APIs → Create API
   - Name: "MERN Starter API"
   - Identifier: `http://localhost:3001/api`
   - Click Create
5. Update environment files:

   **client/.env:**
   ```
   VITE_API_URL=http://localhost:3001/api
   VITE_AUTH0_DOMAIN=your-tenant.auth0.com
   VITE_AUTH0_CLIENT_ID=your-client-id-from-application-settings
   VITE_AUTH0_AUDIENCE=http://localhost:3001/api
   ```

   **server/.env:**
   ```
   PORT=3001
   NODE_ENV=development
   MONGODB_URI=your-mongodb-connection-string
   AUTH0_DOMAIN=your-tenant.auth0.com
   AUTH0_AUDIENCE=http://localhost:3001/api
   ```

---

## Step 6: Start Development

From the **repository root** (same folder as the root `package.json`):

```bash
npm run dev
```

This single command starts both the client and server (requires `npm run install:all` or at least `npm install` at the root so `concurrently` is available).

This will start:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

---

## Step 7: Verify Setup

1. Open http://localhost:5173 in your browser
2. You should see the MERN Starter home page
3. Click "Get Started" to test Auth0 login
4. After logging in, you should be redirected to the Dashboard
5. Try adding an item to verify MongoDB is working

---

## Step 8: Configure Cursor AI

### Enable Claude in Cursor:
1. Open Cursor Settings (Cmd/Ctrl + ,)
2. Go to AI → Models
3. Select Claude as your preferred model

### Project rules and docs
The project includes `.cursorrules`, `.cursor/rules/`, `AGENTS.md`, and `docs/architecture/ARCHITECTURE.md` so tools share the same context about:
- Project structure
- Code conventions
- Common patterns
- How to add new features

When asking Claude to help with code, it will follow these patterns automatically.

### Example prompts for Cursor AI:

**Add a new feature:**
```
Add a new "Notes" feature with:
- A Note model (title, content, user reference)
- CRUD API routes at /api/notes
- A Notes page with list view and create form
```

**Create a new component:**
```
Create a reusable Card component with:
- Title, subtitle, and children props
- Hover effect
- Optional action button
```

**Debug an issue:**
```
The items aren't loading on the Dashboard. 
Check the API call and auth token handling.
```

---

## Common Issues & Solutions

### "Cannot connect to MongoDB"
- Verify your IP is whitelisted in MongoDB Atlas Network Access
- Check the connection string has correct username/password
- Ensure the database user has read/write permissions

### "Auth0 login redirects to error"
- Verify callback URLs match exactly (including trailing slashes)
- Check that your Auth0 domain doesn't include `https://`
- Ensure the audience in client matches the API identifier

### "API returns 401 Unauthorized"
- Make sure you're logged in
- Check that the token is being sent in requests
- Verify AUTH0_AUDIENCE matches on both client and server

### Port already in use
- Kill the process: `lsof -ti:3001 | xargs kill` (macOS/Linux)
- Or change ports in the respective .env files

---

## Next Steps

1. **Customize the UI**: Edit Tailwind classes and components
2. **Add new features**: Use the patterns in `.cursorrules`
3. **Deploy**: See README.md for deployment instructions
4. **Shopify integration**: See [docs/SHOPIFY_AUTH.md](docs/SHOPIFY_AUTH.md)

---

## Useful Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development (client + server) |
| `npm run dev:client` | Start only frontend |
| `npm run dev:server` | Start only backend |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm run install:all` | Install all dependencies |

---

## Project Conventions

See `.cursorrules` for detailed coding conventions and patterns to follow when extending this project.
