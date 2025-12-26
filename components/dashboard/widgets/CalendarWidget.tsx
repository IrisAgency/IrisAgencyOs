import React, { useState } from 'react';
import { Task, TaskStatus, Client } from '../../../types';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

interface CalendarWidgetProps {
  tasks: Task[];
  clients: Client[];
  onNavigateToTask: (taskId: string) => void;
  onNavigateToCalendar: () => void;
}

const CalendarWidget: React.FC<CalendarWidgetProps> = ({ tasks = [], clients = [], onNavigateToTask, onNavigateToCalendar }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterClient, setFilterClient] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    return { days, firstDay };
  };

  const { days, firstDay } = getDaysInMonth(currentDate);
  
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const filteredTasks = tasks.filter(t => {
    const matchClient = filterClient === 'all' || t.client === filterClient;
    const matchStatus = filterStatus === 'all' || t.status === filterStatus;
    return matchClient && matchStatus && !t.isArchived && t.status !== TaskStatus.ARCHIVED;
  });

  const getTasksForDay = (day: number) => {
    return filteredTasks.filter(t => {
      const d = new Date(t.dueDate);
      return d.getDate() === day && d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-slate-100">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-indigo-600" />
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h3>
          <div className="flex gap-1">
            <button onClick={prevMonth} className="p-1 hover:bg-slate-100 rounded"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={nextMonth} className="p-1 hover:bg-slate-100 rounded"><ChevronRight className="w-4 h-4" /></button>
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
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-1/2"
          >
            <option value="all">All Status</option>
            {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        </div>
      </div>

      <div className="flex-1 p-2 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
            <div key={d} className="text-xs font-bold text-slate-400">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 auto-rows-fr">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="h-20 bg-slate-50/50 rounded-lg"></div>
          ))}
          {Array.from({ length: days }).map((_, i) => {
            const day = i + 1;
            const dayTasks = getTasksForDay(day);
            const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();

            return (
              <div key={day} className={`h-20 border ${isToday ? 'border-indigo-300 bg-indigo-50' : 'border-slate-100 bg-white'} rounded-lg p-1 flex flex-col overflow-hidden`}>
                <span className={`text-xs font-medium mb-1 ${isToday ? 'text-indigo-700' : 'text-slate-500'}`}>{day}</span>
                <div className="flex-1 space-y-1 overflow-hidden">
                  {dayTasks.slice(0, 2).map(t => (
                    <div 
                      key={t.id} 
                      onClick={() => onNavigateToTask(t.id)}
                      className="text-[8px] px-1 py-0.5 bg-indigo-100 text-indigo-700 rounded truncate cursor-pointer hover:bg-indigo-200"
                      title={t.title}
                    >
                      {t.title}
                    </div>
                  ))}
                  {dayTasks.length > 2 && (
                    <div className="text-[8px] text-slate-400 text-center">+{dayTasks.length - 2} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="p-2 border-t border-slate-100 bg-slate-50">
        <button 
          onClick={onNavigateToCalendar}
          className="w-full py-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center justify-center gap-1"
        >
          Open Full Calendar <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

export default CalendarWidget;
