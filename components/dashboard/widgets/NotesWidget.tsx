import React, { useState } from 'react';
import { Note, User } from '../../../types';
import { FileText, Plus, Trash2, Edit2, Save, X } from 'lucide-react';

interface NotesWidgetProps {
  notes: Note[];
  currentUser: User;
  onAddNote: (note: Note) => void;
  onUpdateNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
  canCreate: boolean;
  canEditOwn: boolean;
  canDeleteOwn: boolean;
  canManageAll: boolean;
}

const NotesWidget: React.FC<NotesWidgetProps> = ({ 
  notes = [], currentUser, onAddNote, onUpdateNote, onDeleteNote,
  canCreate, canEditOwn, canDeleteOwn, canManageAll
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleStartCreate = () => {
    setIsCreating(true);
    setEditingId(null);
    setTitle('');
    setContent('');
  };

  const handleStartEdit = (note: Note) => {
    setIsCreating(false);
    setEditingId(note.id);
    setTitle(note.title);
    setContent(note.content);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    setTitle('');
    setContent('');
  };

  const handleSave = () => {
    if (!title.trim() || !content.trim()) return;

    if (isCreating) {
      const newNote: Note = {
        id: `n${Date.now()}`,
        title,
        content,
        createdBy: currentUser.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      onAddNote(newNote);
    } else if (editingId) {
      const existing = notes.find(n => n.id === editingId);
      if (existing) {
        onUpdateNote({
          ...existing,
          title,
          content,
          updatedAt: new Date().toISOString()
        });
      }
    }
    handleCancel();
  };

  // Filter notes visible to user (assuming all internal notes are visible, but edit/delete is restricted)
  // Or maybe filter by creator if not manage_all? The prompt implies "List notes with createdBy", so likely visible to all.
  const sortedNotes = [...notes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600" />
          Quick Notes
        </h3>
        {canCreate && !isCreating && !editingId && (
          <button 
            onClick={handleStartCreate}
            className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
            title="Add Note"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar max-h-[300px]">
        {(isCreating || editingId) && (
          <div className="bg-slate-50 p-3 rounded-lg border border-indigo-200 space-y-2 animate-in fade-in slide-in-from-top-2">
            <input
              type="text"
              placeholder="Note Title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:border-indigo-500"
              autoFocus
            />
            <textarea
              placeholder="Write your note here..."
              value={content}
              onChange={e => setContent(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:border-indigo-500 min-h-[80px]"
            />
            <div className="flex justify-end gap-2">
              <button onClick={handleCancel} className="p-1 text-slate-500 hover:bg-slate-200 rounded">
                <X className="w-4 h-4" />
              </button>
              <button onClick={handleSave} className="p-1 text-indigo-600 hover:bg-indigo-100 rounded">
                <Save className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {sortedNotes.length > 0 ? (
          sortedNotes.map(note => {
            const isOwner = note.createdBy === currentUser.id;
            const canEdit = canManageAll || (canEditOwn && isOwner);
            const canDelete = canManageAll || (canDeleteOwn && isOwner);

            return (
              <div key={note.id} className="group p-3 bg-white border border-slate-100 rounded-lg hover:border-indigo-200 hover:shadow-sm transition-all">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="text-sm font-semibold text-slate-800">{note.title}</h4>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {canEdit && (
                      <button onClick={() => handleStartEdit(note)} className="p-1 text-slate-400 hover:text-indigo-600">
                        <Edit2 className="w-3 h-3" />
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => onDeleteNote(note.id)} className="p-1 text-slate-400 hover:text-rose-600">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-600 whitespace-pre-wrap mb-2 line-clamp-3">{note.content}</p>
                <div className="text-[10px] text-slate-400 flex justify-between">
                  <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                  {/* Ideally show creator name if we had user list, but keeping it simple */}
                </div>
              </div>
            );
          })
        ) : (
          !isCreating && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-4">
              <p className="text-sm">No notes yet</p>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default NotesWidget;
