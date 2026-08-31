export type EmployeeRole = 'artist' | 'machine_operator' | 'sewing_finishing' | 'supervisor';

export type EmployeeStatus = 'active' | 'on_leave' | 'inactive';

export type AttendanceStatus = 'present' | 'late' | 'overtime' | 'half_day' | 'absent';

export type MachineType = 'sublimation_printer' | 'rotary_heat_press' | 'rotary_calender' | 'flatbed_heat_press' | 'laser_cutter' | 'design_pc';

export interface Employee {
  id: string;
  name: string;
  code: string;
  role: EmployeeRole;
  specialty: string;
  hourlyRate: number; // e.g. $18/hr or ₱120/hr
  pieceRateBonus: number; // bonus per completed piece / meter
  phone: string;
  email: string;
  status: EmployeeStatus;
  joinedDate: string;
  assignedStation?: string;
  avatarUrl?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  role: EmployeeRole;
  date: string; // YYYY-MM-DD
  clockIn: string; // HH:mm:ss or HH:mm
  clockOut: string | null; // HH:mm:ss or HH:mm or null if currently working
  regularHours: number;
  overtimeHours: number;
  lateMinutes: number;
  status: AttendanceStatus;
  station?: string;
  notes?: string;
  verifiedBy?: string;
}

export interface SalaryRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  role: EmployeeRole;
  periodStart: string;
  periodEnd: string;
  regularHours: number;
  overtimeHours: number;
  hourlyRate: number;
  regularPay: number;
  overtimePay: number;
  pieceRateUnits: number; // e.g. number of jerseys designed or meters pressed
  pieceRatePay: number;
  allowances: number;
  deductions: {
    lateDeduction: number;
    cashAdvance: number;
    taxInsurance: number;
    other: number;
    notes?: string;
  };
  grossPay: number;
  netSalary: number;
  paymentStatus: 'paid' | 'pending' | 'processing';
  paidDate?: string;
  paymentMethod?: 'Cash' | 'Bank Transfer' | 'E-Wallet';
}

export interface ProductionOrder {
  id: string;
  orderNumber: string;
  clientName: string;
  projectName: string;
  itemType: 'Basketball Jersey' | 'Cycling Apparel' | 'Esports Hoodie' | 'Polo Shirt' | 'Banner/Flag' | 'Rashguard' | 'Custom Fabric';
  quantity: number;
  metersRequired: number;
  assignedArtistId: string;
  assignedArtistName: string;
  assignedOperatorId: string;
  assignedOperatorName: string;
  machineId: string;
  machineName: string;
  stage: 'Design & RIP' | 'Sublimation Printing' | 'Heat Press Transfer' | 'Sewing & Finishing' | 'Ready for Delivery' | 'Completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  startDate: string;
  dueDate: string;
  progressPercent: number;
}

export interface SublimationEquipment {
  id: string;
  name: string;
  model: string;
  type: MachineType;
  status: 'operational' | 'in_use' | 'maintenance' | 'offline';
  currentOperatorId?: string;
  currentOperatorName?: string;
  currentJob?: string;
  temperatureCelsius?: number;
  speedMetersPerHr?: number;
  location: string;
}

export interface HolidayConfig {
  date: string; // YYYY-MM-DD
  name: string;
  type: 'regular' | 'special' | 'custom';
  payMultiplier?: number; // e.g. 1.50 or 2.00
  description?: string;
}

export interface PayslipSignatories {
  preparedByName?: string; // Default: 'Elena Rostova'
  preparedByTitle?: string; // Default: 'Senior Payroll & Timecard Auditor'
  certifiedByName?: string; // Default: 'Marcus Vance'
  certifiedByTitle?: string; // Default: 'Plant Operations Director'
  approvedByName?: string; // Default: 'David Sterling' (Admin / Owner)
  approvedByTitle?: string; // Default: 'Managing Director / Shop Owner'
}

export interface ShopSettings {
  shopName: string;
  tagline: string;
  currencySymbol: string;
  standardShiftStart: string; // "08:00"
  standardShiftEnd: string; // "17:00"
  lunchBreakMinutes: number; // 60
  gracePeriodMinutes: number; // 15
  overtimeMultiplier: number; // 1.25
  holidayOvertimeMultiplier: number; // 1.50
  artistDesignBonusPerJob: number; // $5.00
  operatorPressBonusPerMeter: number; // $0.15
  holidays?: HolidayConfig[];
  isHolidayToday?: boolean;
  activeHolidayName?: string;
  signatories?: PayslipSignatories;
}
