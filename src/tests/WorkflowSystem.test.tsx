import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TaskDetailView from '../../components/tasks/TaskDetailView'; // Import the real component
import { Task, TaskStatus, User, WorkflowTemplate, UserRole, Department, Priority, Project, WorkflowStepTemplate, ApprovalStep } from '../../types';

// Mock Dependencies
const mockCurrentUser: User = {
    id: 'u1',
    name: 'Test Agent',
    role: UserRole.ACCOUNT_MANAGER,
    email: 'test@iris.agency',
    avatar: '',
    department: Department.ACCOUNTS,
    passwordHash: '',
    forcePasswordChange: false,
    status: 'active'
};

const mockProject: Project = {
    id: 'p1',
    name: 'Test Project',
    client: 'Test Client',
    // department: Department.CREATIVE, // REMOVED - Prop does not exist on Project
    status: 'active',
    startDate: '',
    dueDate: '',
    budget: 0,
    description: '',
    team: []
} as any; // Cast as any or Project to bypass strict checks if missing other props, but mostly correct.

const mockTask: Task = {
    id: 't1',
    title: 'Test Workflow Task',
    status: TaskStatus.IN_PROGRESS,
    priority: Priority.HIGH,
    department: Department.CREATIVE,
    projectId: 'p1',
    assigneeIds: ['u1'],
    dueDate: '2025-10-10',
    description: 'Test description',
    workflowTemplateId: 'wt1',
    taskType: 'design',
    currentApprovalLevel: 0,
    approvalPath: [],
    isClientApprovalRequired: false,
    isArchived: false,
    attachments: [],
    createdBy: 'u1',
    createdAt: '',
    updatedAt: '',
    startDate: ''
};

const mockWorkflow: WorkflowTemplate = {
    id: 'wt1',
    name: 'Standard Creative Review',
    description: 'Standard flow',
    departmentId: Department.CREATIVE,
    taskType: 'design',
    status: 'active',
    steps: [
        { id: 's1', workflowTemplateId: 'wt1', order: 0, label: 'Creative Director Review', roleId: 'r1', projectRoleKey: null, useDepartmentHead: false },
        { id: 's2', workflowTemplateId: 'wt1', order: 1, label: 'Client Review', roleId: null, projectRoleKey: 'Client', useDepartmentHead: false }
    ],
    isDefault: true,
    requiresClientApproval: false,
    createdAt: '',
    updatedAt: ''
};

// Helper to resolve approver (mock logic)
const resolveApprover = (step: WorkflowStepTemplate, task: Task) => 'u2'; // Always resolve to 'u2' for testing

describe('Workflow System Integration', () => {
    // Default Props
    const defaultProps = {
        task: mockTask,
        project: mockProject,
        users: [mockCurrentUser, { ...mockCurrentUser, id: 'u2', name: 'Approver' }],
        comments: [],
        timeLogs: [],
        dependencies: [],
        activityLogs: [],
        taskSteps: [],
        clientApproval: undefined,
        taskFiles: [],
        allTasks: [],
        currentUser: mockCurrentUser,
        workflowTemplates: [mockWorkflow],
        milestones: [],
        onUpdateTask: vi.fn(),
        onAddTask: vi.fn(),
        onAddComment: vi.fn(),
        onAddTimeLog: vi.fn(),
        onAddDependency: vi.fn(),
        onUpdateApprovalStep: vi.fn(),
        onAddApprovalSteps: vi.fn(),
        onUpdateClientApproval: vi.fn(),
        onAddClientApproval: vi.fn(),
        onUploadFile: vi.fn(),
        onNotify: vi.fn(),
        onArchiveTask: vi.fn(),
        onDeleteTask: vi.fn(),
        onEditTask: vi.fn(),
        checkPermission: () => true,
        getStatusColor: () => '',
        resolveApprover: resolveApprover,
        onAddSocialPost: vi.fn(),
        leaveRequests: []
    };

    it('should display "Submit for Review" button when workflow is active and status is IN_PROGRESS', () => {
        render(<TaskDetailView {...defaultProps} />);

        // Button text is dynamic based on next step label
        // Mock workflow step 0 is 'Creative Director Review'
        expect(screen.getByRole('button', { name: /Submit to Creative Director/i })).toBeDefined();
    });

    it('should call onUpdateTask and onAddApprovalSteps when "Submit" is clicked', () => {
        const onUpdateTask = vi.fn();
        const onAddApprovalSteps = vi.fn();
        const onNotify = vi.fn();

        render(
            <TaskDetailView
                {...defaultProps}
                onUpdateTask={onUpdateTask}
                onAddApprovalSteps={onAddApprovalSteps}
                onNotify={onNotify}
            />
        );

        // Click Logic
        fireEvent.click(screen.getByRole('button', { name: /Submit to Creative Director/i }));

        // Assertions
        expect(onUpdateTask).toHaveBeenCalledWith(expect.objectContaining({
            status: TaskStatus.AWAITING_REVIEW
        }));

        // Should generate steps (mockWorkflow has 2 steps)
        expect(onAddApprovalSteps).toHaveBeenCalledWith(expect.arrayContaining([
            expect.objectContaining({ level: 0, status: 'pending' }),
            expect.objectContaining({ level: 1, status: 'waiting' })
        ]));

        expect(onNotify).toHaveBeenCalledWith('approval_request', expect.any(String), expect.any(String));
    });

    it('should display "Approve" button for the current approver', () => {
        // Setup: Task is in AWAITING_REVIEW, with existing steps
        const taskInReview = { ...mockTask, status: TaskStatus.AWAITING_REVIEW };
        const pendingStep = {
            id: 'as1', taskId: 't1', stepId: 's1',
            workflowTemplateId: 'wt1',
            approverId: 'u2', status: 'pending', level: 0,
            label: 'Director Review',
            milestoneId: null, createdAt: ''
        } as ApprovalStep;

        // Current user must be the approver 'u2'
        const approverUser = { ...mockCurrentUser, id: 'u2' };

        render(
            <TaskDetailView
                {...defaultProps}
                task={taskInReview}
                taskSteps={[pendingStep]}
                currentUser={approverUser}
            />
        );

        // Switch to Approvals Tab
        fireEvent.click(screen.getByText(/approvals/i));

        // Should see Approve button
        expect(screen.getByText('Approve')).toBeDefined();
        // expect(screen.getByText('Reject')).toBeDefined(); // Reject might require dropdown or be visible
    });

    it('should advance to next step on successful approval', () => {
        const onUpdateTask = vi.fn();
        const onUpdateApprovalStep = vi.fn();

        const pendingStep = {
            id: 'as1', taskId: 't1', stepId: 's1',
            workflowTemplateId: 'wt1',
            approverId: 'u2', status: 'pending', level: 0,
            label: 'Director Review',
            milestoneId: null, createdAt: ''
        } as ApprovalStep;

        const nextStep = {
            id: 'as2', taskId: 't1', stepId: 's2',
            workflowTemplateId: 'wt1',
            approverId: 'u3', status: 'waiting', level: 1,
            label: 'Client Review',
            milestoneId: null, createdAt: ''
        } as ApprovalStep;

        const approverUser = { ...mockCurrentUser, id: 'u2' };

        render(
            <TaskDetailView
                {...defaultProps}
                task={{ ...mockTask, status: TaskStatus.AWAITING_REVIEW }}
                taskSteps={[pendingStep, nextStep]}
                currentUser={approverUser}
                onUpdateTask={onUpdateTask}
                onUpdateApprovalStep={onUpdateApprovalStep}
            />
        );

        // Switch to Approvals Tab
        fireEvent.click(screen.getByText(/approvals/i));

        fireEvent.click(screen.getByText('Approve'));

        // Expect current step to approved
        expect(onUpdateApprovalStep).toHaveBeenCalledWith(expect.objectContaining({
            id: 'as1', status: 'approved'
        }));

        // Expect next step to be pending
        expect(onUpdateApprovalStep).toHaveBeenCalledWith(expect.objectContaining({
            id: 'as2', status: 'pending'
        }));

        // Expect task level advanced
        expect(onUpdateTask).toHaveBeenCalledWith(expect.objectContaining({
            currentApprovalLevel: 1
        }));
    });
});
