import React, { useState } from 'react';
import { Task, Project, Invoice, User, Payment, Expense, Client, Department } from '../types';
import { Activity, DollarSign, Briefcase, Users } from 'lucide-react';
import ExecutiveView from './analytics/ExecutiveView';
import FinancialView from './analytics/FinancialView';
import ProjectsView from './analytics/ProjectsView';
import DepartmentsView from './analytics/DepartmentsView';
import PageContainer from './layout/PageContainer';
import PageHeader from './layout/PageHeader';
import PageContent from './layout/PageContent';

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

   // Get brand colors from CSS variables with fallbacks
   const getBrandColor = (varName: string, fallback: string) => {
       if (typeof window !== 'undefined') {
           return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || fallback;
       }
       return fallback;
   };
   const COLORS = [
       getBrandColor('--brand-accent', '#6366f1'),
       '#10b981',
       '#f59e0b',
       getBrandColor('--brand-primary', '#ef4444'),
       '#8b5cf6',
       '#ec4899'
   ];

   return (
      <PageContainer>
         <PageHeader
            title="Analytics & Reporting"
            subtitle="Strategic insights and performance monitoring."
         />

         <div className="border-b border-slate-200">
            <nav className="flex space-x-6">
               {['Executive', 'Financial', 'Projects', 'Departments'].map(tab => (
                  <button
                     key={tab}
                     onClick={() => setActiveTab(tab as any)}
                     className={`py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                  >
                     {tab === 'Executive' && <Activity className="w-4 h-4" />}
                     {tab === 'Financial' && <DollarSign className="w-4 h-4" />}
                     {tab === 'Projects' && <Briefcase className="w-4 h-4" />}
                     {tab === 'Departments' && <Users className="w-4 h-4" />}
                     {tab} Dashboard
                  </button>
               ))}
            </nav>
         </div>

         <PageContent>
            {activeTab === 'Executive' && (
               <ExecutiveView
                  totalRevenue={totalRevenue}
                  netProfit={netProfit}
                  profitMargin={profitMargin}
                  totalOutstanding={totalOutstanding}
                  activeProjects={activeProjects}
                  atRiskProjects={atRiskProjects}
                  users={users}
                  monthlyData={monthlyData}
                  clientRevenue={clientRevenue}
                  COLORS={COLORS}
               />
            )}
            {activeTab === 'Financial' && (
               <FinancialView
                  invoices={invoices}
                  payments={payments}
                  expenses={expenses}
                  clients={clients}
                  totalOutstanding={totalOutstanding}
               />
            )}
            {activeTab === 'Projects' && (
               <ProjectsView
                  projects={projects}
                  tasks={tasks}
                  projectBurn={projectBurn}
                  COLORS={COLORS}
               />
            )}
            {activeTab === 'Departments' && (
               <DepartmentsView
                  tasks={tasks}
                  deptData={deptData}
               />
            )}
         </PageContent>
      </PageContainer>
   );
};

export default AnalyticsHub;
