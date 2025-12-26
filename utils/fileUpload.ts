import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { FileRef } from '../types';

export const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
export const ALLOWED_FAVICON_TYPES = [...ALLOWED_IMAGE_TYPES, 'image/x-icon'];
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export type BrandingAssetType = 'logo-light' | 'logo-dark' | 'favicon' | 'sidebar-icon' | 'login-bg';

/**
 * Upload a branding asset to Firebase Storage
 * @param file - The file to upload
 * @param assetType - Type of branding asset
 * @returns FileRef with URL and metadata
 */
export async function uploadBrandingAsset(
    file: File,
    assetType: BrandingAssetType
): Promise<FileRef> {
    // Validation
    const allowedTypes = assetType === 'favicon' ? ALLOWED_FAVICON_TYPES : ALLOWED_IMAGE_TYPES;

    if (!allowedTypes.includes(file.type)) {
        throw new Error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
    }

    if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File too large. Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // Upload to Firebase Storage
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${assetType}-${timestamp}-${sanitizedName}`;
    const storageRef = ref(storage, `branding/${fileName}`);

    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    return {
        url,
        fileName,
        mimeType: file.type,
        size: file.size,
        uploadedAt: new Date().toISOString(),
    };
}

/**
 * Validate file before upload
 * @param file - File to validate
 * @param assetType - Type of branding asset
 * @returns Validation result
 */
export function validateBrandingFile(
    file: File,
    assetType: BrandingAssetType
): { valid: boolean; error?: string } {
    const allowedTypes = assetType === 'favicon' ? ALLOWED_FAVICON_TYPES : ALLOWED_IMAGE_TYPES;

    if (!allowedTypes.includes(file.type)) {
        return {
            valid: false,
            error: `Invalid file type. Allowed: png, jpg, jpeg, svg${assetType === 'favicon' ? ', ico' : ''}`,
        };
    }

    if (file.size > MAX_FILE_SIZE) {
        return {
            valid: false,
            error: `File too large. Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        };
    }

    return { valid: true };
}
