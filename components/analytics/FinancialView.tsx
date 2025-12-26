import React from 'react';
import { Invoice, Payment, Expense, Client } from '../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import DataTable from '../common/DataTable';

interface FinancialViewProps {
    invoices: Invoice[];
    payments: Payment[];
    expenses: Expense[];
    clients: Client[];
    totalOutstanding: number;
}

const FinancialView: React.FC<FinancialViewProps> = ({
    invoices,
    payments,
    expenses,
    clients,
    totalOutstanding
}) => {
    return (
        <div className="space-y-4 md:space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <h3 className="text-slate-500 font-medium text-sm uppercase">Total Invoiced</h3>
                    <p className="text-3xl font-bold text-slate-900 my-2">${invoices.reduce((acc, i) => acc + i.total, 0).toLocaleString()}</p>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="h-full bg-iris-red" style={{ width: '100%' }}></div>
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                {/* Expense Breakdown */}
                <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-4 md:mb-6 text-sm md:text-base">Expense Distribution</h3>
                    <div className="overflow-x-auto">
                        <div className="min-w-[400px] h-64 w-full text-xs">
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
                                    <Tooltip formatter={(val: number) => `$${val.toLocaleString()}`} cursor={{ fill: 'transparent' }} />
                                    <Bar dataKey="value" fill={getComputedStyle(document.documentElement).getPropertyValue('--brand-primary').trim() || '#f43f5e'} radius={[0, 4, 4, 0]} name="Amount Spent" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Recent Payments Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 md:p-6 border-b border-slate-100">
                        <h3 className="font-bold text-slate-900 text-sm md:text-base">Recent Payments Received</h3>
                    </div>
                    <div className="flex-1">
                        <DataTable<Payment>
                            data={payments.slice(0, 5)} // Logic from previous component retained
                            keyExtractor={(p) => p.id}
                            emptyMessage="No recent payments."
                            columns={[
                                {
                                    header: 'Date',
                                    cell: (pay) => new Date(pay.date).toLocaleDateString()
                                },
                                {
                                    header: 'Client',
                                    cell: (pay) => clients.find(c => c.id === pay.clientId)?.name || 'Unknown'
                                },
                                {
                                    header: 'Amount',
                                    cell: (pay) => <span className="text-emerald-600 font-medium">+${pay.amount.toLocaleString()}</span>,
                                    className: 'text-right'
                                }
                            ]}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FinancialView;
