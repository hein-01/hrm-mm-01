import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useAppData } from '../context/AppDataContext';
import { exportSSBForm15CSV, exportPITReportCSV, downloadCSV } from '../utils/taxExport';

export default function PayrollRun() {
    const navigate = useNavigate();
    const { 
        employees,
        payrollRecords, 
        calculatePayroll, 
        finalizePayroll, 
        lastPayrollStatus,
        disbursePayroll,
        createPayrollGroup,
        updatePayrollGroupStatus,
        payrollGroups,
        activePayrollGroupId,
        setActivePayrollGroupId,
        adjustments,
        isPayrollLocked,
        payrunId,
        setAlerts,
        complianceSettings
    } = useAppData();
    
    const [currentStep, setCurrentStep] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [isRecalculating, setIsRecalculating] = useState(false);
    const [exportMenuOpen, setExportMenuOpen] = useState(false);
    const [openRowActionId, setOpenRowActionId] = useState<string | null>(null);
    const [isLockModalOpen, setIsLockModalOpen] = useState(false);
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [step8Approved, setStep8Approved] = useState(false);
    const [payslipEmployee, setPayslipEmployee] = useState<typeof payrollRecords[0] | null>(null);
    const [showErrorsOnly, setShowErrorsOnly] = useState(false);
    const [isConfirmFinalizeOpen, setIsConfirmFinalizeOpen] = useState(false);

    const activeGroup = useMemo(() => 
        payrollGroups.find(g => g.id === activePayrollGroupId),
        [payrollGroups, activePayrollGroupId]
    );

    // ─── CSV Exports (shared utility — same function used by SSBPIT page) ───────
    const exportSuffix = (activeGroup?.period ?? 'Payroll').replace(' ', '_');
    const handleExportPITForm = () => exportPITReportCSV(payrollRecords, employees, exportSuffix);
    const handleExportSSBReturn = () => exportSSBForm15CSV(payrollRecords, employees, exportSuffix);

    const handleBankExport = () => {
        const validRecords = payrollRecords.filter(r => r.status !== 'Error');
        const headers = ['Employee Name', 'Bank Name', 'Account Number', 'Net Pay (MMK)'];
        const rows = validRecords.map(rec => {
            const emp = employees.find(e => e.id === rec.empId);
            return [
                rec.name,
                emp?.bankName ?? 'N/A',
                emp?.accountNumber ?? 'MISSING',
                rec.netPay.toString()
            ];
        });
        downloadCSV(`Bank_Transfer_${exportSuffix}.csv`, headers, rows);
    };

    // Live sync: OT approvals in another tab reflect immediately in Net Pay
    useEffect(() => {
        if (payrollRecords.length > 0 && !isPayrollLocked) {
            calculatePayroll(30, selectedEmployeeIds.length > 0 ? selectedEmployeeIds : undefined);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [adjustments]);

    // Auto-calculate when entering Attendance step with selected employees
    useEffect(() => {
        if (currentStep === 3 && selectedEmployeeIds.length > 0) {
            calculatePayroll(complianceSettings.workingDaysPerMonth || 30, selectedEmployeeIds);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentStep]);

    // Wizard Steps Configuration
    const steps = [
        { id: 1, title: 'Create Group', icon: 'create_new_folder', description: 'Define period & cycle' },
        { id: 2, title: 'Select Staff', icon: 'groups', description: 'Choose participants' },
        { id: 3, title: 'Attendance', icon: 'event_available', description: 'Review logs & OT' },
        { id: 4, title: 'Leaves', icon: 'work_off', description: 'Verify LOP adjustments' },
        { id: 5, title: 'Other Adjusts', icon: 'payments', description: 'Misc additions/deducts' },
        { id: 6, title: 'Tax & SSB', icon: 'account_balance', description: 'Compliance review' },
        { id: 7, title: 'Calculation', icon: 'calculate', description: 'Detailed breakdown' },
        { id: 8, title: 'Approval', icon: 'fact_check', description: 'Multi-stage signoff' },
        { id: 9, title: 'Publish', icon: 'send', description: 'Release & payslips' },
        { id: 10, title: 'Compliance', icon: 'description', description: 'Gov forms & reports' }
    ];

    const payslipOTPay = payslipEmployee
        ? adjustments.filter(a =>
            a.empId === payslipEmployee.empId &&
            typeof a.source === 'string' && a.source.includes('OT') &&
            a.status === 'Approved' &&
            a.effectiveMonth === activeGroup?.period
          ).reduce((sum, a) => sum + a.amount, 0)
        : 0;
    const payslipExpenseReimb = payslipEmployee
        ? adjustments.filter(a =>
            a.empId === payslipEmployee.empId &&
            a.source === 'System-Expense' &&
            a.status === 'Approved' &&
            a.effectiveMonth === activeGroup?.period
          ).reduce((sum, a) => sum + a.amount, 0)
        : 0;
    const payslipAllowances = payslipEmployee ? Math.max(0, payslipEmployee.additions - payslipOTPay - payslipExpenseReimb) : 0;

    // Active Admin ID for simulation
    const activeAdminId = 'EMP-001'; 

    const handleRecalculate = () => {
        setIsRecalculating(true);
        calculatePayroll(complianceSettings.workingDaysPerMonth || 30); // Use governance-anchored base
        setTimeout(() => {
            setIsRecalculating(false);
        }, 800);
    };

    const handleFinalize = () => {
        setIsConfirmFinalizeOpen(true);
    };

    const handleDisburse = () => {
        disbursePayroll(activeAdminId);
        setIsLockModalOpen(false);
    };

    const handlePublish = () => {
        const validRecords = payrollRecords.filter(r => r.status !== 'Error' && selectedEmployeeIds.includes(r.empId));
        const period = activeGroup?.period ?? 'this period';
        (setAlerts as Function)(prev => [
            ...validRecords.map(rec => ({
                id: `PAYSLIP-${rec.empId}-${Date.now()}`,
                type: 'success' as const,
                message: `💰 Your payslip for ${period} is now available. Net Pay: ${rec.netPay.toLocaleString()} MMK.`,
                timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
                isRead: false,
            })),
            ...prev
        ]);
        setCurrentStep(10);
    };

    const toggleRowAction = (id: string) => {
        setOpenRowActionId(prev => prev === id ? null : id);
    };

    const filteredData = useMemo(() => 
        payrollRecords.filter(emp =>
            emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            emp.empId.toLowerCase().includes(searchQuery.toLowerCase())
        ), [payrollRecords, searchQuery]);

    // Dynamic KPI Calculations
    const kpis = useMemo(() => {
        const totalGross = payrollRecords.reduce((sum, r) => sum + r.salary + r.additions, 0);
        const employerSSB = payrollRecords.filter(r => r.status !== 'Error').reduce((sum, r) => sum + (r.employerSsb ?? 0), 0);
        const employeeSSB = payrollRecords.reduce((sum, r) => sum + r.ssb, 0);
        const totalPIT = payrollRecords.reduce((sum, r) => sum + r.pit, 0);
        const netPayable = payrollRecords.reduce((sum, r) => sum + r.netPay, 0);
        
        return {
            totalGross: (totalGross / 100000).toFixed(1),
            employerSSB: (employerSSB / 100000).toFixed(1),
            employeeSSB: (employeeSSB / 100000).toFixed(1),
            totalPIT: (totalPIT / 100000).toFixed(1),
            netPayable: (netPayable / 100000).toFixed(1)
        };
    }, [payrollRecords, complianceSettings]);

    return (
        <div className="flex h-screen w-full bg-[#F8FAFC] dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display" onClick={() => { if (exportMenuOpen) setExportMenuOpen(false); if (openRowActionId) setOpenRowActionId(null); }}>
            <Sidebar activeTab="Payroll Run" />

            <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-slate-50 dark:bg-background-dark ml-[280px]">
                <Header 
                    title="Payroll Run"
                    subtitle="Review computations, apply adjustments, and finalize monthly salary disbursements"
                />
                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-[1400px] mx-auto p-6 md:p-8 space-y-8">
                        
                        {/* 10-Step Horizontal Progress Bar */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-x-auto overflow-y-hidden no-scrollbar">
                            <div className="flex items-center justify-between min-w-[1200px]">
                                {steps.map((step, idx) => (
                                    <React.Fragment key={step.id}>
                                        <div 
                                            className={`flex flex-col items-center gap-2 cursor-pointer transition-all group shrink-0 ${currentStep === step.id ? 'opacity-100 scale-105' : 'opacity-40 hover:opacity-60'}`}
                                            onClick={() => setCurrentStep(step.id)}
                                        >
                                            <div className={`h-12 w-12 rounded-full flex items-center justify-center border-4 ${
                                                currentStep > step.id 
                                                ? 'bg-emerald-600 border-emerald-100 dark:border-emerald-900 text-white' 
                                                : currentStep === step.id 
                                                    ? 'bg-[#4F46E5] border-indigo-100 dark:border-indigo-900 text-white ring-4 ring-indigo-50 dark:ring-indigo-900/20'
                                                    : 'bg-white dark:bg-slate-700 border-slate-100 dark:border-slate-600 text-slate-400'
                                            }`}>
                                                <span className="material-symbols-outlined text-[24px]">
                                                    {currentStep > step.id ? 'check' : step.icon}
                                                </span>
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <span className={`text-[11px] font-black uppercase tracking-tighter ${currentStep === step.id ? 'text-[#4F46E5] dark:text-indigo-400' : 'text-slate-500'}`}>Step {step.id}</span>
                                                <span className="text-xs font-bold text-slate-900 dark:text-white whitespace-nowrap">{step.title}</span>
                                            </div>
                                        </div>
                                        {idx < steps.length - 1 && (
                                            <div className="h-0.5 flex-1 mx-4 bg-slate-100 dark:bg-slate-700 min-w-[30px] rounded-full overflow-hidden">
                                                <div className={`h-full bg-emerald-500 transition-all duration-500 ${currentStep > step.id ? 'w-full' : 'w-0'}`}></div>
                                            </div>
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>

                        {/* Step-Specific Content Area */}
                        <div className="animate-fade-in">
                            {currentStep === 1 && (
                                <div className="space-y-6">
                                    <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl text-center max-w-2xl mx-auto">
                                        <div className="h-20 w-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <span className="material-symbols-outlined text-4xl text-[#4F46E5]">add_circle</span>
                                        </div>
                                        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Active Payroll Groups</h2>
                                        <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto font-medium">Create a new payroll run group to begin the 10-step computation & compliance workflow.</p>
                                        
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                                            {payrollGroups.map(group => (
                                                <div 
                                                    key={group.id} 
                                                    onClick={() => { setActivePayrollGroupId(group.id); setCurrentStep(2); }}
                                                    className={`p-6 rounded-2xl border-2 transition-all cursor-pointer text-left group ${
                                                        activePayrollGroupId === group.id 
                                                        ? 'border-[#4F46E5] bg-indigo-50/50 dark:bg-indigo-900/10' 
                                                        : 'border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 bg-white dark:bg-slate-800 flex flex-col'
                                                    }`}
                                                >
                                                    <div className="flex justify-between items-start mb-4">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-[#4F46E5] bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">{group.type}</span>
                                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                            group.status === 'Draft' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                                                        }`}>
                                                            {group.status}
                                                        </span>
                                                    </div>
                                                    <h4 className="font-bold text-slate-900 dark:text-white mb-1 group-hover:text-[#4F46E5] transition-colors">{group.name}</h4>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{group.period} • {group.payrollCycle}</p>
                                                </div>
                                            ))}
                                            <button 
                                                onClick={() => setIsGroupModalOpen(true)}
                                                className="p-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-[#4F46E5] hover:bg-indigo-50/30 transition-all flex flex-col items-center justify-center gap-2 group"
                                            >
                                                <span className="material-symbols-outlined text-3xl text-slate-400 group-hover:text-[#4F46E5] group-hover:scale-110 transition-all">add_circle</span>
                                                <span className="text-sm font-bold text-slate-500 group-hover:text-slate-700">New Group</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentStep === 2 && (
                                <div className="space-y-6">
                                    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                                        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                                            <div>
                                                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Step 2: Select Employees</h3>
                                                <p className="text-xs text-slate-500 font-medium mt-1">Multi-select staff to include in the <b>{activeGroup?.name}</b> payroll run.</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => setSelectedEmployeeIds(employees.map(e => e.id))}
                                                    className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-[#4F46E5] transition-all"
                                                >
                                                    Select All
                                                </button>
                                                <button 
                                                    onClick={() => setCurrentStep(3)}
                                                    disabled={selectedEmployeeIds.length === 0}
                                                    className="px-6 py-2 bg-[#4F46E5] text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none transition-all flex items-center gap-2"
                                                >
                                                    Next: Attendance <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="p-0">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left">
                                                    <thead>
                                                        <tr className="bg-slate-50/30 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">
                                                            <th className="px-8 py-4 w-10">Select</th>
                                                            <th className="px-4 py-4">Employee</th>
                                                            <th className="px-4 py-4">Department</th>
                                                            <th className="px-4 py-4">Join Date</th>
                                                            <th className="px-4 py-4 text-right">Base Salary</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                                        {employees.map(emp => (
                                                            <tr 
                                                                key={emp.id} 
                                                                className={`group hover:bg-slate-50 transition-colors cursor-pointer ${selectedEmployeeIds.includes(emp.id) ? 'bg-indigo-50/30' : ''}`}
                                                                onClick={() => {
                                                                    setSelectedEmployeeIds(prev => 
                                                                        prev.includes(emp.id) ? prev.filter(id => id !== emp.id) : [...prev, emp.id]
                                                                    );
                                                                }}
                                                            >
                                                                <td className="px-8 py-4">
                                                                    <div className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-all ${
                                                                        selectedEmployeeIds.includes(emp.id) 
                                                                        ? 'bg-[#4F46E5] border-[#4F46E5]' 
                                                                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                                                                    }`}>
                                                                        {selectedEmployeeIds.includes(emp.id) && <span className="material-symbols-outlined text-white text-[14px] font-black">check</span>}
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="h-8 w-8 rounded-full bg-slate-200 text-[10px] font-black flex items-center justify-center">{emp.name.charAt(0)}</div>
                                                                        <div className="flex flex-col">
                                                                            <span className="font-bold text-slate-900 dark:text-white">{emp.name}</span>
                                                                            <span className="text-[10px] text-slate-500">ID: {emp.id}</span>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-4 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tighter">{emp.dept}</td>
                                                                <td className="px-4 py-4 text-xs font-medium text-slate-500">{emp.joinDate}</td>
                                                                <td className="px-4 py-4 text-right font-bold text-slate-900 dark:text-white tabular-nums">{(emp.baseSalary || 0).toLocaleString()} MMK</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {[3, 4, 5, 6, 7].includes(currentStep) && (
                                <div className="space-y-6">
                                    {/* Traditional Table View for Calculation Review Steps */}
                                    <div className="bg-white dark:bg-[#182130] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                                            <div>
                                                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Step {currentStep}: {steps.find(s => s.id === currentStep)?.title}</h3>
                                                <p className="text-xs text-slate-500 font-medium mt-1">{steps.find(s => s.id === currentStep)?.description}</p>
                                            </div>
                                            <div className="flex gap-3">
                                                <button 
                                                    onClick={handleRecalculate}
                                                    className="p-2 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2 text-sm font-bold text-slate-600"
                                                >
                                                    <span className={`material-symbols-outlined text-[20px] ${isRecalculating ? 'animate-spin' : ''}`}>refresh</span>
                                                    Recalculate
                                                </button>
                                                <button 
                                                    onClick={() => setCurrentStep(prev => prev + 1)}
                                                    className="px-6 py-2 bg-[#4F46E5] text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all flex items-center gap-2"
                                                >
                                                    Confirm & Next <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                                                </button>
                                            </div>
                                        </div>

                                        {payrollRecords.filter(r => r.status === 'Error').length > 0 && (
                                            <div className="px-8 py-3 border-b border-slate-100 dark:border-slate-800 bg-red-50/50 dark:bg-red-900/10 flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-xs font-bold text-red-600 dark:text-red-400">
                                                    <span className="material-symbols-outlined text-[16px]">error</span>
                                                    {payrollRecords.filter(r => r.status === 'Error').length} employee(s) excluded — missing data
                                                </div>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Show Errors Only</span>
                                                    <div
                                                        className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer ${showErrorsOnly ? 'bg-red-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                                                        onClick={() => setShowErrorsOnly(p => !p)}
                                                    >
                                                        <div className={`absolute top-1 h-4 w-4 bg-white rounded-full shadow transition-all ${showErrorsOnly ? 'left-5' : 'left-1'}`} />
                                                    </div>
                                                </label>
                                            </div>
                                        )}

                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse min-w-[1000px]">
                                                <thead>
                                                    <tr className="bg-slate-50/30 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">
                                                        <th className="px-8 py-4">Employee</th>
                                                        <th className="px-4 py-4 text-right">Base</th>
                                                        <th className={`px-4 py-4 text-right ${(currentStep === 3 || currentStep === 5) ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 border-b-2 border-emerald-400' : ''}`}>Additions {(currentStep === 3 || currentStep === 5) ? '▲' : ''}</th>
                                                        <th className={`px-4 py-4 text-right ${(currentStep === 3 || currentStep === 4 || currentStep === 5 || currentStep === 6) ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 border-b-2 border-rose-400' : ''}`}>Deductions {(currentStep === 3 || currentStep === 4 || currentStep === 5 || currentStep === 6) ? '▲' : ''}</th>
                                                        <th className="px-4 py-4 text-right">Net Take-Home</th>
                                                        <th className="px-8 py-4 text-center">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                    {payrollRecords
                                                        .filter(r => selectedEmployeeIds.includes(r.empId))
                                                        .filter(r => !showErrorsOnly || r.status === 'Error' || r.alerts.some(a => a.startsWith('⚠')))
                                                        .filter(r => !searchQuery || r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.empId.toLowerCase().includes(searchQuery.toLowerCase()))
                                                        .map(rec => (
                                                        <tr key={rec.empId} className={`group hover:bg-slate-50/80 transition-all border-b border-slate-100 dark:border-slate-800 ${rec.status === 'Error' ? 'bg-red-50/60 dark:bg-red-900/10' : ''}`}>
                                                            <td className="px-8 py-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="h-9 w-9 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 font-black text-xs flex items-center justify-center ring-2 ring-white shadow-sm">{rec.name.charAt(0)}</div>
                                                                    <div className="flex flex-col">
                                                                        <span className="font-bold text-slate-900 dark:text-white">{rec.name}</span>
                                                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">ID: {rec.empId}</span>
                                                                    </div>
                                                                </div>
                                                                {rec.alerts?.map((alert, idx) => (
                                                                    <div key={idx} className="mt-1 flex items-center gap-1 text-[8px] font-black text-amber-600 uppercase bg-amber-50 px-1.5 py-0.5 rounded-full w-fit">
                                                                        <span className="material-symbols-outlined text-[10px]">priority_high</span>{alert}
                                                                    </div>
                                                                ))}
                                                                {rec.biometricDeviceId && (
                                                                    <div className="mt-1 flex items-center gap-1 text-[8px] font-black text-slate-500 uppercase bg-slate-100 px-1.5 py-0.5 rounded-full w-fit border border-slate-200" title="Physical Device ID">
                                                                        <span className="material-symbols-outlined text-[10px]">hardware</span> {rec.biometricDeviceId}
                                                                    </div>
                                                                )}
                                                                {(rec.biometricOTHours || 0) > 0 && (
                                                                    <div className="mt-1 flex items-center gap-1 text-[8px] font-black text-emerald-600 uppercase bg-emerald-50 px-1.5 py-0.5 rounded-full w-fit border border-emerald-100" title="Verified Biometric Overtime">
                                                                        <span className="material-symbols-outlined text-[10px]">fingerprint</span> {rec.biometricOTHours}h Biometric OT
                                                                    </div>
                                                                )}
                                                                {(rec.biometricAttendanceDays || 0) > 0 && (
                                                                    <div className="mt-1 flex items-center gap-1 text-[8px] font-black text-blue-600 uppercase bg-blue-50 px-1.5 py-0.5 rounded-full w-fit border border-blue-100" title="Terminal Attendance Logs">
                                                                        <span className="material-symbols-outlined text-[10px]">terminal</span> {rec.biometricAttendanceDays}d Biometric
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-4 text-right font-medium text-slate-600 dark:text-slate-400 tabular-nums">{rec.salary.toLocaleString()}</td>
                                                            <td className={`px-4 py-4 text-right text-emerald-600 font-black tabular-nums ${(currentStep === 3 || currentStep === 5) ? 'bg-emerald-100 dark:bg-emerald-900/30 border-l-2 border-r-2 border-emerald-300' : ''}`}>
                                                                +{currentStep === 3
                                                                    ? 0  // Attendance step: no additions
                                                                    : currentStep === 5
                                                                        ? (rec.otherAdditions ?? 0)  // Other Adjustments step
                                                                        : rec.additions  // Default: total additions
                                                                .toLocaleString()}
                                                            </td>
                                                            <td className={`px-4 py-4 text-right text-rose-500 font-black tabular-nums ${(currentStep === 3 || currentStep === 4 || currentStep === 5 || currentStep === 6) ? 'bg-rose-100 dark:bg-rose-900/30 border-l-2 border-r-2 border-rose-300' : ''}`}>
                                                                -{currentStep === 3
                                                                    ? (rec.attendanceDeductions ?? 0)  // Attendance: late/absent penalties
                                                                    : currentStep === 4
                                                                        ? (rec.leaveDeductions ?? 0)  // Leaves: unpaid leave
                                                                        : currentStep === 5
                                                                            ? (rec.otherDeductions ?? 0)  // Other: loans, penalties
                                                                            : currentStep === 6
                                                                                ? (rec.ssb + rec.pit)  // Tax & SSB
                                                                                : (rec.deductions + rec.ssb + rec.pit)  // Default: total
                                                                .toLocaleString()}
                                                            </td>
                                                            <td className="px-4 py-4 text-right">
                                                                <span className="px-3 py-1 bg-slate-900 dark:bg-indigo-950 text-white rounded-lg font-black text-xs tabular-nums">
                                                                    {(currentStep <= 5
                                                                        ? rec.salary + (currentStep === 5 ? (rec.otherAdditions ?? 0) - (rec.otherDeductions ?? 0) : 0)
                                                                        : rec.netPay
                                                                    ).toLocaleString()}
                                                                </span>
                                                            </td>
                                                            <td className="px-8 py-4 text-center">
                                                                <button onClick={() => setPayslipEmployee(rec)} className="h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-[#4F46E5] transition-all" title="View payslip breakdown">
                                                                    <span className="material-symbols-outlined text-[20px]">info</span>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentStep === 8 && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden max-w-2xl mx-auto">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 bg-amber-50 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center text-amber-600">
                                    <span className="material-symbols-outlined text-3xl">verified_user</span>
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Step 8: Super-Admin Authorization</h3>
                                    <p className="text-xs text-slate-500 font-medium mt-1">Multi-stage financial sign-off required before disbursement is unlocked.</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-6 space-y-3 border border-slate-100 dark:border-slate-800">
                                <div className="flex justify-between text-sm"><span className="text-slate-500 font-medium">Payroll Period</span><span className="font-bold text-slate-900 dark:text-white">{activeGroup?.period ?? '—'}</span></div>
                                <div className="flex justify-between text-sm"><span className="text-slate-500 font-medium">Total Net Payable</span><span className="font-black text-emerald-600">{payrollRecords.filter(r => r.status !== 'Error').reduce((s, r) => s + r.netPay, 0).toLocaleString()} MMK</span></div>
                                <div className="flex justify-between text-sm"><span className="text-slate-500 font-medium">Employees Included</span><span className="font-bold text-slate-900 dark:text-white">{payrollRecords.filter(r => r.status !== 'Error').length}</span></div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500 font-medium">Error / Excluded Records</span>
                                    <span className={`font-bold ${payrollRecords.filter(r => r.status === 'Error').length > 0 ? 'text-red-500' : 'text-slate-400'}`}>{payrollRecords.filter(r => r.status === 'Error').length}</span>
                                </div>
                                {payrunId && <div className="flex justify-between text-sm"><span className="text-slate-500 font-medium">PayrunID</span><span className="font-mono text-xs font-bold text-indigo-600">{payrunId}</span></div>}
                            </div>
                            {payrollRecords.filter(r => r.status === 'Error').length > 0 && (
                                <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-900/30">
                                    <span className="material-symbols-outlined text-red-500 text-[20px] mt-0.5">warning</span>
                                    <div>
                                        <p className="text-sm font-bold text-red-700 dark:text-red-400">Excluded employees — missing salary data</p>
                                        <p className="text-[11px] text-red-600 dark:text-red-300 mt-0.5">{payrollRecords.filter(r => r.status === 'Error').map(r => r.name).join(', ')} — fix before disbursement.</p>
                                    </div>
                                </div>
                            )}
                            <div className="p-4 border-2 border-amber-100 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-900/10 rounded-2xl flex items-start gap-3">
                                <input type="checkbox" id="superAdminConfirm" className="size-5 mt-0.5 accent-[#4F46E5] cursor-pointer" />
                                <label htmlFor="superAdminConfirm" className="cursor-pointer">
                                    <p className="text-sm font-black text-slate-900 dark:text-white">I, {activeAdminId}, confirm this payroll is accurate and authorize disbursement</p>
                                    <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium mt-1">This action creates an immutable authorization record and enables bank transfer in Step 9.</p>
                                </label>
                            </div>
                            <button
                                onClick={() => { setStep8Approved(true); setCurrentStep(9); }}
                                className="w-full py-4 bg-[#4F46E5] text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all flex items-center justify-center gap-3"
                            >
                                <span className="material-symbols-outlined">lock_open</span>
                                Authorize &amp; Proceed to Disbursement
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {currentStep === 9 && (
                                <div className="max-w-4xl mx-auto space-y-8 py-8 animate-fade-in">
                                    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="h-14 w-14 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-[#4F46E5]">
                                                    <span className="material-symbols-outlined text-3xl font-bold">account_balance</span>
                                                </div>
                                                <div>
                                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Stage 9: Disbursement & Release</h3>
                                                    <p className="text-sm text-slate-500 font-medium font-mono uppercase tracking-tighter">🔒 Security Guard: Multi-Stage Financial Compliance</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-black uppercase rounded-full tracking-widest animate-pulse">Awaiting Bank Transfer</span>
                                            </div>
                                        </div>

                                        <div className="p-10 space-y-10">
                                            {/* Step 9.1: Bank File Generation */}
                                            <div className="relative pl-12 border-l-2 border-dashed border-slate-200 dark:border-slate-700">
                                                <div className="absolute -left-[13px] top-0 h-6 w-6 rounded-full bg-[#4F46E5] flex items-center justify-center text-white text-[10px] font-black border-4 border-white dark:border-slate-800">9.1</div>
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                    <div>
                                                        <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Generate Bank CSV</h4>
                                                        <p className="text-xs text-slate-500 max-w-sm mt-1">Download the standardized transfer file formatted for <b>KBZ, Yoma, and CB Bank</b> portals.</p>
                                                    </div>
                                                    <button onClick={handleBankExport} className="px-6 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-all shadow-lg active:scale-95">
                                                        <span className="material-symbols-outlined text-[18px]">download</span>
                                                        Generate Bank File (.CSV)
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Step 9.2: Bank Confirmation Guard */}
                                            <div className="relative pl-12 border-l-2 border-dashed border-slate-200 dark:border-slate-700">
                                                <div className="absolute -left-[13px] top-0 h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-400 text-[10px] font-black border-4 border-white dark:border-slate-800">9.2</div>
                                                <div className="space-y-6">
                                                    <div>
                                                        <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Bank File Confirmation</h4>
                                                        <p className="text-xs text-slate-500 max-w-sm mt-1">Confirm that bank transfers have been processed before finalizing the payroll ledger.</p>
                                                    </div>

                                                    <div className="p-6 rounded-2xl border-2 border-amber-100 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-900/30 flex items-start gap-4">
                                                        <input 
                                                            type="checkbox" 
                                                            id="bankConfirm"
                                                            className="size-6 mt-1 rounded accent-[#4F46E5] cursor-pointer"
                                                            onChange={e => { if (e.target.checked) handleDisburse(); }}
                                                        />
                                                        <label htmlFor="bankConfirm" className="flex-1 cursor-pointer">
                                                            <span className="block text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">I confirm that the Bank CSV has been uploaded & processed</span>
                                                            <span className="block text-[10px] text-amber-700 dark:text-amber-400 font-bold leading-relaxed mt-1">This creates an immutable audit trail for the disbursement event. Mobile app payslip notifications are managed securely in the final Bank Disbursement module.</span>
                                                        </label>
                                                    </div>

                                                    <button 
                                                        onClick={() => setCurrentStep(10)}
                                                        disabled={!step8Approved}
                                                        title={!step8Approved ? 'Super-Admin sign-off required in Step 8 before proceeding' : ''}
                                                        className={`w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${step8Approved ? 'bg-[#4F46E5] text-white shadow-xl shadow-indigo-200 dark:shadow-none hover:bg-indigo-700' : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'}`}
                                                    >
                                                        Proceed to Step 10: Finalization <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl flex items-center justify-between text-white overflow-hidden relative">
                                        <div className="absolute -right-10 -bottom-10 h-40 w-40 bg-white/5 rounded-full blur-2xl"></div>
                                        <div className="relative z-10">
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-1">Mobile Ecosystem Status</p>
                                            <p className="text-sm font-medium text-slate-400">Total employees sync-ready: <span className="text-white font-bold">{employees.length}</span></p>
                                        </div>
                                        <div className="flex gap-2 relative z-10">
                                            <div className="size-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                            <span className="text-[10px] font-bold text-emerald-500 uppercase">Sync Gateway Online</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentStep === 10 && (
                                <div className="max-w-4xl mx-auto space-y-8 py-8 animate-fade-in">
                                    <div className="text-center space-y-4 mb-12">
                                        <div className="size-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-3xl flex items-center justify-center mx-auto text-emerald-600 rotate-12 transition-transform hover:rotate-0 cursor-pointer shadow-lg">
                                            <span className="material-symbols-outlined text-4xl">verified</span>
                                        </div>
                                        <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Payroll Finalized Successfully</h2>
                                        <p className="text-slate-500 font-medium">All financial obligations for <b>{activeGroup?.period}</b> have been met. Compliance reporting is now available.</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Myanmar Government Form Section */}
                                        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm group hover:border-[#4F46E5] transition-all">
                                            <div className="flex items-center gap-4 mb-6">
                                                <div className="h-12 w-12 bg-rose-50 dark:bg-rose-900/30 rounded-xl flex items-center justify-center text-rose-600 group-hover:scale-110 transition-transform">
                                                    <span className="material-symbols-outlined">description</span>
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-900 dark:text-white">ပတခ(ဝင)-၁၅(က)</h4>
                                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Monthly Income Tax Form</p>
                                                </div>
                                            </div>
                                            <button onClick={handleExportPITForm} className="w-full py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black uppercase tracking-widest text-[#4F46E5] hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
                                                <span className="material-symbols-outlined text-[18px]">download_for_offline</span>
                                                Download PIT CSV
                                            </button>
                                        </div>

                                        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm group hover:border-[#4F46E5] transition-all">
                                            <div className="flex items-center gap-4 mb-6">
                                                <div className="h-12 w-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                                                    <span className="material-symbols-outlined">shield</span>
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-900 dark:text-white">SSB Monthly Return</h4>
                                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Employer & Employee 5% Contrib</p>
                                                </div>
                                            </div>
                                            <button onClick={handleExportSSBReturn} className="w-full py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black uppercase tracking-widest text-[#4F46E5] hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
                                                <span className="material-symbols-outlined text-[18px]">download_for_offline</span>
                                                Download SSB CSV
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-center gap-6 mt-12 pt-12 border-t border-slate-100 dark:border-slate-800">
                                        <button onClick={() => setCurrentStep(1)} className="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-widest">Back to Overview</button>
                                        <button 
                                            onClick={async () => {
                                                await finalizePayroll();
                                                if (activePayrollGroupId) {
                                                    updatePayrollGroupStatus(activePayrollGroupId, 'Approved');
                                                }
                                                navigate('/bank-disbursements');
                                            }}
                                            className="px-10 py-4 bg-[#4F46E5] text-white rounded-2xl text-sm font-black uppercase tracking-[0.1em] shadow-2xl shadow-indigo-200 dark:shadow-indigo-900/20 hover:scale-105 transition-all active:scale-95 flex items-center gap-3"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">account_balance</span>
                                            Finalize & Proceed to Disbursement
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Modal for Creating New Group */}
                {isGroupModalOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-md px-4">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-scale-in">
                            <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Step 1: Create Payroll Group</h3>
                                <button onClick={() => setIsGroupModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <div className="p-8 space-y-6 text-left">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Group Name</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g., HQ Monthly Team - May 2026"
                                        className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-[#4F46E5] focus:bg-white transition-all text-sm font-bold text-slate-900"
                                        id="groupName"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Period</label>
                                        <select id="groupPeriod" className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-[#4F46E5] focus:bg-white transition-all text-sm font-bold text-slate-900 appearance-none">
                                            <optgroup label="2026"><option>Jan 2026</option><option>Feb 2026</option><option>Mar 2026</option><option>Apr 2026</option><option selected>May 2026</option><option>Jun 2026</option><option>Jul 2026</option><option>Aug 2026</option><option>Sep 2026</option><option>Oct 2026</option><option>Nov 2026</option><option>Dec 2026</option></optgroup>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Employee Type</label>
                                        <select className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-[#4F46E5] focus:bg-white transition-all text-sm font-bold text-slate-900 appearance-none">
                                            <option>Monthly Payroll</option>
                                            <option>Contract Basis</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cutoff Date</label>
                                        <input id="groupCutoff" type="date" defaultValue="2026-05-25" className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-[#4F46E5] focus:bg-white transition-all text-sm font-bold text-slate-900" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Date</label>
                                        <input id="groupPayment" type="date" defaultValue="2026-05-31" className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-[#4F46E5] focus:bg-white transition-all text-sm font-bold text-slate-900" />
                                    </div>
                                </div>
                            </div>
                            <div className="p-8 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
                                <button onClick={() => setIsGroupModalOpen(false)} className="flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-700 transition-all bg-white border border-slate-200">Cancel</button>
                                <button 
                                    onClick={() => {
                                        const nameInput    = document.getElementById('groupName')    as HTMLInputElement;
                                        const periodSelect = document.getElementById('groupPeriod')  as HTMLSelectElement;
                                        const cutoffInput  = document.getElementById('groupCutoff')  as HTMLInputElement;
                                        const paymentInput = document.getElementById('groupPayment') as HTMLInputElement;
                                        const period = periodSelect?.value || 'May 2026';
                                        createPayrollGroup({
                                            name: nameInput?.value || 'New Payroll Run',
                                            period,
                                            type: 'Monthly',
                                            payrollCycle: period,
                                            cutoffDate: cutoffInput?.value  || '2026-05-25',
                                            paymentDate: paymentInput?.value || '2026-05-31',
                                            proRatingLogic: 'Working Days'
                                        });
                                        setIsGroupModalOpen(false);
                                    }}
                                    className="flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-white bg-[#4F46E5] shadow-xl shadow-indigo-100 hover:scale-105 transition-all"
                                >
                                    Initialize Group
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {/* ── Payslip Breakdown Modal ─────────────────────────────────── */}
                {payslipEmployee && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm px-4" onClick={() => setPayslipEmployee(null)}>
                        <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-scale-in" onClick={e => e.stopPropagation()}>
                            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-start justify-between">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white">{payslipEmployee.name}</h3>
                                    <p className="text-xs text-slate-500 mt-1 font-mono">{payslipEmployee.empId} &middot; {activeGroup?.period ?? '—'}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                                    payslipEmployee.status === 'Error' ? 'bg-red-100 text-red-600' :
                                    payslipEmployee.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                                    'bg-slate-100 text-slate-600'
                                }`}>{payslipEmployee.status}</span>
                            </div>

                            {payslipEmployee.status === 'Error' ? (
                                <div className="p-6 space-y-4">
                                    <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-5 space-y-3 border border-red-100 dark:border-red-900/30">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-red-500">cancel</span>
                                            <p className="font-black text-red-700 dark:text-red-400">Excluded from payroll run</p>
                                        </div>
                                        {payslipEmployee.alerts.map((a, i) => (
                                            <div key={i} className="flex items-start gap-2 text-sm text-red-600 dark:text-red-300">
                                                <span className="material-symbols-outlined text-[16px] mt-0.5 shrink-0">warning</span>
                                                <span>{a}</span>
                                            </div>
                                        ))}
                                        <p className="text-xs text-red-500 mt-2 border-t border-red-100 pt-3">Navigate to the Employee record, correct the missing field, then click Recalculate.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-6 space-y-5">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Earnings</p>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm"><span className="text-slate-500">Base Salary</span><span className="font-bold tabular-nums">{payslipEmployee.salary.toLocaleString()} MMK</span></div>
                                            <div className="flex justify-between text-sm text-emerald-600"><span>OT Pay</span><span className="font-bold tabular-nums">+{payslipOTPay.toLocaleString()} MMK</span></div>
                                            {payslipExpenseReimb > 0 && (
                                                <div className="flex justify-between text-sm text-violet-600">
                                                    <span className="flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined text-[14px]">receipt_long</span>
                                                        Expense Reimbursement
                                                    </span>
                                                    <span className="font-bold tabular-nums">+{payslipExpenseReimb.toLocaleString()} MMK</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between text-sm text-emerald-600"><span>Allowances &amp; Adjustments</span><span className="font-bold tabular-nums">+{payslipAllowances.toLocaleString()} MMK</span></div>
                                            <div className="flex justify-between text-sm font-black border-t border-slate-100 dark:border-slate-800 pt-2">
                                                <span>Gross Earnings</span>
                                                <span className="tabular-nums">{(payslipEmployee.salary + payslipEmployee.additions).toLocaleString()} MMK</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Deductions</p>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm text-rose-500"><span>SSB (Employee {complianceSettings?.ssbPercent ?? 2}%)</span><span className="font-bold tabular-nums">-{payslipEmployee.ssb.toLocaleString()} MMK</span></div>
                                            <div className="flex justify-between text-sm text-rose-500"><span>Income Tax (PIT)</span><span className="font-bold tabular-nums">-{payslipEmployee.pit.toLocaleString()} MMK</span></div>
                                            <div className="flex justify-between text-sm text-rose-500"><span>Other Deductions</span><span className="font-bold tabular-nums">-{payslipEmployee.deductions.toLocaleString()} MMK</span></div>
                                            <div className="flex justify-between text-sm font-black border-t border-slate-100 dark:border-slate-800 pt-2 text-rose-600">
                                                <span>Total Deductions</span>
                                                <span className="tabular-nums">-{(payslipEmployee.ssb + payslipEmployee.pit + payslipEmployee.deductions).toLocaleString()} MMK</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-slate-900 dark:bg-indigo-950 rounded-2xl p-4 flex justify-between items-center">
                                        <span className="text-white font-black uppercase tracking-wide text-sm">Net Take-Home</span>
                                        <span className="text-white font-black text-xl tabular-nums">{payslipEmployee.netPay.toLocaleString()} MMK</span>
                                    </div>
                                    {payslipEmployee.alerts.filter(a => a.startsWith('⚠')).length > 0 && (
                                        <div className="space-y-1">
                                            {payslipEmployee.alerts.filter(a => a.startsWith('⚠')).map((a, i) => (
                                                <div key={i} className="text-[10px] text-amber-700 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-full font-bold">{a}</div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                                <button onClick={() => setPayslipEmployee(null)} className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl text-sm font-black text-slate-700 dark:text-slate-200 transition-all">Close</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Confirm Finalize / Lock Modal ────────────────────────────── */}
                {isConfirmFinalizeOpen && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm px-4" onClick={() => setIsConfirmFinalizeOpen(false)}>
                        <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-scale-in" onClick={e => e.stopPropagation()}>
                            <div className="p-8 space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="h-14 w-14 bg-amber-50 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center text-amber-500">
                                        <span className="material-symbols-outlined text-3xl">lock</span>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 dark:text-white">Confirm Payroll Lock</h3>
                                        <p className="text-xs text-slate-500 mt-1">This action cannot be undone in this session.</p>
                                    </div>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-5 space-y-2 text-sm border border-slate-100 dark:border-slate-700">
                                    <p className="text-slate-600 dark:text-slate-300">This will <b>lock the payroll</b> for <b className="text-slate-900 dark:text-white">{activeGroup?.period ?? 'this period'}</b> and generate a unique <span className="font-mono text-indigo-600">PayrunID</span>.</p>
                                    <ul className="text-xs text-slate-500 space-y-1 ml-4 mt-3 list-disc">
                                        <li>Calculation grid becomes read-only</li>
                                        <li>OT live-sync is frozen immediately</li>
                                        <li>PayrunID is written to the audit log</li>
                                        <li>Lock persists across browser sessions</li>
                                    </ul>
                                </div>
                                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-900/30 text-xs text-amber-700 dark:text-amber-400 font-medium">
                                    ⚠️ Verify all Net Pay figures are correct before proceeding. You can still export the Bank CSV after locking.
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => setIsConfirmFinalizeOpen(false)} className="flex-1 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-black text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => { finalizePayroll(); setIsConfirmFinalizeOpen(false); }}
                                        className="flex-1 py-4 rounded-2xl bg-amber-500 text-white text-sm font-black shadow-lg shadow-amber-200 dark:shadow-none hover:bg-amber-600 transition-all flex items-center justify-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">lock</span>
                                        Lock Payroll
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}
