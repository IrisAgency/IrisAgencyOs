import React, { useState, useRef } from 'react';
import { X, Upload, Link as LinkIcon, Plus, Trash2, FileText } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import type { CreativeRejectionReference } from '../../types';

interface RejectionModalProps {
  itemTitle: string;
  onConfirm: (note: string, references: CreativeRejectionReference[]) => void;
  onCancel: () => void;
  clientId: string;
  projectId: string;
}

const RejectionModal: React.FC<RejectionModalProps> = ({
  itemTitle,
  onConfirm,
  onCancel,
  clientId,
  projectId,
}) => {
  const surface = 'bg-[#0f0f0f] backdrop-blur-sm border border-white/10 text-white';
  const inputClass = 'w-full px-3 py-2 rounded-lg bg-[#0a0a0a] border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-iris-red focus:border-iris-red/50';

  const [note, setNote] = useState('');
  const [references, setReferences] = useState<CreativeRejectionReference[]>([]);
  const [linkInput, setLinkInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddLink = () => {
    if (!linkInput.trim()) return;
    setReferences(prev => [...prev, { type: 'link', value: linkInput.trim() }]);
    setLinkInput('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const timestamp = Date.now();
      const storagePath = `clients/${clientId}/creative/${projectId}/rejections/${timestamp}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      setReferences(prev => [...prev, {
        type: 'file',
        value: downloadURL,
        fileName: file.name,
      }]);
    } catch (error) {
      console.error('Error uploading rejection reference:', error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeReference = (index: number) => {
    setReferences(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!note.trim()) return;
    onConfirm(note.trim(), references);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-iris-black/70 backdrop-blur-sm p-4">
      <div className={`${surface} rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200`}>
        {/* Header */}
        <div className="p-5 border-b border-iris-white/10 flex justify-between items-center bg-iris-black">
          <div>
            <h2 className="text-lg font-bold text-iris-white">Reject Item</h2>
            <p className="text-sm text-iris-white/60 mt-0.5 truncate max-w-[280px]">{itemTitle}</p>
          </div>
          <button onClick={onCancel} className="text-iris-white/70 hover:text-iris-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Rejection Note (Required) */}
          <div>
            <label className="block text-sm font-semibold text-iris-white/70 mb-1">
              Rejection Note <span className="text-iris-red">*</span>
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Explain why this item needs revision..."
              rows={4}
              className={`${inputClass} min-h-[100px] resize-none`}
              autoFocus
            />
          </div>

          {/* Add Reference Link */}
          <div>
            <label className="block text-sm font-semibold text-iris-white/70 mb-1">Reference Link (Optional)</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-iris-white/40" />
                <input
                  type="url"
                  value={linkInput}
                  onChange={e => setLinkInput(e.target.value)}
                  placeholder="https://..."
                  className={`${inputClass} pl-9`}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddLink())}
                />
              </div>
              <button
                type="button"
                onClick={handleAddLink}
                disabled={!linkInput.trim()}
                className="px-3 py-2 bg-iris-white/10 text-iris-white rounded-lg hover:bg-iris-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Upload Reference File */}
          <div>
            <label className="block text-sm font-semibold text-iris-white/70 mb-1">Reference File (Optional)</label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-3 py-2 border border-dashed border-iris-white/20 rounded-lg text-sm text-iris-white/70 hover:bg-iris-white/5 transition-colors w-full justify-center"
            >
              <Upload className="w-4 h-4" />
              {uploading ? 'Uploading...' : 'Upload reference file'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>

          {/* References List */}
          {references.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-iris-white/50 uppercase tracking-wide">Attached References</span>
              {references.map((r, i) => (
                <div key={i} className="flex items-center gap-2 bg-iris-black/60 rounded-lg px-3 py-2 text-sm">
                  {r.type === 'link' ? (
                    <LinkIcon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-iris-red shrink-0" />
                  )}
                  <span className="flex-1 truncate text-iris-white/80">
                    {r.type === 'link' ? r.value : r.fileName}
                  </span>
                  <button onClick={() => removeReference(i)} className="text-iris-white/40 hover:text-rose-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-iris-white/10 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 border border-iris-white/10 text-iris-white/70 bg-iris-black rounded-lg font-medium hover:bg-iris-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!note.trim()}
            className="flex-1 bg-gradient-to-br from-rose-600 to-rose-700 text-white px-4 py-2.5 rounded-lg font-medium hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Reject Item
          </button>
        </div>
      </div>
    </div>
  );
};

export default RejectionModal;
