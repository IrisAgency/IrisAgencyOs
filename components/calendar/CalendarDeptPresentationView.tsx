import React, { useState, useMemo, useCallback } from 'react';
import type {
  CalendarMonth,
  CalendarItem,
  Client,
  CalendarContentType,
  CreativeProject,
  CreativeCalendar,
  User,
} from '../../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

import {
  Calendar,
  Presentation,
  Search,
  X,
  ArrowLeft,
  Printer,
  ChevronDown,
  LayoutGrid,
  FileText as FileTextIcon,
  Share2,
} from 'lucide-react';

import {
  TYPE_OPTIONS,
  PRINT_STYLES,
  PresentationItem,
  DrivePreviewModal,
  EditorialRow,
} from '../../utils/presentationHelpers';

import InstagramGridView from '../common/InstagramGridView';
import GridItemDetailModal from '../common/GridItemDetailModal';
import ShareLinkManager from '../creative/ShareLinkManager';

// ============================================================================
// PRESENTATION ITEM MAPPER
// ============================================================================

function calItemToPres(item: CalendarItem): PresentationItem {
  return {
    id: item.id,
    type: item.type,
    title: item.autoName || `${item.type}-${String(item.seqNumber).padStart(2, '0')}`,
    brief: item.primaryBrief || '',
    notes: item.notes || '',
    publishAt: item.publishAt || '',
    referenceLinks: item.referenceLinks || [],
    referenceFiles: item.referenceFiles || [],
    seqLabel: `${item.type}-${String(item.seqNumber).padStart(2, '0')}`,
    pinnedInGrid: item.pinnedInGrid || null,
    presentationNotes: item.presentationNotes || '',
    contentComments: item.contentComments || [],
    isCarousel: item.isCarousel || false,
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface CalendarDeptPresentationViewProps {
  calendarMonths: CalendarMonth[];
  calendarItems: CalendarItem[];
  clients: Client[];
  creativeProjects: CreativeProject[];
  creativeCalendars: CreativeCalendar[];
  currentUser: User;
  onBack: () => void;
}

const CalendarDeptPresentationView: React.FC<CalendarDeptPresentationViewProps> = ({
  calendarMonths,
  calendarItems,
  clients,
  creativeProjects,
  creativeCalendars,
  currentUser,
  onBack,
}) => {
  const [filterType, setFilterType] = useState<CalendarContentType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonthId, setSelectedMonthId] = useState<string | null>(null);
  const [driveModal, setDriveModal] = useState<{ url: string; title: string } | null>(null);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [showShareManager, setShowShareManager] = useState(false);

  // View mode: editorial (default) or grid (Instagram)
  const [viewMode, setViewMode] = useState<'editorial' | 'grid'>('editorial');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Grid item detail modal
  const [gridDetailItem, setGridDetailItem] = useState<PresentationItem | null>(null);

  useMemo(() => {
    const id = 'cal-dept-print-css';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = PRINT_STYLES;
      document.head.appendChild(style);
    }
  }, []);

  // Active (non-archived) months, sorted newest first
  const activeMonths = useMemo(
    () => calendarMonths.filter((m) => !m.isArchived).sort((a, b) => b.monthKey.localeCompare(a.monthKey)),
    [calendarMonths],
  );

  // Auto-select first month
  useMemo(() => {
    if (!selectedMonthId && activeMonths.length > 0) {
      setSelectedMonthId(activeMonths[0].id);
    }
  }, [activeMonths, selectedMonthId]);

  const selectedMonth = activeMonths.find((m) => m.id === selectedMonthId);
  const selectedClient = selectedMonth ? clients.find((c) => c.id === selectedMonth.clientId) : null;

  // Build presentation items
  const presentationItems = useMemo((): PresentationItem[] => {
    if (!selectedMonth) return [];
    return calendarItems
      .filter((i) => i.calendarMonthId === selectedMonth.id)
      .sort((a, b) => (a.publishAt || a.createdAt).localeCompare(b.publishAt || b.createdAt))
      .map(calItemToPres);
  }, [selectedMonth, calendarItems]);

  // Filtered
  const filteredItems = useMemo(() => {
    let items = presentationItems;
    if (filterType !== 'ALL') items = items.filter((i) => i.type === filterType);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(
        (i) =>
          i.title?.toLowerCase().includes(q) ||
          i.brief?.toLowerCase().includes(q) ||
          i.notes?.toLowerCase().includes(q),
      );
    }
    return items;
  }, [presentationItems, filterType, searchQuery]);

  const typeCounts = useMemo(() => {
    const c: Record<string, number> = { ALL: presentationItems.length };
    for (const item of presentationItems) c[item.type] = (c[item.type] || 0) + 1;
    return c;
  }, [presentationItems]);

  const handleDriveClick = (url: string, title: string) => setDriveModal({ url, title });

  // Save presentation notes to Firestore
  const handleSaveNotes = useCallback(async (itemId: string, notes: string) => {
    await updateDoc(doc(db, 'calendar_items', itemId), { presentationNotes: notes });
  }, []);

  // Empty
  if (activeMonths.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <button
            onClick={onBack}
            className="no-print inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Calendar Department
          </button>
          <div className="text-center py-20">
            <Presentation className="w-12 h-12 mx-auto text-gray-200 mb-4" />
            <h3 className="text-lg font-semibold text-gray-400">No Active Calendar Months</h3>
            <p className="text-sm text-gray-300 mt-2 max-w-md mx-auto">
              Create a calendar month to see it here as an editorial schedule.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {driveModal && (
        <DrivePreviewModal url={driveModal.url} title={driveModal.title} onClose={() => setDriveModal(null)} />
      )}

      {gridDetailItem && (
        <GridItemDetailModal
          item={gridDetailItem}
          onClose={() => setGridDetailItem(null)}
          onDriveClick={handleDriveClick}
          onSaveNotes={handleSaveNotes}
        />
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* HEADER BAR */}
        <div className="no-print flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-700 transition-colors self-start"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
              <button
                onClick={() => setViewMode('editorial')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  viewMode === 'editorial'
                    ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <FileTextIcon className="w-3.5 h-3.5" /> Editorial
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Grid
              </button>
            </div>
            <button
              onClick={() => setShowShareManager(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-blue-200 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" /> Share
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
          </div>
        </div>

        {/* Share Link Manager Modal */}
        {showShareManager &&
          selectedMonth &&
          (() => {
            const matchingCalendar = creativeCalendars.find(
              (c) => c.clientId === selectedMonth.clientId && c.monthKey === selectedMonth.monthKey,
            );
            const matchingProject = matchingCalendar
              ? creativeProjects.find((p) => p.id === matchingCalendar.creativeProjectId)
              : null;
            if (!matchingCalendar || !matchingProject)
              return (
                <div
                  className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                  onClick={() => setShowShareManager(false)}
                >
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                  <div
                    className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-sm text-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="text-sm text-gray-600 mb-4">
                      No linked creative project found for this calendar month. Share links require a creative project.
                    </p>
                    <button
                      onClick={() => setShowShareManager(false)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              );
            return (
              <ShareLinkManager
                creativeProjectId={matchingProject.id}
                creativeCalendarId={matchingCalendar.id}
                calendarMonthId={selectedMonth.id}
                clientId={selectedMonth.clientId}
                currentUserId={currentUser.id}
                onClose={() => setShowShareManager(false)}
              />
            );
          })()}

        {/* MASTHEAD */}
        <header className="mb-10 border-b-2 border-gray-900 pb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900 uppercase">
                {selectedClient?.name || 'Client'}
              </h1>
              <p className="text-sm text-gray-400 mt-1 font-medium tracking-wide uppercase">
                Content Calendar · {selectedMonth?.monthKey || ''}
              </p>
            </div>

            {activeMonths.length > 1 && (
              <div className="relative no-print w-full sm:w-auto">
                <button
                  onClick={() => setSelectorOpen(!selectorOpen)}
                  className="w-full sm:w-auto flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <Calendar className="w-4 h-4 shrink-0" />
                  <span className="truncate">{selectedClient?.name || 'Client'}</span>
                  <span className="text-gray-300 shrink-0">·</span>
                  <span className="shrink-0">{selectedMonth?.monthKey || ''}</span>
                  <ChevronDown
                    className={`w-4 h-4 shrink-0 transition-transform ${selectorOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {selectorOpen && (
                  <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-1 w-full sm:w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1 max-h-64 overflow-y-auto">
                    {activeMonths.map((month) => {
                      const client = clients.find((c) => c.id === month.clientId);
                      const isActive = month.id === selectedMonthId;
                      return (
                        <button
                          key={month.id}
                          onClick={() => {
                            setSelectedMonthId(month.id);
                            setSelectorOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${isActive ? 'bg-gray-100 font-medium text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                          {client?.name || 'Client'} · {month.monthKey}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-1 mt-4 text-xs text-gray-400 font-medium uppercase tracking-wider">
            <span>{presentationItems.length} Items</span>
            {typeCounts['VIDEO'] ? <span>{typeCounts['VIDEO']} Video</span> : null}
            {typeCounts['PHOTO'] ? <span>{typeCounts['PHOTO']} Photo</span> : null}
            {typeCounts['MOTION'] ? <span>{typeCounts['MOTION']} Motion</span> : null}
          </div>
        </header>

        {/* FILTERS */}
        <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center mb-6">
          <div className="flex flex-wrap gap-1.5">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilterType(opt.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors border ${
                  filterType === opt.value
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-400 border-gray-200 hover:text-gray-700 hover:border-gray-400'
                }`}
              >
                {opt.label}
                {typeCounts[opt.value] !== undefined && (
                  <span className="ml-1 opacity-60">({typeCounts[opt.value]})</span>
                )}
              </button>
            ))}
          </div>
          <div className="flex-1 min-w-0 sm:max-w-xs ml-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-lg border border-gray-200 text-gray-800 text-sm placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-300 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* CONTENT AREA — EDITORIAL or GRID */}
        {filteredItems.length === 0 ? (
          <div className="py-20 text-center">
            <Search className="w-8 h-8 mx-auto text-gray-200 mb-3" />
            <p className="text-sm text-gray-400">
              {searchQuery || filterType !== 'ALL' ? 'No items match your filters.' : 'No items in this calendar.'}
            </p>
          </div>
        ) : viewMode === 'editorial' ? (
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
            <div className="hidden sm:grid sm:grid-cols-[120px_1fr_300px] gap-0 bg-gray-50 border-b border-gray-200 text-[11px] font-bold uppercase tracking-widest text-gray-400">
              <div className="py-3 px-4">Date</div>
              <div className="py-3 px-5">Content</div>
              <div className="py-3 px-4 border-l border-gray-200">Media</div>
            </div>
            {filteredItems.map((item) => (
              <EditorialRow key={item.id} item={item} onDriveClick={handleDriveClick} />
            ))}
          </div>
        ) : (
          <InstagramGridView
            items={filteredItems}
            sortDirection={sortDirection}
            onSortToggle={() => setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))}
            onItemClick={(item) => setGridDetailItem(item)}
          />
        )}

        {/* FOOTER */}
        <footer className="mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[11px] text-gray-300 uppercase tracking-wider">
          <span>
            {viewMode === 'editorial' ? 'Editorial Schedule' : 'Instagram Grid'} · {selectedClient?.name}
          </span>
          <span>
            {selectedMonth?.monthKey} · {presentationItems.length} Items
          </span>
        </footer>
      </div>
    </div>
  );
};

export default CalendarDeptPresentationView;
