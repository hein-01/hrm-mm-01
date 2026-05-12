import React, { useState, useMemo, useEffect, Fragment } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useAppData } from '../context/AppDataContext';
import { useSystemCalendar } from '../context/SystemCalendarContext';

const generateAuditHash = async (adminId: string, timestamp: string, dataLength: number): Promise<string> => {
    const rawString = `${adminId}-${timestamp}-${dataLength}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(rawString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return `[AUDIT-${hashHex.substring(0, 16).toUpperCase()}]`;
};

interface ActionItem {
    id: string;
    type: string;
    title: string;
    subtitle: string;
    icon: string;
    iconColorClass: string;
    bgClass: string;
    barClass: string;
    buttonText?: string;
    buttonClass?: string;
    status?: string;
    isRequest: boolean;
    isContextAlert?: boolean;
}

export default function HomeDashboard() {
    const {
        employees, leaveRequests, otRequests, loans, adjustments, projectPayments,
        locationSnapshots, jobActivityChanges, recruitmentActions,
        attendanceRequests, expenses, systemSettings, handleInboxAction, resolveOTConflict, lastPayrollStatus, lastPayrollTotal,
        alerts, setAlerts, addAuditLog, auditLogs, announcements, createAnnouncement,
        attendanceLogs, shiftAssignments, holidays, shifts, securityAuditLogs, subscriptionTier, gpsLogs, addDocumentToLibrary
    } = useAppData();
    const { getFormattedDate, parseGregorianDate, getCurrentDateISO } = useSystemCalendar();

    const currentAdminId = 'EMP-001';

    // RBAC: Derive access scope from the current user's employee record
    const currentUser = employees.find(e => e.id === currentAdminId) ?? null;
    const isCompanyWideAdmin = !currentUser ||
        ['Admin', 'HR Director', 'CEO', 'Director', 'HR Manager'].some(r => (currentUser.role || '').includes(r));
    const scopedDept: string | null = isCompanyWideAdmin ? null : (currentUser?.dept ?? null);

    // Real-time shift-buffer clock — replaces hardcoded MOCK_NOW_TIME = '10:00'
    const [liveNowTime, setLiveNowTime] = useState(() => {
        const n = new Date();
        return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
    });
    const [lastUpdated, setLastUpdated] = useState(() => new Date().toLocaleTimeString());
    useEffect(() => {
        const tick = setInterval(() => {
            const n = new Date();
            setLiveNowTime(`${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`);
            setLastUpdated(n.toLocaleTimeString());
        }, 60_000);
        return () => clearInterval(tick);
    }, []);

    const [isExporting, setIsExporting] = useState(false);

    // Announcement Dispatcher UI State
    const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
    const [newAnnSubject, setNewAnnSubject] = useState('');
    const [newAnnBody, setNewAnnBody] = useState('');
    const [newAnnTargetDept, setNewAnnTargetDept] = useState('All');
    const [newAnnTargetLoc, setNewAnnTargetLoc] = useState('All');
    const [newAnnTargetEmpType, setNewAnnTargetEmpType] = useState('All');
    const [newAnnAckRequired, setNewAnnAckRequired] = useState(false);
    const [isHoliday, setIsHoliday] = useState(false);
    const [holidayDate, setHolidayDate] = useState('');

    const [inboxFilter, setInboxFilter] = useState<string>('All');
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [inboxSearch, setInboxSearch] = useState('');
    const [highValueOnly, setHighValueOnly] = useState(false);
    
    // Absence Analytics State
    const [selectedAbsenteeGroup, setSelectedAbsenteeGroup] = useState<{ dept: string; location: string; type: 'Total' | 'Absent' | 'On Leave' | 'Present' } | null>(null);
    const [isAbsenteeModalOpen, setIsAbsenteeModalOpen] = useState(false);

    // Conflict Triage State
    const [triageItem, setTriageItem] = useState<any | null>(null);
    const [isTriageModalOpen, setIsTriageModalOpen] = useState(false);
    // ── GOVERNANCE GUARD: Denied Route Notification ──────────────────────────
    const location = useLocation();
    useEffect(() => {
        if (location.state?.denied) {
            const deniedAlert = {
                id: `DENIED-${Date.now()}`,
                type: 'error' as const,
                message: `ACCESS DENIED: Your account lacks the "${location.state.requiredPermission}" permission required for that module. Support ticket logged in security trails.`,
                timestamp: new Date().toLocaleTimeString('en-GB'),
                isRead: false
            };
            setAlerts(prev => [deniedAlert, ...prev]);
            
            // Clean up state manually if possible or via navigate replacement
            // require('react-router-dom').useNavigate()({ ...location, state: {} }, { replace: true });
        }
    }, [location.state]);

    const INBOX_TYPES = ['All', 'Leave', 'OT', 'Loan', 'Adjustment', 'ProjectPayment', 'JobActivity', 'LocationSnapshot', 'Recruitment', 'Attendance', 'Expense'];
    const INBOX_TYPE_LABELS: Record<string, string> = {
        All: 'All Types', Leave: 'Leave', OT: 'Overtime', Loan: 'Loan',
        Adjustment: 'Adjustment', ProjectPayment: 'Project Payment',
        JobActivity: 'Job Activity', LocationSnapshot: 'Location Snapshot',
        Recruitment: 'Recruitment', Attendance: 'Attendance', Expense: 'Expense'
    };
    const INBOX_TYPE_ROUTES: Record<string, string> = {
        Leave: '/leave-requests',
        OT: '/ot-approvals',
        Loan: '/loans-advances',
        Adjustment: '/adjustments',
        ProjectPayment: '/payroll-run',
        JobActivity: '/employees',
        LocationSnapshot: '/field-force',
        Recruitment: '/candidates',
        Attendance: '/attendance',
        Expense: '/expenses',
    };
    // Aggregation Logic: Map all request sources into a unified Inbox feed
    const pendingInboxItems = useMemo(() => {
        const items: any[] = [];

        // 1. Leave Requests
        (leaveRequests || []).filter(r => r && r.status === 'Pending').forEach(r => {
            const emp = employees.find(e => e.id === r.empId);
            items.push({
                ...r,
                name: emp?.name || 'Unknown',
                inboxType: 'Leave',
                inboxTitle: 'Leave Approval',
                inboxSubtitle: `${r.type} Leave • ${r.startDate} to ${r.endDate}`,
                inboxIcon: 'beach_access',
                inboxIconColor: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40',
                inboxBarColor: 'bg-emerald-500',
                priority: r.priority || 'Medium',
                category: r.category || 'Staffing'
            });
        });

        // 2. OT Requests
        (otRequests || []).filter(r => r && r.status === 'Pending').forEach(r => {
            items.push({
                ...r,
                inboxType: 'OT',
                inboxTitle: 'Overtime Request',
                inboxSubtitle: `${r.name} • ${r.otHours} Hours • ${r.date}`,
                inboxIcon: 'schedule',
                inboxIconColor: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/40',
                inboxBarColor: 'bg-indigo-500',
                priority: r.priority || 'Medium',
                category: r.category || 'Attendance',
                isConflict: r.isConflict,
                conflictNote: r.conflictNote,
                biometricDeviceId: r.biometricDeviceId
            });
        });

        // 3. Loans
        (loans || []).filter(r => r && r.status === 'Pending').forEach(r => {
            items.push({
                ...r,
                inboxType: 'Loan',
                inboxTitle: 'Loan Request',
                inboxSubtitle: `${r.name} • ${(r as any).loanAmount?.toLocaleString()} ${systemSettings.compliance.currency}`,
                inboxIcon: 'payments',
                inboxIconColor: 'text-amber-600 bg-amber-100 dark:bg-amber-900/40',
                inboxBarColor: 'bg-amber-500',
                priority: r.priority || 'Medium',
                category: r.category || 'Financial'
            });
        });

        // 4. Adjustments
        (adjustments || []).filter(r => r && r.status === 'Pending').forEach(r => {
            items.push({
                ...r,
                inboxType: 'Adjustment',
                inboxTitle: 'Payroll Adjustment',
                inboxSubtitle: `${r.name} • ${r.type} • ${r.amount.toLocaleString()} ${r.currency}`,
                inboxIcon: 'account_balance_wallet',
                inboxIconColor: 'text-rose-600 bg-rose-100 dark:bg-rose-900/40',
                inboxBarColor: 'bg-rose-500',
                priority: r.priority || 'Medium',
                category: r.category || 'Financial'
            });
        });

        // 5. Project Payments
        (projectPayments || []).filter(r => r && r.status === 'Pending').forEach(r => {
            items.push({
                ...r,
                inboxType: 'ProjectPayment',
                inboxTitle: 'Project Payment',
                inboxSubtitle: `${r.name} • ${r.projectName} • ${r.amount.toLocaleString()} ${r.currency}`,
                inboxIcon: 'work',
                inboxIconColor: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/40',
                inboxBarColor: 'bg-cyan-500',
                priority: r.priority || 'Medium',
                category: r.category || 'Financial'
            });
        });

        // 6. Location Snapshots
        (locationSnapshots || []).filter(r => r && r.status === 'Pending').forEach(r => {
            items.push({
                ...r,
                inboxType: 'LocationSnapshot',
                inboxTitle: 'Location Verification',
                inboxSubtitle: `${r.name} • ${r.address}`,
                inboxIcon: 'location_on',
                inboxIconColor: 'text-slate-600 bg-slate-100 dark:bg-slate-800',
                inboxBarColor: 'bg-slate-400',
                priority: r.priority || 'Medium',
                category: r.category || 'Attendance'
            });
        });

        // 7. Job Activity Changes (Salary Updates, Promotions, Transfers, Resignations)
        (jobActivityChanges || []).filter(r => r && r.status === 'Pending').forEach(r => {
            const emp = employees.find(e => e.id === r.empId);
            const assetsHeld = (emp?.assets || []).filter(a => a.status === 'Active').length;
            
            // Determine category based on type
            const categoryMap: Record<string, string> = {
                'Adjustment': 'Financial',
                'Promotion': 'HR',
                'Transfer': 'HR',
                'Resignation': 'HR'
            };
            
            items.push({
                ...r,
                inboxType: 'JobActivity',
                inboxTitle: r.type === 'Resignation' ? 'Resignation Request' : r.type === 'Adjustment' ? 'Salary Adjustment' : `${r.type} Request`,
                inboxSubtitle: r.type === 'Resignation' 
                    ? `${r.name} • Final Day: ${r.finalWorkingDate || 'Not set'}`
                    : r.type === 'Adjustment' && r.newSalary
                        ? `${r.name} • ${(r.oldSalary || 0).toLocaleString()} → ${r.newSalary.toLocaleString()} MMK`
                        : `${r.name} • ${r.detail}${r.announcementTitle ? ` • 📢 ${r.announcementTitle}` : ''}`,
                inboxIcon: r.type === 'Resignation' ? 'exit_to_app' : (r.type === 'Adjustment' ? 'payments' : 'trending_up'),
                inboxIconColor: r.type === 'Resignation' ? 'text-amber-600 bg-amber-50' : (r.type === 'Adjustment' ? 'text-emerald-600 bg-emerald-100' : 'text-indigo-600 bg-indigo-100'),
                inboxBarColor: r.type === 'Resignation' ? 'bg-amber-500' : (r.type === 'Adjustment' ? 'bg-emerald-500' : 'bg-indigo-500'),
                priority: r.priority || (r.type === 'Resignation' ? 'High' : 'Medium'),
                category: categoryMap[r.type] || 'HR',
                assetsHeld,
                resignationReason: r.resignationReason,
                announcementTitle: r.announcementTitle
            });
        });

        // 8. Recruitment Actions
        (recruitmentActions || []).filter(r => r && r.status === 'Pending').forEach(r => {
            items.push({
                ...r,
                name: r.candidateName,
                inboxType: 'Recruitment',
                inboxTitle: 'Recruitment Feedback',
                inboxSubtitle: `${r.candidateName} • ${r.jobTitle} • ${r.type}`,
                inboxIcon: 'rate_review',
                inboxIconColor: 'text-orange-600 bg-orange-100 dark:bg-orange-900/40',
                inboxBarColor: 'bg-orange-500',
                priority: r.priority || 'Medium',
                category: r.category || 'Staffing'
            });
        });

        // 9. Attendance Requests
        (attendanceRequests || []).filter(r => r && r.status === 'Pending').forEach(r => {
            items.push({
                ...r,
                inboxType: 'Attendance',
                inboxTitle: 'Attendance Regularization',
                inboxSubtitle: `${r.name} • ${r.type} • ${r.reason}`,
                inboxIcon: 'event_repeat',
                inboxIconColor: 'text-blue-600 bg-blue-100 dark:bg-blue-900/40',
                inboxBarColor: 'bg-blue-500',
                priority: r.priority || 'Medium',
                category: r.category || 'Attendance'
            });
        });

        // 10. Expenses
        (expenses || []).filter(r => r && r.status === 'Pending').forEach(r => {
            const categoryObj = systemSettings.expenseCategories.find(c => c.id === r.categoryId);
            const categoryName = categoryObj?.name || r.categoryId;
            const categoryLimit = categoryObj?.monthlyLimit;
            
            // Limit exceeded check logic (naive assumption for single expense value vs monthly limit)
            const isLimitExceeded = categoryLimit ? r.amount > categoryLimit : false;
            
            items.push({
                ...r,
                inboxType: 'Expense',
                inboxTitle: 'Expense Claim',
                inboxSubtitle: `${r.employeeName} • ${categoryName} • ${r.amount.toLocaleString()} ${r.currency}`,
                inboxIcon: 'receipt_long',
                inboxIconColor: isLimitExceeded ? 'text-rose-600 bg-rose-100 dark:bg-rose-900/40' : 'text-violet-600 bg-violet-100 dark:bg-violet-900/40',
                inboxBarColor: isLimitExceeded ? 'bg-rose-500' : 'bg-violet-500',
                priority: isLimitExceeded ? 'High' : (r.priority || 'Medium'),
                category: 'Financial',
                isLimitExceeded,
                limitWarning: isLimitExceeded ? `Exceeds Monthly Limit of ${categoryLimit?.toLocaleString()} ${systemSettings.compliance.currency}` : null
            });
        });

        return items
            // RBAC: Dept managers only see their own team's pending items
            .filter(item => {
                if (!scopedDept) return true;
                const emp = employees.find(e => e.id === (item.empId || ''));
                return emp?.dept === scopedDept;
            })
            .filter(item => inboxFilter === 'All' || item.inboxType === inboxFilter)
            .filter(item => !inboxSearch || item.name?.toLowerCase().includes(inboxSearch.toLowerCase()) || item.employeeName?.toLowerCase().includes(inboxSearch.toLowerCase()))
            .filter(item => !highValueOnly || item.priority === 'High')
            .sort((a, b) => {
                const priorityScore = (p: string) => ({ 'High': 3, 'Medium': 2, 'Low': 1 }[p] || 0);
                const scoreRef = priorityScore(b.priority || 'Low') - priorityScore(a.priority || 'Low');
                const dateA = parseGregorianDate(a.submittedDate || a.date || a.timestamp || '2000-01-01').getTime();
                const dateB = parseGregorianDate(b.submittedDate || b.date || b.timestamp || '2000-01-01').getTime();
                return scoreRef || (dateB - dateA);
            });
    }, [leaveRequests, otRequests, loans, adjustments, projectPayments, locationSnapshots, jobActivityChanges, recruitmentActions, attendanceRequests, expenses, systemSettings, employees, inboxFilter, inboxSearch, highValueOnly, parseGregorianDate, scopedDept]);

    // Phase 9: Absence Analytics Aggregation Engine (Shift-Aware)
    const MOCK_TODAY = getCurrentDateISO();

    const todayHoliday = useMemo(() => {
        return holidays.find(h => h.date === MOCK_TODAY);
    }, [holidays, MOCK_TODAY]);

    const absenteeBreakdown = useMemo(() => {
        const breakdown: Record<string, {
            location: string;
            dept: string;
            expected: number;
            present: number;
            absent: number;
            onLeave: number;
            pending: number;
            absenteeNames: { name: string; id: string; status: string; shiftTime: string; leaveStatus?: string }[];
            presentNames: string[];
            onLeaveNames: string[];
        }> = {};

        // 1. Identify all employees scheduled for today (Filtered at source for RBAC)
        const scheduledAssignments = shiftAssignments
            .filter(sa => sa.date === MOCK_TODAY)
            .filter(sa => {
                if (!scopedDept) return true;
                const emp = employees.find(e => e.id === sa.empId);
                return emp?.dept === scopedDept;
            });
        
        scheduledAssignments.forEach(sa => {
            const emp = employees.find(e => e.id === sa.empId);
            if (!emp) return;

            const loc = sa.location || emp.officeLocation || 'HQ Office';
            const dept = sa.dept || emp.dept || 'General';
            const key = `${loc}-${dept}`;

            if (!breakdown[key]) {
                breakdown[key] = {
                    location: loc,
                    dept: dept,
                    expected: 0,
                    present: 0,
                    absent: 0,
                    onLeave: 0,
                    pending: 0,
                    absenteeNames: [],
                    presentNames: [],
                    onLeaveNames: []
                };
            }

            breakdown[key].expected++;

            const shift = shifts.find(s => s.id === sa.shiftId) || shifts[0];
            const shiftTime = `${shift?.start || '09:00'} - ${shift?.end || '18:00'}`;
            
            // Check Attendance Log
            const log = attendanceLogs.find(l => l.empId === emp.id && l.date === MOCK_TODAY);
            
            if (log && (log.status === 'Present' || log.status === 'Late')) {
                breakdown[key].present++;
                breakdown[key].presentNames.push(emp.name);
            } else {
                // Check Leave
                const leave = leaveRequests.find(lr => 
                    lr.empId === emp.id && 
                    lr.status === 'Approved' && 
                    MOCK_TODAY >= lr.startDate && 
                    MOCK_TODAY <= lr.endDate
                );

                if (leave || (log && log.status === 'On Leave')) {
                    breakdown[key].onLeave++;
                    breakdown[key].onLeaveNames.push(emp.name);
                } else {
                    // Shift-Aware Check: Dynamic Grace Period (uses live real-time clock)
                    const [nowH, nowM] = liveNowTime.split(':').map(Number);
                    const [shiftH, shiftM] = (shift?.start || '09:00').split(':').map(Number);
                    
                    const nowTotalM = nowH * 60 + nowM;
                    const shiftStartM = shiftH * 60 + shiftM;
                    const thresholdM = shiftStartM + (systemSettings.compliance.attendanceGracePeriod || 15);

                    if (nowTotalM > thresholdM) {
                        breakdown[key].absent++;
                        
                        // Check for Pending Leaves to provide HR insight
                        const pendingLeave = leaveRequests.find(lr => 
                            lr.empId === emp.id && 
                            lr.status === 'Pending' && 
                            MOCK_TODAY >= lr.startDate && 
                            MOCK_TODAY <= lr.endDate
                        );

                        breakdown[key].absenteeNames.push({
                            name: emp.name,
                            id: emp.id,
                            status: 'Absent',
                            shiftTime,
                            leaveStatus: pendingLeave ? `Pending ${pendingLeave.type} Leave` : 'No Leave Request'
                        });
                    } else {
                        breakdown[key].pending++;
                    }
                }
            }
        });

        return Object.values(breakdown).sort((a, b) => b.absent - a.absent);
    }, [shiftAssignments, employees, attendanceLogs, leaveRequests, shifts, holidays, MOCK_TODAY, liveNowTime, systemSettings]);

    const dashboardTotals = useMemo(() => {
        return absenteeBreakdown.reduce((acc, curr) => ({
            expected: acc.expected + curr.expected,
            present: acc.present + curr.present,
            absent: acc.absent + curr.absent,
            onLeave: acc.onLeave + curr.onLeave,
            pending: acc.pending + curr.pending
        }), { expected: 0, present: 0, absent: 0, onLeave: 0, pending: 0 });
    }, [absenteeBreakdown]);

    // ── Live Headcount — replaces hardcoded 1,240 ────────────────────────────
    const activeHeadcount = useMemo(() =>
        employees.filter(e => e.status === 'Active').length,
    [employees]);

    // ── Department Breakdown — replaces hardcoded "850 (68%)" ────────────────
    const deptBreakdown = useMemo(() => {
        const active = employees.filter(e => e.status === 'Active');
        const total = active.length;
        const groups: Record<string, number> = {};
        active.forEach(e => { const d = e.dept || 'Other'; groups[d] = (groups[d] || 0) + 1; });
        return Object.entries(groups)
            .map(([dept, count]) => ({ dept, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);
    }, [employees]);

    // ── OT Monitor — replaces hardcoded 80/82 hrs ────────────────────────────
    const otMonitorData = useMemo(() => {
        const now = new Date();
        const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const scoped = scopedDept
            ? otRequests.filter(r => employees.find(e => e.id === r.empId)?.dept === scopedDept)
            : otRequests;
        const approved = scoped
            .filter(r => r.status === 'Approved' && r.date?.startsWith(ym))
            .reduce((s, r) => s + (r.otHours || 0), 0);
        const pending = scoped
            .filter(r => r.status === 'Pending' && r.date?.startsWith(ym))
            .reduce((s, r) => s + (r.otHours || 0), 0);
        const budget = (systemSettings as any).otBudgetHours ?? 80;
        const pct = budget > 0 ? Math.min(Math.round((approved / budget) * 100), 120) : 0;
        return { approved, pending, budget, overBudget: approved > budget, pct };
    }, [otRequests, employees, scopedDept, systemSettings]);

    // ── Visit Success Rate — geofence compliance for field agents today ───────
    const visitSuccessData = useMemo(() => {
        const todayLogs = attendanceLogs.filter(l => l.date === MOCK_TODAY);
        const fieldLogs = todayLogs.filter(l =>
            l.location === 'Customer Site' ||
            l.checkInMethod === 'GPS' ||
            l.checkInMethod === 'Mobile App'
        );
        const total = fieldLogs.length;
        const success = fieldLogs.filter(l => l.geofenceStatus !== 'Violation').length;
        return { total, success, pct: total > 0 ? Math.round((success / total) * 100) : null };
    }, [attendanceLogs, MOCK_TODAY]);

    // ── Pending counts — replace hardcoded 4 / 2 ────────────────────────────
    const pendingLeaveCount = useMemo(() =>
        pendingInboxItems.filter(i => i.inboxType === 'Leave').length,
    [pendingInboxItems]);
    const pendingLoanCount = useMemo(() =>
        pendingInboxItems.filter(i => i.inboxType === 'Loan').length,
    [pendingInboxItems]);
    const highPriorityLeaveCount = useMemo(() =>
        pendingInboxItems.filter(i => i.inboxType === 'Leave' && i.priority === 'High').length,
    [pendingInboxItems]);
    const totalLoanValueLabel = useMemo(() => {
        const total = pendingInboxItems
            .filter(i => i.inboxType === 'Loan')
            .reduce((s, i) => s + ((i as any).loanAmount || 0), 0);
        return total >= 100_000 && systemSettings.compliance.currency === 'MMK' 
            ? `${Math.round(total / 100_000)} Lakhs` 
            : `${total.toLocaleString()} ${systemSettings.compliance.currency}`;
    }, [pendingInboxItems]);

    const unacknowledgedAnnouncementsCount = useMemo(() => 
        announcements.filter(a => a.status === 'Published' && a.requiresAcknowledgement).length,
    [announcements]);

    const handlePostAnnouncement = () => {
        setIsAnnouncementModalOpen(true);
    };

    const submitAnnouncement = () => {
        if (!newAnnSubject || !newAnnBody) return;
        
        createAnnouncement({
            title: newAnnSubject,
            content: newAnnBody,
            targetFilters: {
                dept: newAnnTargetDept === 'All' ? undefined : newAnnTargetDept,
                location: newAnnTargetLoc === 'All' ? undefined : newAnnTargetLoc,
                empType: newAnnTargetEmpType === 'All' ? undefined : newAnnTargetEmpType
            },
            requiresAcknowledgement: newAnnAckRequired,
            isHoliday,
            holidayDate: isHoliday ? holidayDate : undefined
        } as any);

        // Reset
        setNewAnnSubject(''); setNewAnnBody(''); setNewAnnTargetDept('All');
        setNewAnnTargetLoc('All'); setNewAnnTargetEmpType('All');
        setNewAnnAckRequired(false); setIsHoliday(false); setHolidayDate('');
        setIsAnnouncementModalOpen(false);
    };

    const handleAction = (type: string, id: string, action: 'Approve' | 'Reject') => {
        const res = handleInboxAction(type, id, action, currentAdminId);
        if (!res.success) {
            alert(res.message);
        }
    };

    const handleExportByGroups = async () => {
        setIsExporting(true);
        try {
            const BOM = "\uFEFF";
            let csvContent = BOM + "=== SECURITY AUDIT LOGS ===\r\n";
            csvContent += "Timestamp,Device ID,Auth Method,Status,Employee ID\r\n";
            securityAuditLogs.forEach(log => {
                const empId = log.empId || "N/A";
                csvContent += `"${log.timestamp}","${log.deviceId}","${log.authMethod}","${log.status}","${empId}"\r\n`;
            });
            
            csvContent += "\r\n=== FINANCIAL COMPLIANCE ===\r\n";
            csvContent += "Ref ID,Employee Name,Category,Sub-Type/Rule,Amount,Currency\r\n";
            const financialItems = pendingInboxItems.filter(i => i.category === 'Financial');
            financialItems.forEach(i => {
                const amount = i.amount ?? 0;
                let subType = i.inboxType || i.type || 'General';
                if (i.penaltyRuleId) {
                    const rule = systemSettings.penaltyRules?.find((r:any) => r.id === i.penaltyRuleId);
                    if (rule) subType = `Penalty: ${rule.name}`;
                }
                csvContent += `"${i.id}","${i.name || i.employeeName}","${i.category}","${subType}","${amount}","${i.currency || systemSettings.compliance.currency}"\r\n`;
            });

            const reportHash = await generateAuditHash(currentAdminId, new Date().toISOString(), csvContent.length);
            csvContent += `\r\n# AUDIT HASH: ${reportHash}\r\n`;

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `HRMS_Audit_Report_${getCurrentDateISO()}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            addDocumentToLibrary({
                title: `Executive Snapshot: Security & Financial`,
                description: `Board-level audit report containing security logs and pending financial items. Hash: ${reportHash}`,
                category: 'Payroll Summary',
                sourceModule: 'Home',
                fileContent: csvContent,
                period: getCurrentDateISO().slice(0, 7),
                generatedBy: currentAdminId,
                isMandatory: true,
                tags: ['Board Audit', 'Compliance', 'Security'],
                relatedRecordId: reportHash
            } as any, currentAdminId);

        } catch (e) {
            console.error("Export failed", e);
        } finally {
            setIsExporting(false);
            const exportAlert: any = {
                id: `EXP-${Date.now()}`,
                type: 'success',
                message: 'Excel Export Complete: Financial values cast as Numbers for SUM calculations.',
                timestamp: getFormattedDate(new Date(), 'time'),
                isRead: false
            };
            setAlerts(prev => [exportAlert, ...prev]);
        }
    };

    return (
        <div className="flex h-screen w-full font-display text-slate-900 dark:text-white antialiased overflow-hidden bg-background-light dark:bg-background-dark">
            <Sidebar activeTab="Home" />

            <main className="flex-1 flex flex-col h-full overflow-hidden relative ml-[280px]">
                <Header
                    title="Good Morning, Htet Aung"
                    subtitle="Visualize workforce trends, monitor real-time metrics, and leverage AI to optimize your HR strategy"
                >
                    <div className="hidden md:flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-4 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800 shadow-sm mt-1">
                        <span className="size-2 bg-emerald-500 rounded-full animate-pulse"></span>
                        <span className="text-[10px] font-bold tracking-wide uppercase">● System Live | Last Sync: {lastUpdated}</span>
                    </div>
                </Header>
                <div className="flex-1 overflow-y-auto p-6 md:pt-8 md:pb-10 px-8 bg-[#F8FAFC]">
                    <div className="max-w-7xl mx-auto space-y-8">
                            
                            {todayHoliday && (
                                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-4 text-white shadow-lg flex items-center justify-between group overflow-hidden relative">
                                    <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 opacity-10 group-hover:scale-110 transition-transform duration-700">
                                        <span className="material-symbols-outlined text-[120px]">beach_access</span>
                                    </div>
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className="bg-white/20 p-3 rounded-full backdrop-blur-md">
                                            <span className="material-symbols-outlined text-3xl">local_palm_trees</span>
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold">🏝️ Holiday Mode Active</h2>
                                            <p className="text-blue-50 text-sm font-medium">Today is {todayHoliday.name}. Absences are temporarily muted for off-duty staff.</p>
                                        </div>
                                    </div>
                                    <div className="relative z-10">
                                        <span className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-bold border border-white/30 transition-all cursor-default">
                                            Public Holiday
                                        </span>
                                    </div>
                                </div>
                            )}

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                            <div className="bg-white dark:bg-[#182130] p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-start min-h-[280px] h-full group hover:border-primary/40 hover:shadow-md transition-all relative">
                                <div className="w-full flex flex-col items-start gap-3 mb-2">
                                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium whitespace-nowrap">Total Employees</p>
                                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-2 rounded-lg flex items-center justify-center shadow-sm">
                                        <span className="material-symbols-outlined text-primary text-2xl">groups</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-start gap-1 w-full mt-auto">
                                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white leading-none mb-1">{activeHeadcount.toLocaleString()}</h3>
                                    <div className="flex items-center gap-2 mb-3">
                                        <p className="text-xs text-slate-400">{employees.length} total records</p>
                                    </div>
                                    <div className="w-full pt-3 border-t border-slate-100 dark:border-slate-800">
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mb-1">Department Split</p>
                                        <div className="flex flex-col gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                                            {deptBreakdown.map(d => (
                                                <div key={d.dept} className="flex justify-between items-center">
                                                    <span>{d.dept}:</span>
                                                    <span className="font-semibold text-slate-700 dark:text-slate-200">{d.count} ({d.pct}%)</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-[#182130] p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col min-h-[280px] h-full group hover:border-primary/40 hover:shadow-md transition-all relative">
                                <div className="w-full mb-3">
                                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium whitespace-nowrap text-left">Today's Attendance</p>
                                </div>
                                <div className="flex items-center justify-between w-full mb-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                                    <div className="flex flex-col items-center flex-1">
                                        <span className="text-2xl font-bold text-slate-500">{dashboardTotals.expected}</span>
                                        <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wide mt-1">Expected</span>
                                    </div>
                                    <div className="w-px h-8 bg-slate-100 dark:bg-slate-700"></div>
                                    <div className="flex flex-col items-center flex-1">
                                        <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{dashboardTotals.present}</span>
                                        <span className="text-[10px] uppercase font-semibold text-emerald-600/80 dark:text-emerald-400/80 tracking-wide mt-1">Present</span>
                                    </div>
                                    <div className="w-px h-8 bg-slate-100 dark:bg-slate-700"></div>
                                    <div className="flex flex-col items-center flex-1" onClick={() => {
                                        setSelectedAbsenteeGroup({ dept: 'All', location: 'All', type: 'Absent' });
                                        setIsAbsenteeModalOpen(true);
                                    }} style={{ cursor: 'pointer' }}>
                                        <span className="text-2xl font-bold text-orange-500">{dashboardTotals.absent}</span>
                                        <span className="text-[10px] uppercase font-semibold text-orange-500/80 tracking-wide mt-1">Absent</span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 mb-auto w-full">
                                    <div className="flex items-center justify-between px-2 py-1.5 rounded bg-slate-50 dark:bg-slate-800/50 overflow-hidden">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-blue-500 text-[18px]">beach_access</span>
                                            <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">On Leave</span>
                                        </div>
                                        <span className="text-sm font-bold text-slate-800 dark:text-white whitespace-nowrap">{dashboardTotals.onLeave}</span>
                                    </div>
                                    <div className="flex items-center justify-between px-2 py-1.5 rounded bg-slate-50 dark:bg-slate-800/50 overflow-hidden">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-amber-500 text-[18px]">update</span>
                                            <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">Shift Pending</span>
                                        </div>
                                        <span className="text-sm font-bold text-slate-800 dark:text-white whitespace-nowrap">{dashboardTotals.pending}</span>
                                    </div>
                                </div>
                                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">Real-time status</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="size-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                        <span className="text-[10px] text-emerald-600 font-bold uppercase">Live</span>
                                    </div>
                                </div>
                            </div>
                            <div className={`p-4 rounded-xl border ${pendingInboxItems.some(i => i.priority === 'High') ? 'border-red-500 bg-red-50/10 dark:bg-red-900/10' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-[#182130]'} shadow-sm flex flex-col items-start min-h-[280px] h-full group hover:border-primary/40 hover:shadow-md transition-all relative`}>
                                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-4 text-left w-full">Pending Approvals</p>
                                <ul className="space-y-3 flex-1 flex flex-col w-full">
                                    <li className="flex items-center justify-between text-base h-8">
                                        <span className="flex items-center text-slate-700 dark:text-slate-300">
                                            <span className="size-2 rounded-full bg-amber-400 shrink-0 mr-2"></span>
                                            <span>Leaves</span>
                                            {highPriorityLeaveCount > 0 && (
                                                <span className="inline-flex items-center justify-center text-[10px] font-bold text-white bg-red-600 border border-red-500 px-2 py-0.5 rounded ml-2 h-5 animate-pulse">
                                                    <span className="material-symbols-outlined text-[12px] mr-1">priority_high</span>
                                                    CRITICAL
                                                </span>
                                            )}
                                        </span>
                                        <span className="font-bold text-slate-900 dark:text-white tabular-nums">{pendingLeaveCount}</span>
                                    </li>
                                    <li className="flex items-center justify-between text-base h-8">
                                        <span className="flex items-center text-slate-700 dark:text-slate-300">
                                            <span className="size-2 rounded-full bg-blue-400 shrink-0 mr-2"></span>
                                            <span>Loans</span>
                                            {pendingLoanCount > 0 && (
                                                <span className={`inline-flex items-center justify-center text-[10px] font-bold ${pendingInboxItems.some(i => i.inboxType === 'Loan' && i.priority === 'High') ? 'text-white bg-red-600 border border-red-500 animate-pulse' : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600'} px-2 py-0.5 rounded ml-2 h-5`}>
                                                    {pendingInboxItems.some(i => i.inboxType === 'Loan' && i.priority === 'High') ? (
                                                        <>
                                                            <span className="material-symbols-outlined text-[12px] mr-1">warning</span>
                                                            URGENT
                                                        </>
                                                    ) : totalLoanValueLabel}
                                                </span>
                                            )}
                                        </span>
                                        <span className="font-bold text-slate-900 dark:text-white tabular-nums">{pendingLoanCount}</span>
                                    </li>
                                    {unacknowledgedAnnouncementsCount > 0 && (
                                        <li className="flex items-center justify-between text-base h-8">
                                            <span className="flex items-center text-slate-700 dark:text-slate-300">
                                                <span className="size-2 rounded-full bg-amber-400 shrink-0 mr-2"></span>
                                                <span>Ack. Required</span>
                                                <span className="inline-flex items-center justify-center text-[10px] font-bold text-white bg-amber-600 border border-amber-500 px-2 py-0.5 rounded ml-2 h-5 animate-pulse">
                                                    PENDING
                                                </span>
                                            </span>
                                            <span className="font-bold text-slate-900 dark:text-white tabular-nums">{unacknowledgedAnnouncementsCount}</span>
                                        </li>
                                    )}
                                </ul>
                            </div>
                            {isCompanyWideAdmin && (
                                <div className="bg-white dark:bg-[#182130] p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-start min-h-[280px] h-full group hover:border-primary/40 hover:shadow-md transition-all relative">
                                    <div className="w-full flex flex-col items-start gap-3 mb-2">
                                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium text-left underline decoration-primary/30 underline-offset-4">Last Payroll (Oct 30)</p>
                                    </div>
                                    <div className="flex flex-col items-start gap-1 w-full mt-auto">
                                        <h3 className="text-[32px] font-bold text-slate-900 dark:text-white leading-none mb-1 whitespace-nowrap">
                                            {lastPayrollTotal.toFixed(1)} L
                                        </h3>
                                        <p className="text-xs text-slate-400 mb-4 flex items-center gap-1.5">
                                            Status:
                                            <span className={`font-bold uppercase text-[10px] px-1.5 py-0.5 rounded ${lastPayrollStatus === 'Disbursed'
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : lastPayrollStatus === 'Approved'
                                                        ? 'bg-blue-100 text-blue-700'
                                                        : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                {lastPayrollStatus}
                                            </span>
                                        </p>
                                        <div className="w-full pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 h-[42px]">
                                            <span className="text-slate-500 dark:text-slate-400 text-[10px] font-semibold whitespace-nowrap flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[14px]">account_balance</span> KBZ: Ready
                                            </span>
                                            <button className="px-2.5 py-1 rounded bg-[#4F46E5] text-white text-[10px] font-bold shadow-sm hover:translate-y-[-1px] transition-transform">Details</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {!isCompanyWideAdmin && (
                                <div className="bg-white dark:bg-[#182130] p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-start min-h-[280px] h-full group hover:border-primary/40 hover:shadow-md transition-all relative">
                                    <div className="w-full flex flex-col items-start gap-3 mb-2">
                                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium whitespace-nowrap">Team Attendance Rate</p>
                                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-lg flex items-center justify-center shadow-sm">
                                            <span className="material-symbols-outlined text-emerald-600 text-2xl">group_add</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-start gap-1 w-full mt-auto">
                                        <h3 className="text-[32px] font-bold text-slate-900 dark:text-white leading-none mb-1 whitespace-nowrap">
                                            {dashboardTotals.expected > 0 ? Math.round(((dashboardTotals.present + dashboardTotals.onLeave) / dashboardTotals.expected) * 100) : 0}%
                                        </h3>
                                        <p className="text-xs text-slate-400 mb-4">Coverage this shift</p>
                                        <div className="w-full pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 h-[42px]">
                                            <span className="text-slate-500 dark:text-slate-400 text-[10px] font-semibold whitespace-nowrap">
                                                Team Expected: {dashboardTotals.expected}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {!isCompanyWideAdmin && visitSuccessData.pct !== null && (
                                <div className="bg-white dark:bg-[#182130] p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-start min-h-[280px] h-full group hover:border-primary/40 hover:shadow-md transition-all relative">
                                    <div className="w-full flex flex-col items-start gap-3 mb-2">
                                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium whitespace-nowrap">Field Force Pulse</p>
                                        <div className="bg-sky-50 dark:bg-sky-900/20 p-2 rounded-lg flex items-center justify-center shadow-sm">
                                            <span className="material-symbols-outlined text-sky-600 text-2xl">radar</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-start gap-1 w-full mt-auto">
                                        <h3 className="text-[32px] font-bold text-slate-900 dark:text-white leading-none mb-1 whitespace-nowrap">
                                            {visitSuccessData.pct}%
                                        </h3>
                                        <p className="text-xs text-slate-400 mb-4">Visit Success Rate</p>
                                        <div className="w-full pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-1.5 h-[42px]">
                                            <div className="flex justify-between items-center text-[11px]">
                                                <span className="text-slate-500">Total Visits:</span>
                                                <span className="font-bold text-slate-700 dark:text-slate-200">{visitSuccessData.total}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[11px]">
                                                <span className="text-slate-500">Compliant:</span>
                                                <span className="font-bold text-emerald-600">{visitSuccessData.success}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 flex flex-col bg-white dark:bg-[#182130] rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary">inbox</span>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Centralized Inbox</h3>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                                            <input
                                                type="text"
                                                placeholder="Search name..."
                                                value={inboxSearch}
                                                onChange={(e) => setInboxSearch(e.target.value)}
                                                className="pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-primary/20 outline-none w-40 transition-all focus:w-56 shadow-sm"
                                            />
                                        </div>

                                        <button
                                            onClick={() => setHighValueOnly(!highValueOnly)}
                                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all shadow-sm ${highValueOnly
                                                    ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:border-red-900/50'
                                                    : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                                                }`}
                                        >
                                            <span className={`material-symbols-outlined text-[16px] ${highValueOnly ? 'fill' : ''}`}>priority_high</span>
                                            High Value
                                        </button>

                                        <span className="text-xs font-semibold text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">{pendingInboxItems.length} Pending</span>
                                        {/* Filter Button + Dropdown */}
                                        <div className="relative">
                                            <button
                                                onClick={() => setShowFilterDropdown(v => !v)}
                                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors shadow-sm ${inboxFilter !== 'All'
                                                        ? 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-700'
                                                        : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                                                    }`}
                                                title="Filter by type"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">filter_list</span>
                                                {inboxFilter !== 'All' ? INBOX_TYPE_LABELS[inboxFilter] : 'Filter'}
                                            </button>
                                            {showFilterDropdown && (
                                                <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                                    {INBOX_TYPES.map(t => (
                                                        <button
                                                            key={t}
                                                            onClick={() => { setInboxFilter(t); setShowFilterDropdown(false); }}
                                                            className={`w-full text-left px-4 py-2.5 text-xs font-medium transition-colors flex items-center justify-between ${inboxFilter === t
                                                                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold'
                                                                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                                                }`}
                                                        >
                                                            {INBOX_TYPE_LABELS[t]}
                                                            {inboxFilter === t && <span className="material-symbols-outlined text-[14px]">check</span>}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6 space-y-5">
                                    {/* Active filter chip */}
                                    {inboxFilter !== 'All' && (
                                        <div className="flex items-center gap-2">
                                            <span className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
                                                <span className="material-symbols-outlined text-[13px]">filter_list</span>
                                                {INBOX_TYPE_LABELS[inboxFilter]}
                                                <button onClick={() => setInboxFilter('All')} className="ml-1 hover:opacity-70">
                                                    <span className="material-symbols-outlined text-[13px]">close</span>
                                                </button>
                                            </span>
                                            <span className="text-[11px] text-slate-400">{pendingInboxItems.filter(i => i.inboxType === inboxFilter).length} result{pendingInboxItems.filter(i => i.inboxType === inboxFilter).length !== 1 ? 's' : ''}</span>
                                        </div>
                                    )}
                                    {pendingInboxItems.length === 0 && (
                                        <div className="text-center py-12 text-sm text-slate-500 flex flex-col items-center gap-2 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                                            <span className="material-symbols-outlined text-[48px] text-emerald-400 mb-2">check_circle</span>
                                            <p className="text-base font-bold text-slate-700 dark:text-slate-300">Compliance Clear</p>
                                            <p className="text-xs text-slate-400">Total operational alignment achieved. No pending requests.</p>
                                        </div>
                                    )}
                                    {pendingInboxItems.map(item => (
                                        <div key={item.id} className={`flex items-center p-4 rounded-lg border hover:border-indigo-300 transition-colors relative overflow-hidden bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 min-h-[92px] ${item.category === 'Financial' ? 'border-l-4 border-l-red-500' :
                                                item.category === 'Attendance' ? 'border-l-4 border-l-blue-500' :
                                                    'border-l-4 border-l-emerald-500'
                                            }`}>
                                            {/* Watermark Removal Logic: Ensure no absolute overlay text exists here */}
                                            <div className={`size-12 rounded-2xl mr-4 shrink-0 flex items-center justify-center ${item.inboxIconColor}`}>
                                                <span className="material-symbols-outlined">{item.inboxIcon}</span>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{item.inboxTitle}</h4>
                                                    <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border leading-none ${item.priority === 'High' ? 'bg-red-50 text-red-600 border-red-100' :
                                                            item.priority === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                                'bg-slate-50 text-slate-600 border-slate-100'
                                                        }`}>{item.priority}</span>
                                                </div>
                                                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider leading-none">{item.category}</p>
                                                <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 flex flex-col gap-1">
                                                    <span>{item.inboxSubtitle}</span>
                                                    {item.resignationReason && (
                                                        <span className="text-[11px] italic text-slate-500 line-clamp-1">"{(item as any).resignationReason}"</span>
                                                    )}
                                                    {item.inboxType === 'JobActivity' && item.type === 'Resignation' && item.assetsHeld > 0 && (
                                                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded flex items-center gap-1 w-fit mt-0.5 border border-amber-100">
                                                            <span className="material-symbols-outlined text-[14px]">inventory_2</span>
                                                            Employee still holds {item.assetsHeld} active asset{item.assetsHeld !== 1 ? 's' : ''}.
                                                        </span>
                                                    )}
                                                    {item.inboxType === 'Attendance' && item.shiftTime && (
                                                        <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full w-fit flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-[12px]">schedule</span>
                                                            Shift: {item.shiftTime} | Requested: {item.time}
                                                        </span>
                                                    )}
                                                    {item.inboxType === 'Expense' && (
                                                        <div className="flex flex-col gap-1 mt-1">
                                                            {item.limitWarning && (
                                                                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded flex items-center gap-1 w-fit border border-rose-100">
                                                                    <span className="material-symbols-outlined text-[14px]">error</span>
                                                                    {item.limitWarning}
                                                                </span>
                                                            )}
                                                            {item.attachments && item.attachments.length > 0 && (
                                                                <div className="flex items-center gap-2 flex-wrap mt-1">
                                                                    {item.attachments.map((url: string, idx: number) => (
                                                                        <a 
                                                                            key={idx} 
                                                                            href={url} 
                                                                            target="_blank" 
                                                                            rel="noreferrer"
                                                                            className="flex items-center gap-1 text-[10px] font-bold bg-slate-100 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded transition-colors border border-slate-200 hover:border-indigo-200"
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        >
                                                                            <span className="material-symbols-outlined text-[12px]">receipt</span>
                                                                            View Receipt {idx + 1}
                                                                        </a>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 justify-end shrink-0 ml-4">
                                                {/* View icon: navigates to the relevant module */}
                                                {item.inboxType === 'JobActivity' ? (
                                                    <Link
                                                        to={`/employees/${item.empId}?modal=${item.type === 'Resignation' ? 'resign' : 'salary_review'}&requestId=${item.id}`}
                                                        className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors border border-transparent hover:border-indigo-100 h-10 w-10 flex items-center justify-center"
                                                        title="Review and Approve in Profile"
                                                    >
                                                        <span className="material-symbols-outlined text-[20px]">open_in_new</span>
                                                    </Link>
                                                ) : INBOX_TYPE_ROUTES[item.inboxType] ? (
                                                    <Link
                                                        to={INBOX_TYPE_ROUTES[item.inboxType]}
                                                        className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors border border-transparent hover:border-indigo-100 h-10 w-10 flex items-center justify-center"
                                                        title={`View in ${INBOX_TYPE_LABELS[item.inboxType]}`}
                                                    >
                                                        <span className="material-symbols-outlined text-[20px]">open_in_new</span>
                                                    </Link>
                                                ) : null}
                                                {item.inboxType === 'LocationSnapshot' ? (
                                                    <button className="text-indigo-600 hover:bg-indigo-50 px-4 h-10 rounded-lg border border-indigo-100 text-xs font-bold transition-colors whitespace-nowrap">Review Map</button>
                                                ) : item.isConflict ? (
                                                    <button 
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setTriageItem(item);
                                                            setIsTriageModalOpen(true);
                                                        }}
                                                        className="bg-amber-500 hover:bg-amber-600 text-white px-4 h-10 rounded-lg shadow-sm text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">difference</span>
                                                        Resolve Conflict
                                                    </button>
                                                ) : (
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                handleAction(item.inboxType, item.id, 'Reject');
                                                            }}
                                                            className="text-slate-400 hover:text-red-500 hover:bg-red-50 h-10 w-10 flex items-center justify-center rounded-lg transition-colors border border-transparent hover:border-red-100"
                                                            title="Reject"
                                                        >
                                                            <span className="material-symbols-outlined text-[20px]">close</span>
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                handleAction(item.inboxType, item.id, 'Approve');
                                                            }}
                                                            className="bg-emerald-500 hover:bg-emerald-600 text-white h-10 w-10 flex items-center justify-center rounded-lg shadow-sm transition-colors"
                                                            title="Approve"
                                                        >
                                                            <span className="material-symbols-outlined text-[20px]">check</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex flex-col gap-6 h-full">
                                <div className="bg-sky-50 dark:bg-sky-900/20 rounded-xl border border-sky-100 dark:border-sky-800/50 shadow-sm p-5 flex-1">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-bold text-sky-900 dark:text-sky-100 flex items-center gap-2 text-sm">
                                            <span>📢</span> Announcements
                                        </h3>
                                        <button onClick={handlePostAnnouncement} className="text-[10px] font-bold bg-white dark:bg-sky-900 text-sky-600 dark:text-sky-300 px-2 py-1 rounded border border-sky-200 dark:border-sky-700 hover:bg-sky-100 transition-colors shadow-sm" style={{ backgroundColor: '#4F46E5', color: 'white', borderColor: '#4F46E5' }}>
                                            + Post New
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {announcements.map(ann => (
                                            <div key={ann.id} className="bg-white/60 dark:bg-sky-900/30 p-3 rounded-lg border border-sky-100 dark:border-sky-800/50 transition-all hover:bg-white/80">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{ann.title}</p>
                                                        {ann.acknowledgmentRequired && <span className="shrink-0 text-[9px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded shadow-sm leading-none drop-shadow-sm flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">priority_high</span> Acknowledge</span>}
                                                    </div>
                                                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug line-clamp-2">{ann.content}</p>
                                                    
                                                    {ann.targetFilters && (Object.values(ann.targetFilters).some(v => v !== undefined)) && (
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {ann.targetFilters.dept && <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">domain</span>{ann.targetFilters.dept}</span>}
                                                            {ann.targetFilters.location && <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">location_on</span>{ann.targetFilters.location}</span>}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {announcements.length === 0 && (
                                            <div className="p-4 text-center text-xs text-slate-500 font-medium">No active announcements</div>
                                        )}
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-[#182130] rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col h-full max-h-[400px]">
                                    <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
                                        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            <span className="material-symbols-outlined text-rose-500">gpp_bad</span>
                                            Security & Auth Logs
                                        </h3>
                                    </div>
                                    <div className="p-6 space-y-3 flex-1 overflow-y-auto">
                                        {securityAuditLogs && securityAuditLogs.length > 0 ? (
                                            [...securityAuditLogs].reverse().slice(0, 10).map((log) => (
                                                <div key={log.id} className="flex items-start gap-3 border-b border-slate-50 dark:border-slate-800/50 pb-3 last:border-0 last:pb-0">
                                                    <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${log.status === 'Failed' ? 'bg-rose-50 dark:bg-rose-900/40 text-rose-500' : 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-500'}`}>
                                                        <span className="material-symbols-outlined text-[18px]">
                                                            {log.status === 'Failed' ? 'gpp_maybe' : 'verified_user'}
                                                        </span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between gap-1">
                                                            <p className={`text-xs font-bold truncate ${log.status === 'Failed' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                                                                {log.status === 'Failed' ? 'Failed Auth Attempt' : 'Auth Success'}
                                                            </p>
                                                            <span className="text-[9px] text-slate-400 shrink-0">{log.timestamp.includes('T') ? log.timestamp.split('T')[1].substring(0, 5) : log.timestamp}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                            <span className="text-[10px] font-medium text-slate-500 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded">{log.authMethod}</span>
                                                            <span className="text-[10px] text-slate-400 truncate max-w-[80px]">via {log.deviceId}</span>
                                                            {log.empId && (
                                                                <>
                                                                    <span className="text-[10px] text-slate-300">•</span>
                                                                    <span className="text-[10px] font-bold text-indigo-500">ID: {log.empId}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="py-8 text-center flex flex-col items-center justify-center h-full opacity-60">
                                                <span className="material-symbols-outlined text-slate-300 text-4xl mb-2">security</span>
                                                <p className="text-xs text-slate-500 font-medium">No recent security events</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-[#182130] rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col">
                                    <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800">
                                        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            <span className="material-symbols-outlined text-slate-400">timer</span>
                                            Overtime Monitor
                                        </h3>
                                    </div>
                                    <div className="p-6 flex flex-col justify-center gap-4 h-full">
                                        <div>
                                            <div className="flex justify-between text-xs mb-2">
                                                <span className="text-slate-500">Budget (This Month)</span>
                                                <span className="font-medium text-slate-900 dark:text-white">{otMonitorData.budget} hrs</span>
                                            </div>
                                            <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                <div className="h-full bg-slate-300 dark:bg-slate-500" style={{ width: '100%' }}></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-xs mb-2">
                                                <span className="text-slate-500">Actual Approved</span>
                                                <span className={`font-medium ${otMonitorData.overBudget ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                    {otMonitorData.approved} hrs
                                                </span>
                                            </div>
                                            <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                <div className={`h-full ${otMonitorData.overBudget ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${otMonitorData.pct}%` }}></div>
                                            </div>
                                            {otMonitorData.overBudget && (
                                                <p className="text-[11px] font-medium text-rose-600 mt-2 flex items-center gap-1.5 bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded border border-rose-100 dark:border-rose-900/30 w-fit">
                                                    ⚠️ {scopedDept || 'Organization'} is {otMonitorData.pct - 100}% over budget
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Phase 9: Daily Absences by Location & Department Breakdown */}
                        <div className="bg-white dark:bg-[#182130] rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                            <div className="px-6 py-4 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="bg-orange-50 dark:bg-orange-900/20 p-2 rounded-lg">
                                        <span className="material-symbols-outlined text-orange-600 text-xl">person_off</span>
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-slate-900 dark:text-white">Daily Absences by Location & Department</h3>
                                        <p className="text-xs text-slate-500 font-medium tracking-tight">Real-time staffing visibility based on {liveNowTime} check-in status ({systemSettings.compliance.attendanceGracePeriod}m grace)</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={async () => {
                                            const BOM = "\uFEFF";
                                            let csv = BOM + "Department,Location,Expected,Present,Absent,OnLeave,CoveragePct\r\n";
                                            absenteeBreakdown.forEach(g => {
                                                const cov = g.expected > 0 ? Math.round((g.present / g.expected) * 100) : 0;
                                                csv += `"${g.dept}","${g.location}",${g.expected},${g.present},${g.absent},${g.onLeave},${cov}%\r\n`;
                                            });

                                            const reportHash = await generateAuditHash(currentAdminId, new Date().toISOString(), csv.length);
                                            csv += `\r\n# AUDIT HASH: ${reportHash}\r\n`;

                                            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                                            const link = document.createElement("a");
                                            link.href = URL.createObjectURL(blob);
                                            link.download = `Daily_Absences_${MOCK_TODAY}.csv`;
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                            
                                            addDocumentToLibrary({
                                                title: `Daily Absence Report (${MOCK_TODAY})`,
                                                description: `Automated export of Daily Absences. Hash: ${reportHash}`,
                                                category: 'Attendance Report',
                                                sourceModule: 'Home',
                                                fileContent: csv,
                                                relatedRecordId: reportHash,
                                                permissions: ['Admin']
                                            } as any, currentAdminId);

                                            const exportLog = {
                                                id: `EXP-ABS-${Date.now()}`,
                                                type: 'info' as const,
                                                message: 'Daily Absence CSV Export generated successfully.',
                                                timestamp: getFormattedDate(new Date(), 'time'),
                                                isRead: false
                                            };
                                            setAlerts(prev => [exportLog, ...prev]);
                                        }}
                                        className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                                        title="Export Report"
                                    >
                                        <span className="material-symbols-outlined text-xl">more_vert</span>
                                    </button>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-sm">
                                    <thead>
                                        <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                            <th className="px-6 py-3">Location / Department</th>
                                            <th className="px-6 py-3 text-center">Expected</th>
                                            <th className="px-6 py-3 text-center">Present</th>
                                            <th className="px-6 py-3 text-center">Absent</th>
                                            <th className="px-6 py-3 text-center">On Leave</th>
                                            <th className="px-6 py-3 text-center">Coverage</th>
                                            <th className="px-6 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                        {absenteeBreakdown.every(g => g.absent === 0) ? (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-12 text-center">
                                                    <div className="flex flex-col items-center justify-center text-slate-400">
                                                                        <p className="text-xs mt-1">Zero unverified absences detected across all locations.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            <Fragment>
                                                {absenteeBreakdown.map((group, idx) => {
                                                    const coveragePerc = group.expected > 0 ? Math.round((group.present / group.expected) * 100) : 0;
                                                    const isUnderstaffed = coveragePerc < 80 && !todayHoliday;

                                                    return (
                                                        <tr key={idx} className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                                                            <td className="px-6 py-4">
                                                                <div className="flex flex-col">
                                                                    <span className="font-bold text-slate-900 dark:text-white capitalize">{group.dept}</span>
                                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{group.location}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-center font-bold text-slate-600 dark:text-slate-400 tabular-nums">
                                                                {group.expected}
                                                            </td>
                                                            <td className="px-6 py-4 text-center font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                                                {group.present}
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <span className={`font-bold tabular-nums ${group.absent > 0 ? 'text-orange-500' : 'text-slate-300'}`}>
                                                                    {group.absent}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-center font-bold text-blue-500 tabular-nums">
                                                                {group.onLeave}
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <div className="flex flex-col items-center gap-1.5">
                                                                    <div className="w-16 bg-slate-100 dark:bg-slate-700 h-1 rounded-full overflow-hidden">
                                                                        <div
                                                                            className={`h-full transition-all duration-1000 ${coveragePerc > 90 ? 'bg-emerald-500' : coveragePerc > 75 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                                                            style={{ width: `${coveragePerc}%` }}
                                                                        ></div>
                                                                    </div>
                                                                    <span className={`text-[10px] font-black ${coveragePerc > 90 ? 'text-emerald-600' : coveragePerc > 75 ? 'text-amber-600' : 'text-rose-600'}`}>
                                                                        {coveragePerc}%
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    {isUnderstaffed && (
                                                                        <span className="animate-pulse bg-rose-50 text-rose-600 text-[9px] font-black px-1.5 py-0.5 rounded border border-rose-100 uppercase tracking-tighter mr-2">
                                                                            Understaffed
                                                                        </span>
                                                                    )}
                                                                    <button
                                                                        onClick={() => {
                                                                            setSelectedAbsenteeGroup({ dept: group.dept, location: group.location, type: 'Absent' });
                                                                            setIsAbsenteeModalOpen(true);
                                                                        }}
                                                                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
                                                                    >
                                                                        View Absentees
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </Fragment>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* OT Conflict Triage Modal */}
            {isTriageModalOpen && triageItem && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-[#182130] w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-amber-50 dark:bg-amber-900/20">
                            <div className="flex items-center gap-3">
                                <div className="bg-amber-100 dark:bg-amber-900/40 p-2 rounded-lg">
                                    <span className="material-symbols-outlined text-amber-600">difference</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Resolve Overtime Conflict</h3>
                                    <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Multiple requests detected for {triageItem.name} on {triageItem.date}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsTriageModalOpen(false)} className="p-2 hover:bg-white/50 rounded-full transition-colors">
                                <span className="material-symbols-outlined text-slate-500">close</span>
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-100 dark:bg-slate-800 hidden md:block"></div>
                                
                                {/* Slot A: Biometric (Current Triage Item if it is biometric) */}
                                {(triageItem.source === 'Biometric' 
                                    ? [triageItem, (otRequests || []).find(r => r.empId === triageItem.empId && r.date === triageItem.date && r.source !== 'Biometric' && r.status === 'Pending')] 
                                    : [(otRequests || []).find(r => r.empId === triageItem.empId && r.date === triageItem.date && r.source === 'Biometric' && r.status === 'Pending'), triageItem]
                                ).map((req, idx) => (
                                    <div key={idx} className={`p-5 rounded-xl border-2 transition-all flex flex-col h-full bg-white dark:bg-slate-800 ${req ? 'border-indigo-100 dark:border-indigo-900/30 shadow-sm' : 'border-dashed border-slate-200 dark:border-slate-700 opacity-50 flex items-center justify-center'}`}>
                                        {req ? (
                                            <>
                                                <div className="flex items-center justify-between mb-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${req.source === 'Biometric' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'}`}>
                                                        {req.source} Source
                                                    </span>
                                                    <span className="text-xs font-bold text-slate-400">ID: {req.id}</span>
                                                </div>
                                                <div className="space-y-4 flex-1">
                                                    <div>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Shift & Time</p>
                                                        <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight mb-0.5">{req.shiftName}</p>
                                                        <p className="text-xs text-slate-500">{req.otHours} Hours requested</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 leading-none">Reason</p>
                                                        <p className="text-sm text-slate-600 dark:text-slate-400 italic">"{req.reason}"</p>
                                                    </div>
                                                    {req.biometricDeviceId && (
                                                        <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded border border-slate-100 dark:border-slate-800">
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 leading-none">Hardware ID</p>
                                                            <p className="text-xs font-mono text-indigo-600 dark:text-indigo-400">{req.biometricDeviceId}</p>
                                                        </div>
                                                    )}
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        const reqs = (triageItem.source === 'Biometric' 
                                                            ? [triageItem, (otRequests || []).find(r => r.empId === triageItem.empId && r.date === triageItem.date && r.source !== 'Biometric' && r.status === 'Pending')] 
                                                            : [(otRequests || []).find(r => r.empId === triageItem.empId && r.date === triageItem.date && r.source === 'Biometric' && r.status === 'Pending'), triageItem]
                                                        );
                                                        const otherReq = reqs[idx === 0 ? 1 : 0];
                                                        
                                                        if (!otherReq) {
                                                            alert("Error: Missing clashing request ID. Manual resolution required.");
                                                            return;
                                                        }
                                                        resolveOTConflict(req.id, otherReq.id, 'ADM-001');
                                                        setIsTriageModalOpen(false);
                                                        setTriageItem(null);
                                                    }}
                                                    className={`mt-6 w-full py-3 rounded-xl font-bold transition-all shadow-lg hover:translate-y-[-2px] active:translate-y-0 ${req.source === 'Biometric' ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 dark:shadow-none' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 dark:shadow-none'}`}
                                                >
                                                    Approve {req.source} & Void Other
                                                </button>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-10 opacity-60">
                                                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">find_replace</span>
                                                <p className="text-slate-400 text-xs italic text-center px-4">No matching pending request found for this source.</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="mt-6 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-100 dark:border-orange-800/30 flex items-start gap-3">
                                <span className="material-symbols-outlined text-orange-600 mt-0.5">warning</span>
                                <div className="text-xs text-orange-800 dark:text-orange-300 leading-relaxed font-medium">
                                    <p className="font-bold mb-1 uppercase tracking-tight">System Notice:</p>
                                    <p>{triageItem.conflictNote || "Multiple data entries detected for the same date. Managers must verify which source represents the actual work performed."}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#111827] flex justify-end">
                            <button 
                                onClick={() => {
                                    setIsTriageModalOpen(false);
                                    setTriageItem(null);
                                }}
                                className="px-6 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                            >
                                Cancel & Review Later
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Announcement Dispatcher Modal */}
            {isAnnouncementModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in px-4">
                    <div className="bg-white dark:bg-[#1e293b] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-[#182130] shrink-0">
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#4F46E5]">campaign</span> Targeted Announcement Dispatcher
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5 font-medium">Reach specific departments or locations instantly</p>
                            </div>
                            <button onClick={() => setIsAnnouncementModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-6 flex-1 min-h-0 overflow-y-auto space-y-5 text-left">
                            <div>
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5 uppercase tracking-wider">Subject / Title <span className="text-red-500">*</span></label>
                                <input 
                                    type="text" 
                                    className="w-full text-sm p-3 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-[#4F46E5] focus:border-[#4F46E5] bg-white dark:bg-slate-900 dark:text-white shadow-sm"
                                    placeholder="e.g. Quarterly Town Hall Meeting"
                                    value={newAnnSubject}
                                    onChange={(e) => setNewAnnSubject(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5 uppercase tracking-wider">Message Body (Rich Text Support) <span className="text-red-500">*</span></label>
                                <textarea 
                                    rows={4}
                                    className="w-full text-sm p-3 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-[#4F46E5] focus:border-[#4F46E5] bg-white dark:bg-slate-900 dark:text-white shadow-sm resize-none"
                                    placeholder="Enter your message details here..."
                                    value={newAnnBody}
                                    onChange={(e) => setNewAnnBody(e.target.value)}
                                ></textarea>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5 uppercase tracking-wider">Department</label>
                                    <select 
                                        className="w-full text-sm p-3 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-[#4F46E5] focus:border-[#4F46E5] bg-white dark:bg-slate-900 dark:text-white shadow-sm"
                                        value={newAnnTargetDept}
                                        onChange={(e) => setNewAnnTargetDept(e.target.value)}
                                    >
                                        <option value="All">All Departments</option>
                                        <option value="Engineering">Engineering</option>
                                        <option value="Product Dept">Product Dept</option>
                                        <option value="Sales">Sales</option>
                                        <option value="Marketing">Marketing</option>
                                        <option value="HR & Admin">HR & Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5 uppercase tracking-wider">Location</label>
                                    <select 
                                        className="w-full text-sm p-3 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-[#4F46E5] focus:border-[#4F46E5] bg-white dark:bg-slate-900 dark:text-white shadow-sm"
                                        value={newAnnTargetLoc}
                                        onChange={(e) => setNewAnnTargetLoc(e.target.value)}
                                    >
                                        <option value="All">All Locations</option>
                                        <option value="HQ Office">HQ Office</option>
                                        <option value="Branch - Mandalay">Branch - Mandalay</option>
                                        <option value="Warehouse A">Warehouse A</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5 uppercase tracking-wider">Emp. Type</label>
                                    <select 
                                        className="w-full text-sm p-3 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-[#4F46E5] focus:border-[#4F46E5] bg-white dark:bg-slate-900 dark:text-white shadow-sm"
                                        value={newAnnTargetEmpType}
                                        onChange={(e) => setNewAnnTargetEmpType(e.target.value)}
                                    >
                                        <option value="All">All Staff</option>
                                        <option value="Permanent">Permanent</option>
                                        <option value="Contract">Contractual</option>
                                        <option value="Probation">Probation</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#182130] flex justify-end gap-3 shrink-0">
                            <button onClick={() => setIsAnnouncementModalOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={submitAnnouncement}
                                disabled={!newAnnSubject || !newAnnBody}
                                className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="material-symbols-outlined text-[18px]">send</span>
                                Dispatch Announcement
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Phase 9: Absentee Drill-Down Modal */}
            {isAbsenteeModalOpen && selectedAbsenteeGroup && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in p-4">
                    <div className="bg-white dark:bg-[#182130] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[80vh]">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="bg-rose-50 dark:bg-rose-900/20 p-2.5 rounded-xl">
                                    <span className="material-symbols-outlined text-rose-600">group_off</span>
                                </div>
                                <div className="text-left">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                        Absence Detail: {selectedAbsenteeGroup.dept}
                                    </h3>
                                    <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 flex items-center gap-1.5 rounded h-6 w-fit mb-2">
                                        <span className="material-symbols-outlined text-[14px]">location_on</span> 
                                        {selectedAbsenteeGroup.location} • {getCurrentDateISO()}
                                    </span>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsAbsenteeModalOpen(false)}
                                className="size-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-0">
                            <div className="bg-amber-50 dark:bg-amber-900/10 p-4 border-b border-amber-100 dark:border-amber-900/20">
                                <div className="flex gap-3">
                                    <span className="material-symbols-outlined text-amber-500 text-xl">info</span>
                                    <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed font-medium">
                                        These employees have not clocked in for their scheduled shifts. Cross-referencing leave requests to filter sanctioned vs unsanctioned absences.
                                    </p>
                                </div>
                            </div>

                            <div className="p-0">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                            <th className="px-6 py-3">Employee</th>
                                            <th className="px-6 py-3">Scheduled Shift</th>
                                            <th className="px-6 py-3">Conflict Insight</th>
                                            <th className="px-6 py-3 text-right">Primary Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {absenteeBreakdown.find(g => g.dept === selectedAbsenteeGroup.dept && g.location === selectedAbsenteeGroup.location)?.absenteeNames?.map((absentee, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500 text-xs">
                                                            {absentee.name.charAt(0)}
                                                        </div>
                                                        <div className="flex flex-col text-left">
                                                            <span className="text-sm font-bold text-slate-900 dark:text-white">{absentee.name}</span>
                                                            <span className="text-[10px] text-slate-400 font-medium">ID: {absentee.id}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                                                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                                                        {absentee.shiftTime}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-xs font-semibold ${absentee.leaveStatus?.includes('Pending') ? 'text-amber-600' : 'text-rose-600'}`}>
                                                        {absentee.leaveStatus}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button className="text-[11px] font-black text-indigo-600 hover:underline uppercase tracking-tighter">
                                                        Contact
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                            <button 
                                onClick={() => setIsAbsenteeModalOpen(false)}
                                className="px-6 py-2 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 transition-colors"
                            >
                                Close
                            </button>
                            <button 
                                onClick={() => {
                                    setIsAbsenteeModalOpen(false);
                                }}
                                className="px-6 py-2 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 transition-all"
                            >
                                Reconcile Leaves
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
