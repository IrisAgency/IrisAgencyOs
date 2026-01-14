import React, { useState } from 'react';
import {
    Task, Project, User, TaskStatus, Priority, Department, TaskComment,
    TaskTimeLog, TaskDependency, TaskActivityLog, ApprovalStep, ClientApproval,
    AgencyFile, TaskType, WorkflowTemplate, WorkflowStepTemplate, ProjectMember,
    RoleDefinition, ProjectMilestone, SocialPlatform, SocialPost, UserRole
} from '../../types';
import { PERMISSIONS } from '../../lib/permissions';
import {
    Plus, Search, Filter, Calendar, Clock, CheckCircle,
    MessageSquare, FileText, Link, Paperclip, MoreVertical,
    Play, Pause, AlertCircle, ChevronRight, User as UserIcon, Send,
    ThumbsUp, ThumbsDown, ShieldCheck, CornerUpLeft, Upload, Download,
    X, ChevronDown, SlidersHorizontal, GitMerge, Check, Archive, RotateCcw, Edit2, Share2, CheckCircle as CheckCircleIcon, Trash2
} from 'lucide-react';
import { deleteField } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import Modal from '../common/Modal';

export interface DetailViewProps {
    task: Task;
    project?: Project;
    users: User[];
    comments: TaskComment[];
    timeLogs: TaskTimeLog[];
    dependencies: TaskDependency[];
    activityLogs: TaskActivityLog[];
    taskSteps: ApprovalStep[];
    clientApproval?: ClientApproval;
    taskFiles: AgencyFile[];
    allTasks: Task[];
    currentUser: User;
    workflowTemplates: WorkflowTemplate[];
    milestones: ProjectMilestone[];
    onUpdateTask: (t: Task) => void;
    onAddTask: (t: Task) => void;
    onAddComment: (c: TaskComment) => void;
    onAddTimeLog: (l: TaskTimeLog) => void;
    onAddDependency: (d: TaskDependency) => void;
    onUpdateApprovalStep: (step: ApprovalStep) => void;
    onAddApprovalSteps: (steps: ApprovalStep[]) => void;
    onUpdateClientApproval: (ca: ClientApproval) => void;
    onAddClientApproval: (ca: ClientApproval) => void;
    onUploadFile: (file: AgencyFile) => void;
    onNotify: (type: string, title: string, message: string) => void;
    onArchiveTask: (task: Task) => void;
    onDeleteTask: (task: Task) => void;
    onEditTask: (task: Task) => void;
    onReopenTask?: (task: Task) => void;
    checkPermission: (code: string) => boolean;
    getStatusColor: (s: TaskStatus) => string;
    resolveApprover: (step: WorkflowStepTemplate, task: Task) => string | null;
    onAddSocialPost: (post: SocialPost) => void;
    leaveRequests?: any[];
    calendarItems?: any[];
}

const TaskDetailView = ({
    task, project, users, comments, timeLogs, dependencies, activityLogs, taskSteps, clientApproval,
    taskFiles, allTasks, currentUser, workflowTemplates, milestones,
    onUpdateTask, onAddTask, onAddComment, onAddTimeLog, onAddDependency,
    onUpdateApprovalStep, onAddApprovalSteps, onUpdateClientApproval, onAddClientApproval, onUploadFile, onNotify, onArchiveTask, onDeleteTask, onEditTask, onReopenTask, checkPermission,
    getStatusColor, resolveApprover, onAddSocialPost, leaveRequests, calendarItems = []
}: DetailViewProps) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [newComment, setNewComment] = useState('');
    const [showAssignModal, setShowAssignModal] = useState(false);
    // New Revision State
    const [showRevisionModal, setShowRevisionModal] = useState(false);
    const [revisionMessage, setRevisionMessage] = useState('');
    const [revisionAssignee, setRevisionAssignee] = useState('');
    
    // Edit state for description and voiceOver
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [isEditingVoiceOver, setIsEditingVoiceOver] = useState(false);
    const [editDescription, setEditDescription] = useState('');
    const [editVoiceOver, setEditVoiceOver] = useState('');
    const [editTextDirHint, setEditTextDirHint] = useState<'auto' | 'rtl' | 'ltr'>('auto');

    const fileInputRef = React.useRef<HTMLInputElement>(null);
    
    // Arabic/English text direction helpers
    const hasArabic = (text: string): boolean => {
        return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
    };
    
    const detectDir = (text: string): 'rtl' | 'ltr' => {
        return hasArabic(text) ? 'rtl' : 'ltr';
    };

    const usedTemplate = workflowTemplates.find(w => w.id === task.workflowTemplateId);

    // Get source calendar item and task for production tasks
    const sourceCalendarItem = task.isProductionCopy && task.sourceCalendarItemId 
        ? calendarItems.find(item => item.id === task.sourceCalendarItemId)
        : null;
    
    // Get the original task that the calendar item references
    const sourceTask = sourceCalendarItem?.taskId 
        ? allTasks.find(t => t.id === sourceCalendarItem.taskId)
        : null;

    // Combine references from current task, source task, and calendar item
    const displayReferenceLinks = [...(task.referenceLinks || [])];
    const displayReferenceImages = [...(task.referenceImages || [])];
    
    // Add references from source task (the original task in calendar)
    if (sourceTask) {
        if (sourceTask.referenceLinks) {
            displayReferenceLinks.push(...sourceTask.referenceLinks);
        }
        if (sourceTask.referenceImages) {
            displayReferenceImages.push(...sourceTask.referenceImages);
        }
    }
    
    // Add calendar item's reference links (if any)
    if (sourceCalendarItem?.referenceLinks) {
        displayReferenceLinks.push(...sourceCalendarItem.referenceLinks);
    }
    
    // Convert calendar item reference files to reference images format
    if (sourceCalendarItem?.referenceFiles) {
        sourceCalendarItem.referenceFiles.forEach((file, index) => {
            displayReferenceImages.push({
                id: `calendar_file_${sourceCalendarItem.id}_${index}`,
                fileName: file.fileName,
                downloadUrl: file.downloadURL, // Note: Calendar uses downloadURL (capital URL)
                storagePath: file.storagePath,
                uploadedAt: file.createdAt,
                uploadedBy: file.uploadedBy
            });
        });
    }

    // Helper: Auto-track task lifecycle events
    const trackTimeEvent = (
        eventType: 'task_accepted' | 'task_started' | 'task_submitted' | 'task_approved' | 'task_rejected' | 'status_change' | 'assignment_changed',
        fromStatus?: TaskStatus,
        toStatus?: TaskStatus,
        note?: string
    ) => {
        const timeLog: TaskTimeLog = {
            id: `tl${Date.now()}_${currentUser.id}`,
            taskId: task.id,
            userId: currentUser.id,
            hours: 0, // Automatic events don't count as work hours
            logDate: new Date().toISOString(),
            note: note || `${eventType.replace(/_/g, ' ')}`,
            eventType,
            fromStatus,
            toStatus,
            isAutomatic: true,
            timestamp: new Date().toISOString()
        };
        onAddTimeLog(timeLog);
    };

    // Determine label for next step
    let nextStepLabel = '';
    if (usedTemplate && task.status === TaskStatus.IN_PROGRESS) {
        const firstStep = usedTemplate.steps.find(s => s.order === 0);
        if (firstStep) nextStepLabel = firstStep.label;
    }

    // Transition Helpers
    const canAdvance = () => {
        const controlledStatuses = [TaskStatus.AWAITING_REVIEW, TaskStatus.APPROVED, TaskStatus.CLIENT_REVIEW, TaskStatus.CLIENT_APPROVED];

        // Block if task is in controlled status (approvals only)
        if (controlledStatuses.includes(task.status) || task.status === TaskStatus.COMPLETED || task.status === TaskStatus.ARCHIVED) {
            return false;
        }

        // Allow ASSIGNED, IN_PROGRESS, or REVISIONS_REQUIRED to be advanced (submitted for approval/completion)
        // And only by assigned users
        if (task.status === TaskStatus.ASSIGNED || task.status === TaskStatus.IN_PROGRESS || task.status === TaskStatus.REVISIONS_REQUIRED) {
            return (task.assigneeIds || []).includes(currentUser.id);
        }

        // No other statuses can be advanced via this button
        return false;
    };

    const handleAdvanceStatus = () => {
        // Security Check: Only allow if canAdvance returns true
        if (!canAdvance()) {
            console.warn('Unauthorized attempt to advance task');
            onNotify('error', 'Access Denied', 'You are not authorized to advance this task.');
            return;
        }

        // NEW: Handle Revision Submission
        if (task.status === TaskStatus.REVISIONS_REQUIRED) {
            if (task.revisionContext?.active) {
                handleSubmitRevision();
                return;
            } else {
                // Fallback: If no revision context, just move to AWAITING_REVIEW (don't complete)
                // This prevents accidental completion/archiving
                onUpdateTask({ ...task, status: TaskStatus.AWAITING_REVIEW, updatedAt: new Date().toISOString() });
                onNotify('approval_request', 'Approval Requested', `Task "${task.title}" is now awaiting review.`);
                return;
            }
        }

        const oldStatus = task.status;

        // Submit for approval from ASSIGNED, IN_PROGRESS or REVISIONS_REQUIRED
        if (task.status === TaskStatus.ASSIGNED || task.status === TaskStatus.IN_PROGRESS) {
            // Check if workflow exists
            if (task.workflowTemplateId) {
                // If resubmitting after revisions (Legacy fallback or new system)
                if (task.status === TaskStatus.REVISIONS_REQUIRED) {
                     // This block should be covered by handleSubmitRevision above if using new system
                     // But keeping for safety if context is missing
                     handleSubmitRevision();
                     return;
                }

                // Moving to Review: Generate Steps Dynamically (first time submission)
                if (taskSteps.length === 0) {
                    const template = workflowTemplates.find(w => w.id === task.workflowTemplateId);
                    if (template && template.steps.length > 0) {
                        const newSteps: ApprovalStep[] = template.steps.map((step, index) => {
                            const approverId = resolveApprover(step, task);
                            return {
                                id: `as${Date.now()}_${index}`,
                                taskId: task.id,
                                milestoneId: task.milestoneId || null, // Link to milestone
                                approverId: approverId || 'unassigned', // Fallback needs handling
                                level: step.order,
                                status: index === 0 ? 'pending' : 'waiting',
                                createdAt: new Date().toISOString()
                            };
                        });
                        onAddApprovalSteps(newSteps);
                        onNotify('system', 'Workflow Started', `Approval workflow "${template.name}" initiated.`);
                    }
                }

                // Track submission event
                trackTimeEvent('task_submitted', oldStatus, TaskStatus.AWAITING_REVIEW, `Submitted task for review`);

                onUpdateTask({ ...task, status: TaskStatus.AWAITING_REVIEW, updatedAt: new Date().toISOString() });
                onNotify('approval_request', 'Approval Requested', `Task "${task.title}" is now awaiting review.`);
            } else {
                // No workflow - direct completion
                trackTimeEvent('task_submitted', oldStatus, TaskStatus.COMPLETED, `Completed task (no workflow)`);

                // Check for Social Handover
                if (task.requiresSocialPost && !task.socialPostId) {
                    const socialPost = createSocialPostFromTask(task);

                    // Update Task with social post link
                    onUpdateTask({
                        ...task,
                        status: TaskStatus.COMPLETED,
                        socialPostId: socialPost.id,
                        completedAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    });
                } else {
                    // Normal Completion
                    onUpdateTask({
                        ...task,
                        status: TaskStatus.COMPLETED,
                        completedAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    });
                    onNotify('task_completed', 'Task Completed', `Task "${task.title}" has been completed.`);
                }
            }
        }
    };

    const handlePostComment = () => {
        if (!newComment.trim()) return;
        onAddComment({
            id: `tc${Date.now()}`,
            taskId: task.id,
            userId: currentUser.id,
            message: newComment,
            createdAt: new Date().toISOString()
        });
        setNewComment('');
    };

    const handleFileUpload = () => {
        try {
            console.log('Upload button clicked');
            console.log('Current user:', currentUser.name, currentUser.role);
            console.log('File input ref:', fileInputRef.current);
            console.log('Project:', project?.name, project?.id);

            if (!fileInputRef.current) {
                console.error('File input ref is null!');
                return;
            }

            fileInputRef.current.click();
            console.log('File input clicked successfully');
        } catch (error) {
            console.error('Error in handleFileUpload:', error);
        }
    };

    const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            console.log('handleFileSelected called');

            const selectedFile = event.target.files?.[0];
            if (!selectedFile) {
                console.log('No file selected');
                return;
            }

            if (!project) {
                console.error('No project found!');
                alert('Error: No project associated with this task');
                return;
            }

            console.log('File selected:', selectedFile.name, selectedFile.type, selectedFile.size);
            console.log('Project:', project.name, project.id);
            console.log('Current user:', currentUser.name, currentUser.id, currentUser.role);

            const newFile: AgencyFile = {
                id: `file${Date.now()}`,
                projectId: project.id,
                taskId: task.id,
                uploaderId: currentUser.id,
                name: selectedFile.name,
                type: selectedFile.type,
                size: selectedFile.size,
                url: '', // Will be set after upload
                version: 1,
                isDeliverable: false,
                tags: ['task-attachment'],
                isArchived: false,
                createdAt: new Date().toISOString()
            };

            console.log('Created file object:', newFile);

            // Attach the raw file for upload processing
            (newFile as any).file = selectedFile;

            console.log('Calling onUploadFile with file:', newFile.name);
            console.log('onUploadFile function:', typeof onUploadFile);

            onUploadFile(newFile);

            console.log('onUploadFile called successfully');

            // Reset file input
            if (event.target) event.target.value = '';
        } catch (error) {
            console.error('Error in handleFileSelected:', error);
            alert('Error selecting file: ' + (error as Error).message);
        }
    };

    // Helper to create social post
    const createSocialPostFromTask = (originalTask: Task) => {
        const newPost: SocialPost = {
            id: `sp${Date.now()}`,
            sourceTaskId: originalTask.id,
            projectId: originalTask.projectId,
            clientId: project?.clientId || '',
            title: originalTask.title,
            platforms: originalTask.socialPlatforms || [],
            caption: '', // To be filled by Social Manager
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: currentUser.id,
            timezone: 'UTC', // Default, can be changed
            socialManagerId: originalTask.socialManagerId || null,
            notesFromTask: originalTask.publishingNotes || null,
            publishAt: null
        };

        onAddSocialPost(newPost);
        onNotify('system', 'Social Handover', `Social post created in Posting Hub.`);
        return newPost;
    };

    // Approval Actions
    const handleApprovalAction = (action: 'approve' | 'reject' | 'revise', comment?: string) => {
        // Find the pending step for current user
        const currentStep = taskSteps.find(s => s.approverId === currentUser.id && s.status === 'pending');
        if (!currentStep) {
            console.warn('No pending approval step found for current user');
            onNotify('error', 'Access Denied', 'You are not authorized to approve this task at this time.');
            return;
        }

        if (action === 'approve') {
            // Track approval event
            trackTimeEvent('task_approved', task.status, TaskStatus.AWAITING_REVIEW, `Approved by ${currentUser.name}`);

            // 1. Mark current step approved
            onUpdateApprovalStep({ ...currentStep, status: 'approved', reviewedAt: new Date().toISOString(), comment: 'Approved' });

            // Clear Revision Context if active
            if (task.revisionContext?.active) {
                 onUpdateTask({
                    ...task,
                    revisionContext: { ...task.revisionContext, active: false } as any,
                    updatedAt: new Date().toISOString()
                 });
            }

            // 2. Activate next step
            const nextLevel = currentStep.level + 1;
            const nextStep = taskSteps.find(s => s.level === nextLevel);

            if (nextStep) {
                onUpdateApprovalStep({ ...nextStep, status: 'pending' });
                onUpdateTask({ ...task, currentApprovalLevel: nextLevel, updatedAt: new Date().toISOString() });
            } else {
                // No more internal steps
                if (task.isClientApprovalRequired) {
                    onUpdateTask({ ...task, status: TaskStatus.CLIENT_REVIEW, updatedAt: new Date().toISOString() });
                    // Create Client Approval record if missing
                    if (!clientApproval && project?.clientId) {
                        onAddClientApproval({
                            id: `ca${Date.now()}`,
                            taskId: task.id,
                            clientId: project.clientId,
                            status: 'pending'
                        });
                    }
                    onNotify('task_status_changed', 'Ready for Client', `"${task.title}" moved to Client Review.`);
                } else {
                    // --- FINAL APPROVAL LOGIC ---

                    // Check for Social Handover
                    if (task.requiresSocialPost && !task.socialPostId) {
                        const socialPost = createSocialPostFromTask(task);

                        // Update Original Task
                        onUpdateTask({
                            ...task,
                            status: TaskStatus.APPROVED,
                            socialPostId: socialPost.id,
                            updatedAt: new Date().toISOString()
                        });
                    } else {
                        // Normal Completion
                        onUpdateTask({ ...task, status: TaskStatus.APPROVED, updatedAt: new Date().toISOString() });
                        onNotify('task_status_changed', 'Approved', `"${task.title}" fully approved internally.`);
                    }
                }
            }
        } else {
            // Reject / Revise -> Open Modal
            handleRequestRevision();
        }
    };

    // NEW: Revision Logic Functions
    const handleRequestRevision = () => {
        setShowRevisionModal(true);
        setRevisionMessage('');
        // Default to the original assignee or the previous approver
        // Collect all potential revisers: previous approvers + original assignees
        const previousApprovers = taskSteps
            .filter(s => s.level < (task.currentApprovalLevel || 0))
            .map(s => s.approverId);
        
        const potentialRevisers = [...new Set([...(task.assigneeIds || []), ...previousApprovers])];
        
        // Default to the first one found
        setRevisionAssignee(potentialRevisers[0] || '');
    };

    const confirmRequestRevision = () => {
        if (!revisionAssignee || !revisionMessage) return;

        const currentStep = taskSteps.find(s => s.approverId === currentUser.id && s.status === 'pending');
        if (!currentStep) return;

        // 1. Update current step to REVISION_REQUESTED
        onUpdateApprovalStep({
            ...currentStep,
            status: 'revision_requested',
            reviewedAt: new Date().toISOString(),
            comment: revisionMessage
        });

        // 2. Create Revision Context
        const currentCycle = (task.revisionHistory?.length || 0) + 1;
        
        const newRevisionContext = {
            active: true,
            requestedByUserId: currentUser.id,
            requestedByStepId: currentStep.id,
            assignedToUserId: revisionAssignee,
            requestedAt: new Date().toISOString(),
            message: revisionMessage,
            cycle: currentCycle
        };

        // 3. Update Task
        const newHistory = [
            ...(task.revisionHistory || []),
            {
                cycle: currentCycle,
                stepLevel: currentStep.level,
                requestedBy: currentUser.id,
                assignedTo: revisionAssignee,
                comment: revisionMessage,
                date: new Date().toISOString()
            }
        ];

        onUpdateTask({
            ...task,
            status: TaskStatus.REVISIONS_REQUIRED,
            revisionContext: newRevisionContext,
            revisionHistory: newHistory,
            assigneeIds: [revisionAssignee], // Re-assign to the reviser
            updatedAt: new Date().toISOString()
        });

        trackTimeEvent('task_rejected', task.status, TaskStatus.REVISIONS_REQUIRED, `Revisions requested by ${currentUser.name}: ${revisionMessage}`);
        onNotify('task_status_changed', 'Revisions Requested', `"${task.title}" returned for revisions.`);
        
        setShowRevisionModal(false);
    };

    const handleSubmitRevision = () => {
        if (!task.revisionContext?.active) return;
        
        // 1. Update Task Status
        const oldStatus = task.status;
        
        // 2. Reset the requesting step to PENDING
        let requestingStep = taskSteps.find(s => s.id === task.revisionContext?.requestedByStepId);
        
        // Fallback: If specific step not found, find any step that is revision_requested
        if (!requestingStep) {
            requestingStep = taskSteps.find(s => s.status === 'revision_requested');
        }

        if (requestingStep) {
            onUpdateApprovalStep({
                ...requestingStep,
                status: 'pending',
                reviewedAt: '', // Clear reviewed date so it shows as pending
                comment: '' // Clear comment
            });
        }

        // 3. Mark reviser's step as REVISION_SUBMITTED (if they had a step)
        const reviserStep = taskSteps.find(s => s.approverId === currentUser.id);
        if (reviserStep) {
             onUpdateApprovalStep({
                ...reviserStep,
                status: 'revision_submitted'
            });
        }

        // 4. Update Revision History (mark resolved)
        const updatedHistory = (task.revisionHistory || []).map(h => {
            if (h.cycle === task.revisionContext?.cycle) {
                return { ...h, resolvedAt: new Date().toISOString() };
            }
            return h;
        });

        // 5. Update Task - CRITICAL FIX: Ensure task is visible and active
        onUpdateTask({
            ...task,
            status: TaskStatus.AWAITING_REVIEW,
            // Keep revision context active until approved
            // Keep both the requester (reviewer) and the employee (submitter) assigned so it appears in both lists
            assigneeIds: Array.from(new Set([...(task.assigneeIds || []), task.revisionContext.requestedByUserId])),
            revisionHistory: updatedHistory,
            updatedAt: new Date().toISOString(),
            // Explicitly reset completion/archive flags to ensure visibility
            isArchived: false,
            completedAt: null as any, // Use null instead of deleteField to avoid local state issues
            archivedAt: null as any,
            archivedBy: null as any
        });

        trackTimeEvent('task_submitted', oldStatus, TaskStatus.AWAITING_REVIEW, `Revisions submitted by ${currentUser.name}`);
        
        onNotify('approval_request', 'Revisions Submitted', `Task "${task.title}" revisions submitted for review.`);
    };

    const handleClientAction = (action: 'approve' | 'reject') => {
        if (!clientApproval) return;
        if (action === 'approve') {
            onUpdateClientApproval({ ...clientApproval, status: 'approved', reviewedAt: new Date().toISOString() });

            // Check for Social Handover (Client Approved)
            if (task.requiresSocialPost && !task.socialPostId) {
                const socialPost = createSocialPostFromTask(task);

                onUpdateTask({
                    ...task,
                    status: TaskStatus.CLIENT_APPROVED,
                    socialPostId: socialPost.id,
                    updatedAt: new Date().toISOString()
                });
            } else {
                onUpdateTask({ ...task, status: TaskStatus.CLIENT_APPROVED, updatedAt: new Date().toISOString() });
                onNotify('task_status_changed', 'Client Approved', `"${task.title}" approved by client.`);
            }

        } else {
            onUpdateClientApproval({ ...clientApproval, status: 'rejected', reviewedAt: new Date().toISOString() });
            onUpdateTask({ ...task, status: TaskStatus.REVISIONS_REQUIRED, updatedAt: new Date().toISOString() });
            onNotify('task_status_changed', 'Client Rejected', `"${task.title}" rejected by client.`);
        }
    };

    const handleDeleteReferenceLink = (linkId: string) => {
        if (!confirm('Are you sure you want to delete this reference link?')) return;
        
        const updatedLinks = (task.referenceLinks || []).filter(l => l.id !== linkId);
        onUpdateTask({
            ...task,
            referenceLinks: updatedLinks,
            updatedAt: new Date().toISOString()
        });
        onNotify('success', 'Link Deleted', 'Reference link has been removed.');
    };

    const handleDeleteReferenceImage = async (imageId: string, storagePath?: string) => {
        if (!confirm('Are you sure you want to delete this reference image?')) return;

        try {
            // 1. Delete from Storage if path exists
            if (storagePath) {
                const imageRef = ref(storage, storagePath);
                await deleteObject(imageRef);
            }

            // 2. Update Task
            const updatedImages = (task.referenceImages || []).filter(img => img.id !== imageId);
            onUpdateTask({
                ...task,
                referenceImages: updatedImages,
                updatedAt: new Date().toISOString()
            });
            onNotify('success', 'Image Deleted', 'Reference image has been removed.');
        } catch (error) {
            console.error('Error deleting image:', error);
            onNotify('error', 'Error', 'Failed to delete image from storage.');
        }
    };

    const handleAssignUser = (userId: string) => {
        const currentAssignees = task.assigneeIds || [];
        if (currentAssignees.includes(userId)) {
            // Remove user
            onUpdateTask({
                ...task,
                assigneeIds: currentAssignees.filter(id => id !== userId),
                updatedAt: new Date().toISOString()
            });
        } else {
            // Add user
            onUpdateTask({
                ...task,
                assigneeIds: [...currentAssignees, userId],
                updatedAt: new Date().toISOString()
            });
        }
    };

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelected}
                accept="*/*"
            />

            {/* Header */}
            <div className="p-6 border-b border-slate-200">
                {/* Completed/Archived Banner */}
                {(task.status === TaskStatus.COMPLETED || task.isArchived) && (
                    <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-600">
                            {task.isArchived ? <Archive className="w-5 h-5" /> : <CheckCircleIcon className="w-5 h-5 text-green-600" />}
                            <span className="font-medium text-sm">
                                This task is {task.isArchived ? 'archived' : 'completed'}.
                                {task.completedAt && ` Completed on ${new Date(task.completedAt).toLocaleDateString()}.`}
                            </span>
                        </div>
                    </div>
                )}

                <div className="flex justify-between items-start mb-4">
                    <div>
                        <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
                            <span>{project?.name || 'Unknown Project'}</span>
                            <span>/</span>
                            {task.milestoneId && (
                                <>
                                    <span className="text-indigo-600 font-medium">{milestones.find(m => m.id === task.milestoneId)?.name || 'Unknown Milestone'}</span>
                                    <span>/</span>
                                </>
                            )}
                            <span className="uppercase font-semibold text-slate-700">{task.id}</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">{task.title}</h1>
                    </div>

                    <div className="flex items-center space-x-2">
                        {(checkPermission('tasks.edit.all') || (checkPermission('tasks.edit.own') && ((task.assigneeIds || []).includes(currentUser.id) || task.createdBy === currentUser.id))) && 
                         ((!task.isArchived && task.status !== TaskStatus.COMPLETED) || checkPermission('tasks.edit_completed')) && (
                            <button
                                onClick={() => onEditTask(task)}
                                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600"
                                title="Edit Task"
                            >
                                <Edit2 className="w-5 h-5" />
                            </button>
                        )}
                        <span className={`px-3 py-1 rounded-full text-sm font-bold border capitalize ${getStatusColor(task.status)}`}>
                            {task.status.replace('_', ' ')}
                        </span>
                        <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
                            <MoreVertical className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Quick Actions Bar */}
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 flex-wrap gap-2">
                    <div className="flex items-center space-x-4">
                        <div className="flex -space-x-2">
                            {(task.assigneeIds || []).length > 0 ? (
                                (task.assigneeIds || []).map(uid => {
                                    const u = users.find(user => user.id === uid);
                                    return u ? <img key={uid} src={u.avatar} className="w-8 h-8 rounded-full border-2 border-white" title={u.name} /> : null;
                                })
                            ) : <span className="text-xs text-slate-400 italic px-2">Unassigned</span>}
                            {(checkPermission('tasks.manage_assignees') || checkPermission(PERMISSIONS.TASKS.ASSIGN_ALL) || checkPermission(PERMISSIONS.TASKS.ASSIGN_DEPT)) && (
                                <button
                                    onClick={() => setShowAssignModal(true)}
                                    className="w-8 h-8 rounded-full bg-white border border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-300"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <div className="h-8 w-px bg-slate-200"></div>
                        <div className="flex items-center text-sm text-slate-600 gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span className="ltr-text">Due {new Date(task.dueDate).toLocaleDateString()}</span>
                        </div>
                    </div>

                    {/* Manual Advance for Non-Review Statuses */}
                    {canAdvance() && (
                        <button
                            onClick={handleAdvanceStatus}
                            className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm transition-colors"
                        >
                            <span>
                                {task.status === TaskStatus.IN_PROGRESS
                                    ? (nextStepLabel ? `Submit to ${nextStepLabel}` : 'Submit for Review')
                                    : 'Advance'}
                            </span>
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    )}

                    {/* Show message if user cannot advance */}
                    {!canAdvance() && (task.status === TaskStatus.IN_PROGRESS || task.status === TaskStatus.REVISIONS_REQUIRED) && !(task.assigneeIds || []).includes(currentUser.id) && (
                        <div className="flex items-center space-x-2 text-slate-400 text-xs italic">
                            <AlertCircle className="w-4 h-4" />
                            <span>Only assigned users can submit</span>
                        </div>
                    )}

                    {/* Client Review Banner Sim */}
                    {task.status === TaskStatus.CLIENT_REVIEW && (
                        <div className="flex items-center space-x-2 text-purple-600 text-sm font-bold">
                            <ShieldCheck className="w-4 h-4" />
                            <span>Waiting for Client</span>
                        </div>
                    )}

                    {/* Archive Action */}
                    {!task.isArchived && (task.status === TaskStatus.APPROVED || task.status === TaskStatus.CLIENT_APPROVED || task.status === TaskStatus.COMPLETED) && (
                        <button
                            onClick={() => onArchiveTask(task)}
                            className="flex items-center space-x-2 bg-slate-800 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-900 shadow-sm transition-colors"
                        >
                            <Archive className="w-4 h-4" />
                            <span>Archive Task</span>
                        </button>
                    )}

                    {/* Reopen / Unarchive Action */}
                    {(task.status === TaskStatus.COMPLETED || task.isArchived) && checkPermission('tasks.reopen') && onReopenTask && (
                        <button
                            onClick={() => onReopenTask(task)}
                            className="flex items-center space-x-2 bg-amber-100 text-amber-700 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-amber-200 shadow-sm transition-colors border border-amber-200"
                        >
                            <RotateCcw className="w-4 h-4" />
                            <span>{task.isArchived ? 'Unarchive Task' : 'Reopen Task'}</span>
                        </button>
                    )}

                    {/* Delete Action */}
                    {checkPermission('tasks.delete') && (
                        <button
                            onClick={() => onDeleteTask(task)}
                            className="flex items-center space-x-2 bg-red-50 text-red-600 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-red-100 shadow-sm transition-colors border border-red-200"
                        >
                            <X className="w-4 h-4" />
                            <span>Delete</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200 px-6">
                <nav className="-mb-px flex gap-6 overflow-x-auto">
                    {['overview', 'references', 'approvals', 'files', 'comments', 'time_logs', 'dependencies'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`whitespace-nowrap py-4 text-sm font-medium border-b-2 capitalize transition-colors ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            {tab.replace('_', ' ')}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2 space-y-4">

                                {/* Description Section */}
                                <div className="bg-white p-4 rounded-xl border border-slate-200">
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="block text-xs font-bold text-slate-400 uppercase">Description</label>
                                        {checkPermission('tasks.edit.all') || checkPermission('tasks.edit.own') ? (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (isEditingDescription) {
                                                        onUpdateTask({ 
                                                            ...task, 
                                                            description: editDescription?.trim() || null,
                                                            textDirHint: editTextDirHint,
                                                            updatedAt: new Date().toISOString()
                                                        });
                                                        setIsEditingDescription(false);
                                                    } else {
                                                        setEditDescription(task.description || '');
                                                        setEditTextDirHint(task.textDirHint || 'auto');
                                                        setIsEditingDescription(true);
                                                    }
                                                }}
                                                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                                            >
                                                {isEditingDescription ? <><Check className="w-3 h-3" /> Save</> : <><Edit2 className="w-3 h-3" /> Edit</>}
                                            </button>
                                        ) : null}
                                    </div>
                                    
                                    {isEditingDescription ? (
                                        <div className="space-y-2">
                                            <div className="flex justify-end gap-2 mb-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setEditTextDirHint('auto')}
                                                    className={`px-2 py-1 text-xs font-medium rounded ${editTextDirHint === 'auto' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                                >
                                                    Auto
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditTextDirHint('rtl')}
                                                    className={`px-2 py-1 text-xs font-medium rounded ${editTextDirHint === 'rtl' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                                >
                                                    عربي
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditTextDirHint('ltr')}
                                                    className={`px-2 py-1 text-xs font-medium rounded ${editTextDirHint === 'ltr' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                                >
                                                    English
                                                </button>
                                            </div>
                                            <textarea
                                                className="w-full p-3 border border-slate-300 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[120px] resize-y"
                                                value={editDescription}
                                                onChange={e => setEditDescription(e.target.value)}
                                                placeholder="Add details about this task..."
                                                dir={editTextDirHint !== 'auto' ? editTextDirHint : detectDir(editDescription)}
                                                style={{
                                                    textAlign: 'start',
                                                    unicodeBidi: 'plaintext',
                                                    lineHeight: '1.6',
                                                    whiteSpace: 'pre-wrap'
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setIsEditingDescription(false)}
                                                className="text-xs text-slate-500 hover:text-slate-700"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <div 
                                            className="text-sm text-slate-700 whitespace-pre-wrap min-h-[60px] p-2"
                                            dir={task.textDirHint !== 'auto' ? task.textDirHint : detectDir(task.description || '')}
                                            style={{
                                                textAlign: 'start',
                                                unicodeBidi: 'plaintext',
                                                lineHeight: '1.6'
                                            }}
                                        >
                                            {task.description || <span className="text-slate-400 italic">No description provided</span>}
                                        </div>
                                    )}
                                </div>

                                {/* Voice Over Section */}
                                <div className="bg-white p-4 rounded-xl border border-slate-200">
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="block text-xs font-bold text-slate-400 uppercase">Voice Over Script</label>
                                        {checkPermission('tasks.edit.all') || checkPermission('tasks.edit.own') ? (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (isEditingVoiceOver) {
                                                        onUpdateTask({ 
                                                            ...task, 
                                                            voiceOver: editVoiceOver?.trim() || null,
                                                            textDirHint: editTextDirHint,
                                                            updatedAt: new Date().toISOString()
                                                        });
                                                        setIsEditingVoiceOver(false);
                                                    } else {
                                                        setEditVoiceOver(task.voiceOver || '');
                                                        setEditTextDirHint(task.textDirHint || 'auto');
                                                        setIsEditingVoiceOver(true);
                                                    }
                                                }}
                                                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                                            >
                                                {isEditingVoiceOver ? <><Check className="w-3 h-3" /> Save</> : <><Edit2 className="w-3 h-3" /> Edit</>}
                                            </button>
                                        ) : null}
                                    </div>
                                    
                                    {isEditingVoiceOver ? (
                                        <div className="space-y-2">
                                            <div className="flex justify-end gap-2 mb-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setEditTextDirHint('auto')}
                                                    className={`px-2 py-1 text-xs font-medium rounded ${editTextDirHint === 'auto' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                                >
                                                    Auto
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditTextDirHint('rtl')}
                                                    className={`px-2 py-1 text-xs font-medium rounded ${editTextDirHint === 'rtl' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                                >
                                                    عربي
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditTextDirHint('ltr')}
                                                    className={`px-2 py-1 text-xs font-medium rounded ${editTextDirHint === 'ltr' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                                >
                                                    English
                                                </button>
                                            </div>
                                            <textarea
                                                className="w-full p-3 border border-slate-300 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[160px] resize-y"
                                                value={editVoiceOver}
                                                onChange={e => setEditVoiceOver(e.target.value)}
                                                placeholder="Write voice over script..."
                                                dir={editTextDirHint !== 'auto' ? editTextDirHint : detectDir(editVoiceOver)}
                                                style={{
                                                    textAlign: 'start',
                                                    unicodeBidi: 'plaintext',
                                                    lineHeight: '1.6',
                                                    whiteSpace: 'pre-wrap'
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setIsEditingVoiceOver(false)}
                                                className="text-xs text-slate-500 hover:text-slate-700"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <div 
                                            className="text-sm text-slate-700 whitespace-pre-wrap min-h-[80px] p-2"
                                            dir={task.textDirHint !== 'auto' ? task.textDirHint : detectDir(task.voiceOver || '')}
                                            style={{
                                                textAlign: 'start',
                                                unicodeBidi: 'plaintext',
                                                lineHeight: '1.6'
                                            }}
                                        >
                                            {task.voiceOver || <span className="text-slate-400 italic">No voice over script provided</span>}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <h3 className="font-bold text-slate-900 text-sm mb-3">Meta Info</h3>
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-xs text-slate-500">Department</p>
                                            <p className="text-sm font-medium text-slate-800">{task.department}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500">Type</p>
                                            <p className="text-sm font-medium text-slate-800 capitalize">{task.taskType?.replace('_', ' ') || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500">Priority</p>
                                            <p className="text-sm font-medium text-slate-800 capitalize">{task.priority}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500">Created By</p>
                                            <p className="text-sm font-medium text-slate-800">{users.find(u => u.id === task.createdBy)?.name || 'Unknown'}</p>
                                        </div>
                                        {usedTemplate && (
                                            <div>
                                                <p className="text-xs text-slate-500">Workflow</p>
                                                <div className="flex items-center gap-1 mt-1">
                                                    <GitMerge className="w-3 h-3 text-indigo-500" />
                                                    <span className="text-xs font-medium text-indigo-600">{usedTemplate.name}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Social Publishing Assignment */}
                                {task.requiresSocialPost && (
                                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                        <h3 className="font-bold text-indigo-900 text-sm mb-3 flex items-center gap-2">
                                            <Share2 className="w-4 h-4" /> Social Publishing
                                        </h3>

                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-xs font-bold text-indigo-800 mb-1">Social Manager</label>
                                                <select
                                                    className="w-full p-2 border border-indigo-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
                                                    value={task.socialManagerId || ''}
                                                    onChange={e => onUpdateTask({ ...task, socialManagerId: e.target.value || null })}
                                                    disabled={!checkPermission('tasks.manage_publishing')}
                                                >
                                                    <option value="">Select Manager</option>
                                                    {users.filter(u => u.role === 'Social Manager' || u.department === 'Marketing').map(u => (
                                                        <option key={u.id} value={u.id}>{u.name}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-indigo-800 mb-1">Publishing Notes</label>
                                                <textarea
                                                    className="w-full p-2 border border-indigo-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
                                                    placeholder="Instructions for the social team..."
                                                    value={task.publishingNotes || ''}
                                                    onChange={e => onUpdateTask({ ...task, publishingNotes: e.target.value })}
                                                    disabled={!checkPermission('tasks.manage_publishing')}
                                                />
                                            </div>

                                            {task.socialPostId && (
                                                <div className="pt-2 border-t border-indigo-200">
                                                    <p className="text-xs text-indigo-600 flex items-center gap-1">
                                                        <CheckCircle className="w-3 h-3" />
                                                        <span>Handover Complete</span>
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'references' && (
                    <div className="space-y-8">
                        {/* Reference Links */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <Link className="w-4 h-4" /> Reference Links
                                {(sourceTask || sourceCalendarItem) && (
                                    <span className="text-xs font-normal text-slate-500 ml-2">
                                        (Including {sourceTask ? 'source task' : ''}{sourceTask && sourceCalendarItem ? ' and ' : ''}{sourceCalendarItem ? 'calendar item' : ''} references)
                                    </span>
                                )}
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {displayReferenceLinks.map(link => (
                                    <div key={link.id} className="bg-white p-3 rounded-lg border border-slate-200 hover:border-indigo-300 transition-colors group relative">
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 bg-slate-50 rounded flex items-center justify-center shrink-0">
                                                <img 
                                                    src={`https://www.google.com/s2/favicons?domain=${link.url}&sz=32`} 
                                                    alt="" 
                                                    className="w-4 h-4 opacity-70"
                                                    onError={(e) => (e.currentTarget.src = 'about:blank')} 
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-medium text-slate-900 truncate" title={link.title}>{link.title}</h4>
                                                <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline truncate block mt-0.5">
                                                    {link.url}
                                                </a>
                                                {link.note && <p className="text-xs text-slate-500 mt-2 line-clamp-2">{link.note}</p>}
                                            </div>
                                        </div>
                                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <a 
                                                href={link.url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="p-1.5 text-slate-400 hover:text-indigo-600 bg-white rounded-full shadow-sm border border-slate-100"
                                                title="Open Link"
                                            >
                                                <CornerUpLeft className="w-3 h-3 rotate-45" />
                                            </a>
                                            {checkPermission('tasks.references.delete') && (
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        handleDeleteReferenceLink(link.id);
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 bg-white rounded-full shadow-sm border border-slate-100"
                                                    title="Delete Link"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleDeleteReferenceLink(link.id)}
                                            className="absolute top-2 right-10 p-1.5 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                            title="Delete Link"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}  
                                {displayReferenceLinks.length === 0 && (
                                    <div className="col-span-full text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                        <p className="text-sm text-slate-500">No reference links added.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Reference Images */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <FileText className="w-4 h-4" /> Reference Images & Files
                                {(sourceTask || sourceCalendarItem) && (
                                    <span className="text-xs font-normal text-slate-500 ml-2">
                                        (Including {sourceTask ? 'source task' : ''}{sourceTask && sourceCalendarItem ? ' and ' : ''}{sourceCalendarItem ? 'calendar files' : ''})
                                    </span>
                                )}
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {displayReferenceImages.map(img => (
                                    <div key={img.id} className="group relative aspect-square bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                                        <img src={img.downloadUrl} alt={img.title || img.fileName} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                        
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                            <p className="text-white text-xs font-medium truncate mb-2">{img.fileName}</p>
                                            <div className="flex gap-2">
                                                <a 
                                                    href={img.downloadUrl} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-xs py-1.5 rounded text-center transition-colors"
                                                >
                                                    View
                                                </a>
                                                <a 
                                                    href={img.downloadUrl} 
                                                    download
                                                    className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white p-1.5 rounded transition-colors"
                                                >
                                                    <Download className="w-3 h-3" />
                                                </a>
                                                {checkPermission('tasks.references.delete') && (
                                                    <button
                                                        onClick={() => handleDeleteReferenceImage(img.id, img.storagePath)}
                                                        className="bg-white/20 hover:bg-rose-500/80 backdrop-blur-sm text-white p-1.5 rounded transition-colors"
                                                        title="Delete Image"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteReferenceImage(img.id, img.storagePath)}
                                            className="absolute top-2 right-2 p-1.5 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                            title="Delete Image"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                {displayReferenceImages.length === 0 && (
                                    <div className="col-span-full text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                        <p className="text-sm text-slate-500">No reference images uploaded.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'approvals' && (
                    <div className="space-y-8">
                        {/* Client Portal Simulation (If Active) */}
                        {task.status === TaskStatus.CLIENT_REVIEW && (
                            <div className="bg-purple-50 border border-purple-200 p-6 rounded-xl">
                                <h3 className="text-purple-800 font-bold text-lg mb-2 flex items-center gap-2"><ShieldCheck className="w-5 h-5" /> Client Portal Simulation</h3>
                                <p className="text-purple-700 text-sm mb-4">This task is currently visible to the client ({task.client}). Use the controls below to simulate a client response.</p>
                                <div className="flex gap-3">
                                    <button onClick={() => handleClientAction('approve')} className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-700">
                                        <ThumbsUp className="w-4 h-4" /> <span>Client Approve</span>
                                    </button>
                                    <button onClick={() => handleClientAction('reject')} className="flex items-center space-x-2 bg-white text-purple-600 border border-purple-200 px-4 py-2 rounded-lg font-bold hover:bg-purple-50">
                                        <ThumbsDown className="w-4 h-4" /> <span>Client Reject</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        <div>
                            <h3 className="text-sm font-bold text-slate-900 mb-4">Internal Approval Chain</h3>

                            {/* Revision Alert */}
                            {task.status === TaskStatus.REVISIONS_REQUIRED && task.revisionContext?.active && (
                                <div className="mb-6 bg-rose-50 border border-rose-200 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex items-start gap-3">
                                        <div className="bg-rose-100 p-2 rounded-full text-rose-600 mt-1"><RotateCcw className="w-4 h-4" /></div>
                                        <div>
                                            <h4 className="font-bold text-rose-900">Revisions Requested</h4>
                                            <p className="text-sm text-rose-800 mt-1">"{task.revisionContext.message}"</p>
                                            <div className="mt-2 text-xs text-rose-600 flex items-center gap-1">
                                                <span>Requested by: <strong>{users.find(u => u.id === task.revisionContext?.requestedByUserId)?.name}</strong></span>
                                                <span>•</span>
                                                <span>Assigned to: <strong>{users.find(u => u.id === task.revisionContext?.assignedToUserId)?.name}</strong></span>
                                            </div>
                                            {task.revisionContext.assignedToUserId === currentUser.id && (
                                                <button
                                                    onClick={handleSubmitRevision} // Re-submit logic
                                                    className="mt-3 px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 shadow-sm"
                                                >
                                                    Submit Revisions
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {taskSteps.length === 0 && task.status !== TaskStatus.COMPLETED && (
                                <div className="p-4 bg-slate-50 rounded-lg text-center text-sm text-slate-500 mb-4">
                                    Approval chain will be generated when submitted for review.
                                </div>
                            )}

                            <div className="relative pl-4">
                                {/* Connecting Line */}
                                <div className="absolute left-[2.25rem] top-4 bottom-4 w-0.5 bg-slate-200"></div>

                                <div className="space-y-6 relative">
                                    {taskSteps.map((step, index) => {
                                        const approver = users.find(u => u.id === step.approverId);
                                        const isPending = step.status === 'pending';
                                        const isApproved = step.status === 'approved';
                                        const isRejected = step.status === 'rejected' || step.status === 'revision_requested';
                                        const isRevisionSubmitted = step.status === 'revision_submitted';
                                        // const isWaiting = step.status === 'waiting';

                                        // Should show controls? Only if:
                                        // 1. Step is pending
                                        // 2. Current user is the approver
                                        // 3. Task is awaiting review (not in revisions, completed, etc.)
                                        const showControls = isPending &&
                                            currentUser.id === step.approverId &&
                                            task.status === TaskStatus.AWAITING_REVIEW;

                                        return (
                                            <div key={index} className="flex items-start space-x-4">
                                                <div className={`relative z-10 w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 bg-white transition-all ${isApproved ? 'border-emerald-500 text-emerald-500 bg-emerald-50' :
                                                    isRejected ? 'border-rose-500 text-rose-500 bg-rose-50' :
                                                        isRevisionSubmitted ? 'border-blue-500 text-blue-500 bg-blue-50' :
                                                            isPending ? 'border-amber-500 text-amber-500 ring-4 ring-amber-100' :
                                                                'border-slate-200 text-slate-300'
                                                    }`}>
                                                    {isApproved ? <CheckCircle className="w-5 h-5" /> :
                                                        isRevisionSubmitted ? <CheckCircleIcon className="w-5 h-5" /> :
                                                            isRejected ? <AlertCircle className="w-5 h-5" /> :
                                                                <UserIcon className="w-5 h-5" />}
                                                </div>
                                                <div className="pt-1 flex-1">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className={`font-bold ${isPending ? 'text-amber-700' : 'text-slate-700'}`}>
                                                                {approver?.name || 'Unassigned Approver'}
                                                            </p>
                                                            <p className="text-xs text-slate-500">{approver?.role || 'Pending assignment'}</p>
                                                        </div>
                                                        {step.reviewedAt && (
                                                            <span className="text-[10px] text-slate-400">{new Date(step.reviewedAt).toLocaleDateString()}</span>
                                                        )}
                                                    </div>

                                                    {/* Comments */}
                                                    {step.comment && (
                                                        <div className={`mt-2 text-sm p-2 rounded ${isRejected ? 'bg-rose-50 text-rose-800' : 'bg-slate-50 text-slate-600'}`}>
                                                            "{step.comment}"
                                                        </div>
                                                    )}

                                                    {/* Action Buttons for Approver */}
                                                    {showControls && (
                                                        <div className="mt-3 flex space-x-2 animate-in fade-in slide-in-from-top-2 relative z-10">
                                                            <button
                                                                onClick={() => handleApprovalAction('approve')}
                                                                className="text-xs flex items-center gap-1 bg-emerald-600 text-white px-3 py-1.5 rounded-md font-bold hover:bg-emerald-700 shadow-sm"
                                                            >
                                                                <ThumbsUp className="w-3 h-3" /> Approve
                                                            </button>
                                                            <button
                                                                onClick={() => handleApprovalAction('revise', 'Revisions requested')}
                                                                className="text-xs flex items-center gap-1 bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-md font-bold hover:bg-slate-50"
                                                            >
                                                                <CornerUpLeft className="w-3 h-3" /> Request Revisions
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* Show waiting message if it's pending but not for current user */}
                                                    {isPending && currentUser.id !== step.approverId && (
                                                        <div className="mt-2 text-xs text-amber-600 italic flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            <span>Waiting for {approver?.name || 'approver'} to review</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Client Step Marker */}
                                    {task.isClientApprovalRequired && (
                                        <div className="flex items-start space-x-4">
                                            <div className={`relative z-10 w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 bg-white ${task.status === TaskStatus.CLIENT_APPROVED || task.status === TaskStatus.COMPLETED ? 'border-emerald-500 text-emerald-500 bg-emerald-50' :
                                                task.status === TaskStatus.CLIENT_REVIEW ? 'border-purple-500 text-purple-500 ring-4 ring-purple-100' : 'border-slate-200 text-slate-300'
                                                }`}>
                                                <ShieldCheck className="w-5 h-5" />
                                            </div>
                                            <div className="pt-1">
                                                <p className="font-bold text-slate-700">Client Approval</p>
                                                <p className="text-xs text-slate-500">{task.client}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'files' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-bold text-slate-900">Attached Assets</h3>
                            <button onClick={handleFileUpload} className="text-indigo-600 text-xs font-medium hover:underline flex items-center gap-1">
                                <Upload className="w-3 h-3" /> Upload File
                            </button>
                        </div>

                        {taskFiles.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {taskFiles.map(file => (
                                    <div key={file.id} className="border border-slate-200 rounded-lg p-3 flex items-start space-x-3 hover:bg-slate-50 transition-colors cursor-pointer">
                                        <div className="w-12 h-12 bg-slate-200 rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
                                            {file.type.startsWith('image/') ? (
                                                <img src={file.url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <FileText className="w-6 h-6 text-slate-400" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-900 truncate" title={file.name}>{file.name}</p>
                                            <p className="text-xs text-slate-500">v{file.version} • {new Date(file.createdAt).toLocaleDateString()}</p>
                                            {file.isDeliverable && (
                                                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded mt-1 inline-block">Final Deliverable</span>
                                            )}
                                        </div>
                                        <button className="text-slate-400 hover:text-indigo-600"><Download className="w-4 h-4" /></button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                <p className="text-sm text-slate-500">No files attached to this task.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'comments' && (
                    <div className="flex flex-col h-full">
                        <div className="flex-1 space-y-4 mb-4">
                            {comments.map(c => {
                                const u = users.find(user => user.id === c.userId);
                                return (
                                    <div key={c.id} className="flex space-x-3">
                                        <img src={u?.avatar} className="w-8 h-8 rounded-full" />
                                        <div className="bg-slate-50 p-3 rounded-lg rounded-tl-none border border-slate-100">
                                            <div className="flex items-center space-x-2 mb-1">
                                                <span className="font-bold text-xs text-slate-900">{u?.name}</span>
                                                <span className="text-[10px] text-slate-400">{new Date(c.createdAt).toLocaleString()}</span>
                                            </div>
                                            <p className="text-sm text-slate-700">{c.message}</p>
                                        </div>
                                    </div>
                                );
                            })}
                            {comments.length === 0 && <p className="text-center text-slate-400 text-sm mt-10">No comments yet.</p>}
                        </div>
                        <div className="mt-auto">
                            <div className="relative">
                                <input
                                    className="w-full pl-4 pr-12 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    placeholder="Write a comment..."
                                    value={newComment}
                                    onChange={e => setNewComment(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handlePostComment()}
                                />
                                <button onClick={handlePostComment} className="absolute right-2 top-2 p-1.5 text-indigo-600 hover:bg-indigo-50 rounded">
                                    <Send className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'time_logs' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-bold text-slate-900">Task Timeline & Duration</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500">Auto-tracked events</span>
                            </div>
                        </div>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-3 gap-3 mb-4">
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-3 rounded-lg border border-blue-200">
                                <div className="text-xs text-blue-600 font-medium mb-1">Total Duration</div>
                                <div className="text-xl font-bold text-blue-900">
                                    {(() => {
                                        const sortedEvents = [...timeLogs].filter(l => l.isAutomatic).sort((a, b) =>
                                            new Date(a.timestamp || a.logDate).getTime() - new Date(b.timestamp || b.logDate).getTime()
                                        );
                                        if (sortedEvents.length < 2) return '—';
                                        const start = new Date(sortedEvents[0].timestamp || sortedEvents[0].logDate);
                                        const end = new Date(sortedEvents[sortedEvents.length - 1].timestamp || sortedEvents[sortedEvents.length - 1].logDate);
                                        const hours = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60));
                                        const days = Math.floor(hours / 24);
                                        return days > 0 ? `${days}d ${hours % 24}h` : `${hours}h`;
                                    })()}
                                </div>
                            </div>
                            <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-3 rounded-lg border border-emerald-200">
                                <div className="text-xs text-emerald-600 font-medium mb-1">Manual Hours Logged</div>
                                <div className="text-xl font-bold text-emerald-900">
                                    {timeLogs.filter(l => !l.isAutomatic).reduce((acc, curr) => acc + curr.hours, 0)} hrs
                                </div>
                            </div>
                            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-3 rounded-lg border border-amber-200">
                                <div className="text-xs text-amber-600 font-medium mb-1">Events Tracked</div>
                                <div className="text-xl font-bold text-amber-900">
                                    {timeLogs.filter(l => l.isAutomatic).length}
                                </div>
                            </div>
                        </div>

                        {/* Timeline Events */}
                        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                                <h4 className="text-sm font-bold text-slate-700">Timeline</h4>
                            </div>
                            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                                {[...timeLogs]
                                    .sort((a, b) => new Date(b.timestamp || b.logDate).getTime() - new Date(a.timestamp || a.logDate).getTime())
                                    .map(log => {
                                        const user = users.find(u => u.id === log.userId);
                                        const isAuto = log.isAutomatic;

                                        return (
                                            <div key={log.id} className={`p-3 flex gap-3 ${isAuto ? 'bg-blue-50/30' : ''}`}>
                                                <div className="flex-shrink-0">
                                                    <img src={user?.avatar} alt={user?.name} className="w-8 h-8 rounded-full" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-sm font-medium text-slate-900">{user?.name}</span>
                                                        {isAuto && (
                                                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase">
                                                                Auto
                                                            </span>
                                                        )}
                                                        {!isAuto && log.hours > 0 && (
                                                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded">
                                                                {log.hours}h
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-slate-700 mb-1">{log.note}</p>
                                                    {log.fromStatus && log.toStatus && (
                                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                                            <span className="px-2 py-0.5 bg-slate-100 rounded">{log.fromStatus}</span>
                                                            <span>→</span>
                                                            <span className="px-2 py-0.5 bg-slate-100 rounded">{log.toStatus}</span>
                                                        </div>
                                                    )}
                                                    <div className="text-xs text-slate-400 mt-1">
                                                        {new Date(log.timestamp || log.logDate).toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                {timeLogs.length === 0 && (
                                    <div className="p-8 text-center text-slate-400 text-sm italic">
                                        No timeline events yet
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Manual Time Entry (Legacy) */}
                        <details className="bg-slate-50 border border-slate-200 rounded-lg">
                            <summary className="px-4 py-2 cursor-pointer font-medium text-sm text-slate-700 hover:bg-slate-100">
                                + Add Manual Time Entry
                            </summary>
                            <div className="p-4 border-t border-slate-200">
                                <p className="text-xs text-slate-500 mb-3">For manual hour logging (optional)</p>
                                {/* Could add manual form here if needed */}
                            </div>
                        </details>
                    </div>
                )}

                {activeTab === 'dependencies' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-bold text-slate-900">Blocking Tasks</h3>
                            <button className="text-indigo-600 text-xs font-medium hover:underline">+ Add Dependency</button>
                        </div>
                        <div className="space-y-2">
                            {dependencies.map(dep => {
                                const parentTask = allTasks.find(t => t.id === dep.dependsOnTaskId);
                                if (!parentTask) return null;
                                return (
                                    <div key={dep.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:border-indigo-300 transition-colors">
                                        <div className="flex items-center space-x-3">
                                            <div className={`w-2 h-2 rounded-full ${parentTask.status === TaskStatus.COMPLETED ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-900">{parentTask.title}</p>
                                                <p className="text-xs text-slate-500">{parentTask.status}</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-300" />
                                    </div>
                                );
                            })}
                            {dependencies.length === 0 && <p className="text-slate-400 text-sm italic">No dependencies.</p>}
                        </div>
                    </div>
                )}
            </div>

            {/* Assignment Modal */}
            <Modal
                isOpen={showAssignModal}
                onClose={() => setShowAssignModal(false)}
                title="Manage Assignees"
                size="md"
            >
                <div className="p-1 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-1">
                    {users.map(user => {
                        const isAssigned = (task.assigneeIds || []).includes(user.id);

                        // Availability Check
                        const isAvailable = (() => {
                            if (!task.dueDate || !leaveRequests) return true;
                            const targetDate = new Date(task.dueDate);
                            targetDate.setHours(0, 0, 0, 0);
                            const conflict = leaveRequests.find((req: any) => {
                                if (req.userId !== user.id || req.status !== 'approved') return false;
                                const start = new Date(req.startDate);
                                start.setHours(0, 0, 0, 0);
                                const end = new Date(req.endDate);
                                end.setHours(0, 0, 0, 0);
                                return targetDate >= start && targetDate <= end;
                            });
                            return !conflict;
                        })();

                        return (
                            <div
                                key={user.id}
                                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer border ${isAssigned ? 'border-indigo-200 bg-indigo-50' : 'border-transparent hover:bg-slate-50'}`}
                                onClick={() => handleAssignUser(user.id)}
                            >
                                <div className="flex items-center space-x-3">
                                    <div className="relative">
                                        <img src={user.avatar} className={`w-10 h-10 rounded-full ${!isAvailable ? 'opacity-50 grayscale' : ''}`} />
                                        {!isAvailable && (
                                            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                                                <AlertCircle className="w-4 h-4 text-rose-500" />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className={`text-sm font-medium ${isAssigned ? 'text-indigo-900' : 'text-slate-900'}`}>{user.name}</p>
                                            {!isAvailable && <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">ON LEAVE</span>}
                                        </div>
                                        <p className="text-xs text-slate-500">{user.role}</p>
                                    </div>
                                </div>
                                {isAssigned && <CheckCircleIcon className="w-6 h-6 text-indigo-600" />}
                            </div>
                        );
                    })}
                </div>
            </Modal>

            {/* Revision Request Modal */}
            <Modal
                isOpen={showRevisionModal}
                onClose={() => setShowRevisionModal(false)}
                title="Request Revisions"
                size="md"
            >
                <div className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Revision Message</label>
                        <textarea
                            className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 min-h-[100px]"
                            placeholder="Describe what needs to be fixed..."
                            value={revisionMessage}
                            onChange={e => setRevisionMessage(e.target.value)}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Assign Revision To</label>
                        <select
                            className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-rose-500"
                            value={revisionAssignee}
                            onChange={e => setRevisionAssignee(e.target.value)}
                        >
                            <option value="">Select User...</option>
                            {/* Show all users who have participated or are assigned */}
                            {(() => {
                                const previousApprovers = taskSteps
                                    .filter(s => s.level < (task.currentApprovalLevel || 0))
                                    .map(s => s.approverId);
                                const participants = [...new Set([...(task.assigneeIds || []), ...previousApprovers])];
                                
                                return participants.map(uid => {
                                    const u = users.find(user => user.id === uid);
                                    if (!u) return null;
                                    return <option key={u.id} value={u.id}>{u.name} ({u.role})</option>;
                                });
                            })()}
                        </select>
                        <p className="text-xs text-slate-500 mt-1">Select who should perform these revisions.</p>
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                        <button
                            onClick={() => setShowRevisionModal(false)}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmRequestRevision}
                            disabled={!revisionMessage || !revisionAssignee}
                            className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-bold hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Request Revisions
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default TaskDetailView;
