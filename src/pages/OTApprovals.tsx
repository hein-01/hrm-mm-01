import React, { useState, useMemo } from 'react';
import DropdownMenu from '../components/DropdownMenu';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useAppData } from '../context/AppDataContext';
import { useNotifications } from '../context/NotificationProvider';

// Toast Component
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
    React.useEffect(() => {
        const timer = setTimeout(onClose, 4000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="fixed bottom-6 right-6 animate-slide-up z-50">
            <div className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-black/50 border font-display ${
                type === 'error' ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-200' :
                'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-200'
            }`}>
                <div className={`size-8 rounded-full flex flex-shrink-0 items-center justify-center ${
                    type === 'error' ? 'bg-red-200 dark:bg-red-800/50' : 'bg-emerald-200 dark:bg-emerald-800/50'
                }`}>
                    <span className="material-symbols-outlined text-lg">
                        {type === 'error' ? 'warning' : 'check_circle'}
                    </span>
                </div>
                <div className="pr-4">
                    <p className="font-bold text-sm tracking-tight">{type === 'error' ? 'Action Failed' : 'Success'}</p>
                    <p className="text-xs opacity-80 mt-0.5 leading-snug">{message}</p>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors ml-auto">
                    <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
            </div>
        </div>
    );
};

export default function OTApprovals() {
    const { 
        otRequests, 
        employees, 
        approveOT, 
        rejectOT, 
        bulkApproveOT 
    } = useAppData();
    const { pushNotification } = useNotifications();

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('Pending');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    
    // Toast State
    const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
    const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
    const [editingHours, setEditingHours] = useState<Record<string, number>>({});
    const [rejectModal, setRejectModal] = useState<{ id: string; name: string; otHours: number; date: string } | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [bulkRejectModal, setBulkRejectModal] = useState(false);
    const [bulkRejectReason, setBulkRejectReason] = useState('');

    const getWeekStart = (dateStr: string): string => {
        const d = new Date(dateStr + 'T00:00:00');
        const day = d.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        d.setDate(d.getDate() + diff);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const getWeeklyOT = (empId: string, date: string, excludeId: string): number => {
        const weekStart = getWeekStart(date);
        const wd = new Date(weekStart + 'T00:00:00');
        wd.setDate(wd.getDate() + 6);
        const weekEnd = `${wd.getFullYear()}-${String(wd.getMonth() + 1).padStart(2, '0')}-${String(wd.getDate()).padStart(2, '0')}`;
        return otRequests
            .filter(r => r.id !== excludeId && r.empId === empId && r.status === 'Approved' && r.date >= weekStart && r.date <= weekEnd)
            .reduce((sum, r) => sum + r.otHours, 0);
    };

    const previewPayout = (empId: string, hours: number, otType: 'Weekday 1.5x' | 'Rest Day 2.0x' | 'Holiday 2.0x'): number | null => {
        const emp = employees.find(e => e.id === empId);
        if (!emp?.baseSalary || emp.baseSalary <= 0) return null;
        const multiplier = otType === 'Weekday 1.5x' ? 1.5 : 2.0;
        return Math.round((emp.baseSalary / 30 / 8) * hours * multiplier);
    };

    // Derived Data for specific employee (to simulate the logged in user as an admin)
    const currentAdminId = 'EMP-001'; // Simulated logged-in administrator (Nilar Lwin)

    // Filtering
    const filteredOT = useMemo(() => {
        return otRequests.filter(ot => {
            const matchesSearch = ot.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  ot.empId.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === 'All' || ot.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [otRequests, searchQuery, statusFilter]);

    // Derived KPIs
    const kpiData = useMemo(() => {
        const pendingCount = otRequests.filter(r => r.status === 'Pending').length;
        const totalHours = otRequests.filter(r => r.status === 'Approved').reduce((sum, r) => sum + r.otHours, 0);
        const estCost = otRequests.filter(r => r.status === 'Approved' || r.status === 'Pending')
                                  .reduce((sum, r) => sum + r.payoutAmount, 0);
        
        // Count unique employees with violation requests (Pending or Approved)
        const violationEmps = new Set(
            otRequests.filter(r => r.hasViolation && r.status !== 'Rejected').map(r => r.empId)
        );

        return {
            pendingCount,
            totalHours,
            estCost,
            violationCount: violationEmps.size
        };
    }, [otRequests]);

    // Actions
    const handleApprove = (id: string) => {
        const req = otRequests.find(r => r.id === id);
        const res = approveOT(id, currentAdminId, editingHours[id]);
        setToast({ message: res.message, type: res.success ? 'success' : 'error' });
        if (res.success) {
            setEditingHours(prev => { const n = { ...prev }; delete n[id]; return n; });
            if (req) {
                const hrs = editingHours[id] ?? req.otHours;
                const payout = previewPayout(req.empId, hrs, req.otType);
                pushNotification({
                    title: 'OT Request Approved ✅',
                    body: `${req.name}'s ${hrs}h OT (${req.otType}) on ${req.date} approved.${payout ? ` Payout: ${payout.toLocaleString()} MMK → Payroll.` : ''}`,
                    category: 'Financial', priority: 'high',
                    icon: 'schedule',
                    iconBg: 'bg-indigo-100 dark:bg-indigo-900/30', iconColor: 'text-indigo-600 dark:text-indigo-400',
                    actionRoute: '/ot-approvals', actionLabel: 'View OT',
                    badge: 'Approved', badgeColor: 'indigo', empId: req.empId, sourceId: id,
                });
            }
        }
    };

    const handleReject = (id: string) => {
        const req = otRequests.find(r => r.id === id);
        if (!req) return;
        setRejectModal({ id, name: req.name, otHours: req.otHours, date: req.date });
    };

    const executeReject = () => {
        if (!rejectModal || !rejectReason.trim()) return;
        const res = rejectOT(rejectModal.id, currentAdminId, rejectReason.trim());
        setToast({ message: res.message, type: res.success ? 'success' : 'error' });
        if (res.success) {
            pushNotification({
                title: 'OT Request Rejected',
                body: `${rejectModal.name}'s ${rejectModal.otHours}h OT on ${rejectModal.date} was rejected. Reason: ${rejectReason.trim()}`,
                category: 'Financial', priority: 'normal',
                icon: 'cancel',
                iconBg: 'bg-rose-100 dark:bg-rose-900/30', iconColor: 'text-rose-600 dark:text-rose-400',
                actionRoute: '/ot-approvals', actionLabel: 'View OT',
                badge: 'Rejected', badgeColor: 'rose', sourceId: rejectModal.id,
            });
        }
        setRejectModal(null);
        setRejectReason('');
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredOT.filter(r => r.status === 'Pending').length) {
            setSelectedIds(new Set());
        } else {
            const pendingIds = filteredOT.filter(r => r.status === 'Pending').map(r => r.id);
            setSelectedIds(new Set(pendingIds));
        }
    };

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleBulkApprove = () => {
        if (selectedIds.size === 0) return;
        const count = selectedIds.size;
        const res = bulkApproveOT(Array.from(selectedIds), currentAdminId);
        setToast({ message: res.message, type: res.success ? 'success' : 'error' });
        if (res.success) {
            pushNotification({
                title: `${count} OT Request${count !== 1 ? 's' : ''} Approved`,
                body: `Bulk OT approval: ${count} request${count !== 1 ? 's' : ''} processed and queued for payroll.`,
                category: 'Financial', priority: 'normal',
                icon: 'done_all',
                iconBg: 'bg-indigo-100 dark:bg-indigo-900/30', iconColor: 'text-indigo-600 dark:text-indigo-400',
                actionRoute: '/ot-approvals', actionLabel: 'View OT',
                badge: `${count} Approved`, badgeColor: 'indigo',
            });
            setSelectedIds(new Set());
        }
    };

    const handleBulkReject = () => {
        if (selectedIds.size === 0) return;
        setBulkRejectModal(true);
    };

    const executeBulkReject = () => {
        if (!bulkRejectReason.trim()) return;
        let successCount = 0;
        let rejectError = '';
        selectedIds.forEach(id => {
            const res = rejectOT(id, currentAdminId, bulkRejectReason.trim());
            if (res.success) successCount++;
            else rejectError = res.message;
        });
        
        if (successCount > 0) {
            setToast({ message: `Successfully rejected ${successCount} OT requests.`, type: 'success' });
            setSelectedIds(new Set());
        }
        if (rejectError) {
            setToast({ message: rejectError, type: 'error' });
        }
        setBulkRejectModal(false);
        setBulkRejectReason('');
    };

    const handleExport = () => {
        const headers = ['ID', 'Employee', 'EmpID', 'Dept', 'Date', 'Shift', 'OT Hours (User)', 'OT Hours (System)', 'OT Type', 'Payout (MMK)', 'Status', 'Reason', 'Approved By', 'Approved At'];
        const rows = filteredOT.map(req => [
            req.id, req.name, req.empId, req.dept, req.date, req.shiftName,
            req.otHours,
            req.systemDetectedHours ?? 'N/A',
            req.otType, req.payoutAmount, req.status, req.reason,
            req.approvedBy ?? '-',
            req.approvedAt ? new Date(req.approvedAt).toLocaleString('en-GB') : '-'
        ]);
        const csv = [headers, ...rows]
            .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `OT_Report_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        setToast({ message: `Exported ${filteredOT.length} OT record(s) to CSV.`, type: 'success' });
    };

    const formatCurrency = (amount: number) => {
        if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'M MMK';
        if (amount >= 1000) return (amount / 1000).toFixed(1) + 'K MMK';
        return amount.toLocaleString() + ' MMK';
    };

    return (
        <div className="flex min-h-screen overflow-x-hidden bg-[#F8FAFC] dark:bg-[#221610] font-display text-slate-900 dark:text-slate-100">
            <Sidebar activeTab="OT Approvals" />

            {/* Main Content */}
            <main className="flex-1 flex flex-col ml-[280px] overflow-hidden">
                <Header 
                    title="Overtime Management"
                    subtitle="Review and authorize overtime requests based on biometric logs and policy compliance"
                >
                    <div className="relative w-full max-w-[480px] ml-4 hidden lg:block">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
                        <input
                            className="w-full border border-slate-200 dark:border-slate-800 rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent text-slate-900 placeholder-slate-400 bg-white dark:bg-slate-900 transition-all shadow-sm"
                            placeholder="Search by name or ID..."
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </Header>

                {/* Dashboard Content */}
                <div className="flex-1 overflow-y-auto space-y-8 p-8 pt-9">
                    {/* Secondary Actions Bar (Matching Shift Planner Action Row) */}
                    <div className="flex flex-wrap items-center justify-between gap-6 mb-2">
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-4 h-11 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <span className="material-symbols-outlined text-slate-500 text-lg">calendar_month</span>
                            <span className="text-sm font-medium">Oct 16 - Oct 22, 2023</span>
                        </div>
                        <button 
                            onClick={handleExport}
                            className="text-white px-6 h-11 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg hover:opacity-90 transition-opacity bg-[#4F46E5] shadow-[#4F46E5]/20">
                            <span className="material-symbols-outlined text-lg">download</span>
                            Export Report
                        </button>
                        
                    </div>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm cursor-pointer hover:border-indigo-500/30 transition-colors" onClick={() => setStatusFilter('Pending')}>
                            <div className="flex items-center justify-between mb-4">
                                <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-lg">
                                    <span className="material-symbols-outlined text-amber-600 dark:text-amber-400">pending_actions</span>
                                </div>
                                {statusFilter === 'Pending' && <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded">Active Filter</span>}
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Pending OT</p>
                            <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{kpiData.pendingCount} <span className="text-sm font-medium text-slate-400">Req</span></p>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm cursor-pointer hover:border-indigo-500/30 transition-colors" onClick={() => setStatusFilter('Approved')}>
                            <div className="flex items-center justify-between mb-4">
                                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                                    <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">hourglass_empty</span>
                                </div>
                                {statusFilter === 'Approved' && <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded">Active Filter</span>}
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Approved Hours (Week)</p>
                            <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{kpiData.totalHours}h</p>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg">
                                    <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400">payments</span>
                                </div>
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded">Est. Burden</span>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Estimated OT Payout</p>
                            <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{formatCurrency(kpiData.estCost)}</p>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm ring-1 ring-red-100 dark:ring-red-900/20">
                            <div className="flex items-center justify-between mb-4">
                                <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-lg">
                                    <span className="material-symbols-outlined text-red-600 dark:text-red-400">warning</span>
                                </div>
                                <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-tighter">Urgent</span>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Violation Flags</p>
                            <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{kpiData.violationCount} <span className="text-sm font-medium text-slate-400">Staff</span></p>
                        </div>
                    </div>

                    {/* Main Table Section */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">OT Ledger</h3>
                                {statusFilter !== 'All' && (
                                    <span className="bg-[#4F46E5]/10 text-[#4F46E5] text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
                                        Showing {statusFilter}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-4">
                                <DropdownMenu
                                    value={statusFilter}
                                    onChange={(v) => setStatusFilter(v as any)}
                                    align="right"
                                    options={[
                                        { value: 'All', label: 'All statuses' },
                                        { value: 'Pending', label: 'Pending only' },
                                        { value: 'Approved', label: 'Approved only' },
                                        { value: 'Rejected', label: 'Rejected only' },
                                    ]}
                                />
                                
                                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>

                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={handleBulkApprove}
                                        disabled={selectedIds.size === 0}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2 ${
                                            selectedIds.size > 0 
                                            ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20' 
                                            : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-400/50 cursor-not-allowed'
                                        }`}
                                    >
                                        <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                        Approve ({selectedIds.size})
                                    </button>
                                    <button 
                                        onClick={handleBulkReject}
                                        disabled={selectedIds.size === 0}
                                        className={`px-4 py-2 text-sm font-bold flex items-center gap-2 rounded-xl border transition-all ${
                                            selectedIds.size > 0
                                            ? 'border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/30 dark:hover:bg-red-900/10'
                                            : 'border-slate-100 text-slate-300 dark:border-slate-800 cursor-not-allowed'
                                        }`}
                                    >
                                        <span className="material-symbols-outlined text-[18px]">cancel</span>
                                        Reject
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse whitespace-nowrap">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                        <th className="p-4 w-12 text-center">
                                            <input 
                                                className="rounded border-slate-300 dark:border-slate-600 text-[#4F46E5] focus:ring-[#4F46E5] w-4 h-4 cursor-pointer" 
                                                type="checkbox" 
                                                checked={selectedIds.size > 0 && selectedIds.size === filteredOT.filter(r => r.status === 'Pending').length}
                                                onChange={toggleSelectAll}
                                                disabled={filteredOT.filter(r => r.status === 'Pending').length === 0}
                                            />
                                        </th>
                                        <th className="p-4 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Employee</th>
                                        <th className="p-4 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Date / Shift</th>
                                        <th className="p-4 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">OT Hours (Usr / Sys)</th>
                                        <th className="p-4 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Calculated Payout</th>
                                        <th className="p-4 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Reason</th>
                                        <th className="p-4 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Status</th>
                                        <th className="p-4 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {filteredOT.map(req => {
                                        const emp = employees.find(e => e.id === req.empId);
                                        return (
                                            <React.Fragment key={req.id}>
                                            <tr className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${selectedIds.has(req.id) ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}>
                                                <td className="p-4 text-center">
                                                    <input 
                                                        className="rounded border-slate-300 dark:border-slate-600 text-[#4F46E5] focus:ring-[#4F46E5] w-4 h-4 cursor-pointer disabled:opacity-30" 
                                                        type="checkbox" 
                                                        checked={selectedIds.has(req.id)}
                                                        onChange={() => toggleSelect(req.id)}
                                                        disabled={req.status !== 'Pending'}
                                                    />
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-slate-100 text-slate-600 overflow-hidden shrink-0`}>
                                                            {emp?.avatar ? <img className="w-full h-full object-cover" src={emp.avatar} alt={req.name} /> : emp?.initials}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-900 dark:text-white">{req.name}</p>
                                                            <p className="text-[11px] font-bold text-slate-400 tracking-wider mt-0.5">{req.empId}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{req.date}</p>
                                                    <p className="text-xs text-slate-500 font-medium mt-0.5 max-w-[140px] truncate" title={req.shiftName}>{req.shiftName}</p>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col gap-1.5">
                                                        {req.status === 'Pending' ? (
                                                            <>
                                                                {/* Editable hours input */}
                                                                <div className="flex items-center gap-1.5">
                                                                    <input
                                                                        type="number" min="0.5" max="24" step="0.5"
                                                                        value={editingHours[req.id] ?? req.otHours}
                                                                        onChange={e => {
                                                                            const v = parseFloat(e.target.value);
                                                                            if (!isNaN(v) && v > 0) setEditingHours(prev => ({ ...prev, [req.id]: v }));
                                                                        }}
                                                                        className="w-16 text-sm font-bold border border-slate-200 dark:border-slate-700 rounded-lg px-1.5 py-0.5 focus:ring-2 focus:ring-[#4F46E5] bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                                                                    />
                                                                    <span className="text-slate-400 font-medium text-xs">({req.otType.split(' ')[1]})</span>
                                                                    {req.hasViolation && <span className="material-symbols-outlined text-red-500 text-[16px] cursor-help" title={req.violationNote}>error</span>}
                                                                </div>
                                                                {/* Pre-emptive weekly cap badge */}
                                                                {(() => {
                                                                    const hrs = editingHours[req.id] ?? req.otHours;
                                                                    const weeklyUsed = getWeeklyOT(req.empId, req.date, req.id);
                                                                    const wouldExceed = weeklyUsed + hrs > 16;
                                                                    const capColor = wouldExceed ? 'text-red-500 dark:text-red-400' : weeklyUsed >= 12 ? 'text-amber-500 dark:text-amber-400' : 'text-slate-400';
                                                                    return (
                                                                        <span className={`text-[10px] font-bold flex items-center gap-0.5 ${capColor}`} title={`${weeklyUsed}h already approved this week`}>
                                                                            <span className="material-symbols-outlined text-[11px]">event_repeat</span>
                                                                            Wk: {weeklyUsed}h / 16h
                                                                            {wouldExceed && <span className="material-symbols-outlined text-[11px]">block</span>}
                                                                        </span>
                                                                    );
                                                                })()}
                                                            </>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5">
                                                                <span className={`text-sm font-bold ${req.hasViolation ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
                                                                    {req.otHours}h <span className="text-slate-400 font-medium text-xs ml-1">({req.otType.split(' ')[1]})</span>
                                                                </span>
                                                                {req.hasViolation && <span className="material-symbols-outlined text-red-500 text-[18px] cursor-help" title={req.violationNote}>error</span>}
                                                            </div>
                                                        )}
                                                        {/* System detected — shown for all rows */}
                                                        {req.systemDetectedHours !== undefined && (
                                                            <span className={`text-[10px] font-bold flex items-center gap-0.5 ${
                                                                Math.abs(req.systemDetectedHours - req.otHours) > 0.25
                                                                    ? 'text-amber-500 dark:text-amber-400' : 'text-slate-400'
                                                            }`}>
                                                                <span className="material-symbols-outlined text-[11px]">sensors</span>
                                                                Sys: {req.systemDetectedHours}h
                                                                {Math.abs(req.systemDetectedHours - req.otHours) > 0.25 && (
                                                                    <span className="material-symbols-outlined text-[11px]" title={`Discrepancy: requested ${req.otHours}h, system detected ${req.systemDetectedHours}h`}>warning</span>
                                                                )}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    {(() => {
                                                        const hrs = req.status === 'Pending' ? (editingHours[req.id] ?? req.otHours) : req.otHours;
                                                        const livePayout = req.status === 'Pending' ? previewPayout(req.empId, hrs, req.otType) : req.payoutAmount;
                                                        const isEdited = req.status === 'Pending' && editingHours[req.id] !== undefined;
                                                        return (
                                                            <span className={`text-sm font-black px-2 py-1 rounded transition-colors ${
                                                                isEdited
                                                                    ? 'bg-[#4F46E5]/10 text-[#4F46E5] dark:text-indigo-400'
                                                                    : 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800'
                                                            }`}>
                                                                {livePayout !== null ? livePayout.toLocaleString() : <span className="text-red-400">No salary</span>}
                                                                <span className="text-[10px] uppercase tracking-widest font-bold ml-1 opacity-60">MMK</span>
                                                                {isEdited && <span className="text-[9px] ml-1 font-black opacity-70">↻</span>}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="p-4">
                                                    <p className="text-sm text-slate-600 dark:text-slate-400 max-w-[120px] truncate font-medium" title={req.reason}>
                                                        {req.reason}
                                                    </p>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md ${
                                                        req.status === 'Approved' ? 'bg-indigo-50 text-[#4F46E5] dark:bg-indigo-900/30 dark:text-indigo-400' :
                                                        req.status === 'Rejected' ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' :
                                                        'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                                                    }`}>
                                                        {req.status}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    {req.status === 'Pending' ? (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button 
                                                                onClick={() => handleApprove(req.id)}
                                                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                                                                title="Approve"
                                                            >
                                                                <span className="material-symbols-outlined text-[18px]">check</span>
                                                            </button>
                                                            <button 
                                                                onClick={() => handleReject(req.id)}
                                                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                                                title="Reject"
                                                            >
                                                                <span className="material-symbols-outlined text-[18px]">close</span>
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-end">
                                                            <button
                                                                onClick={() => setExpandedHistoryId(expandedHistoryId === req.id ? null : req.id)}
                                                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-[#4F46E5] hover:bg-[#4F46E5]/10 transition-colors"
                                                                title="View approval history"
                                                            >
                                                                <span className="material-symbols-outlined text-[18px]">history</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                            {expandedHistoryId === req.id && (
                                                <tr className="bg-slate-50/80 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800">
                                                    <td colSpan={8} className="px-8 py-3">
                                                        <div className="flex flex-wrap items-center gap-6 text-xs">
                                                            <span className={`flex items-center gap-1.5 font-bold ${
                                                                req.status === 'Approved' ? 'text-[#4F46E5]' : 'text-slate-500'
                                                            }`}>
                                                                <span className="material-symbols-outlined text-[14px]">{req.status === 'Approved' ? 'check_circle' : 'cancel'}</span>
                                                                {req.status} by <span className="underline">{req.approvedBy ?? 'N/A'}</span>
                                                            </span>
                                                            {req.approvedAt && (
                                                                <span className="flex items-center gap-1.5 text-slate-400">
                                                                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                                                                    {new Date(req.approvedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                                                                </span>
                                                            )}
                                                            {req.status === 'Approved' && req.payoutAmount > 0 && (
                                                                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                                                                    <span className="material-symbols-outlined text-[14px]">payments</span>
                                                                    {req.payoutAmount.toLocaleString()} MMK → Payroll Adjustments
                                                                </span>
                                                            )}
                                                            <span className="flex items-center gap-1.5 text-slate-400">
                                                                <span className="material-symbols-outlined text-[14px]">tag</span>
                                                                {req.id}
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                            </React.Fragment>
                                        );
                                    })}

                                    {filteredOT.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="p-10 text-center text-slate-500 font-medium">
                                                No OT requests match the current filters.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>

            {/* Rejection Reason Modal */}
            {rejectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md mx-4 p-6">
                        <div className="flex items-start gap-3 mb-5">
                            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-red-600 dark:text-red-400">cancel</span>
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">Reject OT Request</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                    <span className="font-bold text-slate-700 dark:text-slate-300">{rejectModal.name}</span> — {rejectModal.otHours}h OT on {rejectModal.date}
                                </p>
                            </div>
                        </div>
                        <div className="mb-5">
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                                Reason for Rejection <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                                placeholder="e.g. OT was not pre-authorized. Shift was covered by another team member."
                                rows={3}
                                className="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none"
                                autoFocus
                            />
                            <p className="text-[11px] text-slate-400 mt-1.5">This reason will be dispatched to the employee's mobile cockpit.</p>
                        </div>
                        <div className="flex items-center justify-end gap-3">
                            <button
                                onClick={() => { setRejectModal(null); setRejectReason(''); }}
                                className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={executeReject}
                                disabled={!rejectReason.trim()}
                                className={`px-5 py-2 text-sm font-bold rounded-xl transition-all ${
                                    rejectReason.trim()
                                        ? 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20'
                                        : 'bg-red-100 dark:bg-red-900/20 text-red-300 cursor-not-allowed'
                                }`}
                            >
                                Confirm Rejection
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Rejection Modal */}
            {bulkRejectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md mx-4 p-6">
                        <div className="flex items-start gap-3 mb-5">
                            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-red-600 dark:text-red-400">cancel</span>
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">Bulk Reject OT Requests</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                    Reject <span className="font-bold text-slate-700 dark:text-slate-300">{selectedIds.size}</span> selected OT request{selectedIds.size !== 1 ? 's' : ''}
                                </p>
                            </div>
                        </div>
                        <div className="mb-5">
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                                Reason for Rejection <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={bulkRejectReason}
                                onChange={e => setBulkRejectReason(e.target.value)}
                                placeholder="e.g. OT was not pre-authorized. Shift was covered by another team member."
                                rows={3}
                                className="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none"
                                autoFocus
                            />
                            <p className="text-[11px] text-slate-400 mt-1.5">This reason will be dispatched to all selected employees.</p>
                        </div>
                        <div className="flex items-center justify-end gap-3">
                            <button
                                onClick={() => { setBulkRejectModal(false); setBulkRejectReason(''); }}
                                className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={executeBulkReject}
                                disabled={!bulkRejectReason.trim()}
                                className={`px-5 py-2 text-sm font-bold rounded-xl transition-all ${
                                    bulkRejectReason.trim()
                                        ? 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20'
                                        : 'bg-red-100 dark:bg-red-900/20 text-red-300 cursor-not-allowed'
                                }`}
                            >
                                Confirm Bulk Rejection
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toasts */}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
