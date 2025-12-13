import React from 'react';

interface TaskStatsCardProps {
  completionRate: number;
  unfinishedRate: number;
}

const TaskStatsCard: React.FC<TaskStatsCardProps> = ({
  completionRate,
  unfinishedRate,
}) => {
  const circumference = 2 * Math.PI * 15.9155;
  const completedDashArray = `${(completionRate / 100) * circumference}, ${circumference}`;

  return (
    <div className="flex flex-col items-center justify-center bg-iris-black rounded-2xl p-6 text-iris-white">
      <h3 className="text-lg font-bold text-iris-white mb-4">Task Statistics</h3>
      <div className="relative w-32 h-32 mb-4">
        <svg className="w-full h-full" viewBox="0 0 36 36">
          <path
            className="stroke-current text-iris-white/20"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            strokeWidth="3"
          />
          <path
            className="stroke-current text-iris-red"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            strokeDasharray={completedDashArray}
            strokeLinecap="round"
            strokeWidth="3"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-iris-white">{completionRate}%</span>
          <span className="text-sm text-iris-red font-semibold">
            {completionRate >= 75 ? 'Great Result' : completionRate >= 50 ? 'Good Progress' : 'Keep Going'}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-around w-full text-sm">
        <div className="text-center">
          <div className="flex items-center gap-2 justify-center">
            <div className="w-3 h-3 bg-iris-red rounded-full"></div>
            <span className="text-iris-white/70">Completed</span>
          </div>
          <div className="text-2xl font-bold text-iris-white mt-1">{completionRate}%</div>
        </div>
        <div className="text-center">
          <div className="flex items-center gap-2 justify-center">
            <div className="w-3 h-3 bg-iris-white/20 rounded-full"></div>
            <span className="text-iris-white/70">Unfinished</span>
          </div>
          <div className="text-2xl font-bold text-iris-white mt-1">{unfinishedRate}%</div>
        </div>
      </div>
    </div>
  );
};

export default TaskStatsCard;
