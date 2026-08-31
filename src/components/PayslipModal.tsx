import React, { useState } from 'react';
import {
  Printer,
  X,
  FileText,
  CheckCircle2,
  Layers,
  FileDown,
  Loader2,
  Edit3,
  PenTool,
  UserCheck,
  ShieldCheck,
  Save,
  RotateCcw,
} from 'lucide-react';
import { SalaryRecord, ShopSettings, Employee, PayslipSignatories } from '../types';
import { formatCurrency, getRoleBadgeColor } from '../utils/calculations';
import { generateIndividualPayslipPDF } from '../utils/pdfExport';

interface PayslipModalProps {
  salaryRecord: SalaryRecord;
  employee?: Employee;
  settings: ShopSettings;
  onClose: () => void;
  onUpdateSettings?: (newSettings: ShopSettings) => void;
}

export const PayslipModal: React.FC<PayslipModalProps> = ({
  salaryRecord,
  employee,
  settings,
  onClose,
  onUpdateSettings,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [showEditSignatories, setShowEditSignatories] = useState(false);
  const [signatorySaveSuccess, setSignatorySaveSuccess] = useState(false);

  const [activeSignatories, setActiveSignatories] = useState<PayslipSignatories>({
    preparedByName: settings.signatories?.preparedByName || 'Elena Rostova',
    preparedByTitle: settings.signatories?.preparedByTitle || 'Senior Payroll & Timecard Auditor',
    certifiedByName: settings.signatories?.certifiedByName || 'Marcus Vance',
    certifiedByTitle: settings.signatories?.certifiedByTitle || 'Plant Operations Director',
    approvedByName: settings.signatories?.approvedByName || 'David Sterling',
    approvedByTitle: settings.signatories?.approvedByTitle || 'Managing Director / Shop Owner',
  });

  const effectiveSettings: ShopSettings = {
    ...settings,
    signatories: activeSignatories,
  };

  const roleBadge = getRoleBadgeColor(salaryRecord.role);

  const totalDeductions =
    salaryRecord.deductions.lateDeduction +
    salaryRecord.deductions.cashAdvance +
    salaryRecord.deductions.taxInsurance +
    salaryRecord.deductions.other;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    setIsDownloading(true);
    try {
      generateIndividualPayslipPDF(
        salaryRecord,
        employee,
        effectiveSettings,
        `${salaryRecord.periodStart} to ${salaryRecord.periodEnd}`
      );
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to export payslip PDF:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSaveSignatories = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedSettings: ShopSettings = {
      ...settings,
      signatories: activeSignatories,
    };
    if (onUpdateSettings) {
      onUpdateSettings(updatedSettings);
    }
    setSignatorySaveSuccess(true);
    setTimeout(() => {
      setSignatorySaveSuccess(false);
      setShowEditSignatories(false);
    }, 1200);
  };

  const handleResetSignatories = () => {
    const defaults: PayslipSignatories = {
      preparedByName: 'Elena Rostova',
      preparedByTitle: 'Senior Payroll & Timecard Auditor',
      certifiedByName: 'Marcus Vance',
      certifiedByTitle: 'Plant Operations Director',
      approvedByName: 'David Sterling',
      approvedByTitle: 'Managing Director / Shop Owner',
    };
    setActiveSignatories(defaults);
    if (onUpdateSettings) {
      onUpdateSettings({
        ...settings,
        signatories: defaults,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs p-2 sm:p-4 md:p-6 flex justify-center items-start min-h-screen">
      <div className="bg-white rounded-2xl max-w-3xl w-full my-3 sm:my-6 shadow-2xl border border-slate-200 flex flex-col max-h-[calc(100vh-2rem)] overflow-hidden animate-in fade-in zoom-in-95 duration-150 print:m-0 print:p-0 print:border-none print:shadow-none print:max-h-none print:overflow-visible">
        {/* Sticky Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-white border-b border-slate-100 flex-shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700">
              <FileText className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Official Sublimation Employee Payslip
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-500">
                Aspirant Sportswear Certified Wage Voucher
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setShowEditSignatories((prev) => !prev)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border shadow-2xs ${
                showEditSignatories
                  ? 'bg-indigo-600 text-white border-indigo-700'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
              }`}
              title="Edit signatories (Admin / Owner full name, auditor, certifier)"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{showEditSignatories ? 'Close Edit' : 'Change Signatory Names'}</span>
              <span className="sm:hidden">Names</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="px-2.5 sm:px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-98 disabled:opacity-60"
            >
              {isDownloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5 text-white" />
              )}
              <span className="hidden sm:inline">Download PDF</span>
              <span className="sm:hidden">PDF</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-2.5 sm:px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-98"
            >
              <Printer className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer text-base font-bold ml-1"
              aria-label="Close payslip"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 print:p-0 print:space-y-0 print:overflow-visible">
          {downloadSuccess && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 animate-in fade-in duration-150 print:hidden">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Official payslip PDF with all 4 authorized signatures downloaded successfully!</span>
            </div>
          )}

          {/* Inline Signatories Customization Drawer */}
          {showEditSignatories && (
            <form
              onSubmit={handleSaveSignatories}
              className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white border border-indigo-500/30 shadow-lg space-y-3 animate-in fade-in duration-150 print:hidden"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-indigo-500/30 text-cyan-300">
                    <Edit3 className="w-3.5 h-3.5" />
                  </span>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Signatory & Owner Name Customization
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={handleResetSignatories}
                  className="text-[11px] text-slate-300 hover:text-white underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Reset Defaults
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* 1. Prepared by */}
                <div className="p-2.5 bg-slate-800/90 rounded-lg border border-slate-700 space-y-1.5">
                  <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider block flex items-center gap-1">
                    <PenTool className="w-3 h-3 text-cyan-400" /> 1. Prepared by
                  </span>
                  <div>
                    <label className="text-[9px] text-slate-400 block mb-0.5 font-medium">Full Name</label>
                    <input
                      type="text"
                      value={activeSignatories.preparedByName || ''}
                      onChange={(e) =>
                        setActiveSignatories({ ...activeSignatories, preparedByName: e.target.value })
                      }
                      placeholder="e.g. Elena Rostova"
                      className="w-full bg-slate-900 border border-slate-600 rounded-md px-2 py-1 text-xs text-white font-medium focus:border-cyan-400 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 block mb-0.5 font-medium">Role / Title</label>
                    <input
                      type="text"
                      value={activeSignatories.preparedByTitle || ''}
                      onChange={(e) =>
                        setActiveSignatories({ ...activeSignatories, preparedByTitle: e.target.value })
                      }
                      placeholder="e.g. Senior Payroll Auditor"
                      className="w-full bg-slate-900 border border-slate-600 rounded-md px-2 py-1 text-[11px] text-slate-300 focus:border-cyan-400 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* 2. Certified by */}
                <div className="p-2.5 bg-slate-800/90 rounded-lg border border-slate-700 space-y-1.5">
                  <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block flex items-center gap-1">
                    <UserCheck className="w-3 h-3 text-indigo-400" /> 2. Certified by
                  </span>
                  <div>
                    <label className="text-[9px] text-slate-400 block mb-0.5 font-medium">Full Name</label>
                    <input
                      type="text"
                      value={activeSignatories.certifiedByName || ''}
                      onChange={(e) =>
                        setActiveSignatories({ ...activeSignatories, certifiedByName: e.target.value })
                      }
                      placeholder="e.g. Marcus Vance"
                      className="w-full bg-slate-900 border border-slate-600 rounded-md px-2 py-1 text-xs text-white font-medium focus:border-indigo-400 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 block mb-0.5 font-medium">Role / Title</label>
                    <input
                      type="text"
                      value={activeSignatories.certifiedByTitle || ''}
                      onChange={(e) =>
                        setActiveSignatories({ ...activeSignatories, certifiedByTitle: e.target.value })
                      }
                      placeholder="e.g. Plant Operations Director"
                      className="w-full bg-slate-900 border border-slate-600 rounded-md px-2 py-1 text-[11px] text-slate-300 focus:border-indigo-400 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* 3. Approved by (Admin / Owner) */}
                <div className="p-2.5 bg-indigo-950/80 rounded-lg border border-indigo-500/50 space-y-1.5">
                  <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-amber-400" /> 3. Approved by (Owner/Admin)
                  </span>
                  <div>
                    <label className="text-[9px] text-indigo-200 block mb-0.5 font-medium">Owner/Admin Name</label>
                    <input
                      type="text"
                      value={activeSignatories.approvedByName || ''}
                      onChange={(e) =>
                        setActiveSignatories({ ...activeSignatories, approvedByName: e.target.value })
                      }
                      placeholder="e.g. David Sterling or Your Name"
                      className="w-full bg-slate-900 border border-indigo-400 rounded-md px-2 py-1 text-xs text-white font-bold focus:border-amber-400 focus:outline-hidden ring-1 ring-amber-400/30"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-indigo-200 block mb-0.5 font-medium">Role / Title</label>
                    <input
                      type="text"
                      value={activeSignatories.approvedByTitle || ''}
                      onChange={(e) =>
                        setActiveSignatories({ ...activeSignatories, approvedByTitle: e.target.value })
                      }
                      placeholder="e.g. Managing Director / Shop Owner"
                      className="w-full bg-slate-900 border border-indigo-400 rounded-md px-2 py-1 text-[11px] text-slate-300 focus:border-amber-400 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1.5 border-t border-slate-700">
                <span className="text-[11px] text-emerald-400">
                  {signatorySaveSuccess && '✓ Saved to payslips and reports!'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditSignatories(false)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-md text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <Save className="w-3 h-3" />
                    <span>Save</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Printable Payslip Card */}
          <div className="p-4 sm:p-5 border border-slate-200 rounded-xl bg-slate-50/40 print:bg-white print:border-none print:p-0">
            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                    <Layers className="w-4 h-4 text-cyan-400" />
                  </div>
                  <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                    {effectiveSettings.shopName}
                  </h2>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {effectiveSettings.tagline}
                </p>
                <p className="text-[9px] text-slate-400">
                  Full Sublimation Plant • Tax ID: ASP-98214-X • Official Certified Payroll Voucher
                </p>
              </div>

              <div className="text-right">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">
                  PAY VOUCHER SLIP
                </span>
                <span className="text-xs font-mono font-bold text-slate-900">
                  {salaryRecord.id}
                </span>
                <div className="text-[10px] text-slate-600 mt-0.5">
                  Period: <strong>{salaryRecord.periodStart}</strong> to <strong>{salaryRecord.periodEnd}</strong>
                </div>
                <div className="text-[9px] text-emerald-700 font-bold mt-0.5">
                  Status: {salaryRecord.paymentStatus.toUpperCase()} ({salaryRecord.paymentMethod || 'Bank Transfer'})
                </div>
              </div>
            </div>

            {/* Employee Info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-2.5 bg-white rounded-lg border border-slate-200 text-xs mb-3">
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-semibold block">Employee Name</span>
                <span className="font-bold text-slate-900 text-xs">{salaryRecord.employeeName}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-semibold block">Staff ID & Role</span>
                <span className="font-bold text-slate-800 text-xs">
                  {salaryRecord.role === 'artist'
                    ? 'Graphic & Vector Artist'
                    : salaryRecord.role === 'machine_operator'
                    ? 'Machine & Press Operator'
                    : salaryRecord.role === 'sewing_finishing'
                    ? 'Sewing & Finishing'
                    : 'Supervisor'}
                </span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-semibold block">Base Hourly Rate</span>
                <span className="font-bold text-slate-900 text-xs">
                  {formatCurrency(salaryRecord.hourlyRate, effectiveSettings.currencySymbol)}/hr
                </span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-semibold block">Workstation</span>
                <span className="font-medium text-slate-800 text-xs truncate block">
                  {employee?.assignedStation || 'Sublimation Plant Floor'}
                </span>
              </div>
            </div>

            {/* Earnings & Deductions Tables */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-3">
              {/* Earnings */}
              <div className="bg-white rounded-lg border border-slate-200 p-2.5">
                <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-1 mb-1.5 text-xs flex items-center justify-between">
                  <span>1. Gross Earnings</span>
                  <span className="text-[9px] text-slate-400 font-normal">Details</span>
                </h4>

                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between py-0.5 border-b border-slate-50">
                    <span className="text-slate-600">Regular Hours ({salaryRecord.regularHours} hrs)</span>
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(salaryRecord.regularPay, effectiveSettings.currencySymbol)}
                    </span>
                  </div>

                  <div className="flex justify-between py-0.5 border-b border-slate-50">
                    <span className="text-indigo-600">
                      Overtime Pay ({salaryRecord.overtimeHours} hrs @ {effectiveSettings.overtimeMultiplier}x)
                    </span>
                    <span className="font-bold text-indigo-700">
                      +{formatCurrency(salaryRecord.overtimePay, effectiveSettings.currencySymbol)}
                    </span>
                  </div>

                  {salaryRecord.pieceRateUnits > 0 && (
                    <div className="flex justify-between py-0.5 border-b border-slate-50">
                      <span className="text-purple-600">
                        Sublimation Piece Bonus (
                        {salaryRecord.role === 'artist'
                          ? `${salaryRecord.pieceRateUnits} designs`
                          : `${salaryRecord.pieceRateUnits}m printed`}
                        )
                      </span>
                      <span className="font-bold text-purple-700">
                        +{formatCurrency(salaryRecord.pieceRatePay, effectiveSettings.currencySymbol)}
                      </span>
                    </div>
                  )}

                  {salaryRecord.allowances > 0 && (
                    <div className="flex justify-between py-0.5 border-b border-slate-50">
                      <span className="text-slate-600">Special Allowances / Meal</span>
                      <span className="font-semibold text-slate-900">
                        +{formatCurrency(salaryRecord.allowances, effectiveSettings.currencySymbol)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between pt-2 mt-1.5 border-t border-slate-200 font-bold text-slate-900 text-xs">
                  <span>Total Gross Wages:</span>
                  <span>{formatCurrency(salaryRecord.grossPay, effectiveSettings.currencySymbol)}</span>
                </div>
              </div>

              {/* Deductions */}
              <div className="bg-white rounded-lg border border-slate-200 p-2.5">
                <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-1 mb-1.5 text-xs flex items-center justify-between">
                  <span>2. Deductions</span>
                  <span className="text-[9px] text-slate-400 font-normal">Withholdings</span>
                </h4>

                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between py-0.5 border-b border-slate-50">
                    <span className="text-slate-600">Late / Tardy Penalty</span>
                    <span className="font-semibold text-amber-700">
                      {salaryRecord.deductions.lateDeduction > 0
                        ? `-${formatCurrency(salaryRecord.deductions.lateDeduction, effectiveSettings.currencySymbol)}`
                        : formatCurrency(0, effectiveSettings.currencySymbol)}
                    </span>
                  </div>

                  <div className="flex justify-between py-0.5 border-b border-slate-50">
                    <span className="text-slate-600">Cash Advance / Loan</span>
                    <span className="font-semibold text-slate-800">
                      {salaryRecord.deductions.cashAdvance > 0
                        ? `-${formatCurrency(salaryRecord.deductions.cashAdvance, effectiveSettings.currencySymbol)}`
                        : formatCurrency(0, effectiveSettings.currencySymbol)}
                    </span>
                  </div>

                  <div className="flex justify-between py-0.5 border-b border-slate-50">
                    <span className="text-slate-600">Tax / SSS / Insurance</span>
                    <span className="font-semibold text-slate-800">
                      {salaryRecord.deductions.taxInsurance > 0
                        ? `-${formatCurrency(salaryRecord.deductions.taxInsurance, effectiveSettings.currencySymbol)}`
                        : formatCurrency(0, effectiveSettings.currencySymbol)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between pt-2 mt-1.5 border-t border-slate-200 font-bold text-rose-700 text-xs">
                  <span>Total Deductions:</span>
                  <span>-{formatCurrency(totalDeductions, effectiveSettings.currencySymbol)}</span>
                </div>
              </div>
            </div>

            {/* Net Pay Banner */}
            <div className="bg-slate-900 text-white p-3 sm:p-3.5 rounded-xl flex items-center justify-between mb-3 shadow-xs">
              <div>
                <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-cyan-400 block">
                  Net Take-Home Pay (Disbursed)
                </span>
                <span className="text-[11px] text-slate-300">
                  Payment Channel: {salaryRecord.paymentMethod || 'Bank Deposit'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xl sm:text-2xl font-extrabold text-white">
                  {formatCurrency(salaryRecord.netSalary, effectiveSettings.currencySymbol)}
                </span>
              </div>
            </div>

            {/* 4 Signatory Blocks */}
            <div className="pt-3 border-t-2 border-slate-900 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs">
              {/* Prepared by */}
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <div className="h-8 border-b border-dashed border-slate-400 mb-1 flex items-end justify-center pb-0.5">
                  <span className="font-serif italic text-slate-800 font-medium text-[11px] truncate">
                    {activeSignatories.preparedByName || 'Elena Rostova'}
                  </span>
                </div>
                <span className="font-bold text-slate-900 block text-[10px] truncate">
                  Prepared by: {activeSignatories.preparedByName || 'Elena Rostova'}
                </span>
                <span className="text-[8.5px] text-slate-500 block leading-tight truncate">
                  {activeSignatories.preparedByTitle || 'Senior Payroll Auditor'}
                </span>
              </div>

              {/* Certified by */}
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <div className="h-8 border-b border-dashed border-slate-400 mb-1 flex items-end justify-center pb-0.5">
                  <span className="font-serif italic text-slate-800 font-medium text-[11px] truncate">
                    {activeSignatories.certifiedByName || 'Marcus Vance'}
                  </span>
                </div>
                <span className="font-bold text-slate-900 block text-[10px] truncate">
                  Certified by: {activeSignatories.certifiedByName || 'Marcus Vance'}
                </span>
                <span className="text-[8.5px] text-slate-500 block leading-tight truncate">
                  {activeSignatories.certifiedByTitle || 'Plant Operations Director'}
                </span>
              </div>

              {/* Approved by */}
              <div className="p-2 bg-indigo-50/50 rounded-lg border border-indigo-200">
                <div className="h-8 border-b border-dashed border-indigo-400 mb-1 flex items-end justify-center pb-0.5">
                  <span className="font-serif italic text-indigo-950 font-bold text-[11px] truncate">
                    {activeSignatories.approvedByName || 'David Sterling'}
                  </span>
                </div>
                <span className="font-bold text-indigo-950 block text-[10px] truncate">
                  Approved by: {activeSignatories.approvedByName || 'David Sterling'}
                </span>
                <span className="text-[8.5px] text-indigo-700 block font-medium leading-tight truncate">
                  {activeSignatories.approvedByTitle || 'Managing Director / Owner'}
                </span>
              </div>

              {/* Employee Acknowledgment */}
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <div className="h-8 border-b border-dashed border-slate-400 mb-1 flex items-end justify-center pb-0.5">
                  <span className="font-serif italic text-slate-600 text-[11px] truncate">
                    {salaryRecord.employeeName}
                  </span>
                </div>
                <span className="font-bold text-slate-900 block text-[10px] truncate">
                  {salaryRecord.employeeName}
                </span>
                <span className="text-[8.5px] text-slate-500 block leading-tight truncate">
                  Employee Acknowledgment
                </span>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-200 text-[8.5px] text-slate-400 text-center">
              Certified official payslip issued by {effectiveSettings.shopName}. Confidential and intended solely for employee records.
            </div>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-shrink-0 print:hidden">
          <button
            onClick={() => setShowEditSignatories((prev) => !prev)}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{showEditSignatories ? 'Close Edit Panel' : 'Customize Officer / Owner Full Names'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          >
            Close Payslip
          </button>
        </div>
      </div>
    </div>
  );
};
