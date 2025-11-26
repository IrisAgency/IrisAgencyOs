
import React, { useState } from 'react';
import { Project, Invoice, Quotation, Payment, Expense, Client, QuotationItem, InvoiceItem } from '../types';
import { 
  DollarSign, CreditCard, PieChart as PieIcon, FileText, Plus, Search, 
  MoreHorizontal, Download, CheckCircle, AlertCircle, X, ChevronRight, 
  TrendingUp, Activity, Briefcase, Calendar, User
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface FinanceHubProps {
  invoices: Invoice[];
  quotations: Quotation[];
  payments: Payment[];
  expenses: Expense[];
  projects: Project[];
  clients: Client[];
  onAddInvoice: (inv: Invoice) => void;
  onUpdateInvoice: (inv: Invoice) => void;
  onAddQuotation: (quo: Quotation) => void;
  onUpdateQuotation: (quo: Quotation) => void;
  onAddPayment: (pay: Payment) => void;
  onAddExpense: (exp: Expense) => void;
}

const FinanceHub: React.FC<FinanceHubProps> = ({ 
  invoices, quotations, payments, expenses, projects, clients, 
  onAddInvoice, onUpdateInvoice, onAddQuotation, onUpdateQuotation, onAddPayment, onAddExpense 
}) => {
  const [activeTab, setActiveTab] = useState<'Dashboard' | 'Quotations' | 'Invoices' | 'Payments' | 'Expenses'>('Dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<string>('');

  // --- Sub-Components (Views) ---

  const DashboardView = () => {
    // Metrics
    const totalRevenue = payments.reduce((acc, curr) => acc + curr.amount, 0);
    const totalInvoiced = invoices.reduce((acc, curr) => acc + curr.total, 0);
    const totalOutstanding = invoices.reduce((acc, curr) => acc + curr.balance, 0);
    const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    const profit = totalRevenue - totalExpenses;

    const dataPie = [
      { name: 'Revenue', value: totalRevenue },
      { name: 'Outstanding', value: totalOutstanding },
    ];
    const COLORS = ['#10b981', '#f59e0b'];

    // Mock Monthly Data
    const dataBar = [
        { name: 'Jan', revenue: 12000, expenses: 8000 },
        { name: 'Feb', revenue: 19000, expenses: 12000 },
        { name: 'Mar', revenue: 15000, expenses: 9000 },
        { name: 'Apr', revenue: 24000, expenses: 14000 },
        { name: 'May', revenue: totalRevenue, expenses: totalExpenses }, // current roughly
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-slate-500">Total Revenue</h3>
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><DollarSign className="w-4 h-4" /></div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">${(totalRevenue || 0).toLocaleString()}</p>
                    <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1"><TrendingUp className="w-3 h-3"/> +8% vs last month</p>
                </div>
                 <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-slate-500">Outstanding</h3>
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><AlertCircle className="w-4 h-4" /></div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">${(totalOutstanding || 0).toLocaleString()}</p>
                    <p className="text-xs text-slate-400 mt-2">Across {invoices.filter(i => i.balance > 0).length} invoices</p>
                </div>
                 <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-slate-500">Expenses</h3>
                        <div className="p-2 bg-rose-50 text-rose-600 rounded-lg"><Activity className="w-4 h-4" /></div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">${(totalExpenses || 0).toLocaleString()}</p>
                    <p className="text-xs text-slate-400 mt-2">{totalRevenue > 0 ? ((totalExpenses/totalRevenue)*100).toFixed(1) : 0}% of revenue</p>
                </div>
                 <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-slate-500">Net Profit</h3>
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><PieIcon className="w-4 h-4" /></div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">${(profit || 0).toLocaleString()}</p>
                    <p className="text-xs text-indigo-600 mt-2">Healthy Margin</p>
                </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-6">Revenue vs Expenses</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dataBar}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val/1000}k`} />
                                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                <Legend />
                                <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Revenue" />
                                <Bar dataKey="expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Expenses" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                 <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-6">Cashflow Distribution</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={dataPie}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {dataPie.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="text-center -mt-6">
                         <p className="text-sm text-slate-500">Collection Rate</p>
                         <p className="text-xl font-bold text-slate-800">{Math.round((totalRevenue/totalInvoiced)*100)}%</p>
                    </div>
                </div>
             </div>
        </div>
    );
  };

  const QuotationsView = () => (
      <div className="space-y-6 animate-in fade-in duration-300">
           <div className="flex justify-between items-center">
              <div>
                  <h3 className="text-lg font-bold text-slate-900">Quotations</h3>
                  <p className="text-sm text-slate-500">Manage client proposals and estimates.</p>
              </div>
              <button onClick={() => { setModalType('Quotation'); setIsModalOpen(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2">
                  <Plus className="w-4 h-4" /> New Quote
              </button>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-medium">
                      <tr>
                          <th className="px-6 py-4">Quote #</th>
                          <th className="px-6 py-4">Client & Project</th>
                          <th className="px-6 py-4">Date</th>
                          <th className="px-6 py-4">Total</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {quotations.map(q => {
                          const client = clients.find(c => c.id === q.clientId);
                          const project = projects.find(p => p.id === q.projectId);
                          return (
                              <tr key={q.id} className="hover:bg-slate-50">
                                  <td className="px-6 py-4 font-mono text-slate-600">{q.quotationNumber}</td>
                                  <td className="px-6 py-4">
                                      <p className="font-medium text-slate-900">{client?.name}</p>
                                      <p className="text-xs text-slate-500">{project?.name}</p>
                                  </td>
                                  <td className="px-6 py-4 text-slate-500">{new Date(q.date).toLocaleDateString()}</td>
                                  <td className="px-6 py-4 font-medium text-slate-900">${(q.total || 0).toLocaleString()}</td>
                                  <td className="px-6 py-4">
                                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                                          q.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                                          q.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                                          'bg-slate-100 text-slate-600'
                                      }`}>
                                          {q.status}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                      <button className="text-slate-400 hover:text-indigo-600"><MoreHorizontal className="w-5 h-5" /></button>
                                  </td>
                              </tr>
                          );
                      })}
                  </tbody>
              </table>
          </div>
      </div>
  );

  const InvoicesView = () => (
      <div className="space-y-6 animate-in fade-in duration-300">
           <div className="flex justify-between items-center">
              <div>
                  <h3 className="text-lg font-bold text-slate-900">Invoices</h3>
                  <p className="text-sm text-slate-500">Track billings and payments.</p>
              </div>
              <button onClick={() => { setModalType('Invoice'); setIsModalOpen(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Create Invoice
              </button>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
               <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-medium">
                      <tr>
                          <th className="px-6 py-4">Invoice #</th>
                          <th className="px-6 py-4">Client</th>
                          <th className="px-6 py-4">Due Date</th>
                          <th className="px-6 py-4">Amount</th>
                          <th className="px-6 py-4">Balance</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {invoices.map(inv => {
                          const client = clients.find(c => c.id === inv.clientId);
                           return (
                              <tr key={inv.id} className="hover:bg-slate-50 group">
                                  <td className="px-6 py-4 font-mono text-slate-600">{inv.invoiceNumber}</td>
                                  <td className="px-6 py-4 font-medium text-slate-900">{client?.name || inv.client}</td>
                                  <td className="px-6 py-4 text-slate-500">{new Date(inv.dueDate).toLocaleDateString()}</td>
                                  <td className="px-6 py-4 font-medium text-slate-900">${(inv.total || 0).toLocaleString()}</td>
                                  <td className="px-6 py-4 text-slate-500">${(inv.balance || 0).toLocaleString()}</td>
                                  <td className="px-6 py-4">
                                       <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                                          inv.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                                          inv.status === 'overdue' ? 'bg-rose-100 text-rose-800' :
                                          inv.status === 'partially_paid' ? 'bg-blue-100 text-blue-800' :
                                          'bg-amber-100 text-amber-800'
                                      }`}>
                                          {inv.status.replace('_', ' ')}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button className="text-slate-400 hover:text-indigo-600" title="View"><FileText className="w-4 h-4" /></button>
                                      {inv.balance > 0 && (
                                         <button 
                                            className="text-slate-400 hover:text-emerald-600" 
                                            title="Record Payment"
                                            onClick={() => { setModalType('Payment'); setIsModalOpen(true); }}
                                         >
                                             <DollarSign className="w-4 h-4" />
                                         </button>
                                      )}
                                  </td>
                              </tr>
                          );
                      })}
                  </tbody>
              </table>
          </div>
      </div>
  );

  const PaymentsView = () => (
      <div className="space-y-6 animate-in fade-in duration-300">
           <div className="flex justify-between items-center">
              <div>
                  <h3 className="text-lg font-bold text-slate-900">Payments Received</h3>
                  <p className="text-sm text-slate-500">History of all incoming transactions.</p>
              </div>
              <button onClick={() => { setModalType('Payment'); setIsModalOpen(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Record Payment
              </button>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
               <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-medium">
                      <tr>
                          <th className="px-6 py-4">Ref #</th>
                          <th className="px-6 py-4">Date</th>
                          <th className="px-6 py-4">Client</th>
                          <th className="px-6 py-4">Invoice</th>
                          <th className="px-6 py-4">Method</th>
                          <th className="px-6 py-4 text-right">Amount</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {payments.map(pay => {
                          const client = clients.find(c => c.id === pay.clientId);
                          const invoice = invoices.find(i => i.id === pay.invoiceId);
                          return (
                              <tr key={pay.id} className="hover:bg-slate-50">
                                  <td className="px-6 py-4 font-mono text-slate-600 text-xs">{pay.reference}</td>
                                  <td className="px-6 py-4 text-slate-500">{new Date(pay.date).toLocaleDateString()}</td>
                                  <td className="px-6 py-4 font-medium text-slate-900">{client?.name}</td>
                                  <td className="px-6 py-4 text-indigo-600 text-xs">{invoice?.invoiceNumber}</td>
                                  <td className="px-6 py-4 capitalize text-slate-600">{pay.method.replace('_', ' ')}</td>
                                  <td className="px-6 py-4 text-right font-bold text-emerald-600">+${(pay.amount || 0).toLocaleString()}</td>
                              </tr>
                          );
                      })}
                  </tbody>
              </table>
          </div>
      </div>
  );

  const ExpensesView = () => (
      <div className="space-y-6 animate-in fade-in duration-300">
           <div className="flex justify-between items-center">
              <div>
                  <h3 className="text-lg font-bold text-slate-900">Expenses</h3>
                  <p className="text-sm text-slate-500">Track vendor costs and operational spending.</p>
              </div>
              <button onClick={() => { setModalType('Expense'); setIsModalOpen(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Add Expense
              </button>
          </div>
           <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
               <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-medium">
                      <tr>
                          <th className="px-6 py-4">Date</th>
                          <th className="px-6 py-4">Vendor</th>
                          <th className="px-6 py-4">Category</th>
                          <th className="px-6 py-4">Project</th>
                          <th className="px-6 py-4">Description</th>
                          <th className="px-6 py-4 text-right">Amount</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {expenses.map(exp => {
                          const project = projects.find(p => p.id === exp.projectId);
                          return (
                              <tr key={exp.id} className="hover:bg-slate-50">
                                  <td className="px-6 py-4 text-slate-500">{new Date(exp.date).toLocaleDateString()}</td>
                                  <td className="px-6 py-4 font-medium text-slate-900">{exp.vendor}</td>
                                  <td className="px-6 py-4">
                                      <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600 capitalize">{exp.category}</span>
                                  </td>
                                  <td className="px-6 py-4 text-xs text-slate-500">{project?.name || 'General'}</td>
                                  <td className="px-6 py-4 text-slate-600 truncate max-w-[200px]">{exp.description}</td>
                                  <td className="px-6 py-4 text-right font-medium text-rose-600">-${(exp.amount || 0).toLocaleString()}</td>
                              </tr>
                          );
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
          <h1 className="text-2xl font-bold text-slate-900">Financial Module</h1>
          <p className="text-slate-500 mt-1">Unified view of agency health, billings, and costs.</p>
        </div>
      </div>

       <div className="border-b border-slate-200">
        <nav className="flex space-x-6">
          {['Dashboard', 'Quotations', 'Invoices', 'Payments', 'Expenses'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      <div className="min-h-[500px]">
          {activeTab === 'Dashboard' && <DashboardView />}
          {activeTab === 'Quotations' && <QuotationsView />}
          {activeTab === 'Invoices' && <InvoicesView />}
          {activeTab === 'Payments' && <PaymentsView />}
          {activeTab === 'Expenses' && <ExpensesView />}
      </div>

      {/* Modal Container */}
      {isModalOpen && (
          <FinanceModal 
            type={modalType} 
            onClose={() => setIsModalOpen(false)} 
            projects={projects}
            clients={clients}
            invoices={invoices}
            // Passing handlers
            onAddInvoice={onAddInvoice}
            onAddQuotation={onAddQuotation}
            onAddPayment={onAddPayment}
            onAddExpense={onAddExpense}
          />
      )}
    </div>
  );
};

// --- Modal Component ---

interface FinanceModalProps {
    type: string;
    onClose: () => void;
    projects: Project[];
    clients: Client[];
    invoices: Invoice[];
    onAddInvoice: (i: Invoice) => void;
    onAddQuotation: (q: Quotation) => void;
    onAddPayment: (p: Payment) => void;
    onAddExpense: (e: Expense) => void;
}

const FinanceModal: React.FC<FinanceModalProps> = ({ 
    type, onClose, projects, clients, invoices, 
    onAddInvoice, onAddQuotation, onAddPayment, onAddExpense 
}) => {
    // Shared Form State
    const [clientId, setClientId] = useState('');
    const [projectId, setProjectId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [amount, setAmount] = useState('');
    
    // Line Item State (Quote/Invoice)
    const [items, setItems] = useState<any[]>([{ id: Date.now(), description: '', quantity: 1, unitPrice: 0 }]);
    
    // Payment specific
    const [invoiceId, setInvoiceId] = useState('');
    const [method, setMethod] = useState('bank_transfer');
    const [reference, setReference] = useState('');

    // Expense specific
    const [vendor, setVendor] = useState('');
    const [category, setCategory] = useState('production');
    const [description, setDescription] = useState('');

    const addItem = () => {
        setItems([...items, { id: Date.now(), description: '', quantity: 1, unitPrice: 0 }]);
    };

    const updateItem = (id: number, field: string, value: any) => {
        setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (type === 'Quotation') {
            const total = items.reduce((acc, i) => acc + (i.quantity * i.unitPrice), 0);
            const newQuote: Quotation = {
                id: `q${Date.now()}`,
                quotationNumber: `QUO-${Date.now().toString().substr(-4)}`,
                clientId,
                projectId,
                date,
                items: items.map(i => ({...i, total: i.quantity * i.unitPrice})),
                subtotal: total,
                discount: 0,
                tax: total * 0.1, // mock tax
                total: total * 1.1,
                status: 'draft',
                notes: '',
                createdBy: 'u1', // mock user
                createdAt: new Date().toISOString()
            };
            onAddQuotation(newQuote);

        } else if (type === 'Invoice') {
             const total = items.reduce((acc, i) => acc + (i.quantity * i.unitPrice), 0);
             const newInvoice: Invoice = {
                 id: `inv${Date.now()}`,
                 invoiceNumber: `INV-${Date.now().toString().substr(-4)}`,
                 clientId,
                 projectId,
                 date,
                 dueDate: date, // simplify
                 items: items.map(i => ({...i, total: i.quantity * i.unitPrice})),
                 subtotal: total,
                 discount: 0,
                 tax: total * 0.1,
                 total: total * 1.1,
                 paid: 0,
                 balance: total * 1.1,
                 status: 'sent',
                 notes: '',
                 createdBy: 'u1',
                 createdAt: new Date().toISOString(),
                 client: clients.find(c => c.id === clientId)?.name
             };
             onAddInvoice(newInvoice);

        } else if (type === 'Payment') {
            const inv = invoices.find(i => i.id === invoiceId);
            const newPayment: Payment = {
                id: `pay${Date.now()}`,
                paymentNumber: `PAY-${Date.now().toString().substr(-4)}`,
                clientId: inv?.clientId || '',
                projectId: inv?.projectId || '',
                invoiceId,
                amount: parseFloat(amount),
                date,
                method: method as any,
                reference,
                note: '',
                createdBy: 'u1'
            };
            onAddPayment(newPayment);

        } else if (type === 'Expense') {
            const newExpense: Expense = {
                id: `exp${Date.now()}`,
                projectId: projectId || null,
                vendor,
                amount: parseFloat(amount),
                date,
                category,
                description,
                createdBy: 'u1'
            };
            onAddExpense(newExpense);
        }

        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
               <h2 className="text-lg font-bold text-slate-900">New {type}</h2>
               <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
             </div>
             
             <form onSubmit={handleSubmit} className="p-6 max-h-[80vh] overflow-y-auto">
                 {/* Common Fields */}
                 <div className="grid grid-cols-2 gap-4 mb-4">
                     {type !== 'Expense' && (
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Client</label>
                            <select required value={clientId} onChange={e => setClientId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                                <option value="">Select Client</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                         </div>
                     )}
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Project</label>
                        <select value={projectId} onChange={e => setProjectId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                            <option value="">Select Project</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg"/>
                     </div>
                 </div>

                 {/* Quote & Invoice Line Items */}
                 {(type === 'Quotation' || type === 'Invoice') && (
                     <div className="mb-4">
                         <label className="block text-sm font-medium text-slate-700 mb-2">Line Items</label>
                         <div className="space-y-2">
                             {items.map((item, idx) => (
                                 <div key={item.id} className="flex gap-2 items-center">
                                     <input 
                                        type="text" placeholder="Description" 
                                        value={item.description} 
                                        onChange={e => updateItem(item.id, 'description', e.target.value)}
                                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" 
                                     />
                                     <input 
                                        type="number" placeholder="Qty" 
                                        value={item.quantity} 
                                        onChange={e => updateItem(item.id, 'quantity', parseInt(e.target.value))}
                                        className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-sm" 
                                     />
                                     <input 
                                        type="number" placeholder="Price" 
                                        value={item.unitPrice} 
                                        onChange={e => updateItem(item.id, 'unitPrice', parseFloat(e.target.value))}
                                        className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm" 
                                     />
                                 </div>
                             ))}
                         </div>
                         <button type="button" onClick={addItem} className="mt-2 text-sm text-indigo-600 font-medium hover:underline">+ Add Item</button>
                     </div>
                 )}

                 {/* Payment Specific */}
                 {type === 'Payment' && (
                     <div className="space-y-4">
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Invoice</label>
                            <select required value={invoiceId} onChange={e => setInvoiceId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                                <option value="">Select Invoice to Pay</option>
                                {invoices.filter(i => i.balance > 0).map(i => (
                                    <option key={i.id} value={i.id}>{i.invoiceNumber} - ${i.balance} Remaining</option>
                                ))}
                            </select>
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg"/>
                             </div>
                             <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Reference #</label>
                                <input type="text" value={reference} onChange={e => setReference(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg"/>
                             </div>
                         </div>
                     </div>
                 )}

                 {/* Expense Specific */}
                 {type === 'Expense' && (
                     <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Vendor</label>
                                <input type="text" value={vendor} onChange={e => setVendor(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="e.g. Adorama"/>
                             </div>
                             <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg"/>
                             </div>
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                             <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                                <option value="production">Production</option>
                                <option value="equipment">Equipment</option>
                                <option value="location">Location</option>
                                <option value="travel">Travel</option>
                                <option value="other">Other</option>
                             </select>
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                             <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg"/>
                        </div>
                     </div>
                 )}

                 <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end gap-3">
                     <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
                     <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">Save {type}</button>
                 </div>
             </form>
          </div>
        </div>
    );
};

export default FinanceHub;
