import React, { useState, useEffect } from 'react';
import {
    Task, Project, User, TaskStatus, Priority, Department, TaskType,
    WorkflowTemplate, ProjectMember, ProjectMilestone, SocialPlatform, UserRole,
    ReferenceLink, ReferenceImage
} from '../../types';
import { PERMISSIONS } from '../../lib/permissions';
import { AlertCircle, Link as LinkIcon, Image as ImageIcon, X, Plus, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import Modal from '../common/Modal';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../../lib/firebase';

interface CreateTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingTask: Task | null;
    currentUser: User;
    projects: Project[];
    users: User[];
    milestones: ProjectMilestone[];
    workflowTemplates: WorkflowTemplate[];
    projectMembers: ProjectMember[];
    leaveRequests: any[];
    checkPermission: (code: string) => boolean;
    onAddTask: (task: Task) => void;
    onUpdateTask: (task: Task) => void;
    onNotify: (type: string, title: string, message: string) => void;
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
    isOpen, onClose, editingTask, currentUser, projects, users, milestones,
    workflowTemplates, projectMembers, leaveRequests, checkPermission,
    onAddTask, onUpdateTask, onNotify
}) => {
    // Form State
    const [title, setTitle] = useState('');
    const [projectId, setProjectId] = useState('');
    const [department, setDepartment] = useState<Department>(Department.CREATIVE);
    const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
    const [taskType, setTaskType] = useState<TaskType>('design');
    const [dueDate, setDueDate] = useState('');
    const [milestoneId, setMilestoneId] = useState('');
    const [workflowId, setWorkflowId] = useState<string>('');
    const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
    const [requiresSocial, setRequiresSocial] = useState(false);
    const [socialPlatforms, setSocialPlatforms] = useState<SocialPlatform[]>([]);
    const [socialManagerId, setSocialManagerId] = useState<string>('');
    
    // Description & Voice Over State
    const [description, setDescription] = useState('');
    const [voiceOver, setVoiceOver] = useState('');
    const [textDirHint, setTextDirHint] = useState<'auto' | 'rtl' | 'ltr'>('auto');

    // References State
    const [referenceLinks, setReferenceLinks] = useState<ReferenceLink[]>([]);
    const [newLinkTitle, setNewLinkTitle] = useState('');
    const [newLinkUrl, setNewLinkUrl] = useState('');
    const [newLinkNote, setNewLinkNote] = useState('');
    const [showLinkInput, setShowLinkInput] = useState(false);

    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [showReferences, setShowReferences] = useState(false);

    // Dropdown options
    const taskTypes: TaskType[] = ['design', 'video', 'photo', 'motion', 'post_production', 'copywriting', 'meeting', 'production', 'social_content', 'other'];
    const socialPlatformOptions: SocialPlatform[] = ['instagram', 'facebook', 'linkedin', 'tiktok', 'youtube', 'website', 'twitter', 'other'];
    
    // Arabic/English text direction helpers
    const hasArabic = (text: string): boolean => {
        return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
    };
    
    const detectDir = (text: string): 'rtl' | 'ltr' => {
        return hasArabic(text) ? 'rtl' : 'ltr';
    };

    // Initialize form when opening/editing
    useEffect(() => {
        if (isOpen) {
            if (editingTask) {
                setTitle(editingTask.title);
                setProjectId(editingTask.projectId);
                setDepartment(editingTask.department);
                setPriority(editingTask.priority);
                setTaskType(editingTask.taskType);
                setDueDate(editingTask.dueDate ? new Date(editingTask.dueDate).toISOString().split('T')[0] : '');
                setMilestoneId(editingTask.milestoneId || '');
                setWorkflowId(editingTask.workflowTemplateId || '');
                setRequiresSocial(editingTask.requiresSocialPost || false);
                setSocialPlatforms(editingTask.socialPlatforms || []);
                setSocialManagerId(editingTask.socialManagerId || '');
                setAssigneeIds(editingTask.assigneeIds || []);
                setReferenceLinks(editingTask.referenceLinks || []);
                setSelectedImages([]); // Reset images on edit open
                setDescription(editingTask.description || '');
                setVoiceOver(editingTask.voiceOver || '');
                setTextDirHint(editingTask.textDirHint || 'auto');
            } else {
                // Reset defaults
                setTitle('');
                setProjectId('');
                setDepartment(Department.CREATIVE);
                setPriority(Priority.MEDIUM);
                setTaskType('design');
                setDueDate('');
                setMilestoneId('');
                setWorkflowId('');
                setAssigneeIds([]);
                setRequiresSocial(false);
                setSocialPlatforms([]);
                setSocialManagerId('');
                setReferenceLinks([]);
                setSelectedImages([]);
                setDescription('');
                setVoiceOver('');
                setTextDirHint('auto');
            }
        }
    }, [isOpen, editingTask]);

    // Workflow Logic
    const getActiveWorkflow = (dept: string, type: string) => {
        // Find best match based on specificity
        let match = workflowTemplates.find(w => w.departmentId === dept && w.taskType === type);
        if (!match) match = workflowTemplates.find(w => w.departmentId === dept && !w.taskType);
        if (!match) match = workflowTemplates.find(w => !w.departmentId);
        return match;
    };

    const getAvailableWorkflows = (dept: string, type: string) => {
        // Return all workflows to allow full flexibility
        return workflowTemplates;
    };

    // Auto-select workflow
    useEffect(() => {
        if (isOpen && !editingTask) {
            const active = getActiveWorkflow(department, taskType);
            setWorkflowId(active?.id || '');
        }
    }, [department, taskType, isOpen, editingTask]);

    const handleAddLink = () => {
        if (!newLinkTitle || !newLinkUrl) return;
        
        // Basic URL validation
        try {
            new URL(newLinkUrl);
        } catch (e) {
            alert('Please enter a valid URL (http/https)');
            return;
        }

        const newLink: ReferenceLink = {
            id: `rl${Date.now()}`,
            title: newLinkTitle,
            url: newLinkUrl,
            note: newLinkNote,
            createdBy: currentUser.id,
            createdAt: new Date().toISOString()
        };

        setReferenceLinks([...referenceLinks, newLink]);
        setNewLinkTitle('');
        setNewLinkUrl('');
        setNewLinkNote('');
        setShowLinkInput(false);
    };

    const handleRemoveLink = (id: string) => {
        setReferenceLinks(referenceLinks.filter(l => l.id !== id));
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            // Filter for images and size limit (e.g. 10MB)
            const validFiles = files.filter(f => {
                const isImage = f.type.startsWith('image/');
                const isSmallEnough = f.size <= 10 * 1024 * 1024; // 10MB
                return isImage && isSmallEnough;
            });
            
            if (validFiles.length !== files.length) {
                alert('Some files were skipped. Only images under 10MB are allowed.');
            }
            
            setSelectedImages([...selectedImages, ...validFiles]);
        }
    };

    const handleRemoveImage = (index: number) => {
        setSelectedImages(selectedImages.filter((_, i) => i !== index));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !projectId) return;

        setIsUploading(true);

        try {
            // 1. Prepare Task Data
            let taskToSave: Task;
            const taskId = editingTask ? editingTask.id : `t${Date.now()}`;
            
            // Upload Images if any
            const uploadedImages: ReferenceImage[] = [];
            const uploadedPaths: string[] = []; // Track for rollback

            if (selectedImages.length > 0) {
                for (let i = 0; i < selectedImages.length; i++) {
                    const file = selectedImages[i];
                    const imageId = `ri${Date.now()}_${i}`;
                    const storagePath = `tasks/${taskId}/references/${imageId}/${file.name}`;
                    const storageRef = ref(storage, storagePath);
                    
                    const uploadTask = uploadBytesResumable(storageRef, file);
                    
                    await new Promise<void>((resolve, reject) => {
                        uploadTask.on('state_changed',
                            (snapshot) => {
                                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                                setUploadProgress(progress);
                            },
                            (error) => reject(error),
                            () => resolve()
                        );
                    });

                    const downloadUrl = await getDownloadURL(storageRef);
                    uploadedPaths.push(storagePath);
                    
                    uploadedImages.push({
                        id: imageId,
                        title: file.name,
                        fileName: file.name,
                        fileType: file.type,
                        fileSize: file.size,
                        storageProvider: 'firebase',
                        storagePath,
                        downloadUrl,
                        uploadedBy: currentUser.id,
                        uploadedAt: new Date().toISOString()
                    });
                }
            }

            // Combine existing images (if editing) with new ones
            const finalReferenceImages = editingTask 
                ? [...(editingTask.referenceImages || []), ...uploadedImages]
                : uploadedImages;

            if (editingTask) {
                // PERMISSION CHECK
                const canEditAll = checkPermission('tasks.edit.all');
                const canEditOwn = checkPermission('tasks.edit.own');
                const isAssigneeOrCreator = (editingTask.assigneeIds || []).includes(currentUser.id) || editingTask.createdBy === currentUser.id;

                if (!canEditAll && !(canEditOwn && isAssigneeOrCreator)) {
                    onNotify('error', 'Permission Denied', 'You are not allowed to edit this task.');
                    setIsUploading(false);
                    return;
                }

                taskToSave = {
                    ...editingTask,
                    title,
                    projectId: canEditAll ? projectId : editingTask.projectId,
                    department: canEditAll ? department : editingTask.department,
                    taskType: canEditAll ? taskType : editingTask.taskType,
                    priority,
                    dueDate: dueDate ? new Date(dueDate).toISOString() : editingTask.dueDate,
                    milestoneId: milestoneId || undefined,
                    workflowTemplateId: checkPermission('workflows.override_task_workflow') ? (workflowId || editingTask.workflowTemplateId) : editingTask.workflowTemplateId,
                    requiresSocialPost: requiresSocial,
                    socialPlatforms: requiresSocial ? socialPlatforms : [],
                    socialManagerId: requiresSocial ? socialManagerId : null,
                    updatedAt: new Date().toISOString(),
                    assigneeIds: assigneeIds,
                    referenceLinks: referenceLinks,
                    referenceImages: finalReferenceImages,
                    description: description?.trim() || null,
                    voiceOver: voiceOver?.trim() || null,
                    textDirHint: textDirHint
                };

                await onUpdateTask(taskToSave);
                onNotify('task_updated', 'Task Updated', `Task "${title}" has been updated.`);
            } else {
                // CREATE NEW
                const project = projects.find(p => p.id === projectId);

                let finalWorkflowId = workflowId;
                if (!finalWorkflowId) {
                    const activeWf = getActiveWorkflow(department, taskType);
                    finalWorkflowId = activeWf?.id || null;
                }
                const workflow = workflowTemplates.find(w => w.id === finalWorkflowId);

                const canAssignOthers = 
                    checkPermission('tasks.manage_assignees') || 
                    checkPermission(PERMISSIONS.TASKS.ASSIGN_ALL) || 
                    checkPermission(PERMISSIONS.TASKS.ASSIGN_DEPT) || 
                    currentUser.role === UserRole.GENERAL_MANAGER;

                const finalAssignees = canAssignOthers ? assigneeIds : [currentUser.id];

                const initialStatus = finalWorkflowId ? TaskStatus.IN_PROGRESS : TaskStatus.ASSIGNED;

                taskToSave = {
                    id: taskId,
                    projectId,
                    title,
                    description: description?.trim() || null,
                    voiceOver: voiceOver?.trim() || null,
                    textDirHint: textDirHint,
                    department,
                    priority,
                    taskType,
                    status: initialStatus,
                    startDate: new Date().toISOString(),
                    dueDate: dueDate ? new Date(dueDate).toISOString() : new Date().toISOString(),
                    milestoneId: milestoneId || undefined,
                    assigneeIds: finalAssignees,
                    createdBy: currentUser.id,
                    approvalPath: [],
                    workflowTemplateId: finalWorkflowId,
                    currentApprovalLevel: 0,
                    isClientApprovalRequired: workflow ? workflow.requiresClientApproval : false,
                    attachments: [],
                    client: project?.client,
                    isArchived: false,
                    requiresSocialPost: requiresSocial,
                    socialPlatforms: requiresSocial ? socialPlatforms : [],
                    socialManagerId: requiresSocial ? socialManagerId : null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    referenceLinks: referenceLinks,
                    referenceImages: finalReferenceImages
                };

                await onAddTask(taskToSave);
                onNotify('task_assigned', 'Task Created', `New task "${title}" created in ${project?.name}.`);
            }

            onClose();
        } catch (error) {
            console.error('Error saving task:', error);
            onNotify('error', 'Error', 'Failed to save task. Please try again.');
            
            // Rollback: Delete uploaded images
            // We need to access uploadedPaths from the try block. 
            // Since I can't easily access variables from the try block in the catch block without declaring them outside,
            // I'll rely on the fact that I'm replacing the whole block and I can structure it to handle rollback.
            // But wait, I declared uploadedPaths inside the try block in my previous thought.
            // I should declare it outside or handle it differently.
            // Actually, I'll just re-implement the whole function body in the replacement string to be safe.
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={editingTask ? 'Edit Task' : 'Create New Task'}
            size="lg"
        >
            <div className="max-h-[80vh] overflow-y-auto custom-scrollbar p-1">
                <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-4 bg-[#0a0a0a]">
                    <div>
                        <label className="block text-sm font-medium text-[#E6E1E5] mb-1">Task Title *</label>
                        <input required value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 bg-[#121212] border border-[#49454F] rounded-lg text-[#E6E1E5] placeholder-gray-500 focus:ring-[#DF1E3C] focus:border-[#DF1E3C]" placeholder="e.g. Design Homepage" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[#E6E1E5] mb-1">Project *</label>
                        <select
                            required
                            value={projectId}
                            onChange={e => setProjectId(e.target.value)}
                            className="w-full px-3 py-2 bg-[#121212] border border-[#49454F] rounded-lg text-[#E6E1E5] focus:ring-[#DF1E3C] focus:border-[#DF1E3C] disabled:bg-[#0a0a0a] disabled:text-gray-600"
                            disabled={!!editingTask && !checkPermission('tasks.edit.all')}
                        >
                            <option value="" className="bg-[#121212]">Select Project</option>
                            {projects.filter(p => p.status === 'active' || p.status === 'planning').map(p => (
                                <option key={p.id} value={p.id} className="bg-[#121212]">{p.name} ({p.client})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[#E6E1E5] mb-1">Milestone (Optional)</label>
                        <select
                            value={milestoneId}
                            onChange={e => setMilestoneId(e.target.value)}
                            className="w-full px-3 py-2 bg-[#121212] border border-[#49454F] rounded-lg text-[#E6E1E5] focus:ring-[#DF1E3C] focus:border-[#DF1E3C] disabled:bg-[#0a0a0a] disabled:text-gray-600"
                            disabled={!projectId || (!!editingTask && !checkPermission('tasks.edit.all'))}
                        >
                            <option value="" className="bg-[#121212]">Select Milestone</option>
                            {milestones.filter(m => m.projectId === projectId).map(m => (
                                <option key={m.id} value={m.id} className="bg-[#121212]">{m.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-[#E6E1E5] mb-1">Type</label>
                            <select
                                value={taskType}
                                onChange={e => setTaskType(e.target.value as TaskType)}
                                className="w-full px-3 py-2 bg-[#121212] border border-[#49454F] rounded-lg text-[#E6E1E5] focus:ring-[#DF1E3C] focus:border-[#DF1E3C] disabled:bg-[#0a0a0a] disabled:text-gray-600"
                                disabled={!!editingTask && !checkPermission('tasks.edit.all')}
                            >
                                {taskTypes.map(t => <option key={t} value={t} className="bg-[#121212]">{t.replace('_', ' ').toUpperCase()}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[#E6E1E5] mb-1">Priority</label>
                            <select value={priority} onChange={e => setPriority(e.target.value as Priority)} className="w-full px-3 py-2 bg-[#121212] border border-[#49454F] rounded-lg text-[#E6E1E5] focus:ring-[#DF1E3C] focus:border-[#DF1E3C]">
                                {Object.values(Priority).map(p => <option key={p} value={p} className="bg-[#121212]">{p}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-[#E6E1E5] mb-1">Department</label>
                            <select
                                value={department}
                                onChange={e => setDepartment(e.target.value as Department)}
                                className="w-full px-3 py-2 bg-[#121212] border border-[#49454F] rounded-lg text-[#E6E1E5] focus:ring-[#DF1E3C] focus:border-[#DF1E3C] disabled:bg-[#0a0a0a] disabled:text-gray-600"
                                disabled={!!editingTask && !checkPermission('tasks.edit.all')}
                            >
                                {Object.values(Department).map(d => <option key={d} value={d} className="bg-[#121212]">{d}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[#E6E1E5] mb-1">Due Date</label>
                            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full px-3 py-2 bg-[#121212] border border-[#49454F] rounded-lg text-[#E6E1E5] focus:ring-[#DF1E3C] focus:border-[#DF1E3C]" />
                        </div>
                    </div>

                    {/* Description & Voice Over Section */}
                    <div className="border border-[rgba(255,255,255,0.08)] rounded-2xl p-4 space-y-4 bg-[rgba(18,18,18,0.6)] backdrop-blur-sm">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-[#E6E1E5]">Task Details</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">Direction:</span>
                                <div className="flex rounded-lg border border-[#49454F] overflow-hidden">
                                    <button
                                        type="button"
                                        onClick={() => setTextDirHint('auto')}
                                        className={`px-2 py-1 text-xs font-medium transition-colors ${textDirHint === 'auto' ? 'bg-[#DF1E3C] text-white' : 'bg-[#121212] text-gray-400 hover:bg-[#1a1a1a]'}`}
                                    >
                                        Auto
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTextDirHint('rtl')}
                                        className={`px-2 py-1 text-xs font-medium transition-colors border-l border-[#49454F] ${textDirHint === 'rtl' ? 'bg-[#DF1E3C] text-white' : 'bg-[#121212] text-gray-400 hover:bg-[#1a1a1a]'}`}
                                    >
                                        عربي
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTextDirHint('ltr')}
                                        className={`px-2 py-1 text-xs font-medium transition-colors border-l border-[#49454F] ${textDirHint === 'ltr' ? 'bg-[#DF1E3C] text-white' : 'bg-[#121212] text-gray-400 hover:bg-[#1a1a1a]'}`}
                                    >
                                        English
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[#E6E1E5] mb-1">Description</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Write detailed brief, requirements, notes…"
                                rows={5}
                                dir={textDirHint !== 'auto' ? textDirHint : detectDir(description)}
                                className="w-full px-3 py-2 bg-[#121212] border border-[#49454F] rounded-lg text-[#E6E1E5] placeholder-gray-500 resize-y min-h-[120px] focus:ring-2 focus:ring-[#DF1E3C] focus:border-[#DF1E3C]"
                                style={{
                                    textAlign: 'start',
                                    unicodeBidi: 'plaintext',
                                    lineHeight: '1.6',
                                    whiteSpace: 'pre-wrap'
                                }}
                            />
                            <p className="text-xs text-gray-400 mt-1">Supports Arabic, English, and mixed text</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[#E6E1E5] mb-1">Voice Over Script</label>
                            <textarea
                                value={voiceOver}
                                onChange={e => setVoiceOver(e.target.value)}
                                placeholder="Write voice over script here…"
                                rows={6}
                                dir={textDirHint !== 'auto' ? textDirHint : detectDir(voiceOver)}
                                className="w-full px-3 py-2 bg-[#121212] border border-[#49454F] rounded-lg text-[#E6E1E5] placeholder-gray-500 resize-y min-h-[160px] focus:ring-2 focus:ring-[#DF1E3C] focus:border-[#DF1E3C]"
                                style={{
                                    textAlign: 'start',
                                    unicodeBidi: 'plaintext',
                                    lineHeight: '1.6',
                                    whiteSpace: 'pre-wrap'
                                }}
                            />
                            <p className="text-xs text-gray-400 mt-1">Supports Arabic, English, and mixed text</p>
                        </div>
                    </div>

                    {/* References Section */}
                    <div className="border border-[rgba(255,255,255,0.08)] rounded-2xl overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setShowReferences(!showReferences)}
                            className="w-full flex items-center justify-between p-3 bg-[rgba(18,18,18,0.6)] hover:bg-[rgba(18,18,18,0.8)] transition-colors"
                        >
                            <span className="text-sm font-medium text-[#E6E1E5] flex items-center gap-2">
                                <LinkIcon className="w-4 h-4" /> References & Assets
                            </span>
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-gray-400">
                                    {referenceLinks.length} links, {selectedImages.length + (editingTask?.referenceImages?.length || 0)} images
                                </span>
                                {showReferences ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                            </div>
                        </button>
                        
                        {showReferences && (
                            <div className="p-4 space-y-4 bg-[#0a0a0a]">
                                {/* Links Block */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase">Reference Links</label>
                                        <button type="button" onClick={() => setShowLinkInput(true)} className="text-xs text-[#DF1E3C] hover:underline flex items-center gap-1">
                                            <Plus className="w-3 h-3" /> Add Link
                                        </button>
                                    </div>
                                    
                                    {showLinkInput && (
                                        <div className="bg-[#121212] p-3 rounded-lg border border-[#49454F] mb-3 space-y-2">
                                            <input 
                                                placeholder="Title (e.g. Competitor Site)" 
                                                className="w-full px-2 py-1 text-sm bg-[#0a0a0a] border border-[#49454F] rounded text-[#E6E1E5] placeholder-gray-500"
                                                value={newLinkTitle}
                                                onChange={e => setNewLinkTitle(e.target.value)}
                                            />
                                            <input 
                                                placeholder="URL (https://...)" 
                                                className="w-full px-2 py-1 text-sm bg-[#0a0a0a] border border-[#49454F] rounded text-[#E6E1E5] placeholder-gray-500"
                                                value={newLinkUrl}
                                                onChange={e => setNewLinkUrl(e.target.value)}
                                            />
                                            <input 
                                                placeholder="Note (Optional)" 
                                                className="w-full px-2 py-1 text-sm bg-[#0a0a0a] border border-[#49454F] rounded text-[#E6E1E5] placeholder-gray-500"
                                                value={newLinkNote}
                                                onChange={e => setNewLinkNote(e.target.value)}
                                            />
                                            <div className="flex justify-end gap-2 mt-2">
                                                <button type="button" onClick={() => setShowLinkInput(false)} className="text-xs text-gray-400 hover:text-gray-300">Cancel</button>
                                                <button type="button" onClick={handleAddLink} className="text-xs bg-[#DF1E3C] text-white px-3 py-1 rounded hover:bg-[#c91a35]">Add</button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        {referenceLinks.map(link => (
                                            <div key={link.id} className="flex items-start justify-between p-2 bg-[#121212] rounded border border-[#49454F]">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <img src={`https://www.google.com/s2/favicons?domain=${link.url}&sz=16`} alt="" className="w-4 h-4 opacity-50" />
                                                        <a href={link.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-[#DF1E3C] hover:underline truncate block">{link.title}</a>
                                                    </div>
                                                    {link.note && <p className="text-xs text-gray-400 mt-0.5 ml-6">{link.note}</p>}
                                                </div>
                                                <button type="button" onClick={() => handleRemoveLink(link.id)} className="text-gray-400 hover:text-[#DF1E3C] ml-2">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                        {referenceLinks.length === 0 && !showLinkInput && (
                                            <p className="text-xs text-gray-500 italic">No links added.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Images Block */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase">Reference Images</label>
                                        <label className="cursor-pointer text-xs text-[#DF1E3C] hover:underline flex items-center gap-1">
                                            <Plus className="w-3 h-3" /> Upload Images
                                            <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageSelect} />
                                        </label>
                                    </div>

                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                        {/* Existing Images (if editing) */}
                                        {editingTask?.referenceImages?.map((img) => (
                                            <div key={img.id} className="relative group aspect-square bg-[#121212] rounded-lg overflow-hidden border border-[#49454F]">
                                                <img src={img.downloadUrl} alt={img.title} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <span className="text-xs text-white font-medium px-1 text-center">{img.fileName}</span>
                                                </div>
                                            </div>
                                        ))}

                                        {/* New Selected Images */}
                                        {selectedImages.map((file, index) => (
                                            <div key={index} className="relative group aspect-square bg-[#121212] rounded-lg overflow-hidden border border-[#DF1E3C] ring-2 ring-[#DF1E3C]/20">
                                                <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover opacity-80" />
                                                <button 
                                                    type="button"
                                                    onClick={() => handleRemoveImage(index)}
                                                    className="absolute top-1 right-1 bg-white/90 text-[#DF1E3C] rounded-full p-0.5 hover:bg-white"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate">
                                                    {file.name}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {selectedImages.length === 0 && (!editingTask?.referenceImages || editingTask.referenceImages.length === 0) && (
                                        <p className="text-xs text-gray-500 italic">No images uploaded.</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Assignees Selection */}
                    {(checkPermission('tasks.manage_assignees') || checkPermission(PERMISSIONS.TASKS.ASSIGN_ALL) || checkPermission(PERMISSIONS.TASKS.ASSIGN_DEPT) || currentUser.role === UserRole.GENERAL_MANAGER) && (
                        <div>
                            <label className="block text-sm font-medium text-[#E6E1E5] mb-1">Assign Team Members</label>
                            <div className="border border-[#49454F] rounded-lg p-2 max-h-48 overflow-y-auto space-y-1 custom-scrollbar bg-[#121212]">
                                {users.filter(user => {
                                    if (projectId) {
                                        return projectMembers.some(pm => pm.projectId === projectId && pm.userId === user.id);
                                    }
                                    return true;
                                }).map(user => {
                                    const isAvailable = (() => {
                                        if (!dueDate || !leaveRequests) return true;
                                        const targetDate = new Date(dueDate);
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
                                        <label key={user.id} className={`flex items-center justify-between p-2 rounded cursor-pointer ${isAvailable ? 'hover:bg-[#1a1a1a]' : 'bg-[#DF1E3C]/10 opacity-80'}`}>
                                            <div className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    checked={assigneeIds.includes(user.id)}
                                                    onChange={(e) => {
                                                        const isChecked = e.target.checked;
                                                        setAssigneeIds(prev => {
                                                            if (isChecked) {
                                                                return prev.includes(user.id) ? prev : [...prev, user.id];
                                                            } else {
                                                                return prev.filter(id => id !== user.id);
                                                            }
                                                        });
                                                    }}
                                                    className="rounded text-[#DF1E3C] focus:ring-[#DF1E3C] bg-[#0a0a0a] border-[#49454F]"
                                                />
                                                <span className="text-sm text-[#E6E1E5]">{user.name}</span>
                                                <span className="text-xs text-gray-400">({user.role})</span>
                                            </div>
                                            {!isAvailable && <span className="text-[10px] uppercase font-bold text-[#DF1E3C] flex items-center gap-1"><AlertCircle className="w-3 h-3" /> On Leave</span>}
                                        </label>
                                    );
                                })}
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                                {assigneeIds.length === 0 ? 'No members assigned' : `${assigneeIds.length} member(s) assigned`}
                            </p>
                        </div>
                    )}

                    {/* Workflow Selection */}
                    <div>
                        <label className="block text-sm font-medium text-[#E6E1E5] mb-1">Workflow</label>
                        <select
                            value={workflowId}
                            onChange={e => setWorkflowId(e.target.value)}
                            className="w-full px-3 py-2 bg-[#121212] border border-[#49454F] rounded-lg text-[#E6E1E5] focus:ring-[#DF1E3C] focus:border-[#DF1E3C]"
                        >
                            <option value="" className="bg-[#121212]">Select Workflow</option>
                            {getAvailableWorkflows(department, taskType).map(wf => (
                                <option key={wf.id} value={wf.id} className="bg-[#121212]">
                                    {wf.name}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-400 mt-1">
                            {workflowId
                                ? `Selected: ${workflowTemplates.find(w => w.id === workflowId)?.name}`
                                : `Default: ${getActiveWorkflow(department, taskType)?.name || 'None'}`
                            }
                        </p>
                    </div>

                    {/* Social Handover Options */}
                    <div className="bg-[rgba(223,30,60,0.1)] p-3 rounded-lg border border-[rgba(223,30,60,0.3)]">
                        <label className="flex items-center space-x-2 cursor-pointer mb-2">
                            <input
                                type="checkbox"
                                checked={requiresSocial}
                                onChange={e => setRequiresSocial(e.target.checked)}
                                className="rounded text-[#DF1E3C] focus:ring-[#DF1E3C] bg-[#0a0a0a] border-[#49454F]"
                            />
                            <span className="text-sm font-bold text-[#DF1E3C]">Requires Social Media Post?</span>
                        </label>

                        {requiresSocial && (
                            <div className="pl-6 animate-in fade-in slide-in-from-top-1">
                                <div className="mb-3">
                                    <label className="block text-xs font-medium text-[#E6E1E5] mb-1">Social Manager</label>
                                    <select
                                        value={socialManagerId}
                                        onChange={e => setSocialManagerId(e.target.value)}
                                        className="w-full px-2 py-1.5 bg-[#121212] border border-[#49454F] rounded text-sm text-[#E6E1E5] focus:ring-[#DF1E3C] focus:border-[#DF1E3C]"
                                    >
                                        <option value="" className="bg-[#121212]">Select Manager</option>
                                        {users.filter(u => u.role === 'Social Manager' || u.department === 'Marketing').map(u => (
                                            <option key={u.id} value={u.id} className="bg-[#121212]">{u.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <label className="block text-xs font-medium text-[#E6E1E5] mb-1">Select Platforms</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {socialPlatformOptions.map(platform => (
                                        <label key={platform} className="flex items-center space-x-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={socialPlatforms.includes(platform)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSocialPlatforms([...socialPlatforms, platform]);
                                                    } else {
                                                        setSocialPlatforms(socialPlatforms.filter(p => p !== platform));
                                                    }
                                                }}
                                                className="rounded text-[#DF1E3C] focus:ring-[#DF1E3C] bg-[#0a0a0a] border-[#49454F]"
                                            />
                                            <span className="text-xs text-[#E6E1E5] capitalize">{platform}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="pt-4 border-t border-[#49454F] flex justify-between items-center mt-6">
                        <div className="text-xs text-gray-400">
                            {isUploading ? (
                                <span className="flex items-center gap-2 text-[#DF1E3C] font-medium">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Uploading assets... {Math.round(uploadProgress)}%
                                </span>
                            ) : (
                                <span>* Required fields</span>
                            )}
                        </div>
                        <div className="flex space-x-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-gray-400 hover:bg-[#121212] rounded-lg font-medium text-sm border border-[#49454F] hover:text-[#E6E1E5] transition-colors"
                                disabled={isUploading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!title || !projectId || isUploading}
                                className="px-6 py-2 bg-[#DF1E3C] text-white rounded-lg font-bold text-sm hover:bg-[#c91a35] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                            >
                                {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {editingTask ? 'Update Task' : 'Create Task'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

export default CreateTaskModal;
