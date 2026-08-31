import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Users,
  Palette,
  Printer,
  Clock,
  DollarSign,
  TrendingUp,
  Activity,
  CheckCircle2,
  AlertCircle,
  Flame,
  Layers,
  ArrowUpRight,
  Sparkles,
  Zap,
  Calendar,
  BarChart3,
  Sliders,
  Filter,
  CalendarDays,
  Trophy,
  Target,
  Info,
  ChevronRight,
  Award,
} from 'lucide-react';
import {
  Employee,
  AttendanceRecord,
  SalaryRecord,
  ProductionOrder,
  SublimationEquipment,
  ShopSettings,
} from '../types';
import {
  formatCurrency,
  getRoleBadgeColor,
  getStatusBadge,
  calculateTotalMonthlyUnitsProduced,
  calculateTotalPayrollDisbursed,
  calculateAverageOperatorEfficiency,
  calculateMachineUtilizationRate,
} from '../utils/calculations';
import { Package, Gauge, Cpu, Check, ArrowDownRight } from 'lucide-react';

interface DashboardViewProps {
  employees: Employee[];
  attendance: AttendanceRecord[];
  salaryRecords: SalaryRecord[];
  orders: ProductionOrder[];
  equipment: SublimationEquipment[];
  settings: ShopSettings;
  onNavigateTab: (tab: 'attendance' | 'salary' | 'employees' | 'production') => void;
  onOpenQuickPunch: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  employees,
  attendance,
  salaryRecords,
  orders,
  equipment,
  settings,
  onNavigateTab,
  onOpenQuickPunch,
}) => {
  const [barChartMode, setBarChartMode] = useState<'hours' | 'production'>('hours');
  const [donutMode, setDonutMode] = useState<'salary' | 'attendance'>('salary');
  const [monthlyMetricView, setMonthlyMetricView] = useState<'both' | 'units' | 'hours'>('both');
  const [monthlyDateRange, setMonthlyDateRange] = useState<'month_to_date' | 'full_month'>('month_to_date');
  const [selectedHeatmapDay, setSelectedHeatmapDay] = useState<number>(27); // Default to today (Aug 27)
  const [heatmapFilter, setHeatmapFilter] = useState<'all' | 'peak' | 'high' | 'weekdays'>('all');
  const [heatmapHoveredDay, setHeatmapHoveredDay] = useState<number | null>(null);
  const [heatmapMetricMode, setHeatmapMetricMode] = useState<'volume' | 'attendance' | 'combined'>('combined');

  const todayStr = '2026-08-27'; // matches current app time context

  // Today's attendance analytics
  const todayAttendance = useMemo(() => {
    return attendance.filter((a) => a.date === todayStr);
  }, [attendance]);

  const activeArtists = useMemo(() => {
    const artistEmpIds = new Set(employees.filter((e) => e.role === 'artist').map((e) => e.id));
    return todayAttendance.filter((a) => artistEmpIds.has(a.employeeId));
  }, [employees, todayAttendance]);

  const activeOperators = useMemo(() => {
    const opEmpIds = new Set(
      employees.filter((e) => e.role === 'machine_operator').map((e) => e.id)
    );
    return todayAttendance.filter((a) => opEmpIds.has(a.employeeId));
  }, [employees, todayAttendance]);

  const totalEmployeesCount = employees.length;
  const attendanceRate = totalEmployeesCount > 0 
    ? Math.round((todayAttendance.length / totalEmployeesCount) * 100) 
    : 0;

  const totalPayrollPeriod = useMemo(() => {
    return salaryRecords.reduce((sum, item) => sum + item.netSalary, 0);
  }, [salaryRecords]);

  const totalGrossPayroll = useMemo(() => {
    return salaryRecords.reduce((sum, item) => sum + item.grossPay, 0);
  }, [salaryRecords]);

  const totalOvertimePaid = useMemo(() => {
    return salaryRecords.reduce((sum, item) => sum + item.overtimePay, 0);
  }, [salaryRecords]);

  // Monthly Analytics Data: Daily Production Units & Total Attendance Hours over current month (August 2026)
  const monthlyAnalyticsData = useMemo(() => {
    const daysData = [];
    const maxDay = monthlyDateRange === 'month_to_date' ? 27 : 31;

    // Daily benchmark profiles for production units (jerseys, kits, sublimation apparel)
    const baseProductionByDay: Record<number, number> = {
      1: 145, // Sat
      2: 95,  // Sun
      3: 380, // Mon
      4: 425, // Tue
      5: 460, // Wed
      6: 415, // Thu
      7: 395, // Fri
      8: 165, // Sat
      9: 115, // Sun
      10: 440, // Mon
      11: 495, // Tue
      12: 560, // Wed (Rush Esports Team drop)
      13: 475, // Thu
      14: 435, // Fri
      15: 185, // Sat
      16: 125, // Sun
      17: 465, // Mon
      18: 515, // Tue
      19: 580, // Wed (National Championship Kits)
      20: 525, // Thu
      21: 455, // Fri
      22: 195, // Sat
      23: 135, // Sun
      24: 480, // Mon
      25: 535, // Tue
      26: 590, // Wed (Peak Output)
      27: 540, // Thu (Today)
      28: 465, // Fri (Scheduled)
      29: 175, // Sat (Scheduled)
      30: 110, // Sun (Scheduled)
      31: 495, // Mon (Scheduled)
    };

    // Baseline plant labor hours across staff shifts
    const baseHoursByDay: Record<number, number> = {
      1: 20.0, 2: 14.0, 3: 58.5, 4: 61.0, 5: 65.5, 6: 59.0, 7: 57.0,
      8: 22.5, 9: 16.0, 10: 62.0, 11: 64.5, 12: 69.0, 13: 63.5, 14: 60.0,
      15: 24.0, 16: 18.0, 17: 63.0, 18: 66.5, 19: 71.0, 20: 65.0, 21: 61.5,
      22: 25.0, 23: 16.5, 24: 64.5, 25: 67.0, 26: 72.0, 27: 66.1,
      28: 62.0, 29: 22.0, 30: 15.0, 31: 64.0
    };

    // Calculate actual logged hours per date from live attendance records
    const attendanceHoursMap: Record<string, number> = {};
    attendance.forEach((att) => {
      const hrs = (att.regularHours || 0) + (att.overtimeHours || 0);
      attendanceHoursMap[att.date] = (attendanceHoursMap[att.date] || 0) + hrs;
    });

    for (let day = 1; day <= maxDay; day++) {
      const dayStr = day < 10 ? `0${day}` : `${day}`;
      const fullDate = `2026-08-${dayStr}`;
      
      // Calculate real attendance hours if exists in state, otherwise fallback to calibrated baseline
      const loggedHours = attendanceHoursMap[fullDate];
      const attendanceHours = loggedHours !== undefined && loggedHours > 0 
        ? Math.round(loggedHours * 10) / 10 
        : baseHoursByDay[day] || 58.0;

      const productionUnits = baseProductionByDay[day] || 400;
      const efficiency = attendanceHours > 0 ? (productionUnits / attendanceHours).toFixed(2) : '0.00';

      daysData.push({
        date: fullDate,
        dayLabel: `Aug ${day}`,
        dayNum: day,
        productionUnits,
        attendanceHours,
        efficiency: parseFloat(efficiency),
        isToday: fullDate === todayStr,
        isWeekend: [1, 2, 8, 9, 15, 16, 22, 23, 29, 30].includes(day),
      });
    }

    return daysData;
  }, [attendance, monthlyDateRange, todayStr]);

  // Aggregate monthly metrics summary
  const monthlyMetricsSummary = useMemo(() => {
    const totalUnits = monthlyAnalyticsData.reduce((sum, d) => sum + d.productionUnits, 0);
    const totalHours = monthlyAnalyticsData.reduce((sum, d) => sum + d.attendanceHours, 0);
    const daysCount = monthlyAnalyticsData.length;
    const avgUnitsPerDay = daysCount > 0 ? Math.round(totalUnits / daysCount) : 0;
    const avgHoursPerDay = daysCount > 0 ? (totalHours / daysCount).toFixed(1) : '0';
    const overallEfficiency = totalHours > 0 ? (totalUnits / totalHours).toFixed(2) : '0';

    let peakDay = monthlyAnalyticsData[0];
    monthlyAnalyticsData.forEach((d) => {
      if (!peakDay || d.productionUnits > peakDay.productionUnits) {
        peakDay = d;
      }
    });

    return {
      totalUnits,
      totalHours: Math.round(totalHours * 10) / 10,
      avgUnitsPerDay,
      avgHoursPerDay,
      overallEfficiency,
      peakDay: peakDay ? `${peakDay.dayLabel} (${peakDay.productionUnits} pcs)` : 'N/A',
      daysCount,
    };
  }, [monthlyAnalyticsData]);

  // Calendar Heatmap: Full 31 days of August 2026 with production volume, actual attendance counts & shift labor
  const calendarHeatmapDays = useMemo(() => {
    // Calibrated production benchmarks for all 31 days of August 2026
    const augustProductionData: Record<number, { units: number; hours: number; headcount: number; job: string; isPeak?: boolean }> = {
      1: { units: 145, hours: 20.0, headcount: 3, job: 'Weekend Maintenance & Small Test Swatches (145 pcs)' },
      2: { units: 95, hours: 14.0, headcount: 2, job: 'Sunday Standby & Routine Print Head Clean (95 pcs)' },
      3: { units: 380, hours: 58.5, headcount: 7, job: 'Youth League Soccer Team Uniform Batch (380 pcs)' },
      4: { units: 425, hours: 61.0, headcount: 8, job: 'City Basketball Club Reversible Kits (425 pcs)' },
      5: { units: 460, hours: 65.5, headcount: 8, job: 'Crossfit Gym Custom Compression Tops (460 pcs)' },
      6: { units: 415, hours: 59.0, headcount: 7, job: 'Cycling Club Long-Sleeve Thermal Jerseys (415 pcs)' },
      7: { units: 395, hours: 57.0, headcount: 7, job: 'Regional Volleyball Championship Uniforms (395 pcs)' },
      8: { units: 165, hours: 22.5, headcount: 3, job: 'Saturday Rush Order: High School Relay Singlets (165 pcs)' },
      9: { units: 115, hours: 16.0, headcount: 2, job: 'Sunday Rotary Heat Press Calibration & Prep (115 pcs)' },
      10: { units: 440, hours: 62.0, headcount: 8, job: 'Motorsport Sublimated Pit Crew Shirts (440 pcs)' },
      11: { units: 495, hours: 64.5, headcount: 8, job: 'Regional Cycling Tour Kits & Arm Warmers (495 pcs)' },
      12: { units: 560, hours: 69.0, headcount: 9, job: '🔥 Rush Esports International Championship Drop (560 pcs)', isPeak: true },
      13: { units: 475, hours: 63.5, headcount: 8, job: 'Marathon Finisher Tees & Dry-Fit Caps (475 pcs)' },
      14: { units: 435, hours: 60.0, headcount: 8, job: 'Premier Bowling League Collared Polos (435 pcs)' },
      15: { units: 185, hours: 24.0, headcount: 3, job: 'Saturday Priority Sample Sets & Prototype Jerseys (185 pcs)' },
      16: { units: 125, hours: 18.0, headcount: 2, job: 'Sunday Machine Maintenance & Ink Refill (125 pcs)' },
      17: { units: 465, hours: 63.0, headcount: 8, job: 'Track & Field Team Singlets and Shorts (465 pcs)' },
      18: { units: 515, hours: 66.5, headcount: 8, job: 'Corporate Tech Summit Sublimated Hoodies & Polos (515 pcs)' },
      19: { units: 580, hours: 71.0, headcount: 9, job: '🔥 National Cup Soccer Jerseys & Warmup Jackets (580 pcs)', isPeak: true },
      20: { units: 525, hours: 65.0, headcount: 8, job: 'Flag Football League Kits & Referee Tops (525 pcs)' },
      21: { units: 455, hours: 61.5, headcount: 8, job: 'High School Band Performance Apparel (455 pcs)' },
      22: { units: 195, hours: 25.0, headcount: 3, job: 'Weekend Express Print: Triathlete Race Tops (195 pcs)' },
      23: { units: 135, hours: 16.5, headcount: 2, job: 'Sunday Prep & Rotary Press Blanket Maintenance (135 pcs)' },
      24: { units: 480, hours: 64.5, headcount: 8, job: 'Metropolitan Badminton Club Apparel (480 pcs)' },
      25: { units: 535, hours: 67.0, headcount: 8, job: 'Varsity Athletics Sublimation Hoodies & Bags (535 pcs)' },
      26: { units: 590, hours: 72.0, headcount: 9, job: '🏆 Monthly Record: Apex Esports Pro Jerseys & Banners (590 pcs)', isPeak: true },
      27: { units: 540, hours: 66.1, headcount: 8, job: '⚡ Active Today: University Rugby Kits & Training Tops (540 pcs)' },
      28: { units: 465, hours: 62.0, headcount: 8, job: 'Scheduled: Elite Archery Club Performance Polos (465 pcs)' },
      29: { units: 175, hours: 22.0, headcount: 3, job: 'Scheduled Weekend: Promo Flags & Custom Neck Gaiters (175 pcs)' },
      30: { units: 110, hours: 15.0, headcount: 2, job: 'Scheduled Sunday: System Deep Cleaning & Safety Audit (110 pcs)' },
      31: { units: 495, hours: 64.0, headcount: 8, job: 'Scheduled: Dragon Boat Festival Racing Singlets (495 pcs)' },
    };

    // Calculate real attendance records count & hours for each calendar date
    const attendanceStatsByDate: Record<string, { count: number; hours: number; presentCount: number; lateCount: number }> = {};
    attendance.forEach((att) => {
      if (!attendanceStatsByDate[att.date]) {
        attendanceStatsByDate[att.date] = { count: 0, hours: 0, presentCount: 0, lateCount: 0 };
      }
      attendanceStatsByDate[att.date].count += 1;
      attendanceStatsByDate[att.date].hours += (att.regularHours || 0) + (att.overtimeHours || 0);
      if (att.status === 'present') attendanceStatsByDate[att.date].presentCount += 1;
      if (att.status === 'late') attendanceStatsByDate[att.date].lateCount += 1;
    });

    // Calculate intensity level (0 to 5) and classification across volume, attendance count, or combined mode
    const getIntensity = (units: number, attendanceCount: number, mode: 'volume' | 'attendance' | 'combined'): { 
      level: number; 
      label: string; 
      bgClass: string; 
      textClass: string; 
      borderClass: string;
      badgeClass: string;
    } => {
      if (mode === 'attendance') {
        if (attendanceCount <= 2) {
          return {
            level: 0,
            label: 'Skeleton / Weekend Staff (1–2 staff)',
            bgClass: 'bg-emerald-50 hover:bg-emerald-100',
            textClass: 'text-emerald-800',
            borderClass: 'border-emerald-200',
            badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          };
        }
        if (attendanceCount <= 4) {
          return {
            level: 1,
            label: 'Partial Team (3–4 staff)',
            bgClass: 'bg-emerald-100 hover:bg-emerald-200',
            textClass: 'text-emerald-900 font-medium',
            borderClass: 'border-emerald-300',
            badgeClass: 'bg-emerald-200 text-emerald-900 border-emerald-400',
          };
        }
        if (attendanceCount <= 6) {
          return {
            level: 2,
            label: 'Moderate Team Shift (5–6 staff)',
            bgClass: 'bg-teal-300 hover:bg-teal-400',
            textClass: 'text-teal-950 font-semibold',
            borderClass: 'border-teal-400',
            badgeClass: 'bg-teal-400/40 text-teal-950 border-teal-500',
          };
        }
        if (attendanceCount <= 7) {
          return {
            level: 3,
            label: 'Standard Full Shift (7 staff)',
            bgClass: 'bg-teal-600 hover:bg-teal-700',
            textClass: 'text-white font-bold',
            borderClass: 'border-teal-700 shadow-2xs',
            badgeClass: 'bg-teal-500 text-white border-teal-400',
          };
        }
        if (attendanceCount === 8) {
          return {
            level: 4,
            label: '100% Full Plant Attendance (8 staff)',
            bgClass: 'bg-teal-700 hover:bg-teal-800',
            textClass: 'text-white font-extrabold',
            borderClass: 'border-teal-800 shadow-xs ring-1 ring-teal-300/60',
            badgeClass: 'bg-teal-600 text-white border-teal-400',
          };
        }
        return {
          level: 5,
          label: 'Peak Staffing & Overtime Surge (9+ staff)',
          bgClass: 'bg-emerald-800 hover:bg-emerald-900',
          textClass: 'text-white font-extrabold',
          borderClass: 'border-emerald-950 shadow-sm ring-2 ring-amber-300',
          badgeClass: 'bg-amber-400 text-slate-950 border-amber-300 font-black',
        };
      }

      // Volume or Combined Mode Scale (5-Tier Color scale from slate rest to indigo peak)
      if (units < 150) {
        return {
          level: 0,
          label: 'Low / Weekend Rest (<150 pcs)',
          bgClass: 'bg-slate-100 hover:bg-slate-200',
          textClass: 'text-slate-600',
          borderClass: 'border-slate-200',
          badgeClass: 'bg-slate-200 text-slate-700 border-slate-300',
        };
      }
      if (units < 380) {
        return {
          level: 1,
          label: 'Moderate Output (150–379 pcs)',
          bgClass: 'bg-sky-100 hover:bg-sky-200',
          textClass: 'text-sky-800 font-medium',
          borderClass: 'border-sky-200',
          badgeClass: 'bg-sky-200 text-sky-900 border-sky-300',
        };
      }
      if (units < 460) {
        return {
          level: 2,
          label: 'Solid Production (380–459 pcs)',
          bgClass: 'bg-sky-300 hover:bg-sky-400',
          textClass: 'text-sky-950 font-semibold',
          borderClass: 'border-sky-400',
          badgeClass: 'bg-sky-400/40 text-sky-950 border-sky-500',
        };
      }
      if (units < 540) {
        return {
          level: 3,
          label: 'High Output Shift (460–539 pcs)',
          bgClass: 'bg-blue-500 hover:bg-blue-600',
          textClass: 'text-white font-bold',
          borderClass: 'border-blue-600 shadow-2xs',
          badgeClass: 'bg-blue-600 text-white border-blue-400',
        };
      }
      if (units < 580) {
        return {
          level: 4,
          label: 'Surge Production Shift (540–579 pcs)',
          bgClass: 'bg-blue-700 hover:bg-blue-800',
          textClass: 'text-white font-extrabold',
          borderClass: 'border-blue-800 shadow-xs ring-1 ring-blue-300/60',
          badgeClass: 'bg-blue-800 text-white border-blue-500',
        };
      }
      return {
        level: 5,
        label: 'Peak Record Milestone (580+ pcs)',
        bgClass: 'bg-indigo-700 hover:bg-indigo-800',
        textClass: 'text-white font-extrabold',
        borderClass: 'border-indigo-900 shadow-sm ring-2 ring-amber-300',
        badgeClass: 'bg-indigo-800 text-white border-amber-300 ring-1 ring-amber-300 font-black',
      };
    };

    const daysList = [];
    const dayNames = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri']; // Aug 1 is Saturday
    const fullDayNames = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    for (let day = 1; day <= 31; day++) {
      const dayStr = day < 10 ? `0${day}` : `${day}`;
      const dateStr = `2026-08-${dayStr}`;
      const dayData = augustProductionData[day];
      const units = dayData ? dayData.units : 400;
      
      const realAtt = attendanceStatsByDate[dateStr];
      const attendanceCount = realAtt && realAtt.count > 0 ? realAtt.count : (dayData ? dayData.headcount : 8);
      const hours = realAtt && realAtt.hours > 0 ? Math.round(realAtt.hours * 10) / 10 : (dayData ? dayData.hours : 60.0);
      const presentCount = realAtt ? realAtt.presentCount : attendanceCount;
      const lateCount = realAtt ? realAtt.lateCount : 0;

      const job = dayData ? dayData.job : 'Sublimation Printing Batch';
      const isPeak = units >= 550;
      const isHigh = units >= 460;
      const isToday = day === 27;
      const isPastOrToday = day <= 27;
      const dayOfWeekIndex = (day - 1) % 7; // 0 = Sat, 1 = Sun, 2 = Mon, 3 = Tue, 4 = Wed, 5 = Thu, 6 = Fri
      const isWeekend = dayOfWeekIndex === 0 || dayOfWeekIndex === 1; // Sat (0) or Sun (1)
      const dayOfWeekShort = dayNames[dayOfWeekIndex];
      const dayOfWeekFull = fullDayNames[dayOfWeekIndex];
      const efficiency = hours > 0 ? (units / hours).toFixed(2) : '0.00';
      const intensity = getIntensity(units, attendanceCount, heatmapMetricMode);

      daysList.push({
        dayNum: day,
        dateStr,
        dayOfWeekShort,
        dayOfWeekFull,
        units,
        attendanceCount,
        presentCount,
        lateCount,
        hours,
        efficiency,
        job,
        isPeak,
        isHigh,
        isToday,
        isPastOrToday,
        isWeekend,
        intensity,
      });
    }

    return daysList;
  }, [attendance, heatmapMetricMode]);

  // Selected Day Details for Heatmap Inspector
  const selectedDayInfo = useMemo(() => {
    const targetDay = calendarHeatmapDays.find((d) => d.dayNum === selectedHeatmapDay);
    return targetDay || calendarHeatmapDays[26]; // fallback to today (Aug 27)
  }, [calendarHeatmapDays, selectedHeatmapDay]);

  // Filtered heatmap days count / stats
  const heatmapStats = useMemo(() => {
    const peakDays = calendarHeatmapDays.filter((d) => d.isPeak);
    const highDays = calendarHeatmapDays.filter((d) => d.units >= 460);
    const weekdays = calendarHeatmapDays.filter((d) => !d.isWeekend);
    const totalMonthUnits = calendarHeatmapDays.reduce((sum, d) => sum + d.units, 0);
    const weekdayUnits = weekdays.reduce((sum, d) => sum + d.units, 0);
    const avgWeekdayUnits = Math.round(weekdayUnits / weekdays.length);
    const maxDay = [...calendarHeatmapDays].sort((a, b) => b.units - a.units)[0];

    return {
      peakDaysCount: peakDays.length,
      highDaysCount: highDays.length,
      weekdaysCount: weekdays.length,
      totalMonthUnits,
      avgWeekdayUnits,
      maxDay,
    };
  }, [calendarHeatmapDays]);

  // Bar Chart Data: Weekly Labor Hours (Mon-Fri)
  const weeklyHoursData = [
    { day: 'Mon (08/24)', artistHours: 24, artistOT: 2.5, operatorHours: 24, operatorOT: 4.5, totalMeters: 420 },
    { day: 'Tue (08/25)', artistHours: 24, artistOT: 1.5, operatorHours: 24, operatorOT: 5.0, totalMeters: 490 },
    { day: 'Wed (08/26)', artistHours: 24, artistOT: 3.0, operatorHours: 24, operatorOT: 6.5, totalMeters: 560 },
    { day: 'Thu (08/27)', artistHours: 23.6, artistOT: 2.5, operatorHours: 24, operatorOT: 5.0, totalMeters: 510 },
    { day: 'Fri (08/28)', artistHours: 24, artistOT: 1.0, operatorHours: 24, operatorOT: 3.0, totalMeters: 380 },
  ];

  // Donut Chart Data 1: Salary Cost by Role
  const roleSalaryDistribution = useMemo(() => {
    const roleSums: Record<string, number> = {
      artist: 0,
      machine_operator: 0,
      sewing_finishing: 0,
      supervisor: 0,
    };

    salaryRecords.forEach((sal) => {
      if (roleSums[sal.role] !== undefined) {
        roleSums[sal.role] += sal.netSalary;
      }
    });

    return [
      { name: 'Graphic Artists', value: Math.round(roleSums.artist), color: '#8b5cf6' },
      { name: 'Machine Operators', value: Math.round(roleSums.machine_operator), color: '#3b82f6' },
      { name: 'Sewing & Finishing', value: Math.round(roleSums.sewing_finishing), color: '#10b981' },
      { name: 'Supervisor / QC', value: Math.round(roleSums.supervisor), color: '#f59e0b' },
    ].filter((item) => item.value > 0);
  }, [salaryRecords]);

  // Donut Chart Data 2: Attendance Status Breakdown Today
  const attendanceStatusDistribution = useMemo(() => {
    const counts = {
      present: 0,
      overtime: 0,
      late: 0,
      half_day: 0,
    };

    todayAttendance.forEach((att) => {
      if (counts[att.status] !== undefined) {
        counts[att.status]++;
      }
    });

    const absentCount = Math.max(0, employees.length - todayAttendance.length);

    return [
      { name: 'On-Time Present', value: counts.present, color: '#10b981' },
      { name: 'Working Overtime', value: counts.overtime, color: '#6366f1' },
      { name: 'Tardy / Late', value: counts.late, color: '#f59e0b' },
      { name: 'Half Day', value: counts.half_day, color: '#ec4899' },
      { name: 'Absent / Off', value: absentCount, color: '#94a3b8' },
    ].filter((item) => item.value > 0);
  }, [todayAttendance, employees]);

  // Key Performance Indicators (KPIs) calculated via calculation helpers
  const kpiMonthlyUnits = useMemo(() => {
    const dailyUnits = calendarHeatmapDays.map((d) => d.units);
    return calculateTotalMonthlyUnitsProduced(orders, dailyUnits);
  }, [orders, calendarHeatmapDays]);

  const kpiPayrollDisbursed = useMemo(() => {
    return calculateTotalPayrollDisbursed(salaryRecords);
  }, [salaryRecords]);

  const kpiOperatorEfficiency = useMemo(() => {
    return calculateAverageOperatorEfficiency(orders, attendance, employees);
  }, [orders, attendance, employees]);

  const kpiMachineUtilization = useMemo(() => {
    return calculateMachineUtilizationRate(equipment);
  }, [equipment]);

  const activeJobsCount = orders.filter((o) => o.stage !== 'Completed').length;
  const totalMetersInQueue = orders.reduce((sum, o) => sum + (o.stage !== 'Completed' ? o.metersRequired : 0), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Welcome with Quick Actions */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 shadow-sm border border-slate-800 relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Plant Live Status: All Systems Operational
              </span>
              <span className="text-xs text-slate-400">| Date: August 27, 2026</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Sublimation Production, Artist & Operator Floor Overview
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl mt-1">
              Real-time attendance tracking, labor hours, overtime calculations, equipment allocation, and payroll accrual.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="dashboard-btn-punch"
              onClick={onOpenQuickPunch}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Clock className="w-4 h-4" />
              <span>Punch Timecard</span>
            </button>
            <button
              id="dashboard-btn-payroll"
              onClick={() => onNavigateTab('salary')}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <DollarSign className="w-4 h-4" />
              <span>View Payroll</span>
            </button>
          </div>
        </div>
      </div>

      {/* Key Performance Indicators (KPI) Aggregate Row */}
      <div id="key-performance-indicators-row" className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-indigo-100 text-indigo-700">
              <BarChart3 className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Key Performance Indicators
            </h3>
            <span className="text-[11px] font-medium text-slate-400">
              • Plant-Wide Production & Operational Benchmarks
            </span>
          </div>
          <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
            Aug 2026 Cycle
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: Total Monthly Units Produced */}
          <div
            id="kpi-card-monthly-units"
            onClick={() => onNavigateTab('production')}
            className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-blue-300 shadow-2xs hover:shadow-xs cursor-pointer group transition-all relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Monthly Units Produced
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                <Package className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                {kpiMonthlyUnits.totalUnits.toLocaleString()}
              </span>
              <span className="text-xs text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                pcs
              </span>
            </div>

            {/* Target Progress Bar */}
            <div className="mt-2.5">
              <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                <span>Monthly Target: {kpiMonthlyUnits.monthlyTarget.toLocaleString()} pcs</span>
                <span className="font-bold text-slate-700">{kpiMonthlyUnits.achievementRate}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, kpiMonthlyUnits.achievementRate)}%` }}
                ></div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-slate-100">
              <span className="text-slate-600 font-medium flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                Avg: <strong className="text-slate-800 font-mono">{kpiMonthlyUnits.avgDailyUnits}</strong> pcs/day
              </span>
              <span className="text-slate-400 group-hover:text-blue-600 transition-colors font-medium">
                Production →
              </span>
            </div>
          </div>

          {/* KPI 2: Total Payroll Disbursed */}
          <div
            id="kpi-card-payroll-disbursed"
            onClick={() => onNavigateTab('salary')}
            className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-emerald-300 shadow-2xs hover:shadow-xs cursor-pointer group transition-all relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Payroll Disbursed
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                {formatCurrency(kpiPayrollDisbursed.totalNet, settings.currencySymbol)}
              </span>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                Net Pay
              </span>
            </div>

            {/* Sub-breakdown: Gross & Overtime */}
            <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
              <span>Gross: <strong className="text-slate-700 font-mono">{formatCurrency(kpiPayrollDisbursed.totalGross, settings.currencySymbol)}</strong></span>
              <span>OT: <strong className="text-indigo-600 font-mono">{formatCurrency(kpiPayrollDisbursed.totalOvertime, settings.currencySymbol)}</strong></span>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-slate-100">
              <span className="text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                {salaryRecords.length} Staff Slips Computed
              </span>
              <span className="text-slate-400 group-hover:text-emerald-600 transition-colors font-medium">
                Payroll →
              </span>
            </div>
          </div>

          {/* KPI 3: Average Operator Efficiency */}
          <div
            id="kpi-card-operator-efficiency"
            onClick={() => onNavigateTab('attendance')}
            className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-purple-300 shadow-2xs hover:shadow-xs cursor-pointer group transition-all relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Average Operator Efficiency
              </span>
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                <Activity className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                {kpiOperatorEfficiency.efficiencyUnitsPerHr}
              </span>
              <span className="text-xs text-purple-600 font-bold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">
                pcs / labor hr
              </span>
            </div>

            {/* Benchmark vs Target */}
            <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                Target: <strong>{kpiOperatorEfficiency.benchmarkTarget} pcs/hr</strong>
              </span>
              <span className="text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                {kpiOperatorEfficiency.deltaPercentage >= 0 ? `+${kpiOperatorEfficiency.deltaPercentage}%` : `${kpiOperatorEfficiency.deltaPercentage}%`}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-slate-100">
              <span className="text-slate-600 font-medium flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-purple-500" />
                Yield: <strong className="text-purple-700 font-mono">{kpiOperatorEfficiency.efficiencyMetersPerHr}</strong> m/hr
              </span>
              <span className="text-slate-400 group-hover:text-purple-600 transition-colors font-medium">
                Timecards →
              </span>
            </div>
          </div>

          {/* KPI 4: Machine Utilization Rate */}
          <div
            id="kpi-card-machine-utilization"
            onClick={() => onNavigateTab('production')}
            className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-amber-300 shadow-2xs hover:shadow-xs cursor-pointer group transition-all relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Machine Utilization Rate
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                <Cpu className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                {kpiMachineUtilization.utilizationRate}%
              </span>
              <span className="text-[10px] text-amber-800 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 uppercase">
                {kpiMachineUtilization.capacityStatus}
              </span>
            </div>

            {/* Active Running vs Fleet */}
            <div className="mt-2.5">
              <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                <span>Fleet: {kpiMachineUtilization.activeCount}/{kpiMachineUtilization.totalCount} Active</span>
                <span className="text-slate-600 font-medium">Avg Temp: {kpiMachineUtilization.avgTemperature}°C</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, kpiMachineUtilization.utilizationRate)}%` }}
                ></div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-slate-100">
              <span className="text-amber-700 font-medium flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-amber-500" />
                {kpiMachineUtilization.totalSpeedMph} m/hr combined
              </span>
              <span className="text-slate-400 group-hover:text-amber-600 transition-colors font-medium">
                Fleet →
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Operational Floor Quick Status Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Graphic Artists Card */}
        <div 
          onClick={() => onNavigateTab('employees')}
          className="dashboard-card-interactive bg-white p-5 rounded-2xl border border-slate-200 hover:border-purple-300 shadow-2xs hover:shadow-xs cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Graphic Artists
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
              <Palette className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{activeArtists.length}</span>
            <span className="text-xs text-slate-500 font-medium">of 3 Clocked In Today</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-slate-100">
            <span className="text-purple-600 font-medium flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> 18 Design Jobs Completed
            </span>
            <span className="text-slate-400 group-hover:text-purple-600 transition-colors">Manage →</span>
          </div>
        </div>

        {/* Machine Operators Card */}
        <div 
          onClick={() => onNavigateTab('employees')}
          className="dashboard-card-interactive bg-white p-5 rounded-2xl border border-slate-200 hover:border-blue-300 shadow-2xs hover:shadow-xs cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Machine Operators
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
              <Printer className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{activeOperators.length}</span>
            <span className="text-xs text-slate-500 font-medium">of 3 Techs Active</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-slate-100">
            <span className="text-blue-600 font-medium flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" /> 3 Presses / Printers Running
            </span>
            <span className="text-slate-400 group-hover:text-blue-600 transition-colors">View →</span>
          </div>
        </div>

        {/* Today's Attendance Rate */}
        <div 
          onClick={() => onNavigateTab('attendance')}
          className="dashboard-card-interactive bg-white p-5 rounded-2xl border border-slate-200 hover:border-emerald-300 shadow-2xs hover:shadow-xs cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Floor Attendance
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{attendanceRate}%</span>
            <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded">
              {todayAttendance.length}/{totalEmployeesCount} Present
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-slate-100">
            <span className="text-slate-600 font-medium">
              4 on Overtime • 1 Tardy
            </span>
            <span className="text-slate-400 group-hover:text-emerald-600 transition-colors">Logs →</span>
          </div>
        </div>

        {/* Current Period Salary / Payroll */}
        <div 
          onClick={() => onNavigateTab('salary')}
          className="dashboard-card-interactive bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-300 shadow-2xs hover:shadow-xs cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Period Net Payroll
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {formatCurrency(totalPayrollPeriod, settings.currencySymbol)}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-slate-100">
            <span className="text-indigo-600 font-medium">
              OT: {formatCurrency(totalOvertimePaid, settings.currencySymbol)} included
            </span>
            <span className="text-slate-400 group-hover:text-indigo-600 transition-colors">Payslips →</span>
          </div>
        </div>
      </div>

      {/* Monthly Analytics Section: Line Chart of Daily Production Units & Total Attendance Hours */}
      <div id="monthly-analytics-section" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 mb-4 border-b border-slate-100 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-indigo-600" />
                Monthly Analytics • August 2026
              </span>
              <span className="text-[11px] font-medium text-slate-400">
                ({monthlyMetricsSummary.daysCount} Days Tracked)
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Daily Production Units & Plant Attendance Hours
            </h3>
            <p className="text-xs text-slate-500">
              Interactive dual-axis line chart tracking manufactured garments/jerseys against cumulative employee labor shift hours
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
            {/* View Mode Series Filter */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-medium">
              <button
                id="btn-metric-both"
                onClick={() => setMonthlyMetricView('both')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  monthlyMetricView === 'both'
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Both Series
              </button>
              <button
                id="btn-metric-units"
                onClick={() => setMonthlyMetricView('units')}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                  monthlyMetricView === 'units'
                    ? 'bg-white text-blue-700 font-bold shadow-xs'
                    : 'text-slate-500 hover:text-blue-700'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                Units (pcs)
              </button>
              <button
                id="btn-metric-hours"
                onClick={() => setMonthlyMetricView('hours')}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                  monthlyMetricView === 'hours'
                    ? 'bg-white text-purple-700 font-bold shadow-xs'
                    : 'text-slate-500 hover:text-purple-700'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                Hours (hrs)
              </button>
            </div>

            {/* Date Range Selector */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-medium">
              <button
                id="btn-range-mtd"
                onClick={() => setMonthlyDateRange('month_to_date')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  monthlyDateRange === 'month_to_date'
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Month-to-Date (1–27)
              </button>
              <button
                id="btn-range-full"
                onClick={() => setMonthlyDateRange('full_month')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  monthlyDateRange === 'full_month'
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Full Month (1–31)
              </button>
            </div>
          </div>
        </div>

        {/* 4 Monthly KPI Summary Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100/80">
            <div className="flex items-center justify-between text-slate-500 text-[11px] mb-1">
              <span className="font-medium">Total Production Units</span>
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            </div>
            <div className="text-lg font-bold text-blue-900">
              {monthlyMetricsSummary.totalUnits.toLocaleString()} <span className="text-xs font-medium text-blue-600">pcs</span>
            </div>
            <div className="text-[11px] text-blue-700/80 mt-0.5">
              Peak: {monthlyMetricsSummary.peakDay}
            </div>
          </div>

          <div className="p-3.5 bg-purple-50/60 rounded-xl border border-purple-100/80">
            <div className="flex items-center justify-between text-slate-500 text-[11px] mb-1">
              <span className="font-medium">Total Attendance Hours</span>
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            </div>
            <div className="text-lg font-bold text-purple-900">
              {monthlyMetricsSummary.totalHours.toLocaleString()} <span className="text-xs font-medium text-purple-600">hrs</span>
            </div>
            <div className="text-[11px] text-purple-700/80 mt-0.5">
              Avg {monthlyMetricsSummary.avgHoursPerDay} hrs logged / day
            </div>
          </div>

          <div className="p-3.5 bg-cyan-50/60 rounded-xl border border-cyan-100/80">
            <div className="flex items-center justify-between text-slate-500 text-[11px] mb-1">
              <span className="font-medium">Daily Avg Output</span>
              <TrendingUp className="w-3.5 h-3.5 text-cyan-600" />
            </div>
            <div className="text-lg font-bold text-cyan-900">
              {monthlyMetricsSummary.avgUnitsPerDay.toLocaleString()} <span className="text-xs font-medium text-cyan-600">pcs/day</span>
            </div>
            <div className="text-[11px] text-cyan-700/80 mt-0.5">
              Target: 350+ pcs/day
            </div>
          </div>

          <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-100/80">
            <div className="flex items-center justify-between text-slate-500 text-[11px] mb-1">
              <span className="font-medium">Plant Labor Efficiency</span>
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-lg font-bold text-emerald-900">
              {monthlyMetricsSummary.overallEfficiency} <span className="text-xs font-medium text-emerald-600">pcs/hr</span>
            </div>
            <div className="text-[11px] text-emerald-700/80 mt-0.5">
              Units produced per logged labor hr
            </div>
          </div>
        </div>

        {/* Recharts Line Chart */}
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={monthlyAnalyticsData}
              margin={{ top: 10, right: 15, left: -10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="dayLabel"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                interval={monthlyDateRange === 'full_month' ? 2 : 1}
              />
              {/* Left Y-Axis for Production Units */}
              {(monthlyMetricView === 'both' || monthlyMetricView === 'units') && (
                <YAxis
                  yAxisId="left"
                  stroke="#0284c7"
                  fontSize={11}
                  tickLine={false}
                  unit=" pcs"
                  domain={[0, 'auto']}
                />
              )}
              {/* Right Y-Axis for Attendance Hours */}
              {(monthlyMetricView === 'both' || monthlyMetricView === 'hours') && (
                <YAxis
                  yAxisId="right"
                  orientation={monthlyMetricView === 'both' ? 'right' : 'left'}
                  stroke="#8b5cf6"
                  fontSize={11}
                  tickLine={false}
                  unit=" h"
                  domain={[0, 'auto']}
                />
              )}
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const dataItem = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg border border-slate-800 text-xs min-w-[210px]">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
                          <span className="font-bold text-slate-200">
                            {dataItem.date} ({label})
                          </span>
                          {dataItem.isToday && (
                            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] px-1.5 py-0.2 rounded font-semibold">
                              Today
                            </span>
                          )}
                          {dataItem.isWeekend && !dataItem.isToday && (
                            <span className="bg-slate-800 text-slate-400 text-[10px] px-1.5 py-0.2 rounded">
                              Weekend
                            </span>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-blue-300">
                              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                              Production Units:
                            </span>
                            <span className="font-bold text-white font-mono">
                              {dataItem.productionUnits.toLocaleString()} pcs
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-purple-300">
                              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                              Attendance Hours:
                            </span>
                            <span className="font-bold text-white font-mono">
                              {dataItem.attendanceHours} hrs
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px]">
                            <span className="text-slate-400">Yield Efficiency:</span>
                            <span className="font-semibold text-emerald-400 font-mono">
                              {dataItem.efficiency} pcs / labor hr
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ fontSize: '11px', paddingBottom: '12px' }}
              />

              {/* Line 1: Daily Production Units */}
              {(monthlyMetricView === 'both' || monthlyMetricView === 'units') && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="productionUnits"
                  name="Total Daily Production Units (pcs)"
                  stroke="#0284c7"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#0284c7', stroke: '#ffffff', strokeWidth: 1.5 }}
                  activeDot={{ r: 6, fill: '#38bdf8', stroke: '#0284c7', strokeWidth: 2 }}
                />
              )}

              {/* Line 2: Total Attendance Hours */}
              {(monthlyMetricView === 'both' || monthlyMetricView === 'hours') && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="attendanceHours"
                  name="Total Daily Attendance Hours (hrs)"
                  stroke="#8b5cf6"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#8b5cf6', stroke: '#ffffff', strokeWidth: 1.5 }}
                  activeDot={{ r: 6, fill: '#c084fc', stroke: '#8b5cf6', strokeWidth: 2 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Footer info & correlation insight */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>
              <strong>Correlation Insight:</strong> Peak production volumes align with operator overtime windows (Aug 12, 19, 26).
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span>Left Axis: Production Units (pcs)</span>
            <span>•</span>
            <span>Right Axis: Attendance Hours (hrs)</span>
          </div>
        </div>
      </div>

      {/* Production Activity Calendar Widget with Heatmap & Attendance Scale */}
      <div id="production-activity-calendar-widget" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        {/* Heatmap Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 mb-5 border-b border-slate-100 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-600" />
                Production Activity Calendar • August 2026
              </span>
              <span className="text-[11px] font-medium text-slate-400">
                Peak Output: <strong className="text-slate-700">{heatmapStats.maxDay.dayOfWeekShort}, Aug {heatmapStats.maxDay.dayNum} ({heatmapStats.maxDay.units} pcs)</strong>
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-amber-600" />
              Production Activity Calendar & Attendance Heatmap
            </h3>
            <p className="text-xs text-slate-500">
              Interactive 31-day activity heatmap tracking high production volume batches alongside plant attendance counts with dynamic color scale
            </p>
          </div>

          {/* Color Scale Mode Selector & Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            {/* Heatmap Metric Mode: Combined, Volume, Attendance */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-medium">
              <button
                id="heatmap-mode-combined"
                onClick={() => setHeatmapMetricMode('combined')}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                  heatmapMetricMode === 'combined'
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Color-code by Production Volume with Attendance Counter"
              >
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                Combined
              </button>
              <button
                id="heatmap-mode-volume"
                onClick={() => setHeatmapMetricMode('volume')}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                  heatmapMetricMode === 'volume'
                    ? 'bg-white text-blue-800 font-bold shadow-xs'
                    : 'text-slate-500 hover:text-blue-700'
                }`}
                title="Color-code by Manufactured Garments / Jersey Units"
              >
                <Zap className="w-3.5 h-3.5 text-blue-500" />
                Volume (pcs)
              </button>
              <button
                id="heatmap-mode-attendance"
                onClick={() => setHeatmapMetricMode('attendance')}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                  heatmapMetricMode === 'attendance'
                    ? 'bg-white text-emerald-800 font-bold shadow-xs'
                    : 'text-slate-500 hover:text-emerald-700'
                }`}
                title="Color-code by Plant Staff Headcount & Shift Attendance"
              >
                <Users className="w-3.5 h-3.5 text-emerald-500" />
                Attendance Count
              </button>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
              <button
                id="heatmap-filter-all"
                onClick={() => setHeatmapFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  heatmapFilter === 'all'
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                All (31)
              </button>
              <button
                id="heatmap-filter-peak"
                onClick={() => setHeatmapFilter('peak')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  heatmapFilter === 'peak'
                    ? 'bg-white text-amber-800 font-bold shadow-xs'
                    : 'text-slate-500 hover:text-amber-700'
                }`}
              >
                <Flame className="w-3 h-3 text-amber-500" />
                Peak (550+)
              </button>
              <button
                id="heatmap-filter-high"
                onClick={() => setHeatmapFilter('high')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  heatmapFilter === 'high'
                    ? 'bg-white text-blue-800 font-bold shadow-xs'
                    : 'text-slate-500 hover:text-blue-700'
                }`}
              >
                High (460+)
              </button>
              <button
                id="heatmap-filter-weekdays"
                onClick={() => setHeatmapFilter('weekdays')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  heatmapFilter === 'weekdays'
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Weekdays
              </button>
            </div>
          </div>
        </div>

        {/* Main Heatmap Grid & Inspector Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left / Center 2 Cols: The 7x6 Calendar Heatmap Grid */}
          <div className="xl:col-span-2 flex flex-col justify-between">
            {/* Weekday Column Headers */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2 text-center text-xs font-semibold text-slate-500">
              <span className="text-slate-400 py-1">Sun</span>
              <span className="py-1">Mon</span>
              <span className="py-1">Tue</span>
              <span className="py-1">Wed</span>
              <span className="py-1">Thu</span>
              <span className="py-1">Fri</span>
              <span className="text-slate-400 py-1">Sat</span>
            </div>

            {/* 42 Calendar Slots (August 2026: 6 blanks before Aug 1, 31 days, 5 blanks after) */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {/* 6 Leading Empty Slots for July 26 - 31 */}
              {[26, 27, 28, 29, 30, 31].map((prevDay) => (
                <div
                  key={`prev-${prevDay}`}
                  className="aspect-4/3 sm:aspect-auto sm:h-20 p-1.5 rounded-xl border border-dashed border-slate-100 bg-slate-50/30 text-slate-300 flex flex-col justify-between select-none"
                >
                  <span className="text-[10px] font-mono opacity-50">{prevDay}</span>
                  <span className="text-[9px] text-slate-300/60 hidden sm:block">Jul</span>
                </div>
              ))}

              {/* 31 August Days */}
              {calendarHeatmapDays.map((day) => {
                const isSelected = selectedHeatmapDay === day.dayNum;
                const isHovered = heatmapHoveredDay === day.dayNum;
                
                // Dimming logic based on active filter
                const matchesFilter =
                  heatmapFilter === 'all' ||
                  (heatmapFilter === 'peak' && day.isPeak) ||
                  (heatmapFilter === 'high' && day.isHigh) ||
                  (heatmapFilter === 'weekdays' && !day.isWeekend);

                return (
                  <div
                    key={day.dateStr}
                    id={`heatmap-day-${day.dayNum}`}
                    onClick={() => setSelectedHeatmapDay(day.dayNum)}
                    onMouseEnter={() => setHeatmapHoveredDay(day.dayNum)}
                    onMouseLeave={() => setHeatmapHoveredDay(null)}
                    className={`aspect-4/3 sm:aspect-auto sm:h-20 p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between group ${
                      day.intensity.bgClass
                    } ${day.intensity.borderClass} ${
                      !matchesFilter ? 'opacity-25 grayscale-[40%]' : 'opacity-100'
                    } ${
                      isSelected
                        ? 'ring-3 ring-indigo-600 ring-offset-2 scale-[1.03] z-10 shadow-md'
                        : 'hover:scale-[1.02] hover:shadow-sm'
                    }`}
                  >
                    {/* Top Row in Cell: Day number & Attendance Badge / Indicators */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-mono font-bold ${
                          day.intensity.level >= 3 ? 'text-white' : 'text-slate-800'
                        }`}
                      >
                        {day.dayNum}
                      </span>

                      {/* Attendance Count Badge or Indicators */}
                      <div className="flex items-center gap-1">
                        {/* Attendance Headcount Pill */}
                        <span
                          title={`${day.attendanceCount} staff logged attendance`}
                          className={`text-[9px] px-1 py-0.2 rounded font-mono font-semibold flex items-center gap-0.5 ${
                            day.intensity.level >= 3
                              ? 'bg-black/25 text-white/90'
                              : 'bg-white/80 text-slate-700 border border-slate-200'
                          }`}
                        >
                          <Users className="w-2.5 h-2.5 opacity-80" />
                          <span>{day.attendanceCount}</span>
                        </span>

                        {day.isToday && (
                          <span
                            title="Current Date: Aug 27, 2026"
                            className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-white animate-pulse"
                          />
                        )}
                        {day.isPeak && (
                          <Flame
                            className={`w-3 h-3 ${
                              day.intensity.level >= 3 ? 'text-amber-300' : 'text-amber-600'
                            }`}
                          />
                        )}
                      </div>
                    </div>

                    {/* Bottom Row in Cell: Output Units & Yield */}
                    <div className="text-right">
                      <span
                        className={`text-[10px] sm:text-[11px] font-mono leading-none block ${
                          day.intensity.level >= 3 ? 'text-white/95 font-bold' : 'text-slate-700 font-semibold'
                        }`}
                      >
                        {day.units}
                        <span className="hidden sm:inline text-[9px] font-normal opacity-80"> pcs</span>
                      </span>
                    </div>

                    {/* Hover Floating Tooltip Preview */}
                    {isHovered && (
                      <div className="hidden sm:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 p-3 bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700 z-30 pointer-events-none text-left animate-in fade-in zoom-in-95 duration-100">
                        <div className="flex items-center justify-between text-[11px] font-bold pb-1.5 border-b border-slate-700 mb-2">
                          <span className="text-slate-200">{day.dayOfWeekFull}, Aug {day.dayNum}</span>
                          <div className="flex items-center gap-1">
                            {day.isToday && <span className="px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-300 text-[10px]">Today</span>}
                            {day.isPeak && <span className="px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-300 text-[10px]">Peak Day</span>}
                          </div>
                        </div>
                        <div className="space-y-1.5 text-[11px]">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 flex items-center gap-1">
                              <Zap className="w-3 h-3 text-sky-400" />
                              Production Output:
                            </span>
                            <span className="font-bold text-white font-mono">{day.units} pcs</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 flex items-center gap-1">
                              <Users className="w-3 h-3 text-emerald-400" />
                              Attendance Count:
                            </span>
                            <span className="font-bold text-emerald-300 font-mono">{day.attendanceCount} staff ({day.hours} hrs)</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 flex items-center gap-1">
                              <Activity className="w-3 h-3 text-purple-400" />
                              Hourly Yield:
                            </span>
                            <span className="font-bold text-purple-300 font-mono">{day.efficiency} pcs/labor hr</span>
                          </div>
                          <div className="pt-1.5 border-t border-slate-800 text-[10px] text-slate-300 line-clamp-2">
                            {day.job}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* 5 Trailing Empty Slots for Sept 1 - 5 */}
              {[1, 2, 3, 4, 5].map((nextDay) => (
                <div
                  key={`next-${nextDay}`}
                  className="aspect-4/3 sm:aspect-auto sm:h-20 p-1.5 rounded-xl border border-dashed border-slate-100 bg-slate-50/30 text-slate-300 flex flex-col justify-between select-none"
                >
                  <span className="text-[10px] font-mono opacity-50">{nextDay}</span>
                  <span className="text-[9px] text-slate-300/60 hidden sm:block">Sep</span>
                </div>
              ))}
            </div>

            {/* Heatmap Color Scale Intensity Legend */}
            <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-slate-400" />
                {heatmapMetricMode === 'attendance' ? 'Attendance Headcount Scale:' : 'Production Volume Scale:'}
              </span>

              {heatmapMetricMode === 'attendance' ? (
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <div className="flex items-center gap-1">
                    <span className="w-3.5 h-3.5 rounded bg-emerald-50 border border-emerald-200"></span>
                    <span className="text-[11px] text-slate-500">1–2 staff</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3.5 h-3.5 rounded bg-emerald-100 border border-emerald-300"></span>
                    <span className="text-[11px] text-slate-500">3–4 staff</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3.5 h-3.5 rounded bg-teal-300 border border-teal-400"></span>
                    <span className="text-[11px] text-slate-500">5–6 staff</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3.5 h-3.5 rounded bg-teal-600 border border-teal-700"></span>
                    <span className="text-[11px] text-slate-500">7 staff</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3.5 h-3.5 rounded bg-teal-700 border border-teal-800"></span>
                    <span className="text-[11px] text-slate-600 font-semibold">8 (100%)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3.5 h-3.5 rounded bg-emerald-800 border border-emerald-950 ring-1 ring-amber-300"></span>
                    <span className="text-[11px] font-bold text-emerald-900">9+ Surge</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <div className="flex items-center gap-1">
                    <span className="w-3.5 h-3.5 rounded bg-slate-100 border border-slate-200"></span>
                    <span className="text-[11px] text-slate-500">&lt;150 (Rest)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3.5 h-3.5 rounded bg-sky-100 border border-sky-200"></span>
                    <span className="text-[11px] text-slate-500">150–379</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3.5 h-3.5 rounded bg-sky-300 border border-sky-400"></span>
                    <span className="text-[11px] text-slate-500">380–459</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3.5 h-3.5 rounded bg-blue-500 border border-blue-600"></span>
                    <span className="text-[11px] text-slate-500">460–539</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3.5 h-3.5 rounded bg-blue-700 border border-blue-800"></span>
                    <span className="text-[11px] text-slate-500">540–579</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3.5 h-3.5 rounded bg-indigo-700 border border-indigo-900 ring-1 ring-amber-300"></span>
                    <span className="text-[11px] font-bold text-indigo-900">580+ Peak</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Selected Day Inspector & Monthly Highlights */}
          <div className="flex flex-col gap-4">
            {/* Active Day Detail Inspector Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-sm flex flex-col justify-between flex-1">
              <div>
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-700/80">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Day Activity Inspector
                    </span>
                    <h4 className="text-base font-bold text-white flex items-center gap-1.5 mt-0.5">
                      {selectedDayInfo.dayOfWeekFull}, August {selectedDayInfo.dayNum}
                    </h4>
                  </div>

                  <span
                    className={`text-[10px] px-2.5 py-1 rounded-full font-bold border ${
                      selectedDayInfo.isToday
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : selectedDayInfo.isPeak
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {selectedDayInfo.isToday
                      ? '⚡ Current Date'
                      : selectedDayInfo.isPeak
                      ? '🔥 Peak Milestone'
                      : selectedDayInfo.isWeekend
                      ? '☕ Weekend Rest'
                      : '✅ Standard Shift'}
                  </span>
                </div>

                {/* 3 Metric Display Tiles */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="p-2.5 bg-white/5 rounded-xl border border-white/10">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Production</span>
                    <div className="text-lg sm:text-xl font-extrabold text-white font-mono">
                      {selectedDayInfo.units}{' '}
                      <span className="text-[10px] font-normal text-blue-300">pcs</span>
                    </div>
                    <div className="text-[9px] text-slate-400 mt-0.5">
                      {Math.round((selectedDayInfo.units / 600) * 100)}% cap
                    </div>
                  </div>

                  <div className="p-2.5 bg-white/5 rounded-xl border border-white/10">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Staff Count</span>
                    <div className="text-lg sm:text-xl font-extrabold text-emerald-300 font-mono">
                      {selectedDayInfo.attendanceCount}{' '}
                      <span className="text-[10px] font-normal text-emerald-200">staff</span>
                    </div>
                    <div className="text-[9px] text-slate-400 mt-0.5">
                      {selectedDayInfo.presentCount} on-time
                    </div>
                  </div>

                  <div className="p-2.5 bg-white/5 rounded-xl border border-white/10">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Labor Hours</span>
                    <div className="text-lg sm:text-xl font-extrabold text-purple-300 font-mono">
                      {selectedDayInfo.hours}{' '}
                      <span className="text-[10px] font-normal text-purple-200">hrs</span>
                    </div>
                    <div className="text-[9px] text-slate-400 mt-0.5">
                      {selectedDayInfo.efficiency} pcs/hr
                    </div>
                  </div>
                </div>

                {/* Progress bar to max capacity */}
                <div className="mb-4">
                  <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                    <span>Manufacturing & Attendance Intensity</span>
                    <span className="font-semibold text-white">
                      Level {selectedDayInfo.intensity.level} / 5 ({selectedDayInfo.intensity.label.split('(')[0].trim()})
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (selectedDayInfo.units / 600) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Job / Order Run Note */}
                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-xs">
                  <span className="text-slate-400 block text-[10px] font-semibold uppercase mb-1">
                    Primary Production Run & Order Batch
                  </span>
                  <p className="text-slate-200 font-medium leading-relaxed">
                    {selectedDayInfo.job}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-3 mt-4 border-t border-slate-700/80 flex items-center justify-between text-xs">
                <button
                  onClick={() => onNavigateTab('production')}
                  className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  Inspect Print Queue <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onNavigateTab('attendance')}
                  className="text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  Timecard Logs <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Monthly Benchmark Strip */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Trophy className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">All-Time Peak Record</span>
                  <strong className="text-slate-900 font-bold">
                    Aug {heatmapStats.maxDay.dayNum} ({heatmapStats.maxDay.units} Units)
                  </strong>
                </div>
              </div>

              <div className="text-right">
                <span className="text-slate-500 block text-[11px]">Weekday Average</span>
                <strong className="text-blue-700 font-bold font-mono">
                  {heatmapStats.avgWeekdayUnits} pcs/day
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section: BAR CHART & DONUT CHART (User requirement) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart (2 Cols on Large) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-100 gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-600" />
                Weekly Sublimation Labor & Overtime Hours (Bar Chart)
              </h3>
              <p className="text-xs text-slate-500">
                Graphic Artists vs Sublimation Machine Operators work hours comparison
              </p>
            </div>

            {/* Toggle Bar Chart View */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-medium self-start sm:self-auto">
              <button
                onClick={() => setBarChartMode('hours')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  barChartMode === 'hours'
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Department Hours
              </button>
              <button
                onClick={() => setBarChartMode('production')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  barChartMode === 'production'
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Output (Meters)
              </button>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {barChartMode === 'hours' ? (
                <BarChart data={weeklyHoursData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} unit="h" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '12px',
                      border: 'none',
                      color: '#fff',
                      fontSize: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
                  />
                  <Bar dataKey="artistHours" name="Artists Reg Hours" fill="#8b5cf6" radius={[4, 4, 0, 0]} stackId="artist" />
                  <Bar dataKey="artistOT" name="Artists OT Hours" fill="#c084fc" radius={[4, 4, 0, 0]} stackId="artist" />
                  <Bar dataKey="operatorHours" name="Operators Reg Hours" fill="#3b82f6" radius={[4, 4, 0, 0]} stackId="op" />
                  <Bar dataKey="operatorOT" name="Operators OT Hours" fill="#60a5fa" radius={[4, 4, 0, 0]} stackId="op" />
                </BarChart>
              ) : (
                <BarChart data={weeklyHoursData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} unit="m" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '12px',
                      border: 'none',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }} />
                  <Bar dataKey="totalMeters" name="Total Sublimation Printed (Meters)" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100 text-xs">
            <div className="p-2.5 bg-purple-50/70 rounded-xl border border-purple-100">
              <span className="text-slate-500 block text-[11px]">Total Artist Hours</span>
              <span className="font-bold text-purple-700 text-sm">129.6 Hours</span>
            </div>
            <div className="p-2.5 bg-blue-50/70 rounded-xl border border-blue-100">
              <span className="text-slate-500 block text-[11px]">Total Operator Hours</span>
              <span className="font-bold text-blue-700 text-sm">144.0 Hours</span>
            </div>
            <div className="p-2.5 bg-cyan-50/70 rounded-xl border border-cyan-100">
              <span className="text-slate-500 block text-[11px]">Sublimation Output</span>
              <span className="font-bold text-cyan-700 text-sm">2,360 Meters</span>
            </div>
            <div className="p-2.5 bg-emerald-50/70 rounded-xl border border-emerald-100">
              <span className="text-slate-500 block text-[11px]">Overtime Payout</span>
              <span className="font-bold text-emerald-700 text-sm">
                {formatCurrency(totalOvertimePaid, settings.currencySymbol)}
              </span>
            </div>
          </div>
        </div>

        {/* Donut Chart (1 Col on Large) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-purple-600" />
                  {donutMode === 'salary' ? 'Salary by Role' : 'Attendance Status'} (Donut)
                </h3>
                <p className="text-xs text-slate-500">Distribution analysis</p>
              </div>

              {/* Mode Toggle */}
              <div className="flex bg-slate-100 p-0.5 rounded-lg text-[11px] font-medium">
                <button
                  onClick={() => setDonutMode('salary')}
                  className={`px-2 py-0.5 rounded-md ${
                    donutMode === 'salary' ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  Salary
                </button>
                <button
                  onClick={() => setDonutMode('attendance')}
                  className={`px-2 py-0.5 rounded-md ${
                    donutMode === 'attendance' ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  Status
                </button>
              </div>
            </div>

            {/* Donut Chart */}
            <div className="h-52 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutMode === 'salary' ? roleSalaryDistribution : attendanceStatusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {(donutMode === 'salary' ? roleSalaryDistribution : attendanceStatusDistribution).map(
                      (entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      )
                    )}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) =>
                      donutMode === 'salary'
                        ? [formatCurrency(Number(value), settings.currencySymbol), 'Total Paid']
                        : [`${value} Staff`, 'Count']
                    }
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '10px',
                      border: 'none',
                      color: '#fff',
                      fontSize: '11px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Center Donut Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs text-slate-400 font-medium">
                  {donutMode === 'salary' ? 'Net Payout' : 'Total Staff'}
                </span>
                <span className="text-sm font-bold text-slate-900">
                  {donutMode === 'salary'
                    ? formatCurrency(totalPayrollPeriod, settings.currencySymbol)
                    : `${employees.length} Staff`}
                </span>
              </div>
            </div>

            {/* Legend Breakdown */}
            <div className="space-y-1.5 mt-2">
              {(donutMode === 'salary' ? roleSalaryDistribution : attendanceStatusDistribution).map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-50">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-700 font-medium">{item.name}</span>
                  </div>
                  <span className="font-semibold text-slate-900">
                    {donutMode === 'salary'
                      ? formatCurrency(item.value, settings.currencySymbol)
                      : `${item.value} (${Math.round((item.value / employees.length) * 100)}%)`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 text-center">
            <button
              onClick={() => onNavigateTab(donutMode === 'salary' ? 'salary' : 'attendance')}
              className="text-xs text-cyan-600 hover:text-cyan-800 font-semibold inline-flex items-center gap-1"
            >
              Detailed {donutMode === 'salary' ? 'Payroll Sheets' : 'Attendance Logs'} <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Lower Section: Active Sublimation Equipment & Active Machine Operators */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Machinery Status */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Printer className="w-4 h-4 text-blue-600" />
                Sublimation Machinery & Active Operator Stations
              </h3>
              <p className="text-xs text-slate-500">Live floor equipment status and assigned personnel</p>
            </div>
            <button
              onClick={() => onNavigateTab('production')}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
            >
              View Print Queue →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {equipment.map((eq) => (
              <div
                key={eq.id}
                className="dashboard-card-interactive p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-blue-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-slate-900 truncate">{eq.name}</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        eq.status === 'in_use'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : eq.status === 'operational'
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {eq.status === 'in_use' ? '● Active' : eq.status === 'operational' ? 'Standby' : 'Maintenance'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-1 mb-2">{eq.model}</p>
                </div>

                <div className="space-y-1 text-[11px] pt-2 border-t border-slate-200/60">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Operator:</span>
                    <span className="font-semibold text-slate-900">{eq.currentOperatorName || 'Unassigned'}</span>
                  </div>
                  {eq.currentJob && (
                    <div className="flex items-center justify-between text-slate-600 truncate">
                      <span>Job:</span>
                      <span className="font-medium text-cyan-700 truncate max-w-[170px]">{eq.currentJob}</span>
                    </div>
                  )}
                  {eq.temperatureCelsius && (
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1 text-amber-700">
                        <Flame className="w-3 h-3 text-amber-500" /> Heat Transfer Temp:
                      </span>
                      <span className="font-bold text-amber-700">{eq.temperatureCelsius}°C</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Attendance Activity feed */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  Today's Timecard Punches
                </h3>
                <p className="text-xs text-slate-500">Live clock-in timestamps</p>
              </div>
              <button
                onClick={() => onNavigateTab('attendance')}
                className="text-xs text-emerald-600 hover:text-emerald-800 font-semibold"
              >
                All Logs →
              </button>
            </div>

            <div className="space-y-2.5 overflow-y-auto max-h-72 custom-scrollbar pr-1">
              {todayAttendance.map((att) => {
                const statusStyle = getStatusBadge(att.status);
                const roleBadge = getRoleBadgeColor(att.role);

                return (
                  <div
                    key={att.id}
                    className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-white transition-colors flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-900 truncate">{att.employeeName}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${roleBadge.bg} ${roleBadge.text}`}>
                          {att.role === 'artist' ? 'Artist' : att.role === 'machine_operator' ? 'Operator' : 'Finishing'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>In: <strong className="text-slate-800 font-mono">{att.clockIn}</strong></span>
                        {att.clockOut ? (
                          <span>Out: <strong className="text-slate-800 font-mono">{att.clockOut}</strong></span>
                        ) : (
                          <span className="text-emerald-600 font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span> On Duty
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${statusStyle.bg}`}>
                        {statusStyle.text}
                      </span>
                      {att.overtimeHours > 0 && (
                        <div className="text-[10px] text-indigo-600 font-bold mt-0.5">
                          +{att.overtimeHours}h OT
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <button
              onClick={onOpenQuickPunch}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Punch In / Out Staff Member</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
