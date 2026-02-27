# Deployment Guide

## Overview
This document provides step-by-step instructions for deploying IRIS Agency OS to both development and production environments.

## Deployment Matrix

| Environment | Branch | Firebase Project | Hosting URL | When to Deploy |
|-------------|--------|------------------|-------------|-----------------|
| **Development** | `development` | `iris-agency-os-dev` | (configured in Firebase) | After feature completion, testing required |
| **Production** | `main` | `iris-os-43718` | https://iris-os-43718.web.app | After approval, code review, all testing passed |

## Pre-Deployment Checklist

### For Any Deployment
- [ ] Working tree is clean (`git status` shows no uncommitted changes)
- [ ] On correct branch (`git branch` shows correct branch)
- [ ] Code is committed and pushed (`git push origin branch-name`)
- [ ] All tests pass locally
- [ ] No TypeScript errors (`npm run build` succeeds)
- [ ] Environment variables are correctly set

### For Development Deployments
- [ ] Feature is complete and tested locally
- [ ] Changes are merged to `development` branch
- [ ] Pull request is reviewed (recommended)

### For Production Deployments (Additional)
- [ ] Code has been tested in development environment
- [ ] Pull request from `development` → `main` is approved
- [ ] All QA tests pass
- [ ] Version number is updated (if applicable)
- [ ] Release notes are prepared

## Development Deployment

### Step 1: Prepare Code
```bash
# Ensure you're on development branch
git checkout development
git pull origin development

# Verify clean working tree
git status  # Should show "nothing to commit, working tree clean"
```

### Step 2: Build
```bash
npm install  # If dependencies changed
npm run build
```

### Step 3: Deploy to Dev Firebase
```bash
# Set Firebase project to dev
firebase use dev

# Option A: Deploy only hosting (fastest)
firebase deploy --only hosting

# Option B: Deploy everything (hosting, functions, rules, indexes)
firebase deploy

# Option C: Deploy specific services
firebase deploy --only hosting,functions
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

### Step 4: Verify Deployment
1. Check Firebase Console for deployment status
2. Visit dev hosting URL in browser
3. Test core functionality:
   - Login works
   - Data loads from Firestore
   - File operations work
   - Notifications function
   - PWA installs correctly

### Step 5: Monitor Logs
```bash
firebase functions:log --project=dev
```

## Production Deployment

### Step 1: Create Release PR
```bash
# From GitHub or command line
git checkout main
git pull origin main

# Create release notes documenting changes from development
```

### Step 2: Prepare Code
```bash
# Ensure main branch is up to date
git checkout main
git pull origin main

# Verify clean working tree
git status
```

### Step 3: Build
```bash
npm install
npm run build
```

### Step 4: Final Pre-Deployment Checks
```bash
# Verify you're on main branch
git branch
# * main
#   development

# Verify commit is the expected release commit
git log --oneline -5

# Verify correct Firebase project is configured
firebase use default
# Selected project: iris-os-43718
```

### Step 5: Deploy to Production
```bash
# Set Firebase project to production
firebase use default

# Option A: Deploy only hosting (fastest)
firebase deploy --only hosting

# Option B: Deploy everything (recommended for major releases)
firebase deploy

# Option C: Deploy with confidence using preview channels (optional)
firebase hosting:channel:deploy preview-release-1.0
# Test at temporary URL before promoting to live
firebase hosting:channel:promote preview-release-1.0
```

### Step 6: Tag Release
```bash
# Tag the release commit
git tag production-vX.Y.Z -m "Release version X.Y.Z: Description of changes"

# Push tag to remote
git push origin production-vX.Y.Z
```

### Step 7: Verify Production Deployment
1. Check Firebase Console for deployment status
2. Visit production URLs:
   - https://iris-os-43718.web.app
   - https://agency-management-cba4a.web.app (if applicable)
3. Test critical functionality:
   - Login with real accounts
   - View live client/project/task data
   - Verify permissions work
   - Check performance

### Step 8: Monitor Logs
```bash
firebase functions:log --project=production
firebase functions:log  # Uses default project
```

## Functions Deployment

Cloud Functions (notification processor) should be deployed with hosting:

```bash
# Deploy functions to development
firebase deploy --only functions --project=dev

# Deploy functions to production
firebase deploy --only functions --project=default
```

### Function Logs
```bash
# Watch live logs
firebase functions:log --project=dev

# View logs for specific function
firebase functions:log --project=dev --follow
```

## Database Migration (If Needed)

### Firestore Rules Update
```bash
# Update rules in firestore.rules
# Deploy to dev first for testing
firebase deploy --only firestore:rules --project=dev

# After verification, deploy to production
firebase deploy --only firestore:rules --project=default
```

### Firestore Indexes
```bash
# Deploy indexes (can take several minutes)
firebase deploy --only firestore:indexes --project=dev
firebase deploy --only firestore:indexes --project=default
```

### Data Migration
If you need to migrate data:
1. Create migration script in `scripts/`
2. Test in development environment
3. Backup production data in Firebase Console
4. Run migration in production with caution

## Rollback Procedure

### If Deployment Fails

#### Option 1: Immediate Rollback
```bash
# Deploy the previous known-good version
git checkout previous-commit-hash
npm run build
firebase deploy --only hosting
```

#### Option 2: Revert Commit
```bash
git revert HEAD  # Creates a new commit that undoes previous changes
npm run build
firebase deploy --only hosting
```

#### Option 3: Full Rollback
```bash
git checkout production-vX.Y.Z-1  # Previous release tag
npm run build
firebase deploy --only hosting --project=default
```

### Post-Rollback Actions
1. Investigate what went wrong
2. Fix issues on `development` branch
3. Re-test in dev environment
4. Redeploy to production after verification

## Monitoring & Alerts

### Check Deployment Status
```bash
# List hosting releases
firebase hosting:releases --project=dev

# View specific project info
firebase open hosting --project=dev
```

### Performance Monitoring
- Firebase Console → Analytics
- Monitor user engagement, crashes, performance

### Error Tracking
- Firebase Console → Logs
- Check Cloud Functions logs for errors
- Review Firestore rules violations

## Environment-Specific Configuration

### Environment Detection
The app can detect its environment:
```typescript
const isDevelopment = process.env.VITE_FIREBASE_PROJECT_ID.includes('dev');
```

### Conditional Features
Currently all features available in both environments. If needed, wrap features:
```typescript
if (!isDevelopment) {
  // Production-only code
}
```

## Deployment Frequency

**Recommended Schedule:**
- **Development**: Multiple times per week (after features, daily for active development)
- **Production**: Once per week (or as needed for critical fixes)

## Version Strategy

Current versioning: `production-vX.Y.Z`
- **X**: Major changes (new hub, major refactor)
- **Y**: New features (new permissions system, dashboard updates)
- **Z**: Bug fixes and minor updates

Example: `production-v1.0.0` → `production-v1.1.0` → `production-v1.1.1`

## Emergency Procedures

### Critical Bug in Production
1. If possible, disable affected feature via admin settings
2. Create urgent branch from main: `bugfix/critical-issue`
3. Fix the bug
4. Merge directly to main with fast-track review
5. Deploy immediately

### Production Data Issue
1. Do NOT deploy without backup
2. Export affected Firestore collection
3. Create recovery branch
4. Fix data or code
5. Test thoroughly in dev
6. Deploy with caution

## Support & Escalation

For deployment issues:
1. Check Firebase Console for errors
2. Review Cloud Functions logs
3. Check service status dashboard
4. Contact Firebase Support if infrastructure issue

---

**Last Updated**: February 2026
**Maintained By**: Development Team
