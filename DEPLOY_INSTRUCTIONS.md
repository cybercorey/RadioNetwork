# 🚀 RadioNetwork Production Deployment Instructions

## Quick Start Checklist

### Step 1: Make v2 the Default Branch on GitHub

Since you need to manually set the default branch:

1. Go to: https://github.com/cybercorey/RadioNetwork/settings
2. Click "Branches" in the left sidebar
3. Under "Default branch", click the switch icon
4. Select `v2` from the dropdown
5. Click "Update" and confirm

This ensures Vercel and other services use the v2 branch by default.

---

## Step 2: Deploy Backend to Your Home Server

### Prerequisites
- [ ] Traefik reverse proxy running
- [ ] Domain configured in Cloudflare (orange cloud proxied)
- [ ] Docker and Docker Compose installed

### Deploy Commands

1. **Create environment file:**
   ```bash
   cp .env.backend.example .env.backend
   nano .env.backend  # Edit with your settings
   ```

2. **Configure `.env.backend`:**
   ```bash
   DB_USER=radionetwork
   DB_PASSWORD=YOUR_SECURE_PASSWORD_HERE
   DB_NAME=radionetwork
   API_DOMAIN=api.yourdomain.com
   CORS_ORIGIN=https://radionetwork.vercel.app,https://radionetwork-*.vercel.app
   LOG_LEVEL=info
   ```

3. **Check Traefik network name:**
   ```bash
   docker network ls | grep traefik
   ```

   If your Traefik network has a different name, update `docker-compose.backend.yml`:
   ```yaml
   networks:
     traefik:
       external: true
       name: your_actual_traefik_network_name
   ```

4. **Deploy:**
   ```bash
   chmod +x deploy-backend.sh
   ./deploy-backend.sh
   ```

5. **Verify:**
   ```bash
   # Check containers
   docker compose -f docker-compose.backend.yml ps

   # Test health endpoint locally
   curl http://localhost:4000/health

   # Test through Traefik (if configured)
   curl https://api.yourdomain.com/health
   ```

---

## Step 3: Deploy Frontend to Vercel

### Option A: Vercel CLI (Recommended)

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy from frontend directory:**
   ```bash
   cd frontend
   vercel --prod
   ```

4. **When prompted:**
   - Set up and deploy? **Y**
   - Which scope? Select your account
   - Link to existing project? **N** (first time)
   - What's your project's name? **radionetwork** (or your choice)
   - In which directory is your code located? **./** (already in frontend dir)
   - Want to modify settings? **N**

5. **Set environment variables:**
   ```bash
   vercel env add NEXT_PUBLIC_API_URL production
   # Enter: https://api.yourdomain.com

   vercel env add NEXT_PUBLIC_WS_URL production
   # Enter: https://api.yourdomain.com
   ```

6. **Redeploy with environment variables:**
   ```bash
   vercel --prod
   ```

7. **Note your Vercel URL** (e.g., `radionetwork-abc123.vercel.app`)

### Option B: Vercel Dashboard

1. **Go to Vercel:** https://vercel.com/new

2. **Import Repository:**
   - Click "Import Project"
   - Select GitHub
   - Find `cybercorey/RadioNetwork`
   - Click "Import"

3. **Configure Project:**
   - Framework Preset: **Next.js**
   - Root Directory: **frontend**
   - Build Command: `npm run build` (auto-detected)
   - Output Directory: `.next` (auto-detected)
   - Install Command: `npm install` (auto-detected)

4. **Environment Variables:**
   Add these variables:
   - `NEXT_PUBLIC_API_URL` = `https://api.yourdomain.com`
   - `NEXT_PUBLIC_WS_URL` = `https://api.yourdomain.com`

5. **Click "Deploy"**

6. **Wait for deployment to complete** (~2-3 minutes)

7. **Note your Vercel URL** from the deployment screen

---

## Step 4: Update Backend CORS

After getting your Vercel URL, update the backend to allow requests from it:

1. **Edit `.env.backend`** on your home server:
   ```bash
   CORS_ORIGIN=https://your-actual-vercel-url.vercel.app,https://radionetwork-*.vercel.app
   ```

2. **Restart the API:**
   ```bash
   docker compose -f docker-compose.backend.yml restart api
   ```

---

## Step 5: Configure Cloudflare (Optional but Recommended)

### DNS
Your DNS should already be configured, but verify:
- `api.yourdomain.com` → Your home IP
- Proxy status: **Proxied (orange cloud)** ✅

### Page Rules (for better caching)

Create these page rules at cloudflare.com:

1. **Rule 1:** `api.yourdomain.com/api/stations*`
   - Cache Level: **Standard**
   - Edge Cache TTL: **5 minutes**

2. **Rule 2:** `api.yourdomain.com/api/stations/*/current`
   - Cache Level: **Standard**
   - Edge Cache TTL: **30 seconds**

3. **Rule 3:** `api.yourdomain.com/socket.io/*`
   - Cache Level: **Bypass**

### Firewall Rules (for security)

1. **Rate Limiting:**
   - Expression: `(http.request.uri.path contains "/api/")`
   - Action: **Rate Limit**
   - Requests: **100 per minute**

2. **Bot Protection:**
   - Expression: `(cf.bot_management.score < 30)`
   - Action: **JS Challenge** or **Block**

---

## Step 6: Test Everything

### Test API Connectivity

1. **Visit your Vercel site** in a browser

2. **Open DevTools Console** (F12)

3. **Run this command:**
   ```javascript
   fetch('https://api.yourdomain.com/api/stations')
     .then(r => r.json())
     .then(console.log)
   ```

4. **You should see** a list of stations

### Test WebSocket

1. **Navigate to a station page:**
   - Example: `https://your-vercel-url.vercel.app/stations/soma-groove-salad`

2. **Open DevTools** → **Network** tab → **WS** filter

3. **Verify WebSocket connection:**
   - Should see connection to `api.yourdomain.com`
   - Status: **101 Switching Protocols**

4. **Watch for real-time updates:**
   - Every 60 seconds, song should update if stream is active

### Test Direct Access

```bash
# Stations list
curl https://api.yourdomain.com/api/stations | jq

# Current song for a station
curl https://api.yourdomain.com/api/stations/soma-groove-salad/current | jq

# Health check
curl https://api.yourdomain.com/health
```

---

## What You Need to Provide

For the deployment to work, please provide:

1. **Your API domain** (e.g., `api.yourdomain.com`)
   - This should already be configured in your Traefik setup

2. **Your Traefik network name**
   - Run: `docker network ls | grep traefik`
   - Usually just `traefik`, but might be different

3. **Vercel deployment preference:**
   - Option A: I can deploy via CLI if you're logged in
   - Option B: You deploy manually via dashboard

---

## Monitoring & Logs

### Backend Logs
```bash
# View all logs
docker compose -f docker-compose.backend.yml logs -f

# Just API logs
docker compose -f docker-compose.backend.yml logs -f api

# Last 50 lines
docker compose -f docker-compose.backend.yml logs --tail=50 api
```

### Vercel Logs
```bash
# Via CLI
vercel logs --follow

# Or in dashboard
# Go to: vercel.com → Your Project → Deployments → [Latest] → Logs
```

### Check Container Status
```bash
docker compose -f docker-compose.backend.yml ps
```

---

## Troubleshooting

### CORS Error
**Symptom:** "Access to fetch at ... has been blocked by CORS policy"

**Fix:**
1. Check `.env.backend` has correct Vercel URL in `CORS_ORIGIN`
2. Restart API: `docker restart radionetwork_api`
3. Hard refresh browser (Ctrl+Shift+R)

### WebSocket Not Connecting
**Symptom:** No real-time updates, WS connection fails

**Fix:**
1. Check `NEXT_PUBLIC_WS_URL` in Vercel env vars
2. Verify Cloudflare isn't blocking WebSocket
3. Check Traefik WebSocket support

### Backend Not Accessible
**Symptom:** `curl https://api.yourdomain.com/health` fails

**Fix:**
1. Check Traefik container: `docker ps | grep traefik`
2. Check Traefik labels: `docker inspect radionetwork_api | grep traefik.http`
3. Check DNS: `nslookup api.yourdomain.com`
4. Test locally: `curl http://localhost:4000/health`

### Database Connection Failed
**Symptom:** API crashes with database errors

**Fix:**
```bash
# Check database container
docker exec radionetwork_db pg_isready -U radionetwork

# Check logs
docker logs radionetwork_db

# Restart stack
docker compose -f docker-compose.backend.yml restart
```

---

## Files Created

This setup created the following new files:

1. `docker-compose.backend.yml` - Production backend Docker setup with Traefik labels
2. `.env.backend.example` - Example environment configuration
3. `deploy-backend.sh` - Deployment script for home server
4. `backend/src/config/cors.ts` - Enhanced CORS with wildcard support
5. `backend/src/api/middleware/cacheControl.ts` - CDN caching middleware
6. `frontend/vercel.json` - Vercel configuration
7. `.vercelignore` - Files to exclude from Vercel deployment
8. `DEPLOY_INSTRUCTIONS.md` - This file

---

## Next Steps After Deployment

1. **Seed the database** (if not already done):
   ```bash
   docker exec radionetwork_api npm run prisma:seed
   ```

2. **Monitor for 24 hours** to ensure scraping is working

3. **Set up monitoring** (optional):
   - Uptime monitoring (UptimeRobot, Healthchecks.io)
   - Error tracking (Sentry)
   - Log aggregation

4. **Configure custom domain on Vercel** (optional):
   - Go to Vercel dashboard → Project → Settings → Domains
   - Add your custom domain
   - Update Cloudflare DNS as instructed

---

## Cost Summary

- ✅ **Backend:** $0 (using existing home server)
- ✅ **Frontend:** $0 (Vercel Hobby plan)
- ✅ **Database:** $0 (self-hosted PostgreSQL)
- ✅ **Cache/Queue:** $0 (self-hosted Redis)
- ✅ **CDN:** $0 (Cloudflare Free + Vercel)
- ✅ **SSL Certificates:** $0 (Let's Encrypt via Traefik)

**Total:** $0/month 🎉

---

## Security Checklist

- [ ] Changed database password from default
- [ ] CORS configured with specific Vercel domain (no wildcards)
- [ ] Rate limiting enabled (Cloudflare + backend)
- [ ] Cloudflare proxy enabled (orange cloud)
- [ ] HTTPS enforced everywhere
- [ ] Database not exposed to internet
- [ ] Redis not exposed to internet
- [ ] Security headers configured (Helmet middleware)

---

Ready to deploy! Let me know what information you need from me. 🚀
