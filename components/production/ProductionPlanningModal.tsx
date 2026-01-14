import React, { useState, useEffect, useMemo } from 'react';
import {
  ProductionPlan,
  Client,
  CalendarMonth,
  CalendarItem,
  Task,
  User,
  CalendarContentType,
  ProductionConflictOverride
} from '../../types';
import {
  Video,
  Image as ImageIcon,
  Zap,
  Calendar,
  Clock,
  AlertCircle,
  Users,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  X
} from 'lucide-react';
import Modal from '../common/Modal';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface ProductionPlanningModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  users: User[];
  leaveRequests: any[];
  existingPlan?: ProductionPlan | null;
  onSave: (planData: Partial<ProductionPlan>) => Promise<void>;
}

type WizardStep = 1 | 2 | 3;
type SelectionTab = 'CALENDAR' | 'MANUAL';

interface DuplicateInfo {
  planId: string;
  planName: string;
  productionDate: string;
}

const ProductionPlanningModal: React.FC<ProductionPlanningModalProps> = ({
  isOpen,
  onClose,
  clients,
  users,
  leaveRequests,
  existingPlan,
  onSave
}) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [isSaving, setIsSaving] = useState(false);

  // Step 1: Plan Setup
  const [selectedClientId, setSelectedClientId] = useState('');
  const [productionDate, setProductionDate] = useState('');
  const [planName, setPlanName] = useState('');

  // Step 2: Content Selection
  const [activeTab, setActiveTab] = useState<SelectionTab>('CALENDAR');
  const [calendarMonths, setCalendarMonths] = useState<CalendarMonth[]>([]);
  const [selectedMonthId, setSelectedMonthId] = useState('');
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([]);
  const [selectedCalendarItems, setSelectedCalendarItems] = useState<string[]>([]);
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [selectedManualTasks, setSelectedManualTasks] = useState<string[]>([]);
  
  const [duplicateMap, setDuplicateMap] = useState<Record<string, DuplicateInfo[]>>({});

  // Step 3: Team Assignment
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([]);
  const [conflictOverrides, setConflictOverrides] = useState<Record<string, ProductionConflictOverride>>({});

  // Edit Mode State
  const [hasActiveTasks, setHasActiveTasks] = useState(false);
  const [activeTaskCount, setActiveTaskCount] = useState(0);
  const [updateMode, setUpdateMode] = useState<'SAFE' | 'FORCE'>('SAFE');
  const [forceUpdateReason, setForceUpdateReason] = useState('');

  const inputClass = 'w-full h-10 px-3 py-2 rounded-lg bg-[color:var(--dash-surface-elevated)] border border-[color:var(--dash-glass-border)] text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[color:var(--dash-primary)]';
  const labelClass = 'block text-sm font-medium text-slate-200 mb-2';

  // Initialize edit mode
  useEffect(() => {
    if (existingPlan && isOpen) {
      setSelectedClientId(existingPlan.clientId);
      setProductionDate(existingPlan.productionDate);
      setPlanName(existingPlan.name);
      setSelectedCalendarItems(existingPlan.calendarItemIds);
      setSelectedManualTasks(existingPlan.manualTaskIds);
      setSelectedTeamMembers(existingPlan.teamMemberIds);
      setConflictOverrides(existingPlan.conflictOverrides);

      // Check for active tasks
      checkActiveTasks(existingPlan.generatedTaskIds);
    } else if (isOpen) {
      // Reset for new plan
      resetForm();
    }
  }, [existingPlan, isOpen]);

  // Load calendar months when client selected
  useEffect(() => {
    if (selectedClientId && isOpen) {
      loadCalendarMonths();
    }
  }, [selectedClientId, isOpen]);

  // Load calendar items when month selected
  useEffect(() => {
    if (selectedMonthId && isOpen) {
      loadCalendarItems();
    }
  }, [selectedMonthId, isOpen]);

  // Load tasks for manual selection
  useEffect(() => {
    if (selectedClientId && isOpen && activeTab === 'MANUAL') {
      loadTasks();
    }
  }, [selectedClientId, isOpen, activeTab]);

  // Check duplicates when items are selected
  useEffect(() => {
    if (isOpen && (selectedCalendarItems.length > 0 || selectedManualTasks.length > 0)) {
      checkDuplicates();
    }
  }, [selectedCalendarItems, selectedManualTasks, isOpen]);

  const resetForm = () => {
    setCurrentStep(1);
    setSelectedClientId('');
    setProductionDate('');
    setPlanName('');
    setActiveTab('CALENDAR');
    setSelectedMonthId('');
    setSelectedCalendarItems([]);
    setSelectedManualTasks([]);
    setSelectedTeamMembers([]);
    setConflictOverrides({});
    setHasActiveTasks(false);
    setActiveTaskCount(0);
    setUpdateMode('SAFE');
    setForceUpdateReason('');
    setTaskSearchQuery('');
  };

  const checkActiveTasks = async (taskIds: string[]) => {
    if (!taskIds || taskIds.length === 0) return;

    try {
      const taskPromises = taskIds.map(id => getDoc(doc(db, 'tasks', id)));
      const taskDocs = await Promise.all(taskPromises);
      
      const activeTasks = taskDocs.filter(doc => {
        if (!doc.exists()) return false;
        const task = doc.data() as Task;
        return ['IN_PROGRESS', 'COMPLETED', 'APPROVED'].includes(task.status);
      });

      setHasActiveTasks(activeTasks.length > 0);
      setActiveTaskCount(activeTasks.length);
    } catch (error) {
      console.error('Error checking active tasks:', error);
    }
  };

  const loadCalendarMonths = async () => {
    try {
      const q = query(
        collection(db, 'calendar_months'),
        where('clientId', '==', selectedClientId)
      );
      const snapshot = await getDocs(q);
      const months = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CalendarMonth));
      setCalendarMonths(months.sort((a, b) => b.monthKey.localeCompare(a.monthKey)));
    } catch (error) {
      console.error('Error loading calendar months:', error);
    }
  };

  const loadCalendarItems = async () => {
    try {
      const q = query(
        collection(db, 'calendar_items'),
        where('calendarMonthId', '==', selectedMonthId)
      );
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CalendarItem));
      setCalendarItems(items.sort((a, b) => a.seqNumber - b.seqNumber));
    } catch (error) {
      console.error('Error loading calendar items:', error);
    }
  };

  const loadTasks = async () => {
    try {
      const tasksQuery = query(
        collection(db, 'tasks'),
        where('client', '==', clients.find(c => c.id === selectedClientId)?.name || '')
      );
      const snapshot = await getDocs(tasksQuery);
      const allTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
      
      // Filter out production copies
      const regularTasks = allTasks.filter(t => !t.isProductionCopy);
      setTasks(regularTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const checkDuplicates = async () => {
    try {
      const plansQuery = query(
        collection(db, 'production_plans'),
        where('status', '!=', 'COMPLETED')
      );
      const snapshot = await getDocs(plansQuery);
      const activePlans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductionPlan));

      const duplicates: Record<string, DuplicateInfo[]> = {};

      // Check calendar items
      selectedCalendarItems.forEach(itemId => {
        const inPlans = activePlans.filter(plan => 
          plan.calendarItemIds.includes(itemId) && 
          plan.id !== existingPlan?.id
        );
        if (inPlans.length > 0) {
          duplicates[`cal_${itemId}`] = inPlans.map(p => ({
            planId: p.id,
            planName: p.name,
            productionDate: p.productionDate
          }));
        }
      });

      // Check manual tasks
      selectedManualTasks.forEach(taskId => {
        const inPlans = activePlans.filter(plan => 
          plan.manualTaskIds.includes(taskId) && 
          plan.id !== existingPlan?.id
        );
        if (inPlans.length > 0) {
          duplicates[`task_${taskId}`] = inPlans.map(p => ({
            planId: p.id,
            planName: p.name,
            productionDate: p.productionDate
          }));
        }
      });

      setDuplicateMap(duplicates);
    } catch (error) {
      console.error('Error checking duplicates:', error);
    }
  };

  const checkAvailability = (userId: string, dateStr: string) => {
    if (!dateStr || !leaveRequests) return true;
    const targetDate = new Date(dateStr);
    targetDate.setHours(0, 0, 0, 0);

    const conflict = leaveRequests.find((req: any) => {
      if (req.userId !== userId || req.status !== 'approved') return false;
      const start = new Date(req.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(req.endDate);
      end.setHours(0, 0, 0, 0);
      return targetDate >= start && targetDate <= end;
    });
    return !conflict;
  };

  const getWorkloadCount = async (userId: string, dateStr: string): Promise<number> => {
    try {
      const assignmentsQuery = query(
        collection(db, 'production_assignments'),
        where('userId', '==', userId),
        where('productionDate', '==', dateStr)
      );
      const snapshot = await getDocs(assignmentsQuery);
      return snapshot.docs.filter(doc => {
        const assignment = doc.data();
        return assignment.status !== 'COMPLETED' && assignment.productionPlanId !== existingPlan?.id;
      }).length;
    } catch (error) {
      console.error('Error checking workload:', error);
      return 0;
    }
  };

  const getTypeIcon = (type: string) => {
    const lowerType = type.toLowerCase();
    switch (lowerType) {
      case 'video': return <Video className="w-4 h-4 text-blue-400" />;
      case 'photo': return <ImageIcon className="w-4 h-4 text-purple-400" />;
      case 'motion': return <Zap className="w-4 h-4 text-yellow-400" />;
      default: return null;
    }
  };

  const getTypeBadgeClass = (type: string) => {
    const lowerType = type.toLowerCase();
    switch (lowerType) {
      case 'video': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'photo': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'motion': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const toggleCalendarItem = (itemId: string) => {
    setSelectedCalendarItems(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const toggleManualTask = (taskId: string) => {
    setSelectedManualTasks(prev =>
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const toggleTeamMember = (userId: string) => {
    setSelectedTeamMembers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const toggleOverride = (userId: string, userName: string) => {
    setConflictOverrides(prev => {
      const newOverrides = { ...prev };
      if (newOverrides[userId]) {
        delete newOverrides[userId];
      } else {
        newOverrides[userId] = {
          userName,
          reason: 'On leave - Override approved by manager',
          overriddenBy: 'current_user', // Should be replaced with actual current user
          overriddenAt: new Date().toISOString()
        };
      }
      return newOverrides;
    });
  };

  const canProceedStep1 = selectedClientId && productionDate;
  const canProceedStep2 = selectedCalendarItems.length > 0 || selectedManualTasks.length > 0;
  const canProceedStep3 = selectedTeamMembers.length > 0;

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep((currentStep + 1) as WizardStep);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as WizardStep);
    }
  };

  const handleSave = async () => {
    if (!canProceedStep3) return;

    setIsSaving(true);
    try {
      const selectedClient = clients.find(c => c.id === selectedClientId);
      const generatedPlanName = planName || `${selectedClient?.name} - ${new Date(productionDate).toLocaleDateString()} Production`;

      const planData: Partial<ProductionPlan> = {
        clientId: selectedClientId,
        clientName: selectedClient?.name || '',
        name: generatedPlanName,
        productionDate,
        calendarItemIds: selectedCalendarItems,
        manualTaskIds: selectedManualTasks,
        teamMemberIds: selectedTeamMembers,
        conflictOverrides,
        status: 'DRAFT',
        isArchived: false,
        archivedAt: null,
        archivedBy: null,
        archiveReason: null,
        canRestoreUntil: null,
        generatedTaskIds: existingPlan?.generatedTaskIds || [],
        updatedAt: new Date().toISOString(),
        ...(existingPlan ? {} : {
          createdBy: 'current_user', // Replace with actual user
          createdAt: new Date().toISOString()
        })
      };

      // Add edit mode metadata if applicable
      if (existingPlan && hasActiveTasks && updateMode === 'FORCE') {
        (planData as any).forceUpdateReason = forceUpdateReason;
      }

      await onSave(planData);
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error saving production plan:', error);
      alert('Failed to save production plan. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Group calendar items by type
  const groupedCalendarItems = useMemo(() => {
    const groups: Record<string, CalendarItem[]> = {
      VIDEO: [],
      PHOTO: [],
      MOTION: []
    };
    calendarItems.forEach(item => {
      if (groups[item.type]) {
        groups[item.type].push(item);
      }
    });
    return groups;
  }, [calendarItems]);

  // Filter tasks for manual selection
  const filteredTasks = useMemo(() => {
    if (!taskSearchQuery) return tasks;
    const query = taskSearchQuery.toLowerCase();
    return tasks.filter(t =>
      t.title.toLowerCase().includes(query) ||
      t.description?.toLowerCase().includes(query)
    );
  }, [tasks, taskSearchQuery]);

  const duplicateCount = Object.keys(duplicateMap).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={existingPlan ? 'Edit Production Plan' : 'Create Production Plan'}
      size="xl"
    >
      <div className="bg-[color:var(--dash-surface)] text-slate-100">
        {/* Progress Indicator */}
        <div className="px-6 pt-6 pb-4 border-b border-[color:var(--dash-glass-border)]">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3].map((step) => (
              <React.Fragment key={step}>
                <div className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                      currentStep === step
                        ? 'bg-[color:var(--dash-primary)] text-white'
                        : currentStep > step
                        ? 'bg-green-500 text-white'
                        : 'bg-[color:var(--dash-surface-elevated)] text-slate-400 border border-[color:var(--dash-glass-border)]'
                    }`}
                  >
                    {currentStep > step ? <CheckCircle className="w-5 h-5" /> : step}
                  </div>
                  <span className={`ml-2 text-sm font-medium hidden sm:inline ${
                    currentStep === step ? 'text-slate-100' : 'text-slate-400'
                  }`}>
                    {step === 1 ? 'Setup' : step === 2 ? 'Content' : 'Team'}
                  </span>
                </div>
                {step < 3 && (
                  <div className={`flex-1 h-0.5 mx-2 ${
                    currentStep > step ? 'bg-green-500' : 'bg-[color:var(--dash-glass-border)]'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Edit Mode Warning */}
        {existingPlan && hasActiveTasks && (
          <div className="px-6 pt-4">
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg space-y-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-yellow-300">Active Work Detected</p>
                  <p className="text-xs text-yellow-300/80 mt-1">
                    {activeTaskCount} tasks are in progress or completed. Choose how to proceed:
                  </p>
                </div>
              </div>

              <div className="space-y-2 ml-7">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={updateMode === 'SAFE'}
                    onChange={() => setUpdateMode('SAFE')}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="text-sm font-medium text-yellow-200">Safe Update</span>
                    <p className="text-xs text-yellow-300/70">Only modify PENDING tasks (recommended)</p>
                  </div>
                </label>

                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={updateMode === 'FORCE'}
                    onChange={() => setUpdateMode('FORCE')}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="text-sm font-medium text-yellow-200">Force Update All</span>
                    <p className="text-xs text-yellow-300/70">Reassign active work (requires override permission)</p>
                  </div>
                </label>

                {updateMode === 'FORCE' && (
                  <div className="ml-5 mt-2">
                    <label className="block text-xs text-yellow-300 mb-1">Reason for override *</label>
                    <input
                      type="text"
                      value={forceUpdateReason}
                      onChange={e => setForceUpdateReason(e.target.value)}
                      placeholder="Explain why force update is necessary..."
                      className="w-full px-3 py-2 text-sm rounded-lg bg-[color:var(--dash-surface-elevated)] border border-yellow-500/30 text-slate-100 placeholder:text-slate-500"
                      required
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="p-6">
          {/* STEP 1: Plan Setup */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Client *</label>
                <select
                  value={selectedClientId}
                  onChange={e => setSelectedClientId(e.target.value)}
                  className={inputClass}
                  dir="auto"
                  style={{ unicodeBidi: 'plaintext', textAlign: 'start' }}
                  required
                >
                  <option value="">Select a client</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Production Date *</label>
                <input
                  type="date"
                  value={productionDate}
                  onChange={e => setProductionDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Plan Name (Optional)</label>
                <input
                  type="text"
                  value={planName}
                  onChange={e => setPlanName(e.target.value)}
                  placeholder="Auto-generated if left empty"
                  className={inputClass}
                  dir="auto"
                  style={{ unicodeBidi: 'plaintext', textAlign: 'start' }}
                />
                {selectedClientId && productionDate && !planName && (
                  <p className="mt-2 text-xs text-slate-400">
                    Will be saved as: "{clients.find(c => c.id === selectedClientId)?.name} - {new Date(productionDate).toLocaleDateString()} Production"
                  </p>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: Content Selection */}
          {currentStep === 2 && (
            <div className="space-y-4">
              {/* Tab Navigation */}
              <div className="flex items-center gap-2 border-b border-[color:var(--dash-glass-border)]">
                <button
                  onClick={() => setActiveTab('CALENDAR')}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'CALENDAR'
                      ? 'border-[color:var(--dash-primary)] text-[color:var(--dash-primary)]'
                      : 'border-transparent text-slate-400 hover:text-slate-300'
                  }`}
                >
                  📅 Calendar Items ({selectedCalendarItems.length})
                </button>
                <button
                  onClick={() => setActiveTab('MANUAL')}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'MANUAL'
                      ? 'border-slate-500 text-slate-300'
                      : 'border-transparent text-slate-400 hover:text-slate-300'
                  }`}
                >
                  📋 Manual Tasks ({selectedManualTasks.length})
                </button>
              </div>

              {/* Calendar Tab */}
              {activeTab === 'CALENDAR' && (
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Select Calendar Month</label>
                    <select
                      value={selectedMonthId}
                      onChange={e => setSelectedMonthId(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Choose a month</option>
                      {calendarMonths.map(month => (
                        <option key={month.id} value={month.id}>
                          {month.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedMonthId && (
                    <div className="max-h-[50vh] overflow-y-auto space-y-4">
                      {/* VIDEO Items */}
                      {groupedCalendarItems.VIDEO.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-2">
                            <Video className="w-4 h-4" />
                            Video Content ({groupedCalendarItems.VIDEO.length})
                          </h4>
                          <div className="space-y-2">
                            {groupedCalendarItems.VIDEO.map(item => {
                              const isSelected = selectedCalendarItems.includes(item.id);
                              const duplicateInfo = duplicateMap[`cal_${item.id}`];
                              return (
                                <div
                                  key={item.id}
                                  onClick={() => toggleCalendarItem(item.id)}
                                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                    isSelected
                                      ? 'bg-blue-500/10 border-blue-500/30'
                                      : duplicateInfo
                                      ? 'bg-yellow-500/5 border-yellow-500/20 hover:bg-yellow-500/10'
                                      : 'bg-[color:var(--dash-surface-elevated)] border-[color:var(--dash-glass-border)] hover:border-slate-500'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-start gap-3 flex-1">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => {}}
                                        className="mt-1"
                                      />
                                      <div className="flex-1">
                                        <div className="font-medium text-[color:var(--dash-primary)] text-sm">
                                          {item.autoName}
                                        </div>
                                        {item.primaryBrief && (
                                          <div className="text-xs text-slate-400 mt-1 line-clamp-2">
                                            {item.primaryBrief}
                                          </div>
                                        )}
                                        <div className="flex items-center gap-2 mt-2">
                                          <div className="flex items-center gap-1 text-xs text-slate-400">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(item.publishAt).toLocaleDateString()}
                                          </div>
                                          {item.taskId && (
                                            <span className="text-xs px-2 py-0.5 rounded bg-slate-500/20 text-slate-300">
                                              🎬 Has Task
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    {duplicateInfo && duplicateInfo.length > 0 && (
                                      <span className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 whitespace-nowrap">
                                        ⚠️ In: {duplicateInfo[0].planName}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* PHOTO Items */}
                      {groupedCalendarItems.PHOTO.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-purple-400 mb-2 flex items-center gap-2">
                            <ImageIcon className="w-4 h-4" />
                            Photo Content ({groupedCalendarItems.PHOTO.length})
                          </h4>
                          <div className="space-y-2">
                            {groupedCalendarItems.PHOTO.map(item => {
                              const isSelected = selectedCalendarItems.includes(item.id);
                              const duplicateInfo = duplicateMap[`cal_${item.id}`];
                              return (
                                <div
                                  key={item.id}
                                  onClick={() => toggleCalendarItem(item.id)}
                                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                    isSelected
                                      ? 'bg-purple-500/10 border-purple-500/30'
                                      : duplicateInfo
                                      ? 'bg-yellow-500/5 border-yellow-500/20 hover:bg-yellow-500/10'
                                      : 'bg-[color:var(--dash-surface-elevated)] border-[color:var(--dash-glass-border)] hover:border-slate-500'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-start gap-3 flex-1">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => {}}
                                        className="mt-1"
                                      />
                                      <div className="flex-1">
                                        <div className="font-medium text-[color:var(--dash-primary)] text-sm">
                                          {item.autoName}
                                        </div>
                                        {item.primaryBrief && (
                                          <div className="text-xs text-slate-400 mt-1 line-clamp-2">
                                            {item.primaryBrief}
                                          </div>
                                        )}
                                        <div className="flex items-center gap-2 mt-2">
                                          <div className="flex items-center gap-1 text-xs text-slate-400">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(item.publishAt).toLocaleDateString()}
                                          </div>
                                          {item.taskId && (
                                            <span className="text-xs px-2 py-0.5 rounded bg-slate-500/20 text-slate-300">
                                              🎬 Has Task
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    {duplicateInfo && duplicateInfo.length > 0 && (
                                      <span className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 whitespace-nowrap">
                                        ⚠️ In: {duplicateInfo[0].planName}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* MOTION Items */}
                      {groupedCalendarItems.MOTION.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-yellow-400 mb-2 flex items-center gap-2">
                            <Zap className="w-4 h-4" />
                            Motion Content ({groupedCalendarItems.MOTION.length})
                          </h4>
                          <div className="space-y-2">
                            {groupedCalendarItems.MOTION.map(item => {
                              const isSelected = selectedCalendarItems.includes(item.id);
                              const duplicateInfo = duplicateMap[`cal_${item.id}`];
                              return (
                                <div
                                  key={item.id}
                                  onClick={() => toggleCalendarItem(item.id)}
                                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                    isSelected
                                      ? 'bg-yellow-500/10 border-yellow-500/30'
                                      : duplicateInfo
                                      ? 'bg-yellow-500/5 border-yellow-500/20 hover:bg-yellow-500/10'
                                      : 'bg-[color:var(--dash-surface-elevated)] border-[color:var(--dash-glass-border)] hover:border-slate-500'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-start gap-3 flex-1">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => {}}
                                        className="mt-1"
                                      />
                                      <div className="flex-1">
                                        <div className="font-medium text-[color:var(--dash-primary)] text-sm">
                                          {item.autoName}
                                        </div>
                                        {item.primaryBrief && (
                                          <div className="text-xs text-slate-400 mt-1 line-clamp-2">
                                            {item.primaryBrief}
                                          </div>
                                        )}
                                        <div className="flex items-center gap-2 mt-2">
                                          <div className="flex items-center gap-1 text-xs text-slate-400">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(item.publishAt).toLocaleDateString()}
                                          </div>
                                          {item.taskId && (
                                            <span className="text-xs px-2 py-0.5 rounded bg-slate-500/20 text-slate-300">
                                              🎬 Has Task
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    {duplicateInfo && duplicateInfo.length > 0 && (
                                      <span className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 whitespace-nowrap">
                                        ⚠️ In: {duplicateInfo[0].planName}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {calendarItems.length === 0 && selectedMonthId && (
                        <div className="text-center py-8 text-slate-400 text-sm">
                          No calendar items found for this month.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Manual Tasks Tab */}
              {activeTab === 'MANUAL' && (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={taskSearchQuery}
                      onChange={e => setTaskSearchQuery(e.target.value)}
                      placeholder="Search tasks by title or description..."
                      className="w-full pl-10 pr-4 py-2 rounded-lg bg-[color:var(--dash-surface-elevated)] border border-[color:var(--dash-glass-border)] text-sm text-slate-100 placeholder:text-slate-500"
                    />
                  </div>

                  <div className="max-h-[50vh] overflow-y-auto space-y-2">
                    {filteredTasks.map(task => {
                      const isSelected = selectedManualTasks.includes(task.id);
                      const duplicateInfo = duplicateMap[`task_${task.id}`];
                      return (
                        <div
                          key={task.id}
                          onClick={() => toggleManualTask(task.id)}
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-slate-500/10 border-slate-500/30'
                              : duplicateInfo
                              ? 'bg-yellow-500/5 border-yellow-500/20 hover:bg-yellow-500/10'
                              : 'bg-[color:var(--dash-surface-elevated)] border-[color:var(--dash-glass-border)] hover:border-slate-500'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-3 flex-1">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="mt-1"
                              />
                              <div className="flex-1">
                                <div className="font-medium text-slate-300 text-sm">
                                  {task.title}
                                </div>
                                {task.description && (
                                  <div className="text-xs text-slate-400 mt-1 line-clamp-2">
                                    {task.description}
                                  </div>
                                )}
                                <div className="flex items-center gap-3 mt-2 flex-wrap">
                                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${getTypeBadgeClass(task.taskType)}`}>
                                    {getTypeIcon(task.taskType)}
                                    <span className="capitalize">{task.taskType}</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-xs text-slate-400">
                                    <Clock className="w-3 h-3" />
                                    Due: {new Date(task.dueDate).toLocaleDateString()}
                                  </div>
                                  <span className={`text-xs px-2 py-0.5 rounded ${
                                    task.status === 'COMPLETED' ? 'bg-green-500/20 text-green-300' :
                                    task.status === 'IN_PROGRESS' ? 'bg-blue-500/20 text-blue-300' :
                                    'bg-slate-500/20 text-slate-300'
                                  }`}>
                                    {task.status}
                                  </span>
                                </div>
                              </div>
                            </div>
                            {duplicateInfo && duplicateInfo.length > 0 && (
                              <span className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 whitespace-nowrap">
                                ⚠️ In {duplicateInfo.length} {duplicateInfo.length === 1 ? 'plan' : 'plans'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {filteredTasks.length === 0 && (
                      <div className="text-center py-8 text-slate-400 text-sm">
                        {taskSearchQuery ? 'No tasks match your search.' : 'No tasks available for this client.'}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Team Assignment */}
          {currentStep === 3 && (
            <div className="space-y-4">
              {/* Summary Card */}
              <div className="p-4 bg-[color:var(--dash-surface-elevated)] border border-[color:var(--dash-glass-border)] rounded-lg">
                <h4 className="text-sm font-semibold text-slate-200 mb-3">Content Summary</h4>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-[color:var(--dash-primary)] font-semibold">
                      📅 {selectedCalendarItems.length}
                    </span>
                    <span className="text-slate-400">Calendar</span>
                  </div>
                  <div className="text-slate-600">+</div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-300 font-semibold">
                      📋 {selectedManualTasks.length}
                    </span>
                    <span className="text-slate-400">Manual</span>
                  </div>
                  <div className="text-slate-600">=</div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-100 font-bold">
                      {selectedCalendarItems.length + selectedManualTasks.length}
                    </span>
                    <span className="text-slate-400">Total Items</span>
                  </div>
                </div>
              </div>

              {/* Duplicate Warning */}
              {duplicateCount > 0 && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-yellow-300">
                        {duplicateCount} Duplicate {duplicateCount === 1 ? 'Item' : 'Items'} Detected
                      </p>
                      <p className="text-xs text-yellow-300/80 mt-1">
                        Some selected items are already in other production plans. Separate production tasks will be created.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Team Selection */}
              <div>
                <label className={labelClass}>
                  <Users className="inline w-4 h-4 mr-1" />
                  Assign Team Members *
                </label>
                <div className="bg-[color:var(--dash-surface-elevated)] rounded-lg border border-[color:var(--dash-glass-border)] max-h-80 overflow-y-auto p-2 space-y-1">
                  {users.map(user => {
                    const isAvailable = checkAvailability(user.id, productionDate);
                    const isSelected = selectedTeamMembers.includes(user.id);
                    const hasOverride = conflictOverrides[user.id];

                    return (
                      <div
                        key={user.id}
                        className={`p-3 rounded-lg transition-colors ${
                          !isAvailable && !hasOverride
                            ? 'bg-rose-500/5 border border-rose-500/20'
                            : isSelected
                            ? 'bg-[color:var(--dash-primary)]/10 border border-[color:var(--dash-primary)]/20'
                            : 'hover:bg-[color:var(--dash-surface)]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleTeamMember(user.id)}
                              className="cursor-pointer"
                            />
                            <img
                              src={user.avatar}
                              alt={user.name}
                              className="w-8 h-8 rounded-full"
                            />
                            <div>
                              <div className="text-sm font-medium text-slate-200">{user.name}</div>
                              <div className="text-xs text-slate-400">{user.role}</div>
                            </div>
                          </div>
                          {!isAvailable && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs px-2 py-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                On Leave
                              </span>
                              <button
                                onClick={() => toggleOverride(user.id, user.name)}
                                className={`text-xs px-2 py-1 rounded transition-colors ${
                                  hasOverride
                                    ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                                    : 'bg-slate-500/20 text-slate-400 border border-slate-500/30 hover:bg-slate-500/30'
                                }`}
                              >
                                {hasOverride ? '✓ Override' : 'Override'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Conflict Overrides Summary */}
              {Object.keys(conflictOverrides).length > 0 && (
                <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                  <p className="text-xs text-orange-300 font-semibold mb-2">
                    {Object.keys(conflictOverrides).length} Conflict Override{Object.keys(conflictOverrides).length !== 1 ? 's' : ''} Applied
                  </p>
                  <div className="space-y-1">
                    {Object.entries(conflictOverrides).map(([userId, override]: [string, ProductionConflictOverride]) => (
                      <div key={userId} className="text-xs text-orange-300/80">
                        • {override.userName} - On leave override approved
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="px-6 pb-6 flex items-center gap-3 border-t border-[color:var(--dash-glass-border)] pt-4">
          {currentStep > 1 && (
            <button
              onClick={handleBack}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-lg border border-[color:var(--dash-glass-border)] text-slate-300 hover:bg-[color:var(--dash-surface-elevated)] transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}

          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2.5 rounded-lg border border-[color:var(--dash-glass-border)] text-slate-300 hover:bg-[color:var(--dash-surface-elevated)] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>

          <div className="flex-1" />

          {currentStep < 3 ? (
            <button
              onClick={handleNext}
              disabled={
                (currentStep === 1 && !canProceedStep1) ||
                (currentStep === 2 && !canProceedStep2)
              }
              className="px-4 py-2.5 rounded-lg bg-[color:var(--dash-primary)] text-white font-medium hover:shadow-[0_12px_30px_-16px_rgba(230,60,60,0.8)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={
                isSaving || 
                !canProceedStep3 || 
                (existingPlan && updateMode === 'FORCE' && !forceUpdateReason)
              }
              className="px-4 py-2.5 rounded-lg bg-[color:var(--dash-primary)] text-white font-medium hover:shadow-[0_12px_30px_-16px_rgba(230,60,60,0.8)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : existingPlan ? 'Update Plan' : 'Create Plan'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ProductionPlanningModal;
