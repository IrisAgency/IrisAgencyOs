/**
 * IRIS Agency OS - Centralized Branding Configuration
 * 
 * This file contains all branding settings for the application.
 * Update these values to customize the entire application's look and feel.
 * 
 * Changes here will automatically apply to:
 * - App name and tagline
 * - Color scheme (primary, secondary, accent, backgrounds)
 * - Typography
 * - Logo assets
 * - Sidebar theme
 * - CSS variables
 */

import { AppBranding } from '../types';

/**
 * Brand Colors
 * Define your brand's color palette here
 */
export const BRAND_COLORS = {
  // Primary brand color (buttons, active states, accents)
  primary: '#e11d48',      // Rose 600
  
  // Secondary brand color (text, borders)
  secondary: '#0f172a',    // Slate 900
  
  // Accent color (highlights, notifications, CTAs)
  accent: '#f1c963',       // Gold/Yellow accent
  
  // Background colors
  background: '#ffffff',   // White
  backgroundAlt: '#f8fafc', // Slate 50
  
  // Text colors
  textPrimary: '#0f172a',  // Slate 900
  textSecondary: '#64748b', // Slate 500
  
  // Sidebar theme
  sidebar: '#1f0041ff',      // Olive/lime green sidebar
  sidebarBorder: '#0062ff', // Blue border
} as const;

/**
 * Brand Identity
 * App name, tagline, and messaging
 */
export const BRAND_IDENTITY = {
  appName: 'IRIS Agency OS',
  appNameShort: 'IRIS OS',
  tagline: 'Creative Production Management',
  description: 'Complete creative agency management system',
} as const;

/**
 * Typography
 * Font family for the entire application
 */
export const BRAND_TYPOGRAPHY = {
  fontFamily: 'Inter',
  fontFamilyFallback: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", sans-serif',
  fontStack: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", sans-serif',
} as const;

/**
 * Logo Assets
 * Paths to logo files (can be null if not uploaded yet)
 */
export const BRAND_ASSETS = {
  logoLight: null,  // Logo for light backgrounds
  logoDark: null,   // Logo for dark backgrounds
  favicon: null,    // Browser favicon
  sidebarIcon: null, // Icon shown in sidebar
  loginBackground: null, // Background image for login page
} as const;

/**
 * Default Branding Configuration
 * This is the complete branding object used throughout the app
 */
export const DEFAULT_BRANDING_CONFIG: AppBranding = {
  id: 'default',
  
  // Identity
  appName: BRAND_IDENTITY.appName,
  tagline: BRAND_IDENTITY.tagline,
  
  // Colors
  primaryColor: BRAND_COLORS.primary,
  secondaryColor: BRAND_COLORS.secondary,
  accentColor: BRAND_COLORS.accent,
  backgroundColor: BRAND_COLORS.background,
  textColor: BRAND_COLORS.textPrimary,
  sidebarColor: BRAND_COLORS.sidebar,
  
  // Typography
  fontFamily: BRAND_TYPOGRAPHY.fontFamily,
  
  // Assets
  logoLight: BRAND_ASSETS.logoLight,
  logoDark: BRAND_ASSETS.logoDark,
  favicon: BRAND_ASSETS.favicon,
  sidebarIcon: BRAND_ASSETS.sidebarIcon,
  loginBackground: BRAND_ASSETS.loginBackground,
  
  // Legacy support
  logoLightUrl: null,
  logoDarkUrl: null,
  
  // Metadata
  updatedBy: 'system',
  updatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
};

/**
 * CSS Variables Mapping
 * Maps branding config to CSS custom properties
 */
export const CSS_VARIABLES_MAP = {
  '--brand-primary': (branding: AppBranding) => branding.primaryColor,
  '--brand-primary-hover': (branding: AppBranding) => {
    // Generate a slightly darker shade for hover (reduce lightness by 10%)
    const hex = branding.primaryColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const darker = (val: number) => Math.max(0, Math.floor(val * 0.85));
    return `#${darker(r).toString(16).padStart(2, '0')}${darker(g).toString(16).padStart(2, '0')}${darker(b).toString(16).padStart(2, '0')}`;
  },
  '--brand-secondary': (branding: AppBranding) => branding.secondaryColor,
  '--brand-accent': (branding: AppBranding) => branding.accentColor,
  '--brand-bg': (branding: AppBranding) => branding.backgroundColor,
  '--brand-text': (branding: AppBranding) => branding.textColor,
  '--brand-sidebar': (branding: AppBranding) => branding.sidebarColor,
  '--brand-font': (branding: AppBranding) => branding.fontFamily,
  
  // Legacy variables for backward compatibility
  '--primary': (branding: AppBranding) => branding.primaryColor,
  '--sidebar-bg': (branding: AppBranding) => branding.sidebarColor,
} as const;

/**
 * Apply branding to DOM
 * Updates CSS variables and document properties
 */
export const applyBrandingToDOM = (branding: AppBranding): void => {
  const root = document.documentElement;
  
  // Apply CSS variables
  Object.entries(CSS_VARIABLES_MAP).forEach(([cssVar, getValue]) => {
    root.style.setProperty(cssVar, getValue(branding));
  });
  
  // Apply font family to body
  if (branding.fontFamily) {
    document.body.style.fontFamily = `${branding.fontFamily}, ${BRAND_TYPOGRAPHY.fontFamilyFallback}`;
  }
  
  // Update page title
  document.title = branding.appName;
  
  // Update favicon if provided
  if (branding.favicon?.url) {
    const favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
    if (favicon) {
      favicon.href = `${branding.favicon.url}?v=${branding.updatedAt}`;
    }
  }
  
  // Calculate sidebar border color (slightly lighter than background)
  const sidebarBorder = branding.sidebarColor === '#0f172a' ? '#1e293b' : 'rgba(255,255,255,0.1)';
  root.style.setProperty('--sidebar-border', sidebarBorder);
  root.style.setProperty('--active-item-bg', branding.primaryColor);
};

/**
 * Export for backward compatibility
 */
export default DEFAULT_BRANDING_CONFIG;
