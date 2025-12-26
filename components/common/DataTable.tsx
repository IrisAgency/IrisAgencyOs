import React from 'react';
import { ChevronRight } from 'lucide-react';

export interface Column<T> {
    header: string;
    accessorKey?: keyof T;
    cell?: (item: T) => React.ReactNode;
    className?: string;
    headerClassName?: string;
}

interface DataTableProps<T> {
    data: T[];
    columns: Column<T>[];
    onRowClick?: (item: T) => void;
    isLoading?: boolean;
    emptyMessage?: string;
    keyExtractor: (item: T) => string;
}

const DataTable = <T,>({
    data,
    columns,
    onRowClick,
    isLoading = false,
    emptyMessage = 'No items found.',
    keyExtractor
}: DataTableProps<T>) => {

    if (isLoading) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center text-slate-400">
                Loading...
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium">
                        <tr>
                            {columns.map((col, idx) => (
                                <th
                                    key={idx}
                                    className={`px-6 py-4 ${col.headerClassName || ''}`}
                                >
                                    {col.header}
                                </th>
                            ))}
                            {onRowClick && <th className="px-6 py-4 text-right"></th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.length > 0 ? (
                            data.map((item) => (
                                <tr
                                    key={keyExtractor(item)}
                                    onClick={() => onRowClick?.(item)}
                                    className={`
                    transition-colors 
                    ${onRowClick ? 'cursor-pointer hover:bg-slate-50 group' : ''}
                  `}
                                >
                                    {columns.map((col, idx) => (
                                        <td
                                            key={idx}
                                            className={`px-6 py-4 ${col.className || ''}`}
                                        >
                                            {col.cell ? col.cell(item) : (col.accessorKey ? String(item[col.accessorKey]) : '')}
                                        </td>
                                    ))}
                                    {onRowClick && (
                                        <td className="px-6 py-4 text-right">
                                            <ChevronRight className="w-5 h-5 text-slate-300 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </td>
                                    )}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length + (onRowClick ? 1 : 0)} className="p-8 text-center text-slate-400">
                                    {emptyMessage}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DataTable;
