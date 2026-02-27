# Git Workflow & Branching Strategy

## Overview
This document outlines the git workflow for maintaining both production and development environments of IRIS Agency OS.

## Branch Structure

### Protected Branches
- **`main`**: Production branch
  - Always represents the live, deployed code on Firebase Hosting
  - Deployments: `https://iris-os-43718.web.app` & `https://agency-management-cba4a.web.app`
  - Pull requests required for merges
  - Tagged with version numbers (e.g., `production-v1.0.0`)

- **`development`**: Development branch
  - Main development branch
  - Deployments: Dev Firebase project (configured in `.env.development`)
  - Base branch for all feature branches
  - Pull requests before merging to main

### Feature Branches
Follow naming convention: `feature/description` or `bugfix/description`
```bash
git checkout -b feature/new-dashboard-widget
git checkout -b bugfix/permission-validation
```

## Workflow

### Starting Development Work
```bash
# Switch to development branch
git checkout development
git pull origin development

# Create feature branch
git checkout -b feature/your-feature
```

### Committing Changes
- Create commits before implementing features (as per development preferences)
- Use meaningful commit messages with context
- Keep commits atomic and logical

```bash
git add .
git commit -m "✨ Add new feature with proper description"
```

### Pushing & Creating Pull Requests
```bash
git push origin feature/your-feature
# Create pull request on GitHub (development → feature branch)
# After review and tests pass, merge to development
```

## Deployment Strategy

### Development Deployment
```bash
git checkout development
npm run build
firebase deploy --only hosting --project=iris-agency-os-dev
```

### Production Deployment (From Main)
```bash
git checkout main
npm run build
firebase deploy --only hosting
```

## Merging from Development to Production

### Prerequisites
1. All features tested in development environment
2. Code reviewed and approved
3. Version bumped (optional, handled by release process)

### Process
1. Create a pull request from `development` → `main`
2. Add detailed merge notes documenting changes
3. Perform final QA on development environment
4. Merge pull request
5. Tag with version: `git tag production-vX.Y.Z`
6. Deploy to production using the DEPLOYMENT_GUIDE.md

## Environment Variables

### Production (.env)
```
VITE_FIREBASE_PROJECT_ID=iris-os-43718
VITE_FIREBASE_AUTH_DOMAIN=iris-os-43718.firebaseapp.com
VITE_FIREBASE_STORAGE_BUCKET=iris-os-43718.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=[production-id]
VITE_FIREBASE_APP_ID=[production-app-id]
VITE_FIREBASE_API_KEY=[production-api-key]
VITE_FIREBASE_VAPID_KEY=[production-vapid-key]
VITE_GEMINI_API_KEY=[shared-api-key]
```

### Development (.env.development)
```
VITE_FIREBASE_PROJECT_ID=iris-agency-os-dev
VITE_FIREBASE_AUTH_DOMAIN=iris-agency-os-dev.firebaseapp.com
VITE_FIREBASE_STORAGE_BUCKET=iris-agency-os-dev.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=[dev-id]
VITE_FIREBASE_APP_ID=[dev-app-id]
VITE_FIREBASE_API_KEY=[dev-api-key]
VITE_FIREBASE_VAPID_KEY=[dev-vapid-key]
VITE_GEMINI_API_KEY=[shared-api-key]
```

## Git Hooks (Optional)
Consider setting up pre-commit hooks to:
- Run linting checks
- Ensure no secrets in commits
- Validate TypeScript compilation

## Tags & Releases
Production releases should be tagged:
```bash
git tag production-vX.Y.Z -m "Release version X.Y.Z"
git push origin production-vX.Y.Z
```

## Troubleshooting

### Accidentally Committed to Main
```bash
git reset --soft HEAD~1
git checkout development
git commit -m "your message"
git push origin development
```

### Syncing Development with Production Hotfixes
If a hotfix is applied directly to main:
```bash
git checkout development
git pull origin development
git merge main
# Resolve conflicts if any
git push origin development
```
