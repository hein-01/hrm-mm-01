import React, { createContext, useContext, useState, useMemo, useEffect, ReactNode } from 'react';
import * as Types from '../types/hrms.types';
import { 
    PayrollRecord, PayrollGroup, Adjustment, Loan, DisbursementBatch, ProjectPayment,
    Employee, ComplianceSettings, SystemSettings
} from '../types/hrms.types';
// Data dependencies are passed as props to break circular dependency with AppDataContext
import { useUserAccess } from './UserAccessProvider';
import { useSystemCalendar } from './SystemCalendarContext';

interface PayrollContextType {
    payrollRecords: PayrollRecord[];
    setPayrollRecords: React.Dispatch<React.SetStateAction<PayrollRecord[]>>;
    payrollGroups: PayrollGroup[];
    setPayrollGroups: React.Dispatch<React.SetStateAction<PayrollGroup[]>>;
    adjustments: Adjustment[];
    addAdjustment: (adj: Omit<Adjustment, 'id' | 'status' | 'isImmutable' | 'currency'>, adminId?: string) => void;
    approveAdjustment: (adjId: string, adminId: string) => { success: boolean, message: string };
    rejectAdjustment: (adjId: string, adminId: string) => { success: boolean, message: string };
    lastPayrollStatus: 'Draft' | 'Processing' | 'Approved' | 'Disbursed';
    setLastPayrollStatus: React.Dispatch<React.SetStateAction<'Draft' | 'Processing' | 'Approved' | 'Disbursed'>>;
    lastPayrollTotal: number;
    setLastPayrollTotal: React.Dispatch<React.SetStateAction<number>>;
    loans: Loan[];
    requestLoan: (loan: Omit<Loan, 'id' | 'status' | 'remainingBalance' | 'installmentsPaid' | 'schedule' | 'disbursedDate' | 'monthlyInstallment'>) => { success: boolean; message: string };
    approveLoan: (loanId: string, adminId: string) => { success: boolean; message: string };
    rejectLoan: (loanId: string, adminId: string) => { success: boolean; message: string };
    disburseLoan: (loanId: string, adminId: string) => { success: boolean; message: string };
    disbursementBatches: DisbursementBatch[];
    generateDisbursementBatch: (providerName: string, payrollMonth: string, adminId: string) => { success: boolean; message: string };
    projectPayments: ProjectPayment[];
    setProjectPayments: React.Dispatch<React.SetStateAction<ProjectPayment[]>>;
    otRequests: Types.OTRequest[];
    setOTRequests: React.Dispatch<React.SetStateAction<Types.OTRequest[]>>;
    submitOT: (req: Omit<Types.OTRequest, 'id' | 'status' | 'payoutAmount' | 'requestedDate'>) => { success: boolean; message: string };
    approveOT: (otId: string, adminId: string, overrideHours?: number) => { success: boolean; message: string };
    rejectOT: (otId: string, adminId: string, reason?: string) => { success: boolean; message: string };
    bulkApproveOT: (otIds: string[], adminId: string) => { success: boolean; message: string };
    expenses: Types.ExpenseRequest[];
    setExpenses: React.Dispatch<React.SetStateAction<Types.ExpenseRequest[]>>;
    submitExpense: (req: Omit<Types.ExpenseRequest, 'id' | 'status'>) => { success: boolean; message: string };
    handleExpenseApproval: (expenseId: string, action: 'Approve' | 'Reject', adminId: string) => { success: boolean; message: string };
    activePayrollGroupId: string | null;
    setActivePayrollGroupId: React.Dispatch<React.SetStateAction<string | null>>;
    createPayrollGroup: (group: { name: string; period: string; type: Types.PayrollGroup['type']; payrollCycle: string; proRatingLogic: string; cutoffDate?: string; paymentDate?: string }) => void;
    updatePayrollGroupStatus: (groupId: string, status: Types.PayrollGroup['status']) => void;
    isPayrollLocked: boolean;
    payrunId: string | null;
}

const PayrollContext = createContext<PayrollContextType | undefined>(undefined);

interface PayrollProviderProps {
    children: ReactNode;
    employees: Employee[];
    systemSettings: Types.SystemSettings;
    complianceSettings: Types.ComplianceSettings;
    attendanceLogs: Types.AttendanceLog[];
    leaveRequests: Types.LeaveRequest[];
    shifts: Types.Shift[];
    holidays: Types.Holiday[];
    shiftAssignments: Types.ShiftAssignment[];
    setAlerts: React.Dispatch<React.SetStateAction<Types.Alert[]>>;
}

export const PayrollProvider: React.FC<PayrollProviderProps> = ({
    children, employees, systemSettings, complianceSettings,
    attendanceLogs, leaveRequests, shifts, holidays, shiftAssignments, setAlerts
}) => {
    const { addAuditLog, addSecurityLog, isAdmin } = useUserAccess();
    const { getCurrentDateISO, getFormattedDate } = useSystemCalendar();

    const [payrollRecords, setPayrollRecords] = useState<Types.PayrollRecord[]>([]);
    const [payrollGroups, setPayrollGroups] = useState<Types.PayrollGroup[]>([]);
    const [activePayrollGroupId, setActivePayrollGroupId] = useState<string | null>(null);
    const [adjustments, setAdjustments] = useState<Types.Adjustment[]>([
        { id: 'ADJ-001', empId: 'EMP-001', name: 'Nilar Lwin', dept: 'Product Dept', type: 'Performance Bonus', category: 'Addition', amount: 120000, currency: 'MMK', effectiveMonth: 'Oct 2023', status: 'Approved', reason: 'High Performance Score (4.8)', sourceLink: 'REV-101', source: 'System-Performance', isImmutable: false, isTaxable: true, isSSBRelevant: true, priority: 'Medium' },
        { id: 'ADJ-002', empId: 'EMP-004', name: 'Thida', dept: 'Design', type: 'Late Fine', category: 'Deduction', amount: 5000, currency: 'MMK', effectiveMonth: 'Oct 2023', status: 'Pending', reason: 'Late Clock-in at HQ Office', sourceLink: 'LOG-001', source: 'System-Attendance', isImmutable: false, isTaxable: false, isSSBRelevant: false, priority: 'Low' },
        { id: 'ADJ-003', empId: 'EMP-023', name: 'Kyaw Kyaw', dept: 'Sales', type: 'Asset Loss', category: 'Deduction', amount: 300000, currency: 'MMK', effectiveMonth: 'Oct 2023', status: 'Pending', reason: 'Lost iPhone 14 Pro', sourceLink: 'AST-441', source: 'System-Asset', isImmutable: false, isTaxable: false, isSSBRelevant: false, priority: 'High' }
    ]);
    const [loans, setLoans] = useState<Types.Loan[]>([
        {
            id: 'LN-001', empId: 'EMP-001', name: 'Nilar Lwin', dept: 'Product Dept', type: 'Emergency Loan', principalAmount: 2400000, termMonths: 12,
            monthlyInstallment: 200000, disbursedDate: '2023-05-01', status: 'Active', remainingBalance: 1000000, installmentsPaid: 5,
            reason: 'Medical emergency for family member', requestedDate: '2023-04-28', priority: 'High', category: 'Financial',
            isPaused: false, interestRate: 0,
            schedule: []
        }
    ]);
    const [disbursementBatches, setDisbursementBatches] = useState<Types.DisbursementBatch[]>([
        { id: `BATCH-KBZ-SEP23`, providerName: 'KBZ Bank', totalAmount: 45000000, employeeCount: 42, disbursementDate: '2023-09-28T10:00:00Z', payrollMonth: 'Sep 2023', adminId: 'ADM-001' }
    ]);
    const [projectPayments, setProjectPayments] = useState<Types.ProjectPayment[]>([
        { id: 'PP-001', empId: 'EMP-012', name: 'Maung Maung', projectName: 'E-Commerce Platform', hoursLogged: 45, amount: 225000, currency: 'MMK', status: 'Pending', submittedDate: '2023-10-25', priority: 'Medium', category: 'Financial' },
        { id: 'PP-002', empId: 'EMP-004', name: 'Thida', projectName: 'Internal HR Portal', hoursLogged: 20, amount: 100000, currency: 'MMK', status: 'Pending', submittedDate: '2023-10-26', priority: 'Low', category: 'Financial' }
    ]);
    const [lastPayrollStatus, setLastPayrollStatus] = useState<'Draft' | 'Processing' | 'Approved' | 'Disbursed'>('Draft');
    const [lastPayrollTotal, setLastPayrollTotal] = useState<number>(450.5);
    const [expenses, setExpenses] = useState<Types.ExpenseRequest[]>([
        { id: 'EXP-101', employeeId: 'EMP-001', employeeName: 'Nilar Lwin', categoryId: 'CAT-01', amount: 45000, currency: 'MMK', date: '2023-10-25', description: 'Lunch meeting with Alpha Group', attachments: [], approverId: 'ADM-001', status: 'Pending' }
    ]);
    const [otRequests, setOTRequests] = useState<Types.OTRequest[]>([
        {
            id: 'OT-001', empId: 'EMP-001', name: 'Nilar Lwin', dept: 'Product Dept',
            date: '2023-10-18', shiftName: 'Morning (8 AM - 4 PM)', otHours: 3,
            otType: 'Weekday 1.5x', reason: 'Product launch sprint',
            payoutAmount: 18000,
            status: 'Pending', hasViolation: false, violationNote: '',
            effectiveMonth: 'Oct 2023', requestedDate: '2023-10-18',
            priority: 'Medium', category: 'Attendance'
        }
    ]);
    const [isPayrollLocked, setIsPayrollLocked] = useState<boolean>(() => {
        try { return localStorage.getItem('hrms_payroll_locked') === 'true'; } catch { return false; }
    });
    const [payrunId, setPayrunId] = useState<string | null>(() => {
        try { return localStorage.getItem('hrms_payroll_payrunid') ?? null; } catch { return null; }
    });

    useEffect(() => {
        try { localStorage.setItem('hrms_payroll_locked', String(isPayrollLocked)); } catch {}
    }, [isPayrollLocked]);
    useEffect(() => {
        if (payrunId) { try { localStorage.setItem('hrms_payroll_payrunid', payrunId); } catch {} }
    }, [payrunId]);

    // Returns null if employee has no valid baseSalary — hard blocks approval
    const calcOTPayout = (empId: string, otHours: number, otType: Types.OTRequest['otType']): number | null => {
        const emp = employees.find(e => e.id === empId);
        if (!emp || !emp.baseSalary || emp.baseSalary <= 0) return null;
        const dailyRate = emp.baseSalary / 30;
        const hourlyRate = dailyRate / 8;
        const multiplier = otType === 'Weekday 1.5x' ? 1.5 : 2.0; // Myanmar S&E Act: Weekday 1.5x, Rest/Holiday 2.0x
        return Math.round(hourlyRate * otHours * multiplier);
    };

    // Returns Monday of the week containing dateStr as YYYY-MM-DD
    const getWeekStart = (dateStr: string): string => {
        const d = new Date(dateStr + 'T00:00:00');
        const day = d.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        d.setDate(d.getDate() + diff);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    // Compares actual checkOut vs scheduled shift end — returns detected OT hours (0 if none)
    const detectSystemOTHours = (empId: string, date: string): number => {
        const log = attendanceLogs.find(l => l.empId === empId && l.date === date);
        if (!log?.checkOut || log.checkOut.trim() === '' || log.checkOut === '-') return 0;
        const sa = shiftAssignments.find(a => a.empId === empId && a.date === date);
        const emp = employees.find(e => e.id === empId);
        const shiftId = sa?.shiftId ?? emp?.shiftId;
        const shift = shifts.find(s => s.id === shiftId);
        if (!shift?.end) return 0;
        const toMins = (t: string) => {
            const clean = t.replace(/\s*(AM|PM)\s*/gi, '').trim();
            const [h, m] = clean.split(':').map(Number);
            return (isNaN(h) || isNaN(m)) ? 0 : h * 60 + m;
        };
        const scheduledEnd = toMins(shift.end);
        const actualOut = toMins(log.checkOut);
        if (!scheduledEnd || !actualOut) return 0;
        let diff = actualOut - scheduledEnd;
        if (diff < -120) diff += 1440; // midnight crossover: actual is past midnight
        return diff > 0 ? Math.round((diff / 60) * 100) / 100 : 0;
    };

    const submitOT = (req: Omit<Types.OTRequest, 'id' | 'status' | 'payoutAmount' | 'requestedDate'>) => {
        const systemDetectedHours = detectSystemOTHours(req.empId, req.date);
        const payout = calcOTPayout(req.empId, req.otHours, req.otType) ?? 0;
        const hasDiscrepancy = systemDetectedHours > 0 && Math.abs(systemDetectedHours - req.otHours) > 0.25;
        const newReq: Types.OTRequest = {
            ...req,
            id: `OT-${Date.now()}`,
            status: 'Pending',
            payoutAmount: payout,
            requestedDate: getCurrentDateISO(),
            systemDetectedHours,
            hasViolation: hasDiscrepancy || req.hasViolation,
            violationNote: hasDiscrepancy
                ? `System detected ${systemDetectedHours}h; employee requested ${req.otHours}h.`
                : (req.violationNote || '')
        };
        setOTRequests(prev => [newReq, ...prev]);
        return { success: true, message: 'OT Request submitted.' };
    };

    const approveOT = (otId: string, adminId: string, overrideHours?: number) => {
        if (!isAdmin(adminId)) return { success: false, message: 'Unauthorized' };
        const req = otRequests.find(r => r.id === otId);
        if (!req) return { success: false, message: 'OT request not found.' };
        if (req.status !== 'Pending') return { success: false, message: `Request is already ${req.status}.` };

        // Guard: baseSalary must exist
        const emp = employees.find(e => e.id === req.empId);
        if (!emp?.baseSalary || emp.baseSalary <= 0) {
            return { success: false, message: `Cannot approve: Missing base salary for ${req.name}. Update the employee record first.` };
        }

        const hoursToApprove = (overrideHours !== undefined && overrideHours > 0) ? overrideHours : req.otHours;

        // Guard: 16h weekly OT cap (Myanmar legal maximum)
        const weekStart = getWeekStart(req.date);
        const weekEnd = new Date(weekStart + 'T00:00:00');
        weekEnd.setDate(weekEnd.getDate() + 6);
        const weekEndStr = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, '0')}-${String(weekEnd.getDate()).padStart(2, '0')}`;
        const existingWeeklyOT = otRequests
            .filter(r => r.id !== otId && r.empId === req.empId && r.status === 'Approved' && r.date >= weekStart && r.date <= weekEndStr)
            .reduce((sum, r) => sum + r.otHours, 0);
        if (existingWeeklyOT + hoursToApprove > 16) {
            return { success: false, message: `Cannot approve: ${req.name} already has ${existingWeeklyOT}h approved OT this week. Approving ${hoursToApprove}h would exceed the 16h legal cap.` };
        }
        const payout = calcOTPayout(req.empId, hoursToApprove, req.otType);
        if (payout === null) return { success: false, message: `Payout calculation failed for ${req.name}. Verify base salary.` };

        const approvedAt = new Date().toISOString();
        const timestamp = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const adjustedNote = overrideHours !== undefined && overrideHours !== req.otHours
            ? ` [Hrs adjusted: ${req.otHours}h → ${hoursToApprove}h]` : '';

        // 1. Update OT status with approval metadata (and adjusted hours if overridden)
        setOTRequests(prev => prev.map(r => r.id === otId
            ? { ...r, status: 'Approved', otHours: hoursToApprove, payoutAmount: payout, approvedBy: adminId, approvedAt }
            : r));

        // 2. Write payroll adjustment — auto-approved so it flows into the next payroll run
        setAdjustments(prev => [{
            id: `ADJ-OT-${otId}`,
            empId: req.empId, name: req.name, dept: req.dept,
            type: 'OT Pay', category: 'Addition' as const,
            amount: payout, currency: 'MMK',
            effectiveMonth: req.effectiveMonth,
            reason: `OT Approved: ${hoursToApprove}h on ${req.date} (${req.otType}) — ${req.reason}${adjustedNote}`,
            sourceLink: otId, source: 'System-OT', isImmutable: true,
            status: 'Approved' as const, priority: 'High' as const
        }, ...prev]);

        // 3. General audit log
        addAuditLog({ adminId, actionType: 'OT Approval', module: 'Payroll', detail: `Approved ${otId} for ${req.name} (${req.empId}): ${hoursToApprove}h ${req.otType} = ${payout.toLocaleString()} MMK${adjustedNote}` });

        // 4. Security audit log
        addSecurityLog({ deviceId: 'WEB', authMethod: 'Admin Action', status: 'Success', empId: adminId, detail: `OT_APPROVE | ID:${otId} | Emp:${req.empId} | ${hoursToApprove}h | MMK:${payout} | Admin:${adminId}` });

        // 5. Employee in-app notification
        setAlerts(prev => [{
            id: `OT-NOTIF-${otId}-${Date.now()}`,
            type: 'success' as const,
            message: `✅ OT Approved: Your ${hoursToApprove}h OT on ${req.date} has been approved. ${payout.toLocaleString()} MMK will be added to your next payroll.`,
            timestamp, isRead: false, link: '/payroll'
        }, ...prev]);

        return { success: true, message: `OT approved for ${req.name}. ${payout.toLocaleString()} MMK written to Payroll Adjustments.${adjustedNote}` };
    };

    const rejectOT = (otId: string, adminId: string, reason?: string) => {
        if (!isAdmin(adminId)) return { success: false, message: 'Unauthorized' };
        const req = otRequests.find(r => r.id === otId);
        if (!req) return { success: false, message: 'OT request not found.' };
        const timestamp = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

        setOTRequests(prev => prev.map(r => r.id === otId
            ? { ...r, status: 'Rejected', approvedBy: adminId, approvedAt: new Date().toISOString() }
            : r));

        addAuditLog({ adminId, actionType: 'OT Rejection', module: 'Payroll', detail: `Rejected OT request ${otId} for ${req.name} (${req.empId}).${reason ? ` Reason: ${reason}` : ''}` });
        addSecurityLog({ deviceId: 'WEB', authMethod: 'Admin Action', status: 'Success', empId: adminId, detail: `OT_REJECT | ID:${otId} | Emp:${req.empId} | Admin:${adminId}` });
        setAlerts(prev => [{
            id: `OT-REJECT-${otId}-${Date.now()}`,
            type: 'error' as const,
            message: reason
                ? `❌ OT Not Approved: Your ${req.otHours}h OT request for ${req.date} was not approved. Reason: "${reason}"`
                : `❌ OT Not Approved: Your ${req.otHours}h OT request for ${req.date} was not approved. Contact your manager for details.`,
            timestamp, isRead: false, link: '/payroll'
        }, ...prev]);

        return { success: true, message: `OT request rejected for ${req.name}.` };
    };

    const bulkApproveOT = (otIds: string[], adminId: string) => {
        if (!isAdmin(adminId)) return { success: false, message: 'Unauthorized' };
        if (otIds.length === 0) return { success: false, message: 'No requests selected.' };

        // Validate each request and accumulate — track weekly budget per employee within this batch
        const weeklyBudget: Record<string, number> = {};
        const approved: { req: Types.OTRequest; payout: number }[] = [];
        const skipped: string[] = [];

        for (const otId of otIds) {
            const req = otRequests.find(r => r.id === otId);
            if (!req || req.status !== 'Pending') { skipped.push(req?.name ?? otId); continue; }

            const emp = employees.find(e => e.id === req.empId);
            if (!emp?.baseSalary || emp.baseSalary <= 0) {
                skipped.push(`${req.name} (missing salary)`); continue;
            }

            const weekStart = getWeekStart(req.date);
            const weekEnd = new Date(weekStart + 'T00:00:00');
            weekEnd.setDate(weekEnd.getDate() + 6);
            const weekEndStr = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, '0')}-${String(weekEnd.getDate()).padStart(2, '0')}`;
            const alreadyApproved = otRequests
                .filter(r => r.id !== otId && r.empId === req.empId && r.status === 'Approved' && r.date >= weekStart && r.date <= weekEndStr)
                .reduce((sum, r) => sum + r.otHours, 0);
            const batchKey = `${req.empId}-${weekStart}`;
            const batchAccumulated = weeklyBudget[batchKey] ?? 0;
            if (alreadyApproved + batchAccumulated + req.otHours > 16) {
                skipped.push(`${req.name} (16h cap)`); continue;
            }

            const payout = calcOTPayout(req.empId, req.otHours, req.otType);
            if (payout === null) { skipped.push(`${req.name} (calc error)`); continue; }

            weeklyBudget[batchKey] = batchAccumulated + req.otHours;
            approved.push({ req, payout });
        }

        if (approved.length === 0) {
            return { success: false, message: `All ${otIds.length} requests failed validation: ${skipped.join(', ')}` };
        }

        const approvedAt = new Date().toISOString();
        const timestamp = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const approvedIdSet = new Set(approved.map(a => a.req.id));
        const payoutMap = new Map(approved.map(a => [a.req.id, a.payout]));
        const totalPayout = approved.reduce((sum, a) => sum + a.payout, 0);

        // 1. Batch OT status update
        setOTRequests(prev => prev.map(r => approvedIdSet.has(r.id)
            ? { ...r, status: 'Approved', payoutAmount: payoutMap.get(r.id) ?? r.payoutAmount, approvedBy: adminId, approvedAt }
            : r));

        // 2. Batch payroll adjustments — one atomic state update = N individual records
        const newAdjustments: Types.Adjustment[] = approved.map(({ req, payout }, idx) => ({
            id: `ADJ-OT-${req.id}-${Date.now() + idx}`,
            empId: req.empId, name: req.name, dept: req.dept,
            type: 'OT Pay', category: 'Addition' as const,
            amount: payout, currency: 'MMK',
            effectiveMonth: req.effectiveMonth,
            reason: `OT (Bulk Approved): ${req.otHours}h on ${req.date} (${req.otType})`,
            sourceLink: req.id, source: 'System-OT', isImmutable: true,
            status: 'Approved' as const, priority: 'High' as const
        }));
        setAdjustments(prev => [...newAdjustments, ...prev]);

        // 3. Audit + security logs
        addAuditLog({ adminId, actionType: 'Bulk OT Approval', module: 'Payroll', detail: `Bulk approved ${approved.length} OT requests. Total: ${totalPayout.toLocaleString()} MMK. Skipped: ${skipped.length}.` });
        addSecurityLog({ deviceId: 'WEB', authMethod: 'Admin Action', status: 'Success', empId: adminId, detail: `BULK_OT_APPROVE | Count:${approved.length} | Total_MMK:${totalPayout} | Skipped:${skipped.length} | Admin:${adminId}` });

        // 4. Per-employee notifications — one alert per approved request
        const newAlerts: Types.Alert[] = approved.map(({ req, payout }) => ({
            id: `OT-NOTIF-${req.id}-${Date.now()}`,
            type: 'success' as const,
            message: `✅ OT Approved: Your ${req.otHours}h OT on ${req.date} has been approved. ${payout.toLocaleString()} MMK added to payroll.`,
            timestamp, isRead: false, link: '/payroll'
        }));
        setAlerts(prev => [...newAlerts, ...prev]);

        const skipMsg = skipped.length > 0 ? ` (${skipped.length} skipped: ${skipped.slice(0, 3).join(', ')}${skipped.length > 3 ? '...' : ''})` : '';
        return { success: true, message: `Approved ${approved.length}/${otIds.length} OT requests. ${totalPayout.toLocaleString()} MMK written to Payroll Adjustments.${skipMsg}` };
    };

    const submitExpense = (req: Omit<Types.ExpenseRequest, 'id' | 'status'>) => {
        const newExp: Types.ExpenseRequest = { ...req, id: `EXP-${Date.now()}`, status: 'Pending' };
        setExpenses(prev => [newExp, ...prev]);
        return { success: true, message: 'Expense submitted.' };
    };

    const handleExpenseApproval = (expenseId: string, action: 'Approve' | 'Reject', adminId: string) => {
        if (!isAdmin(adminId)) return { success: false, message: 'Unauthorized' };
        setExpenses(prev => prev.map(e => e.id === expenseId ? { ...e, status: action === 'Approve' ? 'Approved' : 'Rejected' } : e));
        return { success: true, message: `Expense ${action.toLowerCase()}ed.` };
    };

    const createPayrollGroup = (group: { name: string; period: string; type: Types.PayrollGroup['type']; payrollCycle: string; proRatingLogic: string; cutoffDate?: string; paymentDate?: string }) => {
        const newGroup: Types.PayrollGroup = {
            id: `PG-${Date.now()}`,
            name: group.name,
            period: group.period,
            type: group.type,
            status: 'Draft',
            payrollCycle: group.payrollCycle,
            proRatingDenominator: group.proRatingLogic === 'Calendar Days' ? 30 : 26,
            cutoffs: { attendance: group.cutoffDate ?? '', overtime: group.cutoffDate ?? '', leave: group.cutoffDate ?? '' },
            paymentDate: group.paymentDate ?? '',
            affectedEmployees: [],
            records: [],
            createdAt: new Date().toISOString()
        };
        setPayrollGroups(prev => [...prev, newGroup]);
        setActivePayrollGroupId(newGroup.id);
    };

    const updatePayrollGroupStatus = (groupId: string, status: Types.PayrollGroup['status']) => {
        setPayrollGroups(prev => prev.map(g => g.id === groupId ? { ...g, status } : g));
    };

    const calculatePayroll = (workingDaysInMonthOverride?: number, employeeIds?: string[]) => {
        if (isPayrollLocked) return;

        setLastPayrollStatus('Processing');

        // --- Dynamic month from active payroll group ---
        const activeGroup = payrollGroups.find(g => g.id === activePayrollGroupId);
        const groupPeriod = activeGroup?.period ?? 'Oct 2023';
        const mMap: Record<string, string> = { Jan:'01', Feb:'02', Mar:'03', Apr:'04', May:'05', Jun:'06', Jul:'07', Aug:'08', Sep:'09', Oct:'10', Nov:'11', Dec:'12' };
        const [periodMonName = 'Oct', periodYear = '2023'] = groupPeriod.split(' ');
        const targetMonthNum = mMap[periodMonName] ?? '10';
        const targetMonth = groupPeriod;
        const targetMonthKey = `${periodYear}-${targetMonthNum}`;

        const { roundingMethod } = systemSettings.loanConfiguration;
        const groupWorkingDays = activeGroup?.proRatingDenominator || complianceSettings.workingDaysPerMonth;
        const workingDaysBase = workingDaysInMonthOverride || groupWorkingDays;

        const targetEmployees = employeeIds
            ? employees.filter(e => employeeIds.includes(e.id))
            : employees;

        // --- Myanmar 2026 tiered annualized PIT ---
        const calcAnnualPIT = (annual: number): number => {
            if (annual <= 4800000) return 0;
            const bands = [
                { from: 4800000, to: 10000000, rate: 0.05 },
                { from: 10000000, to: 20000000, rate: 0.10 },
                { from: 20000000, to: 30000000, rate: 0.15 },
                { from: 30000000, to: 40000000, rate: 0.20 },
                { from: 40000000, to: Infinity,  rate: 0.25 }
            ];
            return bands.reduce((tax, b) => annual > b.from ? tax + (Math.min(annual, b.to) - b.from) * b.rate : tax, 0);
        };

        const lastDayOfMonth = new Date(parseInt(periodYear), parseInt(targetMonthNum), 0).getDate();
        const monthStart = `${targetMonthKey}-01`;
        const monthEnd   = `${targetMonthKey}-${String(lastDayOfMonth).padStart(2, '0')}`;
        const daysInMonth = Array.from({ length: lastDayOfMonth }, (_, i) => `${targetMonthKey}-${String(i + 1).padStart(2, '0')}`);

        const newRecords = targetEmployees.map(emp => {
            // --- Guard: no phantom salary fallback ---
            if (!emp.baseSalary || emp.baseSalary <= 0) {
                return {
                    empId: emp.id, name: emp.name,
                    salary: 0, additions: 0, deductions: 0, ssb: 0, pit: 0, netPay: 0,
                    status: 'Error' as const,
                    alerts: ['⛔ Missing Base Salary — excluded from payroll totals'],
                    detailedBreakdowns: {}
                };
            }

            const baseSalary = emp.baseSalary;
            let dynamicAdditions = 0;
            let dynamicDeductions = 0;
            const recordAlerts: string[] = [];
            const detailedBreakdowns: { [configId: string]: string[] } = {};

            // Pro-rata Joiner (dynamic month)
            const joinDate = new Date(emp.joinDate);
            if (joinDate.getFullYear() === parseInt(periodYear) && joinDate.getMonth() === parseInt(targetMonthNum) - 1) {
                const joinDay = joinDate.getDate();
                if (joinDay > 1) {
                    dynamicDeductions += (baseSalary / workingDaysBase) * (joinDay - 1);
                    recordAlerts.push(`Mid-month Joiner (${periodMonName} ${joinDay})`);
                }
            }

            // Allowances
            systemSettings.allowanceConfigs.filter(c => c.isEnabled).forEach(config => {
                let amount = 0;
                if (config.logic === 'Flat Rate') amount = config.value;
                else if (config.logic === 'Percentage of Base') amount = (baseSalary * config.value) / 100;
                if (amount > 0) dynamicAdditions += amount;
            });

            // Deductions & Attendance
            systemSettings.deductionConfigs.filter(c => c.isEnabled).forEach(config => {
                let totalAmount = 0;
                if (config.logic === 'Unpaid Leave') {
                    // Fixed: month-scoped overlap only, no cumulative deductions
                    const unpaidDays = leaveRequests
                        .filter(r => r.empId === emp.id && r.status === 'Approved' && r.type === 'Unpaid')
                        .reduce((sum, r) => {
                            const ls = r.startDate > monthStart ? r.startDate : monthStart;
                            const le = r.endDate   < monthEnd   ? r.endDate   : monthEnd;
                            if (ls > le) return sum;
                            return sum + Math.round((new Date(le + 'T00:00:00').getTime() - new Date(ls + 'T00:00:00').getTime()) / 86400000) + 1;
                        }, 0);
                    totalAmount = (baseSalary / workingDaysBase) * unpaidDays;
                } else {
                    daysInMonth.forEach(date => {
                        const hasLeave = leaveRequests.some(r => r.empId === emp.id && r.status === 'Approved' && date >= r.startDate && date <= r.endDate);
                        if (hasLeave) return;
                        const log = attendanceLogs.find(l => l.empId === emp.id && l.date === date);
                        if (config.logic === 'Non-Attendance' && !log) totalAmount += (baseSalary / workingDaysBase);
                    });
                }
                dynamicDeductions += totalAmount;
            });

            // Manual Adjustments (OT Pay from System-OT flows here)
            const empAdjs = adjustments.filter(a => a.empId === emp.id && a.status === 'Approved' && a.effectiveMonth === targetMonth);
            const manualAdditions        = empAdjs.filter(a => a.category === 'Addition').reduce((sum, a) => sum + a.amount, 0);
            const ssbManualAdditions     = empAdjs.filter(a => a.category === 'Addition' && (a.isSSBRelevant ?? true)).reduce((sum, a) => sum + a.amount, 0);
            const taxableManualAdditions = empAdjs.filter(a => a.category === 'Addition' && (a.isTaxable ?? true)).reduce((sum, a) => sum + a.amount, 0);
            const manualDeductions       = empAdjs.filter(a => a.category === 'Deduction').reduce((sum, a) => sum + a.amount, 0);

            // Loans — Math.min guards final-month over-collection; isPaused skips deduction this cycle
            const loanDeduction = loans.filter(l => l.empId === emp.id && l.status === 'Active' && !l.isPaused)
                .reduce((sum, loan) => sum + Math.min(loan.monthlyInstallment, loan.remainingBalance), 0);

            const totalAdditions  = dynamicAdditions  + manualAdditions;
            const totalDeductions = dynamicDeductions + manualDeductions + loanDeduction;

            // SSB — dynamic allowances always SSB-relevant; manual additions only if isSSBRelevant flag is true
            const ssbBase   = baseSalary + dynamicAdditions + ssbManualAdditions;
            const ssbAmount = Math.min(Math.round((ssbBase * complianceSettings.ssbPercent) / 100), complianceSettings.ssbCap);

            // PIT — dynamic allowances always taxable; manual additions only if isTaxable flag is true
            const taxableIncome = (baseSalary + dynamicAdditions + taxableManualAdditions) - ssbAmount - totalDeductions;
            const pitAmount     = Math.round(calcAnnualPIT(taxableIncome * 12) / 12);

            let netPay = (baseSalary + totalAdditions) - totalDeductions - ssbAmount - pitAmount;

            // ── Net-Pay Floor Guard ──────────────────────────────────────────────────────
            if (netPay < 0) {
                recordAlerts.push('⛔ Negative Net Pay Error — Combined deductions exceed gross pay. Payslip capped at 0. Manual review required.');
                netPay = 0;
            }

            // Compliance data-quality flags
            if (!emp.accountNumber) recordAlerts.push('⚠ Missing Bank Account Number');
            if (!emp.nrcNumber)     recordAlerts.push('⚠ Missing NRC Number');

            return {
                empId: emp.id, name: emp.name,
                salary: baseSalary,
                additions: totalAdditions,
                deductions: totalDeductions,
                ssb: ssbAmount,
                pit: pitAmount,
                netPay: Math.round(netPay),
                status: 'Draft' as const,
                alerts: recordAlerts,
                detailedBreakdowns
            };
        });

        setPayrollRecords(newRecords);
        // Error records excluded from financial totals
        const totalNet = newRecords.filter(r => r.status !== 'Error').reduce((sum, r) => sum + r.netPay, 0);
        setLastPayrollTotal(totalNet);
        setLastPayrollStatus('Draft');
    };

    const finalizePayroll = (groupId?: string) => {
        const group = payrollGroups.find(g => g.id === (groupId ?? activePayrollGroupId));
        const period = group?.period ?? 'Unknown';
        const parts  = period.split(' ');
        const mNums: Record<string, string> = { Jan:'01', Feb:'02', Mar:'03', Apr:'04', May:'05', Jun:'06', Jul:'07', Aug:'08', Sep:'09', Oct:'10', Nov:'11', Dec:'12' };
        const id = `PR-${parts[1] ?? '0000'}${mNums[parts[0]] ?? '00'}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        setPayrunId(id);
        setIsPayrollLocked(true);
        setLastPayrollStatus('Approved');
        // ── Commit loan repayments for every non-error employee in this payrun ──────────────────
        const paidEmpIds = new Set(payrollRecords.filter(r => r.status !== 'Error').map(r => r.empId));
        setLoans(prev => prev.map(loan => {
            if (loan.status !== 'Active' || loan.isPaused || !paidEmpIds.has(loan.empId)) return loan;
            const deducted    = Math.min(loan.monthlyInstallment, loan.remainingBalance);
            const newBalance  = Math.max(0, loan.remainingBalance - deducted);
            const newPaid     = loan.installmentsPaid + 1;
            const newStatus   = newBalance === 0 ? 'Completed' as const : 'Active' as const;
            const updSched    = loan.schedule.map((inst, i) =>
                i === loan.installmentsPaid ? { ...inst, status: 'Paid' as const } : inst
            );
            return { ...loan, remainingBalance: newBalance, installmentsPaid: newPaid, status: newStatus, schedule: updSched };
        }));
        addAuditLog({ adminId: 'SYSTEM', actionType: 'Payroll Finalized', module: 'Payroll', detail: `Payroll for ${period} locked. PayrunID: ${id}` });
    };

    const disbursePayroll = (adminId: string, groupId?: string): { success: boolean; message: string } => {
        if (!isAdmin(adminId)) return { success: false, message: `Unauthorized: '${adminId}' does not have Finance Manager or Super-Admin privileges. Disbursement blocked.` };
        const group  = payrollGroups.find(g => g.id === (groupId ?? activePayrollGroupId));
        const period = group?.period ?? 'Unknown';
        setLastPayrollStatus('Disbursed');
        setPayrollRecords(prev => prev.map(r => r.status !== 'Error' ? { ...r, status: 'Disbursed' as const } : r));
        addAuditLog({
            adminId,
            actionType: 'Financial Disbursement',
            module: 'Payroll',
            detail: `DISBURSED | Period: ${period} | PayrunID: ${payrunId ?? 'N/A'} | Total: ${lastPayrollTotal.toLocaleString()} MMK | Authorized by: ${adminId}`
        });
        return { success: true, message: `Payroll for ${period} disbursed. PayrunID: ${payrunId ?? 'N/A'}` };
    };

    const generateDisbursementBatch = (providerName: string, payrollMonth: string, adminId: string) => {
        const newBatch: Types.DisbursementBatch = {
            id: `BATCH-${providerName.replace(/ /g, '-')}-${Date.now()}`,
            providerName,
            totalAmount: lastPayrollTotal,
            employeeCount: payrollRecords.length,
            disbursementDate: getCurrentDateISO(),
            payrollMonth,
            adminId
        };
        setDisbursementBatches(prev => [newBatch, ...prev]);
        addAuditLog({ adminId, actionType: 'Financial Export', module: 'Payroll', detail: `Generated disbursement batch for ${providerName}.` });
        return { success: true, message: `Batch for ${providerName} generated successfully.` };
    };

    const addAdjustment = (adj: Omit<Adjustment, 'id' | 'status' | 'isImmutable' | 'currency'>, adminId?: string) => {
        const newAdj: Adjustment = {
            ...adj,
            id: `ADJ-${Date.now()}`,
            status: 'Pending',
            isImmutable: false,
            currency: 'MMK',
            isTaxable:     adj.isTaxable     ?? true,
            isSSBRelevant: adj.isSSBRelevant ?? true
        };
        setAdjustments(prev => [newAdj, ...prev]);
        addAuditLog({
            adminId: adminId ?? 'SYSTEM',
            actionType: 'Adjustment Created',
            module: 'Payroll',
            detail: `Created ${adj.category === 'Addition' ? '+' : '-'}${adj.amount.toLocaleString()} MMK ${adj.type} for ${adj.name} (${adj.empId}) · ${adj.effectiveMonth} · Reason: ${adj.reason || 'None'}`
        });
    };

    const approveAdjustment = (adjId: string, adminId: string) => {
        if (!isAdmin(adminId)) return { success: false, message: 'Unauthorized' };
        const adj = adjustments.find(a => a.id === adjId);
        setAdjustments(prev => prev.map(a => a.id === adjId ? { ...a, status: 'Approved' as const } : a));
        addAuditLog({
            adminId,
            actionType: 'Adjustment Approved',
            module: 'Payroll',
            detail: `Approved ${adj?.type ?? 'Adjustment'} of ${(adj?.amount ?? 0).toLocaleString()} MMK for ${adj?.name ?? 'Unknown'} (${adj?.empId ?? '—'}) · ${adj?.effectiveMonth ?? '—'} · Reason: ${adj?.reason || 'None'}`
        });
        return { success: true, message: 'Adjustment approved.' };
    };

    const rejectAdjustment = (adjId: string, adminId: string) => {
        if (!isAdmin(adminId)) return { success: false, message: 'Unauthorized' };
        const adj = adjustments.find(a => a.id === adjId);
        setAdjustments(prev => prev.map(a => a.id === adjId ? { ...a, status: 'Rejected' as const } : a));
        addAuditLog({
            adminId,
            actionType: 'Adjustment Rejected',
            module: 'Payroll',
            detail: `Rejected ${adj?.type ?? 'Adjustment'} of ${(adj?.amount ?? 0).toLocaleString()} MMK for ${adj?.name ?? 'Unknown'} (${adj?.empId ?? '—'}) · ${adj?.effectiveMonth ?? '—'} · Reason: ${adj?.reason || 'None'}`
        });
        return { success: true, message: 'Adjustment rejected.' };
    };

    const requestLoan = (loan: Omit<Types.Loan, 'id' | 'status' | 'remainingBalance' | 'installmentsPaid' | 'schedule' | 'disbursedDate' | 'monthlyInstallment' | 'isPaused'>) => {
        const hasActiveLoan = loans.some(l => l.empId === loan.empId && (l.status === 'Active' || l.status === 'Pending' || l.status === 'Approved'));
        if (hasActiveLoan) return { success: false, message: 'Employee already has an active loan. Close the current ledger before applying for a new one.' };
        const flatInterest       = loan.principalAmount * ((loan.interestRate ?? 0) / 100);
        const totalRepayable     = loan.principalAmount + flatInterest;
        const monthlyInstallment = Math.round(totalRepayable / loan.termMonths);
        const newLoan: Types.Loan = {
            ...loan, id: `LN-${Date.now()}`, status: 'Pending', isPaused: false,
            remainingBalance: Math.round(totalRepayable), installmentsPaid: 0,
            schedule: [], disbursedDate: null, monthlyInstallment
        };
        setLoans(prev => [newLoan, ...prev]);
        return { success: true, message: 'Loan request submitted.' };
    };

    const approveLoan = (loanId: string, adminId: string) => {
        if (!isAdmin(adminId)) return { success: false, message: 'Unauthorized' };
        setLoans(prev => prev.map(l => l.id === loanId ? { ...l, status: 'Approved' as const } : l));
        addAuditLog({ adminId, actionType: 'Loan Approved', module: 'Payroll', detail: `Approved loan ${loanId}.` });
        return { success: true, message: 'Loan approved.' };
    };

    const rejectLoan = (loanId: string, adminId: string) => {
        if (!isAdmin(adminId)) return { success: false, message: 'Unauthorized' };
        setLoans(prev => prev.map(l => l.id === loanId ? { ...l, status: 'Rejected' as const } : l));
        return { success: true, message: 'Loan rejected.' };
    };

    const disburseLoan = (loanId: string, adminId: string) => {
        if (!isAdmin(adminId)) return { success: false, message: 'Unauthorized' };
        const today = getCurrentDateISO();
        setLoans(prev => prev.map(l => {
            if (l.id !== loanId) return l;
            const schedule: Types.LoanInstallment[] = Array.from({ length: l.termMonths }, (_, i) => {
                const d = new Date(today);
                d.setMonth(d.getMonth() + i + 1);
                const label  = d.toLocaleString('en-GB', { month: 'short', year: 'numeric' });
                const isLast = i === l.termMonths - 1;
                const amount = isLast
                    ? Math.max(0, l.remainingBalance - l.monthlyInstallment * i)
                    : l.monthlyInstallment;
                return { month: label, amount: Math.round(amount), status: 'Pending' as const };
            });
            return { ...l, status: 'Active' as const, disbursedDate: today, schedule };
        }));
        addAuditLog({ adminId, actionType: 'Loan Disbursed', module: 'Payroll', detail: `Disbursed loan ${loanId} · EMI: auto-schedule generated.` });
        return { success: true, message: 'Loan disbursed and repayment schedule created.' };
    };

    const pauseLoan = (loanId: string, adminId: string) => {
        if (!isAdmin(adminId)) return { success: false, message: 'Unauthorized' };
        setLoans(prev => prev.map(l => l.id === loanId ? { ...l, isPaused: true } : l));
        addAuditLog({ adminId, actionType: 'Loan Paused', module: 'Payroll', detail: `Repayments paused for loan ${loanId}.` });
        return { success: true, message: 'Loan repayments paused for this payrun.' };
    };

    const resumeLoan = (loanId: string, adminId: string) => {
        if (!isAdmin(adminId)) return { success: false, message: 'Unauthorized' };
        setLoans(prev => prev.map(l => l.id === loanId ? { ...l, isPaused: false } : l));
        addAuditLog({ adminId, actionType: 'Loan Resumed', module: 'Payroll', detail: `Repayments resumed for loan ${loanId}.` });
        return { success: true, message: 'Loan repayments resumed.' };
    };

    const recordCashRepayment = (loanId: string, amount: number, reason: string, adminId: string) => {
        if (!isAdmin(adminId)) return { success: false, message: 'Unauthorized' };
        if (!reason?.trim()) return { success: false, message: 'A reason is mandatory for cash repayments.' };
        const loan = loans.find(l => l.id === loanId && l.status === 'Active');
        if (!loan) return { success: false, message: 'Loan not found or not in Active state.' };
        const deducted        = Math.min(amount, loan.remainingBalance);
        const newBalance      = Math.max(0, loan.remainingBalance - deducted);
        const newInstallments = loan.installmentsPaid + Math.floor(deducted / (loan.monthlyInstallment || 1));
        const newStatus       = newBalance === 0 ? 'Completed' as const : 'Active' as const;
        setLoans(prev => prev.map(l =>
            l.id === loanId ? { ...l, remainingBalance: newBalance, installmentsPaid: newInstallments, status: newStatus } : l
        ));
        addAuditLog({ adminId, actionType: 'Financial Adjustment', module: 'Payroll', detail: `Cash repayment of ${amount.toLocaleString()} MMK recorded for loan ${loanId}. Reason: ${reason}` });
        return {
            success: true,
            message: `Cash repayment of ${amount.toLocaleString()} MMK recorded. ${
                newBalance === 0 ? 'Loan fully settled and closed.' : `Outstanding balance: ${newBalance.toLocaleString()} MMK.`
            }`
        };
    };

    const value = useMemo(() => ({
        payrollRecords, setPayrollRecords,
        payrollGroups, setPayrollGroups,
        adjustments, addAdjustment,
        approveAdjustment, rejectAdjustment,
        lastPayrollStatus, setLastPayrollStatus,
        lastPayrollTotal, setLastPayrollTotal,
        loans, requestLoan, approveLoan, rejectLoan, disburseLoan, pauseLoan, resumeLoan, recordCashRepayment,
        disbursementBatches, generateDisbursementBatch,
        projectPayments, setProjectPayments,
        calculatePayroll, finalizePayroll, disbursePayroll,
        activePayrollGroupId, setActivePayrollGroupId,
        createPayrollGroup, updatePayrollGroupStatus,
        isPayrollLocked, payrunId,
        otRequests, setOTRequests, submitOT, approveOT, rejectOT, bulkApproveOT,
        expenses, setExpenses, submitExpense, handleExpenseApproval
    }), [payrollRecords, payrollGroups, adjustments, loans, lastPayrollStatus, lastPayrollTotal, disbursementBatches, projectPayments, otRequests, expenses, employees, systemSettings, complianceSettings, activePayrollGroupId, isPayrollLocked, payrunId]);

    return (
        <PayrollContext.Provider value={value}>
            {children}
        </PayrollContext.Provider>
    );
};

export const usePayroll = () => {
    const context = useContext(PayrollContext);
    if (!context) throw new Error('usePayroll must be used within PayrollProvider');
    return context;
};
