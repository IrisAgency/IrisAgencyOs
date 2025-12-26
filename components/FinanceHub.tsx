import React, { useState } from 'react';
import { Project, Invoice, Quotation, Payment, Expense, Client, QuotationItem, InvoiceItem } from '../types';
import {
    DollarSign, CreditCard, PieChart as PieIcon, FileText, Plus, Search,
    MoreHorizontal, Download, CheckCircle, AlertCircle, X, ChevronRight,
    TrendingUp, Activity, Briefcase, Calendar, User
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import Modal from './common/Modal';
import PageContainer from './layout/PageContainer';
import PageHeader from './layout/PageHeader';
import PageContent from './layout/PageContent';

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
        // Get brand colors from CSS variables
        const getBrandColor = (varName: string, fallback: string) => {
            if (typeof window !== 'undefined') {
                return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || fallback;
            }
            return fallback;
        };
        const COLORS = ['#10b981', getBrandColor('--brand-accent', '#f59e0b')];

        // Mock Monthly Data
        const dataBar = [
            { name: 'Jan', revenue: 12000, expenses: 8000 },
            { name: 'Feb', revenue: 19000, expenses: 12000 },
            { name: 'Mar', revenue: 15000, expenses: 9000 },
            { name: 'Apr', revenue: 24000, expenses: 14000 },
            { name: 'May', revenue: totalRevenue, expenses: totalExpenses }, // current roughly
        ];

        return (
            <div className="space-y-4 md:space-y-6 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-slate-500">Total Revenue</h3>
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><DollarSign className="w-4 h-4" /></div>
                        </div>
                        <p className="text-3xl font-bold text-slate-900">${(totalRevenue || 0).toLocaleString()}</p>
                        <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> +8% vs last month</p>
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
                        <p className="text-xs text-slate-400 mt-2">{totalRevenue > 0 ? ((totalExpenses / totalRevenue) * 100).toFixed(1) : 0}% of revenue</p>
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

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                    <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-900 mb-4 md:mb-6 text-sm md:text-base">Revenue vs Expenses</h3>
                        <div className="overflow-x-auto"><div className="min-w-[350px] h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={dataBar}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val / 1000}k`} />
                                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Legend />
                                    <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Revenue" />
                                    <Bar dataKey="expenses" fill={getComputedStyle(document.documentElement).getPropertyValue('--brand-primary').trim() || '#f43f5e'} radius={[4, 4, 0, 0]} name="Expenses" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div></div>
                    </div>

                    <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-900 mb-4 md:mb-6 text-sm md:text-base">Cashflow Distribution</h3>
                        <div className="overflow-x-auto"><div className="min-w-[300px] h-64 w-full">
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
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div></div>
                        <div className="text-center -mt-6">
                            <p className="text-xs md:text-sm text-slate-500">Collection Rate</p>
                            <p className="text-lg md:text-xl font-bold text-slate-800">{Math.round((totalRevenue / totalInvoiced) * 100)}%</p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {quotations.length === 0 ? (
                    <div className="col-span-full p-8 text-center text-slate-400">
                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No quotations created yet.</p>
                    </div>
                ) : (
                    quotations.map(q => {
                        const client = clients.find(c => c.id === q.clientId);
                        const project = projects.find(p => p.id === q.projectId);
                        return (
                            <div key={q.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-mono text-sm text-slate-600 mb-1">{q.quotationNumber}</p>
                                        <h4 className="font-semibold text-slate-900 truncate">{client?.name}</h4>
                                        <p className="text-xs text-slate-500 truncate">{project?.name}</p>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize flex-shrink-0 ml-2 ${q.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                                        q.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                                            'bg-slate-100 text-slate-600'
                                        }`}>
                                        {q.status}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                    <span className="text-xs text-slate-500">{new Date(q.date).toLocaleDateString()}</span>
                                    <span className="font-bold text-slate-900">${(q.total || 0).toLocaleString()}</span>
                                </div>
                            </div>
                        );
                    })
                )}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {invoices.length === 0 ? (
                    <div className="col-span-full p-8 text-center text-slate-400">
                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No invoices generated yet.</p>
                    </div>
                ) : (
                    invoices.map(inv => {
                        const client = clients.find(c => c.id === inv.clientId);
                        return (
                            <div key={inv.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-mono text-sm text-slate-600 mb-1">{inv.invoiceNumber}</p>
                                        <h4 className="font-semibold text-slate-900 truncate">{client?.name || inv.client}</h4>
                                        <p className="text-xs text-slate-500">Due: {new Date(inv.dueDate).toLocaleDateString()}</p>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize flex-shrink-0 ml-2 ${inv.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                                        inv.status === 'overdue' ? 'bg-rose-100 text-rose-800' :
                                            inv.status === 'partially_paid' ? 'bg-blue-100 text-blue-800' :
                                                'bg-amber-100 text-amber-800'
                                        }`}>
                                        {inv.status.replace('_', ' ')}
                                    </span>
                                </div>
                                <div className="space-y-2 py-3 border-t border-slate-100">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">Amount</span>
                                        <span className="font-semibold text-slate-900">${(inv.total || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">Balance</span>
                                        <span className="font-semibold text-slate-900">${(inv.balance || 0).toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2 pt-3 border-t border-slate-100">
                                    <button className="flex-1 text-indigo-600 hover:bg-indigo-50 py-2 rounded text-sm font-medium transition-colors" title="View">
                                        <FileText className="w-4 h-4 mx-auto" />
                                    </button>
                                    {inv.balance > 0 && (
                                        <button
                                            onClick={() => { setModalType('Payment'); setIsModalOpen(true); }}
                                            className="flex-1 text-emerald-600 hover:bg-emerald-50 py-2 rounded text-sm font-medium transition-colors"
                                            title="Record Payment"
                                        >
                                            <DollarSign className="w-4 h-4 mx-auto" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {payments.length === 0 ? (
                    <div className="col-span-full p-8 text-center text-slate-400">
                        <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No payments recorded yet.</p>
                    </div>
                ) : (
                    payments.map(p => {
                        const client = clients.find(c => c.id === p.clientId);
                        const invoice = invoices.find(i => i.id === p.invoiceId);
                        return (
                            <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-mono text-xs text-slate-500 mb-1">{p.reference}</p>
                                        <h4 className="font-semibold text-slate-900 truncate">{client?.name}</h4>
                                        <p className="text-xs text-indigo-600 truncate">{invoice?.invoiceNumber}</p>
                                    </div>
                                    <span className="font-bold text-lg text-emerald-600 flex-shrink-0 ml-2">+${(p.amount || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                    <span className="text-xs capitalize text-slate-600">{p.method.replace('_', ' ')}</span>
                                    <span className="text-xs text-slate-500">{new Date(p.date).toLocaleDateString()}</span>
                                </div>
                            </div>
                        );
                    })
                )}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {expenses.length === 0 ? (
                    <div className="col-span-full p-8 text-center text-slate-400">
                        <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No expenses recorded.</p>
                    </div>
                ) : (
                    expenses.map(e => {
                        const project = projects.find(p => p.id === e.projectId);
                        return (
                            <div key={e.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-slate-900 truncate">{e.vendor}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600 capitalize">{e.category}</span>
                                            <span className="text-xs text-slate-500">{project?.name || 'General'}</span>
                                        </div>
                                    </div>
                                    <span className="font-bold text-lg text-rose-600 flex-shrink-0 ml-2">-${(e.amount || 0).toLocaleString()}</span>
                                </div>
                                <p className="text-sm text-slate-600 mb-2 line-clamp-2">{e.description}</p>
                                <div className="pt-3 border-t border-slate-100">
                                    <span className="text-xs text-slate-500">{new Date(e.date).toLocaleDateString()}</span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );

    return (
        <PageContainer>
            <PageHeader
                title="Financial Module"
                subtitle="Unified view of agency health, billings, and costs."
            />

            <div className="border-b border-slate-200">
                <nav className="flex space-x-6">
                    {['Dashboard', 'Quotations', 'Invoices', 'Payments', 'Expenses'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>

            <PageContent>
                {activeTab === 'Dashboard' && <DashboardView />}
                {activeTab === 'Quotations' && <QuotationsView />}
                {activeTab === 'Invoices' && <InvoicesView />}
                {activeTab === 'Payments' && <PaymentsView />}
                {activeTab === 'Expenses' && <ExpensesView />}
            </PageContent>

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
        </PageContainer>
    );
};

// --- Modal Sub-Component ---

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
                items: items.map(i => ({ ...i, total: i.quantity * i.unitPrice })),
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
                items: items.map(i => ({ ...i, total: i.quantity * i.unitPrice })),
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
        <Modal
            isOpen={true} // Controlled by parent
            onClose={onClose}
            title={`New ${type}`}
            size="2xl"
        >
            <form onSubmit={handleSubmit} className="p-6">
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
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
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
                                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Reference #</label>
                                <input type="text" value={reference} onChange={e => setReference(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
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
                                <input type="text" value={vendor} onChange={e => setVendor(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="e.g. Adorama" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
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
                            <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                        </div>
                    </div>
                )}

                <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">Save {type}</button>
                </div>
            </form>
        </Modal>
    );
};

export default FinanceHub;
