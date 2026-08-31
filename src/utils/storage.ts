import {
  Employee,
  AttendanceRecord,
  SalaryRecord,
  ProductionOrder,
  SublimationEquipment,
  ShopSettings,
} from '../types';
import {
  initialEmployees,
  initialAttendance,
  initialSalaryRecords,
  initialProductionOrders,
  initialEquipment,
  initialShopSettings,
} from '../data/initialData';
import {
  sanitizeObject,
  healAndRepairAllData,
  recordSecurityEvent,
  hashString,
} from './security';

const KEYS = {
  EMPLOYEES: 'sublimaster_employees_v1',
  ATTENDANCE: 'sublimaster_attendance_v1',
  SALARY: 'sublimaster_salary_v1',
  ORDERS: 'sublimaster_orders_v1',
  EQUIPMENT: 'sublimaster_equipment_v1',
  SETTINGS: 'sublimaster_settings_v1',
  CHECKSUM: 'sublimaster_checksum_v1',
};

export const loadStoredData = () => {
  try {
    const employees = localStorage.getItem(KEYS.EMPLOYEES);
    const attendance = localStorage.getItem(KEYS.ATTENDANCE);
    const salary = localStorage.getItem(KEYS.SALARY);
    const orders = localStorage.getItem(KEYS.ORDERS);
    const equipment = localStorage.getItem(KEYS.EQUIPMENT);
    const settings = localStorage.getItem(KEYS.SETTINGS);

    let loadedSettings = settings ? (JSON.parse(settings) as ShopSettings) : initialShopSettings;
    if (loadedSettings && loadedSettings.currencySymbol === '$') {
      loadedSettings = { ...loadedSettings, currencySymbol: '₱' };
    }
    if (loadedSettings && (!loadedSettings.shopName || loadedSettings.shopName.includes('Apex SubliCraft'))) {
      loadedSettings = {
        ...loadedSettings,
        shopName: 'Aspirant Sportswear',
        tagline: 'High-Definition Full Sublimation & Sportswear Manufacturing',
      };
    }

    const rawData = {
      employees: employees ? (JSON.parse(employees) as Employee[]) : initialEmployees,
      attendance: attendance ? (JSON.parse(attendance) as AttendanceRecord[]) : initialAttendance,
      salary: salary ? (JSON.parse(salary) as SalaryRecord[]) : initialSalaryRecords,
      orders: orders ? (JSON.parse(orders) as ProductionOrder[]) : initialProductionOrders,
      equipment: equipment ? (JSON.parse(equipment) as SublimationEquipment[]) : initialEquipment,
      settings: loadedSettings,
    };

    // Sanitize and run automated self-healing
    const sanitizedData = sanitizeObject(rawData);
    const { repairedData, report } = healAndRepairAllData(sanitizedData);

    if (report.issuesFoundCount > 0) {
      console.info(`[BugFixer Guard] Auto-repaired ${report.issuesFoundCount} database state anomalies.`);
    }

    return repairedData;
  } catch (error) {
    console.error('Error loading data from localStorage. Restoring secure defaults.', error);
    recordSecurityEvent({
      type: 'TAMPER_DETECTED',
      severity: 'high',
      details: 'Storage JSON parsing failed or storage was corrupted. Re-initialized safe baseline.',
      source: 'StorageEngine',
    });
    return {
      employees: initialEmployees,
      attendance: initialAttendance,
      salary: initialSalaryRecords,
      orders: initialProductionOrders,
      equipment: initialEquipment,
      settings: initialShopSettings,
    };
  }
};

export const saveStoredData = (key: keyof typeof KEYS, data: unknown) => {
  try {
    const sanitized = sanitizeObject(data);
    const payload = JSON.stringify(sanitized);
    localStorage.setItem(KEYS[key], payload);

    // Update integrity signature
    const sig = hashString(`${key}_${payload.length}_${payload.substring(0, 100)}`);
    localStorage.setItem(`${KEYS.CHECKSUM}_${key}`, sig);
  } catch (error) {
    console.error(`Error saving data for ${key}`, error);
    recordSecurityEvent({
      type: 'DATA_REPAIRED',
      severity: 'low',
      details: `Failed to serialize state for ${key}`,
      source: 'StorageEngine',
    });
  }
};

export const eraseAllDataHistory = (options: { keepEmployees?: boolean } = { keepEmployees: true }) => {
  try {
    localStorage.setItem(KEYS.SALARY, JSON.stringify([]));
    localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify([]));
    localStorage.setItem(KEYS.ORDERS, JSON.stringify([]));

    if (!options.keepEmployees) {
      localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify([]));
    }

    recordSecurityEvent({
      type: 'ADMIN_ACTION',
      severity: 'high',
      details: `Complete historical data erase executed with 6-digit passcode authentication. ${
        options.keepEmployees ? 'Personnel preserved.' : 'All personnel and records erased.'
      }`,
      source: 'DataErasureEngine',
    });
  } catch (err) {
    console.error('Failed to erase data history from localStorage', err);
  }
};

export const resetToInitialData = () => {
  try {
    localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(initialEmployees));
    localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(initialAttendance));
    localStorage.setItem(KEYS.SALARY, JSON.stringify(initialSalaryRecords));
    localStorage.setItem(KEYS.ORDERS, JSON.stringify(initialProductionOrders));
    localStorage.setItem(KEYS.EQUIPMENT, JSON.stringify(initialEquipment));
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(initialShopSettings));

    recordSecurityEvent({
      type: 'ADMIN_ACTION',
      severity: 'medium',
      details: 'Factory reset performed. Sample database re-initialized.',
      source: 'StorageReset',
    });
  } catch (err) {
    console.error('Failed to reset localStorage data', err);
  }
};
