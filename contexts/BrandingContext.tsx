import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AppBranding } from '../types';
import { DEFAULT_BRANDING_CONFIG, applyBrandingToDOM as applyBrandingToDOMUtil } from '../config/branding.config';

interface BrandingContextType {
  branding: AppBranding;
  loading: boolean;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

// Use centralized branding configuration
const DEFAULT_BRANDING: AppBranding = DEFAULT_BRANDING_CONFIG;

export const BrandingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [branding] = useState<AppBranding>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);

  // Apply static theme once on mount
  useEffect(() => {
    applyBrandingToDOMUtil(DEFAULT_BRANDING);
    setLoading(false);
  }, []);

  return (
    <BrandingContext.Provider value={{ branding, loading }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
};
