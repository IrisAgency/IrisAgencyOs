import React from 'react';

interface ActivityCardProps {
  weeklyActivity: Array<{ week: string; count: number }>;
}

const ActivityCard: React.FC<ActivityCardProps> = ({ weeklyActivity }) => {
  // Return empty state if data is not loaded yet
  if (!weeklyActivity || weeklyActivity.length === 0) {
    return (
      <div className="bg-iris-black rounded-2xl p-6 text-iris-white">
        <h3 className="text-lg font-bold text-iris-white mb-2">Your Activity</h3>
        <p className="text-sm text-iris-white/70 text-center py-8">No activity data available</p>
      </div>
    );
  }

  const maxCount = Math.max(...weeklyActivity.map((w) => w.count), 1);
  const totalThisWeek = weeklyActivity[weeklyActivity.length - 1]?.count || 0;
  const totalLastWeek = weeklyActivity[weeklyActivity.length - 2]?.count || 0;
  const percentChange =
    totalLastWeek > 0
      ? Math.round(((totalThisWeek - totalLastWeek) / totalLastWeek) * 100)
      : 0;

  return (
    <div className="bg-iris-black rounded-2xl p-6 text-iris-white">
      <h3 className="text-lg font-bold text-iris-white mb-2">Your Activity</h3>
      <p className="text-sm bg-iris-red/20 text-iris-red font-medium px-3 py-1 rounded-full inline-block mb-3">
        {percentChange >= 0 ? `+${percentChange}` : percentChange}% tasks closed last week
      </p>

      {/* Bar Chart */}
      <div className="flex items-end justify-between gap-2 h-24 mb-4">
        {weeklyActivity.map((week, idx) => {
          const height = (week.count / maxCount) * 100;
          const isCurrentWeek = idx === weeklyActivity.length - 1;

          return (
            <div
              key={idx}
              className="flex-1 flex flex-col items-center gap-2 group"
              title={`${week.week}: ${week.count} tasks`}
            >
              <div
                className={`w-full rounded-t-lg relative transition-all ${isCurrentWeek
                    ? 'bg-gradient-to-t from-iris-red to-iris-red/80'
                    : 'bg-gradient-to-t from-iris-white/40 to-iris-white/20'
                  } group-hover:from-iris-red group-hover:to-iris-red/80`}
                style={{ height: `${height}%`, minHeight: '8px' }}
              >
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-iris-white opacity-0 group-hover:opacity-100 transition-opacity">
                  {week.count}
                </div>
              </div>
              <span className="text-xs text-iris-white/70">{week.week}</span>
            </div>
          );
        })}
      </div>

      <div className="text-center text-xs text-iris-white/70">
        Tasks completed per week
      </div>
    </div>
  );
};

export default ActivityCard;
