import React, { useState, useMemo } from 'react';
import {
  Printer,
  X,
  FileText,
  CheckCircle2,
  Calendar,
  DollarSign,
  Layers,
  Download,
  TrendingUp,
  Award,
  Sparkles,
  Percent,
  Users,
  ShieldCheck,
  Building2,
  HelpCircle,
  FileDown,
  Loader2,
} from 'lucide-react';
import { SalaryRecord, ShopSettings, Employee } from '../types';
import { formatCurrency, getRoleBadgeColor } from '../utils/calculations';
import { generateMonthlyPayrollPDF } from '../utils/pdfExport';

interface PayrollSummaryReportModalProps {
  salaryRecords: SalaryRecord[];
  employees: Employee[];
  settings: ShopSettings;
  selectedPeriod: string;
  onClose: () => void;
}

export const PayrollSummaryReportModal: React.FC<PayrollSummaryReportModalProps> = ({
  salaryRecords,
  employees,
  settings,
  selectedPeriod,
  onClose,
}) => {
  const [reportPeriod, setReportPeriod] = useState<string>(selectedPeriod);
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [isDownloadingPDF, setIsDownloadingPDF] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  const [periodStart, periodEnd] = reportPeriod.split('_');

  const getPeriodLabel = (periodKey: string) => {
    if (periodKey === '2026-08-01_2026-08-31') return 'Full Month: August 2026';
    if (periodKey === '2026-08-16_2026-08-31') return 'Aug 16 - Aug 31, 2026 (2nd Cutoff)';
    if (periodKey === '2026-08-01_2026-08-15') return 'Aug 01 - Aug 15, 2026 (1st Cutoff)';
    return periodKey.replace('_', ' to ');
  };

  const handleDownloadPDF = () => {
    setIsDownloadingPDF(true);
    try {
      generateMonthlyPayrollPDF({
        salaryRecords,
        employees,
        settings,
        periodLabel: getPeriodLabel(reportPeriod),
        departmentFilter,
      });
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to download PDF:', err);
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  // Fast employee map
  const employeeMap = useMemo(() => {
    const map = new Map<string, Employee>();
    employees.forEach((emp) => map.set(emp.id, emp));
    return map;
  }, [employees]);

  // Filtered records
  const targetRecords = useMemo(() => {
    return salaryRecords.filter((rec) => {
      if (departmentFilter !== 'all' && rec.role !== departmentFilter) return false;
      return true;
    });
  }, [salaryRecords, departmentFilter]);

  // Aggregate Computation: Disbursed Salaries vs Production Bonuses
  const reportSummary = useMemo(() => {
    let totalGrossPay = 0;
    let totalNetDisbursed = 0;
    let totalRegularBasePay = 0;
    let totalOvertimePay = 0;
    let totalProductionBonuses = 0;
    let totalAllowances = 0;
    let totalDeductions = 0;
    let totalPieceUnits = 0;
    let totalRegHours = 0;
    let totalOtHours = 0;
    let paidCount = 0;
    let pendingCount = 0;

    targetRecords.forEach((rec) => {
      totalGrossPay += rec.grossPay;
      totalNetDisbursed += rec.netSalary;
      totalRegularBasePay += rec.regularPay;
      totalOvertimePay += rec.overtimePay;
      totalProductionBonuses += rec.pieceRatePay || 0;
      totalAllowances += rec.allowances || 0;
      totalPieceUnits += rec.pieceRateUnits || 0;
      totalRegHours += rec.regularHours || 0;
      totalOtHours += rec.overtimeHours || 0;

      const ded =
        rec.deductions.lateDeduction +
        rec.deductions.cashAdvance +
        rec.deductions.taxInsurance +
        rec.deductions.other;
      totalDeductions += ded;

      if (rec.paymentStatus === 'paid') paidCount++;
      else pendingCount++;
    });

    const bonusRatioOfGross = totalGrossPay > 0 ? (totalProductionBonuses / totalGrossPay) * 100 : 0;
    const bonusRatioOfNet = totalNetDisbursed > 0 ? (totalProductionBonuses / totalNetDisbursed) * 100 : 0;
    const regularShareOfGross = totalGrossPay > 0 ? (totalRegularBasePay / totalGrossPay) * 100 : 0;
    const overtimeShareOfGross = totalGrossPay > 0 ? (totalOvertimePay / totalGrossPay) * 100 : 0;

    return {
      totalGrossPay,
      totalNetDisbursed,
      totalRegularBasePay,
      totalOvertimePay,
      totalProductionBonuses,
      totalAllowances,
      totalDeductions,
      totalPieceUnits,
      totalRegHours,
      totalOtHours,
      paidCount,
      pendingCount,
      bonusRatioOfGross: Number(bonusRatioOfGross.toFixed(1)),
      bonusRatioOfNet: Number(bonusRatioOfNet.toFixed(1)),
      regularShareOfGross: Number(regularShareOfGross.toFixed(1)),
      overtimeShareOfGross: Number(overtimeShareOfGross.toFixed(1)),
    };
  }, [targetRecords]);

  // Departmental breakdown
  const departmentBreakdown = useMemo(() => {
    const roles: Array<{ key: string; label: string }> = [
      { key: 'artist', label: 'Graphic & Vector Artists' },
      { key: 'machine_operator', label: 'Machine & Press Operators' },
      { key: 'sewing_finishing', label: 'Sewing & Finishing Staff' },
      { key: 'supervisor', label: 'Plant Supervisors & Quality Control' },
    ];

    return roles.map(({ key, label }) => {
      const group = salaryRecords.filter((r) => r.role === key);
      let headCount = group.length;
      let regPay = 0;
      let otPay = 0;
      let bonuses = 0;
      let gross = 0;
      let deductions = 0;
      let net = 0;
      let units = 0;

      group.forEach((r) => {
        regPay += r.regularPay;
        otPay += r.overtimePay;
        bonuses += r.pieceRatePay || 0;
        gross += r.grossPay;
        net += r.netSalary;
        units += r.pieceRateUnits || 0;
        deductions +=
          r.deductions.lateDeduction +
          r.deductions.cashAdvance +
          r.deductions.taxInsurance +
          r.deductions.other;
      });

      const bonusPercent = gross > 0 ? ((bonuses / gross) * 100).toFixed(1) : '0.0';

      return {
        key,
        label,
        headCount,
        regPay,
        otPay,
        bonuses,
        gross,
        deductions,
        net,
        units,
        bonusPercent,
      };
    });
  }, [salaryRecords]);

  const handlePrint = () => {
    window.print();
  };

  const formattedPeriodLabel =
    reportPeriod === '2026-08-01_2026-08-31'
      ? 'August 01 - August 31, 2026 (Full Month Summary)'
      : reportPeriod === '2026-08-16_2026-08-31'
      ? 'August 16 - August 31, 2026 (Current Cutoff Period)'
      : 'August 01 - August 15, 2026 (Previous Cutoff Period)';

  return (
    <div
      id="payroll-summary-report-modal-overlay"
      className="fixed inset-0 z-50 flex justify-center items-start min-h-screen bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 md:p-6 overflow-y-auto"
    >
      <div
        id="payroll-summary-report-modal"
        className="bg-white rounded-2xl max-w-3xl w-full my-2 sm:my-4 shadow-2xl border border-slate-200 flex flex-col max-h-[calc(100vh-2rem)] overflow-hidden animate-in fade-in zoom-in-95 duration-150 print:m-0 print:p-0 print:border-none print:shadow-none print:max-w-none print:w-full print:max-h-none print:overflow-visible"
      >
        {/* Top Control Bar (Hidden on Print) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-3.5 sm:px-5 py-2.5 bg-white border-b border-slate-200 gap-2.5 flex-shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200">
              <FileText className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">
                Monthly Payroll & Production Bonus Summary Report
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-500">
                Disbursed wages vs. piece-rate bonuses audit
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Period Picker */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
              <select
                value={reportPeriod}
                onChange={(e) => setReportPeriod(e.target.value)}
                className="bg-transparent font-bold text-slate-800 focus:outline-hidden cursor-pointer text-xs"
              >
                <option value="2026-08-01_2026-08-31">Full Month: August 2026</option>
                <option value="2026-08-16_2026-08-31">Current Cutoff: Aug 16-31</option>
                <option value="2026-08-01_2026-08-15">Previous Cutoff: Aug 01-15</option>
              </select>
            </div>

            {/* Direct PDF Download Button */}
            <button
              id="btn-download-payroll-pdf-modal"
              onClick={handleDownloadPDF}
              disabled={isDownloadingPDF}
              className="px-2.5 sm:px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-98 disabled:opacity-60"
              title="Download formatted vector PDF report directly to your computer"
            >
              {isDownloadingPDF ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5 text-white" />
              )}
              <span className="hidden sm:inline">Download PDF</span>
              <span className="sm:hidden">PDF</span>
            </button>

            {/* Print / Save PDF Button */}
            <button
              id="btn-print-payroll-pdf"
              onClick={handlePrint}
              className="px-2.5 sm:px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-98"
              title="Print or save via browser system dialog"
            >
              <Printer className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Print</span>
            </button>

            {/* Close Modal Button */}
            <button
              id="btn-close-payroll-pdf-modal"
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {downloadSuccess && (
          <div className="mx-4 sm:mx-5 my-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs font-medium text-emerald-800 animate-in fade-in duration-150 print:hidden">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Monthly payroll summary PDF has been generated and saved to your device.</span>
          </div>
        )}

        {/* Scrollable Printable Document Body */}
        <div className="p-3.5 sm:p-5 overflow-y-auto flex-1 space-y-3 sm:space-y-4 print:p-0 print:space-y-0 print:overflow-visible">
          {/* 1. Official Header & Plant Details */}
          <div className="flex flex-col sm:flex-row items-start justify-between border-b-2 border-slate-900 pb-3 mb-2 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-2xs">
                  <Layers className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <h1 className="text-base font-extrabold text-slate-900 tracking-tight leading-tight">
                    {settings.shopName}
                  </h1>
                  <p className="text-[10px] font-medium text-slate-500">
                    {settings.tagline} • Full Sublimation Manufacturing
                  </p>
                </div>
              </div>
              <div className="text-[9px] text-slate-400 mt-1 space-y-0.5">
                <p>Plant ID: SUB-PLANT-0826 • Tax ID: PH-98214-SUB • Currency: {settings.currencySymbol} (USD)</p>
                <p>Overtime Rate Multiplier: {settings.overtimeMultiplier}x • Standard Shift: {settings.standardShiftStart} - {settings.standardShiftEnd}</p>
              </div>
            </div>

            <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 w-full sm:w-auto">
              <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-[9px] font-extrabold tracking-wider uppercase text-slate-800 mb-0.5">
                EXECUTIVE PAYROLL AUDIT
              </span>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900">
                Monthly Compensation & Bonus Report
              </h2>
              <div className="text-[11px] text-slate-600 mt-0.5">
                Period: <strong className="text-slate-900">{formattedPeriodLabel}</strong>
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5">
                Generated: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>

          {/* 2. Core Comparison KPI Banner: Salary Disbursed vs Production Bonuses Paid Out */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xs">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-700/80">
              <span className="text-[10px] sm:text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Disbursed Salaries vs. Production Incentive Bonuses
              </span>
              <span className="text-[10px] sm:text-[11px] text-slate-300">
                Staff: <strong className="text-white font-mono">{targetRecords.length} Employees</strong>
              </span>
            </div>

            {/* 3 Main Comparison Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
              {/* Box 1: Total Salary Disbursed (Net) */}
              <div className="p-2.5 sm:p-3 bg-white/5 rounded-lg border border-white/10 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-medium block">
                    Total Net Salary Disbursed
                  </span>
                  <div className="text-lg sm:text-xl font-extrabold text-emerald-400 font-mono mt-0.5">
                    {formatCurrency(reportSummary.totalNetDisbursed, settings.currencySymbol)}
                  </div>
                </div>
                <div className="mt-1.5 pt-1.5 border-t border-white/10 text-[9.5px] text-slate-300 flex justify-between">
                  <span>Gross:</span>
                  <span className="font-bold text-white font-mono">
                    {formatCurrency(reportSummary.totalGrossPay, settings.currencySymbol)}
                  </span>
                </div>
              </div>

              {/* Box 2: Total Production Bonuses Paid Out */}
              <div className="p-2.5 sm:p-3 bg-purple-500/10 rounded-lg border border-purple-400/30 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-purple-300 font-medium block">
                      Production Bonuses Paid Out
                    </span>
                    <Award className="w-3.5 h-3.5 text-purple-300" />
                  </div>
                  <div className="text-lg sm:text-xl font-extrabold text-purple-300 font-mono mt-0.5">
                    {formatCurrency(reportSummary.totalProductionBonuses, settings.currencySymbol)}
                  </div>
                </div>
                <div className="mt-1.5 pt-1.5 border-t border-purple-400/20 text-[9.5px] text-purple-200 flex justify-between">
                  <span>Piece Units:</span>
                  <span className="font-bold text-white font-mono">
                    {reportSummary.totalPieceUnits.toLocaleString()} units
                  </span>
                </div>
              </div>

              {/* Box 3: Bonus to Payroll Ratio & Impact */}
              <div className="p-2.5 sm:p-3 bg-white/5 rounded-lg border border-white/10 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-medium block">
                      Bonus Share of Gross
                    </span>
                    <Percent className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div className="text-lg sm:text-xl font-extrabold text-cyan-300 font-mono mt-0.5">
                    {reportSummary.bonusRatioOfGross}%
                  </div>
                </div>
                <div className="mt-1.5 pt-1.5 border-t border-white/10 text-[9.5px] text-slate-300 flex justify-between">
                  <span>Ratio vs Net:</span>
                  <span className="font-bold text-purple-300 font-mono">
                    {reportSummary.bonusRatioOfNet}% of Net
                  </span>
                </div>
              </div>
            </div>

            {/* Compensation Mix Visual Ratio Bar */}
            <div className="mt-2.5 pt-2 border-t border-slate-700/80">
              <div className="flex justify-between text-[9px] sm:text-[10px] text-slate-300 mb-1">
                <span>Compensation Structure Distribution</span>
                <span className="font-mono text-[9px]">
                  Base: {reportSummary.regularShareOfGross}% • OT: {reportSummary.overtimeShareOfGross}% • Bonus: {reportSummary.bonusRatioOfGross}%
                </span>
              </div>
              <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden flex">
                <div
                  title={`Base Hourly Pay (${reportSummary.regularShareOfGross}%)`}
                  className="h-full bg-sky-400"
                  style={{ width: `${reportSummary.regularShareOfGross}%` }}
                />
                <div
                  title={`Overtime Pay (${reportSummary.overtimeShareOfGross}%)`}
                  className="h-full bg-indigo-500"
                  style={{ width: `${reportSummary.overtimeShareOfGross}%` }}
                />
                <div
                  title={`Sublimation Piece-Rate Bonuses (${reportSummary.bonusRatioOfGross}%)`}
                  className="h-full bg-purple-500"
                  style={{ width: `${reportSummary.bonusRatioOfGross}%` }}
                />
              </div>
            </div>
          </div>

          {/* 3. Departmental Summary Table: Base vs Bonus vs Disbursed */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-600" />
              1. Departmental Disbursement & Bonus Breakdown
            </h3>
            <div className="border border-slate-200 rounded-lg overflow-x-auto shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[9.5px] border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-2.5">Department / Craft</th>
                    <th className="py-2 px-2 text-center">Staff</th>
                    <th className="py-2 px-2.5 text-right">Regular Base</th>
                    <th className="py-2 px-2.5 text-right">Overtime</th>
                    <th className="py-2 px-2.5 text-right bg-purple-50/70 text-purple-900 font-extrabold">
                      Production Bonuses
                    </th>
                    <th className="py-2 px-2 text-center bg-purple-50/70 text-purple-900">
                      Bonus %
                    </th>
                    <th className="py-2 px-2.5 text-right">Deductions</th>
                    <th className="py-2 px-2.5 text-right font-extrabold text-emerald-900 bg-emerald-50/50">
                      Net Disbursed
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-[11px]">
                  {departmentBreakdown.map((dept) => (
                    <tr key={dept.key} className="hover:bg-slate-50">
                      <td className="py-1.5 px-2.5 font-semibold text-slate-900">
                        {dept.label}
                      </td>
                      <td className="py-1.5 px-2 text-center text-slate-600 font-mono">
                        {dept.headCount}
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-mono text-slate-700">
                        {formatCurrency(dept.regPay, settings.currencySymbol)}
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-mono text-indigo-700">
                        {formatCurrency(dept.otPay, settings.currencySymbol)}
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-mono font-bold text-purple-800 bg-purple-50/40">
                        {formatCurrency(dept.bonuses, settings.currencySymbol)}
                      </td>
                      <td className="py-1.5 px-2 text-center font-mono font-semibold text-purple-700 bg-purple-50/40 text-[10px]">
                        {dept.bonusPercent}%
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-mono text-rose-600">
                        -{formatCurrency(dept.deductions, settings.currencySymbol)}
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-mono font-bold text-emerald-800 bg-emerald-50/30">
                        {formatCurrency(dept.net, settings.currencySymbol)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100/90 font-extrabold text-slate-900 border-t-2 border-slate-300 text-[11px]">
                  <tr>
                    <td className="py-2 px-2.5">TOTAL PLANT AUDIT</td>
                    <td className="py-2 px-2 text-center font-mono">{targetRecords.length}</td>
                    <td className="py-2 px-2.5 text-right font-mono">
                      {formatCurrency(reportSummary.totalRegularBasePay, settings.currencySymbol)}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono text-indigo-900">
                      {formatCurrency(reportSummary.totalOvertimePay, settings.currencySymbol)}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono text-purple-900 bg-purple-100/80">
                      {formatCurrency(reportSummary.totalProductionBonuses, settings.currencySymbol)}
                    </td>
                    <td className="py-2 px-2 text-center font-mono text-purple-900 bg-purple-100/80">
                      {reportSummary.bonusRatioOfGross}%
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono text-rose-800">
                      -{formatCurrency(reportSummary.totalDeductions, settings.currencySymbol)}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono text-emerald-950 bg-emerald-100/80 font-bold">
                      {formatCurrency(reportSummary.totalNetDisbursed, settings.currencySymbol)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* 4. Detailed Employee Itemized Compensation & Bonus Schedule */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-600" />
              2. Itemized Staff Compensation & Production Bonus Schedule
            </h3>
            <div className="border border-slate-200 rounded-lg overflow-x-auto shadow-2xs">
              <table className="w-full text-left text-[10.5px] border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[9px] border-b border-slate-200">
                  <tr>
                    <th className="py-1.5 px-2">Staff</th>
                    <th className="py-1.5 px-1.5">Role</th>
                    <th className="py-1.5 px-1.5 text-right">Base Wage</th>
                    <th className="py-1.5 px-1.5 text-right">OT Pay</th>
                    <th className="py-1.5 px-2 text-right bg-purple-50 text-purple-900 font-extrabold">
                      Bonus
                    </th>
                    <th className="py-1.5 px-1.5 text-right">Allow.</th>
                    <th className="py-1.5 px-1.5 text-right">Gross Pay</th>
                    <th className="py-1.5 px-1.5 text-right">Deduct.</th>
                    <th className="py-1.5 px-2 text-right font-bold text-emerald-900 bg-emerald-50">
                      Net Pay
                    </th>
                    <th className="py-1.5 px-1.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {targetRecords.map((rec) => {
                    const emp = employeeMap.get(rec.employeeId);
                    const totalDed =
                      rec.deductions.lateDeduction +
                      rec.deductions.cashAdvance +
                      rec.deductions.taxInsurance +
                      rec.deductions.other;

                    return (
                      <tr key={rec.id} className="hover:bg-slate-50/80">
                        <td className="py-1.5 px-2">
                          <span className="font-mono text-[9px] text-slate-400 block">
                            {emp?.code || 'EMP'}
                          </span>
                          <span className="font-bold text-slate-900">{rec.employeeName}</span>
                        </td>
                        <td className="py-1.5 px-1.5 text-slate-600">
                          {rec.role === 'artist'
                            ? 'Artist'
                            : rec.role === 'machine_operator'
                            ? 'Operator'
                            : rec.role === 'sewing_finishing'
                            ? 'Sewing'
                            : 'Supervisor'}
                        </td>
                        <td className="py-1.5 px-1.5 text-right font-mono">
                          {formatCurrency(rec.regularPay, settings.currencySymbol)}
                        </td>
                        <td className="py-1.5 px-1.5 text-right font-mono text-indigo-700">
                          {formatCurrency(rec.overtimePay, settings.currencySymbol)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono font-bold text-purple-900 bg-purple-50/40">
                          {formatCurrency(rec.pieceRatePay || 0, settings.currencySymbol)}
                          <span className="text-[8.5px] font-normal text-purple-600 block">
                            ({rec.pieceRateUnits || 0}u)
                          </span>
                        </td>
                        <td className="py-1.5 px-1.5 text-right font-mono text-slate-600">
                          {formatCurrency(rec.allowances || 0, settings.currencySymbol)}
                        </td>
                        <td className="py-1.5 px-1.5 text-right font-mono font-semibold text-slate-900">
                          {formatCurrency(rec.grossPay, settings.currencySymbol)}
                        </td>
                        <td className="py-1.5 px-1.5 text-right font-mono text-rose-600">
                          -{formatCurrency(totalDed, settings.currencySymbol)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono font-bold text-emerald-800 bg-emerald-50/40">
                          {formatCurrency(rec.netSalary, settings.currencySymbol)}
                        </td>
                        <td className="py-1.5 px-1.5 text-center">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold uppercase ${
                              rec.paymentStatus === 'paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {rec.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 5. Official Verification & Approval Signatures (Print Ready) */}
          <div className="pt-3 border-t-2 border-slate-900 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-center text-xs mt-3">
            <div className="p-2 bg-slate-50/60 rounded-lg border border-slate-200">
              <div className="h-8 border-b border-dashed border-slate-400 mb-1 flex items-end justify-center pb-0.5">
                <span className="font-serif italic text-slate-700 text-[11px] truncate">
                  {settings.signatories?.preparedByName || 'Elena Rostova'}
                </span>
              </div>
              <span className="font-bold text-slate-900 block text-[10px] truncate">
                Prepared: {settings.signatories?.preparedByName || 'Elena Rostova'}
              </span>
              <span className="text-[8.5px] text-slate-500 block truncate">
                {settings.signatories?.preparedByTitle || 'Senior Payroll Auditor'}
              </span>
            </div>

            <div className="p-2 bg-slate-50/60 rounded-lg border border-slate-200">
              <div className="h-8 border-b border-dashed border-slate-400 mb-1 flex items-end justify-center pb-0.5">
                <span className="font-serif italic text-slate-700 text-[11px] truncate">
                  {settings.signatories?.certifiedByName || 'Marcus Vance'}
                </span>
              </div>
              <span className="font-bold text-slate-900 block text-[10px] truncate">
                Certified: {settings.signatories?.certifiedByName || 'Marcus Vance'}
              </span>
              <span className="text-[8.5px] text-slate-500 block truncate">
                {settings.signatories?.certifiedByTitle || 'Plant Operations Director'}
              </span>
            </div>

            <div className="p-2 bg-indigo-50/50 rounded-lg border border-indigo-200">
              <div className="h-8 border-b border-dashed border-indigo-400 mb-1 flex items-end justify-center pb-0.5">
                <span className="font-serif italic text-indigo-900 font-bold text-[11px] truncate">
                  {settings.signatories?.approvedByName || 'David Sterling'}
                </span>
              </div>
              <span className="font-bold text-indigo-950 block text-[10px] truncate">
                Approved: {settings.signatories?.approvedByName || 'David Sterling'}
              </span>
              <span className="text-[8.5px] text-indigo-700 block truncate">
                {settings.signatories?.approvedByTitle || 'Managing Director / Owner'}
              </span>
            </div>
          </div>

          {/* Document Footer Disclaimer */}
          <div className="text-[8.5px] text-slate-400 text-center mt-2 pt-2 border-t border-slate-200">
            Certified executive payroll summary for {settings.shopName}. Confidential and intended solely for internal accounting and plant audit.
          </div>
        </div>

        {/* Sticky Footer with Compact Close Button */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end flex-shrink-0 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          >
            Close Summary Report
          </button>
        </div>
      </div>
    </div>
  );
};
