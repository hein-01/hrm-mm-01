import React, { useState, useMemo } from 'react';
import DropdownMenu from '../components/DropdownMenu';
import { useNavigate } from 'react-router-dom';
import { TableVirtuoso } from 'react-virtuoso';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useAppData } from '../context/AppDataContext';
import EmptyStateCard from '../components/EmptyStateCard';
import { useDebounce } from '../hooks/useDebounce';

export default function EmployeesDirectory() {
    const navigate = useNavigate();

    // Core Data Schema comes from Context now
    const { employees, setEmployees, terminateEmployee, addJobActivityChange, addAdjustment, lastPayrollStatus, shifts, systemSettings } = useAppData();

    const [searchQuery, setSearchQuery] = useState('');
    const [deptFilter, setDeptFilter] = useState('All Departments');
    const debouncedSearch = useDebounce(searchQuery, 300);

    // Modal & Context States
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [activeRecord, setActiveRecord] = useState<any>(null);
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

    const [isRefreshingGrid, setIsRefreshingGrid] = useState(false);

    // Filter Logic — uses debouncedSearch to prevent CPU spike on every keystroke
    const filteredEmployees = useMemo(() => {
        let result = employees;
        if (deptFilter !== 'All Departments') {
            result = result.filter(e => e.dept === deptFilter);
        }
        if (debouncedSearch.trim() !== '') {
            const lowerQuery = debouncedSearch.toLowerCase();
            result = result.filter(e =>
                e.name.toLowerCase().includes(lowerQuery) ||
                e.id.toLowerCase().includes(lowerQuery) ||
                e.role.toLowerCase().includes(lowerQuery)
            );
        }
        return result;
    }, [employees, deptFilter, debouncedSearch]);

    // Handle filter changes — resets skeleton state immediately (no synthetic delay)
    React.useEffect(() => {
        setIsRefreshingGrid(true);
        // Skeleton shows for exactly as long as debounce is pending
        const t = setTimeout(() => setIsRefreshingGrid(false), 50);
        return () => clearTimeout(t);
    }, [deptFilter, debouncedSearch]);

    // KPI Counters (Always stay true to the underlying raw array for Headcount, not filtered list unless specifically requested)
    const activeCount = employees.filter(e => e.status === 'Active' || e.status === 'On Leave').length;
    const terminatedCount = employees.filter(e => e.status === 'Terminated').length;
    const mainDeptName = systemSettings.departments[0]?.name || 'Engineering';
    const mainDeptCount = employees.filter(e => e.dept === mainDeptName).length;

    // Form States
    const [newEmpName, setNewEmpName] = useState('');
    const [newEmpDept, setNewEmpDept] = useState('');
    const [newEmpRole, setNewEmpRole] = useState('');
    const [newEmpLocation, setNewEmpLocation] = useState('');
    const [authError, setAuthError] = useState('');
    const [terminationError, setTerminationError] = useState<string | null>(null);

    // Resignation Form State
    const [resignDate, setResignDate] = useState('');
    const [resignReason, setResignReason] = useState('');
    const [resignLoading, setResignLoading] = useState(false);

    // Promotion Form State
    const [promoteRole, setPromoteRole] = useState('');
    const [promoteDept, setPromoteDept] = useState('');
    const [promoteSalary, setPromoteSalary] = useState('');
    const [promoteManager, setPromoteManager] = useState('');
    const [promoteShift, setPromoteShift] = useState('');
    const [promoteEffDate, setPromoteEffDate] = useState('');
    const [promoteTitle, setPromoteTitle] = useState('');
    const [promoteDesc, setPromoteDesc] = useState('');
    const [promoteLoading, setPromoteLoading] = useState(false);

    // Adjustment Form State
    const [adjCategory, setAdjCategory] = useState<'Addition' | 'Deduction'>('Addition');
    const [adjType, setAdjType] = useState('');
    const [adjAmount, setAdjAmount] = useState('');
    const [adjMonth, setAdjMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [adjReason, setAdjReason] = useState('');
    const [adjLoading, setAdjLoading] = useState(false);

    // Transfer Form State
    const [transferDept, setTransferDept] = useState('');
    const [transferLocation, setTransferLocation] = useState('');
    const [transferLat, setTransferLat] = useState('');
    const [transferLng, setTransferLng] = useState('');
    const [transferManager, setTransferManager] = useState('');
    const [transferShift, setTransferShift] = useState('');
    const [transferSalary, setTransferSalary] = useState('');
    const [transferEffDate, setTransferEffDate] = useState('');
    const [transferReason, setTransferReason] = useState('');
    const [transferLoading, setTransferLoading] = useState(false);

    // Compute effective month: if payroll is Disbursed, auto-forward to next month
    const openPayrollMonth = useMemo(() => {
        const now = new Date();
        if (lastPayrollStatus === 'Disbursed') {
            const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
        }
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }, [lastPayrollStatus]);

    const handleAddEmployeeSubmit = () => {
        if (!newEmpName || !newEmpDept || !newEmpRole) {
            setAuthError('Name, Department, and Role are all required.');
            return;
        }

        // Mock Add with full organizational data
        const newEmp = {
            id: `EMP-90${Math.floor(Math.random() * 9)}`,
            name: newEmpName,
            role: newEmpRole,
            dept: newEmpDept,
            status: 'Active',
            joinDate: new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
            avatar: null,
            township: 'TBD',
            nrcNumber: 'TBD',
            ssbId: 'TBD',
            initials: newEmpName.charAt(0).toUpperCase(),
            colorClass: 'bg-blue-100 text-blue-700',
            hasCriticalRiskFlag: false,
            documents: [],
            officeLocation: newEmpLocation || undefined,
            baseSalary: 500000, // Default entry
            shiftId: 'SH-GEN-96'
        };

        setEmployees(prev => [newEmp as any, ...prev]);
        closeModals();
    };

    // Document Upload State
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadCategory, setUploadCategory] = useState<DocumentType['category']>('Standard');
    const [uploadPrivacy, setUploadPrivacy] = useState<DocumentType['privacy']>('Employee Viewable' as any); // Using the expanded set
    const [uploadTargetId, setUploadTargetId] = useState('');
    const [uploadLoading, setUploadLoading] = useState(false);

    const handleDeactivateConfirm = () => {
        if (!activeRecord) return;
        const result = terminateEmployee(activeRecord.id, 'ADM-001');
        if (result.success) {
            closeModals();
        } else {
            setTerminationError(result.message);
        }
    };

    const handleResignSubmit = () => {
        if (!activeRecord || !resignDate || !resignReason) return;
        setResignLoading(true);

        const result = addJobActivityChange({
            empId: activeRecord.id,
            name: activeRecord.name,
            type: 'Resignation',
            detail: `Resignation Request: ${activeRecord.role} in ${activeRecord.dept}`,
            effectiveDate: resignDate,
            finalWorkingDate: resignDate,
            resignationReason: resignReason,
            priority: 'Medium',
            category: 'Staffing'
        });

        // Mock delay for UX
        setTimeout(() => {
            setResignLoading(false);
            closeModals();
        }, 800);
    };

    const handlePromoteSubmit = () => {
        if (!activeRecord || !promoteRole || !promoteEffDate) return;
        setPromoteLoading(true);

        addJobActivityChange({
            empId: activeRecord.id,
            name: activeRecord.name,
            type: 'Promotion',
            detail: `Promotion: ${activeRecord.role} → ${promoteRole}`,
            effectiveDate: promoteEffDate,
            newRole: promoteRole,
            newDept: promoteDept || activeRecord.dept,
            newManager: promoteManager || undefined,
            newShiftId: promoteShift || undefined,
            announcementTitle: promoteTitle || undefined,
            jobDescription: promoteDesc || undefined,
            newSalary: promoteSalary ? parseInt(promoteSalary, 10) : undefined,
            oldSalary: activeRecord.baseSalary,
            priority: 'High',
            category: 'Staffing'
        });

        setTimeout(() => {
            setPromoteLoading(false);
            closeModals();
        }, 800);
    };

    const handleAdjustmentSubmit = () => {
        if (!activeRecord || !adjType || !adjAmount || !adjReason) return;
        setAdjLoading(true);
        // Determine effective month — locked to next cycle if payroll is Disbursed
        const effectiveMonth = lastPayrollStatus === 'Disbursed' ? openPayrollMonth : adjMonth;
        const monthLabel = new Date(effectiveMonth + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        addAdjustment({
            empId: activeRecord.id,
            name: activeRecord.name,
            dept: activeRecord.dept,
            type: adjType,
            category: adjCategory,
            amount: parseFloat(adjAmount),
            effectiveMonth: monthLabel,
            reason: adjReason,
            sourceLink: `MANUAL-${Date.now()}`,
            source: 'Manual',
            priority: adjCategory === 'Deduction' ? 'High' : 'Medium'
        });
        setTimeout(() => { setAdjLoading(false); closeModals(); }, 700);
    };

    const handleUploadSubmit = () => {
        if (!uploadTargetId || !uploadFile) return;
        setUploadLoading(true);
        
        // Mock File URL generation
        const fileUrl = URL.createObjectURL(uploadFile);
        
        addDocumentToEmployee(uploadTargetId, {
            name: uploadFile.name,
            type: uploadFile.type.split('/')[1] || 'file',
            category: uploadCategory,
            privacy: uploadPrivacy,
            url: fileUrl,
            uploadedBy: 'ADM-001' 
        });
        
        setTimeout(() => {
            setUploadLoading(false);
            closeModals();
        }, 1200);
    };

    const handleTransferSubmit = () => {
        if (!activeRecord || !transferDept || !transferEffDate) return;
        setTransferLoading(true);
        addJobActivityChange({
            empId: activeRecord.id,
            name: activeRecord.name,
            type: 'Transfer',
            detail: `Transfer from ${activeRecord.dept} to ${transferDept}${transferLocation ? ` | ${transferLocation}` : ''}`,
            effectiveDate: transferEffDate,
            newDept: transferDept,
            newLocation: transferLocation || undefined,
            newOfficeCoords: (transferLat && transferLng)
                ? { lat: parseFloat(transferLat), lng: parseFloat(transferLng) }
                : undefined,
            newManager: transferManager || undefined,
            newShiftId: transferShift || undefined,
            newSalary: transferSalary ? parseInt(transferSalary, 10) : undefined,
            oldSalary: activeRecord.baseSalary,
            transferReason: transferReason || undefined,
            priority: 'High',
            category: 'Staffing'
        });
        setTimeout(() => { setTransferLoading(false); closeModals(); }, 700);
    };

    const closeModals = () => {
        setActiveModal(null);
        setActiveRecord(null);
        setNewEmpName('');
        setNewEmpDept('');
        setNewEmpRole('');
        setNewEmpLocation('');
        setTerminationError(null);
        setResignDate('');
        setResignReason('');
        // Promotion
        setPromoteRole(''); setPromoteDept(''); setPromoteSalary('');
        setPromoteManager(''); setPromoteShift(''); setPromoteEffDate('');
        setPromoteTitle(''); setPromoteDesc('');
        // Adjustment
        setAdjCategory('Addition'); setAdjType(''); setAdjAmount('');
        setAdjReason('');
        // Transfer
        setTransferDept(''); setTransferLocation(''); setTransferLat('');
        setTransferLng(''); setTransferManager(''); setTransferShift('');
        setTransferSalary(''); setTransferEffDate(''); setTransferReason('');
        // Upload
        setUploadFile(null); setUploadCategory('Standard'); setUploadPrivacy('Manager Viewable');
        setUploadTargetId('');
    };

    // Close Dropdown when clicking outside (Mocked via simple toggle)
    const toggleDropdown = (id: string) => {
        if (openDropdownId === id) setOpenDropdownId(null);
        else setOpenDropdownId(id);
    };

    return (
        <div className="flex h-screen w-full font-display text-slate-900 dark:text-white antialiased overflow-hidden bg-background-light dark:bg-background-dark relative">
            {/* Sidebar Logic: Hardcoding activeTab="Employees" properly asserts the active navigational state regardless of routing depth */}
            <Sidebar activeTab="Employees" />

            <main className="flex flex-col h-full overflow-hidden relative ml-[280px] flex-1">
                {/* Header integrates single horizontal center-axis logic directly within its component CSS rules */}
                <Header 
                    title="Employees"
                    subtitle="Manage your workforce, track department distribution, and access employee records"
                >
                    <div className="relative w-full max-w-[480px] ml-4 hidden lg:block">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
                        <input
                            className="w-full border border-slate-200 dark:border-slate-800 rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent text-slate-900 placeholder-slate-400 bg-white dark:bg-slate-900 transition-all shadow-sm"
                            placeholder="Search by name, ID or role..."
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </Header>

                <div className="flex-1 overflow-y-auto px-6 pb-6 bg-[#F8FAFC]">
                    <div className="max-w-[1600px] mx-auto space-y-6 mt-6">

                        {/* Page Header */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Master Directory</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 shadow-sm flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">download</span> Export CSV
                                </button>
                                <button onClick={() => setActiveModal('upload')} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 shadow-sm flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">upload_file</span> Upload Document
                                </button>
                                <button onClick={() => setActiveModal('add')} className="px-4 py-2 bg-[#4F46E5] text-white rounded-lg text-sm font-semibold hover:bg-indigo-600 shadow-sm flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">person_add</span> Add Employee
                                </button>
                            </div>
                        </div>

                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-tight">Total Headcount</p>
                                <div className="flex items-center gap-3 mt-2">
                                    <span className="text-3xl font-bold text-slate-900">{employees.length}</span>
                                </div>
                            </div>
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-tight">Active Duty</p>
                                <div className="flex items-center gap-3 mt-2">
                                    <span className="text-3xl font-bold text-emerald-600">{activeCount}</span>
                                </div>
                            </div>
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-tight">Terminated (YTD)</p>
                                <div className="flex items-center gap-3 mt-2">
                                    <span className="text-3xl font-bold text-slate-900">{terminatedCount}</span>
                                </div>
                            </div>
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-tight">{mainDeptName} Dept</p>
                                <div className="flex items-center gap-3 mt-2">
                                    <span className="text-3xl font-bold text-indigo-600">{mainDeptCount}</span>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Data Table Component */}
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col relative z-10 transition-all">

                            {/* Toolbar */}
                            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-slate-400 text-[20px]">filter_list</span>
                                    <span className="text-sm font-bold text-slate-600">Filters</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-slate-500">Department:</span>
                                    <DropdownMenu
                                        value={deptFilter}
                                        onChange={setDeptFilter}
                                        options={[
                                            { value: 'All Departments', label: 'All Departments' },
                                            ...systemSettings.departments.map(d => ({
                                                value: d.name,
                                                label: d.name,
                                            }))
                                        ]}
                                    />
                                </div>
                            </div>

                            {/* Masked Sensitive Grid View — Virtualized for 500+ workers */}
                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                {isRefreshingGrid ? (
                                    <div className="p-12 text-center space-y-4">
                                        <div className="size-12 rounded-full border-2 border-slate-200 border-t-indigo-500 animate-spin mx-auto"></div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Refreshing Workforce Directory...</p>
                                    </div>
                                ) : filteredEmployees.length === 0 ? (
                                    <EmptyStateCard 
                                        icon="person_search"
                                        title="No Employees Found"
                                        subtitle={`We couldn't find any employees matching "${searchQuery}" in ${deptFilter}.`}
                                        action={{ label: 'Invite New Employee', onClick: () => setActiveModal('add') }}
                                    />
                                ) : (
                                    <TableVirtuoso
                                        style={{ height: Math.min(filteredEmployees.length * 80 + 56, 700) }}
                                        data={filteredEmployees}
                                        fixedHeaderContent={() => (
                                            <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase font-semibold text-slate-500 text-left">
                                                <th className="px-6 py-4">Employee</th>
                                                <th className="px-6 py-4 text-left">Status</th>
                                                <th className="px-6 py-4 text-left">Department & Role</th>
                                                <th className="px-6 py-4 border-l border-slate-100 text-left">Security Status</th>
                                                <th className="px-6 py-4 text-left">Join Date</th>
                                                <th className="px-6 py-4 text-right">Actions</th>
                                            </tr>
                                        )}
                                        itemContent={(_, emp) => (
                                            <>
                                                <td className="px-6 py-4 cursor-pointer" onClick={() => navigate(`/employees/${emp.id}`)}>
                                                    <div className="flex items-center gap-3">
                                                        {emp.avatar ? (
                                                            <div className="size-10 rounded-full bg-cover bg-center shrink-0 border border-slate-200" style={{ backgroundImage: `url("${emp.avatar}")` }} loading="lazy"></div>
                                                        ) : (
                                                            <div className={`size-10 rounded-full flex items-center justify-center font-bold shrink-0 text-sm ${emp.colorClass || 'bg-slate-100 text-slate-700'}`}>{emp.initials}</div>
                                                        )}
                                                        <div className="flex flex-col gap-0.5">
                                                            <p className="font-bold text-slate-900 hover:text-[#4F46E5] transition-colors">{emp.name}</p>
                                                            <p className="text-xs text-slate-500 font-mono tracking-tight">{emp.id}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {emp.status === 'Active' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100"><span className="size-1.5 rounded-full bg-emerald-500"></span> Active</span>}
                                                    {emp.status === 'On Leave' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-100"><span className="size-1.5 rounded-full bg-amber-500"></span> On Leave</span>}
                                                    {emp.status === 'Terminated' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">Terminated</span>}
                                                </td>
                                                <td className="px-6 py-4 text-left">
                                                    <p className="font-bold text-slate-700 text-xs uppercase tracking-tighter">{emp.dept}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{emp.role}</p>
                                                </td>
                                                <td className="px-6 py-4 border-l border-slate-50 text-left">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`size-1.5 rounded-full ${emp.riskFactor > 2 ? 'bg-red-500 animate-pulse' : emp.riskFactor > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                                                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Handshake Clear</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-left font-mono text-xs text-slate-500">
                                                    {emp.joinDate || '2023-10-01'}
                                                </td>
                                                <td className="px-6 py-4 text-right relative">
                                                    <button 
                                                        onClick={() => setOpenDropdownId(openDropdownId === emp.id ? null : emp.id)}
                                                        className="p-1 rounded-md hover:bg-slate-100 text-slate-400 transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined">more_vert</span>
                                                    </button>
                                                    
                                                    {openDropdownId === emp.id && (
                                                        <>
                                                            <div className="fixed inset-0 z-40" onClick={() => setOpenDropdownId(null)}></div>
                                                            <div className="absolute right-6 top-12 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in duration-150">
                                                                {emp.status === 'Terminated' ? (
                                                                    <button className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-400 cursor-not-allowed italic">
                                                                        No Actions Available
                                                                    </button>
                                                                ) : (
                                                                    <>
                                                                        <button onClick={() => { setOpenDropdownId(null); setActiveRecord(emp); setActiveModal('promote'); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 font-medium border-b border-slate-50">
                                                                            <span className="material-symbols-outlined text-[18px]">trending_up</span> Promote / Revise
                                                                        </button>
                                                                        <button onClick={() => { setOpenDropdownId(null); setActiveRecord(emp); setTransferDept(emp.dept); setTransferShift(emp.shiftId || ''); setActiveModal('transfer'); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-teal-600 hover:bg-teal-50 font-medium border-b border-slate-50">
                                                                            <span className="material-symbols-outlined text-[18px]">swap_horiz</span> Transfer
                                                                        </button>
                                                                        <button onClick={() => { setOpenDropdownId(null); setActiveRecord(emp); setAdjMonth(openPayrollMonth); setActiveModal('adjust'); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-violet-600 hover:bg-violet-50 font-medium border-b border-slate-50">
                                                                            <span className="material-symbols-outlined text-[18px]">payments</span> Adjust
                                                                        </button>
                                                                        <button onClick={() => { setOpenDropdownId(null); setActiveRecord(emp); setActiveModal('resign'); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-amber-600 hover:bg-amber-50 font-medium border-b border-slate-50">
                                                                            <span className="material-symbols-outlined text-[18px]">exit_to_app</span> Request Resignation
                                                                        </button>
                                                                        <button onClick={() => { setOpenDropdownId(null); setActiveRecord(emp); setActiveModal('deactivate'); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium border-b border-slate-50">
                                                                            <span className="material-symbols-outlined text-[18px]">person_off</span> Deactivate User
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </>
                                                    )}
                                                </td>
                                            </>
                                        )}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Promotion Request Modal */}
                {activeModal === 'promote' && activeRecord && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in px-4">
                        <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
                            {/* Header */}
                            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                                <div>
                                    <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                                        <span className="material-symbols-outlined text-indigo-500">trending_up</span> Promotion Request
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5 font-medium">Initiate a promotion for {activeRecord.name}</p>
                                </div>
                                <button onClick={closeModals} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            {/* Scrollable Body */}
                            <div className="p-6 flex-1 min-h-0 overflow-y-auto space-y-5">
                                {/* Current Info (read-only) */}
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Current Status (Auto-filled)</p>
                                    <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Current Role</p>
                                            <p className="font-bold text-slate-700">{activeRecord.role}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Department</p>
                                            <p className="font-bold text-slate-700">{activeRecord.dept}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Current Salary</p>
                                            <p className="font-bold text-slate-700">{activeRecord.baseSalary?.toLocaleString()} MMK</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Current Shift</p>
                                            <p className="font-bold text-slate-700">{shifts.find(s => s.id === activeRecord.shiftId)?.name || activeRecord.shiftId || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Promotion Details */}
                                <div>
                                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-3 border-b border-indigo-100 pb-1">New Promotion Details</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-700 block mb-1.5">New Position / Role <span className="text-red-500">*</span></label>
                                            <select
                                                value={promoteRole} onChange={e => setPromoteRole(e.target.value)}
                                                className="w-full text-sm p-2.5 border border-slate-300 rounded-xl focus:ring-[#4F46E5] focus:border-[#4F46E5] bg-white"
                                            >
                                                <option value="">-- Select Position --</option>
                                                {systemSettings.positions.filter(p => !promoteDept || p.deptId === systemSettings.departments.find(d => d.name === (promoteDept || activeRecord.dept))?.id).map(p => (
                                                    <option key={p.id} value={p.name}>{p.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-700 block mb-1.5">New Department</label>
                                            <select
                                                value={promoteDept} onChange={e => setPromoteDept(e.target.value)}
                                                className="w-full text-sm p-2.5 border border-slate-300 rounded-xl focus:ring-[#4F46E5] focus:border-[#4F46E5] bg-white"
                                            >
                                                <option value="">Same ({activeRecord.dept})</option>
                                                {systemSettings.departments.map(d => (
                                                    <option key={d.id} value={d.name}>{d.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-700 block mb-1.5">New Base Salary (MMK)</label>
                                            <input
                                                value={promoteSalary} onChange={e => setPromoteSalary(e.target.value)}
                                                type="number" placeholder={`Current: ${activeRecord.baseSalary?.toLocaleString()}`}
                                                className="w-full text-sm p-2.5 border border-slate-300 rounded-xl focus:ring-[#4F46E5] focus:border-[#4F46E5] bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-700 block mb-1.5">Effective Date <span className="text-red-500">*</span></label>
                                            <input
                                                value={promoteEffDate} onChange={e => setPromoteEffDate(e.target.value)}
                                                type="date"
                                                className="w-full text-sm p-2.5 border border-slate-300 rounded-xl focus:ring-[#4F46E5] focus:border-[#4F46E5] bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-700 block mb-1.5">Reporting Manager (Employee ID)</label>
                                            <input
                                                value={promoteManager} onChange={e => setPromoteManager(e.target.value)}
                                                type="text" placeholder="e.g. EMP-099"
                                                className="w-full text-sm p-2.5 border border-slate-300 rounded-xl focus:ring-[#4F46E5] focus:border-[#4F46E5] bg-white"
                                            />
                                            {promoteManager && !employees.find(e => e.id === promoteManager) && (
                                                <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1 font-medium">
                                                    <span className="material-symbols-outlined text-[13px]">warning</span>
                                                    Employee ID not found. Check the directory.
                                                </p>
                                            )}
                                            {promoteManager && employees.find(e => e.id === promoteManager) && (
                                                <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-medium">
                                                    <span className="material-symbols-outlined text-[13px]">check_circle</span>
                                                    {employees.find(e => e.id === promoteManager)?.name}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-700 block mb-1.5">Attendance Shift</label>
                                            <select
                                                value={promoteShift} onChange={e => setPromoteShift(e.target.value)}
                                                className="w-full text-sm p-2.5 border border-slate-300 rounded-xl focus:ring-[#4F46E5] focus:border-[#4F46E5] bg-white"
                                            >
                                                <option value="">Same Shift</option>
                                                {shifts.map(s => (
                                                    <option key={s.id} value={s.id}>{s.name} ({s.start}–{s.end})</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Announcement & Job Description */}
                                <div>
                                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-3 border-b border-indigo-100 pb-1">Announcement & JD (Optional)</p>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-xs font-bold text-slate-700 block mb-1.5">Announcement Title</label>
                                            <input
                                                value={promoteTitle} onChange={e => setPromoteTitle(e.target.value)}
                                                type="text" placeholder="e.g. Congratulations! Nilar Lwin promoted to Senior UX Designer"
                                                className="w-full text-sm p-2.5 border border-slate-300 rounded-xl focus:ring-[#4F46E5] focus:border-[#4F46E5] bg-white"
                                            />
                                            {promoteTitle && (
                                                <p className="text-[11px] text-indigo-600 mt-1 font-medium flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[13px]">campaign</span>
                                                    A Pending Announcement will be auto-created in the Communications module on approval.
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-700 block mb-1.5">Job Description</label>
                                            <textarea
                                                value={promoteDesc} onChange={e => setPromoteDesc(e.target.value)}
                                                rows={2}
                                                placeholder="Summarize the new role's responsibilities..."
                                                className="w-full text-sm p-3 border border-slate-300 rounded-xl focus:ring-[#4F46E5] focus:border-[#4F46E5] bg-white"
                                            ></textarea>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                                <button onClick={closeModals} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors">
                                    Cancel
                                </button>
                                <button
                                    onClick={handlePromoteSubmit}
                                    disabled={!promoteRole || !promoteEffDate || promoteLoading}
                                    className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {promoteLoading ? (
                                        <span className="animate-spin size-4 border-2 border-white/30 border-t-white rounded-full"></span>
                                    ) : (
                                        <span className="material-symbols-outlined text-[18px]">send</span>
                                    )}
                                    Submit for Approval
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. Formal Resignation Request Modal */}
                {activeModal === 'resign' && activeRecord && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in px-4">
                        <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
                            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                                <div>
                                    <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                                        <span className="material-symbols-outlined text-amber-500">exit_to_app</span> Formal Resignation Request
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5 font-medium">Capture exit details for {activeRecord.name}</p>
                                </div>
                                <button onClick={closeModals} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <div className="p-6 flex-1 min-h-0 overflow-y-auto space-y-4">
                                {/* Auto-filled Section */}
                                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Position</p>
                                        <p className="font-bold text-slate-700">{activeRecord.role}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Department</p>
                                        <p className="font-bold text-slate-700">{activeRecord.dept}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Policy</p>
                                        <p className="font-bold text-slate-700">{activeRecord.policyId || 'ST-DEFAULT-2024'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Manager / Location</p>
                                        <p className="font-bold text-slate-700">HR Admin / HQ</p>
                                    </div>
                                </div>

                                {/* Notice Period Validation Hint */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1.5 flex justify-between items-center">
                                            Final Working Date <span className="text-red-500">*</span>
                                        </label>
                                        <input 
                                            value={resignDate} 
                                            onChange={e => setResignDate(e.target.value)} 
                                            type="date" 
                                            className="w-full text-sm p-3 border border-slate-300 rounded-xl focus:ring-[#4F46E5] focus:border-[#4F46E5] bg-white shadow-sm"
                                        />
                                        
                                        {/* Notice Period Logic */}
                                        {resignDate && (() => {
                                            const diff = Math.ceil((new Date(resignDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                            if (diff < 30) {
                                                return (
                                                    <div className="mt-2 flex items-center gap-2 p-2 px-3 bg-amber-50 text-amber-700 border border-amber-100 rounded-lg animate-pulse">
                                                        <span className="material-symbols-outlined text-[16px]">warning</span>
                                                        <span className="text-[11px] font-bold">Short Notice: {diff > 0 ? `${diff} days` : 'Immediate'} remaining. Manual waiver or penalty may apply.</span>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1.5">Reason for Resignation <span className="text-red-500">*</span></label>
                                        <textarea 
                                            value={resignReason}
                                            onChange={e => setResignReason(e.target.value)}
                                            rows={2} 
                                            className="w-full text-sm p-3 border border-slate-300 rounded-xl focus:ring-[#4F46E5] focus:border-[#4F46E5] bg-white shadow-sm"
                                            placeholder="E.g. Career growth, Relocation, Personal reasons..."
                                        ></textarea>
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                                <button onClick={closeModals} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors">
                                    Discard Request
                                </button>
                                <button 
                                    onClick={handleResignSubmit}
                                    disabled={!resignDate || !resignReason || resignLoading}
                                    className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 transition-colors shadow-lg shadow-amber-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {resignLoading ? (
                                        <span className="animate-spin size-4 border-2 border-white/30 border-t-white rounded-full"></span>
                                    ) : (
                                        <span className="material-symbols-outlined text-[18px]">send</span>
                                    )}
                                    Submit Request
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- Modals --- */}

                {/* 1. Add Employee Flow with Sync Validation */}
                {activeModal === 'add' && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in px-4">
                        <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
                            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                                <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#4F46E5]">person_add</span> Register Personnel
                                </h3>
                                <button onClick={closeModals} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <div className="p-6 flex-1 min-h-0 overflow-y-auto space-y-4">
                                <div className="space-y-4">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#4F46E5] border-b pb-2">Basic Info</p>
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1.5">Legal Name <span className="text-red-500">*</span></label>
                                        <input value={newEmpName} onChange={e => setNewEmpName(e.target.value)} type="text" className="w-full text-sm p-2.5 border border-slate-300 rounded-lg focus:ring-[#4F46E5] focus:border-[#4F46E5]" placeholder="E.g. Aung Aung" />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#4F46E5] border-b pb-2">Organizational Placement</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-700 block mb-1.5">Department <span className="text-red-500">*</span></label>
                                            <select 
                                                value={newEmpDept} onChange={e => setNewEmpDept(e.target.value)}
                                                className="w-full text-sm p-2.5 border border-slate-300 rounded-lg focus:ring-[#4F46E5] focus:border-[#4F46E5]"
                                            >
                                                <option value="">-- Select Department --</option>
                                                {systemSettings.departments.map(d => (
                                                    <option key={d.id} value={d.name}>{d.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-700 block mb-1.5">Job Role / Position <span className="text-red-500">*</span></label>
                                            <select 
                                                value={newEmpRole} onChange={e => setNewEmpRole(e.target.value)}
                                                className="w-full text-sm p-2.5 border border-slate-300 rounded-lg focus:ring-[#4F46E5] focus:border-[#4F46E5]"
                                            >
                                                <option value="">-- Select Position --</option>
                                                {systemSettings.positions.filter(p => !newEmpDept || p.deptId === systemSettings.departments.find(d => d.name === newEmpDept)?.id).map(p => (
                                                    <option key={p.id} value={p.name}>{p.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1.5">Office Location</label>
                                        <select 
                                            value={newEmpLocation} onChange={e => setNewEmpLocation(e.target.value)}
                                            className="w-full text-sm p-2.5 border border-slate-300 rounded-lg focus:ring-[#4F46E5] focus:border-[#4F46E5]"
                                        >
                                            <option value="">-- No Assigned Location --</option>
                                            {systemSettings.officeLocations.map(l => (
                                                <option key={l.id} value={l.name}>{l.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#4F46E5] border-b pb-2">Hardware Sync Parameters</p>
                                    <div className="bg-emerald-50/50 p-4 border border-emerald-100 rounded-lg flex items-start gap-3">
                                        <span className="material-symbols-outlined text-emerald-500 mt-0.5">mark_email_unread</span>
                                        <div>
                                            <p className="text-xs font-bold text-slate-700 block mb-1">Security Invitation Sent (Pending)</p>
                                            <p className="text-[10px] text-slate-500 font-medium">Employee will securely set their device PIN via the TechDance HR App on first login.</p>
                                        </div>
                                    </div>
                                    {authError && <p className="text-xs text-red-600 font-bold mt-2 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">error</span> {authError}</p>}
                                </div>
                            </div>
                            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                                <button onClick={closeModals} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors">
                                    Discard Registration
                                </button>
                                <button onClick={handleAddEmployeeSubmit} className="px-6 py-2.5 rounded-lg text-sm font-bold text-white bg-[#4F46E5] hover:bg-indigo-600 transition-colors shadow-sm">
                                    Commit Record
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. Deactivate Confirmation Modal */}
                {activeModal === 'deactivate' && activeRecord && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in px-4">
                        <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-red-100 relative">
                            {terminationError && (
                                <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-300">
                                    <div className="size-16 rounded-full bg-red-50 flex items-center justify-center mb-4 border-2 border-red-100">
                                        <span className="material-symbols-outlined text-red-600 text-3xl">lock_person</span>
                                    </div>
                                    <h4 className="text-lg font-bold text-red-700 mb-2 uppercase tracking-tight">Access Denied</h4>
                                    <p className="text-sm font-semibold text-slate-600 leading-relaxed mb-6">
                                        {terminationError}
                                    </p>
                                    <button 
                                        onClick={closeModals}
                                        className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200"
                                    >
                                        Acknowledge & Return
                                    </button>
                                </div>
                            )}
                            <div className="p-6 text-center">
                                <span className="material-symbols-outlined text-red-500 text-5xl mb-2 bg-red-50 rounded-full p-4">warning</span>
                                <h3 className="text-lg font-bold text-slate-900 mt-2">Deactivate User?</h3>
                                <p className="text-sm text-slate-500 mt-2">
                                    You are about to terminate <strong>{activeRecord.name}</strong>. Their status locally, in Payroll, and in Attendance tracking protocols will be suspended immediately.
                                </p>
                            </div>
                            <div className="flex bg-slate-50 text-sm font-semibold border-t border-slate-100">
                                <button onClick={closeModals} className="flex-1 py-4 hover:bg-slate-100 text-slate-600 border-r border-slate-100 transition-colors">
                                    Cancel
                                </button>
                                <button onClick={handleDeactivateConfirm} className="flex-1 py-4 hover:bg-red-50 text-red-600 transition-colors flex items-center justify-center gap-1">
                                    Yes, Terminate
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* === ADJUSTMENT MODAL === */}
                {activeModal === 'adjust' && activeRecord && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in px-4">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
                            {/* Header */}
                            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center size-9 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-violet-600">
                                        <span className="material-symbols-outlined text-[20px]">payments</span>
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-slate-900 dark:text-white">Payroll Adjustment</h3>
                                        <p className="text-xs text-slate-500">{activeRecord.name} · {activeRecord.dept}</p>
                                    </div>
                                </div>
                                <button onClick={closeModals} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            {/* Info Banner */}
                            <div className="mx-5 mt-4 p-3 bg-amber-50 border border-amber-100 rounded-lg flex gap-2.5 items-start flex-shrink-0">
                                <span className="material-symbols-outlined text-amber-600 text-[18px] mt-0.5">info</span>
                                <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                                    This request will appear in the <strong>Centralized Inbox</strong> for approver review. The adjustment will be applied to the next open payroll cycle after approval.
                                </p>
                            </div>

                            {/* Body */}
                            <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
                                {/* Auto-filled info */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Current Salary</p>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{(activeRecord.baseSalary || 0).toLocaleString()} MMK</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Department</p>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{activeRecord.dept}</p>
                                    </div>
                                </div>

                                {/* Category */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Category</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {(['Addition', 'Deduction'] as const).map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => setAdjCategory(cat)}
                                                className={`py-2.5 rounded-lg text-sm font-semibold border transition-all ${adjCategory === cat
                                                    ? cat === 'Addition'
                                                        ? 'bg-emerald-500 text-white border-emerald-500'
                                                        : 'bg-red-500 text-white border-red-500'
                                                    : 'bg-white dark:bg-slate-800 text-slate-600 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                                                }`}
                                            >
                                                {cat === 'Addition' ? '+ Addition' : '− Deduction'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Adjustment Type */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Adjustment Type</label>
                                    <input
                                        type="text"
                                        value={adjType}
                                        onChange={e => setAdjType(e.target.value)}
                                        placeholder="e.g. Performance Bonus, Allowance, Late Fine..."
                                        className="w-full text-sm p-3 border border-slate-200 rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-violet-500/20"
                                    />
                                    {/* Late Fine duplicate deduction warning */}
                                    {adjType.toLowerCase().includes('late fine') && adjCategory === 'Deduction' && (
                                        <div className="p-2.5 bg-orange-50 border border-orange-200 rounded-lg flex gap-2 items-start">
                                            <span className="material-symbols-outlined text-orange-500 text-[16px] mt-0.5">warning</span>
                                            <p className="text-[11px] text-orange-700 font-medium">
                                                <strong>Note:</strong> Late fines are automatically calculated via Attendance Sync. Adding a manual fine may cause Double-Dipping in payroll. Verify there is no system-generated deduction for this employee.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Amount */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Amount (MMK)</label>
                                    <input
                                        type="number"
                                        value={adjAmount}
                                        onChange={e => setAdjAmount(e.target.value)}
                                        placeholder="e.g. 50000"
                                        className="w-full text-sm p-3 border border-slate-200 rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-violet-500/20 font-semibold"
                                    />
                                </div>

                                {/* Effective Month (locked to open cycle) */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Effective Month</label>
                                        {lastPayrollStatus === 'Disbursed' && (
                                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                                                ⚠ Current month finalized — auto-forwarded
                                            </span>
                                        )}
                                    </div>
                                    <input
                                        type="month"
                                        value={adjMonth}
                                        onChange={e => lastPayrollStatus !== 'Disbursed' && setAdjMonth(e.target.value)}
                                        readOnly={lastPayrollStatus === 'Disbursed'}
                                        className={`w-full text-sm p-3 border rounded-lg outline-none ${lastPayrollStatus === 'Disbursed' ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 cursor-not-allowed' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-violet-500/20'}`}
                                    />
                                </div>

                                {/* Reason */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reason (Mandatory)</label>
                                    <textarea
                                        value={adjReason}
                                        onChange={e => setAdjReason(e.target.value)}
                                        rows={3}
                                        placeholder="Explain the basis for this adjustment..."
                                        className="w-full text-sm p-3 border border-slate-200 rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-violet-500/20 resize-none"
                                    />
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex justify-end gap-3 flex-shrink-0">
                                <button onClick={closeModals} className="px-5 py-2 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                                <button
                                    onClick={handleAdjustmentSubmit}
                                    disabled={adjLoading || !adjType || !adjAmount || !adjReason}
                                    className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 transition-colors shadow-lg shadow-violet-100 dark:shadow-none disabled:opacity-50 flex items-center gap-2"
                                >
                                    {adjLoading ? <><span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span> Submitting...</> : <><span className="material-symbols-outlined text-[18px]">send</span> Submit for Approval</>}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* === TRANSFER MODAL === */}
                {activeModal === 'transfer' && activeRecord && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in px-4">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
                            {/* Header */}
                            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center size-9 rounded-xl bg-teal-50 dark:bg-teal-900/20 text-teal-600">
                                        <span className="material-symbols-outlined text-[20px]">swap_horiz</span>
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-slate-900 dark:text-white">Transfer Request</h3>
                                        <p className="text-xs text-slate-500">{activeRecord.name} · {activeRecord.id}</p>
                                    </div>
                                </div>
                                <button onClick={closeModals} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            {/* Info Banner */}
                            <div className="mx-5 mt-4 p-3 bg-teal-50 border border-teal-100 rounded-lg flex gap-2.5 items-start flex-shrink-0">
                                <span className="material-symbols-outlined text-teal-600 text-[18px] mt-0.5">info</span>
                                <p className="text-[11px] text-teal-800 font-medium leading-relaxed">
                                    Upon approval, the employee's department, location, shift, and geofence coordinates will automatically update. The new manager will gain visibility in the Mobile App.
                                </p>
                            </div>

                            {/* Body */}
                            <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
                                {/* Auto-filled current info */}
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Current Assignment (Auto-filled)</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { label: 'Position', value: activeRecord.role },
                                            { label: 'Department', value: activeRecord.dept },
                                            { label: 'Policy', value: activeRecord.policyId || '—' },
                                            { label: 'Shift', value: (shifts || []).find((s: any) => s.id === activeRecord.shiftId)?.name || activeRecord.shiftId || '—' },
                                        ].map(item => (
                                            <div key={item.label} className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
                                                <p className="text-[10px] text-slate-400 font-medium">{item.label}</p>
                                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">{item.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="w-full h-px bg-slate-100 dark:bg-slate-800"></div>

                                {/* New Department */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">New Department <span className="text-red-400">*</span></label>
                                    <select
                                        value={transferDept}
                                        onChange={e => setTransferDept(e.target.value)}
                                        className="w-full text-sm p-3 border border-slate-200 rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-teal-500/20"
                                    >
                                        <option value="">-- Select Department --</option>
                                        {systemSettings.departments.map(d => (
                                            <option key={d.id} value={d.name}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* New Office Location */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">New Office Location</label>
                                    <select
                                        value={transferLocation}
                                        onChange={e => {
                                            const locName = e.target.value;
                                            setTransferLocation(locName);
                                            const found = systemSettings.officeLocations.find(l => l.name === locName);
                                            if (found) {
                                                setTransferLat(found.coords.lat.toString());
                                                setTransferLng(found.coords.lng.toString());
                                            }
                                        }}
                                        className="w-full text-sm p-3 border border-slate-200 rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-teal-500/20"
                                    >
                                        <option value="">-- No Assigned Location --</option>
                                        {systemSettings.officeLocations.map(l => (
                                            <option key={l.id} value={l.name}>{l.name}</option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] text-slate-400">Selecting a preset location auto-populates GPS for Geofence Sync.</p>
                                </div>

                                {/* GPS Coordinates (for Geofence Sync) */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">GPS Latitude</label>
                                        <input
                                            type="number"
                                            step="any"
                                            value={transferLat}
                                            onChange={e => setTransferLat(e.target.value)}
                                            placeholder="e.g. 21.9162"
                                            className="w-full text-sm p-3 border border-slate-200 rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-teal-500/20"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">GPS Longitude</label>
                                        <input
                                            type="number"
                                            step="any"
                                            value={transferLng}
                                            onChange={e => setTransferLng(e.target.value)}
                                            placeholder="e.g. 95.9560"
                                            className="w-full text-sm p-3 border border-slate-200 rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-teal-500/20"
                                        />
                                    </div>
                                </div>
                                {(transferLat || transferLng) && (
                                    <div className="flex items-center gap-1.5 p-2 bg-teal-50 border border-teal-100 rounded-lg">
                                        <span className="material-symbols-outlined text-teal-500 text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
                                        <p className="text-[11px] text-teal-700 font-medium">Geofence will update to ({transferLat || '—'}, {transferLng || '—'}) on approval.</p>
                                    </div>
                                )}

                                {/* New Manager ID */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">New Reporting Manager (Employee ID)</label>
                                    <input
                                        type="text"
                                        value={transferManager}
                                        onChange={e => setTransferManager(e.target.value)}
                                        placeholder="e.g. EMP-005"
                                        className="w-full text-sm p-3 border border-slate-200 rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-teal-500/20 font-mono"
                                    />
                                    {/* Active manager validation badge */}
                                    {transferManager && (() => {
                                        const mgr = employees.find(e => e.id === transferManager);
                                        if (!mgr) return <p className="text-[11px] text-slate-400 flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">search</span> Not found</p>;
                                        return mgr.status === 'Active'
                                            ? <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">check_circle</span> {mgr.name} · Active</p>
                                            : <p className="text-[11px] text-red-500 font-bold flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">warning</span> {mgr.name} is {mgr.status} — Manager sync will be skipped on approval.</p>;
                                    })()}
                                </div>

                                {/* Attendance Shift */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Attendance Shift</label>
                                    <select
                                        value={transferShift}
                                        onChange={e => setTransferShift(e.target.value)}
                                        className="w-full text-sm p-3 border border-slate-200 rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-teal-500/20"
                                    >
                                        <option value="">— Keep current shift —</option>
                                        {(shifts || []).map((s: any) => (
                                            <option key={s.id} value={s.id}>{s.name} ({s.start}–{s.end})</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Salary Change (Optional) */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">New Salary (Optional)</label>
                                    <input
                                        type="number"
                                        value={transferSalary}
                                        onChange={e => setTransferSalary(e.target.value)}
                                        placeholder={`Current: ${(activeRecord.baseSalary || 0).toLocaleString()} MMK`}
                                        className="w-full text-sm p-3 border border-slate-200 rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-teal-500/20"
                                    />
                                </div>

                                {/* Effective Date */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Effective Date <span className="text-red-400">*</span></label>
                                    <input
                                        type="date"
                                        value={transferEffDate}
                                        onChange={e => setTransferEffDate(e.target.value)}
                                        className="w-full text-sm p-3 border border-slate-200 rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-teal-500/20"
                                    />
                                </div>

                                {/* Reason */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reason / Notes</label>
                                    <textarea
                                        value={transferReason}
                                        onChange={e => setTransferReason(e.target.value)}
                                        rows={2}
                                        placeholder="Business reason for this transfer..."
                                        className="w-full text-sm p-3 border border-slate-200 rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-teal-500/20 resize-none"
                                    />
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex justify-end gap-3 flex-shrink-0">
                                <button onClick={closeModals} className="px-5 py-2 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                                <button
                                    onClick={handleTransferSubmit}
                                    disabled={transferLoading || !transferDept || !transferEffDate}
                                    className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors shadow-lg shadow-teal-100 dark:shadow-none disabled:opacity-50 flex items-center gap-2"
                                >
                                    {transferLoading ? <><span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span> Submitting...</> : <><span className="material-symbols-outlined text-[18px]">send</span> Submit Transfer</>}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 5. Universal Document Upload Modal */}
                {activeModal === 'upload' && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in px-4">
                        <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
                            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                                <div>
                                    <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[#4F46E5]">upload_file</span> Universal Document Upload
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5 font-medium">Categorize and secure employee records</p>
                                </div>
                                <button onClick={closeModals} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <div className="p-6 flex-1 min-h-0 overflow-y-auto space-y-5">
                                {/* Target Selection */}
                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">Select Employee <span className="text-red-500">*</span></label>
                                    <select 
                                        className="w-full text-sm p-3 border border-slate-300 rounded-xl focus:ring-[#4F46E5] focus:border-[#4F46E5] bg-white shadow-sm"
                                        value={uploadTargetId}
                                        onChange={(e) => setUploadTargetId(e.target.value)}
                                    >
                                        <option value="">Choose Employee...</option>
                                        {employees.map(e => (
                                            <option key={e.id} value={e.id}>{e.name} ({e.id})</option>
                                        ))}
                                    </select>
                                </div>

                                {/* File Dropzone */}
                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">Attachments</label>
                                    <div 
                                        className={`border-2 border-dashed ${uploadFile ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 hover:border-[#4F46E5]'} rounded-2xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer relative group`}
                                        onClick={() => document.getElementById('file-upload-input')?.click()}
                                    >
                                        <input 
                                            id="file-upload-input"
                                            type="file" 
                                            className="hidden" 
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) setUploadFile(file);
                                            }}
                                        />
                                        {uploadFile ? (
                                            <>
                                                <div className="size-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
                                                    <span className="material-symbols-outlined text-[32px]">check_circle</span>
                                                </div>
                                                <p className="font-bold text-slate-900 text-sm text-center">{uploadFile.name}</p>
                                                <p className="text-[11px] text-slate-500 mt-1 uppercase">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB • Ready to secure</p>
                                                <button 
                                                    className="absolute top-2 right-2 p-1.5 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-red-500 shadow-sm"
                                                    onClick={(e) => { e.stopPropagation(); setUploadFile(null); }}
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">close</span>
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <div className="size-16 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mb-3 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                                                    <span className="material-symbols-outlined text-[32px]">cloud_upload</span>
                                                </div>
                                                <p className="font-bold text-slate-900 text-sm">Drag & drop or <span className="text-[#4F46E5] underline">browse files</span></p>
                                                <p className="text-[11px] text-slate-500 mt-1 uppercase tracking-tight">PDF, DOCX, PNG (Max 10MB)</p>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">Category</label>
                                        <select 
                                            value={uploadCategory}
                                            onChange={(e) => setUploadCategory(e.target.value as any)}
                                            className="w-full text-sm p-3 border border-slate-300 rounded-xl focus:ring-[#4F46E5] focus:border-[#4F46E5] bg-white shadow-sm"
                                        >
                                            <option value="Standard">Standard</option>
                                            <option value="CV">CV</option>
                                            <option value="Contract">Contract</option>
                                            <option value="Performance">Performance Review</option>
                                            <option value="Job Activity">Job Activity</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">Privacy Level</label>
                                        <select 
                                            value={uploadPrivacy}
                                            onChange={(e) => setUploadPrivacy(e.target.value as any)}
                                            className="w-full text-sm p-3 border border-slate-300 rounded-xl focus:ring-[#4F46E5] focus:border-[#4F46E5] bg-white shadow-sm"
                                        >
                                            <option value="Manager Viewable">Manager Viewable</option>
                                            <option value="Admin Only">Admin Only (HR Restrict)</option>
                                        </select>
                                        <p className="text-[10px] text-slate-400 mt-1 font-medium leading-tight italic">
                                            {uploadPrivacy === 'Admin Only' ? '* Visible only to Global HR Admins.' : '* Visible to HR, Admins, and the direct Manager.'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                                <button onClick={closeModals} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors">
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUploadSubmit}
                                    disabled={!uploadTargetId || !uploadFile || uploadLoading}
                                    className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {uploadLoading ? (
                                        <span className="animate-spin size-4 border-2 border-white/30 border-t-white rounded-full"></span>
                                    ) : (
                                        <span className="material-symbols-outlined text-[18px]">save</span>
                                    )}
                                    Save Details and Upload
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
