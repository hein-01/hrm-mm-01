import React, { useState, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useAppData } from '../context/AppDataContext';
import { useSystemCalendar } from '../context/SystemCalendarContext';

export default function AssetManagement() {
    const { assets, setAssets, employees, getNonCompliantAssetsCount, reportAssetLoss } = useAppData();
    const { getCurrentDateISO } = useSystemCalendar();
    const activeEmployees = employees.filter(e => e.status === 'Active');
    const nonCompliantCount = getNonCompliantAssetsCount();

    const [searchQuery, setSearchQuery] = useState('');
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [activeRecord, setActiveRecord] = useState<any>(null);
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

    // Form States
    const [assignSelection, setAssignSelection] = useState('EMP-001');
    const [maintenanceReturnDate, setMaintenanceReturnDate] = useState('');

    // Search Filtering
    const filteredAssets = useMemo(() => {
        if (!searchQuery.trim()) return assets;
        const lowerQ = searchQuery.toLowerCase();
        return assets.filter(a => {
            const assignedEmp = employees.find(e => e.id === a.assigneeId);
            return a.id.toLowerCase().includes(lowerQ) ||
                   a.model.toLowerCase().includes(lowerQ) ||
                   (assignedEmp && assignedEmp.name.toLowerCase().includes(lowerQ));
        });
    }, [assets, searchQuery, employees]);

    // Live KPI Calculations (Derived purely from master state)
    const totalAssetsValuation = assets.reduce((sum, current) => sum + current.value, 0);
    const countInUse = assets.filter(a => a.status === 'In Use').length;
    const countMaintenance = assets.filter(a => a.status === 'Maintenance').length;
    const countAvailable = assets.filter(a => a.status === 'Available').length;

    const percentageAssigned = ((countInUse / assets.length) * 100).toFixed(0);

    // Lifecycle Actions
    const handleAssignAsset = () => {
        if (!activeRecord || !assignSelection) return;
        setAssets(prev => prev.map(a =>
            a.id === activeRecord.id ? {
                ...a,
                status: 'In Use',
                assigneeId: assignSelection,
                lastAuditDate: getCurrentDateISO()
            } : a
        ));
        closeModals();
    };

    const handleSendMaintenance = () => {
        if (!activeRecord || !maintenanceReturnDate) return;
        setAssets(prev => prev.map(a =>
            a.id === activeRecord.id ? {
                ...a,
                status: 'Maintenance',
                assigneeId: null,
                expectedReturnDate: maintenanceReturnDate,
                lastAuditDate: getCurrentDateISO()
            } : a
        ));
        closeModals();
    };

    const handleRecoverAsset = () => {
        if (!activeRecord) return;
        setAssets(prev => prev.map(a =>
            a.id === activeRecord.id ? {
                ...a,
                status: 'Available',
                assigneeId: null,
                expectedReturnDate: null,
                lastAuditDate: getCurrentDateISO()
            } : a
        ));
        closeModals();
    };

    const closeModals = () => {
        setActiveModal(null);
        setActiveRecord(null);
        setMaintenanceReturnDate('');
        setAssignSelection('EMP-001');
    };

    const toggleDropdown = (id: string | null) => {
        setOpenDropdownId(openDropdownId === id ? null : id);
    };

    // Style Helpers
    const getStatusStyles = (status: string) => {
        if (status === 'In Use') return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800/30';
        if (status === 'Available') return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/30';
        if (status === 'Maintenance') return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-500 dark:border-amber-800/30';
        return 'bg-slate-50 text-slate-700 border-slate-200';
    };

    return (
        <div className="flex h-screen w-full font-display text-slate-900 dark:text-white antialiased overflow-hidden bg-background-light dark:bg-background-dark relative">
            <Sidebar activeTab="Assets" />

            <main className="flex-1 flex flex-col h-full overflow-hidden relative ml-[280px]">
                {/* 1. Global Header Integration */}
                <Header 
                    title="Asset Management"
                    subtitle="Track lifecycle, maintenance, and fleet valuation"
                >
                    <div className="relative w-full max-w-[480px] ml-4 hidden lg:block">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
                        <input
                            className="w-full border border-slate-200 dark:border-slate-800 rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent text-slate-900 placeholder-slate-400 bg-white dark:bg-slate-900 transition-all shadow-sm"
                            placeholder="Search by ID, Model, or User..."
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </Header>

                <div className="flex-1 overflow-y-auto w-full bg-[#F8FAFC]">

                    {/* Header Controls */}
                    {/* Header Controls */}
                    <header className="px-8 py-0 sticky top-0 z-20 flex items-center justify-end bg-[#F8FAFC] mt-8">
                        <div className="flex items-center gap-4">
                            <button className="bg-[#4F46E5] text-white px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-[#4338CA] transition-colors shadow-sm">
                                <span className="material-symbols-outlined text-[20px]">add_circle</span> Purchase Asset
                            </button>
                        </div>
                    </header>

                    <div className="p-8 flex flex-col gap-8 max-w-[1600px] mx-auto w-full">

                        {/* 2. Interactive KPI Deck */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="material-symbols-outlined p-2 rounded-lg text-[#4F46E5] bg-indigo-50">devices</span>
                                </div>
                                <p className="text-slate-500 text-sm font-bold uppercase tracking-tight">Total Inventory</p>
                                <h3 className="text-3xl font-bold mt-1 text-slate-900">{assets.length}</h3>
                                <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center text-xs font-bold">
                                    <span className="text-slate-500">Net Book Value</span>
                                    <span className="text-slate-900">${totalAssetsValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="material-symbols-outlined p-2 bg-indigo-100 text-[#4F46E5] rounded-lg">person_check</span>
                                </div>
                                <p className="text-slate-500 text-sm font-bold uppercase tracking-tight">Assigned</p>
                                <h3 className="text-3xl font-bold mt-1 text-slate-900">{countInUse}</h3>
                                <div className="mt-3 pt-3 border-t border-slate-100 text-xs font-bold text-slate-500">
                                    {percentageAssigned}% Fleet Utilization Rate
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="material-symbols-outlined p-2 bg-amber-100 text-amber-600 rounded-lg">build_circle</span>
                                </div>
                                <p className="text-slate-500 text-sm font-bold uppercase tracking-tight">In Maintenance</p>
                                <h3 className="text-3xl font-bold mt-1 text-amber-600">{countMaintenance}</h3>
                                <div className="mt-3 pt-3 border-t border-slate-100 text-xs font-bold text-slate-500">
                                    Pending technical repairs
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="material-symbols-outlined p-2 bg-emerald-100 text-emerald-600 rounded-lg">check_circle</span>
                                </div>
                                <p className="text-slate-500 text-sm font-bold uppercase tracking-tight">Available</p>
                                <h3 className="text-3xl font-bold mt-1 text-emerald-600">{countAvailable}</h3>
                                <div className="mt-3 pt-3 border-t border-slate-100 text-xs font-bold text-slate-500">
                                    Ready for deployment
                                </div>
                            </div>
                        </div>

                        {/* 3. Interactive Data Grid */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden relative transition-all min-h-[400px]">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-[#F8FAFC] border-b border-slate-200">
                                        <tr>
                                            <th className="px-6 py-4 text-[11px] font-extrabold text-slate-500 uppercase tracking-widest">Asset Details</th>
                                            <th className="px-6 py-4 text-[11px] font-extrabold text-slate-500 uppercase tracking-widest">Status / Condition</th>
                                            <th className="px-6 py-4 text-[11px] font-extrabold text-slate-500 uppercase tracking-widest">Assigned To</th>
                                            <th className="px-6 py-4 text-[11px] font-extrabold text-slate-500 uppercase tracking-widest text-right">Valuation</th>
                                            <th className="px-6 py-4 text-[11px] font-extrabold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 pb-16">
                                        {filteredAssets.map(asset => (
                                            <tr key={asset.id} className="hover:bg-slate-50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-4">
                                                        <span className="material-symbols-outlined text-slate-400 p-2 bg-slate-50 rounded-lg">{asset.icon}</span>
                                                        <div className="flex flex-col gap-0.5">
                                                            <p className="font-bold text-slate-900 group-hover:text-[#4F46E5] transition-colors">{asset.model}</p>
                                                            <div className="flex items-center gap-2 text-xs font-mono font-medium text-slate-500">
                                                                <span className="uppercase tracking-widest">{asset.id}</span>
                                                                <span className="size-1 rounded-full bg-slate-300"></span>
                                                                <span>{asset.category}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 align-top">
                                                    <div className="flex flex-col gap-1 items-start">
                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${getStatusStyles(asset.status)}`}>
                                                            {asset.status.toUpperCase()}
                                                        </span>
                                                        {asset.status === 'Maintenance' && asset.expectedReturnDate && (
                                                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 flex items-center py-0.5 rounded border border-amber-100 uppercase tracking-wider">
                                                                <span className="material-symbols-outlined text-[12px] mr-1">timer</span> Due: {asset.expectedReturnDate}
                                                            </span>
                                                        )}
                                                        <span className="text-[10px] text-slate-400 font-medium">Last Audit: {asset.lastAuditDate}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 align-top">
                                                    {asset.assigneeId ? (() => {
                                                        const assignedEmp = employees.find(e => e.id === asset.assigneeId);
                                                        if (!assignedEmp) return <p className="text-sm italic text-slate-400 mt-1 uppercase tracking-widest font-extrabold text-[10px]">Orphaned</p>;
                                                        return (
                                                            <div className="flex items-center gap-2 mt-1">
                                                                {assignedEmp.avatar ? (
                                                                    <img className="size-7 rounded-full border border-slate-200 object-cover" alt="Avatar" src={assignedEmp.avatar} />
                                                                ) : (
                                                                    <div className={`size-7 rounded-full flex items-center justify-center font-bold text-xs border ${assignedEmp.colorClass || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                                                        {assignedEmp.initials || assignedEmp.name.charAt(0)}
                                                                    </div>
                                                                )}
                                                                <p className="text-sm font-bold text-slate-700">{assignedEmp.name}</p>
                                                            </div>
                                                        );
                                                    })() : (
                                                        <p className="text-sm italic text-slate-400 mt-1 uppercase tracking-widest font-extrabold text-[10px]">Unassigned</p>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right align-top">
                                                    <p className="text-sm font-mono font-bold text-slate-700 mt-1">MMK {asset.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                                </td>
                                                <td className="px-6 py-4 text-right relative align-top">
                                                    <button onClick={() => toggleDropdown(asset.id)} className="p-1.5 mt-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors">
                                                        <span className="material-symbols-outlined text-[20px]">more_vert</span>
                                                    </button>

                                                    {/* Context Dropdown Lifecycle Logic */}
                                                    {openDropdownId === asset.id && (
                                                        <>
                                                            <div className="fixed inset-0 z-10" onClick={() => setOpenDropdownId(null)}></div>
                                                            <div className="absolute right-8 top-8 w-48 bg-white border border-slate-200 shadow-xl rounded-xl z-20 py-1 overflow-hidden animate-fade-in text-left">

                                                                {asset.status === 'Available' && (
                                                                    <button onClick={() => { setActiveRecord(asset); setActiveModal('assign'); setOpenDropdownId(null); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-[#4F46E5] font-medium border-b border-slate-50">
                                                                        <span className="material-symbols-outlined text-[18px]">person_add</span> Assign Employee
                                                                    </button>
                                                                )}
                                                                {asset.status === 'In Use' && (
                                                                    <button onClick={() => { setActiveRecord(asset); handleRecoverAsset(); setOpenDropdownId(null); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-emerald-600 font-medium border-b border-slate-50">
                                                                        <span className="material-symbols-outlined text-[18px]">settings_backup_restore</span> Recover Asset
                                                                    </button>
                                                                )}
                                                                {asset.status !== 'Maintenance' && (
                                                                    <button onClick={() => { setActiveRecord(asset); setActiveModal('maintenance'); setOpenDropdownId(null); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-amber-600 hover:bg-amber-50 font-medium">
                                                                        <span className="material-symbols-outlined text-[18px]">build</span> Send to Maintenance
                                                                    </button>
                                                                )}
                                                                {asset.status === 'Maintenance' && (
                                                                    <button onClick={() => { setActiveRecord(asset); handleRecoverAsset(); setOpenDropdownId(null); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-emerald-600 hover:bg-emerald-50 font-medium border-b border-slate-50">
                                                                        <span className="material-symbols-outlined text-[18px]">check_circle</span> Repairs Complete
                                                                    </button>
                                                                )}
                                                                {asset.status === 'In Use' && (
                                                                    <button onClick={() => { reportAssetLoss(asset.id, asset.assigneeId!); setOpenDropdownId(null); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium border-t border-slate-50">
                                                                        <span className="material-symbols-outlined text-[18px]">report_problem</span> Report Loss & Deduct
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredAssets.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                                    <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">search_off</span>
                                                    <p className="font-medium">No assets matching the query '{searchQuery}'.</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                </div>

                {/* 4. Action Modals */}

                {/* Assign Asset Modal */}
                {activeModal === 'assign' && activeRecord && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in px-4">
                        <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col">
                            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#4F46E5]">person_add</span> Assign Asset
                                </h3>
                                <button onClick={closeModals} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center gap-3">
                                    <span className="material-symbols-outlined text-[#4F46E5]">{activeRecord.icon}</span>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">{activeRecord.model}</p>
                                        <p className="text-xs font-mono text-slate-500">{activeRecord.id}</p>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Assign to Workforce</label>
                                    <select
                                        value={assignSelection}
                                        onChange={e => setAssignSelection(e.target.value)}
                                        className="w-full text-sm p-2.5 border border-slate-300 rounded-lg focus:ring-[#4F46E5] focus:border-[#4F46E5] font-semibold bg-white"
                                    >
                                        {activeEmployees.map(e => (
                                            <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">security</span> Linked safely against Active HR Registry.</p>
                                </div>
                            </div>
                            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                                <button onClick={closeModals} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button>
                                <button onClick={handleAssignAsset} className="px-6 py-2.5 rounded-lg text-sm font-bold text-white bg-[#4F46E5] hover:bg-indigo-600 transition-colors shadow-sm">Confirm Link</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Send to Maintenance Modal */}
                {activeModal === 'maintenance' && activeRecord && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in px-4">
                        <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col">
                            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-amber-500">build</span> Maintenance Dispatch
                                </h3>
                                <button onClick={closeModals} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="space-y-1.5 mt-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-2 block">Expected Return / Resolution</label>
                                    <input
                                        type="date"
                                        value={maintenanceReturnDate}
                                        onChange={e => setMaintenanceReturnDate(e.target.value)}
                                        className="w-full text-sm p-2.5 border border-slate-300 rounded-lg focus:ring-amber-500 focus:border-amber-500 font-semibold bg-white"
                                    />
                                    <p className="text-[10px] font-bold text-slate-400 mt-1">This populates compliance dashboards for Hardware Tracking metrics automatically.</p>
                                </div>
                            </div>
                            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                                <button onClick={closeModals} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button>
                                <button onClick={handleSendMaintenance} className="px-6 py-2.5 rounded-lg text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 transition-colors shadow-sm">Dispatch Unit</button>
                            </div>
                        </div>
                    </div>
                )}

                {nonCompliantCount > 0 && (
                    <div className="bg-red-50 border-t border-red-200 text-red-700 px-8 py-3 text-sm font-bold flex items-center gap-3 shadow-sm z-10 sticky bottom-0">
                        <span className="material-symbols-outlined text-[18px]">warning</span>
                        Compliance Alert: {nonCompliantCount} asset(s) have not been audited in over 6 months.
                    </div>
                )}
            </main>
        </div>
    );
}
