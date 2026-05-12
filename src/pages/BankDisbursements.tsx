import React, { useState, useMemo } from 'react';
import DropdownMenu from '../components/DropdownMenu';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useAppData } from '../context/AppDataContext';
import { useNotifications } from '../context/NotificationProvider';
import { SkeletonTable } from '../components/SkeletonRow';
import { supabase } from '../lib/supabase';

// ─── Toast ────────────────────────────────────────────────────────────────────
interface Toast { id: string; message: string; type: 'success' | 'error' | 'warning'; }
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
                    }`}>{t.type === 'success' ? 'check_circle' : t.type === 'error' ? 'gpp_bad' : 'warning'}</span>
                    <p className="text-xs font-semibold leading-relaxed flex-1">{t.message}</p>
                    <button onClick={() => onDismiss(t.id)} className="text-inherit opacity-50 hover:opacity-100 shrink-0">
                        <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                </div>
            ))}
        </div>
    );
}

export default function BankDisbursements() {
    const { employees, payrollRecords, systemSettings, generateDisbursementBatch, disbursePayroll, lastPayrollStatus,
            payrollGroups, activePayrollGroupId, payrunId, lastPayrollTotal, setAlerts } = useAppData();
    const { pushNotification } = useNotifications();
    const [isLoading, setIsLoading] = useState(true);
    const [selectedBank, setSelectedBank] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [approverId, setApproverId] = useState('');
    const [approverPassword, setApproverPassword] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [exportedBanks, setExportedBanks] = useState<Set<string>>(new Set());
    const [selectedRows, setSelectedRows]   = useState<Set<string>>(new Set());
    const [deptFilter, setDeptFilter]       = useState('All');
    const [statusTab, setStatusTab]         = useState<'Pending Release' | 'Disbursed Successfully' | 'Action Required' | 'All'>('Pending Release');
    const [autoNotify, setAutoNotify]       = useState(true);

    // Toast
    const [toasts, setToasts] = useState<Toast[]>([]);
    const addToast = (message: string, type: Toast['type'], duration = 3500) => {
        const id = `toast-${Date.now()}`;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
    };
    const dismissToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

    // Track loading state
    React.useEffect(() => {
        if (employees.length > 0) setIsLoading(false);
    }, [employees]);

    const paymentProviders = useMemo(() => {
        const configured = systemSettings.paymentProviders || [];
        const configuredNames = new Set(configured.map(p => p.name));
        const extraProviders: typeof configured = [];
        employees.forEach(e => {
            if (e.bankName && !configuredNames.has(e.bankName)) {
                configuredNames.add(e.bankName);
                const isWallet = e.bankName.toLowerCase().includes('pay') || e.bankName.toLowerCase().includes('wave');
                extraProviders.push({
                    id: `PROV-AUTO-${e.bankName}`,
                    name: e.bankName,
                    type: isWallet ? 'Digital Wallet' : 'Bank',
                    requiredFields: isWallet ? ['mobile'] : ['accountNumber']
                });
            }
        });
        return [...configured, ...extraProviders];
    }, [systemSettings.paymentProviders, employees]);
    const bankOptions = useMemo(() => {
        const providerBanks = paymentProviders.map(p => p.name);
        const employeeBanks = Array.from(new Set(employees.map(e => e.bankName).filter(Boolean) as string[]));
        const allBanks = Array.from(new Set([...providerBanks, ...employeeBanks])).sort();
        return ['All', ...allBanks, 'Cash Payment'];
    }, [paymentProviders, employees]);

    // Combine payroll records with employee bank/wallet details
    const applyRounding = (val: number) => {
        const logic = systemSettings.paymentRoundingLogic;
        if (logic === 'Ceiling') return Math.ceil(val);
        if (logic === 'Floor') return Math.floor(val);
        if (logic === 'Nearest') return Math.round(val);
        return val;
    };

    const disbursementData = useMemo(() => {
        const recordMap = new Map(payrollRecords.map(r => [r.empId, r]));
        return employees
            .filter(e => e.status !== 'Terminated')
            .map(emp => {
                const record = recordMap.get(emp.id);
                const provider = paymentProviders.find(p => p.name === emp.bankName);
                return {
                    empId: emp.id,
                    name: emp.name,
                    salary: record?.salary ?? emp.baseSalary ?? 0,
                    additions: record?.additions ?? 0,
                    deductions: record?.deductions ?? 0,
                    ssb: record?.ssb ?? 0,
                    employerSsb: record?.employerSsb ?? 0,
                    pit: record?.pit ?? 0,
                    netPay: record?.netPay ?? 0,
                    status: record?.status ?? ('Draft' as const),
                    alerts: record?.alerts ?? [],
                    detailedBreakdowns: record?.detailedBreakdowns ?? {},
                    biometricOTHours: record?.biometricOTHours,
                    biometricAttendanceDays: record?.biometricAttendanceDays,
                    biometricDeviceId: record?.biometricDeviceId,
                    attendanceDeductions: record?.attendanceDeductions,
                    leaveDeductions: record?.leaveDeductions,
                    otherAdditions: record?.otherAdditions,
                    otherDeductions: record?.otherDeductions,
                    roundedNetPay: applyRounding(record?.netPay ?? 0),
                    bankName: emp.bankName,
                    accountNumber: emp.accountNumber,
                    bankBranchCode: undefined,
                    mobile: emp.mobile,
                    dept: (emp as any)?.dept as string | undefined,
                    provider,
                    avatar: emp.avatar,
                    initials: emp.initials,
                    colorClass: emp.colorClass
                };
            });
    }, [payrollRecords, employees, paymentProviders, systemSettings.paymentRoundingLogic]);

    const activeProvider = paymentProviders.find(p => p.name === selectedBank);

    const isMissingInfo = (item: typeof disbursementData[0]) => {
        if (!item.provider) return item.bankName ? true : false;
        for(const reqField of item.provider.requiredFields) {
            if (reqField === 'mobile') {
               if (!item.mobile || item.mobile.replace(/\D/g, '').length < 9 || item.mobile.replace(/\D/g, '').length > 11) return true;
            } else if (!item[reqField as keyof typeof item]) {
               return true;
            }
        }
        return false;
    };

    const allDepts = useMemo(() =>
        ['All', ...Array.from(new Set(employees.map(e => (e as any).dept as string).filter(Boolean))).sort()],
    [employees]);

    const scopeFilteredData = useMemo(() =>
        disbursementData.filter(item => {
            const matchesBank   = selectedBank === 'All' || item.bankName === selectedBank || (selectedBank === 'Cash Payment' && !item.bankName) || (item.bankName && item.bankName.toLowerCase().includes(selectedBank.toLowerCase()));
            const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.empId.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesDept   = deptFilter === 'All' || item.dept === deptFilter;
            return matchesBank && matchesSearch && matchesDept;
        }),
    [disbursementData, selectedBank, searchQuery, deptFilter]);

    const tabbedCounts = useMemo(() => {
        let pending = 0;
        let disbursed = 0;
        let rejected = 0;
        scopeFilteredData.forEach(item => {
            const isMissing = isMissingInfo(item);
            if (isMissing) rejected++;
            if (item.status === 'Disbursed') disbursed++;
            else if (!isMissing) pending++;
        });
        return {
            All: scopeFilteredData.length,
            'Pending Release': pending,
            'Disbursed Successfully': disbursed,
            'Action Required': rejected
        };
    }, [scopeFilteredData]);

    const filteredData = useMemo(() => {
        return scopeFilteredData.filter(item => {
            if (statusTab === 'All') return true;
            const isMissing = isMissingInfo(item);
            if (statusTab === 'Action Required') return isMissing;
            if (statusTab === 'Disbursed Successfully') return item.status === 'Disbursed';
            if (statusTab === 'Pending Release') return item.status !== 'Disbursed' && !isMissing;
            return true;
        });
    }, [scopeFilteredData, statusTab]);

    const stats = useMemo(() => {
        // Stats ONLY reflect the Active Tab context
        const total = filteredData.reduce((sum, item) => sum + item.roundedNetPay, 0);
        const cash = disbursementData.filter(item => !item.bankName).reduce((sum, item) => sum + item.roundedNetPay, 0);
        const missing = filteredData.filter(isMissingInfo).length;
        
        const bankBreakdown = bankOptions.slice(1).map(bankName => ({
            bank: bankName,
            count: disbursementData.filter(i => bankName === 'Cash Payment' ? !i.bankName : i.bankName === bankName).length,
            total: disbursementData.filter(i => bankName === 'Cash Payment' ? !i.bankName : i.bankName === bankName).reduce((s, i) => s + i.roundedNetPay, 0)
        })).filter(b => b.count > 0);
        
        return { total, cash, missing, bankBreakdown };
    }, [filteredData, disbursementData, selectedBank, paymentProviders]);

    const activeGroup   = (payrollGroups as any[])?.find((g: any) => g.id === (activePayrollGroupId as any));
    const activeAdminId = 'ADM-001';

    const sanitize = (val: string | number | undefined | null): string =>
        String(val ?? '').replace(/[\r\n,]+/g, ' ').replace(/"/g, '""');

    const allSelected = filteredData.length > 0 && filteredData.every(item => selectedRows.has(item.empId));
    const toggleRow   = (empId: string) => setSelectedRows(prev => {
        const next = new Set(prev); next.has(empId) ? next.delete(empId) : next.add(empId); return next;
    });
    const toggleAll = () => setSelectedRows(allSelected ? new Set() : new Set(filteredData.map(i => i.empId)));

    const handleExport = () => {
        if (selectedBank === 'All') {
            addToast('Select a specific Provider tab before generating an export.', 'warning');
            return;
        }
        if (payrollRecords.length === 0) {
            addToast('No payroll records. Finalize Payroll first.', 'error');
            return;
        }
        if (lastPayrollStatus !== 'Approved' && lastPayrollStatus !== 'Disbursed') {
            addToast('Payroll must be in \'Approved\' status before a bank file can be generated.', 'error');
            return;
        }
        const exportScope = selectedRows.size > 0
            ? filteredData.filter(item => selectedRows.has(item.empId))
            : filteredData;
        const exportable  = exportScope.filter(item => item.status !== 'Error' && item.bankName);
        const skipped     = exportScope.length - exportable.length;
        if (exportable.length === 0) {
            addToast('No valid records in current selection. Fix missing data first.', 'error');
            return;
        }
        const headers = ['Employee Name', 'Employee ID', 'NRC Number', 'Bank Name', 'Account Number', 'Net Pay (MMK)'];
        const rows = exportable.map(item => {
            const emp = employees.find(e => e.id === item.empId);
            return [
                sanitize(item.name),
                sanitize(item.empId),
                sanitize((emp as any)?.nrcNumber ?? ''),
                sanitize(item.bankName ?? 'Cash Payment'),
                sanitize(item.accountNumber ?? ''),
                String(Math.round(item.netPay))
            ];
        });
        const csvContent = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\r\n');
        const periodParts = (activeGroup?.period ?? 'Payroll Month').split(' ');
        const filename    = `Bank_Transfer_${selectedBank.replace(/\s+/g, '_')}_${periodParts[0] ?? 'M'}_${periodParts[1] ?? 'Y'}.csv`;
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
        generateDisbursementBatch(selectedBank, activeGroup?.period ?? 'Unknown', activeAdminId);
        setExportedBanks(prev => new Set([...prev, selectedBank]));
        const total = exportable.reduce((s, i) => s + Math.round(i.netPay), 0);
        addToast(`\u2713 ${filename} \u2014 ${exportable.length} employees \u00b7 ${total.toLocaleString()} MMK${skipped > 0 ? ` (${skipped} skipped \u2014 missing data)` : ''}`, 'success', 6000);
    };

    const handleXMLExport = () => {
        if (lastPayrollStatus !== 'Approved' && lastPayrollStatus !== 'Disbursed') {
            addToast('Payroll must be Approved before generating an ISO 20022 XML file.', 'error');
            return;
        }
        const xmlEsc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const exportScope = selectedRows.size > 0
            ? filteredData.filter(item => selectedRows.has(item.empId))
            : filteredData.filter(item => item.status !== 'Error' && item.bankName);
        if (exportScope.length === 0) { addToast('No valid records to export.', 'error'); return; }
        const period   = activeGroup?.period ?? 'Unknown';
        const totalAmt = exportScope.reduce((s, i) => s + Math.round(i.netPay), 0);
        const msgId    = `MSG-${(payrunId as any) ?? Date.now()}`;
        const today    = new Date().toISOString().split('T')[0];
        const txNodes  = exportScope.map(item => {
            const emp = employees.find(e => e.id === item.empId);
            return `      <CdtTrfTxInf>\n        <PmtId><EndToEndId>${item.empId}-${(payrunId as any) ?? 'DRAFT'}</EndToEndId></PmtId>\n        <Amt><InstdAmt Ccy="MMK">${Math.round(item.netPay)}</InstdAmt></Amt>\n        <CdtrAgt><FinInstnId><Nm>${xmlEsc(item.bankName ?? 'Cash')}</Nm></FinInstnId></CdtrAgt>\n        <Cdtr><Nm>${xmlEsc(item.name)}</Nm><Id><PrvtId><Othr><Id>${xmlEsc((emp as any)?.nrcNumber ?? 'N/A')}</Id></Othr></PrvtId></Id></Cdtr>\n        <CdtrAcct><Id><Othr><Id>${xmlEsc(item.accountNumber ?? '')}</Id></Othr></Id></CdtrAcct>\n      </CdtTrfTxInf>`;
        }).join('\n');
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n  <CstmrCdtTrfInitn>\n    <GrpHdr>\n      <MsgId>${msgId}</MsgId>\n      <CreDtTm>${new Date().toISOString()}</CreDtTm>\n      <NbOfTxs>${exportScope.length}</NbOfTxs>\n      <CtrlSum>${totalAmt}</CtrlSum>\n      <InitgPty><Nm>HRMS Payroll Engine \u2014 Myanmar</Nm></InitgPty>\n    </GrpHdr>\n    <PmtInf>\n      <PmtInfId>${(payrunId as any) ?? msgId}</PmtInfId>\n      <PmtMtd>TRF</PmtMtd>\n      <NbOfTxs>${exportScope.length}</NbOfTxs>\n      <CtrlSum>${totalAmt}</CtrlSum>\n      <PmtTpInf><SvcLvl><Cd>NURG</Cd></SvcLvl></PmtTpInf>\n      <ReqdExctnDt>${today}</ReqdExctnDt>\n      <Dbtr><Nm>Employer Payroll Account</Nm></Dbtr>\n      <DbtrAcct><Id><Othr><Id>EMPLOYER-MAIN-ACCT</Id></Othr></Id></DbtrAcct>\n      <DbtrAgt><FinInstnId><Nm>${xmlEsc(selectedBank)}</Nm></FinInstnId></DbtrAgt>\n${txNodes}\n    </PmtInf>\n  </CstmrCdtTrfInitn>\n</Document>`;
        const periodParts = period.split(' ');
        const filename = `ISO20022_pain001_${selectedBank.replace(/\s+/g, '_')}_${periodParts[0] ?? 'M'}_${periodParts[1] ?? 'Y'}.xml`;
        const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
        addToast(`ISO 20022 (pain.001) exported: ${filename} \u2014 ${exportScope.length} txns \u00b7 ${totalAmt.toLocaleString()} MMK`, 'success', 6000);
    };

    const handleNotify = () => {
        if (!isDisbursed) { addToast('Complete disbursement first before sending notifications.', 'warning'); return; }
        const period      = activeGroup?.period ?? 'this period';
        const notifyScope = selectedRows.size > 0
            ? disbursementData.filter(item => selectedRows.has(item.empId) && item.status === 'Disbursed')
            : disbursementData.filter(item => item.status === 'Disbursed');
        if (notifyScope.length === 0) { addToast('No disbursed employees to notify.', 'warning'); return; }
        // Legacy alerts (inbox)
        (setAlerts as any)((prev: any[]) => [
            ...notifyScope.map(rec => ({
                id: `PAID-${rec.empId}-${Date.now()}`,
                type: 'success',
                message: (rec as any).bankName
                    ? `💰 Salary Disbursed: Your payment for ${period} has been sent to ${(rec as any).bankName}. Check your bank account for ${Math.round(rec.netPay).toLocaleString()} MMK.`
                    : `💵 Cash Salary Ready: Your payment for ${period} is prepared. Please collect your physical pay packet of ${Math.round(rec.netPay).toLocaleString()} MMK from the Finance/HR Cashier Desk.`,
                timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
                isRead: false,
            })),
            ...prev
        ]);
        // Push notification engine — one per employee (capped at 5, then a summary)
        if (notifyScope.length <= 5) {
            notifyScope.forEach(rec => {
                pushNotification({
                    title: (rec as any).bankName ? `Payslip Ready — ${period}` : `Cash Packet Ready — ${period}`,
                    body: (rec as any).bankName
                        ? `${rec.name}'s salary of ${Math.round(rec.netPay).toLocaleString()} MMK has been disbursed to ${(rec as any).bankName}.`
                        : `Your salary of ${Math.round(rec.netPay).toLocaleString()} MMK is ready for collection at the Finance/HR Cashier Desk.`,
                    category: 'Financial', priority: 'high',
                    icon: 'payments',
                    iconBg: 'bg-emerald-100 dark:bg-emerald-900/30', iconColor: 'text-emerald-600 dark:text-emerald-400',
                    actionRoute: '/bank-disbursements', actionLabel: 'View Payslip',
                    badge: 'Paid', badgeColor: 'emerald', empId: rec.empId,
                });
            });
        } else {
            const total = notifyScope.reduce((s, r) => s + Math.round(r.netPay), 0);
            pushNotification({
                title: `Payroll Disbursed — ${period}`,
                body: `${notifyScope.length} employees notified. Total disbursed: ${total.toLocaleString()} MMK across all payment channels.`,
                category: 'Financial', priority: 'high',
                icon: 'payments',
                iconBg: 'bg-emerald-100 dark:bg-emerald-900/30', iconColor: 'text-emerald-600 dark:text-emerald-400',
                actionRoute: '/bank-disbursements', actionLabel: 'View Disbursement',
                badge: `${notifyScope.length} Paid`, badgeColor: 'emerald',
            });
        }
        addToast(`✓ Payment notifications sent to ${notifyScope.length} employees.`, 'success');
    };

    const handleDisburse = () => {
        if (!approverId.trim()) {
            addToast('An Approver ID is required for dual-approval authorization.', 'error');
            return;
        }
        const period  = activeGroup?.period ?? 'this month';
        const empCount = payrollRecords.length;
        const totalAmt = payrollRecords.reduce((s, r) => s + Math.round(r.netPay), 0);
        const result = disbursePayroll(approverId);
        if (result.success) {
            setShowApprovalModal(false);
            setApproverId('');
            addToast(result.message, 'success');
            pushNotification({
                title: `🎉 Payroll Disbursed — ${period}`,
                body: `${empCount} employee${empCount !== 1 ? 's' : ''} paid. Total: ${totalAmt.toLocaleString()} MMK released via bank transfer & digital wallets.`,
                category: 'Financial', priority: 'urgent',
                icon: 'account_balance',
                iconBg: 'bg-emerald-100 dark:bg-emerald-900/30', iconColor: 'text-emerald-600 dark:text-emerald-400',
                actionRoute: '/bank-disbursements', actionLabel: 'View Disbursement',
                badge: 'Disbursed', badgeColor: 'emerald',
            });

            // Handle auto-notification dispatch using active contextual disbursement scope
            if (autoNotify) {
                const notifyScope = selectedRows.size > 0
                    ? disbursementData.filter(item => selectedRows.has(item.empId))
                    : disbursementData;
                
                if (notifyScope.length > 0) {
                    (setAlerts as any)((prev: any[]) => [
                        ...notifyScope.map(rec => ({
                            id: `PAID-${rec.empId}-${Date.now()}`,
                            type: 'success',
                            message: (rec as any).bankName
                                ? `💰 Salary Disbursed: Your payment for ${period} has been sent to ${(rec as any).bankName}. Check your bank account for ${Math.round(rec.netPay).toLocaleString()} MMK.`
                                : `💵 Cash Salary Ready: Your payment for ${period} is prepared. Please collect your physical pay packet of ${Math.round(rec.netPay).toLocaleString()} MMK from the Finance/HR Cashier Desk.`,
                            timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
                            isRead: false,
                        })),
                        ...prev
                    ]);

                    if (notifyScope.length <= 5) {
                        notifyScope.forEach(rec => {
                            pushNotification({
                                title: (rec as any).bankName ? `Payslip Ready — ${period}` : `Cash Packet Ready — ${period}`,
                                body: (rec as any).bankName
                                    ? `${rec.name}'s salary of ${Math.round(rec.netPay).toLocaleString()} MMK has been disbursed to ${(rec as any).bankName}.`
                                    : `Your salary of ${Math.round(rec.netPay).toLocaleString()} MMK is ready for collection at the Finance/HR Cashier Desk.`,
                                category: 'Financial', priority: 'high',
                                icon: 'payments',
                                iconBg: 'bg-emerald-100 dark:bg-emerald-900/30', iconColor: 'text-emerald-600 dark:text-emerald-400',
                                actionRoute: '/bank-disbursements', actionLabel: 'View Payslip',
                                badge: 'Paid', badgeColor: 'emerald', empId: rec.empId,
                            });
                        });
                    } else {
                        const total = notifyScope.reduce((s, r) => s + Math.round(r.netPay), 0);
                        pushNotification({
                            title: `Payslips Published — ${period}`,
                            body: `${notifyScope.length} employees notified. Total disbursed: ${total.toLocaleString()} MMK across all channels.`,
                            category: 'Financial', priority: 'high',
                            icon: 'payments',
                            iconBg: 'bg-emerald-100 dark:bg-emerald-900/30', iconColor: 'text-emerald-600 dark:text-emerald-400',
                            actionRoute: '/bank-disbursements', actionLabel: 'View Disbursement',
                            badge: `${notifyScope.length} Paid`, badgeColor: 'emerald',
                        });
                    }
                }
            }
        } else {
            addToast(result.message, 'error', 5000);
        }
    };

    const isDisbursed = lastPayrollStatus === 'Disbursed';
    const isApproved  = lastPayrollStatus === 'Approved' || lastPayrollStatus === 'Disbursed';
    const hasRecords  = payrollRecords.length > 0;

    return (
        <div className="flex h-screen overflow-hidden bg-[#F8FAFC] dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
            <Sidebar activeTab="Bank Disbursements" />

            <main className="flex-1 flex flex-col ml-[280px] overflow-hidden">
                <Header 
                    title="Bank Disbursements"
                    subtitle="Manage bulk salary-to-bank uploads, digital wallet payouts, and cash disbursement controls"
                >
                </Header>

                <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">
                    {/* Header Section */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div className="relative w-full max-w-[480px]">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
                                <input
                                    className="w-full border border-slate-200 dark:border-slate-800 rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent text-slate-900 placeholder-slate-400 bg-white dark:bg-slate-900 transition-all shadow-sm"
                                    placeholder="Search by Employee Name or ID..."
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleXMLExport}
                                    disabled={!hasRecords || !isApproved}
                                    title="Export ISO 20022 pain.001.001.03 XML"
                                    className={`flex items-center gap-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm ${(!hasRecords || !isApproved) ? 'opacity-50 cursor-not-allowed text-slate-400' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-violet-700 dark:text-violet-400'}`}
                                >
                                    <span>ISO 20022 XML</span>
                                    <span className="material-symbols-outlined text-[20px]">code</span>
                                </button>
                                <button
                                    onClick={handleExport}
                                    disabled={!hasRecords || !isApproved}
                                    className={`flex items-center gap-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm ${(!hasRecords || !isApproved) ? 'opacity-50 cursor-not-allowed text-slate-400' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                >
                                    <span>Generate CSV</span>
                                    <span className="material-symbols-outlined text-[20px]">download</span>
                                </button>
                                <button
                                    onClick={() => setShowApprovalModal(true)}
                                    disabled={isDisbursed || !hasRecords || !isApproved}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm text-white ${isDisbursed || !hasRecords || !isApproved ? 'bg-slate-400 cursor-not-allowed' : 'bg-[#4F46E5] hover:opacity-90'}`}
                                >
                                    <span className="material-symbols-outlined text-[20px]">{isDisbursed ? 'check_circle' : 'verified_user'}</span>
                                    <span>{isDisbursed ? 'Payroll Disbursed ✓' : isApproved ? 'Finalize Disbursement' : 'Approve Payroll First'}</span>
                                </button>
                                <button
                                    onClick={handleNotify}
                                    disabled={!isDisbursed}
                                    title="Send salary disbursement notifications to all employees"
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm ${!isDisbursed ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
                                >
                                    <span className="material-symbols-outlined text-[20px]">notifications_active</span>
                                    <span>Notify Employees</span>
                                </button>
                            </div>
                        </div>

                        {/* Info Bar */}
                        <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                <span className="text-sm font-bold">{activeGroup?.period ?? 'No Active Period'}</span>
                                <span className="material-symbols-outlined text-[18px] text-slate-400">calendar_month</span>
                            </div>
                            <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1"></div>
                            {(payrunId as any) ? (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                                    <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-[14px]">verified</span>
                                    <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 tracking-tight font-mono">{String(payrunId)}</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                                    <span className="material-symbols-outlined text-amber-500 text-[14px]">pending</span>
                                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">Draft — Pending Finalization</span>
                                </div>
                            )}
                            <Link to="/settings" state={{ auditFilter: 'Payroll', auditSearch: 'Financial Disbursement' }} title="View Financial Disbursement Audit Logs" className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center">
                                <span className="material-symbols-outlined text-[18px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">manage_history</span>
                            </Link>
                            <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1"></div>
                            {/* Per-bank export status */}
                            <div className="flex items-center gap-2 flex-wrap">
                                {stats.bankBreakdown.map(b => (
                                    <span key={b.bank} className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border h-7 transition-all ${
                                        exportedBanks.has(b.bank)
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-2xs'
                                            : 'bg-slate-50 text-slate-500 border-slate-200'
                                    }`}>
                                        <span>{b.bank.replace(' Bank', '')}: {b.count}</span>
                                        {exportedBanks.has(b.bank) && <span className="material-symbols-outlined text-[14px] text-emerald-600 leading-none shrink-0">check</span>}
                                    </span>
                                ))}
                            </div>
                            <div className="ml-auto flex items-center gap-2">
                                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Status:</span>
                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                                    isDisbursed ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                    lastPayrollStatus === 'Approved' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                    'bg-amber-50 text-amber-600 border border-amber-100'
                                }`}>
                                    {lastPayrollStatus}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                        {[
                            { label: 'Total Disbursement', value: stats.total.toLocaleString(), icon: 'account_balance_wallet', color: '' },
                            { label: 'Cash Payments', value: stats.cash.toLocaleString(), icon: 'payments', color: '' },
                            { label: 'Compliance Alerts', value: String(stats.missing), icon: 'report_problem', color: stats.missing > 0 ? 'text-red-500' : 'text-emerald-500', sub: 'Missing Bank Info' },
                        ].map(c => (
                            <div key={c.label} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-1 relative overflow-hidden group hover:shadow-md transition-shadow">
                                <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <span className="material-symbols-outlined text-6xl">{c.icon}</span>
                                </div>
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{c.label}</span>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <span className={`text-2xl font-bold ${c.color || 'text-slate-900 dark:text-white'}`}>{c.value}</span>
                                    <span className="text-xs font-bold text-slate-400">{c.sub || 'MMK'}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Bank Tabs */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-x-auto no-scrollbar">
                            {bankOptions.map(bank => (
                                <button key={bank} onClick={() => setSelectedBank(bank)}
                                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
                                        selectedBank === bank ? 'bg-[#4F46E5] text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                                    }`}>
                                    {bank}
                                    {exportedBanks.has(bank) && selectedBank !== bank && (
                                        <span className="material-symbols-outlined text-emerald-400 text-[12px]">check_circle</span>
                                    )}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-3">
                            <DropdownMenu
                                value={deptFilter}
                                onChange={setDeptFilter}
                                options={allDepts.map(d => ({ value: d, label: d === 'All' ? 'All Departments' : d }))}
                            />
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{filteredData.length} records found</p>
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                        {/* Sub-Status Segmented Tabs */}
                        <div className="flex items-center gap-2 p-3 border-b border-slate-200 dark:border-slate-800 overflow-x-auto bg-slate-50/50 dark:bg-slate-800/20">
                            {(['Pending Release', 'Disbursed Successfully', 'Action Required', 'All'] as const).map(tab => {
                                const count = tabbedCounts[tab];
                                const isActive = statusTab === tab;
                                return (
                                    <button
                                        key={tab}
                                        onClick={() => setStatusTab(tab)}
                                        className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                                            isActive
                                                ? tab === 'Pending Release' ? 'bg-amber-50 text-amber-700 border border-amber-200/60 shadow-2xs dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/40' :
                                                  tab === 'Disbursed Successfully' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-2xs dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/40' :
                                                  tab === 'Action Required' ? 'bg-red-50 text-red-700 border border-red-200/60 shadow-2xs dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/40' :
                                                  'bg-slate-900 text-white shadow-2xs dark:bg-slate-100 dark:text-slate-900'
                                                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                                        }`}
                                    >
                                        <span>{tab}</span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                            isActive
                                                ? tab === 'Pending Release' ? 'bg-amber-200/60 text-amber-800 dark:bg-amber-800/40 dark:text-amber-300' :
                                                  tab === 'Disbursed Successfully' ? 'bg-emerald-200/60 text-emerald-800 dark:bg-emerald-800/40 dark:text-emerald-300' :
                                                  tab === 'Action Required' ? 'bg-red-200/60 text-red-800 dark:bg-red-800/40 dark:text-red-300' :
                                                  'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                        }`}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="overflow-x-auto max-h-[calc(100vh-420px)] overflow-y-auto">
                            <table className="w-full text-left border-collapse min-w-[900px]">
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                        <th className="px-6 py-4"><input className="rounded text-primary focus:ring-primary bg-transparent border-slate-300 dark:border-slate-700" type="checkbox" checked={allSelected} onChange={toggleAll} /></th>
                                        {['Employee', activeProvider?.type === 'Digital Wallet' ? 'Wallet Details' : 'Bank Account', activeProvider?.type === 'Digital Wallet' ? 'Mobile Link' : 'Routing', 'Net Pay (MMK)', 'Validation', 'Status'].map(h => (
                                            <th key={h} className={`px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest ${h === 'Net Pay (MMK)' ? 'text-right' : ''}`}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {isLoading ? (
                                        <SkeletonTable rows={8} columns={7} />
                                    ) : (
                                    <>
                                    {filteredData.map(item => {
                                        const missing = isMissingInfo(item);
                                        return (
                                            <tr key={item.empId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                                                <td className="px-6 py-4 align-middle">
                                                    <input className="rounded text-[#4F46E5] focus:ring-[#4F46E5] bg-transparent border-slate-300 dark:border-slate-700" type="checkbox" checked={selectedRows.has(item.empId)} onChange={() => toggleRow(item.empId)} />
                                                </td>
                                                <td className="px-6 py-4 align-middle">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-9 h-9 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center font-bold text-xs ${item.colorClass || 'bg-slate-100 text-slate-400'}`}>
                                                            {item.avatar ? <img alt={item.name} className="w-full h-full object-cover" src={item.avatar} /> : item.initials || item.name[0]}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-slate-900 dark:text-white">{item.name}</span>
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{item.empId}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 align-middle">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{item.bankName || 'Cash Payment'}</span>
                                                        {item.provider?.type === 'Digital Wallet' ? (
                                                            item.mobile ? (
                                                                <span className="text-[11px] font-mono font-bold text-[#4F46E5]">{item.mobile}</span>
                                                            ) : (
                                                                <span className="text-[11px] font-bold text-red-500 italic">Mobile Missing</span>
                                                            )
                                                        ) : (
                                                            item.accountNumber ? (
                                                                <span className="text-[11px] font-mono text-slate-500">{item.accountNumber}</span>
                                                            ) : (
                                                                item.bankName && <span className="text-[11px] font-bold text-red-500 italic">Account Missing</span>
                                                            )
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 align-middle">
                                                    <span className={`text-xs font-mono font-bold ${item.provider?.type === 'Digital Wallet' ? (item.mobile && item.mobile.replace(/\D/g, '').length >= 9 && item.mobile.replace(/\D/g, '').length <= 11 ? 'text-emerald-500' : 'text-red-400') : 'text-slate-600 dark:text-slate-400'}`}>
                                                        {item.provider?.type === 'Digital Wallet' 
                                                            ? (item.mobile && item.mobile.replace(/\D/g, '').length >= 9 && item.mobile.replace(/\D/g, '').length <= 11 ? 'Valid Phone' : 'Invalid Sync') 
                                                            : 'Direct Account'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right align-middle">
                                                    <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">{(item.roundedNetPay || 0).toLocaleString()}</span>
                                                </td>
                                                <td className="px-6 py-4 align-middle">
                                                    {missing && item.bankName ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-100">
                                                            <span className="material-symbols-outlined text-[14px]">error</span>Rejected
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                                                            <span className="material-symbols-outlined text-[14px]">check_circle</span>Verified
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 align-middle">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest ${
                                                        item.status === 'Disbursed' ? 'bg-emerald-50 text-emerald-600' :
                                                        item.status === 'Approved' ? 'bg-blue-50 text-blue-600' :
                                                        'bg-slate-50 text-slate-600'
                                                    }`}>
                                                        {item.status === 'Disbursed' && <span className="material-symbols-outlined text-[12px]">check_circle</span>}
                                                        {item.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredData.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center gap-2 opacity-40">
                                                    <span className="material-symbols-outlined text-4xl">inventory_2</span>
                                                    <p className="text-sm font-bold">{hasRecords ? 'No records match this filter.' : 'Run Payroll first to see disbursement data.'}</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                    </>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Showing {filteredData.length} of {disbursementData.length} employees{selectedRows.size > 0 ? ` · ${selectedRows.size} selected` : ''}</span>
                            <span className="text-[10px] font-bold text-primary">{exportedBanks.size} / {stats.bankBreakdown.length} bank files exported</span>
                        </div>
                    </div>
                </div>
            </main>

            {/* Dual-Approval Modal */}
            {showApprovalModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/30">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-[#4F46E5]">
                                    <span className="material-symbols-outlined">verified_user</span>
                                </div>
                                <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-tight">Dual-Approval Check</h3>
                            </div>
                            <button onClick={() => setShowApprovalModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-4 rounded-xl flex items-start gap-4">
                                <span className="material-symbols-outlined text-amber-600 text-[20px] mt-0.5">security_update_warning</span>
                                <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed font-bold">
                                    Myanmar Financial Security Protocol: This disbursement batch of <span className="text-slate-900 dark:text-white font-black">{stats.total.toLocaleString()} MMK</span> requires authorization from a Finance Manager.
                                </p>
                            </div>

                            {/* Per-bank summary */}
                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Bank Breakdown</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {stats.bankBreakdown.map(b => (
                                        <div key={b.bank} className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs">
                                            <span className="font-semibold text-slate-600 dark:text-slate-300">{b.bank.replace(' Bank', '')}</span>
                                            <span className="font-bold text-slate-900 dark:text-white">{b.count} · {(b.total / 100000).toFixed(1)}L</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Approver Identity Hub ID</label>
                                <input
                                    type="text"
                                    placeholder="Enter Admin ID (e.g. ADM-001)"
                                    value={approverId}
                                    onChange={(e) => setApproverId(e.target.value)}
                                    className="w-full text-sm font-bold p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] outline-none transition-all shadow-sm"
                                />
                            </div>

                            {/* Auto-Notify Toggle Option */}
                            <div className="flex items-center gap-3 pt-2">
                                <input
                                    type="checkbox"
                                    id="autoNotifyToggle"
                                    checked={autoNotify}
                                    onChange={(e) => setAutoNotify(e.target.checked)}
                                    className="size-5 rounded accent-[#4F46E5] cursor-pointer shrink-0"
                                />
                                <label htmlFor="autoNotifyToggle" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none leading-relaxed">
                                    Automatically notify staff via mobile push alerts upon release
                                </label>
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3">
                            <button
                                onClick={handleDisburse}
                                className="w-full px-5 py-3 rounded-xl text-sm font-bold text-white bg-[#4F46E5] hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none uppercase tracking-widest"
                            >
                                Authorize & Release Salary
                            </button>
                            <button onClick={() => setShowApprovalModal(false)} className="w-full px-5 py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        </div>
    );
}
