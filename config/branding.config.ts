import { AppBranding } from '../types';
import { STATIC_BRANDING, applyAppTheme } from '../theme/appTheme';

// Single source of truth for branding (static, matches current dashboard theme)
export const DEFAULT_BRANDING_CONFIG: AppBranding = STATIC_BRANDING;

// Apply the static branding to DOM (legacy name retained for compatibility)
export const applyBrandingToDOM = (branding: AppBranding = DEFAULT_BRANDING_CONFIG): void => {
  applyAppTheme(branding);
};

export default DEFAULT_BRANDING_CONFIG;
