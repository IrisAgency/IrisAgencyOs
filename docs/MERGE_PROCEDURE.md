# Merge Procedure: Development to Production

## Overview
This document provides a complete procedure for merging the development branch into production (main) safely and systematically.

## Pre-Merge Requirements

### Code Quality
- [ ] All code follows TypeScript strict mode
- [ ] No `any` types without justification
- [ ] No unused imports or commented code
- [ ] ESLint passes (if configured)

### Testing
- [ ] Feature tested locally in development environment
- [ ] All related features tested for regressions
- [ ] Permissions verified to work correctly
- [ ] Firebase operations tested (auth, Firestore, Storage)
- [ ] PWA functionality verified
- [ ] Mobile responsiveness checked

### Documentation
- [ ] README.md updated with new features/changes
- [ ] Code comments added for complex logic
- [ ] Deployment guide updated if needed
- [ ] Known issues documented

### Version & Release Notes
- [ ] Version number determined (major/minor/patch)
- [ ] Release notes prepared with:
  - [ ] Features added
  - [ ] Bugs fixed
  - [ ] Breaking changes (if any)
  - [ ] Migration steps (if needed)

## Step-by-Step Merge Process

### Phase 1: Preparation (In Development Branch)

#### 1.1 Ensure Development is Stable
```bash
# Switch to development branch
git checkout development

# Pull latest changes
git pull origin development

# Verify clean working tree
git status
# Expected: "nothing to commit, working tree clean"
```

#### 1.2 Run Final Tests
```bash
# Build to catch any errors
npm run build

# Verify no TypeScript errors
# If using vitest (setup in package.json)
npm run test  # (when test script is added)
```

#### 1.3 Create Merge Commit on Development
```bash
# Create a clean merge commit for release
git commit --allow-empty -m "🎯 Release: v$(date +%Y.%m.%d) - Prepare for production merge"

# Push to remote
git push origin development
```

### Phase 2: Create Release Pull Request

#### 2.1 Create PR via GitHub
1. Go to GitHub → IrisAgency/IrisAgencyOs
2. Click "New pull request"
3. Set: `base: main` ← `compare: development`
4. Title: `🚀 Release vX.Y.Z: Description of changes`
5. Add detailed description:

```markdown
## Release Notes: vX.Y.Z

### Features Added
- [ ] Feature 1
- [ ] Feature 2
- [ ] Feature 3

### Bugs Fixed
- [ ] Bug 1
- [ ] Bug 2

### Breaking Changes
- None / List if applicable

### Migration Required
- None / List if applicable

### Testing Done
- [ ] Tested locally in dev environment
- [ ] All features verified
- [ ] No regressions detected
- [ ] Permissions working
- [ ] Firebase operations functional
- [ ] PWA verified

### Deployment Plan
- Deploy to dev: `firebase deploy --project=dev`
- Deploy to production: `firebase deploy --project=default`
- Expected downtime: None
```

#### 2.2 Code Review
- Assign reviewers
- Address review comments
- Ensure approvals before proceeding

### Phase 3: Final Pre-Merge Verification

#### 3.1 Verify Nothing Changed Since Review
```bash
git checkout development
git pull origin development
git status
# Should still be clean
```

#### 3.2 Backup Production Database (Recommended)
In Firebase Console:
1. Go to Firestore Database
2. Click "Start collection" (if doing export)
3. Or use Firebase CLI:
```bash
# Export Firestore data as backup
firebase firestore:export gs://your-backup-bucket/pre-release-backup --project=default
```

#### 3.3 Final Smoke Test
```bash
npm run build
npm run preview
# Manually test critical paths:
# - Login
# - View dashboard
# - Create/edit item in each hub
# - Check permissions
```

### Phase 4: Perform Merge

#### 4.1 Merge via GitHub (Recommended)
1. Open the pull request on GitHub
2. Click "Merge pull request"
3. Choose merge strategy:
   - **Squash and merge**: Clean history (recommended for releases)
   - **Create a merge commit**: Preserves development commits
   - **Rebase and merge**: Linear history
4. Confirm merge
5. Delete the pull request branch if offered

**OR** Merge via Command Line:
```bash
# Ensure main is updated
git checkout main
git pull origin main

# Merge development into main
git merge development

# OR for squash merge (cleaner history)
git merge --squash development
git commit -m "🚀 Release vX.Y.Z: Merge development to production"

# Push to remote
git push origin main
```

#### 4.2 Verify Merge Commit
```bash
git log --oneline -10
# Should show your merge commit at the top
```

### Phase 5: Tag Release

#### 5.1 Create Release Tag
```bash
# Tag the merge commit
git tag production-vX.Y.Z -m "Release vX.Y.Z: Description"

# Push tag to remote
git push origin production-vX.Y.Z

# Verify tag
git tag -l
```

#### 5.2 Create GitHub Release (Optional)
1. Go to GitHub → Releases
2. Click "Create a new release"
3. Select the tag you just created
4. Add release notes (copy from PR)
5. Publish release

### Phase 6: Post-Merge on Development

#### 6.1 Sync Development with Main
```bash
# Switch to development
git checkout development

# Pull the merge commit from main
git pull origin main

# Verify no conflicts
git status

# Push updated development
git push origin development
```

## Deployment After Merge

### Immediate Post-Merge (Within 1 Hour)

#### 6.1 Deploy to Production
```bash
# Switch to main
git checkout main

# Verify on correct branch and commit
git log -1
git status

# Build for production
npm install
npm run build

# Deploy to production
firebase deploy --only hosting --project=default

# Or full deployment:
firebase deploy --project=default

# Monitor deployment
firebase hosting:releases --project=default
```

#### 6.2 Monitor Production
```bash
# Watch for errors
firebase functions:log

# Verify site is live
open https://iris-os-43718.web.app

# Check performance
# - Firebase Console → Performance
# - Firebase Console → Realtime Database (if used)
```

#### 6.3 Monitor for Issues (First 24 Hours)
- Check error logs hourly
- Monitor user reports
- Be ready to rollback if critical issues

### Monitoring Commands
```bash
# Continuous log monitoring
firebase functions:log --follow --project=default

# Check specific function
firebase functions:log --project=default

# View cloud function errors
firebase functions:log --project=default | grep ERROR
```

## Rollback Procedure (If Issues Found)

### Immediate Rollback
```bash
# Option 1: Deploy previous release tag
git checkout production-vX.Y.Z-1
npm run build
firebase deploy --only hosting --project=default

# Option 2: Create revert commit
git checkout main
git revert HEAD
npm run build
firebase deploy --only hosting --project=default
git push origin main

# Option 3: Rollback from GitHub (if available)
firebase hosting:releases --project=default
# Find previous release and promote it
firebase hosting:releases:promote <release-id> --project=default
```

### Post-Rollback Actions
1. Revert merge commit on main:
```bash
git revert -m 1 HEAD  # Reverts the merge
git push origin main
```

2. Fix issues on development branch
3. Create new PR with fixes
4. Re-test thoroughly
5. Re-merge and redeploy

## Communication

### Before Merge
- [ ] Notify team in Slack/Teams
- [ ] Schedule deployment window if needed
- [ ] Set up monitoring/support coverage

### After Merge
- [ ] Announce release with version number
- [ ] Share release notes with stakeholders
- [ ] Monitor first 24 hours closely

### If Rollback Happens
- [ ] Immediately notify stakeholders
- [ ] Explain what happened
- [ ] Provide ETA for fix
- [ ] Post-mortem after resolution

## Merge Frequency

**Recommended Schedule:**
- **Small fixes/features**: Multiple times per week
- **Major releases**: Once per week (e.g., Friday afternoon)
- **Emergency fixes**: ASAP (outside normal schedule)

## Approval Workflow

| Role | Responsibility | Permission Required |
|------|-----------------|--------------------:|
| Developer | Create feature branch, write code | None |
| Peer Reviewer | Code review, QA testing | Approve PR |
| DevOps/Tech Lead | Deployment approval | Merge to main |
| Product Manager | Feature validation | - |

## Troubleshooting

### Merge Conflicts
```bash
git checkout development
git merge main  # Merge latest main into dev first
# Resolve conflicts in editor
git add .
git commit -m "Resolve merge conflicts with main"
git push origin development
# Retry merge to main
```

### Can't Push to Main
```bash
# Ensure you have correct permissions
git remote -v
# Verify you're on main branch
git branch
# Try pushing
git push origin main
```

### Accidental Merge
```bash
git reset --soft HEAD~1
git push origin main --force-with-lease  # Use with caution!
# Or create revert commit (safer)
git revert HEAD
```

## Checklist Summary

### Pre-Merge
- [ ] Code tested locally
- [ ] No TypeScript errors
- [ ] PR reviewed and approved
- [ ] README updated
- [ ] Release notes prepared
- [ ] Backup created

### Merge
- [ ] On correct branch
- [ ] No conflicts
- [ ] Merge completed
- [ ] Tag created
- [ ] Push successful

### Post-Merge
- [ ] Built successfully
- [ ] Deployed to production
- [ ] Site is accessible
- [ ] Logs monitored
- [ ] Team notified

---

**Last Updated**: February 2026
**Maintained By**: Development Team
