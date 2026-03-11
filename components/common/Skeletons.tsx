/**
 * Reusable skeleton loading primitives and composed skeletons
 * for hub components. Used while Firestore subscriptions
 * are loading initial data.
 */
import React from 'react';

// ─── Primitives ─────────────────────────────────

interface SkeletonBoxProps {
  className?: string;
}

/** A single animated placeholder block */
export const SkeletonBox: React.FC<SkeletonBoxProps> = ({ className = '' }) => (
  <div className={`animate-pulse rounded bg-white/[0.06] ${className}`} />
);

/** A text-line placeholder (variable widths) */
export const SkeletonLine: React.FC<{ width?: string; className?: string }> = ({
  width = 'w-full',
  className = '',
}) => <SkeletonBox className={`h-3 ${width} ${className}`} />;

/** A stat card skeleton */
const SkeletonStatCard: React.FC = () => (
  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
    <SkeletonBox className="h-4 w-20" />
    <SkeletonBox className="h-8 w-16" />
    <SkeletonLine width="w-24" />
  </div>
);

/** A table row skeleton (n columns) */
const SkeletonTableRow: React.FC<{ cols?: number }> = ({ cols = 5 }) => (
  <div className="flex items-center gap-4 py-3 px-4 border-b border-white/[0.04]">
    <SkeletonBox className="h-8 w-8 rounded-full shrink-0" />
    {Array.from({ length: cols - 1 }).map((_, i) => (
      <SkeletonLine key={i} width={i === 0 ? 'w-40' : 'w-24'} />
    ))}
  </div>
);

/** A card skeleton (e.g. project card, task card) */
const SkeletonCard: React.FC = () => (
  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-3">
    <div className="flex items-center gap-3">
      <SkeletonBox className="h-10 w-10 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <SkeletonLine width="w-3/4" />
        <SkeletonLine width="w-1/2" />
      </div>
    </div>
    <div className="flex gap-2 pt-2">
      <SkeletonBox className="h-6 w-16 rounded-full" />
      <SkeletonBox className="h-6 w-20 rounded-full" />
    </div>
  </div>
);

/** A Kanban column skeleton */
const SkeletonKanbanColumn: React.FC = () => (
  <div className="w-72 shrink-0 space-y-3">
    <SkeletonBox className="h-6 w-24" />
    <SkeletonCard />
    <SkeletonCard />
  </div>
);

// ─── Composed Skeletons ─────────────────────────

/** Clients hub skeleton — stat cards + table */
export const ClientsHubSkeleton: React.FC = () => (
  <div className="space-y-6 p-6 animate-in fade-in duration-300">
    {/* Stat cards */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)}
    </div>
    {/* Search + filters */}
    <div className="flex items-center gap-3">
      <SkeletonBox className="h-10 flex-1 rounded-lg" />
      <SkeletonBox className="h-10 w-28 rounded-lg" />
    </div>
    {/* Table */}
    <div className="rounded-xl border border-white/[0.06] overflow-hidden">
      {Array.from({ length: 6 }).map((_, i) => <SkeletonTableRow key={i} cols={5} />)}
    </div>
  </div>
);

/** Projects hub skeleton — cards grid */
export const ProjectsHubSkeleton: React.FC = () => (
  <div className="space-y-6 p-6 animate-in fade-in duration-300">
    <div className="flex items-center gap-3">
      <SkeletonBox className="h-10 flex-1 rounded-lg" />
      <SkeletonBox className="h-10 w-32 rounded-lg" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  </div>
);

/** Tasks hub skeleton — kanban board */
export const TasksHubSkeleton: React.FC = () => (
  <div className="space-y-6 p-6 animate-in fade-in duration-300">
    <div className="flex items-center gap-3 mb-6">
      <SkeletonBox className="h-10 flex-1 rounded-lg" />
      <SkeletonBox className="h-10 w-28 rounded-lg" />
      <SkeletonBox className="h-10 w-28 rounded-lg" />
    </div>
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: 4 }).map((_, i) => <SkeletonKanbanColumn key={i} />)}
    </div>
  </div>
);

/** Finance hub skeleton — stat cards + table */
export const FinanceHubSkeleton: React.FC = () => (
  <div className="space-y-6 p-6 animate-in fade-in duration-300">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)}
    </div>
    <div className="flex items-center gap-3">
      <SkeletonBox className="h-9 w-24 rounded-lg" />
      <SkeletonBox className="h-9 w-24 rounded-lg" />
      <SkeletonBox className="h-9 w-24 rounded-lg" />
      <SkeletonBox className="h-9 w-24 rounded-lg" />
    </div>
    <div className="rounded-xl border border-white/[0.06] overflow-hidden">
      {Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={6} />)}
    </div>
  </div>
);

/** HR / Team hub skeleton — employee cards + sidebar */
export const TeamHubSkeleton: React.FC = () => (
  <div className="space-y-6 p-6 animate-in fade-in duration-300">
    <div className="flex gap-2 mb-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonBox key={i} className="h-9 w-24 rounded-lg" />
      ))}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
          <div className="flex items-center gap-3">
            <SkeletonBox className="h-12 w-12 rounded-full shrink-0" />
            <div className="space-y-2 flex-1">
              <SkeletonLine width="w-32" />
              <SkeletonLine width="w-20" />
            </div>
          </div>
          <SkeletonLine width="w-full" />
        </div>
      ))}
    </div>
  </div>
);

/** Generic hub skeleton — can be used for any route without a specific skeleton */
export const GenericHubSkeleton: React.FC = () => (
  <div className="space-y-6 p-6 animate-in fade-in duration-300">
    <div className="flex items-center gap-3">
      <SkeletonBox className="h-10 flex-1 rounded-lg" />
      <SkeletonBox className="h-10 w-28 rounded-lg" />
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)}
    </div>
    <div className="rounded-xl border border-white/[0.06] overflow-hidden">
      {Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} />)}
    </div>
  </div>
);
