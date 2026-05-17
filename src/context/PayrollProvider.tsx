import React, { createContext, useContext, useState, useMemo, useEffect, ReactNode } from 'react';
import * as Types from '../types/hrms.types';
import { 
    PayrollRecord, PayrollGroup, Adjustment, Loan, DisbursementBatch, ProjectPayment,
    Employee, ComplianceSettings, SystemSettings
} from '../types/hrms.types';
// Data dependencies are passed as props to break circular dependency with AppDataContext
import { useUserAccess } from './UserAccessProvider';
import { useSystemCalendar } from './SystemCalendarContext';
import { generateDocumentContent } from '../utils/pdfGenerator';
import { supabase } from '../lib/supabase';

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
    generateDisbursementBatch: (providerName: string, payrollMonth: string, adminId: string) => Promise<{ success: boolean; message: string }>;
    projectPayments: ProjectPayment[];
    setProjectPayments: React.Dispatch<React.SetStateAction<ProjectPayment[]>>;
    handleProjectPaymentAction: (paymentId: string, action: 'Approve' | 'Reject', adminId: string) => Promise<{ success: boolean; message: string }>;
    otRequests: Types.OTRequest[];
    setOTRequests: React.Dispatch<React.SetStateAction<Types.OTRequest[]>>;
    submitOT: (req: Omit<Types.OTRequest, 'id' | 'status' | 'payoutAmount' | 'requestedDate'>) => { success: boolean; message: string };
    approveOT: (otId: string, adminId: string, overrideHours?: number) => { success: boolean; message: string };
    rejectOT: (otId: string, adminId: string, reason?: string) => { success: boolean; message: string };
    bulkApproveOT: (otIds: string[], adminId: string) => { success: boolean; message: string };
    expenses: Types.ExpenseRequest[];
    setExpenses: React.Dispatch<React.SetStateAction<Types.ExpenseRequest[]>>;
    submitExpense: (req: Omit<Types.ExpenseRequest, 'id' | 'status'>) => { success: boolean; message: string };
    handleExpenseApproval: (expenseId: string, action: 'Approve' | 'Reject', adminId: string, rejectionReason?: string) => { success: boolean; message: string };
    activePayrollGroupId: string | null;
    setActivePayrollGroupId: React.Dispatch<React.SetStateAction<string | null>>;
    createPayrollGroup: (group: { name: string; period: string; type: Types.PayrollGroup['type']; payrollCycle: string; proRatingLogic: string; cutoffDate?: string; paymentDate?: string }) => void;
    updatePayrollGroupStatus: (groupId: string, status: Types.PayrollGroup['status']) => void;
    deletePayrollGroup: (groupId: string) => Promise<{ success: boolean; message: string }>;
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
    addDocumentToLibrary?: (doc: Omit<Types.ArchivedDocument, 'id' | 'generatedAt' | 'checksum'>, adminId: string) => void;
}

export const PayrollProvider: React.FC<PayrollProviderProps> = ({
    children, employees, systemSettings, complianceSettings,
    attendanceLogs, leaveRequests, shifts, holidays, shiftAssignments, setAlerts, addDocumentToLibrary
}) => {
    const { addAuditLog, addSecurityLog, isAdmin } = useUserAccess();
    const { getCurrentDateISO, getFormattedDate } = useSystemCalendar();

    const [payrollRecords, setPayrollRecords] = useState<Types.PayrollRecord[]>([]);
    const [payrollGroups, setPayrollGroups] = useState<Types.PayrollGroup[]>([]);
    const [activePayrollGroupId, setActivePayrollGroupId] = useState<string | null>(null);
    const [adjustments, setAdjustments] = useState<Types.Adjustment[]>([]);
    const [loans, setLoans] = useState<Types.Loan[]>([]);
    const [disbursementBatches, setDisbursementBatches] = useState<Types.DisbursementBatch[]>([]);
    const [projectPayments, setProjectPayments] = useState<Types.ProjectPayment[]>([]);
    const [lastPayrollStatus, setLastPayrollStatus] = useState<'Draft' | 'Processing' | 'Approved' | 'Disbursed'>('Draft');
    const [lastPayrollTotal, setLastPayrollTotal] = useState<number>(450.5);
    const [expenses, setExpenses] = useState<Types.ExpenseRequest[]>([]);
    const [otRequests, setOTRequests] = useState<Types.OTRequest[]>([]);
    // Payroll lock state and payrun ID are now persisted in Supabase
    const [isPayrollLocked, setIsPayrollLocked] = useState<boolean>(false);
    const [payrunId, setPayrunId] = useState<string | null>(null);

    // Fetch and subscribe to Payroll Groups
    useEffect(() => {
        const fetchPayrollGroups = async () => {
            const { data, error } = await supabase.from('payroll_groups').select('*').order('created_at', { ascending: false }).limit(200);
            if (!error && data) setPayrollGroups(data as Types.PayrollGroup[]);
        };
        fetchPayrollGroups();

        const channel = supabase.channel('payroll-groups-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'payroll_groups' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setPayrollGroups(prev => prev.some(g => g.id === payload.new.id) ? prev : [payload.new as Types.PayrollGroup, ...prev]);
                } else if (payload.eventType === 'UPDATE') {
                    setPayrollGroups(prev => prev.map(g => g.id === payload.new.id ? payload.new as Types.PayrollGroup : g));
                } else if (payload.eventType === 'DELETE') {
                    setPayrollGroups(prev => prev.filter(g => g.id !== payload.old.id));
                }
            }).subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // Fetch and subscribe to Payroll Records
    useEffect(() => {
        const fetchPayrollRecords = async () => {
            const { data, error } = await supabase.from('payroll_records').select('*').order('created_at', { ascending: false }).limit(500);
            if (!error && data) setPayrollRecords(data as Types.PayrollRecord[]);
        };
        fetchPayrollRecords();

        const channel = supabase.channel('payroll-records-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'payroll_records' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setPayrollRecords(prev => prev.some(r => r.id === payload.new.id) ? prev : [payload.new as Types.PayrollRecord, ...prev]);
                } else if (payload.eventType === 'UPDATE') {
                    setPayrollRecords(prev => prev.map(r => r.id === payload.new.id ? payload.new as Types.PayrollRecord : r));
                } else if (payload.eventType === 'DELETE') {
                    setPayrollRecords(prev => prev.filter(r => r.id !== payload.old.id));
                }
            }).subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // Sync lock state and payrun ID to Supabase
    useEffect(() => {
        if (!activePayrollGroupId) return;
        const currentGroup = payrollGroups.find(g => g.id === activePayrollGroupId);
        // CRITICAL BUG FIX: Do NOT passively overwrite a group that is already Approved or Disbursed back to Draft/Processing!
        if (currentGroup?.status === 'Approved' || currentGroup?.status === 'Disbursed') return;

        const targetStatus = isPayrollLocked ? 'Processing' : 'Draft';
        if (currentGroup?.status === targetStatus) return; // Status is already in sync

        supabase.from('payroll_groups')
            .update({ status: targetStatus })
            .eq('id', activePayrollGroupId)
            .then(({ error }) => { if (error) console.error('Failed to sync payroll lock state:', error); });
    }, [isPayrollLocked, activePayrollGroupId, payrollGroups]);
    useEffect(() => {
        // payrunId is set on finalize; we update the corresponding group record
        if (payrunId && activePayrollGroupId) {
            supabase.from('payroll_groups')
                .update({ status: 'Approved' })
                .eq('id', activePayrollGroupId)
                .then(({ error }) => { if (error) console.error('Failed to set payrun ID in DB:', error); });
        }
    }, [payrunId, activePayrollGroupId]);

    // Fetch and subscribe to Adjustments
    useEffect(() => {
        const fetchAdjustments = async () => {
            const { data, error } = await supabase.from('adjustments').select('*').order('createdAt', { ascending: false }).limit(200);
            if (!error && data) setAdjustments(data);
        };
        fetchAdjustments();

        const channel = supabase.channel('adjustments-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'adjustments' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setAdjustments(prev => prev.some(r => r.id === payload.new.id) ? prev : [payload.new as Types.Adjustment, ...prev]);
                } else if (payload.eventType === 'UPDATE') {
                    setAdjustments(prev => prev.map(r => r.id === payload.new.id ? payload.new as Types.Adjustment : r));
                } else if (payload.eventType === 'DELETE') {
                    setAdjustments(prev => prev.filter(r => r.id !== payload.old.id));
                }
            }).subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // Fetch and subscribe to Loans
    useEffect(() => {
        const fetchLoans = async () => {
            const { data, error } = await supabase.from('loans').select('*').order('createdAt', { ascending: false }).limit(200);
            if (!error && data) setLoans(data);
        };
        fetchLoans();

        const channel = supabase.channel('loans-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'loans' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setLoans(prev => prev.some(r => r.id === payload.new.id) ? prev : [payload.new as Types.Loan, ...prev]);
                } else if (payload.eventType === 'UPDATE') {
                    setLoans(prev => prev.map(r => r.id === payload.new.id ? payload.new as Types.Loan : r));
                } else if (payload.eventType === 'DELETE') {
                    setLoans(prev => prev.filter(r => r.id !== payload.old.id));
                }
            }).subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // Fetch and subscribe to OT Requests
    useEffect(() => {
        const fetchOT = async () => {
            const { data, error } = await supabase.from('ot_requests').select('*').order('createdAt', { ascending: false }).limit(200);
            if (!error && data) setOTRequests(data);
        };
        fetchOT();

        const channel = supabase.channel('ot_requests-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ot_requests' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setOTRequests(prev => prev.some(r => r.id === payload.new.id) ? prev : [payload.new as Types.OTRequest, ...prev]);
                } else if (payload.eventType === 'UPDATE') {
                    setOTRequests(prev => prev.map(r => r.id === payload.new.id ? payload.new as Types.OTRequest : r));
                } else if (payload.eventType === 'DELETE') {
                    setOTRequests(prev => prev.filter(r => r.id !== payload.old.id));
                }
            }).subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // Fetch and subscribe to Expense Requests
    useEffect(() => {
        const fetchExpenses = async () => {
            const { data, error } = await supabase.from('expense_requests').select('*').order('createdAt', { ascending: false }).limit(200);
            if (!error && data) setExpenses(data);
        };
        fetchExpenses();

        const channel = supabase.channel('expense_requests-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'expense_requests' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setExpenses(prev => prev.some(r => r.id === payload.new.id) ? prev : [payload.new as Types.ExpenseRequest, ...prev]);
                } else if (payload.eventType === 'UPDATE') {
                    setExpenses(prev => prev.map(r => r.id === payload.new.id ? payload.new as Types.ExpenseRequest : r));
                } else if (payload.eventType === 'DELETE') {
                    setExpenses(prev => prev.filter(r => r.id !== payload.old.id));
                }
            }).subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);


    // Fetch and subscribe to Disbursement Batches
    useEffect(() => {
        const fetchBatches = async () => {
            const { data, error } = await supabase.from('disbursement_batches').select('*').order('createdAt', { ascending: false }).limit(200);
            if (!error && data) setDisbursementBatches(data);
        };
        fetchBatches();

        const channel = supabase.channel('disbursement_batches-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'disbursement_batches' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setDisbursementBatches(prev => prev.some(r => r.id === payload.new.id) ? prev : [payload.new as Types.DisbursementBatch, ...prev]);
                } else if (payload.eventType === 'UPDATE') {
                    setDisbursementBatches(prev => prev.map(r => r.id === payload.new.id ? payload.new as Types.DisbursementBatch : r));
                } else if (payload.eventType === 'DELETE') {
                    setDisbursementBatches(prev => prev.filter(r => r.id !== payload.old.id));
                }
            }).subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // Fetch and subscribe to Project Payments
    useEffect(() => {
        const fetchProjects = async () => {
            const { data, error } = await supabase.from('project_payments').select('*').order('createdAt', { ascending: false }).limit(200);
            if (!error && data) setProjectPayments(data);
        };
        fetchProjects();

        const channel = supabase.channel('project_payments-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'project_payments' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setProjectPayments(prev => prev.some(r => r.id === payload.new.id) ? prev : [payload.new as Types.ProjectPayment, ...prev]);
                } else if (payload.eventType === 'UPDATE') {
                    setProjectPayments(prev => prev.map(r => r.id === payload.new.id ? payload.new as Types.ProjectPayment : r));
                } else if (payload.eventType === 'DELETE') {
                    setProjectPayments(prev => prev.filter(r => r.id !== payload.old.id));
                }
            }).subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);
 
    // Automatically re-hydrate finalized payroll status, totals, and active group ID from loaded DB state on page refresh
    useEffect(() => {
        if (payrollGroups.length > 0) {
            // 1. Scan for any group that has been finalized (status === 'Approved') but not yet disbursed
            const approvedGroup = payrollGroups.find(g => g.status === 'Approved');
            if (approvedGroup) {
                const groupRecords = payrollRecords.filter(r => r.groupId === approvedGroup.id);
                const totalNet = groupRecords.reduce((sum, r) => sum + (r.netPay || 0), 0);
                
                setLastPayrollStatus('Approved');
                setLastPayrollTotal(totalNet);
                
                // Hydrate active ID and lock state
                if (!activePayrollGroupId) {
                    setActivePayrollGroupId(approvedGroup.id);
                }
                if (!isPayrollLocked) {
                    setIsPayrollLocked(true);
                }
                return;
            }

            // 2. Scan for any group that is currently under computation (status === 'Processing')
            const processingGroup = payrollGroups.find(g => g.status === 'Processing');
            if (processingGroup) {
                setLastPayrollStatus('Processing');
                if (!activePayrollGroupId) {
                    setActivePayrollGroupId(processingGroup.id);
                }
                if (!isPayrollLocked) {
                    setIsPayrollLocked(true);
                }
                return;
            }

            // 3. Fallback: on initial page load, auto-select the latest group in the directory
            if (!activePayrollGroupId) {
                const latestGroup = payrollGroups[0];
                if (latestGroup) {
                    setActivePayrollGroupId(latestGroup.id);
                    if (latestGroup.status === 'Disbursed') {
                        setLastPayrollStatus('Disbursed');
                        const groupRecords = payrollRecords.filter(r => r.groupId === latestGroup.id);
                        setLastPayrollTotal(groupRecords.reduce((sum, r) => sum + (r.netPay || 0), 0));
                        setIsPayrollLocked(false);
                    } else {
                        setLastPayrollStatus('Draft');
                        setLastPayrollTotal(0);
                        setIsPayrollLocked(false);
                    }
                }
            }
        }
    }, [payrollGroups, payrollRecords, activePayrollGroupId, isPayrollLocked]);

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

        supabase.from('ot_requests').insert(newReq).then(({ error }) => {
            if (error) console.error('Failed to sync OT to Supabase:', error);
        });

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

        // Guard: Check if attendance record exists for the OT date
        const attendanceLog = attendanceLogs.find(l => l.empId === req.empId && l.date === req.date);
        if (!attendanceLog) {
            return { success: false, message: `Cannot approve: No attendance record found for ${req.name} on ${req.date}. Please regularize attendance first.` };
        }
        if (attendanceLog.status === 'Missing Out' || attendanceLog.checkOut === '-- : --') {
            return { success: false, message: `Cannot approve: ${req.name} has missing check-out on ${req.date}. Regularize attendance before approving OT.` };
        }

        // Guard: Check for approved leave on the same date
        const leaveOnDate = leaveRequests.find(l => 
            l.empId === req.empId && 
            l.status === 'Approved' && 
            req.date >= l.startDate && 
            req.date <= l.endDate
        );
        if (leaveOnDate) {
            return { success: false, message: `Cannot approve: ${req.name} has approved leave (${leaveOnDate.type}) on ${req.date}. OT cannot overlap with approved leave.` };
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
        const updateData = { status: 'Approved', otHours: hoursToApprove, payoutAmount: payout, approvedBy: adminId, approvedAt };
        supabase.from('ot_requests').update(updateData).eq('id', otId).then(({ error }) => {
            if (error) console.error('Supabase approveOT error:', error);
        });

        setOTRequests(prev => prev.map(r => r.id === otId ? { ...r, ...updateData } as Types.OTRequest : r));

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

        const updateData = { status: 'Rejected', approvedBy: adminId, approvedAt: new Date().toISOString() };
        supabase.from('ot_requests').update(updateData).eq('id', otId).then(({ error }) => {
            if (error) console.error('Supabase rejectOT error:', error);
        });

        setOTRequests(prev => prev.map(r => r.id === otId ? { ...r, ...updateData } as Types.OTRequest : r));

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

            // Guard: Check if attendance record exists for the OT date
            const attendanceLog = attendanceLogs.find(l => l.empId === req.empId && l.date === req.date);
            if (!attendanceLog) {
                skipped.push(`${req.name} (no attendance)`); continue;
            }
            if (attendanceLog.status === 'Missing Out' || attendanceLog.checkOut === '-- : --') {
                skipped.push(`${req.name} (missing checkout)`); continue;
            }

            // Guard: Check for approved leave on the same date
            const leaveOnDate = leaveRequests.find(l => 
                l.empId === req.empId && 
                l.status === 'Approved' && 
                req.date >= l.startDate && 
                req.date <= l.endDate
            );
            if (leaveOnDate) {
                skipped.push(`${req.name} (leave on ${req.date})`); continue;
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
        const updatesForSupabase: any[] = [];
        const newOTState = otRequests.map(r => {
            if (approvedIdSet.has(r.id)) {
                const newData = { ...r, status: 'Approved' as const, payoutAmount: payoutMap.get(r.id) ?? r.payoutAmount, approvedBy: adminId, approvedAt };
                updatesForSupabase.push({ id: newData.id, status: newData.status, otHours: newData.otHours, payoutAmount: newData.payoutAmount, approvedBy: newData.approvedBy, approvedAt: newData.approvedAt });
                return newData;
            }
            return r;
        });

        updatesForSupabase.forEach(update => {
            supabase.from('ot_requests').update(update).eq('id', update.id).then(({ error }) => {
                if (error) console.error(`Supabase bulkApproveOT error for ${update.id}:`, error);
            });
        });

        setOTRequests(newOTState);

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
        
        supabase.from('expense_requests').insert(newExp).then(({ error }) => {
            if (error) console.error('Failed to sync expense to Supabase:', error);
        });
        
        setExpenses(prev => [newExp, ...prev]);
        return { success: true, message: 'Expense submitted.' };
    };

    const handleExpenseApproval = (expenseId: string, action: 'Approve' | 'Reject', adminId: string, rejectionReason?: string) => {
        if (!isAdmin(adminId)) return { success: false, message: 'Unauthorized' };
        const expense = expenses.find(e => e.id === expenseId);
        if (!expense) return { success: false, message: 'Expense request not found.' };
        if (expense.status !== 'Pending') return { success: false, message: `This request has already been ${expense.status.toLowerCase()}.` };

        const now = new Date();
        const approvedAt = now.toISOString();

        const updateData = {
            status: action === 'Approve' ? 'Approved' : 'Rejected',
            approvedBy: adminId,
            approvedAt,
            rejectionReason: action === 'Reject' ? (rejectionReason || 'No reason provided.') : undefined
        };

        supabase.from('expense_requests').update(updateData).eq('id', expenseId).then(({ error }) => {
            if (error) console.error('Supabase handleExpenseApproval error:', error);
        });

        setExpenses(prev => prev.map(e => e.id === expenseId ? { ...e, ...updateData } as Types.ExpenseRequest : e));

        // On approval — write a payroll adjustment so it flows into the next payroll run
        if (action === 'Approve' && expense) {
            setAdjustments(prev => [{
                id: `ADJ-EXP-${expenseId}`,
                empId: expense.employeeId,
                name: expense.employeeName,
                dept: 'Expense Reimbursement',
                type: 'Expense Reimbursement',
                category: 'Addition' as const,
                amount: expense.amount,
                currency: 'MMK',
                effectiveMonth: new Date(expense.date).toLocaleString('en-GB', { month: 'short', year: 'numeric' }),
                reason: `Expense claim approved: ${expense.description}`,
                sourceLink: expenseId,
                source: 'System-Expense',
                isImmutable: true,
                status: 'Approved' as const,
                priority: 'Medium' as const
            }, ...prev]);
        }

        addAuditLog({
            adminId,
            actionType: action === 'Approve' ? 'Expense Approved' : 'Expense Rejected',
            module: 'Payroll',
            detail: action === 'Approve'
                ? `Approved expense ${expenseId} for ${expense?.employeeName}. Amount: ${expense?.amount?.toLocaleString()} ${expense?.currency}. Written to Payroll Adjustments.`
                : `Rejected expense ${expenseId} for ${expense?.employeeName}. Reason: ${rejectionReason || 'None'}.`
        });

        return { success: true, message: `Expense ${action === 'Approve' ? 'approved and queued for reimbursement' : 'rejected'}.` };
    };

    const createPayrollGroup = async (group: { name: string; period: string; type: Types.PayrollGroup['type']; payrollCycle: string; proRatingLogic: string; cutoffDate?: string; paymentDate?: string }) => {
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
        // Insert into Supabase (use actual column names from table)
        const { error } = await supabase.from('payroll_groups').insert({
            id: newGroup.id,
            name: newGroup.name,
            period: newGroup.period,
            type: newGroup.type,
            status: newGroup.status,
            "payrollCycle": newGroup.payrollCycle,
            "proRatingDenominator": newGroup.proRatingDenominator,
            cutoffs: newGroup.cutoffs,
            "paymentDate": newGroup.paymentDate,
            "affectedEmployees": newGroup.affectedEmployees,
            created_at: newGroup.createdAt
        });
        if (error) console.error('Failed to create payroll group in Supabase:', error);
        setPayrollGroups(prev => [...prev, newGroup]);
        setActivePayrollGroupId(newGroup.id);
    };

    const updatePayrollGroupStatus = async (groupId: string, status: Types.PayrollGroup['status']) => {
        // Update in Supabase
        const { error } = await supabase.from('payroll_groups').update({ status }).eq('id', groupId);
        if (error) console.error('Failed to update payroll group status in Supabase:', error);
        setPayrollGroups(prev => prev.map(g => g.id === groupId ? { ...g, status } : g));
    };

    const deletePayrollGroup = async (groupId: string) => {
        // Deleting from supabase will trigger CASCADE on payroll_records
        const { error } = await supabase.from('payroll_groups').delete().eq('id', groupId);
        if (error) {
            console.error('Failed to delete payroll group from Supabase:', error);
            return { success: false, message: error.message };
        }
        setPayrollGroups(prev => prev.filter(g => g.id !== groupId));
        if (activePayrollGroupId === groupId) {
            setActivePayrollGroupId(null);
        }
        addAuditLog({
            adminId: 'EMP-001',
            actionType: 'Payroll Group Deleted',
            module: 'Payroll',
            detail: `Deleted payroll group ${groupId} and all associated records.`
        });
        return { success: true, message: 'Payroll group deleted successfully.' };
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

        // Payroll Stop: Exclude Terminated employees UNLESS separated during this payroll month (final payout)
        const eligibleEmployees = employees.filter(emp => {
            if (emp.status !== 'Terminated') return true;
            // Retain for final payout if separationDate is within the current payroll month
            if (emp.separationDate && emp.separationDate.startsWith(targetMonthKey)) return true;
            return false;
        });

        const targetEmployees = employeeIds
            ? eligibleEmployees.filter(e => employeeIds.includes(e.id))
            : eligibleEmployees;

        if (activePayrollGroupId) {
            const selectedIds = targetEmployees.map(e => e.id);
            setPayrollGroups(prev => prev.map(g => g.id === activePayrollGroupId ? { ...g, affectedEmployees: selectedIds } : g));
            supabase.from('payroll_groups').update({ "affectedEmployees": selectedIds }).eq('id', activePayrollGroupId)
                .then(({ error }) => { if (error) console.error("Failed to sync affectedEmployees:", error); });
        }

        // --- Myanmar 2026 tiered annualized PIT (20% relief + personalized deductions) ---
        const calcAnnualPIT = (annual: number, exemption: number): number => {
            if (annual <= exemption) return 0;
            // Official Myanmar PIT brackets (after exemption)
            // First 2,000,000 MMK is 0%, then progressive rates up to 25%
            const bands = [
                { from: exemption,               to: exemption + 2000000,   rate: 0.00 },  // 0% band
                { from: exemption + 2000000,     to: exemption + 10000000,  rate: 0.05 },  // 5% band
                { from: exemption + 10000000,    to: exemption + 20000000,  rate: 0.10 },  // 10% band
                { from: exemption + 20000000,    to: exemption + 30000000,  rate: 0.15 },  // 15% band
                { from: exemption + 30000000,    to: exemption + 70000000,  rate: 0.20 },  // 20% band
                { from: exemption + 70000000,    to: Infinity,              rate: 0.25 }   // 25% band
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
                    salary: 0, additions: 0, deductions: 0, ssb: 0, employerSsb: 0, pit: 0, netPay: 0,
                    status: 'Error' as const,
                    alerts: ['⛔ Missing Base Salary — excluded from payroll totals'],
                    detailedBreakdowns: {}
                };
            }

            const baseSalary = emp.baseSalary;
            let dynamicAdditions = 0;
            let dynamicDeductions = 0;
            let unpaidLeaveDeductions = 0;  // Track unpaid leave separately
            let attendancePenalties = 0;    // Track late/absent penalties separately
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
                    unpaidLeaveDeductions += totalAmount;  // Track separately for Step 4
                } else {
                    daysInMonth.forEach(date => {
                        // Skip weekends (Saturday=6, Sunday=0)
                        const dayOfWeek = new Date(date + 'T00:00:00').getDay();
                        if (dayOfWeek === 0 || dayOfWeek === 6) return;
                        // Skip public holidays
                        if (holidays.some(h => h.date === date)) return;
                        const hasLeave = leaveRequests.some(r => r.empId === emp.id && r.status === 'Approved' && date >= r.startDate && date <= r.endDate);
                        if (hasLeave) return;
                        const log = attendanceLogs.find(l => l.empId === emp.id && l.date === date);
                        if (config.logic === 'Non-Attendance' && !log) totalAmount += (baseSalary / workingDaysBase);
                    });
                    attendancePenalties += totalAmount;  // Track separately for Step 3
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

            // Employer SSB — independent calculation using dedicated rate & cap
            const employerSsbAmount = Math.min(Math.round((ssbBase * complianceSettings.ssbEmployerPercent) / 100), complianceSettings.ssbEmployerCap);

            // PIT — Myanmar compliant calculation:
            // 1. 20% personal relief on assessable income (capped at 10,000,000 MMK/year)
            // 2. Additional reliefs: spouse (1M), parents (1M each), children (500K each)
            const assessableIncome = (baseSalary + dynamicAdditions + taxableManualAdditions) * 12;
            const basicRelief = Math.min(assessableIncome * 0.20, 10000000);
            const personalExemption = basicRelief
                + (emp.reliefs?.spouse ? 1000000 : 0)
                + ((emp.reliefs?.parentsCount ?? 0) * 1000000)
                + ((emp.reliefs?.childrenCount ?? 0) * 500000);
            const taxableIncome = (baseSalary + dynamicAdditions + taxableManualAdditions) - ssbAmount - totalDeductions;
            const pitAmount     = Math.round(calcAnnualPIT(taxableIncome * 12, personalExemption) / 12);

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
                employerSsb: employerSsbAmount,
                pit: pitAmount,
                netPay: Math.round(netPay),
                status: 'Draft' as const,
                alerts: recordAlerts,
                detailedBreakdowns,
                // Step-specific breakdowns
                attendanceDeductions: attendancePenalties,  // Late/absent penalties (Step 3)
                leaveDeductions: unpaidLeaveDeductions,     // Unpaid leave (Step 4)
                otherAdditions: manualAdditions,            // OT pay, bonuses (Step 5)
                otherDeductions: loanDeduction + manualDeductions  // Loans, penalties (Step 5)
            };
        });

        setPayrollRecords(newRecords);
        // Error records excluded from financial totals
        const totalNet = newRecords.filter(r => r.status !== 'Error').reduce((sum, r) => sum + r.netPay, 0);
        setLastPayrollTotal(totalNet);
        setLastPayrollStatus('Draft');
    };

    const finalizePayroll = async (groupId?: string) => {
        const group = payrollGroups.find(g => g.id === (groupId ?? activePayrollGroupId));
        const period = group?.period ?? 'Unknown';
        const parts  = period.split(' ');
        const mNums: Record<string, string> = { Jan:'01', Feb:'02', Mar:'03', Apr:'04', May:'05', Jun:'06', Jul:'07', Aug:'08', Sep:'09', Oct:'10', Nov:'11', Dec:'12' };
        const id = `PR-${parts[1] ?? '0000'}${mNums[parts[0]] ?? '00'}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        setPayrunId(id);
        setIsPayrollLocked(true);
        setLastPayrollStatus('Approved');
        setPayrollRecords(prev => prev.map(r => r.status !== 'Error' ? { ...r, status: 'Approved' as const } : r));
        // Insert payroll records into Supabase with explicit column mapping
        const recordsToInsert = payrollRecords.map(r => ({
            id: `REC-${Date.now()}-${Math.random().toString(36).substr(2,4)}`,
            groupId: group?.id ?? '',
            empId: r.empId,
            name: r.name,
            salary: r.salary,
            additions: r.additions,
            deductions: r.deductions,
            ssb: r.ssb,
            employerSsb: r.employerSsb,
            pit: r.pit,
            netPay: r.netPay,
            status: r.status,
            alerts: r.alerts ?? [],
            detailedBreakdowns: r.detailedBreakdowns ?? {},
            biometricOTHours: r.biometricOTHours ?? 0,
            biometricAttendanceDays: r.biometricAttendanceDays ?? 0,
            biometricDeviceId: r.biometricDeviceId ?? null,
            created_at: new Date().toISOString()
        }));
        const { error: recError } = await supabase.from('payroll_records').insert(recordsToInsert);
        if (recError) console.error('Failed to insert payroll records into Supabase:', recError);
        // ── Commit loan repayments for every non-error employee in this payrun ──────────────────
        const paidEmpIds = new Set(payrollRecords.filter(r => r.status !== 'Error').map(r => r.empId));
        const loanUpdates: { id: string; remainingBalance: number; installmentsPaid: number; status: string; schedule: Types.LoanInstallment[] }[] = [];
        setLoans(prev => prev.map(loan => {
            if (loan.status !== 'Active' || loan.isPaused || !paidEmpIds.has(loan.empId)) return loan;
            const deducted    = Math.min(loan.monthlyInstallment, loan.remainingBalance);
            const newBalance  = Math.max(0, loan.remainingBalance - deducted);
            const newPaid     = loan.installmentsPaid + 1;
            const newStatus   = newBalance === 0 ? 'Completed' as const : 'Active' as const;
            const updSched    = loan.schedule.map((inst, i) =>
                i === loan.installmentsPaid ? { ...inst, status: 'Paid' as const } : inst
            );
            loanUpdates.push({ id: loan.id, remainingBalance: newBalance, installmentsPaid: newPaid, status: newStatus, schedule: updSched });
            return { ...loan, remainingBalance: newBalance, installmentsPaid: newPaid, status: newStatus, schedule: updSched };
        }));

        // Sync updated loan balances to Supabase
        loanUpdates.forEach(u => {
            supabase.from('loans').update({
                remainingBalance: u.remainingBalance,
                installmentsPaid: u.installmentsPaid,
                status: u.status,
                schedule: u.schedule
            }).eq('id', u.id).then(({ error }) => {
                if (error) console.error('Supabase loan balance sync error:', error.message);
            });
        });

        // ── Push SECURE-HASH Archive directly to Forms Library if bridge exists
        if (addDocumentToLibrary) {
            const hash = `${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`;
            
            const summaryBody = `
PERIOD: ${period}
PAYROLL GROUP: ${group?.name || 'Standard'}
TOTAL DISBURSEMENT: ${lastPayrollTotal.toLocaleString()} MMK
RECORDS PROCESSED: ${payrollRecords.length}
STATUS: Finalized & Locked
            `.trim();

            const docContent = generateDocumentContent(
                'Monthly Payroll Summary',
                systemSettings.companyLogo,
                summaryBody,
                {
                    id: `PAYROLL-${id}`,
                    timestamp: new Date().toISOString(),
                    checksum: hash,
                    footer: 'Confidential Payroll Record - Restricted Access'
                }
            );

            addDocumentToLibrary({
                title: `Payroll Summary - ${period} [SECURE-${hash}]`,
                category: 'Payroll Summary',
                sourceModule: 'Payroll',
                description: `Finalized payroll summary for ${period}. Total: ${lastPayrollTotal.toLocaleString()} MMK.`,
                period: period,
                generatedBy: 'SYSTEM',
                fileContent: docContent,
                fileName: `Payroll_Summary_${period.replace(/ /g, '_')}_${id}.txt`,
                isMandatory: true,
                relatedRecordId: id
            }, 'SYSTEM');
        }

        addAuditLog({ adminId: 'SYSTEM', actionType: 'Payroll Finalized', module: 'Payroll', detail: `Payroll for ${period} locked. PayrunID: ${id}` });
    };

    const disbursePayroll = (adminId: string, groupId?: string): { success: boolean; message: string } => {
        if (!isAdmin(adminId)) return { success: false, message: `Unauthorized: '${adminId}' does not have Finance Manager or Super-Admin privileges. Disbursement blocked.` };
        const group  = payrollGroups.find(g => g.id === (groupId ?? activePayrollGroupId));
        const period = group?.period ?? 'Unknown';
        setLastPayrollStatus('Disbursed');
        setPayrollRecords(prev => {
            const next = prev.map(r => r.status !== 'Error' ? { ...r, status: 'Disbursed' as const } : r);
            // Sync disbursed payroll records to Supabase
            next.filter(r => r.status === 'Disbursed').forEach(r => {
                supabase.from('payroll_records').update({ status: 'Disbursed' }).eq('id', r.id).then(({ error }) => {
                    if (error) console.error('Supabase payroll record disburse sync error:', error.message);
                });
            });
            return next;
        });
        addAuditLog({
            adminId,
            actionType: 'Financial Disbursement',
            module: 'Payroll',
            detail: `DISBURSED | Period: ${period} | PayrunID: ${payrunId ?? 'N/A'} | Total: ${lastPayrollTotal.toLocaleString()} MMK | Authorized by: ${adminId}`
        });
        return { success: true, message: `Payroll for ${period} disbursed. PayrunID: ${payrunId ?? 'N/A'}` };
    };

    const generateDisbursementBatch = async (providerName: string, payrollMonth: string, adminId: string) => {
        const newBatch: Types.DisbursementBatch = {
            id: `BATCH-${providerName.replace(/ /g, '-')}-${Date.now()}`,
            providerName,
            totalAmount: lastPayrollTotal,
            employeeCount: payrollRecords.length,
            disbursementDate: getCurrentDateISO(),
            payrollMonth,
            adminId
        };
        const { error } = await supabase.from('disbursement_batches').insert(newBatch);
        if (error) {
            console.error('Error saving disbursement batch:', error);
            return { success: false, message: 'Failed to generate batch.' };
        }
        addAuditLog({ adminId, actionType: 'Financial Export', module: 'Payroll', detail: `Generated disbursement batch for ${providerName}.` });
        return { success: true, message: `Batch for ${providerName} generated successfully.` };
    };

    const handleProjectPaymentAction = async (paymentId: string, action: 'Approve' | 'Reject', adminId: string) => {
        const status = action === 'Approve' ? 'Approved' : 'Rejected';
        const { error } = await supabase.from('project_payments').update({ status }).eq('id', paymentId);
        if (error) {
            console.error(`Error ${action.toLowerCase()}ing project payment:`, error);
            return { success: false, message: `Failed to ${action.toLowerCase()} project payment.` };
        }
        addAuditLog({ adminId, actionType: `Project Payment ${action}`, module: 'Payroll', detail: `${action}d project payment ${paymentId}.` });
        return { success: true, message: `Project payment ${action.toLowerCase()}d successfully.` };
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
        
        supabase.from('adjustments').insert(newAdj).then(({ error }) => {
            if (error) console.error('Failed to sync adjustment to Supabase:', error);
        });

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
        
        supabase.from('adjustments').update({ status: 'Approved' }).eq('id', adjId).then(({ error }) => {
            if (error) console.error('Failed to update adjustment in Supabase:', error);
        });

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
        
        supabase.from('adjustments').update({ status: 'Rejected' }).eq('id', adjId).then(({ error }) => {
            if (error) console.error('Failed to update adjustment in Supabase:', error);
        });

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

        supabase.from('loans').insert(newLoan).then(({ error }) => {
            if (error) console.error('Failed to sync loan to Supabase:', error);
        });

        setLoans(prev => [newLoan, ...prev]);
        return { success: true, message: 'Loan request submitted.' };
    };

    const approveLoan = (loanId: string, adminId: string) => {
        if (!isAdmin(adminId)) return { success: false, message: 'Unauthorized' };

        supabase.from('loans').update({ status: 'Approved' }).eq('id', loanId).then(({ error }) => {
            if (error) console.error('Failed to update loan in Supabase:', error);
        });

        setLoans(prev => prev.map(l => l.id === loanId ? { ...l, status: 'Approved' as const } : l));
        addAuditLog({ adminId, actionType: 'Loan Approved', module: 'Payroll', detail: `Approved loan ${loanId}.` });
        return { success: true, message: 'Loan approved.' };
    };

    const rejectLoan = (loanId: string, adminId: string) => {
        if (!isAdmin(adminId)) return { success: false, message: 'Unauthorized' };

        supabase.from('loans').update({ status: 'Rejected' }).eq('id', loanId).then(({ error }) => {
            if (error) console.error('Failed to update loan in Supabase:', error);
        });

        setLoans(prev => prev.map(l => l.id === loanId ? { ...l, status: 'Rejected' as const } : l));
        return { success: true, message: 'Loan rejected.' };
    };

    const disburseLoan = (loanId: string, adminId: string) => {
        if (!isAdmin(adminId)) return { success: false, message: 'Unauthorized' };
        const today = getCurrentDateISO();
        
        const loan = loans.find(l => l.id === loanId);
        if (!loan) return { success: false, message: 'Loan not found.' };

        const schedule: Types.LoanInstallment[] = Array.from({ length: loan.termMonths }, (_, i) => {
            const d = new Date(today);
            d.setMonth(d.getMonth() + i + 1);
            const label  = d.toLocaleString('en-GB', { month: 'short', year: 'numeric' });
            const isLast = i === loan.termMonths - 1;
            const amount = isLast
                ? Math.max(0, loan.remainingBalance - loan.monthlyInstallment * i)
                : loan.monthlyInstallment;
            return { month: label, amount: Math.round(amount), status: 'Pending' as const };
        });

        const updateData = { status: 'Active' as const, disbursedDate: today, schedule };
        
        supabase.from('loans').update(updateData).eq('id', loanId).then(({ error }) => {
            if (error) console.error('Failed to update loan in Supabase:', error);
        });

        setLoans(prev => prev.map(l => l.id === loanId ? { ...l, ...updateData } : l));
        addAuditLog({ adminId, actionType: 'Loan Disbursed', module: 'Payroll', detail: `Disbursed loan ${loanId} · EMI: auto-schedule generated.` });
        return { success: true, message: 'Loan disbursed and repayment schedule created.' };
    };

    const pauseLoan = (loanId: string, adminId: string) => {
        if (!isAdmin(adminId)) return { success: false, message: 'Unauthorized' };

        supabase.from('loans').update({ isPaused: true }).eq('id', loanId).then(({ error }) => {
            if (error) console.error('Failed to update loan in Supabase:', error);
        });

        setLoans(prev => prev.map(l => l.id === loanId ? { ...l, isPaused: true } : l));
        addAuditLog({ adminId, actionType: 'Loan Paused', module: 'Payroll', detail: `Repayments paused for loan ${loanId}.` });
        return { success: true, message: 'Loan repayments paused for this payrun.' };
    };

    const resumeLoan = (loanId: string, adminId: string) => {
        if (!isAdmin(adminId)) return { success: false, message: 'Unauthorized' };

        supabase.from('loans').update({ isPaused: false }).eq('id', loanId).then(({ error }) => {
            if (error) console.error('Failed to update loan in Supabase:', error);
        });

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
        
        const updateData = { remainingBalance: newBalance, installmentsPaid: newInstallments, status: newStatus };

        supabase.from('loans').update(updateData).eq('id', loanId).then(({ error }) => {
            if (error) console.error('Failed to update loan in Supabase:', error);
        });

        setLoans(prev => prev.map(l =>
            l.id === loanId ? { ...l, ...updateData } : l
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
        projectPayments, setProjectPayments, handleProjectPaymentAction,
        calculatePayroll, finalizePayroll, disbursePayroll,
        activePayrollGroupId, setActivePayrollGroupId,
        createPayrollGroup, updatePayrollGroupStatus, deletePayrollGroup,
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
