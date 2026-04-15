import React, { useState, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useAppData } from '../context/AppDataContext';

export default function Onboarding() {
    const { onboardingRecords, toggleOnboardingTask, addOnboardingCustomTask, deleteOnboardingTask, sendOnboardingReminder, systemSettings } = useAppData();

    const [activeTab, setActiveTab] = useState<'All Candidates' | 'Pending Docs' | 'Orientation' | 'Completed' | 'Overdue'>('All Candidates');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

    const [customTaskTitle, setCustomTaskTitle] = useState('');
    const [customTaskTooltip, setCustomTaskTooltip] = useState('');
    const [showCustomTaskForm, setShowCustomTaskForm] = useState(false);

    // KPI Calculations
    const totalOnboarding = onboardingRecords.length;
    const completedOnboarding = onboardingRecords.filter(r => r.status === 'Completed').length;
    const inProgressOnboarding = onboardingRecords.filter(r => r.status === 'In Progress' || r.status === 'Pending Docs' || r.status === 'Orientation').length;
    const overdueOnboarding = onboardingRecords.filter(r => r.status === 'Overdue').length;

    // Filtering
    const filteredRecords = useMemo(() => {
        return onboardingRecords.filter(r => {
            const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.role.toLowerCase().includes(searchQuery.toLowerCase());
            let matchesTab = true;
            if (activeTab === 'Pending Docs') matchesTab = r.status === 'Pending Docs';
            if (activeTab === 'Orientation') matchesTab = r.status === 'Orientation';
            if (activeTab === 'Completed') matchesTab = r.status === 'Completed';
            if (activeTab === 'Overdue') matchesTab = r.status === 'Overdue';

            return matchesSearch && matchesTab;
        });
    }, [onboardingRecords, searchQuery, activeTab]);

    const handleTaskToggle = (recordId: string, taskId: string) => {
        // assume adminId is current user
        toggleOnboardingTask(recordId, taskId, systemSettings.adminIds[0]);
    };

    const handleAddCustomTask = () => {
        if (!selectedRecordId || !customTaskTitle) return;
        addOnboardingCustomTask(selectedRecordId, customTaskTitle, customTaskTooltip || 'Custom task added by HR', systemSettings.adminIds[0]);
        setCustomTaskTitle('');
        setCustomTaskTooltip('');
        setShowCustomTaskForm(false);
    };

    const handleDeleteTask = (taskId: string) => {
        if (!selectedRecordId) return;
        deleteOnboardingTask(selectedRecordId, taskId, systemSettings.adminIds[0]);
    };

    const handleSendReminder = (method: 'viber' | 'whatsapp', taskId: string, taskTitle: string) => {
        if (!selectedRecordId) return;
        
        // Mocking the link logic based on requirement
        sendOnboardingReminder(selectedRecordId, taskId, systemSettings.adminIds[0], method);
        
        const message = encodeURIComponent(`Reminder: Please complete the onboarding task "${taskTitle}" as soon as possible.`);
        if (method === 'whatsapp') {
            window.open(`https://wa.me/?text=${message}`, '_blank');
        } else {
            window.open(`viber://forward?text=${message}`, '_blank');
        }
    };

    const selectedRecord = onboardingRecords.find(r => r.id === selectedRecordId);

    return (
        <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100">
            <Sidebar activeTab="Onboarding" />

            <main className="flex-1 flex flex-col overflow-hidden ml-[280px]">
                <Header 
                    title="Onboarding"
                    subtitle="Coordinate employee arrivals, track mandatory documentation, and manage orientation checklists"
                >
                    <div className="relative w-full max-w-[480px] ml-4 hidden lg:block">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
                        <input
                            className="w-full border border-slate-200 dark:border-slate-800 rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent text-slate-900 placeholder-slate-400 bg-white dark:bg-slate-900 transition-all shadow-sm"
                            placeholder="Search by name or ID..."
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </Header>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-8 dark:bg-background-dark bg-[#f8fafc]">
                    <div className="flex flex-wrap justify-between items-start gap-3 mb-8">
                        <div className="flex min-w-72 flex-col gap-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Onboarding Lifecycle</p>
                        </div>
                        <div className="flex gap-2">
                            <button className="text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl h-10 px-4 text-sm font-bold transition-all flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">upload_file</span>
                                <span>Bulk Import</span>
                            </button>
                            <button className="bg-primary hover:bg-primary/90 text-white rounded-xl h-10 px-4 text-sm font-bold shadow-sm transition-all flex items-center gap-2" style={{ backgroundColor: '#4F46E5' }}>
                                <span className="material-symbols-outlined text-sm">add</span>
                                <span>Hire</span>
                            </button>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm transition-transform hover:scale-[1.02]">
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Onboarding</p>
                            <div className="flex items-end justify-between">
                                <p className="text-slate-900 dark:text-white text-3xl font-bold">{totalOnboarding}</p>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm transition-transform hover:scale-[1.02]">
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Completed</p>
                            <div className="flex items-end justify-between">
                                <p className="text-slate-900 dark:text-white text-3xl font-bold">{completedOnboarding}</p>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm transition-transform hover:scale-[1.02]">
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">In Progress</p>
                            <div className="flex items-end justify-between">
                                <p className="text-slate-900 dark:text-white text-3xl font-bold">{inProgressOnboarding}</p>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm transition-transform hover:scale-[1.02]">
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Overdue</p>
                            <div className="flex items-end justify-between">
                                <p className="text-rose-600 dark:text-rose-400 text-3xl font-bold">{overdueOnboarding}</p>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
                        <div className="flex gap-8">
                            {['All Candidates', 'Pending Docs', 'Orientation', 'Completed', 'Overdue'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab as any)}
                                    className={`pb-4 px-2 text-sm font-bold border-b-2 transition-colors ${
                                        activeTab === tab 
                                        ? 'border-primary text-primary' 
                                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                                    }`}
                                    style={activeTab === tab ? { borderColor: '#4F46E5', color: '#4F46E5' } : {}}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                            <h3 className="font-bold text-slate-900 dark:text-white">Active Onboarding List</h3>
                            <div className="flex gap-2">
                                <button className="p-2 text-slate-400 hover:text-primary"><span className="material-symbols-outlined">filter_list</span></button>
                                <button className="p-2 text-slate-400 hover:text-primary"><span className="material-symbols-outlined">file_download</span></button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Employee</th>
                                        <th className="px-6 py-4">Role</th>
                                        <th className="px-6 py-4">Supervisor</th>
                                        <th className="px-6 py-4">Start Date</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Progress</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {filteredRecords.map((record) => {
                                        const completedTasks = record.tasks.filter(t => t.isCompleted).length;
                                        const totalTasks = record.tasks.length;
                                        
                                        let statusColor = 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
                                        if (record.status === 'Pending Docs') statusColor = 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400';
                                        if (record.status === 'Orientation') statusColor = 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400';
                                        if (record.status === 'Completed') statusColor = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400';
                                        if (record.status === 'Overdue') statusColor = 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400';

                                        return (
                                            <tr 
                                                key={record.id} 
                                                onClick={() => setSelectedRecordId(record.id)}
                                                className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="size-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-primary text-xs">
                                                            {record.name.substring(0,2).toUpperCase()}
                                                        </div>
                                                        <span className="text-sm font-semibold text-slate-900 dark:text-white">{record.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{record.role}</td>
                                                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{record.supervisor}</td>
                                                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{record.startDate}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColor}`}>{record.status}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                                        <span>{completedTasks} of {totalTasks}</span>
                                                        <div className="w-16 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                            <div 
                                                                className="h-full bg-primary" 
                                                                style={{ width: `${(completedTasks/totalTasks)*100}%`, backgroundColor: '#4F46E5' }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredRecords.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-8 text-center text-slate-500">No onboarding records found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>

            {/* Slide-over Panel for Interactive Checklist */}
            {selectedRecord && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setSelectedRecordId(null)}></div>
                    <div className="w-[500px] max-w-[100vw] bg-white dark:bg-slate-900 shadow-2xl h-full relative z-10 flex flex-col border-l border-slate-200 dark:border-slate-800 transition-transform duration-300 transform translate-x-0">
                        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{selectedRecord.name}'s Onboarding</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{selectedRecord.role} • Started {selectedRecord.startDate}</p>
                            </div>
                            <button onClick={() => setSelectedRecordId(null)} className="p-2 text-slate-400 hover:text-slate-600 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>
                        
                        <div className="p-6 flex-1 overflow-y-auto">
                            <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800/30">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Checklist Progress</h3>
                                    <span className="text-sm font-semibold text-primary">{selectedRecord.tasks.filter(t => t.isCompleted).length} / {selectedRecord.tasks.length} Completed</span>
                                </div>
                                <div className="w-full h-2 bg-blue-100 dark:bg-blue-900/50 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-primary transition-all duration-500" 
                                        style={{ width: `${(selectedRecord.tasks.filter(t => t.isCompleted).length / selectedRecord.tasks.length) * 100}%`, backgroundColor: '#4F46E5'}}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-slate-900 dark:text-white">Assigned Tasks</h3>
                            </div>

                            <div className="space-y-3">
                                {selectedRecord.tasks.map(task => (
                                    <div key={task.id} className={`p-4 rounded-xl border flex items-start gap-4 transition-colors ${task.isCompleted ? 'bg-slate-50 border-slate-100 dark:bg-slate-800/30 dark:border-slate-800 opacity-75' : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700 shadow-sm'}`}>
                                        <button 
                                            onClick={() => handleTaskToggle(selectedRecord.id, task.id)}
                                            className={`mt-0.5 w-6 h-6 rounded flex items-center justify-center border transition-colors flex-shrink-0 ${task.isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-transparent hover:border-primary'}`}
                                        >
                                            <span className="material-symbols-outlined text-[16px]">check</span>
                                        </button>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className={`text-sm font-bold ${task.isCompleted ? 'text-slate-500 line-through' : 'text-slate-900 dark:text-white'}`}>{task.title}</h4>
                                                {task.isMandatory && (
                                                    <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold uppercase">Mandatory</span>
                                                )}
                                                <div className="group relative">
                                                    <span className="material-symbols-outlined text-[16px] text-slate-400 cursor-help">info</span>
                                                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 bg-slate-800 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none z-10 text-center">
                                                        {task.tooltip}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-slate-500">{task.type}</span>
                                                {!task.isCompleted && (
                                                    <div className="flex items-center gap-2">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleSendReminder('viber', task.id, task.title); }}
                                                            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                                                        >
                                                            Viber Alert
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleSendReminder('whatsapp', task.id, task.title); }}
                                                            className="text-xs text-emerald-600 hover:text-emerald-800 font-semibold"
                                                        >
                                                            WhatsApp Alert
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <button 
                                            onClick={() => handleDeleteTask(task.id)}
                                            className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                                            title="Delete Task"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Add Custom Task Form */}
                            <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-6">
                                {!showCustomTaskForm ? (
                                    <button 
                                        onClick={() => setShowCustomTaskForm(true)}
                                        className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 font-semibold hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">add_circle</span>
                                        Add Custom Task
                                    </button>
                                ) : (
                                    <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">New Custom Task</h4>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-xs font-semibold text-slate-500 block mb-1">Task Title</label>
                                                <input 
                                                    type="text" 
                                                    value={customTaskTitle}
                                                    onChange={e => setCustomTaskTitle(e.target.value)}
                                                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                                                    placeholder="e.g. Provide Access Badge"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-slate-500 block mb-1">Tooltip / Instructions</label>
                                                <input 
                                                    type="text" 
                                                    value={customTaskTooltip}
                                                    onChange={e => setCustomTaskTooltip(e.target.value)}
                                                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                                                    placeholder="e.g. Retrieve from front desk security"
                                                />
                                            </div>
                                            <div className="flex gap-2 pt-2">
                                                <button 
                                                    onClick={handleAddCustomTask}
                                                    className="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors"
                                                    style={{ backgroundColor: '#4F46E5' }}
                                                >
                                                    Add Task
                                                </button>
                                                <button 
                                                    onClick={() => { setShowCustomTaskForm(false); setCustomTaskTitle(''); }}
                                                    className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 py-2 rounded-lg text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
