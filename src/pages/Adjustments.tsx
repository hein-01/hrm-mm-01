import React, { useState, useMemo } from 'react';
import DropdownMenu from '../components/DropdownMenu';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useAppData } from '../context/AppDataContext';

// ─── Types ───────────────────────────────────────────────────────────────────
type StatusFilter = 'All' | 'Pending' | 'Approved' | 'Rejected' | 'Processed';
type CategoryFilter = 'All' | 'Addition' | 'Deduction';
type SourceFilter = 'All' | 'Manual' | 'System-Expense' | 'System-OT' | 'System-Performance' | 'System-Attendance' | 'System-Asset';
interface Toast { id: string; message: string; type: 'success' | 'error' | 'warning'; }

// ─── Toast Component ──────────────────────────────────────────────────────────
function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
    return (
        <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 min-w-[320px] max-w-sm">
            {toasts.map(t => (
                <div key={t.id} className={`flex items-start gap-3 p-4 rounded-xl shadow-2xl border animate-fade-in ${
                    t.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                    t.type === 'error'   ? 'bg-red-50 border-red-200 text-red-800' :
                                          'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                    <span className={`material-symbols-outlined text-[20px] shrink-0 ${
                        t.type === 'success' ? 'text-emerald-600' : t.type === 'error' ? 'text-red-600' : 'text-amber-600'
                    }`}>
                        {t.type === 'success' ? 'check_circle' : t.type === 'error' ? 'gpp_bad' : 'warning'}
                    </span>
                    <p className="text-xs font-semibold leading-relaxed flex-1">{t.message}</p>
                    <button onClick={() => onDismiss(t.id)} className="text-inherit opacity-50 hover:opacity-100 shrink-0">
                        <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                </div>
            ))}
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function Adjustments() {
    const { adjustments, employees, assets, payrollGroups, addAdjustment, approveAdjustment, rejectAdjustment, isAdmin } = useAppData();

    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('All');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
    const [sourceFilter, setSourceFilter] = useState<SourceFilter>('All');
    const [deptFilter, setDeptFilter] = useState('All');
    const [adminId, setAdminId] = useState('ADM-001');

    // Modals
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [detailAdj, setDetailAdj] = useState<typeof adjustments[0] | null>(null);

    // Toast
    const [toasts, setToasts] = useState<Toast[]>([]);
    const addToast = (message: string, type: Toast['type'], duration = 3500) => {
        const id = `toast-${Date.now()}`;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
    };
    const dismissToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

    // Manual Adjustment Form State
    const [form, setForm] = useState({
        empId: '', type: 'Performance Bonus', category: 'Addition' as 'Addition' | 'Deduction',
        amount: '', reason: '', effectiveMonth: '', sourceLink: '', assetId: '',
        isTaxable: true, isSSBRelevant: true
    });
    const activeEmployees = employees.filter(e => e.status === 'Active');
    const selectedEmp = employees.find(e => e.id === form.empId);
    const assignedAssets = assets.filter(a => a.assigneeId === form.empId);

    const handleFormChange = (field: string, value: string) => {
        setForm(prev => {
            const updated = { ...prev, [field]: value };
            if (field === 'type') {
                if (['Performance Bonus', 'Overtime Pay'].includes(value)) {
                    updated.category = 'Addition'; updated.isTaxable = true; updated.isSSBRelevant = true;
                } else if (value === 'Project Allowance') {
                    updated.category = 'Addition'; updated.isTaxable = true; updated.isSSBRelevant = false;
                } else if (value === 'Reimbursement') {
                    updated.category = 'Addition'; updated.isTaxable = false; updated.isSSBRelevant = false;
                } else if (['Late Fine', 'Asset Loss', 'Unpaid Leave Deduction'].includes(value)) {
                    updated.category = 'Deduction';
                }
                if (value !== 'Asset Loss') updated.assetId = '';
            }
            if (field === 'category' && value !== 'Deduction') updated.assetId = '';
            return updated;
        });
    };
    const handleBoolToggle = (field: 'isTaxable' | 'isSSBRelevant') => {
        setForm(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const handleQuickFillBonus = () => {
        if (!selectedEmp) return;
        setForm(prev => ({ ...prev, amount: String(Math.round((selectedEmp.baseSalary || 0) * 0.10)) }));
    };

    const handleAddSubmit = () => {
        if (!form.empId) return addToast('Please select an employee.', 'error');
        if (!form.amount || Number(form.amount) <= 0) return addToast('Amount must be greater than 0 MMK.', 'error');
        if (!form.effectiveMonth) return addToast('Please select a Pay Period.', 'error');
        if (form.category === 'Deduction' && !form.reason.trim()) return addToast('Reason is required for all Deductions.', 'error');
        const assetLink = form.type === 'Asset Loss' && form.assetId ? form.assetId : form.sourceLink;
        addAdjustment({
            empId: form.empId,
            name: selectedEmp?.name || '',
            dept: selectedEmp?.dept || '',
            type: form.type,
            category: form.category,
            amount: Math.round(Number(form.amount.replace(/,/g, ''))),
            reason: form.reason || (form.type === 'Performance Bonus' ? 'Manual admin-entered bonus' : ''),
            effectiveMonth: form.effectiveMonth,
            sourceLink: assetLink || `MANUAL-${Date.now()}`,
            source: 'Manual',
            isTaxable: form.isTaxable,
            isSSBRelevant: form.isSSBRelevant,
            priority: 'Medium'
        }, adminId);
        setIsAddModalOpen(false);
        setForm({ empId: '', type: 'Performance Bonus', category: 'Addition', amount: '', reason: '', effectiveMonth: '', sourceLink: '', assetId: '', isTaxable: true, isSSBRelevant: true });
        addToast(`Adjustment created for ${selectedEmp?.name} — pending admin approval.`, 'success');
    };

    const handleApprove = (id: string) => {
        if (!isAdmin(adminId)) {
            addToast(`Security Violation: '${adminId}' is not an Administrator. Incident reported to Home Dashboard.`, 'error', 5000);
            approveAdjustment(id, adminId); // still call to trigger the context alert
            return;
        }
        const res = approveAdjustment(id, adminId);
        addToast(res.message, res.success ? 'success' : 'error');
    };

    const handleReject = (id: string) => {
        if (!isAdmin(adminId)) {
            addToast(`Security Violation: '${adminId}' is not an Administrator. Incident reported to Home Dashboard.`, 'error', 5000);
            rejectAdjustment(id, adminId);
            return;
        }
        const res = rejectAdjustment(id, adminId);
        addToast(res.message, res.success ? 'success' : 'error');
    };

    // Filtering
    const uniqueDepts = useMemo(() =>
        ['All', ...Array.from(new Set(adjustments.map(a => a.dept).filter(Boolean))).sort()],
    [adjustments]);

    const filteredAdjustments = useMemo(() =>
        adjustments.filter(adj => {
            const matchesSearch = adj.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  adj.empId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  adj.type.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = categoryFilter === 'All' || adj.category === categoryFilter;
            const matchesStatus   = statusFilter   === 'All' || adj.status   === statusFilter;
            const matchesDept     = deptFilter     === 'All' || adj.dept     === deptFilter;
            const matchesSource   = sourceFilter   === 'All' || adj.source   === sourceFilter;
            return matchesSearch && matchesCategory && matchesStatus && matchesDept && matchesSource;
        }),
    [adjustments, searchQuery, categoryFilter, statusFilter, deptFilter, sourceFilter]);

    const stats = useMemo(() => ({
        net: adjustments.reduce((s, a) => s + (a.category === 'Addition' ? a.amount : -a.amount), 0),
        additions: adjustments.filter(a => a.category === 'Addition' && a.status !== 'Rejected').reduce((s, a) => s + a.amount, 0),
        deductions: adjustments.filter(a => a.category === 'Deduction' && a.status !== 'Rejected').reduce((s, a) => s + a.amount, 0),
        pending: adjustments.filter(a => a.status === 'Pending').length,
        expenseReimbursed: adjustments.filter(a => a.source === 'System-Expense' && a.status === 'Approved').reduce((s, a) => s + a.amount, 0),
        expenseCount: adjustments.filter(a => a.source === 'System-Expense').length
    }), [adjustments]);

    const statusBadge = (status: string, isImmutable: boolean) => {
        const base = 'px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-tight';
        if (status === 'Approved') return `${base} bg-green-100 text-green-700`;
        if (status === 'Rejected') return `${base} bg-red-100 text-red-700`;
        if (status === 'Processed' || isImmutable) return `${base} bg-indigo-100 text-indigo-700`;
        return `${base} bg-amber-100 text-amber-700`;
    };

    const isAdminUser = isAdmin(adminId);
    const navigate = useNavigate();

    const handleSourceClick = (adj: typeof adjustments[0]) => {
        const routes: Record<string, string> = {
            'System-Asset':       '/assets',
            'System-OT':          '/ot-approvals',
            'System-Performance': '/performance',
            'System-Attendance':  '/attendance',
            'System-Expense':     '/expenses',
        };
        const target = routes[adj.source];
        if (target) navigate(target, { state: { searchQuery: adj.sourceLink } });
    };

    return (
        <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
            <Sidebar activeTab="Adjustments" />

            <main className="flex-1 flex flex-col overflow-hidden ml-[280px]">
                <Header 
                    title="Adjustments"
                    subtitle="Review and authorize salary adjustments, bonuses, and deductions for the current payroll cycle"
                >
                    <div className="relative w-full max-w-[480px] ml-4 hidden lg:block">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
                        <input
                            className="w-full border border-slate-200 dark:border-slate-800 rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent text-slate-900 placeholder-slate-400 bg-white dark:bg-slate-900 transition-all shadow-sm"
                            placeholder="Search by Employee, ID or Type..."
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </Header>

                <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50 dark:bg-background-dark relative">

                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
                        {[
                            { label: 'Net Adjustments', value: `${(stats.net / 100000).toFixed(2)} L`, sub: 'Current Cycle', icon: 'calculate', color: 'text-primary bg-primary/10' },
                            { label: 'Monthly Bonuses', value: `+${(stats.additions / 100000).toFixed(2)} L`, sub: 'Addition Pillar', icon: 'payments', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30' },
                            { label: 'Fines & Deductions', value: `-${(stats.deductions / 100000).toFixed(2)} L`, sub: 'Compliance Leakage', icon: 'priority_high', color: 'text-red-600 bg-red-50 dark:bg-red-900/30' },
                            { label: 'Pending Approval', value: `${stats.pending} Requests`, sub: isAdminUser ? 'You can approve' : '⚠ Admin required', icon: 'pending_actions', color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30' },
                            { label: 'Expense Reimbursements', value: `${(stats.expenseReimbursed / 100000).toFixed(2)} L`, sub: `${stats.expenseCount} claim(s) total`, icon: 'receipt_long', color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30' },
                        ].map(k => (
                            <div key={k.label} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-slate-500 text-sm font-medium">{k.label}</span>
                                    <span className={`material-symbols-outlined p-1.5 rounded-lg ${k.color}`}>{k.icon}</span>
                                </div>
                                <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{k.value}</div>
                                <div className="text-xs text-slate-500 font-medium">{k.sub}</div>
                            </div>
                        ))}
                    </div>

                    {/* Table Container */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        {/* Table Header */}
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4 flex-wrap">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white whitespace-nowrap">Adjustment Registry</h3>
                                    {/* Category Filter */}
                                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                                        {(['All', 'Addition', 'Deduction'] as CategoryFilter[]).map(tab => (
                                            <button key={tab} onClick={() => setCategoryFilter(tab)}
                                                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                                                    categoryFilter === tab ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                                }`}>{tab}
                                            </button>
                                        ))}
                                    </div>
                                    {/* Status Filter */}
                                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg gap-0.5">
                                        {(['All', 'Pending', 'Approved', 'Rejected', 'Processed'] as StatusFilter[]).map(s => (
                                            <button key={s} onClick={() => setStatusFilter(s)}
                                                className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all uppercase tracking-wide ${
                                                    statusFilter === s ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600'
                                                }`}>{s}
                                            </button>
                                        ))}
                                    </div>
                                    {/* Source Filter */}
                                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg gap-0.5">
                                        {([
                                            { key: 'All', label: 'All Sources' },
                                            { key: 'Manual', label: 'Manual' },
                                            { key: 'System-Expense', label: '🧾 Expense' },
                                            { key: 'System-OT', label: 'OT' },
                                            { key: 'System-Performance', label: 'Performance' },
                                            { key: 'System-Attendance', label: 'Attendance' },
                                            { key: 'System-Asset', label: 'Asset' },
                                        ] as { key: SourceFilter; label: string }[]).map(s => (
                                            <button key={s.key} onClick={() => setSourceFilter(s.key)}
                                                className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all whitespace-nowrap ${
                                                    sourceFilter === s.key
                                                        ? s.key === 'System-Expense'
                                                            ? 'bg-violet-600 text-white shadow-sm'
                                                            : 'bg-white dark:bg-slate-700 shadow-sm text-primary'
                                                        : 'text-slate-400 hover:text-slate-600'
                                                }`}>{s.label}
                                            </button>
                                        ))}
                                    </div>
                                    {/* Department Filter */}
                                    <DropdownMenu
                                        value={deptFilter}
                                        onChange={setDeptFilter}
                                        options={uniqueDepts.map(d => ({
                                            value: d,
                                            label: d === 'All' ? 'All Depts' : d,
                                        }))}
                                    />
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    {/* Acting As */}
                                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${isAdminUser ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                                        <span className={`material-symbols-outlined text-[14px] ${isAdminUser ? 'text-emerald-600' : 'text-red-500'}`}>
                                            {isAdminUser ? 'verified_user' : 'gpp_bad'}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Acting As:</span>
                                        <input
                                            type="text" value={adminId} onChange={(e) => setAdminId(e.target.value)}
                                            className={`bg-transparent text-xs font-bold focus:outline-none w-24 ${isAdminUser ? 'text-emerald-700' : 'text-red-600'}`}
                                        />
                                    </div>
                                    <button
                                        onClick={() => setIsAddModalOpen(true)}
                                        className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-700 transition-all"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">add</span> Manual Adjustment
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[900px]">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50">
                                        {['Employee', 'Source Trace', 'Type & Reason', 'Category', 'Amount', 'Status', 'Actions'].map(h => (
                                            <th key={h} className={`px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider ${h === 'Amount' ? 'text-right' : h === 'Status' || h === 'Actions' ? 'text-center' : ''}`}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {filteredAdjustments.length > 0 ? filteredAdjustments.map(adj => {
                                        const emp = employees.find(e => e.id === adj.empId);
                                        const canAct = adj.status === 'Pending' && !adj.isImmutable;
                                        return (
                                            <tr key={adj.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${emp?.colorClass || 'bg-indigo-100 text-indigo-700'}`}>
                                                            {emp?.avatar
                                                                ? <img src={emp.avatar} alt={adj.name} className="w-full h-full rounded-full object-cover" />
                                                                : (emp?.initials || adj.name.substring(0, 2))}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-900 dark:text-white">{adj.name}</p>
                                                            <p className="text-xs text-slate-400">{adj.empId} · {adj.dept}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-1.5 mb-1">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{adj.source.replace('System-', '')}</p>
                                                        {adj.source === 'System-Expense' && (
                                                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black bg-violet-50 text-violet-700 border border-violet-200 uppercase tracking-tight">
                                                                <span className="material-symbols-outlined text-[10px]">receipt_long</span>Expense
                                                            </span>
                                                        )}
                                                    </div>
                                                    {adj.source !== 'Manual' ? (
                                                        <button onClick={() => handleSourceClick(adj)}
                                                            title={`Open in ${adj.source.replace('System-', '')} module`}
                                                            className={`text-xs font-bold flex items-center gap-1 hover:underline transition-colors ${
                                                                adj.source === 'System-Expense' ? 'text-violet-600 hover:text-violet-800' : 'text-primary hover:text-indigo-700'
                                                            }`}>
                                                            <span className="material-symbols-outlined text-[12px]">{adj.source === 'System-Expense' ? 'receipt_long' : 'open_in_new'}</span>{adj.sourceLink}
                                                        </button>
                                                    ) : (
                                                        <p className="text-xs text-slate-400 font-medium flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-[12px]">link</span>{adj.sourceLink}
                                                        </p>
                                                    )}
                                                    <p className="text-[10px] text-slate-400 mt-0.5">{adj.effectiveMonth}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{adj.type}</p>
                                                    <p className="text-[10px] text-slate-400 max-w-[180px] truncate" title={adj.reason}>{adj.reason}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit ${
                                                        adj.category === 'Addition'
                                                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700'
                                                            : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700'
                                                    }`}>
                                                        <span className="material-symbols-outlined text-[13px]">{adj.category === 'Addition' ? 'add' : 'remove'}</span>
                                                        {adj.category}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className={`text-sm font-bold ${adj.category === 'Addition' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                            {adj.category === 'Addition' ? '+' : '-'}{adj.amount.toLocaleString()} {adj.currency}
                                                        </span>
                                                        {adj.isTaxable === false && adj.category === 'Addition' && (
                                                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-50 text-emerald-600 border border-emerald-200 uppercase tracking-tight whitespace-nowrap">
                                                                ⚡ Tax-Free
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className={statusBadge(adj.status, adj.isImmutable)}>{adj.status}</span>
                                                        {adj.isImmutable && (
                                                            <span className="flex items-center gap-0.5 text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded uppercase border border-indigo-100">
                                                                <span className="material-symbols-outlined text-[10px]">lock</span>
                                                                {adj.status === 'Processed' ? 'Payroll-Locked' : 'System-Gen'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex justify-end items-center gap-2">
                                                        {/* Approve / Reject — only for Pending & mutable */}
                                                        {canAct && (
                                                            <>
                                                                <button onClick={() => handleApprove(adj.id)}
                                                                    title={isAdminUser ? 'Approve' : 'Admin required'}
                                                                    className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                                                                        isAdminUser
                                                                            ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white shadow-sm'
                                                                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                                    }`}>
                                                                    <span className="material-symbols-outlined text-[17px]">{isAdminUser ? 'check' : 'lock'}</span>
                                                                </button>
                                                                <button onClick={() => handleReject(adj.id)}
                                                                    title={isAdminUser ? 'Reject' : 'Admin required'}
                                                                    className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                                                                        isAdminUser
                                                                            ? 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white shadow-sm'
                                                                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                                    }`}>
                                                                    <span className="material-symbols-outlined text-[17px]">{isAdminUser ? 'close' : 'lock'}</span>
                                                                </button>
                                                            </>
                                                        )}
                                                        {/* View Detail — always visible */}
                                                        <button onClick={() => setDetailAdj(adj)}
                                                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                                            title="View Details">
                                                            <span className="material-symbols-outlined text-[17px]">visibility</span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-12 text-center">
                                                <span className="material-symbols-outlined text-4xl text-slate-300 block mb-2">find_in_page</span>
                                                <p className="text-slate-400 font-medium">No adjustments match your criteria.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                            <p>All values in MMK, rounded to nearest whole Kyat. Audit links verified against Compliance standards.</p>
                            <span className="font-bold text-primary">{filteredAdjustments.length} records</span>
                        </div>
                    </div>
                </div>
            </main>

            {/* ── Manual Adjustment Modal ───────────────────────────────────── */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white">New Manual Adjustment</h3>
                                <p className="text-xs text-slate-400 mt-0.5">Admin-created entry for next Payroll Run</p>
                            </div>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Employee */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Employee *</label>
                                <select value={form.empId} onChange={e => handleFormChange('empId', e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none">
                                    <option value="">Select Active Employee…</option>
                                    {activeEmployees.map(e => (
                                        <option key={e.id} value={e.id}>{e.name} ({e.id}) — {e.dept}</option>
                                    ))}
                                </select>
                                {selectedEmp && (
                                    <p className="text-[10px] text-slate-400 mt-1">Base Salary: <span className="font-bold text-slate-600 dark:text-slate-300">{(selectedEmp.baseSalary || 0).toLocaleString()} MMK</span></p>
                                )}
                            </div>

                            {/* Type & Category row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Type *</label>
                                    <select value={form.type} onChange={e => handleFormChange('type', e.target.value)}
                                        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none">
                                        <optgroup label="Additions">
                                            <option>Performance Bonus</option>
                                            <option>Overtime Pay</option>
                                            <option>Project Allowance</option>
                                            <option>Reimbursement</option>
                                        </optgroup>
                                        <optgroup label="Deductions">
                                            <option>Late Fine</option>
                                            <option>Asset Loss</option>
                                            <option>Unpaid Leave Deduction</option>
                                        </optgroup>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Category</label>
                                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg h-[42px] items-center">
                                        {(['Addition', 'Deduction'] as const).map(c => (
                                            <button key={c} type="button" onClick={() => handleFormChange('category', c)}
                                                className={`flex-1 py-1 rounded-md text-xs font-bold transition-all ${
                                                    form.category === c ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-400'
                                                }`}>{c}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Pay Period */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Pay Period <span className="text-red-500">*</span></label>
                                {payrollGroups.length > 0 ? (
                                    <select value={form.effectiveMonth} onChange={e => handleFormChange('effectiveMonth', e.target.value)}
                                        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none">
                                        <option value="">Select Pay Period…</option>
                                        {payrollGroups.map(g => (
                                            <option key={g.id} value={g.period}>{g.period} — {g.name}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input type="text" placeholder="e.g. Oct 2023"
                                        value={form.effectiveMonth}
                                        onChange={e => handleFormChange('effectiveMonth', e.target.value)}
                                        className="w-full px-3 py-2.5 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/10 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-300 outline-none"
                                    />
                                )}
                                {payrollGroups.length === 0 && (
                                    <p className="text-[10px] text-amber-600 font-bold mt-1">⚠ No Payroll Groups found. Create a group in Payroll Run first, or type the period manually.</p>
                                )}
                            </div>

                            {/* Amount */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Amount (MMK) *</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">K</span>
                                        <input
                                            type="text"
                                            value={form.amount ? Number(form.amount.replace(/,/g, '')).toLocaleString() : ''}
                                            onChange={e => handleFormChange('amount', e.target.value.replace(/,/g, ''))}
                                            placeholder="0"
                                            className="w-full pl-8 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none tabular-nums"
                                        />
                                    </div>
                                    {form.type === 'Performance Bonus' && selectedEmp && (
                                        <button type="button" onClick={handleQuickFillBonus}
                                            className="px-3 py-2 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-bold whitespace-nowrap hover:bg-indigo-100 transition-colors">
                                            10% of Salary
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Tax Compliance Toggles — Addition only */}
                            {form.category === 'Addition' && (
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tax Compliance</p>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Taxable Income (PIT)</p>
                                            <p className="text-[10px] text-slate-400">Include this amount in Income Tax base</p>
                                        </div>
                                        <button type="button" onClick={() => handleBoolToggle('isTaxable')}
                                            className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
                                                form.isTaxable ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
                                            }`}>
                                            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                                                form.isTaxable ? 'translate-x-5' : 'translate-x-0.5'
                                            }`} />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-3">
                                        <div>
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">SSB Relevant</p>
                                            <p className="text-[10px] text-slate-400">Include this amount in Social Security base</p>
                                        </div>
                                        <button type="button" onClick={() => handleBoolToggle('isSSBRelevant')}
                                            className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
                                                form.isSSBRelevant ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'
                                            }`}>
                                            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                                                form.isSSBRelevant ? 'translate-x-5' : 'translate-x-0.5'
                                            }`} />
                                        </button>
                                    </div>
                                    {!form.isTaxable && !form.isSSBRelevant && (
                                        <p className="text-[10px] text-amber-600 font-bold mt-1">ℹ This amount will be paid but excluded from both PIT and SSB calculations (e.g., expense reimbursement).</p>
                                    )}
                                </div>
                            )}

                            {/* Asset Loss auto-link */}
                            {form.type === 'Asset Loss' && (
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Asset Link (auto-populated) *</label>
                                    <select value={form.assetId} onChange={e => handleFormChange('assetId', e.target.value)}
                                        className="w-full px-3 py-2.5 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/10 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-300 focus:border-amber-400 outline-none">
                                        <option value="">Select Asset assigned to employee…</option>
                                        {assignedAssets.map(a => (
                                            <option key={a.id} value={a.id}>{a.id} — {a.model} ({a.value?.toLocaleString()} MMK)</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Reason */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                    Reason {form.category === 'Deduction' && <span className="text-red-500">* (Required for Deductions)</span>}
                                </label>
                                <textarea value={form.reason} onChange={e => handleFormChange('reason', e.target.value)} rows={2}
                                    placeholder={form.category === 'Deduction' ? 'Mandatory — describe the deduction basis…' : 'Optional context…'}
                                    className={`w-full px-3 py-2.5 rounded-lg border text-sm resize-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:border-primary outline-none ${
                                        form.category === 'Deduction' && !form.reason ? 'border-amber-300 focus:ring-amber-200' : 'border-slate-200 dark:border-slate-700 focus:ring-primary/30'
                                    }`}
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                            <button onClick={() => setIsAddModalOpen(false)}
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-all">
                                Cancel
                            </button>
                            <button onClick={handleAddSubmit}
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-primary hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 dark:shadow-none">
                                Create Adjustment
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Detail Slide-Over Panel ───────────────────────────────────── */}
            {detailAdj && (
                <div className="fixed inset-0 z-[100] flex justify-end animate-fade-in">
                    <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => setDetailAdj(null)} />
                    <div className="relative w-full max-w-md bg-white dark:bg-slate-900 h-full overflow-y-auto shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col">
                        {/* Panel Header */}
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-black text-slate-900 dark:text-white">Adjustment Detail</h3>
                                <p className="text-xs text-slate-400 font-mono mt-0.5">{detailAdj.id}</p>
                            </div>
                            <button onClick={() => setDetailAdj(null)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Lock Banner */}
                        {detailAdj.isImmutable && (
                            <div className="mx-6 mt-5 flex items-center gap-3 px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl">
                                <span className="material-symbols-outlined text-indigo-600 text-[22px]">lock</span>
                                <div>
                                    <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300">Record Locked</p>
                                    <p className="text-[10px] text-indigo-500">
                                        {detailAdj.status === 'Processed' ? 'Processed & locked into finalized Payroll Run.' : 'System-generated — cannot be modified.'}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Employee Card */}
                        {(() => {
                            const emp = employees.find(e => e.id === detailAdj.empId);
                            return emp ? (
                                <div className="mx-6 mt-5 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${emp.colorClass || 'bg-indigo-100 text-indigo-700'}`}>
                                        {emp.avatar ? <img src={emp.avatar} className="w-full h-full rounded-full object-cover" alt="" /> : emp.initials}
                                    </div>
                                    <div>
                                        <p className="font-black text-slate-900 dark:text-white text-sm">{emp.name}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">{emp.dept} · {emp.id}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">Base: <span className="font-bold text-slate-600 dark:text-slate-300">{(emp.baseSalary || 0).toLocaleString()} MMK/mo</span></p>
                                    </div>
                                </div>
                            ) : null;
                        })()}

                        {/* Adjustment Detail Fields */}
                        <div className="px-6 py-5 space-y-5 flex-1">
                            {[
                                { label: 'Type', value: detailAdj.type },
                                { label: 'Category', value: detailAdj.category },
                                { label: 'Amount', value: `${detailAdj.category === 'Addition' ? '+' : '-'}${detailAdj.amount.toLocaleString()} ${detailAdj.currency}` },
                                { label: 'Effective Month', value: detailAdj.effectiveMonth },
                                { label: 'Status', value: detailAdj.status },
                                { label: 'Source Module', value: detailAdj.source },
                                { label: 'Source Link', value: detailAdj.sourceLink },
                                { label: 'Reason', value: detailAdj.reason },
                            ].map(d => (
                                <div key={d.label} className="border-b border-slate-100 dark:border-slate-800 pb-3 last:border-0">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{d.label}</p>
                                    <p className={`text-sm font-semibold text-slate-800 dark:text-slate-200 ${d.label === 'Amount' ? (detailAdj.category === 'Addition' ? 'text-emerald-600' : 'text-rose-600') : ''}`}>{d.value || '—'}</p>
                                </div>
                            ))}
                        </div>

                        {/* Slide-over Footer — Audit History + Actions */}
                        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                            <button onClick={() => navigate('/settings', { state: { auditSearch: detailAdj.id, auditFilter: 'Payroll' } })}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-indigo-200 text-sm font-bold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                                <span className="material-symbols-outlined text-[18px]">manage_search</span>
                                View Audit History
                            </button>
                            {detailAdj.status === 'Pending' && !detailAdj.isImmutable && (
                                <div className="flex gap-3">
                                    <button onClick={() => { handleReject(detailAdj.id); setDetailAdj(null); }}
                                        className="flex-1 py-2.5 rounded-xl text-sm font-bold text-red-600 bg-red-50 border border-red-200 hover:bg-red-600 hover:text-white transition-all">
                                        Reject
                                    </button>
                                    <button onClick={() => { handleApprove(detailAdj.id); setDetailAdj(null); }}
                                        className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-md shadow-emerald-200 dark:shadow-none">
                                        Approve
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Toast Container ──────────────────────────────────────────── */}
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        </div>
    );
}
