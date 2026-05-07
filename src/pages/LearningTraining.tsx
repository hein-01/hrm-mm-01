import React, { useState, useMemo } from 'react';
import { TableVirtuoso } from 'react-virtuoso';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useAppData, Alert } from '../context/AppDataContext';

export default function LearningTraining() {
    const { 
        courses, setCourses, 
        certs, setCerts, 
        analytics, setAnalytics,
        renewCertification,
        assignCourseToDepartment,
        employees,
        setAlerts,
        completeCourse,
        alerts,
        addAuditLog,
        addTrainingCourse
    } = useAppData();

    // Top-Level Navigation State
    const [activeTab, setActiveTab] = useState('Overview');
    const [searchQuery, setSearchQuery] = useState('');

    // Derived Live KPIs
    // Derived Live KPIs from state
    const totalActiveCourses = courses.length;
    
    // Calculate Completion Rate across ALl Active Employees
    const activeEmployees = employees.filter(e => e.status === 'Active');
    const totalEnrollments = activeEmployees.reduce((sum, e) => sum + e.enrolledCourses.length, 0);
    const completedEnrollments = activeEmployees.reduce((sum, e) => sum + e.enrolledCourses.filter(ec => ec.status === 'Completed').length, 0);
    const avgCompletionRate = totalEnrollments ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0;
    
    const pendingEnrollments = totalEnrollments - completedEnrollments;
    const complianceLiabilitiesCount = alerts.filter(a => a.id.startsWith('CERT-RISK')).length;

    const totalTrainingInvestment = useMemo(() => {
        let sum = 0;
        employees.forEach(emp => {
            emp.enrolledCourses?.forEach(ec => {
                if (ec.status === 'Completed') {
                    const course = courses.find(c => c.id === ec.courseId);
                    if (course?.costPerHead) {
                        sum += course.costPerHead;
                    }
                }
            });
        });
        return sum;
    }, [employees, courses]);

    // Interaction States
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [activeRecord, setActiveRecord] = useState<any>(null);
    const [errorMsg, setErrorMsg] = useState('');

    // Reminder Action State
    const [isReminding, setIsReminding] = useState(false);
    const [remindSuccess, setRemindSuccess] = useState(false);
    const [manualNote, setManualNote] = useState('');
    const [manualGrade, setManualGrade] = useState('');
    
    // Create Course State
    const [newCourse, setNewCourse] = useState<Parameters<typeof addTrainingCourse>[0]>({
        name: '', category: 'Compliance', duration: '1.0 Hrs', isMandatory: false, expiryDays: 365, skillTags: [], provider: '', costPerHead: 0, minPassingScore: ''
    });
    const [skillInput, setSkillInput] = useState('');

    const handleCreateCourse = () => {
        if (!newCourse.name) return;
        addTrainingCourse(newCourse);
        setAlerts(prev => [{
            id: `NEW-COURSE-${Date.now()}`,
            type: 'success',
            message: `New curriculum "${newCourse.name}" has been published to the registry.`,
            timestamp: new Date().toLocaleTimeString(),
            isRead: false
        }, ...prev]);
        closeModals();
        setActiveTab('Course Catalog');
    };

    const handleRemindAll = () => {
        setIsReminding(true);
        setTimeout(() => {
            setIsReminding(false);
            setRemindSuccess(true);
            
            // Push Global Alert to Dashboard
            const newAlert: Alert = {
                id: `REMIND-${Date.now()}`,
                type: 'warning',
                message: `Compliance Reminders Dispatched: 15% of workforce notified for "Anti-Harassment Policy" training deadline.`,
                timestamp: new Date().toLocaleTimeString(),
                isRead: false
            };
            setAlerts(prev => [newAlert, ...prev]);

            setTimeout(() => setRemindSuccess(false), 3000);
        }, 1500);
    };

    // Course Action - Retire (with Soft Delete protection)
    const handleRetireAttempt = (course: any) => {
        if (course.isMandatory && course.enrolled > 0) {
            setErrorMsg(`Critical Constraint: Cannot soft-delete "${course.name}". It is structurally marked as 'Mandatory' for ${course.enrolled} active employees. You must clear these workforce dependencies first.`);
            setActiveModal('error');
            setOpenDropdownId(null);
            return;
        }
        // Proceed with retirement if safe
        setCourses(prev => prev.filter(c => c.id !== course.id));
        setOpenDropdownId(null);
    };

    const toggleDropdown = (id: string | null) => {
        setOpenDropdownId(openDropdownId === id ? null : id);
    };

    const closeModals = () => {
        setActiveModal(null);
        setActiveRecord(null);
        setErrorMsg('');
        setManualNote('');
        setNewCourse({ name: '', category: 'Compliance', duration: '1.0 Hrs', isMandatory: false, expiryDays: 365, skillTags: [] });
        setSkillInput('');
    };

    const handleManualComplete = () => {
        if (!manualNote.trim()) return;
        
        // 1. Call completeCourse for every enrolled employee in this course
        // This triggers the Compliance Auto-Heal logic (category-sensitive)
        const enrolledEmps = employees.filter(emp =>
            emp.enrolledCourses.some(ec => ec.courseId === activeRecord.id && ec.status !== 'Completed')
        );
        enrolledEmps.forEach(emp => {
            completeCourse(activeRecord.id, emp.id, manualGrade || 'Pass');
        });

        // 2. Audit entry for accountability
        addAuditLog({
            adminId: 'ADM-001',
            actionType: 'Manual Certification',
            module: 'Performance',
            detail: `Admin [Dwayne J.] authorized manual completion of "${activeRecord.name}" for ${enrolledEmps.length} employee(s). Reason: ${manualNote}`
        });

        // 3. Success alert
        setAlerts(prev => [{
            id: `MAN-CERT-${Date.now()}`,
            type: 'success',
            message: `Manual certification for '${activeRecord.name}' logged securely in audit registry. ${enrolledEmps.length} employee(s) updated.`,
            timestamp: new Date().toLocaleTimeString(),
            isRead: false
        }, ...prev]);

        closeModals();
    };

    // Sub-components for Tabs
    const renderOverview = () => (
        <div className="space-y-8 animate-fade-in">
            {/* Urgent Campaign Block */}
            <div className="bg-[#4F46E5]/5 dark:bg-[#4F46E5]/10 border border-[#4F46E5]/20 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-white dark:bg-[#4F46E5]/20 rounded-lg text-[#4F46E5] shadow-sm">
                        <span className="material-symbols-outlined">campaign</span>
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-900 dark:text-white">Anti-Harassment Policy Training</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">Mandatory annual compliance training for all employees globally. 85% completion reached. Please ensure the remaining 15% complete it before the statutory deadline.</p>
                    </div>
                </div>
                <button
                    onClick={handleRemindAll}
                    disabled={isReminding || remindSuccess}
                    className={`px-5 py-2.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all shadow-sm flex items-center gap-2 ${remindSuccess ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-[#4F46E5] hover:bg-[#4338CA] text-white disabled:opacity-75 disabled:cursor-wait'}`}
                >
                    {isReminding ? <><span className="material-symbols-outlined animate-spin text-[18px]">sync</span> Dispatching...</> :
                        remindSuccess ? <><span className="material-symbols-outlined text-[18px]">check</span> Reminders Sent!</> :
                            'Remind All Pending'}
                </button>
            </div>

            {/* Top Trending Courses Preview */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50">
                    <h4 className="font-bold text-slate-900 dark:text-white">Active Course Insights</h4>
                    <button onClick={() => setActiveTab('Course Catalog')} className="text-[#4F46E5] text-xs font-bold hover:underline transition-all">View Full Catalog</button>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {courses.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 4).map(course => (
                        <div key={course.id} className="border border-slate-100 dark:border-slate-800 rounded-lg p-4 hover:border-[#4F46E5]/30 transition-colors bg-white dark:bg-slate-900 flex justify-between items-center">
                            <div>
                                <h5 className="font-bold text-slate-900 dark:text-white">{course.name}</h5>
                                <p className="text-xs font-bold text-slate-400 mt-1">{course.category} • {course.duration}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold text-[#4F46E5]">{course.enrolled} Enrolled</p>
                                <p className="text-[10px] uppercase font-bold text-slate-400">Total Workforce</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderCourseCatalog = () => (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm animate-fade-in flex flex-col h-[600px]">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 shrink-0">
                <h4 className="font-bold text-slate-900 dark:text-white">Master Course Registry</h4>
                <button onClick={() => setActiveModal('create_course')} className="flex items-center gap-2 px-4 py-2 bg-[#4F46E5] hover:bg-indigo-600 text-white font-bold text-xs rounded-lg shadow-sm transition-all"><span className="material-symbols-outlined text-[16px]">add_circle</span> Create Training</button>
            </div>
            <div className="flex-1 overflow-hidden relative">
                <TableVirtuoso
                    className="w-full h-full absolute inset-0"
                    data={courses.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.category.toLowerCase().includes(searchQuery.toLowerCase()))}
                    components={{
                        Table: (props) => <table {...props} className="w-full text-left" />,
                        TableHead: React.forwardRef((props, ref) => <thead {...props} ref={ref as any} className="bg-[#F8FAFC] dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10" />),
                        TableRow: (props) => <tr {...props} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group border-b border-slate-100 dark:border-slate-800/50" />,
                        TableBody: React.forwardRef((props, ref) => <tbody {...props} ref={ref as any} className="" />)
                    }}
                    fixedHeaderContent={() => (
                        <tr>
                            <th className="px-6 py-4 text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-[#F8FAFC] dark:bg-slate-800/50">Course Curriculum</th>
                            <th className="px-6 py-4 text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-[#F8FAFC] dark:bg-slate-800/50">Category</th>
                            <th className="px-6 py-4 text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-[#F8FAFC] dark:bg-slate-800/50">Enrollment Fleet</th>
                            <th className="px-6 py-4 text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-[#F8FAFC] dark:bg-slate-800/50">Fleet Progress</th>
                            <th className="px-6 py-4 text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right bg-[#F8FAFC] dark:bg-slate-800/50">Actions</th>
                        </tr>
                    )}
                    itemContent={(index, course) => (
                        <>
                                <td className="px-6 py-4">
                                    <p className="text-sm font-bold text-slate-900 dark:text-slate-200 group-hover:text-[#4F46E5] transition-colors">{course.name}</p>
                                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{course.id} {course.isMandatory && <span className="text-red-500 font-bold ml-2 bg-red-50 px-1 py-0.5 rounded border border-red-100 dark:bg-red-900/20 dark:border-red-800">MANDATORY</span>}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 uppercase tracking-wider">{course.category}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{course.enrolled} active</p>
                                    <p className="text-[10px] font-medium text-slate-400">{course.duration} allocation</p>
                                </td>
                                <td className="px-6 py-4 w-56">
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                                            <div className="h-full bg-[#4F46E5] transition-all" style={{ width: `${course.progress}%` }}></div>
                                        </div>
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 w-8">{course.progress}%</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right relative">
                                    <button onClick={() => toggleDropdown(course.id)} className="text-slate-400 hover:text-[#4F46E5] p-1.5 rounded transition-colors bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 shadow-sm"><span className="material-symbols-outlined text-[20px]">more_vert</span></button>
                                    {openDropdownId === course.id && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setOpenDropdownId(null)}></div>
                                            <div className="absolute right-8 top-10 w-56 bg-white border border-slate-200 shadow-xl rounded-xl z-20 py-1 overflow-hidden animate-fade-in text-left">
                                                <button onClick={() => { setActiveRecord(course); setActiveModal('assign_team'); setOpenDropdownId(null); }} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-[#4F46E5] font-bold border-b border-slate-50">
                                                    <span className="material-symbols-outlined text-[18px]">group_add</span> Assign to Department
                                                </button>
                                                <button onClick={() => { setActiveRecord(course); setActiveModal('complete_manual'); setOpenDropdownId(null); }} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-emerald-600 hover:bg-emerald-50 font-bold border-b border-slate-50">
                                                    <span className="material-symbols-outlined text-[18px]">task_alt</span> Manual Completion
                                                </button>
                                                <button onClick={() => handleRetireAttempt(course)} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 font-bold transition-colors">
                                                    <span className="material-symbols-outlined text-[18px]">delete_forever</span> Retire Course
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </td>
                        </>
                    )}
                />
            </div>
        </div>
    );

    const renderCertifications = () => (
        <div className="animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {certs.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.employee.toLowerCase().includes(searchQuery.toLowerCase())).map(cert => (
                    <div key={cert.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <span className="material-symbols-outlined p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-[#4F46E5] rounded-xl">verified</span>
                                <span className={`text-[10px] font-bold px-2 py-1 rounded border uppercase tracking-widest ${cert.status === 'Valid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                        cert.status === 'Expiring Soon' ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse' :
                                            'bg-red-50 text-red-600 border-red-200'
                                    }`}>{cert.status}</span>
                            </div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-lg leading-tight">{cert.name}</h4>
                            <p className="text-sm font-bold text-slate-500 mt-2">{cert.employee}</p>
                        </div>
                        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Valid Until</p>
                                    <p className="text-sm font-bold text-slate-700">{cert.expiry}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#4F46E5]">Compliance Link</p>
                                    <p className="text-[11px] font-bold text-slate-600">{cert.complianceLink}</p>
                                </div>
                            </div>
                            {(cert.status === 'Expiring Soon' || cert.status === 'Expired') && (
                                <button onClick={() => { setActiveRecord(cert); setActiveModal('renew'); }} className="w-full py-2.5 bg-slate-900 hover:bg-black text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm">
                                    <span className="material-symbols-outlined text-[18px]">upload_file</span> Renew via Library
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderAnalytics = () => (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm animate-fade-in flex flex-col h-[600px]">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 shrink-0">
                <h4 className="font-bold text-slate-900 dark:text-white">Employee Progress Metrics</h4>
                <p className="text-xs font-bold text-slate-500">Synced to Profile 360 View</p>
            </div>
            <div className="flex-1 overflow-hidden relative">
                <TableVirtuoso
                    className="w-full h-full absolute inset-0"
                    data={employees.filter(e => e.status === 'Active' && e.name.toLowerCase().includes(searchQuery.toLowerCase()))}
                    components={{
                        Table: (props) => <table {...props} className="w-full text-left" />,
                        TableHead: React.forwardRef((props, ref) => <thead {...props} ref={ref as any} className="bg-[#F8FAFC] dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10" />),
                        TableRow: (props) => <tr {...props} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800/50" />,
                        TableBody: React.forwardRef((props, ref) => <tbody {...props} ref={ref as any} className="" />)
                    }}
                    fixedHeaderContent={() => (
                        <tr>
                            <th className="px-6 py-4 text-[11px] font-extrabold text-slate-500 uppercase tracking-widest bg-[#F8FAFC] dark:bg-slate-800/50">Workforce Member</th>
                            <th className="px-6 py-4 text-[11px] font-extrabold text-slate-500 uppercase tracking-widest bg-[#F8FAFC] dark:bg-slate-800/50">Department</th>
                            <th className="px-6 py-4 text-[11px] font-extrabold text-slate-500 uppercase tracking-widest bg-[#F8FAFC] dark:bg-slate-800/50">Global Completion</th>
                        </tr>
                    )}
                    itemContent={(index, emp) => {
                        const empProgress = emp.enrolledCourses.length ? Math.round((emp.enrolledCourses.filter(ec => ec.status === 'Completed').length / emp.enrolledCourses.length) * 100) : 0;
                        return (
                            <>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        {emp.avatar ? (
                                            <div className="size-8 rounded-full bg-cover bg-center shrink-0 border border-slate-200 shadow-sm" style={{ backgroundImage: `url("${emp.avatar}")` }}></div>
                                        ) : (
                                            <div className="size-8 rounded-full bg-indigo-50 text-[#4F46E5] flex items-center justify-center font-bold text-xs shrink-0 border border-indigo-100 shadow-sm">{emp.name.charAt(0)}</div>
                                        )}
                                        <p className="font-bold text-slate-900 dark:text-white text-sm">{emp.name}</p>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-400">{emp.dept}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3 max-w-xs">
                                        <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                                            <div className={`h-full transition-all ${empProgress === 100 ? 'bg-emerald-500' : empProgress < 50 ? 'bg-amber-500' : 'bg-[#4F46E5]'}`} style={{ width: `${empProgress}%` }}></div>
                                        </div>
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 w-10 text-right">{empProgress}%</span>
                                    </div>
                                </td>
                            </>
                        );
                    }}
                />
            </div>
        </div>
    );

    return (
        <div className="flex h-screen w-full font-display text-slate-900 dark:text-white antialiased overflow-hidden bg-background-light dark:bg-background-dark relative">
            <Sidebar activeTab="Learning & Training" />

            <main className="flex-1 flex flex-col h-full overflow-hidden relative ml-[280px]">
                {/* 1. Standardized Global Header Axis */}
                <Header 
                    title="Learning & Training"
                    subtitle="Manage compliance, course enrollments, and organizational upskilling"
                >
                    <div className="relative w-full max-w-[480px] ml-4 hidden lg:block">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
                        <input
                            className="w-full border border-slate-200 dark:border-slate-800 rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent text-slate-900 placeholder-slate-400 bg-white dark:bg-slate-900 transition-all shadow-sm"
                            placeholder="Search by name or category..."
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </Header>

                <div className="flex-1 overflow-y-auto w-full bg-[#F8FAFC]">

                    {/* Page Header */}


                    <div className="px-8 pt-8 pb-12 space-y-8 max-w-[1600px] mx-auto">

                        {/* 2. Live KPI Interactivity derived directly from mapped State Arrays */}
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                                <p className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-1">Total Active Courses</p>
                                <div className="flex items-end justify-between mt-2">
                                    <h3 className="text-3xl font-bold text-slate-900">{totalActiveCourses}</h3>
                                    <span className="material-symbols-outlined text-indigo-100 text-[40px] -mb-2 -mr-2">menu_book</span>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                                <p className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-1">Fleet Completion Rate</p>
                                <div className="flex items-end justify-between mt-2">
                                    <h3 className="text-3xl font-bold text-[#4F46E5]">{avgCompletionRate}%</h3>
                                    <p className="text-[10px] font-bold text-slate-400">TARGET: 95%</p>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                                <p className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-1">Pending Enrollments</p>
                                <div className="flex items-end justify-between mt-2">
                                    <h3 className="text-3xl font-bold text-amber-500">{pendingEnrollments}</h3>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-xl border border-red-200 bg-red-50/50 shadow-sm flex flex-col justify-between">
                                <p className="text-xs font-extrabold text-red-500 uppercase tracking-widest mb-1">Compliance Liabilities</p>
                                <div className="flex items-end justify-between mt-2">
                                    <h3 className="text-3xl font-bold text-red-600">{complianceLiabilitiesCount}</h3>
                                    <p className="text-[10px] uppercase font-bold text-red-400">Certs Expired/Soon</p>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                                <p className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-1">Total Training Inv.</p>
                                <div className="flex items-end justify-between mt-2">
                                    <h3 className="text-3xl font-bold text-emerald-600">${totalTrainingInvestment.toLocaleString()}</h3>
                                    <span className="material-symbols-outlined text-emerald-100 text-[40px] -mb-2 -mr-2">payments</span>
                                </div>
                            </div>
                        </div>

                        {/* Stateful Tab Layout */}
                        <div className="border-b border-slate-200 dark:border-slate-800 flex gap-10 sticky top-0 bg-[#F8FAFC] z-10 pt-2">
                            {['Overview', 'Course Catalog', 'Certifications', 'Training Analytics'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`pb-4 text-[13px] font-bold transition-all relative ${activeTab === tab
                                            ? 'text-[#4F46E5]'
                                            : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    {tab}
                                    {activeTab === tab && (
                                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#4F46E5] rounded-t-full shadow-[0_-2px_4px_rgba(79,70,229,0.3)]"></div>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Route Content to specific component render outputs */}
                        <div className="min-h-[400px]">
                            {activeTab === 'Overview' && renderOverview()}
                            {activeTab === 'Course Catalog' && renderCourseCatalog()}
                            {activeTab === 'Certifications' && renderCertifications()}
                            {activeTab === 'Training Analytics' && renderAnalytics()}
                        </div>
                    </div>
                </div>

                {/* Modals & Safeties */}

                {/* 1. Error Modal for Soft-Delete Safety Check */}
                {activeModal === 'error' && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in px-4">
                        <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-red-200 flex flex-col">
                            <div className="p-6 text-center pt-8">
                                <div className="size-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4 border border-red-100">
                                    <span className="material-symbols-outlined text-[32px] text-red-500">gpp_bad</span>
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Operation Blocked</h3>
                                <p className="text-sm font-medium text-slate-600 leading-relaxed">{errorMsg}</p>
                            </div>
                            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-center mt-2">
                                <button onClick={closeModals} className="px-6 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-lg hover:bg-black transition-colors w-full shadow-sm">Acknowledge</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. Assign Team Modal (Workforce Directory Interface Mock) */}
                {activeModal === 'assign_team' && activeRecord && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in px-4">
                        <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col">
                            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                                <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm uppercase tracking-widest">
                                    <span className="material-symbols-outlined text-[#4F46E5] text-[18px]">group_add</span> Assign Workforce
                                </h3>
                                <button onClick={closeModals} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center justify-between">
                                        Target Department
                                        {activeRecord.isMandatory && <span className="text-[9px] bg-red-50 text-red-600 px-1 border border-red-100 rounded">Mandatory Target Req.</span>}
                                    </label>
                                    <select 
                                        className="w-full text-sm p-3 border border-slate-300 rounded-lg focus:ring-[#4F46E5] focus:border-[#4F46E5] font-semibold bg-white cursor-pointer hover:border-slate-400 transition-all"
                                        onChange={(e) => setActiveRecord({ ...activeRecord, targetDept: e.target.value })}
                                    >
                                        <option value="">Select Department</option>
                                        <option>Engineering</option>
                                        <option>Product & Design</option>
                                        <option>Logistics</option>
                                        <option>Production Factory</option>
                                    </select>
                                    <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-2">
                                        <span className="material-symbols-outlined text-[12px]">link</span> Directly linked to Active Employees directory state.
                                    </p>
                                </div>
                            </div>
                            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                                <button onClick={closeModals} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button>
                                <button 
                                    onClick={() => {
                                        if (activeRecord.targetDept) {
                                            assignCourseToDepartment(activeRecord.id, activeRecord.targetDept);
                                            closeModals();
                                        }
                                    }} 
                                    className="px-6 py-2.5 rounded-lg text-sm font-bold text-white bg-[#4F46E5] hover:bg-indigo-600 transition-colors shadow-sm"
                                >
                                    Dispatch Course
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. Renew Upload Library Mock */}
                {activeModal === 'renew' && activeRecord && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in px-4">
                        <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col">
                            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#4F46E5]">upload_file</span> Renew via Library
                                </h3>
                                <button onClick={closeModals} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <div className="p-6">
                                <p className="text-sm font-semibold text-slate-700 mb-4 text-center">Upload the official compliance document for <strong className="text-[#4F46E5]">{activeRecord.name}</strong> to resolve the liability state.</p>
                                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 transition-all cursor-pointer group">
                                    <span className="material-symbols-outlined text-4xl text-slate-300 group-hover:text-indigo-400 mb-2">cloud_upload</span>
                                    <p className="text-sm font-bold text-slate-900">Drag & Drop visual proof here</p>
                                    <p className="text-xs font-semibold text-slate-500 mt-1">Saves natively to Employee's Document Tab automatically</p>
                                </div>
                            </div>
                            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                                <button onClick={closeModals} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button>
                                <button 
                                    onClick={() => {
                                        renewCertification(activeRecord.id);
                                        closeModals();
                                    }} 
                                    className="px-6 py-2.5 rounded-lg text-sm font-bold text-white bg-slate-900 hover:bg-black transition-colors shadow-sm"
                                >
                                    Complete Renewal
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {/* 4. Manual Completion Override Modal */}
                {activeModal === 'complete_manual' && activeRecord && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in px-4">
                        <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col">
                            <div className="p-5 border-b border-white flex justify-between items-center bg-emerald-50 shrink-0">
                                <h3 className="font-bold text-emerald-800 flex items-center gap-2 text-sm uppercase tracking-widest leading-none">
                                    <span className="material-symbols-outlined text-[20px]">verified_user</span> Manual Certification Override
                                </h3>
                                <button onClick={closeModals} className="text-emerald-400 hover:text-emerald-600 transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <div className="p-8 space-y-6">
                                <div className="text-center">
                                    <p className="text-sm font-bold text-slate-700">Authorizing override for:</p>
                                    <p className="text-lg font-black text-[#4F46E5] uppercase mt-1">{activeRecord.name}</p>
                                </div>

                                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3">
                                    <span className="material-symbols-outlined text-amber-500">warning</span>
                                    <p className="text-[11px] font-bold text-amber-800 leading-relaxed uppercase tracking-tight">
                                        This action bypasses automated safety exams. Your name will be recorded in the Security Audit Registry for Sector C accountability.
                                    </p>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Achieved Grade / Score (Optional)</label>
                                    <input 
                                        type="text"
                                        value={manualGrade}
                                        onChange={(e) => setManualGrade(e.target.value)}
                                        className="w-full text-sm p-3 border border-slate-300 rounded-lg focus:ring-[#4F46E5] focus:border-[#4F46E5] font-semibold bg-white mb-4"
                                        placeholder="e.g. 95% or Pass"
                                    />
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Reason for Override (Audit Requirement)</label>
                                    <textarea 
                                        value={manualNote}
                                        onChange={(e) => setManualNote(e.target.value)}
                                        className="w-full h-24 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none"
                                        placeholder="e.g. Employee completed on-site practical demonstration of sector C protocols."
                                    />
                                </div>
                            </div>
                            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                                <button onClick={closeModals} className="flex-1 px-5 py-3 rounded-xl text-xs font-black text-slate-500 hover:bg-slate-200 transition-all uppercase tracking-widest">Cancel</button>
                                <button 
                                    disabled={!manualNote.trim()}
                                    onClick={handleManualComplete}
                                    className={`flex-[2] py-3 rounded-xl text-xs font-black text-white shadow-lg transition-all uppercase tracking-widest ${!manualNote.trim() ? 'bg-slate-300 shadow-none' : 'bg-emerald-600 shadow-emerald-200 hover:bg-emerald-700'}`}
                                >
                                    Confirm Authorization
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 5. Create Course Creation Modal */}
                {activeModal === 'create_course' && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in px-4">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col">
                            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 shrink-0">
                                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm uppercase tracking-widest leading-none">
                                    <span className="material-symbols-outlined text-[#4F46E5] text-[20px]">add_task</span> Create New Training Curriculum
                                </h3>
                                <button onClick={closeModals} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Course Name</label>
                                    <input 
                                        type="text" 
                                        value={newCourse.name}
                                        onChange={e => setNewCourse({ ...newCourse, name: e.target.value })}
                                        className="w-full text-sm p-3 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-[#4F46E5] focus:border-[#4F46E5] font-semibold bg-white dark:bg-slate-800 dark:text-white"
                                        placeholder="e.g. Advanced Fire Protocol"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Provider (Vendor)</label>
                                        <input 
                                            type="text" 
                                            value={newCourse.provider || ''}
                                            onChange={e => setNewCourse({ ...newCourse, provider: e.target.value })}
                                            className="w-full text-sm p-3 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-[#4F46E5] focus:border-[#4F46E5] font-semibold bg-white dark:bg-slate-800 dark:text-white"
                                            placeholder="e.g. Coursera or Internal"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Cost Per Head ($)</label>
                                        <input 
                                            type="number" 
                                            value={newCourse.costPerHead || 0}
                                            onChange={e => setNewCourse({ ...newCourse, costPerHead: Number(e.target.value) })}
                                            className="w-full text-sm p-3 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-[#4F46E5] focus:border-[#4F46E5] font-semibold bg-white dark:bg-slate-800 dark:text-white"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Category</label>
                                        <select 
                                            value={newCourse.category}
                                            onChange={e => setNewCourse({ ...newCourse, category: e.target.value })}
                                            className="w-full text-sm p-3 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-[#4F46E5] focus:border-[#4F46E5] font-semibold bg-white dark:bg-slate-800 dark:text-white"
                                        >
                                            <option>Compliance</option>
                                            <option>Safety</option>
                                            <option>Soft Skills</option>
                                            <option>Technical</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Duration (Hrs)</label>
                                        <input 
                                            type="text" 
                                            value={newCourse.duration}
                                            onChange={e => setNewCourse({ ...newCourse, duration: e.target.value })}
                                            className="w-full text-sm p-3 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-[#4F46E5] focus:border-[#4F46E5] font-semibold bg-white dark:bg-slate-800 dark:text-white"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                                    <input 
                                        type="checkbox" 
                                        checked={newCourse.isMandatory}
                                        onChange={e => setNewCourse({ ...newCourse, isMandatory: e.target.checked })}
                                        className="size-4 text-[#4F46E5] focus:ring-[#4F46E5] rounded border-slate-300"
                                    />
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Mandatory Completion required across active fleet?</span>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Certification Expiry (Days)</label>
                                    <input 
                                        type="number" 
                                        value={newCourse.expiryDays}
                                        onChange={e => setNewCourse({ ...newCourse, expiryDays: parseInt(e.target.value) || 365 })}
                                        className="w-full text-sm p-3 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-[#4F46E5] focus:border-[#4F46E5] font-semibold bg-white dark:bg-slate-800 dark:text-white"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Skill Acquisition Tags</label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            value={skillInput}
                                            onChange={e => setSkillInput(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' && skillInput) {
                                                    setNewCourse({ ...newCourse, skillTags: [...(newCourse.skillTags || []), skillInput] });
                                                    setSkillInput('');
                                                }
                                            }}
                                            className="flex-1 text-sm p-3 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-[#4F46E5] focus:border-[#4F46E5] font-semibold bg-white dark:bg-slate-800 dark:text-white"
                                            placeholder="Type and press Enter to add..."
                                        />
                                        <button onClick={() => { if(skillInput) { setNewCourse({ ...newCourse, skillTags: [...(newCourse.skillTags || []), skillInput] }); setSkillInput(''); } }} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 rounded-lg font-bold text-slate-700 dark:text-white text-sm">Add</button>
                                    </div>
                                    <div className="flex gap-2 flex-wrap mt-2">
                                        {(newCourse.skillTags || []).map((skill, idx) => (
                                            <span key={idx} className="bg-indigo-50 dark:bg-indigo-900/30 text-[#4F46E5] border border-indigo-100 flex items-center gap-1 font-bold text-xs px-2.5 py-1 rounded">
                                                {skill}
                                                <span onClick={() => setNewCourse({ ...newCourse, skillTags: newCourse.skillTags?.filter(s => s !== skill) })} className="material-symbols-outlined text-[14px] cursor-pointer hover:text-red-500">close</span>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                                <button onClick={closeModals} className="flex-1 px-5 py-3 rounded-xl text-xs font-black text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all uppercase tracking-widest">Cancel</button>
                                <button 
                                    disabled={!newCourse.name.trim()}
                                    onClick={handleCreateCourse}
                                    className={`flex-[2] py-3 rounded-xl text-xs font-black text-white shadow-lg transition-all uppercase tracking-widest ${!newCourse.name.trim() ? 'bg-slate-300 dark:bg-slate-700 shadow-none' : 'bg-[#4F46E5] hover:bg-indigo-600'}`}
                                >
                                    Launch Curriculum
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
