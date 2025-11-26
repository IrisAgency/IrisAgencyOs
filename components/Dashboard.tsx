import React from 'react';
import { Task, Project } from '../types';
import { Briefcase, CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface DashboardProps {
  tasks: Task[];
  projects: Project[];
}

const Dashboard: React.FC<DashboardProps> = ({ tasks, projects }) => {
  const activeProjects = projects.filter(p => p.status === 'Active').length;
  const pendingTasks = tasks.filter(t => t.status !== 'Completed' && !t.isArchived).length;
  const urgentTasks = tasks.filter(t => t.priority === 'High' && t.status !== 'Completed' && !t.isArchived).length;
  
  // Sort projects by deadline to find the next one
  const nextDeadline = [...projects]
    .filter(p => new Date(p.deadline) > new Date())
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())[0];

  const StatCard = ({ title, value, sub, icon: Icon, color }: any) => (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
          <p className={`text-xs mt-2 ${color === 'red' ? 'text-red-600' : 'text-slate-400'}`}>{sub}</p>
        </div>
        <div className={`p-3 rounded-lg ${color === 'indigo' ? 'bg-indigo-50 text-indigo-600' : color === 'emerald' ? 'bg-emerald-50 text-emerald-600' : color === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
          <p className="text-slate-500 mt-1">Welcome back. Here's what's happening at IRIS today.</p>
        </div>
        <span className="text-sm text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Active Projects" value={activeProjects} sub="Based on current briefs" icon={Briefcase} color="indigo" />
        <StatCard title="Pending Tasks" value={pendingTasks} sub="Across all departments" icon={CheckCircle} color="emerald" />
        <StatCard title="Urgent Actions" value={urgentTasks} sub="Requires immediate attention" icon={AlertCircle} color="rose" />
        <StatCard 
          title="Next Big Deadline" 
          value={nextDeadline ? new Date(nextDeadline.deadline).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : 'N/A'} 
          sub={nextDeadline?.client || 'No deadlines'} 
          icon={Clock} 
          color="amber" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity / Projects */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-semibold text-slate-900">Active Projects Status</h3>
            <button className="text-indigo-600 text-sm font-medium hover:underline">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="px-6 py-4">Project Name</th>
                  <th className="px-6 py-4">Client</th>
                  <th className="px-6 py-4">Budget Used</th>
                  <th className="px-6 py-4">Deadline</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projects.map((project) => (
                  <tr key={project.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{project.name}</td>
                    <td className="px-6 py-4 text-slate-500">{project.client}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-500 rounded-full" 
                            style={{ width: `${(project.spent / project.budget) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">{Math.round((project.spent / project.budget) * 100)}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{new Date(project.deadline).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        project.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 
                        project.status === 'Completed' ? 'bg-blue-100 text-blue-800' : 
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {project.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Task Feed */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-6 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Urgent Tasks</h3>
          </div>
          <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
            {urgentTasks === 0 ? (
                <div className="text-center py-8 text-slate-400">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>All urgent items cleared!</p>
                </div>
            ) : (
                tasks.filter(t => t.priority === 'High' && t.status !== 'Completed').map(task => (
                <div key={task.id} className="p-4 border border-slate-100 rounded-lg hover:border-indigo-200 hover:shadow-sm transition-all bg-slate-50 hover:bg-white group cursor-pointer">
                    <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{task.client}</span>
                    <span className="text-xs text-rose-500 font-medium">Due {new Date(task.dueDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
                    </div>
                    <h4 className="text-sm font-semibold text-slate-800 mb-1 group-hover:text-indigo-700 transition-colors">{task.title}</h4>
                    <p className="text-xs text-slate-500 line-clamp-2">{task.description}</p>
                    <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs px-2 py-1 bg-white border border-slate-200 rounded text-slate-500">{task.status}</span>
                    <div className="flex -space-x-2">
                        {task.assigneeIds.map(uid => (
                        <div key={uid} className="w-6 h-6 rounded-full bg-slate-300 border-2 border-white flex items-center justify-center text-[8px] overflow-hidden">
                            <div className="w-full h-full bg-indigo-400"></div>
                        </div>
                        ))}
                    </div>
                    </div>
                </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;