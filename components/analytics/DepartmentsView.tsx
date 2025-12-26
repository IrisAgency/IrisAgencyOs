import React from 'react';
import { Task, Department } from '../../types';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Tooltip } from 'recharts';
import { Briefcase } from 'lucide-react';
import DataTable from '../common/DataTable';

interface DepartmentsViewProps {
    tasks: Task[];
    deptData: any[];
}

const DepartmentsView: React.FC<DepartmentsViewProps> = ({ tasks, deptData }) => {
    return (
        <div className="space-y-4 md:space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-4 md:mb-6 text-sm md:text-base">Workload Distribution</h3>
                    <div className="overflow-x-auto">
                        <div className="min-w-[350px] h-80 w-full text-xs">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={deptData}>
                                    <PolarGrid />
                                    <PolarAngleAxis dataKey="subject" />
                                    <PolarRadiusAxis angle={30} domain={[0, 'auto']} />
                                    <Radar name="Total Tasks" dataKey="A" stroke={getComputedStyle(document.documentElement).getPropertyValue('--brand-accent').trim() || '#8884d8'} fill={getComputedStyle(document.documentElement).getPropertyValue('--brand-accent').trim() || '#8884d8'} fillOpacity={0.6} />
                                    <Radar name="Completed" dataKey="B" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                                    <Legend />
                                    <Tooltip />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-4 md:mb-6 text-sm md:text-base">Task Throughput by Department</h3>
                    <div className="space-y-4">
                        {deptData.map((d, i) => (
                            <div key={i} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${d.subject === 'Creative' ? 'bg-purple-50 text-purple-600' :
                                        d.subject === 'Production' ? 'bg-blue-50 text-blue-600' :
                                            'bg-slate-100 text-slate-600'
                                        }`}>
                                        <Briefcase className="w-4 h-4" />
                                    </div>
                                    <span className="font-medium text-slate-900">{d.subject}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs text-slate-500 block">Completion Rate</span>
                                    <span className="text-sm font-bold text-iris-red">
                                        {d.A > 0 ? Math.round((d.B / d.A) * 100) : 0}%
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Workload Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="font-bold text-slate-900">Departmental Bottlenecks</h3>
                </div>
                <DataTable<string>
                    data={Object.values(Department)}
                    keyExtractor={(dept) => dept}
                    emptyMessage="No departments found."
                    columns={[
                        {
                            header: 'Department',
                            cell: (dept) => <span className="font-medium text-slate-900">{dept}</span>
                        },
                        {
                            header: 'Active Tasks',
                            cell: (dept) => {
                                const deptTasks = tasks.filter(t => t.department === dept);
                                const active = deptTasks.filter(t => t.status !== 'completed' && t.status !== 'archived').length;
                                return active;
                            }
                        },
                        {
                            header: 'Overdue',
                            cell: (dept) => {
                                const deptTasks = tasks.filter(t => t.department === dept);
                                const overdue = deptTasks.filter(t => new Date(t.dueDate) < new Date() && t.status !== 'completed').length;
                                return overdue > 0 ? <span className="text-rose-600 font-bold">{overdue}</span> : <span className="text-emeraliris-red">0</span>;
                            }
                        },
                        {
                            header: 'Avg. Priority',
                            cell: (dept) => {
                                const deptTasks = tasks.filter(t => t.department === dept);
                                const highPriority = deptTasks.filter(t => t.priority === 'High' || t.priority === 'Critical').length;
                                return <span className="text-slate-500">{highPriority} High/Crit</span>;
                            }
                        }
                    ]}
                />
            </div>
        </div>
    );
};

export default DepartmentsView;
