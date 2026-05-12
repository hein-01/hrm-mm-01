import React, { useState, useMemo, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useAppData } from '../context/AppDataContext';
import { useNotifications } from '../context/NotificationProvider';
import { useSystemCalendar } from '../context/SystemCalendarContext';
import { ProfileChangeCategory, ProfileChangeRequest } from '../types/hrms.types';
import { countWorkingDays } from '../utils/leaveBalance';
import { useApprovals } from '../context/ApprovalContext';

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = 'Submit' | 'Apply Leave' | 'Request OT' | 'Shift Swap' | 'My Requests' | 'Approval Queue';

const OT_TYPES = ['Weekday 1.5x', 'Rest Day 2.0x', 'Holiday 2.0x'] as const;
type OTType = typeof OT_TYPES[number];

const LEAVE_TYPES = ['Casual', 'Medical', 'Annual', 'Maternity', 'Paternity', 'Unpaid'] as const;
type LeaveType = typeof LEAVE_TYPES[number];

const LEAVE_TYPE_CONFIG: Record<LeaveType, { icon: string; color: string; bg: string; light: string; maxDays: number }> = {
    Casual:    { icon: 'beach_access',    color: 'text-blue-600',   bg: 'bg-blue-600',   light: 'bg-blue-50 border-blue-200',   maxDays: 10 },
    Medical:   { icon: 'local_hospital',  color: 'text-rose-600',   bg: 'bg-rose-600',   light: 'bg-rose-50 border-rose-200',   maxDays: 14 },
    Annual:    { icon: 'flight_takeoff',  color: 'text-indigo-600', bg: 'bg-indigo-600', light: 'bg-indigo-50 border-indigo-200', maxDays: 15 },
    Maternity: { icon: 'child_care',      color: 'text-pink-600',   bg: 'bg-pink-600',   light: 'bg-pink-50 border-pink-200',   maxDays: 98 },
    Paternity: { icon: 'family_restroom', color: 'text-cyan-600',   bg: 'bg-cyan-600',   light: 'bg-cyan-50 border-cyan-200',   maxDays: 15 },
    Unpaid:    { icon: 'money_off',       color: 'text-slate-600',  bg: 'bg-slate-500',  light: 'bg-slate-50 border-slate-200', maxDays: 999 },
};

// ─── Category config ──────────────────────────────────────────────────────────
const CATEGORIES: {
    id: ProfileChangeCategory;
    icon: string;
    color: string;
    bg: string;
    light: string;
    fields: { label: string; placeholder: string; type?: string }[];
}[] = [
    {
        id: 'Personal Info',
        icon: 'person',
        color: 'text-indigo-600',
        bg: 'bg-indigo-600',
        light: 'bg-indigo-50 border-indigo-200 text-indigo-700',
        fields: [
            { label: 'Mobile', placeholder: '+95 9...' },
            { label: 'Personal Email', placeholder: 'e.g. personal@gmail.com' },
            { label: 'Township', placeholder: 'e.g. Hlaing, Yangon' },
            { label: 'Current Address', placeholder: 'Full residential address' },
        ],
    },
    {
        id: 'Bank / Financial',
        icon: 'account_balance',
        color: 'text-emerald-600',
        bg: 'bg-emerald-600',
        light: 'bg-emerald-50 border-emerald-200 text-emerald-700',
        fields: [
            { label: 'Bank Name', placeholder: 'e.g. KBZ, AYA, CB...' },
            { label: 'Account Number', placeholder: 'Account Number' },
        ],
    },
    {
        id: 'Emergency Contact',
        icon: 'emergency_home',
        color: 'text-amber-600',
        bg: 'bg-amber-500',
        light: 'bg-amber-50 border-amber-200 text-amber-700',
        fields: [
            { label: 'Emergency Contact Name', placeholder: 'Full name' },
            { label: 'Emergency Contact Phone', placeholder: '+95 9...' },
            { label: 'Relationship', placeholder: 'e.g. Spouse, Parent' },
        ],
    },
    {
        id: 'Tax Relief',
        icon: 'receipt_long',
        color: 'text-teal-600',
        bg: 'bg-teal-600',
        light: 'bg-teal-50 border-teal-200 text-teal-700',
        fields: [
            { label: 'Has Spouse', placeholder: 'Yes/No for tax relief', type: 'checkbox' },
            { label: 'Parents Count', placeholder: '0/1/2 dependent parents', type: 'number' },
            { label: 'Children Count', placeholder: 'Number of children', type: 'number' },
        ],
    },
    {
        id: 'Document Upload',
        icon: 'upload_file',
        color: 'text-violet-600',
        bg: 'bg-violet-600',
        light: 'bg-violet-50 border-violet-200 text-violet-700',
        fields: [],
    },
];

const DOC_TYPES = ['NRC', 'Passport', 'Visa', 'Work Permit', 'Contract', 'Certificate', 'Other'];

function catConfig(cat: ProfileChangeCategory) {
    return CATEGORIES.find(c => c.id === cat) ?? CATEGORIES[0];
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: ProfileChangeRequest['status'] }) {
    const map = {
        Pending:  'bg-amber-50 border-amber-200 text-amber-700',
        Approved: 'bg-emerald-50 border-emerald-200 text-emerald-700',
        Rejected: 'bg-rose-50 border-rose-200 text-rose-700',
    };
    const icons = { Pending: 'schedule', Approved: 'check_circle', Rejected: 'cancel' };
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border ${map[status]}`}>
            <span className="material-symbols-outlined text-[11px]">{icons[status]}</span>
            {status}
        </span>
    );
}

// ─── Diff row in approval detail ─────────────────────────────────────────────
function DiffRow({ label, oldVal, newVal }: { label: string; oldVal?: string; newVal: string }) {
    const changed = oldVal !== undefined && oldVal !== '' && oldVal !== newVal;
    return (
        <div className={`rounded-xl border p-3 ${changed ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
            {changed ? (
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-slate-400 line-through">{oldVal}</span>
                    <span className="material-symbols-outlined text-[13px] text-amber-500">arrow_forward</span>
                    <span className="text-xs font-black text-amber-800">{newVal}</span>
                </div>
            ) : (
                <p className="text-xs font-bold text-slate-700">{newVal}</p>
            )}
        </div>
    );
}

// ─── Reject Modal ─────────────────────────────────────────────────────────────
function RejectModal({ onConfirm, onClose }: { onConfirm: (reason: string) => void; onClose: () => void }) {
    const [reason, setReason] = useState('');
    return (
        <>
            <div className="fixed inset-0 z-[300] bg-black/30 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-0 z-[301] flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="size-10 rounded-xl bg-rose-50 flex items-center justify-center">
                            <span className="material-symbols-outlined text-rose-600 text-[20px]">cancel</span>
                        </div>
                        <div>
                            <p className="font-black text-slate-900 dark:text-white">Reject Request</p>
                            <p className="text-xs text-slate-400">Provide a reason for the employee</p>
                        </div>
                    </div>
                    <textarea
                        className="w-full h-32 text-sm p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-rose-300 focus:border-rose-400 outline-none resize-none"
                        placeholder="Explain why this request was rejected..."
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        autoFocus
                    />
                    <div className="flex gap-3 mt-4">
                        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-200 dark:border-slate-700">
                            Cancel
                        </button>
                        <button onClick={() => reason.trim() && onConfirm(reason.trim())} disabled={!reason.trim()}
                            className="flex-1 py-2.5 rounded-xl text-sm font-black text-white bg-rose-600 hover:bg-rose-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                            Confirm Rejection
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

// ─── Request Detail Drawer ─────────────────────────────────────────────────────
function RequestDrawer({ req, isAdmin, onApprove, onReject, onClose }: {
    req: ProfileChangeRequest;
    isAdmin: boolean;
    onApprove: () => void;
    onReject: () => void;
    onClose: () => void;
}) {
    const c = catConfig(req.category);
    const submittedDate = new Date(req.submittedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    return (
        <>
            <div className="fixed inset-0 z-[200] bg-black/20 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed top-0 right-0 h-full w-[440px] z-[201] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col">
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={`size-10 rounded-xl ${c.bg} flex items-center justify-center`}>
                            <span className="material-symbols-outlined text-white text-[20px]">{c.icon}</span>
                        </div>
                        <div>
                            <p className="font-black text-slate-900 dark:text-white">{req.category}</p>
                            <p className="text-xs text-slate-400">Submitted {submittedDate}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="size-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border-none bg-transparent cursor-pointer">
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                {/* Employee identity */}
                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 shrink-0 flex items-center gap-3">
                    <div className="size-10 rounded-full bg-indigo-500 flex items-center justify-center text-white text-sm font-black overflow-hidden shrink-0">
                        {req.avatar ? <img src={req.avatar} alt={req.name} className="size-full object-cover" /> : req.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                        <p className="font-black text-slate-900 dark:text-white">{req.name}</p>
                        <p className="text-xs text-slate-400">{req.dept} · {req.empId}</p>
                    </div>
                    <div className="ml-auto">
                        <StatusBadge status={req.status} />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                    {/* Changed fields with diff */}
                    {req.category !== 'Document Upload' ? (
                        <>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Requested Changes</p>
                            {Object.entries(req.changes).map(([label, val]) => (
                                <DiffRow key={label} label={label} oldVal={req.oldValues?.[label]} newVal={val} />
                            ))}
                        </>
                    ) : (
                        <>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Document Upload</p>
                            <div className="flex items-center gap-3 p-4 bg-violet-50 border border-violet-200 rounded-xl">
                                <span className="material-symbols-outlined text-violet-600 text-[28px]">description</span>
                                <div>
                                    <p className="font-black text-violet-800">{req.documentName}</p>
                                    {req.documentType && <p className="text-xs text-violet-600">{req.documentType}</p>}
                                    {req.documentUrl && (
                                        <a href={req.documentUrl} target="_blank" rel="noreferrer"
                                            className="text-[10px] font-bold text-violet-500 underline mt-1 block">View Document</a>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Notes */}
                    {req.notes && (
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Employee Note</p>
                            <p className="text-xs text-slate-700 dark:text-slate-300 italic">"{req.notes}"</p>
                        </div>
                    )}

                    {/* Rejection reason if rejected */}
                    {req.status === 'Rejected' && req.rejectionReason && (
                        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                            <p className="text-[9px] font-black uppercase tracking-widest text-rose-500 mb-1">Rejection Reason</p>
                            <p className="text-xs text-rose-700">{req.rejectionReason}</p>
                        </div>
                    )}

                    {/* Review meta */}
                    {req.reviewedBy && req.reviewedAt && (
                        <div className="text-[10px] text-slate-400 text-center pt-2">
                            {req.status === 'Approved' ? '✅ Approved' : '❌ Rejected'} by {req.reviewedBy} · {new Date(req.reviewedAt).toLocaleDateString()}
                        </div>
                    )}
                </div>

                {/* Actions */}
                {isAdmin && req.status === 'Pending' && (
                    <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0 flex gap-3">
                        <button onClick={onReject}
                            className="flex-1 py-3 rounded-xl text-sm font-black text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer">
                            Reject
                        </button>
                        <button onClick={onApprove}
                            className="flex-1 py-3 rounded-xl text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200 cursor-pointer">
                            Approve & Apply
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}

// ─── Request Card ─────────────────────────────────────────────────────────────
function RequestCard({ req, onClick }: { req: ProfileChangeRequest; onClick: () => void }) {
    const c = catConfig(req.category);
    const fieldCount = Object.keys(req.changes).length || (req.documentName ? 1 : 0);
    return (
        <button onClick={onClick}
            className="w-full text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group cursor-pointer">
            <div className="flex items-start gap-3">
                <div className={`size-10 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
                    <span className="material-symbols-outlined text-white text-[20px]">{c.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="font-black text-slate-900 dark:text-white text-sm">{req.category}</p>
                        <StatusBadge status={req.status} />
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{req.name} · {req.dept}</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                        {fieldCount} field{fieldCount !== 1 ? 's' : ''} changed ·{' '}
                        {new Date(req.submittedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                    {req.status === 'Rejected' && req.rejectionReason && (
                        <p className="text-[10px] text-rose-500 mt-1 line-clamp-1 italic">Rejected: {req.rejectionReason}</p>
                    )}
                </div>
                <span className="material-symbols-outlined text-[18px] text-slate-300 group-hover:text-indigo-400 transition-colors mt-1 shrink-0">chevron_right</span>
            </div>
        </button>
    );
}

// ─── Leave Balance Bar ────────────────────────────────────────────────────────
function LeaveBalanceBar({ type, used, total }: { type: LeaveType; used: number; total: number }) {
    const cfg = LEAVE_TYPE_CONFIG[type];
    const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
    const remaining = Math.max(0, total - used);
    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
                <div className={`size-9 rounded-xl ${cfg.bg} flex items-center justify-center`}>
                    <span className="material-symbols-outlined text-white text-[18px]">{cfg.icon}</span>
                </div>
                <div className="flex-1">
                    <div className="flex items-center justify-between">
                        <p className={`text-sm font-black ${cfg.color}`}>{type}</p>
                        <p className="text-xs font-black text-slate-500">{remaining} <span className="text-slate-300 font-normal">/ {total} days left</span></p>
                    </div>
                </div>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full ${cfg.bg} rounded-full transition-all`} style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[9px] text-slate-400 font-bold mt-1.5 uppercase tracking-widest">{used} used · {pct}% of {total}d entitlement</p>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SelfService() {
    const {
        employees, isAdmin, holidays,
        profileChangeRequests, submitProfileChangeRequest, handleProfileChangeRequest,
        leaveRequests, setLeaveRequests,
        otRequests, submitOT,
        shifts, shiftAssignments, setShiftAssignments,
    } = useAppData();
    const { pushNotification } = useNotifications();
    useSystemCalendar();
    const { createApprovalRequest } = useApprovals();

    const LOGGED_IN_EMP_ID = 'EMP-001';
    const ADMIN_ID = 'ADM-001';
    const emp = employees.find(e => e.id === LOGGED_IN_EMP_ID);
    const userIsAdmin = isAdmin(LOGGED_IN_EMP_ID);

    const [activeTab, setActiveTab] = useState<Tab>('Submit');

    // ── Leave form state ──────────────────────────────────────────────────────
    // ── OT form state ────────────────────────────────────────────────────
    const [otDate, setOtDate] = useState('');
    const [otHours, setOtHours] = useState<number>(1);
    const [otType, setOtType] = useState<OTType>('Weekday 1.5x');
    const [otReason, setOtReason] = useState('');
    const [otError, setOtError] = useState<string | null>(null);
    const [otSubmitting, setOtSubmitting] = useState(false);
    const [otConvertToToil, setOtConvertToToil] = useState(false);

    // ── Shift Swap state ───────────────────────────────────────────────
    const [swapDate, setSwapDate] = useState('');
    const [swapTargetId, setSwapTargetId] = useState('');
    const [swapTargetDate, setSwapTargetDate] = useState('');
    const [swapReason, setSwapReason] = useState('');
    const [swapError, setSwapError] = useState<string | null>(null);
    const [swapSubmitting, setSwapSubmitting] = useState(false);
    const [swapPartnerSearch, setSwapPartnerSearch] = useState('');
    const [swapRequests, setSwapRequests] = useState<Array<{
        id: string; myDate: string; partnerName: string; partnerDate: string;
        reason: string; status: 'Pending' | 'Approved' | 'Rejected'; submittedAt: string;
    }>>([]);

    // ── Leave form state ────────────────────────────────────────────────────
    const [leaveType, setLeaveType] = useState<LeaveType>('Casual');
    const [leaveStart, setLeaveStart] = useState('');
    const [leaveEnd, setLeaveEnd] = useState('');
    const [leaveRelieverId, setLeaveRelieverId] = useState('');
    const [leaveReason, setLeaveReason] = useState('');
    const [leaveHasCert, setLeaveHasCert] = useState(false);
    const [leaveError, setLeaveError] = useState<string | null>(null);
    const [leaveSubmitting, setLeaveSubmitting] = useState(false);
    const [relieverSearch, setRelieverSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<ProfileChangeCategory>('Personal Info');
    const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
    const [notes, setNotes] = useState('');
    const [docName, setDocName] = useState('');
    const [docType, setDocType] = useState(DOC_TYPES[0]);
    const [docFile, setDocFile] = useState<File | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [selectedReq, setSelectedReq] = useState<ProfileChangeRequest | null>(null);
    const [rejectTarget, setRejectTarget] = useState<string | null>(null);
    const [queueFilter, setQueueFilter] = useState<'All' | ProfileChangeRequest['status']>('Pending');
    const fileRef = useRef<HTMLInputElement>(null);

    const showToast = (msg: string, type: 'success' | 'error') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const catCfg = CATEGORIES.find(c => c.id === selectedCategory)!;

    // My requests (all statuses)
    const myRequests = useMemo(() =>
        profileChangeRequests.filter(r => r.empId === LOGGED_IN_EMP_ID)
            .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
        [profileChangeRequests]);

    // Admin queue
    const queueRequests = useMemo(() => {
        const all = profileChangeRequests;
        return (queueFilter === 'All' ? all : all.filter(r => r.status === queueFilter))
            .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
    }, [profileChangeRequests, queueFilter]);

    const pendingCount  = profileChangeRequests.filter(r => r.status === 'Pending').length;
    const myPending     = myRequests.filter(r => r.status === 'Pending').length;

    // ── Submit handler ────────────────────────────────────────────────────────
    const handleSubmit = () => {
        if (!emp) return;

        if (selectedCategory === 'Document Upload') {
            if (!docName.trim() || !docFile) {
                showToast('Please provide a document name and file.', 'error');
                return;
            }
        } else {
            const filled = Object.values(fieldValues).some(v => v.trim());
            if (!filled) {
                showToast('Fill in at least one field to submit a request.', 'error');
                return;
            }
        }

        // Build old values snapshot from current employee
        const empFieldMap: Record<string, string> = {
            'Mobile': emp.mobile ?? '',
            'Personal Email': (emp as any).personalEmail ?? '',
            'Township': emp.township ?? '',
            'Current Address': (emp as any).currentAddress ?? '',
            'Bank Name': emp.bankName ?? '',
            'Account Number': emp.accountNumber ?? '',
            'Emergency Contact Name': emp.emergencyContact?.name ?? '',
            'Emergency Contact Phone': emp.emergencyContact?.phone ?? '',
            'Relationship': emp.emergencyContact?.relationship ?? '',
            'Has Spouse': String(emp.reliefs?.spouse ?? false),
            'Parents Count': String(emp.reliefs?.parentsCount ?? 0),
            'Children Count': String(emp.reliefs?.childrenCount ?? 0),
        };

        const changedFields: Record<string, string> = {};
        Object.entries(fieldValues).forEach(([k, v]) => { if (v.trim()) changedFields[k] = v.trim(); });

        const oldVals: Record<string, string> = {};
        Object.keys(changedFields).forEach(k => { oldVals[k] = empFieldMap[k] ?? ''; });

        const docUrl = docFile ? URL.createObjectURL(docFile) : undefined;

        const result = submitProfileChangeRequest({
            empId: emp.id,
            name: emp.name,
            dept: (emp as any).dept ?? '',
            avatar: emp.avatar ?? undefined,
            category: selectedCategory,
            changes: selectedCategory === 'Document Upload' ? {} : changedFields,
            oldValues: oldVals,
            documentName: selectedCategory === 'Document Upload' ? docName.trim() : undefined,
            documentType: selectedCategory === 'Document Upload' ? docType : undefined,
            documentUrl: docUrl,
            notes: notes.trim() || undefined,
        });

        if (result.success) {
            showToast('Request submitted! HR will review it shortly.', 'success');
            pushNotification({
                title: `${selectedCategory} Request Submitted`,
                body: `Your ${selectedCategory} update request has been sent to HR for review.`,
                category: 'HR', priority: 'normal', icon: 'person_edit',
                iconBg: 'bg-indigo-50', iconColor: 'text-indigo-600',
                actionRoute: '/self-service', actionLabel: 'View Request',
                badge: 'Pending', badgeColor: 'amber',
            });
            setFieldValues({});
            setNotes('');
            setDocName('');
            setDocFile(null);
            setTimeout(() => setActiveTab('My Requests'), 800);
        }
    };

    // ── Approve ────────────────────────────────────────────────────────────────
    const handleApprove = (id: string) => {
        const req = profileChangeRequests.find(r => r.id === id);
        const result = handleProfileChangeRequest(id, 'Approve', ADMIN_ID);
        showToast(result.message, result.success ? 'success' : 'error');
        if (result.success) {
            setSelectedReq(null);
            if (req) {
                pushNotification({
                    title: `${req.category} Update Approved ✅`,
                    body: `${req.name}'s ${req.category} change request has been approved and applied.`,
                    category: 'HR', priority: 'high', icon: 'person_check',
                    iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600',
                    actionRoute: '/self-service', actionLabel: 'View Queue',
                    badge: 'Approved', badgeColor: 'emerald',
                    empId: req.empId, sourceId: id,
                });
            }
        }
    };

    const handleReject = (id: string, reason: string) => {
        const req = profileChangeRequests.find(r => r.id === id);
        const result = handleProfileChangeRequest(id, 'Reject', ADMIN_ID, reason);
        showToast(result.message, result.success ? 'success' : 'error');
        if (result.success) {
            setRejectTarget(null);
            setSelectedReq(null);
            if (req) {
                pushNotification({
                    title: `${req.category} Request Rejected`,
                    body: `${req.name}'s ${req.category} request was rejected. Reason: ${reason}`,
                    category: 'HR', priority: 'normal', icon: 'cancel',
                    iconBg: 'bg-rose-50', iconColor: 'text-rose-500',
                    actionRoute: '/self-service', actionLabel: 'View Queue',
                    badge: 'Rejected', badgeColor: 'rose',
                    empId: req.empId, sourceId: id,
                });
            }
        }
    };

    // ── Leave calculations ────────────────────────────────────────────────────
    const workingDays = useMemo(() => {
        if (!leaveStart || !leaveEnd || leaveEnd < leaveStart) return 0;
        return countWorkingDays(leaveStart, leaveEnd, holidays.map(h => h.date));
    }, [leaveStart, leaveEnd, holidays]);

    const myLeaveRequests = useMemo(() =>
        leaveRequests.filter(r => r.empId === LOGGED_IN_EMP_ID)
            .sort((a, b) => b.submitted.localeCompare(a.submitted)),
        [leaveRequests]);

    // Mock leave balance per type (real implementation would come from employee record)
    const leaveBalances: Record<LeaveType, { used: number; total: number }> = useMemo(() => {
        const used = (type: LeaveType) => myLeaveRequests.filter(r => r.type === type && r.status === 'Approved').reduce((s, r) => s + r.totalDays, 0);
        return {
            Casual:    { used: used('Casual'),    total: 10  },
            Medical:   { used: used('Medical'),   total: 14  },
            Annual:    { used: used('Annual'),    total: 15  },
            Maternity: { used: used('Maternity'), total: 98  },
            Paternity: { used: used('Paternity'), total: 15  },
            Unpaid:    { used: used('Unpaid'),    total: 999 },
        };
    }, [myLeaveRequests]);

    const relievers = useMemo(() =>
        employees.filter(e => e.id !== LOGGED_IN_EMP_ID && e.status === 'Active' &&
            (relieverSearch === '' || e.name.toLowerCase().includes(relieverSearch.toLowerCase()) || e.id.toLowerCase().includes(relieverSearch.toLowerCase()))
        ).slice(0, 8),
        [employees, relieverSearch]);

    const handleLeaveSubmit = () => {
        setLeaveError(null);
        if (!leaveStart || !leaveEnd) { setLeaveError('Please select both start and end dates.'); return; }
        if (leaveEnd < leaveStart)    { setLeaveError('End date cannot be before start date.'); return; }
        if (!leaveRelieverId)          { setLeaveError('Please select a reliever.'); return; }
        if (!leaveReason.trim())       { setLeaveError('Please provide a reason.'); return; }
        if (workingDays === 0)         { setLeaveError('No working days in selected range (check holidays).'); return; }

        const bal = leaveBalances[leaveType];
        if (leaveType !== 'Unpaid' && bal.used + workingDays > bal.total) {
            setLeaveError(`Insufficient ${leaveType} leave balance. You have ${bal.total - bal.used} day(s) remaining.`);
            return;
        }

        const reliever = employees.find(e => e.id === leaveRelieverId)!;
        setLeaveSubmitting(true);
        setTimeout(() => {
            const today = new Date().toISOString().split('T')[0];
            const newReq = {
                id: `LR-SS-${Date.now()}`,
                empId: LOGGED_IN_EMP_ID,
                name: emp?.name ?? 'Employee',
                dept: (emp as any)?.dept ?? '',
                avatar: emp?.avatar ?? '',
                type: leaveType,
                startDate: leaveStart,
                endDate: leaveEnd,
                durationStr: workingDays === 1 ? leaveStart : `${leaveStart} – ${leaveEnd}`,
                totalDays: workingDays,
                relieverId: leaveRelieverId,
                relieverName: reliever.name,
                reason: leaveReason.trim(),
                hasCert: leaveHasCert,
                isAdminOverride: false,
                status: 'Pending' as const,
                submitted: today,
                priority: (workingDays >= 5 ? 'High' : 'Medium') as 'High' | 'Medium' | 'Low',
                category: 'Attendance' as const,
            };
            setLeaveRequests((prev: any[]) => [newReq, ...prev]);
            
            // Create approval workflow
            createApprovalRequest({
                requestId: newReq.id,
                requestType: 'Leave',
                requesterId: LOGGED_IN_EMP_ID,
                requesterName: emp?.name ?? 'Employee',
                requesterDept: (emp as any)?.dept ?? '',
                metadata: {
                    type: leaveType,
                    dates: `${leaveStart} – ${leaveEnd}`,
                    days: workingDays,
                    reason: leaveReason.trim(),
                },
                peerId: leaveRelieverId,
                peerName: reliever.name,
            });
            
            pushNotification({
                title: `${leaveType} Leave Request Submitted`,
                body: `Your ${leaveType} leave (${workingDays} day${workingDays !== 1 ? 's' : ''}) has been sent for approval.`,
                category: 'HR', priority: 'normal', icon: 'beach_access',
                iconBg: 'bg-blue-50', iconColor: 'text-blue-600',
                actionRoute: '/self-service', actionLabel: 'View Status',
                badge: 'Pending', badgeColor: 'amber',
            });
            setLeaveSubmitting(false);
            setLeaveStart(''); setLeaveEnd(''); setLeaveRelieverId('');
            setLeaveReason(''); setLeaveHasCert(false); setRelieverSearch('');
            showToast('Leave request submitted! Pending manager approval.', 'success');
            setTimeout(() => setActiveTab('My Requests'), 800);
        }, 600);
    };

    // ── OT submit handler ───────────────────────────────────────────────────
    const empShiftId = emp?.shiftId ?? shifts[0]?.id;
    const empShift = shifts.find(s => s.id === empShiftId);

    const otPayoutPreview = useMemo(() => {
        if (!emp?.baseSalary || emp.baseSalary <= 0 || otHours <= 0) return null;
        const multiplier = otType === 'Weekday 1.5x' ? 1.5 : 2.0;
        return Math.round((emp.baseSalary / 30 / 8) * otHours * multiplier);
    }, [emp, otHours, otType]);

    const myOTRequests = useMemo(() =>
        otRequests.filter(r => r.empId === LOGGED_IN_EMP_ID)
            .sort((a, b) => b.requestedDate.localeCompare(a.requestedDate)),
        [otRequests]);

    const handleOTSubmit = () => {
        setOtError(null);
        if (!otDate)             { setOtError('Please select a date.'); return; }
        if (otHours <= 0 || otHours > 12) { setOtError('OT hours must be between 0.5 and 12.'); return; }
        if (!otReason.trim())    { setOtError('Please provide a reason.'); return; }

        setOtSubmitting(true);
        setTimeout(() => {
            const result = submitOT({
                empId: LOGGED_IN_EMP_ID,
                name: emp?.name ?? 'Employee',
                dept: (emp as any)?.dept ?? '',
                date: otDate,
                shiftName: empShift ? `${empShift.name} (${empShift.start} – ${empShift.end})` : 'Default Shift',
                otHours,
                otType,
                reason: otReason.trim(),
                hasViolation: false,
                violationNote: '',
                effectiveMonth: new Date(otDate).toLocaleString('en-US', { month: 'short', year: 'numeric' }),
                priority: otHours >= 4 ? 'High' : 'Medium',
                category: 'Attendance',
                convertToToil: otConvertToToil,
            });
            setOtSubmitting(false);
            if (result.success) {
                // Create approval workflow
                createApprovalRequest({
                    requestId: result.requestId || `OT-${Date.now()}`,
                    requestType: 'OT',
                    requesterId: LOGGED_IN_EMP_ID,
                    requesterName: emp?.name ?? 'Employee',
                    requesterDept: (emp as any)?.dept ?? '',
                    metadata: {
                        date: otDate,
                        hours: otHours,
                        type: otType,
                        reason: otReason.trim(),
                    },
                });
                
                pushNotification({
                    title: 'OT Request Submitted',
                    body: `${otHours}h OT on ${otDate} (${otType}) sent for manager approval.`,
                    category: 'Financial', priority: 'normal', icon: 'more_time',
                    iconBg: 'bg-indigo-50', iconColor: 'text-indigo-600',
                    actionRoute: '/self-service', actionLabel: 'View Status',
                    badge: 'Pending', badgeColor: 'amber',
                });
                setOtDate(''); setOtHours(1); setOtReason(''); setOtConvertToToil(false);
                showToast(otConvertToToil ? 'TOIL request submitted! Pending manager approval.' : 'OT request submitted! Pending manager approval.', 'success');
                setTimeout(() => setActiveTab('My Requests'), 800);
            } else {
                setOtError(result.message);
            }
        }, 600);
    };

    // ── Shift Swap handler ───────────────────────────────────────────────
    const swapPartners = useMemo(() =>
        employees.filter(e => e.id !== LOGGED_IN_EMP_ID && e.status === 'Active' &&
            (swapPartnerSearch === '' || e.name.toLowerCase().includes(swapPartnerSearch.toLowerCase()) || e.id.toLowerCase().includes(swapPartnerSearch.toLowerCase()))
        ).slice(0, 8),
        [employees, swapPartnerSearch]);

    const myShiftOnDate = (date: string) => {
        const asgn = shiftAssignments.find(a => a.empId === LOGGED_IN_EMP_ID && a.date === date);
        const shiftId = asgn?.shiftId ?? empShiftId;
        return shifts.find(s => s.id === shiftId);
    };

    const partnerShiftOnDate = (empId: string, date: string) => {
        const asgn = shiftAssignments.find(a => a.empId === empId && a.date === date);
        const target = employees.find(e => e.id === empId);
        const shiftId = asgn?.shiftId ?? target?.shiftId ?? shifts[0]?.id;
        return shifts.find(s => s.id === shiftId);
    };

    const handleSwapSubmit = () => {
        setSwapError(null);
        if (!swapDate)          { setSwapError('Please select your shift date.'); return; }
        if (!swapTargetId)      { setSwapError('Please select a swap partner.'); return; }
        if (!swapTargetDate)    { setSwapError('Please select the partner\'s shift date.'); return; }
        if (!swapReason.trim()) { setSwapError('Please provide a reason for the swap.'); return; }

        const partner = employees.find(e => e.id === swapTargetId)!;
        setSwapSubmitting(true);
        setTimeout(() => {
            const myNewShift = partnerShiftOnDate(swapTargetId, swapTargetDate);
            const partnerNewShift = myShiftOnDate(swapDate);

            if (myNewShift) {
                setShiftAssignments((prev: any[]) => [
                    ...prev.filter((a: any) => !(a.empId === LOGGED_IN_EMP_ID && a.date === swapDate)),
                    { id: `SA-SWAP-${Date.now()}-ME`, empId: LOGGED_IN_EMP_ID, date: swapDate, shiftId: myNewShift.id, modifiedByHr: false, reason: `Shift Swap with ${partner.name}` }
                ]);
            }
            if (partnerNewShift) {
                setShiftAssignments((prev: any[]) => [
                    ...prev.filter((a: any) => !(a.empId === swapTargetId && a.date === swapTargetDate)),
                    { id: `SA-SWAP-${Date.now()}-PT`, empId: swapTargetId, date: swapTargetDate, shiftId: partnerNewShift.id, modifiedByHr: false, reason: `Shift Swap with ${emp?.name}` }
                ]);
            }

            const newSwap = {
                id: `SWP-${Date.now()}`,
                myDate: swapDate,
                partnerName: partner.name,
                partnerDate: swapTargetDate,
                reason: swapReason.trim(),
                status: 'Pending' as const,
                submittedAt: new Date().toISOString(),
            };
            setSwapRequests(prev => [newSwap, ...prev]);
            
            // Create approval workflow
            createApprovalRequest({
                requestId: newSwap.id,
                requestType: 'Swap',
                requesterId: LOGGED_IN_EMP_ID,
                requesterName: emp?.name ?? 'Employee',
                requesterDept: (emp as any)?.dept ?? '',
                metadata: {
                    partnerName: partner.name,
                    myDate: swapDate,
                    partnerDate: swapTargetDate,
                    reason: swapReason.trim(),
                },
                peerId: swapTargetId,
                peerName: partner.name,
            });
            
            pushNotification({
                title: 'Shift Swap Requested',
                body: `Swap with ${partner.name} on ${swapDate} ⇄ ${swapTargetDate} submitted for approval.`,
                category: 'HR', priority: 'normal', icon: 'swap_horiz',
                iconBg: 'bg-violet-50', iconColor: 'text-violet-600',
                actionRoute: '/self-service', actionLabel: 'View Status',
                badge: 'Pending', badgeColor: 'amber',
            });
            setSwapSubmitting(false);
            setSwapDate(''); setSwapTargetId(''); setSwapTargetDate(''); setSwapReason(''); setSwapPartnerSearch('');
            showToast('Shift swap submitted! Pending manager approval.', 'success');
            setTimeout(() => setActiveTab('My Requests'), 800);
        }, 600);
    };

    const tabs: { id: Tab; label: string; badge?: number }[] = [
        { id: 'Submit', label: 'Profile Update' },
        { id: 'Apply Leave', label: 'Apply Leave' },
        { id: 'Request OT', label: 'Request OT' },
        { id: 'Shift Swap', label: 'Shift Swap' },
        { id: 'My Requests', label: 'My Requests', badge: myPending || undefined },
        ...(userIsAdmin ? [{ id: 'Approval Queue' as Tab, label: 'Approval Queue', badge: pendingCount || undefined }] : []),
    ];

    return (
        <div className="flex h-screen overflow-hidden bg-[#F8FAFC] dark:bg-slate-950 font-display text-slate-900 dark:text-slate-100">
            <Sidebar activeTab="Self Service" />
            <main className="flex flex-col h-full overflow-hidden ml-[280px] flex-1">
                <Header title="Self-Service" subtitle="Request profile updates, bank changes, and document uploads" />

                <div className="flex-1 overflow-y-auto px-8 pb-8">

                    {/* ── Tab bar ─────────────────────────────────────────── */}
                    <div className="flex items-center gap-1 mt-8 mb-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 w-fit shadow-sm">
                        {tabs.map(t => (
                            <button key={t.id} onClick={() => setActiveTab(t.id)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer
                                    ${activeTab === t.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 bg-transparent'}`}>
                                {t.label}
                                {t.badge !== undefined && t.badge > 0 && (
                                    <span className={`size-4 rounded-full flex items-center justify-center text-[9px] font-black
                                        ${activeTab === t.id ? 'bg-white text-indigo-600' : 'bg-amber-500 text-white'}`}>
                                        {t.badge}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* ────────────────────────────────────────────────────── */}
                    {/* SUBMIT TAB */}
                    {/* ────────────────────────────────────────────────────── */}
                    {activeTab === 'Submit' && (
                        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 max-w-[1200px]">
                            {/* Category selector */}
                            <div className="space-y-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Select Request Type</p>
                                {CATEGORIES.map(cat => (
                                    <button key={cat.id} onClick={() => { setSelectedCategory(cat.id); setFieldValues({}); }}
                                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all text-left cursor-pointer
                                            ${selectedCategory === cat.id
                                                ? `${cat.light} border-current ring-2 ring-offset-1 ${cat.color.replace('text-', 'ring-')}`
                                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}`}>
                                        <div className={`size-10 rounded-xl flex items-center justify-center ${selectedCategory === cat.id ? cat.bg : 'bg-slate-100 dark:bg-slate-800'}`}>
                                            <span className={`material-symbols-outlined text-[20px] ${selectedCategory === cat.id ? 'text-white' : 'text-slate-400'}`}>{cat.icon}</span>
                                        </div>
                                        <div>
                                            <p className={`text-sm font-black ${selectedCategory === cat.id ? cat.color : 'text-slate-700 dark:text-slate-300'}`}>{cat.id}</p>
                                            <p className="text-[10px] text-slate-400">
                                                {cat.id === 'Personal Info' && 'Phone, email, address, township'}
                                                {cat.id === 'Bank / Financial' && 'Account, branch, bank name'}
                                                {cat.id === 'Emergency Contact' && 'Name, phone, relationship'}
                                                {cat.id === 'Tax Relief' && 'Spouse, parents, children'}
                                                {cat.id === 'Document Upload' && 'NRC, passport, certificates'}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {/* Form */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                {/* Form header */}
                                <div className={`px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3`}>
                                    <div className={`size-10 rounded-xl ${catCfg.bg} flex items-center justify-center`}>
                                        <span className="material-symbols-outlined text-white text-[20px]">{catCfg.icon}</span>
                                    </div>
                                    <div>
                                        <p className="font-black text-slate-900 dark:text-white">{catCfg.id} Update</p>
                                        <p className="text-xs text-slate-400">Changes are sent to HR for approval before taking effect</p>
                                    </div>
                                </div>

                                <div className="p-6 space-y-4">
                                    {/* Current profile snapshot */}
                                    {selectedCategory !== 'Document Upload' && emp && (
                                        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 mb-2">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Your Current Info</p>
                                            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                                                {catCfg.fields.slice(0, 4).map(f => {
                                                    const empMap: Record<string, string> = {
                                                        'Mobile': emp.mobile ?? '—',
                                                        'Personal Email': (emp as any).personalEmail ?? '—',
                                                        'Township': emp.township ?? '—',
                                                        'Current Address': (emp as any).currentAddress ?? '—',
                                                        'Bank Name': emp.bankName ?? '—',
                                                        'Account Number': emp.accountNumber ?? '—',
                                                        'Emergency Contact Name': emp.emergencyContact?.name ?? '—',
                                                        'Emergency Contact Phone': emp.emergencyContact?.phone ?? '—',
                                                        'Relationship': emp.emergencyContact?.relationship ?? '—',
                                                        'Has Spouse': emp.reliefs?.spouse ? 'Yes' : 'No',
                                                        'Parents Count': String(emp.reliefs?.parentsCount ?? 0),
                                                        'Children Count': String((emp as any).childrenCount ?? 0),
                                                    };
                                                    return (
                                                        <div key={f.label}>
                                                            <p className="text-[9px] text-slate-400">{f.label}</p>
                                                            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">{empMap[f.label] ?? '—'}</p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Dynamic fields */}
                                    {selectedCategory !== 'Document Upload' ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {catCfg.fields.map(f => (
                                                <div key={f.label}>
                                                    {f.type === 'checkbox' ? (
                                                        <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-all">
                                                            <input
                                                                type="checkbox"
                                                                checked={fieldValues[f.label] === 'true'}
                                                                onChange={e => setFieldValues(prev => ({ ...prev, [f.label]: e.target.checked ? 'true' : 'false' }))}
                                                                className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                                            />
                                                            <div>
                                                                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{f.label}</p>
                                                                <p className="text-[10px] text-slate-400">{f.placeholder}</p>
                                                            </div>
                                                        </label>
                                                    ) : (
                                                        <>
                                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">{f.label}</label>
                                                            <input
                                                                type={f.type ?? 'text'}
                                                                placeholder={f.placeholder}
                                                                value={fieldValues[f.label] ?? ''}
                                                                onChange={e => setFieldValues(prev => ({ ...prev, [f.label]: e.target.value }))}
                                                                className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none transition-all"
                                                            />
                                                        </>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Document Name</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. NRC Card (Renewed)"
                                                    value={docName}
                                                    onChange={e => setDocName(e.target.value)}
                                                    className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Document Type</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {DOC_TYPES.map(dt => (
                                                        <button key={dt} onClick={() => setDocType(dt)}
                                                            className={`px-3 py-1.5 text-xs font-black rounded-xl border transition-all cursor-pointer
                                                                ${docType === dt ? 'bg-violet-600 text-white border-violet-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-violet-300'}`}>
                                                            {dt}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Upload File</label>
                                                <div
                                                    onClick={() => fileRef.current?.click()}
                                                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all
                                                        ${docFile ? 'border-violet-400 bg-violet-50 dark:bg-violet-950/20' : 'border-slate-300 dark:border-slate-700 hover:border-violet-400 bg-slate-50 dark:bg-slate-800/40'}`}>
                                                    {docFile ? (
                                                        <div className="flex flex-col items-center gap-1">
                                                            <span className="material-symbols-outlined text-3xl text-violet-600">description</span>
                                                            <p className="text-sm font-black text-violet-700">{docFile.name}</p>
                                                            <p className="text-[10px] text-slate-400">{(docFile.size / 1024).toFixed(1)} KB</p>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-2 text-slate-400">
                                                            <span className="material-symbols-outlined text-3xl">upload_file</span>
                                                            <p className="text-sm font-bold">Click to upload or drag a file here</p>
                                                            <p className="text-[10px]">PDF, JPG, PNG up to 10MB</p>
                                                        </div>
                                                    )}
                                                    <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                                                        onChange={e => setDocFile(e.target.files?.[0] ?? null)} />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Notes */}
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Note to HR (optional)</label>
                                        <textarea
                                            rows={2}
                                            placeholder="Add any context for the reviewer..."
                                            value={notes}
                                            onChange={e => setNotes(e.target.value)}
                                            className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none transition-all resize-none"
                                        />
                                    </div>

                                    <button onClick={handleSubmit}
                                        className="w-full py-3.5 rounded-xl text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200 flex items-center justify-center gap-2 cursor-pointer">
                                        <span className="material-symbols-outlined text-[18px]">send</span>
                                        Submit for HR Approval
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ────────────────────────────────────────────────────── */}
                    {/* APPLY LEAVE TAB */}
                    {/* ────────────────────────────────────────────────────── */}
                    {activeTab === 'Apply Leave' && (
                        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 max-w-[1100px]">

                            {/* Left: Leave Balances */}
                            <div className="space-y-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Your Leave Balances</p>
                                {(['Casual', 'Medical', 'Annual', 'Maternity', 'Paternity', 'Unpaid'] as LeaveType[]).map(type => (
                                    <button key={type} onClick={() => setLeaveType(type)}
                                        className={`w-full text-left transition-all rounded-2xl ring-2 ${
                                            leaveType === type ? `ring-offset-1 ${LEAVE_TYPE_CONFIG[type].color.replace('text-', 'ring-')}` : 'ring-transparent'
                                        }`}>
                                        <LeaveBalanceBar type={type} used={leaveBalances[type].used} total={leaveBalances[type].total} />
                                    </button>
                                ))}
                            </div>

                            {/* Right: Application Form */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                {/* Form header */}
                                <div className={`px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 ${LEAVE_TYPE_CONFIG[leaveType].light}`}>
                                    <div className={`size-10 rounded-xl ${LEAVE_TYPE_CONFIG[leaveType].bg} flex items-center justify-center`}>
                                        <span className="material-symbols-outlined text-white text-[20px]">{LEAVE_TYPE_CONFIG[leaveType].icon}</span>
                                    </div>
                                    <div>
                                        <p className={`font-black ${LEAVE_TYPE_CONFIG[leaveType].color}`}>{leaveType} Leave Application</p>
                                        <p className="text-xs text-slate-500">Submitted requests go to your manager for approval</p>
                                    </div>
                                    {leaveType !== 'Unpaid' && (
                                        <div className="ml-auto text-right">
                                            <p className={`text-2xl font-black ${LEAVE_TYPE_CONFIG[leaveType].color}`}>{leaveBalances[leaveType].total - leaveBalances[leaveType].used}</p>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">days left</p>
                                        </div>
                                    )}
                                </div>

                                <div className="p-6 space-y-5">

                                    {/* Date range */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Start Date</label>
                                            <input type="date" value={leaveStart} onChange={e => setLeaveStart(e.target.value)}
                                                className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-300 outline-none transition-all" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">End Date</label>
                                            <input type="date" value={leaveEnd} min={leaveStart} onChange={e => setLeaveEnd(e.target.value)}
                                                className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-300 outline-none transition-all" />
                                        </div>
                                    </div>

                                    {/* Working days pill */}
                                    {workingDays > 0 && (
                                        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${LEAVE_TYPE_CONFIG[leaveType].light}`}>
                                            <span className="material-symbols-outlined text-[16px]">calendar_clock</span>
                                            <span className="text-sm font-black">{workingDays} working day{workingDays !== 1 ? 's' : ''}</span>
                                            <span className="text-xs text-slate-400 ml-1">(holidays & weekends excluded)</span>
                                        </div>
                                    )}

                                    {/* Reliever */}
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Reliever / Coverage Person</label>
                                        {leaveRelieverId ? (
                                            <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                                                <div className="size-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-black overflow-hidden">
                                                    {(() => { const r = employees.find(e => e.id === leaveRelieverId); return r?.avatar ? <img src={r.avatar} className="size-full object-cover" /> : (r?.name.split(' ').map(w => w[0]).join('').slice(0,2) ?? '?'); })()}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-black text-emerald-800">{employees.find(e => e.id === leaveRelieverId)?.name}</p>
                                                    <p className="text-[10px] text-emerald-600">{employees.find(e => e.id === leaveRelieverId)?.role}</p>
                                                </div>
                                                <button onClick={() => setLeaveRelieverId('')}
                                                    className="size-6 flex items-center justify-center rounded-lg text-emerald-600 hover:bg-emerald-100 transition-all">
                                                    <span className="material-symbols-outlined text-[16px]">close</span>
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <input type="text" placeholder="Search by name or ID..."
                                                    value={relieverSearch} onChange={e => setRelieverSearch(e.target.value)}
                                                    className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-300 outline-none transition-all" />
                                                {relieverSearch && (
                                                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                                        {relievers.length === 0 ? (
                                                            <p className="text-xs text-slate-400 text-center p-4">No employees found</p>
                                                        ) : relievers.map(r => (
                                                            <button key={r.id} onClick={() => { setLeaveRelieverId(r.id); setRelieverSearch(''); }}
                                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-all text-left border-b border-slate-100 dark:border-slate-800 last:border-0">
                                                                <div className="size-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-black overflow-hidden shrink-0">
                                                                    {r.avatar ? <img src={r.avatar} className="size-full object-cover" /> : r.name.split(' ').map((w: string) => w[0]).join('').slice(0,2)}
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-black text-slate-800 dark:text-slate-200">{r.name}</p>
                                                                    <p className="text-[10px] text-slate-400">{r.role} · {(r as any).dept}</p>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Reason */}
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Reason</label>
                                        <textarea rows={3} placeholder="Briefly explain the purpose of your leave..."
                                            value={leaveReason} onChange={e => setLeaveReason(e.target.value)}
                                            className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-300 outline-none resize-none transition-all" />
                                    </div>

                                    {/* Medical cert toggle */}
                                    {leaveType === 'Medical' && (
                                        <label className="flex items-center gap-3 p-3 bg-rose-50 border border-rose-200 rounded-xl cursor-pointer">
                                            <input type="checkbox" checked={leaveHasCert} onChange={e => setLeaveHasCert(e.target.checked)}
                                                className="size-4 rounded accent-rose-500" />
                                            <div>
                                                <p className="text-sm font-black text-rose-700">I have a medical certificate</p>
                                                <p className="text-[10px] text-rose-500">Required for Medical leave &gt; 2 days. Submit to HR separately.</p>
                                            </div>
                                        </label>
                                    )}

                                    {/* Error */}
                                    {leaveError && (
                                        <div className="flex items-center gap-2 px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl">
                                            <span className="material-symbols-outlined text-rose-500 text-[18px]">error</span>
                                            <p className="text-sm font-bold text-rose-700">{leaveError}</p>
                                        </div>
                                    )}

                                    <button onClick={handleLeaveSubmit} disabled={leaveSubmitting}
                                        className={`w-full py-3.5 rounded-xl text-sm font-black text-white transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer
                                            ${LEAVE_TYPE_CONFIG[leaveType].bg} hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed`}>
                                        {leaveSubmitting ? (
                                            <><span className="material-symbols-outlined text-[18px] animate-spin">sync</span> Submitting...</>
                                        ) : (
                                            <><span className="material-symbols-outlined text-[18px]">send</span> Submit Leave Request</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ────────────────────────────────────────────────────── */}
                    {/* REQUEST OT TAB */}
                    {/* ────────────────────────────────────────────────────── */}
                    {activeTab === 'Request OT' && (
                        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 max-w-[1000px]">

                            {/* Left: My OT history */}
                            <div className="space-y-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">My Recent OT Requests</p>
                                {myOTRequests.length === 0 ? (
                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center">
                                        <span className="material-symbols-outlined text-3xl text-slate-300">more_time</span>
                                        <p className="text-xs text-slate-400 mt-2 font-bold">No OT requests yet</p>
                                    </div>
                                ) : myOTRequests.slice(0, 6).map(r => {
                                    const statusMap = { Pending: 'bg-amber-50 border-amber-200 text-amber-700', Approved: 'bg-emerald-50 border-emerald-200 text-emerald-700', Rejected: 'bg-rose-50 border-rose-200 text-rose-700' };
                                    const icons = { Pending: 'schedule', Approved: 'check_circle', Rejected: 'cancel' };
                                    return (
                                        <div key={r.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                                            <div className="flex items-center justify-between mb-1">
                                                <p className="text-sm font-black text-slate-800 dark:text-slate-200">{r.date}</p>
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border ${statusMap[r.status]}`}>
                                                    <span className="material-symbols-outlined text-[11px]">{icons[r.status]}</span>
                                                    {r.status}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500">{r.otHours}h · {r.otType}</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1 italic">{r.reason}</p>
                                            {r.status === 'Approved' && r.payoutAmount > 0 && (
                                                <p className="text-[10px] font-black text-emerald-600 mt-1">{r.payoutAmount.toLocaleString()} MMK → Payroll</p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Right: OT Form */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-indigo-50 border-indigo-200 flex items-center gap-3">
                                    <div className="size-10 rounded-xl bg-indigo-600 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-white text-[20px]">more_time</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-black text-indigo-700">Overtime Request</p>
                                        <p className="text-xs text-slate-500">Submitted requests go to your manager for approval</p>
                                    </div>
                                    {empShift && (
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Your Shift</p>
                                            <p className="text-xs font-black text-indigo-700">{empShift.start} – {empShift.end}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="p-6 space-y-5">
                                    {/* Date */}
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">OT Date</label>
                                        <input type="date" value={otDate} onChange={e => setOtDate(e.target.value)}
                                            className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-300 outline-none transition-all" />
                                    </div>

                                    {/* OT Type */}
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">OT Type</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {OT_TYPES.map(t => (
                                                <button key={t} onClick={() => setOtType(t)}
                                                    className={`py-2.5 px-3 rounded-xl text-xs font-black border transition-all cursor-pointer
                                                        ${otType === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-300'}`}>
                                                    {t}
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1.5">Myanmar S&E Act: Weekday 1.5× · Rest/Holiday 2.0×</p>
                                    </div>

                                    {/* Hours + payout preview */}
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">OT Hours</label>
                                        <div className="flex items-center gap-3">
                                            <input type="number" min={0.5} max={12} step={0.5} value={otHours}
                                                onChange={e => setOtHours(parseFloat(e.target.value) || 0)}
                                                className="w-28 text-sm px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-300 outline-none transition-all" />
                                            {otPayoutPreview !== null && (
                                                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex-1">
                                                    <span className="material-symbols-outlined text-emerald-600 text-[16px]">payments</span>
                                                    <span className="text-sm font-black text-emerald-700">≈ {otPayoutPreview.toLocaleString()} MMK</span>
                                                    <span className="text-[10px] text-emerald-500">estimated payout</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Reason */}
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Reason</label>
                                        <textarea rows={3} placeholder="e.g. Product launch sprint, deadline delivery..."
                                            value={otReason} onChange={e => setOtReason(e.target.value)}
                                            className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-300 outline-none resize-none transition-all" />
                                    </div>

                                    {/* Convert to TOIL */}
                                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl">
                                        <label className="flex items-start gap-3 cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={otConvertToToil} 
                                                onChange={e => setOtConvertToToil(e.target.checked)}
                                                className="mt-1 size-4 rounded accent-indigo-600" 
                                            />
                                            <div>
                                                <p className="text-sm font-black text-indigo-700 dark:text-indigo-300">Convert to Time-in-Lieu (TOIL)</p>
                                                <p className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-1">
                                                    Instead of cash payout, add {otHours}h to my compensatory leave balance.
                                                </p>
                                            </div>
                                        </label>
                                    </div>

                                    {/* Error */}
                                    {otError && (
                                        <div className="flex items-center gap-2 px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl">
                                            <span className="material-symbols-outlined text-rose-500 text-[18px]">error</span>
                                            <p className="text-sm font-bold text-rose-700">{otError}</p>
                                        </div>
                                    )}

                                    <button onClick={handleOTSubmit} disabled={otSubmitting}
                                        className="w-full py-3.5 rounded-xl text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                                        {otSubmitting ? (
                                            <><span className="material-symbols-outlined text-[18px] animate-spin">sync</span> Submitting...</>
                                        ) : (
                                            <><span className="material-symbols-outlined text-[18px]">send</span> Submit OT Request</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ────────────────────────────────────────────────────── */}
                    {/* SHIFT SWAP TAB */}
                    {/* ────────────────────────────────────────────────────── */}
                    {activeTab === 'Shift Swap' && (
                        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 max-w-[1000px]">

                            {/* Left: Swap history */}
                            <div className="space-y-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">My Swap Requests</p>
                                {swapRequests.length === 0 ? (
                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center">
                                        <span className="material-symbols-outlined text-3xl text-slate-300">swap_horiz</span>
                                        <p className="text-xs text-slate-400 mt-2 font-bold">No swap requests yet</p>
                                    </div>
                                ) : swapRequests.map(r => {
                                    const statusMap = { Pending: 'bg-amber-50 border-amber-200 text-amber-700', Approved: 'bg-emerald-50 border-emerald-200 text-emerald-700', Rejected: 'bg-rose-50 border-rose-200 text-rose-700' };
                                    const icons = { Pending: 'schedule', Approved: 'check_circle', Rejected: 'cancel' };
                                    return (
                                        <div key={r.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-xs font-black text-slate-700 dark:text-slate-300">Swap with {r.partnerName}</p>
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border ${statusMap[r.status]}`}>
                                                    <span className="material-symbols-outlined text-[11px]">{icons[r.status]}</span>
                                                    {r.status}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <span className="font-bold text-slate-700">{r.myDate}</span>
                                                <span className="material-symbols-outlined text-[14px] text-slate-400">swap_horiz</span>
                                                <span className="font-bold text-slate-700">{r.partnerDate}</span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-1 line-clamp-1 italic">{r.reason}</p>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Right: Swap Form */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-violet-50 border-violet-200 flex items-center gap-3">
                                    <div className="size-10 rounded-xl bg-violet-600 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-white text-[20px]">swap_horiz</span>
                                    </div>
                                    <div>
                                        <p className="font-black text-violet-700">Shift Swap Request</p>
                                        <p className="text-xs text-slate-500">Exchange your shift with a colleague — pending manager approval</p>
                                    </div>
                                </div>

                                <div className="p-6 space-y-5">

                                    {/* My shift date */}
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">My Shift Date</label>
                                        <input type="date" value={swapDate} onChange={e => setSwapDate(e.target.value)}
                                            className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-violet-300 outline-none transition-all" />
                                        {swapDate && (() => { const s = myShiftOnDate(swapDate); return s ? (
                                            <p className="text-[10px] text-violet-600 font-bold mt-1.5 flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[13px]">schedule</span>
                                                Your shift: {s.name} ({s.start} – {s.end})
                                            </p>
                                        ) : null; })()}
                                    </div>

                                    {/* Swap partner */}
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Swap With</label>
                                        {swapTargetId ? (
                                            <div className="flex items-center gap-3 p-3 bg-violet-50 border border-violet-200 rounded-xl">
                                                <div className="size-8 rounded-full bg-violet-500 flex items-center justify-center text-white text-xs font-black overflow-hidden">
                                                    {(() => { const p = employees.find(e => e.id === swapTargetId); return p?.avatar ? <img src={p.avatar} className="size-full object-cover" /> : (p?.name.split(' ').map(w => w[0]).join('').slice(0,2) ?? '?'); })()}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-black text-violet-800">{employees.find(e => e.id === swapTargetId)?.name}</p>
                                                    <p className="text-[10px] text-violet-600">{employees.find(e => e.id === swapTargetId)?.role}</p>
                                                </div>
                                                <button onClick={() => { setSwapTargetId(''); setSwapTargetDate(''); }}
                                                    className="size-6 flex items-center justify-center rounded-lg text-violet-600 hover:bg-violet-100 transition-all cursor-pointer">
                                                    <span className="material-symbols-outlined text-[16px]">close</span>
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <input type="text" placeholder="Search by name or ID..."
                                                    value={swapPartnerSearch} onChange={e => setSwapPartnerSearch(e.target.value)}
                                                    className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-violet-300 outline-none transition-all" />
                                                {swapPartnerSearch && (
                                                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                                        {swapPartners.length === 0 ? (
                                                            <p className="text-xs text-slate-400 text-center p-4">No employees found</p>
                                                        ) : swapPartners.map(p => (
                                                            <button key={p.id} onClick={() => { setSwapTargetId(p.id); setSwapPartnerSearch(''); }}
                                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-violet-50 dark:hover:bg-slate-800 transition-all text-left border-b border-slate-100 dark:border-slate-800 last:border-0 cursor-pointer">
                                                                <div className="size-8 rounded-full bg-violet-500 flex items-center justify-center text-white text-xs font-black overflow-hidden shrink-0">
                                                                    {p.avatar ? <img src={p.avatar} className="size-full object-cover" /> : p.name.split(' ').map((w: string) => w[0]).join('').slice(0,2)}
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-black text-slate-800 dark:text-slate-200">{p.name}</p>
                                                                    <p className="text-[10px] text-slate-400">{p.role} · {(p as any).dept}</p>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Partner's shift date */}
                                    {swapTargetId && (
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">
                                                {employees.find(e => e.id === swapTargetId)?.name.split(' ')[0]}'s Shift Date (to take)
                                            </label>
                                            <input type="date" value={swapTargetDate} onChange={e => setSwapTargetDate(e.target.value)}
                                                className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-violet-300 outline-none transition-all" />
                                            {swapTargetDate && (() => { const s = partnerShiftOnDate(swapTargetId, swapTargetDate); return s ? (
                                                <p className="text-[10px] text-violet-600 font-bold mt-1.5 flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[13px]">schedule</span>
                                                    Their shift: {s.name} ({s.start} – {s.end})
                                                </p>
                                            ) : null; })()}
                                        </div>
                                    )}

                                    {/* Visual swap summary */}
                                    {swapDate && swapTargetId && swapTargetDate && (() => {
                                        const myS = myShiftOnDate(swapDate);
                                        const theirS = partnerShiftOnDate(swapTargetId, swapTargetDate);
                                        const partnerName = employees.find(e => e.id === swapTargetId)?.name.split(' ')[0];
                                        return (
                                            <div className="flex items-center gap-2 p-3 bg-violet-50 border border-violet-200 rounded-xl">
                                                <div className="text-center flex-1">
                                                    <p className="text-[9px] font-black text-violet-400 uppercase tracking-widest">You take</p>
                                                    <p className="text-xs font-black text-violet-800">{swapTargetDate}</p>
                                                    {theirS && <p className="text-[10px] text-violet-600">{theirS.start} – {theirS.end}</p>}
                                                </div>
                                                <span className="material-symbols-outlined text-violet-400 text-[20px]">swap_horiz</span>
                                                <div className="text-center flex-1">
                                                    <p className="text-[9px] font-black text-violet-400 uppercase tracking-widest">{partnerName} takes</p>
                                                    <p className="text-xs font-black text-violet-800">{swapDate}</p>
                                                    {myS && <p className="text-[10px] text-violet-600">{myS.start} – {myS.end}</p>}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Reason */}
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Reason for Swap</label>
                                        <textarea rows={3} placeholder="e.g. Personal appointment, family commitment..."
                                            value={swapReason} onChange={e => setSwapReason(e.target.value)}
                                            className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-violet-300 outline-none resize-none transition-all" />
                                    </div>

                                    {/* Error */}
                                    {swapError && (
                                        <div className="flex items-center gap-2 px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl">
                                            <span className="material-symbols-outlined text-rose-500 text-[18px]">error</span>
                                            <p className="text-sm font-bold text-rose-700">{swapError}</p>
                                        </div>
                                    )}

                                    <button onClick={handleSwapSubmit} disabled={swapSubmitting}
                                        className="w-full py-3.5 rounded-xl text-sm font-black text-white bg-violet-600 hover:bg-violet-700 transition-all shadow-sm shadow-violet-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                                        {swapSubmitting ? (
                                            <><span className="material-symbols-outlined text-[18px] animate-spin">sync</span> Submitting...</>
                                        ) : (
                                            <><span className="material-symbols-outlined text-[18px]">send</span> Submit Swap Request</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ────────────────────────────────────────────────────── */}
                    {/* MY REQUESTS TAB */}
                    {/* ────────────────────────────────────────────────────── */}
                    {activeTab === 'My Requests' && (
                        <div className="max-w-[720px] space-y-4">
                            {myRequests.length === 0 ? (
                                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-16 text-center">
                                    <div className="size-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <span className="material-symbols-outlined text-3xl text-slate-300">inbox</span>
                                    </div>
                                    <p className="font-bold text-slate-400">No requests yet</p>
                                    <p className="text-xs text-slate-300 mt-1">Use the Submit tab to request a profile update</p>
                                    <button onClick={() => setActiveTab('Submit')}
                                        className="mt-4 px-5 py-2.5 text-xs font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all cursor-pointer">
                                        Submit a Request
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {/* Stats strip */}
                                    <div className="grid grid-cols-3 gap-4">
                                        {(['Pending', 'Approved', 'Rejected'] as const).map(s => {
                                            const count = myRequests.filter(r => r.status === s).length;
                                            const map = { Pending: 'text-amber-600 bg-amber-50 border-amber-200', Approved: 'text-emerald-600 bg-emerald-50 border-emerald-200', Rejected: 'text-rose-600 bg-rose-50 border-rose-200' };
                                            return (
                                                <div key={s} className={`rounded-2xl border p-4 text-center ${map[s]}`}>
                                                    <p className="text-2xl font-black">{count}</p>
                                                    <p className="text-[10px] font-black uppercase tracking-wide mt-0.5">{s}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {myRequests.map(req => (
                                        <RequestCard key={req.id} req={req} onClick={() => setSelectedReq(req)} />
                                    ))}
                                </>
                            )}
                        </div>
                    )}

                    {/* ────────────────────────────────────────────────────── */}
                    {/* APPROVAL QUEUE TAB (admin only) */}
                    {/* ────────────────────────────────────────────────────── */}
                    {activeTab === 'Approval Queue' && userIsAdmin && (
                        <div className="max-w-[900px] space-y-5">
                            {/* Stats + filter */}
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <div className="flex gap-3">
                                    {(['All', 'Pending', 'Approved', 'Rejected'] as const).map(f => {
                                        const count = f === 'All' ? profileChangeRequests.length : profileChangeRequests.filter(r => r.status === f).length;
                                        return (
                                            <button key={f} onClick={() => setQueueFilter(f)}
                                                className={`px-4 py-2 text-xs font-black rounded-xl border transition-all cursor-pointer
                                                    ${queueFilter === f ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-300'}`}>
                                                {f} {count > 0 && <span className="ml-1 opacity-70">{count}</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                                {pendingCount > 0 && (
                                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
                                        <span className="material-symbols-outlined text-amber-600 text-[16px]">notifications_active</span>
                                        <span className="text-xs font-black text-amber-700">{pendingCount} pending review</span>
                                    </div>
                                )}
                            </div>

                            {/* Request grid */}
                            {queueRequests.length === 0 ? (
                                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-16 text-center">
                                    <span className="material-symbols-outlined text-4xl text-slate-200 dark:text-slate-700">check_circle</span>
                                    <p className="font-bold text-slate-400 mt-2">All caught up! 🎉</p>
                                    <p className="text-xs text-slate-300 mt-1">No {queueFilter !== 'All' ? queueFilter.toLowerCase() : ''} requests</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {queueRequests.map(req => (
                                        <RequestCard key={req.id} req={req} onClick={() => setSelectedReq(req)} />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[400] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-bold
                    ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                    <span className="material-symbols-outlined text-[18px]">{toast.type === 'success' ? 'check_circle' : 'error'}</span>
                    {toast.msg}
                </div>
            )}

            {/* Detail drawer */}
            {selectedReq && (
                <RequestDrawer
                    req={selectedReq}
                    isAdmin={userIsAdmin}
                    onApprove={() => handleApprove(selectedReq.id)}
                    onReject={() => setRejectTarget(selectedReq.id)}
                    onClose={() => setSelectedReq(null)}
                />
            )}

            {/* Reject modal */}
            {rejectTarget && (
                <RejectModal
                    onConfirm={reason => handleReject(rejectTarget, reason)}
                    onClose={() => setRejectTarget(null)}
                />
            )}
        </div>
    );
}
