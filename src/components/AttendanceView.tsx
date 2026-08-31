import React, { useState, useMemo } from 'react';
import {
  Clock,
  Calendar,
  Filter,
  Plus,
  Search,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Flame,
  UserCheck,
  UserX,
  Printer,
  Palette,
  Edit2,
  Trash2,
  Sparkles,
  ArrowUpDown,
  FileSpreadsheet,
  FileText,
  Check,
  Layers,
  ChevronDown,
  Info,
} from 'lucide-react';
import {
  Employee,
  AttendanceRecord,
  EmployeeRole,
  AttendanceStatus,
  ShopSettings,
} from '../types';
import {
  getRoleBadgeColor,
  getStatusBadge,
  calculateTimecard,
  isOvertimeFlagged,
  formatCurrency,
} from '../utils/calculations';
import { AttendanceCSVImportModal, ImportStrategy } from './AttendanceCSVImportModal';

interface AttendanceViewProps {
  employees: Employee[];
  attendance: AttendanceRecord[];
  settings: ShopSettings;
  onRecordAttendance: (record: AttendanceRecord) => void;
  onUpdateAttendance: (record: AttendanceRecord) => void;
  onDeleteAttendance: (recordId: string) => void;
  onBulkImportAttendance?: (records: AttendanceRecord[], strategy: ImportStrategy) => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  employees,
  attendance,
  settings,
  onRecordAttendance,
  onUpdateAttendance,
  onDeleteAttendance,
  onBulkImportAttendance,
}) => {
  // Filter States
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('2026-08-27');
  const [dateFilterMode, setDateFilterMode] = useState<'today' | 'all' | 'custom'>('all');

  // Live Punch Clock Terminal States
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(employees[0]?.id || '');
  const [punchStation, setPunchStation] = useState<string>('');
  const [punchNotes, setPunchNotes] = useState<string>('');
  const [punchMessage, setPunchMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Manual Log Modal State
  const [showManualModal, setShowManualModal] = useState<boolean>(false);
  const [manualForm, setManualForm] = useState<{
    employeeId: string;
    date: string;
    clockIn: string;
    clockOut: string;
    station: string;
    notes: string;
  }>({
    employeeId: employees[0]?.id || '',
    date: '2026-08-27',
    clockIn: '08:00',
    clockOut: '17:00',
    station: 'Design Suite #1',
    notes: '',
  });

  // CSV Import Modal States
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);

  // CSV Export Modal States
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [exportScope, setExportScope] = useState<'filtered' | 'all' | 'today' | 'current_month'>('filtered');
  const [exportFormat, setExportFormat] = useState<'standard' | 'payroll_audit'>('standard');
  const [includeSummaryRow, setIncludeSummaryRow] = useState<boolean>(true);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);

  // Employee Map for fast lookup
  const employeeMap = useMemo(() => {
    const map = new Map<string, Employee>();
    employees.forEach((emp) => map.set(emp.id, emp));
    return map;
  }, [employees]);

  // Selected Employee object
  const activeEmployee = useMemo(() => {
    return employees.find((e) => e.id === selectedEmployeeId);
  }, [employees, selectedEmployeeId]);

  // Check if selected employee has clocked in today
  const todayEmployeeRecord = useMemo(() => {
    return attendance.find(
      (a) => a.employeeId === selectedEmployeeId && a.date === '2026-08-27' && !a.clockOut
    );
  }, [attendance, selectedEmployeeId]);

  // Overall counts of flagged overtime
  const totalFlaggedOvertimeCount = useMemo(() => {
    return attendance.filter((rec) => isOvertimeFlagged(rec, settings).isFlagged).length;
  }, [attendance, settings]);

  // Filtered attendance list
  const filteredAttendance = useMemo(() => {
    return attendance
      .filter((record) => {
        // Date filter
        if (dateFilterMode === 'today' && record.date !== '2026-08-27') return false;
        if (dateFilterMode === 'custom' && selectedDate && record.date !== selectedDate) return false;

        // Role filter
        if (selectedRole !== 'all' && record.role !== selectedRole) return false;

        // Status filter
        if (selectedStatus === 'flagged_overtime') {
          const { isFlagged } = isOvertimeFlagged(record, settings);
          if (!isFlagged) return false;
        } else if (selectedStatus !== 'all' && record.status !== selectedStatus) {
          return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesName = record.employeeName.toLowerCase().includes(q);
          const matchesStation = record.station?.toLowerCase().includes(q);
          const matchesDate = record.date.includes(q);
          if (!matchesName && !matchesStation && !matchesDate) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Sort newest date & clock in first
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        return (b.clockIn || '').localeCompare(a.clockIn || '');
      });
  }, [attendance, dateFilterMode, selectedDate, selectedRole, selectedStatus, searchQuery, settings]);

  // Aggregate Stats for Current Filter
  const stats = useMemo(() => {
    let totalRegHours = 0;
    let totalOtHours = 0;
    let totalLateMins = 0;
    let presentCount = 0;
    let flaggedOtCount = 0;

    filteredAttendance.forEach((rec) => {
      totalRegHours += rec.regularHours;
      totalOtHours += rec.overtimeHours;
      totalLateMins += rec.lateMinutes;
      if (rec.status === 'present' || rec.status === 'overtime') presentCount++;
      if (isOvertimeFlagged(rec, settings).isFlagged) flaggedOtCount++;
    });

    return {
      totalRecords: filteredAttendance.length,
      totalRegHours: Number(totalRegHours.toFixed(1)),
      totalOtHours: Number(totalOtHours.toFixed(1)),
      totalLateMins,
      presentCount,
      flaggedOtCount,
    };
  }, [filteredAttendance, settings]);

  // CSV Generator Utility
  const generateAndDownloadCSV = (
    recordsToExport: AttendanceRecord[],
    format: 'standard' | 'payroll_audit' = 'standard',
    includeSummary: boolean = true
  ) => {
    if (recordsToExport.length === 0) {
      setPunchMessage({
        type: 'error',
        text: 'No attendance records available to export for the selected criteria.',
      });
      return;
    }

    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) return '""';
      const stringValue = String(value);
      return `"${stringValue.replace(/"/g, '""')}"`;
    };

    let csvContent = '';

    // Metadata header
    const generatedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
    csvContent += `# Sublimation Business Management Hub - Attendance & Timecard Export\n`;
    csvContent += `# Generated: ${generatedAt} | Currency: ${settings.currencySymbol} | OT Multiplier: ${settings.overtimeMultiplier}x\n`;

    if (format === 'standard') {
      const headers = [
        'Record ID',
        'Staff Code',
        'Staff Name',
        'Department / Role',
        'Shift Date',
        'Clock In',
        'Clock Out',
        'Regular Hours',
        'Overtime Hours',
        'Total Shift Hours',
        'Late (Mins)',
        'Attendance Status',
        'Workstation / Machine',
        'Supervisor Verification',
        'Activity / Reason Notes',
      ];
      csvContent += headers.map(escapeCSV).join(',') + '\n';

      let sumRegHours = 0;
      let sumOtHours = 0;
      let sumTotalHours = 0;
      let sumLateMins = 0;

      recordsToExport.forEach((rec) => {
        const emp = employeeMap.get(rec.employeeId);
        const empCode = emp ? emp.code : 'EMP';
        const roleLabel =
          rec.role === 'artist'
            ? 'Graphic Artist'
            : rec.role === 'machine_operator'
            ? 'Machine Operator'
            : rec.role === 'sewing_finishing'
            ? 'Sewing & Finishing'
            : 'Floor Supervisor';
        const totalHrs = Number(((rec.regularHours || 0) + (rec.overtimeHours || 0)).toFixed(2));
        const clockOutDisplay = rec.clockOut ? rec.clockOut : 'Active / On-Duty';

        sumRegHours += rec.regularHours || 0;
        sumOtHours += rec.overtimeHours || 0;
        sumTotalHours += totalHrs;
        sumLateMins += rec.lateMinutes || 0;

        const row = [
          rec.id,
          empCode,
          rec.employeeName,
          roleLabel,
          rec.date,
          rec.clockIn,
          clockOutDisplay,
          rec.regularHours,
          rec.overtimeHours,
          totalHrs,
          rec.lateMinutes,
          rec.status.toUpperCase(),
          rec.station || 'Plant Floor',
          rec.verifiedBy || 'Supervisor',
          rec.notes || '',
        ];
        csvContent += row.map(escapeCSV).join(',') + '\n';
      });

      if (includeSummary) {
        csvContent += '\n';
        const summaryRow = [
          'TOTALS',
          `Count: ${recordsToExport.length}`,
          '',
          '',
          '',
          '',
          '',
          sumRegHours.toFixed(2),
          sumOtHours.toFixed(2),
          sumTotalHours.toFixed(2),
          sumLateMins,
          `Present Shifts: ${recordsToExport.filter((r) => r.status === 'present' || r.status === 'overtime').length}`,
          '',
          '',
          '',
        ];
        csvContent += summaryRow.map(escapeCSV).join(',') + '\n';
      }
    } else {
      // Payroll Pre-Audit Format (with wage calculations)
      const headers = [
        'Record ID',
        'Staff Code',
        'Staff Name',
        'Department',
        'Shift Date',
        'Clock In',
        'Clock Out',
        'Regular Hours',
        'OT Hours',
        'Total Hours',
        'Late Mins',
        'Base Rate ($/hr)',
        'Regular Wage ($)',
        'Overtime Wage ($)',
        'Estimated Shift Pay ($)',
        'Status',
        'Station / Machine',
        'Notes',
      ];
      csvContent += headers.map(escapeCSV).join(',') + '\n';

      let sumRegHours = 0;
      let sumOtHours = 0;
      let sumRegWage = 0;
      let sumOtWage = 0;
      let sumTotalPay = 0;

      recordsToExport.forEach((rec) => {
        const emp = employeeMap.get(rec.employeeId);
        const empCode = emp ? emp.code : 'EMP';
        const hourlyRate = emp ? emp.hourlyRate : 18.0;
        const regWage = Number((rec.regularHours * hourlyRate).toFixed(2));
        const otWage = Number((rec.overtimeHours * hourlyRate * settings.overtimeMultiplier).toFixed(2));
        const shiftPay = Number((regWage + otWage).toFixed(2));
        const totalHrs = Number(((rec.regularHours || 0) + (rec.overtimeHours || 0)).toFixed(2));

        sumRegHours += rec.regularHours;
        sumOtHours += rec.overtimeHours;
        sumRegWage += regWage;
        sumOtWage += otWage;
        sumTotalPay += shiftPay;

        const roleLabel =
          rec.role === 'artist'
            ? 'Graphic Artist'
            : rec.role === 'machine_operator'
            ? 'Machine Operator'
            : rec.role === 'sewing_finishing'
            ? 'Sewing & Finishing'
            : 'Floor Supervisor';

        const row = [
          rec.id,
          empCode,
          rec.employeeName,
          roleLabel,
          rec.date,
          rec.clockIn,
          rec.clockOut || 'Active / On-Duty',
          rec.regularHours,
          rec.overtimeHours,
          totalHrs,
          rec.lateMinutes,
          hourlyRate.toFixed(2),
          regWage.toFixed(2),
          otWage.toFixed(2),
          shiftPay.toFixed(2),
          rec.status.toUpperCase(),
          rec.station || 'Plant Floor',
          rec.notes || '',
        ];
        csvContent += row.map(escapeCSV).join(',') + '\n';
      });

      if (includeSummary) {
        csvContent += '\n';
        const summaryRow = [
          'TOTALS',
          `Count: ${recordsToExport.length}`,
          '',
          '',
          '',
          '',
          '',
          sumRegHours.toFixed(2),
          sumOtHours.toFixed(2),
          (sumRegHours + sumOtHours).toFixed(2),
          '',
          '',
          sumRegWage.toFixed(2),
          sumOtWage.toFixed(2),
          sumTotalPay.toFixed(2),
          '',
          '',
          '',
        ];
        csvContent += summaryRow.map(escapeCSV).join(',') + '\n';
      }
    }

    // Trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const filenameScope =
      exportScope === 'today'
        ? 'today_2026-08-27'
        : exportScope === 'current_month'
        ? 'august_2026'
        : exportScope === 'filtered'
        ? 'filtered_view'
        : 'all_history';
    const filenameType = format === 'payroll_audit' ? 'payroll_audit' : 'timecards';
    link.setAttribute('href', url);
    link.setAttribute('download', `sublimation_attendance_${filenameType}_${filenameScope}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportSuccessMessage(
      `Successfully exported ${recordsToExport.length} attendance records (${format === 'payroll_audit' ? 'Payroll Audit' : 'Standard'} format)!`
    );
    setTimeout(() => setExportSuccessMessage(null), 5000);
  };

  // CSV Import Success Handler
  const handleImportSuccess = (
    importedRecords: AttendanceRecord[],
    strategy: ImportStrategy,
    summaryText: string
  ) => {
    if (onBulkImportAttendance) {
      onBulkImportAttendance(importedRecords, strategy);
    } else {
      importedRecords.forEach((r) => onRecordAttendance(r));
    }

    setImportSuccessMessage(summaryText);
    setTimeout(() => {
      setImportSuccessMessage(null);
    }, 7000);
  };

  // Direct Quick Export of currently filtered records
  const handleQuickExportCSV = () => {
    generateAndDownloadCSV(filteredAttendance, 'standard', true);
  };

  // Modal-based configured export
  const handleModalExport = () => {
    let targetRecords: AttendanceRecord[] = [];
    if (exportScope === 'filtered') {
      targetRecords = filteredAttendance;
    } else if (exportScope === 'all') {
      targetRecords = [...attendance].sort((a, b) => b.date.localeCompare(a.date));
    } else if (exportScope === 'today') {
      targetRecords = attendance.filter((a) => a.date === '2026-08-27');
    } else if (exportScope === 'current_month') {
      targetRecords = attendance.filter((a) => a.date.startsWith('2026-08'));
    }

    generateAndDownloadCSV(targetRecords, exportFormat, includeSummaryRow);
    setShowExportModal(false);
  };

  // Handle Quick Punch In
  const handleClockIn = () => {
    if (!activeEmployee) return;

    const now = new Date();
    const currentTimeStr = now.toTimeString().split(' ')[0]; // HH:mm:ss
    const today = '2026-08-27';

    // Verify if already clocked in
    const existing = attendance.find(
      (a) => a.employeeId === activeEmployee.id && a.date === today && !a.clockOut
    );

    if (existing) {
      setPunchMessage({
        type: 'error',
        text: `${activeEmployee.name} is ALREADY clocked in at ${existing.clockIn}. Please Clock Out first.`,
      });
      return;
    }

    const { regularHours, overtimeHours, lateMinutes, status } = calculateTimecard(
      currentTimeStr,
      null,
      settings
    );

    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}`,
      employeeId: activeEmployee.id,
      employeeName: activeEmployee.name,
      role: activeEmployee.role,
      date: today,
      clockIn: currentTimeStr,
      clockOut: null,
      regularHours,
      overtimeHours,
      lateMinutes,
      status,
      station: punchStation || activeEmployee.assignedStation || 'Sublimation Plant Floor',
      notes: punchNotes || 'Clocked in via Live Aspirant Sportswear Terminal',
      verifiedBy: 'Floor Supervisor',
    };

    onRecordAttendance(newRecord);
    setPunchMessage({
      type: 'success',
      text: `Successfully Clocked In ${activeEmployee.name} at ${currentTimeStr}! Status: ${status.toUpperCase()}`,
    });
    setPunchNotes('');
  };

  // Handle Quick Clock Out
  const handleClockOut = () => {
    if (!activeEmployee) return;

    const now = new Date();
    const currentTimeStr = now.toTimeString().split(' ')[0];
    const today = '2026-08-27';

    const activeRecord = attendance.find(
      (a) => a.employeeId === activeEmployee.id && a.date === today && !a.clockOut
    );

    if (!activeRecord) {
      setPunchMessage({
        type: 'error',
        text: `No active Clock-In record found for ${activeEmployee.name} today.`,
      });
      return;
    }

    const { regularHours, overtimeHours, lateMinutes, status } = calculateTimecard(
      activeRecord.clockIn,
      currentTimeStr,
      settings
    );

    const updatedRecord: AttendanceRecord = {
      ...activeRecord,
      clockOut: currentTimeStr,
      regularHours,
      overtimeHours,
      lateMinutes,
      status,
      notes: punchNotes ? `${activeRecord.notes || ''} | Out: ${punchNotes}` : activeRecord.notes,
    };

    onUpdateAttendance(updatedRecord);
    setPunchMessage({
      type: 'success',
      text: `Clocked Out ${activeEmployee.name} at ${currentTimeStr}. Total: ${regularHours}h regular, ${overtimeHours}h OT.`,
    });
    setPunchNotes('');
  };

  // Handle Manual Log Submission
  const handleCreateManualLog = (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmp = employees.find((emp) => emp.id === manualForm.employeeId);
    if (!targetEmp) return;

    const { regularHours, overtimeHours, lateMinutes, status } = calculateTimecard(
      manualForm.clockIn,
      manualForm.clockOut,
      settings
    );

    const manualRecord: AttendanceRecord = {
      id: `att-manual-${Date.now()}`,
      employeeId: targetEmp.id,
      employeeName: targetEmp.name,
      role: targetEmp.role,
      date: manualForm.date,
      clockIn: manualForm.clockIn,
      clockOut: manualForm.clockOut || null,
      regularHours,
      overtimeHours,
      lateMinutes,
      status,
      station: manualForm.station || targetEmp.assignedStation || 'Sublimation Plant',
      notes: manualForm.notes || 'Manual supervisor time adjustment',
      verifiedBy: 'Admin / Supervisor',
    };

    onRecordAttendance(manualRecord);
    setShowManualModal(false);
    setPunchMessage({
      type: 'success',
      text: `Manual attendance record created for ${targetEmp.name} on ${manualForm.date}.`,
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Import Success Notification Banner */}
      {importSuccessMessage && (
        <div
          id="alert-csv-import-success"
          className="p-4 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-950 shadow-sm flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-600 text-white flex items-center justify-center font-bold">
              <Check className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-cyan-950">Bulk Attendance Import Successful</h4>
              <p className="text-xs text-cyan-800">{importSuccessMessage}</p>
            </div>
          </div>
          <button
            onClick={() => setImportSuccessMessage(null)}
            className="text-cyan-800 hover:text-cyan-950 text-xs font-bold px-2 py-1 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Export Success Notification Banner */}
      {exportSuccessMessage && (
        <div
          id="alert-csv-export-success"
          className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 shadow-sm flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
              <Check className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-emerald-950">CSV Export Generated & Downloaded</h4>
              <p className="text-xs text-emerald-700">{exportSuccessMessage}</p>
            </div>
          </div>
          <button
            onClick={() => setExportSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-950 text-xs font-bold px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Banner: Interactive Live Punch Clock Console */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1 rounded-lg bg-emerald-100 text-emerald-800">
                <Clock className="w-4 h-4" />
              </span>
              <h2 className="text-base font-bold text-slate-900">
                Live Sublimation Floor Punch Clock & Timecard
              </h2>
            </div>
            <p className="text-xs text-slate-500 max-w-xl">
              Artists & Machine Operators record shift start, printer/press station assignment, and calculate overtime dynamically.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="btn-import-attendance-csv"
              onClick={() => setShowImportModal(true)}
              className="px-3.5 py-2 rounded-xl border border-cyan-200 bg-cyan-50/60 hover:bg-cyan-100/70 text-xs font-semibold text-cyan-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-700" />
              <span>Import CSV / Clocks</span>
            </button>

            <button
              id="btn-add-manual-attendance"
              onClick={() => setShowManualModal(true)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 hover:border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-cyan-600" />
              <span>Add Manual Record</span>
            </button>

            {/* Export CSV Button Group */}
            <div className="flex items-center rounded-xl bg-slate-900 text-white shadow-xs overflow-hidden">
              <button
                id="btn-quick-export-csv"
                onClick={handleQuickExportCSV}
                title="Export currently filtered attendance records directly to CSV"
                className="px-3.5 py-2 hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Export CSV ({filteredAttendance.length})</span>
              </button>
              <button
                id="btn-open-export-modal"
                onClick={() => setShowExportModal(true)}
                title="Customize CSV Export Options (scope, payroll wage columns, summaries)"
                className="px-2 py-2 border-l border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Live Punch Interactive Card */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
          {/* Employee Selector */}
          <div className="space-y-1.5 md:col-span-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
              Select Staff Member <span className="text-rose-500">*</span>
            </label>
            <select
              id="select-attendance-employee"
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  [{emp.code}] {emp.name} ({emp.role === 'artist' ? 'Artist' : emp.role === 'machine_operator' ? 'Operator' : emp.role})
                </option>
              ))}
            </select>
          </div>

          {/* Machine / Station Assignment */}
          <div className="space-y-1.5 md:col-span-1">
            <label className="text-xs font-bold text-slate-700">
              Workstation / Machine
            </label>
            <input
              type="text"
              placeholder={activeEmployee?.assignedStation || 'e.g. Epson F9470H Print Station'}
              value={punchStation}
              onChange={(e) => setPunchStation(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Shift / Task Notes */}
          <div className="space-y-1.5 md:col-span-1">
            <label className="text-xs font-bold text-slate-700">
              Activity Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Calender drum transfer, Jersey vectoring"
              value={punchNotes}
              onChange={(e) => setPunchNotes(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Punch Actions */}
          <div className="flex items-center gap-2 md:col-span-3 lg:col-span-1">
            <button
              id="btn-do-clock-in"
              onClick={handleClockIn}
              disabled={!!todayEmployeeRecord}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                todayEmployeeRecord
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white cursor-pointer'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Clock IN</span>
            </button>

            <button
              id="btn-do-clock-out"
              onClick={handleClockOut}
              disabled={!todayEmployeeRecord}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                !todayEmployeeRecord
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white cursor-pointer'
              }`}
            >
              <UserX className="w-4 h-4" />
              <span>Clock OUT</span>
            </button>
          </div>
        </div>

        {/* Real-time Status Alert for Selected Staff */}
        {activeEmployee && (
          <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-semibold text-slate-800">{activeEmployee.name}</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-600">{activeEmployee.specialty}</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-slate-500">
                Rate: <strong className="text-slate-900">${activeEmployee.hourlyRate}/hr</strong>
              </span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-500">
                Today's Status:{' '}
                {todayEmployeeRecord ? (
                  <strong className="text-emerald-600">
                    Clocked In at {todayEmployeeRecord.clockIn} (On Duty)
                  </strong>
                ) : (
                  <strong className="text-slate-500">Not Clocked In</strong>
                )}
              </span>
            </div>
          </div>
        )}

        {/* Feedback Message */}
        {punchMessage && (
          <div
            className={`mt-4 p-3 rounded-xl text-xs font-semibold flex items-center justify-between ${
              punchMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <span>{punchMessage.text}</span>
            <button
              onClick={() => setPunchMessage(null)}
              className="text-xs opacity-60 hover:opacity-100 font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Filter and Metrics Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
        {/* Filters Header */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search employee, station..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Date Filter Mode */}
          <div>
            <select
              value={dateFilterMode}
              onChange={(e) => setDateFilterMode(e.target.value as any)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="all">All Dates & History</option>
              <option value="today">Today Only (Aug 27)</option>
              <option value="custom">Specific Date</option>
            </select>
          </div>

          {/* Custom Date Input (if selected) */}
          {dateFilterMode === 'custom' && (
            <div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          )}

          {/* Role Filter */}
          <div>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="all">All Roles (Artists & Operators)</option>
              <option value="artist">Graphic Artists Only</option>
              <option value="machine_operator">Machine Operators Only</option>
              <option value="sewing_finishing">Sewing & Finishing Only</option>
              <option value="supervisor">Floor Supervisors</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="all">All Attendance Statuses</option>
              <option value="flagged_overtime">⚡ Flagged Overtime ({totalFlaggedOvertimeCount})</option>
              <option value="present">Present / On-Time</option>
              <option value="overtime">Overtime Status</option>
              <option value="late">Tardy / Late</option>
              <option value="half_day">Half Day</option>
            </select>
          </div>
        </div>

        {/* Metrics Row for filtered data with Overtime Flag card */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-500 block text-[11px]">Filtered Logs</span>
            <span className="font-bold text-slate-900 text-sm">{stats.totalRecords} Records</span>
          </div>
          <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-100">
            <span className="text-slate-500 block text-[11px]">Regular Work Hours</span>
            <span className="font-bold text-emerald-700 text-sm">{stats.totalRegHours} hrs</span>
          </div>
          <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100">
            <span className="text-slate-500 block text-[11px]">Total Overtime Hours</span>
            <span className="font-bold text-indigo-700 text-sm">{stats.totalOtHours} hrs OT</span>
          </div>
          <div
            onClick={() => setSelectedStatus(selectedStatus === 'flagged_overtime' ? 'all' : 'flagged_overtime')}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              selectedStatus === 'flagged_overtime'
                ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-400/40 shadow-xs'
                : 'bg-amber-50/80 border-amber-200 hover:bg-amber-100/60'
            }`}
            title="Click to toggle filtering by Flagged Overtime"
          >
            <span className="text-amber-800 font-semibold block text-[11px] flex items-center justify-between">
              <span>Flagged Overtime</span>
              <Flame className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
            </span>
            <span className="font-bold text-amber-950 text-sm">
              {stats.flaggedOtCount} Flagged Shift{stats.flaggedOtCount !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="p-3 bg-rose-50/70 rounded-xl border border-rose-100">
            <span className="text-slate-500 block text-[11px]">Total Late Minutes</span>
            <span className="font-bold text-rose-700 text-sm">{stats.totalLateMins} mins</span>
          </div>
        </div>
      </div>

      {/* Attendance Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-600" />
                Detailed Timecard Log History ({filteredAttendance.length})
              </h3>
              {stats.flaggedOtCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  <Flame className="w-3 h-3 text-amber-600 fill-amber-500" />
                  {stats.flaggedOtCount} Exceeding Shift
                </span>
              )}
            </div>
            <span className="text-xs text-slate-500">
              Standard Shift: {settings.standardShiftStart} - {settings.standardShiftEnd} (Grace: {settings.gracePeriodMinutes}m) • Overtime standard flag triggers above standard shift length
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-table-import-csv"
              onClick={() => setShowImportModal(true)}
              className="px-3 py-1.5 rounded-xl border border-cyan-200 bg-cyan-50/70 hover:bg-cyan-100/80 text-xs font-semibold text-cyan-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-700" />
              <span>Import CSV</span>
            </button>
            <button
              id="btn-table-export-csv"
              onClick={handleQuickExportCSV}
              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-cyan-600" />
              <span>Export ({filteredAttendance.length})</span>
            </button>
            <button
              id="btn-table-export-options"
              onClick={() => setShowExportModal(true)}
              className="p-1.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer shadow-2xs"
              title="Configure Export Settings"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Staff Member & Code</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Clock In</th>
                <th className="py-3 px-4">Clock Out</th>
                <th className="py-3 px-4">Reg Hours</th>
                <th className="py-3 px-4">OT & Overtime Flag</th>
                <th className="py-3 px-4">Late</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Workstation / Task</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAttendance.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400">
                    No attendance records match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredAttendance.map((rec) => {
                  const roleStyle = getRoleBadgeColor(rec.role);
                  const statusStyle = getStatusBadge(rec.status);
                  const otFlag = isOvertimeFlagged(rec, settings);

                  return (
                    <tr
                      key={rec.id}
                      className={`transition-colors ${
                        otFlag.isFlagged
                          ? 'bg-amber-50/30 hover:bg-amber-50/60 border-l-4 border-l-amber-500'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Name */}
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{rec.employeeName}</span>
                          {otFlag.isFlagged && (
                            <span
                              title={`Flag Overtime: Worked ${otFlag.totalWorkedHours}h (Exceeds ${otFlag.standardShiftHours}h standard shift)`}
                              className="inline-flex items-center justify-center p-0.5 rounded-full bg-amber-200 text-amber-900"
                            >
                              <Flame className="w-3 h-3 fill-amber-500 text-amber-700" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}>
                          {rec.role === 'artist' ? 'Graphic Artist' : rec.role === 'machine_operator' ? 'Machine Operator' : rec.role === 'sewing_finishing' ? 'Sewing' : 'Supervisor'}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-600 font-mono">
                        {rec.date}
                      </td>

                      {/* Clock In */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        {rec.clockIn}
                      </td>

                      {/* Clock Out */}
                      <td className="py-3.5 px-4 font-mono">
                        {rec.clockOut ? (
                          <span className="font-bold text-slate-800">{rec.clockOut}</span>
                        ) : (
                          <span className="text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] animate-pulse">
                            ● Working Now
                          </span>
                        )}
                      </td>

                      {/* Regular Hours */}
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {rec.regularHours}h
                      </td>

                      {/* Overtime & Flag Overtime Indicator */}
                      <td className="py-3.5 px-4">
                        {otFlag.isFlagged ? (
                          <div className="flex flex-col gap-1 items-start">
                            <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md text-[11px]">
                              +{rec.overtimeHours > 0 ? rec.overtimeHours : otFlag.excessHours}h OT
                            </span>
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-bold text-[9px] bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs whitespace-nowrap"
                              title={`Exceeds ${otFlag.standardShiftHours}h standard shift. Total worked: ${otFlag.totalWorkedHours}h.`}
                            >
                              <Flame className="w-2.5 h-2.5 text-amber-600 fill-amber-500 animate-pulse" />
                              Flag Overtime
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">0h</span>
                        )}
                      </td>

                      {/* Late Minutes */}
                      <td className="py-3.5 px-4">
                        {rec.lateMinutes > 0 ? (
                          <span className="font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                            {rec.lateMinutes}m
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-medium">On-time</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-0.5 items-start">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusStyle.bg}`}>
                            {statusStyle.text}
                          </span>
                          {otFlag.isFlagged && (
                            <span className="text-[9px] text-amber-700 font-medium whitespace-nowrap">
                              &gt; {otFlag.standardShiftHours}h shift length
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Station */}
                      <td className="py-3.5 px-4 text-slate-600 max-w-[180px] truncate" title={rec.station}>
                        {rec.station || 'General Floor'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => onDeleteAttendance(rec.id)}
                          title="Delete Record"
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Entry Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-auto flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100 flex-shrink-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-600" />
                Add Manual Timecard Record
              </h3>
              <button
                onClick={() => setShowManualModal(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 text-base font-bold cursor-pointer"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateManualLog} className="space-y-3.5 text-xs overflow-y-auto flex-1 custom-scrollbar pr-0.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Employee <span className="text-rose-500">*</span>
                </label>
                <select
                  value={manualForm.employeeId}
                  onChange={(e) => setManualForm({ ...manualForm, employeeId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:ring-2 focus:ring-cyan-500"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.code} - {emp.role === 'artist' ? 'Artist' : emp.role === 'machine_operator' ? 'Operator' : emp.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date <span className="text-rose-500">*</span></label>
                  <input
                    type="date"
                    value={manualForm.date}
                    onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Clock In <span className="text-rose-500">*</span></label>
                  <input
                    type="time"
                    value={manualForm.clockIn}
                    onChange={(e) => setManualForm({ ...manualForm, clockIn: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Clock Out</label>
                  <input
                    type="time"
                    value={manualForm.clockOut}
                    onChange={(e) => setManualForm({ ...manualForm, clockOut: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Assigned Station / Equipment
                </label>
                <input
                  type="text"
                  placeholder="e.g. Roland Sublimation Printer, Heat Press Calender"
                  value={manualForm.station}
                  onChange={(e) => setManualForm({ ...manualForm, station: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Reason / Supervisor Note
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Overtime approved for rush cycling uniform run"
                  value={manualForm.notes}
                  onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-3.5 border-t border-slate-100 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="w-full sm:w-auto text-center justify-center px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer border border-slate-200 sm:border-transparent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto text-center justify-center px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-bold shadow-xs cursor-pointer active:scale-98"
                >
                  Save Timecard Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Export Configuration Modal */}
      {showExportModal && (
        <div
          id="modal-export-csv-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
        >
          <div
            id="modal-export-csv"
            className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 text-xs my-auto flex flex-col max-h-[92vh]"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Export Attendance Logs to CSV
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Generate formatted CSV spreadsheets for timecards and payroll audits
                  </p>
                </div>
              </div>
              <button
                id="btn-close-export-modal"
                onClick={() => setShowExportModal(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 text-base font-bold cursor-pointer"
                aria-label="Close export modal"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto flex-1 custom-scrollbar pr-0.5">
              {/* 1. Record Scope Selection */}
              <div>
                <label className="block font-bold text-slate-800 mb-1.5 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-cyan-600" />
                  Select Record Scope
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    id="export-scope-filtered"
                    onClick={() => setExportScope('filtered')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      exportScope === 'filtered'
                        ? 'border-cyan-500 bg-cyan-50/60 ring-2 ring-cyan-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <span className="font-bold text-slate-900 block text-xs">
                      Filtered Records
                    </span>
                    <span className="text-[11px] text-cyan-700 font-semibold">
                      {filteredAttendance.length} matching rows
                    </span>
                  </button>

                  <button
                    type="button"
                    id="export-scope-all"
                    onClick={() => setExportScope('all')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      exportScope === 'all'
                        ? 'border-cyan-500 bg-cyan-50/60 ring-2 ring-cyan-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <span className="font-bold text-slate-900 block text-xs">
                      All Records
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {attendance.length} total historical logs
                    </span>
                  </button>

                  <button
                    type="button"
                    id="export-scope-today"
                    onClick={() => setExportScope('today')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      exportScope === 'today'
                        ? 'border-cyan-500 bg-cyan-50/60 ring-2 ring-cyan-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <span className="font-bold text-slate-900 block text-xs">
                      Today Only (Aug 27)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {attendance.filter((a) => a.date === '2026-08-27').length} shifts
                    </span>
                  </button>

                  <button
                    type="button"
                    id="export-scope-month"
                    onClick={() => setExportScope('current_month')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      exportScope === 'current_month'
                        ? 'border-cyan-500 bg-cyan-50/60 ring-2 ring-cyan-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <span className="font-bold text-slate-900 block text-xs">
                      August 2026
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {attendance.filter((a) => a.date.startsWith('2026-08')).length} monthly records
                    </span>
                  </button>
                </div>
              </div>

              {/* 2. Format / Schema Selection */}
              <div>
                <label className="block font-bold text-slate-800 mb-1.5 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-cyan-600" />
                  Select CSV Column Format
                </label>
                <div className="space-y-2">
                  <label
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      exportFormat === 'standard'
                        ? 'border-cyan-500 bg-cyan-50/50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="exportFormat"
                      checked={exportFormat === 'standard'}
                      onChange={() => setExportFormat('standard')}
                      className="mt-0.5 text-cyan-600 focus:ring-cyan-500"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block">
                        Standard Timecard Log CSV
                      </span>
                      <span className="text-[11px] text-slate-500 block leading-relaxed">
                        Includes Staff Code, Name, Role, Clock In/Out, Regular Hours, Overtime Hours, Late Minutes, Status, Workstation, and Supervisor Notes.
                      </span>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      exportFormat === 'payroll_audit'
                        ? 'border-cyan-500 bg-cyan-50/50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="exportFormat"
                      checked={exportFormat === 'payroll_audit'}
                      onChange={() => setExportFormat('payroll_audit')}
                      className="mt-0.5 text-cyan-600 focus:ring-cyan-500"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block">
                        Payroll Pre-Audit & Wage Calculation CSV ({settings.currencySymbol || '₱'})
                      </span>
                      <span className="text-[11px] text-slate-500 block leading-relaxed">
                        Includes hourly base rates ({settings.currencySymbol || '₱'}/hr), computed regular pay, overtime multipliers ({settings.overtimeMultiplier}x), and estimated shift gross pay.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* 3. Additional Export Options */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
                  <input
                    type="checkbox"
                    id="checkbox-include-summary-row"
                    checked={includeSummaryRow}
                    onChange={(e) => setIncludeSummaryRow(e.target.checked)}
                    className="rounded text-cyan-600 focus:ring-cyan-500 w-4 h-4"
                  />
                  <span>Append Summary Totals Row at the bottom of CSV</span>
                </label>
                <div className="text-[10px] text-slate-400 pl-6">
                  Adds aggregate sums for regular hours, overtime hours, late minutes, and computed wages.
                </div>
              </div>

              {/* Summary Preview Box */}
              <div className="p-3 bg-slate-900 text-white rounded-xl text-xs space-y-1">
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Target Export Filename:</span>
                  <span className="text-cyan-300 font-mono">
                    sublimation_attendance_{exportFormat === 'payroll_audit' ? 'payroll' : 'timecards'}_{exportScope}.csv
                  </span>
                </div>
                <div className="flex justify-between text-slate-300 font-medium text-[11px]">
                  <span>Total Rows to Download:</span>
                  <span className="text-white font-bold font-mono">
                    {exportScope === 'filtered'
                      ? filteredAttendance.length
                      : exportScope === 'all'
                      ? attendance.length
                      : exportScope === 'today'
                      ? attendance.filter((a) => a.date === '2026-08-27').length
                      : attendance.filter((a) => a.date.startsWith('2026-08')).length}{' '}
                    records {includeSummaryRow ? '+ 1 summary row' : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-3.5 mt-4 border-t border-slate-100 flex-shrink-0">
              <button
                type="button"
                id="btn-cancel-export-modal"
                onClick={() => setShowExportModal(false)}
                className="w-full sm:w-auto text-center justify-center px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold transition-colors cursor-pointer border border-slate-200 sm:border-transparent"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-export-csv"
                onClick={handleModalExport}
                className="w-full sm:w-auto text-center justify-center px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer active:scale-98"
              >
                <Download className="w-4 h-4 text-cyan-400" />
                <span>Download CSV File</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* CSV Import Modal */}
      <AttendanceCSVImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        employees={employees}
        existingAttendance={attendance}
        settings={settings}
        onImportSuccess={handleImportSuccess}
      />
    </div>
  );
};
