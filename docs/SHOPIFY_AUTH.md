# Shopify Authentication Guide

This guide explains how to adapt the MERN starter for Shopify embedded app development.

## Overview

Shopify apps use a different authentication flow than Auth0:
- **Auth0**: Standard OAuth2 + JWT for standalone apps
- **Shopify**: Session tokens for embedded apps in the Shopify admin

## When to Use Shopify Auth

Use Shopify's authentication when building:
- Embedded apps (appear inside Shopify admin)
- Apps that access Shopify APIs (orders, products, etc.)
- Apps distributed through the Shopify App Store

Continue using Auth0 for:
- Standalone web apps
- Headless storefronts (customer-facing)
- Apps that don't need Shopify API access

---

## Setting Up Shopify App Development

### 1. Install Shopify CLI

```bash
npm install -g @shopify/cli @shopify/app
```

### 2. Create a Shopify Partner Account

1. Go to https://partners.shopify.com
2. Sign up for a free account
3. Create a development store for testing

### 3. Create a Shopify App

```bash
# Using Shopify CLI (recommended for new apps)
shopify app init

# Or manually in Partner Dashboard
# Apps → Create app → Custom app
```

---

## Modifying the MERN Starter for Shopify

### Frontend Changes

#### Install Shopify packages:
```bash
cd client
npm install @shopify/app-bridge-react @shopify/polaris
```

#### Replace Auth0Provider with AppBridgeProvider:

**Before (Auth0):**
```tsx
// client/src/main.tsx
import { Auth0Provider } from '@auth0/auth0-react';

<Auth0Provider domain={...} clientId={...}>
  <App />
</Auth0Provider>
```

**After (Shopify):**
```tsx
// client/src/main.tsx
import { AppBridgeProvider } from '@shopify/app-bridge-react';

const config = {
  apiKey: import.meta.env.VITE_SHOPIFY_API_KEY,
  host: new URLSearchParams(window.location.search).get('host') || '',
  forceRedirect: true,
};

<AppBridgeProvider config={config}>
  <App />
</AppBridgeProvider>
```

#### Use Shopify session tokens for API calls:

```tsx
// client/src/services/shopifyApi.ts
import { useAppBridge } from '@shopify/app-bridge-react';
import { getSessionToken } from '@shopify/app-bridge/utilities';
import axios from 'axios';

export function useAuthenticatedFetch() {
  const app = useAppBridge();

  return async (url: string, options: RequestInit = {}) => {
    const sessionToken = await getSessionToken(app);
    
    return axios({
      url,
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${sessionToken}`,
      },
    });
  };
}
```

### Backend Changes

#### Install Shopify packages:
```bash
cd server
npm install @shopify/shopify-api
```

#### Create Shopify auth middleware:

```typescript
// server/src/middleware/shopifyAuth.ts
import { shopifyApi, LATEST_API_VERSION } from '@shopify/shopify-api';
import { Request, Response, NextFunction } from 'express';

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: ['read_products', 'write_products'], // Add your scopes
  hostName: process.env.HOST!.replace(/https?:\/\//, ''),
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: true,
});

export interface ShopifyRequest extends Request {
  shopifySession?: {
    shop: string;
    accessToken: string;
  };
}

export const verifyShopifySession = async (
  req: ShopifyRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');
    
    if (!sessionToken) {
      return res.status(401).json({ error: 'No session token' });
    }

    const payload = await shopify.session.decodeSessionToken(sessionToken);
    
    // Get the offline session for this shop
    const session = await shopify.config.sessionStorage?.loadSession(
      `offline_${payload.dest.replace('https://', '')}`
    );

    if (!session) {
      return res.status(401).json({ error: 'Session not found' });
    }

    req.shopifySession = {
      shop: session.shop,
      accessToken: session.accessToken!,
    };

    next();
  } catch (error) {
    console.error('Shopify auth error:', error);
    res.status(401).json({ error: 'Invalid session' });
  }
};
```

#### Update routes to use Shopify auth:

```typescript
// server/src/routes/items.ts
import { verifyShopifySession, ShopifyRequest } from '../middleware/shopifyAuth';

router.use(verifyShopifySession);

router.get('/', asyncHandler(async (req: ShopifyRequest, res: Response) => {
  const shop = req.shopifySession?.shop;
  
  // Use shop as the user identifier instead of auth0Id
  const items = await Item.find({ shop });
  res.json(items);
}));
```

---

## Environment Variables for Shopify

### Client (.env)
```env
VITE_API_URL=http://localhost:3001/api
VITE_SHOPIFY_API_KEY=your-shopify-api-key
```

### Server (.env)
```env
PORT=3001
MONGODB_URI=your-mongodb-uri
SHOPIFY_API_KEY=your-shopify-api-key
SHOPIFY_API_SECRET=your-shopify-api-secret
HOST=https://your-ngrok-url.ngrok.io
SCOPES=read_products,write_products
```

---

## OAuth Flow for Shopify

Shopify requires an OAuth flow for app installation:

```typescript
// server/src/routes/shopifyAuth.ts
import { Router } from 'express';
import { shopify } from '../config/shopify';

const router = Router();

// Start OAuth flow
router.get('/auth', async (req, res) => {
  const shop = req.query.shop as string;
  
  const authUrl = await shopify.auth.begin({
    shop,
    callbackPath: '/api/shopify/callback',
    isOnline: false,
  });
  
  res.redirect(authUrl);
});

// OAuth callback
router.get('/callback', async (req, res) => {
  const callback = await shopify.auth.callback({
    rawRequest: req,
    rawResponse: res,
  });
  
  // Store session
  await shopify.config.sessionStorage?.storeSession(callback.session);
  
  // Redirect to app
  const host = req.query.host as string;
  res.redirect(`/?shop=${callback.session.shop}&host=${host}`);
});

export default router;
```

---

## Testing with ngrok

Shopify requires HTTPS for development:

```bash
# Install ngrok
npm install -g ngrok

# Start your server
npm run dev:server

# In another terminal, start ngrok
ngrok http 3001
```

Update your Shopify app settings with the ngrok URL.

---

## Resources

- [Shopify App Bridge](https://shopify.dev/docs/api/app-bridge)
- [Shopify API Library](https://github.com/Shopify/shopify-api-js)
- [Shopify CLI](https://shopify.dev/docs/apps/tools/cli)
- [Session Token Authentication](https://shopify.dev/docs/apps/auth/session-tokens)

---

## Hybrid Approach

You can support both Auth0 and Shopify in the same codebase:

```typescript
// server/src/middleware/auth.ts
import { checkJwt } from './auth0';
import { verifyShopifySession } from './shopifyAuth';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  // Check if this is a Shopify request
  if (req.headers['x-shopify-session-token']) {
    return verifyShopifySession(req, res, next);
  }
  
  // Otherwise use Auth0
  return checkJwt(req, res, next);
};
```

This allows you to:
- Use Auth0 for standalone web access
- Use Shopify auth for embedded app access
- Share the same API and database
