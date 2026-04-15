import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useAppData, Loan } from '../context/AppDataContext';

// ─── Toast ────────────────────────────────────────────────────────────────────
interface Toast { id: string; message: string; type: 'success' | 'error' | 'warning'; }
function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
    return (
        <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 min-w-[320px] max-w-sm pointer-events-none">
            {toasts.map(t => (
                <div key={t.id} className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-2xl border animate-fade-in ${
                    t.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                    t.type === 'error'   ? 'bg-red-50 border-red-200 text-red-800' :
                                          'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                    <span className={`material-symbols-outlined text-[20px] shrink-0 ${
                        t.type === 'success' ? 'text-emerald-600' : t.type === 'error' ? 'text-red-600' : 'text-amber-600'
                    }`}>{t.type === 'success' ? 'check_circle' : t.type === 'error' ? 'gpp_bad' : 'warning'}</span>
                    <p className="text-xs font-semibold leading-relaxed flex-1">{t.message}</p>
                    <button onClick={() => onDismiss(t.id)} className="text-inherit opacity-50 hover:opacity-100 shrink-0 pointer-events-auto">
                        <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                </div>
            ))}
        </div>
    );
}

type StatusFilter = 'All' | 'Pending' | 'Approved' | 'Active' | 'Completed' | 'Rejected';

const STATUS_COLORS: Record<string, string> = {
    Pending:   'bg-amber-50 text-amber-700 border-amber-200',
    Approved:  'bg-blue-50 text-blue-700 border-blue-200',
    Active:    'bg-emerald-50 text-emerald-700 border-emerald-200',
    Completed: 'bg-slate-100 text-slate-600 border-slate-200',
    Rejected:  'bg-red-50 text-red-700 border-red-200'
};

export default function LoansAdvances() {
    const {
        loans, employees, isAdmin,
        requestLoan, approveLoan, rejectLoan, disburseLoan, pauseLoan, resumeLoan, recordCashRepayment,
        systemSettings
    } = useAppData();

    const loanConfig = systemSettings.loanConfiguration;

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
    const [actingAs, setActingAs] = useState('ADM-001');
    const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showCashModal, setShowCashModal] = useState(false);
    const [cashForm, setCashForm] = useState({ amount: '', reason: '' });
    const [cashConfirmed, setCashConfirmed] = useState(false);

    // Toast
    const [toasts, setToasts] = useState<Toast[]>([]);
    const addToast = (message: string, type: Toast['type'], duration = 3500) => {
        const id = `t-${Date.now()}`;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
    };
    const dismissToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

    // New Loan Form
    const emptyForm = { empId: '', type: 'Salary Advance' as Loan['type'], principalAmount: '', termMonths: '', reason: '', interestRate: '0' };
    const [form, setForm] = useState(emptyForm);
    const selectedEmp = employees.find(e => e.id === form.empId);
    const maxAllowed      = selectedEmp ? selectedEmp.baseSalary * loanConfig.loanLimitMultiplier : 0;
    const computedTerm    = form.type === 'Salary Advance' ? loanConfig.salaryAdvanceTerm : Number(form.termMonths);
    const exceedsTerm     = form.type === 'Emergency Loan' && Number(form.termMonths) > loanConfig.maxEmergencyLoanTerm;
    const exceedsAmount   = Number(form.principalAmount) > maxAllowed;
    const flatInterest    = Number(form.principalAmount) * ((Number(form.interestRate) || 0) / 100);
    const totalRepayable  = Number(form.principalAmount) + flatInterest;
    const monthlyInstallment = computedTerm > 0 && Number(form.principalAmount) > 0
        ? Math.round(totalRepayable / computedTerm)
        : 0;
    const maxInstallment   = selectedEmp ? Math.floor(selectedEmp.baseSalary * 0.30) : 0;
    const exceedsDebtRatio = selectedEmp != null && monthlyInstallment > 0 && monthlyInstallment > maxInstallment;
    const canSubmit = form.empId && form.principalAmount && !exceedsAmount && !exceedsTerm && !exceedsDebtRatio && (form.type === 'Salary Advance' || form.termMonths);

    const handleCreateSubmit = () => {
        if (!canSubmit) return;
        const emp = employees.find(e => e.id === form.empId)!;
        const result = requestLoan({
            empId: form.empId,
            name: emp.name,
            dept: (emp as any).dept,
            type: form.type,
            principalAmount: Number(form.principalAmount),
            termMonths: computedTerm,
            interestRate: Number(form.interestRate) || 0,
            reason: form.reason,
            requestedDate: new Date().toISOString().split('T')[0],
            priority: 'Medium' as const,
            category: 'Financial' as const
        });
        addToast(result.message, result.success ? 'success' : 'error', result.success ? 3500 : 6000);
        if (result.success) { setShowCreateModal(false); setForm(emptyForm); }
    };

    const closeCashModal = () => { setShowCashModal(false); setCashForm({ amount: '', reason: '' }); setCashConfirmed(false); };
    const handleCashRepayment = () => {
        if (!selectedLoan) return;
        const result = (recordCashRepayment as any)(selectedLoan.id, Number(cashForm.amount), cashForm.reason, actingAs);
        addToast(result.message, result.success ? 'success' : 'error', result.success ? 4500 : 6000);
        if (result.success) { closeCashModal(); setSelectedLoan(null); }
    };

    const handlePause  = (loanId: string) => {
        const result = (pauseLoan  as any)(loanId, actingAs);
        addToast(result.message, result.success ? 'warning' : 'error');
    };
    const handleResume = (loanId: string) => {
        const result = (resumeLoan as any)(loanId, actingAs);
        addToast(result.message, result.success ? 'success' : 'error');
    };
    const handleSettlementExport = (loan: Loan) => {
        const emp      = employees.find(e => e.id === loan.empId);
        const interest = loan.principalAmount * ((loan.interestRate ?? 0) / 100);
        const totalPaid = loan.installmentsPaid * loan.monthlyInstallment;
        const rows = [
            ['Field', 'Value'],
            ['Loan ID', loan.id],
            ['Employee', loan.name],
            ['NRC Number', (emp as any)?.nrcNumber ?? 'N/A'],
            ['Principal Amount (MMK)', String(loan.principalAmount)],
            ['Interest Rate', `${loan.interestRate ?? 0}%`],
            ['Flat Interest (MMK)', String(Math.round(interest))],
            ['Total Repayable (MMK)', String(loan.principalAmount + Math.round(interest))],
            ['Monthly Installment (MMK)', String(loan.monthlyInstallment)],
            ['Repayment Term (months)', String(loan.termMonths)],
            ['Disbursed Date', loan.disbursedDate ?? '—'],
            ['Installments Paid', String(loan.installmentsPaid)],
            ['Total Collected (MMK)', String(totalPaid)],
            ['Outstanding Balance (MMK)', String(loan.remainingBalance)],
            ['Status', loan.status],
            ['Generated On', new Date().toLocaleDateString('en-GB')],
        ];
        const csv  = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = `Settlement_Letter_${loan.id}_${loan.name.replace(/\s+/g, '_')}.csv`;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
        addToast(`Settlement letter downloaded for ${loan.name}.`, 'success');
    };

    const handleApprove = (loanId: string) => {
        const result = approveLoan(loanId, actingAs);
        addToast(result.message, result.success ? 'success' : 'error', result.success ? 3500 : 6000);
    };
    const handleReject = (loanId: string) => {
        const result = rejectLoan(loanId, actingAs);
        addToast(result.message, result.success ? 'warning' : 'error');
    };
    const handleDisburse = (loanId: string) => {
        const result = disburseLoan(loanId, actingAs);
        addToast(result.message, result.success ? 'success' : 'error');
    };

    // KPIs
    const kpis = useMemo(() => {
        const active       = loans.filter(l => l.status === 'Active');
        const pending      = loans.filter(l => l.status === 'Pending');
        const outstanding  = active.reduce((s, l) => s + l.remainingBalance, 0);
        const collected    = active.reduce((s, l) => s + (l.installmentsPaid * l.monthlyInstallment), 0);
        const total        = collected + outstanding;
        const recoveryRate = total > 0 ? Math.round((collected / total) * 100) : 0;
        return { outstanding, pending: pending.length, collected, recoveryRate };
    }, [loans]);

    const filteredLoans = useMemo(() =>
        loans.filter(l => {
            const matchStatus = statusFilter === 'All' || l.status === statusFilter;
            const matchSearch = l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                l.empId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                l.id.toLowerCase().includes(searchQuery.toLowerCase());
            return matchStatus && matchSearch;
        }),
    [loans, statusFilter, searchQuery]);

    const isActingAdmin = isAdmin(actingAs);

    return (
        <div className="flex h-screen overflow-hidden bg-[#F8FAFC] dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
            <Sidebar activeTab="Loans & Advances" />

            <main className="flex-1 flex flex-col ml-[280px] overflow-hidden">
                <Header 
                    title="Loans & Advances"
                    subtitle="Manage employee loan lifecycle — approval, disbursement, and repayment tracking"
                >
                    <div className="relative w-full max-w-[480px] ml-4 hidden lg:block">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
                        <input
                            className="w-full border border-slate-200 dark:border-slate-800 rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent text-slate-900 placeholder-slate-400 bg-white dark:bg-slate-900 transition-all shadow-sm"
                            placeholder="Search by name, ID, or Loan ID..."
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </Header>

                <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">
                    {/* Page Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Transaction Desk</p>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Acting As field */}
                            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-bold ${isActingAdmin ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
                                <span className="material-symbols-outlined text-[18px]">{isActingAdmin ? 'shield' : 'no_accounts'}</span>
                                <span className="text-[10px] text-slate-400 font-medium">ACTING AS:</span>
                                <input
                                    className="w-24 bg-transparent font-bold text-xs outline-none"
                                    value={actingAs}
                                    onChange={e => setActingAs(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-[#4F46E5] text-white rounded-lg text-sm font-bold hover:opacity-90 transition-all shadow-sm shadow-indigo-200"
                            >
                                <span className="material-symbols-outlined text-[20px]">add</span>
                                Create Loan Request
                            </button>
                        </div>
                    </div>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-4 gap-4">
                        {[
                            { label: 'Total Outstanding', value: (kpis.outstanding / 100000).toFixed(1) + ' L', sub: 'MMK', icon: 'account_balance_wallet', color: 'text-slate-900 dark:text-white' },
                            { label: 'Pending Approval', value: String(kpis.pending), sub: 'Requests', icon: 'pending_actions', color: 'text-amber-600' },
                            { label: 'Collected Repayments', value: (kpis.collected / 100000).toFixed(1) + ' L', sub: 'MMK', icon: 'event_repeat', color: 'text-emerald-600' },
                            { label: 'Recovery Rate', value: kpis.recoveryRate + '%', sub: 'of total issued', icon: 'trending_up', color: kpis.recoveryRate >= 50 ? 'text-emerald-600' : 'text-rose-600' },
                        ].map(k => (
                            <div key={k.label} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-1 group hover:shadow-md transition-shadow relative overflow-hidden">
                                <div className="absolute right-4 top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <span className="material-symbols-outlined text-5xl">{k.icon}</span>
                                </div>
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{k.label}</span>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <span className={`text-2xl font-bold ${k.color}`}>{k.value}</span>
                                    <span className="text-xs font-bold text-slate-400">{k.sub}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Status Filter Tabs */}
                    <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm w-fit">
                        {(['All', 'Pending', 'Approved', 'Active', 'Completed', 'Rejected'] as StatusFilter[]).map(s => (
                            <button key={s} onClick={() => setStatusFilter(s)}
                                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${statusFilter === s ? 'bg-[#4F46E5] text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                {s}
                                {s !== 'All' && <span className="ml-1.5 text-[10px] opacity-70">{loans.filter(l => l.status === s).length}</span>}
                            </button>
                        ))}
                    </div>

                    {/* Main Table */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                            <h4 className="font-bold text-slate-900 dark:text-white">Loan Portfolio</h4>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{filteredLoans.length} records</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[1000px]">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                        {['Employee', 'Loan Type', 'Principal', 'Term', 'Monthly EMI', 'Repayment Progress', 'Status', 'Actions'].map(h => (
                                            <th key={h} className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {filteredLoans.map(loan => {
                                        const progressPct = loan.termMonths > 0 ? (loan.installmentsPaid / loan.termMonths) * 100 : 0;
                                        const isActive = loan.status === 'Active';
                                        return (
                                            <tr key={loan.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        {(() => {
                                                            const emp = employees.find(e => e.id === loan.empId);
                                                            return (
                                                                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${emp?.colorClass || 'bg-slate-200 text-slate-600'}`}>
                                                                    {emp?.initials || loan.name[0]}
                                                                </div>
                                                            );
                                                        })()}
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-900 dark:text-white">{loan.name}</p>
                                                            <p className="text-[10px] text-slate-400 font-mono">{loan.empId} · {loan.id}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                                        loan.type === 'Emergency Loan' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                                                    }`}>
                                                        <span className="material-symbols-outlined text-[12px]">{loan.type === 'Emergency Loan' ? 'local_hospital' : 'payments'}</span>
                                                        {loan.type}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">{loan.principalAmount.toLocaleString()}</span>
                                                    <span className="text-[10px] text-slate-400 ml-1">MMK</span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                                    {loan.termMonths} {loan.termMonths === 1 ? 'Month' : 'Months'}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                                                    {loan.monthlyInstallment.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">MMK</span>
                                                </td>
                                                <td className="px-6 py-4 min-w-[160px]">
                                                    {isActive ? (
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full transition-all ${progressPct >= 100 ? 'bg-emerald-500' : 'bg-[#4F46E5]'}`}
                                                                        style={{ width: `${Math.min(progressPct, 100)}%` }}
                                                                    />
                                                                </div>
                                                                <span className="text-[10px] font-bold text-slate-500">{loan.installmentsPaid}/{loan.termMonths}</span>
                                                            </div>
                                                            <p className="text-[10px] text-slate-400">Balance: {loan.remainingBalance.toLocaleString()} MMK</p>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400 italic">—</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${STATUS_COLORS[loan.status] || ''}`}>
                                                            {loan.status}
                                                        </span>
                                                        {(loan as any).isPaused && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-orange-50 text-orange-700 border-orange-200">
                                                                <span className="material-symbols-outlined text-[10px]">pause_circle</span>Paused
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        {/* View Schedule */}
                                                        <button onClick={() => setSelectedLoan(loan)}
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#4F46E5] hover:bg-indigo-50 transition-colors"
                                                            title="View Repayment Schedule">
                                                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                                                        </button>
                                                        {/* Approve / Disburse / Reject based on status */}
                                                        {loan.status === 'Pending' && (
                                                            <>
                                                                {isActingAdmin ? (
                                                                    <button onClick={() => handleApprove(loan.id)}
                                                                        className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50 transition-colors" title="Approve">
                                                                        <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                                                    </button>
                                                                ) : (
                                                                    <button onClick={() => addToast(`Security Violation: '${actingAs}' is not an Administrator. Incident reported.`, 'error', 5000)}
                                                                        className="p-1.5 rounded-lg text-slate-300 dark:text-slate-700 cursor-not-allowed" title="Admin required">
                                                                        <span className="material-symbols-outlined text-[18px]">lock</span>
                                                                    </button>
                                                                )}
                                                                {isActingAdmin ? (
                                                                    <button onClick={() => handleReject(loan.id)}
                                                                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors" title="Reject">
                                                                        <span className="material-symbols-outlined text-[18px]">cancel</span>
                                                                    </button>
                                                                ) : null}
                                                            </>
                                                        )}
                                                        {loan.status === 'Approved' && (
                                                            isActingAdmin ? (
                                                                <button onClick={() => handleDisburse(loan.id)}
                                                                    className="flex items-center gap-1 px-3 py-1 bg-[#4F46E5] text-white rounded-lg text-[10px] font-bold hover:opacity-90 transition-all"
                                                                    title="Disburse Loan">
                                                                    <span className="material-symbols-outlined text-[14px]">payments</span>Disburse
                                                                </button>
                                                            ) : (
                                                                <button onClick={() => addToast(`Security Violation: '${actingAs}' is not an Administrator.`, 'error', 5000)}
                                                                    className="p-1.5 rounded-lg text-slate-300 cursor-not-allowed">
                                                                    <span className="material-symbols-outlined text-[18px]">lock</span>
                                                                </button>
                                                            )
                                                        )}
                                                        {loan.status === 'Active' && isActingAdmin && (
                                                            (loan as any).isPaused ? (
                                                                <button onClick={() => handleResume(loan.id)}
                                                                    className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50 transition-colors"
                                                                    title="Resume Repayments">
                                                                    <span className="material-symbols-outlined text-[18px]">play_circle</span>
                                                                </button>
                                                            ) : (
                                                                <button onClick={() => handlePause(loan.id)}
                                                                    className="p-1.5 rounded-lg text-orange-400 hover:bg-orange-50 transition-colors"
                                                                    title="Pause Repayments This Month">
                                                                    <span className="material-symbols-outlined text-[18px]">pause_circle</span>
                                                                </button>
                                                            )
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredLoans.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-16 text-center">
                                                <span className="material-symbols-outlined text-5xl text-slate-200 block mb-2">account_balance_wallet</span>
                                                <p className="text-slate-400 font-medium">No loan records match your filter.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between text-xs text-slate-500 font-medium">
                            <span>Loan Limit: <span className="font-bold text-slate-700 dark:text-slate-300">{loanConfig.loanLimitMultiplier}x base salary</span> · Max Emergency Term: <span className="font-bold text-slate-700 dark:text-slate-300">{loanConfig.maxEmergencyLoanTerm} months</span> · Rounding: <span className="font-bold text-slate-700 dark:text-slate-300 capitalize">{loanConfig.roundingMethod}</span></span>
                            <span>{filteredLoans.length} of {loans.length} records</span>
                        </div>
                    </div>
                </div>
            </main>

            {/* ─── Create Loan Modal ──────────────────────────────────────────── */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30">
                                    <span className="material-symbols-outlined text-[#4F46E5]">add_card</span>
                                </div>
                                <h3 className="font-bold text-slate-900 dark:text-white">New Loan Request</h3>
                            </div>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Employee */}
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Employee</label>
                                <select value={form.empId} onChange={e => setForm(p => ({ ...p, empId: e.target.value }))}
                                    className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-[#4F46E5]/20">
                                    <option value="">Select employee...</option>
                                    {employees.filter(e => e.status === 'Active').map(e => (
                                        <option key={e.id} value={e.id}>{e.name} ({e.id})</option>
                                    ))}
                                </select>
                                {selectedEmp && (
                                    <p className="text-[10px] text-slate-400 mt-1">Base Salary: <span className="font-bold text-slate-600 dark:text-slate-300">{selectedEmp.baseSalary.toLocaleString()} MMK</span> · Max Allowable: <span className="font-bold text-emerald-600">{maxAllowed.toLocaleString()} MMK</span></p>
                                )}
                            </div>
                            {/* Type */}
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Loan Type</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {(['Salary Advance', 'Emergency Loan'] as Loan['type'][]).map(t => (
                                        <button key={t} onClick={() => setForm(p => ({ ...p, type: t, termMonths: '' }))}
                                            className={`p-3 rounded-xl border-2 text-sm font-bold transition-all text-left ${form.type === t ? 'border-[#4F46E5] bg-indigo-50 text-[#4F46E5]' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                                            <span className="material-symbols-outlined text-[20px] block mb-1">{t === 'Salary Advance' ? 'payments' : 'local_hospital'}</span>
                                            {t}
                                            <p className="text-[10px] font-normal mt-0.5 opacity-70">{t === 'Salary Advance' ? `${loanConfig.salaryAdvanceTerm}-month repayment` : `Up to ${loanConfig.maxEmergencyLoanTerm} months`}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {/* Interest Rate */}
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Interest Rate (% flat) <span className="normal-case font-normal text-slate-400">· 0 for interest-free</span></label>
                                <input type="number" placeholder="e.g. 2" min={0} max={20}
                                    value={form.interestRate}
                                    onChange={e => setForm(p => ({ ...p, interestRate: e.target.value }))}
                                    className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-[#4F46E5]/20"
                                />
                            </div>
                            {/* Amount */}
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Amount (MMK)</label>
                                <input type="number" placeholder="e.g. 500000"
                                    value={form.principalAmount}
                                    onChange={e => setForm(p => ({ ...p, principalAmount: e.target.value }))}
                                    className={`w-full text-sm border rounded-lg p-3 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-[#4F46E5]/20 ${exceedsAmount ? 'border-red-400 focus:ring-red-200' : 'border-slate-200 dark:border-slate-700'}`}
                                />
                                {exceedsAmount && <p className="text-[10px] text-red-500 mt-1 font-semibold">Exceeds company limit of {maxAllowed.toLocaleString()} MMK ({loanConfig.loanLimitMultiplier}x base salary)</p>}
                            </div>
                            {/* Term (only for Emergency Loan) */}
                            {form.type === 'Emergency Loan' && (
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Repayment Term (months) <span className="normal-case font-normal text-slate-400">· Max: {loanConfig.maxEmergencyLoanTerm}</span></label>
                                    <input type="number" placeholder={`1–${loanConfig.maxEmergencyLoanTerm}`} min={1} max={loanConfig.maxEmergencyLoanTerm}
                                        value={form.termMonths}
                                        onChange={e => setForm(p => ({ ...p, termMonths: e.target.value }))}
                                        className={`w-full text-sm border rounded-lg p-3 bg-white dark:bg-slate-800 outline-none focus:ring-2 ${exceedsTerm ? 'border-red-400 focus:ring-red-200' : 'border-slate-200 dark:border-slate-700 focus:ring-[#4F46E5]/20'}`}
                                    />
                                    {exceedsTerm && (
                                        <p className="text-[10px] text-red-500 mt-1 font-semibold">Exceeds company policy limit of {loanConfig.maxEmergencyLoanTerm} months for Emergency Loans.</p>
                                    )}
                                </div>
                            )}
                            {/* Monthly EMI Preview + 30% Guard */}
                            {monthlyInstallment > 0 && !exceedsAmount && !exceedsTerm && (
                                <div className={`border rounded-xl p-3 flex items-start gap-3 ${
                                    exceedsDebtRatio
                                        ? 'bg-red-50 border-red-200'
                                        : 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100'
                                }`}>
                                    <span className={`material-symbols-outlined text-[20px] mt-0.5 ${
                                        exceedsDebtRatio ? 'text-red-500' : 'text-[#4F46E5]'
                                    }`}>{exceedsDebtRatio ? 'warning' : 'calculate'}</span>
                                    <div className="flex-1">
                                        <p className="text-[10px] text-slate-500 font-bold">Monthly Installment (auto-calculated)</p>
                                        <p className={`text-base font-black ${ exceedsDebtRatio ? 'text-red-600' : 'text-[#4F46E5]'}`}>
                                            {monthlyInstallment.toLocaleString()} MMK
                                            <span className="text-xs font-normal text-slate-400 ml-1">/ month · {loanConfig.roundingMethod} rounding</span>
                                        </p>
                                        {(Number(form.interestRate) || 0) > 0 && (
                                            <p className="text-[10px] text-slate-400 mt-0.5">Total repayable: {Math.round(totalRepayable).toLocaleString()} MMK (incl. {(Number(form.interestRate)).toFixed(1)}% flat interest)</p>
                                        )}
                                        {exceedsDebtRatio && (
                                            <p className="text-[10px] text-red-600 font-bold mt-1">Installment exceeds 30% of salary ({maxInstallment.toLocaleString()} MMK max). Increase the tenure or reduce the principal.</p>
                                        )}
                                    </div>
                                </div>
                            )}
                            {/* Reason */}
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Reason</label>
                                <textarea rows={2} placeholder="Brief reason for the loan..."
                                    value={form.reason}
                                    onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                                    className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-[#4F46E5]/20 resize-none"
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                            <button onClick={handleCreateSubmit} disabled={!canSubmit}
                                className={`flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all ${canSubmit ? 'bg-[#4F46E5] hover:opacity-90 shadow-lg shadow-indigo-200' : 'bg-slate-300 cursor-not-allowed'}`}>
                                {exceedsDebtRatio ? 'Installment Exceeds 30% Salary Cap' : exceedsTerm ? `Term Limit Exceeded (max ${loanConfig.maxEmergencyLoanTerm}mo)` : exceedsAmount ? 'Amount Exceeds Policy Limit' : 'Submit Loan Request'}
                            </button>
                            <button onClick={() => setShowCreateModal(false)} className="px-5 py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Repayment Schedule Slide-over ─────────────────────────────── */}
            {selectedLoan && (
                <div className="fixed inset-0 z-[100] flex justify-end">
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSelectedLoan(null)} />
                    <div className="relative bg-white dark:bg-slate-900 w-full max-w-md h-full shadow-2xl overflow-y-auto flex flex-col">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white">{selectedLoan.name}</h3>
                                <p className="text-xs text-slate-500">{selectedLoan.id} · {selectedLoan.type}</p>
                            </div>
                            <button onClick={() => setSelectedLoan(null)}>
                                <span className="material-symbols-outlined text-slate-400 hover:text-slate-600">close</span>
                            </button>
                        </div>
                        <div className="p-6 space-y-6 flex-1">
                            {/* Loan Summary */}
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: 'Principal', value: `${selectedLoan.principalAmount.toLocaleString()} MMK` },
                                    { label: 'Monthly EMI', value: `${selectedLoan.monthlyInstallment.toLocaleString()} MMK` },
                                    { label: 'Term', value: `${selectedLoan.termMonths} months` },
                                    { label: 'Disbursed', value: selectedLoan.disbursedDate || '—' },
                                    { label: 'Balance', value: `${selectedLoan.remainingBalance.toLocaleString()} MMK` },
                                    { label: 'Paid', value: `${selectedLoan.installmentsPaid} / ${selectedLoan.termMonths}` },
                                ].map(s => (
                                    <div key={s.label} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{s.label}</p>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{s.value}</p>
                                    </div>
                                ))}
                            </div>
                            {/* Reason */}
                            {selectedLoan.reason && (
                                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Reason</p>
                                    <p className="text-sm text-slate-600 dark:text-slate-300">{selectedLoan.reason}</p>
                                </div>
                            )}
                            {/* Action Buttons */}
                            <div className="flex flex-col gap-2">
                                {selectedLoan.status === 'Active' && isActingAdmin && (
                                    <button
                                        onClick={() => setShowCashModal(true)}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-amber-300 bg-amber-50 text-sm font-bold text-amber-700 hover:bg-amber-100 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">payments</span>
                                        Record Cash Repayment
                                    </button>
                                )}
                                <button
                                    onClick={() => handleSettlementExport(selectedLoan)}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[18px]">download</span>
                                    Download Settlement Letter (CSV)
                                </button>
                                <Link
                                    to="/settings"
                                    state={{ auditSearch: selectedLoan.id, auditFilter: 'Payroll' }}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-indigo-200 text-sm font-bold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[18px]">manage_search</span>
                                    View Transaction History
                                </Link>
                            </div>
                            {/* Repayment Schedule */}
                            <div>
                                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Repayment Schedule</h4>
                                {selectedLoan.schedule.length > 0 ? (
                                    <div className="space-y-2">
                                        {selectedLoan.schedule.map((inst, i) => (
                                            <div key={i} className={`flex items-center justify-between p-3 rounded-xl border text-sm ${
                                                inst.status === 'Paid' ? 'bg-emerald-50 border-emerald-100' :
                                                inst.status === 'Overdue' ? 'bg-red-50 border-red-100' :
                                                'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                                            }`}>
                                                <div className="flex items-center gap-2">
                                                    <span className={`material-symbols-outlined text-[16px] ${inst.status === 'Paid' ? 'text-emerald-500' : inst.status === 'Overdue' ? 'text-red-500' : 'text-slate-300'}`}
                                                        style={{ fontVariationSettings: inst.status === 'Paid' ? "'FILL' 1" : "'FILL' 0" }}>
                                                        {inst.status === 'Paid' ? 'check_circle' : inst.status === 'Overdue' ? 'error' : 'radio_button_unchecked'}
                                                    </span>
                                                    <span className="font-semibold text-slate-700 dark:text-slate-300">{inst.month}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-bold text-slate-900 dark:text-white tabular-nums">{inst.amount.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">MMK</span></span>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                        inst.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                                                        inst.status === 'Overdue' ? 'bg-red-100 text-red-700' :
                                                        'bg-slate-100 text-slate-500'
                                                    }`}>{inst.status}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-slate-400">
                                        <span className="material-symbols-outlined text-3xl block mb-2">schedule</span>
                                        <p className="text-sm">Schedule will be created on disbursement.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Cash Repayment Modal ───────────────────────────────────────── */}
            {showCashModal && selectedLoan && (() => {
                const amt        = Number(cashForm.amount);
                const overLimit  = amt > selectedLoan.remainingBalance;
                const canProceed = cashConfirmed && amt > 0 && !overLimit && cashForm.reason.trim().length > 0;
                return (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/30">
                                        <span className="material-symbols-outlined text-amber-600 text-[20px]">payments</span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">Record Cash Repayment</h3>
                                        <p className="text-[10px] text-slate-400 font-mono">{selectedLoan.name} · {selectedLoan.id}</p>
                                    </div>
                                </div>
                                <button onClick={closeCashModal} className="text-slate-400 hover:text-slate-600">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <div className="p-5 space-y-4">
                                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 flex items-start gap-2">
                                    <span className="material-symbols-outlined text-amber-600 text-[18px] mt-0.5 shrink-0">warning</span>
                                    <p className="text-[11px] text-amber-800 dark:text-amber-300 font-semibold leading-relaxed">This will manually reduce the company's debt ledger for <span className="font-black">{selectedLoan.name}</span>. This action writes a permanent audit log entry and cannot be undone.</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Cash Amount (MMK)</label>
                                    <input type="number" placeholder="e.g. 500000" min={1}
                                        value={cashForm.amount}
                                        onChange={e => setCashForm(p => ({ ...p, amount: e.target.value }))}
                                        className={`w-full text-sm border rounded-lg p-3 bg-white dark:bg-slate-800 outline-none focus:ring-2 ${overLimit ? 'border-red-400 focus:ring-red-200' : 'border-slate-200 dark:border-slate-700 focus:ring-amber-300'}`}
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">
                                        Outstanding balance: <span className="font-bold text-slate-700 dark:text-slate-300">{selectedLoan.remainingBalance.toLocaleString()} MMK</span>
                                        {amt > 0 && !overLimit && amt < selectedLoan.remainingBalance && (
                                            <span className="ml-2 text-emerald-600 font-bold">→ {(selectedLoan.remainingBalance - amt).toLocaleString()} MMK will remain</span>
                                        )}
                                        {amt >= selectedLoan.remainingBalance && !overLimit && (
                                            <span className="ml-2 text-emerald-600 font-black">→ Loan fully settled ✓</span>
                                        )}
                                    </p>
                                    {overLimit && <p className="text-[10px] text-red-500 font-bold mt-1">Amount cannot exceed the outstanding balance of {selectedLoan.remainingBalance.toLocaleString()} MMK.</p>}
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Reason <span className="text-red-500">*</span></label>
                                    <input type="text" placeholder="e.g. Employee Resignation - Cash Settlement"
                                        value={cashForm.reason}
                                        onChange={e => setCashForm(p => ({ ...p, reason: e.target.value }))}
                                        className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-amber-300"
                                    />
                                </div>
                                <label className="flex items-start gap-3 cursor-pointer select-none">
                                    <input type="checkbox" checked={cashConfirmed} onChange={e => setCashConfirmed(e.target.checked)}
                                        className="mt-0.5 w-4 h-4 shrink-0 accent-amber-500 cursor-pointer" />
                                    <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed">I confirm this cash amount has been physically received and this entry will be permanently recorded in the security audit log with the stated reason.</span>
                                </label>
                            </div>
                            <div className="p-5 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                                <button onClick={handleCashRepayment} disabled={!canProceed}
                                    className={`flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all ${canProceed ? 'bg-amber-500 hover:opacity-90 shadow-lg shadow-amber-200' : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed'}`}>
                                    Confirm &amp; Record Payment
                                </button>
                                <button onClick={closeCashModal} className="px-5 py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        </div>
    );
}
