import React, { useState } from 'react';
import Layout from '../layouts/Layout';
import Header from '../components/Header';
import { useAppData } from '../context/AppDataContext';

export default function LaborContracts() {
  const { laborContracts, employees, addLaborContract } = useAppData();
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Stats calculation
  const stats = {
    total: laborContracts.length,
    active: laborContracts.filter(c => c.status === 'Active').length,
    expiring: laborContracts.filter(c => c.status === 'Expiring Soon').length,
    expired: laborContracts.filter(c => c.status === 'Expired').length
  };

  const filteredContracts = laborContracts.filter(contract => {
    const matchesTab = activeTab === 'All' || contract.status === activeTab;
    const matchesSearch = contract.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         contract.dept.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'Expiring': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'Action Required': return 'bg-rose-50 text-rose-600 border-rose-100';
      default: return 'bg-slate-50 text-slate-400 border-slate-100';
    }
  };

  const handleDownloadContract = (contract: typeof laborContracts[0]) => {
    // 1. Prepare Content
    const timestamp = new Date().toLocaleString();
    
    // 2. Simple Deterministic Verification Hash (Mock HMAC)
    const rawString = `${contract.id}|${contract.employeeName}|${contract.startDate}|${contract.salary}`;
    const mockHash = Array.from(rawString).reduce((h, c) => (Math.imul(31, h) + c.charCodeAt(0)) | 0, 0).toString(16).toUpperCase();

    const content = `
=========================================
OFFICIAL LABOR CONTRACT: TECHDANCE HR
=========================================
Employee: ${contract.employeeName}
Department: ${contract.dept}
Role: ${contract.role || 'Personnel'}
Contract Type: ${contract.type}
Start Date: ${contract.startDate}
End Date: ${contract.endDate || 'N/A (Indefinite)'}
Salary: ${contract.salary.toLocaleString()} MMK
Status: ${contract.status}
Signed Date: ${contract.signedDate}
-----------------------------------------
SYSTEM METADATA (FOR AUDIT)
-----------------------------------------
Generation ID: CNTR-${contract.id.split('-').pop()}
Timestamp: ${timestamp}
Verification Hash: [SECURE-${mockHash}]
-----------------------------------------
This document is a system-generated representation of the original 
scanned contract stored in the HRMS Secure Vault. Any alteration to 
the text or verification hash renders this copy invalid for legal 
or regulatory proceedings in Sector C.
=========================================
    `.trim();

    // 3. Trigger Download
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Contract_${contract.employeeName.replace(/\s+/g, '_')}_${contract.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout activeTab="Labor Contracts (EC)">
      <div className="min-h-screen">
        <Header 
          title="Labor Contracts (EC)" 
          subtitle="Manage employee agreements and Ministry of Labor compliance" 
        />

        <div className="px-8 py-8 space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <span className="material-symbols-outlined text-[28px]">description</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Total Contracts</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <span className="material-symbols-outlined text-[28px]">check_circle</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Active</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.active}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md border-l-4 border-l-amber-400">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                  <span className="material-symbols-outlined text-[28px]">schedule</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Expiring Soon</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.expiring}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md border-l-4 border-l-rose-400">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                  <span className="material-symbols-outlined text-[28px]">warning</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Expired</p>
                  <p className="text-2xl font-bold text-slate-900 text-rose-600">{stats.expired}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Controls */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-8">
            <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
              <div className="flex items-center gap-1 p-1 bg-white rounded-xl border border-slate-200 w-fit">
                {['All', 'Active', 'Expiring Soon', 'Expired'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === tab
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50'
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
                    placeholder="Search employee..."
                    className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all w-64"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm hover:shadow-md flex items-center gap-2 active:scale-95"
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                  New Contract
                </button>
              </div>
            </div>

            {/* Contracts Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contract Type</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Duration</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Signed Date</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredContracts.length > 0 ? (
                    filteredContracts.map((contract) => (
                      <tr key={contract.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#F7F7FE] flex items-center justify-center text-[#6567F1] font-bold border border-indigo-100">
                              {contract.employeeName.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                               <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-all">{contract.employeeName}</p>
                               <p className="text-xs text-slate-500">{contract.dept}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-700">{contract.type}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-slate-600">
                            <span className="material-symbols-outlined text-[16px] text-slate-400">calendar_today</span>
                            <span>
                              {new Date(contract.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                              {' → '}
                              {contract.endDate 
                                ? new Date(contract.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                                : 'Infinity'
                              }
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {new Date(contract.signedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-4">
                           <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border uppercase tracking-widest shadow-sm ${getStatusStyles(contract.status)}`}>
                            {contract.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                            <button 
                              onClick={() => handleDownloadContract(contract)}
                              className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 text-slate-500 hover:text-indigo-600 transition-all font-black text-xs flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[20px]">download</span>
                              DL
                            </button>
                            <button className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 text-slate-500 hover:text-indigo-600 transition-all">
                              <span className="material-symbols-outlined text-[20px]">open_in_new</span>
                            </button>
                            <button className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 text-slate-500 hover:text-rose-600 transition-all">
                              <span className="material-symbols-outlined text-[20px]">more_vert</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                        <span className="material-symbols-outlined text-5xl opacity-20 block mb-2">find_in_page</span>
                        <p className="font-semibold italic">No contract records found matching current criteria.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Contract Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight">New Labor Contract</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Official EC Registration Form</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>
            
            <form className="p-6 space-y-5" onSubmit={(e) => { e.preventDefault(); setShowAddModal(false); }}>
              <div>
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block mb-1.5">Employee Search</label>
                <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all">
                  <option>Select target employee...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block mb-1.5">Contract Type</label>
                   <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all">
                    <option>Probation</option>
                    <option>Fixed Term</option>
                    <option>Open Ended</option>
                  </select>
                </div>
                <div>
                   <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block mb-1.5">Ministry Sign Date</label>
                   <input type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block mb-1.5">Activation Date</label>
                   <input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block mb-1.5">End Date (Term)</label>
                  <input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" />
                </div>
              </div>

              <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex items-start gap-3">
                 <span className="material-symbols-outlined text-[#4F46E5] text-[20px]">security</span>
                 <p className="text-[10px] font-bold text-slate-700 leading-relaxed uppercase tracking-widest">Generating this record will automatically archive the legacy contract for this employee and dispatch a copy to the Ministry Archive.</p>
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 border border-slate-200 transition-all uppercase tracking-widest">Discard</button>
                <button type="submit" className="flex-1 py-3.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-md transition-all active:scale-[0.98] uppercase tracking-widest">Save Contract</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
