import React from 'react';

interface Stat {
  label: string;
  value: number | string;
  hint?: string;
}

interface TaskStatsRowProps {
  stats: Stat[];
}

const TaskStatsRow: React.FC<TaskStatsRowProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border border-[color:var(--dash-glass-border)] bg-[color:var(--dash-surface-elevated)]/70 px-4 py-3 shadow-[0_14px_32px_-26px_rgba(0,0,0,0.9)]"
        >
          <div className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">{stat.label}</div>
          <div className="text-2xl font-semibold text-white mt-1">{stat.value}</div>
          {stat.hint && <div className="text-[11px] text-slate-500 mt-1">{stat.hint}</div>}
        </div>
      ))}
    </div>
  );
};

export default TaskStatsRow;
