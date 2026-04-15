import React, { useState } from 'react';
import DropdownMenu from '../components/DropdownMenu';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useAppData } from '../context/AppDataContext';
import { JobPosting } from '../context/AppDataContext';

export default function Jobs() {
    const { jobPostings, systemSettings, createJobPosting, toggleJobPortalStatus, candidates, alerts } = useAppData();
    
    const [searchQuery, setSearchQuery] = useState('');
    const [filterDepartment, setFilterDepartment] = useState('All');
    const [isJobModalOpen, setIsJobModalOpen] = useState(false);
    
    const [newJob, setNewJob] = useState<Partial<JobPosting>>({
        title: '',
        department: '',
        status: 'Open',
        portalStatus: false
    });

    const handleCreateJob = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newJob.title || !newJob.department) return;
        
        // Mocking admin action as ADM-001
        const res = createJobPosting(newJob as Omit<JobPosting, 'id' | 'postingDate'>, 'ADM-001');
        if (res.success) {
            setIsJobModalOpen(false);
            setNewJob({ title: '', department: '', status: 'Open', portalStatus: false });
        } else {
            alert(res.message);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Open': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-500';
            case 'Draft': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-500';
            case 'Closed': return 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 border-slate-500';
            default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-500';
        }
    };

    const handleExportJobs = () => {
        const headers = "Job ID,Title,Department,Status,Portal Status,Candidates,Posting Date\n";
        const csvContent = filteredJobs.map(job => {
            const candCount = candidates.filter(c => c.jobId === job.id).length;
            return `"${job.id}","${job.title}","${job.department}","${job.status}","${job.portalStatus ? 'Online' : 'Offline'}","${candCount}","${job.postingDate}"`;
        }).join('\n');
        
        const blob = new Blob([headers + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.body.appendChild(document.createElement('a'));
        link.href = url;
        link.download = `HRMS_Jobs_Export_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        document.body.removeChild(link);
    };

    const filteredJobs = jobPostings.filter(job => {
        const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              job.department.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDept = filterDepartment === 'All' || job.department === filterDepartment;
        return matchesSearch && matchesDept;
    });
    
    const departments = ['All', ...new Set(jobPostings.map(j => j.department))];

    return (
        <div className="flex min-h-screen bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100">
            {/* Sidebar */}
            <Sidebar activeTab="Jobs" />

            {/* Main Content Area */}
            <main className="flex-1 ml-[280px]">
                <Header 
                    title="Jobs Management"
                    subtitle="Open recruitment cycles, active job listings, and multi-portal status tracking"
                >
                    <div className="flex items-center gap-6 w-full max-w-[800px]">
                        <div className="relative w-full max-w-[480px]">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
                            <input
                                className="w-full border border-slate-200 dark:border-slate-800 rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent text-slate-900 placeholder-slate-400 bg-white dark:bg-slate-900 transition-all shadow-sm"
                                placeholder="Search for jobs or departments..."
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-300 transition-all hover:border-indigo-300 shadow-sm shrink-0">
                            <span className="material-symbols-outlined text-sm text-indigo-500">account_balance_wallet</span>
                            <span>ATS Credits: <strong className={systemSettings.atsCredits === 0 ? 'text-red-500' : 'text-slate-900 dark:text-slate-100'}>{systemSettings.atsCredits}</strong></span>
                        </div>
                    </div>
                </Header>

                {/* Dashboard Content */}
                <div className="p-8">
                    {/* Job Listings Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-fade-in-up">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                            <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">Recent Listings</h4>
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col items-end">
                                    <button 
                                        onClick={() => setIsJobModalOpen(true)}
                                        disabled={systemSettings.atsCredits === 0}
                                        className="bg-[#4F46E5] hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-lg">add</span>New Job
                                    </button>
                                    <p className="text-[10px] text-slate-500 font-medium mt-1">Cost: 1 Credit</p>
                                </div>
                                <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>
                                <div className="flex gap-2">
                                    <DropdownMenu
                                        value={filterDepartment}
                                        onChange={setFilterDepartment}
                                        align="right"
                                        options={departments.map(dept => ({
                                            value: dept,
                                            label: dept === 'All' ? 'All Departments' : dept,
                                        }))}
                                    />
                                    <button 
                                        onClick={handleExportJobs}
                                        className="px-3 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 bg-white dark:bg-slate-900"
                                    >
                                        <span className="material-symbols-outlined text-sm">download</span>
                                        Export CSV
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50">
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Job Title</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Department</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Portal Status</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Candidates Count</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Posting Date</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {filteredJobs.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                                No listings found matching your criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredJobs.map(job => {
                                            const candCount = candidates.filter(c => c.jobId === job.id).length;
                                            
                                            return (
                                                <tr key={job.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{job.title}</p>
                                                        <p className="text-xs text-slate-500">ID: {job.id}</p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                                            {job.department}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${getStatusStyle(job.status)}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${getStatusStyle(job.status).split(' ')[0].replace('bg-', 'bg-').replace('100', '500')}`}></span>
                                                            {job.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <label className="relative inline-flex items-center cursor-pointer" title="Toggle external portal visibility">
                                                            <input 
                                                                type="checkbox" 
                                                                className="sr-only peer" 
                                                                checked={job.portalStatus} 
                                                                onChange={() => toggleJobPortalStatus(job.id, 'ADM-001')}
                                                            />
                                                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                                                        </label>
                                                    </td>
                                                    <td className="px-6 py-4 text-center font-medium text-sm">
                                                        <span className={`px-2.5 py-1 inline-block rounded-md ${candCount > 0 ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-500'}`}>
                                                            {candCount}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-slate-500">{job.postingDate}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button className="text-slate-400 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <span className="material-symbols-outlined">more_vert</span>
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 flex items-center justify-between text-xs text-slate-500 font-medium">
                            <p>Showing 1 to {filteredJobs.length} of {jobPostings.length} entries</p>
                            <div className="flex gap-2">
                                <button className="p-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50 text-slate-600 dark:text-slate-400" disabled>
                                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                                </button>
                                <button className="p-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50 text-slate-600 dark:text-slate-400" disabled>
                                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* New Job Modal Overlay */}
            {isJobModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create Job Listing</h3>
                                <p className="text-xs text-slate-500 mt-1">Deducts 1 ATS Credit from your balance</p>
                            </div>
                            <button onClick={() => setIsJobModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleCreateJob} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Job Title</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800"
                                    placeholder="e.g. Graphic Designer"
                                    value={newJob.title}
                                    onChange={e => setNewJob({...newJob, title: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Department</label>
                                <select
                                    required
                                    className="w-full border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800"
                                    value={newJob.department}
                                    onChange={e => setNewJob({...newJob, department: e.target.value})}
                                >
                                    <option value="" disabled>Select Department</option>
                                    <option value="Design">Design</option>
                                    <option value="Engineering">Engineering</option>
                                    <option value="Sales">Sales</option>
                                    <option value="Production">Production</option>
                                    <option value="Operations">Operations</option>
                                </select>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Initial Status</label>
                                    <select
                                        className="w-full border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800"
                                        value={newJob.status}
                                        onChange={e => setNewJob({...newJob, status: e.target.value as any})}
                                    >
                                        <option value="Draft">Draft</option>
                                        <option value="Open">Open</option>
                                    </select>
                                </div>
                                <div className="flex flex-col justify-center items-start pt-5">
                                    <label className="relative inline-flex items-center cursor-pointer gap-2" title="Publish straight to the external applicant portal">
                                        <input 
                                            type="checkbox" 
                                            className="sr-only peer" 
                                            checked={newJob.portalStatus} 
                                            onChange={e => setNewJob({...newJob, portalStatus: e.target.checked})}
                                        />
                                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Publish to Portal</span>
                                    </label>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <button type="button" onClick={() => setIsJobModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" className="px-4 py-2 text-sm font-semibold bg-[#4F46E5] text-white hover:bg-indigo-700 rounded-lg flex items-center gap-2 transition-colors">
                                    <span className="material-symbols-outlined text-sm">check_circle</span> Create Posting
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
