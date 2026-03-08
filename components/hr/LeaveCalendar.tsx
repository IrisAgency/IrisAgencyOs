import React, { useMemo } from 'react';
import { LeaveRequest, User } from '../../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface LeaveCalendarProps {
  leaveRequests: LeaveRequest[];
  users: User[];
  month?: number; // 0-11
  year?: number;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const LeaveCalendar: React.FC<LeaveCalendarProps> = ({
  leaveRequests,
  users,
}) => {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();

  const approvedLeaves = useMemo(() =>
    leaveRequests.filter(r => r.status === 'approved'),
    [leaveRequests]
  );

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = [];

    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    return days;
  }, [month, year]);

  const getAbsentees = (day: number): { user: User; type: string }[] => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    return approvedLeaves
      .filter(leave => {
        return dateStr >= leave.startDate && dateStr <= leave.endDate;
      })
      .map(leave => {
        const user = users.find(u => u.id === leave.userId);
        return user ? { user, type: leave.type } : null;
      })
      .filter(Boolean) as { user: User; type: string }[];
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const leaveTypeColor: Record<string, string> = {
    annual: 'bg-blue-500',
    sick: 'bg-red-500',
    unpaid: 'bg-gray-500',
    emergency: 'bg-orange-500',
    maternity: 'bg-pink-500',
    paternity: 'bg-purple-500',
    compensatory: 'bg-teal-500',
    personal: 'bg-yellow-500',
  };

  const today = new Date();
  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-iris-white">Leave Calendar</h3>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1.5 hover:bg-iris-white/10 rounded-lg transition">
            <ChevronLeft className="w-4 h-4 text-iris-white/60" />
          </button>
          <span className="text-sm font-medium text-iris-white min-w-[140px] text-center">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={nextMonth} className="p-1.5 hover:bg-iris-white/10 rounded-lg transition">
            <ChevronRight className="w-4 h-4 text-iris-white/60" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(leaveTypeColor).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
            <span className="text-xs text-iris-white/50 capitalize">{type}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="bg-iris-black/60 border border-iris-white/10 rounded-xl overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-iris-white/10">
          {DAYS.map(d => (
            <div key={d} className="text-center text-xs font-medium text-iris-white/40 py-2">{d}</div>
          ))}
        </div>

        {/* Calendar cells */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            const absentees = day ? getAbsentees(day) : [];
            return (
              <div
                key={idx}
                className={`min-h-[64px] border-b border-r border-iris-white/5 p-1 ${
                  day === null ? 'bg-iris-black/40' : 'hover:bg-iris-white/5 transition'
                } ${isToday(day || 0) ? 'bg-iris-red/5 ring-1 ring-inset ring-iris-red/30' : ''}`}
              >
                {day && (
                  <>
                    <span className={`text-xs font-medium ${isToday(day) ? 'text-iris-red' : 'text-iris-white/60'}`}>
                      {day}
                    </span>
                    <div className="flex flex-wrap gap-0.5 mt-0.5">
                      {absentees.slice(0, 3).map((a, i) => (
                        <div
                          key={i}
                          className={`w-5 h-5 rounded-full border-2 border-iris-black/80 ${leaveTypeColor[a.type] || 'bg-gray-500'}`}
                          title={`${a.user.name} — ${a.type} leave`}
                        >
                          <img
                            src={a.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(a.user.name)}&size=20&background=random`}
                            alt=""
                            className="w-full h-full rounded-full object-cover"
                          />
                        </div>
                      ))}
                      {absentees.length > 3 && (
                        <span className="text-[9px] text-iris-white/40 self-center ml-0.5">+{absentees.length - 3}</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LeaveCalendar;
