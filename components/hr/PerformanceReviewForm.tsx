import React, { useState } from 'react';
import { PerformanceReview, PerformanceScore, User } from '../../types';
import { Star, Save, Send } from 'lucide-react';

interface PerformanceReviewFormProps {
  review?: PerformanceReview;
  users: User[];
  currentUserId: string;
  checkPermission?: (code: string) => boolean;
  onSubmit: (review: Partial<PerformanceReview>) => void;
  onFinalize?: (reviewId: string) => void;
  onClose: () => void;
}

const SCORE_LABELS: Record<number, string> = {
  1: 'Needs Improvement',
  2: 'Below Expectations',
  3: 'Meets Expectations',
  4: 'Exceeds Expectations',
  5: 'Outstanding',
};

const DEFAULT_CATEGORIES = [
  'Quality of Work',
  'Productivity',
  'Communication',
  'Teamwork',
  'Initiative',
  'Reliability',
  'Problem Solving',
  'Leadership',
];

const PerformanceReviewForm: React.FC<PerformanceReviewFormProps> = ({
  review,
  users,
  currentUserId,
  checkPermission,
  onSubmit,
  onFinalize,
  onClose,
}) => {
  const canManage = checkPermission?.('hr.performance.manage');
  const isManager = review ? review.reviewerId === currentUserId : canManage;
  const isSelf = review ? review.userId === currentUserId : false;

  const [employeeId, setEmployeeId] = useState(review?.userId || '');
  const [period, setPeriod] = useState(review?.period || '');
  const [selfScores, setSelfScores] = useState<PerformanceScore[]>(
    review?.selfAssessment || DEFAULT_CATEGORIES.map(c => ({ category: c, score: 0, comments: '' }))
  );
  const [managerScores, setManagerScores] = useState<PerformanceScore[]>(
    review?.managerAssessment || DEFAULT_CATEGORIES.map(c => ({ category: c, score: 0, comments: '' }))
  );
  const [goals, setGoals] = useState(review?.goals?.join('\n') || '');
  const [overallComments, setOverallComments] = useState(review?.overallComments || '');

  const updateScore = (
    scores: PerformanceScore[],
    setScores: React.Dispatch<React.SetStateAction<PerformanceScore[]>>,
    category: string,
    field: 'score' | 'comments',
    value: number | string
  ) => {
    setScores(prev => prev.map(s => s.category === category ? { ...s, [field]: value } : s));
  };

  const handleSubmit = () => {
    onSubmit({
      ...(review || {}),
      userId: employeeId || review?.userId || '',
      reviewerId: currentUserId,
      period,
      selfAssessment: isSelf || !review ? selfScores : review?.selfAssessment,
      managerAssessment: isManager ? managerScores : review?.managerAssessment,
      goals: goals.split('\n').filter(g => g.trim()),
      overallComments,
    });
  };

  const renderScoreInput = (
    scores: PerformanceScore[],
    setScores: React.Dispatch<React.SetStateAction<PerformanceScore[]>>,
    editable: boolean
  ) => (
    <div className="space-y-3">
      {scores.map(score => (
        <div key={score.category} className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-iris-white">{score.category}</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  disabled={!editable}
                  onClick={() => updateScore(scores, setScores, score.category, 'score', n)}
                  className={`w-7 h-7 rounded-full text-xs font-bold transition ${
                    n <= score.score
                      ? 'bg-iris-red text-white'
                      : 'bg-iris-black/60 text-iris-white/30 hover:text-iris-white/60'
                  } ${!editable ? 'opacity-60 cursor-default' : 'cursor-pointer'}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          {score.score > 0 && (
            <span className="text-[10px] text-iris-white/30">{SCORE_LABELS[score.score]}</span>
          )}
          <input
            disabled={!editable}
            value={score.comments}
            onChange={e => updateScore(scores, setScores, score.category, 'comments', e.target.value)}
            placeholder="Comments..."
            className="w-full px-3 py-1 bg-iris-black/80 border border-iris-white/5 rounded-lg text-xs text-iris-white disabled:opacity-50 focus:ring-1 focus:ring-iris-red focus:outline-none"
          />
        </div>
      ))}
    </div>
  );

  const averageScore = (scores: PerformanceScore[]) => {
    const rated = scores.filter(s => s.score > 0);
    return rated.length > 0 ? (rated.reduce((sum, s) => sum + s.score, 0) / rated.length).toFixed(1) : '—';
  };

  return (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
      {/* Employee + Period */}
      {!review && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-iris-white/50">Employee</label>
            <select value={employeeId} onChange={e => setEmployeeId(e.target.value)} className="w-full px-3 py-2 bg-iris-black/80 border border-iris-white/10 rounded-lg text-sm text-iris-white focus:ring-1 focus:ring-iris-red focus:outline-none">
              <option value="">Select Employee</option>
              {users.filter(u => u.status !== 'inactive' && u.id !== currentUserId).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-iris-white/50">Review Period</label>
            <input value={period} onChange={e => setPeriod(e.target.value)} placeholder="e.g. Q1 2025" className="w-full px-3 py-2 bg-iris-black/80 border border-iris-white/10 rounded-lg text-sm text-iris-white focus:ring-1 focus:ring-iris-red focus:outline-none" />
          </div>
        </div>
      )}

      {review && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-iris-white/50">Employee: <strong className="text-iris-white">{users.find(u => u.id === review.userId)?.name}</strong></span>
          <span className="text-xs text-iris-white/30">Period: {review.period}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            review.status === 'finalized' ? 'bg-green-500/10 text-green-400' :
            review.status === 'submitted' ? 'bg-blue-500/10 text-blue-400' :
            'bg-yellow-500/10 text-yellow-400'
          }`}>{review.status}</span>
        </div>
      )}

      {/* Self Assessment */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-iris-white/80 flex items-center gap-2">
            <Star className="w-4 h-4 text-iris-red" /> Self Assessment
          </h4>
          <span className="text-xs text-iris-white/30">Average: {averageScore(selfScores)}</span>
        </div>
        {renderScoreInput(selfScores, setSelfScores, isSelf || !review)}
      </div>

      {/* Manager Assessment */}
      {(isManager || review?.status === 'finalized') && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-iris-white/80 flex items-center gap-2">
              <Star className="w-4 h-4 text-iris-red" /> Manager Assessment
            </h4>
            <span className="text-xs text-iris-white/30">Average: {averageScore(managerScores)}</span>
          </div>
          {renderScoreInput(managerScores, setManagerScores, isManager && review?.status !== 'finalized')}
        </div>
      )}

      {/* Goals */}
      <div>
        <label className="text-xs text-iris-white/50">Goals (one per line)</label>
        <textarea
          value={goals}
          onChange={e => setGoals(e.target.value)}
          rows={3}
          disabled={review?.status === 'finalized'}
          className="w-full px-3 py-2 bg-iris-black/80 border border-iris-white/10 rounded-lg text-sm text-iris-white focus:ring-1 focus:ring-iris-red focus:outline-none resize-none disabled:opacity-50"
        />
      </div>

      {/* Overall Comments */}
      <div>
        <label className="text-xs text-iris-white/50">Overall Comments</label>
        <textarea
          value={overallComments}
          onChange={e => setOverallComments(e.target.value)}
          rows={2}
          disabled={review?.status === 'finalized'}
          className="w-full px-3 py-2 bg-iris-black/80 border border-iris-white/10 rounded-lg text-sm text-iris-white focus:ring-1 focus:ring-iris-red focus:outline-none resize-none disabled:opacity-50"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="px-4 py-2 bg-iris-white/10 text-iris-white/60 rounded-lg text-sm hover:bg-iris-white/20">Cancel</button>
        {review?.status !== 'finalized' && (
          <button onClick={handleSubmit} className="flex items-center gap-2 px-4 py-2 bg-iris-red/20 text-iris-red rounded-lg text-sm font-medium hover:bg-iris-red/30">
            <Save className="w-4 h-4" /> Save
          </button>
        )}
        {isManager && review?.status === 'submitted' && onFinalize && (
          <button onClick={() => onFinalize(review.id)} className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm font-medium hover:bg-green-500/30">
            <Send className="w-4 h-4" /> Finalize
          </button>
        )}
      </div>
    </div>
  );
};

export default PerformanceReviewForm;
