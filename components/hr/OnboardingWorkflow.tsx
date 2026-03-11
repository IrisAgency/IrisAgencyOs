import React, { useMemo } from 'react';
import { OnboardingChecklist, OnboardingStep, User, ChecklistStatus } from '../../types';
import { CheckCircle, Circle, Clock, UserPlus, ChevronRight, Play } from 'lucide-react';

interface OnboardingWorkflowProps {
  onboardingChecklists: OnboardingChecklist[];
  users: User[];
  currentUserId: string;
  checkPermission?: (code: string) => boolean;
  onStartOnboarding: (userId: string, steps: OnboardingStep[]) => void;
  onCompleteStep: (checklistId: string, stepId: string) => void;
}

const DEFAULT_ONBOARDING_STEPS: Omit<OnboardingStep, 'id'>[] = [
  { title: 'Accept Offer Letter', description: 'Sign and return the offer letter', category: 'paperwork', assignedTo: '', isRequired: true, isCompleted: false, status: 'pending', order: 1 },
  { title: 'Submit ID Documents', description: 'National ID, passport, or equivalent', category: 'paperwork', assignedTo: '', isRequired: true, isCompleted: false, status: 'pending', order: 2 },
  { title: 'Set Up Email Account', description: 'Create company email and add to directory', category: 'it', assignedTo: '', isRequired: true, isCompleted: false, status: 'pending', order: 3 },
  { title: 'Issue Laptop/Equipment', description: 'Prepare and hand over work equipment', category: 'it', assignedTo: '', isRequired: true, isCompleted: false, status: 'pending', order: 4 },
  { title: 'Access Permissions Setup', description: 'Grant access to tools, drives, and platforms', category: 'it', assignedTo: '', isRequired: true, isCompleted: false, status: 'pending', order: 5 },
  { title: 'Team Introduction', description: 'Introduce to team members and schedule welcome meeting', category: 'orientation', assignedTo: '', isRequired: true, isCompleted: false, status: 'pending', order: 6 },
  { title: 'Office Tour & Safety Brief', description: 'Walk through office, exits, and safety procedures', category: 'orientation', assignedTo: '', isRequired: false, isCompleted: false, status: 'pending', order: 7 },
  { title: 'Company Policies Review', description: 'Review HR policies, code of conduct, NDA', category: 'paperwork', assignedTo: '', isRequired: true, isCompleted: false, status: 'pending', order: 8 },
  { title: 'First Day Meeting with Manager', description: 'Set expectations, discuss role and goals', category: 'orientation', assignedTo: '', isRequired: true, isCompleted: false, status: 'pending', order: 9 },
  { title: 'Probation Check-in Scheduled', description: 'Schedule 30/60/90-day probation review dates', category: 'orientation', assignedTo: '', isRequired: false, isCompleted: false, status: 'pending', order: 10 },
];

const CATEGORY_COLORS: Record<string, string> = {
  paperwork: 'text-blue-400 bg-blue-500/10',
  it: 'text-purple-400 bg-purple-500/10',
  orientation: 'text-green-400 bg-green-500/10',
  training: 'text-yellow-400 bg-yellow-500/10',
};

const OnboardingWorkflow: React.FC<OnboardingWorkflowProps> = ({
  onboardingChecklists,
  users,
  currentUserId,
  checkPermission,
  onStartOnboarding,
  onCompleteStep,
}) => {
  const canManage = checkPermission?.('hr.onboarding.manage');

  const activeChecklists = useMemo(() =>
    onboardingChecklists
      .filter(c => c.status !== 'cancelled')
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()),
    [onboardingChecklists]
  );

  const handleStartOnboarding = (userId: string) => {
    const steps: OnboardingStep[] = DEFAULT_ONBOARDING_STEPS.map((s, i) => ({
      ...s,
      id: `step_${i + 1}`,
    }));
    onStartOnboarding(userId, steps);
  };

  const getProgress = (checklist: OnboardingChecklist) => {
    const total = checklist.steps.length;
    const completed = checklist.steps.filter(s => s.status === 'completed').length;
    return { total, completed, pct: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  const statusColors: Record<ChecklistStatus, string> = {
    not_started: 'text-gray-400 bg-gray-500/10',
    in_progress: 'text-blue-400 bg-blue-500/10',
    completed: 'text-green-400 bg-green-500/10',
    cancelled: 'text-red-400 bg-red-500/10',
  };

  // Users without onboarding checklists (potential new hires)
  const usersWithoutOnboarding = users.filter(
    u => u.status !== 'inactive' && !onboardingChecklists.some(c => c.employeeId === u.id)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-iris-white">Onboarding</h3>
        <span className="text-xs text-iris-white/40">{activeChecklists.filter(c => c.status === 'in_progress').length} in progress</span>
      </div>

      {/* Start Onboarding */}
      {canManage && usersWithoutOnboarding.length > 0 && (
        <div className="bg-iris-black/60 border border-iris-white/10 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-bold text-iris-white/80 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-iris-red" /> Start New Onboarding
          </h4>
          <div className="flex flex-wrap gap-2">
            {usersWithoutOnboarding.slice(0, 10).map(u => (
              <button
                key={u.id}
                onClick={() => handleStartOnboarding(u.id)}
                className="flex items-center gap-2 px-3 py-1.5 bg-iris-black/80 border border-iris-white/10 rounded-lg text-xs text-iris-white hover:border-iris-red/30 transition"
              >
                <img src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&size=20&background=random`} alt="" className="w-5 h-5 rounded-full" />
                {u.name}
                <Play className="w-3 h-3 text-iris-red" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active Checklists */}
      {activeChecklists.length === 0 ? (
        <div className="text-center py-10 text-iris-white/30 text-sm">No onboarding checklists</div>
      ) : (
        <div className="space-y-3">
          {activeChecklists.map(checklist => {
            const user = users.find(u => u.id === checklist.employeeId);
            const { total, completed, pct } = getProgress(checklist);

            return (
              <div key={checklist.id} className="bg-iris-black/60 border border-iris-white/10 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <img src={user?.avatar || ''} alt="" className="w-8 h-8 rounded-full" />
                  <div className="flex-1">
                    <span className="text-sm font-bold text-iris-white">{user?.name || 'Unknown'}</span>
                    <div className="flex gap-2 items-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[checklist.status]}`}>
                        {checklist.status}
                      </span>
                      <span className="text-xs text-iris-white/40">Started {new Date(checklist.startedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-iris-white">{pct}%</span>
                    <p className="text-xs text-iris-white/40">{completed}/{total}</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-iris-black/40 rounded-full overflow-hidden">
                  <div className="h-full bg-iris-red rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>

                {/* Steps */}
                <div className="space-y-1">
                  {checklist.steps
                    .sort((a, b) => a.order - b.order)
                    .map(step => (
                      <div key={step.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-iris-white/5 transition">
                        <button
                          onClick={() => step.status !== 'completed' && canManage ? onCompleteStep(checklist.id, step.id) : null}
                          className="flex-shrink-0"
                          disabled={step.status === 'completed' || !canManage}
                        >
                          {step.status === 'completed' ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : (
                            <Circle className={`w-4 h-4 ${canManage ? 'text-iris-white/30 hover:text-iris-red cursor-pointer' : 'text-iris-white/20'}`} />
                          )}
                        </button>
                        <span className={`text-xs flex-1 ${step.status === 'completed' ? 'text-iris-white/40 line-through' : 'text-iris-white'}`}>
                          {step.title}
                          {step.isRequired && <span className="text-iris-red ml-1">*</span>}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${CATEGORY_COLORS[step.category ?? ''] || 'text-iris-white/30 bg-iris-white/5'}`}>
                          {step.category}
                        </span>
                        {step.completedAt && (
                          <span className="text-[10px] text-iris-white/20">{new Date(step.completedAt).toLocaleDateString()}</span>
                        )}
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

export default OnboardingWorkflow;
