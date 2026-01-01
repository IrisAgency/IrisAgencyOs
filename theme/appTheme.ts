import { AppBranding, FileRef } from '../types';

// Unified static theme derived from the current dashboard styling (do not change colors)
const nowIso = () => new Date(0).toISOString();

const makeFileRef = (url: string, fileName: string): FileRef => ({
  url,
  fileName,
  mimeType: 'image/png',
  size: 0,
  uploadedAt: nowIso(),
});

export const APP_THEME = {
  colors: {
    dashBg: '#050505',
    dashSurface: '#0a0a0a',
    dashSurfaceElevated: '#121212',
    dashPrimary: '#DF1E3C',
    dashOnPrimary: '#FFFFFF',
    dashSecondary: '#CCC2DC',
    dashTertiary: '#EFB8C8',
    dashError: '#F2B8B5',
    dashOutline: '#49454F',
    dashGlassBorder: 'rgba(255, 255, 255, 0.08)',
  },
  typography: {
    body: 'Outfit, sans-serif',
    mono: 'JetBrains Mono, monospace',
  },
  assets: {
    logo: makeFileRef('/logo.png', 'logo.png'),
    icon: makeFileRef('/icon.png', 'icon.png'),
  },
  identity: {
    appName: 'IRIS Agency OS',
    tagline: 'Creative Production Management',
  },
};

export const STATIC_BRANDING: AppBranding = {
  id: 'static-dashboard-theme',
  appName: APP_THEME.identity.appName,
  tagline: APP_THEME.identity.tagline,
  primaryColor: APP_THEME.colors.dashPrimary,
  secondaryColor: APP_THEME.colors.dashSecondary,
  accentColor: APP_THEME.colors.dashTertiary,
  backgroundColor: APP_THEME.colors.dashBg,
  textColor: '#E6E1E5',
  sidebarColor: APP_THEME.colors.dashSurface,
  fontFamily: 'Outfit',
  logoLight: APP_THEME.assets.logo,
  logoDark: APP_THEME.assets.logo,
  favicon: APP_THEME.assets.icon,
  sidebarIcon: APP_THEME.assets.logo,
  loginBackground: null,
  logoLightUrl: '/logo.png',
  logoDarkUrl: '/logo.png',
  createdAt: nowIso(),
  updatedAt: nowIso(),
  updatedBy: 'system',
};

export const applyAppTheme = (branding: AppBranding = STATIC_BRANDING) => {
  const root = document.documentElement;

  // Dashboard variables
  root.style.setProperty('--dash-bg', APP_THEME.colors.dashBg);
  root.style.setProperty('--dash-surface', APP_THEME.colors.dashSurface);
  root.style.setProperty('--dash-surface-elevated', APP_THEME.colors.dashSurfaceElevated);
  root.style.setProperty('--dash-primary', APP_THEME.colors.dashPrimary);
  root.style.setProperty('--dash-on-primary', APP_THEME.colors.dashOnPrimary);
  root.style.setProperty('--dash-secondary', APP_THEME.colors.dashSecondary);
  root.style.setProperty('--dash-tertiary', APP_THEME.colors.dashTertiary);
  root.style.setProperty('--dash-error', APP_THEME.colors.dashError);
  root.style.setProperty('--dash-outline', APP_THEME.colors.dashOutline);
  root.style.setProperty('--dash-glass-border', APP_THEME.colors.dashGlassBorder);
  root.style.setProperty('--dash-ink-gradient', 'radial-gradient(circle at 50% 0%, rgba(223, 30, 60, 0.05) 0%, transparent 70%)');
  root.style.setProperty('--dash-transition', 'cubic-bezier(0.2, 0, 0, 1)');

  // Compatibility variables used across the app
  root.style.setProperty('--primary', branding.primaryColor);
  root.style.setProperty('--sidebar-bg', branding.sidebarColor);
  const sidebarBorder = branding.sidebarColor === '#0f172a' ? '#1e293b' : 'rgba(255,255,255,0.1)';
  root.style.setProperty('--sidebar-border', sidebarBorder);
  root.style.setProperty('--brand-font', branding.fontFamily);
  root.style.setProperty('--brand-text', branding.textColor);

  document.body.style.fontFamily = `${branding.fontFamily}, -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", sans-serif`;
  document.title = branding.appName;

  // Favicon
  const favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
  if (favicon && branding.favicon?.url) {
    favicon.href = branding.favicon.url;
  }
};
