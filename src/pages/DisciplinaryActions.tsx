import React, { useState } from 'react';
import Layout from '../layouts/Layout';
import Header from '../components/Header';
import { useAppData } from '../context/AppDataContext';

export default function DisciplinaryActions() {
  const { disciplinaryActions, employees, addDisciplinaryAction } = useAppData();
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Stats calculation
  const stats = {
    total: disciplinaryActions.length,
    active: disciplinaryActions.filter(a => a.status === 'Active').length,
    resolved: disciplinaryActions.filter(a => a.status === 'Resolved').length,
    suspensions: disciplinaryActions.filter(a => a.type === 'Suspension').length
  };

  const filteredActions = disciplinaryActions.filter(action => {
    const matchesTab = activeTab === 'All' || action.status === activeTab;
    const matchesSearch = action.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         action.reason.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'Verbal Warning':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Written Warning':
        return 'bg-orange-50 text-orange-700 border-orange-100';
      case 'Final Warning':
        return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'Suspension':
        return 'bg-slate-900 text-white border-slate-900';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  return (
    <Layout activeTab="Disciplinary Actions">
      <div className="min-h-screen">
        <Header 
          title="Disciplinary Actions" 
          subtitle="Record and monitor employee warnings, suspensions, and compliance incidents" 
        />

        <div className="px-8 py-8 space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-lg border border-indigo-100">
                  {stats.total}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Total Incidents</p>
                  <p className="text-xl font-bold text-slate-900">Historical Record</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md border-l-4 border-l-orange-400">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                  <span className="material-symbols-outlined text-[28px]">report_problem</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Active Warnings</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.active}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md border-l-4 border-l-slate-900">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-900 font-bold">
                   <span className="material-symbols-outlined text-[28px]">gavel</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Suspensions</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.suspensions}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md border-l-4 border-l-emerald-400">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <span className="material-symbols-outlined text-[28px]">check_circle</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Resolved</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.resolved}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Controls */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-8">
            <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
              <div className="flex items-center gap-1 p-1 bg-white rounded-xl border border-slate-200 w-fit">
                {['All', 'Active', 'Resolved', 'Expired'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-lg text-sm font-black uppercase tracking-widest transition-all ${
                      activeTab === tab
                        ? 'bg-rose-600 text-white shadow-md'
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                   <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
                  <input
                    type="text"
                    placeholder="Search incidents..."
                    className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition-all w-64 shadow-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="px-6 py-2 bg-rose-600 text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-md shadow-rose-200 flex items-center gap-2 active:scale-95"
                >
                   <span className="material-symbols-outlined text-[20px]">add</span>
                  Issue Warning
                </button>
              </div>
            </div>

            {/* Actions Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Action Type</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Reason & Findings</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Context Dates</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredActions.length > 0 ? (
                    filteredActions.map((action) => (
                      <tr key={action.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-6 py-4 align-top">
                          <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold border-2 border-white shadow-sm ring-1 ring-slate-200 uppercase tracking-tighter">
                              {action.employeeName.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                               <p className="font-bold text-slate-900 group-hover:text-rose-600 transition-all">{action.employeeName}</p>
                               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{action.dept}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <div className="space-y-2">
                             <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-widest shadow-sm ${getTypeStyles(action.type)}`}>
                              {action.type}
                            </span>
                            <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${action.status === 'Active' ? 'text-rose-600' : 'text-slate-400'}`}>
                              <span className="material-symbols-outlined text-[14px]">
                                {action.status === 'Active' ? 'schedule' : 'check_circle'}
                              </span>
                              {action.status}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top max-w-[300px]">
                          <p className="font-bold text-slate-900 line-clamp-1">{action.reason}</p>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2 italic font-medium leading-relaxed">{action.actionTaken}</p>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                              <span className="material-symbols-outlined text-[16px] text-slate-400">calendar_today</span>
                              <span>Issued: {new Date(action.issueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            </div>
                            {action.expiryDate && (
                              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 italic">
                                <span className="material-symbols-outlined text-[16px]">history</span>
                                <span>Expires: {new Date(action.expiryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right align-top">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <button className="p-2 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 text-slate-500 hover:text-rose-600 transition-all shadow-sm">
                               <span className="material-symbols-outlined text-[20px]">description</span>
                            </button>
                            <button className="p-2 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 text-slate-500 hover:text-rose-600 transition-all shadow-sm">
                               <span className="material-symbols-outlined text-[20px]">more_vert</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-3xl m-4">
                        <span className="material-symbols-outlined text-6xl opacity-20 block mb-2">gavel</span>
                        <p className="font-bold italic uppercase tracking-widest text-[11px]">No active disciplinary records within this scope.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Issue Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in px-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden animate-in zoom-in duration-300">
             <div className="p-8 border-b border-slate-100 bg-rose-50/20 flex items-center justify-between relative overflow-hidden">
               <div className="absolute right-0 top-0 p-8 opacity-5 text-rose-500 pointer-events-none">
                 <span className="material-symbols-outlined text-[120px]">report_problem</span>
               </div>
              <div className="relative z-10">
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Issue Warning</h3>
                <p className="text-xs text-rose-600 font-bold uppercase tracking-widest mt-1">Formal Labor Compliance Record</p>
              </div>
              <button 
                onClick={() => setShowAddModal(false)} 
                className="w-10 h-10 flex items-center justify-center hover:bg-white rounded-xl text-slate-400 hover:text-slate-600 transition-all ring-1 ring-slate-200 shadow-sm relative z-10"
              >
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>
            
            <form className="p-8 space-y-6" onSubmit={(e) => { e.preventDefault(); setShowAddModal(false); }}>
              <div className="grid grid-cols-2 gap-6">
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Subject Employee</label>
                  <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-rose-500/10 transition-all">
                    <option>Select Employee...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Severity Level</label>
                  <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-rose-500/10 transition-all text-rose-600">
                    <option>Verbal Warning</option>
                    <option>Written Warning</option>
                    <option>Final Warning</option>
                    <option>Suspension</option>
                  </select>
                </div>
              </div>

              <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Incident Description</label>
                <textarea 
                  rows={3}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:ring-4 focus:ring-rose-500/10 transition-all"
                  placeholder="Detail the infraction strictly..."
                />
              </div>

              <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Direct Remedial Action</label>
                <input 
                  type="text"
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-rose-500/10 transition-all"
                  placeholder="e.g. 10% Attendance Penalty applied"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Filed Date</label>
                  <input type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-rose-500/10 transition-all" />
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Expiration (PIP End)</label>
                  <input type="date" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-rose-500/10 transition-all" />
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-4 bg-slate-50 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-rose-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-rose-700 shadow-xl shadow-rose-200 transition-all active:scale-[0.98]">Confirm & File</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
