import React, { useState, useMemo } from 'react';
import Layout from '../layouts/Layout';
import Header from '../components/Header';
import { useAppData } from '../context/AppDataContext';

const REPORTS = [
  { id: 'headcount', name: 'Headcount & Demographics', desc: 'Active employees by dept, role, location', icon: 'group' },
  { id: 'turnover', name: 'Turnover & Attrition', desc: 'Joiners, leavers, turnover rate', icon: 'trending_down' },
  { id: 'attendance', name: 'Attendance Summary', desc: 'Present, absent, late by period', icon: 'schedule' },
  { id: 'overtime', name: 'Overtime Analysis', desc: 'OT hours, costs, by dept', icon: 'more_time' },
  { id: 'payroll', name: 'Payroll Cost Report', desc: 'Salary, allowances, deductions', icon: 'payments' },
  { id: 'leave', name: 'Leave Balance & Usage', desc: 'Leave taken, remaining by type', icon: 'event_available' },
];

const SCHEDULED_REPORTS = [
  { id: 1, name: 'Monthly Payroll Export', frequency: 'Monthly', nextRun: 'May 01, 2026', recipients: 'hr@techdance.com' },
  { id: 2, name: 'Weekly Attendance Summary', frequency: 'Weekly', nextRun: 'May 04, 2026', recipients: 'manager@techdance.com' },
];

export default function Reports() {
  const { employees, leaveRequests, otRequests, attendanceLogs } = useAppData();
  const [activeTab, setActiveTab] = useState('Library');
  const [selectedReport, setSelectedReport] = useState(null);
  const [dateRange, setDateRange] = useState('this-month');
  const [isGenerating, setIsGenerating] = useState(false);

  // Mock Data Calculations
  const stats = useMemo(() => {
    const totalEmp = employees.length;
    const activeEmp = employees.filter(e => e.status === 'Active').length;
    const deptCount = [...new Set(employees.map(e => e.dept))].length;
    
    // Turnover (mock)
    const turnoverRate = 2.5; // %
    
    return { totalEmp, activeEmp, deptCount, turnoverRate };
  }, [employees]);

  const handleGenerate = (reportId) => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      alert(`Report "${reportId}" generated successfully! (Download started)`);
    }, 1500);
  };

  return (
    <Layout activeTab="Reports">
      <div className="min-h-screen">
        <Header 
          title="Reports & Export Center" 
          subtitle="Generate, schedule, and export HR analytics" 
        />

        <div className="px-8 py-8 space-y-8">
          
          {/* Tabs */}
          <div className="flex gap-4 border-b border-slate-200">
            {['Library', 'Scheduled', 'Custom Builder'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 px-1 text-sm font-bold border-b-2 transition-all cursor-pointer ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'Library' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {REPORTS.map(report => (
                <div key={report.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="size-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <span className="material-symbols-outlined text-[24px]">{report.icon}</span>
                    </div>
                    <button 
                      onClick={() => handleGenerate(report.id)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                    >
                      Generate
                    </button>
                  </div>
                  <h3 className="font-bold text-slate-900 mb-1">{report.name}</h3>
                  <p className="text-xs text-slate-500">{report.desc}</p>
                  
                  {/* Quick Stats Preview */}
                  <div className="mt-4 pt-4 border-t border-slate-100">
                     <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Format</span>
                        <span className="font-bold text-slate-700">CSV / PDF</span>
                     </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'Scheduled' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900">Scheduled Reports</h3>
                <button className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 cursor-pointer">
                  + New Schedule
                </button>
              </div>
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-6 py-3 font-bold">Report Name</th>
                    <th className="px-6 py-3 font-bold">Frequency</th>
                    <th className="px-6 py-3 font-bold">Next Run</th>
                    <th className="px-6 py-3 font-bold">Recipients</th>
                    <th className="px-6 py-3 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {SCHEDULED_REPORTS.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-bold text-slate-900">{item.name}</td>
                      <td className="px-6 py-4 text-slate-600">{item.frequency}</td>
                      <td className="px-6 py-4 text-slate-600">{item.nextRun}</td>
                      <td className="px-6 py-4 text-slate-500 text-xs">{item.recipients}</td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-slate-400 hover:text-indigo-600 mr-3 cursor-pointer"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                        <button className="text-slate-400 hover:text-red-600 cursor-pointer"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'Custom Builder' && (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center py-20">
              <div className="size-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                <span className="material-symbols-outlined text-[32px]">construction</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Custom Report Builder</h3>
              <p className="text-slate-500 max-w-md mx-auto mb-6">
                Drag and drop fields to create custom reports tailored to your specific needs.
              </p>
              <button className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 cursor-pointer">
                Start Building (Coming Soon)
              </button>
            </div>
          )}

        </div>
      </div>
    </Layout>
  );
}
