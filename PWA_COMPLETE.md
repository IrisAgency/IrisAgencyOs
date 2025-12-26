# IRIS Agency OS - PWA Installation Guide

## ✅ What's Implemented

Your app is now a fully functional Progressive Web App with:

- ✅ **Manifest.json** - Proper PWA configuration
- ✅ **Service Worker** - Offline caching and installability
- ✅ **HTTPS** - Hosted on Firebase (required for PWA)
- ✅ **Valid Icons** - 192x192 and 512x512 PNG files
- ✅ **iOS Support** - Apple-specific meta tags
- ✅ **Mobile Optimized** - No horizontal scroll, safe area support
- ✅ **Install Prompt** - Shows after 5 seconds on compatible browsers

## 📱 Installation Instructions

### Android (Chrome/Edge)

**Method 1: Automatic Prompt**
1. Visit https://iris-os-43718.web.app
2. Wait 5 seconds
3. Install banner appears at bottom
4. Tap "Install"

**Method 2: Manual**
1. Visit the site in Chrome
2. Tap menu (⋮) → "Install app" or "Add to Home screen"
3. Confirm installation

### iPhone/iPad (Safari)

**Manual Installation (Safari required)**
1. Open https://iris-os-43718.web.app in Safari
2. Tap the **Share** button (□ with arrow)
3. Scroll down and tap **"Add to Home Screen"**
4. Edit name if desired
5. Tap **"Add"**

**Note:** iOS Safari doesn't show automatic install prompts. Users must use the Share menu.

## 🎯 What Users Get

### Android ✅
- Full-screen app experience
- Appears in app drawer
- Runs independently from browser
- Offline caching enabled
- Push notifications ready (if implemented)

### iOS ✅
- Full-screen app experience
- Appears on home screen with icon
- Runs independently from Safari
- Offline caching enabled
- Status bar matches app theme
- Safe area support for notched devices

## 🧪 Testing Checklist

### Desktop (Chrome)
- [ ] Visit site - install icon appears in address bar
- [ ] Click install icon - app installs
- [ ] Open as app - runs in standalone window
- [ ] Works offline (after initial load)

### Mobile (Android)
- [ ] Open in Chrome - install prompt appears
- [ ] Install - appears in app drawer
- [ ] Open app - full screen, no browser UI
- [ ] Add to home screen icon visible

### Mobile (iOS)
- [ ] Open in Safari
- [ ] Share → Add to Home Screen works
- [ ] Icon appears on home screen
- [ ] Opens full screen with status bar
- [ ] No Safari UI visible when running

## 🔍 Verification

Check if PWA is properly configured:

1. **Chrome DevTools** (Desktop/Android)
   - Open DevTools (F12)
   - Application tab → Manifest (should show app info)
   - Application tab → Service Workers (should show active worker)
   - Lighthouse → Run PWA audit

2. **Console Logs**
   - Should see: "PWA Debug: {protocol: 'https:', ...}"
   - Should see: "PWA: Showing install prompt" after 5 seconds
   - NO errors about invalid icons

3. **Test Installation**
   - Install the app
   - Close and reopen
   - Should open as standalone app

## 🎨 Customization

Current settings in `vite.config.ts`:
- **Theme Color:** #6366f1 (Indigo)
- **Background:** #0f172a (Dark slate)
- **Name:** "IRIS Agency OS"
- **Short Name:** "IRIS OS"

To change colors/branding, edit:
- `vite.config.ts` - Manifest settings
- `public/icon-192x192.png` - App icon
- `public/icon-512x512.png` - App icon (large)

## 🚀 Next Steps (Optional)

1. **Push Notifications**
   - Add notification permission request
   - Implement Firebase Cloud Messaging
   - Works on Android immediately
   - iOS requires additional setup

2. **App Store Distribution** (If needed)
   - Use Capacitor to wrap PWA
   - Submit to Play Store / App Store
   - PWA is usually sufficient for most cases

3. **Offline Functionality**
   - Already caching static assets
   - Add offline data synchronization if needed
   - Cache API responses with Workbox

## 📊 Current Status

✅ **Fully Installable** - Both Android and iOS
✅ **Works Offline** - After first load
✅ **Standalone Mode** - No browser UI
✅ **Icon Validated** - Proper PNG files
✅ **Service Worker Active** - Caching enabled
✅ **HTTPS Enabled** - Firebase hosting

Your app is production-ready as a PWA! 🎉
