import React, { useState } from 'react';
import { USERS } from '../constants';
import { TaskStatus, Task, Priority, Department } from '../types';
import { Plus, Filter, MoreHorizontal, Calendar, X, ChevronRight, Check, Trash2 } from 'lucide-react';

interface TaskBoardProps {
  tasks: Task[];
  onAddTask: (task: Task) => void;
  onUpdateTaskStatus: (id: string, status: TaskStatus) => void;
  onDeleteTask?: (id: string) => void;
}

const TaskBoard: React.FC<TaskBoardProps> = ({ tasks, onAddTask, onUpdateTaskStatus, onDeleteTask }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [client, setClient] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
  const [department, setDepartment] = useState<Department>(Department.CREATIVE);
  const [dueDate, setDueDate] = useState('');

  const columns = Object.values(TaskStatus);

  const getPriorityColor = (p: Priority) => {
    switch (p) {
      case Priority.HIGH: return 'bg-rose-100 text-rose-700';
      case Priority.MEDIUM: return 'bg-amber-100 text-amber-700';
      case Priority.LOW: return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getAssigneeAvatar = (userId: string) => {
    return USERS.find(u => u.id === userId)?.avatar || '';
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    const newTask: Task = {
      id: Date.now().toString(),
      title,
      client,
      description,
      priority,
      department,
      dueDate: dueDate || new Date().toISOString(),
      status: TaskStatus.NEW,
      assigneeIds: ['u2'], // Default assignee for demo
      
      // Default/Placeholder values for required fields missing in this simplified form
      projectId: 'p0', 
      startDate: new Date().toISOString(),
      createdBy: 'u1', 
      approvalPath: [],
      currentApprovalLevel: 0,
      isClientApprovalRequired: false,
      isArchived: false,
      attachments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      taskType: 'other'
    };
    onAddTask(newTask);
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setTitle('');
    setClient('');
    setDescription('');
    setDueDate('');
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  const advanceTask = () => {
    if (!selectedTask) return;
    const currentIndex = columns.indexOf(selectedTask.status);
    if (currentIndex < columns.length - 1) {
      const nextStatus = columns[currentIndex + 1];
      onUpdateTaskStatus(selectedTask.id, nextStatus);
      setSelectedTask({ ...selectedTask, status: nextStatus });
    }
  };

  const handleDelete = () => {
    if (selectedTask && onDeleteTask) {
        onDeleteTask(selectedTask.id);
        setSelectedTask(null);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-iris-white">Task Workflow</h1>
          <p className="text-iris-white/70 mt-1">Manage deliverables from brief to completion.</p>
        </div>
        <div className="flex space-x-3">
          <button className="flex items-center space-x-2 px-4 py-2 bg-iris-black/80 border border-iris-white/10 rounded-lg text-iris-white hover:bg-iris-black/95 text-sm font-medium transition-all">
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-br from-iris-red to-iris-red/80 text-iris-white rounded-lg hover:brightness-110 text-sm font-medium shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
        <div className="flex h-full space-x-4 sm:space-x-6 min-w-max">
          {columns.map((status) => (
            <div key={status} className="w-72 sm:w-80 flex flex-col h-full rounded-xl bg-iris-black/60 border border-iris-white/10">
              <div className="p-3 sm:p-4 flex justify-between items-center border-b border-iris-white/10 bg-iris-black/80 rounded-t-xl sticky top-0 z-10 backdrop-blur-sm">
                <div className="flex items-center space-x-2">
                   <h3 className="font-semibold text-iris-white text-xs sm:text-sm uppercase tracking-wide">{status.replace('_', ' ')}</h3>
                   <span className="bg-iris-black/95 text-iris-white/70 px-2 py-0.5 rounded-full text-xs font-bold border border-iris-white/10">
                     {tasks.filter(t => t.status === status).length}
                   </span>
                </div>
              </div>

              <div className="p-2 sm:p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                {tasks.filter(t => t.status === status).map((task) => (
                  <div 
                    key={task.id} 
                    onClick={() => handleTaskClick(task)}
                    className="bg-iris-black/80 backdrop-blur-sm p-3 sm:p-4 rounded-lg border border-iris-white/10 hover:border-iris-red/40 cursor-pointer transition-all group relative"
                  >
                    <div className="flex justify-between items-start mb-2 sm:mb-3">
                      <span className="text-[10px] font-bold text-iris-white/40 uppercase tracking-wider">{task.client}</span>
                    </div>
                    
                    <h4 className="text-sm font-semibold text-iris-white mb-2 leading-snug line-clamp-2">{task.title}</h4>
                    
                    <div className="flex items-center flex-wrap gap-2 mb-3 sm:mb-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      <span className="text-[10px] bg-iris-black/95 text-iris-white/70 px-2 py-0.5 rounded font-medium border border-iris-white/10">
                        {task.department}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-iris-white/10">
                       <div className="flex items-center text-iris-white/40 space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span className="text-xs">{new Date(task.dueDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
                       </div>
                       
                       <div className="flex -space-x-2">
                          {(task.assigneeIds || []).map(uid => (
                            <div key={uid} className="w-6 h-6 rounded-full bg-iris-red/20 border-2 border-iris-black/80 flex items-center justify-center text-[10px] font-bold text-iris-white" title={uid}>
                              {uid.substring(0, 2).toUpperCase()}
                            </div>
                          ))}
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* New Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-iris-black/95 backdrop-blur-sm rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 border border-iris-white/10">
            <div className="p-6 border-b border-iris-white/10 flex justify-between items-center">
              <h2 className="text-lg font-bold text-iris-white">Create New Task</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-iris-white/40 hover:text-iris-white"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-iris-white mb-1">Task Title</label>
                <input required value={title} onChange={e => setTitle(e.target.value)} type="text" className="w-full px-3 py-2 bg-iris-black/80 border border-iris-white/10 rounded-lg text-iris-white placeholder:text-iris-white/40 focus:ring-2 focus:ring-iris-red focus:border-iris-red/50 focus:outline-none" placeholder="e.g. Homepage Redesign" />
              </div>
              <div>
                <label className="block text-sm font-medium text-iris-white mb-1">Client</label>
                <input required value={client} onChange={e => setClient(e.target.value)} type="text" className="w-full px-3 py-2 bg-iris-black/80 border border-iris-white/10 rounded-lg text-iris-white placeholder:text-iris-white/40 focus:ring-2 focus:ring-iris-red focus:border-iris-red/50 focus:outline-none" placeholder="e.g. Le Bon" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-iris-white mb-1">Priority</label>
                   <select value={priority} onChange={e => setPriority(e.target.value as Priority)} className="w-full px-3 py-2 bg-iris-black/80 border border-iris-white/10 rounded-lg text-iris-white focus:ring-2 focus:ring-iris-red focus:border-iris-red/50 focus:outline-none">
                     {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                   </select>
                </div>
                <div>
                   <label className="block text-sm font-medium text-iris-white mb-1">Department</label>
                   <select value={department} onChange={e => setDepartment(e.target.value as Department)} className="w-full px-3 py-2 bg-iris-black/80 border border-iris-white/10 rounded-lg text-iris-white focus:ring-2 focus:ring-iris-red focus:border-iris-red/50 focus:outline-none">
                     {Object.values(Department).map(d => <option key={d} value={d}>{d}</option>)}
                   </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-iris-white mb-1">Due Date</label>
                <input required value={dueDate} onChange={e => setDueDate(e.target.value)} type="date" className="w-full px-3 py-2 bg-iris-black/80 border border-iris-white/10 rounded-lg text-iris-white focus:ring-2 focus:ring-iris-red focus:border-iris-red/50 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-iris-white mb-1">Description</label>
                <textarea required value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full px-3 py-2 bg-iris-black/80 border border-iris-white/10 rounded-lg text-iris-white placeholder:text-iris-white/40 focus:ring-2 focus:ring-iris-red focus:border-iris-red/50 focus:outline-none" placeholder="Brief details..." />
              </div>
              <div className="pt-2">
                <button type="submit" className="w-full bg-gradient-to-br from-iris-red to-iris-red/80 text-iris-white py-2.5 rounded-lg font-medium hover:brightness-110 transition-all">Create Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Detail / Status Move Modal */}
      {selectedTask && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-iris-black/95 backdrop-blur-sm rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 border border-iris-white/10">
               <div className="p-6 border-b border-iris-white/10 flex justify-between items-start">
                 <div>
                    <h2 className="text-xl font-bold text-iris-white">{selectedTask.title}</h2>
                    <p className="text-iris-white/70 text-sm mt-1">{selectedTask.client}</p>
                 </div>
                 <button onClick={() => setSelectedTask(null)} className="text-iris-white/40 hover:text-iris-white"><X className="w-6 h-6"/></button>
               </div>
               
               <div className="p-6 space-y-4">
                  <div className="flex items-center flex-wrap gap-3 text-sm">
                     <span className={`px-2 py-1 rounded font-medium ${getPriorityColor(selectedTask.priority)}`}>{selectedTask.priority} Priority</span>
                     <span className="bg-iris-black/80 border border-iris-white/10 px-2 py-1 rounded text-iris-white/70">{selectedTask.department}</span>
                     <span className="text-iris-white/70">Due: {new Date(selectedTask.dueDate).toLocaleDateString()}</span>
                  </div>
                  <div className="bg-iris-black/80 p-4 rounded-lg border border-iris-white/10">
                    <p className="text-iris-white/70 leading-relaxed">{selectedTask.description}</p>
                  </div>
                  
                  <div className="border-t border-iris-white/10 pt-4">
                     <label className="block text-xs font-bold text-iris-white/40 uppercase tracking-wider mb-2">Actions & Status</label>
                     <div className="flex items-center justify-between bg-iris-black/80 border border-iris-white/10 p-3 rounded-lg">
                        <div className="flex items-center space-x-3">
                           <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-iris-red animate-pulse"></div>
                            <span className="font-semibold text-iris-white">{selectedTask.status.replace('_', ' ')}</span>
                           </div>
                           
                           {onDeleteTask && (
                             <button onClick={handleDelete} className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded transition-colors" title="Delete Task">
                                <Trash2 className="w-4 h-4" />
                             </button>
                           )}
                        </div>
                        
                        {selectedTask.status !== TaskStatus.COMPLETED ? (
                            <button 
                              onClick={advanceTask}
                              className="flex items-center space-x-2 bg-gradient-to-br from-iris-red to-iris-red/80 text-iris-white px-4 py-2 rounded-lg text-sm font-medium hover:brightness-110 transition-all"
                            >
                                <span>Advance Status</span>
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        ) : (
                             <span className="flex items-center space-x-2 text-emerald-400 font-medium">
                                <Check className="w-4 h-4" />
                                <span>Completed</span>
                             </span>
                        )}
                     </div>
                  </div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default TaskBoard;