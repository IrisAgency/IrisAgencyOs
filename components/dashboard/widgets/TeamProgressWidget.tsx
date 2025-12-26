import React from 'react';
import { User, Task, TaskStatus } from '../../../types';
import { Users, BarChart2 } from 'lucide-react';

interface TeamProgressWidgetProps {
  users: User[];
  tasks: Task[];
  onNavigateToUserTasks: (userId: string) => void;
}

const TeamProgressWidget: React.FC<TeamProgressWidgetProps> = ({ users = [], tasks = [], onNavigateToUserTasks }) => {
  // Calculate progress for this week
  const getProgress = (userId: string) => {
    const userTasks = tasks.filter(t => 
      (t.assigneeIds || []).includes(userId) && 
      !t.isArchived &&
      t.status !== TaskStatus.ARCHIVED
    );
    
    const total = userTasks.length;
    const completed = userTasks.filter(t => t.status === TaskStatus.COMPLETED || t.status === TaskStatus.APPROVED).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { total, completed, percent };
  };

  // Sort users by active tasks count (desc)
  const sortedUsers = [...users]
    .filter(u => u.status === 'active')
    .sort((a, b) => {
      const tasksA = tasks.filter(t => (t.assigneeIds || []).includes(a.id)).length;
      const tasksB = tasks.filter(t => (t.assigneeIds || []).includes(b.id)).length;
      return tasksB - tasksA;
    })
    .slice(0, 8); // Show top 8

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-600" />
          Team Workload
        </h3>
        <span className="text-xs text-slate-400">This Week</span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-3 custom-scrollbar max-h-[300px]">
        {sortedUsers.map(user => {
          const { total, completed, percent } = getProgress(user.id);
          
          return (
            <div 
              key={user.id}
              onClick={() => onNavigateToUserTasks(user.id)}
              className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors group"
            >
              <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full border border-slate-200" />
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-700 truncate">{user.name}</span>
                  <span className="text-xs text-slate-500 font-medium">{completed}/{total}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${percent === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                    style={{ width: `${percent}%` }}
                  ></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TeamProgressWidget;
