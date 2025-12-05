# 🚀 Deploy to Vercel - Quick Guide

## Step 1: Go to Vercel Dashboard

Visit: **https://vercel.com/new**

## Step 2: Import Your GitHub Repository

1. Click **"Add New..."** → **"Project"**
2. If not connected to GitHub, click **"Continue with GitHub"**
3. Find and select: **`cybercorey/RadioNetwork`**
4. Click **"Import"**

## Step 3: Configure Project Settings

### Framework Preset
- Auto-detected: **Next.js** ✅

### Root Directory
- **IMPORTANT:** Change from `./` to `frontend`
- Click **"Edit"** next to Root Directory
- Type: `frontend`
- Click **"Continue"**

### Build Settings (Auto-detected - verify these)
- **Build Command:** `npm run build` ✅
- **Output Directory:** `.next` ✅
- **Install Command:** `npm install` ✅

## Step 4: Add Environment Variables

Click **"Environment Variables"** and add these:

| Name | Value | Environment |
|------|-------|-------------|
| `NEXT_PUBLIC_API_URL` | `https://api.placeholder.com` | Production |
| `NEXT_PUBLIC_WS_URL` | `https://api.placeholder.com` | Production |

**Note:** We're using placeholders for now. You'll update these later with your actual API domain.

## Step 5: Deploy!

1. Click **"Deploy"**
2. Wait 2-3 minutes for build to complete
3. You'll see a success screen with your URL

## Step 6: Get Your Vercel URL

After deployment completes, you'll see:
- **Production URL:** `https://radionetwork-<random>.vercel.app`

**Copy this URL!** You'll need it to update your backend CORS settings.

## Step 7: Set v2 as Default Branch (If Not Done)

1. Go to: **https://github.com/cybercorey/RadioNetwork/settings**
2. Click **"Branches"** in sidebar
3. Under "Default branch", click the **switch icon**
4. Select **`v2`**
5. Click **"Update"** and confirm

This ensures future deployments use the v2 branch.

## What to Update Later

Once you have your actual API domain configured:

### Update Vercel Environment Variables
1. Go to: **https://vercel.com/dashboard**
2. Select your **RadioNetwork** project
3. Go to **Settings** → **Environment Variables**
4. Update both variables:
   - `NEXT_PUBLIC_API_URL` → `https://api.yourdomain.com`
   - `NEXT_PUBLIC_WS_URL` → `https://api.yourdomain.com`
5. Redeploy:
   - Go to **Deployments** tab
   - Click **⋯** (three dots) on latest deployment
   - Click **"Redeploy"**

### Update Backend CORS
On your home server, edit `.env.backend`:
```bash
CORS_ORIGIN=https://radionetwork-<your-random>.vercel.app,https://radionetwork-*.vercel.app
```

Then restart:
```bash
docker compose -f docker-compose.backend.yml restart api
```

## Troubleshooting

### Build Fails
- **Error:** "No such file or directory: 'frontend'"
  - **Fix:** Make sure you set Root Directory to `frontend` in Step 3

### Environment Variables Not Working
- **Error:** "NEXT_PUBLIC_API_URL is undefined"
  - **Fix:** Make sure you added the env vars in Step 4
  - **Fix:** Redeploy after adding env vars

### Deployment Stuck
- **Fix:** Check the build logs for errors
- **Fix:** Verify your v2 branch is pushed to GitHub

## Next Steps

After successful deployment:

1. ✅ Test your Vercel site is live
2. ⏳ Deploy backend to your home server (when ready)
3. ⏳ Update environment variables with real API domain
4. ⏳ Update CORS settings in backend
5. ✅ Test full integration

---

## Quick Reference

**GitHub Repo:** https://github.com/cybercorey/RadioNetwork

**Vercel Dashboard:** https://vercel.com/dashboard

**Root Directory:** `frontend` ← **Don't forget this!**

**Environment Variables:**
- `NEXT_PUBLIC_API_URL` = `https://api.placeholder.com` (update later)
- `NEXT_PUBLIC_WS_URL` = `https://api.placeholder.com` (update later)

---

Good luck! 🚀
