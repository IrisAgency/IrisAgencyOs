import React, { useState } from 'react';
import { Calendar, List, Clock, CheckCircle2 } from 'lucide-react';
import { User, Department, TaskStatus } from '../../types';
import { DashboardTimelineItem } from '../../types/dashboard';

interface DashboardTimelineProps {
  viewMode: 'today' | 'week';
  weekDates: Date[];
  filteredItems: DashboardTimelineItem[];
  users: User[];
  taskTypeColors: Record<string, { bg: string; light: string; text: string; border?: string }>;
  onItemClick: (item: DashboardTimelineItem) => void;
}

const DashboardTimeline: React.FC<DashboardTimelineProps> = ({
  viewMode,
  weekDates,
  filteredItems,
  users,
  taskTypeColors,
  onItemClick,
}) => {
  const [displayMode, setDisplayMode] = useState<'timeline' | 'calendar'>('calendar');

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const handleItemClick = (item: DashboardTimelineItem) => {
    onItemClick(item);
  };

  const getTaskProgress = (item: DashboardTimelineItem): number => {
    if (item.type !== 'task') return 0;
    if (item.status === TaskStatus.COMPLETED) return 100;
    if (item.status === TaskStatus.IN_PROGRESS) {
      // Calculate based on time elapsed
      const now = new Date();
      const start = new Date(item.startTime);
      const end = new Date(item.endTime);
      const total = end.getTime() - start.getTime();
      const elapsed = now.getTime() - start.getTime();
      return Math.min(Math.max((elapsed / total) * 100, 10), 90);
    }
    return 0;
  };

  const renderCalendarView = () => {
    if (viewMode === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      return (
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-1 gap-3">
            {filteredItems.map((item) => {
              const progress = getTaskProgress(item);
              const colors = taskTypeColors[item.taskType || 'other'];
              
              return (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className="bg-iris-white/5 backdrop-blur-sm rounded-xl p-4 cursor-pointer hover:bg-iris-white/10 transition-all border border-iris-white/10"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-iris-red" />
                        <span className="text-sm font-medium text-iris-red">
                          {formatTime(item.startTime)} - {formatTime(item.endTime)}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-iris-white mb-1">{item.title}</h3>
                      <p className="text-xs text-iris-white/60">{item.department}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.type === 'task' && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.status === TaskStatus.COMPLETED 
                            ? 'bg-green-500/20 text-green-400' 
                            : item.status === TaskStatus.IN_PROGRESS
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-iris-white/10 text-iris-white/70'
                        }`}>
                          {item.status}
                        </span>
                      )}
                      {item.type === 'meeting' && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400">
                          Meeting
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar for Tasks */}
                  {item.type === 'task' && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs text-iris-white/60 mb-1">
                        <span>Progress</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full bg-iris-white/10 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            progress === 100 ? 'bg-green-500' : 'bg-iris-red'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Members */}
                  <div className="flex items-center gap-2">
                    {item.members.slice(0, 5).map((member, idx) => (
                      <img
                        key={idx}
                        src={member.avatarUrl}
                        alt={member.name}
                        className="w-6 h-6 rounded-full border-2 border-iris-white/20"
                        title={member.name}
                      />
                    ))}
                    {item.members.length > 5 && (
                      <span className="text-xs text-iris-white/60">
                        +{item.members.length - 5}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {filteredItems.length === 0 && (
              <div className="text-center py-12 text-iris-white/40">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No items scheduled for today</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Week Calendar View
    return (
      <div className="flex-1 overflow-auto">
        <div className="min-w-full">
          {/* Week Header */}
          <div className="grid grid-cols-7 gap-2 mb-4 sticky top-0 bg-iris-black z-10 pb-3">
            {weekDates.map((date, idx) => {
              const isToday = date.toDateString() === new Date().toDateString();
              return (
                <div
                  key={idx}
                  className={`text-center p-2 rounded-lg ${
                    isToday ? 'bg-iris-red text-iris-white' : 'text-iris-white/70'
                  }`}
                >
                  <div className="text-xs font-medium">
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className={`text-lg font-bold ${isToday ? 'text-iris-white' : 'text-iris-white'}`}>
                    {date.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {weekDates.map((date, dayIdx) => {
              const dayItems = filteredItems.filter((item) => {
                const itemDate = new Date(item.startTime);
                return (
                  itemDate.getDate() === date.getDate() &&
                  itemDate.getMonth() === date.getMonth()
                );
              });

              const isToday = date.toDateString() === new Date().toDateString();

              return (
                <div
                  key={dayIdx}
                  className={`min-h-[400px] rounded-xl p-3 ${
                    isToday 
                      ? 'bg-iris-red/10 border-2 border-iris-red' 
                      : 'bg-iris-white/5 border border-iris-white/10'
                  }`}
                >
                  <div className="space-y-2">
                    {dayItems.map((item) => {
                      const progress = getTaskProgress(item);
                      const colors = taskTypeColors[item.taskType || 'other'];

                      return (
                        <div
                          key={item.id}
                          onClick={() => handleItemClick(item)}
                          className="bg-iris-black/40 backdrop-blur-sm rounded-lg p-2 cursor-pointer hover:bg-iris-black/60 transition-all border border-iris-white/10"
                        >
                          <div className="text-xs font-medium text-iris-red mb-1">
                            {formatTime(item.startTime)}
                          </div>
                          <p className="text-sm font-semibold text-iris-white line-clamp-2 mb-2">
                            {item.title}
                          </p>
                          
                          {/* Progress Bar */}
                          {item.type === 'task' && (
                            <div className="mb-2">
                              <div className="w-full bg-iris-white/10 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    progress === 100 ? 'bg-green-500' : 'bg-iris-red'
                                  }`}
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Type Badge */}
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            item.type === 'meeting' 
                              ? 'bg-purple-500/20 text-purple-400'
                              : item.type === 'social'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-blue-500/20 text-blue-400'
                          }`}>
                            {item.type}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderTimelineView = () => {
    if (viewMode === 'today') {
      return (
        <div className="flex-1 overflow-auto space-y-2">
          {filteredItems.map((item) => {
            const progress = getTaskProgress(item);
            const colors = taskTypeColors[item.taskType || 'other'];
            
            return (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className="bg-iris-white/10 border-l-4 border-iris-red rounded-xl p-4 cursor-pointer hover:bg-iris-white/20 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="text-sm font-bold text-iris-red mb-1">
                      {formatTime(item.startTime)} - {formatTime(item.endTime)}
                    </div>
                    <h3 className="text-lg font-bold text-iris-white mb-2">{item.title}</h3>
                  </div>
                  <div className="px-3 py-1 bg-iris-red/20 text-iris-red rounded-full text-xs font-medium">
                    {item.status}
                  </div>
                </div>

                {/* Progress Bar */}
                {item.type === 'task' && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs text-iris-white/60 mb-1">
                      <span>Progress</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-iris-white/10 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          progress === 100 ? 'bg-green-500' : 'bg-iris-red'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {item.members.slice(0, 5).map((member, idx) => (
                    <img
                      key={idx}
                      src={member.avatarUrl}
                      alt={member.name}
                      className="w-6 h-6 rounded-full border-2 border-iris-white/20"
                    />
                  ))}
                </div>
              </div>
            );
          })}
          {filteredItems.length === 0 && (
            <div className="text-center py-12 text-iris-white/40">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No items scheduled for today</p>
            </div>
          )}
        </div>
      );
    }

    // Week Timeline View
    return (
      <div className="flex-1 overflow-auto">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-5 gap-4 text-center font-semibold text-iris-white/70 mb-4 sticky top-0 bg-iris-black z-10 pb-2">
            {weekDates.slice(0, 5).map((date, idx) => (
              <div key={idx}>
                <span className="block">
                  {date.toLocaleDateString('en-US', { weekday: 'short' })} {date.getDate()}
                </span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-5 gap-px text-left text-sm relative min-h-[500px]">
            {weekDates.slice(0, 5).map((date, dayIdx) => {
              const dayItems = filteredItems.filter((item) => {
                const itemDate = new Date(item.startTime);
                return (
                  itemDate.getDate() === date.getDate() &&
                  itemDate.getMonth() === date.getMonth()
                );
              });

              return (
                <div key={dayIdx} className="relative">
                  {dayItems.map((item) => {
                    const colors = taskTypeColors[item.taskType || 'other'];
                    const hour = new Date(item.startTime).getHours();
                    const topPosition = ((hour - 9) / 10) * 100;

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleItemClick(item)}
                        className={`absolute w-[95%] bg-iris-white/10 p-2 rounded-lg border-l-4 border-iris-red cursor-pointer hover:bg-iris-white/20 transition-all`}
                        style={{ top: `${Math.max(0, Math.min(topPosition, 90))}%` }}
                      >
                        <p className="font-semibold text-iris-white text-sm line-clamp-2">
                          {item.title}
                        </p>
                        {item.status && (
                          <span className="text-xs px-2 py-0.5 bg-iris-red/20 rounded-full text-iris-red mt-1 inline-block">
                            {item.status}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-iris-black rounded-2xl p-6 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-iris-white">My Day / Week Timeline</h2>
        
        {/* View Toggle */}
        <div className="flex items-center gap-2 bg-iris-white/5 rounded-lg p-1">
          <button
            onClick={() => setDisplayMode('timeline')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all ${
              displayMode === 'timeline'
                ? 'bg-iris-red text-iris-white'
                : 'text-iris-white/60 hover:text-iris-white'
            }`}
          >
            <List className="w-4 h-4" />
            <span className="text-sm font-medium">Timeline</span>
          </button>
          <button
            onClick={() => setDisplayMode('calendar')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all ${
              displayMode === 'calendar'
                ? 'bg-iris-red text-iris-white'
                : 'text-iris-white/60 hover:text-iris-white'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span className="text-sm font-medium">Calendar</span>
          </button>
        </div>
      </div>

      {displayMode === 'calendar' ? renderCalendarView() : renderTimelineView()}
    </div>
  );
};

export default DashboardTimeline;
