# Development Environment Setup

## Overview
This guide provides instructions for setting up the IRIS Agency OS development environment for both local development and the staging/dev Firebase project.

## Prerequisites
- Node.js 18+ and npm
- Firebase CLI installed: `npm install -g firebase-tools`
- Git
- Text editor or IDE (VS Code recommended)

## Local Development Setup

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/IrisAgency/IrisAgencyOs.git
cd iris-agency-os
git checkout development  # Switch to dev branch
npm install
```

### 2. Environment Configuration

Create `.env.local` in the project root for local development:
```bash
VITE_FIREBASE_PROJECT_ID=iris-agency-os-dev
VITE_FIREBASE_AUTH_DOMAIN=iris-agency-os-dev.firebaseapp.com
VITE_FIREBASE_STORAGE_BUCKET=iris-agency-os-dev.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=<dev-messaging-id>
VITE_FIREBASE_APP_ID=<dev-app-id>
VITE_FIREBASE_API_KEY=<dev-api-key>
VITE_FIREBASE_VAPID_KEY=<dev-vapid-key>
VITE_GEMINI_API_KEY=<api-key>
```

If you need to test production configuration locally:
```bash
# Use .env for production credentials (only for testing)
# DO NOT commit production .env to development branch
```

### 3. Start Development Server
```bash
npm run dev
```

Server runs at `http://0.0.0.0:3000` or `http://localhost:3000`

### 4. Local Testing Checklist
- [ ] Authentication works with dev Firebase project
- [ ] Firestore data loads correctly
- [ ] File uploads work
- [ ] Notifications display
- [ ] All hubs load without errors
- [ ] Permissions work as expected
- [ ] PWA manifest loads

## Firebase Project Setup (Dev)

### Creating a Development Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project: `iris-agency-os-dev`
3. Enable the following services:
   - Authentication (Email/Password, Google)
   - Firestore Database (production mode)
   - Storage
   - Cloud Messaging
   - Hosting

### Initialize Firebase Locally
```bash
# Login to Firebase
firebase login

# Set project alias for dev
firebase use --add
# Select iris-agency-os-dev and create alias 'dev'

# Initialize Firestore rules and indexes
firebase deploy --only firestore:rules --project=dev
firebase deploy --only firestore:indexes --project=dev
```

### Database Seeding
For development, populate test data:
```bash
# Create a Firebase admin script or use Firestore console to add:
- Test users with various roles
- Sample clients and projects
- Test tasks and workflows
```

## Deployment to Dev Environment

### Build
```bash
npm run build
```

### Deploy Hosting
```bash
# Deploy to dev Firebase hosting
firebase deploy --only hosting:iris-agency-os-dev --project=dev

# Deploy functions (notifications processor)
firebase deploy --only functions --project=dev
```

### Deploy Firestore Rules & Indexes
```bash
firebase deploy --only firestore:rules,firestore:indexes --project=dev
```

### Complete Deploy
```bash
firebase deploy --project=dev
```

## Switching Between Environments

### Switch to Production (Main Branch)
```bash
git checkout main
# Update .env variables to production credentials
npm run dev  # Local testing before deploy
npm run build
firebase deploy --only hosting  # Deploys to production Firebase
```

### Switch Back to Development
```bash
git checkout development
# Update .env variables to dev credentials
npm run dev
```

## Useful Firebase Commands

### View Logs
```bash
firebase functions:log --project=dev
firebase functions:log --project=production
```

### Access Firestore Console
```bash
firebase open firestore --project=dev
firebase open firestore --project=production
```

### View Hosting Deployments
```bash
firebase hosting:channel:list --project=dev
```

## Troubleshooting

### Firebase Login Issues
```bash
firebase logout
firebase login
```

### Project Not Found
```bash
firebase use dev  # Switch to dev project
firebase use default  # Switch to production
```

### Dependencies Issues
```bash
rm -rf node_modules package-lock.json
npm install
```

### Service Worker Issues
Clear browser cache and restart dev server:
```bash
# In browser DevTools, unregister service workers
# Or hard refresh (Cmd+Shift+R on Mac)
npm run dev
```

## Environment Variables Reference

### Development (.env.development or .env.local)
- Points to `iris-agency-os-dev` Firebase project
- Test data available
- No production user accounts
- Separate storage buckets

### Production (.env)
- Points to `iris-os-43718` Firebase project
- Live production data
- Real user accounts
- Protected storage

## Next Steps
1. Configure authentication for both projects
2. Set up Firestore collections with sample data
3. Create test user accounts
4. Test the PWA in development
5. Verify notifications work in both environments
