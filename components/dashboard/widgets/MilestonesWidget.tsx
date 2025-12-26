import React, { useState, useMemo } from 'react';
import { ProjectMilestone, Task, Client, Project } from '../../../types';
import { BarChart3, Filter } from 'lucide-react';

interface MilestonesWidgetProps {
  milestones: ProjectMilestone[];
  tasks: Task[];
  clients: Client[];
  projects: Project[];
}

const MilestonesWidget: React.FC<MilestonesWidgetProps> = ({ milestones = [], tasks = [], clients = [], projects = [] }) => {
  const [selectedClientId, setSelectedClientId] = useState<string>('all');

  const currentMonthMilestones = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // 1. Filter milestones by date and client
    const filteredMilestones = milestones.filter(m => {
      if (!m) return false;
      
      // Date Filter
      const d = new Date(m.endDate || m.dueDate);
      const isCurrentMonth = d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      if (!isCurrentMonth) return false;

      // Client Filter
      if (selectedClientId !== 'all') {
        const project = projects.find(p => p.id === m.projectId);
        if (!project || project.clientId !== selectedClientId) return false;
      }

      return true;
    });

    // 2. Map to chart data
    return filteredMilestones.map(m => {
      const mTasks = tasks.filter(t => t && t.milestoneId === m.id && !t.isDeleted);
      const completedCount = mTasks.filter(t => {
        if (!t || !t.status) return false;
        return ['completed', 'approved', 'client_approved'].includes(t.status);
      }).length;
      const totalCount = mTasks.length;

      // Determine "Total" based on Target or Actual
      let displayTotal = totalCount;
      let displayCompleted = completedCount;

      if (m.targetTaskCount && m.targetTaskCount > 0) {
        displayTotal = m.targetTaskCount;
        displayCompleted = Math.min(completedCount, m.targetTaskCount);
      }

      // Calculate percentage
      const progressPercent = displayTotal > 0 ? Math.round((displayCompleted / displayTotal) * 100) : 0;

      // Get project name for context if showing all clients
      const project = projects.find(p => p.id === m.projectId);
      
      return {
        id: m.id,
        name: m.name,
        projectName: project?.name || 'Unknown Project',
        completed: displayCompleted,
        total: displayTotal,
        progressPercent
      };
    });
  }, [milestones, tasks, projects, selectedClientId]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            Monthly Milestones
          </h3>
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
            {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="flex-1 text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Clients</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
        {currentMonthMilestones.length > 0 ? (
          <div className="space-y-4">
            {currentMonthMilestones.map(milestone => (
              <div key={milestone.id} className="flex flex-col gap-1">
                <div className="flex justify-between items-end">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">{milestone.name}</h4>
                    {selectedClientId === 'all' && (
                      <p className="text-xs text-slate-500">{milestone.projectName}</p>
                    )}
                  </div>
                  <span className="text-xs font-medium text-slate-600">
                    {milestone.completed} / {milestone.total} tasks
                  </span>
                </div>
                
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-600 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${milestone.progressPercent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 min-h-[200px]">
            <p>No milestones for this month</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MilestonesWidget;
