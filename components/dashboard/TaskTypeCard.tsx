import React from 'react';

interface TaskTypeCardProps {
  typeDistribution: Record<string, number>;
  taskTypeColors: Record<string, { bg: string; light: string; text: string }>;
}

const TaskTypeCard: React.FC<TaskTypeCardProps> = ({
  typeDistribution,
  taskTypeColors,
}) => {
  const total = Object.values(typeDistribution).reduce((a: number, b: number) => a + b, 0) || 1;
  const entries = Object.entries(typeDistribution);

  // Calculate donut chart segments
  const segments = entries.map(([type, count], idx) => {
    const percentage = ((count as number) / (total as number)) * 100;
    const prevPercentages = entries
      .slice(0, idx)
      .reduce((sum: number, [, c]) => sum + ((c as number) / (total as number)) * 100, 0);

    return { type, count, percentage, offset: prevPercentages };
  });

  return (
    <div className="flex flex-col items-center justify-center bg-iris-black rounded-2xl p-6 text-iris-white">
      <h3 className="text-lg font-bold text-iris-white mb-4">Task Types</h3>
      <div className="flex items-center gap-6">
        {/* Donut Chart */}
        <div className="relative w-28 h-28">
          <svg className="w-full h-full" transform="rotate(-90)" viewBox="0 0 36 36">
            {segments.map(({ type, percentage, offset }, idx) => {
              const colors = taskTypeColors[type] || taskTypeColors.other;
              const circumference = 2 * Math.PI * 15.9155;
              const dashArray = `${(percentage / 100) * circumference}, ${circumference}`;
              const dashOffset = -((offset / 100) * circumference);

              return (
                <circle
                  key={type}
                  className={`stroke-current ${
                    idx === 0
                      ? 'text-iris-red'
                      : idx === 1
                      ? 'text-iris-white'
                      : idx === 2
                      ? 'text-iris-red opacity-60'
                      : idx === 3
                      ? 'text-iris-white opacity-60'
                      : 'text-iris-red opacity-30'
                  }`}
                  cx="18"
                  cy="18"
                  fill="none"
                  r="15.9155"
                  strokeDasharray={dashArray}
                  strokeDashoffset={dashOffset}
                  strokeWidth="4"
                />
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <ul className="text-sm space-y-1">
          {segments.map(({ type, count, percentage }, idx) => (
            <li key={type} className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  idx === 0
                    ? 'bg-iris-red'
                    : idx === 1
                    ? 'bg-iris-white'
                    : idx === 2
                    ? 'bg-iris-red opacity-60'
                    : idx === 3
                    ? 'bg-iris-white opacity-60'
                    : 'bg-iris-red opacity-30'
                }`}
              ></span>
              <span className="capitalize text-iris-white">{type}</span>
              <span className="ml-auto font-semibold text-iris-white">
                {Math.round(percentage)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default TaskTypeCard;
