import React, { useState, useMemo } from 'react';
import { Task, WorkflowTemplate, CalendarContentType } from '../types';
import { Video, Image as ImageIcon, Zap, Calendar, Clock, AlertCircle } from 'lucide-react';
import Modal from './common/Modal';

interface TaskPlanningModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  workflowTemplates: WorkflowTemplate[];
  onSave: (tasksWithDueDates: Task[]) => Promise<void>;
}

const TaskPlanningModal: React.FC<TaskPlanningModalProps> = ({
  isOpen,
  onClose,
  tasks,
  workflowTemplates,
  onSave
}) => {
  const [taskDueDates, setTaskDueDates] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [filterType, setFilterType] = useState<CalendarContentType | 'ALL'>('ALL');

  const inputClass = 'w-full h-10 px-3 py-2 rounded-lg bg-[color:var(--dash-surface-elevated)] border border-[color:var(--dash-glass-border)] text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[color:var(--dash-primary)]';

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4 text-blue-400" />;
      case 'photo': return <ImageIcon className="w-4 h-4 text-purple-400" />;
      case 'motion': return <Zap className="w-4 h-4 text-yellow-400" />;
      default: return null;
    }
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'video': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'photo': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'motion': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const filteredTasks = useMemo(() => {
    if (filterType === 'ALL') return tasks;
    return tasks.filter(t => t.taskType === filterType.toLowerCase());
  }, [tasks, filterType]);

  const getWorkflowName = (workflowId: string | null | undefined) => {
    if (!workflowId) return 'No workflow';
    const workflow = workflowTemplates.find(wf => wf.id === workflowId);
    return workflow?.name || 'Unknown';
  };

  const handleBulkSetDueDate = (days: number) => {
    const newDueDates: Record<string, string> = { ...taskDueDates };
    
    filteredTasks.forEach(task => {
      if (task.publishAt) {
        const publishDate = new Date(task.publishAt);
        publishDate.setDate(publishDate.getDate() - days);
        newDueDates[task.id] = publishDate.toISOString().split('T')[0];
      }
    });
    
    setTaskDueDates(newDueDates);
  };

  const handleSave = async () => {
    // Check if all tasks have delivery due dates
    const missingDueDates = filteredTasks.filter(t => !taskDueDates[t.id]);
    
    if (missingDueDates.length > 0) {
      alert(`Please set delivery due dates for all ${filteredTasks.length} tasks before saving.`);
      return;
    }

    setIsSaving(true);
    try {
      // Update tasks with delivery due dates
      // IMPORTANT: Update BOTH deliveryDueAt (for workflow) AND dueDate (for calendar display)
      const updatedTasks = tasks.map(task => ({
        ...task,
        deliveryDueAt: taskDueDates[task.id] || null,
        dueDate: taskDueDates[task.id] || task.dueDate // Update dueDate so calendar displays correctly
      }));

      console.log('💾 Saving tasks with updated due dates:');
      updatedTasks.forEach(t => {
        console.log(`  "${t.title}": deliveryDueAt=${t.deliveryDueAt}, dueDate=${t.dueDate}`);
      });

      await onSave(updatedTasks);
      onClose();
    } catch (error) {
      console.error('Error saving task due dates:', error);
      alert('Failed to save delivery dates. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const videoCount = tasks.filter(t => t.taskType === 'video').length;
  const photoCount = tasks.filter(t => t.taskType === 'photo').length;
  const motionCount = tasks.filter(t => t.taskType === 'motion').length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Plan Delivery Deadlines"
      size="xl"
    >
      <div className="p-6 bg-[color:var(--dash-surface)] text-slate-100 space-y-4">
        {/* Header Info */}
        <div className="flex items-center justify-between pb-4 border-b border-[color:var(--dash-glass-border)]">
          <div>
            <h3 className="text-lg font-semibold text-slate-100">Set Delivery Due Dates</h3>
            <p className="text-sm text-slate-400 mt-1">
              {tasks.length} tasks generated. Set delivery deadlines for each task.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {videoCount > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Video className="w-3 h-3" />
                <span>{videoCount}</span>
              </div>
            )}
            {photoCount > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <ImageIcon className="w-3 h-3" />
                <span>{photoCount}</span>
              </div>
            )}
            {motionCount > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                <Zap className="w-3 h-3" />
                <span>{motionCount}</span>
              </div>
            )}
          </div>
        </div>

        {/* Bulk Actions */}
        <div className="bg-[color:var(--dash-surface-elevated)] border border-[color:var(--dash-glass-border)] rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-semibold text-slate-200">Bulk Actions</h4>
          
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400">Set all delivery dates to:</span>
            <button
              onClick={() => handleBulkSetDueDate(2)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[color:var(--dash-primary)]/10 text-[color:var(--dash-primary)] hover:bg-[color:var(--dash-primary)]/20 border border-[color:var(--dash-primary)]/20 transition-colors"
            >
              Publish - 2 days
            </button>
            <button
              onClick={() => handleBulkSetDueDate(3)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[color:var(--dash-primary)]/10 text-[color:var(--dash-primary)] hover:bg-[color:var(--dash-primary)]/20 border border-[color:var(--dash-primary)]/20 transition-colors"
            >
              Publish - 3 days
            </button>
            <button
              onClick={() => handleBulkSetDueDate(5)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[color:var(--dash-primary)]/10 text-[color:var(--dash-primary)] hover:bg-[color:var(--dash-primary)]/20 border border-[color:var(--dash-primary)]/20 transition-colors"
            >
              Publish - 5 days
            </button>
            <button
              onClick={() => handleBulkSetDueDate(7)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[color:var(--dash-primary)]/10 text-[color:var(--dash-primary)] hover:bg-[color:var(--dash-primary)]/20 border border-[color:var(--dash-primary)]/20 transition-colors"
            >
              Publish - 1 week
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400">Filter by type:</span>
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                filterType === 'ALL' 
                  ? 'bg-slate-500/20 text-slate-200 border-slate-500/40' 
                  : 'bg-transparent text-slate-400 border-slate-500/20 hover:bg-slate-500/10'
              }`}
            >
              All ({tasks.length})
            </button>
            {videoCount > 0 && (
              <button
                onClick={() => setFilterType('VIDEO')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  filterType === 'VIDEO' 
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' 
                    : 'bg-transparent text-slate-400 border-slate-500/20 hover:bg-blue-500/10'
                }`}
              >
                Video ({videoCount})
              </button>
            )}
            {photoCount > 0 && (
              <button
                onClick={() => setFilterType('PHOTO')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  filterType === 'PHOTO' 
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' 
                    : 'bg-transparent text-slate-400 border-slate-500/20 hover:bg-purple-500/10'
                }`}
              >
                Photo ({photoCount})
              </button>
            )}
            {motionCount > 0 && (
              <button
                onClick={() => setFilterType('MOTION')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  filterType === 'MOTION' 
                    ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' 
                    : 'bg-transparent text-slate-400 border-slate-500/20 hover:bg-yellow-500/10'
                }`}
              >
                Motion ({motionCount})
              </button>
            )}
          </div>
        </div>

        {/* Tasks List - Desktop: Table, Mobile: Cards */}
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[color:var(--dash-surface)] border-b border-[color:var(--dash-glass-border)]">
                <tr className="text-left text-slate-400 text-xs">
                  <th className="pb-2 font-medium">Task</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Publish Date</th>
                  <th className="pb-2 font-medium">Delivery Due</th>
                  <th className="pb-2 font-medium">Workflow</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task, idx) => (
                  <tr key={task.id} className="border-b border-[color:var(--dash-glass-border)] hover:bg-[color:var(--dash-surface-elevated)]/50">
                    <td className="py-3 pr-4">
                      <div className="font-medium text-slate-200 text-sm">{task.title}</div>
                      {task.description && (
                        <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{task.description}</div>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${getTypeBadgeClass(task.taskType)}`}>
                        {getTypeIcon(task.taskType)}
                        <span className="capitalize">{task.taskType}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-1.5 text-xs text-slate-300">
                        <Calendar className="w-3.5 h-3.5" />
                        {task.publishAt ? new Date(task.publishAt).toLocaleDateString() : 'N/A'}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <input
                        type="date"
                        value={taskDueDates[task.id] || ''}
                        onChange={e => setTaskDueDates({ ...taskDueDates, [task.id]: e.target.value })}
                        className={inputClass}
                        required
                      />
                    </td>
                    <td className="py-3">
                      <div className="text-xs text-slate-400">{getWorkflowName(task.workflowTemplateId)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {filteredTasks.map((task, idx) => (
              <div 
                key={task.id} 
                className="bg-[color:var(--dash-surface-elevated)] border border-[color:var(--dash-glass-border)] rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="font-medium text-slate-200 text-sm">{task.title}</div>
                    {task.description && (
                      <div className="text-xs text-slate-400 mt-1 line-clamp-2">{task.description}</div>
                    )}
                  </div>
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${getTypeBadgeClass(task.taskType)}`}>
                    {getTypeIcon(task.taskType)}
                    <span className="capitalize">{task.taskType}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Publish Date</label>
                    <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                      <Calendar className="w-3.5 h-3.5" />
                      {task.publishAt ? new Date(task.publishAt).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Workflow</label>
                    <div className="text-xs text-slate-300 font-medium">{getWorkflowName(task.workflowTemplateId)}</div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Delivery Due Date *
                  </label>
                  <input
                    type="date"
                    value={taskDueDates[task.id] || ''}
                    onChange={e => setTaskDueDates({ ...taskDueDates, [task.id]: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Warning if missing due dates */}
        {filteredTasks.some(t => !taskDueDates[t.id]) && (
          <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-yellow-300">
              <span className="font-semibold">Missing delivery dates:</span> Please set delivery due dates for all tasks before saving.
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-4 border-t border-[color:var(--dash-glass-border)]">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 px-4 py-2.5 rounded-lg border border-[color:var(--dash-glass-border)] text-slate-300 hover:bg-[color:var(--dash-surface-elevated)] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || filteredTasks.some(t => !taskDueDates[t.id])}
            className="flex-1 px-4 py-2.5 rounded-lg bg-[color:var(--dash-primary)] text-white font-medium hover:shadow-[0_12px_30px_-16px_rgba(230,60,60,0.8)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save & Create Tasks'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default TaskPlanningModal;
