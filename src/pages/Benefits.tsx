import React, { useState, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useAppData } from '../context/AppDataContext';
import { useNotifications } from '../context/NotificationProvider';
import { BenefitPlan, BenefitEnrollment, BenefitType } from '../types/hrms.types';

const BENEFIT_TYPES: BenefitType[] = ['Health Insurance', 'Transport Allowance', 'Meal Allowance', 'Phone Allowance', 'Education', 'Other'];

export default function Benefits() {
    const { employees } = useAppData();
    const { pushNotification } = useNotifications();
    const [activeTab, setActiveTab] = useState<'Overview' | 'Plans' | 'Enrollments'>('Overview');
    
    // State for Plans
    const [plans, setPlans] = useState<BenefitPlan[]>([
        { id: 'BP-001', name: 'Global Health Plus', type: 'Health Insurance', description: 'Comprehensive medical coverage for employee and family', amount: 150000, isActive: true, eligibilityCriteria: 'All Employees' },
        { id: 'BP-002', name: 'Commuter Basic', type: 'Transport Allowance', description: 'Monthly bus pass or fuel allowance', amount: 50000, isActive: true, eligibilityCriteria: 'All Employees' },
        { id: 'BP-003', name: 'Lunch Card', type: 'Meal Allowance', description: 'Daily lunch allowance at partner cafes', amount: 30000, isActive: true, eligibilityCriteria: 'All Employees' },
    ]);

    // State for Enrollments
    const [enrollments, setEnrollments] = useState<BenefitEnrollment[]>([
        { id: 'BE-001', empId: 'EMP-001', empName: 'John Doe', planId: 'BP-001', planName: 'Global Health Plus', planType: 'Health Insurance', enrolledAt: '2024-01-15', startDate: '2024-02-01', status: 'Active' },
        { id: 'BE-002', empId: 'EMP-001', empName: 'John Doe', planId: 'BP-002', planName: 'Commuter Basic', planType: 'Transport Allowance', enrolledAt: '2024-01-15', startDate: '2024-02-01', status: 'Active' },
        { id: 'BE-003', empId: 'EMP-002', empName: 'Jane Smith', planId: 'BP-001', planName: 'Global Health Plus', planType: 'Health Insurance', enrolledAt: '2024-03-01', startDate: '2024-04-01', status: 'Active' },
    ]);

    // Modals
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [editingPlan, setEditingPlan] = useState<BenefitPlan | null>(null);
    const [newPlan, setNewPlan] = useState<Partial<BenefitPlan>>({ type: 'Health Insurance', amount: 0, isActive: true });

    const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
    const [selectedPlanId, setSelectedPlanId] = useState('');
    const [selectedEmpId, setSelectedEmpId] = useState('');

    // Stats
    const stats = useMemo(() => {
        const activeEnrollments = enrollments.filter(e => e.status === 'Active');
        const totalCost = activeEnrollments.reduce((sum, e) => {
            const plan = plans.find(p => p.id === e.planId);
            return sum + (plan?.amount || 0);
        }, 0);
        return {
            totalPlans: plans.filter(p => p.isActive).length,
            totalEnrollments: activeEnrollments.length,
            totalCost,
        };
    }, [plans, enrollments]);

    const handleSavePlan = () => {
        if (!newPlan.name || !newPlan.type) return;
        
        if (editingPlan) {
            setPlans(plans.map(p => p.id === editingPlan.id ? { ...p, ...newPlan } as BenefitPlan : p));
            pushNotification({ title: 'Plan Updated', body: `${newPlan.name} has been updated.`, category: 'HR', priority: 'low', icon: 'edit', iconBg: 'bg-blue-50', iconColor: 'text-blue-600' });
        } else {
            const plan: BenefitPlan = { id: `BP-${Date.now()}`, name: newPlan.name!, type: newPlan.type as BenefitType, description: newPlan.description || '', amount: newPlan.amount || 0, isActive: true, eligibilityCriteria: newPlan.eligibilityCriteria };
            setPlans([...plans, plan]);
            pushNotification({ title: 'Plan Created', body: `${newPlan.name} has been created.`, category: 'HR', priority: 'low', icon: 'add_circle', iconBg: 'bg-green-50', iconColor: 'text-green-600' });
        }
        setShowPlanModal(false);
        setEditingPlan(null);
        setNewPlan({ type: 'Health Insurance', amount: 0, isActive: true });
    };

    const handleEnroll = () => {
        if (!selectedPlanId || !selectedEmpId) return;
        const emp = employees.find(e => e.id === selectedEmpId);
        const plan = plans.find(p => p.id === selectedPlanId);
        if (!emp || !plan) return;

        const enrollment: BenefitEnrollment = {
            id: `BE-${Date.now()}`,
            empId: emp.id,
            empName: emp.name,
            planId: plan.id,
            planName: plan.name,
            planType: plan.type,
            enrolledAt: new Date().toISOString().split('T')[0],
            startDate: new Date().toISOString().split('T')[0],
            status: 'Active'
        };
        setEnrollments([...enrollments, enrollment]);
        pushNotification({ title: 'Employee Enrolled', body: `${emp.name} enrolled in ${plan.name}.`, category: 'HR', priority: 'normal', icon: 'person_add', iconBg: 'bg-indigo-50', iconColor: 'text-indigo-600' });
        setShowEnrollmentModal(false);
        setSelectedEmpId('');
        setSelectedPlanId('');
    };

    const handleCancelEnrollment = (id: string) => {
        setEnrollments(enrollments.map(e => e.id === id ? { ...e, status: 'Cancelled', endDate: new Date().toISOString().split('T')[0] } : e));
    };

    return (
        <div className="flex h-screen overflow-hidden bg-[#F8FAFC] dark:bg-slate-950 font-display text-slate-900 dark:text-slate-100">
            <Sidebar activeTab="Benefits" />
            <main className="flex flex-col h-full overflow-hidden ml-[280px] flex-1">
                <Header title="Benefits Administration" subtitle="Manage employee benefits, plans, and enrollments" />

                <div className="flex-1 overflow-y-auto px-8 pb-8">
                    {/* Tabs */}
                    <div className="flex items-center gap-1 mt-8 mb-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 w-fit shadow-sm">
                        {(['Overview', 'Plans', 'Enrollments'] as const).map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)}
                                className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer
                                    ${activeTab === tab ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 bg-transparent'}`}>
                                {tab}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'Overview' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="size-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600">
                                        <span className="material-symbols-outlined">policy</span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase">Active Plans</p>
                                        <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalPlans}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="size-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                                        <span className="material-symbols-outlined">group</span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase">Total Enrollments</p>
                                        <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalEnrollments}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="size-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600">
                                        <span className="material-symbols-outlined">payments</span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase">Monthly Liability</p>
                                        <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalCost.toLocaleString()} MMK</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'Plans' && (
                        <div className="animate-fade-in">
                            <div className="flex justify-end mb-4">
                                <button onClick={() => { setEditingPlan(null); setNewPlan({ type: 'Health Insurance', amount: 0, isActive: true }); setShowPlanModal(true); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-indigo-700 transition-colors flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">add</span> Add Plan
                                </button>
                            </div>
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                                        <tr>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Plan Name</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Type</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Amount (MMK)</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Eligibility</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {plans.map(plan => (
                                            <tr key={plan.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">{plan.name}</td>
                                                <td className="px-6 py-4 text-sm text-slate-500">{plan.type}</td>
                                                <td className="px-6 py-4 text-sm font-medium text-slate-700 dark:text-slate-300">{plan.amount.toLocaleString()}</td>
                                                <td className="px-6 py-4 text-sm text-slate-500">{plan.eligibilityCriteria}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${plan.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                        {plan.isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button onClick={() => { setEditingPlan(plan); setNewPlan(plan); setShowPlanModal(true); }} className="text-indigo-600 hover:underline text-sm font-bold mr-3">Edit</button>
                                                    <button onClick={() => setPlans(plans.map(p => p.id === plan.id ? { ...p, isActive: !p.isActive } : p))} className="text-slate-400 hover:text-slate-600 text-sm font-bold">
                                                        {plan.isActive ? 'Deactivate' : 'Activate'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'Enrollments' && (
                        <div className="animate-fade-in">
                            <div className="flex justify-end mb-4">
                                <button onClick={() => setShowEnrollmentModal(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-indigo-700 transition-colors flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">person_add</span> Enroll Employee
                                </button>
                            </div>
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                                        <tr>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Employee</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Plan</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Type</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Start Date</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {enrollments.map(en => (
                                            <tr key={en.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">{en.empName}</td>
                                                <td className="px-6 py-4 text-sm font-medium text-slate-700 dark:text-slate-300">{en.planName}</td>
                                                <td className="px-6 py-4 text-sm text-slate-500">{en.planType}</td>
                                                <td className="px-6 py-4 text-sm text-slate-500">{en.startDate}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${en.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : en.status === 'Pending' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                                                        {en.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {en.status === 'Active' && (
                                                        <button onClick={() => handleCancelEnrollment(en.id)} className="text-red-500 hover:underline text-sm font-bold">Cancel</button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Plan Modal */}
                {showPlanModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">{editingPlan ? 'Edit Plan' : 'Create New Plan'}</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Plan Name</label>
                                    <input type="text" value={newPlan.name || ''} onChange={e => setNewPlan({...newPlan, name: e.target.value})} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg dark:bg-slate-950 text-sm" placeholder="e.g. Premium Health" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Type</label>
                                    <select value={newPlan.type} onChange={e => setNewPlan({...newPlan, type: e.target.value as BenefitType})} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg dark:bg-slate-950 text-sm">
                                        {BENEFIT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Monthly Amount (MMK)</label>
                                    <input type="number" value={newPlan.amount || ''} onChange={e => setNewPlan({...newPlan, amount: parseInt(e.target.value)})} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg dark:bg-slate-950 text-sm" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Description</label>
                                    <textarea value={newPlan.description || ''} onChange={e => setNewPlan({...newPlan, description: e.target.value})} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg dark:bg-slate-950 text-sm h-20" />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button onClick={handleSavePlan} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-indigo-700">Save Plan</button>
                                    <button onClick={() => setShowPlanModal(false)} className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-2 rounded-lg text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700">Cancel</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Enrollment Modal */}
                {showEnrollmentModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Enroll Employee</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Employee</label>
                                    <select value={selectedEmpId} onChange={e => setSelectedEmpId(e.target.value)} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg dark:bg-slate-950 text-sm">
                                        <option value="">Select Employee</option>
                                        {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.id})</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Plan</label>
                                    <select value={selectedPlanId} onChange={e => setSelectedPlanId(e.target.value)} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg dark:bg-slate-950 text-sm">
                                        <option value="">Select Plan</option>
                                        {plans.filter(p => p.isActive).map(p => <option key={p.id} value={p.id}>{p.name} ({p.type})</option>)}
                                    </select>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button onClick={handleEnroll} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-indigo-700">Confirm Enrollment</button>
                                    <button onClick={() => setShowEnrollmentModal(false)} className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-2 rounded-lg text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700">Cancel</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
