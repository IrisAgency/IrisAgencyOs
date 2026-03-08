import React, { useMemo } from 'react';
import { User, EmployeeProfile, LeaveRequest, AttendanceRecord, Task } from '../../types';
import { Users, Clock, Calendar, TrendingUp, AlertTriangle } from 'lucide-react';

interface CapacityDashboardProps {
  users: User[];
  employeeProfiles: EmployeeProfile[];
  leaveRequests: LeaveRequest[];
  attendanceRecords: AttendanceRecord[];
  tasks?: Task[];
}

const CapacityDashboard: React.FC<CapacityDashboardProps> = ({
  users,
  employeeProfiles,
  leaveRequests,
  attendanceRecords,
  tasks,
}) => {
  const today = new Date().toISOString().split('T')[0];
  const activeUsers = users.filter(u => u.status !== 'inactive');

  // Who is on leave today
  const onLeaveToday = useMemo(() => {
    return leaveRequests
      .filter(r => r.status === 'approved' && r.startDate <= today && r.endDate >= today)
      .map(r => ({
        ...r,
        user: users.find(u => u.id === r.userId),
      }))
      .filter(r => r.user);
  }, [leaveRequests, today, users]);

  // Who checked in today
  const checkedInToday = useMemo(() => {
    return attendanceRecords
      .filter(r => r.date === today && r.checkIn && !r.checkOut)
      .map(r => ({
        ...r,
        user: users.find(u => u.id === r.userId),
      }))
      .filter(r => r.user);
  }, [attendanceRecords, today, users]);

  // Availability rate
  const availableCount = activeUsers.length - onLeaveToday.length;
  const availabilityPct = activeUsers.length > 0 ? Math.round((availableCount / activeUsers.length) * 100) : 0;

  // Department capacity
  const departmentCapacity = useMemo(() => {
    const depts = new Map<string, { total: number; onLeave: number; present: number }>();

    activeUsers.forEach(u => {
      const dept = u.department || 'Unassigned';
      if (!depts.has(dept)) depts.set(dept, { total: 0, onLeave: 0, present: 0 });
      depts.get(dept)!.total++;
    });

    onLeaveToday.forEach(r => {
      const dept = r.user?.department || 'Unassigned';
      if (depts.has(dept)) depts.get(dept)!.onLeave++;
    });

    depts.forEach((v, k) => {
      v.present = v.total - v.onLeave;
    });

    return Array.from(depts.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [activeUsers, onLeaveToday]);

  // Workload distribution (if tasks available)
  const workloadData = useMemo(() => {
    if (!tasks) return [];
    const activeTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled');
    const userTaskCount = new Map<string, number>();

    activeTasks.forEach(t => {
      t.assigneeIds?.forEach(id => {
        userTaskCount.set(id, (userTaskCount.get(id) || 0) + 1);
      });
    });

    return activeUsers
      .map(u => ({
        user: u,
        taskCount: userTaskCount.get(u.id) || 0,
        profile: employeeProfiles.find(ep => ep.userId === u.id),
      }))
      .sort((a, b) => b.taskCount - a.taskCount);
  }, [tasks, activeUsers, employeeProfiles]);

  // Next 7 days leave forecast
  const leaveForecast = useMemo(() => {
    const forecast: { date: string; day: string; count: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' });
      const count = leaveRequests.filter(
        r => r.status === 'approved' && r.startDate <= dateStr && r.endDate >= dateStr
      ).length;
      forecast.push({ date: dateStr, day: dayStr, count });
    }
    return forecast;
  }, [leaveRequests]);

  const maxForecast = Math.max(...leaveForecast.map(f => f.count), 1);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-iris-white">Workforce Capacity</h3>

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-iris-black/60 border border-iris-white/10 rounded-xl p-4 text-center">
          <Users className="w-5 h-5 text-iris-white/40 mx-auto mb-1" />
          <span className="text-2xl font-bold text-iris-white">{activeUsers.length}</span>
          <p className="text-xs text-iris-white/40">Total Team</p>
        </div>
        <div className={`rounded-xl p-4 text-center ${availabilityPct >= 80 ? 'bg-green-500/10 border border-green-500/20' : availabilityPct >= 60 ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
          <TrendingUp className="w-5 h-5 mx-auto mb-1 text-current opacity-60" />
          <span className="text-2xl font-bold">{availabilityPct}%</span>
          <p className="text-xs opacity-60">Available</p>
        </div>
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 text-center">
          <Calendar className="w-5 h-5 text-orange-400/60 mx-auto mb-1" />
          <span className="text-2xl font-bold text-orange-400">{onLeaveToday.length}</span>
          <p className="text-xs text-orange-400/70">On Leave</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
          <Clock className="w-5 h-5 text-blue-400/60 mx-auto mb-1" />
          <span className="text-2xl font-bold text-blue-400">{checkedInToday.length}</span>
          <p className="text-xs text-blue-400/70">Clocked In</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Department Capacity */}
        <div className="bg-iris-black/60 border border-iris-white/10 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-bold text-iris-white/80">Department Capacity</h4>
          {departmentCapacity.map(dept => (
            <div key={dept.name} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-iris-white">{dept.name}</span>
                <span className="text-iris-white/40">{dept.present}/{dept.total}</span>
              </div>
              <div className="h-2 bg-iris-black/40 rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-green-500 rounded-l-full transition-all"
                  style={{ width: `${dept.total > 0 ? (dept.present / dept.total) * 100 : 0}%` }}
                />
                <div
                  className="h-full bg-orange-500 transition-all"
                  style={{ width: `${dept.total > 0 ? (dept.onLeave / dept.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* 7-Day Leave Forecast */}
        <div className="bg-iris-black/60 border border-iris-white/10 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-bold text-iris-white/80">7-Day Leave Forecast</h4>
          <div className="flex items-end gap-2 h-32">
            {leaveForecast.map((f, i) => (
              <div key={f.date} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-iris-white font-bold">{f.count}</span>
                <div className="w-full bg-iris-black/40 rounded-t-md flex flex-col justify-end" style={{ height: '80px' }}>
                  <div
                    className={`w-full rounded-t-md transition-all ${
                      i === 0 ? 'bg-iris-red' : 'bg-iris-red/60'
                    }`}
                    style={{ height: `${maxForecast > 0 ? (f.count / maxForecast) * 80 : 0}px` }}
                  />
                </div>
                <span className={`text-[10px] ${i === 0 ? 'text-iris-red font-bold' : 'text-iris-white/40'}`}>{f.day}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Workload Bars */}
      {workloadData.length > 0 && (
        <div className="bg-iris-black/60 border border-iris-white/10 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-bold text-iris-white/80">Active Task Distribution</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {workloadData.slice(0, 15).map(({ user, taskCount }) => {
              const maxTasks = workloadData[0]?.taskCount || 1;
              const pct = (taskCount / maxTasks) * 100;
              const isOverloaded = taskCount > 8;

              return (
                <div key={user.id} className="flex items-center gap-3">
                  <img src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&size=24&background=random`} alt="" className="w-6 h-6 rounded-full flex-shrink-0" />
                  <span className="text-xs text-iris-white w-28 truncate">{user.name}</span>
                  <div className="flex-1 h-3 bg-iris-black/40 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isOverloaded ? 'bg-red-500' : 'bg-iris-red/70'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={`text-xs font-bold min-w-[24px] text-right ${isOverloaded ? 'text-red-400' : 'text-iris-white/60'}`}>
                    {taskCount}
                  </span>
                  {isOverloaded && <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* On Leave Today Detail */}
      {onLeaveToday.length > 0 && (
        <div className="bg-iris-black/60 border border-iris-white/10 rounded-xl p-4 space-y-2">
          <h4 className="text-sm font-bold text-iris-white/80">On Leave Today</h4>
          <div className="flex flex-wrap gap-2">
            {onLeaveToday.map(r => (
              <div key={r.id} className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <img src={r.user?.avatar || ''} alt="" className="w-5 h-5 rounded-full" />
                <span className="text-xs text-iris-white">{r.user?.name}</span>
                <span className="text-[10px] text-orange-400 capitalize">{r.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CapacityDashboard;
