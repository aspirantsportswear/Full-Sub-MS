import React, { useState, useMemo, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  FileText,
  Clock,
  Layers,
  Settings2,
  RefreshCw,
  ArrowRight,
  Info,
  Check,
  Filter,
  User,
  Calendar,
  Sparkles,
} from 'lucide-react';
import {
  Employee,
  AttendanceRecord,
  ShopSettings,
} from '../types';
import {
  parseCSVText,
  autoDetectColumnMapping,
  processAttendanceRows,
  generateSampleAttendanceCSV,
  ColumnMapping,
  ParsedAttendanceRow,
  CSVParseResult,
} from '../utils/csvParser';
import { getRoleBadgeColor, getStatusBadge } from '../utils/calculations';

export type ImportStrategy = 'upsert' | 'append' | 'replace_range';

interface AttendanceCSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  existingAttendance: AttendanceRecord[];
  settings: ShopSettings;
  onImportSuccess: (importedRecords: AttendanceRecord[], strategy: ImportStrategy, summaryText: string) => void;
}

export const AttendanceCSVImportModal: React.FC<AttendanceCSVImportModalProps> = ({
  isOpen,
  onClose,
  employees,
  existingAttendance,
  settings,
  onImportSuccess,
}) => {
  // Input State
  const [inputTab, setInputTab] = useState<'upload' | 'paste'>('upload');
  const [rawText, setRawText] = useState<string>('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);

  // Parsing & Mapping State
  const [parseResult, setParseResult] = useState<CSVParseResult | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping | null>(null);
  const [showColumnSettings, setShowColumnSettings] = useState<boolean>(false);

  // Import Strategy & Filter
  const [importStrategy, setImportStrategy] = useState<ImportStrategy>('upsert');
  const [previewFilter, setPreviewFilter] = useState<'all' | 'valid' | 'issues'>('all');
  const [excludedRowIds, setExcludedRowIds] = useState<Set<string>>(new Set());

  // Processing state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle parsing when raw text changes
  const handleParseData = (text: string, name?: string, size?: string) => {
    if (!text.trim()) {
      setParseResult(null);
      setColumnMapping(null);
      return;
    }

    const result = parseCSVText(text);
    if (result.headers.length === 0) {
      alert('Could not parse valid CSV data. Please check file format.');
      return;
    }

    const mapping = autoDetectColumnMapping(result.headers);
    setParseResult(result);
    setColumnMapping(mapping);
    setExcludedRowIds(new Set());
    if (name) setFileName(name);
    if (size) setFileSize(size);
  };

  // Process rows with current mapping
  const stagedRows: ParsedAttendanceRow[] = useMemo(() => {
    if (!parseResult || !columnMapping) return [];
    return processAttendanceRows(
      parseResult.rows,
      columnMapping,
      employees,
      existingAttendance,
      settings
    );
  }, [parseResult, columnMapping, employees, existingAttendance, settings]);

  // Statistics
  const stats = useMemo(() => {
    const total = stagedRows.length;
    const activeRows = stagedRows.filter((r) => !excludedRowIds.has(r.id));
    const valid = activeRows.filter((r) => r.isValid).length;
    const errors = activeRows.filter((r) => !r.isValid).length;
    const warnings = activeRows.filter((r) => r.isValid && (r.warnings.length > 0 || r.isExistingDate)).length;

    let totalRegHours = 0;
    let totalOtHours = 0;

    activeRows.forEach((r) => {
      if (r.isValid) {
        totalRegHours += r.regularHours;
        totalOtHours += r.overtimeHours;
      }
    });

    const dates = Array.from(new Set(activeRows.filter((r) => r.isValid).map((r) => r.date))).sort();

    return {
      total,
      activeCount: activeRows.length,
      valid,
      errors,
      warnings,
      totalRegHours: Number(totalRegHours.toFixed(2)),
      totalOtHours: Number(totalOtHours.toFixed(2)),
      dateRange: dates.length > 0 ? `${dates[0]} to ${dates[dates.length - 1]}` : 'N/A',
      uniqueDates: dates,
    };
  }, [stagedRows, excludedRowIds]);

  // Filtered rows for preview table
  const displayedRows = useMemo(() => {
    return stagedRows.filter((row) => {
      if (previewFilter === 'valid') return row.isValid && !excludedRowIds.has(row.id);
      if (previewFilter === 'issues') return (!row.isValid || row.warnings.length > 0 || row.isExistingDate) && !excludedRowIds.has(row.id);
      return true;
    });
  }, [stagedRows, previewFilter, excludedRowIds]);

  // File Drag & Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      readFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      readFile(e.target.files[0]);
    }
  };

  const readFile = (file: File) => {
    const sizeStr = `${(file.size / 1024).toFixed(1)} KB`;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      setRawText(content);
      handleParseData(content, file.name, sizeStr);
    };
    reader.readAsText(file);
  };

  // Download Sample Template
  const handleDownloadSample = () => {
    const sampleCSV = generateSampleAttendanceCSV(employees);
    const blob = new Blob([sampleCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `sublimation_attendance_import_template_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Load Built-in Demo Sample Data
  const handleLoadDemoData = () => {
    const demo = generateSampleAttendanceCSV(employees);
    setRawText(demo);
    setInputTab('paste');
    handleParseData(demo, 'demo_biometric_punch_log.csv', '1.4 KB');
  };

  // Toggle Row Exclusion
  const toggleExcludeRow = (rowId: string) => {
    setExcludedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  };

  // Execute Import
  const handleExecuteImport = () => {
    setIsProcessing(true);

    const validToImport = stagedRows
      .filter((r) => r.isValid && !excludedRowIds.has(r.id))
      .map((r): AttendanceRecord => ({
        id: r.id,
        employeeId: r.employeeId,
        employeeName: r.employeeName,
        role: r.role,
        date: r.date,
        clockIn: r.clockIn,
        clockOut: r.clockOut,
        regularHours: r.regularHours,
        overtimeHours: r.overtimeHours,
        lateMinutes: r.lateMinutes,
        status: r.status,
        station: r.station,
        notes: r.notes,
        verifiedBy: 'Biometric System Import',
      }));

    if (validToImport.length === 0) {
      alert('No valid attendance records are selected for import.');
      setIsProcessing(false);
      return;
    }

    const summaryText = `Imported ${validToImport.length} timecard shift logs across ${stats.uniqueDates.length} days (${stats.totalRegHours}h Reg, ${stats.totalOtHours}h OT)`;
    
    setTimeout(() => {
      onImportSuccess(validToImport, importStrategy, summaryText);
      setIsProcessing(false);
      onClose();
    }, 250);
  };

  if (!isOpen) return null;

  return (
    <div
      id="modal-import-attendance-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 md:p-6 animate-in fade-in duration-150 overflow-y-auto"
    >
      <div
        id="modal-import-attendance"
        className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 text-xs overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Bulk Import Attendance Logs
                </h2>
                <span className="bg-cyan-50 text-cyan-700 border border-cyan-200 px-2 py-0.5 rounded-md font-semibold text-[10px]">
                  CSV / Biometric Punch Clocks
                </span>
              </div>
              <p className="text-slate-500 text-xs">
                Import timecards from external fingerprint scanners, RFID turnstiles, or Excel rosters with automatic overtime & late calculation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-download-csv-sample"
              onClick={handleDownloadSample}
              title="Download standard CSV template for external clocks"
              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-white text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-cyan-600" />
              <span>Download CSV Template</span>
            </button>
            <button
              id="btn-close-import-modal"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body: Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Step 1: Input Source Selector */}
          {!parseResult ? (
            <div className="space-y-4">
              {/* Tab Selector */}
              <div className="flex items-center justify-between">
                <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 w-fit">
                  <button
                    type="button"
                    onClick={() => setInputTab('upload')}
                    className={`px-4 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                      inputTab === 'upload'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Upload CSV / TSV File</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputTab('paste')}
                    className={`px-4 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                      inputTab === 'paste'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Paste Raw Text / Clipboard</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleLoadDemoData}
                  className="text-cyan-700 hover:text-cyan-800 font-semibold text-xs flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Load Sample Biometric Demo Data</span>
                </button>
              </div>

              {/* Upload Dropzone */}
              {inputTab === 'upload' ? (
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    dragActive
                      ? 'border-cyan-500 bg-cyan-50/70 scale-[0.99]'
                      : 'border-slate-300 hover:border-cyan-400 bg-slate-50/50 hover:bg-slate-50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt,.tsv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-14 h-14 rounded-2xl bg-cyan-100/70 text-cyan-700 flex items-center justify-center mb-3">
                    <Upload className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 mb-1">
                    Drag and drop your biometric or punch CSV file here
                  </h4>
                  <p className="text-slate-500 text-xs max-w-md mb-4">
                    Supports comma-separated (.csv), tab-separated (.tsv), or text files from ZKTeco, Suprema, Anviz, TimeDoctor, or custom Excel exports.
                  </p>
                  <span className="px-4 py-2 bg-white rounded-xl border border-slate-200 text-slate-700 font-bold text-xs shadow-2xs hover:bg-slate-50 transition-colors">
                    Browse Files from Computer
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700">
                      Paste Comma-Separated or Tab-Separated Data:
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Format: Staff Code, Name, Date, Clock In, Clock Out, Workstation
                    </span>
                  </div>
                  <textarea
                    rows={8}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder={`Staff Code,Full Name,Shift Date,Clock In,Clock Out,Workstation / Machine,Activity Notes\nART-01,Leo Vance,2026-08-28,07:55,17:05,Design Suite #1,Jersey Vectoring\nOPR-01,Carlos Gomez,2026-08-28,07:50,19:00,Epson F9470H #1,300m roll print`}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 font-mono text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      disabled={!rawText.trim()}
                      onClick={() => handleParseData(rawText, 'pasted_timecard_data.csv', `${rawText.length} bytes`)}
                      className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-bold flex items-center gap-2 cursor-pointer transition-all shadow-xs"
                    >
                      <span>Analyze & Preview Records</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Step 2 & 3: Parsed Results, Mapping & Staging */
            <div className="space-y-5">
              {/* File Info & Reset Action */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block text-xs">
                      {fileName || 'Attendance Import Source'}
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      {parseResult.rows.length} rows parsed • Delimiter: &apos;{parseResult.delimiter === '\t' ? 'TAB' : parseResult.delimiter}&apos; {fileSize ? `• ${fileSize}` : ''}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowColumnSettings(!showColumnSettings)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      showColumnSettings
                        ? 'bg-cyan-50 border-cyan-300 text-cyan-800'
                        : 'border-slate-200 hover:bg-white text-slate-700'
                    }`}
                  >
                    <Settings2 className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Column Mapping {showColumnSettings ? '▲' : '▼'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setParseResult(null);
                      setColumnMapping(null);
                      setRawText('');
                    }}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-white text-slate-600 hover:text-rose-600 font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Choose Different File</span>
                  </button>
                </div>
              </div>

              {/* Column Mapping Panel (Collapsible) */}
              {showColumnSettings && columnMapping && (
                <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold text-slate-200 flex items-center gap-1.5">
                      <Settings2 className="w-4 h-4 text-cyan-400" />
                      Configure CSV Column Headers
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      Match the CSV columns with Aspirant Sportswear data fields
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                    {/* Staff Code */}
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        Staff Code / ID <span className="text-rose-400">*</span>
                      </label>
                      <select
                        value={columnMapping.employeeIdentifier}
                        onChange={(e) =>
                          setColumnMapping({
                            ...columnMapping,
                            employeeIdentifier: parseInt(e.target.value, 10),
                          })
                        }
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                      >
                        <option value={-1}>-- None --</option>
                        {parseResult.headers.map((h, i) => (
                          <option key={i} value={i}>
                            Col {i + 1}: {h}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Staff Name */}
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        Staff Name
                      </label>
                      <select
                        value={columnMapping.employeeName}
                        onChange={(e) =>
                          setColumnMapping({
                            ...columnMapping,
                            employeeName: parseInt(e.target.value, 10),
                          })
                        }
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                      >
                        <option value={-1}>-- None --</option>
                        {parseResult.headers.map((h, i) => (
                          <option key={i} value={i}>
                            Col {i + 1}: {h}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Shift Date */}
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        Shift Date <span className="text-rose-400">*</span>
                      </label>
                      <select
                        value={columnMapping.date}
                        onChange={(e) =>
                          setColumnMapping({
                            ...columnMapping,
                            date: parseInt(e.target.value, 10),
                          })
                        }
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                      >
                        <option value={-1}>-- None --</option>
                        {parseResult.headers.map((h, i) => (
                          <option key={i} value={i}>
                            Col {i + 1}: {h}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Clock In */}
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        Clock In <span className="text-rose-400">*</span>
                      </label>
                      <select
                        value={columnMapping.clockIn}
                        onChange={(e) =>
                          setColumnMapping({
                            ...columnMapping,
                            clockIn: parseInt(e.target.value, 10),
                          })
                        }
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                      >
                        <option value={-1}>-- None --</option>
                        {parseResult.headers.map((h, i) => (
                          <option key={i} value={i}>
                            Col {i + 1}: {h}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Clock Out */}
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        Clock Out
                      </label>
                      <select
                        value={columnMapping.clockOut}
                        onChange={(e) =>
                          setColumnMapping({
                            ...columnMapping,
                            clockOut: parseInt(e.target.value, 10),
                          })
                        }
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                      >
                        <option value={-1}>-- None --</option>
                        {parseResult.headers.map((h, i) => (
                          <option key={i} value={i}>
                            Col {i + 1}: {h}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Station / Machine */}
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        Workstation / Machine
                      </label>
                      <select
                        value={columnMapping.station}
                        onChange={(e) =>
                          setColumnMapping({
                            ...columnMapping,
                            station: parseInt(e.target.value, 10),
                          })
                        }
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                      >
                        <option value={-1}>-- None --</option>
                        {parseResult.headers.map((h, i) => (
                          <option key={i} value={i}>
                            Col {i + 1}: {h}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        Notes / Reason
                      </label>
                      <select
                        value={columnMapping.notes}
                        onChange={(e) =>
                          setColumnMapping({
                            ...columnMapping,
                            notes: parseInt(e.target.value, 10),
                          })
                        }
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                      >
                        <option value={-1}>-- None --</option>
                        {parseResult.headers.map((h, i) => (
                          <option key={i} value={i}>
                            Col {i + 1}: {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* KPI Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Total Ready to Import */}
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-emerald-800">
                      Valid & Ready
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-xl font-black text-emerald-900 mt-1">
                    {stats.valid} <span className="text-xs font-normal text-emerald-700">/ {stats.activeCount} rows</span>
                  </div>
                  <span className="text-[10px] text-emerald-700">
                    Calculated for plant payroll
                  </span>
                </div>

                {/* Overtime & Regular Hours */}
                <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-indigo-800">
                      Total Work Hours
                    </span>
                    <Clock className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="text-xl font-black text-indigo-900 mt-1">
                    {stats.totalRegHours}h <span className="text-xs font-bold text-indigo-600">+{stats.totalOtHours}h OT</span>
                  </div>
                  <span className="text-[10px] text-indigo-600">
                    Standard: {settings.standardShiftStart}-{settings.standardShiftEnd}
                  </span>
                </div>

                {/* Warnings / Existing Logs */}
                <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-amber-800">
                      Existing Date Updates
                    </span>
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-xl font-black text-amber-900 mt-1">
                    {stats.warnings}
                  </div>
                  <span className="text-[10px] text-amber-700">
                    Will update matching records
                  </span>
                </div>

                {/* Unmatched / Errors */}
                <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-rose-800">
                      Unmatched / Errors
                    </span>
                    <XCircle className="w-4 h-4 text-rose-600" />
                  </div>
                  <div className="text-xl font-black text-rose-900 mt-1">
                    {stats.errors}
                  </div>
                  <span className="text-[10px] text-rose-700">
                    Missing code or bad date format
                  </span>
                </div>
              </div>

              {/* Import Strategy Selection Bar */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <label className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-cyan-600" />
                  Select Synchronization / Merge Strategy:
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  {/* Upsert Strategy */}
                  <label
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                      importStrategy === 'upsert'
                        ? 'border-cyan-500 bg-cyan-50/70 ring-2 ring-cyan-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="strategy"
                      checked={importStrategy === 'upsert'}
                      onChange={() => setImportStrategy('upsert')}
                      className="mt-0.5 text-cyan-600 focus:ring-cyan-500"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block text-xs">
                        Upsert (Update & Insert)
                      </span>
                      <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                        Updates punches for employees already on that date, and inserts new records for new dates.
                      </span>
                    </div>
                  </label>

                  {/* Append Strategy */}
                  <label
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                      importStrategy === 'append'
                        ? 'border-cyan-500 bg-cyan-50/70 ring-2 ring-cyan-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="strategy"
                      checked={importStrategy === 'append'}
                      onChange={() => setImportStrategy('append')}
                      className="mt-0.5 text-cyan-600 focus:ring-cyan-500"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block text-xs">
                        Append Only
                      </span>
                      <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                        Adds all rows as new records, preserving all existing historical timecard entries.
                      </span>
                    </div>
                  </label>

                  {/* Replace Range Strategy */}
                  <label
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                      importStrategy === 'replace_range'
                        ? 'border-cyan-500 bg-cyan-50/70 ring-2 ring-cyan-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="strategy"
                      checked={importStrategy === 'replace_range'}
                      onChange={() => setImportStrategy('replace_range')}
                      className="mt-0.5 text-cyan-600 focus:ring-cyan-500"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block text-xs">
                        Replace Date Range
                      </span>
                      <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                        Overwrites all logs within dates found in this CSV ({stats.dateRange}).
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Preview Table Header & Filters */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-xs">
                      Staged Records Preview ({displayedRows.length})
                    </span>
                    <span className="text-[11px] text-slate-400">
                      • Uncheck rows to exclude from import
                    </span>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex rounded-lg bg-slate-100 p-1 border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setPreviewFilter('all')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                        previewFilter === 'all'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      All ({stagedRows.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewFilter('valid')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                        previewFilter === 'valid'
                          ? 'bg-white text-emerald-800 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Valid ({stats.valid})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewFilter('issues')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                        previewFilter === 'issues'
                          ? 'bg-white text-amber-800 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Issues & Warnings ({stats.errors + stats.warnings})
                    </button>
                  </div>
                </div>

                {/* Staged Data Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs max-h-[300px] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 sticky top-0 z-10 text-slate-600 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 w-8 text-center">Include</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Staff Code & Name</th>
                        <th className="py-2.5 px-3">Department</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Punch In/Out</th>
                        <th className="py-2.5 px-3">Computed Hours</th>
                        <th className="py-2.5 px-3">Station / Machine</th>
                        <th className="py-2.5 px-3">Validation Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {displayedRows.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-slate-400">
                            No records match the preview filter.
                          </td>
                        </tr>
                      ) : (
                        displayedRows.map((row) => {
                          const isExcluded = excludedRowIds.has(row.id);
                          const roleStyle = getRoleBadgeColor(row.role);
                          const statusStyle = getStatusBadge(row.status);

                          return (
                            <tr
                              key={row.id}
                              className={`transition-colors ${
                                isExcluded
                                  ? 'opacity-40 bg-slate-50'
                                  : !row.isValid
                                  ? 'bg-rose-50/40 hover:bg-rose-50/70'
                                  : row.isExistingDate
                                  ? 'bg-amber-50/30 hover:bg-amber-50/60'
                                  : 'hover:bg-slate-50/80'
                              }`}
                            >
                              {/* Checkbox */}
                              <td className="py-2.5 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={!isExcluded}
                                  onChange={() => toggleExcludeRow(row.id)}
                                  disabled={!row.isValid}
                                  className="rounded text-cyan-600 focus:ring-cyan-500 w-4 h-4 cursor-pointer"
                                />
                              </td>

                              {/* Validation Status Pill */}
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                {!row.isValid ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                                    <XCircle className="w-3 h-3" />
                                    Error
                                  </span>
                                ) : row.isExistingDate ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                                    <AlertTriangle className="w-3 h-3" />
                                    Update
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Ready
                                  </span>
                                )}
                              </td>

                              {/* Staff Code & Name */}
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-slate-900">
                                  {row.employeeName}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  Code: {row.employeeCode}
                                </div>
                              </td>

                              {/* Department / Role */}
                              <td className="py-2.5 px-3">
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}>
                                  {row.role === 'artist' ? 'Artist' : row.role === 'machine_operator' ? 'Operator' : row.role === 'sewing_finishing' ? 'Sewing' : 'Supervisor'}
                                </span>
                              </td>

                              {/* Shift Date */}
                              <td className="py-2.5 px-3 font-mono font-medium text-slate-700">
                                {row.date}
                              </td>

                              {/* Punch In / Out */}
                              <td className="py-2.5 px-3 font-mono">
                                <span className="font-bold text-slate-900">{row.clockIn}</span>
                                <span className="text-slate-400 mx-1">→</span>
                                {row.clockOut ? (
                                  <span className="font-bold text-slate-900">{row.clockOut}</span>
                                ) : (
                                  <span className="text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                                    Active
                                  </span>
                                )}
                              </td>

                              {/* Computed Hours */}
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-slate-800">
                                  {row.regularHours}h Reg
                                  {row.overtimeHours > 0 && (
                                    <span className="text-indigo-600 ml-1 font-bold">
                                      +{row.overtimeHours}h OT
                                    </span>
                                  )}
                                </div>
                                {row.lateMinutes > 0 && (
                                  <div className="text-[10px] text-amber-600 font-semibold">
                                    Late: {row.lateMinutes}m
                                  </div>
                                )}
                              </td>

                              {/* Station */}
                              <td className="py-2.5 px-3 text-slate-600 max-w-[150px] truncate" title={row.station}>
                                {row.station}
                              </td>

                              {/* Validation message */}
                              <td className="py-2.5 px-3">
                                {row.errors.length > 0 ? (
                                  <span className="text-rose-600 font-semibold text-[11px]">
                                    {row.errors.join(', ')}
                                  </span>
                                ) : row.warnings.length > 0 ? (
                                  <span className="text-amber-700 text-[11px]">
                                    {row.warnings.join(', ')}
                                  </span>
                                ) : (
                                  <span className="text-emerald-700 text-[11px] font-medium">
                                    Clean match ({row.matchedEmployee?.name})
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-t border-slate-200 bg-slate-50/70 gap-3">
          <div className="text-slate-500 text-xs text-center sm:text-left">
            {parseResult ? (
              <span>
                Ready to sync <strong className="text-slate-900">{stats.valid}</strong> of {stats.total} total logs into local storage.
              </span>
            ) : (
              <span>Need help? Download the sample template above to see the required column schema.</span>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <button
              type="button"
              id="btn-cancel-import"
              onClick={onClose}
              className="w-full sm:w-auto text-center justify-center px-4 py-2.5 sm:py-2 rounded-xl text-slate-600 hover:bg-slate-200/70 font-semibold transition-colors cursor-pointer border border-slate-200 sm:border-transparent"
            >
              Cancel
            </button>

            {parseResult && (
              <button
                type="button"
                id="btn-confirm-import-records"
                disabled={isProcessing || stats.valid === 0}
                onClick={handleExecuteImport}
                className="w-full sm:w-auto text-center justify-center px-5 py-2.5 sm:py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-300 disabled:text-slate-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer active:scale-98"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Importing...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Import {stats.valid} Valid Records</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
