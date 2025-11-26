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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Task Workflow</h1>
          <p className="text-slate-500 mt-1">Manage deliverables from brief to completion.</p>
        </div>
        <div className="flex space-x-3">
          <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-sm font-medium">
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
        <div className="flex h-full space-x-6 min-w-max">
          {columns.map((status) => (
            <div key={status} className="w-80 flex flex-col h-full rounded-xl bg-slate-100 border border-slate-200/60">
              <div className="p-4 flex justify-between items-center border-b border-slate-200/60 bg-slate-100/50 rounded-t-xl sticky top-0 z-10 backdrop-blur-sm">
                <div className="flex items-center space-x-2">
                   <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">{status.replace('_', ' ')}</h3>
                   <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">
                     {tasks.filter(t => t.status === status).length}
                   </span>
                </div>
              </div>

              <div className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                {tasks.filter(t => t.status === status).map((task) => (
                  <div 
                    key={task.id} 
                    onClick={() => handleTaskClick(task)}
                    className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md cursor-pointer transition-all group relative hover:border-indigo-300"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{task.client}</span>
                    </div>
                    
                    <h4 className="text-sm font-semibold text-slate-800 mb-2 leading-snug">{task.title}</h4>
                    
                    <div className="flex items-center space-x-2 mb-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium border border-slate-200">
                        {task.department}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                       <div className="flex items-center text-slate-400 space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span className="text-xs">{new Date(task.dueDate).toLocaleDateString(undefined, {month: 'numeric', day: 'numeric'})}</span>
                       </div>
                       
                       <div className="flex -space-x-2">
                          {task.assigneeIds.map(uid => (
                            <div key={uid} className="w-6 h-6 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-indigo-600" title={uid}>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900">Create New Task</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Task Title</label>
                <input required value={title} onChange={e => setTitle(e.target.value)} type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="e.g. Homepage Redesign" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Client</label>
                <input required value={client} onChange={e => setClient(e.target.value)} type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="e.g. Le Bon" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                   <select value={priority} onChange={e => setPriority(e.target.value as Priority)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                     {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                   </select>
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                   <select value={department} onChange={e => setDepartment(e.target.value as Department)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                     {Object.values(Department).map(d => <option key={d} value={d}>{d}</option>)}
                   </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                <input required value={dueDate} onChange={e => setDueDate(e.target.value)} type="date" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea required value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="Brief details..." />
              </div>
              <div className="pt-2">
                <button type="submit" className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors">Create Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Detail / Status Move Modal */}
      {selectedTask && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
               <div className="p-6 border-b border-slate-100 flex justify-between items-start">
                 <div>
                    <h2 className="text-xl font-bold text-slate-900">{selectedTask.title}</h2>
                    <p className="text-slate-500 text-sm mt-1">{selectedTask.client}</p>
                 </div>
                 <button onClick={() => setSelectedTask(null)} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6"/></button>
               </div>
               
               <div className="p-6 space-y-4">
                  <div className="flex items-center space-x-4 text-sm">
                     <span className={`px-2 py-1 rounded font-medium ${getPriorityColor(selectedTask.priority)}`}>{selectedTask.priority} Priority</span>
                     <span className="bg-slate-100 px-2 py-1 rounded text-slate-600">{selectedTask.department}</span>
                     <span className="text-slate-500">Due: {new Date(selectedTask.dueDate).toLocaleDateString()}</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <p className="text-slate-700 leading-relaxed">{selectedTask.description}</p>
                  </div>
                  
                  <div className="border-t border-slate-100 pt-4">
                     <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Actions & Status</label>
                     <div className="flex items-center justify-between bg-white border border-slate-200 p-3 rounded-lg">
                        <div className="flex items-center space-x-3">
                           <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse"></div>
                            <span className="font-semibold text-indigo-900">{selectedTask.status.replace('_', ' ')}</span>
                           </div>
                           
                           {onDeleteTask && (
                             <button onClick={handleDelete} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded transition-colors" title="Delete Task">
                                <Trash2 className="w-4 h-4" />
                             </button>
                           )}
                        </div>
                        
                        {selectedTask.status !== TaskStatus.COMPLETED ? (
                            <button 
                              onClick={advanceTask}
                              className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                            >
                                <span>Advance Status</span>
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        ) : (
                             <span className="flex items-center space-x-2 text-emerald-600 font-medium">
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