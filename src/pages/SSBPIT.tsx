import React, { useState, useMemo, useCallback } from 'react';
import { TableVirtuoso } from 'react-virtuoso';
import { useDebounce } from '../hooks/useDebounce';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useAppData } from '../context/AppDataContext';
import { useSystemCalendar } from '../context/SystemCalendarContext';
import { useUserAccess } from '../context/UserAccessProvider';
import { exportSSBForm13CSV, exportPITReportCSV } from '../utils/taxExport';

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
    const { employees, payrollRecords, setPayrollRecords, setAlerts, complianceSettings, systemSettings, addDocumentToLibrary } = useAppData();
    const { getFormattedDate } = useSystemCalendar();
    const { addAuditLog, addSecurityLog } = useUserAccess();
    const [activeTab, setActiveTab] = useState<'SSB' | 'PIT' | 'Tax Calculator'>('SSB');

    // Tax Calculator State (migrated from Myanmar Compliance)
    const [calcSalary, setCalcSalary] = useState<number>(1000000);
    const [calcSpouse, setCalcSpouse] = useState<boolean>(false);
    const [calcParents, setCalcParents] = useState<number>(0);

    const taxCalcDetails = useMemo(() => {
        const ssb = Math.min(calcSalary * (complianceSettings.ssbPercent / 100), complianceSettings.ssbCap * (complianceSettings.ssbPercent / 100));
        const annualIncome = calcSalary * 12;
        const ssbAnnual = ssb * 12;
        const basicRelief = Math.min(annualIncome * 0.2, 10000000);
        const spouseRelief = calcSpouse ? 1000000 : 0;
        const parentsRelief = calcParents * 1000000;
        const exemption = complianceSettings.pitExemption;
        const totalReliefs = basicRelief + spouseRelief + parentsRelief + ssbAnnual;
        const assessableIncome = Math.max(0, annualIncome - totalReliefs);
        let pitAnnual = 0;
        let pitTier = 0;
        const waterfall: { range: string; rate: number; amount: number; tax: number }[] = [];
        if (assessableIncome > exemption) {
            const bands = [
                { limit: 2000000, rate: 0 },
                { limit: 5000000, rate: 0.05 },
                { limit: 10000000, rate: 0.10 },
                { limit: 20000000, rate: 0.15 },
                { limit: 30000000, rate: 0.20 },
                { limit: Infinity, rate: 0.25 },
            ];
            let remaining = assessableIncome;
            let previousLimit = 0;
            for (const b of bands) {
                const bandSize = b.limit - previousLimit;
                const inBand = Math.min(remaining, bandSize);
                if (inBand > 0) {
                    const taxForBand = inBand * b.rate;
                    pitAnnual += taxForBand;
                    if (b.rate > 0 && inBand > 0) pitTier = b.rate * 100;
                    waterfall.push({ range: `${(previousLimit/1000000)}M - ${b.limit===Infinity ? '...' : (b.limit/1000000)+'M'}`, rate: b.rate * 100, amount: inBand, tax: taxForBand });
                }
                remaining -= inBand;
                if (remaining <= 0) break;
                previousLimit = b.limit;
            }
        }
        return { ssb, annualIncome, assessableIncome, totalReliefs, exemption, pitAnnual, pitMonthly: pitAnnual / 12, pitTier, waterfall };
    }, [calcSalary, calcSpouse, calcParents, complianceSettings]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDept, setSelectedDept] = useState<string>('All');
    const debouncedSearch = useDebounce(searchQuery, 300);

    // Tax Patch State
    const [patchModalOpen, setPatchModalOpen] = useState(false);
    const [patchEmpId, setPatchEmpId] = useState('');
    const [patchField, setPatchField] = useState<'ssb' | 'pit'>('ssb');
    const [patchAmount, setPatchAmount] = useState('');
    const [patchReason, setPatchReason] = useState('');

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

    // Unique departments from payroll employees
    const departments = useMemo(() => {
        const depts = new Set<string>();
        payrollRecords.forEach(r => {
            const emp = employees.find(e => e.id === r.empId);
            if (emp?.dept) depts.add(emp.dept);
        });
        return ['All', ...Array.from(depts).sort()];
    }, [payrollRecords, employees]);

    // Department-filtered records (drives KPI cards)
    const deptFilteredRecords = useMemo(() =>
        selectedDept === 'All'
            ? payrollRecords
            : payrollRecords.filter(r => {
                const emp = employees.find(e => e.id === r.empId);
                return emp?.dept === selectedDept;
            }),
    [payrollRecords, employees, selectedDept]);

    // Financial Aggregations — reactive to department filter
    const { totalGrossWages, totalEmployeeSSB, totalEmployerSSB, totalPIT } = useMemo(() => ({
        totalGrossWages: deptFilteredRecords.reduce((sum, r) => sum + r.salary, 0),
        totalEmployeeSSB: deptFilteredRecords.reduce((sum, r) => sum + r.ssb, 0),
        totalEmployerSSB: deptFilteredRecords.reduce((sum, r) => sum + (r.employerSsb ?? 0), 0),
        totalPIT: deptFilteredRecords.reduce((sum, r) => sum + r.pit, 0),
    }), [deptFilteredRecords]);

    // Filtered table data — search chains on top of department filter
    const filteredRecords = useMemo(() =>
        deptFilteredRecords.filter(r =>
            r.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            r.empId.toLowerCase().includes(debouncedSearch.toLowerCase())
        ),
    [deptFilteredRecords, debouncedSearch]);

    // ─── CSV Exports (shared utility — same function used by PayrollRun Step 10) ──
    const dateSuffix = new Date().toISOString().slice(0, 7);
    const exportSSBForm13 = useCallback(() => exportSSBForm13CSV(payrollRecords, employees, dateSuffix), [payrollRecords, employees, dateSuffix]);
    const exportPITReport = useCallback(() => exportPITReportCSV(payrollRecords, employees, dateSuffix), [payrollRecords, employees, dateSuffix]);

    // ─── Tax Patch (Manual Override) ─────────────────────────────────────────────
    const handleTaxPatch = () => {
        if (!patchEmpId || !patchReason.trim() || !patchAmount) {
            addToast('All fields are required: Employee, Amount, and Reason.', 'error');
            return;
        }
        const amount = parseInt(patchAmount);
        if (isNaN(amount) || amount < 0) {
            addToast('Amount must be a non-negative number.', 'error');
            return;
        }
        const rec = payrollRecords.find(r => r.empId === patchEmpId);
        if (!rec) { addToast('Employee not found in payroll records.', 'error'); return; }

        const oldValue = patchField === 'ssb' ? rec.ssb : rec.pit;
        const diff = amount - oldValue;
        setPayrollRecords(prev => prev.map(r =>
            r.empId === patchEmpId
                ? { ...r, [patchField]: amount, netPay: Math.max(0, r.netPay - diff) }
                : r
        ));
        addSecurityLog({
            deviceId: 'WEB-ADMIN',
            authMethod: 'SYSTEM',
            status: 'Success',
            empId: patchEmpId,
            detail: `[HIGH PRIORITY] Tax Patch: ${patchField.toUpperCase()} for ${rec.name} (${patchEmpId}) changed from ${oldValue.toLocaleString()} to ${amount.toLocaleString()} MMK. Reason: ${patchReason}`
        });
        addAuditLog({
            adminId: 'ADM-001',
            actionType: 'Tax Patch Override',
            module: 'Payroll',
            detail: `[HIGH] Manual ${patchField.toUpperCase()} override for ${rec.name} (${patchEmpId}): ${oldValue.toLocaleString()} → ${amount.toLocaleString()} MMK. Reason: ${patchReason}`
        });
        setAlerts(prev => [{
            id: `TAXPATCH-${Date.now()}`, type: 'warning' as any,
            message: `TAX PATCH: ${patchField.toUpperCase()} for ${rec.name} manually overridden (${oldValue.toLocaleString()} → ${amount.toLocaleString()} MMK). Audit trail created.`,
            timestamp: getFormattedDate(new Date(), 'time'), isRead: false
        }, ...prev]);
        addToast(`Tax Patch applied: ${patchField.toUpperCase()} → ${amount.toLocaleString()} MMK`, 'success');
        setPatchModalOpen(false);
        setPatchEmpId(''); setPatchAmount(''); setPatchReason('');
    };

    const handleGenerateReport = useCallback((formName: string) => {
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
        // Trigger real file download
        if (activeTab === 'SSB') exportSSBForm13();
        else exportPITReport();

        // Archive bridge — auto-save to Forms Library
        const totalLiability = activeTab === 'SSB' ? (totalEmployeeSSB + totalEmployerSSB) : totalPIT;
        const archiveContent = [
            `=========================================`,
            `  ${formName.toUpperCase()} — AUTOMATED ARCHIVE`,
            `=========================================`,
            `Filing Type: ${activeTab === 'SSB' ? 'Social Security Board (Monthly)' : 'Personal Income Tax (Monthly)'}`,
            `Period: Oct 2023`,
            `Total Employees: ${payrollRecords.length}`,
            `Total Gross Wages: ${totalGrossWages.toLocaleString()} MMK`,
            activeTab === 'SSB' ? `Employee SSB (2%): ${totalEmployeeSSB.toLocaleString()} MMK` : `Total PIT: ${totalPIT.toLocaleString()} MMK`,
            activeTab === 'SSB' ? `Employer SSB (3%): ${totalEmployerSSB.toLocaleString()} MMK` : '',
            `Total Filing Liability: ${totalLiability.toLocaleString()} MMK`,
            `Company TIN: ${complianceSettings.companyTIN}`,
            `=========================================`,
            `Generated: ${new Date().toISOString()}`,
            `=========================================`,
        ].filter(Boolean).join('\n');
        addDocumentToLibrary({
            title: `${formName} — Oct 2023`,
            category: 'Government Filing',
            sourceModule: activeTab,
            description: `${activeTab} filing for Oct 2023. ${payrollRecords.length} employees. Liability: ${totalLiability.toLocaleString()} MMK.`,
            period: 'Oct 2023',
            generatedBy: 'EMP-001',
            fileContent: archiveContent,
            fileName: `${formName.replace(/[\s/()]/g, '_')}_Oct2023.txt`,
            isMandatory: true,
            relatedRecordId: null,
        }, 'EMP-001');

        setAlerts(prev => [{
            id: `RPT-${Date.now()}`, type: 'success' as const,
            message: `${formName} generated and downloaded. Signed & Stamped with ${complianceSettings.companyTIN}.`,
            timestamp: getFormattedDate(new Date(), 'time'), isRead: false
        }, ...prev]);
        addToast(`${formName} downloaded successfully as CSV.`, 'success');
    }, [hasAuditFailures, activeTab, missingSSBCount, payrollRecords, exportSSBForm13, exportPITReport, complianceSettings.companyTIN, getFormattedDate, setAlerts, totalGrossWages, totalEmployeeSSB, totalEmployerSSB, totalPIT, addDocumentToLibrary]);

    return (
        <div className="flex h-screen w-full bg-[#F8FAFC] dark:bg-background-dark font-display text-slate-900 dark:text-white antialiased overflow-hidden">
            <Sidebar activeTab="SSB & PIT" />

            <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-slate-50 dark:bg-background-dark ml-[280px]">
                <Header 
                    title="Social Security & Tax"
                    subtitle="Generate compliance reports, audit employee SSB numbers, and simulate government PIT filings"
                />

                <div className="flex-1 overflow-y-auto p-6 md:p-8">
                    <div className="space-y-6">

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="relative w-full max-w-[400px]">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
                                <input
                                    className="w-full border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent text-slate-900 dark:text-white placeholder-slate-400 bg-white dark:bg-slate-900 transition-all shadow-sm"
                                    placeholder="Search by Employee Name or ID..."
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] pointer-events-none">apartment</span>
                                    <select
                                        value={selectedDept}
                                        onChange={e => setSelectedDept(e.target.value)}
                                        className="appearance-none pl-9 pr-8 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm cursor-pointer focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent"
                                    >
                                        {departments.map(d => (
                                            <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>
                                        ))}
                                    </select>
                                    <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] pointer-events-none">expand_more</span>
                                </div>
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
                                <button onClick={() => setActiveTab('Tax Calculator')}
                                    className={`border-b-2 font-bold text-sm py-4 px-1 inline-flex items-center gap-2 transition-all ${activeTab === 'Tax Calculator' ? 'border-[#4F46E5] text-[#4F46E5]' : 'border-transparent text-[#94A3B8] hover:text-slate-700'}`}>
                                    <span className="material-symbols-outlined text-[20px]">calculate</span>Tax Calculator
                                </button>
                            </nav>
                        </div>

                        {activeTab === 'Tax Calculator' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mt-6">
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm h-fit">
                                    <h3 className="text-sm font-black mb-6 flex items-center gap-2"><span className="material-symbols-outlined text-indigo-600">tune</span> Salary Simulator</h3>
                                    <div className="space-y-6">
                                        <div>
                                            <div className="flex justify-between mb-2">
                                                <label className="text-xs font-bold text-slate-600">Base Salary (MMK)</label>
                                                <span className="text-sm font-black text-indigo-600">{calcSalary.toLocaleString()} MMK</span>
                                            </div>
                                            <input type="range" min="150000" max="10000000" step="50000"
                                                value={calcSalary} onChange={e => setCalcSalary(Number(e.target.value))}
                                                className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-6">
                                            <label className="flex items-center gap-3 cursor-pointer">
                                                <input type="checkbox" checked={calcSpouse} onChange={e => setCalcSpouse(e.target.checked)} className="accent-indigo-600 w-4 h-4" />
                                                <span className="text-xs font-bold text-slate-700">Spouse Allowance</span>
                                            </label>
                                            <label className="flex items-center gap-3 cursor-pointer">
                                                <select value={calcParents} onChange={e => setCalcParents(Number(e.target.value))} className="w-16 rounded-md border border-slate-300 bg-slate-50 text-xs p-1">
                                                    <option value={0}>0</option><option value={1}>1</option><option value={2}>2</option>
                                                </select>
                                                <span className="text-xs font-bold text-slate-700">Parents Relief</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm border-l-4 border-l-emerald-500">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-sm font-black flex items-center gap-2"><span className="material-symbols-outlined text-emerald-600">health_and_safety</span> Monthly SSB</h3>
                                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border bg-emerald-50 text-emerald-700 border-emerald-200">Capped</span>
                                        </div>
                                        <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{taxCalcDetails.ssb.toLocaleString()} MMK</p>
                                        <p className="text-[10px] text-slate-500 mt-1">2% deduction. Max calc limit: {complianceSettings.ssbCap.toLocaleString()} MMK</p>
                                    </div>
                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm border-l-4 border-l-rose-500">
                                        <div className="p-6 border-b border-slate-100">
                                            <div className="flex justify-between items-center mb-4">
                                                <h3 className="text-sm font-black flex items-center gap-2"><span className="material-symbols-outlined text-rose-600">account_balance</span> Monthly PIT</h3>
                                                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border bg-amber-50 text-amber-700 border-amber-200">Tier: {taxCalcDetails.pitTier}%</span>
                                            </div>
                                            <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{taxCalcDetails.pitMonthly.toLocaleString()} MMK</p>
                                            <p className="text-[10px] text-slate-500 mt-1">Annual PIT: {taxCalcDetails.pitAnnual.toLocaleString()} MMK</p>
                                        </div>
                                        {taxCalcDetails.waterfall.length > 0 && (
                                            <div className="p-4 bg-slate-50 rounded-b-2xl">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 px-2">Tax Brackets Applied</p>
                                                <div className="space-y-1">
                                                    {taxCalcDetails.waterfall.map((w, i) => (
                                                        <div key={i} className="flex items-center justify-between px-2 py-1.5 hover:bg-slate-100 rounded">
                                                            <span className="text-xs text-slate-600 w-24">{w.range}</span>
                                                            <span className="text-xs font-bold w-12 text-center text-slate-500">{w.rate}%</span>
                                                            <span className="text-xs font-black text-slate-800 tabular-nums">{w.tax.toLocaleString()}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {(activeTab === 'SSB' || activeTab === 'PIT') && <div className="space-y-6">
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
                            {selectedDept !== 'All' && (
                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 rounded-full bg-[#4F46E5]/10 text-[#4F46E5] text-xs font-bold flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[14px]">filter_alt</span>
                                        {selectedDept}
                                    </span>
                                    <button onClick={() => setSelectedDept('All')} className="text-[10px] text-slate-400 hover:text-red-500 font-bold uppercase tracking-wider transition-colors">Clear Filter</button>
                                </div>
                            )}
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
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{activeTab === 'SSB' ? 'Form 13 (Monthly SSB Contribution)' : 'Patakha-(W)-15 (Monthly PIT)'}</h3>
                                            <span className="px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-bold uppercase tracking-wide">Pending Filing</span>
                                        </div>
                                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Export individual {activeTab} breakdowns for government portal submission.</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setPatchModalOpen(true)}
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-all"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">edit_note</span>
                                        Tax Patch
                                    </button>
                                    <div className="relative group">
                                        <button
                                            onClick={() => handleGenerateReport(activeTab === 'SSB' ? 'Form 13' : 'Patakha-(W)-15')}
                                            disabled={hasAuditFailures && activeTab === 'SSB'}
                                            className="flex items-center gap-2 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed shadow-md shadow-[#4F46E5]/20"
                                            style={{ backgroundColor: '#4F46E5' }}
                                        >
                                            <span className="material-symbols-outlined text-[20px]">download</span>
                                            <span>Generate &amp; Download CSV</span>
                                        </button>
                                        {hasAuditFailures && activeTab === 'SSB' && (
                                            <div className="invisible group-hover:visible absolute bottom-full right-0 mb-2 w-48 p-2 bg-slate-900 text-white text-[10px] rounded shadow-xl z-20">
                                                Locked: Complete SSB Number Audit first.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Employee Breakdown Table — Virtual Scrolling */}
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
                                {filteredRecords.length > 0 ? (
                                    <div style={{ height: Math.min(filteredRecords.length * 64 + 2, 520) }}>
                                        <TableVirtuoso
                                            data={filteredRecords}
                                            overscan={20}
                                            fixedHeaderContent={() => (
                                                <tr className="bg-slate-50 dark:bg-slate-800/50">
                                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-left">Employee</th>
                                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-left">{activeTab === 'SSB' ? 'SSB ID' : 'NRC / Township'}</th>
                                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">{activeTab === 'SSB' ? 'Total Income' : 'Taxable Basis'}</th>
                                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right whitespace-nowrap">
                                                        {activeTab === 'SSB' ? 'SSB Capped' : 'Attendance Deduct'}
                                                    </th>
                                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">{activeTab === 'SSB' ? 'Emp (2%)' : 'Net Tax'}</th>
                                                    {activeTab === 'SSB' && <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Empr (3%)</th>}
                                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Audit</th>
                                                </tr>
                                            )}
                                            components={{
                                                Table: (props) => <table {...props} className="w-full text-left border-collapse min-w-[800px]" />,
                                                TableHead: React.forwardRef((props, ref) => <thead {...props} ref={ref} />),
                                                TableRow: (props) => <tr {...props} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-200 dark:border-slate-800" />,
                                                TableBody: React.forwardRef((props, ref) => <tbody {...props} ref={ref} />),
                                            }}
                                            itemContent={(_, record) => {
                                                const emp = employees.find(e => e.id === record.empId);
                                                const isMissingSSB = activeTab === 'SSB' && (!emp?.ssbNumber || emp?.ssbNumber === 'Pending Verification');
                                                const isMissingTIN = activeTab === 'PIT' && !emp?.taxId;

                                                // PIT tier tooltip data
                                                let tierInfo = { annual: 0, exemption: 0, tier: 0 };
                                                if (activeTab === 'PIT') {
                                                    const annualTaxable = (record.salary - record.deductions) * 12;
                                                    const exemption = complianceSettings.pitExemption
                                                        + (emp?.reliefs?.spouse ? 1000000 : 0)
                                                        + ((emp?.reliefs?.parentsCount ?? 0) * 1000000);
                                                    let topTier = 0;
                                                    if (annualTaxable > exemption) {
                                                        const bands = [
                                                            { to: exemption + 5200000, rate: 5 },
                                                            { to: exemption + 15200000, rate: 10 },
                                                            { to: exemption + 25200000, rate: 15 },
                                                            { to: exemption + 35200000, rate: 20 },
                                                            { to: Infinity, rate: 25 },
                                                        ];
                                                        topTier = bands.find(b => annualTaxable <= b.to)?.rate ?? 25;
                                                    }
                                                    tierInfo = { annual: annualTaxable, exemption, tier: topTier };
                                                }

                                                return (
                                                    <>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`size-8 rounded-full flex items-center justify-center font-bold text-xs ring-1 ring-white shadow-sm ${emp?.colorClass || 'bg-slate-200'}`}>
                                                                    {emp?.avatar ? <img src={emp.avatar} className="size-full rounded-full" alt="" /> : (emp?.initials || record.name[0])}
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{record.name}</p>
                                                                        {isMissingTIN && (
                                                                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[9px] font-bold uppercase tracking-wider" title="Tax ID missing — required for IRD payer list">
                                                                                <span className="material-symbols-outlined text-[11px]">warning</span>
                                                                                No TIN
                                                                            </span>
                                                                        )}
                                                                    </div>
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
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white text-right font-bold tabular-nums">
                                                            {activeTab === 'SSB' ? (
                                                                <>{record.ssb.toLocaleString()} MMK</>
                                                            ) : (
                                                                <div className="relative group/tip inline-block">
                                                                    <span className="cursor-help border-b border-dashed border-slate-400 dark:border-slate-600">
                                                                        {record.pit.toLocaleString()} MMK
                                                                    </span>
                                                                    <div className="invisible group-hover/tip:visible absolute bottom-full right-0 mb-2 w-72 p-3 bg-slate-900 text-white text-[11px] rounded-xl shadow-2xl z-30 pointer-events-none space-y-1.5 border border-slate-700">
                                                                        <p className="font-bold text-[10px] uppercase tracking-widest text-slate-400 mb-1">PIT Tier Breakdown</p>
                                                                        <div className="flex justify-between"><span className="text-slate-300">Annual Projection:</span><span className="font-bold tabular-nums">{tierInfo.annual.toLocaleString()} MMK</span></div>
                                                                        <div className="flex justify-between"><span className="text-slate-300">Personal Exemption:</span><span className="font-bold tabular-nums">{tierInfo.exemption.toLocaleString()} MMK</span></div>
                                                                        <div className="flex justify-between"><span className="text-slate-300">Effective Tax Tier:</span><span className="font-bold text-amber-400">{tierInfo.tier}%</span></div>
                                                                        {tierInfo.tier === 0 && <p className="text-emerald-400 font-bold text-[10px] mt-1">Below exemption threshold — no PIT due.</p>}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </td>
                                                        {activeTab === 'SSB' && (
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white text-right tabular-nums">{(record.employerSsb ?? 0).toLocaleString()} MMK</td>
                                                        )}
                                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                                            <span className={`material-symbols-outlined text-[20px] ${isMissingSSB ? 'text-red-500 animate-pulse' : 'text-emerald-500'}`}
                                                                style={{ fontVariationSettings: isMissingSSB ? "'FILL' 0" : "'FILL' 1" }}>
                                                                {isMissingSSB ? 'error' : 'verified'}
                                                            </span>
                                                        </td>
                                                    </>
                                                );
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <div className="px-6 py-12 text-center">
                                        <span className="material-symbols-outlined text-4xl text-slate-300 block mb-2">find_in_page</span>
                                        <p className="text-slate-400 font-medium">{payrollRecords.length === 0 ? 'Run Payroll first to see tax breakdowns.' : 'No records match your search.'}</p>
                                    </div>
                                )}
                                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                                    <p>{activeTab === 'SSB' ? `SSB capped at ${complianceSettings.ssbCap.toLocaleString()} MMK per Myanmar Social Security Board directive.` : 'PIT calculated per Myanmar Internal Revenue Department brackets.'}</p>
                                    <span className="font-bold text-primary">{filteredRecords.length} employees</span>
                                </div>
                            </div>
                        </div>}
                    </div>
                </div>
            </main>

            {/* ─── Tax Patch Modal ────────────────────────────────────────────────── */}
            {patchModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-md px-4" onClick={() => setPatchModalOpen(false)}>
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-scale-in" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20">
                            <span className="material-symbols-outlined text-amber-600 text-2xl">edit_note</span>
                            <div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white">Tax Patch — Manual Override</h3>
                                <p className="text-[10px] text-amber-700 dark:text-amber-400 font-bold uppercase tracking-widest">High-Security Action · Audit Logged</p>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Employee <span className="text-red-500">*</span></label>
                                <select value={patchEmpId} onChange={e => setPatchEmpId(e.target.value)} className="w-full text-sm p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                                    <option value="">— Select Employee —</option>
                                    {payrollRecords.filter(r => r.status !== 'Error').map(r => (
                                        <option key={r.empId} value={r.empId}>{r.name} ({r.empId})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Field <span className="text-red-500">*</span></label>
                                    <select value={patchField} onChange={e => setPatchField(e.target.value as 'ssb' | 'pit')} className="w-full text-sm p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                                        <option value="ssb">SSB (Employee)</option>
                                        <option value="pit">PIT (Income Tax)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">New Amount (MMK) <span className="text-red-500">*</span></label>
                                    <input type="number" value={patchAmount} onChange={e => setPatchAmount(e.target.value)} placeholder="e.g. 5000" className="w-full text-sm p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Reason (Mandatory) <span className="text-red-500">*</span></label>
                                <textarea value={patchReason} onChange={e => setPatchReason(e.target.value)} rows={2} placeholder="Government exemption certificate, IRD directive, etc." className="w-full text-sm p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
                            </div>
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg flex items-start gap-2">
                                <span className="material-symbols-outlined text-red-500 text-[16px] mt-0.5">warning</span>
                                <p className="text-[10px] text-red-700 dark:text-red-400 font-bold">This action creates an immutable entry in the Security Audit Log. Manual tax overrides are flagged as HIGH PRIORITY and visible to all Super-Admins.</p>
                            </div>
                        </div>
                        <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
                            <button onClick={() => setPatchModalOpen(false)} className="px-5 py-2.5 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                            <button onClick={handleTaxPatch} disabled={!patchEmpId || !patchAmount || !patchReason.trim()} className="px-6 py-2.5 rounded-lg text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-200 dark:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">gavel</span>
                                Apply Tax Patch
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        </div>
    );
}
