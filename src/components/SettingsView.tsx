import React, { useState } from 'react';
import {
  Settings,
  Clock,
  DollarSign,
  Layers,
  Save,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  Palette,
  Printer,
  Wrench,
  Lock,
  KeyRound,
  AlertTriangle,
  X,
  Trash2,
  ShieldAlert,
  HelpCircle,
  Eye,
  EyeOff,
  Check,
  FileSignature,
  PenTool,
  UserCheck
} from 'lucide-react';
import { ShopSettings } from '../types';
import {
  verifyAdminPin,
  setAdminPin,
  hasCustomAdminPin,
  resetAdminPinToDefault,
  recordSecurityEvent,
} from '../utils/security';

interface SettingsViewProps {
  settings: ShopSettings;
  onUpdateSettings: (newSettings: ShopSettings) => void;
  onResetData: () => void;
  onEraseAllDataHistory: (options: { keepEmployees: boolean }) => void;
  onOpenSecurityModal?: () => void;
  salaryCount?: number;
  attendanceCount?: number;
  ordersCount?: number;
  employeesCount?: number;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onResetData,
  onEraseAllDataHistory,
  onOpenSecurityModal,
  salaryCount = 0,
  attendanceCount = 0,
  ordersCount = 0,
  employeesCount = 0,
}) => {
  const [form, setForm] = useState<ShopSettings>({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Sample data reset PIN prompt
  const [showResetPinPrompt, setShowResetPinPrompt] = useState<boolean>(false);
  const [resetPinInput, setResetPinInput] = useState<string>('');
  const [resetPinError, setResetPinError] = useState<string | null>(null);

  // Erase All Data History State
  const [showEraseModal, setShowEraseModal] = useState<boolean>(false);
  const [erasePasscodeInput, setErasePasscodeInput] = useState<string>('');
  const [eraseError, setEraseError] = useState<string | null>(null);
  const [eraseSuccessMessage, setEraseSuccessMessage] = useState<string | null>(null);
  const [keepEmployeesOnErase, setKeepEmployeesOnErase] = useState<boolean>(true);
  const [showErasePassword, setShowErasePassword] = useState<boolean>(false);

  // Change 6-Digit Passcode in Settings
  const [showChangePinSection, setShowChangePinSection] = useState<boolean>(true);
  const [currentPasscode, setCurrentPasscode] = useState<string>('');
  const [newPasscode, setNewPasscode] = useState<string>('');
  const [confirmPasscode, setConfirmPasscode] = useState<string>('');
  const [showNewPasscodeText, setShowNewPasscodeText] = useState<boolean>(false);
  const [passcodeSuccess, setPasscodeSuccess] = useState<string | null>(null);
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [hasCustomPinState, setHasCustomPinState] = useState<boolean>(hasCustomAdminPin());

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(form);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleConfirmSampleReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminPin(resetPinInput)) {
      setShowResetPinPrompt(false);
      setResetPinInput('');
      setResetPinError(null);
      onResetData();
    } else {
      setResetPinError('Invalid 6-Digit Admin Passcode. Access denied.');
      recordSecurityEvent({
        type: 'ADMIN_ACTION',
        severity: 'high',
        details: 'Failed PIN attempt on factory sample data reset.',
        source: 'AdminAuthGuard',
      });
    }
  };

  const handleConfirmEraseAllHistory = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminPin(erasePasscodeInput)) {
      onEraseAllDataHistory({ keepEmployees: keepEmployeesOnErase });
      setShowEraseModal(false);
      setErasePasscodeInput('');
      setEraseError(null);
      setEraseSuccessMessage(
        'All salary records, monthly units, total payroll history, and operator records have been permanently erased.'
      );
      setTimeout(() => setEraseSuccessMessage(null), 6000);
    } else {
      setEraseError('Invalid 6-Digit Owner / Admin Passcode. Data erasure blocked.');
      recordSecurityEvent({
        type: 'ADMIN_ACTION',
        severity: 'critical',
        details: 'Unauthorized attempt to erase all data history with incorrect 6-digit passcode.',
        source: 'DataErasureGuard',
      });
    }
  };

  const handleUpdatePasscode = (e: React.FormEvent) => {
    e.preventDefault();
    setPasscodeError(null);
    setPasscodeSuccess(null);

    // If already has a custom passcode, optionally require current passcode check
    if (hasCustomAdminPin() && currentPasscode.trim()) {
      if (!verifyAdminPin(currentPasscode.trim())) {
        setPasscodeError('Current passcode is incorrect. Authorization denied.');
        return;
      }
    }

    const trimmedNew = newPasscode.trim();
    const trimmedConfirm = confirmPasscode.trim();

    if (trimmedNew.length < 6) {
      setPasscodeError('New passcode must be at least 6 digits (e.g. 789456).');
      return;
    }
    if (trimmedNew !== trimmedConfirm) {
      setPasscodeError('New passcodes do not match. Please re-type carefully.');
      return;
    }

    const success = setAdminPin(trimmedNew);
    if (success) {
      setHasCustomPinState(true);
      setPasscodeSuccess(`Custom 6-digit passcode successfully updated and encrypted!`);
      setCurrentPasscode('');
      setNewPasscode('');
      setConfirmPasscode('');
      setTimeout(() => setPasscodeSuccess(null), 5000);
    } else {
      setPasscodeError('Failed to save passcode. Please try again.');
    }
  };

  const handleResetPasscodeToDefault = () => {
    if (window.confirm('Reset the Admin/Owner passcode back to default "123456"?')) {
      resetAdminPinToDefault();
      setHasCustomPinState(false);
      setCurrentPasscode('');
      setNewPasscode('');
      setConfirmPasscode('');
      setPasscodeSuccess('Passcode reset to factory default (123456).');
      setPasscodeError(null);
      setTimeout(() => setPasscodeSuccess(null), 4000);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      {eraseSuccessMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center gap-3 text-xs text-emerald-900 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div className="font-semibold">{eraseSuccessMessage}</div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-slate-700" />
              Sublimation Plant & Compensation Configuration
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure shift hours, grace periods, overtime multipliers, artist design bonuses, machine operator meter rates, and admin security locks.
            </p>
          </div>

          {onOpenSecurityModal && (
            <button
              onClick={onOpenSecurityModal}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Security Center</span>
            </button>
          )}
        </div>

        <form onSubmit={handleSave} className="mt-6 space-y-6 text-xs">
          {/* Shop Profile */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-600" />
              1. Business Branding & Currency
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Plant Name</label>
                <input
                  type="text"
                  value={form.shopName}
                  onChange={(e) => setForm({ ...form, shopName: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tagline / Subheading</label>
                <input
                  type="text"
                  value={form.tagline}
                  onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Currency Symbol</label>
                <select
                  value={form.currencySymbol}
                  onChange={(e) => setForm({ ...form, currencySymbol: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold"
                >
                  <option value="₱">Philippine Peso (₱)</option>
                  <option value="$">USD ($)</option>
                  <option value="€">Euro (€)</option>
                  <option value="£">British Pound (£)</option>
                  <option value="A$">Australian Dollar (A$)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Shift Schedule */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              2. Standard Shift & Timecard Rules
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Shift Start Time</label>
                <input
                  type="time"
                  value={form.standardShiftStart}
                  onChange={(e) => setForm({ ...form, standardShiftStart: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Shift End Time</label>
                <input
                  type="time"
                  value={form.standardShiftEnd}
                  onChange={(e) => setForm({ ...form, standardShiftEnd: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Lunch Break (Minutes)</label>
                <input
                  type="number"
                  value={form.lunchBreakMinutes}
                  onChange={(e) =>
                    setForm({ ...form, lunchBreakMinutes: parseInt(e.target.value) || 0 })
                  }
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Grace Period (Minutes)</label>
                <input
                  type="number"
                  value={form.gracePeriodMinutes}
                  onChange={(e) =>
                    setForm({ ...form, gracePeriodMinutes: parseInt(e.target.value) || 0 })
                  }
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                  required
                />
              </div>
            </div>
          </div>

          {/* Overtime & Sublimation Piece-Rate Bonuses */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-indigo-600" />
              3. Overtime Multipliers & Sublimation Production Piece Incentives
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Regular Overtime Rate Multiplier
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={form.overtimeMultiplier}
                  onChange={(e) =>
                    setForm({ ...form, overtimeMultiplier: parseFloat(e.target.value) || 1 })
                  }
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Standard is 1.25x (125% of hourly wage for overtime hours)
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Holiday / Rest Day Overtime Multiplier
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={form.holidayOvertimeMultiplier}
                  onChange={(e) =>
                    setForm({ ...form, holidayOvertimeMultiplier: parseFloat(e.target.value) || 1 })
                  }
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Standard is 1.50x (150% of hourly wage)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
              <div>
                <label className="block font-bold text-purple-700 mb-1 flex items-center gap-1">
                  <Palette className="w-3.5 h-3.5" /> Artist Bonus per Approved Jersey Design ({form.currencySymbol})
                </label>
                <input
                  type="number"
                  step="0.50"
                  value={form.artistDesignBonusPerJob}
                  onChange={(e) =>
                    setForm({ ...form, artistDesignBonusPerJob: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-blue-700 mb-1 flex items-center gap-1">
                  <Printer className="w-3.5 h-3.5" /> Operator Bonus per Meter Sublimated / Pressed ({form.currencySymbol})
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.operatorPressBonusPerMeter}
                  onChange={(e) =>
                    setForm({ ...form, operatorPressBonusPerMeter: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* 4. Official Payslip & Payroll Signatories (Owner & Admin Authorization) */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
                  <FileSignature className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <span>4. Official Payslip & Payroll Report Signatories</span>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-200">
                      Signatures & Approvals
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Customize the official officer names and titles displayed on all employee payslips, acknowledge vouchers, and certified PDF payroll summaries.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setForm({
                      ...form,
                      signatories: {
                        preparedByName: 'Elena Rostova',
                        preparedByTitle: 'Senior Payroll & Timecard Auditor',
                        certifiedByName: 'Marcus Vance',
                        certifiedByTitle: 'Plant Operations Director',
                        approvedByName: 'David Sterling',
                        approvedByTitle: 'Managing Director / Shop Owner',
                      },
                    });
                  }}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold underline cursor-pointer"
                >
                  Reset Default Names
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Prepared by */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <PenTool className="w-3.5 h-3.5 text-slate-500" />
                    1. Prepared by
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Payroll Officer</span>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Full Name / Admin Name
                  </label>
                  <input
                    type="text"
                    value={form.signatories?.preparedByName ?? 'Elena Rostova'}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        signatories: {
                          preparedByName: e.target.value,
                          preparedByTitle: form.signatories?.preparedByTitle || 'Senior Payroll & Timecard Auditor',
                          certifiedByName: form.signatories?.certifiedByName || 'Marcus Vance',
                          certifiedByTitle: form.signatories?.certifiedByTitle || 'Plant Operations Director',
                          approvedByName: form.signatories?.approvedByName || 'David Sterling',
                          approvedByTitle: form.signatories?.approvedByTitle || 'Managing Director / Shop Owner',
                        },
                      })
                    }
                    placeholder="e.g. Elena Rostova"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold text-xs focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Official Designation / Title
                  </label>
                  <input
                    type="text"
                    value={form.signatories?.preparedByTitle ?? 'Senior Payroll & Timecard Auditor'}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        signatories: {
                          preparedByName: form.signatories?.preparedByName || 'Elena Rostova',
                          preparedByTitle: e.target.value,
                          certifiedByName: form.signatories?.certifiedByName || 'Marcus Vance',
                          certifiedByTitle: form.signatories?.certifiedByTitle || 'Plant Operations Director',
                          approvedByName: form.signatories?.approvedByName || 'David Sterling',
                          approvedByTitle: form.signatories?.approvedByTitle || 'Managing Director / Shop Owner',
                        },
                      })
                    }
                    placeholder="e.g. Senior Payroll & Timecard Auditor"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-700 text-xs focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Certified by */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-cyan-600" />
                    2. Certified by
                  </span>
                  <span className="text-[10px] text-cyan-700 font-medium">Plant Director</span>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Full Name / Director Name
                  </label>
                  <input
                    type="text"
                    value={form.signatories?.certifiedByName ?? 'Marcus Vance'}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        signatories: {
                          preparedByName: form.signatories?.preparedByName || 'Elena Rostova',
                          preparedByTitle: form.signatories?.preparedByTitle || 'Senior Payroll & Timecard Auditor',
                          certifiedByName: e.target.value,
                          certifiedByTitle: form.signatories?.certifiedByTitle || 'Plant Operations Director',
                          approvedByName: form.signatories?.approvedByName || 'David Sterling',
                          approvedByTitle: form.signatories?.approvedByTitle || 'Managing Director / Shop Owner',
                        },
                      })
                    }
                    placeholder="e.g. Marcus Vance"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold text-xs focus:border-cyan-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Official Designation / Title
                  </label>
                  <input
                    type="text"
                    value={form.signatories?.certifiedByTitle ?? 'Plant Operations Director'}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        signatories: {
                          preparedByName: form.signatories?.preparedByName || 'Elena Rostova',
                          preparedByTitle: form.signatories?.preparedByTitle || 'Senior Payroll & Timecard Auditor',
                          certifiedByName: form.signatories?.certifiedByName || 'Marcus Vance',
                          certifiedByTitle: e.target.value,
                          approvedByName: form.signatories?.approvedByName || 'David Sterling',
                          approvedByTitle: form.signatories?.approvedByTitle || 'Managing Director / Shop Owner',
                        },
                      })
                    }
                    placeholder="e.g. Plant Operations Director"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-700 text-xs focus:border-cyan-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Approved by (Admin / Owner) */}
              <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-700" />
                    3. Approved by (Admin / Owner)
                  </span>
                  <span className="text-[10px] text-indigo-700 font-bold">Shop Owner</span>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-indigo-950 mb-1">
                    Admin / Owner Full Name *
                  </label>
                  <input
                    type="text"
                    value={form.signatories?.approvedByName ?? 'David Sterling'}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        signatories: {
                          preparedByName: form.signatories?.preparedByName || 'Elena Rostova',
                          preparedByTitle: form.signatories?.preparedByTitle || 'Senior Payroll & Timecard Auditor',
                          certifiedByName: form.signatories?.certifiedByName || 'Marcus Vance',
                          certifiedByTitle: form.signatories?.certifiedByTitle || 'Plant Operations Director',
                          approvedByName: e.target.value,
                          approvedByTitle: form.signatories?.approvedByTitle || 'Managing Director / Shop Owner',
                        },
                      })
                    }
                    placeholder="e.g. David Sterling or Your Name"
                    className="w-full bg-white border border-indigo-300 rounded-xl px-3 py-2 text-slate-900 font-bold text-xs focus:border-indigo-600 focus:outline-hidden ring-2 ring-indigo-500/10"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-indigo-950 mb-1">
                    Official Designation / Title
                  </label>
                  <input
                    type="text"
                    value={form.signatories?.approvedByTitle ?? 'Managing Director / Shop Owner'}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        signatories: {
                          preparedByName: form.signatories?.preparedByName || 'Elena Rostova',
                          preparedByTitle: form.signatories?.preparedByTitle || 'Senior Payroll & Timecard Auditor',
                          certifiedByName: form.signatories?.certifiedByName || 'Marcus Vance',
                          certifiedByTitle: form.signatories?.certifiedByTitle || 'Plant Operations Director',
                          approvedByName: form.signatories?.approvedByName || 'David Sterling',
                          approvedByTitle: e.target.value,
                        },
                      })
                    }
                    placeholder="e.g. Managing Director / Shop Owner"
                    className="w-full bg-white border border-indigo-300 rounded-xl px-3 py-2 text-slate-700 text-xs focus:border-indigo-600 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Live Signatory Preview strip */}
            <div className="p-3 bg-slate-100/90 rounded-xl border border-slate-200 text-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Live Signatory Preview on Payslips & Certified Payroll Reports
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-center">
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-medium">Prepared by:</span>
                  <span className="font-bold text-slate-900 block text-xs truncate">
                    {form.signatories?.preparedByName || 'Elena Rostova'}
                  </span>
                  <span className="text-[9px] text-slate-500 block truncate">
                    {form.signatories?.preparedByTitle || 'Senior Payroll & Timecard Auditor'}
                  </span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-medium">Certified by:</span>
                  <span className="font-bold text-slate-900 block text-xs truncate">
                    {form.signatories?.certifiedByName || 'Marcus Vance'}
                  </span>
                  <span className="text-[9px] text-slate-500 block truncate">
                    {form.signatories?.certifiedByTitle || 'Plant Operations Director'}
                  </span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-indigo-200 bg-indigo-50/40">
                  <span className="text-[10px] text-indigo-600 block font-bold">Approved by:</span>
                  <span className="font-bold text-indigo-950 block text-xs truncate">
                    {form.signatories?.approvedByName || 'David Sterling'}
                  </span>
                  <span className="text-[9px] text-indigo-700 block truncate">
                    {form.signatories?.approvedByTitle || 'Managing Director / Shop Owner'}
                  </span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-medium">Employee Acknowledgment:</span>
                  <span className="font-bold text-slate-900 block text-xs truncate">
                    [Employee Full Name]
                  </span>
                  <span className="text-[9px] text-slate-500 block truncate">
                    Signature & Date Received
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Owner & Admin 6-Digit Passcode Customization Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white border border-slate-700 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/80">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <span>5. Master Owner & Admin 6-Digit Passcode</span>
                    {hasCustomPinState ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 text-[10px] font-bold border border-emerald-500/40 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Custom 6-Digit Code Active
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/25 text-amber-300 text-[10px] font-bold border border-amber-500/40">
                        Default Factory Code (123456)
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Customize your shop owner 6-digit security code. This passcode is required to permanently erase data history, reset production ledgers, and access sensitive diagnostics.
                  </p>
                </div>
              </div>

              {onOpenSecurityModal && (
                <button
                  type="button"
                  onClick={onOpenSecurityModal}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-center whitespace-nowrap"
                >
                  <Wrench className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Security Diagnostics</span>
                </button>
              )}
            </div>

            {/* Customization Form */}
            <div className="p-4 bg-slate-800/80 backdrop-blur-xs border border-slate-700 rounded-2xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-cyan-400" />
                  Change / Set Custom 6-Digit Passcode
                </span>
                <span className="text-[11px] text-slate-400">
                  Tip: Choose any 6 or more digits (numbers or alphanumeric)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {hasCustomPinState && (
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1 text-[11px]">
                      Current Passcode (for verify)
                    </label>
                    <input
                      type={showNewPasscodeText ? 'text' : 'password'}
                      maxLength={12}
                      value={currentPasscode}
                      onChange={(e) => setCurrentPasscode(e.target.value)}
                      placeholder="Enter current code"
                      className="w-full bg-slate-900/90 border border-slate-600 rounded-xl px-3 py-2.5 text-white font-mono text-center font-bold tracking-wider text-sm focus:border-cyan-400 focus:outline-hidden"
                    />
                  </div>
                )}

                <div className={hasCustomPinState ? 'sm:col-span-1' : 'sm:col-span-1.5'}>
                  <label className="block font-semibold text-slate-300 mb-1 text-[11px] flex items-center justify-between">
                    <span>New 6-Digit Passcode *</span>
                    <span className="text-[10px] text-cyan-400">
                      {newPasscode.length}/6 digits
                    </span>
                  </label>
                  <input
                    type={showNewPasscodeText ? 'text' : 'password'}
                    maxLength={12}
                    value={newPasscode}
                    onChange={(e) => setNewPasscode(e.target.value)}
                    placeholder="e.g. 748291"
                    className="w-full bg-slate-900/90 border border-slate-600 rounded-xl px-3 py-2.5 text-white font-mono text-center font-bold tracking-widest text-base focus:border-cyan-400 focus:outline-hidden"
                  />
                </div>

                <div className={hasCustomPinState ? 'sm:col-span-1' : 'sm:col-span-1.5'}>
                  <label className="block font-semibold text-slate-300 mb-1 text-[11px]">
                    Confirm New Passcode *
                  </label>
                  <input
                    type={showNewPasscodeText ? 'text' : 'password'}
                    maxLength={12}
                    value={confirmPasscode}
                    onChange={(e) => setConfirmPasscode(e.target.value)}
                    placeholder="Re-type new code"
                    className="w-full bg-slate-900/90 border border-slate-600 rounded-xl px-3 py-2.5 text-white font-mono text-center font-bold tracking-widest text-base focus:border-cyan-400 focus:outline-hidden"
                  />
                </div>
              </div>

              {passcodeError && (
                <div className="p-3 bg-rose-950/80 border border-rose-600/60 rounded-xl text-rose-200 text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span className="font-semibold">{passcodeError}</span>
                </div>
              )}

              {passcodeSuccess && (
                <div className="p-3 bg-emerald-950/80 border border-emerald-500/60 rounded-xl text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="font-semibold">{passcodeSuccess}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowNewPasscodeText(!showNewPasscodeText)}
                    className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 cursor-pointer"
                  >
                    {showNewPasscodeText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    <span>{showNewPasscodeText ? 'Hide Digits' : 'Show Digits'}</span>
                  </button>

                  {hasCustomPinState && (
                    <button
                      type="button"
                      onClick={handleResetPasscodeToDefault}
                      className="text-xs text-amber-400 hover:text-amber-300 underline cursor-pointer"
                    >
                      Reset to Default (123456)
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleUpdatePasscode}
                  className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md active:scale-98"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Custom 6-Digit Passcode</span>
                </button>
              </div>
            </div>
          </div>

          {/* DANGER ZONE: Erase All Data History */}
          <div className="p-5 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-300 text-rose-700 flex items-center justify-center flex-shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-rose-950 uppercase tracking-wider flex items-center gap-1.5">
                    <span>5. Danger Zone: Erase All Data History</span>
                    <span className="px-2 py-0.5 rounded-full bg-rose-200 text-rose-800 text-[10px] font-bold">
                      6-Digit Passcode Protected
                    </span>
                  </h3>
                  <p className="text-xs text-rose-800 mt-0.5">
                    Permanently delete or erase all salary records, monthly units, total payroll history, operator performance metrics, timecard logs, and production orders.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowEraseModal(true);
                  setErasePasscodeInput('');
                  setEraseError(null);
                }}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs whitespace-nowrap self-start sm:self-center"
              >
                <Trash2 className="w-4 h-4" />
                <span>Erase All Data History</span>
              </button>
            </div>

            {/* Current data counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-rose-200/80 text-xs">
              <div className="p-2.5 bg-white rounded-xl border border-rose-100">
                <span className="text-[10px] text-slate-500 block">Salary Ledgers</span>
                <span className="font-bold text-rose-700 text-sm">{salaryCount} records</span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-rose-100">
                <span className="text-[10px] text-slate-500 block">Attendance Logs</span>
                <span className="font-bold text-rose-700 text-sm">{attendanceCount} logs</span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-rose-100">
                <span className="text-[10px] text-slate-500 block">Production Orders</span>
                <span className="font-bold text-rose-700 text-sm">{ordersCount} jobs</span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-rose-100">
                <span className="text-[10px] text-slate-500 block">Personnel</span>
                <span className="font-bold text-slate-700 text-sm">{employeesCount} staff</span>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between pt-4 border-t border-slate-100 gap-3">
            <button
              type="button"
              onClick={() => setShowResetPinPrompt(true)}
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl text-slate-600 hover:bg-slate-100 border border-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Factory Sample Data</span>
            </button>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {savedSuccess && (
                <span className="text-emerald-600 font-bold flex items-center justify-center gap-1 text-center">
                  <CheckCircle2 className="w-4 h-4" /> Settings Saved!
                </span>
              )}
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-xs cursor-pointer flex items-center justify-center gap-2 active:scale-98 transition-colors"
              >
                <Save className="w-4 h-4 text-cyan-400" />
                <span>Save Configuration</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ERASE ALL DATA HISTORY MODAL (6-DIGIT PASSCODE AUTHORIZATION) */}
      {showEraseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
                <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600">
                  <Trash2 className="w-4 h-4" />
                </div>
                <span>Erase All Data History</span>
              </div>
              <button
                onClick={() => {
                  setShowEraseModal(false);
                  setErasePasscodeInput('');
                  setEraseError(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl space-y-2 text-xs text-rose-900">
              <div className="font-bold flex items-center gap-1.5 text-rose-950">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>This action will permanently erase:</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-[11px] text-rose-800">
                <li>All historical Salary & Payroll Ledger payouts</li>
                <li>Monthly Sublimation Units (meters pressed & jersey designs)</li>
                <li>Total Payroll history and average operator metrics</li>
                <li>All biometric attendance and timecard punch logs</li>
                <li>All production job batches and order history</li>
              </ul>
            </div>

            <form onSubmit={handleConfirmEraseAllHistory} className="space-y-4 text-xs">
              {/* Option to preserve staff list or delete everything */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="font-bold text-slate-800 block text-[11px]">Personnel Directory Option:</span>
                <label className="flex items-center gap-2 text-slate-700 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={keepEmployeesOnErase}
                    onChange={(e) => setKeepEmployeesOnErase(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                  />
                  <span>Keep registered personnel profiles (wipe only history, payroll, units & logs)</span>
                </label>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Enter 6-Digit Owner / Admin Passcode *</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    (Default is <strong className="font-mono text-slate-800">123456</strong>)
                  </span>
                </label>

                <div className="relative">
                  <input
                    type={showErasePassword ? 'text' : 'password'}
                    maxLength={10}
                    value={erasePasscodeInput}
                    onChange={(e) => {
                      setErasePasscodeInput(e.target.value);
                      setEraseError(null);
                    }}
                    placeholder="Enter 6-digit passcode"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-center text-slate-900 font-mono tracking-widest text-lg font-bold focus:bg-white focus:outline-rose-500"
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowErasePassword(!showErasePassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showErasePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {eraseError && (
                <div className="p-2.5 bg-rose-100 border border-rose-300 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span className="font-semibold">{eraseError}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEraseModal(false);
                    setErasePasscodeInput('');
                    setEraseError(null);
                  }}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs active:scale-98 flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Confirm Permanent Erase</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SAMPLE DATA RESET MODAL (6-DIGIT PASSCODE) */}
      {showResetPinPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Lock className="w-4 h-4 text-rose-600" />
                <span>Admin Authorization</span>
              </div>
              <button
                onClick={() => {
                  setShowResetPinPrompt(false);
                  setResetPinInput('');
                  setResetPinError(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Please enter your 6-digit Master Security Passcode to confirm factory sample data reset (Default is <strong className="font-mono text-slate-900">123456</strong>).
            </p>

            <form onSubmit={handleConfirmSampleReset} className="space-y-4">
              <div>
                <input
                  type="password"
                  maxLength={10}
                  value={resetPinInput}
                  onChange={(e) => {
                    setResetPinInput(e.target.value);
                    setResetPinError(null);
                  }}
                  placeholder="Enter 6-digit passcode"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-center text-slate-900 font-mono tracking-widest text-lg font-bold"
                  autoFocus
                  required
                />
              </div>

              {resetPinError && (
                <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                  <span>{resetPinError}</span>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetPinPrompt(false);
                    setResetPinInput('');
                    setResetPinError(null);
                  }}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Confirm Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
