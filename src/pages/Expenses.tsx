import React, { useState, useMemo, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useAppData } from '../context/AppDataContext';
import { useNotifications } from '../context/NotificationProvider';
import { ExpenseRequest } from '../context/AppDataContext';

// ─── Rejection Reason Modal ───────────────────────────────────────────────────
function RejectReasonModal({
    expense,
    onConfirm,
    onCancel,
}: {
    expense: ExpenseRequest;
    onConfirm: (reason: string) => void;
    onCancel: () => void;
}) {
    const [reason, setReason] = useState('');
    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[28px] shadow-2xl border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                        <span className="material-symbols-outlined">cancel</span>
                    </div>
                    <div>
                        <h3 className="font-black text-slate-900 dark:text-white text-sm">Reject Expense Claim</h3>
                        <p className="text-[11px] text-slate-500 font-medium">{expense.id} · {expense.employeeName}</p>
                    </div>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Rejection Reason <span className="text-rose-500">*</span></label>
                        <textarea
                            rows={3}
                            autoFocus
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            placeholder="e.g. Receipt missing, amount exceeds policy limit..."
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium resize-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none dark:text-white"
                        />
                    </div>
                    <div className="flex gap-3 pt-1">
                        <button
                            onClick={onCancel}
                            className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => { if (reason.trim()) onConfirm(reason.trim()); }}
                            disabled={!reason.trim()}
                            className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-sm font-bold shadow-sm shadow-rose-200 transition-all disabled:opacity-50"
                        >
                            Confirm Rejection
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Receipt Preview Modal ────────────────────────────────────────────────────
function ReceiptPreviewModal({ urls, onClose }: { urls: string[]; onClose: () => void }) {
    const [current, setCurrent] = useState(0);
    return (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[28px] shadow-2xl border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="font-black text-slate-900 dark:text-white text-sm">Receipt Preview ({current + 1}/{urls.length})</h3>
                    <button onClick={onClose} className="size-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                </div>
                <div className="p-4 flex items-center justify-center bg-slate-50 dark:bg-slate-800/50 min-h-[300px]">
                    {urls[current]?.startsWith('blob:') ? (
                        <img src={urls[current]} alt="Receipt" className="max-h-[400px] object-contain rounded-xl shadow" />
                    ) : (
                        <div className="text-center text-slate-400">
                            <span className="material-symbols-outlined text-5xl block mb-2">description</span>
                            <p className="text-sm font-bold">PDF Receipt</p>
                            <a href={urls[current]} target="_blank" rel="noopener noreferrer" className="text-[#4F46E5] text-xs font-bold mt-1 block hover:underline">Open in New Tab</a>
                        </div>
                    )}
                </div>
                {urls.length > 1 && (
                    <div className="flex justify-center gap-3 p-4 border-t border-slate-100 dark:border-slate-800">
                        <button onClick={() => setCurrent(p => Math.max(0, p - 1))} disabled={current === 0} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-200 transition">← Prev</button>
                        <button onClick={() => setCurrent(p => Math.min(urls.length - 1, p + 1))} disabled={current === urls.length - 1} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-200 transition">Next →</button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        Pending:   'bg-amber-50 text-amber-700 border-amber-200',
        Approved:  'bg-emerald-50 text-emerald-700 border-emerald-200',
        Processed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        Rejected:  'bg-rose-50 text-rose-700 border-rose-200',
    };
    return (
        <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${map[status] ?? 'bg-slate-50 text-slate-700 border-slate-200'}`}>
            {status}
        </span>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Expenses() {
    const {
        systemSettings,
        employees,
        expenses,
        submitExpense,
        handleExpenseApproval,
        isAdmin,
    } = useAppData();
    const { pushNotification } = useNotifications();

    type TabType = 'Submit' | 'My Requests' | 'Approvals Inbox';
    const [activeTab, setActiveTab] = useState<TabType>('Submit');

    // Submit form state
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [amount, setAmount] = useState<number | ''>('');
    const [currency, setCurrency] = useState('MMK');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState('');
    const [attachments, setAttachments] = useState<File[]>([]);

    // Approvals Inbox state
    const [inboxFilter, setInboxFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('Pending');
    const [rejectTarget, setRejectTarget] = useState<ExpenseRequest | null>(null);
    const [previewUrls, setPreviewUrls] = useState<string[] | null>(null);
    const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    const loggedInEmpId = 'EMP-001';
    const isUserAdmin = isAdmin(loggedInEmpId);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Toast helper ──────────────────────────────────────────────────────────
    const showToast = (text: string, type: 'success' | 'error') => {
        setToastMsg({ text, type });
        setTimeout(() => setToastMsg(null), 3500);
    };

    // ── File handlers ─────────────────────────────────────────────────────────
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) setAttachments(Array.from(e.target.files));
    };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files) setAttachments(Array.from(e.dataTransfer.files));
    };

    // ── Submit handler ────────────────────────────────────────────────────────
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!categoryId || !amount || amount <= 0 || !description) return;

        const attachmentUrls = attachments.map(f => URL.createObjectURL(f));
        const targetEmpId = isUserAdmin ? (selectedEmployeeId || loggedInEmpId) : loggedInEmpId;
        const targetEmp = employees.find(emp => emp.id === targetEmpId);
        if (!targetEmp) return;

        submitExpense({ employeeId: targetEmpId, employeeName: targetEmp.name, categoryId, amount: Number(amount), currency, date, description, attachments: attachmentUrls, approverId: 'ADM-001' });
        setAmount(''); setDescription(''); setAttachments([]);
        showToast('Expense claim submitted successfully!', 'success');
        setActiveTab('My Requests');
    };

    // ── Approval handlers ─────────────────────────────────────────────────────
    const handleApprove = (expenseId: string) => {
        const exp = expenses.find(e => e.id === expenseId);
        const result = handleExpenseApproval(expenseId, 'Approve', loggedInEmpId);
        showToast(result.message, result.success ? 'success' : 'error');
        if (result.success && exp) {
            pushNotification({
                title: 'Expense Claim Approved ✅',
                body: `${exp.employeeName}'s ${exp.categoryId} claim of ${exp.amount.toLocaleString()} ${exp.currency} has been approved and queued for reimbursement.`,
                category: 'Financial', priority: 'high',
                icon: 'receipt_long',
                iconBg: 'bg-violet-100 dark:bg-violet-900/30', iconColor: 'text-violet-600 dark:text-violet-400',
                actionRoute: '/expenses', actionLabel: 'View Claim',
                badge: 'Approved', badgeColor: 'violet', empId: exp.employeeId, sourceId: expenseId,
            });
        }
    };

    const handleRejectConfirm = (reason: string) => {
        if (!rejectTarget) return;
        const result = handleExpenseApproval(rejectTarget.id, 'Reject', loggedInEmpId, reason);
        showToast(result.message, result.success ? 'success' : 'error');
        if (result.success) {
            pushNotification({
                title: 'Expense Claim Rejected',
                body: `${rejectTarget.employeeName}'s ${rejectTarget.categoryId} claim of ${rejectTarget.amount.toLocaleString()} ${rejectTarget.currency} was rejected. Reason: ${reason}`,
                category: 'Financial', priority: 'normal',
                icon: 'receipt_long',
                iconBg: 'bg-rose-100 dark:bg-rose-900/30', iconColor: 'text-rose-600 dark:text-rose-400',
                actionRoute: '/expenses', actionLabel: 'View Claim',
                badge: 'Rejected', badgeColor: 'rose', empId: rejectTarget.employeeId, sourceId: rejectTarget.id,
            });
        }
        setRejectTarget(null);
    };

    // ── Derived data ──────────────────────────────────────────────────────────
    const myRequests = expenses.filter(e => e.employeeId === loggedInEmpId);

    const inboxRequests = useMemo(() => {
        const all = inboxFilter === 'All' ? expenses : expenses.filter(e => e.status === inboxFilter);
        return [...all].sort((a, b) => {
            const order: Record<string, number> = { Pending: 0, Approved: 1, Processed: 2, Rejected: 3 };
            return (order[a.status] ?? 9) - (order[b.status] ?? 9);
        });
    }, [expenses, inboxFilter]);

    const pendingCount = expenses.filter(e => e.status === 'Pending').length;

    const stats = useMemo(() => {
        const myExpenses = expenses.filter(e => e.employeeId === loggedInEmpId);
        return {
            pending: myExpenses.filter(e => e.status === 'Pending').length,
            approved: myExpenses.filter(e => e.status === 'Approved' || e.status === 'Processed').reduce((acc, curr) => acc + curr.amount, 0),
            rejected: myExpenses.filter(e => e.status === 'Rejected').length,
        };
    }, [expenses]);

    const inboxStats = useMemo(() => ({
        pending: expenses.filter(e => e.status === 'Pending').length,
        totalPending: expenses.filter(e => e.status === 'Pending').reduce((s, e) => s + e.amount, 0),
        processed: expenses.filter(e => e.status === 'Approved' || e.status === 'Processed').length,
    }), [expenses]);

    if (!systemSettings.expenseModuleEnabled) {
        return (
            <div className="flex h-screen w-full font-display text-slate-900 bg-slate-50 antialiased overflow-hidden">
                <Sidebar activeTab="Expenses" />
                <main className="flex-1 flex flex-col h-full overflow-hidden relative ml-[280px]">
                    <Header title="Expense Tracking" subtitle="Service Disabled" />
                    <div className="flex-1 flex justify-center items-center">
                        <div className="text-center">
                            <span className="material-symbols-outlined text-6xl text-slate-300 mb-4 block">receipt_long</span>
                            <h2 className="text-xl font-bold text-slate-700">Expense Tracking is Disabled</h2>
                            <p className="text-slate-500 mt-2">Please ask your Administrator to enable this module in the Settings panel.</p>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    const tabs: TabType[] = isUserAdmin ? ['Submit', 'My Requests', 'Approvals Inbox'] : ['Submit', 'My Requests'];

    return (
        <div className="flex h-screen w-full font-display text-slate-900 bg-slate-50 antialiased overflow-hidden">
            <Sidebar activeTab="Expenses" />

            {/* Modals */}
            {rejectTarget && (
                <RejectReasonModal
                    expense={rejectTarget}
                    onConfirm={handleRejectConfirm}
                    onCancel={() => setRejectTarget(null)}
                />
            )}
            {previewUrls && (
                <ReceiptPreviewModal urls={previewUrls} onClose={() => setPreviewUrls(null)} />
            )}

            {/* Toast */}
            {toastMsg && (
                <div className={`fixed top-6 right-6 z-[200] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-white text-sm font-bold animate-in slide-in-from-top-4 duration-300 ${toastMsg.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                    <span className="material-symbols-outlined text-[18px]">{toastMsg.type === 'success' ? 'check_circle' : 'error'}</span>
                    {toastMsg.text}
                </div>
            )}

            <main className="flex-1 flex flex-col h-full overflow-hidden relative ml-[280px]">
                <Header
                    title="Expense Tracking"
                    subtitle="Submit reimbursement requests, track approvals, and manage corporate spend"
                />

                <div className="flex-1 overflow-y-auto px-8 pb-32">
                    <div className="max-w-5xl mx-auto py-6">

                        {/* ── Stats Row ─────────────────────────────────────────────────── */}
                        {activeTab !== 'Approvals Inbox' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Pending Review</p>
                                        <h3 className="text-3xl font-black text-slate-900">{stats.pending}</h3>
                                    </div>
                                    <div className="size-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                                        <span className="material-symbols-outlined">pending_actions</span>
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Reimbursed This Month</p>
                                        <h3 className="text-2xl font-black text-[#4F46E5]">{stats.approved.toLocaleString()} <span className="text-lg">MMK</span></h3>
                                    </div>
                                    <div className="size-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                        <span className="material-symbols-outlined">payments</span>
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Rejected Requests</p>
                                        <h3 className="text-3xl font-black text-rose-600">{stats.rejected}</h3>
                                    </div>
                                    <div className="size-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                                        <span className="material-symbols-outlined">cancel</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Approvals Inbox stats */}
                        {activeTab === 'Approvals Inbox' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                <div className="bg-white p-6 rounded-2xl border border-amber-200 shadow-sm flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-1">Awaiting Action</p>
                                        <h3 className="text-3xl font-black text-slate-900">{inboxStats.pending}</h3>
                                    </div>
                                    <div className="size-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                                        <span className="material-symbols-outlined">hourglass_empty</span>
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Pending Reimbursement</p>
                                        <h3 className="text-2xl font-black text-[#4F46E5]">{inboxStats.totalPending.toLocaleString()} <span className="text-lg">MMK</span></h3>
                                    </div>
                                    <div className="size-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                        <span className="material-symbols-outlined">account_balance_wallet</span>
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Processed Claims</p>
                                        <h3 className="text-3xl font-black text-emerald-600">{inboxStats.processed}</h3>
                                    </div>
                                    <div className="size-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                        <span className="material-symbols-outlined">task_alt</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Tab Navigation ─────────────────────────────────────────────── */}
                        <nav className="flex border-b border-slate-200 mb-8 gap-8">
                            {tabs.map(tab => (
                                <button
                                    key={tab}
                                    id={`expense-tab-${tab.toLowerCase().replace(/ /g, '-')}`}
                                    onClick={() => setActiveTab(tab)}
                                    className={`pb-4 border-b-[3px] transition-colors font-bold flex items-center gap-2 ${activeTab === tab ? 'border-[#4F46E5] text-[#4F46E5]' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
                                >
                                    {tab === 'Submit' ? 'Submit New Request' : tab === 'My Requests' ? 'My History' : 'Approvals Inbox'}
                                    {tab === 'Approvals Inbox' && pendingCount > 0 && (
                                        <span className="size-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center leading-none">
                                            {pendingCount > 9 ? '9+' : pendingCount}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </nav>

                        {/* ══════════════════════════════════════════════════════════════════ */}
                        {/* TAB 1: SUBMIT NEW REQUEST                                        */}
                        {/* ══════════════════════════════════════════════════════════════════ */}
                        {activeTab === 'Submit' && (
                            <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in max-w-3xl">
                                <div className="p-8 space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Expense Category <span className="text-rose-500">*</span></label>
                                            <select required value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] outline-none text-sm font-bold">
                                                <option value="" disabled>Select Category</option>
                                                {systemSettings.expenseCategories.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Date of Expense <span className="text-rose-500">*</span></label>
                                            <input type="date" required value={date} onChange={e => setDate(e.target.value)} max={new Date().toISOString().split('T')[0]} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] outline-none text-sm font-bold" />
                                        </div>
                                    </div>

                                    {isUserAdmin && (
                                        <div className="space-y-2 border-l-4 border-indigo-200 pl-4 py-1">
                                            <label className="text-xs font-black text-indigo-500 uppercase tracking-widest">Filing On Behalf Of (Admin Only)</label>
                                            <select value={selectedEmployeeId} onChange={e => setSelectedEmployeeId(e.target.value)} className="w-full px-4 py-3 bg-indigo-50/30 border border-indigo-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] outline-none text-sm font-bold text-indigo-900">
                                                <option value="">Myself</option>
                                                {employees.map(emp => (
                                                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.dept})</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Total Amount <span className="text-rose-500">*</span></label>
                                        <div className="flex gap-2">
                                            <input type="number" required min="0" placeholder="0.00" value={amount} onChange={e => setAmount(Number(e.target.value) || '')} className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] outline-none text-lg font-black text-slate-900" />
                                            <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-24 px-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold outline-none cursor-pointer">
                                                <option value="MMK">MMK</option>
                                                <option value="USD">USD</option>
                                            </select>
                                        </div>
                                        {categoryId && systemSettings.expenseCategories.find(c => c.id === categoryId)?.monthlyLimit && (
                                            <p className="text-[10px] font-bold text-amber-600 pl-1 mt-1 flex items-center gap-1">
                                                <span className="material-symbols-outlined !text-[12px]">warning</span>
                                                Budget Limit: {systemSettings.expenseCategories.find(c => c.id === categoryId)?.monthlyLimit?.toLocaleString()} MMK
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Description & Business Purpose <span className="text-rose-500">*</span></label>
                                        <textarea required rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Provide details about the business purpose of this expense..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] outline-none text-sm font-medium resize-none" />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1 flex justify-between">
                                            <span>Receipts & Attachments</span>
                                            <span className="text-slate-400 font-medium normal-case tracking-normal">Optional for &lt; 10,000 MMK</span>
                                        </label>
                                        <div onDragOver={e => e.preventDefault()} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors p-8 flex flex-col items-center justify-center cursor-pointer group">
                                            <input type="file" multiple accept="image/*,.pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                                            <span className="material-symbols-outlined text-4xl text-slate-400 group-hover:text-[#4F46E5] transition-colors mb-3">cloud_upload</span>
                                            <p className="text-sm font-bold text-slate-600">Click or drag receipts here</p>
                                            <p className="text-xs font-medium text-slate-400 mt-1">Supports JPG/PNG screenshots of receipts</p>
                                        </div>
                                        {attachments.length > 0 && (
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                                                {attachments.map((file, idx) => (
                                                    <div key={idx} className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-3 shadow-sm relative overflow-hidden group">
                                                        <div className="size-8 rounded bg-[#4F46E5]/10 text-[#4F46E5] flex items-center justify-center shrink-0">
                                                            <span className="material-symbols-outlined text-[16px]">receipt</span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-bold text-slate-700 truncate">{file.name}</p>
                                                            <p className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(0)} KB</p>
                                                        </div>
                                                        <button type="button" onClick={(e) => { e.stopPropagation(); setAttachments(prev => prev.filter((_, i) => i !== idx)); }} className="absolute right-2 text-rose-500 opacity-0 group-hover:opacity-100 bg-rose-50 rounded-full p-1 transition-all">
                                                            <span className="material-symbols-outlined text-[16px] block">close</span>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="bg-slate-50 border-t border-slate-100 p-6 flex justify-end">
                                    <button type="submit" className="bg-[#4F46E5] hover:bg-[#4338CA] text-white px-8 py-3 rounded-xl text-sm font-bold shadow-sm transition-all shadow-[#4F46E5]/20 w-full md:w-auto">
                                        Submit Request
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* ══════════════════════════════════════════════════════════════════ */}
                        {/* TAB 2: MY HISTORY                                                */}
                        {/* ══════════════════════════════════════════════════════════════════ */}
                        {activeTab === 'My Requests' && (
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in pb-16">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-widest font-black text-slate-500">
                                            <th className="py-4 px-6">ID & Date</th>
                                            <th className="py-4 px-6">Category</th>
                                            <th className="py-4 px-6">Description</th>
                                            <th className="py-4 px-6 text-right">Amount</th>
                                            <th className="py-4 px-6 text-center">Receipt</th>
                                            <th className="py-4 px-6">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-sm border-b border-slate-100">
                                        {myRequests.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                                                    No expense requests submitted yet.
                                                </td>
                                            </tr>
                                        ) : myRequests.map(req => (
                                            <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="py-4 px-6">
                                                    <div className="font-mono font-bold text-slate-900 text-xs">{req.id}</div>
                                                    <div className="text-[11px] text-slate-500 font-medium mt-0.5">{req.date}</div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <span className="font-bold text-slate-700">
                                                        {systemSettings.expenseCategories.find(c => c.id === req.categoryId)?.name || req.categoryId}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6 text-slate-600 max-w-[200px] truncate">{req.description}</td>
                                                <td className="py-4 px-6 text-right">
                                                    <div className="font-black text-slate-900">{req.amount.toLocaleString()}</div>
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase">{req.currency}</div>
                                                </td>
                                                <td className="py-4 px-6 text-center">
                                                    {req.attachments && req.attachments.length > 0 ? (
                                                        <button onClick={() => setPreviewUrls(req.attachments)} className="flex items-center justify-center gap-1 text-[#4F46E5] bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg text-xs font-bold w-max mx-auto transition-colors">
                                                            <span className="material-symbols-outlined text-[14px]">attachment</span>
                                                            {req.attachments.length}
                                                        </button>
                                                    ) : '—'}
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="flex flex-col gap-1">
                                                        <StatusBadge status={req.status} />
                                                        {req.status === 'Rejected' && req.rejectionReason && (
                                                            <p className="text-[10px] text-rose-500 font-medium max-w-[160px] leading-tight">{req.rejectionReason}</p>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* ══════════════════════════════════════════════════════════════════ */}
                        {/* TAB 3: APPROVALS INBOX (Admin only)                              */}
                        {/* ══════════════════════════════════════════════════════════════════ */}
                        {activeTab === 'Approvals Inbox' && isUserAdmin && (
                            <div className="space-y-4 animate-fade-in">

                                {/* Filter pills */}
                                <div className="flex items-center gap-2 mb-2">
                                    {(['All', 'Pending', 'Approved', 'Rejected'] as const).map(f => (
                                        <button
                                            key={f}
                                            id={`inbox-filter-${f.toLowerCase()}`}
                                            onClick={() => setInboxFilter(f)}
                                            className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest transition-all border ${
                                                inboxFilter === f
                                                    ? 'bg-[#4F46E5] text-white border-[#4F46E5] shadow-sm'
                                                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-700'
                                            }`}
                                        >
                                            {f}
                                            {f === 'Pending' && pendingCount > 0 && (
                                                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] ${inboxFilter === 'Pending' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-600'}`}>
                                                    {pendingCount}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>

                                {/* Claims table */}
                                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-widest font-black text-slate-500">
                                                <th className="py-4 px-6">Employee</th>
                                                <th className="py-4 px-6">Category</th>
                                                <th className="py-4 px-6">Description</th>
                                                <th className="py-4 px-6">Date</th>
                                                <th className="py-4 px-6 text-right">Amount</th>
                                                <th className="py-4 px-6 text-center">Receipt</th>
                                                <th className="py-4 px-6">Status</th>
                                                <th className="py-4 px-6">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-sm">
                                            {inboxRequests.length === 0 ? (
                                                <tr>
                                                    <td colSpan={8} className="py-16 text-center">
                                                        <span className="material-symbols-outlined text-5xl text-slate-300 block mb-3">inbox</span>
                                                        <p className="text-slate-400 font-bold text-sm">No expense claims in this view.</p>
                                                    </td>
                                                </tr>
                                            ) : inboxRequests.map(req => {
                                                const emp = employees.find(e => e.id === req.employeeId);
                                                const catName = systemSettings.expenseCategories.find(c => c.id === req.categoryId)?.name || req.categoryId;
                                                const isPending = req.status === 'Pending';

                                                return (
                                                    <tr key={req.id} className={`transition-colors ${isPending ? 'hover:bg-amber-50/40' : 'hover:bg-slate-50'}`}>
                                                        {/* Employee */}
                                                        <td className="py-4 px-6">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`size-9 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0 ${emp?.colorClass ?? 'bg-indigo-500 text-white'}`}>
                                                                    {req.employeeName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-slate-900 text-xs">{req.employeeName}</p>
                                                                    <p className="text-[10px] text-slate-400 font-mono">{req.id}</p>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* Category */}
                                                        <td className="py-4 px-6">
                                                            <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[11px] font-bold">{catName}</span>
                                                        </td>

                                                        {/* Description */}
                                                        <td className="py-4 px-6 text-slate-600 max-w-[180px]">
                                                            <p className="truncate text-xs">{req.description}</p>
                                                            {req.status === 'Rejected' && req.rejectionReason && (
                                                                <p className="text-[10px] text-rose-500 font-medium mt-0.5 truncate">↳ {req.rejectionReason}</p>
                                                            )}
                                                        </td>

                                                        {/* Date */}
                                                        <td className="py-4 px-6">
                                                            <span className="text-xs text-slate-600 font-medium">{req.date}</span>
                                                        </td>

                                                        {/* Amount */}
                                                        <td className="py-4 px-6 text-right">
                                                            <div className="font-black text-slate-900 text-sm">{req.amount.toLocaleString()}</div>
                                                            <div className="text-[10px] text-slate-400 font-bold uppercase">{req.currency}</div>
                                                        </td>

                                                        {/* Receipt */}
                                                        <td className="py-4 px-6 text-center">
                                                            {req.attachments && req.attachments.length > 0 ? (
                                                                <button
                                                                    onClick={() => setPreviewUrls(req.attachments)}
                                                                    className="flex items-center justify-center gap-1 text-[#4F46E5] bg-indigo-50 hover:bg-indigo-100 px-2 py-1.5 rounded-lg text-[11px] font-bold w-max mx-auto transition-colors"
                                                                >
                                                                    <span className="material-symbols-outlined text-[14px]">visibility</span>
                                                                    View ({req.attachments.length})
                                                                </button>
                                                            ) : (
                                                                <span className="text-slate-300 text-xs font-bold">No receipt</span>
                                                            )}
                                                        </td>

                                                        {/* Status */}
                                                        <td className="py-4 px-6">
                                                            <StatusBadge status={req.status} />
                                                        </td>

                                                        {/* Actions */}
                                                        <td className="py-4 px-6">
                                                            {isPending ? (
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        id={`approve-expense-${req.id}`}
                                                                        onClick={() => handleApprove(req.id)}
                                                                        className="flex items-center gap-1 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-black rounded-xl transition-all active:scale-95 shadow-sm shadow-emerald-200 whitespace-nowrap"
                                                                    >
                                                                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                                                        Approve
                                                                    </button>
                                                                    <button
                                                                        id={`reject-expense-${req.id}`}
                                                                        onClick={() => setRejectTarget(req)}
                                                                        className="flex items-center gap-1 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[11px] font-black rounded-xl transition-all active:scale-95 border border-rose-200 whitespace-nowrap"
                                                                    >
                                                                        <span className="material-symbols-outlined text-[14px]">cancel</span>
                                                                        Reject
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-bold">
                                                                    {req.approvedBy && (
                                                                        <>
                                                                            <span className="material-symbols-outlined text-[14px]">person</span>
                                                                            <span>{req.approvedBy}</span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>

                                    {/* Payroll bridge note */}
                                    {inboxStats.processed > 0 && (
                                        <div className="flex items-center gap-3 p-4 bg-indigo-50 border-t border-indigo-100 m-4 rounded-2xl">
                                            <span className="material-symbols-outlined text-indigo-500">info</span>
                                            <p className="text-xs text-indigo-700 font-medium">
                                                <strong>Payroll Bridge Active:</strong> Approved expense claims are automatically written to Payroll Adjustments for inclusion in the next payroll run.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </main>
        </div>
    );
}
