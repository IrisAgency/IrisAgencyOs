
import React, { useState } from 'react';
import { Task, Project, Invoice, User, Payment, Expense, Client, Department } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, RadarChart, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, Radar 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, AlertCircle, Briefcase, 
  CheckCircle, Users, Activity, Calendar, PieChart as PieIcon,
  ArrowRight
} from 'lucide-react';

interface AnalyticsHubProps {
  tasks: Task[];
  projects: Project[];
  invoices: Invoice[];
  users: User[];
  payments: Payment[];
  expenses: Expense[];
  clients: Client[];
}

const AnalyticsHub: React.FC<AnalyticsHubProps> = ({ 
  tasks, projects, invoices, users, payments, expenses, clients 
}) => {
  const [activeTab, setActiveTab] = useState<'Executive' | 'Financial' | 'Projects' | 'Departments'>('Executive');

  // --- Data Calculation Helpers ---

  // Financials
  const totalRevenue = payments.reduce((acc, p) => acc + p.amount, 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;
  const totalOutstanding = invoices.reduce((acc, i) => acc + i.balance, 0);
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // Projects
  const activeProjects = projects.filter(p => p.status === 'Active' || p.status === 'active');
  const atRiskProjects = activeProjects.filter(p => {
    const isOverBudget = p.spent > p.budget;
    const isOverdue = new Date(p.endDate) < new Date() && p.status !== 'Completed';
    return isOverBudget || isOverdue;
  });

  // Tasks
  const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'approved' || t.status === 'client_approved');
  const overdueTasks = tasks.filter(t => new Date(t.dueDate) < new Date() && t.status !== 'completed' && t.status !== 'archived');

  // --- Chart Data Preparation ---

  // 1. Monthly Financials (Mocked logic for demo purposes as dates might be sparse)
  const monthlyData = [
    { name: 'Jan', revenue: 4000, expenses: 2400, profit: 1600 },
    { name: 'Feb', revenue: 3000, expenses: 1398, profit: 1602 },
    { name: 'Mar', revenue: 2000, expenses: 9800, profit: -7800 },
    { name: 'Apr', revenue: 2780, expenses: 3908, profit: -1128 },
    { name: 'May', revenue: 1890, expenses: 4800, profit: -2910 },
    { name: 'Jun', revenue: 2390, expenses: 3800, profit: -1410 },
    { name: 'Jul', revenue: 3490, expenses: 4300, profit: -810 },
  ];
  // In a real app, you would aggregate `payments` and `expenses` by month here.
  
  // 2. Department Workload
  const deptData = Object.values(Department).map(dept => {
    const deptTasks = tasks.filter(t => t.department === dept);
    return {
      subject: dept,
      A: deptTasks.length, // Total Tasks
      B: deptTasks.filter(t => t.status === 'completed').length, // Completed
      fullMark: Math.max(tasks.length / 2, 10) // Scale
    };
  });

  // 3. Client Revenue Top 5
  const clientRevenue = clients.map(c => {
    const revenue = payments.filter(p => p.clientId === c.id).reduce((acc, p) => acc + p.amount, 0);
    return { name: c.name, value: revenue };
  }).sort((a, b) => b.value - a.value).slice(0, 5);

  // 4. Project Budget Burn
  const projectBurn = projects.filter(p => p.status === 'Active' || p.status === 'active').slice(0, 5).map(p => ({
    name: p.name.substring(0, 15) + '...',
    Budget: p.budget,
    Spent: p.spent
  }));

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  // --- Sub-Components ---

  const KPICard = ({ title, value, subtext, icon: Icon, trend, color }: any) => (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-slate-500 text-sm font-medium">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
        </div>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {subtext && (
        <div className="flex items-center text-xs">
          {trend === 'up' && <TrendingUp className="w-3 h-3 text-emerald-500 mr-1" />}
          {trend === 'down' && <TrendingDown className="w-3 h-3 text-rose-500 mr-1" />}
          <span className="text-slate-400">{subtext}</span>
        </div>
      )}
    </div>
  );

  const ExecutiveView = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          title="Total Revenue (YTD)" 
          value={`$${(totalRevenue || 0).toLocaleString()}`} 
          subtext="+12.5% from last month" 
          icon={DollarSign} 
          trend="up"
          color="bg-emerald-50 text-emerald-600"
        />
        <KPICard 
          title="Net Profit" 
          value={`$${(netProfit || 0).toLocaleString()}`} 
          subtext={`${profitMargin.toFixed(1)}% margin`} 
          icon={TrendingUp} 
          trend={netProfit > 0 ? 'up' : 'down'}
          color={netProfit > 0 ? "bg-indigo-50 text-indigo-600" : "bg-rose-50 text-rose-600"}
        />
        <KPICard 
          title="Active Projects" 
          value={activeProjects.length} 
          subtext={`${atRiskProjects.length} requiring attention`} 
          icon={Briefcase} 
          color="bg-blue-50 text-blue-600"
        />
        <KPICard 
          title="Outstanding Invoices" 
          value={`$${(totalOutstanding || 0).toLocaleString()}`} 
          subtext="Unpaid client balance" 
          icon={AlertCircle} 
          color="bg-amber-50 text-amber-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Financial Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-6">Financial Performance</h3>
          <div className="h-80 w-full text-xs min-h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `$${val}`} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRev)" name="Revenue" />
                <Area type="monotone" dataKey="expenses" stroke="#f43f5e" fillOpacity={1} fill="url(#colorExp)" name="Expenses" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Clients Donut */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-6">Revenue by Client</h3>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
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

      {/* Projects at Risk Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-500"/> Projects Requiring Attention
          </h3>
          <button className="text-sm text-indigo-600 hover:underline">View All Projects</button>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-medium">
            <tr>
              <th className="px-6 py-4">Project Name</th>
              <th className="px-6 py-4">Client</th>
              <th className="px-6 py-4">Manager</th>
              <th className="px-6 py-4">Issue</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {atRiskProjects.map(p => {
              const manager = users.find(u => u.id === p.accountManagerId);
              return (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{p.name}</td>
                  <td className="px-6 py-4 text-slate-600">{p.client}</td>
                  <td className="px-6 py-4 flex items-center gap-2">
                    {manager && <img src={manager.avatar} className="w-6 h-6 rounded-full" alt="" />}
                    <span>{manager?.name || 'Unassigned'}</span>
                  </td>
                  <td className="px-6 py-4">
                    {p.spent > p.budget && (
                      <span className="text-rose-600 font-medium flex items-center gap-1">Over Budget <TrendingUp className="w-3 h-3"/></span>
                    )}
                    {new Date(p.endDate) < new Date() && (
                      <span className="text-amber-600 font-medium flex items-center gap-1">Overdue <Calendar className="w-3 h-3"/></span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs uppercase font-bold">{p.status}</span>
                  </td>
                </tr>
              );
            })}
            {atRiskProjects.length === 0 && (
               <tr><td colSpan={5} className="p-6 text-center text-slate-400">Great job! No projects currently at risk.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const FinancialView = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
             <h3 className="text-slate-500 font-medium text-sm uppercase">Total Invoiced</h3>
             <p className="text-3xl font-bold text-slate-900 my-2">${invoices.reduce((acc, i) => acc + i.total, 0).toLocaleString()}</p>
             <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500" style={{ width: '100%' }}></div>
             </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
             <h3 className="text-slate-500 font-medium text-sm uppercase">Collected</h3>
             <p className="text-3xl font-bold text-emerald-600 my-2">${invoices.reduce((acc, i) => acc + i.paid, 0).toLocaleString()}</p>
             <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500" 
                  style={{ width: `${(invoices.reduce((acc, i) => acc + i.paid, 0) / Math.max(invoices.reduce((acc, i) => acc + i.total, 0), 1)) * 100}%` }}
                ></div>
             </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
             <h3 className="text-slate-500 font-medium text-sm uppercase">Outstanding</h3>
             <p className="text-3xl font-bold text-amber-600 my-2">${(totalOutstanding || 0).toLocaleString()}</p>
             <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500" 
                  style={{ width: `${(totalOutstanding / Math.max(invoices.reduce((acc, i) => acc + i.total, 0), 1)) * 100}%` }}
                ></div>
             </div>
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Expense Breakdown */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
             <h3 className="font-bold text-slate-900 mb-6">Expense Distribution</h3>
             <div className="h-64 w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart 
                      layout="vertical"
                      data={expenses.reduce((acc: any[], curr) => {
                         const existing = acc.find(item => item.name === curr.category);
                         if (existing) { existing.value += curr.amount; }
                         else { acc.push({ name: curr.category, value: curr.amount }); }
                         return acc;
                      }, [])}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                   >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tickFormatter={(val) => `$${val}`} />
                      <YAxis dataKey="name" type="category" width={80} />
                      <Tooltip formatter={(val: number) => `$${val.toLocaleString()}`} cursor={{fill: 'transparent'}} />
                      <Bar dataKey="value" fill="#f43f5e" radius={[0, 4, 4, 0]} name="Amount Spent" />
                   </BarChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* Recent Payments Table */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
             <h3 className="font-bold text-slate-900 mb-4">Recent Payments Received</h3>
             <div className="flex-1 overflow-auto">
                <table className="w-full text-sm text-left">
                   <thead className="text-xs text-slate-500 bg-slate-50 uppercase">
                      <tr>
                         <th className="px-4 py-2">Date</th>
                         <th className="px-4 py-2">Client</th>
                         <th className="px-4 py-2 text-right">Amount</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {payments.slice(0, 5).map(pay => {
                         const client = clients.find(c => c.id === pay.clientId);
                         return (
                            <tr key={pay.id}>
                               <td className="px-4 py-3">{new Date(pay.date).toLocaleDateString()}</td>
                               <td className="px-4 py-3">{client?.name || 'Unknown'}</td>
                               <td className="px-4 py-3 text-right font-medium text-emerald-600">+${pay.amount.toLocaleString()}</td>
                            </tr>
                         )
                      })}
                   </tbody>
                </table>
             </div>
          </div>
       </div>
    </div>
  );

  const ProjectsView = () => (
     <div className="space-y-6 animate-in fade-in duration-300">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-6">Budget vs Spent (Top Active)</h3>
              <div className="h-64 w-full text-xs">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={projectBurn}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} />
                       <XAxis dataKey="name" />
                       <YAxis />
                       <Tooltip cursor={{fill: '#f8fafc'}} />
                       <Legend />
                       <Bar dataKey="Budget" fill="#6366f1" radius={[4, 4, 0, 0]} />
                       <Bar dataKey="Spent" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                 </ResponsiveContainer>
              </div>
           </div>

           <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
               <h3 className="font-bold text-slate-900 mb-6">Project Status Distribution</h3>
               <div className="h-64 w-full flex items-center justify-center">
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

        {/* Detailed List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
           <div className="p-6 border-b border-slate-100">
               <h3 className="font-bold text-slate-900">Project Health Check</h3>
           </div>
           <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                 <tr>
                    <th className="px-6 py-4">Project</th>
                    <th className="px-6 py-4 text-center">Progress (Tasks)</th>
                    <th className="px-6 py-4 text-center">Budget Burn</th>
                    <th className="px-6 py-4 text-center">Timeline</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                 {projects.map(p => {
                    const projectTasks = tasks.filter(t => t.projectId === p.id);
                    const completed = projectTasks.filter(t => t.status === 'completed').length;
                    const progress = projectTasks.length > 0 ? Math.round((completed / projectTasks.length) * 100) : 0;
                    const burn = p.budget > 0 ? Math.round((p.spent / p.budget) * 100) : 0;
                    
                    // Timeline calc
                    const totalDays = (new Date(p.endDate).getTime() - new Date(p.startDate).getTime()) / (1000 * 3600 * 24);
                    const daysPassed = (new Date().getTime() - new Date(p.startDate).getTime()) / (1000 * 3600 * 24);
                    const timeProgress = Math.min(Math.max(Math.round((daysPassed / totalDays) * 100), 0), 100);

                    return (
                       <tr key={p.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 font-medium text-slate-900">{p.name}</td>
                          <td className="px-6 py-4">
                             <div className="flex items-center gap-2">
                                <div className="w-full bg-slate-200 rounded-full h-2">
                                   <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
                                </div>
                                <span className="text-xs text-slate-500 w-8">{progress}%</span>
                             </div>
                          </td>
                          <td className="px-6 py-4">
                             <div className="flex items-center gap-2">
                                <div className="w-full bg-slate-200 rounded-full h-2">
                                   <div className={`h-2 rounded-full ${burn > 100 ? 'bg-rose-500' : burn > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(burn, 100)}%` }}></div>
                                </div>
                                <span className="text-xs text-slate-500 w-8">{burn}%</span>
                             </div>
                          </td>
                           <td className="px-6 py-4">
                             <div className="flex items-center gap-2">
                                <div className="w-full bg-slate-200 rounded-full h-2">
                                   <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${timeProgress}%` }}></div>
                                </div>
                                <span className="text-xs text-slate-500 w-8">{timeProgress}%</span>
                             </div>
                          </td>
                       </tr>
                    );
                 })}
              </tbody>
           </table>
        </div>
     </div>
  );

  const DepartmentsView = () => (
     <div className="space-y-6 animate-in fade-in duration-300">
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-6">Workload Distribution</h3>
                <div className="h-80 w-full text-xs">
                   <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={deptData}>
                         <PolarGrid />
                         <PolarAngleAxis dataKey="subject" />
                         <PolarRadiusAxis angle={30} domain={[0, 'auto']} />
                         <Radar name="Total Tasks" dataKey="A" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                         <Radar name="Completed" dataKey="B" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                         <Legend />
                         <Tooltip />
                      </RadarChart>
                   </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-6">Task Throughput by Department</h3>
                <div className="space-y-4">
                   {deptData.map((d, i) => (
                      <div key={i} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50">
                          <div className="flex items-center gap-3">
                             <div className={`p-2 rounded-lg ${
                                 d.subject === 'Creative' ? 'bg-purple-50 text-purple-600' : 
                                 d.subject === 'Production' ? 'bg-blue-50 text-blue-600' :
                                 'bg-slate-100 text-slate-600'
                             }`}>
                                 <Briefcase className="w-4 h-4" />
                             </div>
                             <span className="font-medium text-slate-900">{d.subject}</span>
                          </div>
                          <div className="text-right">
                             <span className="text-xs text-slate-500 block">Completion Rate</span>
                             <span className="text-sm font-bold text-indigo-600">
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
             <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium">
                   <tr>
                      <th className="px-6 py-4">Department</th>
                      <th className="px-6 py-4">Active Tasks</th>
                      <th className="px-6 py-4">Overdue</th>
                      <th className="px-6 py-4">Avg. Priority</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {Object.values(Department).map(dept => {
                      const deptTasks = tasks.filter(t => t.department === dept);
                      const active = deptTasks.filter(t => t.status !== 'completed' && t.status !== 'archived').length;
                      const overdue = deptTasks.filter(t => new Date(t.dueDate) < new Date() && t.status !== 'completed').length;
                      const highPriority = deptTasks.filter(t => t.priority === 'High' || t.priority === 'Critical').length;
                      
                      return (
                         <tr key={dept} className="hover:bg-slate-50">
                            <td className="px-6 py-4 font-medium text-slate-900">{dept}</td>
                            <td className="px-6 py-4">{active}</td>
                            <td className="px-6 py-4">
                               {overdue > 0 ? <span className="text-rose-600 font-bold">{overdue}</span> : <span className="text-emerald-500">0</span>}
                            </td>
                            <td className="px-6 py-4 text-slate-500">{highPriority} High/Crit</td>
                         </tr>
                      )
                   })}
                </tbody>
             </table>
         </div>
     </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics & Reporting</h1>
          <p className="text-slate-500 mt-1">Strategic insights and performance monitoring.</p>
        </div>
      </div>

      <div className="border-b border-slate-200">
        <nav className="flex space-x-6">
          {['Executive', 'Financial', 'Projects', 'Departments'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'Executive' && <Activity className="w-4 h-4"/>}
              {tab === 'Financial' && <DollarSign className="w-4 h-4"/>}
              {tab === 'Projects' && <Briefcase className="w-4 h-4"/>}
              {tab === 'Departments' && <Users className="w-4 h-4"/>}
              {tab} Dashboard
            </button>
          ))}
        </nav>
      </div>

      <div className="min-h-[500px]">
        {activeTab === 'Executive' && <ExecutiveView />}
        {activeTab === 'Financial' && <FinancialView />}
        {activeTab === 'Projects' && <ProjectsView />}
        {activeTab === 'Departments' && <DepartmentsView />}
      </div>
    </div>
  );
};

export default AnalyticsHub;
