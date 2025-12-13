import React, { useState, useMemo } from 'react';
import { Task, User, TaskStatus, Project } from '../types';
import { ChevronLeft, ChevronRight, Filter, Calendar as CalendarIcon, User as UserIcon, CheckCircle, Clock, AlertCircle, X } from 'lucide-react';

interface ProjectCalendarProps {
  project: Project;
  tasks: Task[];
  users: User[];
  onTaskClick: (taskId: string) => void;
}

const ProjectCalendar: React.FC<ProjectCalendarProps> = ({ project, tasks, users, onTaskClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // --- Date Helpers ---
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // --- Navigation ---
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  // --- Filtering ---
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (task.projectId !== project.id) return false;
      if (task.isDeleted || task.isArchived) return false;
      
      const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
      const matchesAssignee = filterAssignee === 'all' || (task.assigneeIds || []).includes(filterAssignee);
      
      return matchesStatus && matchesAssignee;
    });
  }, [tasks, project.id, filterStatus, filterAssignee]);

  // --- Group Tasks by Date ---
  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    filteredTasks.forEach(task => {
      if (!task.dueDate) return;
      const dateStr = new Date(task.dueDate).toISOString().split('T')[0]; // YYYY-MM-DD
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(task);
    });
    return map;
  }, [filteredTasks]);

  // --- Render Helpers ---
  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.COMPLETED:
      case TaskStatus.APPROVED:
      case TaskStatus.CLIENT_APPROVED:
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case TaskStatus.IN_PROGRESS:
        return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case TaskStatus.AWAITING_REVIEW:
      case TaskStatus.CLIENT_REVIEW:
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case TaskStatus.REVISIONS_REQUIRED:
        return 'bg-rose-100 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  // --- Calendar Grid Generation ---
  const renderCalendarDays = () => {
    const days = [];
    const totalSlots = Math.ceil((daysInMonth + firstDay) / 7) * 7;

    for (let i = 0; i < totalSlots; i++) {
      const dayNumber = i - firstDay + 1;
      const isCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth;
      
      if (!isCurrentMonth) {
        days.push(
          <div key={`empty-${i}`} className="bg-slate-50/50 min-h-[120px] border-b border-r border-slate-100 p-2"></div>
        );
        continue;
      }

      const dateStr = new Date(year, month, dayNumber).toISOString().split('T')[0]; // Local YYYY-MM-DD construction might be tricky with timezones, but let's stick to simple construction
      // Better date string construction to avoid timezone shifts:
      const currentDayDate = new Date(year, month, dayNumber);
      const localDateStr = `${currentDayDate.getFullYear()}-${String(currentDayDate.getMonth() + 1).padStart(2, '0')}-${String(currentDayDate.getDate()).padStart(2, '0')}`;
      
      const dayTasks = tasksByDate[localDateStr] || [];
      const isToday = new Date().toDateString() === currentDayDate.toDateString();

      days.push(
        <div key={dayNumber} className={`min-h-[120px] border-b border-r border-slate-100 p-2 transition-colors hover:bg-slate-50 ${isToday ? 'bg-indigo-50/30' : 'bg-white'}`}>
          <div className="flex justify-between items-start mb-2">
            <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-indigo-600 text-white' : 'text-slate-700'}`}>
              {dayNumber}
            </span>
            {dayTasks.length > 0 && (
               <span className="text-[10px] font-bold text-slate-400">{dayTasks.length} due</span>
            )}
          </div>
          
          <div className="space-y-1">
            {dayTasks.slice(0, 3).map(task => (
              <button
                key={task.id}
                onClick={() => onTaskClick(task.id)}
                className={`w-full text-left text-[10px] px-2 py-1 rounded border truncate transition-all hover:shadow-sm hover:scale-[1.02] ${getStatusColor(task.status)}`}
                title={`${task.title} (${task.status})`}
              >
                {task.title}
              </button>
            ))}
            {dayTasks.length > 3 && (
              <div className="text-[10px] text-slate-500 font-medium pl-1">
                + {dayTasks.length - 3} more
              </div>
            )}
          </div>
        </div>
      );
    }
    return days;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-slate-500" />
            {monthNames[month]} {year}
          </h2>
          <div className="flex items-center bg-slate-100 rounded-lg p-1">
            <button onClick={prevMonth} className="p-1 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-600">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={goToToday} className="px-3 py-1 text-xs font-medium text-slate-600 hover:text-indigo-600">
              Today
            </button>
            <button onClick={nextMonth} className="p-1 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-600">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
           <button 
             onClick={() => setShowFilters(!showFilters)}
             className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${showFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
           >
             <Filter className="w-4 h-4" />
             <span>Filters</span>
             {(filterStatus !== 'all' || filterAssignee !== 'all') && (
               <span className="flex h-2 w-2 rounded-full bg-indigo-600"></span>
             )}
           </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-top-2">
           <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
              <select 
                value={filterStatus} 
                onChange={e => setFilterStatus(e.target.value)}
                className="w-full p-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                {Object.values(TaskStatus).map(s => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
           </div>
           <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Assignee</label>
              <select 
                value={filterAssignee} 
                onChange={e => setFilterAssignee(e.target.value)}
                className="w-full p-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="all">All Members</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
           </div>
           <div className="flex items-end">
              <button 
                onClick={() => { setFilterStatus('all'); setFilterAssignee('all'); }}
                className="text-sm text-slate-500 hover:text-indigo-600 underline px-2 py-2"
              >
                Clear Filters
              </button>
           </div>
        </div>
      )}

      {/* Calendar Grid Header */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="py-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid Body */}
      <div className="grid grid-cols-7 flex-1 auto-rows-fr bg-slate-200 gap-px border-b border-slate-200">
         {renderCalendarDays()}
      </div>
      
      <div className="p-3 bg-slate-50 text-xs text-slate-500 flex justify-between items-center">
         <span>* Showing tasks based on Due Date</span>
         <div className="flex gap-3">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Completed</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500"></span> In Progress</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Review</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Revisions</span>
         </div>
      </div>
    </div>
  );
};

export default ProjectCalendar;
