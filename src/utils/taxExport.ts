import type { Employee, PayrollRecord } from '../types/hrms.types';

// ─── Shared CSV Download Helper ──────────────────────────────────────────────
export function downloadCSV(filename: string, headers: string[], rows: string[][]) {
    const csv = [headers, ...rows]
        .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
        .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ─── SSB Form 15 (Monthly SSB Contribution) ─────────────────────────────────
export function buildSSBForm15(records: PayrollRecord[], employees: Employee[]) {
    const headers = [
        'Employee Name', 'Employee ID', 'NRC Number', 'SSB ID', 'TIN',
        'Gross Salary (MMK)', 'Employee SSB 2% (MMK)', 'Employer SSB 3% (MMK)', 'Total 5% (MMK)'
    ];
    const rows = records.filter(r => r.status !== 'Error').map(rec => {
        const emp = employees.find(e => e.id === rec.empId);
        const emprSsb = rec.employerSsb ?? 0;
        return [
            rec.name, rec.empId, emp?.nrcNumber ?? '', emp?.ssbNumber ?? '', emp?.taxId ?? '',
            rec.salary.toString(), rec.ssb.toString(), emprSsb.toString(), (rec.ssb + emprSsb).toString()
        ];
    });
    return { headers, rows };
}

// ─── PIT Patakha-(W)-15 (Monthly PIT Filing) ────────────────────────────────
export function buildPITReport(records: PayrollRecord[], employees: Employee[]) {
    const headers = [
        'Employee Name', 'Employee ID', 'NRC Number', 'TIN', 'Township',
        'Gross Salary (MMK)', 'Taxable Income (MMK)', 'SSB Deducted (MMK)', 'PIT Amount (MMK)'
    ];
    const rows = records.filter(r => r.status !== 'Error').map(rec => {
        const emp = employees.find(e => e.id === rec.empId);
        return [
            rec.name, rec.empId, emp?.nrcNumber ?? '', emp?.taxId ?? '', emp?.township ?? '',
            rec.salary.toString(), (rec.salary - rec.deductions).toString(), rec.ssb.toString(), rec.pit.toString()
        ];
    });
    return { headers, rows };
}

// ─── Export helpers (convenience wrappers) ───────────────────────────────────
export function exportSSBForm15CSV(records: PayrollRecord[], employees: Employee[], suffix: string) {
    const { headers, rows } = buildSSBForm15(records, employees);
    downloadCSV(`SSB_Form15_${suffix}.csv`, headers, rows);
}

export function exportPITReportCSV(records: PayrollRecord[], employees: Employee[], suffix: string) {
    const { headers, rows } = buildPITReport(records, employees);
    downloadCSV(`PIT_Patakha_W15_${suffix}.csv`, headers, rows);
}
