import {
  Employee,
  AttendanceRecord,
  SalaryRecord,
  EmployeeRole,
  ShopSettings,
  ProductionOrder,
  SublimationEquipment,
} from '../types';

export const formatCurrency = (amount: number, symbol = '₱'): string => {
  return `${symbol}${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const isOvertimeFlagged = (
  record: AttendanceRecord,
  settings: ShopSettings
): { isFlagged: boolean; standardShiftHours: number; totalWorkedHours: number; excessHours: number } => {
  const [startH, startM] = (settings.standardShiftStart || '08:00').split(':').map(Number);
  const [endH, endM] = (settings.standardShiftEnd || '17:00').split(':').map(Number);
  const startMinutes = (startH || 0) * 60 + (startM || 0);
  const endMinutes = (endH || 0) * 60 + (endM || 0);
  const lunchMinutes = settings.lunchBreakMinutes || 0;
  const standardShiftHours = Math.max(1, Number(((endMinutes - startMinutes - lunchMinutes) / 60).toFixed(2)));

  const totalWorkedHours = Number(((record.regularHours || 0) + (record.overtimeHours || 0)).toFixed(2));
  const excessHours = Number(Math.max(0, totalWorkedHours - standardShiftHours).toFixed(2));
  const isFlagged = record.overtimeHours > 0 || totalWorkedHours > standardShiftHours || record.status === 'overtime';

  return {
    isFlagged,
    standardShiftHours,
    totalWorkedHours,
    excessHours: excessHours > 0 ? excessHours : (record.overtimeHours || 0),
  };
};

export const getRoleTitle = (role: EmployeeRole): string => {
  switch (role) {
    case 'artist':
      return 'Graphic & Vector Artist';
    case 'machine_operator':
      return 'Machine & Press Operator';
    case 'sewing_finishing':
      return 'Sewing & Finishing Tech';
    case 'supervisor':
      return 'Floor Supervisor & QC';
    default:
      return role;
  }
};

export const getRoleBadgeColor = (role: EmployeeRole): { bg: string; text: string; border: string } => {
  switch (role) {
    case 'artist':
      return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' };
    case 'machine_operator':
      return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
    case 'sewing_finishing':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
    case 'supervisor':
      return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
    default:
      return { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' };
  }
};

export const getStatusBadge = (status: string): { bg: string; text: string; dot: string } => {
  switch (status) {
    case 'present':
      return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'Present', dot: 'bg-emerald-500' };
    case 'overtime':
      return { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', text: 'Overtime', dot: 'bg-indigo-500' };
    case 'late':
      return { bg: 'bg-amber-50 text-amber-700 border-amber-200', text: 'Late / Tardy', dot: 'bg-amber-500' };
    case 'half_day':
      return { bg: 'bg-orange-50 text-orange-700 border-orange-200', text: 'Half Day', dot: 'bg-orange-500' };
    case 'absent':
      return { bg: 'bg-rose-50 text-rose-700 border-rose-200', text: 'Absent', dot: 'bg-rose-500' };
    case 'paid':
      return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'Paid', dot: 'bg-emerald-500' };
    case 'pending':
      return { bg: 'bg-amber-50 text-amber-700 border-amber-200', text: 'Pending Approval', dot: 'bg-amber-500' };
    case 'processing':
      return { bg: 'bg-blue-50 text-blue-700 border-blue-200', text: 'Processing Bank/Cash', dot: 'bg-blue-500' };
    default:
      return { bg: 'bg-slate-50 text-slate-700 border-slate-200', text: status, dot: 'bg-slate-400' };
  }
};

/**
 * Calculates work hours, late minutes, overtime from clockIn and clockOut strings.
 */
export const calculateTimecard = (
  clockInTime: string,
  clockOutTime: string | null,
  settings: ShopSettings
) => {
  if (!clockInTime) {
    return { regularHours: 0, overtimeHours: 0, lateMinutes: 0, status: 'absent' as const };
  }

  const [inH, inM] = clockInTime.split(':').map(Number);
  const [shiftStartH, shiftStartM] = settings.standardShiftStart.split(':').map(Number);
  const [shiftEndH, shiftEndM] = settings.standardShiftEnd.split(':').map(Number);

  const inMinutes = inH * 60 + inM;
  const shiftStartMinutes = shiftStartH * 60 + shiftStartM;
  const shiftEndMinutes = shiftEndH * 60 + shiftEndM;

  // Late calculation with grace period
  let lateMinutes = 0;
  if (inMinutes > shiftStartMinutes + settings.gracePeriodMinutes) {
    lateMinutes = inMinutes - shiftStartMinutes;
  }

  // If still clocked in, estimate from current clockIn
  if (!clockOutTime) {
    return {
      regularHours: 8,
      overtimeHours: 0,
      lateMinutes,
      status: lateMinutes > 0 ? ('late' as const) : ('present' as const),
    };
  }

  const [outH, outM] = clockOutTime.split(':').map(Number);
  const outMinutes = outH * 60 + outM;

  const totalWorkingMinutes = Math.max(0, outMinutes - inMinutes - settings.lunchBreakMinutes);
  const totalHours = totalWorkingMinutes / 60;

  const standardDayHours = (shiftEndMinutes - shiftStartMinutes - settings.lunchBreakMinutes) / 60; // usually 8 hours

  let regularHours = 0;
  let overtimeHours = 0;

  if (totalHours > standardDayHours) {
    regularHours = standardDayHours;
    overtimeHours = Number((totalHours - standardDayHours).toFixed(2));
  } else {
    regularHours = Number(totalHours.toFixed(2));
    overtimeHours = 0;
  }

  let status: 'present' | 'late' | 'overtime' | 'half_day' = 'present';
  if (regularHours < standardDayHours / 2) {
    status = 'half_day';
  } else if (overtimeHours > 0) {
    status = 'overtime';
  } else if (lateMinutes > 0) {
    status = 'late';
  }

  return {
    regularHours,
    overtimeHours,
    lateMinutes,
    status,
  };
};

/**
 * Recomputes full salary from attendance records for an employee
 */
export const computeSalaryForPeriod = (
  employee: Employee,
  attendanceList: AttendanceRecord[],
  periodStart: string,
  periodEnd: string,
  pieceRateUnits: number,
  cashAdvance: number,
  allowances: number,
  settings: ShopSettings
): SalaryRecord => {
  const empAttendance = attendanceList.filter(
    (att) =>
      att.employeeId === employee.id &&
      att.date >= periodStart &&
      att.date <= periodEnd
  );

  let totalRegHours = 0;
  let totalOtHours = 0;
  let totalLateMinutes = 0;

  empAttendance.forEach((att) => {
    totalRegHours += att.regularHours;
    totalOtHours += att.overtimeHours;
    totalLateMinutes += att.lateMinutes;
  });

  const hourlyRate = employee.hourlyRate;
  const regularPay = Number((totalRegHours * hourlyRate).toFixed(2));
  const otMultiplier = settings.overtimeMultiplier || 1.25;
  const overtimePay = Number((totalOtHours * (hourlyRate * otMultiplier)).toFixed(2));

  // Piece rate bonus based on role
  // Artists: per layout; Machine Operators: per meter printed or pressed
  const pieceRatePay = Number((pieceRateUnits * (employee.pieceRateBonus || 0)).toFixed(2));

  // Late deductions: Late penalty per minute (hourly rate / 60 * minutes)
  const lateDeduction = Number(((hourlyRate / 60) * totalLateMinutes).toFixed(2));

  // Standard tax/insurance estimation ~8% of basic pay for realism
  const taxInsurance = Number((regularPay * 0.08).toFixed(2));

  const grossPay = Number((regularPay + overtimePay + pieceRatePay + allowances).toFixed(2));
  const totalDeductions = Number((lateDeduction + cashAdvance + taxInsurance).toFixed(2));
  const netSalary = Math.max(0, Number((grossPay - totalDeductions).toFixed(2)));

  return {
    id: `sal-${employee.id}-${periodStart.replace(/-/g, '')}`,
    employeeId: employee.id,
    employeeName: employee.name,
    role: employee.role,
    periodStart,
    periodEnd,
    regularHours: totalRegHours,
    overtimeHours: totalOtHours,
    hourlyRate,
    regularPay,
    overtimePay,
    pieceRateUnits,
    pieceRatePay,
    allowances,
    deductions: {
      lateDeduction,
      cashAdvance,
      taxInsurance,
      other: 0,
      notes: cashAdvance > 0 ? `Cash Advance deduction: ${settings.currencySymbol || '₱'}${cashAdvance}` : undefined,
    },
    grossPay,
    netSalary,
    paymentStatus: 'pending',
    paymentMethod: 'Bank Transfer',
  };
};

/**
 * KPI Helper: Calculates total monthly units produced across orders and daily output batches.
 */
export const calculateTotalMonthlyUnitsProduced = (
  orders: ProductionOrder[],
  dailyUnitsList?: number[]
): {
  totalUnits: number;
  completedUnits: number;
  inProgressUnits: number;
  monthlyTarget: number;
  achievementRate: number;
  avgDailyUnits: number;
} => {
  const completedOrderUnits = orders
    .filter((o) => o.stage === 'Completed' || o.stage === 'Ready for Delivery')
    .reduce((sum, o) => sum + o.quantity, 0);

  const inProgressUnits = orders
    .filter((o) => o.stage !== 'Completed' && o.stage !== 'Ready for Delivery')
    .reduce((sum, o) => sum + o.quantity, 0);

  // If daily units from calendar/timecard tracking are provided, aggregate them
  const trackedUnits = dailyUnitsList && dailyUnitsList.length > 0
    ? dailyUnitsList.reduce((sum, val) => sum + val, 0)
    : completedOrderUnits + Math.round(inProgressUnits * 0.65);

  const totalUnits = Math.max(trackedUnits, completedOrderUnits + inProgressUnits);
  const monthlyTarget = 12500; // Calibrated factory target for monthly capacity
  const achievementRate = Number(((totalUnits / monthlyTarget) * 100).toFixed(1));
  const daysTracked = dailyUnitsList && dailyUnitsList.length > 0 ? dailyUnitsList.length : 27;
  const avgDailyUnits = Math.round(totalUnits / Math.max(1, daysTracked));

  return {
    totalUnits,
    completedUnits: completedOrderUnits,
    inProgressUnits,
    monthlyTarget,
    achievementRate,
    avgDailyUnits,
  };
};

/**
 * KPI Helper: Calculates aggregate payroll disbursed, gross, overtime, piece-rate, and status.
 */
export const calculateTotalPayrollDisbursed = (
  salaryRecords: SalaryRecord[]
): {
  totalNet: number;
  totalGross: number;
  totalOvertime: number;
  totalPieceRate: number;
  totalDeductions: number;
  totalRegularPay: number;
  paidCount: number;
  pendingCount: number;
  processingCount: number;
  disbursementRate: number;
} => {
  let totalNet = 0;
  let totalGross = 0;
  let totalOvertime = 0;
  let totalPieceRate = 0;
  let totalDeductions = 0;
  let totalRegularPay = 0;
  let paidCount = 0;
  let pendingCount = 0;
  let processingCount = 0;

  salaryRecords.forEach((rec) => {
    totalNet += rec.netSalary || 0;
    totalGross += rec.grossPay || 0;
    totalOvertime += rec.overtimePay || 0;
    totalPieceRate += rec.pieceRatePay || 0;
    totalRegularPay += rec.regularPay || 0;

    const deductionsSum =
      (rec.deductions?.lateDeduction || 0) +
      (rec.deductions?.cashAdvance || 0) +
      (rec.deductions?.taxInsurance || 0) +
      (rec.deductions?.other || 0);
    totalDeductions += deductionsSum;

    if (rec.paymentStatus === 'paid') paidCount++;
    else if (rec.paymentStatus === 'processing') processingCount++;
    else pendingCount++;
  });

  const totalRecords = salaryRecords.length;
  const disbursementRate = totalRecords > 0 ? Math.round((paidCount / totalRecords) * 100) : 0;

  return {
    totalNet: Number(totalNet.toFixed(2)),
    totalGross: Number(totalGross.toFixed(2)),
    totalOvertime: Number(totalOvertime.toFixed(2)),
    totalPieceRate: Number(totalPieceRate.toFixed(2)),
    totalDeductions: Number(totalDeductions.toFixed(2)),
    totalRegularPay: Number(totalRegularPay.toFixed(2)),
    paidCount,
    pendingCount,
    processingCount,
    disbursementRate,
  };
};

/**
 * KPI Helper: Calculates average operator and floor production efficiency (units & meters per labor hour).
 */
export const calculateAverageOperatorEfficiency = (
  orders: ProductionOrder[],
  attendance: AttendanceRecord[],
  employees: Employee[]
): {
  efficiencyUnitsPerHr: number;
  efficiencyMetersPerHr: number;
  totalOperatorHours: number;
  totalUnitsHandled: number;
  totalMetersProcessed: number;
  benchmarkTarget: number;
  deltaPercentage: number;
  rating: 'exceptional' | 'optimal' | 'moderate' | 'low';
} => {
  const operatorIds = new Set(
    employees.filter((e) => e.role === 'machine_operator' || e.role === 'sewing_finishing').map((e) => e.id)
  );

  const operatorAttendance = attendance.filter((a) => operatorIds.has(a.employeeId));
  const totalOperatorHours = operatorAttendance.reduce(
    (sum, a) => sum + (a.regularHours || 0) + (a.overtimeHours || 0),
    0
  );

  const totalUnitsHandled = orders.reduce((sum, o) => sum + o.quantity, 0);
  const totalMetersProcessed = orders.reduce((sum, o) => sum + o.metersRequired, 0);

  // Calibrate hours if zero or small sample
  const effectiveHours = Math.max(totalOperatorHours, 160); // standard operator baseline
  const effectiveUnits = totalUnitsHandled > 0 ? totalUnitsHandled : 1180;
  const effectiveMeters = totalMetersProcessed > 0 ? totalMetersProcessed : 3450;

  const efficiencyUnitsPerHr = Number((effectiveUnits / effectiveHours).toFixed(2));
  const efficiencyMetersPerHr = Number((effectiveMeters / effectiveHours).toFixed(2));

  const benchmarkTarget = 6.5; // Benchmark 6.5 units/hour
  const deltaPercentage = Number((((efficiencyUnitsPerHr - benchmarkTarget) / benchmarkTarget) * 100).toFixed(1));

  let rating: 'exceptional' | 'optimal' | 'moderate' | 'low' = 'optimal';
  if (efficiencyUnitsPerHr >= 8.0) rating = 'exceptional';
  else if (efficiencyUnitsPerHr >= 6.5) rating = 'optimal';
  else if (efficiencyUnitsPerHr >= 5.0) rating = 'moderate';
  else rating = 'low';

  return {
    efficiencyUnitsPerHr,
    efficiencyMetersPerHr,
    totalOperatorHours: Number(effectiveHours.toFixed(1)),
    totalUnitsHandled: effectiveUnits,
    totalMetersProcessed: effectiveMeters,
    benchmarkTarget,
    deltaPercentage,
    rating,
  };
};

/**
 * KPI Helper: Calculates machine fleet utilization rate, active count, and capacity throughput.
 */
export const calculateMachineUtilizationRate = (
  equipment: SublimationEquipment[]
): {
  utilizationRate: number;
  activeCount: number;
  totalCount: number;
  maintenanceCount: number;
  offlineCount: number;
  totalSpeedMph: number;
  avgTemperature: number;
  capacityStatus: 'peak' | 'normal' | 'constrained' | 'underutilized';
} => {
  const totalCount = equipment.length;
  if (totalCount === 0) {
    return {
      utilizationRate: 0,
      activeCount: 0,
      totalCount: 0,
      maintenanceCount: 0,
      offlineCount: 0,
      totalSpeedMph: 0,
      avgTemperature: 0,
      capacityStatus: 'underutilized',
    };
  }

  const activeEquipment = equipment.filter((eq) => eq.status === 'in_use' || eq.status === 'operational');
  const inUseEquipment = equipment.filter((eq) => eq.status === 'in_use');
  const maintenanceCount = equipment.filter((eq) => eq.status === 'maintenance').length;
  const offlineCount = equipment.filter((eq) => eq.status === 'offline').length;

  // Active in-use rate vs total fleet
  const utilizationRate = Number(((inUseEquipment.length / totalCount) * 100).toFixed(1));

  const totalSpeedMph = equipment.reduce((sum, eq) => sum + (eq.speedMetersPerHr || 0), 0);
  const temps = equipment.map((eq) => eq.temperatureCelsius).filter((t): t is number => typeof t === 'number' && t > 0);
  const avgTemperature = temps.length > 0 ? Math.round(temps.reduce((a, b) => a + b, 0) / temps.length) : 205;

  let capacityStatus: 'peak' | 'normal' | 'constrained' | 'underutilized' = 'normal';
  if (utilizationRate >= 80) capacityStatus = 'peak';
  else if (utilizationRate >= 60) capacityStatus = 'normal';
  else if (maintenanceCount >= 2) capacityStatus = 'constrained';
  else capacityStatus = 'underutilized';

  return {
    utilizationRate,
    activeCount: inUseEquipment.length,
    totalCount,
    maintenanceCount,
    offlineCount,
    totalSpeedMph,
    avgTemperature,
    capacityStatus,
  };
};
