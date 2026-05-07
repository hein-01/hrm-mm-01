import React, { useState, useMemo } from 'react';
import Layout from '../layouts/Layout';
import Header from '../components/Header';
import { useAppData } from '../context/AppDataContext';

const LOGGED_IN_EMP_ID = 'EMP-001';

export default function MyAssets() {
  const { assets, employees } = useAppData();
  const currentEmployee = employees.find(e => e.id === LOGGED_IN_EMP_ID);

  // Filter assets assigned to current user
  const myAssets = useMemo(() => {
    return assets.filter(a => a.assigneeId === LOGGED_IN_EMP_ID);
  }, [assets, LOGGED_IN_EMP_ID]);

  // Calculate total value
  const totalValue = useMemo(() => {
    return myAssets.reduce((sum, a) => sum + (a.purchaseValue || a.value || 0), 0);
  }, [myAssets]);

  return (
    <Layout activeTab="My Assets">
      <div className="min-h-screen">
        <Header 
          title="My Assets" 
          subtitle="Company-issued equipment and devices" 
        />

        <div className="px-8 py-8 space-y-6">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="size-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <span className="material-symbols-outlined text-[24px]">devices</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{myAssets.length}</p>
                <p className="text-xs text-slate-500 font-medium">Total Assets</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="size-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <span className="material-symbols-outlined text-[24px]">check_circle</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{myAssets.filter(a => a.status === 'In Use').length}</p>
                <p className="text-xs text-slate-500 font-medium">Active</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="size-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                <span className="material-symbols-outlined text-[24px]">account_balance</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MMK', maximumSignificantDigits: 3 }).format(totalValue)}</p>
                <p className="text-xs text-slate-500 font-medium">Total Value</p>
              </div>
            </div>
          </div>

          {/* Assets List */}
          {myAssets.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <div className="size-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                <span className="material-symbols-outlined text-[32px]">inventory_2</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">No Assets Assigned</h3>
              <p className="text-slate-500 max-w-md mx-auto">
                You currently have no company-issued assets. If you believe this is an error, please contact IT or HR.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-6 py-3 font-bold">Asset Details</th>
                    <th className="px-6 py-3 font-bold">Category</th>
                    <th className="px-6 py-3 font-bold">Serial Number</th>
                    <th className="px-6 py-3 font-bold">Status</th>
                    <th className="px-6 py-3 font-bold text-right">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myAssets.map(asset => (
                    <tr key={asset.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                            <span className="material-symbols-outlined text-[20px]">
                              {asset.category === 'IT Equipment' ? 'laptop' : 
                               asset.category === 'Mobile' ? 'smartphone' : 'devices_other'}
                            </span>
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{asset.model}</p>
                            <p className="text-xs text-slate-400">{asset.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs font-bold">{asset.category}</span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">{asset.serialNumber || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          asset.status === 'In Use' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                          asset.status === 'Maintenance' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                          'bg-slate-100 border-slate-200 text-slate-600'
                        }`}>
                          {asset.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-700">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MMK', maximumSignificantDigits: 3 }).format(asset.purchaseValue || asset.value || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Help Text */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <span className="material-symbols-outlined text-blue-600">info</span>
            <div>
              <p className="text-sm font-bold text-blue-900">Need to report an issue?</p>
              <p className="text-xs text-blue-700 mt-1">
                If your device is damaged, lost, or stolen, please submit a ticket via the <a href="/tickets" className="underline font-bold">Help Desk</a> immediately.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
