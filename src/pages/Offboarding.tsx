import React, { useState, useMemo } from 'react';
import DropdownMenu from '../components/DropdownMenu';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useAppData } from '../context/AppDataContext';
import { useNotifications } from '../context/NotificationProvider';

type OffboardingStatus = 'Not Started' | 'Exit Interview' | 'Clearance' | 'Settlement' | 'Deprovisioning' | 'Completed';

interface OffboardingRecord {
    id: string;
    empId: string;
    name: string;
    dept: string;
    role: string;
    lastWorkingDay: string;
    status: OffboardingStatus;
    exitInterviewDone: boolean;
    clearance: {
        it: boolean;
        hr: boolean;
        finance: boolean;
        manager: boolean;
    };
    assetsReturned: boolean;
    finalSettlementDone: boolean;
    accountDeprovisioned: boolean;
    exitReason: string;
    initiatedAt: string;
    initiatedBy: string;
}

const OFFBOARDING_RECORDS: OffboardingRecord[] = [
    {
        id: 'OFF-001',
        empId: 'EMP-099',
        name: 'Kyaw Kyaw',
        dept: 'Engineering',
        role: 'Senior Developer',
        lastWorkingDay: '2023-11-15',
        status: 'Clearance',
        exitInterviewDone: true,
        clearance: { it: true, hr: true, finance: false, manager: true },
        assetsReturned: true,
        finalSettlementDone: false,
        accountDeprovisioned: false,
        exitReason: 'Resignation - Better Opportunity',
        initiatedAt: '2023-11-01',
        initiatedBy: 'EMP-001'
    },
    {
        id: 'OFF-002',
        empId: 'EMP-045',
        name: 'Hla Hla Win',
        dept: 'Marketing',
        role: 'Marketing Manager',
        lastWorkingDay: '2023-11-30',
        status: 'Exit Interview',
        exitInterviewDone: false,
        clearance: { it: false, hr: false, finance: false, manager: false },
        assetsReturned: false,
        finalSettlementDone: false,
        accountDeprovisioned: false,
        exitReason: 'Resignation - Family Relocation',
        initiatedAt: '2023-11-10',
        initiatedBy: 'EMP-001'
    }
];

export default function Offboarding() {
    const { employees, isAdmin, addAuditLog } = useAppData();
    const { pushNotification } = useNotifications();
    const [records, setRecords] = useState<OffboardingRecord[]>(OFFBOARDING_RECORDS);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<OffboardingStatus | 'All'>('All');
    const [selectedRecord, setSelectedRecord] = useState<OffboardingRecord | null>(null);
    const [showInitiateModal, setShowInitiateModal] = useState(false);
    const [initiateForm, setInitiateForm] = useState({ empId: '', lastWorkingDay: '', exitReason: '' });
    const [showExitInterviewModal, setShowExitInterviewModal] = useState(false);
    const [exitInterviewAnswers, setExitInterviewAnswers] = useState({ q1: '', q2: '', q3: '', q4: '' });

    const filteredRecords = useMemo(() => {
        return records.filter(r => {
            const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  r.empId.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [records, searchQuery, statusFilter]);

    const stats = useMemo(() => ({
        total: records.length,
        inProgress: records.filter(r => r.status !== 'Completed' && r.status !== 'Not Started').length,
        completed: records.filter(r => r.status === 'Completed').length,
        pendingClearance: records.filter(r => r.status === 'Clearance').length,
    }), [records]);

    const handleInitiate = () => {
        if (!initiateForm.empId || !initiateForm.lastWorkingDay || !initiateForm.exitReason) return;
        const emp = employees.find(e => e.id === initiateForm.empId);
        if (!emp) return;

        const newRecord: OffboardingRecord = {
            id: `OFF-${Date.now()}`,
            empId: emp.id,
            name: emp.name,
            dept: (emp as any).dept || '',
            role: emp.role,
            lastWorkingDay: initiateForm.lastWorkingDay,
            status: 'Exit Interview',
            exitInterviewDone: false,
            clearance: { it: false, hr: false, finance: false, manager: false },
            assetsReturned: false,
            finalSettlementDone: false,
            accountDeprovisioned: false,
            exitReason: initiateForm.exitReason,
            initiatedAt: new Date().toISOString().split('T')[0],
            initiatedBy: 'EMP-001'
        };

        setRecords(prev => [newRecord, ...prev]);
        setShowInitiateModal(false);
        setInitiateForm({ empId: '', lastWorkingDay: '', exitReason: '' });
        
        pushNotification({
            title: 'Offboarding Initiated',
            body: `Offboarding workflow started for ${emp.name}. Last working day: ${initiateForm.lastWorkingDay}`,
            category: 'HR', priority: 'normal', icon: 'person_off',
            iconBg: 'bg-rose-50', iconColor: 'text-rose-600',
            actionRoute: '/offboarding', actionLabel: 'View Details',
            badge: 'In Progress', badgeColor: 'amber',
        });
    };

    const handleExitInterviewSave = () => {
        if (!selectedRecord) return;
        
        setRecords(prev => prev.map(r => {
            if (r.id === selectedRecord.id) {
                return {
                    ...r,
                    exitInterviewDone: true,
                    status: 'Clearance' as OffboardingStatus
                };
            }
            return r;
        }));
        
        setShowExitInterviewModal(false);
        setExitInterviewAnswers({ q1: '', q2: '', q3: '', q4: '' });
        
        pushNotification({
            title: 'Exit Interview Completed',
            body: `Exit interview for ${selectedRecord.name} has been recorded.`,
            category: 'HR', priority: 'normal', icon: 'check_circle',
            iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600',
        });
    };

    const toggleClearance = (dept: 'it' | 'hr' | 'finance' | 'manager') => {
        if (!selectedRecord) return;
        
        setRecords(prev => prev.map(r => {
            if (r.id === selectedRecord.id) {
                const newClearance = { ...r.clearance, [dept]: !r.clearance[dept] };
                const allClear = newClearance.it && newClearance.hr && newClearance.finance && newClearance.manager;
                return {
                    ...r,
                    clearance: newClearance,
                    status: allClear ? 'Settlement' as OffboardingStatus : r.status
                };
            }
            return r;
        }));
    };

    const toggleAssetReturn = () => {
        if (!selectedRecord) return;
        setRecords(prev => prev.map(r => {
            if (r.id === selectedRecord.id) {
                const newStatus = r.assetsReturned ? r.status : (r.clearance.it && r.clearance.hr && r.clearance.finance && r.clearance.manager) ? 'Settlement' : r.status;
                return { ...r, assetsReturned: !r.assetsReturned, status: newStatus };
            }
            return r;
        }));
    };

    const toggleSettlement = () => {
        if (!selectedRecord) return;
        setRecords(prev => prev.map(r => {
            if (r.id === selectedRecord.id) {
                return { 
                    ...r, 
                    finalSettlementDone: !r.finalSettlementDone,
                    status: !r.finalSettlementDone ? 'Deprovisioning' as OffboardingStatus : r.status
                };
            }
            return r;
        }));
    };

    const toggleDeprovisioning = () => {
        if (!selectedRecord) return;
        setRecords(prev => prev.map(r => {
            if (r.id === selectedRecord.id) {
                return { 
                    ...r, 
                    accountDeprovisioned: !r.accountDeprovisioned,
                    status: !r.accountDeprovisioned ? 'Completed' as OffboardingStatus : r.status
                };
            }
            return r;
        }));
    };

    const getStatusColor = (status: OffboardingStatus) => {
        switch (status) {
            case 'Not Started': return 'bg-slate-100 text-slate-600';
            case 'Exit Interview': return 'bg-amber-100 text-amber-700';
            case 'Clearance': return 'bg-orange-100 text-orange-700';
            case 'Settlement': return 'bg-blue-100 text-blue-700';
            case 'Deprovisioning': return 'bg-purple-100 text-purple-700';
            case 'Completed': return 'bg-emerald-100 text-emerald-700';
        }
    };

    return (
        <div className="flex h-screen overflow-hidden bg-[#F8FAFC] dark:bg-slate-950 font-display text-slate-900 dark:text-slate-100">
            <Sidebar activeTab="Offboarding" />
            <main className="flex flex-col h-full overflow-hidden ml-[280px] flex-1">
                <Header title="Offboarding" subtitle="Manage employee exit workflows, clearance, and final settlements" />
                
                <div className="flex-1 overflow-auto p-6">
                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-4 mb-6">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                            <p className="text-xs font-bold text-slate-400 uppercase">Total Offboardings</p>
                            <p className="text-3xl font-black text-slate-800 dark:text-slate-200 mt-1">{stats.total}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                            <p className="text-xs font-bold text-slate-400 uppercase">In Progress</p>
                            <p className="text-3xl font-black text-amber-600 mt-1">{stats.inProgress}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                            <p className="text-xs font-bold text-slate-400 uppercase">Pending Clearance</p>
                            <p className="text-3xl font-black text-orange-600 mt-1">{stats.pendingClearance}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                            <p className="text-xs font-bold text-slate-400 uppercase">Completed</p>
                            <p className="text-3xl font-black text-emerald-600 mt-1">{stats.completed}</p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
                                <input 
                                    type="text" 
                                    placeholder="Search employee..." 
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-300 outline-none w-64"
                                />
                            </div>
                            <select 
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value as OffboardingStatus | 'All')}
                                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
                            >
                                <option value="All">All Status</option>
                                <option value="Exit Interview">Exit Interview</option>
                                <option value="Clearance">Clearance</option>
                                <option value="Settlement">Settlement</option>
                                <option value="Deprovisioning">Deprovisioning</option>
                                <option value="Completed">Completed</option>
                            </select>
                        </div>
                        <button 
                            onClick={() => setShowInitiateModal(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold transition-colors"
                        >
                            <span className="material-symbols-outlined text-[20px]">person_off</span>
                            Initiate Offboarding
                        </button>
                    </div>

                    {/* Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="text-left px-6 py-4 text-xs font-black text-slate-400 uppercase">Employee</th>
                                    <th className="text-left px-6 py-4 text-xs font-black text-slate-400 uppercase">Department</th>
                                    <th className="text-left px-6 py-4 text-xs font-black text-slate-400 uppercase">Last Working Day</th>
                                    <th className="text-left px-6 py-4 text-xs font-black text-slate-400 uppercase">Status</th>
                                    <th className="text-left px-6 py-4 text-xs font-black text-slate-400 uppercase">Progress</th>
                                    <th className="text-right px-6 py-4 text-xs font-black text-slate-400 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredRecords.map(record => {
                                    const progress = record.status === 'Completed' ? 100 : 
                                                     record.status === 'Deprovisioning' ? 80 :
                                                     record.status === 'Settlement' ? 60 :
                                                     record.status === 'Clearance' ? 40 :
                                                     record.status === 'Exit Interview' ? 20 : 0;
                                    return (
                                        <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-10 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 font-bold text-sm">
                                                        {record.name.split(' ').map(n => n[0]).join('')}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm">{record.name}</p>
                                                        <p className="text-xs text-slate-400">{record.empId} · {record.role}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm">{record.dept}</td>
                                            <td className="px-6 py-4 text-sm">{record.lastWorkingDay}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${getStatusColor(record.status)}`}>
                                                    {record.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                        <div className="h-full bg-rose-500 rounded-full" style={{ width: `${progress}%` }} />
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-400">{progress}%</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button 
                                                    onClick={() => setSelectedRecord(record)}
                                                    className="text-indigo-600 hover:text-indigo-700 font-bold text-sm"
                                                >
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {filteredRecords.length === 0 && (
                            <div className="p-12 text-center">
                                <span className="material-symbols-outlined text-4xl text-slate-300">person_off</span>
                                <p className="text-slate-400 mt-2">No offboarding records found</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Initiate Modal */}
            {showInitiateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-black">Initiate Offboarding</h3>
                            <button onClick={() => setShowInitiateModal(false)} className="text-slate-400 hover:text-slate-600">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase">Employee</label>
                                <select 
                                    value={initiateForm.empId}
                                    onChange={e => setInitiateForm(prev => ({ ...prev, empId: e.target.value }))}
                                    className="w-full mt-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                                >
                                    <option value="">Select Employee</option>
                                    {employees.filter(e => e.status === 'Active').map(e => (
                                        <option key={e.id} value={e.id}>{e.name} ({e.id})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase">Last Working Day</label>
                                <input 
                                    type="date" 
                                    value={initiateForm.lastWorkingDay}
                                    onChange={e => setInitiateForm(prev => ({ ...prev, lastWorkingDay: e.target.value }))}
                                    className="w-full mt-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase">Exit Reason</label>
                                <select 
                                    value={initiateForm.exitReason}
                                    onChange={e => setInitiateForm(prev => ({ ...prev, exitReason: e.target.value }))}
                                    className="w-full mt-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                                >
                                    <option value="">Select Reason</option>
                                    <option value="Resignation - Better Opportunity">Resignation - Better Opportunity</option>
                                    <option value="Resignation - Family Relocation">Resignation - Family Relocation</option>
                                    <option value="Resignation - Personal Reasons">Resignation - Personal Reasons</option>
                                    <option value="Termination - Performance">Termination - Performance</option>
                                    <option value="Termination - Misconduct">Termination - Misconduct</option>
                                    <option value="End of Contract">End of Contract</option>
                                    <option value="Retirement">Retirement</option>
                                </select>
                            </div>
                        </div>
                        
                        <div className="flex gap-3 mt-6">
                            <button 
                                onClick={() => setShowInitiateModal(false)}
                                className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-sm"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleInitiate}
                                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm"
                            >
                                Initiate
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {selectedRecord && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-black">{selectedRecord.name}</h3>
                                <p className="text-sm text-slate-400">{selectedRecord.empId} · {selectedRecord.dept}</p>
                            </div>
                            <button onClick={() => setSelectedRecord(null)} className="text-slate-400 hover:text-slate-600">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Status Overview */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                                    <p className="text-xs font-bold text-slate-400 uppercase">Current Status</p>
                                    <p className="font-black text-rose-600 mt-1">{selectedRecord.status}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                                    <p className="text-xs font-bold text-slate-400 uppercase">Last Working Day</p>
                                    <p className="font-black text-slate-800 dark:text-slate-200 mt-1">{selectedRecord.lastWorkingDay}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                                    <p className="text-xs font-bold text-slate-400 uppercase">Exit Reason</p>
                                    <p className="font-bold text-sm text-slate-800 dark:text-slate-200 mt-1">{selectedRecord.exitReason}</p>
                                </div>
                            </div>

                            {/* Exit Interview */}
                            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-bold flex items-center gap-2">
                                        <span className="material-symbols-outlined text-amber-500">record_voice_over</span>
                                        Exit Interview
                                    </h4>
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${selectedRecord.exitInterviewDone ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {selectedRecord.exitInterviewDone ? 'Completed' : 'Pending'}
                                    </span>
                                </div>
                                {!selectedRecord.exitInterviewDone && (
                                    <button 
                                        onClick={() => setShowExitInterviewModal(true)}
                                        className="w-full py-2.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 font-bold text-sm hover:bg-amber-100 transition-colors"
                                    >
                                        Conduct Exit Interview
                                    </button>
                                )}
                            </div>

                            {/* Clearance Checklist */}
                            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-5">
                                <h4 className="font-bold flex items-center gap-2 mb-4">
                                    <span className="material-symbols-outlined text-orange-500">checklist</span>
                                    Clearance Checklist
                                </h4>
                                <div className="space-y-3">
                                    {[
                                        { key: 'it', label: 'IT Clearance', desc: 'Laptop, accounts, access cards' },
                                        { key: 'hr', label: 'HR Clearance', desc: 'Documents, exit clearance' },
                                        { key: 'finance', label: 'Finance Clearance', desc: 'Final settlement, dues' },
                                        { key: 'manager', label: 'Manager Clearance', desc: 'Project handover, knowledge transfer' },
                                    ].map(item => (
                                        <div key={item.key} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                            <div>
                                                <p className="font-bold text-sm">{item.label}</p>
                                                <p className="text-xs text-slate-400">{item.desc}</p>
                                            </div>
                                            <button 
                                                onClick={() => toggleClearance(item.key as any)}
                                                className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
                                                    selectedRecord.clearance[item.key as keyof typeof selectedRecord.clearance] 
                                                        ? 'bg-emerald-500 text-white' 
                                                        : 'bg-slate-200 dark:bg-slate-700'
                                                }`}
                                            >
                                                {selectedRecord.clearance[item.key as keyof typeof selectedRecord.clearance] && (
                                                    <span className="material-symbols-outlined text-[18px]">check</span>
                                                )}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Asset Return */}
                            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-bold flex items-center gap-2">
                                            <span className="material-symbols-outlined text-blue-500">inventory_2</span>
                                            Asset Return
                                        </h4>
                                        <p className="text-xs text-slate-400 mt-1">Laptop, ID Card, Access Keys</p>
                                    </div>
                                    <button 
                                        onClick={toggleAssetReturn}
                                        className={`px-4 py-2 rounded-lg font-bold text-sm ${
                                            selectedRecord.assetsReturned 
                                                ? 'bg-emerald-100 text-emerald-700' 
                                                : 'bg-slate-100 text-slate-600'
                                        }`}
                                    >
                                        {selectedRecord.assetsReturned ? 'Returned' : 'Mark Returned'}
                                    </button>
                                </div>
                            </div>

                            {/* Final Settlement */}
                            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-bold flex items-center gap-2">
                                            <span className="material-symbols-outlined text-purple-500">payments</span>
                                            Final Settlement
                                        </h4>
                                        <p className="text-xs text-slate-400 mt-1">Last salary, unused leave encashment</p>
                                    </div>
                                    <button 
                                        onClick={toggleSettlement}
                                        className={`px-4 py-2 rounded-lg font-bold text-sm ${
                                            selectedRecord.finalSettlementDone 
                                                ? 'bg-emerald-100 text-emerald-700' 
                                                : 'bg-slate-100 text-slate-600'
                                        }`}
                                    >
                                        {selectedRecord.finalSettlementDone ? 'Settled' : 'Mark Settled'}
                                    </button>
                                </div>
                            </div>

                            {/* Account Deprovisioning */}
                            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-bold flex items-center gap-2">
                                            <span className="material-symbols-outlined text-indigo-500">block</span>
                                            Account Deprovisioning
                                        </h4>
                                        <p className="text-xs text-slate-400 mt-1">Email, Slack, GitHub, VPN access</p>
                                    </div>
                                    <button 
                                        onClick={toggleDeprovisioning}
                                        className={`px-4 py-2 rounded-lg font-bold text-sm ${
                                            selectedRecord.accountDeprovisioned 
                                                ? 'bg-emerald-100 text-emerald-700' 
                                                : 'bg-slate-100 text-slate-600'
                                        }`}
                                    >
                                        {selectedRecord.accountDeprovisioned ? 'Deprovisioned' : 'Mark Deprovisioned'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Exit Interview Modal */}
            {showExitInterviewModal && selectedRecord && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-black">Exit Interview - {selectedRecord.name}</h3>
                            <button onClick={() => setShowExitInterviewModal(false)} className="text-slate-400 hover:text-slate-600">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase">What prompted you to look for a new opportunity?</label>
                                <textarea 
                                    value={exitInterviewAnswers.q1}
                                    onChange={e => setExitInterviewAnswers(prev => ({ ...prev, q1: e.target.value }))}
                                    className="w-full mt-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                                    rows={2}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase">What did you like most about working here?</label>
                                <textarea 
                                    value={exitInterviewAnswers.q2}
                                    onChange={e => setExitInterviewAnswers(prev => ({ ...prev, q2: e.target.value }))}
                                    className="w-full mt-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                                    rows={2}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase">What could we improve?</label>
                                <textarea 
                                    value={exitInterviewAnswers.q3}
                                    onChange={e => setExitInterviewAnswers(prev => ({ ...prev, q3: e.target.value }))}
                                    className="w-full mt-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                                    rows={2}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase">Would you recommend this company to others?</label>
                                <textarea 
                                    value={exitInterviewAnswers.q4}
                                    onChange={e => setExitInterviewAnswers(prev => ({ ...prev, q4: e.target.value }))}
                                    className="w-full mt-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                                    rows={2}
                                />
                            </div>
                        </div>
                        
                        <div className="flex gap-3 mt-6">
                            <button 
                                onClick={() => setShowExitInterviewModal(false)}
                                className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-sm"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleExitInterviewSave}
                                className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm"
                            >
                                Save Interview
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
