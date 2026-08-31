import { Employee, AttendanceRecord, EmployeeRole, AttendanceStatus, ShopSettings } from '../types';
import { calculateTimecard } from './calculations';
import { sanitizeCSVCell, sanitizeString } from './security';

export interface ColumnMapping {
  employeeIdentifier: number; // index of column with code or ID
  employeeName: number;
  date: number;
  clockIn: number;
  clockOut: number;
  station: number;
  notes: number;
  regularHours?: number;
  overtimeHours?: number;
  status?: number;
}

export interface ParsedAttendanceRow {
  id: string;
  rowIndex: number;
  rawRow: string[];
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  role: EmployeeRole;
  date: string;
  clockIn: string;
  clockOut: string | null;
  regularHours: number;
  overtimeHours: number;
  lateMinutes: number;
  status: AttendanceStatus;
  station: string;
  notes: string;
  verifiedBy: string;
  matchedEmployee: Employee | null;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  isExistingDate: boolean;
}

export interface CSVParseResult {
  headers: string[];
  rows: string[][];
  delimiter: string;
  totalLines: number;
}

/**
 * Robust CSV & TSV Text Parser
 * Complies with RFC 4180: handles double quotes, quotes inside quotes (""), commas/tabs in quotes, and multiline cells.
 */
export const parseCSVText = (text: string): CSVParseResult => {
  if (!text || !text.trim()) {
    return { headers: [], rows: [], delimiter: ',', totalLines: 0 };
  }

  // Strip BOM if present
  let cleanText = text.replace(/^\uFEFF/, '');

  // Detect delimiter: check first line or first 1000 chars
  const firstLine = cleanText.split(/\r?\n/)[0] || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;

  let delimiter = ',';
  if (tabCount > commaCount && tabCount > semicolonCount) {
    delimiter = '\t';
  } else if (semicolonCount > commaCount) {
    delimiter = ';';
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;
  let i = 0;
  const len = cleanText.length;

  while (i < len) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          currentField += '"';
          i += 2;
          continue;
        } else {
          // Closing quote
          insideQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
        i++;
        continue;
      } else if (char === delimiter) {
        currentRow.push(currentField.trim());
        currentField = '';
        i++;
        continue;
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i++;
        }
        currentRow.push(currentField.trim());
        currentField = '';
        // Skip completely empty trailing row
        if (currentRow.some((field) => field.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        currentField = '';
        if (currentRow.some((field) => field.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      } else {
        currentField += char;
        i++;
      }
    }
  }

  // Push any remaining field/row
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((field) => field.length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length === 0) {
    return { headers: [], rows: [], delimiter, totalLines: 0 };
  }

  const headers = rows[0].map((h) => h.replace(/^["']|["']$/g, '').trim());
  const dataRows = rows.slice(1);

  return {
    headers,
    rows: dataRows,
    delimiter,
    totalLines: rows.length,
  };
};

/**
 * Intelligent Header Matcher
 * Maps varying biometric device header nomenclature to internal schema.
 */
export const autoDetectColumnMapping = (headers: string[]): ColumnMapping => {
  const mapping: ColumnMapping = {
    employeeIdentifier: -1,
    employeeName: -1,
    date: -1,
    clockIn: -1,
    clockOut: -1,
    station: -1,
    notes: -1,
    regularHours: -1,
    overtimeHours: -1,
    status: -1,
  };

  const normalized = headers.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

  normalized.forEach((h, idx) => {
    // 1. Employee Code / ID / Badge / PIN
    if (
      mapping.employeeIdentifier === -1 &&
      (h.includes('staffcode') ||
        h.includes('employeecode') ||
        h.includes('empcode') ||
        h.includes('badge') ||
        h.includes('badgeid') ||
        h.includes('pin') ||
        h.includes('bioid') ||
        h.includes('userid') ||
        h.includes('employeeid') ||
        h.includes('staffid') ||
        h === 'code' ||
        h === 'id')
    ) {
      mapping.employeeIdentifier = idx;
    }

    // 2. Employee Name
    if (
      mapping.employeeName === -1 &&
      (h.includes('staffname') ||
        h.includes('employeename') ||
        h.includes('fullname') ||
        h.includes('worker') ||
        h.includes('empname') ||
        h === 'name')
    ) {
      mapping.employeeName = idx;
    }

    // 3. Shift Date
    if (
      mapping.date === -1 &&
      (h.includes('shiftdate') ||
        h.includes('workdate') ||
        h.includes('punchdate') ||
        h.includes('logdate') ||
        h.includes('attendance') ||
        h === 'date')
    ) {
      mapping.date = idx;
    }

    // 4. Clock In / Time In
    if (
      mapping.clockIn === -1 &&
      (h.includes('clockin') ||
        h.includes('timein') ||
        h.includes('punchin') ||
        h.includes('starttime') ||
        h.includes('arrival') ||
        h === 'in' ||
        h === 'start')
    ) {
      mapping.clockIn = idx;
    }

    // 5. Clock Out / Time Out
    if (
      mapping.clockOut === -1 &&
      (h.includes('clockout') ||
        h.includes('timeout') ||
        h.includes('punchout') ||
        h.includes('endtime') ||
        h.includes('departure') ||
        h === 'out' ||
        h === 'end')
    ) {
      mapping.clockOut = idx;
    }

    // 6. Station / Machine
    if (
      mapping.station === -1 &&
      (h.includes('station') ||
        h.includes('machine') ||
        h.includes('workstation') ||
        h.includes('equipment') ||
        h.includes('location') ||
        h.includes('department') ||
        h.includes('dept'))
    ) {
      mapping.station = idx;
    }

    // 7. Notes / Remarks / Activity
    if (
      mapping.notes === -1 &&
      (h.includes('note') ||
        h.includes('notes') ||
        h.includes('remark') ||
        h.includes('remarks') ||
        h.includes('activity') ||
        h.includes('comment') ||
        h.includes('task') ||
        h.includes('reason'))
    ) {
      mapping.notes = idx;
    }

    // 8. Regular Hours
    if (
      mapping.regularHours === -1 &&
      (h.includes('reghours') || h.includes('regularhours') || h === 'hours' || h === 'reghr')
    ) {
      mapping.regularHours = idx;
    }

    // 9. Overtime Hours
    if (
      mapping.overtimeHours === -1 &&
      (h.includes('othours') || h.includes('overtimehours') || h === 'ot' || h === 'overtime')
    ) {
      mapping.overtimeHours = idx;
    }

    // 10. Status
    if (mapping.status === -1 && (h === 'status' || h.includes('attendancestatus'))) {
      mapping.status = idx;
    }
  });

  // Fallbacks if not detected: assign positional defaults if reasonable
  if (mapping.employeeIdentifier === -1 && headers.length > 0) mapping.employeeIdentifier = 0;
  if (mapping.employeeName === -1 && headers.length > 1) mapping.employeeName = 1;
  if (mapping.date === -1 && headers.length > 2) mapping.date = 2;
  if (mapping.clockIn === -1 && headers.length > 3) mapping.clockIn = 3;
  if (mapping.clockOut === -1 && headers.length > 4) mapping.clockOut = 4;
  if (mapping.station === -1 && headers.length > 5) mapping.station = 5;

  return mapping;
};

/**
 * Normalizes any common date representation to YYYY-MM-DD
 */
export const normalizeDate = (raw: string): string | null => {
  if (!raw) return null;
  const trimmed = raw.trim();

  // 1. ISO format: 2026-08-27 or 2026/08/27
  const isoMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 2. US or International format: 08/27/2026 or 27/08/2026 or 8-27-2026
  const slashMatch = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (slashMatch) {
    const p1 = parseInt(slashMatch[1], 10);
    const p2 = parseInt(slashMatch[2], 10);
    let y = parseInt(slashMatch[3], 10);
    if (y < 100) y += 2000;

    let month = p1;
    let day = p2;

    // If first part is > 12, it must be day-month-year
    if (p1 > 12 && p2 <= 12) {
      day = p1;
      month = p2;
    }

    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  }

  // 3. Fallback to JavaScript Date parser
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return null;
};

/**
 * Normalizes time string to standard 24-hour HH:mm format
 */
export const normalizeTime = (raw: string): string | null => {
  if (!raw) return null;
  const trimmed = raw.trim();

  if (trimmed.toLowerCase().includes('active') || trimmed.toLowerCase().includes('working') || trimmed === '-') {
    return null;
  }

  // Extract from full datetime if present (e.g. 2026-08-27 08:30:00)
  const dtMatch = trimmed.match(/\s(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?)/);
  const timeTarget = dtMatch ? dtMatch[1] : trimmed;

  // 12-hour format with AM/PM (e.g. "8:30 AM", "05:15 PM")
  const ampmMatch = timeTarget.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])/i);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10);
    const m = ampmMatch[2];
    const meridian = ampmMatch[3].toUpperCase();

    if (meridian === 'PM' && h < 12) h += 12;
    if (meridian === 'AM' && h === 12) h = 0;

    return `${String(h).padStart(2, '0')}:${m}`;
  }

  // 24-hour format (e.g. "08:30", "8:30", "17:45:00")
  const militaryMatch = timeTarget.match(/^(\d{1,2}):(\d{2})/);
  if (militaryMatch) {
    const h = parseInt(militaryMatch[1], 10);
    const m = militaryMatch[2];
    if (h >= 0 && h <= 23 && parseInt(m, 10) >= 0 && parseInt(m, 10) <= 59) {
      return `${String(h).padStart(2, '0')}:${m}`;
    }
  }

  return null;
};

/**
 * Finds employee by matching Code, ID, or Name
 */
export const matchEmployee = (
  identifier: string,
  name: string,
  employees: Employee[]
): Employee | null => {
  const cleanId = (identifier || '').trim().toLowerCase();
  const cleanName = (name || '').trim().toLowerCase();

  // 1. Exact match on Employee Code (e.g. "ART-01", "OPR-02")
  if (cleanId) {
    const matchByCode = employees.find((e) => e.code.toLowerCase() === cleanId);
    if (matchByCode) return matchByCode;

    // Remove dashes/spaces comparison (e.g. "ART01" vs "ART-01")
    const simplifiedId = cleanId.replace(/[^a-z0-9]/g, '');
    const matchBySimplified = employees.find(
      (e) => e.code.toLowerCase().replace(/[^a-z0-9]/g, '') === simplifiedId
    );
    if (matchBySimplified) return matchBySimplified;

    // Match by ID (e.g. "emp-101")
    const matchById = employees.find((e) => e.id.toLowerCase() === cleanId);
    if (matchById) return matchById;
  }

  // 2. Exact match on Name
  if (cleanName) {
    const matchByName = employees.find((e) => e.name.toLowerCase() === cleanName);
    if (matchByName) return matchByName;

    // First name & Last name partial match
    const matchPartial = employees.find(
      (e) =>
        e.name.toLowerCase().includes(cleanName) ||
        cleanName.includes(e.name.toLowerCase())
    );
    if (matchPartial) return matchPartial;
  }

  return null;
};

/**
 * Processes and validates all parsed rows into staged Attendance records
 */
export const processAttendanceRows = (
  rows: string[][],
  mapping: ColumnMapping,
  employees: Employee[],
  existingAttendance: AttendanceRecord[],
  settings: ShopSettings
): ParsedAttendanceRow[] => {
  const existingSet = new Set<string>();
  existingAttendance.forEach((a) => {
    existingSet.add(`${a.employeeId}_${a.date}`);
  });

  return rows.map((row, idx) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    const rawIdentifier = mapping.employeeIdentifier >= 0 ? row[mapping.employeeIdentifier] || '' : '';
    const rawName = mapping.employeeName >= 0 ? row[mapping.employeeName] || '' : '';
    const rawDate = mapping.date >= 0 ? row[mapping.date] || '' : '';
    const rawClockIn = mapping.clockIn >= 0 ? row[mapping.clockIn] || '' : '';
    const rawClockOut = mapping.clockOut >= 0 ? row[mapping.clockOut] || '' : '';
    const rawStation = mapping.station >= 0 ? row[mapping.station] || '' : '';
    const rawNotes = mapping.notes >= 0 ? row[mapping.notes] || '' : '';

    // Match Employee
    const matched = matchEmployee(rawIdentifier, rawName, employees);
    if (!matched) {
      errors.push(`Staff could not be identified (Code: "${rawIdentifier}", Name: "${rawName}")`);
    }

    // Normalize Date
    const normDate = normalizeDate(rawDate);
    if (!normDate) {
      errors.push(`Invalid shift date format ("${rawDate}")`);
    }

    // Normalize Clock In
    const normClockIn = normalizeTime(rawClockIn);
    if (!normClockIn) {
      errors.push(`Invalid or missing Clock-In time ("${rawClockIn}")`);
    }

    // Normalize Clock Out
    const normClockOut = normalizeTime(rawClockOut);
    if (!normClockOut && rawClockOut.trim() && !rawClockOut.toLowerCase().includes('active')) {
      warnings.push(`Clock-Out time could not be parsed ("${rawClockOut}"), marked as Active/On-Duty`);
    }

    // Calculate timecard
    const clockInVal = normClockIn || '08:00';
    const timecard = calculateTimecard(clockInVal, normClockOut, settings);

    // Check existing date
    const dateKey = matched && normDate ? `${matched.id}_${normDate}` : '';
    const isExistingDate = dateKey ? existingSet.has(dateKey) : false;
    if (isExistingDate) {
      warnings.push(`Record already exists for this staff on ${normDate} (will update with upsert mode)`);
    }

    const employeeId = matched ? matched.id : `emp-unmatched-${idx}`;
    const employeeCode = matched ? matched.code : rawIdentifier || 'UNK';
    const employeeName = matched ? matched.name : rawName || 'Unknown Staff';
    const role: EmployeeRole = matched ? matched.role : 'machine_operator';

    const station = rawStation.trim() || matched?.assignedStation || 'Sublimation Plant Floor';
    const notes = rawNotes.trim() ? `${rawNotes.trim()} [CSV Imported]` : 'Imported from Biometric/Timecard CSV';

    return {
      id: `att-import-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      rowIndex: idx + 2, // 1-based index including header
      rawRow: row,
      employeeId,
      employeeCode,
      employeeName,
      role,
      date: normDate || rawDate || '2026-08-27',
      clockIn: normClockIn || rawClockIn || '08:00',
      clockOut: normClockOut,
      regularHours: timecard.regularHours,
      overtimeHours: timecard.overtimeHours,
      lateMinutes: timecard.lateMinutes,
      status: timecard.status,
      station,
      notes,
      verifiedBy: 'Biometric System Import',
      matchedEmployee: matched,
      isValid: errors.length === 0,
      errors,
      warnings,
      isExistingDate,
    };
  });
};

/**
 * Generates ready-to-fill sample CSV template
 */
export const generateSampleAttendanceCSV = (employees: Employee[]): string => {
  const headers = [
    'Staff Code',
    'Full Name',
    'Shift Date',
    'Clock In',
    'Clock Out',
    'Workstation / Machine',
    'Activity Notes',
  ];

  const sampleRows: string[][] = [
    [
      employees[0]?.code || 'ART-01',
      employees[0]?.name || 'Leo Vance',
      '2026-08-28',
      '07:55',
      '17:05',
      'Design Suite #1',
      'Cycling jersey vector layout & color grading',
    ],
    [
      employees[1]?.code || 'ART-02',
      employees[1]?.name || 'Mia Chen',
      '2026-08-28',
      '08:18',
      '18:30',
      'Design Suite #2',
      'Wasatch RIP profiling & overtime prep',
    ],
    [
      employees[3]?.code || 'OPR-01',
      employees[3]?.name || 'Carlos Gomez',
      '2026-08-28',
      '07:50',
      '19:00',
      'Epson SureColor F9470H #1',
      '300m polyester continuous roll sublimation printing',
    ],
    [
      employees[4]?.code || 'OPR-02',
      employees[4]?.name || 'Derek Washington',
      '2026-08-28',
      '08:00',
      '17:00',
      'Eastman Rotary Calender',
      'Heat transfer onto dry-fit athletic knit',
    ],
    [
      employees[6]?.code || 'SEW-01',
      employees[6]?.name || 'Rosa Morales',
      '2026-08-28',
      '07:52',
      '17:15',
      'Sewing Station A (Overlock)',
      'Assembling motocross jersey panels',
    ],
    [
      employees[7]?.code || 'SUP-01',
      employees[7]?.name || 'Marcus Vance',
      '2026-08-28',
      '07:45',
      '17:30',
      'Floor Supervisor Desk',
      'Daily shift QA inspection and color verification',
    ],
  ];

  const escapeCSV = (val: string | number) => {
    const s = sanitizeCSVCell(String(val ?? ''));
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  let csv = headers.map(escapeCSV).join(',') + '\n';
  sampleRows.forEach((row) => {
    csv += row.map(escapeCSV).join(',') + '\n';
  });

  return csv;
};
