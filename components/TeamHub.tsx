
import React, { useState } from 'react';
import {
    User, UserRole, Department, Task, LeaveRequest, AttendanceRecord, RoleDefinition, Project,
    EmployeeProfile, Team, LeavePolicy, LeaveBalance, AttendanceCorrection, OnboardingChecklist,
    OffboardingChecklist, EmployeeAsset, PerformanceReview, DepartmentDefinition, LeaveType,
    AgencyEquipment, OnboardingStep
} from '../types';
import {
    Plus, User as UserIcon, Building2, Calendar, Clock, Star, UserPlus,
    UserMinus, Package, BarChart3, Copy, AlertCircle, CheckCircle as CheckCircleIcon
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { prefixedId } from '../utils/id';
import Modal from './common/Modal';
import PageContainer from './layout/PageContainer';
import PageHeader from './layout/PageHeader';
import PageContent from './layout/PageContent';

// HR Sub-components
import EmployeeDirectory from './hr/EmployeeDirectory';
import EmployeeProfileDrawer from './hr/EmployeeProfileDrawer';
import OrgStructureView from './hr/OrgStructureView';
import LeaveBoard from './hr/LeaveBoard';
import LeaveCalendar from './hr/LeaveCalendar';
import LeaveRequestForm from './hr/LeaveRequestForm';
import LeaveBalanceSummary from './hr/LeaveBalanceSummary';
import AttendanceDashboard from './hr/AttendanceDashboard';
import AttendanceCorrectionForm from './hr/AttendanceCorrectionForm';
import OnboardingWorkflow from './hr/OnboardingWorkflow';
import OffboardingWorkflow from './hr/OffboardingWorkflow';
import AssetAssignment from './hr/AssetAssignment';
import PerformanceReviewForm from './hr/PerformanceReviewForm';
import PerformanceReviewList from './hr/PerformanceReviewList';
import CapacityDashboard from './hr/CapacityDashboard';

type HRTab = 'employees' | 'org' | 'leave' | 'attendance' | 'onboarding' | 'assets' | 'performance' | 'capacity';

interface TeamHubProps {
    users: User[];
    tasks?: Task[];
    leaveRequests: LeaveRequest[];
    attendanceRecords: AttendanceRecord[];
    roles?: RoleDefinition[];
    departments?: DepartmentDefinition[];
    projects?: Project[];
    checkPermission?: (code: string) => boolean;
    currentUser?: User;
    onAddUser?: (user: User) => void;
    onUpdateUser: (user: User) => void;
    onAddLeaveRequest: (req: LeaveRequest) => void;
    onUpdateLeaveRequest: (req: LeaveRequest) => void;
    onDeleteLeaveRequest?: (id: string) => void;
    onApproveLeaveRequest?: (id: string) => void;
    onRejectLeaveRequest?: (id: string, reason: string) => void;
    onCancelLeaveRequest?: (id: string) => void;
    onClockIn?: () => void;
    onClockOut?: () => void;
    onAddDepartment?: (dept: DepartmentDefinition) => void;
    onUpdateDepartment?: (dept: DepartmentDefinition) => void;
    onDeleteDepartment?: (id: string) => void;
    // HR-specific props
    employeeProfiles?: EmployeeProfile[];
    teams?: Team[];
    leavePolicies?: LeavePolicy[];
    leaveBalances?: LeaveBalance[];
    attendanceCorrections?: AttendanceCorrection[];
    onboardingChecklists?: OnboardingChecklist[];
    offboardingChecklists?: OffboardingChecklist[];
    employeeAssets?: EmployeeAsset[];
    performanceReviews?: PerformanceReview[];
    equipment?: AgencyEquipment[];
    onCreateEmployeeProfile?: (profile: EmployeeProfile) => void;
    onUpdateEmployeeProfile?: (profile: EmployeeProfile) => void;
    onSubmitAttendanceCorrection?: (correction: AttendanceCorrection) => void;
    onApproveAttendanceCorrection?: (correctionId: string) => void;
    onStartOnboarding?: (userId: string, steps: OnboardingStep[]) => void;
    onCompleteOnboardingStep?: (checklistId: string, stepId: string) => void;
    onStartOffboarding?: (userId: string) => void;
    onAssignEmployeeAsset?: (asset: Partial<EmployeeAsset>) => void;
    onReturnEmployeeAsset?: (assetId: string) => void;
    onCreatePerformanceReview?: (review: Partial<PerformanceReview>) => void;
    onSubmitPerformanceReview?: (reviewId: string) => void;
    onFinalizePerformanceReview?: (reviewId: string) => void;
    onUpdatePerformanceReview?: (review: PerformanceReview) => void;
}

const TAB_CONFIG: { key: HRTab; label: string; icon: React.ElementType; permissionKey?: string }[] = [
    { key: 'employees', label: 'Employees', icon: UserIcon },
    { key: 'org', label: 'Org Structure', icon: Building2 },
    { key: 'leave', label: 'Leave', icon: Calendar },
    { key: 'attendance', label: 'Attendance', icon: Clock },
    { key: 'onboarding', label: 'On/Offboarding', icon: UserPlus, permissionKey: 'hr.onboarding.manage' },
    { key: 'assets', label: 'Assets', icon: Package },
    { key: 'performance', label: 'Performance', icon: Star },
    { key: 'capacity', label: 'Capacity', icon: BarChart3 },
];

const TeamHub: React.FC<TeamHubProps> = ({
    users = [],
    tasks = [],
    leaveRequests = [],
    attendanceRecords = [],
    roles = [],
    departments = [],
    projects = [],
    checkPermission,
    currentUser,
    onUpdateUser,
    onAddLeaveRequest,
    onApproveLeaveRequest,
    onRejectLeaveRequest,
    onCancelLeaveRequest,
    onClockIn,
    onClockOut,
    employeeProfiles = [],
    teams = [],
    leavePolicies = [],
    leaveBalances = [],
    attendanceCorrections = [],
    onboardingChecklists = [],
    offboardingChecklists = [],
    employeeAssets = [],
    performanceReviews = [],
    onCreateEmployeeProfile,
    onUpdateEmployeeProfile,
    onSubmitAttendanceCorrection,
    onApproveAttendanceCorrection,
    onStartOnboarding,
    onCompleteOnboardingStep,
    onStartOffboarding,
    onAssignEmployeeAsset,
    onReturnEmployeeAsset,
    onCreatePerformanceReview,
    onFinalizePerformanceReview,
    onUpdatePerformanceReview,
}) => {
    const [activeTab, setActiveTab] = useState<HRTab>('employees');
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
    const [selectedReview, setSelectedReview] = useState<PerformanceReview | null>(null);
    const [showNewReviewForm, setShowNewReviewForm] = useState(false);
    const { inviteUser } = useAuth();

    // Invite form state
    const [userName, setUserName] = useState('');
    const [userRole, setUserRole] = useState<UserRole>(UserRole.DESIGNER);
    const [userDept, setUserDept] = useState<Department>(Department.CREATIVE);
    const [userEmail, setUserEmail] = useState('');
    const [inviteError, setInviteError] = useState('');
    const [inviteLoading, setInviteLoading] = useState(false);
    const [pendingInvite, setPendingInvite] = useState<{ name: string; email: string; password: string } | null>(null);
    const [copiedPassword, setCopiedPassword] = useState(false);

    // Leave sub-tab
    const [leaveSubTab, setLeaveSubTab] = useState<'board' | 'request' | 'calendar' | 'balance'>('board');

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setInviteError('');
        if (!inviteUser) { setInviteError('Invites are not available.'); return; }
        setInviteLoading(true);
        try {
            const result = await inviteUser({ name: userName, email: userEmail, role: userRole, department: userDept, jobTitle: userRole });
            setPendingInvite({ name: userName, email: userEmail, password: result.tempPassword });
            setCopiedPassword(false);
            setUserName('');
            setUserEmail('');
        } catch (err: any) {
            setInviteError(err.message || 'Could not create user.');
        } finally {
            setInviteLoading(false);
        }
    };

    const handleCopyPassword = async () => {
        if (!pendingInvite) return;
        try {
            await navigator.clipboard.writeText(pendingInvite.password);
            setCopiedPassword(true);
            setTimeout(() => setCopiedPassword(false), 2000);
        } catch { /* ignore */ }
    };

    const handleSubmitLeaveRequest = (req: { type: LeaveType; startDate: string; endDate: string; reason: string }) => {
        if (!currentUser) return;
        const startD = new Date(req.startDate);
        const endD = new Date(req.endDate);
        let days = 0;
        const d = new Date(startD);
        while (d <= endD) { if (d.getDay() !== 0 && d.getDay() !== 6) days++; d.setDate(d.getDate() + 1); }

        const leaveReq: LeaveRequest = {
            id: prefixedId('lr'),
            userId: currentUser.id,
            type: req.type,
            startDate: req.startDate,
            endDate: req.endDate,
            reason: req.reason,
            totalDays: days,
            status: 'pending',
            createdAt: new Date().toISOString(),
        };
        onAddLeaveRequest(leaveReq);
    };

    const handlePerformanceSubmit = (reviewData: Partial<PerformanceReview>) => {
        if (selectedReview) {
            onUpdatePerformanceReview?.({ ...selectedReview, ...reviewData } as PerformanceReview);
        } else {
            onCreatePerformanceReview?.(reviewData);
        }
        setSelectedReview(null);
        setShowNewReviewForm(false);
    };

    // Filter visible tabs based on permissions
    const visibleTabs = TAB_CONFIG.filter(tab => {
        if (!tab.permissionKey) return true;
        return checkPermission?.(tab.permissionKey);
    });

    return (
        <PageContainer>
            <PageHeader
                title="Team & HR"
                subtitle="People, leave, attendance, onboarding, performance, and capacity."
                actions={
                    <button
                        onClick={() => { setInviteError(''); setIsInviteModalOpen(true); }}
                        className="flex items-center space-x-2 bg-gradient-to-br from-iris-red to-iris-red/80 text-white px-4 py-2 rounded-lg text-sm font-medium hover:brightness-110 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Employee</span>
                    </button>
                }
            />

            {/* Navigation Tabs */}
            <div className="border-b border-iris-white/10 overflow-x-auto">
                <nav className="flex space-x-1 min-w-max px-1">
                    {visibleTabs.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`py-3 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                                    activeTab === tab.key
                                        ? 'border-iris-red text-iris-red'
                                        : 'border-transparent text-iris-white/60 hover:text-iris-white'
                                }`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            <PageContent>
                {/* Employees Tab */}
                {activeTab === 'employees' && (
                    <EmployeeDirectory
                        users={users}
                        employeeProfiles={employeeProfiles}
                        departments={departments}
                        checkPermission={checkPermission}
                        onSelectEmployee={setSelectedEmployeeId}
                    />
                )}

                {/* Org Structure Tab */}
                {activeTab === 'org' && (
                    <OrgStructureView
                        users={users}
                        employeeProfiles={employeeProfiles}
                        teams={teams}
                        departments={departments}
                        checkPermission={checkPermission}
                        onSelectEmployee={setSelectedEmployeeId}
                    />
                )}

                {/* Leave Tab */}
                {activeTab === 'leave' && (
                    <div className="space-y-4">
                        {/* Leave sub-tabs */}
                        <div className="flex gap-2">
                            {([
                                { key: 'board', label: 'Requests' },
                                { key: 'request', label: 'New Request' },
                                { key: 'calendar', label: 'Calendar' },
                                { key: 'balance', label: 'My Balance' },
                            ] as const).map(sub => (
                                <button
                                    key={sub.key}
                                    onClick={() => setLeaveSubTab(sub.key)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                                        leaveSubTab === sub.key
                                            ? 'bg-iris-red/20 text-iris-red'
                                            : 'bg-iris-black/60 text-iris-white/50 hover:text-iris-white/80'
                                    }`}
                                >
                                    {sub.label}
                                </button>
                            ))}
                        </div>

                        {leaveSubTab === 'board' && (
                            <LeaveBoard
                                leaveRequests={leaveRequests}
                                users={users}
                                leaveBalances={leaveBalances}
                                leavePolicies={leavePolicies}
                                currentUserId={currentUser?.id || ''}
                                checkPermission={checkPermission}
                                onApprove={id => onApproveLeaveRequest?.(id)}
                                onReject={(id, reason) => onRejectLeaveRequest?.(id, reason)}
                                onCancel={id => onCancelLeaveRequest?.(id)}
                            />
                        )}
                        {leaveSubTab === 'request' && (
                            <LeaveRequestForm
                                currentUserId={currentUser?.id || ''}
                                leavePolicies={leavePolicies}
                                leaveBalances={leaveBalances}
                                users={users}
                                onSubmit={handleSubmitLeaveRequest}
                            />
                        )}
                        {leaveSubTab === 'calendar' && (
                            <LeaveCalendar
                                leaveRequests={leaveRequests}
                                users={users}
                            />
                        )}
                        {leaveSubTab === 'balance' && currentUser && (
                            <LeaveBalanceSummary
                                userId={currentUser.id}
                                leaveBalances={leaveBalances}
                                leavePolicies={leavePolicies}
                            />
                        )}
                    </div>
                )}

                {/* Attendance Tab */}
                {activeTab === 'attendance' && (
                    <div className="space-y-6">
                        <AttendanceDashboard
                            attendanceRecords={attendanceRecords}
                            attendanceCorrections={attendanceCorrections}
                            users={users}
                            currentUserId={currentUser?.id || ''}
                            checkPermission={checkPermission}
                            onCheckIn={() => onClockIn?.()}
                            onCheckOut={() => onClockOut?.()}
                            onSubmitCorrection={c => onSubmitAttendanceCorrection?.(c as AttendanceCorrection)}
                            onApproveCorrection={(id) => onApproveAttendanceCorrection?.(id)}
                        />
                        <AttendanceCorrectionForm
                            currentUserId={currentUser?.id || ''}
                            attendanceRecords={attendanceRecords}
                            onSubmit={c => onSubmitAttendanceCorrection?.(c as AttendanceCorrection)}
                        />
                    </div>
                )}

                {/* Onboarding/Offboarding Tab */}
                {activeTab === 'onboarding' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <OnboardingWorkflow
                            onboardingChecklists={onboardingChecklists}
                            users={users}
                            currentUserId={currentUser?.id || ''}
                            checkPermission={checkPermission}
                            onStartOnboarding={(userId, steps) => onStartOnboarding?.(userId, steps)}
                            onCompleteStep={(checklistId, stepId) => onCompleteOnboardingStep?.(checklistId, stepId)}
                        />
                        <OffboardingWorkflow
                            offboardingChecklists={offboardingChecklists}
                            users={users}
                            currentUserId={currentUser?.id || ''}
                            checkPermission={checkPermission}
                            onStartOffboarding={userId => onStartOffboarding?.(userId)}
                        />
                    </div>
                )}

                {/* Assets Tab */}
                {activeTab === 'assets' && (
                    <AssetAssignment
                        employeeAssets={employeeAssets}
                        users={users}
                        currentUserId={currentUser?.id || ''}
                        checkPermission={checkPermission}
                        onAssign={asset => onAssignEmployeeAsset?.(asset)}
                        onReturn={assetId => onReturnEmployeeAsset?.(assetId)}
                    />
                )}

                {/* Performance Tab */}
                {activeTab === 'performance' && (
                    <>
                        {showNewReviewForm || selectedReview ? (
                            <PerformanceReviewForm
                                review={selectedReview || undefined}
                                users={users}
                                currentUserId={currentUser?.id || ''}
                                checkPermission={checkPermission}
                                onSubmit={handlePerformanceSubmit}
                                onFinalize={id => onFinalizePerformanceReview?.(id)}
                                onClose={() => { setSelectedReview(null); setShowNewReviewForm(false); }}
                            />
                        ) : (
                            <PerformanceReviewList
                                performanceReviews={performanceReviews}
                                users={users}
                                currentUserId={currentUser?.id || ''}
                                checkPermission={checkPermission}
                                onSelectReview={setSelectedReview}
                                onCreateReview={() => setShowNewReviewForm(true)}
                            />
                        )}
                    </>
                )}

                {/* Capacity Tab */}
                {activeTab === 'capacity' && (
                    <CapacityDashboard
                        users={users}
                        employeeProfiles={employeeProfiles}
                        leaveRequests={leaveRequests}
                        attendanceRecords={attendanceRecords}
                        tasks={tasks}
                    />
                )}
            </PageContent>

            {/* Employee Profile Drawer */}
            {selectedEmployeeId && (
                <EmployeeProfileDrawer
                    isOpen={!!selectedEmployeeId}
                    onClose={() => setSelectedEmployeeId(null)}
                    userId={selectedEmployeeId}
                    users={users}
                    employeeProfiles={employeeProfiles}
                    roles={roles}
                    departments={departments}
                    teams={teams}
                    checkPermission={checkPermission}
                    onCreateEmployeeProfile={p => onCreateEmployeeProfile?.(p)}
                    onUpdateEmployeeProfile={p => onUpdateEmployeeProfile?.(p)}
                    onUpdateUser={onUpdateUser}
                    currentUser={currentUser}
                />
            )}

            {/* Invite Modal */}
            <Modal
                isOpen={isInviteModalOpen}
                onClose={() => { setIsInviteModalOpen(false); setInviteLoading(false); setInviteError(''); setPendingInvite(null); }}
                title="Onboard New Member"
                size="md"
            >
                {pendingInvite ? (
                    <div className="p-1 space-y-6 text-center">
                        <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircleIcon className="w-8 h-8" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-iris-white">User Created Successfully</h3>
                            <p className="text-sm text-iris-white/70 mt-1">Share these credentials with {pendingInvite.name}</p>
                        </div>
                        {inviteError && (
                            <div className="bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-lg p-3 text-sm flex items-start gap-2 text-left">
                                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                <div><p className="font-bold">Attention:</p><p>{inviteError}</p></div>
                            </div>
                        )}
                        <div className="bg-iris-black/80 border border-iris-white/10 rounded-xl p-4 text-left">
                            <div className="mb-3">
                                <p className="text-xs text-iris-white/40 uppercase font-bold mb-1">Email</p>
                                <p className="font-medium text-iris-white">{pendingInvite.email}</p>
                            </div>
                            <div>
                                <p className="text-xs text-iris-white/40 uppercase font-bold mb-1">Temporary Password</p>
                                <div className="flex items-center gap-2">
                                    <code className="bg-iris-black/95 border border-iris-white/10 px-3 py-1.5 rounded text-lg font-mono text-iris-red font-bold flex-1">{pendingInvite.password}</code>
                                    <button onClick={handleCopyPassword} className="p-2 text-iris-white/40 hover:text-iris-red hover:bg-iris-red/10 rounded-lg transition-colors" title="Copy Password">
                                        {copiedPassword ? <CheckCircleIcon className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                                    </button>
                                </div>
                                <p className="text-[11px] text-iris-white/40 mt-2">This password is valid for first login only. The user will be required to change it immediately.</p>
                            </div>
                        </div>
                        <button onClick={() => { setPendingInvite(null); setIsInviteModalOpen(false); }} className="w-full bg-gradient-to-br from-iris-red to-iris-red/80 text-iris-white py-2.5 rounded-lg font-medium hover:brightness-110 transition-all">Done</button>
                    </div>
                ) : (
                    <form onSubmit={handleCreateUser} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-iris-white mb-1">Full Name</label>
                            <input required value={userName} onChange={e => setUserName(e.target.value)} type="text" className="w-full px-3 py-2 bg-iris-black/80 border border-iris-white/10 rounded-lg text-iris-white focus:ring-2 focus:ring-iris-red focus:border-iris-red/50 focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-iris-white mb-1">Email</label>
                            <input required value={userEmail} onChange={e => setUserEmail(e.target.value)} type="email" className="w-full px-3 py-2 bg-iris-black/80 border border-iris-white/10 rounded-lg text-iris-white focus:ring-2 focus:ring-iris-red focus:border-iris-red/50 focus:outline-none" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-iris-white mb-1">Role</label>
                                <select value={userRole} onChange={e => setUserRole(e.target.value as UserRole)} className="w-full px-3 py-2 bg-iris-black/80 border border-iris-white/10 rounded-lg text-iris-white focus:ring-2 focus:ring-iris-red focus:border-iris-red/50 focus:outline-none">
                                    {roles.map(role => <option key={role.id} value={role.name}>{role.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-iris-white mb-1">Department</label>
                                <select value={userDept} onChange={e => setUserDept(e.target.value as Department)} className="w-full px-3 py-2 bg-iris-black/80 border border-iris-white/10 rounded-lg text-iris-white focus:ring-2 focus:ring-iris-red focus:border-iris-red/50 focus:outline-none">
                                    {Object.values(Department).map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                        </div>
                        {inviteError && <div className="bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-lg p-3 text-sm">{inviteError}</div>}
                        <div className="pt-2">
                            <button type="submit" disabled={inviteLoading} className="w-full bg-gradient-to-br from-iris-red to-iris-red/80 text-iris-white py-2.5 rounded-lg font-medium hover:brightness-110 transition-all disabled:opacity-70 flex items-center justify-center gap-2">
                                {inviteLoading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>}
                                <span>{inviteLoading ? 'Creating user...' : 'Create & Generate Password'}</span>
                            </button>
                        </div>
                    </form>
                )}
            </Modal>
        </PageContainer>
    );
};

export default TeamHub;
