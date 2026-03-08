import React from 'react';
import type { EmploymentStatus, LeaveRequestStatus, AttendanceStatus, ReviewStatus, EmployeeAssetStatus, ChecklistStatus } from '../../types';

type BadgeVariant = EmploymentStatus | LeaveRequestStatus | AttendanceStatus | ReviewStatus | EmployeeAssetStatus | ChecklistStatus | string;

const BADGE_STYLES: Record<string, string> = {
  // Employment Status
  'active': 'bg-emerald-500/20 text-emerald-400 border-emerald-400/30',
  'probation': 'bg-amber-500/20 text-amber-400 border-amber-400/30',
  'on-leave': 'bg-blue-500/20 text-blue-400 border-blue-400/30',
  'suspended': 'bg-rose-500/20 text-rose-400 border-rose-400/30',
  'resigned': 'bg-slate-500/20 text-slate-400 border-slate-400/30',
  'terminated': 'bg-red-500/20 text-red-400 border-red-400/30',
  // Leave Request Status
  'pending': 'bg-amber-500/20 text-amber-400 border-amber-400/30',
  'approved': 'bg-emerald-500/20 text-emerald-400 border-emerald-400/30',
  'rejected': 'bg-rose-500/20 text-rose-400 border-rose-400/30',
  'cancelled': 'bg-slate-500/20 text-slate-400 border-slate-400/30',
  // Attendance Status
  'present': 'bg-emerald-500/20 text-emerald-400 border-emerald-400/30',
  'absent': 'bg-rose-500/20 text-rose-400 border-rose-400/30',
  'late': 'bg-amber-500/20 text-amber-400 border-amber-400/30',
  'remote': 'bg-blue-500/20 text-blue-400 border-blue-400/30',
  'on_leave': 'bg-blue-500/20 text-blue-400 border-blue-400/30',
  'holiday': 'bg-purple-500/20 text-purple-400 border-purple-400/30',
  'half-day': 'bg-amber-500/20 text-amber-400 border-amber-400/30',
  // Review Status
  'draft': 'bg-slate-500/20 text-slate-400 border-slate-400/30',
  'submitted': 'bg-blue-500/20 text-blue-400 border-blue-400/30',
  'acknowledged': 'bg-amber-500/20 text-amber-400 border-amber-400/30',
  'finalized': 'bg-emerald-500/20 text-emerald-400 border-emerald-400/30',
  // Asset Status
  'assigned': 'bg-blue-500/20 text-blue-400 border-blue-400/30',
  'returned': 'bg-emerald-500/20 text-emerald-400 border-emerald-400/30',
  'lost': 'bg-rose-500/20 text-rose-400 border-rose-400/30',
  'damaged': 'bg-amber-500/20 text-amber-400 border-amber-400/30',
  // Checklist Status
  'not_started': 'bg-slate-500/20 text-slate-400 border-slate-400/30',
  'in_progress': 'bg-blue-500/20 text-blue-400 border-blue-400/30',
  'completed': 'bg-emerald-500/20 text-emerald-400 border-emerald-400/30',
};

interface HRStatusBadgeProps {
  status: BadgeVariant;
  type?: 'employment' | 'leave' | 'attendance' | 'review' | 'asset' | 'checklist';
  size?: 'sm' | 'md';
}

const HRStatusBadge: React.FC<HRStatusBadgeProps> = ({ status, size = 'sm' }) => {
  const style = BADGE_STYLES[status] || 'bg-slate-500/20 text-slate-400 border-slate-400/30';
  const label = status.replace(/[-_]/g, ' ');

  return (
    <span className={`inline-flex items-center uppercase font-bold border rounded-full ${style} ${size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'}`}>
      {label}
    </span>
  );
};

export default HRStatusBadge;
