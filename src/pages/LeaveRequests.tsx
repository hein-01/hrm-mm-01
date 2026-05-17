import React, { useState } from 'react';
import DropdownMenu from '../components/DropdownMenu';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useAppData } from '../context/AppDataContext';
import { useSystemCalendar } from '../context/SystemCalendarContext';
import { countWorkingDays } from '../utils/leaveBalance';
import { useNotifications } from '../context/NotificationProvider';
import { useApprovals } from '../context/ApprovalContext';

export default function LeaveRequests() {
    const { leaveRequests, approveLeave, rejectLeave, addLeaveRequest, employees, holidays, policies, isAdmin, systemSettings } = useAppData();
    const { createApprovalRequest } = useApprovals();
    const ADMIN_ID = 'ADM-001';
    const isCurrentUserAdmin = isAdmin(ADMIN_ID);
    const { parseGregorianDate, getFormattedDate } = useSystemCalendar();
    const { pushNotification } = useNotifications();
    const [activeFilter, setActiveFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [deptFilter, setDeptFilter] = useState('All');
    const [dateRangeStart, setDateRangeStart] = useState('');
    const [dateRangeEnd, setDateRangeEnd] = useState('');
    const [rejectTarget, setRejectTarget] = useState<{ ids: string[], isBulk: boolean } | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [bulkToast, setBulkToast] = useState<{ count: number, days: number } | null>(null);
    const [historyTarget, setHistoryTarget] = useState<string | null>(null);
    const [relieverSearch, setRelieverSearch] = useState('');
    const [relieverDropdownOpen, setRelieverDropdownOpen] = useState(false);
    const [certFileName, setCertFileName] = useState<string | null>(null);
    const [isShaking, setIsShaking] = useState(false);

    // Form State
    const [newRequest, setNewRequest] = useState({
        empId: '',
        type: 'Casual',
        startDate: '',
        endDate: '',
        relieverId: '',
        reason: '',
        hasCert: false,
        isAdminOverride: false
    });

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) setSelectedIds(filteredRequests.map(r => r.id));
        else setSelectedIds([]);
    };

    const handleSelectRow = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleStatusChange = (id: string, newStatus: string) => {
        if (newStatus === 'Approved') {
            const req = leaveRequests.find(r => r.id === id);
            const result = approveLeave(id, ADMIN_ID);
            if (!result.success) {
                setErrorMsg(result.message);
                setTimeout(() => setErrorMsg(null), 5000);
            } else if (req) {
                pushNotification({
                    title: 'Leave Request Approved ✅',
                    body: `${req.name}'s ${req.type} Leave (${req.durationStr}, ${req.totalDays} day${req.totalDays !== 1 ? 's' : ''}) has been approved.`,
                    category: 'HR', priority: 'high',
                    icon: 'beach_access',
                    iconBg: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400',
                    actionRoute: '/leave-requests', actionLabel: 'View Leave',
                    badge: 'Approved', badgeColor: 'blue', empId: req.empId, sourceId: id,
                });
            }
        } else if (newStatus === 'Rejected') {
            setRejectTarget({ ids: [id], isBulk: false });
        }
    };

    const handleForceApprove = (id: string) => {
        const req = leaveRequests.find(r => r.id === id);
        const result = approveLeave(id, ADMIN_ID, true);
        if (!result.success) {
            setErrorMsg(result.message);
            setTimeout(() => setErrorMsg(null), 5000);
        } else if (req) {
            pushNotification({
                title: 'Admin Override: Leave Approved ⚡',
                body: `${req.name}'s ${req.type} Leave was force-approved (conflict override) by admin.`,
                category: 'HR', priority: 'high',
                icon: 'admin_panel_settings',
                iconBg: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600 dark:text-amber-400',
                actionRoute: '/leave-requests', actionLabel: 'View Leave',
                badge: 'Override', badgeColor: 'amber', empId: req.empId, sourceId: id,
            });
        }
    };

    const handleBulkStatusChange = (newStatus: string) => {
        if (newStatus === 'Rejected') {
            setRejectTarget({ ids: [...selectedIds], isBulk: true });
            return;
        }
        const balanceFreeTypes = ['Unpaid', 'Maternity', 'Paternity'];
        const errors: string[] = [];
        let successCount = 0;
        let totalDaysDeducted = 0;
        selectedIds.forEach(id => {
            const req = leaveRequests.find(r => r.id === id);
            const result = approveLeave(id, ADMIN_ID);
            if (!result.success) {
                errors.push(result.message);
            } else {
                successCount++;
                if (req && !balanceFreeTypes.includes(req.type)) totalDaysDeducted += req.totalDays;
            }
        });
        if (successCount > 0) {
            setBulkToast({ count: successCount, days: totalDaysDeducted });
            setTimeout(() => setBulkToast(null), 5000);
            pushNotification({
                title: `${successCount} Leave Request${successCount !== 1 ? 's' : ''} Approved`,
                body: `Bulk approval processed: ${successCount} request${successCount !== 1 ? 's' : ''}, ${totalDaysDeducted} working day${totalDaysDeducted !== 1 ? 's' : ''} deducted from balances.`,
                category: 'HR', priority: 'normal',
                icon: 'done_all',
                iconBg: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400',
                actionRoute: '/leave-requests', actionLabel: 'View All',
                badge: `${successCount} Approved`, badgeColor: 'blue',
            });
        }
        if (errors.length > 0) {
            setErrorMsg(`${errors.length} request(s) could not be processed: ${errors[0]}`);
            setTimeout(() => setErrorMsg(null), 7000);
        }
        setSelectedIds([]);
    };

    const filteredRequests = leaveRequests.filter(r => {
        const matchesFilter = activeFilter === 'All' || r.status === activeFilter;
        const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             r.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             r.empId.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDept = deptFilter === 'All' || r.dept === deptFilter;
        const matchesDateRange =
            (!dateRangeStart || r.startDate >= dateRangeStart) &&
            (!dateRangeEnd   || r.startDate <= dateRangeEnd);
        return matchesFilter && matchesSearch && matchesDept && matchesDateRange;
    });

    const confirmRejection = () => {
        if (!rejectReason.trim() || !rejectTarget) return;
        const errors: string[] = [];
        const rejectedNames: string[] = [];
        rejectTarget.ids.forEach(id => {
            const req = leaveRequests.find(r => r.id === id);
            const result = rejectLeave(id, ADMIN_ID, rejectReason.trim());
            if (!result.success) errors.push(result.message);
            else if (req) rejectedNames.push(req.name);
        });
        if (rejectedNames.length > 0) {
            const isBulk = rejectedNames.length > 1;
            pushNotification({
                title: isBulk ? `${rejectedNames.length} Leave Requests Rejected` : `Leave Request Rejected`,
                body: isBulk
                    ? `${rejectedNames.slice(0, 2).join(', ')}${rejectedNames.length > 2 ? ` +${rejectedNames.length - 2} more` : ''} — Reason: ${rejectReason.trim()}`
                    : `${rejectedNames[0]}'s leave request was rejected. Reason: ${rejectReason.trim()}`,
                category: 'HR', priority: 'normal',
                icon: 'cancel',
                iconBg: 'bg-rose-100 dark:bg-rose-900/30', iconColor: 'text-rose-600 dark:text-rose-400',
                actionRoute: '/leave-requests', actionLabel: 'View Requests',
                badge: 'Rejected', badgeColor: 'rose',
            });
        }
        if (errors.length > 0) {
            setErrorMsg(`${errors.length} rejection(s) failed: ${errors[0]}`);
            setTimeout(() => setErrorMsg(null), 7000);
        }
        setRejectTarget(null);
        setRejectReason('');
        setSelectedIds([]);
    };

    const exportToCSV = () => {
        const headers = ['ID', 'Employee', 'Dept', 'Leave Type', 'Start Date', 'End Date', 'Working Days', 'Status', 'Reason', 'Reliever', 'Submitted', 'Approved By', 'Rejected By', 'Rejection Reason'];
        const rows = filteredRequests.map(r => [
            r.id, r.name, r.dept, r.type, r.startDate, r.endDate, r.totalDays, r.status,
            `"${(r.reason || '').replace(/"/g, '""')}"`, r.relieverName, r.submitted,
            r.approvedBy || '', r.rejectedBy || '',
            `"${(r.rejectionReason || '').replace(/"/g, '""')}"`
        ]);
        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `leave-requests-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const checkConflict = (req: any) => {
        return leaveRequests.some(r => {
            if (r.id === req.id || r.status !== 'Approved') return false;
            const overlaps = !(req.endDate < r.startDate || req.startDate > r.endDate);
            if (!overlaps) return false;
            return r.empId === req.empId || r.empId === req.relieverId;
        });
    };

    const handleFormSubmit = () => {
        const emp = employees.find(e => e.id === newRequest.empId);
        const reliever = employees.find(e => e.id === newRequest.relieverId);

        if (!emp || !reliever) {
            setErrorMsg('Invalid Employee or Reliever ID. Please use EMP-XXX format.');
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 500);
            return;
        }
        if (newRequest.empId === newRequest.relieverId) {
            setErrorMsg('Reliever cannot be the same person as the applicant.');
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 500);
            return;
        }
        if (!newRequest.startDate || !newRequest.endDate) {
            setErrorMsg('Both start and end dates are required.');
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 500);
            return;
        }
        if (newRequest.endDate < newRequest.startDate) {
            setErrorMsg('End date cannot be before start date.');
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 500);
            return;
        }
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        const startDateObj = parseGregorianDate(newRequest.startDate);
        if (startDateObj < threeMonthsAgo) {
            setErrorMsg('Leave cannot be backdated more than 3 months.');
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 500);
            return;
        }
        const diffDays = countWorkingDays(newRequest.startDate, newRequest.endDate, holidays);
        if (diffDays === 0) {
            setErrorMsg('Selected date range contains no working days (all weekends or public holidays).');
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 500);
            return;
        }

        // Balance Check Warning
        const balanceFreeTypes = ['Unpaid', 'Maternity', 'Paternity'];
        if (!balanceFreeTypes.includes(newRequest.type)) {
            const currentBalance = emp.leaveBalances?.[newRequest.type] ?? 0;
            if (currentBalance < diffDays) {
                setErrorMsg(`Insufficient Balance: You have ${currentBalance} day(s) of ${newRequest.type} leave, but requested ${diffDays} day(s).`);
                setIsShaking(true);
                setTimeout(() => setIsShaking(false), 500);
                return;
            }
        }

        try {
            const newId = `LR-${Date.now()}`;
            addLeaveRequest({
                empId: newRequest.empId,
                name: emp.name,
                dept: emp.dept,
                avatar: emp.avatar || '',
                type: newRequest.type,
                durationStr: `${newRequest.startDate} – ${newRequest.endDate}`,
                totalDays: diffDays,
                startDate: newRequest.startDate,
                endDate: newRequest.endDate,
                relieverId: newRequest.relieverId,
                relieverName: reliever.name,
                reason: newRequest.reason,
                hasCert: newRequest.hasCert,
                certFileName: certFileName || undefined,
                isAdminOverride: newRequest.isAdminOverride,
                priority: 'Medium',
                category: 'Attendance'
            });
            
            // Create approval workflow
            createApprovalRequest({
                requestId: newId,
                requestType: 'Leave',
                requesterId: newRequest.empId,
                requesterName: emp.name,
                requesterDept: emp.dept,
                metadata: {
                    type: newRequest.type,
                    dates: `${newRequest.startDate} – ${newRequest.endDate}`,
                    days: diffDays,
                    reason: newRequest.reason,
                },
                peerId: newRequest.relieverId,
                peerName: reliever.name,
            });
            
            setIsModalOpen(false);
            setNewRequest({ empId: '', type: 'Casual', startDate: '', endDate: '', relieverId: '', reason: '', hasCert: false, isAdminOverride: false });
            setCertFileName(null);
            setRelieverSearch('');
        } catch (err: any) {
            setErrorMsg(err.message);
        }
    };

    const renderFilterBtn = (label: string, value: string) => {
        const isActive = activeFilter === value;
        return (
            <button
                onClick={() => setActiveFilter(value)}
                className={`px-4 py-1.5 text-xs font-bold rounded-full transition-colors ${isActive ? 'bg-[#4F46E5] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
                {label}
            </button>
        );
    };

    return (
        <div className="flex h-screen overflow-hidden bg-[#F8FAFC] dark:bg-background-dark font-display text-slate-900 dark:text-slate-100">
            <Sidebar activeTab="Leave Requests" />
            <main className="flex flex-col h-full overflow-hidden relative ml-[280px] flex-1">
                <Header 
                    title="Leave Requests" 
                    subtitle="Review and manage Myanmar office leave applications"
                >
                    <div className="relative w-full max-w-[480px] ml-4 hidden lg:block">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
                        <input
                            className="w-full border border-slate-200 dark:border-slate-700 rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent text-slate-900 placeholder-slate-400 bg-white dark:bg-slate-900 transition-all shadow-sm"
                            placeholder="Search by name, ID, or reason..."
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </Header>

                <div className="flex-1 overflow-y-auto px-8 pb-6 bg-[#F8FAFC] dark:bg-[#101622]">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 mt-8">
                        <div className="flex items-center gap-2 overflow-x-auto">
                            {renderFilterBtn('All Requests', 'All')}
                            {renderFilterBtn('Pending', 'Pending')}
                            {renderFilterBtn('Approved', 'Approved')}
                            {renderFilterBtn('Rejected', 'Rejected')}
                            <div className="h-4 w-px bg-slate-300 mx-2"></div>
                            <DropdownMenu
                                value={deptFilter}
                                onChange={setDeptFilter}
                                options={[
                                    { value: 'All', label: 'All Departments' },
                                    ...(systemSettings.departments || []).sort((a, b) => a.order - b.order).map(d => ({
                                        value: d.name,
                                        label: d.name,
                                        subLabel: `Code: ${d.code}`,
                                    }))
                                ]}
                            />
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-600">
                                <span className="material-symbols-outlined text-[18px] shrink-0">calendar_month</span>
                                <input
                                    type="date"
                                    value={dateRangeStart}
                                    onChange={e => setDateRangeStart(e.target.value)}
                                    className="bg-transparent border-none text-xs text-slate-600 focus:ring-0 w-[108px] cursor-pointer"
                                />
                                <span className="text-slate-400">–</span>
                                <input
                                    type="date"
                                    value={dateRangeEnd}
                                    onChange={e => setDateRangeEnd(e.target.value)}
                                    className="bg-transparent border-none text-xs text-slate-600 focus:ring-0 w-[108px] cursor-pointer"
                                />
                                {(dateRangeStart || dateRangeEnd) && (
                                    <button onClick={() => { setDateRangeStart(''); setDateRangeEnd(''); }} className="text-slate-400 hover:text-slate-600 ml-0.5">
                                        <span className="material-symbols-outlined text-[14px]">close</span>
                                    </button>
                                )}
                            </div>
                            <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-all shadow-sm">
                                <span className="material-symbols-outlined text-[18px]">download</span>
                                <span>Export CSV</span>
                            </button>
                            <button onClick={() => { setErrorMsg(null); setIsModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 text-white text-xs font-bold rounded-lg hover:opacity-90 transition-all shadow-sm bg-[#4F46E5]">
                                <span className="material-symbols-outlined text-[18px]">add</span>
                                <span>Request Leave</span>
                            </button>
                        </div>
                    </div>
                    {errorMsg && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 mb-6 animate-shake">
                            <span className="material-symbols-outlined text-red-600">error</span>
                            <p className="text-sm text-red-800 font-bold">{errorMsg}</p>
                        </div>
                    )}
                    
                    {(() => {
                        const todayISO = new Date().toISOString().split('T')[0];
                        const next = holidays.filter(h => h.date >= todayISO).sort((a, b) => a.date.localeCompare(b.date))[0];
                        if (!next) return null;
                        const daysUntil = Math.ceil((new Date(next.date).getTime() - new Date(todayISO).getTime()) / 86400000);
                        const when = daysUntil === 0 ? 'Today!' : daysUntil === 1 ? 'Tomorrow!' : `in ${daysUntil} days`;
                        return (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 mb-6">
                                <span className="material-symbols-outlined text-amber-600">warning</span>
                                <p className="text-sm text-amber-800 font-medium">
                                    Upcoming Public Holiday: <strong>{next.name}</strong> ({next.date}) — {when}.
                                    {next.isRestricted && <span className="ml-2 text-red-700 font-bold">[Restricted — Admin Override Required]</span>}
                                    {' '}Expect high leave volumes.
                                </p>
                            </div>
                        );
                    })()}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 text-left">
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-start justify-between border-l-4 border-l-amber-500">
                            <div>
                                <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Pending Approvals</p>
                                <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                                    {leaveRequests.filter(r => r.status === 'Pending').length}
                                </h3>
                                <p className="text-amber-600 dark:text-amber-400 text-xs font-medium mt-2 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">hourglass_empty</span> action required
                                </p>
                            </div>
                            <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 p-2 rounded-lg">
                                <span className="material-symbols-outlined">pending_actions</span>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-start justify-between border-l-4 border-l-emerald-500">
                            <div>
                                <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Approved This Month</p>
                                <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                                    {leaveRequests.filter(r => r.status === 'Approved').length}
                                </h3>
                                <p className="text-emerald-600 dark:text-emerald-400 text-xs font-medium mt-2">Processed successfully</p>
                            </div>
                            <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 p-2 rounded-lg">
                                <span className="material-symbols-outlined">check_circle</span>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-start justify-between border-l-4 border-l-indigo-500">
                            <div>
                                <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Staff On Leave Today</p>
                                <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                                    {employees.filter(e => e.status === 'On Leave').length}
                                </h3>
                                <p className="text-indigo-600 dark:text-indigo-400 text-xs font-medium mt-2">Active absences</p>
                            </div>
                            <div className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 p-2 rounded-lg">
                                <span className="material-symbols-outlined">flight_takeoff</span>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-start justify-between border-l-4 border-l-red-500">
                            <div>
                                <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Restricted Dates</p>
                                <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                                    {holidays.filter(h => h.isRestricted).length}
                                </h3>
                                <p className="text-red-600 dark:text-red-400 text-xs font-medium mt-2">Override required</p>
                            </div>
                            <div className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-2 rounded-lg">
                                <span className="material-symbols-outlined">block</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse" style={{ minWidth: '1500px' }}>
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                        <th className="px-6 py-4 w-10 sticky left-0 z-20 bg-slate-50 dark:bg-slate-800 sticky-col">
                                            <input
                                                className="rounded border-slate-300 text-[#4F46E5] focus:ring-[#4F46E5] cursor-pointer"
                                                type="checkbox"
                                                onChange={handleSelectAll}
                                                checked={filteredRequests.length > 0 && selectedIds.length === filteredRequests.length}
                                            />
                                        </th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider sticky left-[62px] z-20 bg-slate-50 dark:bg-slate-800/50 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)] min-w-[200px]">Employee</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Request Details</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Leave Type</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Duration</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Reason</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                     {filteredRequests.map(req => {
                                        const hasConflict = checkConflict(req);
                                        return (
                                        <tr key={req.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.includes(req.id) ? 'bg-indigo-50/50' : ''} ${hasConflict && req.status === 'Pending' ? 'border-l-4 border-l-red-500 bg-red-50/30' : ''}`}>
                                            <td className="px-6 py-4 sticky left-0 z-10 bg-white dark:bg-slate-900 sticky-col">
                                                <input
                                                    className="rounded border-slate-300 text-[#4F46E5] focus:ring-[#4F46E5] cursor-pointer"
                                                    type="checkbox"
                                                    checked={selectedIds.includes(req.id)}
                                                    onChange={() => handleSelectRow(req.id)}
                                                />
                                            </td>
                                            <td className="px-6 py-4 sticky left-[62px] z-10 bg-white dark:bg-slate-900 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)] min-w-[200px]">
                                                <div className="flex items-center gap-3">
                                                    {req.avatar ? (
                                                        <div className="h-10 w-10 rounded-full bg-slate-200 bg-cover bg-center" style={{ backgroundImage: `url('${req.avatar}')` }}></div>
                                                    ) : (
                                                        <div className="h-10 w-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">{req.name.charAt(0)}</div>
                                                    )}
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900">{req.name}</p>
                                                        <p className="text-xs text-slate-500">ID: {req.empId} • {req.dept}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <p className="text-xs text-slate-500">Submitted: {req.submitted}</p>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[10px] text-slate-400 uppercase font-bold">Reliever:</span>
                                                        <div className="h-5 w-5 rounded-full bg-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-600">{req.relieverName.charAt(0)}</div>
                                                        <span className="text-xs font-medium text-slate-700">{req.relieverName}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-medium text-slate-700">{req.type}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-semibold text-slate-900">{req.durationStr}</p>
                                                <p className="text-xs text-slate-500">{req.totalDays}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm text-slate-600 line-clamp-1 max-w-[200px]">{req.reason}</p>
                                                    {req.hasCert && <span className="material-symbols-outlined text-[#4F46E5] text-sm" title="Medical Certificate Attached">attach_file</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                 <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${req.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                                                        req.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                                            'bg-amber-100 text-amber-700'
                                                    }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full mr-2 ${req.status === 'Approved' ? 'bg-emerald-500' :
                                                            req.status === 'Rejected' ? 'bg-red-500' :
                                                                'bg-amber-500'
                                                        }`}></span>{req.status}
                                                </span>
                                                {hasConflict && req.status === 'Pending' && (
                                                    <div className="mt-1 flex items-center gap-1 text-[10px] text-red-600 font-bold uppercase tracking-tighter">
                                                        <span className="material-symbols-outlined text-[12px]">warning</span> Conflict Detected
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right relative">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => setHistoryTarget(historyTarget === req.id ? null : req.id)} className="w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer" title="View History">
                                                        <span className="material-symbols-outlined text-[18px]">history</span>
                                                    </button>
                                                    {hasConflict && req.status === 'Pending' && isCurrentUserAdmin && (
                                                        <button onClick={() => handleForceApprove(req.id)} className="w-8 h-8 flex items-center justify-center bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg transition-colors cursor-pointer" title="Force Approve (Admin Override — Conflict exists)">
                                                            <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleStatusChange(req.id, 'Approved')} disabled={hasConflict && req.status === 'Pending'} className={`w-8 h-8 flex items-center justify-center bg-[#DEF7EC] text-emerald-600 rounded-lg transition-colors ${hasConflict && req.status === 'Pending' ? 'opacity-30 cursor-not-allowed' : 'hover:bg-emerald-100 cursor-pointer'}`} title={hasConflict && req.status === 'Pending' ? 'Cannot approve: date conflict detected' : 'Approve'}>
                                                        <span className="material-symbols-outlined text-[18px] font-bold">check</span>
                                                    </button>
                                                    <button onClick={() => handleStatusChange(req.id, 'Rejected')} className="w-8 h-8 flex items-center justify-center bg-[#FDE8E8] text-red-600 hover:bg-red-100 rounded-lg transition-colors cursor-pointer" title="Reject">
                                                        <span className="material-symbols-outlined text-[18px] font-bold">close</span>
                                                    </button>
                                                </div>
                                                {historyTarget === req.id && (
                                                    <div className="absolute right-4 top-full z-50 w-64 bg-white border border-slate-200 rounded-xl shadow-xl p-4 mt-1 text-left">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <p className="text-xs font-black text-slate-800 uppercase tracking-wider">Request History</p>
                                                            <button onClick={() => setHistoryTarget(null)} className="text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined text-[14px]">close</span></button>
                                                        </div>
                                                        {req.status === 'Approved' && req.approvedBy ? (
                                                            <div className="space-y-2">
                                                                <div className="flex items-center gap-2"><span className="material-symbols-outlined text-emerald-500 text-[16px]">check_circle</span><div><p className="text-[10px] text-slate-400 font-bold uppercase">Approved By</p><p className="text-xs font-bold text-slate-800">{req.approvedBy}</p></div></div>
                                                                <div className="flex items-center gap-2"><span className="material-symbols-outlined text-slate-400 text-[16px]">schedule</span><div><p className="text-[10px] text-slate-400 font-bold uppercase">Timestamp</p><p className="text-xs font-bold text-slate-800">{req.approvedAt || '—'}</p></div></div>
                                                                {req.isAdminOverride && <div className="mt-1 p-2 bg-amber-50 border border-amber-200 rounded-lg text-[10px] font-bold text-amber-700 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">admin_panel_settings</span> Admin Override Applied</div>}
                                                            </div>
                                                        ) : req.status === 'Rejected' && req.rejectedBy ? (
                                                            <div className="space-y-2">
                                                                <div className="flex items-center gap-2"><span className="material-symbols-outlined text-red-500 text-[16px]">cancel</span><div><p className="text-[10px] text-slate-400 font-bold uppercase">Rejected By</p><p className="text-xs font-bold text-slate-800">{req.rejectedBy}</p></div></div>
                                                                <div className="flex items-center gap-2"><span className="material-symbols-outlined text-slate-400 text-[16px]">schedule</span><div><p className="text-[10px] text-slate-400 font-bold uppercase">Timestamp</p><p className="text-xs font-bold text-slate-800">{req.rejectedAt || '—'}</p></div></div>
                                                                {req.rejectionReason && <div className="mt-2"><p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Reason</p><p className="text-xs text-slate-700 bg-red-50 border border-red-100 rounded p-2">{req.rejectionReason}</p></div>}
                                                            </div>
                                                        ) : (
                                                            <p className="text-xs text-slate-400">No decision recorded yet.</p>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                        );
                                    })}
                                    {filteredRequests.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-10 text-center text-slate-500 text-sm">No requests found for this filter.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {selectedIds.length > 0 && (
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 z-50 animate-fade-in fade-in-up">
                        <div className="flex items-center gap-2 border-r border-slate-700 pr-6">
                            <span className="text-white text-[12px] font-black h-6 w-6 rounded-full flex items-center justify-center bg-[#4F46E5]">{selectedIds.length}</span>
                            <span className="text-sm font-bold text-white">Selected</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => handleBulkStatusChange('Approved')} className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-full transition-colors">
                                <span className="material-symbols-outlined text-sm">check_circle</span>Approve Selected
                            </button>
                            <button onClick={() => handleBulkStatusChange('Rejected')} className="flex items-center gap-2 px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-full transition-colors">
                                <span className="material-symbols-outlined text-sm">cancel</span>Reject Selected
                            </button>
                        </div>
                        <button onClick={() => setSelectedIds([])} className="text-slate-400 hover:text-white ml-2">
                            <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                    </div>
                )}

                {bulkToast && (
                    <div className="fixed bottom-32 left-1/2 -translate-x-1/2 bg-emerald-700 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 z-50 animate-fade-in">
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        <span className="text-sm font-bold">{bulkToast.count} Request{bulkToast.count !== 1 ? 's' : ''} Approved</span>
                        {bulkToast.days > 0 && <span className="text-sm opacity-90">· {bulkToast.days} Day{bulkToast.days !== 1 ? 's' : ''} Deducted from Balances</span>}
                    </div>
                )}
            </main>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in px-4">
                    <div className={`bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 transition-transform duration-300 ${isShaking ? 'animate-shake' : ''}`}>
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-slate-900">New Leave Request</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar text-left text-slate-900 dark:text-slate-100">
                            {errorMsg && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 animate-shake">
                                    <span className="material-symbols-outlined text-red-600 text-[18px]">error</span>
                                    <p className="text-xs text-red-800 font-bold flex-1">{errorMsg}</p>
                                    <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-700">
                                        <span className="material-symbols-outlined text-[16px]">close</span>
                                    </button>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4 text-slate-900 dark:text-slate-100">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-slate-500">Applicant ID</label>
                                    <input value={newRequest.empId} onChange={e => setNewRequest({...newRequest, empId: e.target.value})} type="text" className="w-full text-sm p-2 border border-slate-200 rounded text-slate-900" placeholder="EMP-001" />
                                </div>
                                <div className="space-y-1 relative">
                                    <label className="text-[10px] font-bold uppercase text-slate-500">Reliever</label>
                                    {(() => {
                                        const selectedReliever = employees.find(e => e.id === newRequest.relieverId);
                                        const filtered = employees
                                            .filter(e => e.id !== newRequest.empId && e.status === 'Active' && (
                                                !relieverSearch ||
                                                e.name.toLowerCase().includes(relieverSearch.toLowerCase()) ||
                                                e.id.toLowerCase().includes(relieverSearch.toLowerCase())
                                            ))
                                            .sort((a, b) => a.name.localeCompare(b.name))
                                            .slice(0, 50);
                                        return (
                                            <>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={relieverDropdownOpen ? relieverSearch : (selectedReliever ? `${selectedReliever.name} (${selectedReliever.id})` : relieverSearch)}
                                                        onChange={e => { setRelieverSearch(e.target.value); setRelieverDropdownOpen(true); }}
                                                        onFocus={() => setRelieverDropdownOpen(true)}
                                                        onBlur={() => setTimeout(() => setRelieverDropdownOpen(false), 150)}
                                                        className={`w-full text-sm p-2 pr-8 border rounded text-slate-900 transition-colors ${(!newRequest.relieverId && errorMsg) ? 'border-red-500 bg-red-50/30' : 'border-slate-200 focus:border-indigo-500'}`}
                                                        placeholder="Search by name or ID..."
                                                    />
                                                    {selectedReliever && !relieverDropdownOpen && (
                                                        <button
                                                            type="button"
                                                            onMouseDown={(e) => { e.preventDefault(); setNewRequest(prev => ({...prev, relieverId: ''})); setRelieverSearch(''); }}
                                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                                        >
                                                            <span className="material-symbols-outlined text-[16px]">close</span>
                                                        </button>
                                                    )}
                                                </div>
                                                {relieverDropdownOpen && (
                                                    <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-white border border-slate-200 rounded shadow-lg max-h-48 overflow-y-auto">
                                                        {filtered.length === 0 ? (
                                                            <div className="px-3 py-2 text-xs text-slate-400">No employees match.</div>
                                                        ) : filtered.map(e => (
                                                            <button
                                                                key={e.id}
                                                                type="button"
                                                                onMouseDown={(ev) => {
                                                                    ev.preventDefault();
                                                                    setNewRequest(prev => ({...prev, relieverId: e.id}));
                                                                    setRelieverSearch('');
                                                                    setRelieverDropdownOpen(false);
                                                                }}
                                                                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-indigo-50 ${newRequest.relieverId === e.id ? 'bg-indigo-50 font-bold' : ''}`}
                                                            >
                                                                {e.name} <span className="text-slate-400">({e.id})</span> — <span className="text-slate-500">{e.dept}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-bold uppercase text-slate-500">Leave Type</label>
                                    {newRequest.empId && (() => {
                                        const emp = employees.find(e => e.id === newRequest.empId);
                                        if (!emp) return null;
                                        const free = ['Unpaid', 'Maternity', 'Paternity'].includes(newRequest.type);
                                        if (free) return <span className="text-[10px] font-bold text-slate-400">Balance-free type</span>;
                                        const bal = emp.leaveBalances?.[newRequest.type] ?? 0;
                                        return <span className={`text-[10px] font-bold ${bal === 0 ? 'text-red-500' : 'text-emerald-600'}`}>Available: {bal} day{bal !== 1 ? 's' : ''}</span>;
                                    })()}
                                </div>
                                <select value={newRequest.type} onChange={e => { setNewRequest({...newRequest, type: e.target.value}); setErrorMsg(null); }} className="w-full text-sm p-2 border border-slate-200 rounded text-slate-900">
                                    <option>Casual</option>
                                    <option>Medical</option>
                                    <option>Earned</option>
                                    <option>Unpaid</option>
                                    <option>Maternity</option>
                                    <option>Paternity</option>
                                    <option>Hospitalization</option>
                                    <option>Custom</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-slate-500">Start Date</label>
                                    <input value={newRequest.startDate} onChange={e => setNewRequest({...newRequest, startDate: e.target.value})} type="date" className="w-full text-sm p-2 border border-slate-200 rounded text-slate-900" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-slate-500">End Date</label>
                                    <input value={newRequest.endDate} onChange={e => setNewRequest({...newRequest, endDate: e.target.value})} type="date" className="w-full text-sm p-2 border border-slate-200 rounded text-slate-900" />
                                </div>
                            </div>
                            {newRequest.startDate && newRequest.endDate && newRequest.endDate >= newRequest.startDate && (() => {
                                const wd = countWorkingDays(newRequest.startDate, newRequest.endDate, holidays);
                                return (
                                    <div className="flex items-center gap-2 p-2.5 bg-indigo-50 border border-indigo-100 rounded-lg -mt-1">
                                        <span className="material-symbols-outlined text-indigo-500 text-[16px]">event_available</span>
                                        <span className="text-xs font-bold text-indigo-700">{wd} Working Day{wd !== 1 ? 's' : ''} will be deducted</span>
                                    </div>
                                );
                            })()}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-slate-500">Reason</label>
                                <textarea value={newRequest.reason} onChange={e => setNewRequest({...newRequest, reason: e.target.value})} className="w-full text-sm p-2 border border-slate-200 rounded h-20 text-slate-900" placeholder="Details..."></textarea>
                            </div>
                            
                            {/* Holiday Warning Indicator */}
                            {newRequest.startDate && newRequest.endDate && (
                                <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg animate-fade-in">
                                    {(() => {
                                        const requestedDates: string[] = [];
                                        let curr = parseGregorianDate(newRequest.startDate);
                                        const end = parseGregorianDate(newRequest.endDate);
                                        while (curr <= end) {
                                            requestedDates.push(getFormattedDate(curr, 'iso'));
                                            curr.setDate(curr.getDate() + 1);
                                        }
                                        const matches = holidays.filter(h => requestedDates.includes(h.date));
                                        if (matches.length > 0) {
                                            const restricted = matches.find(h => h.isRestricted);
                                            return (
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`material-symbols-outlined text-[18px] ${restricted ? 'text-red-500' : 'text-amber-500'}`}>
                                                            {restricted ? 'block' : 'info'}
                                                        </span>
                                                        <span className="text-[11px] font-bold text-slate-700">
                                                            {matches.length} Holiday(s) in selected range: {matches.map(h => h.name).join(', ')}
                                                        </span>
                                                    </div>
                                                    {restricted && (
                                                        <div className="flex items-center gap-2 pl-6">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={newRequest.isAdminOverride} 
                                                                onChange={e => setNewRequest({...newRequest, isAdminOverride: e.target.checked})} 
                                                                className="rounded text-red-600" 
                                                            />
                                                            <label className="text-[10px] font-bold text-red-600 uppercase">Apply Admin Override (Restricted Date)</label>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        }
                                        return <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-tight">No holiday conflicts detected.</p>;
                                    })()}
                                </div>
                            )}

                            {newRequest.type === 'Medical' && (
                                <div className="flex flex-col gap-2 mt-2">
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" checked={newRequest.hasCert} onChange={e => setNewRequest({...newRequest, hasCert: e.target.checked})} className="rounded text-[#4F46E5]" />
                                        <label className="text-xs font-bold text-slate-700">Medical Certificate Attached?</label>
                                    </div>
                                    {newRequest.hasCert && (
                                        <div className="pl-6 space-y-1">
                                            <label className="text-[10px] font-bold uppercase text-slate-500">Upload Certificate (PDF / Image)</label>
                                            <input
                                                type="file"
                                                accept=".pdf,.jpg,.jpeg,.png"
                                                onChange={e => {
                                                    const file = e.target.files?.[0];
                                                    if (file) setCertFileName(file.name);
                                                }}
                                                className="text-xs text-slate-600 w-full"
                                            />
                                            {certFileName && (
                                                <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[12px]">check_circle</span>
                                                    {certFileName} ready for upload
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 text-slate-900 dark:text-slate-100">
                            <button onClick={() => setIsModalOpen(false)} className="px-5 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors">
                                Cancel
                            </button>
                            <button 
                                onClick={handleFormSubmit} 
                                disabled={(() => {
                                    if (!newRequest.startDate || !newRequest.endDate) return false;
                                    const requestedDates: string[] = [];
                                    let curr = parseGregorianDate(newRequest.startDate);
                                    const end = parseGregorianDate(newRequest.endDate);
                                    while (curr <= end) {
                                        requestedDates.push(getFormattedDate(curr, 'iso'));
                                        curr.setDate(curr.getDate() + 1);
                                    }
                                    const hasRestricted = holidays.some(h => h.isRestricted && requestedDates.includes(h.date));
                                    return hasRestricted && !newRequest.isAdminOverride;
                                })()}
                                className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-[#4F46E5] hover:opacity-90 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:opacity-50"
                            >
                                Submit Request
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {rejectTarget && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm mx-4 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="bg-red-100 text-red-600 p-2 rounded-lg"><span className="material-symbols-outlined">cancel</span></div>
                                <div>
                                    <h3 className="font-black text-slate-900 text-sm">Confirm Rejection</h3>
                                    <p className="text-xs text-slate-500">{rejectTarget.isBulk ? `Rejecting ${rejectTarget.ids.length} request(s)` : 'Rejecting 1 request'}</p>
                                </div>
                            </div>
                            <button onClick={() => { setRejectTarget(null); setRejectReason(''); }} className="text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined">close</span></button>
                        </div>
                        <div className="p-5 space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Reason for Rejection <span className="text-red-500">*</span></label>
                            <textarea
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                                className="w-full text-sm p-3 border border-slate-200 rounded-lg h-24 resize-none text-slate-900 focus:ring-2 focus:ring-red-300 focus:border-transparent"
                                placeholder="Provide a clear reason that will be communicated to the employee..."
                                autoFocus
                            />
                            {!rejectReason.trim() && <p className="text-[10px] text-red-500 font-bold">A rejection reason is mandatory.</p>}
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button onClick={() => { setRejectTarget(null); setRejectReason(''); }} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button>
                            <button onClick={confirmRejection} disabled={!rejectReason.trim()} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Confirm Rejection</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
