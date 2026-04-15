import React, { useState, useMemo } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useAppData } from '../context/AppDataContext';
import { useSystemCalendar } from '../context/SystemCalendarContext';

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

export default function SSBPIT() {
    const { employees, payrollRecords, setAlerts, complianceSettings } = useAppData();
    const { getFormattedDate } = useSystemCalendar();
    const [activeTab, setActiveTab] = useState<'SSB' | 'PIT'>('SSB');
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 300);

    // Toast
    const [toasts, setToasts] = useState<Toast[]>([]);
    const addToast = (message: string, type: Toast['type'], duration = 3500) => {
        const id = `toast-${Date.now()}`;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
    };
    const dismissToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

    // Compliance Audit (memoized to prevent re-scan on every render)
    const { missingSSBCount, hasAuditFailures } = useMemo(() => {
        const count = employees.filter(e => e.status === 'Active' && (!e.ssbNumber || e.ssbNumber === 'Pending Verification')).length;
        return { missingSSBCount: count, hasAuditFailures: count > 0 };
    }, [employees]);

    // Financial Aggregations — memoized, recalculates only when payroll data or SSB % changes
    const { totalGrossWages, totalEmployeeSSB, totalEmployerSSB, totalPIT } = useMemo(() => ({
        totalGrossWages: payrollRecords.reduce((sum, r) => sum + r.salary, 0),
        totalEmployeeSSB: payrollRecords.reduce((sum, r) => sum + r.ssb, 0),
        totalEmployerSSB: payrollRecords.reduce((sum, r) => sum + Math.min(
            Math.round(r.salary * (complianceSettings.ssbPercent / 100) * 1.5),
            complianceSettings.ssbCap * 1.5
        ), 0),
        totalPIT: payrollRecords.reduce((sum, r) => sum + r.pit, 0),
    }), [payrollRecords, complianceSettings.ssbPercent, complianceSettings.ssbCap]);

    // Filtered table data — debounced to prevent filtering on every keystroke
    const filteredRecords = useMemo(() =>
        payrollRecords.filter(r =>
            r.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            r.empId.toLowerCase().includes(debouncedSearch.toLowerCase())
        ),
    [payrollRecords, debouncedSearch]);

    const handleGenerateReport = (formName: string) => {
        if (hasAuditFailures && activeTab === 'SSB') {
            setAlerts(prev => [{
                id: `ERR-${Date.now()}`, type: 'error',
                message: `Cannot generate ${formName}. ${missingSSBCount} employees are missing SSB IDs. Submission blocked.`,
                timestamp: new Date().toLocaleTimeString(), isRead: false
            }, ...prev]);
            addToast(`Filing blocked: ${missingSSBCount} employees have missing SSB IDs.`, 'error', 5000);
            return;
        }
        if (payrollRecords.length === 0) {
            addToast('No payroll records available. Run Payroll first.', 'warning');
            return;
        }
        setAlerts(prev => [{
            id: `RPT-${Date.now()}`, type: 'success' as const,
            message: `${formName} generated and archived in Forms Library. Signed & Stamped with ${complianceSettings.companyTIN}.`,
            timestamp: getFormattedDate(new Date(), 'time'), isRead: false
        }, ...prev]);
        addToast(`${formName} generated successfully. Filed to Government portal (simulated).`, 'success');
    };

    return (
        <div className="flex h-screen w-full bg-[#F8FAFC] dark:bg-background-dark font-display text-slate-900 dark:text-white antialiased overflow-hidden">
            <Sidebar activeTab="SSB & PIT" />

            <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-slate-50 dark:bg-background-dark ml-[280px]">
                <Header 
                    title="Social Security & Tax"
                    subtitle="Generate compliance reports, audit employee SSB numbers, and simulate government PIT filings"
                >
                    <div className="relative w-full max-w-[480px] ml-4 hidden lg:block text-left">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
                        <input
                            className="w-full border border-slate-200 dark:border-slate-800 rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent text-slate-900 placeholder-slate-400 bg-white dark:bg-slate-900 transition-all shadow-sm"
                            placeholder="Search by Employee Name or ID..."
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </Header>

                <div className="flex-1 overflow-y-auto p-6 md:p-8">
                    <div className="max-w-[1200px] mx-auto space-y-6">

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Compliance Reporting</p>
                            <div className="flex items-center gap-3 shrink-0">
                                <button className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm">
                                    <span className="material-symbols-outlined text-[20px]">calendar_month</span>
                                    <span className="text-sm">October 2023 - Myanmar</span>
                                    <span className="material-symbols-outlined text-[20px] ml-1 text-slate-400">expand_more</span>
                                </button>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="border-b border-slate-200 dark:border-slate-700">
                            <nav className="flex gap-6 -mb-px">
                                <button onClick={() => setActiveTab('SSB')}
                                    className={`border-b-2 font-bold text-sm py-4 px-1 inline-flex items-center gap-2 transition-all ${activeTab === 'SSB' ? 'border-[#4F46E5] text-[#4F46E5]' : 'border-transparent text-[#94A3B8] hover:text-slate-700'}`}>
                                    <span className="material-symbols-outlined text-[20px]">shield</span>SSB (Social Security)
                                    {hasAuditFailures && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
                                </button>
                                <button onClick={() => setActiveTab('PIT')}
                                    className={`border-b-2 font-bold text-sm py-4 px-1 inline-flex items-center gap-2 transition-all ${activeTab === 'PIT' ? 'border-[#4F46E5] text-[#4F46E5]' : 'border-transparent text-[#94A3B8] hover:text-slate-700'}`}>
                                    <span className="material-symbols-outlined text-[20px]">account_balance</span>PIT (Income Tax)
                                </button>
                            </nav>
                        </div>

                        <div className="space-y-6">
                            {/* Compliance Audit Banner */}
                            {hasAuditFailures && activeTab === 'SSB' && (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-red-600 dark:text-red-400">report_problem</span>
                                            <div>
                                                <p className="text-sm font-bold text-red-900 dark:text-red-100">Compliance Audit: Failed</p>
                                                <p className="text-xs text-red-700 dark:text-red-300">{missingSSBCount} employees have missing or unverified SSB IDs. Filing is restricted.</p>
                                            </div>
                                        </div>
                                        <button onClick={() => addToast('Navigate to Employee Directory → Edit employee → Add SSB Number.', 'warning')}
                                            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-red-700 transition-colors">
                                            Resolve Missing IDs
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* KPI Cards */}
                            <div className="grid grid-cols-4 gap-4">
                                {[
                                    { label: activeTab === 'SSB' ? 'Aggregate Gross' : 'Taxable Revenue', value: totalGrossWages },
                                    { label: activeTab === 'SSB' ? 'Employee (2%)' : 'Exemption Reliefs', value: activeTab === 'SSB' ? totalEmployeeSSB : 0 },
                                    { label: activeTab === 'SSB' ? 'Employer (3%)' : 'Monthly PIT', value: activeTab === 'SSB' ? totalEmployerSSB : totalPIT },
                                    { label: 'Total Filing Liability', value: activeTab === 'SSB' ? (totalEmployeeSSB + totalEmployerSSB) : totalPIT, highlight: true },
                                ].map(k => (
                                    <div key={k.label} className={`p-5 rounded-xl border shadow-sm ${k.highlight ? 'bg-primary/5 border-primary/20' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
                                        <p className={`text-xs font-medium uppercase tracking-wider ${k.highlight ? 'text-[#4F46E5] font-bold' : 'text-slate-500'}`}>{k.label}</p>
                                        <p className={`text-xl font-bold mt-1 uppercase ${k.highlight ? 'text-[#4F46E5]' : 'text-slate-900 dark:text-white'}`}>{k.value.toLocaleString()} MMK</p>
                                    </div>
                                ))}
                            </div>

                            {/* Filing Action Card */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex items-center justify-between border-l-4 border-l-[#4F46E5]">
                                <div className="flex gap-4 items-start">
                                    <div className="p-3 rounded-lg" style={{ color: '#4F46E5', backgroundColor: 'rgba(79, 70, 229, 0.1)' }}>
                                        <span className="material-symbols-outlined text-3xl">{activeTab === 'SSB' ? 'description' : 'account_balance'}</span>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{activeTab === 'SSB' ? 'Form 15 (Monthly SSB Contribution)' : 'Patakha-(W)-15 (Monthly PIT)'}</h3>
                                            <span className="px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-bold uppercase tracking-wide">Pending Filing</span>
                                        </div>
                                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Export individual {activeTab} breakdowns for government portal submission.</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="relative group">
                                        <button
                                            onClick={() => handleGenerateReport(activeTab === 'SSB' ? 'Form 15' : 'Patakha-(W)-15')}
                                            disabled={hasAuditFailures && activeTab === 'SSB'}
                                            className="flex items-center gap-2 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed shadow-md shadow-[#4F46E5]/20"
                                            style={{ backgroundColor: '#4F46E5' }}
                                        >
                                            <span className="material-symbols-outlined text-[20px]">cloud_upload</span>
                                            <span>Simulate Government Filing</span>
                                        </button>
                                        {hasAuditFailures && activeTab === 'SSB' && (
                                            <div className="invisible group-hover:visible absolute bottom-full right-0 mb-2 w-48 p-2 bg-slate-900 text-white text-[10px] rounded shadow-xl z-20">
                                                Locked: Complete SSB Number Audit first.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Employee Breakdown Table */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
                                <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                                    <h4 className="font-bold text-slate-800 dark:text-white">Employee {activeTab} Breakdown</h4>
                                    <div className="flex items-center gap-4">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded">
                                            Jurisdiction: {activeTab === 'SSB' ? 'Township' : 'NRC Office'}
                                        </p>
                                        <span className="text-xs font-bold text-primary">{filteredRecords.length} records</span>
                                    </div>
                                </div>
                                <div className="overflow-x-auto text-left">
                                    <table className="w-full text-left border-collapse min-w-[800px]">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-slate-800/50">
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Employee</th>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{activeTab === 'SSB' ? 'SSB ID' : 'NRC / Township'}</th>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">{activeTab === 'SSB' ? 'Total Income' : 'Taxable Basis'}</th>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right whitespace-nowrap">
                                                    {activeTab === 'SSB' ? 'SSB Capped' : 'Attendance Deduct'}
                                                </th>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">{activeTab === 'SSB' ? 'Emp (2%)' : 'Net Tax (5%)'}</th>
                                                {activeTab === 'SSB' && <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Empr (3%)</th>}
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Audit</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                            {filteredRecords.length > 0 ? filteredRecords.map(record => {
                                                const emp = employees.find(e => e.id === record.empId);
                                                const isMissingSSB = activeTab === 'SSB' && (!emp?.ssbNumber || emp?.ssbNumber === 'Pending Verification');

                                                return (
                                                    <tr key={record.empId} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isMissingSSB ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`size-8 rounded-full flex items-center justify-center font-bold text-xs ring-1 ring-white shadow-sm ${emp?.colorClass || 'bg-slate-200'}`}>
                                                                    {emp?.avatar ? <img src={emp.avatar} className="size-full rounded-full" alt="" /> : (emp?.initials || record.name[0])}
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{record.name}</p>
                                                                    <p className="text-[10px] text-slate-500 font-medium">UID: {record.empId}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400 font-mono">
                                                            {activeTab === 'SSB'
                                                                ? (isMissingSSB ? <span className="text-red-500 font-bold uppercase text-[10px]">MISSING ID</span> : emp?.ssbNumber)
                                                                : `${emp?.nrcNumber || '??'} / ${emp?.township || '??'}`
                                                            }
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white text-right font-medium tabular-nums">{(activeTab === 'SSB' ? record.salary : (record.salary - record.deductions)).toLocaleString()} MMK</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white text-right tabular-nums">
                                                            {activeTab === 'SSB' ? `${complianceSettings.ssbCap.toLocaleString()} MMK` : <span className="text-red-500 font-medium whitespace-nowrap">-{record.deductions.toLocaleString()} MMK</span>}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white text-right font-bold tabular-nums">{(activeTab === 'SSB' ? record.ssb : record.pit).toLocaleString()} MMK</td>
                                                        {activeTab === 'SSB' && (
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white text-right tabular-nums">{Math.round(record.ssb * 1.5).toLocaleString()} MMK</td>
                                                        )}
                                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                                            <span className={`material-symbols-outlined text-[20px] ${isMissingSSB ? 'text-red-500 animate-pulse' : 'text-emerald-500'}`}
                                                                style={{ fontVariationSettings: isMissingSSB ? "'FILL' 0" : "'FILL' 1" }}>
                                                                {isMissingSSB ? 'error' : 'verified'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            }) : (
                                                <tr>
                                                    <td colSpan={activeTab === 'SSB' ? 7 : 6} className="px-6 py-12 text-center">
                                                        <span className="material-symbols-outlined text-4xl text-slate-300 block mb-2">find_in_page</span>
                                                        <p className="text-slate-400 font-medium">{payrollRecords.length === 0 ? 'Run Payroll first to see tax breakdowns.' : 'No records match your search.'}</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                                    <p>{activeTab === 'SSB' ? `SSB capped at ${complianceSettings.ssbCap.toLocaleString()} MMK per Myanmar Social Security Board directive.` : 'PIT calculated per Myanmar Internal Revenue Department brackets.'}</p>
                                    <span className="font-bold text-primary">{filteredRecords.length} employees</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        </div>
    );
}
