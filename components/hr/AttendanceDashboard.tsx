import React, { useMemo, useState } from 'react';
import { AttendanceRecord, User, AttendanceCorrection } from '../../types';
import { Clock, LogIn, LogOut, AlertTriangle, Calendar, BarChart3, Filter } from 'lucide-react';
import HRStatusBadge from './HRStatusBadge';

interface AttendanceDashboardProps {
  attendanceRecords: AttendanceRecord[];
  attendanceCorrections: AttendanceCorrection[];
  users: User[];
  currentUserId: string;
  checkPermission?: (code: string) => boolean;
  onCheckIn: () => void;
  onCheckOut: () => void;
  onSubmitCorrection: (correction: Partial<AttendanceCorrection>) => void;
  onApproveCorrection: (id: string) => void;
}

const AttendanceDashboard: React.FC<AttendanceDashboardProps> = ({
  attendanceRecords,
  attendanceCorrections,
  users,
  currentUserId,
  checkPermission,
  onCheckIn,
  onCheckOut,
  onSubmitCorrection,
  onApproveCorrection,
}) => {
  const [viewMode, setViewMode] = useState<'today' | 'monthly' | 'corrections'>('today');
  const canManage = checkPermission?.('hr.attendance.manage');
  const canViewAll = checkPermission?.('hr.attendance.view_all');

  const today = new Date().toISOString().split('T')[0];
  const now = new Date();

  // Current user's today record
  const myTodayRecord = attendanceRecords.find(
    r => r.userId === currentUserId && r.date === today
  );

  const isClockedIn = myTodayRecord && myTodayRecord.checkIn && !myTodayRecord.checkOut;

  // Today's team attendance
  const todayRecords = useMemo(() =>
    attendanceRecords
      .filter(r => r.date === today)
      .map(r => ({
        ...r,
        user: users.find(u => u.id === r.userId),
      }))
      .filter(r => r.user)
      .sort((a, b) => (a.checkIn || '').localeCompare(b.checkIn || '')),
    [attendanceRecords, today, users]
  );

  // Monthly summary for current user
  const monthlyRecords = useMemo(() => {
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`;
    return attendanceRecords
      .filter(r => r.userId === currentUserId && r.date >= monthStart && r.date <= monthEnd)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [attendanceRecords, currentUserId, now]);

  const monthlyStats = useMemo(() => {
    const present = monthlyRecords.filter(r => r.status === 'present' || r.status === 'late').length;
    const absent = monthlyRecords.filter(r => r.status === 'absent').length;
    const late = monthlyRecords.filter(r => r.status === 'late').length;
    const totalHours = monthlyRecords.reduce((sum, r) => sum + (r.totalHours || 0), 0);
    return { present, absent, late, totalHours };
  }, [monthlyRecords]);

  const pendingCorrections = attendanceCorrections.filter(c => c.correctionStatus === 'pending');

  return (
    <div className="space-y-4">
      {/* Clock In / Clock Out */}
      <div className="bg-iris-black/60 border border-iris-white/10 rounded-xl p-6 flex items-center gap-6">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-iris-white">
            {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </h3>
          <p className="text-3xl font-bold text-iris-white mt-1">
            {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </p>
          {myTodayRecord && (
            <div className="flex gap-4 mt-2 text-xs text-iris-white/50">
              {myTodayRecord.checkIn && <span>In: {myTodayRecord.checkIn}</span>}
              {myTodayRecord.checkOut && <span>Out: {myTodayRecord.checkOut}</span>}
              {myTodayRecord.totalHours && <span>{myTodayRecord.totalHours.toFixed(1)}h total</span>}
            </div>
          )}
        </div>
        <div className="flex gap-3">
          {!isClockedIn ? (
            <button
              onClick={onCheckIn}
              disabled={!!myTodayRecord?.checkOut}
              className="flex items-center gap-2 px-6 py-3 bg-green-500/20 text-green-400 rounded-xl text-sm font-bold hover:bg-green-500/30 disabled:opacity-40 transition"
            >
              <LogIn className="w-5 h-5" /> Clock In
            </button>
          ) : (
            <button
              onClick={onCheckOut}
              className="flex items-center gap-2 px-6 py-3 bg-red-500/20 text-red-400 rounded-xl text-sm font-bold hover:bg-red-500/30 transition"
            >
              <LogOut className="w-5 h-5" /> Clock Out
            </button>
          )}
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2">
        {(['today', 'monthly', 'corrections'] as const).map(mode => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${
              viewMode === mode ? 'bg-iris-red/20 text-iris-red' : 'bg-iris-black/60 text-iris-white/50 hover:text-iris-white/80'
            }`}
          >
            {mode === 'today' && <Clock className="w-3.5 h-3.5 inline mr-1" />}
            {mode === 'monthly' && <BarChart3 className="w-3.5 h-3.5 inline mr-1" />}
            {mode === 'corrections' && <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />}
            {mode} {mode === 'corrections' && pendingCorrections.length > 0 ? `(${pendingCorrections.length})` : ''}
          </button>
        ))}
      </div>

      {/* Today's Attendance Board */}
      {viewMode === 'today' && (
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-iris-white/80">Today's Attendance ({todayRecords.length} recorded)</h4>
          {todayRecords.length === 0 ? (
            <p className="text-sm text-iris-white/30 text-center py-6">No attendance records for today</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {todayRecords.map(r => (
                <div key={r.id} className="bg-iris-black/60 border border-iris-white/10 rounded-xl p-3 flex items-center gap-3">
                  <img src={r.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.user?.name || '')}&size=32&background=random`} alt="" className="w-8 h-8 rounded-full" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-iris-white truncate block">{r.user?.name}</span>
                    <div className="flex gap-2 text-xs text-iris-white/40">
                      <span>In: {r.checkIn || '—'}</span>
                      <span>Out: {r.checkOut || '—'}</span>
                    </div>
                  </div>
                  <HRStatusBadge type="attendance" status={r.status} size="sm" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Monthly Summary */}
      {viewMode === 'monthly' && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
              <span className="text-2xl font-bold text-green-400">{monthlyStats.present}</span>
              <p className="text-xs text-green-400/70">Present</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
              <span className="text-2xl font-bold text-red-400">{monthlyStats.absent}</span>
              <p className="text-xs text-red-400/70">Absent</p>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-center">
              <span className="text-2xl font-bold text-yellow-400">{monthlyStats.late}</span>
              <p className="text-xs text-yellow-400/70">Late</p>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
              <span className="text-2xl font-bold text-blue-400">{monthlyStats.totalHours.toFixed(0)}</span>
              <p className="text-xs text-blue-400/70">Hours</p>
            </div>
          </div>

          <div className="bg-iris-black/60 border border-iris-white/10 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-iris-white/10">
                  <th className="text-left px-4 py-2 text-iris-white/40 font-medium">Date</th>
                  <th className="text-left px-4 py-2 text-iris-white/40 font-medium">Check In</th>
                  <th className="text-left px-4 py-2 text-iris-white/40 font-medium">Check Out</th>
                  <th className="text-left px-4 py-2 text-iris-white/40 font-medium">Hours</th>
                  <th className="text-left px-4 py-2 text-iris-white/40 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {monthlyRecords.map(r => (
                  <tr key={r.id} className="border-b border-iris-white/5 hover:bg-iris-white/5">
                    <td className="px-4 py-2 text-iris-white">{r.date}</td>
                    <td className="px-4 py-2 text-iris-white/70">{r.checkIn || '—'}</td>
                    <td className="px-4 py-2 text-iris-white/70">{r.checkOut || '—'}</td>
                    <td className="px-4 py-2 text-iris-white/70">{r.totalHours?.toFixed(1) || '—'}</td>
                    <td className="px-4 py-2"><HRStatusBadge type="attendance" status={r.status} size="sm" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Corrections */}
      {viewMode === 'corrections' && (
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-iris-white/80">Attendance Corrections</h4>
          {pendingCorrections.length === 0 && (
            <p className="text-sm text-iris-white/30 text-center py-6">No pending corrections</p>
          )}
          {pendingCorrections.map(c => {
            const u = users.find(u => u.id === c.userId);
            return (
              <div key={c.id} className="bg-iris-black/60 border border-yellow-500/20 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <img src={u?.avatar || ''} alt="" className="w-7 h-7 rounded-full" />
                  <span className="text-sm font-medium text-iris-white">{u?.name}</span>
                  <span className="text-xs text-iris-white/40 ml-auto">{c.date}</span>
                </div>
                <p className="text-xs text-iris-white/60">{c.reason}</p>
                <div className="flex gap-2 text-xs text-iris-white/40">
                  {c.requestedCheckIn && <span>New Check In: {c.requestedCheckIn}</span>}
                  {c.requestedCheckOut && <span>New Check Out: {c.requestedCheckOut}</span>}
                </div>
                {canManage && (
                  <button onClick={() => onApproveCorrection(c.id)} className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-xs font-medium hover:bg-green-500/30">
                    Approve Correction
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AttendanceDashboard;
