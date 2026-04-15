import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useAppData, JobActivityChange, AttendanceLog } from '../context/AppDataContext';
import { useSystemCalendar } from '../context/SystemCalendarContext';

export default function Employee() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { 
        employees, assets, terminateEmployee, adjustLeaveBalance, 
        addJobActivityChange, jobActivityChanges, attendanceLogs, 
        shiftAssignments, shifts, assignShift, addManualPunch, 
        holidays, toggleAutoAttendance, updateEmployee, systemSettings,
        verifyLocalAuth, addSecurityLog
    } = useAppData();
    const employee = employees.find(e => e.id === id) || employees[0];
    const assignedAssets = assets.filter(a => a.assigneeId === employee.id);

    const [activeTab, setActiveTab] = useState('Overview');
    const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
    const [adjustmentAmount, setAdjustmentAmount] = useState<number>(0);
    const [adjustmentType, setAdjustmentType] = useState<string>('Earned');
    const [adjustmentReason, setAdjustmentReason] = useState<string>('');
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [terminationError, setTerminationError] = useState<string | null>(null);
    const [searchParams] = useSearchParams();

    // Salary Update State
    const [newSalary, setNewSalary] = useState<number>(employee.baseSalary);
    const [effectiveDate, setEffectiveDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [salaryReason, setSalaryReason] = useState<string>('');
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [movementFilter, setMovementFilter] = useState<'All' | 'Job Changes' | 'Financial Adjustments'>('All');

    // Secure Vault State
    const [isVaultUnlocked, setIsVaultUnlocked] = useState(false);
    const [vaultPin, setVaultPin] = useState('');
    const [vaultError, setVaultError] = useState('');

    const handleUnlockVault = () => {
        if (verifyLocalAuth(vaultPin)) {
            setIsVaultUnlocked(true);
            setVaultError('');
            addSecurityLog({
                deviceId: 'WEB-PORTAL',
                authMethod: 'Setup Token',
                status: 'Success',
                empId: employee.id
            });
        } else {
            setVaultError('Invalid Authorization Code');
            addSecurityLog({
                deviceId: 'WEB-PORTAL',
                authMethod: 'Setup Token',
                status: 'Failed',
                empId: employee.id
            });
        }
    };

    // Attendance Edit State
    const [editingDate, setEditingDate] = useState<string | null>(null);
    const [editingShiftId, setEditingShiftId] = useState<string>('');
    const [editingReason, setEditingReason] = useState<string>('');
    const [customStartTime, setCustomStartTime] = useState<string>('09:00');
    const [customEndTime, setCustomEndTime] = useState<string>('18:00');
    const [customWorkType, setCustomWorkType] = useState<'Regular' | 'Overtime'>('Regular');
    const [manualCheckIn, setManualCheckIn] = useState<string>('09:00');
    const [manualCheckOut, setManualCheckOut] = useState<string>('18:00');

    // Profile Edit State
    const [editName, setEditName] = useState(employee.name);
    const [editRole, setEditRole] = useState(employee.role);
    const [editDept, setEditDept] = useState(employee.dept);
    const [editLocation, setEditLocation] = useState((employee as any).officeLocation || '');

    useEffect(() => {
        if (activeModal === 'edit_profile') {
            setEditName(employee.name);
            setEditRole(employee.role);
            setEditDept(employee.dept);
            setEditLocation((employee as any).officeLocation || '');
        }
    }, [activeModal, employee]);

    const closeModal = () => {
        setActiveModal(null);
        setTerminationError(null);
        setIsReadOnly(false);
    };

    React.useEffect(() => {
        const modalParam = searchParams.get('modal');
        if (modalParam === 'salary_review') {
            setIsReadOnly(true);
            setActiveModal('salary_update');
            
            // Auto-fill form with request data if found (simulated)
            const requestId = searchParams.get('requestId');
            const request = jobActivityChanges.find(r => r.id === requestId);
            if (request) {
                setNewSalary(request.newSalary || employee.baseSalary);
                setEffectiveDate(request.effectiveDate);
                setSalaryReason(request.detail);
            }
        }
    }, [searchParams, jobActivityChanges, employee]);

    return (
        <div className="flex h-screen w-full bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white antialiased overflow-hidden">
            <Sidebar activeTab="Employees" />

            <main className="flex-1 flex flex-col h-full overflow-hidden relative ml-[280px]">
                <Header 
                    title="Employee Profile"
                    subtitle={`${employee.name} (ID: ${employee.id}) • ${employee.role}`}
                />
                <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-[#F8FAFC]">
                    <div className="max-w-7xl mx-auto space-y-6">


                        <div className="bg-white dark:bg-[#182130] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden relative group">
                            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 relative px-8 py-8">
                                <div className="absolute inset-0 bg-black/5"></div>
                                <div className="absolute right-0 top-0 h-full w-48 bg-white/10 skew-x-12 translate-x-20"></div>
                                <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                                    <div className="relative size-28 rounded-full ring-4 ring-white/20 bg-white overflow-hidden shadow-md shrink-0">
                                        <img alt={employee.name} className="w-full h-full object-cover" src={employee.avatar || "https://lh3.googleusercontent.com/aida-public/AB6AXuDtMXUX0ktXwWpCR_HssI-ya16-3aPa6AAVPyBQ1EHpfp-j-sPL3V6-M9LOQH5oBAEgQVe-LnDjqixmSwV106z7bEtrnsNZO1CATGA_USq9lnhHi1_HCFl-Cyi3xyw648ljz2mqjJMc3vscDUW5zgws6ccC1OF1vEu1wdaDvwNJ2V-sg_zZ0haXJZDCxUvx8VjDCNHaXD51nD66gSegMbmfNMdqwU2v6zEDDEhi7cAmX1yUQ8UQLqt3O-oPvyg5wEcfX6wNGOUrCzj4"} />
                                    </div>
                                    <div className="flex-1 text-center md:text-left">
                                        <h1 className="text-2xl font-bold text-white mb-1">{employee.name}</h1>
                                        <p className="text-indigo-100 font-medium text-sm flex items-center justify-center md:justify-start gap-2 mb-3">
                                            {employee.role}
                                            <span className="size-1 rounded-full bg-indigo-300"></span>
                                            {employee.dept}
                                        </p>
                                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-white/10 text-white backdrop-blur-sm border border-white/20 shadow-sm">
                                                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse"></span> {employee.status}
                                            </span>
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-white backdrop-blur-sm border border-indigo-400/30 shadow-sm">
                                                <span className="material-symbols-outlined text-[14px]">fingerprint</span> Biometric: Enrolled
                                            </span>
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-white/10 text-white backdrop-blur-sm border border-white/20 shadow-sm">
                                                Permanent
                                            </span>
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/10 text-indigo-100 backdrop-blur-sm border border-white/10">
                                                <span className="material-symbols-outlined text-[14px] text-indigo-200">calendar_month</span> {employee.joinDate}
                                            </span>
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/10 text-indigo-100 backdrop-blur-sm border border-white/10">
                                                {(employee as any).officeLocation || employee.township || 'Yangon HQ'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => setActiveModal('edit_profile')} className="px-4 py-2 border border-white/20 rounded-lg text-white text-sm font-semibold hover:bg-white/20 transition-colors shadow-sm backdrop-blur-sm" style={{ backgroundColor: '#4F46E5' }}>
                                            Edit Profile
                                        </button>
                                        <div className="relative">
                                            <button
                                                onClick={() => setIsActionsMenuOpen(!isActionsMenuOpen)}
                                                className="px-4 py-2 bg-white text-[#4F46E5] rounded-lg text-sm font-bold hover:bg-indigo-50 transition-colors flex items-center gap-2 shadow-lg shadow-black/10">
                                                Actions
                                                <span className="material-symbols-outlined text-[18px]">expand_more</span>
                                            </button>
                                            {isActionsMenuOpen && (
                                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden z-20 animate-fade-in text-left">
                                                    <button onClick={() => { setIsActionsMenuOpen(false); setActiveModal('download_pdf'); }} className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 hover:text-[#4F46E5] transition-colors border-b border-slate-50 flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-[18px]">download</span> Download PDF Profile
                                                    </button>
                                                    <button onClick={() => { setIsActionsMenuOpen(false); setActiveModal('reset_password'); }} className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 hover:text-[#4F46E5] transition-colors border-b border-slate-50 flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-[18px]">lock_reset</span> Reset Password
                                                    </button>
                                                    <button onClick={() => { setIsActionsMenuOpen(false); setActiveModal('deactivate'); }} className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-[18px]">person_off</span> Deactivate User
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-[#182130] px-8 border-t border-slate-200 dark:border-slate-800">
                                <nav aria-label="Tabs" className="flex gap-8 overflow-x-auto no-scrollbar">
                                    {['Overview', 'Personal & Family', 'Job & Pay', 'Movement', 'Attendance', 'Leave', 'Documents', 'Assets', 'History'].map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={`group py-4 text-sm whitespace-nowrap flex items-center gap-2 transition-all ${activeTab === tab
                                                ? "font-bold border-b-2"
                                                : "font-medium text-slate-500 hover:text-slate-700 border-b-2 border-transparent hover:border-slate-300"
                                                }`}
                                            style={activeTab === tab ? { color: '#4F46E5', borderColor: '#4F46E5' } : {}}
                                        >
                                            {tab === 'Personal & Family' && <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>family_restroom</span>}
                                            {tab}
                                            {tab === 'Documents' && employee.documents.length > 0 && (
                                                <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-[10px] px-1.5 py-0.5 rounded-full">{employee.documents.length}</span>
                                            )}
                                            {tab === 'Assets' && assignedAssets.length > 0 && (
                                                <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-[10px] px-1.5 py-0.5 rounded-full">{assignedAssets.length}</span>
                                            )}
                                        </button>
                                    ))}
                                </nav>
                            </div>
                        </div>

                        {activeTab === 'Overview' && (

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                                <div className="flex flex-col gap-6">
                                    {/* Employee 360 Box (Integrated Performance & Training) */}
                                    <div className="bg-white dark:bg-[#182130] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col pt-5 px-6 pb-6 relative overflow-hidden group">
                                        <div className="absolute right-0 top-0 w-32 h-full bg-gradient-to-l from-indigo-50/50 to-transparent pointer-events-none"></div>
                                        <div className="flex justify-between items-center mb-4 relative z-10">
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-[#4F46E5]">data_exploration</span>
                                                <h3 className="text-base font-bold text-slate-900 dark:text-white">Employee 360 View</h3>
                                            </div>
                                            <button className="text-[10px] font-bold text-[#4F46E5] bg-indigo-50 px-2 py-1 rounded border border-indigo-100 hover:bg-indigo-100 transition-colors uppercase tracking-wider">
                                                Full Report
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 relative z-10">
                                            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
                                                <p className="text-xs text-slate-500 font-medium mb-1">Performance (Q3)</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xl font-bold text-slate-900 dark:text-white">Exceeds</span>
                                                    <span className="material-symbols-outlined text-emerald-500 text-[16px]">trending_up</span>
                                                </div>
                                            </div>
                                            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
                                                <p className="text-xs text-slate-500 font-medium mb-1">Learning Track</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xl font-bold text-slate-900 dark:text-white">85%</span>
                                                    <span className="text-[10px] text-slate-400">Completion</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Labor Contract (EC) HR Risk Flag */}
                                    {employee.hasCriticalRiskFlag && (
                                        <div className="bg-red-50 rounded-xl border-2 border-dashed border-red-200 p-5 flex items-start gap-4 shadow-sm animate-fade-in">
                                            <div className="flex-shrink-0 bg-white rounded-full p-1.5 shadow-sm border border-red-100">
                                                <span className="material-symbols-outlined text-red-600 text-[20px]">warning</span>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-red-700 uppercase tracking-widest">Critical EC Renewal Warning</h4>
                                                <p className="text-xs text-red-600/90 mt-1 font-bold leading-relaxed">System sync trigger applied from Performance Matrix integration. Core metric rating fell below the strict 3.0 boundary. HR intervention is structurally mandated before initiating any upcoming formal Labor Contract renewal sequences.</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="bg-white dark:bg-[#182130] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col hover:border-indigo-300/50 transition-colors">
                                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center justify-center size-9 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-[#4F46E5]">
                                                    <span className="material-symbols-outlined text-[20px]">badge</span>
                                                </div>
                                                <h3 className="text-base font-bold text-slate-900 dark:text-white">Identity Information</h3>
                                            </div>
                                            <button onClick={() => setActiveModal('edit_identity')} className="text-xs font-medium text-[#4F46E5] hover:text-indigo-800 hover:underline">Edit</button>
                                        </div>
                                        <div className="p-6 space-y-6">
                                            <div className="flex flex-col sm:flex-row gap-4 items-baseline">
                                                <p className="w-full sm:w-[180px] sm:min-w-[180px] shrink-0 text-sm font-medium text-slate-500 dark:text-slate-400">NRC Number</p>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="text-base font-semibold text-slate-900 dark:text-white font-mono">12/Bahan(N)123456</p>
                                                        <span className="material-symbols-outlined text-emerald-500 text-[20px]" title="Verified with Govt Database" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                                        <a className="ml-1 text-xs font-medium text-primary hover:text-indigo-700 hover:underline flex items-center gap-1 transition-colors" href="#">View Card 📎</a>
                                                    </div>
                                                    <p className="text-xs text-slate-400 mt-1">Myanmar National Registration</p>
                                                </div>
                                            </div>
                                            <div className="w-full h-px bg-slate-50 dark:bg-slate-800/50"></div>
                                            <div className="flex flex-col sm:flex-row gap-4 items-baseline">
                                                <p className="w-full sm:w-[180px] sm:min-w-[180px] shrink-0 text-sm font-medium text-slate-500 dark:text-slate-400">Biometric ID (PIN)</p>
                                                <div className="flex-1">
                                                    <p className="text-sm font-semibold text-slate-900 dark:text-white font-mono">1024</p>
                                                </div>
                                            </div>
                                            <div className="w-full h-px bg-slate-50 dark:bg-slate-800/50"></div>
                                            <div className="flex flex-col sm:flex-row gap-4 items-center">
                                                <div className="w-full sm:w-[180px] sm:min-w-[180px] shrink-0">
                                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                                        Auto Attendance
                                                        <span className="material-symbols-outlined text-[16px] text-indigo-500" title="Schedule-based log generation">robot_2</span>
                                                    </p>
                                                </div>
                                                <div className="flex-1 flex items-center gap-3">
                                                    <button 
                                                        onClick={() => toggleAutoAttendance(employee.id, 'ADM-001')}
                                                        className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none ${employee.autoAttendanceEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                                                    >
                                                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${employee.autoAttendanceEnabled ? 'translate-x-5' : 'translate-x-1.5'}`} />
                                                    </button>
                                                    <span className={`text-xs font-bold ${employee.autoAttendanceEnabled ? 'text-indigo-600' : 'text-slate-400'}`}>
                                                        {employee.autoAttendanceEnabled ? 'ON' : 'OFF'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="w-full h-px bg-slate-50 dark:bg-slate-800/50"></div>
                                            <div className="flex flex-col sm:flex-row gap-4 items-baseline">
                                                <p className="w-full sm:w-[180px] sm:min-w-[180px] shrink-0 text-sm font-medium text-slate-500 dark:text-slate-400">Father's Name</p>
                                                <div className="flex-1">
                                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">U Ba Kyaw</p>
                                                </div>
                                            </div>
                                            <div className="w-full h-px bg-slate-50 dark:bg-slate-800/50"></div>
                                            <div className="flex flex-col sm:flex-row gap-4 items-baseline">
                                                <p className="w-full sm:w-[180px] sm:min-w-[180px] shrink-0 text-sm font-medium text-slate-500 dark:text-slate-400">Date of Birth</p>
                                                <div className="flex-1">
                                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">14 Oct 1995</p>
                                                    <p className="text-xs text-slate-400 mt-1">29 years old</p>
                                                </div>
                                            </div>
                                            <div className="w-full h-px bg-slate-50 dark:bg-slate-800/50"></div>
                                            <div className="flex flex-col sm:flex-row gap-4 items-baseline">
                                                <p className="w-full sm:w-[180px] sm:min-w-[180px] shrink-0 text-sm font-medium text-slate-500 dark:text-slate-400">Race/Religion</p>
                                                <div className="flex-1">
                                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Burmese / Buddhist</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-[#182130] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col hover:border-indigo-300/50 transition-colors">
                                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center justify-center size-9 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-600">
                                                    <span className="material-symbols-outlined text-[20px]">location_on</span>
                                                </div>
                                                <h3 className="text-base font-bold text-slate-900 dark:text-white">Address &amp; Contact</h3>
                                            </div>
                                            <button onClick={() => setActiveModal('edit_address')} className="text-xs font-medium text-[#4F46E5] hover:text-indigo-800 hover:underline">Edit</button>
                                        </div>
                                        <div className="p-6 space-y-6">
                                            <div className="flex flex-col sm:flex-row gap-4 items-baseline">
                                                <p className="w-full sm:w-[180px] sm:min-w-[180px] shrink-0 text-sm font-medium text-slate-500 dark:text-slate-400">Address</p>
                                                <div className="flex-1">
                                                    <p className="text-sm font-semibold text-slate-900 dark:text-white leading-relaxed">No. 123, Pyay Road, Ward 5</p>
                                                </div>
                                            </div>
                                            <div className="w-full h-px bg-slate-50 dark:bg-slate-800/50"></div>
                                            <div className="flex flex-col sm:flex-row gap-4 items-baseline">
                                                <p className="w-full sm:w-[180px] sm:min-w-[180px] shrink-0 text-sm font-medium text-slate-500 dark:text-slate-400">Township</p>
                                                <div className="flex-1">
                                                    <div className="relative group">
                                                        <button className="w-full text-left border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-800/50 text-sm font-semibold text-slate-900 dark:text-white flex items-center justify-between hover:border-primary/50 transition-colors">
                                                            Sanchaung
                                                            <span className="material-symbols-outlined text-slate-400 text-[20px]">arrow_drop_down</span>
                                                        </button>
                                                        <p className="text-[10px] text-primary mt-1.5 font-medium flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>info</span> Determines Tax Jurisdiction
                                                            <span className="block text-[10px] text-slate-400 font-normal">Determines Device Group Assignment</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="w-full h-px bg-slate-50 dark:bg-slate-800/50"></div>
                                            <div className="flex flex-col sm:flex-row gap-4 items-baseline">
                                                <p className="w-full sm:w-[180px] sm:min-w-[180px] shrink-0 text-sm font-medium text-slate-500 dark:text-slate-400">City/State</p>
                                                <div className="flex-1">
                                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Yangon</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-6">
                                    <div className="bg-white dark:bg-[#182130] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col hover:border-indigo-300/50 transition-colors">
                                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center justify-center size-9 rounded-lg bg-pink-50 dark:bg-pink-900/20 text-pink-600">
                                                    <span className="material-symbols-outlined text-[20px]">diversity_3</span>
                                                </div>
                                                <h3 className="text-base font-bold text-slate-900 dark:text-white">Tax Reliefs &amp; Family</h3>
                                            </div>
                                            <button onClick={() => setActiveModal('add_dependent')} className="text-xs font-medium text-[#4F46E5] hover:text-indigo-800 hover:underline">Add Dependent</button>
                                        </div>
                                        <div className="p-6 space-y-6">
                                            <div className="flex flex-col sm:flex-row gap-4 items-baseline">
                                                <p className="w-full sm:w-[180px] sm:min-w-[180px] shrink-0 text-sm font-medium text-slate-500 dark:text-slate-400">Marital Status</p>
                                                <div className="flex-1">
                                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Married</p>
                                                </div>
                                            </div>
                                            <div className="w-full h-px bg-slate-50 dark:bg-slate-800/50"></div>
                                            <div className="flex flex-col sm:flex-row gap-4 items-baseline">
                                                <p className="w-full sm:w-[180px] sm:min-w-[180px] shrink-0 text-sm font-medium text-slate-500 dark:text-slate-400">Spouse</p>
                                                <div className="flex-1">
                                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Ko Ko Maung <span className="text-slate-400 font-normal ml-1 text-xs">(Not Working)</span></p>
                                                    <div className="mt-1.5">
                                                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded dark:bg-emerald-900/20 dark:text-emerald-400 border dark:border-emerald-800/30 text-[10px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 border-emerald-100">
                                                            <span className="material-symbols-outlined text-[12px]">check</span> Eligible for Tax Relief
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="w-full h-px bg-slate-50 dark:bg-slate-800/50"></div>
                                            <div className="flex flex-col sm:flex-row gap-4 items-baseline">
                                                <p className="w-full sm:w-[180px] sm:min-w-[180px] shrink-0 text-sm font-medium text-slate-500 dark:text-slate-400">Parents</p>
                                                <div className="flex-1">
                                                    <div className="space-y-3">
                                                        <div>
                                                            <p className="text-sm font-semibold text-slate-900 dark:text-white">U Mya, Daw Hla <span className="text-slate-400 font-normal ml-1 text-xs">(Cohabiting)</span></p>
                                                            <div className="mt-1.5">
                                                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded dark:bg-emerald-900/20 dark:text-emerald-400 border dark:border-emerald-800/30 text-[10px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 border-emerald-100">
                                                                    <span className="material-symbols-outlined text-[12px]">check</span> Eligible for Tax Relief
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="w-full h-px bg-slate-50 dark:bg-slate-800/50"></div>
                                            <div className="flex flex-col sm:flex-row gap-4 items-baseline">
                                                <p className="w-full sm:w-[180px] sm:min-w-[180px] shrink-0 text-sm font-medium text-slate-500 dark:text-slate-400">Children</p>
                                                <div className="flex-1">
                                                    <p className="text-sm text-slate-400 italic">No children registered</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-[#182130] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col hover:border-indigo-300/50 transition-colors">
                                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center justify-center size-9 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600">
                                                    <span className="material-symbols-outlined text-[20px]">contact_phone</span>
                                                </div>
                                                <h3 className="text-base font-bold text-slate-900 dark:text-white">Emergency Contact</h3>
                                            </div>
                                            <button onClick={() => setActiveModal('add_emergency_contact')} className="text-xs font-medium text-[#4F46E5] hover:text-indigo-800 hover:underline">Add</button>
                                        </div>
                                        <div className="p-6 space-y-4">
                                            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 font-semibold text-sm">MM</div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900 dark:text-white">Maung Maung</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">Brother</p>
                                                    </div>
                                                </div>
                                                <a className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-sm font-semibold text-primary hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-primary/30 transition-colors shadow-sm" href="tel:09455500000">
                                                    <span className="material-symbols-outlined text-[16px]">call</span>
                                                    09-4555...
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'Documents' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
                                {employee.documents.map(doc => (
                                    <div key={doc.id} className="bg-white dark:bg-[#182130] rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col group cursor-pointer hover:border-[#4F46E5] transition-colors relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-2">
                                            {(doc as any).privacy === 'Admin Only' && (
                                                <span className="material-symbols-outlined text-rose-500 text-[18px]" title="Admin Only Access">lock</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className={`size-12 rounded-lg flex items-center justify-center ${
                                                (doc as any).category === 'CV' ? 'bg-indigo-50 text-[#4F46E5]' :
                                                (doc as any).category === 'Contract' ? 'bg-emerald-50 text-emerald-600' :
                                                (doc as any).category === 'Performance Review' ? 'bg-amber-50 text-amber-600' :
                                                (doc as any).category === 'Job Activity' ? 'bg-cyan-50 text-cyan-600' :
                                                'bg-slate-50 text-slate-500'
                                            }`}>
                                                <span className="material-symbols-outlined text-[24px]">
                                                    {(doc as any).category === 'CV' ? 'description' : 
                                                     (doc as any).category === 'Contract' ? 'history_edu' : 
                                                     (doc as any).category === 'Performance Review' ? 'grade' : 
                                                     (doc as any).category === 'Job Activity' ? 'work_history' :
                                                     'picture_as_pdf'}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-slate-900 dark:text-white line-clamp-1">{doc.name}</h4>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{(doc as any).category || 'Standard'}</span>
                                                    <span className="text-[10px] text-slate-300">•</span>
                                                    <p className="text-[10px] font-medium text-slate-500">{doc.date}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-auto flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30 -mx-5 -mb-5 p-3 px-5 border-t border-slate-100 dark:border-slate-800">
                                            <span className="text-[10px] font-medium text-slate-400 italic">By: {(doc as any).uploadedBy || 'System'}</span>
                                            <button className="text-xs font-bold text-[#4F46E5] flex items-center gap-1 hover:underline">
                                                Preview <span className="material-symbols-outlined text-[16px]">visibility</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {employee.documents.length === 0 && (
                                    <div className="col-span-1 md:col-span-3 w-full h-48 bg-slate-50 dark:bg-slate-800/30 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center">
                                        <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">folder_open</span>
                                        <p className="text-slate-500 font-medium">No documents natively linked to this profile yet.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'Assets' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                                {assignedAssets.map(asset => (
                                    <div key={asset.id} className="bg-white dark:bg-[#182130] rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col group hover:border-[#4F46E5] transition-colors relative overflow-hidden">
                                        <div className="absolute right-0 top-0 p-3">
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-widest ${asset.status === 'In Use' ? 'bg-indigo-50 text-[#4F46E5] border border-indigo-100' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}>
                                                {asset.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 mb-4 mt-2">
                                            <div className="size-12 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 flex items-center justify-center border border-slate-100 dark:border-slate-700">
                                                <span className="material-symbols-outlined text-[24px]">{asset.icon}</span>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 dark:text-white line-clamp-1">{asset.model}</h4>
                                                <p className="text-[11px] font-mono font-medium text-slate-500">{asset.id} • {asset.category}</p>
                                            </div>
                                        </div>
                                        <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[11px] font-semibold text-slate-500">
                                            <div className="flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[14px]">event</span>
                                                Audited: {asset.lastAuditDate}
                                            </div>
                                            <span className="font-mono text-slate-700 dark:text-white">${asset.value.toLocaleString()}</span>
                                        </div>
                                        {asset.isDeductible && (
                                            <div className="absolute bottom-0 right-0 p-1">
                                               <span className="material-symbols-outlined text-amber-500 text-[14px]" title="Flagged for Payroll Deduction">money_off</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {assignedAssets.length === 0 && (
                                    <div className="col-span-1 md:col-span-3 w-full h-48 bg-slate-50 dark:bg-slate-800/30 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center">
                                        <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">devices_off</span>
                                        <p className="text-slate-500 font-medium">No company assets currently assigned to this profile.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'Job & Pay' && !isVaultUnlocked && (
                            <div className="flex flex-col items-center justify-center py-20 animate-fade-in bg-white dark:bg-[#182130] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm px-6">
                                <div className="size-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                                    <span className="material-symbols-outlined text-[32px] text-slate-400">lock</span>
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Double-Lock Vault</h3>
                                <p className="text-sm text-slate-500 text-center max-w-[280px] mb-8 leading-relaxed">Accessing sensitive salary and financial details requires secondary authorization to prevent unauthorized screen-peeking.</p>
                                
                                <div className="w-full max-w-[240px] space-y-4 flex flex-col items-center">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center w-full">Admin Verification Code</p>
                                    <input 
                                        type="password" 
                                        value={vaultPin}
                                        onChange={e => { setVaultPin(e.target.value); setVaultError(''); }}
                                        onKeyDown={e => e.key === 'Enter' && handleUnlockVault()}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-center text-lg tracking-[0.5em] focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent outline-none font-mono"
                                        placeholder="••••"
                                        maxLength={10}
                                    />
                                    {vaultError && <p className="text-xs text-red-500 font-bold">{vaultError}</p>}
                                    <button 
                                        onClick={handleUnlockVault}
                                        className="w-full py-3.5 bg-slate-900 hover:bg-black text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded-xl font-bold shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">key</span> Unlock Records
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'Job & Pay' && isVaultUnlocked && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in relative">
                                <div className="absolute -top-3 right-0 -translate-y-full flex justify-end pb-3 z-10 w-full animate-fade-in">
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border border-emerald-100 dark:border-emerald-800/50 rounded-lg shadow-sm">
                                        <span className="material-symbols-outlined text-[16px]">lock_open</span>
                                        <span className="text-xs font-bold uppercase tracking-wider">Vault Unlocked</span>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-[#182130] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center justify-center size-9 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-[#4F46E5]">
                                                <span className="material-symbols-outlined text-[20px]">payments</span>
                                            </div>
                                            <h3 className="text-base font-bold text-slate-900 dark:text-white">Compensation</h3>
                                        </div>
                                        <button onClick={() => { setIsReadOnly(false); setActiveModal('salary_update'); }} className="text-xs font-medium text-[#4F46E5] hover:text-indigo-800 hover:underline">Edit</button>
                                    </div>
                                    <div className="p-6 space-y-6">
                                        <div className="flex flex-col sm:flex-row gap-4 items-baseline">
                                            <p className="w-full sm:w-[180px] sm:min-w-[180px] shrink-0 text-sm font-medium text-slate-500 dark:text-slate-400">Base Salary</p>
                                            <div className="flex-1">
                                                <p className="text-lg font-bold text-slate-900 dark:text-white">{(employee.baseSalary || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400 ml-1">MMK / Month</span></p>
                                            </div>
                                        </div>
                                        <div className="w-full h-px bg-slate-50 dark:bg-slate-800/50"></div>
                                        
                                        {/* Salary History Table */}
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Salary History</h4>
                                                <span className="text-[10px] text-slate-400">Showing last 5 changes</span>
                                            </div>
                                            <div className="overflow-hidden border border-slate-100 dark:border-slate-800 rounded-lg">
                                                <table className="w-full text-left text-xs">
                                                    <thead>
                                                        <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase font-bold">
                                                            <th className="px-4 py-2.5">Date</th>
                                                            <th className="px-4 py-2.5">Change</th>
                                                            <th className="px-4 py-2.5">Reason</th>
                                                            <th className="px-4 py-2.5">By</th>
                                                            <th className="px-4 py-2.5 text-center">Doc</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                                        {employee.salaryHistory && employee.salaryHistory.length > 0 ? (
                                                            employee.salaryHistory.slice(0, 5).map(entry => (
                                                                <tr key={entry.date + entry.newSalary} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                                    <td className="px-4 py-3 font-medium text-slate-600 dark:text-slate-400">{entry.date}</td>
                                                                    <td className="px-4 py-3">
                                                                        <div className="flex flex-col">
                                                                            <span className="font-bold text-slate-900 dark:text-white">{entry.newSalary.toLocaleString()}</span>
                                                                            <span className="text-[10px] text-slate-400 line-through">{entry.oldSalary.toLocaleString()}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-slate-500 truncate max-w-[150px]">{entry.reason}</td>
                                                                    <td className="px-4 py-3 text-slate-500">{entry.approvedBy}</td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        <button className="text-slate-300 hover:text-red-500 transition-colors" title="View Attachment (Protected)">
                                                                            <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr>
                                                                <td colSpan={5} className="px-4 py-6 text-center text-slate-400 italic">No previous salary adjustments found.</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-[#182130] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600">
                                                <span className="material-symbols-outlined text-[20px]">account_balance</span>
                                            </div>
                                            <h3 className="text-base font-bold text-slate-900 dark:text-white">Financial Details</h3>
                                        </div>
                                        <button onClick={() => setActiveModal('edit_bank_details')} className="text-xs font-medium text-[#4F46E5] hover:text-indigo-800 hover:underline">Edit</button>
                                    </div>
                                    <div className="p-6 space-y-6">
                                        <div className="flex flex-col sm:flex-row gap-4 items-baseline">
                                            <p className="w-full sm:w-[180px] sm:min-w-[180px] shrink-0 text-sm font-medium text-slate-500 dark:text-slate-400">Bank Name</p>
                                            <div className="flex-1">
                                                <p className={`text-sm font-semibold ${employee.bankName ? 'text-slate-900 dark:text-white' : 'text-red-500 italic'}`}>
                                                    {employee.bankName || 'Missing - Required for Disbursement'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="w-full h-px bg-slate-50 dark:bg-slate-800/50"></div>
                                        <div className="flex flex-col sm:flex-row gap-4 items-baseline">
                                            <p className="w-full sm:w-[180px] sm:min-w-[180px] shrink-0 text-sm font-medium text-slate-500 dark:text-slate-400">Account Number</p>
                                            <div className="flex-1">
                                                <p className={`text-sm font-semibold font-mono ${employee.accountNumber ? 'text-slate-900 dark:text-white' : 'text-red-500 italic'}`}>
                                                    {employee.accountNumber || 'Missing'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="w-full h-px bg-slate-50 dark:bg-slate-800/50"></div>
                                        <div className="flex flex-col sm:flex-row gap-4 items-baseline">
                                            <p className="w-full sm:w-[180px] sm:min-w-[180px] shrink-0 text-sm font-medium text-slate-500 dark:text-slate-400">Branch Name</p>
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold text-slate-900 dark:text-white">{employee.bankBranch || '-'}</p>
                                            </div>
                                        </div>
                                        <div className="w-full h-px bg-slate-50 dark:bg-slate-800/50"></div>
                                        <div className="flex flex-col sm:flex-row gap-4 items-baseline">
                                            <p className="w-full sm:w-[180px] sm:min-w-[180px] shrink-0 text-sm font-medium text-slate-500 dark:text-slate-400">Branch Code</p>
                                            <div className="flex-1">
                                                <p className={`text-sm font-semibold font-mono ${employee.bankBranchCode ? 'text-slate-900 dark:text-white' : 'text-red-500 italic'}`}>
                                                    {employee.bankBranchCode || 'Missing - Required for KBZ/CB'}
                                                </p>
                                                <p className="text-[10px] text-slate-400 mt-1">Mandatory for corporate bulk upload portals.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeTab === 'Movement' && (
                            <div className="grid grid-cols-1 gap-6 animate-fade-in">
                                <div className="bg-[#FFFFFF] dark:bg-[#182130] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center justify-center size-9 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-[#4F46E5]">
                                                <span className="material-symbols-outlined text-[20px]">history_toggle_off</span>
                                            </div>
                                            <div>
                                                <h3 className="text-base font-bold text-slate-900 dark:text-white">Movement & Audit Trail</h3>
                                                <p className="text-xs text-slate-500">Official log of role, compensation, and structural changes</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            {['All', 'Job Changes', 'Financial Adjustments'].map(filter => (
                                                <button
                                                    key={filter}
                                                    onClick={() => setMovementFilter(filter as any)}
                                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${movementFilter === filter ? 'bg-[#4F46E5] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'}`}
                                                >
                                                    {filter}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="p-6 pt-8">
                                        <div className="relative border-l border-slate-200 dark:border-slate-700 ml-4 space-y-10 pb-4">
                                            {(() => {
                                                const historyItems = [...(employee.employmentHistory || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                                                
                                                let filteredHistory: any[] = historyItems;
                                                if (movementFilter === 'Job Changes') {
                                                    filteredHistory = historyItems.filter(h => ['Promotion', 'Transfer', 'Hired', 'Resignation'].includes(h.type));
                                                } else if (movementFilter === 'Financial Adjustments') {
                                                    const rawAdjustments = historyItems.filter(h => h.type === 'Adjustment');
                                                    
                                                    // Group by month
                                                    const grouped = rawAdjustments.reduce((acc, curr) => {
                                                        const monthYear = getFormattedDate(curr.date, 'short').split(' ').slice(1).join(' '); // Simple fallback to avoid complex Intl grouping here if needed, or just use Intl directly but via helper
                                                        const cleanMonthYear = getFormattedDate(curr.date, 'long').split(',')[0].split(' ').slice(1).join(' '); // "Oct 2023"
                                                        if (!acc[cleanMonthYear]) acc[cleanMonthYear] = [];
                                                        acc[cleanMonthYear].push(curr);
                                                        return acc;
                                                    }, {} as Record<string, typeof historyItems>);
                                                    
                                                    filteredHistory = Object.entries(grouped).map(([month, items]) => ({
                                                        id: `GROUP-${month}`,
                                                        date: items[0].date,
                                                        type: 'Adjustment Group',
                                                        detail: `Monthly Financial Adjustments — ${month}`,
                                                        isGroup: true,
                                                        items
                                                    }));
                                                }

                                                if (filteredHistory.length === 0) {
                                                    return (
                                                        <div className="ml-8 py-8 text-center text-slate-500">
                                                            <span className="material-symbols-outlined text-[32px] mb-2 opacity-50">history</span>
                                                            <p className="text-sm">No movement records found for this category.</p>
                                                        </div>
                                                    );
                                                }

                                                return filteredHistory.map((item, index) => {
                                                    // Determine visual styling based on type
                                                    let icon = 'work';
                                                    let iconBg = 'bg-slate-100 text-slate-600';
                                                    if (item.type === 'Promotion') { icon = 'trending_up'; iconBg = 'bg-emerald-100 text-emerald-600'; }
                                                    else if (item.type === 'Transfer') { icon = 'swap_horiz'; iconBg = 'bg-blue-100 text-blue-600'; }
                                                    else if (item.type === 'Adjustment' || item.type === 'Adjustment Group') { icon = 'payments'; iconBg = 'bg-amber-100 text-amber-600'; }
                                                    else if (item.type === 'Resignation') { icon = 'logout'; iconBg = 'bg-red-100 text-red-600'; }

                                                    return (
                                                        <div key={item.id || index} className="relative pl-10 animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                                                            {/* Timeline Node */}
                                                            <div className={`absolute -left-5 top-0 size-10 rounded-xl flex items-center justify-center border-2 border-white dark:border-[#182130] shadow-sm ${iconBg}`}>
                                                                <span className="material-symbols-outlined text-[18px]">{icon}</span>
                                                            </div>
                                                            
                                                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 p-5">
                                                                <div className="flex justify-between items-start mb-3">
                                                                    <div>
                                                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                                            {item.type}
                                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-500">
                                                                                {item.date}
                                                                            </span>
                                                                        </h4>
                                                                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{item.detail}</p>
                                                                    </div>
                                                                </div>

                                                                {/* Handle grouped adjustments */}
                                                                {item.isGroup && (
                                                                    <div className="mt-4 space-y-2 border-t border-slate-200/50 pt-3">
                                                                        {item.items.map((sub: any, i: number) => (
                                                                            <div key={i} className="flex justify-between items-center bg-white p-2 rounded border border-slate-100 text-xs">
                                                                                <span className="text-slate-600">{sub.detail}</span>
                                                                                <span className="font-mono font-medium text-slate-900">{sub.reason || 'Auto-synced'}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}

                                                                {/* Changes Badges rendering */}
                                                                {!item.isGroup && (item.oldRole || item.oldSalary || item.oldDept || item.oldLocation || item.reason) && (
                                                                    <div className="mt-4 flex flex-col gap-2">
                                                                        {/* Structural Changes (Neutral Blue) */}
                                                                        {(item.oldRole && item.oldRole !== item.newRole) && (
                                                                            <div className="inline-flex items-center gap-2 text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-100 w-fit">
                                                                                <span className="font-medium opacity-70">Role:</span>
                                                                                <span className="line-through opacity-70">{item.oldRole}</span>
                                                                                <span className="material-symbols-outlined text-[14px]">arrow_right_alt</span>
                                                                                <span className="font-bold">{item.newRole}</span>
                                                                            </div>
                                                                        )}
                                                                        {(item.oldDept && item.oldDept !== item.newDept) && (
                                                                            <div className="inline-flex items-center gap-2 text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-100 w-fit">
                                                                                <span className="font-medium opacity-70">Dept:</span>
                                                                                <span className="line-through opacity-70">{item.oldDept}</span>
                                                                                <span className="material-symbols-outlined text-[14px]">arrow_right_alt</span>
                                                                                <span className="font-bold">{item.newDept}</span>
                                                                            </div>
                                                                        )}
                                                                        {(item.oldLocation && item.oldLocation !== item.newLocation) && (
                                                                            <div className="inline-flex items-center gap-2 text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-100 w-fit">
                                                                                <span className="font-medium opacity-70">Location:</span>
                                                                                <span className="line-through opacity-70">{item.oldLocation}</span>
                                                                                <span className="material-symbols-outlined text-[14px]">arrow_right_alt</span>
                                                                                <span className="font-bold">{item.newLocation}</span>
                                                                            </div>
                                                                        )}

                                                                        {/* Salary Changes (Red-to-Green logic) */}
                                                                        {(item.oldSalary && item.newSalary && item.oldSalary !== item.newSalary) && (
                                                                            <div className={`inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border w-fit ${item.newSalary > item.oldSalary ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                                                                <span className="font-medium opacity-70">Salary:</span>
                                                                                <span className="line-through opacity-70">{item.oldSalary.toLocaleString()}</span>
                                                                                <span className="material-symbols-outlined text-[14px]">arrow_right_alt</span>
                                                                                <span className="font-bold">{item.newSalary.toLocaleString()} MMK</span>
                                                                            </div>
                                                                        )}

                                                                        {/* Reason Box */}
                                                                        {item.reason && (
                                                                            <div className="mt-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded p-3 text-xs text-slate-600 dark:text-slate-400">
                                                                                <span className="font-bold text-slate-900 dark:text-white mr-1">Reason:</span> {item.reason}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {/* Exit Interview Placeholder */}
                                                                {item.type === 'Resignation' && (
                                                                    <div className="mt-3">
                                                                        <button disabled className="text-xs font-semibold text-slate-400 bg-slate-100 px-3 py-1.5 rounded border border-slate-200 cursor-not-allowed flex items-center gap-1.5 w-fit">
                                                                            <span className="material-symbols-outlined text-[14px]">description</span> View Exit Interview (Forms Library Pending)
                                                                        </button>
                                                                    </div>
                                                                )}

                                                                {/* Approved By Deep-Link Footer */}
                                                                {item.approvedBy && (
                                                                    <div className="mt-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                                                        <span className="material-symbols-outlined text-[12px]">verified_user</span>
                                                                        Approved By: 
                                                                        <Link 
                                                                            to={`/insights-dashboard?tab=inbox&search=${item.sourceId}`}
                                                                            className="text-[#4F46E5] hover:underline"
                                                                        >
                                                                            Admin {item.approvedBy}
                                                                        </Link>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeTab === 'Attendance' && (
                            <div className="bg-white dark:bg-[#182130] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-fade-in">
                                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[#4F46E5]">calendar_month</span>
                                            Monthly Attendance
                                        </h3>
                                        <p className="text-xs text-slate-500 font-medium mt-1">October 2023</p>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[800px]">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-slate-800/30 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                                <th className="px-6 py-3 border-b border-slate-200 dark:border-slate-800">Date</th>
                                                <th className="px-6 py-3 border-b border-slate-200 dark:border-slate-800">Scheduled Shift</th>
                                                <th className="px-6 py-3 border-b border-slate-200 dark:border-slate-800">Actual In / Out</th>
                                                <th className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 text-center">Status</th>
                                                <th className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 text-right">Total Hours</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Array.from({ length: 31 }, (_, i) => {
                                                const day = i + 1;
                                                const dateStr = `2023-10-${day.toString().padStart(2, '0')}`;
                                                const displayDate = `Oct ${day.toString().padStart(2, '0')}`;
                                                
                                                const assignment = shiftAssignments.find(sa => sa.empId === employee.id && sa.date === dateStr);
                                                const activeShiftId = assignment ? assignment.shiftId : employee.shiftId;
                                                const activeShift = assignment?.customStart ? null : shifts.find(s => s.id === activeShiftId);
                                                
                                                const displayShiftName = assignment?.customStart ? 'Ad-Hoc Custom Shift' : (activeShift?.name || 'Default');
                                                const displayShiftStart = assignment?.customStart || activeShift?.start;
                                                const displayShiftEnd = assignment?.customEnd || activeShift?.end;
                                                const displayWorkType = assignment?.workType || 'Regular';
                                                
                                                const log = attendanceLogs.find(l => l.empId === employee.id && l.date === dateStr);
                                                const isHoliday = holidays.some(h => h.date === dateStr);

                                                return (
                                                    <tr key={dateStr} className={`border-b border-slate-50 dark:border-slate-800/50 transition-colors group ${isHoliday ? 'bg-red-50/20 dark:bg-red-900/10 hover:bg-red-50/40 dark:hover:bg-red-900/20' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/20'}`}>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col gap-1 w-fit">
                                                                <p className="font-semibold text-slate-900 dark:text-white text-sm">{displayDate}</p>
                                                                {isHoliday && <span className="text-[10px] bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-800/50 uppercase tracking-widest flex items-center gap-0.5 shadow-sm"><span className="text-[11px]">🏝️</span> Holiday</span>}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div>
                                                                    <p className="font-medium text-slate-900 dark:text-white text-sm flex items-center gap-2">
                                                                        {displayShiftName}
                                                                        {assignment?.customStart && (
                                                                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${displayWorkType === 'Overtime' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`} title="Custom Work Type">{displayWorkType}</span>
                                                                        )}
                                                                        {assignment?.modifiedByHr && (
                                                                            <span className="bg-emerald-100 text-emerald-700 text-[9px] px-1.5 py-0.5 rounded font-bold" title="HR Modified">Modified</span>
                                                                        )}
                                                                    </p>
                                                                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">{displayShiftStart} - {displayShiftEnd}</p>
                                                                </div>
                                                                <button 
                                                                    onClick={() => {
                                                                        setEditingDate(dateStr);
                                                                        setEditingShiftId(activeShiftId);
                                                                        setEditingReason('');
                                                                        if (isHoliday) setCustomWorkType('Overtime');
                                                                        else setCustomWorkType('Regular');
                                                                        setActiveModal('edit_schedule');
                                                                    }}
                                                                    className="p-1.5 rounded bg-slate-100 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-all border border-transparent hover:border-indigo-100"
                                                                >
                                                                    <span className="material-symbols-outlined text-[16px]">edit_calendar</span>
                                                                </button>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 font-mono">
                                                            {log ? (
                                                                <div className="flex items-center gap-2 group/btn">
                                                                    <span className="text-emerald-600 font-bold">{log.checkIn}</span>
                                                                    <span className="text-slate-300">-</span>
                                                                    <span className={log.checkOut === '-- : --' ? 'text-red-500 font-bold' : 'font-bold'}>{log.checkOut}</span>
                                                                    {log.isManual && (
                                                                        <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded font-bold border border-slate-200 shadow-sm flex items-center gap-1 ml-2" title="Manual Entry">
                                                                            <span className="text-[12px]">✍️</span> Manual
                                                                        </span>
                                                                    )}
                                                                    {log.checkInMethod === '🤖 Auto' && (
                                                                        <span className="bg-indigo-50 text-indigo-700 text-[10px] px-2 py-0.5 rounded font-bold border border-indigo-100 shadow-sm flex items-center gap-1 ml-2" title="System Generated via Auto Attendance Policy">
                                                                            <span className="text-[12px]">🤖</span> Auto
                                                                        </span>
                                                                    )}
                                                                    {log.checkInMethod === 'Biometric' && (
                                                                        <span className="bg-emerald-50 text-emerald-700 text-[10px] px-2 py-0.5 rounded font-bold border border-emerald-100 shadow-sm flex items-center gap-1 ml-2" title="Physical Presence Verified via Terminal">
                                                                            <span className="material-symbols-outlined text-[14px]">fingerprint</span> Biometric
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-2 group/btn animate-fade-in">
                                                                    <span className="text-slate-300">-- : --</span>
                                                                    <button 
                                                                        onClick={() => {
                                                                            setEditingDate(dateStr);
                                                                            setEditingShiftId(activeShiftId);
                                                                            setEditingReason('');
                                                                            setCustomStartTime(activeShift?.start || '09:00');
                                                                            setCustomEndTime(activeShift?.end || '18:00');
                                                                            setManualCheckIn(activeShift?.start || '09:00');
                                                                            setManualCheckOut(activeShift?.end || '18:00');
                                                                            if (isHoliday) setCustomWorkType('Overtime');
                                                                            else setCustomWorkType('Regular');
                                                                            setActiveModal('add_hours');
                                                                        }}
                                                                        className="ml-2 w-7 h-7 bg-indigo-50 text-[#4F46E5] rounded-xl flex items-center justify-center opacity-0 group-hover/btn:opacity-100 transition-all hover:bg-[#4F46E5] hover:text-white shadow-sm border border-indigo-100 hover:border-transparent"
                                                                        title="Add Missing Hours"
                                                                    >
                                                                        <span className="material-symbols-outlined text-[16px]">add_circle</span>
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            {log ? (
                                                                <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold ${
                                                                    log.status === 'Present' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                                    log.status === 'Late' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                                                    log.status === 'Missing Out' ? 'bg-red-50 text-red-600 border border-red-100' :
                                                                    'bg-slate-100 text-slate-600 border border-slate-200'
                                                                }`}>
                                                                    {log.status === 'Late' && <span className="material-symbols-outlined text-[12px] mr-1">schedule</span>}
                                                                    {log.status}
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-300 text-[10px]">-</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <p className="font-semibold text-slate-900 dark:text-white text-sm font-mono">
                                                                {log && log.totalHours > 0 ? log.totalHours.toFixed(2) : '-'}
                                                            </p>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {activeTab === 'Leave' && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {Object.entries(employee.leaveBalances || {}).map(([type, balance]) => (
                                        <div key={type} className="bg-white dark:bg-[#182130] rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm relative overflow-hidden">
                                            <div className="absolute right-0 top-0 p-2 opacity-10">
                                                <span className="material-symbols-outlined text-4xl">
                                                    {type === 'Casual' ? 'beach_access' : type === 'Medical' ? 'medical_services' : 'event_available'}
                                                </span>
                                            </div>
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{type} Leave</p>
                                            <div className="flex items-end gap-2">
                                                <span className="text-3xl font-bold text-slate-900 dark:text-white">{balance}</span>
                                                <span className="text-sm text-slate-500 mb-1">Days Remaining</span>
                                            </div>
                                            <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800">
                                                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${(balance / 15) * 100}%` }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl border border-dashed border-indigo-200 dark:border-indigo-800 p-5 flex flex-col items-center justify-center text-center">
                                        <button 
                                            onClick={() => setActiveModal('adjust_balance')}
                                            className="size-10 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none mb-3 hover:scale-110 transition-transform"
                                        >
                                            <span className="material-symbols-outlined">add</span>
                                        </button>
                                        <p className="text-sm font-bold text-indigo-700 dark:text-indigo-400">Adjust Balance</p>
                                        <p className="text-[10px] text-indigo-500 mt-1">Authorized Admins Only</p>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-[#182130] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                        <h3 className="font-bold text-slate-900 dark:text-white">Recent Leave History</h3>
                                        <button className="text-xs font-bold text-[#4F46E5] hover:underline">View All Requests</button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="text-[11px] font-bold text-slate-400 uppercase bg-slate-50/50 dark:bg-slate-800/50 tracking-wider">
                                                    <th className="px-6 py-3">Leave Type</th>
                                                    <th className="px-6 py-3">Dates</th>
                                                    <th className="px-6 py-3 text-center">Days</th>
                                                    <th className="px-6 py-3">Status</th>
                                                    <th className="px-6 py-3">Reason</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                                {/* Simulated localized history for this employee */}
                                                <tr>
                                                    <td className="px-6 py-4">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">CASUAL</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-xs font-semibold text-slate-600 dark:text-slate-300">Oct 18 - Oct 20, 2023</td>
                                                    <td className="px-6 py-4 text-xs font-bold text-slate-900 dark:text-white text-center">3</td>
                                                    <td className="px-6 py-4">
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600">
                                                            <span className="size-1.5 rounded-full bg-amber-500"></span> PENDING
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-xs text-slate-500 italic truncate max-w-[200px]">Family celebration</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab !== 'Overview' && activeTab !== 'Documents' && activeTab !== 'Assets' && activeTab !== 'Job & Pay' && activeTab !== 'Movement' && activeTab !== 'Leave' && (
                            <div className="w-full h-64 bg-slate-50 dark:bg-slate-800/30 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center animate-fade-in">
                                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">construction</span>
                                <p className="text-slate-500 font-medium">The {activeTab} view is currently under construction.</p>
                            </div>
                        )}

                    </div>
                </div>
            </main >

            {/* Simulated Generic User Action Modal */}
            {
                activeModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in px-4">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 relative">
                            {activeModal === 'deactivate' && (
                                <>
                                    {terminationError && (
                                        <div className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-300">
                                            <div className="size-16 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center mb-4 border-2 border-red-100 dark:border-red-900/30">
                                                <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-3xl">lock_person</span>
                                            </div>
                                            <h4 className="text-lg font-bold text-red-700 dark:text-red-400 mb-2 uppercase tracking-tight">Access Denied</h4>
                                            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                                                {terminationError}
                                            </p>
                                            <button 
                                                onClick={closeModal}
                                                className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg"
                                            >
                                                Acknowledge & Return
                                            </button>
                                        </div>
                                    )}
                                    <div className="p-10 text-center">
                                        <span className="material-symbols-outlined text-red-500 text-6xl mb-4 bg-red-50 dark:bg-red-900/20 rounded-full p-6">warning</span>
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-2">Terminate {employee.name}?</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-4 leading-relaxed">
                                            This action is immediate. All system access, biometric syncs, and payroll cycles will be suspended for <strong>{employee.id}</strong>.
                                        </p>
                                    </div>
                                    <div className="flex bg-slate-50 dark:bg-slate-800/50 text-sm font-semibold border-t border-slate-100 dark:border-slate-800">
                                        <button onClick={closeModal} className="flex-1 py-5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800 transition-colors">
                                            Cancel
                                        </button>
                                        <button 
                                            onClick={() => {
                                                const res = terminateEmployee(employee.id, 'ADM-001');
                                                if (res.success) closeModal();
                                                else setTerminationError(res.message);
                                            }}
                                            className="flex-1 py-5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">person_off</span>
                                            Yes, Terminate
                                        </button>
                                    </div>
                                </>
                            )}
                            
                            {activeModal === 'adjust_balance' && (
                                <>
                                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                        <h3 className="font-bold text-slate-900 dark:text-white">Adjust Leave Balance</h3>
                                        <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 transition-colors">
                                            <span className="material-symbols-outlined">close</span>
                                        </button>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Leave Type</label>
                                                <select 
                                                    value={adjustmentType}
                                                    onChange={(e) => setAdjustmentType(e.target.value)}
                                                    className="w-full text-sm p-3 border border-slate-200 rounded-lg bg-slate-50 dark:bg-slate-800 dark:border-slate-700"
                                                >
                                                    {Object.keys(employee.leaveBalances || {}).map(type => (
                                                        <option key={type} value={type}>{type}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Amount (+/-)</label>
                                                <input 
                                                    type="number" 
                                                    value={adjustmentAmount}
                                                    onChange={(e) => setAdjustmentAmount(parseFloat(e.target.value))}
                                                    className="w-full text-sm p-3 border border-slate-200 rounded-lg bg-slate-50 dark:bg-slate-800 dark:border-slate-700" 
                                                    placeholder="e.g. 1.0 or -0.5"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reason (Mandatory)</label>
                                            <textarea 
                                                value={adjustmentReason}
                                                onChange={(e) => setAdjustmentReason(e.target.value)}
                                                className="w-full text-sm p-3 border border-slate-200 rounded-lg bg-slate-50 dark:bg-slate-800 dark:border-slate-700" 
                                                rows={3}
                                                placeholder="Explain why this adjustment is being made..."
                                            />
                                        </div>
                                    </div>
                                    <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex justify-end gap-3">
                                        <button onClick={closeModal} className="px-5 py-2 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                            Cancel
                                        </button>
                                        <button 
                                            onClick={() => {
                                                const res = adjustLeaveBalance(employee.id, adjustmentType, adjustmentAmount, adjustmentReason, 'ADM-001');
                                                if (res.success) {
                                                    setAdjustmentAmount(0);
                                                    setAdjustmentReason('');
                                                    closeModal();
                                                } else {
                                                    alert(res.message);
                                                }
                                            }}
                                            className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 dark:shadow-none"
                                        >
                                            Apply Adjustment
                                        </button>
                                    </div>
                                </>
                            )}
                            
                            {activeModal === 'salary_update' && (
                                <>
                                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                        <h3 className="font-bold text-slate-900 dark:text-white">{isReadOnly ? 'Review Salary Adjustment' : 'Update Employee Salary'}</h3>
                                        <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 transition-colors">
                                            <span className="material-symbols-outlined">close</span>
                                        </button>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        {!isReadOnly && (
                                            <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg flex gap-3 items-start mb-4">
                                                <span className="material-symbols-outlined text-amber-600 text-[20px]">info</span>
                                                <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                                                    Changes will be sent to the **Centralized Inbox** for approval. The employee's base salary will only update once an administrator approves the request.
                                                </p>
                                            </div>
                                        )}
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Salary</label>
                                                <div className="p-3 border border-slate-200 rounded-lg bg-slate-50 dark:bg-slate-800 dark:border-slate-700 text-sm font-semibold text-slate-500">
                                                    {employee.baseSalary.toLocaleString()} MMK
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">New Salary</label>
                                                <input 
                                                    type="number" 
                                                    value={newSalary}
                                                    onChange={(e) => setNewSalary(parseInt(e.target.value))}
                                                    disabled={isReadOnly}
                                                    className="w-full text-sm p-3 border border-slate-200 rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700 font-bold text-indigo-600 focus:ring-2 focus:ring-indigo-500/20 outline-none" 
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Effective Date</label>
                                            <input 
                                                type="date" 
                                                value={effectiveDate}
                                                onChange={(e) => setEffectiveDate(e.target.value)}
                                                disabled={isReadOnly}
                                                className="w-full text-sm p-3 border border-slate-200 rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700 outline-none" 
                                            />
                                        </div>
                                        
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reason for Change</label>
                                            <textarea 
                                                value={salaryReason}
                                                onChange={(e) => setSalaryReason(e.target.value)}
                                                disabled={isReadOnly}
                                                className="w-full text-sm p-3 border border-slate-200 rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700 outline-none resize-none" 
                                                rows={3}
                                                placeholder="e.g. Annual Performance Review, Promotion to Senior Lead..."
                                            />
                                        </div>

                                        {isReadOnly && (
                                            <div className="pt-2">
                                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-indigo-50 text-indigo-600 text-[10px] font-bold border border-indigo-100">
                                                    <span className="material-symbols-outlined text-[14px]">lock</span> READ-ONLY REVIEW MODE
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex justify-end gap-3">
                                        <button onClick={closeModal} className="px-5 py-2 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                            {isReadOnly ? 'Close' : 'Cancel'}
                                        </button>
                                        {!isReadOnly && (
                                            <button 
                                                onClick={() => {
                                                    addJobActivityChange({
                                                        empId: employee.id,
                                                        name: employee.name,
                                                        type: 'Adjustment',
                                                        detail: salaryReason || `Salary adjustment to ${newSalary.toLocaleString()} MMK`,
                                                        effectiveDate,
                                                        priority: 'Medium',
                                                        category: 'Staffing',
                                                        newSalary,
                                                        oldSalary: employee.baseSalary
                                                    });
                                                    closeModal();
                                                }}
                                                disabled={!newSalary || !effectiveDate}
                                                className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 dark:shadow-none disabled:opacity-50"
                                            >
                                                Submit for Approval
                                            </button>
                                        )}
                                    </div>
                                </>
                            )}

                            {activeModal === 'edit_schedule' && (
                                <>
                                    <div className="p-6">
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[#4F46E5]">update</span>
                                            Edit Schedule
                                        </h3>
                                        <p className="text-xs text-slate-500 mb-6 font-medium">Date: <span className="font-bold text-slate-700 dark:text-slate-300">{editingDate && getFormattedDate(editingDate, 'short')}</span></p>
                                        
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 mb-1.5 block uppercase tracking-wider">Select New Shift</label>
                                                <select 
                                                    value={editingShiftId} 
                                                    onChange={e => setEditingShiftId(e.target.value)}
                                                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-[#4F46E5] outline-none transition-all shadow-sm"
                                                >
                                                    {shifts.map(s => (
                                                        <option key={s.id} value={s.id}>{s.name} ({s.start} - {s.end})</option>
                                                    ))}
                                                    <option value="CUSTOM" className="font-bold text-[#4F46E5]">⚙️ Custom Time Integration...</option>
                                                </select>
                                                {editingShiftId !== 'CUSTOM' && (
                                                    <p className="text-[10px] text-slate-400 mt-1">Schedules are tied to the exact payroll decimal thresholds.</p>
                                                )}
                                            </div>

                                            {editingShiftId === 'CUSTOM' && (
                                                <div className="grid grid-cols-2 gap-4 animate-fade-in bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                                                    <div>
                                                        <label className="text-[10px] font-black text-[#4F46E5] mb-1.5 block uppercase tracking-wider">Start Time</label>
                                                        <input 
                                                            type="time" 
                                                            value={customStartTime} 
                                                            onChange={e => setCustomStartTime(e.target.value)}
                                                            className="w-full px-3 py-2 border border-[#4F46E5]/30 focus:border-[#4F46E5] bg-white dark:bg-slate-800 rounded-md text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-[#4F46E5] outline-none transition-all"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black text-[#4F46E5] mb-1.5 block uppercase tracking-wider">End Time</label>
                                                        <input 
                                                            type="time" 
                                                            value={customEndTime} 
                                                            onChange={e => setCustomEndTime(e.target.value)}
                                                            className="w-full px-3 py-2 border border-[#4F46E5]/30 focus:border-[#4F46E5] bg-white dark:bg-slate-800 rounded-md text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-[#4F46E5] outline-none transition-all"
                                                        />
                                                    </div>
                                                    <div className="col-span-2 mt-1">
                                                        <label className="text-[10px] font-black text-[#4F46E5] mb-2 block uppercase tracking-wider">Work Type Classification</label>
                                                        <div className="flex bg-white dark:bg-[#0B1120] rounded-lg p-1 border border-[#4F46E5]/20">
                                                            <button 
                                                                onClick={() => setCustomWorkType('Regular')}
                                                                className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${customWorkType === 'Regular' ? 'bg-[#4F46E5] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                                            >
                                                                Regular Shift
                                                            </button>
                                                            <button 
                                                                onClick={() => setCustomWorkType('Overtime')}
                                                                className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${customWorkType === 'Overtime' ? 'bg-[#4F46E5] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                                            >
                                                                Pre-Approved OT
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 mb-1.5 block uppercase tracking-wider">Reason for Modification (Audit Trail)</label>
                                                <textarea 
                                                    value={editingReason}
                                                    onChange={e => setEditingReason(e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-sm min-h-[80px] focus:ring-2 focus:ring-[#4F46E5] outline-none resize-none transition-all shadow-sm"
                                                    placeholder="Required for HR Inspection Log (e.g. Granted grace period, ad-hoc custom hours)..."
                                                />
                                            </div>
                                        </div>
                                        <div className="mt-5 p-3 bg-amber-50 border border-amber-100 rounded-lg flex items-start gap-3">
                                            <span className="material-symbols-outlined text-amber-500 text-[18px]">info</span>
                                            <p className="text-[10px] text-amber-700 font-bold leading-relaxed">
                                                Modifying this shift will trigger <span className="underline">Retroactive Recalculation</span>. Any existing punch-in times for this date will be re-evaluated against the new parameters, potentially altering Late/OT statuses immediately.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/30">
                                        <button onClick={closeModal} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button>
                                        <button 
                                            onClick={() => {
                                                if (editingDate && editingShiftId) {
                                                    if (editingShiftId === 'CUSTOM') {
                                                        assignShift(employee.id, editingDate, 'CUSTOM', editingReason || 'System override by HR admin (Custom Shift)', 'ADM-001', customStartTime, customEndTime, customWorkType);
                                                    } else {
                                                        assignShift(employee.id, editingDate, editingShiftId, editingReason || 'System override by HR admin', 'ADM-001');
                                                    }
                                                }
                                                closeModal();
                                            }}
                                            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#4F46E5] shadow-lg shadow-[#4F46E5]/20 hover:bg-[#4338CA] transition-all"
                                        >
                                            Confirm Retroactive Edit
                                        </button>
                                    </div>
                                </>
                            )}

                            {activeModal === 'add_hours' && (
                                <>
                                    <div className="p-6">
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-white bg-[#4F46E5] p-1.5 rounded-lg shadow-sm text-[20px]">add_circle</span>
                                            Add Missing Hours
                                        </h3>
                                        <p className="text-xs text-slate-500 mb-6 font-medium">Date: <span className="font-bold text-slate-700 dark:text-slate-300">{editingDate && new Date(editingDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span></p>
                                        
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 mb-1.5 block uppercase tracking-wider">Apply Standard Shift Template (Auto-Fill)</label>
                                                <select 
                                                    value={editingShiftId} 
                                                    onChange={e => {
                                                        const sid = e.target.value;
                                                        setEditingShiftId(sid);
                                                        const sObj = shifts.find(s => s.id === sid);
                                                        if (sObj) {
                                                            setCustomStartTime(sObj.start);
                                                            setCustomEndTime(sObj.end);
                                                            setManualCheckIn(sObj.start);
                                                            setManualCheckOut(sObj.end);
                                                        }
                                                    }}
                                                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-[#4F46E5] outline-none transition-all shadow-sm"
                                                >
                                                    <option value="" disabled>-- Select Shift Template --</option>
                                                    {shifts.map(s => (
                                                        <option key={s.id} value={s.id}>{s.name} ({s.start} - {s.end})</option>
                                                    ))}
                                                    <option value="CUSTOM" className="font-bold text-[#4F46E5]">⚙️ Custom Time Integration...</option>
                                                </select>
                                                <p className="text-[10px] text-slate-400 mt-1">Selecting a template auto-populates Actual In/Out times for convenience.</p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 animate-fade-in bg-indigo-50/50 dark:bg-slate-800/50 p-3 rounded-lg border border-indigo-100 dark:border-slate-700">
                                                <div className="col-span-2 mb-1 border-b border-indigo-100 dark:border-slate-700 pb-2">
                                                    <h4 className="text-[11px] font-black text-[#4F46E5] dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[14px]">edit_note</span> Actual Punches 
                                                    </h4>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-[#4F46E5] mb-1.5 block uppercase tracking-wider">Actual Check-In</label>
                                                    <input 
                                                        type="time" 
                                                        value={manualCheckIn} 
                                                        onChange={e => setManualCheckIn(e.target.value)}
                                                        className="w-full px-3 py-2 border border-[#4F46E5]/30 focus:border-[#4F46E5] bg-white dark:bg-slate-800 rounded-md text-sm font-bold text-emerald-600 dark:text-emerald-400 focus:ring-2 focus:ring-[#4F46E5] outline-none transition-all"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-[#4F46E5] mb-1.5 block uppercase tracking-wider">Actual Check-Out</label>
                                                    <input 
                                                        type="time" 
                                                        value={manualCheckOut} 
                                                        onChange={e => setManualCheckOut(e.target.value)}
                                                        className="w-full px-3 py-2 border border-[#4F46E5]/30 focus:border-[#4F46E5] bg-white dark:bg-slate-800 rounded-md text-sm font-bold text-emerald-600 dark:text-emerald-400 focus:ring-2 focus:ring-[#4F46E5] outline-none transition-all"
                                                    />
                                                </div>
                                            </div>

                                            {editingShiftId === 'CUSTOM' && (
                                                <div className="grid grid-cols-2 gap-4 animate-fade-in bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                                                    <div className="col-span-2 mb-1 border-b border-slate-200 dark:border-slate-700 pb-2 flex justify-between items-center">
                                                        <h4 className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">Ad-Hoc Schedule Bounds</h4>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black text-slate-500 mb-1.5 block uppercase tracking-wider">Schedule Start</label>
                                                        <input 
                                                            type="time" 
                                                            value={customStartTime} 
                                                            onChange={e => setCustomStartTime(e.target.value)}
                                                            className="w-full px-3 py-2 border border-slate-200 focus:border-slate-400 bg-white dark:bg-slate-800 rounded-md text-sm font-medium text-slate-700 dark:text-slate-200 outline-none transition-all"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black text-slate-500 mb-1.5 block uppercase tracking-wider">Schedule End</label>
                                                        <input 
                                                            type="time" 
                                                            value={customEndTime} 
                                                            onChange={e => setCustomEndTime(e.target.value)}
                                                            className="w-full px-3 py-2 border border-slate-200 focus:border-slate-400 bg-white dark:bg-slate-800 rounded-md text-sm font-medium text-slate-700 dark:text-slate-200 outline-none transition-all"
                                                        />
                                                    </div>
                                                    <div className="col-span-2 mt-1">
                                                        <label className="text-[10px] font-black text-slate-500 mb-2 block uppercase tracking-wider">Work Type Classification</label>
                                                        <div className="flex bg-white dark:bg-[#0B1120] rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                                                            <button 
                                                                onClick={() => setCustomWorkType('Regular')}
                                                                className={`flex-1 py-1.5 text-[11px] font-bold rounded-md transition-all ${customWorkType === 'Regular' ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                                            >
                                                                Regular Shift
                                                            </button>
                                                            <button 
                                                                onClick={() => setCustomWorkType('Overtime')}
                                                                className={`flex-1 py-1.5 text-[11px] font-bold rounded-md transition-all ${customWorkType === 'Overtime' ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                                            >
                                                                Pre-Approved OT
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 mb-1.5 block uppercase tracking-wider">Reason for Modification (Audit Trail)</label>
                                                <textarea 
                                                    value={editingReason}
                                                    onChange={e => setEditingReason(e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-sm min-h-[80px] focus:ring-2 focus:ring-[#4F46E5] outline-none resize-none transition-all shadow-sm"
                                                    placeholder="Required: e.g. 'Employee forgot to clock in; verified physically'..."
                                                />
                                            </div>
                                        </div>
                                        <div className="mt-5 p-3 bg-amber-50 border border-amber-100 rounded-lg flex items-start gap-3">
                                            <span className="material-symbols-outlined text-amber-500 text-[18px]">warning</span>
                                            <p className="text-[10px] text-amber-700 font-bold leading-relaxed">
                                                This action performs a <span className="underline">Dual-Write</span>. Both the target Shift Template and the missing Punches will be fully generated. Any records created will be permanently tagged with a <span className="bg-slate-100 text-slate-600 px-1 rounded border border-slate-200 border-b-2">✍️ Manual</span> badge for security inspections. Holiday Multipliers will be automatically enforced.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/30">
                                        <button onClick={closeModal} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button>
                                        <button 
                                            onClick={() => {
                                                if (editingDate && editingShiftId) {
                                                    const shiftToUse = editingShiftId === 'CUSTOM' ? 'CUSTOM' : editingShiftId;
                                                    addManualPunch(
                                                        employee.id, 
                                                        editingDate, 
                                                        shiftToUse, 
                                                        manualCheckIn, 
                                                        manualCheckOut, 
                                                        editingReason || 'System override by HR admin (Manual Punch)', 
                                                        'ADM-001', 
                                                        editingShiftId === 'CUSTOM' ? customStartTime : undefined, 
                                                        editingShiftId === 'CUSTOM' ? customEndTime : undefined, 
                                                        customWorkType
                                                    );
                                                }
                                                closeModal();
                                            }}
                                            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#4F46E5] shadow-lg shadow-[#4F46E5]/20 hover:bg-[#4338CA] transition-all flex items-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">save</span>
                                            Confirm Dual-Write
                                        </button>
                                    </div>
                                </>
                            )}
                            
                            {activeModal === 'edit_profile' && (
                                <>
                                    <div className="p-6">
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[#4F46E5] bg-indigo-50 p-1.5 rounded-lg">person_edit</span>
                                            Update Employee Profile
                                        </h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Full Name</label>
                                                <input 
                                                    type="text" 
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    className="w-full text-sm p-3 border border-slate-200 rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Department</label>
                                                    <select 
                                                        value={editDept}
                                                        onChange={(e) => setEditDept(e.target.value)}
                                                        className="w-full text-sm p-3 border border-slate-200 rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                                                    >
                                                        {systemSettings.departments.map(d => (
                                                            <option key={d.id} value={d.name}>{d.name} ({d.code})</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Job Role (Position)</label>
                                                    <select 
                                                        value={editRole}
                                                        onChange={(e) => setEditRole(e.target.value)}
                                                        className="w-full text-sm p-3 border border-slate-200 rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                                                    >
                                                        {systemSettings.positions.filter(p => !editDept || p.deptId === systemSettings.departments.find(d => d.name === editDept)?.id).map(p => (
                                                            <option key={p.id} value={p.name}>{p.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Office Location</label>
                                                <select 
                                                    value={editLocation}
                                                    onChange={(e) => setEditLocation(e.target.value)}
                                                    className="w-full text-sm p-3 border border-slate-200 rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                                                >
                                                    <option value="">-- No Location Assigned --</option>
                                                    {systemSettings.officeLocations.map(l => (
                                                        <option key={l.id} value={l.name}>{l.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex justify-end gap-3">
                                        <button onClick={closeModal} className="px-5 py-2 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                            Cancel
                                        </button>
                                        <button 
                                            onClick={() => {
                                                updateEmployee(employee.id, {
                                                    name: editName,
                                                    role: editRole,
                                                    dept: editDept,
                                                    officeLocation: editLocation as any
                                                });
                                                closeModal();
                                            }}
                                            className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none"
                                        >
                                            Save Changes
                                        </button>
                                    </div>
                                </>
                            )}
                            
                            {activeModal && !['deactivate', 'adjust_balance', 'edit_schedule', 'add_hours', 'salary_update', 'edit_profile'].includes(activeModal) && (
                                <div className="p-10 text-center">
                                    <span className="material-symbols-outlined text-slate-300 text-5xl mb-4">info</span>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white capitalize mb-1">{activeModal.replace(/_/g, ' ')}</h3>
                                    <p className="text-sm text-slate-500 mb-6">This feature is currently being synchronized with the new organizational infrastructure.</p>
                                    <button onClick={closeModal} className="px-6 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold hover:bg-slate-200 transition-colors">Close</button>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }
        </div>
    );
}
