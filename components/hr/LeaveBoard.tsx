import React, { useState, useMemo } from 'react';
import { LeaveRequest, User, LeaveBalance, LeavePolicy } from '../../types';
import { Check, X, Clock, Calendar, Filter, MessageSquare } from 'lucide-react';
import HRStatusBadge from './HRStatusBadge';

interface LeaveBoardProps {
  leaveRequests: LeaveRequest[];
  users: User[];
  leaveBalances: LeaveBalance[];
  leavePolicies: LeavePolicy[];
  currentUserId: string;
  checkPermission?: (code: string) => boolean;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onCancel: (id: string) => void;
}

const LeaveBoard: React.FC<LeaveBoardProps> = ({
  leaveRequests,
  users,
  leaveBalances,
  leavePolicies,
  currentUserId,
  checkPermission,
  onApprove,
  onReject,
  onCancel,
}) => {
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'cancelled' | 'all'>('pending');
  const [rejectionModal, setRejectionModal] = useState<{ requestId: string; reason: string } | null>(null);

  const canApprove = checkPermission?.('hr.leave.approve');
  const canViewAll = checkPermission?.('hr.leave.view_all');
  const canViewDept = checkPermission?.('hr.leave.view_dept');

  const filteredRequests = useMemo(() => {
    let requests = [...leaveRequests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (!canViewAll && !canViewDept) {
      requests = requests.filter(r => r.userId === currentUserId);
    }

    if (statusFilter !== 'all') {
      requests = requests.filter(r => r.status === statusFilter);
    }

    return requests;
  }, [leaveRequests, statusFilter, canViewAll, canViewDept, currentUserId]);

  const stats = useMemo(() => ({
    pending: leaveRequests.filter(r => r.status === 'pending').length,
    approved: leaveRequests.filter(r => r.status === 'approved').length,
    rejected: leaveRequests.filter(r => r.status === 'rejected').length,
  }), [leaveRequests]);

  const getUserName = (id: string) => users.find(u => u.id === id)?.name || 'Unknown';
  const getUserAvatar = (id: string) => {
    const u = users.find(u => u.id === id);
    return u?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u?.name || '?')}&background=random&size=32`;
  };

  const handleReject = () => {
    if (rejectionModal) {
      onReject(rejectionModal.requestId, rejectionModal.reason);
      setRejectionModal(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-center">
          <span className="text-2xl font-bold text-yellow-400">{stats.pending}</span>
          <p className="text-xs text-yellow-400/70">Pending</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
          <span className="text-2xl font-bold text-green-400">{stats.approved}</span>
          <p className="text-xs text-green-400/70">Approved</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
          <span className="text-2xl font-bold text-red-400">{stats.rejected}</span>
          <p className="text-xs text-red-400/70">Rejected</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 items-center">
        <Filter className="w-4 h-4 text-iris-white/40" />
        {(['all', 'pending', 'approved', 'rejected', 'cancelled'] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1 rounded-lg text-xs font-medium capitalize ${statusFilter === s ? 'bg-iris-red/20 text-iris-red' : 'bg-iris-black/60 text-iris-white/50 hover:text-iris-white/80'}`}>
            {s} {s === 'pending' && stats.pending > 0 ? `(${stats.pending})` : ''}
          </button>
        ))}
      </div>

      {/* Requests List */}
      <div className="space-y-2">
        {filteredRequests.length === 0 ? (
          <div className="text-center py-10 text-iris-white/30 text-sm">No leave requests found</div>
        ) : (
          filteredRequests.map(req => (
            <div key={req.id} className="bg-iris-black/60 border border-iris-white/10 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <img src={getUserAvatar(req.userId)} alt="" className="w-8 h-8 rounded-full" />
                <div className="flex-1">
                  <span className="text-sm font-bold text-iris-white">{getUserName(req.userId)}</span>
                  <div className="flex gap-2 items-center">
                    <span className="text-xs text-iris-white/50 capitalize">{req.type} Leave</span>
                    <HRStatusBadge type="leave" status={req.status} size="sm" />
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-iris-white">{req.totalDays || '—'} day{(req.totalDays || 0) !== 1 ? 's' : ''}</span>
                  <p className="text-xs text-iris-white/40">{new Date(req.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-iris-white/50">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {req.startDate} → {req.endDate}</span>
              </div>

              {req.reason && (
                <p className="text-xs text-iris-white/60 bg-iris-black/40 px-3 py-2 rounded-lg">{req.reason}</p>
              )}

              {req.rejectionReason && (
                <p className="text-xs text-red-400/80 bg-red-500/10 px-3 py-2 rounded-lg">
                  <strong>Rejection Reason:</strong> {req.rejectionReason}
                </p>
              )}

              {/* Actions */}
              {canApprove && req.status === 'pending' && (
                <div className="flex gap-2 pt-1">
                  <button onClick={() => onApprove(req.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-xs font-medium hover:bg-green-500/30">
                    <Check className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button onClick={() => setRejectionModal({ requestId: req.id, reason: '' })} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-xs font-medium hover:bg-red-500/30">
                    <X className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              )}

              {req.userId === currentUserId && req.status === 'pending' && (
                <button onClick={() => onCancel(req.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-iris-white/10 text-iris-white/60 rounded-lg text-xs font-medium hover:bg-iris-white/20">
                  <X className="w-3.5 h-3.5" /> Cancel Request
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Rejection Modal */}
      {rejectionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-iris-black border border-iris-white/10 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-iris-white">Reject Leave Request</h3>
            <textarea
              value={rejectionModal.reason}
              onChange={e => setRejectionModal(prev => prev ? { ...prev, reason: e.target.value } : null)}
              placeholder="Provide a reason for rejection..."
              rows={3}
              className="w-full px-3 py-2 bg-iris-black/80 border border-iris-white/10 rounded-lg text-sm text-iris-white focus:ring-1 focus:ring-iris-red focus:outline-none resize-none"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setRejectionModal(null)} className="px-4 py-2 bg-iris-white/10 text-iris-white/60 rounded-lg text-sm hover:bg-iris-white/20">Cancel</button>
              <button onClick={handleReject} disabled={!rejectionModal.reason.trim()} className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 disabled:opacity-40">Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveBoard;
