import React, { useState, useCallback, useRef } from 'react';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, X, Loader2, Layers } from 'lucide-react';
import Modal from '../common/Modal';
import { parseExcelFile } from '../../utils/excelParser';
import { mapCreativeImportRows } from '../../utils/creativeImportMapper';
import { validateCreativeImportRows } from '../../utils/creativeImportValidator';
import type { CreativeImportRow, CreativeImportValidation } from '../../types/creativeImport';

interface CreativeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  creativeCalendarId: string;
  currentUserId: string;
}

type Step = 'upload' | 'preview' | 'importing';

const ACCEPT = '.xlsx,.xls,.csv';

const CreativeImportModal: React.FC<CreativeImportModalProps> = ({
  isOpen,
  onClose,
  creativeCalendarId,
  currentUserId,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<CreativeImportRow[]>([]);
  const [validations, setValidations] = useState<CreativeImportValidation[]>([]);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);

  // ── Reset ──
  const reset = useCallback(() => {
    setStep('upload');
    setFileName('');
    setRows([]);
    setValidations([]);
    setRawHeaders([]);
    setDragOver(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  // ── File processing ──
  const processFile = useCallback(async (file: File) => {
    try {
      const { headers, rows: rawRows } = await parseExcelFile(file);
      if (rawRows.length === 0) {
        alert('The uploaded file contains no data rows.');
        return;
      }
      const mapped = mapCreativeImportRows(headers, rawRows);
      const issues = validateCreativeImportRows(mapped);

      setRawHeaders(headers);
      setFileName(file.name);
      setRows(mapped);
      setValidations(issues);
      setStep('preview');
    } catch {
      alert('Could not read the file. Make sure it is a valid .xlsx, .xls, or .csv file.');
    }
  }, []);

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  // ── Import ──
  const errorCount = validations.filter((v) => v.severity === 'error').length;
  const warnCount = validations.filter((v) => v.severity === 'warning').length;
  const hasErrors = errorCount > 0;

  const handleImport = useCallback(async () => {
    if (hasErrors) return;
    setStep('importing');

    try {
      const now = new Date().toISOString();
      const BATCH_LIMIT = 500;

      const items = rows.map((row) => ({
        creativeCalendarId,
        type: row.type,
        title: row.title,
        mainIdea: row.mainIdea,
        briefDescription: row.briefDescription,
        notes: row.notes,
        publishAt: row.publishAt,
        isCarousel: row.isCarousel,
        referenceLinks: row.referenceLinks,
        referenceFiles: [],
        reviewStatus: 'PENDING' as const,
        rejectionNote: null,
        rejectionReferences: [],
        createdAt: now,
        updatedAt: now,
      }));

      // Write in batches
      for (let i = 0; i < items.length; i += BATCH_LIMIT) {
        const batch = writeBatch(db);
        const chunk = items.slice(i, i + BATCH_LIMIT);
        for (const item of chunk) {
          const ref = doc(collection(db, 'creative_calendar_items'));
          batch.set(ref, item);
        }
        await batch.commit();
      }

      handleClose();
    } catch {
      alert('An error occurred while importing. Please try again.');
      setStep('preview');
    }
  }, [hasErrors, rows, creativeCalendarId, handleClose]);

  // ── Helpers for row-level validation indicators ──
  const rowIssues = (rowIdx: number) => validations.filter((v) => v.row === rowIdx);
  const rowHasError = (rowIdx: number) => rowIssues(rowIdx).some((v) => v.severity === 'error');
  const rowHasWarn = (rowIdx: number) => rowIssues(rowIdx).some((v) => v.severity === 'warning');

  // ── Render ──
  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Creative Items from Excel" size="full">
      <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              Upload an Excel file (<code>.xlsx</code>, <code>.xls</code>) or <code>.csv</code> with columns:
              <span className="font-medium text-white ml-1">
                Type, Title (optional), Main Idea, Brief Description, Notes, Publish Date, Reference Links, Is Carousel
              </span>
              <br />
              <span className="text-slate-500">
                If Title is empty, it will be auto-generated (e.g. Video 1, Photo 2, Motion 3).
              </span>
            </p>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
                dragOver ? 'border-[#DF1E3C] bg-[#DF1E3C]/5' : 'border-white/10 hover:border-white/30 bg-white/[0.02]'
              }`}
            >
              <Upload className="w-10 h-10 mx-auto mb-3 text-slate-400" />
              <p className="text-slate-300 font-medium">
                Drop your file here or <span className="text-[#DF1E3C] underline">browse</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">Supports .xlsx, .xls, .csv</p>
            </div>

            <input ref={fileInputRef} type="file" accept={ACCEPT} className="hidden" onChange={onFileChange} />
          </div>
        )}

        {/* Step 2: Preview */}
        {step === 'preview' && (
          <div className="space-y-4">
            {/* File info */}
            <div className="flex items-center gap-3 text-sm">
              <FileSpreadsheet className="w-5 h-5 text-green-400" />
              <span className="text-white font-medium">{fileName}</span>
              <span className="text-slate-400">
                — {rows.length} row{rows.length !== 1 ? 's' : ''} parsed
              </span>
              <button
                onClick={reset}
                className="ml-auto text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Change file
              </button>
            </div>

            {/* Detected headers */}
            <div className="text-xs text-slate-500">Headers: {rawHeaders.join(', ')}</div>

            {/* Validation summary */}
            <div className="flex items-center gap-4 text-sm">
              {errorCount > 0 && (
                <span className="flex items-center gap-1 text-red-400">
                  <AlertTriangle className="w-4 h-4" /> {errorCount} error{errorCount !== 1 ? 's' : ''}
                </span>
              )}
              {warnCount > 0 && (
                <span className="flex items-center gap-1 text-yellow-400">
                  <AlertTriangle className="w-4 h-4" /> {warnCount} warning{warnCount !== 1 ? 's' : ''}
                </span>
              )}
              {errorCount === 0 && warnCount === 0 && (
                <span className="flex items-center gap-1 text-green-400">
                  <CheckCircle2 className="w-4 h-4" /> All rows valid
                </span>
              )}
            </div>

            {/* Preview table */}
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-sm text-left">
                <thead className="bg-white/5 text-slate-400 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 w-8">#</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Main Idea</th>
                    <th className="px-4 py-3">Brief</th>
                    <th className="px-4 py-3">Notes</th>
                    <th className="px-4 py-3">Publish Date</th>
                    <th className="px-4 py-3">Links</th>
                    <th className="px-4 py-3">Carousel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {rows.map((row, idx) => {
                    const issues = rowIssues(idx);
                    const isError = rowHasError(idx);
                    const isWarn = !isError && rowHasWarn(idx);
                    return (
                      <tr
                        key={idx}
                        className={`${isError ? 'bg-red-500/5' : isWarn ? 'bg-yellow-500/5' : 'hover:bg-white/[0.02]'}`}
                      >
                        <td className="px-4 py-2 text-slate-500">{idx + 1}</td>
                        <td className="px-4 py-2">
                          {isError ? (
                            <span className="text-red-400" title={issues.map((i) => i.message).join('\n')}>
                              <AlertTriangle className="w-4 h-4" />
                            </span>
                          ) : isWarn ? (
                            <span className="text-yellow-400" title={issues.map((i) => i.message).join('\n')}>
                              <AlertTriangle className="w-4 h-4" />
                            </span>
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded ${
                              row.type === 'VIDEO'
                                ? 'bg-purple-500/20 text-purple-300'
                                : row.type === 'PHOTO'
                                  ? 'bg-blue-500/20 text-blue-300'
                                  : row.type === 'MOTION'
                                    ? 'bg-amber-500/20 text-amber-300'
                                    : 'bg-red-500/20 text-red-300'
                            }`}
                          >
                            {row.type || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-white max-w-[150px] truncate">
                          {row.title || <span className="text-red-400 italic">missing</span>}
                        </td>
                        <td className="px-4 py-2 text-slate-400 max-w-[120px] truncate">{row.mainIdea || '—'}</td>
                        <td className="px-4 py-2 text-slate-400 max-w-[120px] truncate">
                          {row.briefDescription || '—'}
                        </td>
                        <td className="px-4 py-2 text-slate-400 max-w-[100px] truncate">{row.notes || '—'}</td>
                        <td className="px-4 py-2 text-slate-300 font-mono text-xs">
                          {row.publishAt || <span className="text-red-400 italic">missing</span>}
                        </td>
                        <td className="px-4 py-2 text-slate-400 text-xs">
                          {row.referenceLinks.length > 0
                            ? `${row.referenceLinks.length} link${row.referenceLinks.length > 1 ? 's' : ''}`
                            : '—'}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {row.isCarousel ? <Layers className="w-4 h-4 text-indigo-400 inline" /> : ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Row-level errors detail */}
            {validations.length > 0 && (
              <div className="space-y-1 max-h-32 overflow-y-auto text-xs">
                {validations.map((v, i) => (
                  <div
                    key={i}
                    className={`px-3 py-1.5 rounded ${
                      v.severity === 'error' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'
                    }`}
                  >
                    Row {v.row + 1} · {v.field}: {v.message}
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={hasErrors || rows.length === 0}
                className="px-5 py-2.5 bg-gradient-to-r from-[#DF1E3C] to-[#b0152d] text-white rounded-xl hover:from-[#c01830] hover:to-[#901020] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-lg shadow-[#DF1E3C]/20"
              >
                <Upload className="w-4 h-4" />
                Import {rows.length} Item{rows.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Importing */}
        {step === 'importing' && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-[#DF1E3C]" />
            <p className="text-slate-300">Importing {rows.length} items…</p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default CreativeImportModal;
