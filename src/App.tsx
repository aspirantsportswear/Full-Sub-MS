import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { AttendanceView } from './components/AttendanceView';
import { SalaryView } from './components/SalaryView';
import { EmployeesView } from './components/EmployeesView';
import { ProductionView } from './components/ProductionView';
import { SettingsView } from './components/SettingsView';
import { PayslipModal } from './components/PayslipModal';
import { QuickPunchModal } from './components/QuickPunchModal';
import { SecurityHealthModal } from './components/SecurityHealthModal';
import {
  Employee,
  AttendanceRecord,
  SalaryRecord,
  ProductionOrder,
  SublimationEquipment,
  ShopSettings,
} from './types';
import {
  loadStoredData,
  saveStoredData,
  resetToInitialData,
  eraseAllDataHistory,
} from './utils/storage';
import { computeSalaryForPeriod } from './utils/calculations';

export default function App() {
  // Loaded State
  const [dataLoaded, setDataLoaded] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [equipment, setEquipment] = useState<SublimationEquipment[]>([]);
  const [settings, setSettings] = useState<ShopSettings>({
    shopName: 'Aspirant Sportswear',
    tagline: 'High-Definition Full Sublimation & Sportswear Manufacturing',
    currencySymbol: '₱',
    standardShiftStart: '08:00',
    standardShiftEnd: '17:00',
    lunchBreakMinutes: 60,
    gracePeriodMinutes: 15,
    overtimeMultiplier: 1.25,
    holidayOvertimeMultiplier: 1.50,
    artistDesignBonusPerJob: 15.00,
    operatorPressBonusPerMeter: 0.25,
  });

  // UI Navigation State
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [showQuickPunch, setShowQuickPunch] = useState<boolean>(false);
  const [showSecurityModal, setShowSecurityModal] = useState<boolean>(false);
  const [selectedPayslip, setSelectedPayslip] = useState<SalaryRecord | null>(null);

  // Initialize from LocalStorage
  useEffect(() => {
    const loaded = loadStoredData();
    setEmployees(loaded.employees);
    setAttendance(loaded.attendance);
    setSalaryRecords(loaded.salary);
    setOrders(loaded.orders);
    setEquipment(loaded.equipment);
    setSettings(loaded.settings);
    setDataLoaded(true);
  }, []);

  // Save changes to LocalStorage
  const handleUpdateEmployees = (newEmployees: Employee[]) => {
    setEmployees(newEmployees);
    saveStoredData('EMPLOYEES', newEmployees);
  };

  const handleUpdateAttendance = (newAttendance: AttendanceRecord[]) => {
    setAttendance(newAttendance);
    saveStoredData('ATTENDANCE', newAttendance);
  };

  const handleUpdateSalary = (newSalary: SalaryRecord[]) => {
    setSalaryRecords(newSalary);
    saveStoredData('SALARY', newSalary);
  };

  const handleUpdateOrders = (newOrders: ProductionOrder[]) => {
    setOrders(newOrders);
    saveStoredData('ORDERS', newOrders);
  };

  const handleUpdateEquipment = (newEquipment: SublimationEquipment[]) => {
    setEquipment(newEquipment);
    saveStoredData('EQUIPMENT', newEquipment);
  };

  const handleUpdateSettings = (newSettings: ShopSettings) => {
    setSettings(newSettings);
    saveStoredData('SETTINGS', newSettings);
  };

  // Automated Bug Fixer handler that synchronizes all state slices
  const handleDataRepaired = (repaired: {
    employees: Employee[];
    attendance: AttendanceRecord[];
    salary: SalaryRecord[];
    orders: ProductionOrder[];
    equipment: SublimationEquipment[];
    settings: ShopSettings;
  }) => {
    setEmployees(repaired.employees);
    setAttendance(repaired.attendance);
    setSalaryRecords(repaired.salary);
    setOrders(repaired.orders);
    setEquipment(repaired.equipment);
    setSettings(repaired.settings);

    saveStoredData('EMPLOYEES', repaired.employees);
    saveStoredData('ATTENDANCE', repaired.attendance);
    saveStoredData('SALARY', repaired.salary);
    saveStoredData('ORDERS', repaired.orders);
    saveStoredData('EQUIPMENT', repaired.equipment);
    saveStoredData('SETTINGS', repaired.settings);
  };

  // Reset to sample data
  const handleResetData = () => {
    resetToInitialData();
    const fresh = loadStoredData();
    setEmployees(fresh.employees);
    setAttendance(fresh.attendance);
    setSalaryRecords(fresh.salary);
    setOrders(fresh.orders);
    setEquipment(fresh.equipment);
    setSettings(fresh.settings);
  };

  // Erase all data history (salary, monthly units, total payroll, operator stats, attendance, orders)
  const handleEraseAllDataHistory = (options: { keepEmployees: boolean }) => {
    eraseAllDataHistory(options);
    const fresh = loadStoredData();
    setEmployees(fresh.employees);
    setAttendance(fresh.attendance);
    setSalaryRecords(fresh.salary);
    setOrders(fresh.orders);
    setEquipment(fresh.equipment);
    setSettings(fresh.settings);
  };

  // Handlers for Attendance
  const handleRecordAttendance = (record: AttendanceRecord) => {
    const updated = [record, ...attendance];
    handleUpdateAttendance(updated);
  };

  const handleEditAttendance = (record: AttendanceRecord) => {
    const updated = attendance.map((a) => (a.id === record.id ? record : a));
    handleUpdateAttendance(updated);
  };

  const handleDeleteAttendance = (recordId: string) => {
    const updated = attendance.filter((a) => a.id !== recordId);
    handleUpdateAttendance(updated);
  };

  const handleBulkImportAttendance = (
    importedRecords: AttendanceRecord[],
    strategy: 'upsert' | 'append' | 'replace_range' = 'upsert'
  ) => {
    let updated: AttendanceRecord[] = [];

    if (strategy === 'upsert') {
      const recordMap = new Map<string, AttendanceRecord>();
      attendance.forEach((rec) => {
        recordMap.set(`${rec.employeeId}_${rec.date}`, rec);
      });

      importedRecords.forEach((item) => {
        const key = `${item.employeeId}_${item.date}`;
        if (recordMap.has(key)) {
          const existing = recordMap.get(key)!;
          recordMap.set(key, { ...item, id: existing.id });
        } else {
          recordMap.set(key, item);
        }
      });

      updated = Array.from(recordMap.values());
    } else if (strategy === 'replace_range') {
      const importedDates = new Set(importedRecords.map((r) => r.date));
      const keptRecords = attendance.filter((r) => !importedDates.has(r.date));
      updated = [...importedRecords, ...keptRecords];
    } else {
      // 'append'
      updated = [...importedRecords, ...attendance];
    }

    // Sort newest date & clock-in time first
    updated.sort((a, b) => {
      const cmp = b.date.localeCompare(a.date);
      if (cmp !== 0) return cmp;
      return (b.clockIn || '').localeCompare(a.clockIn || '');
    });

    handleUpdateAttendance(updated);
  };

  // Handlers for Employees
  const handleAddEmployee = (emp: Employee) => {
    const updated = [...employees, emp];
    handleUpdateEmployees(updated);
  };

  const handleEditEmployee = (emp: Employee) => {
    const updated = employees.map((e) => (e.id === emp.id ? emp : e));
    handleUpdateEmployees(updated);
  };

  const handleDeleteEmployee = (empId: string) => {
    if (window.confirm('Are you sure you want to remove this staff member?')) {
      const updated = employees.filter((e) => e.id !== empId);
      handleUpdateEmployees(updated);
    }
  };

  // Handlers for Salary
  const handleUpdateSingleSalary = (record: SalaryRecord) => {
    const updated = salaryRecords.map((s) => (s.id === record.id ? record : s));
    handleUpdateSalary(updated);
  };

  const handleRecalculateAllPayroll = (periodStart: string, periodEnd: string) => {
    const recomputedList: SalaryRecord[] = employees.map((emp) => {
      const existing = salaryRecords.find((s) => s.employeeId === emp.id);
      const pieceUnits = existing?.pieceRateUnits || (emp.role === 'artist' ? 15 : 1200);
      const advance = existing?.deductions.cashAdvance || 0;
      const allowances = existing?.allowances || (emp.role === 'artist' ? 80 : 100);

      return computeSalaryForPeriod(
        emp,
        attendance,
        periodStart,
        periodEnd,
        pieceUnits,
        advance,
        allowances,
        settings
      );
    });

    handleUpdateSalary(recomputedList);
    alert(`Successfully synchronized payroll from attendance records for period ${periodStart} to ${periodEnd}!`);
  };

  // Handlers for Orders
  const handleAddOrder = (ord: ProductionOrder) => {
    const updated = [ord, ...orders];
    handleUpdateOrders(updated);
  };

  const handleEditOrder = (ord: ProductionOrder) => {
    const updated = orders.map((o) => (o.id === ord.id ? ord : o));
    handleUpdateOrders(updated);
  };

  // Active counts for Left Sidebar
  const activeCount = useMemo(() => {
    const todayStr = '2026-08-27';
    const todayAtt = attendance.filter((a) => a.date === todayStr);

    const artistIds = new Set(employees.filter((e) => e.role === 'artist').map((e) => e.id));
    const opIds = new Set(employees.filter((e) => e.role === 'machine_operator').map((e) => e.id));

    const artists = todayAtt.filter((a) => artistIds.has(a.employeeId)).length;
    const operators = todayAtt.filter((a) => opIds.has(a.employeeId)).length;
    const pendingPayroll = salaryRecords.filter((s) => s.paymentStatus !== 'paid').length;

    return {
      artists,
      operators,
      totalAttendance: todayAtt.length,
      pendingPayroll,
    };
  }, [attendance, employees, salaryRecords]);

  if (!dataLoaded) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-900 text-white font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold tracking-wide">Loading Aspirant Sportswear Hub...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 flex relative">
      {/* Mobile Drawer Overlay Backdrop */}
      {mobileSidebarOpen && (
        <div
          id="mobile-sidebar-backdrop"
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setCurrentTab(tab);
          setMobileSidebarOpen(false);
        }}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onToggleSidebar={() => {
          if (window.innerWidth < 768) {
            setMobileSidebarOpen((prev) => !prev);
          } else {
            setSidebarCollapsed((prev) => !prev);
          }
        }}
        activeCount={activeCount}
        onOpenQuickPunch={() => setShowQuickPunch(true)}
        onOpenSecurityModal={() => setShowSecurityModal(true)}
        shopName={settings.shopName}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'
        } ml-0`}
      >
        {/* Sticky Header */}
        <Header
          settings={settings}
          sidebarCollapsed={sidebarCollapsed}
          onOpenQuickPunch={() => setShowQuickPunch(true)}
          onOpenSecurityModal={() => setShowSecurityModal(true)}
          onResetData={handleResetData}
          onAddNewEmployee={() => setCurrentTab('employees')}
          onAddNewOrder={() => setCurrentTab('production')}
          onToggleSidebar={() => {
            if (window.innerWidth < 768) {
              setMobileSidebarOpen((prev) => !prev);
            } else {
              setSidebarCollapsed((prev) => !prev);
            }
          }}
        />

        {/* Tab View Container */}
        <main className="flex-1 p-3 sm:p-6 max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && (
            <DashboardView
              employees={employees}
              attendance={attendance}
              salaryRecords={salaryRecords}
              orders={orders}
              equipment={equipment}
              settings={settings}
              onNavigateTab={(tab) => setCurrentTab(tab)}
              onOpenQuickPunch={() => setShowQuickPunch(true)}
            />
          )}

          {currentTab === 'attendance' && (
            <AttendanceView
              employees={employees}
              attendance={attendance}
              settings={settings}
              onRecordAttendance={handleRecordAttendance}
              onUpdateAttendance={handleEditAttendance}
              onDeleteAttendance={handleDeleteAttendance}
              onBulkImportAttendance={handleBulkImportAttendance}
            />
          )}

          {currentTab === 'salary' && (
            <SalaryView
              employees={employees}
              attendance={attendance}
              salaryRecords={salaryRecords}
              settings={settings}
              onUpdateSalaryRecord={handleUpdateSingleSalary}
              onSelectPayslip={(record) => setSelectedPayslip(record)}
              onRecalculateAllPayroll={handleRecalculateAllPayroll}
            />
          )}

          {currentTab === 'employees' && (
            <EmployeesView
              employees={employees}
              settings={settings}
              onAddEmployee={handleAddEmployee}
              onUpdateEmployee={handleEditEmployee}
              onDeleteEmployee={handleDeleteEmployee}
            />
          )}

          {currentTab === 'production' && (
            <ProductionView
              orders={orders}
              employees={employees}
              equipment={equipment}
              settings={settings}
              onAddOrder={handleAddOrder}
              onUpdateOrder={handleEditOrder}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onResetData={handleResetData}
              onEraseAllDataHistory={handleEraseAllDataHistory}
              onOpenSecurityModal={() => setShowSecurityModal(true)}
              salaryCount={salaryRecords.length}
              attendanceCount={attendance.length}
              ordersCount={orders.length}
              employeesCount={employees.length}
            />
          )}
        </main>
      </div>

      {/* Quick Punch Modal */}
      <QuickPunchModal
        employees={employees}
        attendance={attendance}
        settings={settings}
        isOpen={showQuickPunch}
        onClose={() => setShowQuickPunch(false)}
        onRecordAttendance={handleRecordAttendance}
        onUpdateAttendance={handleEditAttendance}
      />

      {/* Printable Payslip Modal */}
      {selectedPayslip && (
        <PayslipModal
          salaryRecord={selectedPayslip}
          employee={employees.find((e) => e.id === selectedPayslip.employeeId)}
          settings={settings}
          onClose={() => setSelectedPayslip(null)}
          onUpdateSettings={handleUpdateSettings}
        />
      )}

      {/* Security Defense & Automated Bug Fixer Modal */}
      <SecurityHealthModal
        isOpen={showSecurityModal}
        onClose={() => setShowSecurityModal(false)}
        employees={employees}
        attendance={attendance}
        salaryRecords={salaryRecords}
        orders={orders}
        equipment={equipment}
        settings={settings}
        onDataRepaired={handleDataRepaired}
      />
    </div>
  );
}
