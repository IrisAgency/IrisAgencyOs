import React, { useState } from 'react';
import { AttendanceRecord, AttendanceCorrection } from '../../types';
import { Send, Clock, AlertCircle } from 'lucide-react';

interface AttendanceCorrectionFormProps {
  currentUserId: string;
  attendanceRecords: AttendanceRecord[];
  onSubmit: (correction: Partial<AttendanceCorrection>) => void;
}

const AttendanceCorrectionForm: React.FC<AttendanceCorrectionFormProps> = ({
  currentUserId,
  attendanceRecords,
  onSubmit,
}) => {
  const [date, setDate] = useState('');
  const [requestedCheckIn, setRequestedCheckIn] = useState('');
  const [requestedCheckOut, setRequestedCheckOut] = useState('');
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const selectedRecord = attendanceRecords.find(
    r => r.userId === currentUserId && r.date === date
  );

  const handleSubmit = () => {
    if (!date || !reason.trim()) return;
    onSubmit({
      userId: currentUserId,
      date,
      originalRecordId: selectedRecord?.id,
      requestedCheckIn: requestedCheckIn || undefined,
      requestedCheckOut: requestedCheckOut || undefined,
      reason,
    });
    setSubmitted(true);
    setTimeout(() => {
      setDate('');
      setRequestedCheckIn('');
      setRequestedCheckOut('');
      setReason('');
      setSubmitted(false);
    }, 2000);
  };

  return (
    <div className="bg-iris-black/60 border border-iris-white/10 rounded-xl p-4 space-y-4">
      <h4 className="text-sm font-bold text-iris-white/80 flex items-center gap-2">
        <Clock className="w-4 h-4 text-iris-red" /> Request Attendance Correction
      </h4>

      <div>
        <label className="text-xs text-iris-white/50">Date</label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="w-full px-3 py-2 bg-iris-black/80 border border-iris-white/10 rounded-lg text-sm text-iris-white focus:ring-1 focus:ring-iris-red focus:outline-none"
        />
      </div>

      {selectedRecord && (
        <div className="bg-iris-black/40 rounded-lg px-3 py-2 text-xs text-iris-white/50">
          <span className="text-iris-white/30">Current record:</span>{' '}
          In: {selectedRecord.checkIn || '—'} · Out: {selectedRecord.checkOut || '—'} · Status: {selectedRecord.status}
        </div>
      )}

      {date && !selectedRecord && (
        <div className="flex items-center gap-2 text-xs text-yellow-400/80 bg-yellow-500/10 px-3 py-2 rounded-lg">
          <AlertCircle className="w-3.5 h-3.5" /> No attendance record found for this date
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-iris-white/50">Corrected Check In</label>
          <input
            type="time"
            value={requestedCheckIn}
            onChange={e => setRequestedCheckIn(e.target.value)}
            className="w-full px-3 py-2 bg-iris-black/80 border border-iris-white/10 rounded-lg text-sm text-iris-white focus:ring-1 focus:ring-iris-red focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-iris-white/50">Corrected Check Out</label>
          <input
            type="time"
            value={requestedCheckOut}
            onChange={e => setRequestedCheckOut(e.target.value)}
            className="w-full px-3 py-2 bg-iris-black/80 border border-iris-white/10 rounded-lg text-sm text-iris-white focus:ring-1 focus:ring-iris-red focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-iris-white/50">Reason for Correction</label>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={2}
          placeholder="Explain why this correction is needed..."
          className="w-full px-3 py-2 bg-iris-black/80 border border-iris-white/10 rounded-lg text-sm text-iris-white focus:ring-1 focus:ring-iris-red focus:outline-none resize-none"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={!date || !reason.trim() || submitted}
        className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
          submitted
            ? 'bg-green-500/20 text-green-400'
            : 'bg-iris-red/20 text-iris-red hover:bg-iris-red/30 disabled:opacity-40'
        }`}
      >
        {submitted ? 'Correction Submitted!' : <><Send className="w-4 h-4" /> Submit Correction</>}
      </button>
    </div>
  );
};

export default AttendanceCorrectionForm;
