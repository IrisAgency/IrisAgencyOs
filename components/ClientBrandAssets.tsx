import React, { useState } from 'react';
import { ClientBrandAsset, User, AgencyFile } from '../types';
import { Plus, Edit2, Trash2, ExternalLink, FileText, Image as ImageIcon, Type, Palette, Book, Layout, MoreHorizontal, X, Upload, Link as LinkIcon, Eye } from 'lucide-react';

interface ClientBrandAssetsProps {
  clientId: string;
  assets: ClientBrandAsset[];
  onAddAsset: (asset: ClientBrandAsset) => void;
  onUpdateAsset: (asset: ClientBrandAsset) => void;
  onDeleteAsset: (assetId: string) => void;
  onUploadFile?: (file: AgencyFile) => Promise<void>;
  files?: AgencyFile[]; // Add files to get URLs
  currentUser: User | null;
  checkPermission: (permission: string) => boolean;
}

const ASSET_CATEGORIES = [
  { id: 'logo', label: 'Logos', icon: ImageIcon },
  { id: 'colors', label: 'Colors', icon: Palette },
  { id: 'fonts', label: 'Typography', icon: Type },
  { id: 'brand_book', label: 'Brand Books', icon: Book },
  { id: 'templates', label: 'Templates', icon: Layout },
  { id: 'other', label: 'Other Assets', icon: FileText },
];

// Iris dark theme aligned
const surface = 'bg-iris-black/80 backdrop-blur-sm border border-iris-white/10 text-iris-white';
const elevated = 'bg-iris-black/95 backdrop-blur-sm border border-iris-white/10 text-iris-white';
const inputClass = 'w-full px-3 py-2 rounded-lg bg-iris-black/80 border border-iris-white/10 text-iris-white placeholder:text-iris-white/40 focus:outline-none focus:ring-2 focus:ring-iris-red focus:border-iris-red/50';
const pill = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide';

const ClientBrandAssets: React.FC<ClientBrandAssetsProps> = ({
  clientId,
  assets = [],
  onAddAsset,
  onUpdateAsset,
  onDeleteAsset,
  onUploadFile,
  files = [],
  currentUser,
  checkPermission
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<ClientBrandAsset | null>(null);
  const [previewAsset, setPreviewAsset] = useState<ClientBrandAsset | null>(null);

  const clientAssets = (assets || []).filter(a => a.clientId === clientId);
  const canManage = checkPermission('client.brand_assets.manage');
  const canView = checkPermission('client.brand_assets.view');

  if (!canView) {
    return (
      <div className={`${surface} p-8 text-center text-iris-white/70 rounded-xl`}>
        <p>You do not have permission to view brand assets.</p>
      </div>
    );
  }

  const handleEdit = (asset: ClientBrandAsset) => {
    setEditingAsset(asset);
    setIsAddModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this asset?')) {
      onDeleteAsset(id);
    }
  };

  return (
    <div className="space-y-8 text-iris-white">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-iris-white">Brand Guidelines & Assets</h3>
          {clientAssets.length > 0 && (
            <span className={`${pill} bg-iris-red/10 text-iris-red border border-iris-red/20 normal-case`}>
              {clientAssets.length}
            </span>
          )}
        </div>
        {canManage && (
          <button
            onClick={() => { setEditingAsset(null); setIsAddModalOpen(true); }}
            className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-br from-iris-red to-iris-red/80 text-white rounded-md hover:brightness-110 text-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Asset</span>
          </button>
        )}
      </div>

      {clientAssets.length === 0 ? (
        <div className={`${surface} text-center py-12 rounded-lg border-2 border-dashed border-iris-white/10`}>
          <Palette className="w-12 h-12 text-iris-white/40 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-iris-white">No Brand Assets</h3>
          <p className="text-sm text-iris-white/70 mt-1">Upload logos, colors, and guidelines for this client.</p>
          {canManage && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-4 text-iris-red hover:text-iris-red/80 text-sm font-medium transition-colors"
            >
              Add First Asset
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {ASSET_CATEGORIES.map(category => {
            const categoryAssets = clientAssets.filter(a => a.category === category.id);
            if (categoryAssets.length === 0) return null;

            return (
              <div key={category.id} className="space-y-4">
                <div className="flex items-center space-x-2 text-iris-white border-b border-iris-white/10 pb-2">
                  <category.icon className="w-5 h-5 text-iris-red" />
                  <h4 className="font-medium">{category.label}</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryAssets.map(asset => {
                    const assetFile = asset.fileId ? files.find(f => f.id === asset.fileId) : null;
                    return (
                      <AssetCard 
                        key={asset.id} 
                        asset={asset}
                        file={assetFile}
                        canManage={canManage}
                        onEdit={() => handleEdit(asset)}
                        onDelete={() => handleDelete(asset.id)}
                        onPreview={() => setPreviewAsset(asset)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isAddModalOpen && (
        <AssetModal
          isOpen={isAddModalOpen}
          onClose={() => { setIsAddModalOpen(false); setEditingAsset(null); }}
          asset={editingAsset}
          clientId={clientId}
          currentUser={currentUser}
          onUploadFile={onUploadFile}
          onSave={(asset) => {
            if (editingAsset) {
              onUpdateAsset(asset);
            } else {
              onAddAsset(asset);
            }
            setIsAddModalOpen(false);
            setEditingAsset(null);
          }}
        />
      )}

      {previewAsset && (
        <AssetPreviewModal
          asset={previewAsset}
          file={previewAsset.fileId ? files.find(f => f.id === previewAsset.fileId) : null}
          onClose={() => setPreviewAsset(null)}
        />
      )}
    </div>
  );
};

const AssetCard: React.FC<{
  asset: ClientBrandAsset;
  file?: AgencyFile | null;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onPreview: () => void;
}> = ({ asset, file, canManage, onEdit, onDelete, onPreview }) => {
  const isColor = asset.category === 'colors';
  const fileUrl = file?.url || asset.url;
  const isImage = file?.type?.startsWith('image/') || fileUrl?.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i);
  const isVideo = file?.type?.startsWith('video/') || fileUrl?.match(/\.(mp4|webm|mov|avi)$/i);

  return (
    <div className={`${elevated} rounded-lg p-4 hover:shadow-lg transition-shadow group relative`}>
      {/* Preview Thumbnail */}
      {(isImage || isVideo) && fileUrl && (
        <div className="mb-3 relative rounded-lg overflow-hidden bg-iris-black cursor-pointer" onClick={onPreview}>
          {isImage ? (
            <img src={fileUrl} alt={asset.name} className="w-full h-32 object-cover" />
          ) : (
            <div className="w-full h-32 flex items-center justify-center bg-iris-black/80">
              <video src={fileUrl} className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center bg-iris-black/30">
                <Eye className="w-8 h-8 text-white" />
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-3 overflow-hidden">
          {isColor ? (
            <div 
              className="w-10 h-10 rounded-full border border-iris-white/20 shadow-sm shrink-0"
              style={{ backgroundColor: asset.value || '#ccc' }}
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-iris-black flex items-center justify-center shrink-0 text-iris-white/70 border border-iris-white/10">
              {asset.type === 'file' ? <FileText className="w-5 h-5" /> : <LinkIcon className="w-5 h-5" />}
            </div>
          )}
          <div className="min-w-0">
            <h5 className="font-medium text-iris-white truncate" title={asset.name}>{asset.name}</h5>
            <p className="text-xs text-iris-white/70 truncate">
              {isColor ? asset.value : (asset.type === 'file' ? 'File Attachment' : 'External Link')}
            </p>
          </div>
        </div>
        
        {canManage && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
            <button onClick={onEdit} className="p-1 text-iris-white/70 hover:text-iris-red rounded transition-colors">
              <Edit2 className="w-4 h-4" />
            </button>
            <button onClick={onDelete} className="p-1 text-iris-white/70 hover:text-rose-400 rounded transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {asset.notes && (
        <p className="text-xs text-iris-white/70 mt-2 line-clamp-2">{asset.notes}</p>
      )}

      <div className="mt-3 pt-3 border-t border-iris-white/10 flex justify-between items-center">
        <span className="text-xs text-iris-white/70 capitalize">{asset.category.replace('_', ' ')}</span>
        {asset.url && (
          <a 
            href={asset.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-iris-red hover:text-iris-red/80 flex items-center space-x-1 transition-colors"
          >
            <span>{asset.type === 'file' ? 'Download' : 'Visit'}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
        {isColor && (
           <button 
             onClick={() => { navigator.clipboard.writeText(asset.value || ''); }}
             className="text-xs text-iris-white/70 hover:text-iris-white transition-colors"
             title="Copy Hex Code"
           >
             Copy Hex
           </button>
        )}
      </div>
    </div>
  );
};

const AssetModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  asset: ClientBrandAsset | null;
  clientId: string;
  currentUser: User | null;
  onSave: (asset: ClientBrandAsset) => void;
  onUploadFile?: (file: AgencyFile) => Promise<void>;
}> = ({ isOpen, onClose, asset, clientId, currentUser, onSave, onUploadFile }) => {
  const [formData, setFormData] = useState<Partial<ClientBrandAsset>>(
    asset || {
      name: '',
      category: 'logo',
      type: 'file',
      value: '',
      url: '',
      notes: ''
    }
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setIsUploading(true);
    let finalFileId = formData.fileId;

    try {
      if (formData.type === 'file' && selectedFile && onUploadFile) {
          const newFileId = `f${Date.now()}`;
          const newFile: AgencyFile = {
              id: newFileId,
              projectId: clientId, // Use clientId as projectId for brand assets
              taskId: null,
              folderId: null,
              uploaderId: currentUser.id,
              name: selectedFile.name,
              type: selectedFile.type,
              size: selectedFile.size,
              url: '', 
              version: 1,
              isDeliverable: false,
              isArchived: false,
              tags: ['brand_asset', clientId],
              createdAt: new Date().toISOString()
          };
          
          (newFile as any).file = selectedFile;
          await onUploadFile(newFile);
          finalFileId = newFileId;
      }

      const newAsset: ClientBrandAsset = {
        id: asset?.id || `ba_${Date.now()}`,
        clientId,
        name: formData.name || 'Untitled Asset',
        category: formData.category as any,
        type: formData.type as any,
        value: formData.value,
        url: formData.url,
        fileId: finalFileId,
        notes: formData.notes,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser.id
      };

      onSave(newAsset);
    } catch (error) {
      console.error("Error saving asset:", error);
      alert("Failed to save asset. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-iris-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`${elevated} rounded-lg shadow-2xl w-full max-w-md`}>
        <div className="flex justify-between items-center p-4 border-b border-iris-white/10 bg-iris-black">
          <h3 className="font-semibold text-iris-white">{asset ? 'Edit Asset' : 'Add Brand Asset'}</h3>
          <button onClick={onClose} className="text-iris-white/70 hover:text-iris-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-iris-white/70 mb-1">Asset Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className={inputClass}
              placeholder="e.g. Primary Logo, Brand Blue"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-iris-white/70 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                className={inputClass}
              >
                {ASSET_CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-iris-white/70 mb-1">Type</label>
              <select
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                className={inputClass}
              >
                <option value="file">File Upload</option>
                <option value="link">External Link</option>
                <option value="text">Text / Value</option>
              </select>
            </div>
          </div>

          {formData.category === 'colors' && (
            <div>
              <label className="block text-sm font-semibold text-iris-white/70 mb-1">Color Value (Hex)</label>
              <div className="flex space-x-2">
                <input
                  type="color"
                  value={formData.value || '#000000'}
                  onChange={e => setFormData({ ...formData, value: e.target.value })}
                  className="h-10 w-10 p-1 border border-iris-white/10 rounded cursor-pointer bg-iris-black/80"
                />
                <input
                  type="text"
                  value={formData.value}
                  onChange={e => setFormData({ ...formData, value: e.target.value })}
                  className={`${inputClass} flex-1`}
                  placeholder="#000000"
                />
              </div>
            </div>
          )}

          {formData.type === 'link' && (
            <div>
              <label className="block text-sm font-semibold text-iris-white/70 mb-1">URL</label>
              <input
                type="url"
                value={formData.url}
                onChange={e => setFormData({ ...formData, url: e.target.value })}
                className={inputClass}
                placeholder="https://"
              />
            </div>
          )}

          {formData.type === 'file' && (
             <div>
               <label className="block text-sm font-semibold text-iris-white/70 mb-1">Upload File</label>
               <div className="border-2 border-dashed border-iris-white/20 rounded-lg p-4 text-center hover:bg-iris-white/5 transition-colors bg-iris-black/80">
                  <input 
                      type="file" 
                      required={!asset?.fileId} // Required only if new
                      onChange={e => setSelectedFile(e.target.files ? e.target.files[0] : null)} 
                      className="w-full text-sm text-iris-white/70 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border border-iris-white/10 file:text-xs file:font-semibold file:bg-iris-black file:text-iris-red hover:file:bg-iris-white/5"
                  />
                  <p className="text-xs text-iris-white/70 mt-2">Max size 10MB.</p>
               </div>
             </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-iris-white/70 mb-1">Notes</label>
            <textarea
              value={formData.notes || ''}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className={`${inputClass} min-h-[80px]`}
              placeholder="Usage guidelines, restrictions, etc."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-iris-white/70 bg-iris-black border border-iris-white/10 hover:bg-iris-white/5 rounded-md text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="px-4 py-2 bg-gradient-to-br from-iris-red to-iris-red/80 text-white hover:brightness-110 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isUploading ? 'Uploading...' : (asset ? 'Save Changes' : 'Add Asset')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AssetPreviewModal: React.FC<{
  asset: ClientBrandAsset;
  file: AgencyFile | null | undefined;
  onClose: () => void;
}> = ({ asset, file, onClose }) => {
  const fileUrl = file?.url || asset.url;
  const isImage = file?.type?.startsWith('image/') || fileUrl?.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i);
  const isVideo = file?.type?.startsWith('video/') || fileUrl?.match(/\.(mp4|webm|mov|avi)$/i);

  return (
    <div className="fixed inset-0 bg-iris-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className={`${elevated} rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden`} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-iris-white/10 bg-iris-black">
          <div>
            <h3 className="font-semibold text-iris-white">{asset.name}</h3>
            <p className="text-sm text-iris-white/70 capitalize">{asset.category.replace('_', ' ')}</p>
          </div>
          <button onClick={onClose} className="text-iris-white/70 hover:text-iris-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-auto max-h-[calc(90vh-120px)]">
          {isImage && fileUrl && (
            <div className="flex items-center justify-center bg-iris-black rounded-lg p-4">
              <img 
                src={fileUrl} 
                alt={asset.name} 
                className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg"
              />
            </div>
          )}

          {isVideo && fileUrl && (
            <div className="flex items-center justify-center bg-iris-black rounded-lg overflow-hidden">
              <video 
                src={fileUrl} 
                controls 
                className="max-w-full max-h-[60vh] rounded-lg"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          )}

          {!isImage && !isVideo && fileUrl && (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-iris-white/40 mx-auto mb-4" />
              <p className="text-iris-white/70 mb-4">Preview not available for this file type</p>
              <a 
                href={fileUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-br from-iris-red to-iris-red/80 text-white rounded-md hover:brightness-110 transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open File</span>
              </a>
            </div>
          )}

          {asset.notes && (
            <div className="mt-6 p-4 bg-iris-black rounded-lg border border-iris-white/10">
              <h4 className="text-sm font-medium text-iris-white/70 mb-2">Notes</h4>
              <p className="text-sm text-iris-white/90">{asset.notes}</p>
            </div>
          )}

          {file && (
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-iris-white/70">
              <div>
                <span className="text-iris-white/50">File Type:</span>
                <span className="ml-2 text-iris-white">{file.type}</span>
              </div>
              <div>
                <span className="text-iris-white/50">Size:</span>
                <span className="ml-2 text-iris-white">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientBrandAssets;
