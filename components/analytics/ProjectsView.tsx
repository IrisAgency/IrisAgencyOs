import React from 'react';
import { Project, Task } from '../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertCircle, Calendar, TrendingUp } from 'lucide-react';
import DataTable from '../common/DataTable';

interface ProjectsViewProps {
    projects: Project[];
    tasks: Task[];
    projectBurn: any[];
    COLORS: string[];
}

const ProjectsView: React.FC<ProjectsViewProps> = ({ projects, tasks, projectBurn, COLORS }) => {
    return (
        <div className="space-y-4 md:space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                <div className="bg-iris-black/80 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-iris-white/10">
                    <h3 className="font-bold text-iris-white mb-4 md:mb-6 text-sm md:text-base">Budget vs Spent (Top Active)</h3>
                    <div className="overflow-x-auto">
                        <div className="min-w-[320px] h-64 w-full text-xs">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={projectBurn}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip cursor={{ fill: '#f8fafc' }} />
                                    <Legend />
                                    <Bar dataKey="Budget" fill={getComputedStyle(document.documentElement).getPropertyValue('--brand-accent').trim() || '#6366f1'} radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Spent" fill={getComputedStyle(document.documentElement).getPropertyValue('--brand-primary').trim() || '#f43f5e'} radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="bg-iris-black/80 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-iris-white/10 lg:col-span-2">
                    <h3 className="font-bold text-iris-white mb-4 md:mb-6 text-sm md:text-base">Project Status Distribution</h3>
                    <div className="overflow-x-auto">
                        <div className="min-w-[320px] h-64 w-full flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: 'Planning', value: projects.filter(p => p.status === 'planning').length },
                                            { name: 'Active', value: projects.filter(p => p.status === 'active' || p.status === 'Active').length },
                                            { name: 'Review', value: projects.filter(p => p.status === 'on_hold').length }, // mapping hold to review visually
                                            { name: 'Completed', value: projects.filter(p => p.status === 'completed' || p.status === 'Completed').length },
                                        ]}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {COLORS.map((color, index) => <Cell key={`cell-${index}`} fill={color} />)}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="middle" align="right" layout="vertical" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* Detailed List */}
            <div className="bg-iris-black/80 backdrop-blur-sm rounded-xl border border-iris-white/10 overflow-hidden">
                <div className="p-6 border-b border-iris-white/10">
                    <h3 className="font-bold text-iris-white">Project Health Check</h3>
                </div>
                <DataTable<Project>
                    data={projects}
                    keyExtractor={(p) => p.id}
                    emptyMessage="No projects found."
                    columns={[
                        {
                            header: 'Project',
                            accessorKey: 'name',
                            className: 'font-medium text-iris-white'
                        },
                        {
                            header: 'Progress (Tasks)',
                            cell: (p) => {
                                const projectTasks = tasks.filter(t => t.projectId === p.id);
                                const completed = projectTasks.filter(t => t.status === 'completed').length;
                                const progress = projectTasks.length > 0 ? Math.round((completed / projectTasks.length) * 100) : 0;
                                return (
                                    <div className="flex items-center gap-2">
                                        <div className="w-full bg-iris-black/95 border border-iris-white/10 rounded-full h-2">
                                            <div className="bg-iris-red h-2 rounded-full" style={{ width: `${progress}%` }}></div>
                                        </div>
                                        <span className="text-xs text-iris-white/70 w-8">{progress}%</span>
                                    </div>
                                );
                            },
                            className: 'text-center'
                        },
                        {
                            header: 'Budget Burn',
                            cell: (p) => {
                                const burn = p.budget > 0 ? Math.round((p.spent / p.budget) * 100) : 0;
                                return (
                                    <div className="flex items-center gap-2">
                                        <div className="w-full bg-iris-black/95 border border-iris-white/10 rounded-full h-2">
                                            <div className={`h-2 rounded-full ${burn > 100 ? 'bg-rose-500' : burn > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(burn, 100)}%` }}></div>
                                        </div>
                                        <span className="text-xs text-iris-white/70 w-8">{burn}%</span>
                                    </div>
                                );
                            },
                            className: 'text-center'
                        },
                        {
                            header: 'Timeline',
                            cell: (p) => {
                                const totalDays = (new Date(p.endDate).getTime() - new Date(p.startDate).getTime()) / (1000 * 3600 * 24);
                                const daysPassed = (new Date().getTime() - new Date(p.startDate).getTime()) / (1000 * 3600 * 24);
                                const timeProgress = Math.min(Math.max(Math.round((daysPassed / totalDays) * 100), 0), 100);
                                return (
                                    <div className="flex items-center gap-2">
                                        <div className="w-full bg-iris-black/95 border border-iris-white/10 rounded-full h-2">
                                            <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${timeProgress}%` }}></div>
                                        </div>
                                        <span className="text-xs text-iris-white/70 w-8">{timeProgress}%</span>
                                    </div>
                                );
                            },
                            className: 'text-center'
                        }
                    ]}
                />
            </div>
        </div>
    );
};

export default ProjectsView;
