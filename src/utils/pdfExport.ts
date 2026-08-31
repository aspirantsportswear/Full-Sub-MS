import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SalaryRecord, ShopSettings, Employee } from '../types';
import { formatCurrency } from './calculations';

interface GenerateMonthlyReportOptions {
  salaryRecords: SalaryRecord[];
  employees: Employee[];
  settings: ShopSettings;
  periodLabel: string;
  departmentFilter?: string;
  filename?: string;
}

/**
 * Generates and triggers the direct download of a formatted monthly payroll & bonus summary PDF report.
 */
export const generateMonthlyPayrollPDF = ({
  salaryRecords,
  employees,
  settings,
  periodLabel,
  departmentFilter = 'all',
  filename,
}: GenerateMonthlyReportOptions): void => {
  // Use landscape A4 for rich multi-column payroll data
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Filter records based on role
  const targetRecords = salaryRecords.filter((rec) => {
    if (departmentFilter !== 'all' && rec.role !== departmentFilter) return false;
    return true;
  });

  // Calculate aggregates
  let totalGross = 0;
  let totalNet = 0;
  let totalRegular = 0;
  let totalOT = 0;
  let totalPiecePay = 0;
  let totalAllowances = 0;
  let totalLateDeductions = 0;
  let totalAdvanceDeductions = 0;
  let totalTaxDeductions = 0;
  let totalDeductions = 0;
  let totalRegHours = 0;
  let totalOTHours = 0;
  let totalPieceUnits = 0;
  let paidCount = 0;
  let pendingCount = 0;

  targetRecords.forEach((rec) => {
    totalGross += rec.grossPay;
    totalNet += rec.netSalary;
    totalRegular += rec.regularPay;
    totalOT += rec.overtimePay;
    totalPiecePay += rec.pieceRatePay || 0;
    totalAllowances += rec.allowances || 0;
    totalRegHours += rec.regularHours || 0;
    totalOTHours += rec.overtimeHours || 0;
    totalPieceUnits += rec.pieceRateUnits || 0;

    const late = rec.deductions.lateDeduction || 0;
    const advance = rec.deductions.cashAdvance || 0;
    const tax = rec.deductions.taxInsurance || 0;
    const other = rec.deductions.other || 0;

    totalLateDeductions += late;
    totalAdvanceDeductions += advance;
    totalTaxDeductions += tax;
    totalDeductions += late + advance + tax + other;

    if (rec.paymentStatus === 'paid') paidCount++;
    else pendingCount++;
  });

  const sym = settings.currencySymbol || '₱';

  // --- HEADER SECTION ---
  // Header background bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Accent line
  doc.setFillColor(6, 182, 212); // cyan-500
  doc.rect(0, 28, pageWidth, 2, 'F');

  // Company / Shop Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(settings.shopName.toUpperCase(), 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('SUBLIMATION APPAREL MANUFACTURING & PRINTING OPERATIONS', 14, 18);
  doc.text('EXECUTIVE PAYROLL & PRODUCTION INCENTIVE SUMMARY REPORT', 14, 23);

  // Right-aligned report meta
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(`PAYROLL PERIOD: ${periodLabel.toUpperCase()}`, pageWidth - 14, 11, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225); // slate-300
  const generationDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(`Generated On: ${generationDate}`, pageWidth - 14, 17, { align: 'right' });
  doc.text(`Currency: PHP (${sym}) | Overtime Factor: ${settings.overtimeMultiplier}x`, pageWidth - 14, 22, { align: 'right' });

  // --- EXECUTIVE KPI CARDS / SUMMARY BAR ---
  const startY = 35;
  const cardWidth = (pageWidth - 28 - (5 * 4)) / 6;
  const cardHeight = 16;

  const kpis = [
    { label: 'HEADCOUNT', val: `${targetRecords.length} Staff (${paidCount} Paid)`, color: [241, 245, 249], border: [203, 213, 225], text: [15, 23, 42] },
    { label: 'BASE SALARIES', val: `${sym}${totalRegular.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: [248, 250, 252], border: [226, 232, 240], text: [51, 65, 85] },
    { label: `OVERTIME (${settings.overtimeMultiplier}x)`, val: `+${sym}${totalOT.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: [238, 242, 255], border: [199, 210, 254], text: [67, 56, 202] },
    { label: 'PIECE INCENTIVES', val: `+${sym}${totalPiecePay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: [250, 245, 255], border: [233, 213, 255], text: [126, 34, 206] },
    { label: 'TOTAL DEDUCTIONS', val: `-${sym}${totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: [255, 241, 242], border: [254, 205, 211], text: [190, 18, 60] },
    { label: 'NET DISBURSED', val: `${sym}${totalNet.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: [236, 253, 245], border: [167, 243, 208], text: [6, 95, 70] },
  ];

  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * (cardWidth + 4);
    doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.setDrawColor(kpi.border[0], kpi.border[1], kpi.border[2]);
    doc.roundedRect(x, startY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x + 3, startY + 5);

    doc.setFontSize(8.5);
    doc.setTextColor(kpi.text[0], kpi.text[1], kpi.text[2]);
    doc.text(kpi.val, x + 3, startY + 11.5);
  });

  // --- EMPLOYEE SALARY DETAIL TABLE ---
  const tableData = targetRecords.map((sal, index) => {
    const roleLabel =
      sal.role === 'artist'
        ? 'Graphic Artist'
        : sal.role === 'machine_operator'
        ? 'Machine Operator'
        : sal.role === 'sewing_finishing'
        ? 'Sewing / Tailor'
        : 'Plant Supervisor';

    const pieceStr =
      sal.pieceRateUnits > 0
        ? sal.role === 'artist'
          ? `${sal.pieceRateUnits} des (${sym}${sal.pieceRatePay.toFixed(2)})`
          : `${sal.pieceRateUnits}m (${sym}${sal.pieceRatePay.toFixed(2)})`
        : '-';

    const dedBreakdown = [];
    if (sal.deductions.lateDeduction > 0) dedBreakdown.push(`Late: ${sym}${sal.deductions.lateDeduction.toFixed(2)}`);
    if (sal.deductions.cashAdvance > 0) dedBreakdown.push(`Vale: ${sym}${sal.deductions.cashAdvance.toFixed(2)}`);
    if (sal.deductions.taxInsurance > 0) dedBreakdown.push(`Tax: ${sym}${sal.deductions.taxInsurance.toFixed(2)}`);

    const dedTotal =
      sal.deductions.lateDeduction +
      sal.deductions.cashAdvance +
      sal.deductions.taxInsurance +
      sal.deductions.other;

    const dedStr = dedTotal > 0 ? `-${sym}${dedTotal.toFixed(2)}${dedBreakdown.length > 0 ? ` (${dedBreakdown.join(', ')})` : ''}` : `${sym}0.00`;

    return [
      (index + 1).toString(),
      `${sal.employeeName}\n[${sal.id}]`,
      roleLabel,
      `${sym}${sal.hourlyRate.toFixed(2)}/hr`,
      `${sal.regularHours}h\n${sym}${sal.regularPay.toFixed(2)}`,
      `${sal.overtimeHours}h\n${sym}${sal.overtimePay.toFixed(2)}`,
      pieceStr,
      sal.allowances > 0 ? `${sym}${sal.allowances.toFixed(2)}` : '-',
      `${sym}${sal.grossPay.toFixed(2)}`,
      dedStr,
      `${sym}${sal.netSalary.toFixed(2)}`,
      `${sal.paymentStatus.toUpperCase()}\n${sal.paymentMethod || 'Bank'}`,
    ];
  });

  // Add Summary Total Row to Table
  const totalRow = [
    '',
    'TOTALS',
    `${targetRecords.length} Staff`,
    '-',
    `${totalRegHours.toFixed(1)}h\n${sym}${totalRegular.toFixed(2)}`,
    `${totalOTHours.toFixed(1)}h\n${sym}${totalOT.toFixed(2)}`,
    `${totalPieceUnits} units\n${sym}${totalPiecePay.toFixed(2)}`,
    `${sym}${totalAllowances.toFixed(2)}`,
    `${sym}${totalGross.toFixed(2)}`,
    `-${sym}${totalDeductions.toFixed(2)}`,
    `${sym}${totalNet.toFixed(2)}`,
    `${paidCount} Paid / ${pendingCount} Pending`,
  ];

  autoTable(doc, {
    startY: startY + cardHeight + 4,
    head: [[
      '#',
      'Staff Name & ID',
      'Role / Specialty',
      'Base Rate',
      'Reg Hours & Base',
      'Overtime Pay',
      'Piece Incentives',
      'Allowances',
      'Gross Pay',
      'Total Deductions',
      'Net Salary',
      'Status / Channel',
    ]],
    body: [...tableData, totalRow],
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [248, 250, 252],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [30, 41, 59],
      cellPadding: 2,
      valign: 'middle',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { fontStyle: 'bold', cellWidth: 32 },
      2: { cellWidth: 26 },
      3: { halign: 'right', cellWidth: 20 },
      4: { halign: 'right', cellWidth: 24 },
      5: { halign: 'right', cellWidth: 24, textColor: [67, 56, 202] },
      6: { halign: 'right', cellWidth: 26, textColor: [126, 34, 206] },
      7: { halign: 'right', cellWidth: 18 },
      8: { halign: 'right', cellWidth: 22, fontStyle: 'bold' },
      9: { halign: 'right', cellWidth: 32, textColor: [190, 18, 60] },
      10: { halign: 'right', cellWidth: 22, fontStyle: 'bold', textColor: [6, 95, 70] },
      11: { halign: 'center', cellWidth: 20 },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50
    },
    didParseCell: (data) => {
      // Style the total summary row
      if (data.row.index === tableData.length) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
        data.cell.styles.textColor = [15, 23, 42];
        if (data.column.index === 10) {
          data.cell.styles.textColor = [6, 95, 70];
          data.cell.styles.fontSize = 8;
        }
      }
    },
    margin: { left: 14, right: 14, bottom: 28 },
  });

  // Get current Y after table
  const finalY = (doc as any).lastAutoTable?.finalY || 160;

  // Add Sign-off & Verification Section (either on current page or new page if needed)
  let signoffY = finalY + 8;
  if (signoffY + 22 > pageHeight - 12) {
    doc.addPage();
    signoffY = 16;
  }

  // Draw Signatures Box
  const prepName = settings.signatories?.preparedByName || 'Elena Rostova';
  const prepRole = settings.signatories?.preparedByTitle || 'Senior Payroll & Timecard Auditor';
  const certName = settings.signatories?.certifiedByName || 'Marcus Vance';
  const certRole = settings.signatories?.certifiedByTitle || 'Plant Operations Director';
  const appName = settings.signatories?.approvedByName || 'David Sterling';
  const appRole = settings.signatories?.approvedByTitle || 'Managing Director / Shop Owner';

  const sigBoxWidth = (pageWidth - 28 - 20) / 3;
  const sigBoxes = [
    { label: 'PREPARED BY', name: prepName, role: prepRole },
    { label: 'CERTIFIED BY', name: certName, role: certRole },
    { label: 'APPROVED BY (OWNER / ADMIN)', name: appName, role: appRole },
  ];

  sigBoxes.forEach((box, i) => {
    const x = 14 + i * (sigBoxWidth + 10);
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, signoffY, sigBoxWidth, 20, 1, 1, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(71, 85, 105);
    doc.text(`${box.label}:`, x + 3, signoffY + 4);

    // Signatory name in elegant dark bold
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(box.name, x + 3, signoffY + 9.5);

    // Signature dotted line
    doc.setLineDashPattern([1, 1], 0);
    doc.line(x + 3, signoffY + 14, x + sigBoxWidth - 3, signoffY + 14);
    doc.setLineDashPattern([], 0);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(100, 116, 139);
    doc.text(box.role, x + 3, signoffY + 18);
  });

  // Footer Disclaimer & Page Numbers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);

    doc.text(
      `Confidential & Certified Payroll Document — Generated for ${settings.shopName} internal auditing and disbursement records.`,
      14,
      pageHeight - 6
    );

    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, pageHeight - 6, { align: 'right' });
  }

  // Trigger download
  const defaultFilename = `Monthly_Payroll_Summary_${settings.shopName.replace(/\s+/g, '_')}_${periodLabel.replace(/\s+/g, '_')}.pdf`;
  doc.save(filename || defaultFilename);
};

/**
 * Generates an individual employee payslip as a downloadable PDF.
 */
export const generateIndividualPayslipPDF = (
  salaryRecord: SalaryRecord,
  employee: Employee | undefined,
  settings: ShopSettings,
  periodLabel: string
): void => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const sym = settings.currencySymbol || '₱';

  // Header Banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setFillColor(6, 182, 212);
  doc.rect(0, 28, pageWidth, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(settings.shopName.toUpperCase(), 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text('OFFICIAL EMPLOYEE SALARY PAYSLIP', 14, 18);
  doc.text(`Pay Period: ${periodLabel}`, 14, 23);

  // Right-aligned status
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(`REF: ${salaryRecord.id}`, pageWidth - 14, 12, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Status: ${salaryRecord.paymentStatus.toUpperCase()}`, pageWidth - 14, 18, { align: 'right' });
  doc.text(`Disbursement: ${salaryRecord.paymentMethod || 'Bank Transfer'}`, pageWidth - 14, 23, { align: 'right' });

  // Employee Information Box
  let y = 35;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, pageWidth - 28, 20, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(salaryRecord.employeeName, 18, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const roleTitle =
    salaryRecord.role === 'artist'
      ? 'Graphic & Vector Artist'
      : salaryRecord.role === 'machine_operator'
      ? 'Sublimation Machine Operator'
      : salaryRecord.role === 'sewing_finishing'
      ? 'Sewing & Tailoring Specialist'
      : 'Plant Supervisor';

  doc.text(`Designation: ${roleTitle} (${employee?.code || salaryRecord.employeeId})`, 18, y + 11);
  doc.text(`Assigned Station: ${employee?.assignedStation || 'Central Production Line'}`, 18, y + 16);

  doc.text(`Base Hourly Rate: ${sym}${salaryRecord.hourlyRate.toFixed(2)}/hr`, pageWidth - 18, y + 6, { align: 'right' });
  doc.text(`Overtime Rate: ${sym}${(salaryRecord.hourlyRate * settings.overtimeMultiplier).toFixed(2)}/hr (${settings.overtimeMultiplier}x)`, pageWidth - 18, y + 11, { align: 'right' });
  doc.text(`Regular Hours Rendered: ${salaryRecord.regularHours} hrs`, pageWidth - 18, y + 16, { align: 'right' });

  // Earnings & Deductions Tables side-by-side or stacked
  y += 26;

  const earningsData = [
    ['Regular Base Pay', `${salaryRecord.regularHours} hrs @ ${sym}${salaryRecord.hourlyRate.toFixed(2)}`, `${sym}${salaryRecord.regularPay.toFixed(2)}`],
    ['Overtime Payout', `${salaryRecord.overtimeHours} hrs @ ${sym}${(salaryRecord.hourlyRate * settings.overtimeMultiplier).toFixed(2)}`, `${sym}${salaryRecord.overtimePay.toFixed(2)}`],
    ['Sublimation Piece Bonus', salaryRecord.pieceRateUnits > 0 ? `${salaryRecord.pieceRateUnits} units rendered` : 'No piece incentive', `${sym}${salaryRecord.pieceRatePay.toFixed(2)}`],
    ['Allowances / Honoraria', 'Production attendance allowance', `${sym}${salaryRecord.allowances.toFixed(2)}`],
    ['GROSS TOTAL EARNINGS', '', `${sym}${salaryRecord.grossPay.toFixed(2)}`],
  ];

  autoTable(doc, {
    startY: y,
    head: [['EARNINGS ITEM', 'COMPUTATION BASIS', 'AMOUNT']],
    body: earningsData,
    theme: 'grid',
    headStyles: {
      fillColor: [16, 185, 129], // emerald-600
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: { fontSize: 7.5, cellPadding: 2.5 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60 },
      1: { cellWidth: 70 },
      2: { halign: 'right', fontStyle: 'bold', cellWidth: 40 },
    },
    didParseCell: (data) => {
      if (data.row.index === earningsData.length - 1) {
        data.cell.styles.fillColor = [236, 253, 245];
        data.cell.styles.textColor = [6, 95, 70];
        data.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: 14, right: 14 },
  });

  const earningsFinalY = (doc as any).lastAutoTable?.finalY || y + 40;

  // Deductions Table
  const totalDed =
    salaryRecord.deductions.lateDeduction +
    salaryRecord.deductions.cashAdvance +
    salaryRecord.deductions.taxInsurance +
    salaryRecord.deductions.other;

  const deductionsData = [
    ['Tardiness / Late Deduction', 'Calculated from biometric timecard logs', `-${sym}${salaryRecord.deductions.lateDeduction.toFixed(2)}`],
    ['Cash Advance (Vale)', 'Authorized company payroll deduction', `-${sym}${salaryRecord.deductions.cashAdvance.toFixed(2)}`],
    ['Statutory SSS / PhilHealth / Tax', 'Government & insurance contributions', `-${sym}${salaryRecord.deductions.taxInsurance.toFixed(2)}`],
    ['TOTAL DEDUCTIONS', '', `-${sym}${totalDed.toFixed(2)}`],
  ];

  autoTable(doc, {
    startY: earningsFinalY + 6,
    head: [['DEDUCTIONS & WITHHOLDINGS', 'REASON / BASIS', 'AMOUNT']],
    body: deductionsData,
    theme: 'grid',
    headStyles: {
      fillColor: [225, 29, 72], // rose-600
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: { fontSize: 7.5, cellPadding: 2.5 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60 },
      1: { cellWidth: 70 },
      2: { halign: 'right', fontStyle: 'bold', cellWidth: 40, textColor: [190, 18, 60] },
    },
    didParseCell: (data) => {
      if (data.row.index === deductionsData.length - 1) {
        data.cell.styles.fillColor = [255, 241, 242];
        data.cell.styles.textColor = [190, 18, 60];
        data.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: 14, right: 14 },
  });

  const dedFinalY = (doc as any).lastAutoTable?.finalY || earningsFinalY + 40;

  // NET SALARY HIGHLIGHT BOX
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(14, dedFinalY + 8, pageWidth - 28, 16, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(203, 213, 225);
  doc.text('TOTAL NET PAYOUT (TAKE-HOME SALARY):', 20, dedFinalY + 18);

  doc.setFontSize(13);
  doc.setTextColor(52, 211, 153); // emerald-400
  doc.text(`${sym}${salaryRecord.netSalary.toFixed(2)}`, pageWidth - 20, dedFinalY + 19, { align: 'right' });

  // 4 Official Verification & Employee Acknowledgment Signatures
  const indPrepName = settings.signatories?.preparedByName || 'Elena Rostova';
  const indPrepRole = settings.signatories?.preparedByTitle || 'Senior Payroll & Timecard Auditor';
  const indCertName = settings.signatories?.certifiedByName || 'Marcus Vance';
  const indCertRole = settings.signatories?.certifiedByTitle || 'Plant Operations Director';
  const indAppName = settings.signatories?.approvedByName || 'David Sterling';
  const indAppRole = settings.signatories?.approvedByTitle || 'Managing Director / Shop Owner';

  const sigY = dedFinalY + 30;
  const colW = (pageWidth - 28 - 9) / 4; // 4 signature columns

  const indSigBoxes = [
    { label: 'PREPARED BY', name: indPrepName, role: indPrepRole },
    { label: 'CERTIFIED BY', name: indCertName, role: indCertRole },
    { label: 'APPROVED BY (OWNER)', name: indAppName, role: indAppRole },
    { label: 'EMPLOYEE ACKNOWLEDGMENT', name: salaryRecord.employeeName, role: 'Signature & Date Received' },
  ];

  indSigBoxes.forEach((box, i) => {
    const x = 14 + i * (colW + 3);
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(250, 250, 252);
    doc.roundedRect(x, sigY, colW, 20, 1, 1, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`${box.label}:`, x + 2, sigY + 4);

    // Signatory name in dark text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(15, 23, 42);
    doc.text(box.name, x + 2, sigY + 9);

    // Signature dotted line
    doc.setLineDashPattern([1, 1], 0);
    doc.line(x + 2, sigY + 13.5, x + colW - 2, sigY + 13.5);
    doc.setLineDashPattern([], 0);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.setTextColor(100, 116, 139);
    doc.text(box.role, x + 2, sigY + 17.5);
  });

  // Footer note
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Official certified payslip generated by ${settings.shopName}. Confidential and private between employee and management.`,
    14,
    pageHeight - 6
  );

  doc.save(`Payslip_${salaryRecord.employeeName.replace(/\s+/g, '_')}_${periodLabel.replace(/\s+/g, '_')}.pdf`);
};
