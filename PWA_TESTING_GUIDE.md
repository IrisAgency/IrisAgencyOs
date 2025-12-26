# PWA Testing Guide

## ✅ What's Configured

Your app is now a fully functional Progressive Web App with:
- ✅ HTTPS (via Firebase Hosting)
- ✅ Web App Manifest
- ✅ Service Worker with caching
- ✅ App icons
- ✅ Install prompt component

## 🧪 How to Test the Install Prompt

### Important: Why the prompt might not show immediately

The `beforeinstallprompt` event (which triggers the install button) has strict requirements:

1. **Site engagement heuristics** - Chrome requires:
   - User has visited the site at least once before
   - User has interacted with the page (clicked, scrolled, typed)
   - At least 30 seconds have passed since the user started browsing
   - The site meets certain engagement thresholds

2. **Already installed** - If the app is already installed, the prompt won't show

3. **Browser support** - Only works on:
   - Chrome/Edge (Android & Desktop)
   - Samsung Internet (Android)
   - Does NOT work on iOS Safari (manual install only)

### Testing Steps

#### On Android Chrome/Edge:
1. Open https://iris-os-43718.web.app in Chrome
2. **Clear site data first** (if testing again):
   - Chrome menu → Settings → Site settings → iris-os-43718.web.app → Clear & reset
3. Interact with the page (scroll, click around)
4. Wait 30-60 seconds
5. The install prompt should appear at the bottom
6. **Alternative**: Chrome menu → "Install app" or "Add to Home screen"

#### On Desktop Chrome/Edge:
1. Visit https://iris-os-43718.web.app
2. Look for the install icon (⊕ or computer icon) in the address bar
3. Click to install
4. **Or** Chrome menu → "Install IRIS Agency OS"

#### On iOS Safari (Manual Only):
1. Visit https://iris-os-43718.web.app
2. Tap the Share button (square with arrow up)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add"

### Debugging the Install Prompt

Open Chrome DevTools (F12) and check:

1. **Console Tab** - Look for logs:
   ```
   PWA: Install prompt listener registered
   PWA: Is HTTPS? true
   PWA: Is standalone? false
   PWA: beforeinstallprompt event fired
   ```

2. **Application Tab**:
   - Click "Manifest" - should show your app info
   - Click "Service Workers" - should show an active worker
   - Under "Application" section, you can manually trigger "Add to home screen"

3. **Check Install Criteria**:
   - In Application tab → Manifest
   - Look at the bottom for "Installability" section
   - It will show which criteria are met/not met

### Common Issues

**"App is not installable"**
- Check that you're on HTTPS
- Verify manifest.json is loading (Network tab)
- Verify service worker is registered (Application tab)

**"Install prompt not showing"**
- Clear browser data and try again
- Make sure you've interacted with the page
- Wait at least 30 seconds
- Check if app is already installed

**iOS doesn't show auto-prompt**
- This is expected! iOS Safari doesn't support `beforeinstallprompt`
- Users must manually use Share → Add to Home Screen

### Force Trigger (Development)

In Chrome DevTools Console, you can check installability:
```javascript
// Check if already installed
console.log('Standalone:', window.matchMedia('(display-mode: standalone)').matches);

// Check if installable
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('App is installable!', e);
});
```

## 📱 What Users Will See

Once installed:
- App icon on home screen/desktop
- Runs in standalone mode (no browser UI)
- Offline functionality (cached assets)
- Splash screen on launch (iOS)
- App switcher shows your app name

## 🔄 Updates

When you deploy a new version:
- Service worker will detect the update
- New version will be cached in the background
- App will update on next launch (or page refresh)
