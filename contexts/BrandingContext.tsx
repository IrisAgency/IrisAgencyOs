import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppBranding } from '../types';
import { db, storage } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { DEFAULT_BRANDING_CONFIG, applyBrandingToDOM as applyBrandingToDOMUtil } from '../config/branding.config';

interface BrandingContextType {
  branding: AppBranding | null;
  loading: boolean;
  updateBranding: (updates: Partial<AppBranding>) => Promise<void>;
  uploadLogo: (file: File, type: 'light' | 'dark') => Promise<string>;
  refreshBranding: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

// Use centralized branding configuration
const DEFAULT_BRANDING: AppBranding = DEFAULT_BRANDING_CONFIG;

export const BrandingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [branding, setBranding] = useState<AppBranding | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBranding = async () => {
    try {
      const brandingRef = doc(db, 'settings', 'branding');
      const brandingSnap = await getDoc(brandingRef);

      if (brandingSnap.exists()) {
        const data = brandingSnap.data() as AppBranding;
        console.log('✅ Loaded branding from Firestore:', data);
        setBranding(data);
        applyBrandingToDOM(data);
      } else {
        // Initialize with default branding
        console.log('⚠️ No branding in Firestore, initializing with defaults');
        try {
          await setDoc(brandingRef, DEFAULT_BRANDING);
          console.log('✅ Created default branding document');
        } catch (writeError) {
          console.error('❌ Error creating default branding:', writeError);
        }
        setBranding(DEFAULT_BRANDING);
        applyBrandingToDOM(DEFAULT_BRANDING);
      }
    } catch (error) {
      console.error('❌ Error fetching branding:', error);
      // On error, use defaults but don't overwrite Firestore
      // This prevents wiping the DB if there's a network error
      setBranding(DEFAULT_BRANDING);
      applyBrandingToDOM(DEFAULT_BRANDING);
    } finally {
      setLoading(false);
    }
  };

  // Use centralized applyBrandingToDOM function
  const applyBrandingToDOM = applyBrandingToDOMUtil;

  const updateBranding = async (updates: Partial<AppBranding>) => {
    if (!branding) {
      console.error('updateBranding: No branding state available');
      return;
    }

    const updatedBranding: AppBranding = {
      ...branding,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    console.log('updateBranding: Starting update...', {
      updates,
      updatedBranding,
      sidebarColor: updatedBranding.sidebarColor,
      primaryColor: updatedBranding.primaryColor
    });

    try {
      const brandingRef = doc(db, 'settings', 'branding');
      // Use setDoc with merge to ensure all fields are updated
      await setDoc(brandingRef, updatedBranding, { merge: true });
      console.log('updateBranding: Firestore updated successfully');
      
      // Force immediate state update
      setBranding(prev => ({ ...prev, ...updatedBranding }));
      
      // Force DOM update with a small delay to ensure React state has propagated
      setTimeout(() => {
        applyBrandingToDOM(updatedBranding);
        console.log('updateBranding: DOM updated (delayed)');
      }, 50);
      
      console.log('updateBranding: State updated');
    } catch (error) {
      console.error('updateBranding: Error updating branding:', error);
      throw error;
    }
  };

  const uploadLogo = async (file: File, type: 'light' | 'dark'): Promise<string> => {
    try {
      // Create a unique filename with timestamp for cache busting
      const timestamp = Date.now();
      const extension = file.name.split('.').pop();
      const filename = `branding/logo-${type}-${timestamp}.${extension}`;

      // Upload to Firebase Storage
      const storageRef = ref(storage, filename);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      console.log(`✅ Uploaded ${type} logo to Firebase Storage:`, url);
      return url;
    } catch (error) {
      console.error(`❌ Error uploading ${type} logo:`, error);
      throw error;
    }
  };

  const refreshBranding = async () => {
    setLoading(true);
    await fetchBranding();
  };

  useEffect(() => {
    fetchBranding();
  }, []);

  return (
    <BrandingContext.Provider value={{ branding, loading, updateBranding, uploadLogo, refreshBranding }}>
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
