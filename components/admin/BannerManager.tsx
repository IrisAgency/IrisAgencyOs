import React, { useState, useRef } from 'react';
import { DashboardBanner } from '../../types';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import { 
  Upload, 
  Trash2, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  ExternalLink,
  Check,
  X,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react';

interface BannerManagerProps {
  banner: DashboardBanner | null;
  currentUserId: string;
  onSaveBanner: (banner: DashboardBanner) => void;
  onDeleteBanner: () => void;
}

const BannerManager: React.FC<BannerManagerProps> = ({
  banner,
  currentUserId,
  onSaveBanner,
  onDeleteBanner,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(banner?.imageUrl || null);
  const [linkUrl, setLinkUrl] = useState(banner?.linkUrl || '');
  const [linkTarget, setLinkTarget] = useState<'_blank' | '_self'>(banner?.linkTarget || '_blank');
  const [isActive, setIsActive] = useState(banner?.isActive ?? true);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      alert('Please select an image or video file');
      return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      alert('File size must be less than 50MB');
      return;
    }

    setPendingFile(file);
    
    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUpload = async () => {
    if (!pendingFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const bannerId = banner?.id || `banner_${Date.now()}`;
      const storagePath = `banners/${bannerId}/${pendingFile.name}`;
      const storageRef = ref(storage, storagePath);

      // Delete old file if exists
      if (banner?.storagePath) {
        try {
          const oldRef = ref(storage, banner.storagePath);
          await deleteObject(oldRef);
        } catch (e) {
          console.log('Old banner file not found, continuing...');
        }
      }

      const uploadTask = uploadBytesResumable(storageRef, pendingFile);

      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
          },
          (error) => reject(error),
          () => resolve()
        );
      });

      const downloadUrl = await getDownloadURL(storageRef);

      const newBanner: DashboardBanner = {
        id: bannerId,
        imageUrl: downloadUrl,
        storagePath,
        fileName: pendingFile.name,
        isActive,
        linkUrl: linkUrl || null,
        linkTarget,
        uploadedBy: currentUserId,
        uploadedAt: banner?.uploadedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      onSaveBanner(newBanner);
      setPendingFile(null);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload banner. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSaveSettings = () => {
    if (!banner) return;

    const updatedBanner: DashboardBanner = {
      ...banner,
      isActive,
      linkUrl: linkUrl || null,
      linkTarget,
      updatedAt: new Date().toISOString(),
    };

    onSaveBanner(updatedBanner);
  };

  const handleDelete = async () => {
    if (!banner) return;

    if (!confirm('Are you sure you want to delete this banner?')) return;

    try {
      if (banner.storagePath) {
        const storageRef = ref(storage, banner.storagePath);
        await deleteObject(storageRef);
      }
      onDeleteBanner();
      setPreviewUrl(null);
      setLinkUrl('');
      setPendingFile(null);
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete banner. Please try again.');
    }
  };

  const isVideo = pendingFile?.type.startsWith('video/') || banner?.fileName?.match(/\.(mp4|webm|mov|avi)$/i);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Dashboard Banner</h2>
          <p className="text-sm text-slate-500 mt-1">
            Upload a 16:9 image or video to display on the main dashboard
          </p>
        </div>
        {banner && (
          <button
            onClick={handleDelete}
            className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete Banner
          </button>
        )}
      </div>

      {/* Upload Area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl transition-all overflow-hidden ${
          isDragging 
            ? 'border-indigo-500 bg-indigo-50' 
            : previewUrl 
              ? 'border-slate-200 bg-slate-50' 
              : 'border-slate-300 hover:border-slate-400 bg-slate-50'
        }`}
      >
        {/* Preview */}
        {previewUrl ? (
          <div className="relative aspect-video">
            {isVideo ? (
              <video
                src={previewUrl}
                className="w-full h-full object-cover"
                controls
                muted
                loop
              />
            ) : (
              <img
                src={previewUrl}
                alt="Banner preview"
                className="w-full h-full object-cover"
              />
            )}
            
            {/* Overlay Actions */}
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-white text-slate-900 rounded-lg font-medium hover:bg-slate-100 transition-colors flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Replace
              </button>
            </div>

            {/* Upload Progress */}
            {isUploading && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-white animate-spin mb-3" />
                <div className="w-48 h-2 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <span className="text-white text-sm mt-2">{Math.round(uploadProgress)}%</span>
              </div>
            )}
          </div>
        ) : (
          <div 
            className="aspect-video flex flex-col items-center justify-center p-8 cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center mb-4">
              <ImageIcon className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium mb-1">
              Drop an image or video here, or click to browse
            </p>
            <p className="text-slate-400 text-sm">
              Recommended: 16:9 aspect ratio (1920×1080) • Max 50MB
            </p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleInputChange}
          className="hidden"
        />
      </div>

      {/* Settings */}
      <div className="bg-slate-50 rounded-xl p-5 space-y-5">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Banner Settings</h3>
        
        {/* Active Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isActive ? (
              <Eye className="w-5 h-5 text-green-500" />
            ) : (
              <EyeOff className="w-5 h-5 text-slate-400" />
            )}
            <div>
              <p className="text-sm font-medium text-slate-900">Banner Visibility</p>
              <p className="text-xs text-slate-500">Show or hide the banner on the dashboard</p>
            </div>
          </div>
          <button
            onClick={() => setIsActive(!isActive)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              isActive ? 'bg-green-500' : 'bg-slate-300'
            }`}
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              isActive ? 'left-7' : 'left-1'
            }`} />
          </button>
        </div>

        {/* Link URL */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            <LinkIcon className="w-4 h-4 inline mr-2" />
            Link URL (optional)
          </label>
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <p className="text-xs text-slate-500 mt-1">Users will be redirected when clicking the banner</p>
        </div>

        {/* Link Target */}
        {linkUrl && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <ExternalLink className="w-4 h-4 inline mr-2" />
              Open Link In
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setLinkTarget('_blank')}
                className={`flex-1 px-4 py-2.5 rounded-lg border transition-colors ${
                  linkTarget === '_blank'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                New Tab
              </button>
              <button
                onClick={() => setLinkTarget('_self')}
                className={`flex-1 px-4 py-2.5 rounded-lg border transition-colors ${
                  linkTarget === '_self'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                Same Tab
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        {pendingFile && (
          <button
            onClick={() => {
              setPendingFile(null);
              setPreviewUrl(banner?.imageUrl || null);
            }}
            className="px-5 py-2.5 text-slate-600 hover:text-slate-800 font-medium rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        )}
        
        {pendingFile ? (
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload Banner
              </>
            )}
          </button>
        ) : banner && (
          <button
            onClick={handleSaveSettings}
            className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Save Settings
          </button>
        )}
      </div>
    </div>
  );
};

export default BannerManager;
