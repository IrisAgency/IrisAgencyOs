import React, { useMemo, useState } from 'react';
import { PerformanceReview, User, PerformanceReviewStatus } from '../../types';
import { Star, Plus, Filter, Eye, FileText } from 'lucide-react';

interface PerformanceReviewListProps {
  performanceReviews: PerformanceReview[];
  users: User[];
  currentUserId: string;
  checkPermission?: (code: string) => boolean;
  onSelectReview: (review: PerformanceReview) => void;
  onCreateReview: () => void;
}

const PerformanceReviewList: React.FC<PerformanceReviewListProps> = ({
  performanceReviews,
  users,
  currentUserId,
  checkPermission,
  onSelectReview,
  onCreateReview,
}) => {
  const [statusFilter, setStatusFilter] = useState<PerformanceReviewStatus | 'all'>('all');
  const canManage = checkPermission?.('hr.performance.manage');
  const canViewAll = checkPermission?.('hr.performance.view_all');

  const filteredReviews = useMemo(() => {
    let reviews = [...performanceReviews].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (!canViewAll) {
      reviews = reviews.filter(r => r.employeeId === currentUserId || r.reviewerId === currentUserId);
    }

    if (statusFilter !== 'all') {
      reviews = reviews.filter(r => r.status === statusFilter);
    }

    return reviews;
  }, [performanceReviews, statusFilter, canViewAll, currentUserId]);

  const stats = useMemo(() => ({
    total: performanceReviews.length,
    draft: performanceReviews.filter(r => r.status === 'draft').length,
    submitted: performanceReviews.filter(r => r.status === 'submitted').length,
    finalized: performanceReviews.filter(r => r.status === 'finalized').length,
  }), [performanceReviews]);

  const getAverage = (review: PerformanceReview) => {
    const scores = review.managerAssessment?.length ? review.managerAssessment : review.selfAssessment;
    if (!scores?.length) return null;
    const rated = scores.filter(s => s.score > 0);
    return rated.length > 0 ? (rated.reduce((s, r) => s + r.score, 0) / rated.length) : null;
  };

  const statusColors: Record<PerformanceReviewStatus, string> = {
    draft: 'bg-gray-500/10 text-gray-400',
    submitted: 'bg-blue-500/10 text-blue-400',
    acknowledged: 'bg-cyan-500/10 text-cyan-400',
    'in-review': 'bg-yellow-500/10 text-yellow-400',
    finalized: 'bg-green-500/10 text-green-400',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-iris-white">Performance Reviews</h3>
        {canManage && (
          <button onClick={onCreateReview} className="flex items-center gap-2 px-3 py-1.5 bg-iris-red/20 text-iris-red rounded-lg text-xs font-medium hover:bg-iris-red/30">
            <Plus className="w-3.5 h-3.5" /> New Review
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-iris-black/60 border border-iris-white/10 rounded-xl p-3 text-center">
          <span className="text-xl font-bold text-iris-white">{stats.total}</span>
          <p className="text-xs text-iris-white/40">Total</p>
        </div>
        <div className="bg-gray-500/10 border border-gray-500/20 rounded-xl p-3 text-center">
          <span className="text-xl font-bold text-gray-400">{stats.draft}</span>
          <p className="text-xs text-gray-400/70">Drafts</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
          <span className="text-xl font-bold text-blue-400">{stats.submitted}</span>
          <p className="text-xs text-blue-400/70">Submitted</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
          <span className="text-xl font-bold text-green-400">{stats.finalized}</span>
          <p className="text-xs text-green-400/70">Finalized</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 items-center">
        <Filter className="w-4 h-4 text-iris-white/40" />
        {(['all', 'draft', 'submitted', 'in-review', 'finalized'] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1 rounded-lg text-xs font-medium capitalize ${statusFilter === s ? 'bg-iris-red/20 text-iris-red' : 'bg-iris-black/60 text-iris-white/50 hover:text-iris-white/80'}`}>
            {s === 'in-review' ? 'In Review' : s}
          </button>
        ))}
      </div>

      {/* Reviews */}
      <div className="space-y-2">
        {filteredReviews.length === 0 ? (
          <div className="text-center py-10 text-iris-white/30 text-sm">No performance reviews found</div>
        ) : (
          filteredReviews.map(review => {
            const employee = users.find(u => u.id === review.employeeId);
            const reviewer = users.find(u => u.id === review.reviewerId);
            const avg = getAverage(review);

            return (
              <button
                key={review.id}
                onClick={() => onSelectReview(review)}
                className="w-full bg-iris-black/60 border border-iris-white/10 rounded-xl p-4 flex items-center gap-4 hover:border-iris-white/20 transition text-left"
              >
                <img src={employee?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(employee?.name || '?')}&size=36&background=random`} alt="" className="w-9 h-9 rounded-full" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-iris-white">{employee?.name || 'Unknown'}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[review.status]}`}>
                      {review.status}
                    </span>
                  </div>
                  <div className="flex gap-3 text-xs text-iris-white/40">
                    <span>Period: {review.period}</span>
                    <span>Reviewer: {reviewer?.name || '—'}</span>
                  </div>
                </div>
                {avg !== null && (
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="text-lg font-bold text-iris-white">{avg.toFixed(1)}</span>
                  </div>
                )}
                <Eye className="w-4 h-4 text-iris-white/30" />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PerformanceReviewList;
