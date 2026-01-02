import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
    title: string;
    value: string | number;
    subtext?: string;
    icon: React.ElementType;
    trend?: 'up' | 'down';
    color: string;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, subtext, icon: Icon, trend, color }) => (
    <div className="bg-iris-black/80 backdrop-blur-sm p-6 rounded-xl border border-iris-white/10 hover:border-iris-red/40 transition-all">
        <div className="flex justify-between items-start mb-4">
            <div>
                <p className="text-iris-white/70 text-sm font-medium">{title}</p>
                <h3 className="text-2xl font-bold text-iris-white mt-1">{value}</h3>
            </div>
            <div className={`p-2 rounded-lg ${color}`}>
                <Icon className="w-5 h-5" />
            </div>
        </div>
        {subtext && (
            <div className="flex items-center text-xs">
                {trend === 'up' && <TrendingUp className="w-3 h-3 text-emerald-500 mr-1" />}
                {trend === 'down' && <TrendingDown className="w-3 h-3 text-rose-500 mr-1" />}
                <span className="text-iris-white/40">{subtext}</span>
            </div>
        )}
    </div>
);

export default KPICard;
