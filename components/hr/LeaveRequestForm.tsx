import React, { useState, useMemo } from 'react';
import { LeavePolicy, LeaveBalance, LeaveType, User } from '../../types';
import { Send, Calendar, AlertCircle, Info } from 'lucide-react';

interface LeaveRequestFormProps {
  currentUserId: string;
  leavePolicies: LeavePolicy[];
  leaveBalances: LeaveBalance[];
  users: User[];
  onSubmit: (request: { type: LeaveType; startDate: string; endDate: string; reason: string }) => void;
}

const LeaveRequestForm: React.FC<LeaveRequestFormProps> = ({
  currentUserId,
  leavePolicies,
  leaveBalances,
  users,
  onSubmit,
}) => {
  const [leaveType, setLeaveType] = useState<LeaveType>('annual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const activePolicies = leavePolicies.filter(p => p.isActive);
  const userBalances = leaveBalances.filter(b => b.userId === currentUserId);

  const selectedBalance = userBalances.find(b => b.leaveType === leaveType);
  const selectedPolicy = activePolicies.find(p => p.leaveType === leaveType);

  const requestedDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) return 0;
    let count = 0;
    const d = new Date(start);
    while (d <= end) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) count++; // Exclude weekends
      d.setDate(d.getDate() + 1);
    }
    return count;
  }, [startDate, endDate]);

  const remaining = (selectedBalance?.totalAllowed || 0) - (selectedBalance?.used || 0) - (selectedBalance?.pending || 0);
  const hasEnoughBalance = leaveType === 'unpaid' || leaveType === 'emergency' || requestedDays <= remaining;

  const handleSubmit = () => {
    if (!startDate || !endDate || requestedDays === 0) return;
    onSubmit({ type: leaveType, startDate, endDate, reason });
    setSubmitted(true);
    setTimeout(() => {
      setLeaveType('annual');
      setStartDate('');
      setEndDate('');
      setReason('');
      setSubmitted(false);
    }, 2000);
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-iris-white">Request Leave</h3>

      {/* Balance Preview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {activePolicies.map(policy => {
          const bal = userBalances.find(b => b.leaveType === policy.leaveType);
          const used = bal?.used || 0;
          const pending = bal?.pending || 0;
          const total = bal?.totalAllowed || policy.maxDaysPerYear;
          const avail = total - used - pending;
          const isSelected = leaveType === policy.leaveType;

          return (
            <button
              key={policy.id}
              onClick={() => setLeaveType(policy.leaveType)}
              className={`p-3 rounded-xl border text-left transition ${
                isSelected
                  ? 'bg-iris-red/10 border-iris-red/30 ring-1 ring-iris-red/20'
                  : 'bg-iris-black/60 border-iris-white/10 hover:border-iris-white/20'
              }`}
            >
              <p className="text-xs text-iris-white/50 capitalize">{policy.leaveType}</p>
              <p className={`text-xl font-bold ${avail <= 0 ? 'text-red-400' : 'text-iris-white'}`}>{avail}</p>
              <p className="text-[10px] text-iris-white/30">of {total} remaining</p>
              {pending > 0 && <p className="text-[10px] text-yellow-400/70 mt-0.5">{pending} pending</p>}
            </button>
          );
        })}
      </div>

      {/* Form */}
      <div className="bg-iris-black/60 border border-iris-white/10 rounded-xl p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-iris-white/50">Start Date</label>
            <input
              type="date"
              value={startDate}
              min={today}
              onChange={e => {
                setStartDate(e.target.value);
                if (!endDate || e.target.value > endDate) setEndDate(e.target.value);
              }}
              className="w-full px-3 py-2 bg-iris-black/80 border border-iris-white/10 rounded-lg text-sm text-iris-white focus:ring-1 focus:ring-iris-red focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-iris-white/50">End Date</label>
            <input
              type="date"
              value={endDate}
              min={startDate || today}
              onChange={e => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-iris-black/80 border border-iris-white/10 rounded-lg text-sm text-iris-white focus:ring-1 focus:ring-iris-red focus:outline-none"
            />
          </div>
        </div>

        {requestedDays > 0 && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
            hasEnoughBalance ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
          }`}>
            {hasEnoughBalance ? <Info className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{requestedDays} working day{requestedDays !== 1 ? 's' : ''} requested</span>
            {!hasEnoughBalance && <span className="ml-1">— exceeds available balance ({remaining} days)</span>}
          </div>
        )}

        <div>
          <label className="text-xs text-iris-white/50">Reason</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            placeholder={selectedPolicy?.requiresApproval ? 'Provide a reason (required for approval)...' : 'Optional reason...'}
            className="w-full px-3 py-2 bg-iris-black/80 border border-iris-white/10 rounded-lg text-sm text-iris-white focus:ring-1 focus:ring-iris-red focus:outline-none resize-none"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!startDate || !endDate || requestedDays === 0 || submitted}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
            submitted
              ? 'bg-green-500/20 text-green-400'
              : 'bg-iris-red/20 text-iris-red hover:bg-iris-red/30 disabled:opacity-40'
          }`}
        >
          {submitted ? (
            <><Calendar className="w-4 h-4" /> Leave Request Submitted!</>
          ) : (
            <><Send className="w-4 h-4" /> Submit Leave Request</>
          )}
        </button>
      </div>
    </div>
  );
};

export default LeaveRequestForm;
