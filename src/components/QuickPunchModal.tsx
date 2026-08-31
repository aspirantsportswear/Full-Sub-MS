import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  UserCheck,
  UserX,
  X,
  Sparkles,
  MapPin,
  FileText,
  Calendar,
} from 'lucide-react';
import { Employee, AttendanceRecord, ShopSettings } from '../types';
import { calculateTimecard } from '../utils/calculations';

interface QuickPunchModalProps {
  employees: Employee[];
  attendance: AttendanceRecord[];
  settings: ShopSettings;
  isOpen: boolean;
  onClose: () => void;
  onRecordAttendance: (record: AttendanceRecord) => void;
  onUpdateAttendance: (record: AttendanceRecord) => void;
}

export const QuickPunchModal: React.FC<QuickPunchModalProps> = ({
  employees,
  attendance,
  settings,
  isOpen,
  onClose,
  onRecordAttendance,
  onUpdateAttendance,
}) => {
  const [selectedEmpId, setSelectedEmpId] = useState<string>(employees[0]?.id || '');
  const [station, setStation] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [liveTime, setLiveTime] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setLiveTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  const selectedEmp = useMemo(() => {
    return employees.find((e) => e.id === selectedEmpId);
  }, [employees, selectedEmpId]);

  const activeRecord = useMemo(() => {
    return attendance.find(
      (a) => a.employeeId === selectedEmpId && a.date === '2026-08-27' && !a.clockOut
    );
  }, [attendance, selectedEmpId]);

  if (!isOpen) return null;

  const handleClockIn = () => {
    if (!selectedEmp) return;

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const today = '2026-08-27';

    if (activeRecord) {
      setFeedback({
        type: 'error',
        msg: `${selectedEmp.name} is currently clocked in.`,
      });
      return;
    }

    const { regularHours, overtimeHours, lateMinutes, status } = calculateTimecard(
      timeStr,
      null,
      settings
    );

    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}`,
      employeeId: selectedEmp.id,
      employeeName: selectedEmp.name,
      role: selectedEmp.role,
      date: today,
      clockIn: timeStr,
      clockOut: null,
      regularHours,
      overtimeHours,
      lateMinutes,
      status,
      station: station || selectedEmp.assignedStation || 'Sublimation Plant Floor',
      notes: note || 'Clock In via Quick Punch Terminal',
      verifiedBy: 'Floor Supervisor',
    };

    onRecordAttendance(newRecord);
    setFeedback({
      type: 'success',
      msg: `Clocked IN ${selectedEmp.name} at ${timeStr} successfully!`,
    });
    setNote('');
  };

  const handleClockOut = () => {
    if (!selectedEmp || !activeRecord) return;

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];

    const { regularHours, overtimeHours, lateMinutes, status } = calculateTimecard(
      activeRecord.clockIn,
      timeStr,
      settings
    );

    const updated: AttendanceRecord = {
      ...activeRecord,
      clockOut: timeStr,
      regularHours,
      overtimeHours,
      lateMinutes,
      status,
      notes: note ? `${activeRecord.notes || ''} | Out: ${note}` : activeRecord.notes,
    };

    onUpdateAttendance(updated);
    setFeedback({
      type: 'success',
      msg: `Clocked OUT ${selectedEmp.name} at ${timeStr}. Regular: ${regularHours}h, OT: ${overtimeHours}h.`,
    });
    setNote('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-auto flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-emerald-100 text-emerald-800">
              <Clock className="w-4 h-4" />
            </span>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              Live Attendance Punch Terminal
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 text-base font-bold cursor-pointer"
            aria-label="Close terminal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Digital Clock Display */}
        <div className="bg-slate-900 text-white rounded-xl p-3.5 sm:p-4 text-center mb-4 flex-shrink-0">
          <span className="text-[10px] uppercase font-bold tracking-widest text-cyan-400 block mb-1">
            Current Floor Time
          </span>
          <div className="text-2xl sm:text-3xl font-mono font-extrabold tracking-tight text-white">
            {liveTime || '--:--:--'}
          </div>
          <span className="text-[11px] text-slate-400 block mt-0.5">
            Thursday, August 27, 2026
          </span>
        </div>

        {/* Staff Selection */}
        <div className="space-y-3 text-xs mb-4 overflow-y-auto flex-1 custom-scrollbar pr-0.5">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Select Staff Member:
            </label>
            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  [{emp.code}] {emp.name} ({emp.role === 'artist' ? 'Artist' : emp.role === 'machine_operator' ? 'Operator' : emp.role})
                </option>
              ))}
            </select>
          </div>

          {/* Machine Station */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Workstation / Machine:
            </label>
            <input
              type="text"
              placeholder={selectedEmp?.assignedStation || 'e.g. Design Suite #1, Epson F9470H'}
              value={station}
              onChange={(e) => setStation(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Shift Note:
            </label>
            <input
              type="text"
              placeholder="e.g. Rush jersey layout / Night calender press run"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Current Employee Status */}
          {selectedEmp && (
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
              <span className="text-slate-600">Current Status:</span>
              {activeRecord ? (
                <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-[11px]">
                  Clocked In at {activeRecord.clockIn}
                </span>
              ) : (
                <span className="font-semibold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full text-[11px]">
                  Not Clocked In Today
                </span>
              )}
            </div>
          )}

          {/* Feedback Alert */}
          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {feedback.msg}
            </div>
          )}
        </div>

        {/* Action Buttons - Centered and fit to mobile screen */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 flex-shrink-0">
          <button
            onClick={handleClockIn}
            disabled={!!activeRecord}
            className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-98 ${
              activeRecord
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Clock IN</span>
          </button>

          <button
            onClick={handleClockOut}
            disabled={!activeRecord}
            className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-98 ${
              !activeRecord
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer'
            }`}
          >
            <UserX className="w-4 h-4" />
            <span>Clock OUT</span>
          </button>
        </div>
      </div>
    </div>
  );
};
