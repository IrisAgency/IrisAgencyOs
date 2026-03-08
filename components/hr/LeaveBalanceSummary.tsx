import React from 'react';
import { LeaveBalance, LeavePolicy } from '../../types';
import { TrendingDown, TrendingUp } from 'lucide-react';

interface LeaveBalanceSummaryProps {
  userId: string;
  leaveBalances: LeaveBalance[];
  leavePolicies: LeavePolicy[];
}

const LeaveBalanceSummary: React.FC<LeaveBalanceSummaryProps> = ({
  userId,
  leaveBalances,
  leavePolicies,
}) => {
  const activePolicies = leavePolicies.filter(p => p.isActive);
  const userBalances = leaveBalances.filter(b => b.userId === userId);

  const typeColor: Record<string, { bg: string; text: string; bar: string }> = {
    annual: { bg: 'bg-blue-500/10', text: 'text-blue-400', bar: 'bg-blue-500' },
    sick: { bg: 'bg-red-500/10', text: 'text-red-400', bar: 'bg-red-500' },
    unpaid: { bg: 'bg-gray-500/10', text: 'text-gray-400', bar: 'bg-gray-500' },
    emergency: { bg: 'bg-orange-500/10', text: 'text-orange-400', bar: 'bg-orange-500' },
    maternity: { bg: 'bg-pink-500/10', text: 'text-pink-400', bar: 'bg-pink-500' },
    paternity: { bg: 'bg-purple-500/10', text: 'text-purple-400', bar: 'bg-purple-500' },
    compensatory: { bg: 'bg-teal-500/10', text: 'text-teal-400', bar: 'bg-teal-500' },
    personal: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', bar: 'bg-yellow-500' },
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-bold text-iris-white/80">Leave Balances</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {activePolicies.map(policy => {
          const bal = userBalances.find(b => b.leaveType === policy.leaveType);
          const total = bal?.totalAllowed || policy.maxDaysPerYear;
          const used = bal?.used || 0;
          const pending = bal?.pending || 0;
          const carriedOver = bal?.carriedOver || 0;
          const available = total - used - pending;
          const usedPct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
          const pendingPct = total > 0 ? Math.min((pending / total) * 100, 100) : 0;
          const colors = typeColor[policy.leaveType] || typeColor.annual;

          return (
            <div key={policy.id} className={`${colors.bg} border border-iris-white/5 rounded-xl p-4 space-y-2`}>
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium capitalize ${colors.text}`}>{policy.leaveType}</span>
                <span className="text-xs text-iris-white/40">{policy.maxDaysPerYear} days/year</span>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-iris-black/40 rounded-full overflow-hidden flex">
                <div className={`${colors.bar} h-full transition-all`} style={{ width: `${usedPct}%` }} />
                <div className={`${colors.bar} opacity-40 h-full transition-all`} style={{ width: `${pendingPct}%` }} />
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex gap-3">
                  <span className="text-iris-white/50">Used: <strong className="text-iris-white">{used}</strong></span>
                  {pending > 0 && <span className="text-yellow-400/70">Pending: {pending}</span>}
                  {carriedOver > 0 && <span className="text-iris-white/30">+{carriedOver} carried</span>}
                </div>
                <span className={`font-bold ${available <= 2 ? 'text-red-400' : colors.text}`}>
                  {available} left
                </span>
              </div>

              {!policy.carryForward && (
                <p className="text-[10px] text-iris-white/20">No carry-forward</p>
              )}
              {policy.carryForward && policy.maxCarryForwardDays && (
                <p className="text-[10px] text-iris-white/20">Up to {policy.maxCarryForwardDays} days carry-forward</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LeaveBalanceSummary;
