import React from 'react';
import { Project, User } from '../../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, TrendingUp, Briefcase, AlertCircle, Calendar } from 'lucide-react';
import KPICard from './KPICard';
import DataTable from '../common/DataTable';

interface ExecutiveViewProps {
    totalRevenue: number;
    netProfit: number;
    profitMargin: number;
    totalOutstanding: number;
    activeProjects: Project[];
    atRiskProjects: Project[];
    users: User[];
    monthlyData: any[];
    clientRevenue: any[];
    COLORS: string[];
}

const ExecutiveView: React.FC<ExecutiveViewProps> = ({
    totalRevenue,
    netProfit,
    profitMargin,
    totalOutstanding,
    activeProjects,
    atRiskProjects,
    users,
    monthlyData,
    clientRevenue,
    COLORS
}) => {
    return (
        <div className="space-y-4 md:space-y-6 animate-in fade-in duratiris-red">
            {/* KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <KPICard
                    title="Total Revenue (YTD)"
                    value={`$${(totalRevenue || 0).toLocaleString()}`}
                    subtext="+12.5% from last month"
                    icon={DollarSign}
                    trend="up"
                    color="bg-emerald-500/20 text-emerald-400"
                />
                <KPICard
                    title="Net Profit"
                    value={`$${(netProfit || 0).toLocaleString()}`}
                    subtext={`${profitMargin.toFixed(1)}% margin`}
                    icon={TrendingUp}
                    trend={netProfit > 0 ? 'up' : 'down'}
                    color={netProfit > 0 ? "bg-iris-red/20 text-iris-red" : "bg-rose-500/20 text-rose-400"}
                />
                <KPICard
                    title="Active Projects"
                    value={activeProjects.length}
                    subtext={`${atRiskProjects.length} requiring attention`}
                    icon={Briefcase}
                    color="bg-blue-500/20 text-blue-400"
                />
                <KPICard
                    title="Outstanding Invoices"
                    value={`$${(totalOutstanding || 0).toLocaleString()}`}
                    subtext="Unpaid client balance"
                    icon={AlertCircle}
                    color="bg-amber-500/20 text-amber-400"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                {/* Main Financial Chart */}
                <div className="lg:col-span-2 bg-iris-black/80 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-iris-white/10">
                    <h3 className="font-bold text-iris-white mb-4 md:mb-6 text-sm md:text-base">Financial Performance</h3>
                    <div className="overflow-x-auto">
                        <div className="min-w-[350px] h-80 w-full text-xs min-h-[320px]">
                            <ResponsiveContainer width="100%" height={320}>
                                <AreaChart data={monthlyData}>
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={getComputedStyle(document.documentElement).getPropertyValue('--brand-primary').trim() || '#f43f5e'} stopOpacity={0.1} />
                                            <stop offset="95%" stopColor={getComputedStyle(document.documentElement).getPropertyValue('--brand-primary').trim() || '#f43f5e'} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `$${val}`} />
                                    <Tooltip />
                                    <Legend />
                                    <Area type="monotone" dataKey="revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRev)" name="Revenue" />
                                    <Area type="monotone" dataKey="expenses" stroke={getComputedStyle(document.documentElement).getPropertyValue('--brand-primary').trim() || '#f43f5e'} fillOpacity={1} fill="url(#colorExp)" name="Expenses" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Top Clients Donut */}
                <div className="bg-iris-black/80 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-iris-white/10">
                    <h3 className="font-bold text-iris-white mb-4 md:mb-6 text-sm md:text-base">Revenue by Client</h3>
                    <div className="overflow-x-auto">
                        <div className="min-w-[300px] h-60 w-full">
                            <ResponsiveContainer width="100%" height={240}>
                                <PieChart>
                                    <Pie
                                        data={clientRevenue}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {clientRevenue.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => `$${(value || 0).toLocaleString()}`} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* Projects at Risk Table */}
            <div className="bg-iris-black/80 backdrop-blur-sm rounded-xl border border-iris-white/10 overflow-hidden">
                <div className="p-4 md:p-6 border-b border-iris-white/10 flex justify-between items-center">
                    <h3 className="font-bold text-iris-white flex items-center gap-2 text-sm md:text-base">
                        <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-rose-500" /> Projects Requiring Attention
                    </h3>
                    <button className="text-xs md:text-sm text-iris-red hover:brightness-110">View All</button>
                </div>
                <DataTable<Project>
                    data={atRiskProjects}
                    keyExtractor={(p) => p.id}
                    emptyMessage="Great job! No projects currently at risk."
                    columns={[
                        {
                            header: 'Project Name',
                            accessorKey: 'name',
                            className: 'font-medium text-iris-white'
                        },
                        {
                            header: 'Client',
                            accessorKey: 'client',
                            className: 'text-iris-white/70'
                        },
                        {
                            header: 'Manager',
                            cell: (p) => {
                                const manager = users.find(u => u.id === p.accountManagerId);
                                return (
                                    <div className="flex items-center gap-2">
                                        {manager && <img src={manager.avatar} className="w-6 h-6 rounded-full" alt="" />}
                                        <span>{manager?.name || 'Unassigned'}</span>
                                    </div>
                                );
                            }
                        },
                        {
                            header: 'Issue',
                            cell: (p) => (
                                <>
                                    {p.spent > p.budget && (
                                        <span className="text-rose-400 font-medium flex items-center gap-1">Over Budget <TrendingUp className="w-3 h-3" /></span>
                                    )}
                                    {new Date(p.endDate) < new Date() && (
                                        <span className="text-amber-400 font-medium flex items-center gap-1">Overdue <Calendar className="w-3 h-3" /></span>
                                    )}
                                </>
                            )
                        },
                        {
                            header: 'Status',
                            cell: (p) => (
                                <span className="bg-iris-black/95 text-iris-white/70 px-2 py-1 rounded text-xs uppercase font-bold border border-iris-white/10">{p.status}</span>
                            )
                        }
                    ]}
                />
            </div>
        </div>
    );
};

export default ExecutiveView;
