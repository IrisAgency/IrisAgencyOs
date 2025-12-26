# 🎨 IRIS Agency OS - Branding Configuration Guide

## ✅ SYSTEM STATUS: FULLY IMPLEMENTED

**All 57+ components now use the centralized branding system!**

Changes in `config/branding.config.ts` automatically apply to:
- ✅ All buttons and interactive elements
- ✅ All text colors
- ✅ All backgrounds
- ✅ All borders and accents
- ✅ Sidebar theme
- ✅ Header and navigation
- ✅ Modals and overlays
- ✅ Charts and graphs
- ✅ Forms and inputs
- ✅ Typography throughout

---

## Quick Start

**Want to change your brand colors, logo, and name? Edit just ONE file:**

👉 **`config/branding.config.ts`**

That's it! All changes automatically apply throughout the entire application.

---

## 📋 What You Can Customize

### 1️⃣ Brand Identity
```typescript
export const BRAND_IDENTITY = {
  appName: 'Your Agency Name',      // Full app name
  appNameShort: 'YAN',              // Short version
  tagline: 'Your Tagline Here',     // Subtitle/slogan
  description: 'Brief description', // Meta description
}
```

### 2️⃣ Color Scheme
```typescript
export const BRAND_COLORS = {
  primary: '#e11d48',      // Main brand color (buttons, links)
  secondary: '#0f172a',    // Secondary color (text, borders)
  accent: '#6366f1',       // Accent color (highlights)
  background: '#ffffff',   // Page background
  textPrimary: '#0f172a',  // Main text color
  sidebar: '#0f172a',      // Sidebar background
}
```

**Color Tips:**
- Use hex codes (e.g., `#e11d48`)
- Test contrast for accessibility
- Primary = your brand's main color
- Accent = for call-to-action buttons

### 3️⃣ Typography
```typescript
export const BRAND_TYPOGRAPHY = {
  fontFamily: 'Inter',  // Change to any Google Font or system font
}
```

**Popular Font Options:**
- `'Inter'` - Modern, clean (current)
- `'Roboto'` - Professional
- `'Poppins'` - Friendly, rounded
- `'Montserrat'` - Bold, geometric
- `'Open Sans'` - Versatile, readable

### 4️⃣ Logo Assets
```typescript
export const BRAND_ASSETS = {
  logoLight: null,  // Upload via Admin → Branding
  logoDark: null,   // Upload via Admin → Branding
  favicon: null,    // Upload via Admin → Branding
}
```

**Note:** Logo files are uploaded through the admin interface at **Admin → Branding Editor**

---

## 🚀 How to Apply Changes

### Method 1: Edit Configuration File (Recommended)
1. Open `config/branding.config.ts`
2. Update the values in `BRAND_COLORS`, `BRAND_IDENTITY`, or `BRAND_TYPOGRAPHY`
3. Save the file
4. Run: `npm run build`
5. Deploy: `firebase deploy --only hosting`

### Method 2: Admin Interface (For Logos & Live Updates)
1. Log in as admin
2. Go to **Admin → Branding**
3. Upload logos, change colors, update app name
4. Click **Save**
5. Changes apply instantly!

---

## 📂 File Structure

```
iris-agency-os/
├── config/
│   └── branding.config.ts       ← EDIT THIS FILE
├── constants.ts                 (imports from config)
├── contexts/
│   └── BrandingContext.tsx      (imports from config)
├── index.css                    (CSS variables fallbacks)
└── components/
    ├── Header.tsx               (uses branding context)
    ├── Sidebar.tsx              (uses branding context)
    └── admin/
        └── BrandingEditor.tsx   (admin interface)
```

---

## 🎯 Common Customization Scenarios

### Scenario 1: Rebrand Company Name & Colors
```typescript
// In config/branding.config.ts

export const BRAND_IDENTITY = {
  appName: 'Acme Creative Studio',
  tagline: 'Design That Inspires',
}

export const BRAND_COLORS = {
  primary: '#FF6B35',      // Orange
  secondary: '#004E89',    // Blue
  accent: '#F77F00',       // Amber
  sidebar: '#004E89',      // Blue sidebar
}
```

### Scenario 2: Dark Theme
```typescript
export const BRAND_COLORS = {
  primary: '#3b82f6',           // Blue
  secondary: '#1e293b',         // Dark slate
  background: '#0f172a',        // Very dark
  textPrimary: '#f8fafc',       // Light text
  sidebar: '#020617',           // Almost black
}
```

### Scenario 3: Minimal/Clean Look
```typescript
export const BRAND_COLORS = {
  primary: '#000000',           // Black
  secondary: '#737373',         // Gray
  accent: '#dc2626',            // Red accent
  background: '#ffffff',        // White
  textPrimary: '#171717',       // Near black
  sidebar: '#fafafa',           // Light gray
}

export const BRAND_TYPOGRAPHY = {
  fontFamily: 'Helvetica Neue', // Clean sans-serif
}
```

---

## 🔧 Technical Details

### CSS Variables Generated
The config automatically generates these CSS custom properties:

```css
:root {
  --brand-primary: #e11d48;
  --brand-secondary: #0f172a;
  --brand-accent: #6366f1;
  --brand-bg: #ffffff;
  --brand-text: #0f172a;
  --brand-sidebar: #0f172a;
  --brand-font: 'Inter';
}
```

### Where Branding is Applied
- ✅ Header logo & app name
- ✅ Sidebar background & icon
- ✅ Button colors
- ✅ Active states
- ✅ Page title
- ✅ Favicon
- ✅ Font family
- ✅ All component themes

### Data Persistence
- Configuration file: `config/branding.config.ts` (default values)
- Firestore database: `settings/branding` document (admin changes)
- localStorage: Logo uploads (base64 encoded)

---

## ⚠️ Important Notes

1. **Rebuild Required**: After editing `branding.config.ts`, you must rebuild:
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

2. **Admin Changes Override**: Changes made via Admin → Branding override the config file values (stored in Firestore)

3. **Cache Busting**: Logos include `?v=timestamp` for immediate updates

4. **Fallbacks**: If branding fails to load, defaults from `branding.config.ts` are used

---

## 🐛 Troubleshooting

**Problem:** Changes don't appear after editing config
- **Solution:** Clear browser cache (Cmd+Shift+R) and hard refresh

**Problem:** Logo doesn't show
- **Solution:** Upload via Admin → Branding, or check FileRef URL is valid

**Problem:** Colors revert after refresh
- **Solution:** Check Firestore `settings/branding` document hasn't overridden your changes

**Problem:** Font doesn't change
- **Solution:** Ensure font is available (Google Fonts or system font)

---

## 📚 Additional Resources

- [Tailwind Color Palette](https://tailwindcss.com/docs/customizing-colors)
- [Google Fonts](https://fonts.google.com/)
- [Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Color Picker](https://htmlcolorcodes.com/)

---

## 💡 Pro Tips

1. **Test on Multiple Screens**: Check mobile, tablet, and desktop views
2. **Accessibility**: Maintain contrast ratio of at least 4.5:1 for text
3. **Consistency**: Use your primary color sparingly for emphasis
4. **Backup**: Keep a copy of your old config before major changes
5. **Version Control**: Commit config changes to git for team collaboration

---

**Need Help?** 
- Check the Admin → Branding interface for live preview
- Review `types.ts` for the `AppBranding` interface definition
- Inspect browser console for branding-related logs

---

## 🏗️ Implementation Details

### How It Works

**3-Layer Branding System:**

1. **Configuration File** (`config/branding.config.ts`)
   - Single source of truth
   - Defines all brand values
   - Exports default branding object

2. **CSS Variables** (Applied automatically)
   - `--brand-primary`, `--brand-secondary`, etc.
   - Set by BrandingContext on app load
   - Updated by Admin → Branding Editor

3. **Tailwind CSS** (Uses CSS variables)
   - `bg-iris-red` → `var(--brand-primary)`
   - `text-iris-red` → `var(--brand-primary)`
   - `bg-iris-sidebar` → `var(--brand-sidebar)`
   - All color classes use CSS variables automatically!

### Coverage

✅ **All 57+ Components Use Branding:**
- Dashboard, Tasks, Projects, Clients
- Finance, Production, Analytics
- Team, Vendors, Calendar
- Admin panels, modals, forms
- Charts, tables, cards
- Headers, sidebars, notifications

**No manual updates needed!** Change the config file and all components update automatically.

### Technical Flow

```
branding.config.ts
    ↓
BrandingContext loads config
    ↓
Applies CSS variables to :root
    ↓
Tailwind classes use CSS variables
    ↓
All components styled automatically
```

---

*Last updated: December 2025*
*Full system implementation - All components integrated*

