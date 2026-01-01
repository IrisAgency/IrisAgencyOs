import React, { useState, useEffect } from 'react';
import { AppBranding, FileRef } from '../../types';
import { Palette, Save, Upload, X, Eye, RotateCcw, Image as ImageIcon, CheckCircle } from 'lucide-react';
import { useBranding } from '../../contexts/BrandingContext';

interface BrandingEditorProps {
    branding: AppBranding;
    onUpdateBranding: (branding: AppBranding) => void;
}

const BrandingEditor: React.FC<BrandingEditorProps> = ({ branding: propsBranding, onUpdateBranding }) => {
    const { branding: globalBranding, updateBranding, uploadLogo, refreshBranding } = useBranding();
    const [localBranding, setLocalBranding] = useState<AppBranding>(propsBranding);
    const [uploading, setUploading] = useState<Record<string, boolean>>({});
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Sync with global branding when it changes
    // Removed to prevent overwriting local edits while typing
    // useEffect(() => {
    //     if (globalBranding) {
    //         setLocalBranding(globalBranding);
    //     }
    // }, [globalBranding]);

    const handleColorChange = (field: keyof AppBranding, value: string) => {
        console.log(`🎨 Color changed: ${field} = ${value}`);
        setLocalBranding(prev => {
            const newState = { ...prev, [field]: value };
            console.log('🎨 New local state:', newState);
            return newState;
        });
    };

    // Update local state when props change, but only if we haven't made local edits yet
    // or if the global state has updated to a newer version
    useEffect(() => {
        // If we have global branding and (local has no timestamp OR global is newer)
        if (globalBranding && (!localBranding.updatedAt || (globalBranding.updatedAt && globalBranding.updatedAt > localBranding.updatedAt))) {
             setLocalBranding(globalBranding);
        }
    }, [globalBranding]);

    const handleFileUpload = async (file: File, type: 'light' | 'dark') => {
        setUploadError(null);
        setUploading({ ...uploading, [type]: true });

        try {
            // Validate file
            if (!file.type.startsWith('image/')) {
                throw new Error('File must be an image');
            }
            if (file.size > 5 * 1024 * 1024) {
                throw new Error('File size must be less than 5MB');
            }

            // Upload and get URL
            const url = await uploadLogo(file, type);

            // Create FileRef
            const fileRef: FileRef = {
                fileName: file.name,
                url: url,
                mimeType: file.type,
                size: file.size,
                uploadedAt: new Date().toISOString(),
            };

            // Update local state
            const field = type === 'light' ? 'logoLight' : 'logoDark';
            setLocalBranding({
                ...localBranding,
                [field]: fileRef,
            });
        } catch (error) {
            setUploadError(error instanceof Error ? error.message : 'Upload failed');
        } finally {
            setUploading({ ...uploading, [type]: false });
        }
    };

    const handleRemoveAsset = (field: keyof AppBranding) => {
        setLocalBranding({
            ...localBranding,
            [field]: null,
        });
    };

    const handleSave = async () => {
        console.log('BrandingEditor: handleSave called', { localBranding });
        setSaving(true);
        setSaveSuccess(false);
        setUploadError(null);

        try {
            console.log('BrandingEditor: Calling updateBranding...');
            await updateBranding(localBranding);
            console.log('BrandingEditor: updateBranding completed successfully');
            
            // Refresh branding context to ensure all components get the update
            await refreshBranding();
            console.log('BrandingEditor: refreshBranding completed');
            
            // onUpdateBranding(localBranding); // Redundant: updateBranding from context already handles this
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error) {
            console.error('BrandingEditor: Error saving:', error);
            setUploadError(error instanceof Error ? error.message : 'Failed to save branding');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        if (globalBranding) {
            setLocalBranding(globalBranding);
        }
        setUploadError(null);
        setSaveSuccess(false);
    };

    const renderFileUpload = (
        label: string,
        type: 'light' | 'dark',
        description: string
    ) => {
        const field = type === 'light' ? 'logoLight' : 'logoDark';
        const fileRef = localBranding[field] as FileRef | undefined;
        const isUploading = uploading[type];

        return (
            <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-900">{label}</label>
                <p className="text-xs text-slate-500">{description}</p>

                {fileRef ? (
                    <div className="border-2 border-slate-200 rounded-lg p-4 bg-slate-50">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <ImageIcon className="w-4 h-4 text-slate-400" />
                                <span className="text-sm font-medium text-slate-700">{fileRef.fileName}</span>
                            </div>
                            <button
                                onClick={() => handleRemoveAsset(field)}
                                className="text-red-600 hover:bg-red-50 p-1 rounded transition-colors"
                                title="Remove"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        {fileRef.url && (
                            <img
                                src={`${fileRef.url}?v=${Date.now()}`}
                                alt={label}
                                className="w-full h-24 object-contain bg-white rounded border border-slate-200"
                            />
                        )}
                        <p className="text-xs text-slate-400 mt-2">
                            <span className="ltr-text">{(fileRef.size / 1024).toFixed(1)} KB</span> • {fileRef.mimeType}
                        </p>
                    </div>
                ) : (
                    <label className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-iris-red hover:bg-iris-red/5 transition-colors">
                        <Upload className="w-8 h-8 text-slate-400 mb-2" />
                        <span className="text-sm font-medium text-slate-600">Click to upload</span>
                        <span className="text-xs text-slate-400 mt-1">PNG, JPG, SVG (max 5MB)</span>
                        <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(file, type);
                            }}
                            disabled={isUploading}
                        />
                    </label>
                )}

                {isUploading && (
                    <div className="text-xs text-iris-red font-medium flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-iris-red border-t-transparent rounded-full animate-spin"></div>
                        Uploading...
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {uploadError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
                    <span className="text-sm">{uploadError}</span>
                    <button onClick={() => setUploadError(null)}>
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: Settings */}
                <div className="space-y-6">
                    {/* Basic Info */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Palette className="w-5 h-5 text-iris-red" />
                            Basic Information
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-900 mb-1">App Name</label>
                                <input
                                    type="text"
                                    value={localBranding.appName}
                                    onChange={(e) => setLocalBranding({ ...localBranding, appName: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-iris-red"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-900 mb-1">Tagline (Optional)</label>
                                <input
                                    type="text"
                                    value={localBranding.tagline || ''}
                                    onChange={(e) => setLocalBranding({ ...localBranding, tagline: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-iris-red"
                                    placeholder="Your agency's tagline"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-900 mb-1">Font Family</label>
                                <select
                                    value={localBranding.fontFamily}
                                    onChange={(e) => setLocalBranding({ ...localBranding, fontFamily: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-iris-red"
                                >
                                    <option value="Inter">Inter</option>
                                    <option value="Roboto">Roboto</option>
                                    <option value="Poppins">Poppins</option>
                                    <option value="Montserrat">Montserrat</option>
                                    <option value="Open Sans">Open Sans</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Colors */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-900 mb-4">Theme Colors</h3>
                        <div className="space-y-4">
                            {[
                                { field: 'primaryColor', label: 'Primary Color' },
                                { field: 'secondaryColor', label: 'Secondary Color' },
                                { field: 'accentColor', label: 'Accent Color' },
                                { field: 'sidebarColor', label: 'Sidebar Color' },
                                { field: 'backgroundColor', label: 'Background Color' },
                                { field: 'textColor', label: 'Text Color' },
                            ].map(({ field, label }) => (
                                <div key={field}>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="color"
                                            value={(localBranding as any)[field]}
                                            onChange={(e) => handleColorChange(field as keyof AppBranding, e.target.value)}
                                            className="h-10 w-20 rounded border border-slate-300 p-1 cursor-pointer"
                                        />
                                        <input
                                            type="text"
                                            value={(localBranding as any)[field]}
                                            onChange={(e) => handleColorChange(field as keyof AppBranding, e.target.value)}
                                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm uppercase font-mono focus:outline-none focus:ring-2 focus:ring-iris-red ltr-text"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Assets */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-900 mb-4">Brand Assets</h3>
                        <div className="space-y-6">
                            {renderFileUpload('Logo (Light)', 'light', 'Used in light theme mode')}
                            {renderFileUpload('Logo (Dark)', 'dark', 'Used in dark theme mode (optional)')}
                        </div>
                    </div>
                </div>

                {/* Right Column: Live Preview */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm sticky top-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                <Eye className="w-5 h-5 text-iris-red" />
                                Live Preview
                            </h3>
                            <button
                                onClick={() => setShowPreview(!showPreview)}
                                className="text-sm text-slate-600 hover:text-slate-900"
                            >
                                {showPreview ? 'Hide' : 'Show'}
                            </button>
                        </div>

                        {showPreview && (
                            <div className="space-y-4">
                                {/* Header Preview */}
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 mb-2">HEADER</p>
                                    <div
                                        className="border border-slate-200 rounded-lg p-3 flex items-center justify-between"
                                        style={{ backgroundColor: localBranding.backgroundColor }}
                                    >
                                        {localBranding.logoLight?.url ? (
                                            <img src={localBranding.logoLight.url} alt="Logo" className="h-6" />
                                        ) : (
                                            <span style={{ color: localBranding.textColor }} className="font-bold text-sm">
                                                {localBranding.appName}
                                            </span>
                                        )}
                                        <div
                                            className="px-3 py-1 rounded-full text-xs font-medium"
                                            style={{ backgroundColor: localBranding.primaryColor, color: '#fff' }}
                                        >
                                            Button
                                        </div>
                                    </div>
                                </div>

                                {/* Sidebar Preview */}
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 mb-2">SIDEBAR</p>
                                    <div
                                        className="border border-slate-200 rounded-lg p-3"
                                        style={{ backgroundColor: localBranding.sidebarColor }}
                                    >
                                        {localBranding.sidebarIcon?.url ? (
                                            <img src={localBranding.sidebarIcon.url} alt="Icon" className="h-8 w-8" />
                                        ) : (
                                            <div className="h-8 w-8 bg-white/20 rounded"></div>
                                        )}
                                    </div>
                                </div>

                                {/* Button Preview */}
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 mb-2">BUTTONS</p>
                                    <div className="flex gap-2">
                                        <button
                                            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                                            style={{ backgroundColor: localBranding.primaryColor }}
                                        >
                                            Primary
                                        </button>
                                        <button
                                            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                                            style={{ backgroundColor: localBranding.accentColor }}
                                        >
                                            Accent
                                        </button>
                                    </div>
                                </div>

                                {/* Login Preview */}
                                {localBranding.loginBackground?.url && (
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 mb-2">LOGIN BACKGROUND</p>
                                        <div
                                            className="border border-slate-200 rounded-lg h-32 bg-cover bg-center"
                                            style={{ backgroundImage: `url(${localBranding.loginBackground.url})` }}
                                        ></div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end bg-white p-4 rounded-xl border border-slate-200 sticky bottom-4">
                <button
                    onClick={handleReset}
                    disabled={saving}
                    className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                    <RotateCcw className="w-4 h-4" />
                    Reset
                </button>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-iris-red text-white px-6 py-2 rounded-lg font-medium hover:bg-iris-red/90 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                    {saving ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Saving...
                        </>
                    ) : saveSuccess ? (
                        <>
                            <CheckCircle className="w-4 h-4" />
                            Saved!
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4" />
                            Save Changes
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default BrandingEditor;
