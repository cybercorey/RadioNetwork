# Development Scripts

## Git Hooks

### Setup

After cloning the repository, run:

```bash
./scripts/setup-hooks.sh
```

This will install a pre-push hook that prevents broken code from being pushed to production branches.

### Pre-Push Hook

The pre-push hook runs automatically when you push to `main`, `master`, or `v2` branches.

**What it does:**
- ✅ Builds the frontend (`npm run build`)
- ✅ Checks backend TypeScript (`tsc --noEmit`)
- ❌ Blocks push if either check fails

**Output example:**

```bash
$ git push origin v2

🔍 Running pre-push checks...

📦 Building frontend...
✅ Frontend build succeeded

🔧 Checking backend TypeScript...
✅ Backend TypeScript check passed

✅ All pre-push checks passed!
🚀 Pushing to remote...
```

### Emergency Bypass

If you need to push urgently and bypass the hook (not recommended):

```bash
git push --no-verify
```

### Why This Helps

1. **Catches errors early** - Find build errors on your machine, not on Vercel
2. **Saves time** - No waiting for Vercel build to fail
3. **Prevents broken deployments** - Production stays stable
4. **Better DX** - Immediate feedback in your terminal

## Manual Build Check

You can also run the build check manually:

```bash
# Frontend only
cd frontend && npm run build

# Backend TypeScript check only
cd backend && npx tsc --noEmit

# Both (from root)
npm run build
```
