import React, { useState } from 'react';
import { Task, TaskStatus, Client, TaskType } from '../../../types';
import { Clock, CheckCircle, Filter } from 'lucide-react';

interface MyTasksWidgetProps {
  tasks: Task[];
  clients: Client[];
  onNavigateToTask: (taskId: string) => void;
}

const MyTasksWidget: React.FC<MyTasksWidgetProps> = ({ tasks = [], clients = [], onNavigateToTask }) => {
  const [filterClient, setFilterClient] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [activeTab, setActiveTab] = useState<'today' | 'week'>('today');

  const filteredTasks = tasks.filter(task => {
    const isClientMatch = filterClient === 'all' || task.client === filterClient;
    const isTypeMatch = filterType === 'all' || task.taskType === filterType;
    
    const taskDate = new Date(task.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const isDateMatch = activeTab === 'today' 
      ? taskDate.toDateString() === today.toDateString()
      : (() => {
          const nextWeek = new Date(today);
          nextWeek.setDate(today.getDate() + 7);
          return taskDate >= today && taskDate <= nextWeek;
        })();

    return isClientMatch && isTypeMatch && isDateMatch && task.status !== TaskStatus.COMPLETED && task.status !== TaskStatus.ARCHIVED;
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-slate-100">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-indigo-600" />
            My Tasks
          </h3>
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('today')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${activeTab === 'today' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Today
            </button>
            <button
              onClick={() => setActiveTab('week')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${activeTab === 'week' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              This Week
            </button>
          </div>
        </div>
        
        <div className="flex gap-2">
          <select 
            value={filterClient} 
            onChange={(e) => setFilterClient(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-1/2"
          >
            <option value="all">All Clients</option>
            {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-1/2"
          >
            <option value="all">All Types</option>
            {['design', 'video', 'social', 'copywriting', 'meeting', 'other'].map(t => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar max-h-[300px]">
        {filteredTasks.length > 0 ? (
          filteredTasks.map(task => (
            <div 
              key={task.id}
              onClick={() => onNavigateToTask(task.id)}
              className="p-3 rounded-lg border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{task.client}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${
                  task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {task.status.replace('_', ' ')}
                </span>
              </div>
              <h4 className="text-sm font-semibold text-slate-800 group-hover:text-indigo-700 mb-2 line-clamp-1">{task.title}</h4>
              <div className="flex items-center text-xs text-slate-500 gap-3">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(task.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                {task.taskType && (
                  <span className="capitalize bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">{task.taskType}</span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 p-4">
            <CheckCircle className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-sm">No tasks found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTasksWidget;
