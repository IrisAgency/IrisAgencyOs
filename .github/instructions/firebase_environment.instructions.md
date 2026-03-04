---
applyTo: '**'
---

# Firebase Environment & Deployment Instructions

## Firebase Projects

| Environment | Firebase Project ID    | Alias | Hosting URL                              |
|-------------|----------------------|-------|------------------------------------------|
| Production  | `iris-os-43718`       | `prod`| https://iris-os-43718.web.app            |
| Development | `iris-agency-os-dev`  | `dev` | https://iris-agency-os-dev.web.app       |

## Firebase Config Values

### Production (`iris-os-43718`)
```
apiKey: AIzaSyBoRMa1GuSPL73aphbJMG-AGkNqm17lWoY
authDomain: iris-os-43718.firebaseapp.com
projectId: iris-os-43718
storageBucket: iris-os-43718.firebasestorage.app
messagingSenderId: 841502880440
appId: 1:841502880440:web:97ecdc90363c668610fa4d
measurementId: G-F7KS3SN7YB
```

### Development (`iris-agency-os-dev`)
```
apiKey: AIzaSyAqRYdrCiGlzm1AzQw27pHXP0rTMWpSIfk
authDomain: iris-agency-os-dev.firebaseapp.com
projectId: iris-agency-os-dev
storageBucket: iris-agency-os-dev.firebasestorage.app
messagingSenderId: 658358777918
appId: 1:658358777918:web:ffcad581181674dc9e396f
```

## Environment Files Structure

| File                | Git Tracked | Loaded When          | Purpose                           |
|---------------------|-------------|----------------------|-----------------------------------|
| `.env`              | NO          | Always (all modes)   | Shared non-secret defaults only   |
| `.env.development`  | NO          | `npm run dev`        | Dev Firebase config + API keys    |
| `.env.production`   | NO          | `npm run build`      | Prod Firebase config + API keys   |
| `.env.local`        | NO          | Always (overrides)   | **DO NOT CREATE** — will override both dev and prod |
| `.env.*.local`      | NO          | Mode-specific override | Personal overrides only          |

### Vite Env Loading Order
- `npm run dev` loads: `.env` → `.env.development` → `.env.local` → `.env.development.local`
- `npm run build` loads: `.env` → `.env.production` → `.env.local` → `.env.production.local`
- Later files override earlier ones

### CRITICAL RULES
- **NEVER create `.env.local`** — it loads for ALL modes and will cause dev credentials to leak into production builds or vice versa
- **NEVER commit env files with secrets** — `.gitignore` excludes them
- **All VITE_FIREBASE_* vars must be in `.env.development` and `.env.production`**
- The `.env` base file should only contain non-secret shared config (currently empty of secrets)

## Service Worker (`public/firebase-messaging-sw.js`)
- This file has **hardcoded production Firebase config** (cannot use env vars)
- It is **git-tracked** and deployed to production hosting
- Push notifications in local dev will use the production Firebase project (acceptable tradeoff)
- If you need to test push notifications against the dev project locally, temporarily swap the config but **NEVER commit dev config** to this file

## Deployment Procedures

### Deploy to Development (for testing)
```bash
# 1. Commit changes on development branch
git add -A && git commit -m "description"
git push origin development

# 2. Build (uses .env.production since vite build = production mode)
#    BUT for dev hosting, we deploy the same build — the app connects to
#    whichever Firebase project the env vars point to at build time.
#    To deploy a dev-connected build, temporarily use dev env:
npm run build

# 3. Deploy to dev hosting
firebase use dev
firebase deploy --only hosting

# NOTE: This deploys a production-mode build to dev hosting.
# The Firebase project it connects to depends on .env.production values.
# For a true dev build connecting to dev Firebase, you would need a custom build script.
```

### Deploy to Production
```bash
# 1. Commit and push development
git add -A && git commit -m "description"
git push origin development

# 2. Merge to main
git checkout main
git pull origin main
git merge development
git push origin main

# 3. Build (automatically uses .env.production)
npm run build

# 4. Verify the build has correct production credentials
grep -o 'iris-agency-os-dev\|iris-os-43718' dist/assets/index-*.js
# Should ONLY show: iris-os-43718

# 5. Deploy
firebase use prod
firebase deploy --only hosting

# 6. Switch back to dev
firebase use dev
git checkout development
```

### Quick Hotfix Deploy (skip main merge for urgent fixes)
```bash
git add -A && git commit -m "hotfix: description"
git push origin development
npm run build
firebase use prod && firebase deploy --only hosting
firebase use dev
# Remember to sync main later!
```

## Git Branch Strategy
- `development` — active work branch, all commits go here first
- `main` — production branch, only receives merges from development
- Always verify build output before deploying
- Always switch back to `firebase use dev` and `git checkout development` after production deploys
