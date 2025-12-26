import React, { useState, useEffect } from 'react';
import { Client, Project, Task, TaskStatus } from '../../../types';
import { Briefcase, ExternalLink, PieChart } from 'lucide-react';

interface ClientStatusWidgetProps {
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  onNavigateToClient: (clientId: string) => void;
}

const ClientStatusWidget: React.FC<ClientStatusWidgetProps> = ({ clients = [], projects = [], tasks = [], onNavigateToClient }) => {
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  useEffect(() => {
    if (clients.length > 0 && !selectedClientId) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients, selectedClientId]);

  const selectedClient = clients.find(c => c.id === selectedClientId);
  
  const clientProjects = projects.filter(p => p.clientId === selectedClientId && p.status === 'active');
  const clientTasks = tasks.filter(t => 
    t.client === selectedClient?.name && 
    !t.isArchived && 
    t.status !== TaskStatus.ARCHIVED
  );

  const completedTasks = clientTasks.filter(t => t.status === TaskStatus.COMPLETED || t.status === TaskStatus.APPROVED).length;
  const remainingTasks = clientTasks.length - completedTasks;
  
  // Find next deadline
  const nextDeadline = clientTasks
    .filter(t => t.status !== TaskStatus.COMPLETED && new Date(t.dueDate) >= new Date())
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-slate-100">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-600" />
            Client Status
          </h3>
        </div>
        
        <select 
          value={selectedClientId} 
          onChange={(e) => setSelectedClientId(e.target.value)}
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {selectedClient ? (
        <div className="flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 text-center">
              <div className="text-2xl font-bold text-indigo-700">{clientProjects.length}</div>
              <div className="text-xs text-indigo-600 font-medium">Active Projects</div>
            </div>
            <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 text-center">
              <div className="text-2xl font-bold text-emerald-700">{remainingTasks}</div>
              <div className="text-xs text-emerald-600 font-medium">Pending Tasks</div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Next Deadline</h4>
            {nextDeadline ? (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="font-medium text-slate-800 text-sm mb-1">{nextDeadline.title}</div>
                <div className="text-xs text-slate-500 flex justify-between">
                  <span>{new Date(nextDeadline.dueDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                  <span className={`font-medium ${nextDeadline.priority === 'critical' ? 'text-rose-600' : 'text-slate-600'}`}>
                    {nextDeadline.priority.toUpperCase()}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-400 italic">No upcoming deadlines</div>
            )}
          </div>

          <div className="pt-2">
            <button 
              onClick={() => onNavigateToClient(selectedClientId)}
              className="w-full py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
            >
              Open Client Dashboard <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-slate-400">
          Select a client
        </div>
      )}
    </div>
  );
};

export default ClientStatusWidget;
