import React, { useState } from 'react';
import Layout from '../layouts/Layout';
import Header from '../components/Header';

const POLICIES = [
  { id: 1, title: 'Code of Conduct', category: 'General', updatedAt: '2026-01-15', icon: 'gavel' },
  { id: 2, title: 'Leave & Holidays Policy', category: 'Leave', updatedAt: '2026-02-01', icon: 'event_available' },
  { id: 3, title: 'Overtime & TOIL Guidelines', category: 'Attendance', updatedAt: '2026-02-10', icon: 'more_time' },
  { id: 4, title: 'Remote Work Policy', category: 'General', updatedAt: '2025-11-20', icon: 'home_work' },
  { id: 5, title: 'IT & Security Guidelines', category: 'IT', updatedAt: '2026-03-05', icon: 'security' },
  { id: 6, title: 'Anti-Harassment Policy', category: 'Legal', updatedAt: '2025-10-01', icon: 'policy' },
  { id: 7, title: 'Expense Reimbursement Policy', category: 'Finance', updatedAt: '2026-01-20', icon: 'receipt_long' },
  { id: 8, title: 'Performance Review Cycle', category: 'HR', updatedAt: '2026-04-01', icon: 'trending_up' },
];

export default function Handbook() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', ...new Set(POLICIES.map(p => p.category))];

  const filteredPolicies = POLICIES.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <Layout activeTab="Handbook">
      <div className="min-h-screen">
        <Header 
          title="Employee Handbook & Policies" 
          subtitle="Company guidelines, policies, and resources" 
        />

        <div className="px-8 py-8 space-y-6">
          
          {/* Search & Filter */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="relative w-full md:w-96">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              <input 
                type="text" 
                placeholder="Search policies..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-300 outline-none"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 w-full md:w-auto">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Policies Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPolicies.map(policy => (
              <div key={policy.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all group cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div className="size-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-100 transition-all">
                    <span className="material-symbols-outlined text-[24px]">{policy.icon}</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">v1.0</span>
                </div>
                <h3 className="font-bold text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">{policy.title}</h3>
                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-100">
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">{policy.category}</span>
                  <span className="text-xs text-slate-400 ml-auto">Updated: {policy.updatedAt}</span>
                </div>
              </div>
            ))}
          </div>

          {filteredPolicies.length === 0 && (
            <div className="text-center py-20">
              <div className="size-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                <span className="material-symbols-outlined text-[32px]">search_off</span>
              </div>
              <p className="text-slate-500">No policies found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
