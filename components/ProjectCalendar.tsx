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
  const surface = 'bg-[color:var(--dash-surface)] border border-[color:var(--dash-glass-border)] text-slate-100';
  const elevated = 'bg-[color:var(--dash-surface-elevated)] border border-[color:var(--dash-glass-border)] text-slate-100';
  const inputClass = 'w-full px-3 py-2 rounded-lg bg-[color:var(--dash-surface-elevated)] border border-[color:var(--dash-glass-border)] text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[color:var(--dash-primary)]';
  const pill = 'px-2 py-1 rounded-full text-[11px] font-medium border';
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
    console.log(`📅 ProjectCalendar: Processing ${filteredTasks.length} filtered tasks for project ${project.id}`);
    
    filteredTasks.forEach(task => {
      if (!task.dueDate) {
        console.log(`⚠️ Task ${task.id} (${task.title}) has no dueDate`);
        return;
      }
      
      // Handle both Date objects and ISO strings
      const dueDate = new Date(task.dueDate);
      const dateStr = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}`;
      
      console.log(`📌 Task "${task.title}" dueDate: ${task.dueDate} → ${dateStr}`);
      
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(task);
    });
    
    console.log('📊 Tasks grouped by date:', Object.keys(map).length, 'unique dates');
    console.log('📊 tasksByDate:', map);
    return map;
  }, [filteredTasks, project.id]);

  // --- Render Helpers ---
  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.COMPLETED:
      case TaskStatus.APPROVED:
      case TaskStatus.CLIENT_APPROVED:
        return 'bg-emerald-500/15 text-emerald-100 border-emerald-400/40';
      case TaskStatus.IN_PROGRESS:
        return 'bg-indigo-500/15 text-indigo-100 border-indigo-400/40';
      case TaskStatus.AWAITING_REVIEW:
      case TaskStatus.CLIENT_REVIEW:
        return 'bg-amber-500/15 text-amber-100 border-amber-400/40';
      case TaskStatus.REVISIONS_REQUIRED:
        return 'bg-rose-500/15 text-rose-100 border-rose-400/40';
      default:
        return 'bg-slate-500/15 text-slate-200 border-slate-400/40';
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
          <div key={`empty-${i}`} className="bg-[color:var(--dash-surface)] min-h-[120px] border-b border-r border-[color:var(--dash-glass-border)] p-2"></div>
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
        <div key={dayNumber} className={`min-h-[120px] border-b border-r border-[color:var(--dash-glass-border)] p-2 transition-colors hover:bg-[color:var(--dash-surface)] ${isToday ? 'bg-[color:var(--dash-primary)]/10' : 'bg-[color:var(--dash-surface-elevated)]'}`}>
          <div className="flex justify-between items-start mb-2">
            <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full border border-[color:var(--dash-glass-border)] ${isToday ? 'bg-[color:var(--dash-primary)] text-white' : 'text-slate-200 bg-[color:var(--dash-surface)]'}`}>
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
    <div className={`${elevated} rounded-xl shadow-[0_18px_48px_-28px_rgba(0,0,0,0.85)] flex flex-col h-full`}>
      {/* Header */}
      <div className="p-4 border-b border-[color:var(--dash-glass-border)] flex flex-col md:flex-row justify-between items-center gap-4 bg-[color:var(--dash-surface)]">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-bold text-slate-50 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-slate-300" />
            {monthNames[month]} {year}
          </h2>
          <div className="flex items-center bg-[color:var(--dash-surface-elevated)] border border-[color:var(--dash-glass-border)] rounded-lg p-1">
            <button onClick={prevMonth} className="p-1 hover:bg-[color:var(--dash-surface)] hover:shadow-sm rounded-md transition-all text-slate-200">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={goToToday} className="px-3 py-1 text-xs font-medium text-slate-200 hover:text-[color:var(--dash-primary)]">
              Today
            </button>
            <button onClick={nextMonth} className="p-1 hover:bg-[color:var(--dash-surface)] hover:shadow-sm rounded-md transition-all text-slate-200">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
           <button 
             onClick={() => setShowFilters(!showFilters)}
             className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${showFilters ? 'bg-[color:var(--dash-surface-elevated)] border-[color:var(--dash-primary)] text-[color:var(--dash-primary)]' : 'bg-[color:var(--dash-surface-elevated)] border-[color:var(--dash-glass-border)] text-slate-200 hover:bg-[color:var(--dash-surface)]'}`}
           >
             <Filter className="w-4 h-4" />
             <span>Filters</span>
             {(filterStatus !== 'all' || filterAssignee !== 'all') && (
               <span className="flex h-2 w-2 rounded-full bg-[color:var(--dash-primary)]"></span>
             )}
           </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="p-4 bg-[color:var(--dash-surface)] border-b border-[color:var(--dash-glass-border)] grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-top-2">
           <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Status</label>
              <select 
                value={filterStatus} 
                onChange={e => setFilterStatus(e.target.value)}
                className={inputClass}
              >
                <option value="all">All Statuses</option>
                {Object.values(TaskStatus).map(s => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
           </div>
           <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Assignee</label>
              <select 
                value={filterAssignee} 
                onChange={e => setFilterAssignee(e.target.value)}
                className={inputClass}
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
                className="text-sm text-slate-400 hover:text-[color:var(--dash-primary)] underline px-2 py-2"
              >
                Clear Filters
              </button>
           </div>
        </div>
      )}

      {/* Calendar Grid Header */}
      <div className="grid grid-cols-7 border-b border-[color:var(--dash-glass-border)] bg-[color:var(--dash-surface)]">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
         <div key={day} className="py-2 text-center text-xs font-bold text-slate-300 uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid Body */}
      <div className="grid grid-cols-7 flex-1 auto-rows-fr bg-[color:var(--dash-surface)] gap-px border-b border-[color:var(--dash-glass-border)]">
         {renderCalendarDays()}
      </div>
      
      <div className="p-3 bg-[color:var(--dash-surface)] text-xs text-slate-400 flex justify_between items-center border-t border-[color:var(--dash-glass-border)]">
        <span>* Showing tasks based on Due Date</span>
        <div className="flex gap-3 text-slate-300">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> Completed</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-400"></span> In Progress</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400"></span> Review</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400"></span> Revisions</span>
        </div>
      </div>
    </div>
  );
};

export default ProjectCalendar;
