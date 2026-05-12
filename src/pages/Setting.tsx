import React, { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useAppData } from '../context/AppDataContext';
import { useSystemCalendar } from '../context/SystemCalendarContext';
import { useApprovals } from '../context/ApprovalContext';
import ConfirmationModal from '../components/ConfirmationModal';

export default function Setting() {
    const { chains, delegations, oooEntries } = useApprovals();
    const { getFormattedDate, getCurrentDateISO } = useSystemCalendar();
    const { 
        complianceSettings, setComplianceSettings, 
        systemSettings, setSystemSettings,
        auditLogs, addAuditLog,
        employees, isAdmin, assignAdmin, revokeAdmin,
        setAlerts, syncAttendance,
        addLocation, updateLocation, deleteLocation,
        addDepartment, updateDepartment, deleteDepartment, reorderDepartments,
        addPosition, updatePosition, deletePosition,
        addAllowanceConfig, addDeductionConfig,
        holidays, addHoliday, updateHoliday, deleteHoliday,
        downloadSystemBackup,
        logSettingChange
    } = useAppData();

    const [activeTab, setActiveTab] = useState('General & Org');
    
    // Local state for buffered edits
    const [localCompliance, setLocalCompliance] = useState<ComplianceSettings>(complianceSettings);
    const [localSystem, setLocalSystem] = useState(systemSettings);
    const [localLoanConfig, setLocalLoanConfig] = useState(systemSettings.loanConfiguration);
    const [isSaving, setIsSaving] = useState(false);
    const [logoPreview, setLogoPreview] = useState<string | null>(systemSettings.companyLogo || null);

    // Audit Registry Filters — pre-populated when navigating from BankDisbursements
    const { state: routeState } = useLocation();
    const [auditSearch, setAuditSearch]           = useState((routeState as any)?.auditSearch ?? '');
    const [auditModuleFilter, setAuditModuleFilter] = useState((routeState as any)?.auditFilter ?? 'All');

    // Template Modals
    const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false);
    const [newTemplateRole, setNewTemplateRole] = useState('');

    const [addTaskModalRoleId, setAddTaskModalRoleId] = useState<string | null>(null);
    const [newTask, setNewTask] = useState<{ title: string; type: 'Document' | 'Action' | 'Training'; tooltip: string; isMandatory: boolean }>({ title: '', type: 'Document', tooltip: '', isMandatory: false });

    // Location Management Modals/State
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [editingLoc, setEditingLoc] = useState<any>(null);
    const [newLoc, setNewLoc] = useState({ name: '', address: '', lat: 0, lng: 0, radius: 500 });

    // Department Management Modals/State
    const [showDeptModal, setShowDeptModal] = useState(false);
    const [editingDept, setEditingDept] = useState<any>(null);
    const [newDept, setNewDept] = useState({ name: '', code: '' });

    // Position Management Modals/State
    const [showPositionModal, setShowPositionModal] = useState(false);
    const [editingPos, setEditingPos] = useState<any>(null);
    const [newPos, setNewPos] = useState({ name: '', deptId: '', reportTo: '' });

    // Payment Provider Modals
    const [showCreateProviderModal, setShowCreateProviderModal] = useState(false);
    const [newProvider, setNewProvider] = useState<{ name: string; type: 'Bank' | 'Digital Wallet'; requiredFields: string[] }>({ name: '', type: 'Bank', requiredFields: ['accountNumber'] });
    const [newCategory, setNewCategory] = useState({ name: '', description: '', monthlyLimit: 0 });

    // Holidays Management State
    const [showHolidayModal, setShowHolidayModal] = useState(false);
    const [newHoliday, setNewHoliday] = useState({ name: '', date: '', isRestricted: true });
    const [editingHolidayStr, setEditingHolidayStr] = useState<string | null>(null);
    const [showAdminPicker, setShowAdminPicker] = useState(false);

    // Allowance Master State
    const [showAlwModal, setShowAlwModal] = useState(false);
    const [newAlw, setNewAlw] = useState<Omit<any, 'id'>>({ // Using any for brevity in mock if types not exported
        name: '', logic: 'Flat Rate', value: 0, isEnabled: true, isDeletable: true
    });

    // Deduction Master State
    const [showDedModal, setShowDedModal] = useState(false);
    const [newDed, setNewDed] = useState<Omit<any, 'id'>>({
        name: '', logic: 'Flat Rate', value: 0, isEnabled: true, isDeletable: true, affectedIncomeParts: ['Base Salary']
    });

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        variant: 'danger' | 'warning' | 'info';
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        variant: 'info'
    });

    const handleCreateProvider = () => {
        if (!newProvider.name.trim()) return;
        setLocalSystem(prev => ({
            ...prev,
            paymentProviders: [...prev.paymentProviders, { ...newProvider, id: `PROV-${Date.now()}` } as any]
        }));
        setNewProvider({ name: '', type: 'Bank', requiredFields: ['accountNumber'] });
        setShowCreateProviderModal(false);
    };

    const handleDeleteProvider = (id: string) => {
        setLocalSystem(prev => ({
            ...prev,
            paymentProviders: prev.paymentProviders.filter(p => p.id !== id)
        }));
    };

    const handleAddCategory = () => {
        if (!newCategory.name.trim()) return;
        setLocalSystem(prev => ({
            ...prev,
            expenseCategories: [...prev.expenseCategories, { 
                id: `CAT-${Date.now()}`, 
                name: newCategory.name, 
                description: newCategory.description, 
                monthlyLimit: newCategory.monthlyLimit > 0 ? newCategory.monthlyLimit : undefined 
            }]
        }));
        setNewCategory({ name: '', description: '', monthlyLimit: 0 });
    };

    const handleDeleteCategory = (id: string) => {
        setLocalSystem(prev => ({
            ...prev,
            expenseCategories: prev.expenseCategories.filter(c => c.id !== id)
        }));
    };

    const handleCreateTemplate = () => {
        if (!newTemplateRole.trim()) return;
        setLocalSystem(prev => ({
            ...prev,
            onboardingTemplates: [...prev.onboardingTemplates, { roleId: newTemplateRole, tasks: [] }]
        }));
        setNewTemplateRole('');
        setShowCreateTemplateModal(false);
    };

    const handleAddOptionalTask = () => {
        if (!addTaskModalRoleId || !newTask.title.trim()) return;
        setLocalSystem(prev => ({
            ...prev,
            onboardingTemplates: prev.onboardingTemplates.map(t => 
                t.roleId === addTaskModalRoleId 
                ? { ...t, tasks: [...t.tasks, { ...newTask, id: `task-${Date.now()}` }] } 
                : t
            )
        }));
        setNewTask({ title: '', type: 'Document', tooltip: '', isMandatory: false });
        setAddTaskModalRoleId(null);
    };

    const handleDeleteTemplateTask = (roleId: string, taskIdx: number) => {
        setLocalSystem(prev => ({
            ...prev,
            onboardingTemplates: prev.onboardingTemplates.map(t => 
                t.roleId === roleId 
                ? { ...t, tasks: t.tasks.filter((_, i) => i !== taskIdx) } 
                : t
            )
        }));
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Size Limit Guard: 500KB
        if (file.size > 500 * 1024) {
            setAlerts(prev => [{
                id: `LOGO-ERR-${Date.now()}`,
                type: 'error',
                message: 'File too large. Please upload an image under 500KB to ensure system performance.',
                timestamp: getFormattedDate(undefined, 'time'),
                isRead: false
            }, ...prev]);
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            setLocalSystem(prev => ({ ...prev, companyLogo: base64String }));
            setLogoPreview(base64String);
        };
        reader.readAsDataURL(file);
    };

    const handleToggleAllowance = (id: string) => {
        setLocalSystem(prev => ({
            ...prev,
            allowanceConfigs: prev.allowanceConfigs.map(c => c.id === id ? { ...c, isEnabled: !c.isEnabled } : c)
        }));
    };

    const handleToggleDeduction = (id: string) => {
        setLocalSystem(prev => ({
            ...prev,
            deductionConfigs: prev.deductionConfigs.map(c => c.id === id ? { ...c, isEnabled: !c.isEnabled } : c)
        }));
    };

    const handleCreateAllowance = () => {
        if (!newAlw.name.trim()) return;
        addAllowanceConfig(newAlw as any);
        setLocalSystem(prev => ({
            ...prev,
            allowanceConfigs: [...prev.allowanceConfigs, { ...newAlw, id: `ALW-TEMP-${Date.now()}` } as any]
        }));
        setShowAlwModal(false);
        setNewAlw({ name: '', logic: 'Flat Rate', value: 0, isEnabled: true, isDeletable: true });
        setAlerts(prev => [{ id: `ALW-ADD-${Date.now()}`, type: 'success', message: `Custom allowance '${newAlw.name}' registered.`, timestamp: getFormattedDate(undefined, 'time'), isRead: false }, ...prev]);
    };

    const handleCreateDeduction = () => {
        if (!newDed.name.trim()) return;
        addDeductionConfig(newDed as any);
        setLocalSystem(prev => ({
            ...prev,
            deductionConfigs: [...prev.deductionConfigs, { ...newDed, id: `DED-TEMP-${Date.now()}` } as any]
        }));
        setShowDedModal(false);
        setNewDed({ name: '', logic: 'Flat Rate', value: 0, isEnabled: true, isDeletable: true, affectedIncomeParts: ['Base Salary'] });
        setAlerts(prev => [{ id: `DED-ADD-${Date.now()}`, type: 'success', message: `Custom deduction '${newDed.name}' registered.`, timestamp: getFormattedDate(undefined, 'time'), isRead: false }, ...prev]);
    };

    const handleAssignAdminAction = (empId: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Elevate Privileges?',
            message: 'This user will gain full access to sensitive payroll, PII data, and security logs. This action is audited.',
            variant: 'warning',
            onConfirm: () => {
                assignAdmin(empId, 'ADM-001');
                setShowAdminPicker(false);
                setAlerts(prev => [{
                    id: `ADMIN-ADD-${Date.now()}`,
                    type: 'success',
                    message: `Administrative privileges elevated for ${employees.find(e => e.id === empId)?.name}.`,
                    timestamp: getFormattedDate(undefined, 'time'),
                    isRead: false
                }, ...prev]);
            }
        });
    };

    const handleRevokeAdminAction = (empId: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Revoke Access?',
            message: 'Are you sure you want to remove administrative access for this user? They will lose all management capabilities immediately.',
            variant: 'danger',
            onConfirm: () => {
                revokeAdmin(empId, 'ADM-001');
                setAlerts(prev => [{
                    id: `ADMIN-REM-${Date.now()}`,
                    type: 'warning',
                    message: `Administrative privileges revoked for ${employees.find(e => e.id === empId)?.name}.`,
                    timestamp: getFormattedDate(undefined, 'time'),
                    isRead: false
                }, ...prev]);
            }
        });
    };

    // --- Location Handlers ---
    const handleAddLocation = () => {
        if (!newLoc.name.trim()) return;
        const res = addLocation(newLoc);
        if (res.success) {
            setAlerts(prev => [{ id: `LOC-ADD-${Date.now()}`, type: 'success', message: res.message, timestamp: getFormattedDate(undefined, 'time'), isRead: false }, ...prev]);
            setNewLoc({ name: '', address: '', lat: 0, lng: 0, radius: 500 });
            setShowLocationModal(false);
        }
    };

    const handleUpdateLocation = () => {
        if (!editingLoc || !editingLoc.name.trim()) return;
        const res = updateLocation(editingLoc);
        if (res.success) {
            setAlerts(prev => [{ id: `LOC-UPD-${Date.now()}`, type: 'success', message: res.message, timestamp: getFormattedDate(undefined, 'time'), isRead: false }, ...prev]);
            setEditingLoc(null);
            setShowLocationModal(false);
        }
    };

    const handleDeleteLoc = (id: string) => {
        const res = deleteLocation(id);
        if (res.success) {
            setAlerts(prev => [{ id: `LOC-DEL-${Date.now()}`, type: 'success', message: res.message, timestamp: getFormattedDate(undefined, 'time'), isRead: false }, ...prev]);
        } else {
            setAlerts(prev => [{ id: `LOC-DEL-ERR-${Date.now()}`, type: 'error', message: res.message, timestamp: getFormattedDate(undefined, 'time'), isRead: false }, ...prev]);
        }
    };

    // --- Department Handlers ---
    const handleAddDept = () => {
        if (!newDept.name.trim()) return;
        const res = addDepartment(newDept);
        if (res.success) {
            setAlerts(prev => [{ id: `DEPT-ADD-${Date.now()}`, type: 'success', message: res.message, timestamp: getFormattedDate(undefined, 'time'), isRead: false }, ...prev]);
            setNewDept({ name: '', code: '' });
            setShowDeptModal(false);
        }
    };

    const handleUpdateDept = () => {
        if (!editingDept || !editingDept.name.trim()) return;
        const res = updateDepartment(editingDept);
        if (res.success) {
            setAlerts(prev => [{ id: `DEPT-UPD-${Date.now()}`, type: 'success', message: res.message, timestamp: getFormattedDate(undefined, 'time'), isRead: false }, ...prev]);
            setEditingDept(null);
            setShowDeptModal(false);
        }
    };

    const handleDeleteDept = (id: string) => {
        const res = deleteDepartment(id);
        if (res.success) {
            setAlerts(prev => [{ id: `DEPT-DEL-${Date.now()}`, type: 'success', message: res.message, timestamp: getFormattedDate(undefined, 'time'), isRead: false }, ...prev]);
        } else {
            setAlerts(prev => [{ id: `DEPT-DEL-ERR-${Date.now()}`, type: 'error', message: res.message, timestamp: getFormattedDate(undefined, 'time'), isRead: false }, ...prev]);
        }
    };

    const handleMoveDept = (index: number, direction: 'up' | 'down') => {
        const newDepts = [...systemSettings.departments];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newDepts.length) return;
        
        const temp = newDepts[index];
        newDepts[index] = newDepts[targetIndex];
        newDepts[targetIndex] = temp;
        
        reorderDepartments(newDepts.map((d, i) => ({ ...d, order: i + 1 })));
    };

    // --- Position Handlers ---
    const handleAddPos = () => {
        if (!newPos.name.trim()) return;
        const res = addPosition(newPos);
        if (res.success) {
            setAlerts(prev => [{ id: `POS-ADD-${Date.now()}`, type: 'success', message: res.message, timestamp: getFormattedDate(undefined, 'time'), isRead: false }, ...prev]);
            setNewPos({ name: '', deptId: '', reportTo: '' });
            setShowPositionModal(false);
        }
    };

    const handleUpdatePos = () => {
        if (!editingPos || !editingPos.name.trim()) return;
        const res = updatePosition(editingPos);
        if (res.success) {
            setAlerts(prev => [{ id: `POS-UPD-${Date.now()}`, type: 'success', message: res.message, timestamp: getFormattedDate(undefined, 'time'), isRead: false }, ...prev]);
            setEditingPos(null);
            setShowPositionModal(false);
        }
    };

    const handleDeletePos = (id: string) => {
        const res = deletePosition(id);
        if (res.success) {
            setAlerts(prev => [{ id: `POS-DEL-${Date.now()}`, type: 'success', message: res.message, timestamp: getFormattedDate(undefined, 'time'), isRead: false }, ...prev]);
        } else {
            setAlerts(prev => [{ id: `POS-DEL-ERR-${Date.now()}`, type: 'error', message: res.message, timestamp: getFormattedDate(undefined, 'time'), isRead: false }, ...prev]);
        }
    };

    const handleSave = () => {
        setIsSaving(true);
        
        setTimeout(() => {
            // 1. Check for Compliance Changes (Audit Trigger)
            if (localCompliance.ssbCap !== complianceSettings.ssbCap) {
                addAuditLog({
                    adminId: 'ADM-001',
                    actionType: 'Compliance Change',
                    module: 'Payroll',
                    detail: `SSB Cap updated from ${complianceSettings.ssbCap.toLocaleString()} to ${localCompliance.ssbCap.toLocaleString()} MMK.`
                });
            }
            if (localCompliance.ssbPercent !== complianceSettings.ssbPercent) {
                addAuditLog({
                    adminId: 'ADM-001',
                    actionType: 'Compliance Change',
                    module: 'Payroll',
                    detail: `SSB Percentage updated from ${complianceSettings.ssbPercent}% to ${localCompliance.ssbPercent}%.`
                });
            }
            if (localCompliance.attendancePenalty !== complianceSettings.attendancePenalty) {
                addAuditLog({
                    adminId: 'ADM-001',
                    actionType: 'Policy Update',
                    module: 'Attendance',
                    detail: `Attendance Penalty updated from ${complianceSettings.attendancePenalty.toLocaleString()} to ${localCompliance.attendancePenalty.toLocaleString()} MMK.`
                });
            }

            // 2. Audit: Loan Configuration Changes (HIGH PRIORITY)
            const lc = systemSettings.loanConfiguration;
            if (localLoanConfig.loanLimitMultiplier !== lc.loanLimitMultiplier) {
                addAuditLog({ adminId: 'ADM-001', actionType: 'Policy Update', module: 'Settings', detail: `[HIGH] Loan Limit Multiplier changed from ${lc.loanLimitMultiplier}x to ${localLoanConfig.loanLimitMultiplier}x base salary.` });
            }
            if (localLoanConfig.maxEmergencyLoanTerm !== lc.maxEmergencyLoanTerm) {
                addAuditLog({ adminId: 'ADM-001', actionType: 'Policy Update', module: 'Settings', detail: `[HIGH] Max Emergency Loan Term changed from ${lc.maxEmergencyLoanTerm} to ${localLoanConfig.maxEmergencyLoanTerm} months.` });
            }
            if (localLoanConfig.salaryAdvanceTerm !== lc.salaryAdvanceTerm) {
                addAuditLog({ adminId: 'ADM-001', actionType: 'Policy Update', module: 'Settings', detail: `[HIGH] Salary Advance Term changed from ${lc.salaryAdvanceTerm} to ${localLoanConfig.salaryAdvanceTerm} month(s).` });
            }
            if (localLoanConfig.roundingMethod !== lc.roundingMethod) {
                addAuditLog({ adminId: 'ADM-001', actionType: 'Policy Update', module: 'Settings', detail: `[HIGH] Installment Rounding Method changed from '${lc.roundingMethod}' to '${localLoanConfig.roundingMethod}'.`, oldValue: lc.roundingMethod, newValue: localLoanConfig.roundingMethod });
            }

            // 3. Audit: Auto Attendance Policy Changes
            if (localSystem.autoAttendancePolicyEnabled !== systemSettings.autoAttendancePolicyEnabled) {
                addAuditLog({
                    adminId: 'ADM-001',
                    actionType: 'Policy Update',
                    module: 'Settings',
                    detail: `Global Auto Attendance Policy ${localSystem.autoAttendancePolicyEnabled ? 'ENABLED' : 'DISABLED'}. Warning: This affects schedule-based payroll generation.`
                });
            }
            if (localSystem.autoHolidayWorkEnabled !== systemSettings.autoHolidayWorkEnabled) {
                addAuditLog({
                    adminId: 'ADM-001',
                    actionType: 'Policy Update',
                    module: 'Settings',
                    detail: `Holiday Auto-Attendance ${localSystem.autoHolidayWorkEnabled ? 'ENABLED' : 'DISABLED'}.`
                });
            }

            // 3.1 Device Config Audit
            if (localSystem.deviceConfig.showQR !== systemSettings.deviceConfig.showQR) {
                addAuditLog({
                    adminId: 'ADM-001',
                    actionType: 'Security Update',
                    module: 'Devices',
                    detail: `Fingerprint Terminal QR Code visibility changed to ${localSystem.deviceConfig.showQR ? 'VISIBLE' : 'HIDDEN'}.`
                });
            }
            if (localSystem.deviceConfig.activeLocationId !== systemSettings.deviceConfig.activeLocationId) {
                const oldLoc = systemSettings.officeLocations.find(l => l.id === systemSettings.deviceConfig.activeLocationId)?.name || 'None';
                const newLoc = systemSettings.officeLocations.find(l => l.id === localSystem.deviceConfig.activeLocationId)?.name || 'None';
                addAuditLog({
                    adminId: 'ADM-001',
                    actionType: 'Hardware Reconfiguration',
                    module: 'Devices',
                    detail: `Active Device Location moved from ${oldLoc} to ${newLoc}.`
                });
            }

            // 4. Audit: New Compliance Fields
            if (localCompliance.workingDaysPerMonth !== complianceSettings.workingDaysPerMonth) {
                addAuditLog({ adminId: 'ADM-001', actionType: 'Compliance Change', module: 'Payroll', detail: `Base Working Days updated from ${complianceSettings.workingDaysPerMonth} to ${localCompliance.workingDaysPerMonth} days.` });
                logSettingChange('Compliance.WorkingDays', complianceSettings.workingDaysPerMonth, localCompliance.workingDaysPerMonth);
            }
            if (localCompliance.pitRate !== complianceSettings.pitRate) {
                addAuditLog({ adminId: 'ADM-001', actionType: 'Compliance Change', module: 'Payroll', detail: `PIT Rate updated from ${complianceSettings.pitRate * 100}% to ${localCompliance.pitRate * 100}%.` });
                logSettingChange('Compliance.PITRate', `${complianceSettings.pitRate * 100}%`, `${localCompliance.pitRate * 100}%`);
            }
            if (localCompliance.pitThreshold !== complianceSettings.pitThreshold) {
                addAuditLog({ adminId: 'ADM-001', actionType: 'Compliance Change', module: 'Payroll', detail: `PIT Threshold updated from ${complianceSettings.pitThreshold.toLocaleString()} to ${localCompliance.pitThreshold.toLocaleString()} MMK.` });
                logSettingChange('Compliance.PITThreshold', complianceSettings.pitThreshold, localCompliance.pitThreshold);
            }
            if (localCompliance.ssbPercent !== complianceSettings.ssbPercent) {
                logSettingChange('Compliance.SSBPercent', complianceSettings.ssbPercent, localCompliance.ssbPercent);
            }
            if (localSystem.companyLogo !== systemSettings.companyLogo) {
                logSettingChange('Branding.Logo', 'Logo Updated', 'Logo Updated');
            }

            // 5. Commit Core Settings
            setComplianceSettings(localCompliance);
            setSystemSettings({
                ...localSystem,
                loanConfiguration: localLoanConfig,
                lastAuditDate: getCurrentDateISO()
            });

            setIsSaving(false);
            
            setAlerts(prev => [{
                id: `SET-SAVE-${Date.now()}`,
                type: 'success',
                message: 'Settings synchronized. Audit logs generated for compliance changes.',
                timestamp: getFormattedDate(undefined, 'time'),
                isRead: false
            }, ...prev]);
        }, 600);
    };

    const handleSaveHoliday = () => {
        if (!newHoliday.name || !newHoliday.date) return;
        if (editingHolidayStr) {
            updateHoliday(editingHolidayStr, newHoliday);
        } else {
            addHoliday(newHoliday);
        }
        setShowHolidayModal(false);
        setNewHoliday({ name: '', date: '', isRestricted: true });
        setEditingHolidayStr(null);
    };

    const openEditHoliday = (h: any) => {
        setEditingHolidayStr(h.date);
        setNewHoliday({ name: h.name, date: h.date, isRestricted: h.isRestricted });
        setShowHolidayModal(true);
    };

    const handleDiscard = () => {
        setLocalCompliance(complianceSettings);
        setLocalSystem(systemSettings);
        setLocalLoanConfig(systemSettings.loanConfiguration);
        setLogoPreview(systemSettings.companyLogo || null);
    };

    // Derived Data for User Access Tab
    const adminProfiles = useMemo(() => {
        return systemSettings.adminIds.map(id => employees.find(e => e.id === id)).filter((emp): emp is any => !!emp);
    }, [systemSettings.adminIds, employees]);

    const filteredAuditLogs = useMemo(() => {
        return auditLogs.filter(log => {
            const matchesModule = auditModuleFilter === 'All' || log.module === auditModuleFilter;
            const matchesSearch = log.detail.toLowerCase().includes(auditSearch.toLowerCase()) || 
                                 log.adminId.toLowerCase().includes(auditSearch.toLowerCase());
            return matchesModule && matchesSearch;
        });
    }, [auditLogs, auditSearch, auditModuleFilter]);

    return (
        <div className="flex h-screen w-full font-display text-slate-900 dark:text-white antialiased overflow-hidden bg-background-light dark:bg-background-dark">
            <Sidebar activeTab="Settings" />

            <main className="flex-1 flex flex-col h-full overflow-hidden relative ml-[280px] bg-[#F8FAFC] dark:bg-slate-950">
                <Header 
                    title={`${localSystem.companyName} Governance`}
                    subtitle="Configure global workforce parameters, security roles, and compliance tracking"
                />

                <div className="flex-1 overflow-y-auto px-8 pb-32">
                    <div className="max-w-5xl mx-auto py-6">


                        <nav className="flex border-b border-slate-200 dark:border-slate-800 mb-10 gap-8 overflow-x-auto">
                            {['General & Org', 'Compliance & Tax', 'Locations', 'Departments', 'Positions', 'User Access', 'Onboarding Templates', 'Payment Providers', 'Devices & APIs', 'Holidays & Closures', 'Approval Workflows', 'Audit Registry', 'NRC Registry'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex flex-col pb-4 border-b-[3px] transition-all min-w-[120px] text-left ${activeTab === tab ? 'border-[#4F46E5] text-[#4F46E5]' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                                >
                                    <span className="text-sm font-bold whitespace-nowrap">{tab}</span>
                                    <span className="text-[10px] text-slate-400 uppercase font-bold mt-1 tracking-tighter whitespace-nowrap">
                                        {tab === 'General & Org' && 'Profile & Branding'}
                                        {tab === 'Compliance & Tax' && 'Tax & Payroll Defaults'}
                                        {tab === 'Locations' && 'Geofence Zones'}
                                        {tab === 'Departments' && 'Org Chart Units'}
                                        {tab === 'Positions' && 'Job Role Titles'}
                                        {tab === 'User Access' && 'RBAC Admin'}
                                        {tab === 'Onboarding Templates' && 'Role-Based Tasks'}
                                        {tab === 'Payment Providers' && 'Bank & Wallet Routing'}
                                        {tab === 'Devices & APIs' && 'Hardware Sync'}
                                        {tab === 'Holidays & Closures' && 'Manage Company Breaks'}
                                        {tab === 'Approval Workflows' && 'Approval Chains & Delegation'}
                                        {tab === 'Audit Registry' && 'Security Logs'}
                                        {tab === 'NRC Registry' && 'Employee NRC Validation'}
                                    </span>
                                </button>
                            ))}
                        </nav>

                        <div className="space-y-12">
                            {activeTab === 'General & Org' && (
                                <div className="space-y-10 animate-fade-in">
                                    <section>
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="size-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-[#4F46E5]">
                                                <span className="material-symbols-outlined">domain</span>
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Organization Profile</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full"></div>
                                            
                                            {/* Company Logo Upload */}
                                            <div className="md:col-span-2 flex flex-col md:flex-row items-center gap-6 pb-6 border-b border-slate-100 dark:border-slate-800 mb-2 relative z-10">
                                                <div className="relative group">
                                                    <div className="size-24 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden transition-all group-hover:border-[#4F46E5]/50">
                                                        {logoPreview ? (
                                                            <img src={logoPreview} alt="Logo Preview" className="size-full object-contain p-2" />
                                                        ) : (
                                                            <div className="flex flex-col items-center text-slate-400">
                                                                <span className="material-symbols-outlined text-3xl">add_photo_alternate</span>
                                                                <span className="text-[10px] font-bold mt-1">NO LOGO</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {logoPreview && (
                                                        <button 
                                                            onClick={() => {
                                                                setLogoPreview(null);
                                                                setLocalSystem(prev => ({ ...prev, companyLogo: null }));
                                                            }}
                                                            className="absolute -top-2 -right-2 size-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100"
                                                        >
                                                            <span className="material-symbols-outlined text-xs">close</span>
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Company Brand Identity</h4>
                                                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                                                        Upload your corporate logo to replace the default system icon in the Sidebar and future PDF reports. 
                                                        <span className="block mt-1 text-[#4F46E5] font-bold">Recommended: PNG/JPG under 500KB.</span>
                                                    </p>
                                                    <div className="pt-2 flex items-center gap-3">
                                                        <label className="cursor-pointer bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all shadow-sm flex items-center gap-2">
                                                            <span className="material-symbols-outlined text-[18px]">upload_file</span>
                                                            {logoPreview ? 'Change Logo' : 'Upload Logo'}
                                                            <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                                        </label>
                                                        {logoPreview && (
                                                            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                                                                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                                                IMAGE READY
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pt-2">
                                                <button 
                                                    onClick={downloadSystemBackup}
                                                    className="w-full py-4 border-2 border-dashed border-indigo-200 dark:border-indigo-900/40 rounded-2xl flex flex-col items-center justify-center gap-1 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-all group"
                                                >
                                                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                                                        <span className="material-symbols-outlined !text-[20px] group-hover:scale-110 transition-transform">cloud_download</span>
                                                        <span className="text-xs font-black uppercase tracking-widest">Download Full System Backup</span>
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 font-bold">Data Sovereignty: Export all records as a secure JSON file</span>
                                                </button>
                                            </div>

                                            <div className="space-y-2 relative z-10">
                                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Legal Entity Name</label>
                                                <input className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-950 focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] text-sm font-bold outline-none transition-all shadow-sm" type="text" value={localSystem.companyName} onChange={e => setLocalSystem(prev => ({...prev, companyName: e.target.value}))} />
                                            </div>
                                            <div className="space-y-2 relative z-10">
                                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Govt Registration ID</label>
                                                <input className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-950 focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] text-sm font-mono font-bold outline-none transition-all shadow-sm" type="text" value={localSystem.registrationNumber} onChange={e => setLocalSystem(prev => ({...prev, registrationNumber: e.target.value}))} />
                                            </div>
                                            <div className="space-y-2 relative z-10">
                                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Company TIN</label>
                                                <input 
                                                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-950 focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] text-sm font-mono font-bold outline-none transition-all shadow-sm" 
                                                    type="text" 
                                                    value={localSystem.compliance.companyTIN} 
                                                    onChange={e => setLocalCompliance(prev => ({ ...prev, companyTIN: e.target.value }))}
                                                    placeholder="e.g. 100 200 300 400"
                                                />
                                            </div>
                                            <div className="space-y-2 relative z-10">
                                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Official Office Stamp</label>
                                                <div className="flex items-center gap-4">
                                                    <div className="size-16 rounded-lg bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden">
                                                        {localSystem.compliance.officeStamp ? (
                                                            <img src={localSystem.compliance.officeStamp} alt="Stamp" className="size-full object-contain p-1" />
                                                        ) : (
                                                            <span className="material-symbols-outlined text-slate-300">stamp</span>
                                                        )}
                                                    </div>
                                                    <label className="cursor-pointer bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-all flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[16px]">upload</span>
                                                        UPLOAD STAMP
                                                        <input 
                                                            type="file" 
                                                            className="hidden" 
                                                            accept="image/*" 
                                                            onChange={e => {
                                                                const file = e.target.files?.[0];
                                                                if (file) {
                                                                    const reader = new FileReader();
                                                                    reader.onloadend = () => {
                                                                        setLocalCompliance(prev => ({ ...prev, officeStamp: reader.result as string }));
                                                                    };
                                                                    reader.readAsDataURL(file);
                                                                }
                                                            }} 
                                                        />
                                                    </label>
                                                </div>
                                            </div>
                                            <div className="space-y-2 md:col-span-2">
                                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Main Headquarters</label>
                                                <textarea className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-950 focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] text-sm font-medium outline-none transition-all shadow-sm min-h-[100px]" value={localSystem.headquarters} onChange={e => setLocalSystem(prev => ({...prev, headquarters: e.target.value}))}></textarea>
                                            </div>
                                        </div>
                                    </section>

                                    <section>
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="size-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600">
                                                <span className="material-symbols-outlined">receipt_long</span>
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                    Expense Tracking Module
                                                    {localSystem.expenseModuleEnabled && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded">Active</span>}
                                                </h3>
                                                <p className="text-xs text-slate-500 font-medium">Enable employee reimbursement requests and configure budget limits</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Module Switch</span>
                                                <button 
                                                    onClick={() => setLocalSystem(prev => ({ ...prev, expenseModuleEnabled: !prev.expenseModuleEnabled }))}
                                                    className={`w-14 h-7 rounded-full transition-colors relative flex items-center ${localSystem.expenseModuleEnabled ? 'bg-[#4F46E5]' : 'bg-slate-200 dark:bg-slate-700'}`}
                                                >
                                                    <span className={`absolute left-1 size-5 bg-white rounded-full shadow-sm transition-transform ${localSystem.expenseModuleEnabled ? 'translate-x-7' : 'translate-x-0'}`}></span>
                                                </button>
                                            </div>
                                        </div>

                                        {localSystem.expenseModuleEnabled && (
                                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-fade-in">
                                                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-between items-center">
                                                    <h4 className="font-bold text-slate-900 dark:text-white">Expense Categories</h4>
                                                    <span className="text-xs text-slate-500 font-bold">{localSystem.expenseCategories.length} configured</span>
                                                </div>
                                                <div className="p-6">
                                                    <div className="grid grid-cols-12 gap-4 mb-6">
                                                        <div className="col-span-3">
                                                            <input 
                                                                type="text" 
                                                                placeholder="Category Name" 
                                                                value={newCategory.name}
                                                                onChange={e => setNewCategory(p => ({ ...p, name: e.target.value }))}
                                                                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-950 text-sm font-bold outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition-all"
                                                            />
                                                        </div>
                                                        <div className="col-span-5">
                                                            <input 
                                                                type="text" 
                                                                placeholder="Description / Policy Guidelines" 
                                                                value={newCategory.description}
                                                                onChange={e => setNewCategory(p => ({ ...p, description: e.target.value }))}
                                                                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-950 text-sm outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition-all"
                                                            />
                                                        </div>
                                                        <div className="col-span-2">
                                                            <div className="relative">
                                                                <input 
                                                                    type="number" 
                                                                    placeholder="Limit (MMK)" 
                                                                    value={newCategory.monthlyLimit || ''}
                                                                    onChange={e => setNewCategory(p => ({ ...p, monthlyLimit: parseInt(e.target.value) || 0 }))}
                                                                    className="w-full pl-4 pr-10 py-3 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-950 text-sm font-black text-amber-600 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                                                                />
                                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">MMK</span>
                                                            </div>
                                                        </div>
                                                        <div className="col-span-2 flex items-center">
                                                            <button 
                                                                onClick={handleAddCategory}
                                                                className="w-full bg-[#4F46E5] text-white py-3 rounded-xl text-xs font-bold shadow-sm hover:bg-[#4338CA] transition-colors uppercase tracking-widest"
                                                            >
                                                                + Add
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3">
                                                        {localSystem.expenseCategories.map(cat => (
                                                            <div key={cat.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700 rounded-xl group transition-all hover:border-slate-300">
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-black text-slate-800 dark:text-slate-200">{cat.name}</span>
                                                                        {cat.monthlyLimit && (
                                                                            <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 text-[9px] font-black uppercase tracking-widest rounded border border-amber-200 dark:border-amber-800">
                                                                                Cap: {(cat.monthlyLimit).toLocaleString()} MMK
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-xs text-slate-500 mt-1">{cat.description}</p>
                                                                </div>
                                                                <button 
                                                                    onClick={() => handleDeleteCategory(cat.id)}
                                                                    className="mt-3 md:mt-0 px-3 py-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-xs font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all"
                                                                >
                                                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                                                    Remove
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </section>

                                    <section>
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="size-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-[#4F46E5]">
                                                <span className="material-symbols-outlined">person_search</span>
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                    Recruitment & Applicant Tracking
                                                    {localSystem.recruitmentModuleEnabled && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded">Active</span>}
                                                </h3>
                                                <p className="text-xs text-slate-500 font-medium">Manage job postings, applicant pipelines, and interview schedules</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Module Switch</span>
                                                <button 
                                                    onClick={() => setLocalSystem(prev => ({ ...prev, recruitmentModuleEnabled: !prev.recruitmentModuleEnabled }))}
                                                    className={`w-14 h-7 rounded-full transition-colors relative flex items-center ${localSystem.recruitmentModuleEnabled ? 'bg-[#4F46E5]' : 'bg-slate-200 dark:bg-slate-700'}`}
                                                >
                                                    <span className={`absolute left-1 size-5 bg-white rounded-full shadow-sm transition-transform ${localSystem.recruitmentModuleEnabled ? 'translate-x-7' : 'translate-x-0'}`}></span>
                                                </button>
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            )}

                            {activeTab === 'Compliance & Tax' && (
                                <div className="space-y-10 animate-fade-in">
                                    <section>
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="size-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600">
                                                <span className="material-symbols-outlined">gavel</span>
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Compliance & Tax Configuration</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                            <div className="space-y-3">
                                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block">Working Days Per Month</label>
                                                <select 
                                                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-950 text-base font-black outline-none transition-all shadow-sm bg-white dark:bg-slate-950"
                                                    value={localCompliance.workingDaysPerMonth}
                                                    onChange={(e) => setLocalCompliance({...localCompliance, workingDaysPerMonth: parseInt(e.target.value)})}
                                                >
                                                    <option value={22}>22 Days (Mon-Fri)</option>
                                                    <option value={26}>26 Days (Mon-Sat)</option>
                                                    <option value={30}>30 Days (Fixed Denominator)</option>
                                                </select>
                                                <p className="text-[11px] text-slate-500 font-medium">Used for unpaid leave pro-rata deductions.</p>
                                            </div>

                                            <div className="space-y-3">
                                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block">PIT Tax Rate (%)</label>
                                                <div className="relative">
                                                    <input 
                                                        type="number"
                                                        step="0.01"
                                                        className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-950 focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] text-base font-black outline-none transition-all shadow-sm"
                                                        value={localCompliance.pitRate * 100}
                                                        onChange={(e) => setLocalCompliance({...localCompliance, pitRate: parseFloat(e.target.value) / 100})}
                                                    />
                                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">%</span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 font-medium">Applied to income exceeding threshold.</p>
                                            </div>

                                            <div className="space-y-3">
                                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block">PIT Annual Threshold</label>
                                                <div className="relative">
                                                    <input 
                                                        type="number"
                                                        className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-950 focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] text-base font-black outline-none transition-all shadow-sm"
                                                        value={localCompliance.pitThreshold}
                                                        onChange={(e) => setLocalCompliance({...localCompliance, pitThreshold: parseInt(e.target.value) || 0})}
                                                    />
                                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">MMK</span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 font-medium">Income below this is tax-exempt.</p>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block">Monthly SSB Contribution Cap</label>
                                                <div className="relative group">
                                                    <input 
                                                        type="number"
                                                        className="w-full px-4 py-3 border border-emerald-200 dark:border-emerald-800/30 rounded-xl dark:bg-slate-950 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-base font-black outline-none transition-all shadow-sm"
                                                        value={localCompliance.ssbCap}
                                                        onChange={(e) => setLocalCompliance({...localCompliance, ssbCap: parseInt(e.target.value) || 0})}
                                                    />
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/30 rounded text-[10px] font-bold text-emerald-700">
                                                        <span className="material-symbols-outlined !text-[12px]">security</span>
                                                        AUDITED
                                                    </div>
                                                </div>
                                                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                                                    Statutory maximum applied for Social Security Board filings. Current Myanmar law dictates <span className="text-emerald-600 font-bold">6,000 MMK</span> ceiling.
                                                </p>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block">SSB Employee Deduction (%)</label>
                                                <div className="relative">
                                                    <input 
                                                        type="number"
                                                        step="0.1"
                                                        className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-950 focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] text-base font-black outline-none transition-all shadow-sm"
                                                        value={localCompliance.ssbPercent}
                                                        onChange={(e) => setLocalCompliance({...localCompliance, ssbPercent: parseFloat(e.target.value) || 0})}
                                                    />
                                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">%</span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 font-medium leading-relaxed flex items-start gap-1">
                                                    <span className="material-symbols-outlined !text-[14px] mt-0.5 text-amber-500">info</span>
                                                    Default: 2.0%. Changes trigger system-wide re-calculation for the next Payroll Run.
                                                </p>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block">PIT Threshold (Annual)</label>
                                                <div className="relative">
                                                    <input 
                                                        type="number"
                                                        className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-950 focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] text-base font-black outline-none transition-all shadow-sm"
                                                        value={localCompliance.pitExemption}
                                                        onChange={(e) => setLocalCompliance({...localCompliance, pitExemption: parseInt(e.target.value) || 0})}
                                                    />
                                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">MMK</span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                                                    <span className="text-emerald-600 font-bold">Myanmar PIT Rules Applied:</span> 20% personal relief (capped at 10M MMK) + spouse (1M) + parents (1M each) + children (500K each). Tax brackets: 0% (first 2M), 5%, 10%, 15%, 20%, 25% (above 70M).
                                                </p>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block">System Currency</label>
                                                <div className="relative">
                                                    <select 
                                                        className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-950 focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] text-base font-black outline-none transition-all shadow-sm"
                                                        value={localCompliance.currency}
                                                        onChange={(e) => setLocalCompliance({...localCompliance, currency: e.target.value as 'MMK' | 'SGD'})}
                                                    >
                                                        <option value="MMK">MMK - Myanmar Kyat</option>
                                                        <option value="SGD">SGD - Singapore Dollar</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block">Attendance Grace Period (Mins)</label>
                                                <div className="relative">
                                                    <input 
                                                        type="number"
                                                        className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-950 focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] text-base font-black outline-none transition-all shadow-sm"
                                                        value={localCompliance.attendanceGracePeriod}
                                                        onChange={(e) => setLocalCompliance({...localCompliance, attendanceGracePeriod: parseInt(e.target.value) || 0})}
                                                    />
                                                </div>
                                                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                                                    Minutes allowed before an employee is marked Late or penalized.
                                                </p>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block">Attendance/Late Penalty</label>
                                                <div className="relative">
                                                    <input 
                                                        type="number"
                                                        className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-950 focus:ring-2 focus:ring-red-500/20 focus:border-red-400 text-base font-black outline-none transition-all shadow-sm"
                                                        value={localCompliance.attendancePenalty}
                                                        onChange={(e) => setLocalCompliance({...localCompliance, attendancePenalty: parseInt(e.target.value) || 0})}
                                                    />
                                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{localCompliance.currency}</span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                                                    Flat deduction amount applied for unexcused attendance violations or geofence breaches.
                                                </p>
                                            </div>

                                            {/* Auto Attendance Toggles */}
                                            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4 col-span-1 md:col-span-2 lg:col-span-3">
                                                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 transition-all hover:border-indigo-200 dark:hover:border-indigo-900/40">
                                                    <div className="space-y-1">
                                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                            <span className="material-symbols-outlined text-indigo-600 text-[20px]">robot_2</span>
                                                            Global Auto Attendance Policy
                                                        </h4>
                                                        <p className="text-[11px] text-slate-500 font-medium max-w-2xl">
                                                            <span className="text-amber-600 font-bold">⚠️ Warning:</span> Enabling this will automatically generate work hours based on assigned shift schedules for opted-in employees.
                                                        </p>
                                                    </div>
                                                    <button 
                                                        onClick={() => setLocalSystem({...localSystem, autoAttendancePolicyEnabled: !localSystem.autoAttendancePolicyEnabled})}
                                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${localSystem.autoAttendancePolicyEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                                                    >
                                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localSystem.autoAttendancePolicyEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                                    </button>
                                                </div>

                                                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 transition-all hover:border-emerald-200 dark:hover:border-emerald-900/40">
                                                    <div className="space-y-1">
                                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                            <span className="material-symbols-outlined text-emerald-600 text-[20px]">holiday_village</span>
                                                            Allow Auto-Generation on Holidays
                                                        </h4>
                                                        <p className="text-[11px] text-slate-500 font-medium max-w-2xl">
                                                            If disabled, auto-attendance will remain idle on dates listed in the <span className="font-bold">Public Holidays</span> array to prevent false payroll payouts.
                                                        </p>
                                                    </div>
                                                    <button 
                                                        onClick={() => setLocalSystem({...localSystem, autoHolidayWorkEnabled: !localSystem.autoHolidayWorkEnabled})}
                                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${localSystem.autoHolidayWorkEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                                                    >
                                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localSystem.autoHolidayWorkEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    {/* --- Allowance Master Section --- */}
                                    <section className="animate-fade-in space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="size-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 font-bold">
                                                    <span className="material-symbols-outlined">payments</span>
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Allowance Master</h3>
                                                    <p className="text-xs text-slate-500 font-medium tracking-tight">Define standard and custom income types with automated logic</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => setShowAlwModal(true)}
                                                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-200 dark:shadow-none hover:bg-emerald-700 transition-all flex items-center gap-2 uppercase tracking-widest"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">add</span>
                                                Create Custom
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {localSystem.allowanceConfigs.map(config => (
                                                <div key={config.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-start gap-4 transition-all hover:border-emerald-200">
                                                    <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 shrink-0">
                                                        <span className="material-symbols-outlined text-[20px]">{config.logic === 'Attendance-Based' ? 'event_available' : 'attach_money'}</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <h4 className="font-bold text-slate-800 dark:text-slate-200 truncate">{config.name}</h4>
                                                            <button 
                                                                onClick={() => handleToggleAllowance(config.id)}
                                                                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter shrink-0 transition-colors ${config.isEnabled ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                                            >
                                                                {config.isEnabled ? 'Active' : 'Disabled'}
                                                            </button>
                                                        </div>
                                                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">{config.logic}</p>
                                                        <div className="mt-3 flex items-center gap-2">
                                                            <div className="flex-1 bg-slate-50 dark:bg-slate-850 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800 flex justify-between items-center overflow-hidden">
                                                                <span className="text-[10px] font-black text-slate-400 uppercase shrink-0">Rate/Value</span>
                                                                <span className="text-xs font-bold text-slate-900 dark:text-slate-200 truncate ml-2">
                                                                    {config.logic === 'Percentage of Base' ? `${config.value}%` : `${config.value.toLocaleString()} MMK`}
                                                                </span>
                                                            </div>
                                                            <button 
                                                                onClick={() => {
                                                                    setLocalSystem(prev => ({
                                                                        ...prev,
                                                                        allowanceConfigs: prev.allowanceConfigs.filter(a => a.id !== config.id)
                                                                    }));
                                                                }}
                                                                className={`p-1 transition-all ${config.isDeletable ? 'text-rose-400 hover:text-rose-600' : 'text-slate-200 cursor-not-allowed'}`}
                                                                disabled={!config.isDeletable}
                                                            >
                                                                <span className="material-symbols-outlined text-[18px]">{config.isDeletable ? 'delete' : 'lock'}</span>
                                                            </button>
                                                            <button className="p-1 text-slate-400 hover:text-[#4F46E5] transition-all shrink-0">
                                                                <span className="material-symbols-outlined text-[18px]">settings</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    {/* --- Deduction Master Section --- */}
                                    <section className="animate-fade-in space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="size-10 rounded-xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-rose-600 font-bold">
                                                    <span className="material-symbols-outlined">rule</span>
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Deduction Master</h3>
                                                    <p className="text-xs text-slate-500 font-medium tracking-tight">Configure automated penalties for attendance violations and leave</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => setShowDedModal(true)}
                                                className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-black shadow-lg shadow-rose-200 dark:shadow-none hover:bg-rose-700 transition-all flex items-center gap-2 uppercase tracking-widest"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">add</span>
                                                Create Custom
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {localSystem.deductionConfigs.map(config => (
                                                <div key={config.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-start gap-4 transition-all hover:border-rose-200">
                                                    <div className={`p-2.5 rounded-lg shrink-0 ${config.logic.includes('Penalty') ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}>
                                                        <span className="material-symbols-outlined text-[20px]">
                                                            {config.logic === 'Late Penalty' && 'schedule'}
                                                            {config.logic === 'Missing Punch Penalty' && 'cancel'}
                                                            {config.logic === 'Unpaid Leave' && 'event_busy'}
                                                            {config.logic === 'Flat Rate' && 'money_off'}
                                                            {config.logic === 'Percentage of Base' && 'percent'}
                                                        </span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <h4 className="font-bold text-slate-800 dark:text-slate-200 truncate">{config.name}</h4>
                                                            <button 
                                                                onClick={() => handleToggleDeduction(config.id)}
                                                                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter shrink-0 transition-colors ${config.isEnabled ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                                            >
                                                                {config.isEnabled ? 'Active' : 'Disabled'}
                                                            </button>
                                                        </div>
                                                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">{config.logic}</p>
                                                        <div className="mt-3 flex items-center gap-2">
                                                            <div className="flex-1 bg-slate-50 dark:bg-slate-850 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800 flex justify-between items-center overflow-hidden">
                                                                <span className="text-[10px] font-black text-slate-400 uppercase shrink-0">Amount/Rule</span>
                                                                <span className="text-xs font-bold text-rose-600 truncate ml-2">
                                                                    {config.logic === 'Late Penalty' ? `${config.value.toLocaleString()} / 15m` : config.logic === 'Percentage of Base' ? `${config.value}%` : `${config.value.toLocaleString()} MMK`}
                                                                </span>
                                                            </div>
                                                            <button 
                                                                onClick={() => {
                                                                    setLocalSystem(prev => ({
                                                                        ...prev,
                                                                        deductionConfigs: prev.deductionConfigs.filter(d => d.id !== config.id)
                                                                    }));
                                                                }}
                                                                className={`p-1 transition-all ${config.isDeletable ? 'text-rose-400 hover:text-rose-600' : 'text-slate-200 cursor-not-allowed'}`}
                                                                disabled={!config.isDeletable}
                                                            >
                                                                <span className="material-symbols-outlined text-[18px]">{config.isDeletable ? 'delete' : 'lock'}</span>
                                                            </button>
                                                            <button className="p-1 text-slate-400 hover:text-[#4F46E5] transition-all shrink-0">
                                                                <span className="material-symbols-outlined text-[18px]">settings</span>
                                                            </button>
                                                        </div>
                                                        {config.affectedIncomeParts && config.affectedIncomeParts.length > 0 && (
                                                            <div className="mt-2 flex flex-wrap gap-1">
                                                                {config.affectedIncomeParts.map(part => (
                                                                    <span key={part} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 text-[8px] font-black uppercase rounded">{part}</span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    {/* ─── Loans & Financial Policy ─── */}
                                    <section className="pt-6 border-t border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="size-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-[#4F46E5]">
                                                <span className="material-symbols-outlined">account_balance_wallet</span>
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Loans & Financial Policy</h3>
                                                <p className="text-xs text-slate-500 font-medium">Changes trigger high-priority Security Audit Registry entries.</p>
                                            </div>
                                        </div>
                                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                {/* Multiplier */}
                                                <div className="space-y-2">
                                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest block">Loan Limit Multiplier</label>
                                                    <div className="relative">
                                                        <input type="number" min={1} max={5} step={0.5}
                                                            value={localLoanConfig.loanLimitMultiplier}
                                                            onChange={e => setLocalLoanConfig(p => ({ ...p, loanLimitMultiplier: parseFloat(e.target.value) || 1 }))}
                                                            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-950 focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] text-base font-black outline-none transition-all shadow-sm"
                                                        />
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">× base salary</span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-400">Max an employee can borrow. Default: <span className="font-bold text-slate-600 dark:text-slate-300">2×</span></p>
                                                </div>
                                                {/* Max Emergency Term */}
                                                <div className="space-y-2">
                                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest block">Max Emergency Loan Term</label>
                                                    <div className="relative">
                                                        <input type="number" min={1} max={36}
                                                            value={localLoanConfig.maxEmergencyLoanTerm}
                                                            onChange={e => setLocalLoanConfig(p => ({ ...p, maxEmergencyLoanTerm: parseInt(e.target.value) || 1 }))}
                                                            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-950 focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] text-base font-black outline-none transition-all shadow-sm"
                                                        />
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">months</span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-400">Maximum repayment duration. Default: <span className="font-bold text-slate-600 dark:text-slate-300">12 months</span></p>
                                                </div>
                                                {/* Salary Advance Term */}
                                                <div className="space-y-2">
                                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest block">Salary Advance Term</label>
                                                    <div className="relative">
                                                        <input type="number" min={1} max={6}
                                                            value={localLoanConfig.salaryAdvanceTerm}
                                                            onChange={e => setLocalLoanConfig(p => ({ ...p, salaryAdvanceTerm: parseInt(e.target.value) || 1 }))}
                                                            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-950 focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] text-base font-black outline-none transition-all shadow-sm"
                                                        />
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">month(s)</span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-400">Payroll cycles for salary advance. Default: <span className="font-bold text-slate-600 dark:text-slate-300">1 month</span></p>
                                                </div>
                                            </div>
                                            {/* Rounding Method */}
                                            <div className="space-y-2 max-w-xs">
                                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block">Installment Rounding Method</label>
                                                <select
                                                    value={localLoanConfig.roundingMethod}
                                                    onChange={e => setLocalLoanConfig(p => ({ ...p, roundingMethod: e.target.value as 'nearest' | 'ceiling' | 'floor' }))}
                                                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-950 focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] text-sm font-bold outline-none transition-all shadow-sm bg-white dark:bg-slate-950"
                                                >
                                                    <option value="nearest">Nearest (standard)</option>
                                                    <option value="ceiling">Ceiling (always round up)</option>
                                                    <option value="floor">Floor (always round down)</option>
                                                </select>
                                                <p className="text-[10px] text-slate-400">Applied in the Payroll Engine when computing monthly installments.</p>
                                            </div>
                                            {/* Live Preview */}
                                            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/40 rounded-xl p-4 flex items-center gap-3">
                                                <span className="material-symbols-outlined text-[#4F46E5] text-[22px]">calculate</span>
                                                <div>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Live Policy Preview (Sample: 500,000 MMK base)</p>
                                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                                        Max loan = <span className="text-[#4F46E5]">{(500000 * localLoanConfig.loanLimitMultiplier).toLocaleString()} MMK</span>
                                                        {' '}&middot; Advance EMI = <span className="text-[#4F46E5]">{Math.round(500000 / localLoanConfig.salaryAdvanceTerm).toLocaleString()} MMK/mo</span>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            )}

                            {activeTab === 'Locations' && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Office Locations</h3>
                                            <p className="text-xs text-slate-500 font-medium">Manage sites and geofence parameters for mobile clock-ins.</p>
                                        </div>
                                        <button onClick={() => { setEditingLoc(null); setShowLocationModal(true); }} className="text-xs font-black bg-[#4F46E5] text-white px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none hover:opacity-90 transition-all uppercase tracking-widest flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[18px]">add_location</span>
                                            Add Location
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-10">
                                        {systemSettings.officeLocations.map(loc => (
                                            <div key={loc.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm group hover:border-[#4F46E5]/40 transition-all">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="size-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-[#4F46E5]">
                                                            <span className="material-symbols-outlined">location_on</span>
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-slate-900 dark:text-white">{loc.name}</h4>
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                <span className={`size-2 rounded-full ${loc.coords.lat !== 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{loc.coords.lat !== 0 ? 'Geofence Active' : 'No Coordinates'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => { setEditingLoc({ ...loc, lat: loc.coords.lat, lng: loc.coords.lng, address: (loc as any).address || '' }); setShowLocationModal(true); }} className="p-2 text-slate-400 hover:text-[#4F46E5] hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all">
                                                            <span className="material-symbols-outlined text-[20px]">edit</span>
                                                        </button>
                                                        <button onClick={() => handleDeleteLoc(loc.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all">
                                                            <span className="material-symbols-outlined text-[20px]">delete</span>
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="space-y-3 pt-4 border-t border-slate-50 dark:border-slate-800">
                                                    <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                                                        <span className="material-symbols-outlined text-[16px] text-slate-400">map</span>
                                                        {(loc as any).address || 'No address specified'}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                                        <span className="material-symbols-outlined text-[16px] text-slate-400">radar</span>
                                                        Radius: {loc.radius}m
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'Departments' && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Org Departments</h3>
                                            <p className="text-xs text-slate-500 font-medium">Structuring the company hierarchy for reporting and analytics.</p>
                                        </div>
                                        <button onClick={() => { setEditingDept(null); setShowDeptModal(true); }} className="text-xs font-black bg-[#4F46E5] text-white px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none hover:opacity-90 transition-all uppercase tracking-widest flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[18px]">add_business</span>
                                            Add Department
                                        </button>
                                    </div>

                                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mb-10">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest w-16">Sort</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Department Name</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Code</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {systemSettings.departments.sort((a,b) => a.order - b.order).map((dept, idx) => (
                                                    <tr key={dept.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button onClick={() => handleMoveDept(idx, 'up')} disabled={idx === 0} className="text-slate-400 hover:text-[#4F46E5] disabled:opacity-20"><span className="material-symbols-outlined !text-[18px]">keyboard_arrow_up</span></button>
                                                                <button onClick={() => handleMoveDept(idx, 'down')} disabled={idx === systemSettings.departments.length - 1} className="text-slate-400 hover:text-[#4F46E5] disabled:opacity-20"><span className="material-symbols-outlined !text-[18px]">keyboard_arrow_down</span></button>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-white uppercase tracking-tight text-sm">{dept.name}</td>
                                                        <td className="px-6 py-4">
                                                            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded font-black text-[10px] tracking-widest">{dept.code}</span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <button onClick={() => { setEditingDept(dept); setShowDeptModal(true); }} className="p-2 text-slate-400 hover:text-[#4F46E5] transition-all"><span className="material-symbols-outlined text-[20px]">edit</span></button>
                                                                <button onClick={() => handleDeleteDept(dept.id)} className="p-2 text-slate-400 hover:text-rose-500 transition-all"><span className="material-symbols-outlined text-[20px]">delete</span></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'Positions' && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Job Positions</h3>
                                            <p className="text-xs text-slate-500 font-medium">Standardize roles for payroll bands and responsibility tracking.</p>
                                        </div>
                                        <button onClick={() => { setEditingPos(null); setShowPositionModal(true); }} className="text-xs font-black bg-[#4F46E5] text-white px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none hover:opacity-90 transition-all uppercase tracking-widest flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[18px]">work</span>
                                            Add Position
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-10">
                                        {systemSettings.positions.map(pos => {
                                            const dept = systemSettings.departments.find(d => d.id === pos.deptId);
                                            return (
                                                <div key={pos.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative group overflow-hidden">
                                                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div>
                                                            <h4 className="font-bold text-slate-900 dark:text-white text-base leading-tight">{pos.name}</h4>
                                                            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mt-1">{dept?.name || 'General Org'}</p>
                                                        </div>
                                                        <div className="flex gap-1">
                                                            <button onClick={() => { setEditingPos(pos); setShowPositionModal(true); }} className="p-2 text-slate-300 hover:text-[#4F46E5] transition-all"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                                                            <button onClick={() => handleDeletePos(pos.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-all"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                                                        </div>
                                                    </div>
                                                    <div className="pt-4 border-t border-slate-50 dark:border-slate-800 flex items-center gap-2">
                                                        <div className="size-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                                            <span className="material-symbols-outlined !text-[14px] text-slate-400">account_tree</span>
                                                        </div>
                                                        <span className="text-[11px] font-medium text-slate-500 truncate">Reports to: <span className="font-bold text-slate-700 dark:text-slate-300">{pos.reportTo || 'Board/Executive'}</span></span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'User Access' && (

                                <div className="space-y-10 animate-fade-in">
                                    <section>
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className="size-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600">
                                                    <span className="material-symbols-outlined">admin_panel_settings</span>
                                                </div>
                                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Admin Privileges (RBAC)</h3>
                                            </div>
                                            <button onClick={() => setShowAdminPicker(true)} className="text-xs font-black bg-[#4F46E5] text-white px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none hover:opacity-90 transition-all uppercase tracking-widest">+ Assign Admin</button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {adminProfiles.map(admin => (
                                                <div key={admin.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 transition-all hover:border-[#4F46E5]/40 group relative">
                                                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <span onClick={() => handleRevokeAdminAction(admin.id)} className="material-symbols-outlined text-slate-400 cursor-pointer hover:text-red-500">cancel</span>
                                                    </div>
                                                    <div className={`size-12 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm ${admin.colorClass || 'bg-slate-100 text-slate-700'}`}>
                                                        {admin.avatar ? <img src={admin.avatar} alt={admin.name} className="size-12 rounded-full object-cover" /> : admin.initials}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-900 dark:text-white text-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-[140px]">{admin.name}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{admin.id}</p>
                                                        <div className="mt-1 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded text-[9px] font-bold w-fit uppercase tracking-tighter">System Administrator</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="size-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600">
                                                    <span className="material-symbols-outlined">rule</span>
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Role Permission Matrix</h3>
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Define granular access for non-admin roles</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="border-b border-slate-100 dark:border-slate-800">
                                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Permission Scope</th>
                                                        {localSystem.roles?.filter(r => r.role !== 'Admin').map(role => (
                                                            <th key={role.role} className="px-6 py-4 text-center text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-tight">{role.role}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50 text-sm">
                                                    {[
                                                        { key: 'canViewPayroll', label: 'View Payroll & Salaries', desc: 'Access to Payroll Run and Bank Disbursement modules.' },
                                                        { key: 'canApproveLoans', label: 'Approve Loans/Advances', desc: 'Review and approve financial loan requests.' },
                                                        { key: 'canEditAssets', label: 'Manage Company Assets', desc: 'Modify asset registry and audit records.' },
                                                        { key: 'canEditSettings', label: 'Access System Settings', desc: 'Modify global configurations.' },
                                                        { key: 'canAccessForms', label: 'Access Forms Library', desc: 'View archived documents.' }
                                                    ].map(perm => (
                                                        <tr key={perm.key} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors">
                                                            <td className="px-6 py-4">
                                                                <p className="font-bold text-slate-900 dark:text-white text-xs">{perm.label}</p>
                                                                <p className="text-[10px] text-slate-400 mt-0.5">{perm.desc}</p>
                                                            </td>
                                                            {localSystem.roles?.filter(r => r.role !== 'Admin').map(role => {
                                                                const hasPerm = role.permissions.includes(perm.key);
                                                                return (
                                                                    <td key={role.role} className="px-6 py-4 text-center">
                                                                        <button 
                                                                            onClick={() => {
                                                                                setLocalSystem(prev => ({
                                                                                    ...prev,
                                                                                    roles: prev.roles.map(r => r.role === role.role ? {
                                                                                        ...r,
                                                                                        permissions: hasPerm ? r.permissions.filter(p => p !== perm.key) : [...r.permissions, perm.key]
                                                                                    } : r)
                                                                                }));
                                                                            }}
                                                                            className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none ${hasPerm ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                                                                        >
                                                                            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${hasPerm ? 'translate-x-6' : 'translate-x-1'}`} />
                                                                        </button>
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </section>

                                    <section>
                                        <div className="flex items-center justify-between mb-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                                            <div className="flex items-center gap-3">
                                                <div className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                                                    <span className="material-symbols-outlined">receipt_long</span>
                                                </div>
                                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Security Audit Registry</h3>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <select 
                                                    className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none cursor-pointer"
                                                    value={auditModuleFilter}
                                                    onChange={(e) => setAuditModuleFilter(e.target.value)}
                                                >
                                                    <option value="All">All Modules</option>
                                                    <option value="Payroll">Payroll</option>
                                                    <option value="Settings">Settings</option>
                                                    <option value="Attendance">Attendance</option>
                                                </select>
                                                <div className="relative">
                                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 !text-sm">search</span>
                                                    <input 
                                                        type="text" 
                                                        placeholder="Search audit trail..."
                                                        className="pl-8 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-xs focus:ring-2 focus:ring-[#4F46E5]/20 outline-none"
                                                        value={auditSearch}
                                                        onChange={(e) => setAuditSearch(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                            <table className="w-full text-left text-xs">
                                                <thead>
                                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                                        <th className="px-6 py-4 font-black uppercase text-slate-500 tracking-widest">Timestamp</th>
                                                        <th className="px-6 py-4 font-black uppercase text-slate-500 tracking-widest">Admin ID</th>
                                                        <th className="px-6 py-4 font-black uppercase text-slate-500 tracking-widest">Action</th>
                                                        <th className="px-6 py-4 font-black uppercase text-slate-500 tracking-widest">Module</th>
                                                        <th className="px-6 py-4 font-black uppercase text-slate-500 tracking-widest">Event Detail</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                    {filteredAuditLogs.map(log => (
                                                        <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                            <td className="px-6 py-4 font-mono text-slate-500">
                                                                {log.timestamp.replace('T', ' ').slice(0, 19)}
                                                            </td>
                                                            <td className="px-6 py-4 font-bold text-primary">{log.adminId}</td>
                                                            <td className="px-6 py-4">
                                                                <span className={`px-2 py-1 rounded-md font-black uppercase tracking-tighter text-[9px] ${
                                                                    log.actionType === 'Security Violation' ? 'bg-red-50 text-red-600' :
                                                                    log.actionType.includes('Update') ? 'bg-amber-50 text-amber-600' :
                                                                    'bg-indigo-50 text-indigo-600'
                                                                }`}>
                                                                    {log.actionType}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 font-bold text-slate-600 dark:text-slate-400">{log.module}</td>
                                                            <td className="px-6 py-4 text-slate-500 line-clamp-1 h-12 flex items-center" title={log.detail}>
                                                                {log.detail}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {filteredAuditLogs.length === 0 && (
                                                        <tr>
                                                            <td colSpan={5} className="px-6 py-10 text-center text-slate-400 italic font-medium">No system events recorded for this session.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </section>
                                </div>
                            )}

                            {activeTab === 'Onboarding Templates' && (
                                <div className="space-y-10 animate-fade-in">
                                    <section>
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className="size-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600">
                                                    <span className="material-symbols-outlined">checklist</span>
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Role-Based Onboarding Templates</h3>
                                                    <p className="text-xs text-slate-500 font-medium mt-1">Define mandatory tasks required for seamless integration of new hires.</p>
                                                </div>
                                            </div>
                                            <button onClick={() => setShowCreateTemplateModal(true)} className="text-xs font-black bg-[#4F46E5] text-white px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none hover:opacity-90 transition-all uppercase tracking-widest">+ Create Template</button>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                            {systemSettings.onboardingTemplates.map(template => (
                                                <div key={template.roleId} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                                                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-between items-center">
                                                        <div className="flex items-center gap-2">
                                                            <span className="material-symbols-outlined text-slate-400 text-[20px]">badge</span>
                                                            <h4 className="font-bold text-slate-900 dark:text-white">{template.roleId}</h4>
                                                        </div>
                                                        <span className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded text-[10px] font-bold uppercase tracking-wider">{template.tasks.length} Tasks</span>
                                                    </div>
                                                    <div className="p-6 flex-1 bg-slate-50/20 dark:bg-slate-900/50">
                                                        <ul className="space-y-3">
                                                            {template.tasks.map((task, idx) => (
                                                                <li key={idx} className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
                                                                    <div className={`mt-0.5 size-5 flex items-center justify-center rounded ${task.isMandatory ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                                                                        <span className="material-symbols-outlined text-[14px]">
                                                                            {task.isMandatory ? 'priority_high' : 'check'}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <div className="flex items-center justify-between gap-2">
                                                                            <span className="text-sm font-bold text-slate-900 dark:text-white">{task.title}</span>
                                                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{task.type}</span>
                                                                        </div>
                                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{task.tooltip}</p>
                                                                    </div>
                                                                    <button onClick={() => handleDeleteTemplateTask(template.roleId, idx)} className="text-slate-400 hover:text-rose-500 transition-colors p-1">
                                                                        <span className="material-symbols-outlined text-[16px]">delete</span>
                                                                    </button>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                    <div className="p-4 border-t border-slate-100 dark:border-slate-800 text-center">
                                                        <button onClick={() => setAddTaskModalRoleId(template.roleId)} className="text-xs font-bold text-[#4F46E5] hover:text-[#4338CA] transition-colors">+ Add Optional Task</button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                </div>
                            )}

                            {activeTab === 'Payment Providers' && (
                                <div className="space-y-8 animate-fade-in pb-10">
                                    <section>
                                        <div className="flex items-start justify-between mb-6">
                                            <div>
                                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Payment Provider Manager</h3>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">Define corporate banks and digital wallet gateways. These routing details are required before Payroll records can be legally exported.</p>
                                            </div>
                                            <button onClick={() => setShowCreateProviderModal(true)} className="text-xs font-black bg-[#4F46E5] text-white px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none hover:opacity-90 transition-all uppercase tracking-widest">+ Add Provider</button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {localSystem.paymentProviders.map(provider => (
                                                <div key={provider.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 relative group overflow-hidden">
                                                    <div className="absolute top-0 left-0 w-1 h-full bg-[#4F46E5]"></div>
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`size-10 rounded-xl flex items-center justify-center ${provider.type === 'Bank' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600'}`}>
                                                                <span className="material-symbols-outlined">{provider.type === 'Bank' ? 'account_balance' : 'account_balance_wallet'}</span>
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-slate-900 dark:text-white text-base">{provider.name}</h4>
                                                                <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500">{provider.type}</span>
                                                            </div>
                                                        </div>
                                                        <button onClick={() => handleDeleteProvider(provider.id)} className="text-slate-400 hover:text-rose-500 transition-colors p-1 opacity-0 group-hover:opacity-100">
                                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                                        </button>
                                                    </div>
                                                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block mb-2">Required Fields for Export</span>
                                                        <div className="flex flex-wrap gap-2">
                                                            {provider.requiredFields.map(field => (
                                                                <span key={field} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-xs font-medium border border-slate-200 dark:border-slate-700">
                                                                    {field === 'accountNumber' ? 'Account Number' : field === 'mobile' ? 'Mobile Number (9-11 digits)' : field}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                    
                                    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 max-w-2xl">
                                        <div className="flex items-center gap-3 mb-6">
                                            <span className="material-symbols-outlined text-[#4F46E5] text-[28px]">calculate</span>
                                            <div>
                                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Global Rounding Protocol (Pyas Config)</h3>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Applied strictly to digital wallet batch limits (e.g. KPay) which actively reject decimal payload fragments.</p>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            {['Nearest', 'Ceiling', 'Floor', 'None'].map(logic => (
                                                <label key={logic} onClick={() => setLocalSystem({...localSystem, paymentRoundingLogic: logic as any})} className={`flex items-center p-4 rounded-xl border cursor-pointer transition-all ${localSystem.paymentRoundingLogic === logic ? 'border-[#4F46E5] bg-indigo-50/50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`size-5 rounded-full border-2 flex items-center justify-center ${localSystem.paymentRoundingLogic === logic ? 'border-[#4F46E5]' : 'border-slate-300 dark:border-slate-600'}`}>
                                                            {localSystem.paymentRoundingLogic === logic && <div className="size-2.5 rounded-full bg-[#4F46E5]"></div>}
                                                        </div>
                                                        <span className="font-bold text-sm text-slate-700 dark:text-slate-200">{logic === 'None' ? 'Exact Calculation (Allow Decimals/Pyas)' : `${logic} Whole Integer (MMK Formatted)`}</span>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </section>
                                </div>
                            )}

                            {activeTab === 'Devices & APIs' && (
                                <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 animate-fade-in group">
                                    <div className="relative">
                                        <div className="size-20 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-[#4F46E5] mb-6 group-hover:scale-110 transition-transform duration-500">
                                            <span className="material-symbols-outlined text-[48px]">dns</span>
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 size-8 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center border border-slate-100 dark:border-slate-800">
                                            <span className="material-symbols-outlined text-[#4F46E5] text-[18px]">verified</span>
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Hardware Sync Interface</h3>
                                    <p className="text-sm text-slate-500 mt-2 max-w-sm text-center leading-relaxed font-medium">The ZK-Teco and Fingerprint API tunnel is currently in <strong>Simulation Mode</strong> for testing and demonstration.</p>
                                    
                                    <div className="mt-8 flex gap-4">
                                        <button 
                                            onClick={() => {
                                                syncAttendance();
                                                alert("Hardware Simulation Triggered: Biometric terminal logs are being synchronized with the global Attendance state.");
                                            }}
                                            className="px-6 py-3 bg-[#4F46E5] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none flex items-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">sync</span>
                                            Simulate Device Sync
                                        </button>
                                        <button className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl text-xs font-black uppercase tracking-widest cursor-not-allowed border-none">API Documentation</button>
                                    </div>
                                    
                                    <div className="mt-10 grid grid-cols-2 gap-4 w-full max-w-lg px-8">
                                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Terminal Status</p>
                                            <p className="text-sm font-bold text-emerald-600 flex items-center gap-1">
                                                <span className="size-1.5 rounded-full bg-emerald-500"></span> Online
                                            </p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Protocol</p>
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">TCP/IP Tunnel</p>
                                        </div>
                                    </div>

                                    {/* NEW: Device Display & Location Settings */}
                                    <div className="mt-8 w-full max-w-lg px-8 space-y-6">
                                        <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                                            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-4">Device Display Settings</h4>
                                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                                                <div>
                                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Show Terminal QR Code</p>
                                                    <p className="text-[10px] text-slate-500 font-medium">Allow rapid login via device-generated QR</p>
                                                </div>
                                                <button 
                                                    onClick={() => setLocalSystem({
                                                        ...localSystem, 
                                                        deviceConfig: { ...localSystem.deviceConfig, showQR: !localSystem.deviceConfig.showQR }
                                                    })}
                                                    className={`w-12 h-6 rounded-full transition-all relative ${localSystem.deviceConfig.showQR ? 'bg-[#4F46E5]' : 'bg-slate-300 dark:bg-slate-700'}`}
                                                >
                                                    <div className={`absolute top-1 size-4 bg-white rounded-full transition-all ${localSystem.deviceConfig.showQR ? 'right-1' : 'left-1'}`}></div>
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-4">Device Hardware Location</h4>
                                            <div className="space-y-2">
                                                {systemSettings.officeLocations.map(loc => (
                                                    <button 
                                                        key={loc.id}
                                                        onClick={() => setLocalSystem({
                                                            ...localSystem,
                                                            deviceConfig: { ...localSystem.deviceConfig, activeLocationId: loc.id }
                                                        })}
                                                        className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${localSystem.deviceConfig.activeLocationId === loc.id ? 'border-[#4F46E5] bg-indigo-50/50 dark:bg-indigo-900/20' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900'}`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <span className={`material-symbols-outlined ${localSystem.deviceConfig.activeLocationId === loc.id ? 'text-[#4F46E5]' : 'text-slate-400'}`}>location_on</span>
                                                            <div className="text-left">
                                                                <p className={`text-sm font-bold ${localSystem.deviceConfig.activeLocationId === loc.id ? 'text-[#4F46E5]' : 'text-slate-700 dark:text-slate-300'}`}>{loc.name}</p>
                                                                <p className="text-[10px] text-slate-500 font-medium">{loc.coords.lat}, {loc.coords.lng}</p>
                                                            </div>
                                                        </div>
                                                        {localSystem.deviceConfig.activeLocationId === loc.id && <span className="material-symbols-outlined text-[#4F46E5]">check_circle</span>}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="pt-6">
                                            <button 
                                                onClick={() => navigate('/device-setup')}
                                                className="w-full py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-black transition-all flex items-center justify-center gap-2 group"
                                            >
                                                <span className="material-symbols-outlined group-hover:rotate-12 transition-transform">terminal</span>
                                                Launch ZKT Zpad Simulator
                                            </button>
                                            <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-3 italic">⚠️ System: Authorized hardware sessions only</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'Holidays & Closures' && (
                                <div className="space-y-10 animate-fade-in">
                                    <section>
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className="size-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-500">
                                                    <span className="material-symbols-outlined">event_busy</span>
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Holidays & Closures</h3>
                                                    <p className="text-sm text-slate-500">Define global non-working days for leave validations</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => {
                                                        const moiHolidays = [
                                                            { date: '2024-01-04', name: 'Independence Day', isRestricted: true },
                                                            { date: '2024-02-12', name: 'Union Day', isRestricted: true },
                                                            { date: '2024-03-02', name: 'Peasants Day', isRestricted: true },
                                                            { date: '2024-03-27', name: 'Armed Forces Day', isRestricted: true },
                                                            { date: '2024-04-13', name: 'Thingyan Festival (Water Festival)', isRestricted: true },
                                                            { date: '2024-04-14', name: 'Thingyan Festival (Water Festival)', isRestricted: true },
                                                            { date: '2024-04-15', name: 'Thingyan Festival (Water Festival)', isRestricted: true },
                                                            { date: '2024-04-16', name: 'Thingyan Festival (Water Festival)', isRestricted: true },
                                                            { date: '2024-04-17', name: 'Myanmar New Year', isRestricted: true },
                                                            { date: '2024-05-01', name: 'Labor Day', isRestricted: true },
                                                            { date: '2024-07-19', name: 'Martyrs Day', isRestricted: true }
                                                        ];
                                                        moiHolidays.forEach(h => {
                                                            if (!holidays.some(ext => ext.date === h.date)) {
                                                                addHoliday(h);
                                                            }
                                                        });
                                                    }}
                                                    className="px-4 py-2.5 rounded-xl text-sm font-bold border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-all flex items-center gap-2"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">sync</span>
                                                    Sync MOI Holidays
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        setEditingHolidayStr(null);
                                                        setNewHoliday({ name: '', date: '', isRestricted: true });
                                                        setShowHolidayModal(true);
                                                    }}
                                                    className="px-5 py-2.5 bg-[#4F46E5] text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-[#4338CA] transition-all flex items-center gap-2"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">add</span>
                                                    Add Holiday
                                                </button>
                                            </div>
                                        </div>

                                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                                            <table className="w-full text-left">
                                                <thead className="bg-slate-50 dark:bg-slate-800/50">
                                                    <tr>
                                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Date</th>
                                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Holiday Name</th>
                                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Type</th>
                                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                    {holidays.map(h => (
                                                        <tr key={h.date} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                            <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">{h.date}</td>
                                                            <td className="px-6 py-4 text-sm font-medium text-slate-700 dark:text-slate-300">{h.name}</td>
                                                            <td className="px-6 py-4 text-sm">
                                                                {h.isRestricted ? (
                                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                                        <span className="material-symbols-outlined text-[14px]">block</span> Restricted
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                                        <span className="material-symbols-outlined text-[14px]">event_available</span> Observance
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <button onClick={() => openEditHoliday(h)} className="p-2 text-slate-400 hover:text-[#4F46E5] hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"><span className="material-symbols-outlined text-[20px]">edit</span></button>
                                                                    <button onClick={() => deleteHoliday(h.date)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"><span className="material-symbols-outlined text-[20px]">delete</span></button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {holidays.length === 0 && (
                                                        <tr><td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-500">No holidays configured</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </section>
                                </div>
                            )}

                            {activeTab === 'Approval Workflows' && (
                                <div className="space-y-10 animate-fade-in">
                                    <section>
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className="size-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-500">
                                                    <span className="material-symbols-outlined">fact_check</span>
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Approval Chains</h3>
                                                    <p className="text-sm text-slate-500">Configure hierarchical approval workflows per request type</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                                            <table className="w-full text-left">
                                                <thead className="bg-slate-50 dark:bg-slate-800/50">
                                                    <tr>
                                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Request Type</th>
                                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Chain Name</th>
                                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Steps</th>
                                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                    {chains.map(chain => (
                                                        <tr key={chain.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                            <td className="px-6 py-4"><span className={`px-3 py-1 rounded-full text-xs font-bold ${chain.requestType === 'Leave' ? 'bg-blue-100 text-blue-700' : chain.requestType === 'OT' ? 'bg-indigo-100 text-indigo-700' : chain.requestType === 'Expense' ? 'bg-amber-100 text-amber-700' : 'bg-violet-100 text-violet-700'}`}>{chain.requestType}</span></td>
                                                            <td className="px-6 py-4 text-sm font-bold">{chain.name}</td>
                                                            <td className="px-6 py-4 text-sm text-slate-500">{chain.steps.map(s => s.role).join(' → ')}</td>
                                                            <td className="px-6 py-4"><span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold ${chain.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{chain.isActive ? 'Active' : 'Inactive'}</span></td>
                                                            <td className="px-6 py-4 text-right"><button className="text-indigo-600 font-bold text-sm hover:underline">Edit</button></td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </section>

                                    <section>
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="size-10 rounded-xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-rose-500">
                                                <span className="material-symbols-outlined">sync_alt</span>
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Delegation & Out-of-Office</h3>
                                                <p className="text-sm text-slate-500">Manage temporary approval authority and auto-routing</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
                                                <h4 className="font-bold text-sm mb-4">Active Delegations</h4>
                                                {delegations.filter(d => d.isActive).length === 0 ? (
                                                    <div className="text-center py-8 text-slate-400 text-sm">
                                                        <span className="material-symbols-outlined text-4xl mb-2">person_off</span>
                                                        <p>No active delegations</p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {delegations.filter(d => d.isActive).map(d => (
                                                            <div key={d.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                                                <p className="font-bold text-sm">{d.delegatorName} → {d.delegateName}</p>
                                                                <p className="text-xs text-slate-500">{d.startDate} to {d.endDate}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
                                                <h4 className="font-bold text-sm mb-4">Out-of-Office Settings</h4>
                                                {oooEntries.filter(o => o.isActive).length === 0 ? (
                                                    <div className="text-center py-8 text-slate-400 text-sm">
                                                        <span className="material-symbols-outlined text-4xl mb-2">beach_access</span>
                                                        <p>No active OOO entries</p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {oooEntries.filter(o => o.isActive).map(o => (
                                                            <div key={o.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                                                <p className="font-bold text-sm">{o.userName} → {o.autoDelegateToName}</p>
                                                                <p className="text-xs text-slate-500">{o.startDate} to {o.endDate}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            )}

                            {activeTab === 'NRC Registry' && (
                                <div className="space-y-6 animate-fade-in">
                                    <section>
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="size-10 rounded-xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center text-violet-600">
                                                <span className="material-symbols-outlined">fingerprint</span>
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">NRC Format Validation</h3>
                                                <p className="text-sm text-slate-500">Validate employee NRC numbers against Myanmar format standards</p>
                                            </div>
                                        </div>

                                        {(() => {
                                            const nrcRegex = /^([1-9]|1[0-4])\/[a-zA-Z]+\([N|E|P]\)\d{6}$/i;
                                            const active = employees.filter(e => e.status !== 'Terminated');
                                            const valid = active.filter(e => e.nrcNumber && nrcRegex.test(e.nrcNumber));
                                            const invalid = active.filter(e => e.nrcNumber && !nrcRegex.test(e.nrcNumber));
                                            const missing = active.filter(e => !e.nrcNumber);
                                            return (
                                                <>
                                                    <div className="grid grid-cols-4 gap-4 mb-6">
                                                        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center"><p className="text-2xl font-black">{active.length}</p><p className="text-[10px] uppercase text-slate-500 font-bold">Employees</p></div>
                                                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center"><p className="text-2xl font-black text-emerald-600">{valid.length}</p><p className="text-[10px] uppercase text-emerald-700 font-bold">Valid Format</p></div>
                                                        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-center"><p className="text-2xl font-black text-rose-600">{invalid.length}</p><p className="text-[10px] uppercase text-rose-700 font-bold">Invalid Syntax</p></div>
                                                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center"><p className="text-2xl font-black text-amber-600">{missing.length}</p><p className="text-[10px] uppercase text-amber-700 font-bold">Missing</p></div>
                                                    </div>

                                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                                                        <div className="p-4 border-b bg-slate-50 dark:bg-slate-800/50 font-bold text-slate-800 dark:text-white">NRC Format Validation Report</div>
                                                        <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[500px] overflow-y-auto">
                                                            {(invalid.length > 0 ? invalid : missing).map(e => (
                                                                <div key={e.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="size-8 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center font-bold text-xs">{e.initials || e.name[0]}</div>
                                                                        <div>
                                                                            <p className="text-sm font-bold text-slate-800 dark:text-white">{e.name}</p>
                                                                            <p className="text-xs text-slate-500">{e.role}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <p className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300">{e.nrcNumber || '—'}</p>
                                                                        {e.nrcNumber
                                                                            ? <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border bg-rose-50 text-rose-700 border-rose-200">Invalid Format</span>
                                                                            : <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border bg-amber-50 text-amber-700 border-amber-200">Missing</span>
                                                                        }
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {invalid.length === 0 && missing.length === 0 && (
                                                                <div className="p-10 text-center font-bold text-emerald-500">All employee NRCs are valid!</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </section>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Unified Save/Discard Bar */}
                <div className="fixed bottom-10 left-1/2 -translate-x-[calc(50%-140px)] w-[600px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between z-50 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-5">
                    <div className="flex flex-col leading-none">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Master Config</span>
                        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500 font-bold italic">
                            <span className="material-symbols-outlined !text-[16px] text-[#4F46E5] opacity-70">history</span>
                            Modified: {systemSettings.lastAuditDate}
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button 
                            onClick={handleDiscard}
                            className="px-6 py-3 rounded-xl text-xs font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                            Discard
                        </button>
                        <button 
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-10 py-3 rounded-xl text-xs font-black bg-[#4F46E5] text-white shadow-xl shadow-indigo-200 dark:shadow-none hover:bg-[#4338CA] transition-all flex items-center gap-2 disabled:opacity-70 cursor-pointer uppercase tracking-widest group"
                        >
                            {isSaving ? 'Encrypting...' : (
                                <>
                                    <span>Sync Master State</span>
                                    <span className="material-symbols-outlined text-[18px] group-hover:rotate-180 transition-transform duration-500">sync</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Modals for Onboarding Templates */}
                {showCreateTemplateModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Create New Template</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Role ID / Name</label>
                                    <input 
                                        type="text" 
                                        value={newTemplateRole}
                                        onChange={e => setNewTemplateRole(e.target.value)}
                                        className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-950 focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] text-sm font-bold outline-none transition-all shadow-sm"
                                        placeholder="e.g. Finance Manager"
                                    />
                                </div>
                                <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <button onClick={handleCreateTemplate} className="flex-1 bg-[#4F46E5] text-white py-2.5 rounded-xl text-sm font-bold shadow-md shadow-indigo-200 dark:shadow-none hover:bg-[#4338CA] transition-colors">Create</button>
                                    <button onClick={() => { setShowCreateTemplateModal(false); setNewTemplateRole(''); }} className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {addTaskModalRoleId && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Add Task to {addTaskModalRoleId}</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Task Title</label>
                                    <input 
                                        type="text" 
                                        value={newTask.title}
                                        onChange={e => setNewTask({...newTask, title: e.target.value})}
                                        className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-950 focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] text-sm font-bold outline-none transition-all shadow-sm"
                                        placeholder="e.g. Issue Office Keys"
                                    />
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Type</label>
                                        <select 
                                            value={newTask.type}
                                            onChange={e => setNewTask({...newTask, type: e.target.value as 'Document' | 'Action' | 'Training'})}
                                            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-950 focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] text-sm font-bold outline-none transition-all shadow-sm bg-white dark:bg-slate-950"
                                        >
                                            <option value="Document">Document</option>
                                            <option value="Action">Action</option>
                                            <option value="Training">Training</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2 pt-6">
                                        <input 
                                            type="checkbox" 
                                            id="isMandatoryCheck"
                                            checked={newTask.isMandatory}
                                            onChange={e => setNewTask({...newTask, isMandatory: e.target.checked})}
                                            className="size-4"
                                        />
                                        <label htmlFor="isMandatoryCheck" className="text-sm font-bold text-slate-700 dark:text-slate-300">Mandatory</label>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Tooltip (Optional)</label>
                                    <input 
                                        type="text" 
                                        value={newTask.tooltip}
                                        onChange={e => setNewTask({...newTask, tooltip: e.target.value})}
                                        className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-950 focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] text-sm font-medium outline-none transition-all shadow-sm"
                                        placeholder="e.g. Ensure HR retains a physical copy"
                                    />
                                </div>
                                <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <button onClick={handleAddCustomTask} className="flex-1 bg-[#4F46E5] text-white py-2.5 rounded-xl text-sm font-bold shadow-md shadow-indigo-200 dark:shadow-none hover:bg-[#4338CA] transition-colors">Add Task</button>
                                    <button onClick={() => { setAddTaskModalRoleId(null); setNewTask({ title: '', type: 'Document', tooltip: '', isMandatory: false }); }} className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Holiday Modal */}
                {showHolidayModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">{editingHolidayStr ? 'Edit Holiday' : 'Add New Holiday'}</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Holiday Name</label>
                                    <input 
                                        type="text" 
                                        value={newHoliday.name}
                                        onChange={e => setNewHoliday({...newHoliday, name: e.target.value})}
                                        className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-950 focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] text-sm font-bold outline-none transition-all shadow-sm"
                                        placeholder="e.g. Thingyan Festival"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Date (YYYY-MM-DD)</label>
                                    <input 
                                        type="date" 
                                        value={newHoliday.date}
                                        onChange={e => setNewHoliday({...newHoliday, date: e.target.value})}
                                        className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-950 focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] text-sm font-bold outline-none transition-all shadow-sm"
                                    />
                                </div>
                                <div className="flex items-center gap-2 pt-2">
                                    <input 
                                        type="checkbox" 
                                        id="isRestricted"
                                        checked={newHoliday.isRestricted}
                                        onChange={e => setNewHoliday({...newHoliday, isRestricted: e.target.checked})}
                                        className="size-4"
                                    />
                                    <label htmlFor="isRestricted" className="text-sm font-bold text-slate-700 dark:text-slate-300">Restricted Date (Blocks Standard Leave)</label>
                                </div>
                                <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <button onClick={handleSaveHoliday} className="flex-1 bg-[#4F46E5] text-white py-2.5 rounded-xl text-sm font-bold shadow-md shadow-indigo-200 dark:shadow-none hover:bg-[#4338CA] transition-colors">{editingHolidayStr ? 'Save Changes' : 'Create'}</button>
                                    <button onClick={() => { setShowHolidayModal(false); setEditingHolidayStr(null); setNewHoliday({ name: '', date: '', isRestricted: true }) }} className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Location Modal */}
                {showLocationModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="size-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-[#4F46E5]">
                                    <span className="material-symbols-outlined">{editingLoc ? 'edit_location' : 'add_location'}</span>
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{editingLoc ? 'Edit' : 'Add New'} Location</h3>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Location Name</label>
                                    <input type="text" value={editingLoc ? editingLoc.name : newLoc.name} onChange={e => editingLoc ? setEditingLoc({...editingLoc, name: e.target.value}) : setNewLoc({...newLoc, name: e.target.value})} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-950 focus:ring-2 focus:ring-[#4F46E5]/20 text-sm font-bold outline-none transition-all shadow-sm" placeholder="e.g. Yangon HQ" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Physical Address</label>
                                    <textarea value={editingLoc ? editingLoc.address : newLoc.address} onChange={e => editingLoc ? setEditingLoc({...editingLoc, address: e.target.value}) : setNewLoc({...newLoc, address: e.target.value})} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-950 focus:ring-2 focus:ring-[#4F46E5]/20 text-sm font-medium outline-none transition-all shadow-sm h-20 resize-none" placeholder="Enter Full Address..." />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Latitude</label>
                                        <input type="number" step="any" value={editingLoc ? editingLoc.lat : newLoc.lat} onChange={e => editingLoc ? setEditingLoc({...editingLoc, lat: parseFloat(e.target.value)}) : setNewLoc({...newLoc, lat: parseFloat(e.target.value)})} className="w-full px-3 py-2.5 border border-slate-100 dark:border-slate-700 rounded-xl dark:bg-slate-950 text-xs font-bold" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Longitude</label>
                                        <input type="number" step="any" value={editingLoc ? editingLoc.lng : newLoc.lng} onChange={e => editingLoc ? setEditingLoc({...editingLoc, lng: parseFloat(e.target.value)}) : setNewLoc({...newLoc, lng: parseFloat(e.target.value)})} className="w-full px-3 py-2.5 border border-slate-100 dark:border-slate-700 rounded-xl dark:bg-slate-950 text-xs font-bold" />
                                    </div>
                                </div>
                                {(editingLoc ? editingLoc.lat === 0 : newLoc.lat === 0) && (
                                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/40 rounded-xl flex gap-2">
                                        <span className="material-symbols-outlined text-amber-600 text-sm">warning</span>
                                        <p className="text-[10px] text-amber-700 dark:text-amber-400 font-bold leading-tight">Geofencing will be disabled for this site until coordinates are added. This is essential for the Upcoming Mobile App.</p>
                                    </div>
                                )}
                                <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <button onClick={editingLoc ? handleUpdateLocation : handleAddLocation} className="flex-1 bg-[#4F46E5] text-white py-2.5 rounded-xl text-sm font-bold shadow-md shadow-indigo-200 dark:shadow-none hover:bg-[#4338CA] transition-colors">{editingLoc ? 'Update' : 'Save'} Location</button>
                                    <button onClick={() => setShowLocationModal(false)} className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Department Modal */}
                {showDeptModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="size-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600">
                                    <span className="material-symbols-outlined">corporate_fare</span>
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{editingDept ? 'Edit' : 'Add New'} Department</h3>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Department Name</label>
                                    <input type="text" value={editingDept ? editingDept.name : newDept.name} onChange={e => editingDept ? setEditingDept({...editingDept, name: e.target.value}) : setNewDept({...newDept, name: e.target.value})} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-950 focus:ring-2 focus:ring-emerald-500/20 text-sm font-bold outline-none transition-all shadow-sm" placeholder="e.g. Human Resources" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Dept Code</label>
                                    <input type="text" value={editingDept ? editingDept.code : newDept.code} onChange={e => editingDept ? setEditingDept({...editingDept, code: e.target.value.toUpperCase()}) : setNewDept({...newDept, code: e.target.value.toUpperCase()})} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-950 focus:ring-2 focus:ring-emerald-500/20 text-sm font-black tracking-widest outline-none transition-all shadow-sm uppercase" placeholder="e.g. HRD" />
                                </div>
                                <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <button onClick={editingDept ? handleUpdateDept : handleAddDept} className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-bold shadow-md shadow-emerald-200 dark:shadow-none hover:bg-emerald-700 transition-colors">{editingDept ? 'Update' : 'Save'} Department</button>
                                    <button onClick={() => setShowDeptModal(false)} className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Position Modal */}
                {showPositionModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="size-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600">
                                    <span className="material-symbols-outlined">badge</span>
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{editingPos ? 'Edit' : 'Add New'} Position</h3>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Position Name</label>
                                    <input type="text" value={editingPos ? editingPos.name : newPos.name} onChange={e => editingPos ? setEditingPos({...editingPos, name: e.target.value}) : setNewPos({...newPos, name: e.target.value})} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-950 focus:ring-2 focus:ring-amber-500/20 text-sm font-bold outline-none transition-all shadow-sm" placeholder="e.g. Senior Accountant" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Department</label>
                                    <select value={editingPos ? editingPos.deptId : newPos.deptId} onChange={e => editingPos ? setEditingPos({...editingPos, deptId: e.target.value}) : setNewPos({...newPos, deptId: e.target.value})} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500/20 text-sm font-bold outline-none transition-all shadow-sm">
                                        <option value="">No Department (General)</option>
                                        {systemSettings.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Reports To</label>
                                    <select value={editingPos ? editingPos.reportTo : newPos.reportTo} onChange={e => editingPos ? setEditingPos({...editingPos, reportTo: e.target.value}) : setNewPos({...newPos, reportTo: e.target.value})} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-white dark:bg-slate-950 focus:ring-2 focus:ring-amber-500/20 text-sm font-bold outline-none transition-all shadow-sm">
                                        <option value="">Executive/Admin</option>
                                        {systemSettings.positions.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <button onClick={editingPos ? handleUpdatePos : handleAddPos} className="flex-1 bg-amber-500 text-white py-2.5 rounded-xl text-sm font-bold shadow-md shadow-amber-200 dark:shadow-none hover:bg-amber-600 transition-colors">{editingPos ? 'Update' : 'Save'} Position</button>
                                    <button onClick={() => setShowPositionModal(false)} className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Allowance Creation Modal */}
                {showAlwModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-8 overflow-hidden relative">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="size-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600">
                                    <span className="material-symbols-outlined">payments</span>
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">New Custom Allowance</h3>
                            </div>
                            
                            <div className="space-y-5">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Allowance Label</label>
                                    <input value={newAlw.name} onChange={e => setNewAlw({...newAlw, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all" placeholder="e.g. Travel Allowance" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Logic Type</label>
                                        <select value={newAlw.logic} onChange={e => setNewAlw({...newAlw, logic: e.target.value as any})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all">
                                            <option value="Flat Rate">Flat Rate</option>
                                            <option value="Percentage of Base">Percentage of Base</option>
                                            <option value="Attendance-Based">Attendance Bonus</option>
                                            <option value="Attendance-Based Payment">Actual Attendance Payout</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Amount / Rate</label>
                                        <div className="relative">
                                            <input type="number" value={newAlw.value} onChange={e => setNewAlw({...newAlw, value: Number(e.target.value)})} className="w-full pl-4 pr-12 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all" />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase">{newAlw.logic === 'Percentage of Base' ? '%' : 'MMK'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                                    <button onClick={handleCreateAllowance} className="flex-[2] bg-emerald-600 text-white py-3 rounded-2xl text-xs font-black shadow-lg shadow-emerald-200 dark:shadow-none hover:bg-emerald-700 transition-all uppercase tracking-widest">Register Allowance</button>
                                    <button onClick={() => setShowAlwModal(false)} className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-500 py-3 rounded-2xl text-xs font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-all uppercase tracking-widest">Cancel</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Deduction Creation Modal */}
                {showDedModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-8 overflow-hidden relative">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="size-10 rounded-xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-rose-600">
                                    <span className="material-symbols-outlined">rule</span>
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">New Custom Deduction</h3>
                            </div>
                            
                            <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Deduction Label</label>
                                    <input value={newDed.name} onChange={e => setNewDed({...newDed, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-rose-500/20 transition-all" placeholder="e.g. Health Insurance" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Logic Type</label>
                                        <select 
                                            value={newDed.logic} 
                                            onChange={e => {
                                                const logic = e.target.value as any;
                                                // Default to Base Salary for leave/absence per requirement
                                                const affectedIncomeParts = (logic === 'Unpaid Leave' || logic === 'Non-Attendance') 
                                                    ? ['Base Salary'] 
                                                    : newDed.affectedIncomeParts;
                                                setNewDed({...newDed, logic, affectedIncomeParts});
                                            }} 
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-rose-500/20 transition-all"
                                        >
                                            <option value="Flat Rate">Flat Rate</option>
                                            <option value="Percentage of Base">Percentage of Base</option>
                                            <option value="Late Penalty">Late Penalty (15m Interval)</option>
                                            <option value="Early Check-Out Penalty">Early Check-Out Penalty (15m Interval)</option>
                                            <option value="No Check-In Penalty">No Check-In Penalty</option>
                                            <option value="No Check-Out Penalty">No Check-Out Penalty</option>
                                            <option value="Non-Attendance">Non-Attendance (Absent)</option>
                                            <option value="Unpaid Leave">Unpaid Leave Logic</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Value / Rate</label>
                                        <div className="relative">
                                            <input type="number" value={newDed.value} onChange={e => setNewDed({...newDed, value: Number(e.target.value)})} className="w-full pl-4 pr-12 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-rose-500/20 transition-all" />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase">{newDed.logic === 'Percentage of Base' ? '%' : 'MMK'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-1">Targeted Income (Affected Parts)</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['Base Salary', ...systemSettings.allowanceConfigs.map(a => a.name)].map(part => (
                                            <label key={part} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 cursor-pointer hover:border-rose-200 transition-all group">
                                                <input 
                                                    type="checkbox" 
                                                    checked={newDed.affectedIncomeParts?.includes(part)}
                                                    onChange={() => {
                                                        const current = newDed.affectedIncomeParts || [];
                                                        const updated = current.includes(part) ? current.filter(p => p !== part) : [...current, part];
                                                        setNewDed({...newDed, affectedIncomeParts: updated});
                                                    }}
                                                    className="size-4 rounded accent-rose-600"
                                                />
                                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{part}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <p className="mt-2 text-[10px] font-medium text-slate-400 italic font-mono uppercase tracking-tighter">📌 Only selected earnings will be reduced by this deduction.</p>
                                </div>

                                <div className="flex gap-3 pt-6 border-t border-slate-100 dark:border-slate-800 sticky bottom-0 bg-white dark:bg-slate-900 pb-2">
                                    <button onClick={handleCreateDeduction} className="flex-[2] bg-rose-600 text-white py-3 rounded-2xl text-xs font-black shadow-lg shadow-rose-200 dark:shadow-none hover:bg-rose-700 transition-all uppercase tracking-widest">Register Deduction</button>
                                    <button onClick={() => setShowDedModal(false)} className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-500 py-3 rounded-2xl text-xs font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-all uppercase tracking-widest">Cancel</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {/* Admin Privilege Picker Modal */}
                {showAdminPicker && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-8 overflow-hidden relative">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="size-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600">
                                    <span className="material-symbols-outlined">security</span>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Elevate Admin</h3>
                                    <p className="text-xs text-slate-500 font-medium">Select an employee to grant full system access.</p>
                                </div>
                            </div>

                            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {employees.filter(e => !isAdmin(e.id) && e.status === 'Active').map(emp => (
                                    <div 
                                        key={emp.id} 
                                        onClick={() => handleAssignAdminAction(emp.id)}
                                        className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-orange-200 hover:bg-orange-50/30 dark:hover:bg-orange-900/10 transition-all cursor-pointer flex items-center gap-4 group"
                                    >
                                        <div className={`size-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-xs ${emp.colorClass || 'bg-slate-100 text-slate-700'}`}>
                                            {emp.avatar ? <img src={emp.avatar} alt={emp.name} className="size-10 rounded-full object-cover" /> : emp.initials}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-900 dark:text-white text-sm truncate">{emp.name}</p>
                                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{emp.role}</p>
                                        </div>
                                        <span className="material-symbols-outlined text-transparent group-hover:text-orange-600 transition-colors">add_moderator</span>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <button 
                                    onClick={() => setShowAdminPicker(false)}
                                    className="w-full bg-slate-100 dark:bg-slate-800 text-slate-500 py-3 rounded-2xl text-xs font-black hover:bg-slate-200 transition-all uppercase tracking-widest"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {/* 11. Confirmation Modal */}
                <ConfirmationModal 
                    isOpen={confirmModal.isOpen}
                    onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                    onConfirm={confirmModal.onConfirm}
                    title={confirmModal.title}
                    message={confirmModal.message}
                    variant={confirmModal.variant}
                    confirmLabel="Proceed"
                />
            </main>
        </div>
    );
}
