import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  Printer,
  Sparkles,
  TrendingUp,
  FileText,
  AlertCircle,
  CreditCard,
  Banknote,
  Percent,
  Plus,
  RefreshCw,
  Download,
  Filter,
  Award,
  FileDown,
  Loader2,
} from 'lucide-react';
import {
  Employee,
  AttendanceRecord,
  SalaryRecord,
  ShopSettings,
} from '../types';
import {
  formatCurrency,
  getRoleBadgeColor,
  getStatusBadge,
  computeSalaryForPeriod,
} from '../utils/calculations';
import { PayrollSummaryReportModal } from './PayrollSummaryReportModal';
import { generateMonthlyPayrollPDF, generateIndividualPayslipPDF } from '../utils/pdfExport';

interface SalaryViewProps {
  employees: Employee[];
  attendance: AttendanceRecord[];
  salaryRecords: SalaryRecord[];
  settings: ShopSettings;
  onUpdateSalaryRecord: (record: SalaryRecord) => void;
  onSelectPayslip: (record: SalaryRecord) => void;
  onRecalculateAllPayroll: (periodStart: string, periodEnd: string) => void;
}

export const SalaryView: React.FC<SalaryViewProps> = ({
  employees,
  attendance,
  salaryRecords,
  settings,
  onUpdateSalaryRecord,
  onSelectPayslip,
  onRecalculateAllPayroll,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2026-08-16_2026-08-31');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showSummaryReportModal, setShowSummaryReportModal] = useState<boolean>(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);
  const [pdfDownloadedMessage, setPdfDownloadedMessage] = useState<string | null>(null);

  // Edit Bonus/Deduction Modal State
  const [editingRecord, setEditingRecord] = useState<SalaryRecord | null>(null);
  const [editForm, setEditForm] = useState<{
    pieceRateUnits: number;
    allowances: number;
    cashAdvance: number;
    lateDeduction: number;
    taxInsurance: number;
    paymentMethod: 'Cash' | 'Bank Transfer' | 'E-Wallet';
    notes: string;
  }>({
    pieceRateUnits: 0,
    allowances: 0,
    cashAdvance: 0,
    lateDeduction: 0,
    taxInsurance: 0,
    paymentMethod: 'Bank Transfer',
    notes: '',
  });

  const [periodStart, periodEnd] = selectedPeriod.split('_');

  const getPeriodLabel = (periodKey: string) => {
    if (periodKey === '2026-08-01_2026-08-31') return 'Full Month of August 2026';
    if (periodKey === '2026-08-16_2026-08-31') return 'Aug 16 - Aug 31, 2026 (2nd Cutoff)';
    if (periodKey === '2026-08-01_2026-08-15') return 'Aug 01 - Aug 15, 2026 (1st Cutoff)';
    return periodKey.replace('_', ' to ');
  };

  const handleDownloadMonthlyPDF = (scope: 'selected' | 'full_month' = 'selected') => {
    setIsGeneratingPDF(true);
    try {
      const periodToUse = scope === 'full_month' ? '2026-08-01_2026-08-31' : selectedPeriod;
      const label = getPeriodLabel(periodToUse);
      generateMonthlyPayrollPDF({
        salaryRecords,
        employees,
        settings,
        periodLabel: label,
        departmentFilter: roleFilter !== 'all' ? roleFilter : 'all',
      });
      setPdfDownloadedMessage(`Downloaded: ${label} Payroll Report (PDF)`);
      setTimeout(() => setPdfDownloadedMessage(null), 4000);
    } catch (err) {
      console.error('Error generating PDF report:', err);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleDownloadIndividualPayslip = (rec: SalaryRecord) => {
    const emp = employees.find((e) => e.id === rec.employeeId);
    const label = getPeriodLabel(selectedPeriod);
    generateIndividualPayslipPDF(rec, emp, settings, label);
    setPdfDownloadedMessage(`Downloaded Payslip for ${rec.employeeName} (PDF)`);
    setTimeout(() => setPdfDownloadedMessage(null), 3500);
  };

  // Filtered salary records
  const filteredRecords = useMemo(() => {
    return salaryRecords.filter((rec) => {
      if (roleFilter !== 'all' && rec.role !== roleFilter) return false;
      if (statusFilter !== 'all' && rec.paymentStatus !== statusFilter) return false;
      return true;
    });
  }, [salaryRecords, roleFilter, statusFilter]);

  // Aggregate Payroll Totals
  const payrollSummary = useMemo(() => {
    let totalGross = 0;
    let totalNet = 0;
    let totalRegularPay = 0;
    let totalOTPay = 0;
    let totalPiecePay = 0;
    let totalDeductions = 0;
    let paidCount = 0;
    let pendingCount = 0;

    filteredRecords.forEach((rec) => {
      totalGross += rec.grossPay;
      totalNet += rec.netSalary;
      totalRegularPay += rec.regularPay;
      totalOTPay += rec.overtimePay;
      totalPiecePay += rec.pieceRatePay;
      totalDeductions +=
        rec.deductions.lateDeduction +
        rec.deductions.cashAdvance +
        rec.deductions.taxInsurance +
        rec.deductions.other;

      if (rec.paymentStatus === 'paid') paidCount++;
      else pendingCount++;
    });

    return {
      totalGross,
      totalNet,
      totalRegularPay,
      totalOTPay,
      totalPiecePay,
      totalDeductions,
      paidCount,
      pendingCount,
    };
  }, [filteredRecords]);

  // Open Edit Modal
  const handleOpenEditModal = (rec: SalaryRecord) => {
    setEditingRecord(rec);
    setEditForm({
      pieceRateUnits: rec.pieceRateUnits || 0,
      allowances: rec.allowances || 0,
      cashAdvance: rec.deductions.cashAdvance || 0,
      lateDeduction: rec.deductions.lateDeduction || 0,
      taxInsurance: rec.deductions.taxInsurance || 0,
      paymentMethod: rec.paymentMethod || 'Bank Transfer',
      notes: rec.deductions.notes || '',
    });
  };

  // Save Edit adjustments
  const handleSaveAdjustments = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    const emp = employees.find((e) => e.id === editingRecord.employeeId);
    const pieceRateBonus = emp?.pieceRateBonus || 0;
    const pieceRatePay = Number((editForm.pieceRateUnits * pieceRateBonus).toFixed(2));

    const grossPay = Number(
      (editingRecord.regularPay + editingRecord.overtimePay + pieceRatePay + editForm.allowances).toFixed(2)
    );

    const totalDeductions = Number(
      (editForm.lateDeduction + editForm.cashAdvance + editForm.taxInsurance).toFixed(2)
    );

    const netSalary = Math.max(0, Number((grossPay - totalDeductions).toFixed(2)));

    const updated: SalaryRecord = {
      ...editingRecord,
      pieceRateUnits: editForm.pieceRateUnits,
      pieceRatePay,
      allowances: editForm.allowances,
      grossPay,
      netSalary,
      paymentMethod: editForm.paymentMethod,
      deductions: {
        lateDeduction: editForm.lateDeduction,
        cashAdvance: editForm.cashAdvance,
        taxInsurance: editForm.taxInsurance,
        other: 0,
        notes: editForm.notes,
      },
    };

    onUpdateSalaryRecord(updated);
    setEditingRecord(null);
  };

  // Toggle Paid Status
  const handleTogglePaid = (rec: SalaryRecord) => {
    const nextStatus = rec.paymentStatus === 'paid' ? 'pending' : 'paid';
    const updated: SalaryRecord = {
      ...rec,
      paymentStatus: nextStatus,
      paidDate: nextStatus === 'paid' ? '2026-08-27' : undefined,
    };
    onUpdateSalaryRecord(updated);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner: Salary & Payroll Engine */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1 rounded-lg bg-indigo-100 text-indigo-800">
                <DollarSign className="w-4 h-4" />
              </span>
              <h2 className="text-base font-bold text-slate-900">
                Sublimation Staff Salary & Payroll Management
              </h2>
            </div>
            <p className="text-xs text-slate-500 max-w-xl">
              Automatic salary calculations combining regular base hours, overtime rates ({settings.overtimeMultiplier}x), sublimation piece-rate bonuses (per design / per meter), and cash advances.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Pay Period Selector */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700">
              <Calendar className="w-4 h-4 text-cyan-600" />
              <span>Period:</span>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="2026-08-16_2026-08-31">Aug 16 - Aug 31, 2026 (Current Cutoff)</option>
                <option value="2026-08-01_2026-08-15">Aug 01 - Aug 15, 2026 (Previous Cutoff)</option>
                <option value="2026-08-01_2026-08-31">Full Month of August 2026</option>
              </select>
            </div>

            {/* Direct PDF Download Button */}
            <button
              id="btn-download-payroll-pdf"
              onClick={() => handleDownloadMonthlyPDF('selected')}
              disabled={isGeneratingPDF}
              className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-xs font-bold text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98 disabled:opacity-60"
              title="Download formatted monthly payroll and incentive PDF report"
            >
              {isGeneratingPDF ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5 text-white" />
              )}
              <span>Download PDF Report</span>
            </button>

            {/* Print/Preview Modal Trigger */}
            <button
              id="btn-generate-payroll-summary-pdf"
              onClick={() => setShowSummaryReportModal(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
              title="Open full interactive preview of the monthly payroll report"
            >
              <Printer className="w-3.5 h-3.5 text-cyan-400" />
              <span>Preview & Print</span>
            </button>

            <button
              onClick={() => onRecalculateAllPayroll(periodStart, periodEnd)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Recalculate Timecard</span>
            </button>
          </div>
        </div>

        {/* Download Success Banner */}
        {pdfDownloadedMessage && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{pdfDownloadedMessage}</span>
            </div>
            <span className="text-[11px] text-emerald-600 font-medium">Ready in Downloads folder</span>
          </div>
        )}

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6">
          <div className="dashboard-card-interactive p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block text-[11px] font-medium">Total Gross Payroll</span>
            <span className="text-base font-bold text-slate-900">
              {formatCurrency(payrollSummary.totalGross, settings.currencySymbol)}
            </span>
          </div>

          <div className="dashboard-card-interactive p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100">
            <span className="text-indigo-600 block text-[11px] font-medium">Overtime Payout (1.25x)</span>
            <span className="text-base font-bold text-indigo-900">
              {formatCurrency(payrollSummary.totalOTPay, settings.currencySymbol)}
            </span>
          </div>

          <div className="dashboard-card-interactive p-3.5 rounded-xl bg-purple-50/70 border border-purple-100">
            <span className="text-purple-600 block text-[11px] font-medium">Subli Piece-Rate Bonuses</span>
            <span className="text-base font-bold text-purple-900">
              {formatCurrency(payrollSummary.totalPiecePay, settings.currencySymbol)}
            </span>
          </div>

          <div className="dashboard-card-interactive p-3.5 rounded-xl bg-rose-50/70 border border-rose-100">
            <span className="text-rose-600 block text-[11px] font-medium">Total Deductions</span>
            <span className="text-base font-bold text-rose-900">
              -{formatCurrency(payrollSummary.totalDeductions, settings.currencySymbol)}
            </span>
          </div>

          <div className="dashboard-card-interactive p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 col-span-2 sm:col-span-1">
            <span className="text-emerald-700 block text-[11px] font-medium">Total Net Disbursed</span>
            <span className="text-base font-bold text-emerald-800">
              {formatCurrency(payrollSummary.totalNet, settings.currencySymbol)}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Payroll Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Table Filter Header */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Banknote className="w-4 h-4 text-emerald-600" />
              Staff Compensation Breakdown ({filteredRecords.length})
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            {/* Download Filtered PDF Button */}
            <button
              id="btn-table-download-summary-pdf"
              onClick={() => handleDownloadMonthlyPDF('selected')}
              disabled={isGeneratingPDF}
              className="px-3 py-1 rounded-lg bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 text-cyan-800 font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs active:scale-98 disabled:opacity-60"
              title="Download formatted monthly payroll PDF report for current selection"
            >
              {isGeneratingPDF ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5 text-cyan-700" />
              )}
              <span>Download PDF Report</span>
            </button>

            <button
              id="btn-table-print-summary-pdf"
              onClick={() => setShowSummaryReportModal(true)}
              className="px-3 py-1 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Open full interactive preview and printable payroll summary report"
            >
              <FileText className="w-3.5 h-3.5 text-purple-600" />
              <span>Full Preview (PDF)</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="text-slate-500">Role:</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-medium"
              >
                <option value="all">All Roles</option>
                <option value="artist">Artists Only</option>
                <option value="machine_operator">Machine Operators</option>
                <option value="sewing_finishing">Sewing & Finishing</option>
                <option value="supervisor">Supervisors</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-medium"
              >
                <option value="all">All Payment Statuses</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending Approval</option>
                <option value="processing">Processing</option>
              </select>
            </div>
          </div>
        </div>

        {/* Salary Records Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Base Rate</th>
                <th className="py-3 px-4">Reg Hours</th>
                <th className="py-3 px-4">OT Hours & Pay</th>
                <th className="py-3 px-4">Piece-Rate Units & Pay</th>
                <th className="py-3 px-4">Deductions</th>
                <th className="py-3 px-4 font-bold text-slate-900">Net Salary</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map((sal) => {
                const roleBadge = getRoleBadgeColor(sal.role);
                const statusBadge = getStatusBadge(sal.paymentStatus);

                const totalDed =
                  sal.deductions.lateDeduction +
                  sal.deductions.cashAdvance +
                  sal.deductions.taxInsurance +
                  sal.deductions.other;

                return (
                  <tr key={sal.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Name */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{sal.employeeName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{sal.id}</div>
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${roleBadge.bg} ${roleBadge.text} ${roleBadge.border}`}>
                        {sal.role === 'artist' ? 'Graphic Artist' : sal.role === 'machine_operator' ? 'Machine Operator' : sal.role === 'sewing_finishing' ? 'Sewing' : 'Supervisor'}
                      </span>
                    </td>

                    {/* Base Rate */}
                    <td className="py-3.5 px-4 font-semibold text-slate-700">
                      {formatCurrency(sal.hourlyRate, settings.currencySymbol)}/hr
                    </td>

                    {/* Regular Hours & Pay */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{sal.regularHours} hrs</div>
                      <div className="text-[10px] text-slate-500">
                        {formatCurrency(sal.regularPay, settings.currencySymbol)}
                      </div>
                    </td>

                    {/* OT Hours & Pay */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-indigo-600">+{sal.overtimeHours} hrs OT</div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        {formatCurrency(sal.overtimePay, settings.currencySymbol)}
                      </div>
                    </td>

                    {/* Piece-Rate Bonus */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-purple-700">
                        {sal.pieceRateUnits > 0 ? (
                          sal.role === 'artist'
                            ? `${sal.pieceRateUnits} designs`
                            : `${sal.pieceRateUnits}m printed`
                        ) : (
                          '--'
                        )}
                      </div>
                      <div className="text-[10px] text-purple-600 font-bold">
                        +{formatCurrency(sal.pieceRatePay, settings.currencySymbol)}
                      </div>
                    </td>

                    {/* Deductions */}
                    <td className="py-3.5 px-4">
                      <span className="text-rose-600 font-semibold">
                        -{formatCurrency(totalDed, settings.currencySymbol)}
                      </span>
                      {sal.deductions.lateDeduction > 0 && (
                        <div className="text-[10px] text-amber-600">
                          Late: -{formatCurrency(sal.deductions.lateDeduction, settings.currencySymbol)}
                        </div>
                      )}
                      {sal.deductions.cashAdvance > 0 && (
                        <div className="text-[10px] text-slate-500">
                          Advance: -{formatCurrency(sal.deductions.cashAdvance, settings.currencySymbol)}
                        </div>
                      )}
                    </td>

                    {/* Net Salary */}
                    <td className="py-3.5 px-4">
                      <div className="text-sm font-bold text-emerald-700">
                        {formatCurrency(sal.netSalary, settings.currencySymbol)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Gross: {formatCurrency(sal.grossPay, settings.currencySymbol)}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleTogglePaid(sal)}
                        title="Click to toggle Paid status"
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border cursor-pointer transition-colors ${statusBadge.bg}`}
                      >
                        {statusBadge.text}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleDownloadIndividualPayslip(sal)}
                          title={`Download ${sal.employeeName}'s Payslip as PDF`}
                          className="p-1.5 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(sal)}
                          title="Adjust bonuses / deductions"
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          Adjust
                        </button>
                        <button
                          onClick={() => onSelectPayslip(sal)}
                          title="Generate printable formal payslip"
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <FileText className="w-3 h-3 text-cyan-400" />
                          <span>Payslip</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Bonuses & Deductions Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-auto">
            <div className="flex items-center justify-between pb-3 sm:pb-4 mb-3 sm:mb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Adjust Compensation & Deductions
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {editingRecord.employeeName} ({editingRecord.role})
                </p>
              </div>
              <button
                onClick={() => setEditingRecord(null)}
                className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-600 text-lg font-bold rounded-lg hover:bg-slate-100 cursor-pointer"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAdjustments} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Piece-Rate Output Units (
                  {editingRecord.role === 'artist'
                    ? 'Custom Jersey Layouts'
                    : 'Meters Sublimation Paper / Fabric'}
                  )
                </label>
                <input
                  type="number"
                  step="any"
                  value={editForm.pieceRateUnits}
                  onChange={(e) =>
                    setEditForm({ ...editForm, pieceRateUnits: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Allowances ({settings.currencySymbol})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editForm.allowances}
                    onChange={(e) =>
                      setEditForm({ ...editForm, allowances: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Cash Advance ({settings.currencySymbol})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editForm.cashAdvance}
                    onChange={(e) =>
                      setEditForm({ ...editForm, cashAdvance: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Late Penalty ({settings.currencySymbol})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editForm.lateDeduction}
                    onChange={(e) =>
                      setEditForm({ ...editForm, lateDeduction: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tax / SSS / Insurance ({settings.currencySymbol})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editForm.taxInsurance}
                    onChange={(e) =>
                      setEditForm({ ...editForm, taxInsurance: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={editForm.paymentMethod}
                  onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-indigo-500"
                >
                  <option value="Bank Transfer">Bank Transfer / Direct Deposit</option>
                  <option value="Cash">Cash Envelope</option>
                  <option value="E-Wallet">E-Wallet (GCash / Maya)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Payroll Note / Memo
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Approved piece rate bonus for 18 jersey approvals"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-indigo-500"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-center cursor-pointer border border-slate-200 sm:border-transparent transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-5 py-2.5 sm:py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs cursor-pointer text-center justify-center transition-colors active:scale-98"
                >
                  Save Salary Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Monthly Payroll & Production Bonus Summary PDF Modal */}
      {showSummaryReportModal && (
        <PayrollSummaryReportModal
          salaryRecords={salaryRecords}
          employees={employees}
          settings={settings}
          selectedPeriod={selectedPeriod}
          onClose={() => setShowSummaryReportModal(false)}
        />
      )}
    </div>
  );
};
