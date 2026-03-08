import React, { useMemo } from 'react';
import { OffboardingChecklist, OffboardingStep, User, ChecklistStatus } from '../../types';
import { CheckCircle, Circle, UserMinus, AlertTriangle, Shield } from 'lucide-react';

interface OffboardingWorkflowProps {
  offboardingChecklists: OffboardingChecklist[];
  users: User[];
  currentUserId: string;
  checkPermission?: (code: string) => boolean;
  onStartOffboarding: (userId: string) => void;
  onCompleteStep?: (checklistId: string, stepId: string) => void;
}

const DEFAULT_OFFBOARDING_STEPS: Omit<OffboardingStep, 'id'>[] = [
  { title: 'Resignation Letter / Termination Notice', description: 'Collect official resignation letter or issue termination notice', category: 'paperwork', assignedTo: '', isRequired: true, isCompleted: false, status: 'pending', order: 1 },
  { title: 'Exit Interview', description: 'Schedule and conduct exit interview', category: 'hr', assignedTo: '', isRequired: true, isCompleted: false, status: 'pending', order: 2 },
  { title: 'Knowledge Transfer', description: 'Document handover of responsibilities and ongoing projects', category: 'handover', assignedTo: '', isRequired: true, isCompleted: false, status: 'pending', order: 3 },
  { title: 'Return Laptop & Equipment', description: 'Collect all company-owned hardware and peripherals', category: 'assets', assignedTo: '', isRequired: true, isCompleted: false, status: 'pending', order: 4 },
  { title: 'Revoke System Access', description: 'Disable email, tool access, and security credentials', category: 'it', assignedTo: '', isRequired: true, isCompleted: false, status: 'pending', order: 5 },
  { title: 'Return Access Cards & Keys', description: 'Collect physical access cards, keys, and badges', category: 'assets', assignedTo: '', isRequired: true, isCompleted: false, status: 'pending', order: 6 },
  { title: 'Final Payroll Processing', description: 'Calculate final pay, unused leave, and any deductions', category: 'finance', assignedTo: '', isRequired: true, isCompleted: false, status: 'pending', order: 7 },
  { title: 'Remove from Communication Channels', description: 'Remove from Slack, email groups, and project channels', category: 'it', assignedTo: '', isRequired: false, isCompleted: false, status: 'pending', order: 8 },
  { title: 'Update Org Chart', description: 'Remove from org chart and reassign reporting lines', category: 'hr', assignedTo: '', isRequired: true, isCompleted: false, status: 'pending', order: 9 },
  { title: 'Archive Employee Records', description: 'Archive profile and ensure records are retained per policy', category: 'hr', assignedTo: '', isRequired: true, isCompleted: false, status: 'pending', order: 10 },
];

const CATEGORY_COLORS: Record<string, string> = {
  paperwork: 'text-blue-400 bg-blue-500/10',
  hr: 'text-iris-red bg-iris-red/10',
  handover: 'text-yellow-400 bg-yellow-500/10',
  assets: 'text-orange-400 bg-orange-500/10',
  it: 'text-purple-400 bg-purple-500/10',
  finance: 'text-green-400 bg-green-500/10',
};

const OffboardingWorkflow: React.FC<OffboardingWorkflowProps> = ({
  offboardingChecklists,
  users,
  currentUserId,
  checkPermission,
  onStartOffboarding,
  onCompleteStep,
}) => {
  const canManage = checkPermission?.('hr.offboarding.manage');

  const activeChecklists = useMemo(() =>
    offboardingChecklists
      .filter(c => c.status !== 'cancelled')
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()),
    [offboardingChecklists]
  );

  const getProgress = (checklist: OffboardingChecklist) => {
    const total = checklist.steps.length;
    const completed = checklist.steps.filter(s => s.status === 'completed').length;
    return { total, completed, pct: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  const statusColors: Record<ChecklistStatus, string> = {
    not_started: 'text-gray-400 bg-gray-500/10',
    in_progress: 'text-orange-400 bg-orange-500/10',
    completed: 'text-green-400 bg-green-500/10',
    cancelled: 'text-red-400 bg-red-500/10',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-iris-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-iris-red" /> Offboarding
        </h3>
        <span className="text-xs text-iris-white/40">{activeChecklists.filter(c => c.status === 'in_progress').length} in progress</span>
      </div>

      {canManage && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs text-red-400/80">
            <AlertTriangle className="w-3.5 h-3.5" />
            Offboarding is an HR-sensitive action. All steps are audited.
          </div>
        </div>
      )}

      {/* Active Checklists */}
      {activeChecklists.length === 0 ? (
        <div className="text-center py-10 text-iris-white/30 text-sm">No offboarding processes active</div>
      ) : (
        <div className="space-y-3">
          {activeChecklists.map(checklist => {
            const user = users.find(u => u.id === checklist.employeeId);
            const { total, completed, pct } = getProgress(checklist);

            return (
              <div key={checklist.id} className="bg-iris-black/60 border border-iris-white/10 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <img src={user?.avatar || ''} alt="" className="w-8 h-8 rounded-full ring-2 ring-red-500/20" />
                  <div className="flex-1">
                    <span className="text-sm font-bold text-iris-white">{user?.name || 'Unknown'}</span>
                    <div className="flex gap-2 items-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[checklist.status]}`}>
                        {checklist.status}
                      </span>
                      <span className="text-xs text-iris-white/40 capitalize">{checklist.reason}</span>
                      {checklist.finalWorkingDate && (
                        <span className="text-xs text-red-400/60">Last day: {checklist.finalWorkingDate}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-iris-white">{pct}%</span>
                    <p className="text-xs text-iris-white/40">{completed}/{total}</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-iris-black/40 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>

                {/* Steps */}
                <div className="space-y-1">
                  {checklist.steps
                    .sort((a, b) => a.order - b.order)
                    .map(step => (
                      <div key={step.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-iris-white/5 transition">
                        <button
                          onClick={() => step.status !== 'completed' && canManage && onCompleteStep ? onCompleteStep(checklist.id, step.id) : null}
                          className="flex-shrink-0"
                          disabled={step.status === 'completed' || !canManage}
                        >
                          {step.status === 'completed' ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : (
                            <Circle className={`w-4 h-4 ${canManage ? 'text-iris-white/30 hover:text-red-400 cursor-pointer' : 'text-iris-white/20'}`} />
                          )}
                        </button>
                        <span className={`text-xs flex-1 ${step.status === 'completed' ? 'text-iris-white/40 line-through' : 'text-iris-white'}`}>
                          {step.title}
                          {step.isRequired && <span className="text-red-400 ml-1">*</span>}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${CATEGORY_COLORS[step.category] || 'text-iris-white/30 bg-iris-white/5'}`}>
                          {step.category}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OffboardingWorkflow;
