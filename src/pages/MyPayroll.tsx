import React, { useState, useMemo } from 'react';
import Layout from '../layouts/Layout';
import Header from '../components/Header';
import { useAppData } from '../context/AppDataContext';

const LOGGED_IN_EMP_ID = 'EMP-001';

export default function MyPayroll() {
  const { employees } = useAppData();
  const emp = employees.find(e => e.id === LOGGED_IN_EMP_ID);
  
  const [selectedMonth, setSelectedMonth] = useState('April 2026');

  // Mock payroll data
  const payrollData = {
    basicSalary: 1500000,
    allowances: 250000,
    overtime: 150000,
    grossPay: 1900000,
    deductions: {
      tax: 150000,
      ssb: 20000,
      other: 10000,
    },
    netPay: 1720000,
  };

  const ytdEarnings = useMemo(() => {
    return [
      { month: 'Jan', amount: 1720000 },
      { month: 'Feb', amount: 1720000 },
      { month: 'Mar', amount: 1720000 },
      { month: 'Apr', amount: 1720000 },
    ];
  }, []);

  const totalYTD = ytdEarnings.reduce((sum, m) => sum + m.amount, 0);

  return (
    <Layout activeTab="My Payroll">
      <div className="min-h-screen">
        <Header 
          title="My Payroll" 
          subtitle="Salary details, deductions, and earnings" 
        />

        <div className="px-8 py-8 space-y-6">
          
          {/* Month Selector */}
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-lg">Salary Slip</h3>
            <select 
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-300 outline-none cursor-pointer"
            >
              <option>April 2026</option>
              <option>March 2026</option>
              <option>February 2026</option>
              <option>January 2026</option>
            </select>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="bg-indigo-600 p-6 text-white">
              <p className="text-indigo-200 text-sm font-medium mb-1">Net Pay for {selectedMonth}</p>
              <p className="text-4xl font-bold">{new Intl.NumberFormat('en-MM', { style: 'currency', currency: 'MMK' }).format(payrollData.netPay)}</p>
              <div className="flex gap-4 mt-4">
                <div>
                  <p className="text-indigo-200 text-xs">Gross Pay</p>
                  <p className="font-bold">{new Intl.NumberFormat('en-MM', { style: 'currency', currency: 'MMK', maximumSignificantDigits: 3 }).format(payrollData.grossPay)}</p>
                </div>
                <div>
                  <p className="text-indigo-200 text-xs">Total Deductions</p>
                  <p className="font-bold">{new Intl.NumberFormat('en-MM', { style: 'currency', currency: 'MMK', maximumSignificantDigits: 3 }).format(payrollData.deductions.tax + payrollData.deductions.ssb + payrollData.deductions.other)}</p>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="p-6 space-y-6">
              {/* Earnings */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 tracking-wider">Earnings</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-700">Basic Salary</span>
                    <span className="font-bold text-slate-900">{new Intl.NumberFormat('en-MM', { style: 'currency', currency: 'MMK', maximumSignificantDigits: 3 }).format(payrollData.basicSalary)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-700">Allowances</span>
                    <span className="font-bold text-slate-900">{new Intl.NumberFormat('en-MM', { style: 'currency', currency: 'MMK', maximumSignificantDigits: 3 }).format(payrollData.allowances)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-700">Overtime</span>
                    <span className="font-bold text-slate-900">{new Intl.NumberFormat('en-MM', { style: 'currency', currency: 'MMK', maximumSignificantDigits: 3 }).format(payrollData.overtime)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                    <span className="font-bold text-slate-900">Total Earnings</span>
                    <span className="font-bold text-emerald-600">{new Intl.NumberFormat('en-MM', { style: 'currency', currency: 'MMK', maximumSignificantDigits: 3 }).format(payrollData.grossPay)}</span>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 tracking-wider">Deductions</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-700">Income Tax</span>
                    <span className="font-bold text-slate-900">-{new Intl.NumberFormat('en-MM', { style: 'currency', currency: 'MMK', maximumSignificantDigits: 3 }).format(payrollData.deductions.tax)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-700">SSB Contribution</span>
                    <span className="font-bold text-slate-900">-{new Intl.NumberFormat('en-MM', { style: 'currency', currency: 'MMK', maximumSignificantDigits: 3 }).format(payrollData.deductions.ssb)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-700">Other Deductions</span>
                    <span className="font-bold text-slate-900">-{new Intl.NumberFormat('en-MM', { style: 'currency', currency: 'MMK', maximumSignificantDigits: 3 }).format(payrollData.deductions.other)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                    <span className="font-bold text-slate-900">Total Deductions</span>
                    <span className="font-bold text-rose-600">-{new Intl.NumberFormat('en-MM', { style: 'currency', currency: 'MMK', maximumSignificantDigits: 3 }).format(payrollData.deductions.tax + payrollData.deductions.ssb + payrollData.deductions.other)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* YTD Summary */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-bold text-slate-900 mb-4">Year-to-Date Earnings</h3>
            <div className="flex items-end gap-2 h-32">
              {ytdEarnings.map((m, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div 
                    className="w-full bg-indigo-100 rounded-t-lg relative group"
                    style={{ height: `${(m.amount / 2000000) * 100}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {new Intl.NumberFormat('en-MM', { style: 'currency', currency: 'MMK', maximumSignificantDigits: 3 }).format(m.amount)}
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">{m.month}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
              <span className="font-bold text-slate-700">Total YTD</span>
              <span className="font-bold text-indigo-600 text-lg">{new Intl.NumberFormat('en-MM', { style: 'currency', currency: 'MMK', maximumSignificantDigits: 3 }).format(totalYTD)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[20px]">download</span>
              Download PDF
            </button>
            <button className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm shadow-indigo-200">
              <span className="material-symbols-outlined text-[20px]">print</span>
              Print Slip
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
