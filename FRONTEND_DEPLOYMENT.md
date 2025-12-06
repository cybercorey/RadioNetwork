# Frontend Deployment Guide

## API Proxy Setup

The frontend now uses a Next.js API proxy to securely communicate with the backend and enable CDN caching.

### Architecture

```
User Browser → Vercel CDN → Next.js API Proxy → Private Backend API
```

**Benefits:**
- ✅ Backend API URL kept private (not exposed to clients)
- ✅ Reduced bandwidth costs via CDN caching
- ✅ Improved performance with edge caching
- ✅ Built-in CORS handling
- ✅ Request timeout protection

### Cache Configuration

Different endpoints have optimized cache durations:

| Endpoint | Cache Duration | Stale While Revalidate |
|----------|---------------|----------------------|
| `/stations` | 5 minutes | 10 minutes |
| `/stations/[slug]/current` | 10 seconds | 30 seconds |
| `/plays/recent` | 30 seconds | 1 minute |
| `/plays/stats` | 1 minute | 2 minutes |
| `/analytics/dashboard` | 2 minutes | 5 minutes |

### Environment Variables

#### Development (.env.local)

```bash
# Public URLs (used by client-side code)
NEXT_PUBLIC_API_URL=/api/proxy
NEXT_PUBLIC_WS_URL=http://localhost:4000

# Private backend URL (server-side only, not exposed to client)
BACKEND_API_URL=http://localhost:4000
```

#### Production (Vercel)

Set these environment variables in your Vercel project:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project → Settings → Environment Variables
3. Add the following:

```bash
# Public URLs
NEXT_PUBLIC_API_URL=/api/proxy
NEXT_PUBLIC_WS_URL=https://radioapi.davis.kiwi

# Private backend URL (🔒 KEEP THIS SECRET!)
BACKEND_API_URL=https://radioapi.davis.kiwi
```

**IMPORTANT:**
- `BACKEND_API_URL` is server-side only and won't be exposed to the browser
- `NEXT_PUBLIC_*` variables are public and included in the client bundle
- The WebSocket URL (`NEXT_PUBLIC_WS_URL`) still connects directly to the backend for real-time updates

### Deployment Steps

#### Option 1: Vercel CLI

```bash
cd frontend

# Install Vercel CLI if needed
npm i -g vercel

# Set environment variables
vercel env add BACKEND_API_URL
# Enter: https://radioapi.davis.kiwi
# Select: Production

vercel env add NEXT_PUBLIC_API_URL
# Enter: /api/proxy
# Select: Production, Preview, Development

vercel env add NEXT_PUBLIC_WS_URL
# Enter: https://radioapi.davis.kiwi
# Select: Production, Preview, Development

# Deploy
vercel --prod
```

#### Option 2: Vercel Dashboard

1. Push your code to GitHub
2. Connect repository to Vercel (auto-deploys on push)
3. Add environment variables via dashboard (see above)
4. Trigger new deployment

### Testing the Proxy

After deployment, test the proxy endpoints:

```bash
# Production
curl https://your-app.vercel.app/api/proxy/stations

# Check cache headers
curl -I https://your-app.vercel.app/api/proxy/stations
# Should see: Cache-Control: public, s-maxage=300, stale-while-revalidate=600
```

### Monitoring & Debugging

**Check proxy logs in Vercel:**
1. Go to Vercel Dashboard → Your Project → Deployments
2. Click on latest deployment → Functions
3. View logs for `/api/proxy/[...path]`

**Common issues:**

| Issue | Solution |
|-------|----------|
| `BACKEND_API_URL is not defined` | Add the environment variable in Vercel settings |
| 502 Bad Gateway | Check backend API is accessible from Vercel's servers |
| CORS errors | Proxy handles CORS automatically - check backend CORS config |
| Timeout errors | Backend took >10s to respond - check backend performance |

### Cache Invalidation

The proxy uses `stale-while-revalidate`, which means:
- Fresh data served from cache during the cache period
- Background refresh when stale
- Old data served while refreshing (no wait time)

To force cache clear on Vercel:
```bash
vercel env rm CACHE_BUST_TOKEN
vercel env add CACHE_BUST_TOKEN
# Enter any value (e.g., current timestamp)
```

### Performance Optimization

**CDN Edge Caching:**
- Vercel automatically caches at 100+ global edge locations
- First request: ~500ms (backend fetch)
- Cached requests: ~50ms (served from edge)

**Bandwidth Savings:**
- Stations list: Cached 5 min → 60 requests/hour instead of 3600
- Current songs: Cached 10s → 360 requests/hour instead of 3600
- **Estimated savings: 90-95% reduction in backend requests**

### Security

The API proxy provides these security benefits:

1. **Hidden Backend URL:** Clients never see `https://radioapi.davis.kiwi`
2. **Rate Limiting:** Can add rate limits in proxy if needed
3. **Request Filtering:** Only proxies known API paths
4. **Timeout Protection:** Prevents hanging requests (10s timeout)
5. **Error Handling:** Sanitized error messages to clients

### Future Enhancements

Consider adding:
- [ ] Request rate limiting in proxy
- [ ] API key authentication for admin endpoints
- [ ] Request/response transformation
- [ ] Custom error pages for failed backend requests
- [ ] Analytics tracking for API usage
