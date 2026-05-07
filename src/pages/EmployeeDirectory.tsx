import React, { useState, useMemo } from 'react';
import Layout from '../layouts/Layout';
import Header from '../components/Header';
import { useAppData } from '../context/AppDataContext';

const LOGGED_IN_EMP_ID = 'EMP-001';

export default function EmployeeDirectory() {
  const { employees } = useAppData();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const departments = ['All', ...new Set(employees.map(e => e.department).filter(Boolean))];

  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      const matchesSearch = 
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.email && e.email.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesDept = selectedDept === 'All' || e.department === selectedDept;
      return matchesSearch && matchesDept;
    });
  }, [employees, searchQuery, selectedDept]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-emerald-500';
      case 'On Leave': return 'bg-amber-500';
      case 'Remote': return 'bg-blue-500';
      default: return 'bg-slate-400';
    }
  };

  return (
    <Layout activeTab="Employee Directory">
      <div className="min-h-screen">
        <Header 
          title="Employee Directory" 
          subtitle="Find colleagues and view organizational structure" 
        />

        <div className="px-8 py-8 space-y-6">
          
          {/* Search & Filter */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="relative w-full md:w-96">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              <input 
                type="text" 
                placeholder="Search by name, role, or email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-300 outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <select 
                value={selectedDept}
                onChange={e => setSelectedDept(e.target.value)}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-300 outline-none cursor-pointer"
              >
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              <div className="flex bg-slate-100 rounded-lg p-1">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md cursor-pointer transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <span className="material-symbols-outlined text-[20px]">grid_view</span>
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md cursor-pointer transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <span className="material-symbols-outlined text-[20px]">view_list</span>
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span className="font-bold text-slate-900">{filteredEmployees.length}</span> employees found
          </div>

          {/* Grid/List View */}
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-20">
              <div className="size-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                <span className="material-symbols-outlined text-[32px]">person_search</span>
              </div>
              <p className="text-slate-500">No employees found matching your criteria.</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredEmployees.map(emp => (
                <div key={emp.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all group cursor-pointer">
                  <div className="flex items-start justify-between mb-4">
                    <div className="relative">
                      <div className="size-14 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
                        {getInitials(emp.name)}
                      </div>
                      <div className={`absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-white ${getStatusColor(emp.status)}`} />
                    </div>
                    <button className="text-slate-400 hover:text-indigo-600 cursor-pointer">
                      <span className="material-symbols-outlined">more_vert</span>
                    </button>
                  </div>
                  <h3 className="font-bold text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">{emp.name}</h3>
                  <p className="text-sm text-slate-500 font-medium mb-3">{emp.role}</p>
                  
                  <div className="space-y-2 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="material-symbols-outlined text-[16px]">business</span>
                      {emp.department || 'N/A'}
                    </div>
                    {emp.email && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="material-symbols-outlined text-[16px]">email</span>
                        {emp.email}
                      </div>
                    )}
                    {emp.phone && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="material-symbols-outlined text-[16px]">phone</span>
                        {emp.phone}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-6 py-3 font-bold">Employee</th>
                    <th className="px-6 py-3 font-bold">Role</th>
                    <th className="px-6 py-3 font-bold">Department</th>
                    <th className="px-6 py-3 font-bold">Email</th>
                    <th className="px-6 py-3 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.map(emp => (
                    <tr key={emp.id} className="hover:bg-slate-50 cursor-pointer">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="size-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                              {getInitials(emp.name)}
                            </div>
                            <div className={`absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-white ${getStatusColor(emp.status)}`} />
                          </div>
                          <span className="font-bold text-slate-900">{emp.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{emp.role}</td>
                      <td className="px-6 py-4 text-slate-600">{emp.department || 'N/A'}</td>
                      <td className="px-6 py-4 text-slate-600">{emp.email || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${
                          emp.status === 'Active' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                          emp.status === 'On Leave' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                          'bg-slate-50 border-slate-200 text-slate-600'
                        }`}>
                          {emp.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
