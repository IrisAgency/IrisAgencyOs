
import React, { useState, useEffect } from 'react';
import { ProductionAsset, ShotList, CallSheet, AgencyEquipment, AgencyLocation, Project, User, ProductionPlan, Client, CalendarItem, Task } from '../types';
import {
    MapPin, Camera, ClipboardList, FileText, ChevronRight, X, Plus,
    Calendar, Clock, User as UserIcon, CheckCircle, AlertCircle, Video,
    Search, Film, MoreHorizontal, Settings, CheckCircle as CheckCircleIcon,
    Briefcase, Eye, Edit, Copy, Archive, RotateCcw, Trash2, ImageIcon, Zap
} from 'lucide-react';
import Modal from './common/Modal';
import PageContainer from './layout/PageContainer';
import PageHeader from './layout/PageHeader';
import PageContent from './layout/PageContent';
import ProductionPlanningModal from './production/ProductionPlanningModal';
import MyProductionWidget from './production/MyProductionWidget';
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
    const [activeTab, setActiveTab] = useState<'Overview' | 'Planning' | 'Shot Lists' | 'Call Sheets' | 'Equipment' | 'Locations'>('Overview');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<string>('');

    // Call Sheet Form State
    const [csDate, setCsDate] = useState('');
    const [csTime, setCsTime] = useState('');
    const [csLocation, setCsLocation] = useState('');
    const [csProject, setCsProject] = useState('');
    const [selectedCrew, setSelectedCrew] = useState<string[]>([]);

    // Production Planning State
    const [productionPlans, setProductionPlans] = useState<ProductionPlan[]>([]);
    const [showArchived, setShowArchived] = useState(false);
    const [isPlanningModalOpen, setIsPlanningModalOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<ProductionPlan | null>(null);
    const [planMenuOpen, setPlanMenuOpen] = useState<string | null>(null);
    const [loadingPlans, setLoadingPlans] = useState(false);
    const [viewingPlanId, setViewingPlanId] = useState<string | null>(null);
    const [viewingPlanTasks, setViewingPlanTasks] = useState<Task[]>([]);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

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
        if (activeTab === 'Planning') {
            loadProductionPlans();
        }
    }, [activeTab, showArchived]);

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
            // Load the generated tasks for this plan
            const tasksQuery = query(collection(db, 'tasks'), where('productionPlanId', '==', plan.id));
            const tasksSnapshot = await getDocs(tasksQuery);
            const tasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
            
            setViewingPlanId(plan.id);
            setViewingPlanTasks(tasks);
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

    const checkAvailability = (userId: string, dateStr: string) => {
        if (!dateStr || !leaveRequests) return true;
        const targetDate = new Date(dateStr);
        targetDate.setHours(0, 0, 0, 0);

        const conflict = leaveRequests.find((req: any) => { // Type as any for now or import LeaveRequest
            if (req.userId !== userId || req.status !== 'approved') return false;
            const start = new Date(req.startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(req.endDate);
            end.setHours(0, 0, 0, 0);
            return targetDate >= start && targetDate <= end;
        });
        return !conflict;
    };

    const handleCreateCallSheet = (e: React.FormEvent) => {
        e.preventDefault();
        const newSheet: CallSheet = {
            id: `cs${Date.now()}`,
            projectId: csProject,
            locationId: csLocation,
            date: csDate,
            callTime: csTime,
            status: 'Draft',
            crew: selectedCrew.map(uid => {
                const u = users.find(user => user.id === uid);
                return { id: uid, role: u?.role || 'Crew', name: u?.name || 'Unknown', callTime: csTime };
            }),
            productionNotes: '',
            equipmentList: [],
            createdBy: 'current_user', // Mock ID
            createdAt: new Date().toISOString()
        };
        onAddCallSheet(newSheet);
        setIsModalOpen(false);
        // Reset form
        setCsDate(''); setCsTime(''); setCsLocation(''); setCsProject(''); setSelectedCrew([]);
    };

    const toggleCrewSelection = (userId: string) => {
        if (selectedCrew.includes(userId)) {
            setSelectedCrew(prev => prev.filter(id => id !== userId));
        } else {
            setSelectedCrew(prev => [...prev, userId]);
        }
    };

    // --- Sub-Components (Views) ---

    const OverviewView = () => {
        const upcomingShoots = callSheets
            .filter(cs => new Date(cs.date) >= new Date())
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const equipmentIssues = equipment.filter(e => e.status === 'maintenance' || e.status === 'lost');

        return (
            <div className="space-y-4 md:space-y-6 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><ClipboardList className="w-5 h-5" /></div>
                            <h3 className="font-semibold text-slate-900">Upcoming Shoots</h3>
                        </div>
                        <p className="text-3xl font-bold text-slate-900">{upcomingShoots.length}</p>
                        <p className="text-xs text-slate-500 mt-1">Scheduled next 30 days</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Camera className="w-5 h-5" /></div>
                            <h3 className="font-semibold text-slate-900">Active Gear</h3>
                        </div>
                        <p className="text-3xl font-bold text-slate-900">{equipment.filter(e => e.status === 'checked_out').length}</p>
                        <p className="text-xs text-slate-500 mt-1">Items currently on set</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><MapPin className="w-5 h-5" /></div>
                            <h3 className="font-semibold text-slate-900">Locations</h3>
                        </div>
                        <p className="text-3xl font-bold text-slate-900">{locations.length}</p>
                        <p className="text-xs text-slate-500 mt-1">Approved for filming</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-3 md:p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-900">Production Schedule</h3>
                            <button onClick={() => setActiveTab('Call Sheets')} className="text-xs text-indigo-600 font-medium hover:underline">View All</button>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {upcomingShoots.length > 0 ? upcomingShoots.slice(0, 3).map(cs => {
                                const project = projects.find(p => p.id === cs.projectId);
                                const location = locations.find(l => l.id === cs.locationId);
                                return (
                                    <div key={cs.id} className="p-4 hover:bg-slate-50 flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center space-x-2">
                                                <span className="text-xs font-bold text-slate-500 uppercase">{project?.name || 'Unknown Project'}</span>
                                                <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{cs.status}</span>
                                            </div>
                                            <p className="font-medium text-slate-900 text-sm mt-1">{new Date(cs.date).toLocaleDateString()} @ {cs.callTime}</p>
                                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" /> {location?.name || 'TBD'}</p>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-slate-300" />
                                    </div>
                                )
                            }) : <div className="p-8 text-center text-slate-400 text-sm">No upcoming shoots scheduled.</div>}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-900">Equipment Alerts</h3>
                            <button onClick={() => setActiveTab('Equipment')} className="text-xs text-indigo-600 font-medium hover:underline">Manage Inventory</button>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {equipmentIssues.length > 0 ? equipmentIssues.slice(0, 3).map(eq => (
                                <div key={eq.id} className="p-4 hover:bg-slate-50 flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-slate-900 text-sm">{eq.name}</p>
                                        <p className="text-xs text-slate-500">{eq.serialNumber} • {eq.category}</p>
                                    </div>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${eq.status === 'lost' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {eq.status}
                                    </span>
                                </div>
                            )) : <div className="p-8 text-center text-slate-400 text-sm flex flex-col items-center"><CheckCircle className="w-6 h-6 mb-2 text-emerald-400" />All equipment operational.</div>}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const ShotListsView = () => (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-900">Shot Lists</h3>
                <button
                    onClick={() => { setModalType('ShotList'); setIsModalOpen(true); }}
                    className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> New Shot List
                </button>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {shotLists.map(sl => {
                    const project = projects.find(p => p.id === sl.projectId);
                    return (
                        <div key={sl.id} className="border-b border-slate-100 last:border-0">
                            <div className="p-4 bg-slate-50 flex justify-between items-center cursor-pointer hover:bg-slate-100">
                                <div>
                                    <h4 className="font-bold text-slate-900">{sl.name}</h4>
                                    <p className="text-xs text-slate-500">{project?.name} • {sl.shots.length} Shots</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-400" />
                            </div>
                            {/* Expanded detail - Shot cards */}
                            <div className="p-4 space-y-2">
                                {sl.shots.map(shot => (
                                    <div key={shot.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-indigo-50/30 transition-colors">
                                        <div className="flex items-start gap-3">
                                            <span className="font-mono text-slate-400 text-sm flex-shrink-0">{shot.shotNumber}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-slate-800 mb-1">{shot.description}</p>
                                                <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                                                    <span className="bg-white px-2 py-1 rounded border border-slate-200">{shot.cameraMovement}</span>
                                                    <span className="bg-white px-2 py-1 rounded border border-slate-200">{shot.framing}</span>
                                                    <span className="text-slate-500">{shot.equipment.length} items</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })}
                {shotLists.length === 0 && <div className="p-8 text-center text-slate-400">No shot lists created.</div>}
            </div>
        </div>
    );

    const CallSheetsView = () => (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-900">Call Sheets</h3>
                <button
                    onClick={() => { setModalType('CallSheet'); setIsModalOpen(true); }}
                    className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Create Call Sheet
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {callSheets.map(cs => {
                    const project = projects.find(p => p.id === cs.projectId);
                    const location = locations.find(l => l.id === cs.locationId);
                    return (
                        <div key={cs.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-6 hover:border-indigo-300 transition-colors group">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{cs.status}</span>
                                    <h4 className="font-bold text-slate-900 text-lg mt-2">{new Date(cs.date).toLocaleDateString()}</h4>
                                    <p className="text-sm text-slate-500">{project?.name}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-slate-800">{cs.callTime}</p>
                                    <p className="text-xs text-slate-400 uppercase">Call Time</p>
                                </div>
                            </div>

                            <div className="space-y-3 border-t border-slate-100 pt-4">
                                <div className="flex items-start gap-3 text-sm text-slate-600">
                                    <MapPin className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                                    <div>
                                        <p className="font-medium text-slate-900">{location?.name}</p>
                                        <p className="text-xs text-slate-500">{location?.address}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 text-sm text-slate-600">
                                    <UserIcon className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                                    <div className="w-full">
                                        <p className="font-medium text-slate-900 mb-1">Crew ({cs.crew.length})</p>
                                        <div className="flex flex-wrap gap-1">
                                            {cs.crew.map(c => (
                                                <span key={c.id} className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{c.role}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                                <button className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                                    View Full Sheet <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    const EquipmentView = () => {
        const handleStatusChange = (eqId: string, newStatus: 'available' | 'checked_out') => {
            const item = equipment.find(e => e.id === eqId);
            if (item) {
                onUpdateEquipment({
                    ...item,
                    status: newStatus,
                    checkedOutBy: newStatus === 'checked_out' ? 'u1' : undefined, // mock current user
                    checkedOutAt: newStatus === 'checked_out' ? new Date().toISOString() : undefined
                });
            }
        };

        return (
            <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-900">Equipment Inventory</h3>
                    <button
                        onClick={() => { setModalType('Equipment'); setIsModalOpen(true); }}
                        className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Add Gear
                    </button>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {equipment.map(eq => (
                            <div key={eq.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-slate-900 truncate">{eq.name}</h4>
                                        <p className="text-xs font-mono text-slate-500 mt-1">{eq.serialNumber}</p>
                                    </div>
                                    <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-full flex-shrink-0 ml-2">{eq.category}</span>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium capitalize ${eq.status === 'available' ? 'bg-emerald-100 text-emerald-800' :
                                        eq.status === 'checked_out' ? 'bg-blue-100 text-blue-800' :
                                            'bg-amber-100 text-amber-800'
                                        }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${eq.status === 'available' ? 'bg-emerald-500' :
                                            eq.status === 'checked_out' ? 'bg-blue-500' :
                                                'bg-amber-500'
                                            }`}></span>
                                        {eq.status.replace('_', ' ')}
                                    </span>
                                    
                                    {eq.status === 'available' && (
                                        <button
                                            onClick={() => handleStatusChange(eq.id, 'checked_out')}
                                            className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-md font-medium hover:bg-indigo-100"
                                        >
                                            Check Out
                                        </button>
                                    )}
                                    {eq.status === 'checked_out' && (
                                        <button
                                            onClick={() => handleStatusChange(eq.id, 'available')}
                                            className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-md font-medium hover:bg-slate-200"
                                        >
                                            Return
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const LocationsView = () => (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-900">Location Library</h3>
                <button
                    onClick={() => { setModalType('Location'); setIsModalOpen(true); }}
                    className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Add Location
                </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                {locations.map(loc => (
                    <div key={loc.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                        <div className="h-32 bg-slate-200 relative">
                            <img src={loc.mapUrl || 'https://picsum.photos/400/200'} alt="Map" className="w-full h-full object-cover" />
                            {loc.permitsRequired && (
                                <span className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded backdrop-blur-sm">Permit Required</span>
                            )}
                        </div>
                        <div className="p-4">
                            <h4 className="font-bold text-slate-900 mb-1">{loc.name}</h4>
                            <p className="text-xs text-slate-500 mb-3 flex items-start gap-1">
                                <MapPin className="w-3 h-3 mt-0.5 shrink-0" /> {loc.address}
                            </p>
                            <div className="border-t border-slate-100 pt-3 mt-2 text-sm space-y-2">
                                <p className="text-slate-600"><span className="font-semibold text-xs text-slate-400 uppercase">Contact:</span> {loc.contactPerson}</p>
                                <p className="text-slate-600"><span className="font-semibold text-xs text-slate-400 uppercase">Phone:</span> {loc.phone}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

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

                {/* My Production Widget */}
                {currentUserId && (
                    <MyProductionWidget 
                        currentUserId={currentUserId} 
                        onTaskClick={onTaskClick}
                    />
                )}

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
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-slate-900 mb-1 truncate" dir="auto" style={{ unicodeBidi: 'plaintext', textAlign: 'start' }}>
                                                    {plan.name}
                                                </h4>
                                                <p className="text-sm text-slate-600 truncate" dir="auto" style={{ unicodeBidi: 'plaintext', textAlign: 'start' }}>
                                                    {plan.clientName}
                                                </p>
                                            </div>
                                            <div className="relative ml-2">
                                                <button
                                                    onClick={() => setPlanMenuOpen(planMenuOpen === plan.id ? null : plan.id)}
                                                    className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                                                >
                                                    <MoreHorizontal className="w-4 h-4 text-slate-400" />
                                                </button>
                                                {planMenuOpen === plan.id && (
                                                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg border border-slate-200 shadow-xl z-10 py-1">
                                                        <button
                                                            onClick={() => handleViewPlan(plan)}
                                                            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                                        >
                                                            <Eye className="w-4 h-4" /> View Details
                                                        </button>
                                                        {!plan.isArchived && (
                                                            <>
                                                                <PermissionGate permission={PERMISSIONS.PRODUCTION.PLANS_EDIT}>
                                                                    <button
                                                                        onClick={() => handleEditPlan(plan)}
                                                                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                                                    >
                                                                        <Edit className="w-4 h-4" /> Edit Plan
                                                                    </button>
                                                                </PermissionGate>
                                                                <button
                                                                    onClick={() => handleDuplicatePlan(plan)}
                                                                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                                                >
                                                                    <Copy className="w-4 h-4" /> Duplicate
                                                                </button>
                                                                <div className="border-t border-slate-100 my-1"></div>
                                                                {plan.status !== 'SCHEDULED' && (
                                                                    <button
                                                                        onClick={() => handleUpdateStatus(plan, 'SCHEDULED')}
                                                                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                                                    >
                                                                        Mark as Scheduled
                                                                    </button>
                                                                )}
                                                                {plan.status !== 'IN_PROGRESS' && (
                                                                    <button
                                                                        onClick={() => handleUpdateStatus(plan, 'IN_PROGRESS')}
                                                                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                                                    >
                                                                        Mark In Progress
                                                                    </button>
                                                                )}
                                                                {plan.status !== 'COMPLETED' && (
                                                                    <button
                                                                        onClick={() => handleUpdateStatus(plan, 'COMPLETED')}
                                                                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                                                    >
                                                                        Mark Completed
                                                                    </button>
                                                                )}
                                                                <div className="border-t border-slate-100 my-1"></div>
                                                                <PermissionGate permission={PERMISSIONS.PRODUCTION.PLANS_DELETE}>
                                                                    <button
                                                                        onClick={() => handleArchivePlan(plan)}
                                                                        className="w-full px-4 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                                                                    >
                                                                        <Archive className="w-4 h-4" /> Archive Plan
                                                                    </button>
                                                                </PermissionGate>
                                                            </>
                                                        )}
                                                        {isRestoreable && (
                                                            <PermissionGate permission={PERMISSIONS.PRODUCTION.RESTORE_ARCHIVED}>
                                                                <button
                                                                    onClick={() => handleRestorePlan(plan)}
                                                                    className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 flex items-center gap-2"
                                                                >
                                                                    <RotateCcw className="w-4 h-4" /> Restore Plan
                                                                </button>
                                                            </PermissionGate>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
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
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                                plan.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                                plan.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                                                plan.status === 'SCHEDULED' ? 'bg-amber-100 text-amber-700' :
                                                plan.status === 'ARCHIVED' ? 'bg-slate-100 text-slate-600' :
                                                'bg-slate-100 text-slate-600'
                                            }`}>
                                                {plan.status}
                                            </span>
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

    return (
        <PageContainer>
            <PageHeader
                title="Production Hub"
                subtitle="Manage shoots, crew, gear, and logistics."
            />

            <div className="border-b border-slate-200">
                <nav className="flex space-x-6">
                    {['Overview', 'Planning', 'Shot Lists', 'Call Sheets', 'Equipment', 'Locations'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>

            <PageContent>
                {activeTab === 'Overview' && <OverviewView />}
                {activeTab === 'Planning' && <PlanningView />}
                {activeTab === 'Shot Lists' && <ShotListsView />}
                {activeTab === 'Call Sheets' && <CallSheetsView />}
                {activeTab === 'Equipment' && <EquipmentView />}
                {activeTab === 'Locations' && <LocationsView />}
            </PageContent>

            {/* Generic Modal Shell - In a real app, this would switch on modalType to render specific forms */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={`Add ${modalType}`}
                size="md"
            >
                {modalType === 'CallSheet' ? (
                    <form onSubmit={handleCreateCallSheet} className="space-y-4 p-1">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Project</label>
                                <select required value={csProject} onChange={e => setCsProject(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                                    <option value="">Select Project...</option>
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                                <select required value={csLocation} onChange={e => setCsLocation(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                                    <option value="">Select Location...</option>
                                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                                <input required type="date" value={csDate} onChange={e => setCsDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Call Time</label>
                                <input required type="time" value={csTime} onChange={e => setCsTime(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Select Crew</label>
                            <div className="bg-slate-50 rounded-lg border border-slate-200 h-48 overflow-y-auto p-2 space-y-1">
                                {users.filter(u => {
                                    if (csProject) {
                                        return projectMembers.some(pm => pm.projectId === csProject && pm.userId === u.id);
                                    }
                                    return true;
                                }).map(u => {
                                    const available = checkAvailability(u.id, csDate);
                                    return (
                                        <div key={u.id}
                                            onClick={() => available && toggleCrewSelection(u.id)}
                                            className={`p-2 rounded flex items-center justify-between cursor-pointer ${!available ? 'opacity-50 cursor-not-allowed bg-rose-50' :
                                                selectedCrew.includes(u.id) ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-white'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <img src={u.avatar} className="w-6 h-6 rounded-full" />
                                                <span className="text-sm font-medium">{u.name}</span>
                                            </div>
                                            {!available ? (
                                                <span className="text-xs text-rose-600 font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" /> On Leave</span>
                                            ) : selectedCrew.includes(u.id) && <CheckCircleIcon className="w-4 h-4 text-indigo-600" />}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <button type="submit" className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700">Create Call Sheet</button>
                    </form>
                ) : (
                    <div className="py-2">
                        <p className="text-slate-500 text-sm mb-4">Form implementation placeholder for {modalType}.</p>
                        <button onClick={() => setIsModalOpen(false)} className="w-full bg-indigo-600 text-white py-2 rounded-lg">Close</button>
                    </div>
                )}
            </Modal>

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
            {viewingPlanId && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setViewingPlanId(null)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-[color:var(--dash-primary)] to-rose-600 text-white p-6 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold mb-1">
                                    {productionPlans.find(p => p.id === viewingPlanId)?.name}
                                </h2>
                                <p className="text-white/80 text-sm">
                                    {productionPlans.find(p => p.id === viewingPlanId)?.clientName} • {new Date(productionPlans.find(p => p.id === viewingPlanId)?.productionDate || '').toLocaleDateString()}
                                </p>
                            </div>
                            <button
                                onClick={() => setViewingPlanId(null)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                            <div className="mb-6">
                                {/* Progress Summary */}
                                {viewingPlanTasks.length > 0 && (() => {
                                    const completedCount = viewingPlanTasks.filter(t => t.status === 'completed').length;
                                    const totalCount = viewingPlanTasks.length;
                                    const progressPercent = Math.round((completedCount / totalCount) * 100);
                                    
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
                                            <p className="text-sm text-green-700">
                                                {completedCount} of {totalCount} tasks completed
                                            </p>
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
            )}

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

