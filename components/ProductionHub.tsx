
import React, { useState, useEffect, useMemo } from 'react';
import { ProductionAsset, ShotList, CallSheet, AgencyEquipment, AgencyLocation, Project, User, ProductionPlan, Client, CalendarItem, Task } from '../types';
import {
    MapPin, Camera, ClipboardList, FileText, ChevronRight, ChevronLeft, X, Plus,
    Calendar, Clock, User as UserIcon, CheckCircle, AlertCircle, Video,
    Search, Film, MoreHorizontal, Settings, CheckCircle as CheckCircleIcon,
    Briefcase, Eye, Edit, Copy, Archive, RotateCcw, Trash2, ImageIcon, Zap, Check
} from 'lucide-react';
import PageContainer from './layout/PageContainer';
import PageHeader from './layout/PageHeader';
import PageContent from './layout/PageContent';
import ProductionPlanningModal from './production/ProductionPlanningModal';
import TaskDetailView from './tasks/TaskDetailView';
import { PermissionGate } from './PermissionGate';
import { PERMISSIONS } from '../lib/permissions';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getProductionCountdown, generateProductionTasks, updateProductionTasks, archiveProductionPlan, restoreProductionPlan } from '../utils/productionUtils';

interface ProductionHubProps {
    // Legacy
    assets: ProductionAsset[];
    // New specific entities
    shotLists: ShotList[];
    callSheets: CallSheet[];
    locations: AgencyLocation[];
    equipment: AgencyEquipment[];
    projects: Project[];
    users: User[];
    clients: Client[];
    // Handlers
    onAddShotList: (sl: ShotList) => void;
    onAddCallSheet: (cs: CallSheet) => void;
    onAddLocation: (loc: AgencyLocation) => void;
    onAddEquipment: (eq: AgencyEquipment) => void;
    onUpdateEquipment: (eq: AgencyEquipment) => void;
    onTaskClick?: (task: Task) => void;
    leaveRequests?: any[];
    projectMembers?: any[];
    currentUserId?: string;
    // Task detail props from App.tsx
    tasks?: Task[];
    calendarItems?: any[];
    comments?: any[];
    timeLogs?: any[];
    dependencies?: any[];
    activityLogs?: any[];
    approvalSteps?: any[];
    clientApprovals?: any[];
    files?: any[];
    milestones?: any[];
    workflowTemplates?: any[];
    roles?: any[];
    currentUser?: any;
    onUpdateTask?: (task: Task) => void;
    onAddTask?: (task: Task) => void;
    onAddComment?: (comment: any) => void;
    onAddTimeLog?: (log: any) => void;
    onAddDependency?: (dep: any) => void;
    onUpdateApprovalStep?: (step: any) => void;
    onAddApprovalSteps?: (steps: any[]) => void;
    onUpdateClientApproval?: (approval: any) => void;
    onAddClientApproval?: (approval: any) => void;
    onUploadFile?: (file: any) => void;
    checkPermission?: (permission: string) => boolean;
    onNotify?: (type: string, title: string, message: string) => void;
    onArchiveTask?: (task: Task) => void;
    onDeleteTask?: (task: Task) => void;
    onAddSocialPost?: (post: any) => void;
}
const ProductionHub: React.FC<ProductionHubProps> = ({
    assets, shotLists, callSheets, locations, equipment, projects, users, clients, leaveRequests = [],
    onAddShotList, onAddCallSheet, onAddLocation, onAddEquipment, onUpdateEquipment, projectMembers = [],
    currentUserId = 'current_user', onTaskClick,
    tasks = [], calendarItems = [], comments = [], timeLogs = [], dependencies = [], activityLogs = [],
    approvalSteps = [], clientApprovals = [], files = [], milestones = [],
    workflowTemplates = [], roles = [], currentUser,
    onUpdateTask, onAddTask, onAddComment, onAddTimeLog, onAddDependency,
    onUpdateApprovalStep, onAddApprovalSteps, onUpdateClientApproval,
    onAddClientApproval, onUploadFile, checkPermission, onNotify,
    onArchiveTask, onDeleteTask, onAddSocialPost
}) => {
    // Calendar state
    const [calendarDate, setCalendarDate] = useState(new Date());
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    const dayRefs = React.useRef<{ [key: string]: HTMLButtonElement | null }>({});

    // Production Planning State
    const [productionPlans, setProductionPlans] = useState<ProductionPlan[]>([]);
    const [showArchived, setShowArchived] = useState(false);
    const [isPlanningModalOpen, setIsPlanningModalOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<ProductionPlan | null>(null);
    const [planMenuOpen, setPlanMenuOpen] = useState<string | null>(null);
    const [loadingPlans, setLoadingPlans] = useState(false);
    const [viewingPlanId, setViewingPlanId] = useState<string | null>(null);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

    // Get real-time tasks for the currently viewed plan
    const viewingPlanTasks = useMemo(() => {
        if (!viewingPlanId || !tasks) return [];
        return tasks.filter(t => t.productionPlanId === viewingPlanId);
    }, [viewingPlanId, tasks]);

    // Get productions for the selected calendar date
    const selectedProductions = useMemo(() => {
        return productionPlans.filter(p => {
            const prodDate = new Date(p.productionDate);
            prodDate.setHours(0, 0, 0, 0);
            const checkDate = new Date(calendarDate);
            checkDate.setHours(0, 0, 0, 0);
            return prodDate.getTime() === checkDate.getTime() && !p.isArchived;
        });
    }, [productionPlans, calendarDate]);

    // Helper functions for TaskDetailView
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'not_started': return 'bg-slate-500/10 text-slate-300 border-slate-500/30';
            case 'in_progress': return 'bg-blue-500/10 text-blue-300 border-blue-500/30';
            case 'in_review': return 'bg-purple-500/10 text-purple-300 border-purple-500/30';
            case 'blocked': return 'bg-rose-500/10 text-rose-300 border-rose-500/30';
            case 'completed': return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
            default: return 'bg-white/5 text-slate-100 border-[color:var(--dash-glass-border)]';
        }
    };

    const resolveApprover = (step: any, task: Task): string | null => {
        if (step.specificUserId) return step.specificUserId;
        if (step.projectRoleKey) {
            const member = projectMembers.find((pm: any) => pm.projectId === task.projectId && pm.roleInProject === step.projectRoleKey);
            return member ? member.userId : null;
        }
        if (step.roleId) {
            const roleDef = roles.find((r: any) => r.id === step.roleId);
            if (roleDef) {
                const projectUserIds = projectMembers.filter((pm: any) => pm.projectId === task.projectId).map((pm: any) => pm.userId);
                const projectApprover = users.find(u => u.role === roleDef.name && projectUserIds.includes(u.id));
                if (projectApprover) return projectApprover.id;
                const deptApprover = users.find(u => u.role === roleDef.name && u.department === task.department);
                if (deptApprover) return deptApprover.id;
                const anyApprover = users.find(u => u.role === roleDef.name);
                if (anyApprover) return anyApprover.id;
            }
        }
        return null;
    };

    const handleEditTask = (task: Task) => {
        // For production tasks, just show a notification that editing is not available here
        if (onNotify) {
            onNotify('info', 'Edit Task', 'To edit this task, please go to the Tasks department.');
        }
    };

    // Load production plans
    useEffect(() => {
        loadProductionPlans();
    }, [showArchived]);

    const loadProductionPlans = async () => {
        setLoadingPlans(true);
        try {
            const plansQuery = showArchived
                ? query(collection(db, 'production_plans'))
                : query(collection(db, 'production_plans'), where('isArchived', '==', false));
            
            const snapshot = await getDocs(plansQuery);
            const plans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductionPlan));
            
            // Sort by production date (soonest first)
            plans.sort((a, b) => new Date(a.productionDate).getTime() - new Date(b.productionDate).getTime());
            
            setProductionPlans(plans);
        } catch (error) {
            console.error('Error loading production plans:', error);
        } finally {
            setLoadingPlans(false);
        }
    };

    const handleSaveProductionPlan = async (planData: Partial<ProductionPlan>) => {
        try {
            if (selectedPlan?.id) {
                // Update existing plan
                const planRef = doc(db, 'production_plans', selectedPlan.id);
                await updateDoc(planRef, planData);

                // Load calendar items and tasks for update
                const calendarItems: CalendarItem[] = [];
                for (const itemId of planData.calendarItemIds || []) {
                    const itemDoc = await getDoc(doc(db, 'calendar_items', itemId));
                    if (itemDoc.exists()) {
                        calendarItems.push({ id: itemDoc.id, ...itemDoc.data() } as CalendarItem);
                    }
                }

                const manualTasks: Task[] = [];
                for (const taskId of planData.manualTaskIds || []) {
                    const taskDoc = await getDoc(doc(db, 'tasks', taskId));
                    if (taskDoc.exists()) {
                        manualTasks.push({ id: taskDoc.id, ...taskDoc.data() } as Task);
                    }
                }

                // Update existing production tasks
                await updateProductionTasks(
                    { ...selectedPlan, ...planData } as ProductionPlan,
                    selectedPlan.generatedTaskIds,
                    'SAFE'
                );
            } else {
                // Create new plan
                const newPlanRef = await addDoc(collection(db, 'production_plans'), planData);
                const planId = newPlanRef.id;

                // Update plan with its ID
                await updateDoc(newPlanRef, { id: planId });

                // Load calendar items and tasks
                const calendarItems: CalendarItem[] = [];
                for (const itemId of planData.calendarItemIds || []) {
                    const itemDoc = await getDoc(doc(db, 'calendar_items', itemId));
                    if (itemDoc.exists()) {
                        calendarItems.push({ id: itemDoc.id, ...itemDoc.data() } as CalendarItem);
                    }
                }

                const manualTasks: Task[] = [];
                for (const taskId of planData.manualTaskIds || []) {
                    const taskDoc = await getDoc(doc(db, 'tasks', taskId));
                    if (taskDoc.exists()) {
                        manualTasks.push({ id: taskDoc.id, ...taskDoc.data() } as Task);
                    }
                }

                // Generate production tasks
                await generateProductionTasks(
                    { id: planId, ...planData } as ProductionPlan,
                    calendarItems,
                    manualTasks,
                    currentUserId
                );
            }

            await loadProductionPlans();
            setIsPlanningModalOpen(false);
            setSelectedPlan(null);
        } catch (error) {
            console.error('Error saving production plan:', error);
            throw error;
        }
    };

    const handleViewPlan = async (plan: ProductionPlan) => {
        try {
            // Simply set the plan ID - tasks will be filtered reactively via useMemo
            setViewingPlanId(plan.id);
            setPlanMenuOpen(null);
        } catch (error) {
            console.error('Error loading plan tasks:', error);
            alert('Failed to load plan details.');
        }
    };

    const handleEditPlan = (plan: ProductionPlan) => {
        setSelectedPlan(plan);
        setIsPlanningModalOpen(true);
        setPlanMenuOpen(null);
    };

    const handleDuplicatePlan = (plan: ProductionPlan) => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        setSelectedPlan({
            ...plan,
            id: '',
            name: `${plan.name} (Copy)`,
            productionDate: tomorrow.toISOString().split('T')[0],
            generatedTaskIds: [],
            status: 'DRAFT',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        setIsPlanningModalOpen(true);
        setPlanMenuOpen(null);
    };

    const handleArchivePlan = async (plan: ProductionPlan) => {
        const confirmed = window.confirm(
            `Archive "${plan.name}"?\n\nThis will archive ${plan.generatedTaskIds.length} production tasks. You can restore within 30 days.`
        );
        
        if (confirmed) {
            try {
                await archiveProductionPlan(plan.id, currentUserId, 'user_deleted');
                await loadProductionPlans();
                setPlanMenuOpen(null);
            } catch (error) {
                console.error('Error archiving plan:', error);
                alert('Failed to archive production plan.');
            }
        }
    };

    const handleRestorePlan = async (plan: ProductionPlan) => {
        try {
            await restoreProductionPlan(plan.id);
            await loadProductionPlans();
            setPlanMenuOpen(null);
        } catch (error) {
            console.error('Error restoring plan:', error);
            alert(error instanceof Error ? error.message : 'Failed to restore production plan.');
        }
    };

    const handleUpdateStatus = async (plan: ProductionPlan, newStatus: ProductionPlan['status']) => {
        try {
            const planRef = doc(db, 'production_plans', plan.id);
            await updateDoc(planRef, { 
                status: newStatus,
                updatedAt: new Date().toISOString()
            });
            await loadProductionPlans();
            setPlanMenuOpen(null);
        } catch (error) {
            console.error('Error updating plan status:', error);
            alert('Failed to update status.');
        }
    };

    // --- Sub-Components (Views) ---

    const PlanningView = () => {
        return (
            <div className="space-y-4 md:space-y-6 animate-in fade-in duration-300">
                {/* Header with Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[color:var(--dash-primary)]/10 text-[color:var(--dash-primary)] rounded-lg">
                            <Briefcase className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-900">Production Planning</h3>
                            <p className="text-xs text-slate-500">Manage production schedules and team assignments</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => setShowArchived(!showArchived)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                showArchived
                                    ? 'bg-slate-100 border-slate-300 text-slate-700'
                                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            {showArchived ? 'Hide Archived' : 'Show Archived'}
                        </button>
                        <PermissionGate permission={PERMISSIONS.PRODUCTION.PLANS_CREATE}>
                            <button
                                onClick={() => {
                                    setSelectedPlan(null);
                                    setIsPlanningModalOpen(true);
                                }}
                                className="bg-[color:var(--dash-primary)] text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:shadow-[0_12px_30px_-16px_rgba(230,60,60,0.8)] transition-all flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> New Production Plan
                            </button>
                        </PermissionGate>
                    </div>
                </div>

                {/* Monthly Calendar */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6 w-full min-w-0 overflow-hidden">
                    {/* Mobile: Horizontal Scroll Full Month View */}
                    <div className="md:hidden">
                        {/* Header with Month Navigation */}
                        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        const newDate = new Date(calendarDate);
                                        newDate.setMonth(newDate.getMonth() - 1);
                                        setCalendarDate(newDate);
                                    }}
                                    className="p-1 hover:bg-slate-100 rounded"
                                >
                                    <ChevronLeft className="w-4 h-4 text-slate-600" />
                                </button>
                                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][calendarDate.getMonth()]} {calendarDate.getFullYear()}
                                </h3>
                                <button
                                    onClick={() => {
                                        const newDate = new Date(calendarDate);
                                        newDate.setMonth(newDate.getMonth() + 1);
                                        setCalendarDate(newDate);
                                    }}
                                    className="p-1 hover:bg-slate-100 rounded"
                                >
                                    <ChevronRight className="w-4 h-4 text-slate-600" />
                                </button>
                            </div>
                            <button 
                                onClick={() => setCalendarDate(new Date())}
                                className="text-xs font-medium text-slate-600 hover:text-slate-900"
                            >
                                TODAY
                            </button>
                        </div>

                        {/* Scrollable Full Month Days */}
                        <div ref={scrollContainerRef} className="flex gap-3 px-4 py-4 overflow-x-auto scrollbar-hide">
                            {(() => {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                const selectedDate = new Date(calendarDate);
                                selectedDate.setHours(0, 0, 0, 0);
                                const days = [];
                                
                                // Get first and last day of the month
                                const firstDay = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1);
                                const lastDay = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0);
                                const daysInMonth = lastDay.getDate();
                                
                                // Generate all days in the month
                                for (let i = 1; i <= daysInMonth; i++) {
                                    const date = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), i);
                                    date.setHours(0, 0, 0, 0);
                                    
                                    const dayName = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][date.getDay()];
                                    const dayNum = date.getDate();
                                    const isToday = date.getTime() === today.getTime();
                                    const isSelected = date.getTime() === selectedDate.getTime();
                                    const dayKey = `${date.getFullYear()}-${date.getMonth()}-${dayNum}`;
                                    
                                    // Check if this day has productions
                                    const dayProductions = productionPlans.filter(p => {
                                        const prodDate = new Date(p.productionDate);
                                        prodDate.setHours(0, 0, 0, 0);
                                        return prodDate.getTime() === date.getTime() && !p.isArchived;
                                    });
                                    
                                    days.push(
                                        <button
                                            key={i}
                                            ref={(el) => {
                                                dayRefs.current[dayKey] = el;
                                                // Auto-scroll to selected day on mount or selection change
                                                if (isSelected && el && scrollContainerRef.current) {
                                                    setTimeout(() => {
                                                        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                                                    }, 100);
                                                }
                                            }}
                                            onClick={() => {
                                                setCalendarDate(new Date(date));
                                                // Clear viewingPlanId to show all productions for this day
                                                setViewingPlanId(null);
                                            }}
                                            className={`flex-shrink-0 flex flex-col items-center justify-center w-16 h-20 rounded-xl transition-all ${
                                                isToday
                                                    ? 'bg-[color:var(--dash-primary)] text-white shadow-lg'
                                                    : isSelected
                                                        ? 'bg-blue-50 border-2 border-blue-400 text-blue-700'
                                                        : dayProductions.length > 0
                                                            ? 'bg-green-100 border-2 border-green-400 text-green-800 shadow-sm'
                                                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                            }`}
                                        >
                                            <span className={`text-[10px] font-semibold mb-1 ${
                                                isToday ? 'text-white/80' : isSelected ? 'text-blue-600' : dayProductions.length > 0 ? 'text-green-700' : 'text-slate-500'
                                            }`}>
                                                {dayName}
                                            </span>
                                            <span className={`text-2xl font-bold ${
                                                isToday ? 'text-white' : isSelected ? 'text-blue-700' : dayProductions.length > 0 ? 'text-green-800' : 'text-slate-800'
                                            }`}>
                                                {dayNum}
                                            </span>
                                            {dayProductions.length > 0 && !isToday && !isSelected && (
                                                <div className="flex items-center gap-1 mt-1">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-600"></div>
                                                    {dayProductions.length > 1 && (
                                                        <span className="text-[8px] font-semibold text-green-700">+{dayProductions.length}</span>
                                                    )}
                                                </div>
                                            )}
                                            {isToday && (
                                                <span className="text-[8px] text-white/80 mt-1">TODAY</span>
                                            )}
                                        </button>
                                    );
                                }
                                
                                return days;
                            })()}
                        </div>

                        {/* Selected Day Info */}
                        <div className="px-4 py-3 border-t border-slate-100">
                            {selectedProductions.length === 0 ? (
                                <div className="text-center py-6">
                                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Film className="w-6 h-6 text-slate-400" />
                                    </div>
                                    <p className="text-sm font-medium text-slate-900 mb-1">
                                        No events on {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][calendarDate.getMonth()]} {calendarDate.getDate()}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        Select another day or schedule a meeting
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-slate-500 mb-2">
                                        {selectedProductions.length} {selectedProductions.length === 1 ? 'production' : 'productions'} scheduled
                                    </p>
                                    {selectedProductions.map(prod => (
                                        <button
                                            key={prod.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                console.log('Opening production plan:', prod.id, prod.name);
                                                setViewingPlanId(prod.id);
                                            }}
                                            className="w-full flex items-center gap-3 p-3 bg-green-50 border border-green-100 rounded-lg hover:bg-green-100 transition-colors group"
                                        >
                                            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                                                <Film className="w-5 h-5 text-white" />
                                            </div>
                                            <div className="flex-1 text-left">
                                                <p className="text-sm font-semibold text-slate-900">{prod.name}</p>
                                                <p className="text-xs text-slate-600">{prod.productionType}</p>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-green-600 transition-colors" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Desktop: Full Month Grid */}
                    <div className="hidden md:block p-5">
                        {/* Calendar Header */}
                        <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
                            <h3 className="text-lg font-semibold text-slate-900">Production Calendar</h3>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        const newDate = new Date(calendarDate);
                                        newDate.setMonth(newDate.getMonth() - 1);
                                        setCalendarDate(newDate);
                                    }}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4 rotate-180 text-slate-600" />
                                </button>
                                <button
                                    onClick={() => setCalendarDate(new Date())}
                                    className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    Today
                                </button>
                                <button
                                    onClick={() => {
                                        const newDate = new Date(calendarDate);
                                        newDate.setMonth(newDate.getMonth() + 1);
                                        setCalendarDate(newDate);
                                    }}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4 text-slate-600" />
                                </button>
                            </div>
                        </div>

                        {/* Calendar Month Title */}
                        <div className="text-center text-base md:text-lg font-semibold text-slate-900 mb-3 truncate">
                            {['January', 'February', 'March', 'April', 'May', 'June', 
                              'July', 'August', 'September', 'October', 'November', 'December'][calendarDate.getMonth()]} {calendarDate.getFullYear()}
                        </div>

                        {/* Day Names Header */}
                        <div className="grid grid-cols-7 gap-2 mb-1 w-full">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className="text-center text-xs font-semibold text-slate-500 py-1">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 gap-2 w-full min-w-0">
                        {(() => {
                            const year = calendarDate.getFullYear();
                            const month = calendarDate.getMonth();
                            const firstDay = new Date(year, month, 1);
                            const daysInMonth = new Date(year, month + 1, 0).getDate();
                            const startingDayOfWeek = firstDay.getDay();
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);

                            const productionDays = productionPlans
                                .filter(p => !p.isArchived)
                                .map(p => ({
                                    date: new Date(p.productionDate),
                                    plan: p
                                }));

                            const getDayProductions = (day: number) => {
                                const dayDate = new Date(year, month, day);
                                dayDate.setHours(0, 0, 0, 0);
                                return productionDays.filter(pd => {
                                    const prodDate = new Date(pd.date);
                                    prodDate.setHours(0, 0, 0, 0);
                                    return prodDate.getTime() === dayDate.getTime();
                                });
                            };

                            const isToday = (day: number) => {
                                const dayDate = new Date(year, month, day);
                                dayDate.setHours(0, 0, 0, 0);
                                return dayDate.getTime() === today.getTime();
                            };

                            const calendarCells = [];

                            // Empty cells before month starts
                            for (let i = 0; i < startingDayOfWeek; i++) {
                                calendarCells.push(
                                    <div key={`empty-${i}`} className="h-10 md:h-11 w-full min-w-0" />
                                );
                            }

                            // Days of the month - Fixed Height cells
                            for (let day = 1; day <= daysInMonth; day++) {
                                const dayProductions = getDayProductions(day);
                                const hasProduction = dayProductions.length > 0;
                                const isTodayDate = isToday(day);

                                calendarCells.push(
                                    <div
                                        key={day}
                                        className={`h-10 md:h-11 w-full min-w-0 border rounded p-1 transition-all flex flex-col items-center justify-center cursor-pointer ${
                                            isTodayDate 
                                                ? 'border-[color:var(--dash-primary)] bg-[color:var(--dash-primary)]/5 font-bold' 
                                                : hasProduction
                                                    ? 'border-2 border-green-400 bg-green-100 hover:bg-green-200 shadow-sm'
                                                    : 'border-slate-200 hover:bg-slate-50'
                                        }`}
                                        onClick={() => {
                                            const date = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day);
                                            setCalendarDate(date);
                                            // Clear viewingPlanId to show all productions for this day in mobile view
                                            setViewingPlanId(null);
                                        }}
                                    >
                                        <div className={`text-xs font-medium ${
                                            isTodayDate 
                                                ? 'text-[color:var(--dash-primary)]' 
                                                : hasProduction 
                                                    ? 'text-green-800 font-semibold'
                                                    : 'text-slate-700'
                                        }`}>
                                            {day}
                                        </div>
                                        {hasProduction && (
                                            <div className="text-[8px] bg-gradient-to-r from-green-600 to-emerald-600 text-white px-1 py-0.5 rounded truncate mt-0.5 font-medium">
                                                {dayProductions.length > 1 ? `${dayProductions.length} plans` : dayProductions[0].plan.name.substring(0, 6)}
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            // Fill remaining cells to complete 42 cells (6 rows)
                            const totalCells = startingDayOfWeek + daysInMonth;
                            const remainingCells = 42 - totalCells;
                            for (let i = 0; i < remainingCells; i++) {
                                calendarCells.push(
                                    <div key={`empty-end-${i}`} className="h-10 md:h-11 w-full min-w-0" />
                                );
                            }

                            return calendarCells;
                        })()}
                        </div>

                        {/* Calendar Legend */}
                        <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs gap-2">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded border-2 border-[color:var(--dash-primary)] bg-[color:var(--dash-primary)]/10"></div>
                                    <span className="text-slate-600">Today</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded bg-gradient-to-r from-green-500 to-emerald-500"></div>
                                    <span className="text-slate-600">Production</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                                <Film className="w-3.5 h-3.5" />
                                {productionPlans.filter(p => !p.isArchived).length} scheduled
                            </div>
                        </div>

                        {/* Desktop: Selected Day Productions - Show when a day with productions is clicked */}
                        {selectedProductions.length > 0 && (
                            <div className="mt-6 pt-4 border-t border-slate-200">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-sm font-semibold text-slate-700">
                                        {calendarDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                    </h4>
                                    <span className="text-xs text-slate-500">
                                        {selectedProductions.length} {selectedProductions.length === 1 ? 'production' : 'productions'} scheduled
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {selectedProductions.map(prod => (
                                        <button
                                            key={prod.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                console.log('Opening production plan:', prod.id, prod.name);
                                                setViewingPlanId(prod.id);
                                            }}
                                            className="w-full flex items-center gap-3 p-3 bg-green-50 border border-green-100 rounded-lg hover:bg-green-100 transition-colors group"
                                        >
                                            <Film className="w-4 h-4 text-green-600 flex-shrink-0" />
                                            <div className="flex-1 text-left min-w-0">
                                                <div className="text-sm font-medium text-slate-900 truncate">{prod.name}</div>
                                                <div className="text-xs text-slate-600 truncate">{prod.productionType}</div>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-green-600 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Production Plans Grid */}
                {loadingPlans ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 animate-pulse">
                                <div className="h-4 bg-slate-200 rounded w-2/3 mb-3"></div>
                                <div className="h-3 bg-slate-200 rounded w-full mb-2"></div>
                                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                            </div>
                        ))}
                    </div>
                ) : productionPlans.length === 0 ? (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
                        <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-700 mb-2">No Production Plans</h3>
                        <p className="text-sm text-slate-500 mb-6">
                            {showArchived 
                                ? 'No archived production plans found.'
                                : 'Create your first production plan to get started.'}
                        </p>
                        <PermissionGate permission={PERMISSIONS.PRODUCTION.PLANS_CREATE}>
                            <button
                                onClick={() => {
                                    setSelectedPlan(null);
                                    setIsPlanningModalOpen(true);
                                }}
                                className="bg-[color:var(--dash-primary)] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:shadow-[0_12px_30px_-16px_rgba(230,60,60,0.8)] transition-all inline-flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> Create Production Plan
                            </button>
                        </PermissionGate>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                        {productionPlans.map(plan => {
                            const countdown = getProductionCountdown(plan.productionDate);
                            const isRestoreable = plan.isArchived && plan.canRestoreUntil && new Date(plan.canRestoreUntil) > new Date();
                            
                            return (
                                <div
                                    key={plan.id}
                                    className={`bg-white rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-all ${
                                        plan.isArchived ? 'border-slate-300 opacity-75' : 'border-slate-200'
                                    }`}
                                >
                                    <div className="p-6">
                                        <div className="mb-3">
                                            <h4 className="font-bold text-slate-900 mb-1 truncate" dir="auto" style={{ unicodeBidi: 'plaintext', textAlign: 'start' }}>
                                                {plan.name}
                                            </h4>
                                            <p className="text-sm text-slate-600 truncate" dir="auto" style={{ unicodeBidi: 'plaintext', textAlign: 'start' }}>
                                                {plan.clientName}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="flex items-center gap-1 text-xs text-slate-500">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {new Date(plan.productionDate).toLocaleDateString()}
                                            </div>
                                            <span className={`text-xs font-medium ${countdown.color}`}>
                                                {countdown.label}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-3 text-xs mb-4 flex-wrap">
                                            <div className="flex items-center gap-1 text-[color:var(--dash-primary)]">
                                                <Calendar className="w-3.5 h-3.5" />
                                                <span className="font-semibold">{plan.calendarItemIds.length}</span>
                                            </div>
                                            <span className="text-slate-400">+</span>
                                            <div className="flex items-center gap-1 text-slate-500">
                                                <ClipboardList className="w-3.5 h-3.5" />
                                                <span className="font-semibold">{plan.manualTaskIds.length}</span>
                                            </div>
                                            <span className="text-slate-400">=</span>
                                            <div className="font-semibold text-slate-700">
                                                {plan.calendarItemIds.length + plan.manualTaskIds.length} items
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                            <div className="flex -space-x-2">
                                                {users
                                                    .filter(u => plan.teamMemberIds.includes(u.id))
                                                    .slice(0, 4)
                                                    .map(user => (
                                                        <img
                                                            key={user.id}
                                                            src={user.avatar}
                                                            alt={user.name}
                                                            className="w-7 h-7 rounded-full border-2 border-white"
                                                            title={user.name}
                                                        />
                                                    ))}
                                                {plan.teamMemberIds.length > 4 && (
                                                    <div className="w-7 h-7 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600">
                                                        +{plan.teamMemberIds.length - 4}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {plan.isArchived && plan.canRestoreUntil && (
                                            <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                                                Restore until {new Date(plan.canRestoreUntil).toLocaleDateString()}
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Button */}
                                    <div className="px-6 pb-4">
                                        <button
                                            onClick={() => handleViewPlan(plan)}
                                            className="w-full bg-[color:var(--dash-primary)] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:shadow-[0_12px_30px_-16px_rgba(230,60,60,0.8)] transition-all flex items-center justify-center gap-2"
                                        >
                                            <Eye className="w-4 h-4" /> View Tasks
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    const CalendarView = () => {
        // Get production plans with dates
        const productionDays = productionPlans
            .filter(p => !p.isArchived)
            .map(p => ({
                date: new Date(p.productionDate),
                plan: p
            }));

        // Calendar navigation
        const year = calendarDate.getFullYear();
        const month = calendarDate.getMonth();
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startingDayOfWeek = firstDay.getDay();
        const daysInMonth = lastDay.getDate();

        const previousMonth = () => {
            setCalendarDate(new Date(year, month - 1, 1));
        };

        const nextMonth = () => {
            setCalendarDate(new Date(year, month + 1, 1));
        };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Generate calendar days
        const calendarDays = [];
        
        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            calendarDays.push(null);
        }
        
        // Add all days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            calendarDays.push(day);
        }

        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        // Check if a day has production
        const getDayProductions = (day: number) => {
            const dayDate = new Date(year, month, day);
            dayDate.setHours(0, 0, 0, 0);
            
            return productionDays.filter(pd => {
                const prodDate = new Date(pd.date);
                prodDate.setHours(0, 0, 0, 0);
                return prodDate.getTime() === dayDate.getTime();
            });
        };

        const isToday = (day: number) => {
            const dayDate = new Date(year, month, day);
            dayDate.setHours(0, 0, 0, 0);
            return dayDate.getTime() === today.getTime();
        };

        return (
            <div className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    {/* Calendar Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-slate-900">
                            {monthNames[month]} {year}
                        </h2>
                        <div className="flex items-center justify-center gap-2">
                            <button
                                onClick={previousMonth}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <ChevronRight className="w-5 h-5 rotate-180 text-slate-600" />
                            </button>
                            <button
                                onClick={() => setCalendarDate(new Date())}
                                className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                Today
                            </button>
                            <button
                                onClick={nextMonth}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <ChevronRight className="w-5 h-5 text-slate-600" />
                            </button>
                        </div>
                    </div>

                    {/* Day Names */}
                    <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1 sm:mb-2">
                        {dayNames.map(day => (
                            <div key={day} className="text-center text-xs sm:text-sm font-semibold text-slate-600 py-1 sm:py-2">
                                <span className="hidden sm:inline">{day}</span>
                                <span className="sm:hidden">{day.slice(0, 1)}</span>
                            </div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1 sm:gap-2">
                        {calendarDays.map((day, index) => {
                            if (day === null) {
                                return <div key={`empty-${index}`} className="aspect-square" />;
                            }

                            const dayProductions = getDayProductions(day);
                            const hasProduction = dayProductions.length > 0;
                            const isTodayDate = isToday(day);

                            return (
                                <div
                                    key={day}
                                    className={`aspect-square min-h-[50px] sm:min-h-[70px] border rounded-md sm:rounded-lg p-1 sm:p-2 transition-all ${
                                        isTodayDate 
                                            ? 'border-[color:var(--dash-primary)] bg-[color:var(--dash-primary)]/5' 
                                            : hasProduction
                                                ? 'border-green-300 bg-green-50 hover:bg-green-100 cursor-pointer'
                                                : 'border-slate-200 hover:bg-slate-50'
                                    }`}
                                    onClick={() => {
                                        // Calendar day click - removed tab navigation
                                    }}
                                >
                                    <div className="flex flex-col h-full">
                                        <div className={`text-xs sm:text-sm font-medium mb-0.5 sm:mb-1 ${
                                            isTodayDate 
                                                ? 'text-[color:var(--dash-primary)]' 
                                                : hasProduction 
                                                    ? 'text-green-700'
                                                    : 'text-slate-700'
                                        }`}>
                                            {day}
                                        </div>
                                        {hasProduction && (
                                            <div className="flex-1 flex flex-col gap-0.5 sm:gap-1">
                                                {dayProductions.slice(0, 2).map((prod, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="text-[7px] sm:text-[10px] bg-gradient-to-r from-green-500 to-emerald-500 text-white px-0.5 sm:px-1.5 py-0.5 rounded truncate font-medium"
                                                        title={prod.plan.name}
                                                    >
                                                        <span className="hidden sm:inline">🎬 </span>{prod.plan.name}
                                                    </div>
                                                ))}
                                                {dayProductions.length > 2 && (
                                                    <div className="text-[7px] sm:text-[10px] text-green-600 font-medium">
                                                        +{dayProductions.length - 2}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Legend */}
                    <div className="mt-6 pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded border-2 border-[color:var(--dash-primary)] bg-[color:var(--dash-primary)]/10"></div>
                            <span className="text-slate-600">Today</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-gradient-to-r from-green-500 to-emerald-500"></div>
                            <span className="text-slate-600">Production Day</span>
                        </div>
                        <div className="flex items-center gap-2 sm:ml-auto">
                            <Film className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-600 font-medium">
                                {productionDays.length} production{productionDays.length !== 1 ? 's' : ''} scheduled
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <PageContainer>
            <PageHeader
                title="Production Planning"
                subtitle="Plan and manage production shoots"
            />

            <PageContent>
                <PlanningView />
            </PageContent>

            {/* Production Planning Modal */}
            <ProductionPlanningModal
                isOpen={isPlanningModalOpen}
                onClose={() => {
                    setIsPlanningModalOpen(false);
                    setSelectedPlan(null);
                    setPlanMenuOpen(null);
                }}
                clients={clients}
                users={users}
                leaveRequests={leaveRequests}
                existingPlan={selectedPlan}
                onSave={handleSaveProductionPlan}
            />

            {/* Plan Details Drawer */}
            {viewingPlanId && (() => {
                const viewingPlan = productionPlans.find(p => p.id === viewingPlanId);
                
                if (!viewingPlan) {
                    console.error('Production plan not found:', viewingPlanId);
                    return (
                        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setViewingPlanId(null)}>
                            <div className="bg-white rounded-xl p-6 max-w-md">
                                <h3 className="text-lg font-semibold text-red-600 mb-2">Plan Not Found</h3>
                                <p className="text-slate-600 mb-4">The selected production plan could not be loaded.</p>
                                <button onClick={() => setViewingPlanId(null)} className="px-4 py-2 bg-slate-900 text-white rounded-lg">
                                    Close
                                </button>
                            </div>
                        </div>
                    );
                }
                
                return (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-0 sm:p-4" onClick={() => setViewingPlanId(null)}>
                    <div className="bg-white rounded-none sm:rounded-xl shadow-2xl w-full max-w-4xl h-full sm:max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-[color:var(--dash-primary)] to-rose-600 text-white p-4 sm:p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1 pr-2">
                                    <h2 className="text-xl sm:text-2xl font-bold mb-1">
                                        {viewingPlan.name}
                                    </h2>
                                    <p className="text-white/80 text-xs sm:text-sm">
                                        {viewingPlan.clientName} • {new Date(viewingPlan.productionDate).toLocaleDateString()}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setViewingPlanId(null)}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
                                >
                                    <X className="w-5 h-5 sm:w-6 sm:h-6" />
                                </button>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                <PermissionGate permission={PERMISSIONS.PRODUCTION.PLANS_EDIT}>
                                    <button
                                        onClick={() => {
                                            setSelectedPlan(viewingPlan);
                                            setIsPlanningModalOpen(true);
                                        }}
                                        className="flex items-center justify-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all text-white font-medium text-sm"
                                    >
                                        <Edit className="w-4 h-4" />
                                        <span>Edit Plan</span>
                                    </button>
                                </PermissionGate>
                                <PermissionGate permission={PERMISSIONS.PRODUCTION.PLANS_DELETE}>
                                    <button
                                        onClick={async () => {
                                            const relatedTasks = tasks.filter(t => t.productionPlanId === viewingPlan.id);
                                            
                                            const confirmed = window.confirm(
                                                `⚠️ Delete "${viewingPlan.name}"?\n\n` +
                                                `This will permanently delete:\n` +
                                                `• The production plan\n` +
                                                `• ${relatedTasks.length} related task(s)\n\n` +
                                                `This action CANNOT be undone!\n\n` +
                                                `Are you sure?`
                                            );
                                            
                                            if (confirmed) {
                                                try {
                                                    // Delete all related tasks
                                                    for (const task of relatedTasks) {
                                                        if (onDeleteTask) {
                                                            // Use soft delete if available
                                                            await updateDoc(doc(db, 'tasks', task.id), {
                                                                isDeleted: true,
                                                                deletedAt: new Date().toISOString(),
                                                                deletedBy: currentUserId
                                                            });
                                                        }
                                                    }
                                                    
                                                    // Delete the production plan
                                                    await archiveProductionPlan(viewingPlan.id, currentUserId, 'user_deleted');
                                                    await loadProductionPlans();
                                                    setViewingPlanId(null);
                                                    alert('🗑️ Production plan and all related tasks deleted successfully.');
                                                } catch (error) {
                                                    console.error('Error deleting production plan:', error);
                                                    alert('Failed to delete production plan.');
                                                }
                                            }
                                        }}
                                        className="flex items-center justify-center gap-2 px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 rounded-lg transition-all text-white font-medium text-sm"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        <span>Finished Plan</span>
                                    </button>
                                </PermissionGate>
                            </div>
                        </div>

                        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(100vh-180px)] sm:max-h-[calc(90vh-120px)]">
                            <div className="mb-6">
                                {/* Progress Summary */}
                                {viewingPlanTasks.length > 0 && (() => {
                                    const completedCount = viewingPlanTasks.filter(t => t.status === 'completed').length;
                                    const totalCount = viewingPlanTasks.length;
                                    const progressPercent = Math.round((completedCount / totalCount) * 100);
                                    const isComplete = progressPercent === 100;
                                    
                                    return (
                                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mb-6">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <CheckCircleIcon className="w-5 h-5 text-green-600" />
                                                    <span className="font-semibold text-green-900">Production Progress</span>
                                                </div>
                                                <span className="text-2xl font-bold text-green-600">{progressPercent}%</span>
                                            </div>
                                            <div className="w-full bg-green-100 rounded-full h-3 mb-2 overflow-hidden">
                                                <div 
                                                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-500"
                                                    style={{ width: `${progressPercent}%` }}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm text-green-700">
                                                    {completedCount} of {totalCount} tasks completed
                                                </p>
                                                {isComplete && (
                                                    <button
                                                        onClick={async () => {
                                                            const plan = productionPlans.find(p => p.id === viewingPlanId);
                                                            if (!plan) return;
                                                            
                                                            const confirmed = window.confirm(
                                                                `✅ Complete "${plan.name}"?\n\n` +
                                                                `All tasks are done! This will:\n` +
                                                                `• Mark the production as completed\n` +
                                                                `• Archive the plan and all tasks\n` +
                                                                `• Move to archive (restorable within 30 days)\n\n` +
                                                                `Continue?`
                                                            );
                                                            
                                                            if (confirmed) {
                                                                try {
                                                                    await archiveProductionPlan(plan.id, currentUserId, 'completed');
                                                                    await loadProductionPlans();
                                                                    setViewingPlanId(null);
                                                                    alert('🎉 Production completed and archived successfully!');
                                                                } catch (error) {
                                                                    console.error('Error completing production:', error);
                                                                    alert('Failed to complete production plan.');
                                                                }
                                                            }
                                                        }}
                                                        className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg font-semibold text-sm"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                        Finish Production
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}

                                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                    <Film className="w-5 h-5 text-[color:var(--dash-primary)]" />
                                    Production Tasks Checklist
                                </h3>

                                {viewingPlanTasks.length === 0 ? (
                                    <div className="bg-slate-50 rounded-lg p-8 text-center">
                                        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                        <p className="text-slate-600">No tasks generated for this plan yet.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {viewingPlanTasks.map(task => {
                                            const assignedUsers = task.assigneeIds?.map(id => users.find(u => u.id === id)).filter(Boolean) || [];
                                            const statusColors: Record<string, string> = {
                                                'TODO': 'bg-slate-100 text-slate-700 border-slate-200',
                                                'IN_PROGRESS': 'bg-blue-50 text-blue-700 border-blue-200',
                                                'COMPLETED': 'bg-green-50 text-green-700 border-green-200',
                                                'BLOCKED': 'bg-rose-50 text-rose-700 border-rose-200'
                                            };

                                            const isCompleted = task.status === 'completed';

                                            const handleCheckboxClick = async (e: React.MouseEvent) => {
                                                e.stopPropagation();
                                                
                                                if (!onUpdateTask) {
                                                    console.warn('onUpdateTask is not available');
                                                    return;
                                                }
                                                
                                                // Toggle completion status
                                                const newStatus = isCompleted ? 'in_progress' : 'completed';
                                                
                                                try {
                                                    // Update task status
                                                    await onUpdateTask({
                                                        ...task,
                                                        status: newStatus as any,
                                                        completedAt: newStatus === 'completed' ? new Date().toISOString() : null
                                                    });
                                                    console.log(`Task ${task.id} updated to ${newStatus}`);
                                                } catch (error) {
                                                    console.error('Error updating task:', error);
                                                }
                                            };

                                            return (
                                                <div
                                                    key={task.id}
                                                    className={`bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-all group ${isCompleted ? 'opacity-60' : ''}`}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        {/* Checkbox */}
                                                        <button
                                                            onClick={handleCheckboxClick}
                                                            className="flex-shrink-0 mt-1"
                                                        >
                                                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                                                isCompleted 
                                                                    ? 'bg-green-500 border-green-500' 
                                                                    : 'border-slate-300 hover:border-[color:var(--dash-primary)] hover:bg-slate-50'
                                                            }`}>
                                                                {isCompleted && (
                                                                    <Check className="w-3.5 h-3.5 text-white" />
                                                                )}
                                                            </div>
                                                        </button>

                                                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedTaskId(task.id)}>
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <span className="text-lg">🎬</span>
                                                                <h4 className={`font-semibold group-hover:text-[color:var(--dash-primary)] transition-colors truncate ${
                                                                    isCompleted ? 'text-slate-500 line-through' : 'text-slate-900'
                                                                }`} dir="auto" style={{ unicodeBidi: 'plaintext', textAlign: 'start' }}>
                                                                    {task.title}
                                                                </h4>
                                                            </div>
                                                            {task.description && (
                                                                <p className={`text-sm line-clamp-2 mb-3 ${
                                                                    isCompleted ? 'text-slate-400' : 'text-slate-600'
                                                                }`} dir="auto" style={{ unicodeBidi: 'plaintext', textAlign: 'start' }}>
                                                                    {task.description}
                                                                </p>
                                                            )}
                                                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                                                {task.dueDate && (
                                                                    <span className="flex items-center gap-1">
                                                                        <Calendar className="w-3 h-3" />
                                                                        {new Date(task.dueDate).toLocaleDateString()}
                                                                    </span>
                                                                )}
                                                                {assignedUsers.length > 0 && (
                                                                    <div className="flex items-center gap-1">
                                                                        <UserIcon className="w-3 h-3" />
                                                                        <div className="flex -space-x-2">
                                                                            {assignedUsers.slice(0, 3).map(user => (
                                                                                <div
                                                                                    key={user!.id}
                                                                                    className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-semibold border-2 border-white"
                                                                                    title={user!.name}
                                                                                >
                                                                                    {user!.name.substring(0, 2).toUpperCase()}
                                                                                </div>
                                                                            ))}
                                                                            {assignedUsers.length > 3 && (
                                                                                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-semibold border-2 border-white">
                                                                                    +{assignedUsers.length - 3}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-2">
                                                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[task.status] || statusColors.TODO}`}>
                                                                {task.status.replace('_', ' ')}
                                                            </span>
                                                            {task.sourceType && (
                                                                <span className="px-2 py-0.5 rounded text-xs bg-purple-50 text-purple-700 border border-purple-200">
                                                                    {task.sourceType === 'calendar' ? '📅 Calendar' : '📋 Manual'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                );
            })()}

            {/* Task Detail Modal */}
            {selectedTaskId && viewingPlanTasks.length > 0 && (() => {
                const selectedTask = viewingPlanTasks.find(t => t.id === selectedTaskId);
                if (!selectedTask) {
                    setSelectedTaskId(null);
                    return null;
                }

                const taskProject = projects.find(p => p.id === selectedTask.projectId);
                
                return (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedTaskId(null)}>
                        <div 
                            className="w-full max-w-[900px] max-h-[85vh] bg-[color:var(--dash-surface-elevated)] rounded-2xl border border-[color:var(--dash-glass-border)] shadow-2xl overflow-hidden flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-[color:var(--dash-glass-border)] bg-[color:var(--dash-surface-elevated)]/95 backdrop-blur-sm sticky top-0 z-10">
                                <h3 className="text-lg font-semibold text-slate-100">Task Details</h3>
                                <button 
                                    onClick={() => setSelectedTaskId(null)}
                                    className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Modal Content - Scrollable */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                {currentUser && (
                                    <TaskDetailView
                                        task={selectedTask}
                                        project={taskProject}
                                        users={users}
                                        comments={comments?.filter(c => c.taskId === selectedTask.id) || []}
                                        timeLogs={timeLogs?.filter(t => t.taskId === selectedTask.id) || []}
                                        dependencies={dependencies?.filter(d => d.taskId === selectedTask.id) || []}
                                        activityLogs={activityLogs?.filter(l => l.taskId === selectedTask.id) || []}
                                        taskSteps={approvalSteps?.filter(s => s.taskId === selectedTask.id) || []}
                                        clientApproval={clientApprovals?.find(ca => ca.taskId === selectedTask.id)}
                                        taskFiles={files?.filter(f => f.taskId === selectedTask.id) || []}
                                        allTasks={tasks || []}
                                        currentUser={currentUser}
                                        calendarItems={calendarItems}
                                        workflowTemplates={workflowTemplates || []}
                                        milestones={milestones || []}
                                        onUpdateTask={onUpdateTask || (async () => {})}
                                        onAddTask={onAddTask || (async () => {})}
                                        onAddComment={onAddComment || (async () => {})}
                                        onAddTimeLog={onAddTimeLog || (async () => {})}
                                        onAddDependency={onAddDependency || (async () => {})}
                                        onUpdateApprovalStep={onUpdateApprovalStep || (async () => {})}
                                        onAddApprovalSteps={onAddApprovalSteps || (async () => {})}
                                        onUpdateClientApproval={onUpdateClientApproval || (async () => {})}
                                        onAddClientApproval={onAddClientApproval || (async () => {})}
                                        onUploadFile={onUploadFile || (async () => {})}
                                        onNotify={onNotify || (() => {})}
                                        onArchiveTask={onArchiveTask || (async () => {})}
                                        onDeleteTask={onDeleteTask || (async () => {})}
                                        onEditTask={handleEditTask}
                                        getStatusColor={getStatusColor}
                                        resolveApprover={resolveApprover}
                                        onAddSocialPost={onAddSocialPost || (async () => {})}
                                        checkPermission={checkPermission || (() => false)}
                                        leaveRequests={leaveRequests}
                                        isProductionView={true}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}
        </PageContainer>
    );
};

export default ProductionHub;

