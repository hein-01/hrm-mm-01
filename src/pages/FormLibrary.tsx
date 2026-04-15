import React, { useState } from 'react';
import Layout from '../layouts/Layout';
import Header from '../components/Header';
import { useAppData } from '../context/AppDataContext';

export default function FormLibrary() {
  const { formTemplates } = useAppData();
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const categories = ['All', 'HR', 'Payroll', 'Legal', 'Admin'];

  const filteredForms = formTemplates.filter(form => {
    const matchesCategory = activeCategory === 'All' || form.category === activeCategory;
    const matchesSearch = form.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         form.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'HR': return 'person';
      case 'Payroll': return 'payments';
      case 'Legal': return 'gavel';
      case 'Admin': return 'business';
      default: return 'description';
    }
  };

  const getCategoryStyles = (category: string) => {
    switch (category) {
      case 'HR': return 'bg-indigo-50 text-indigo-700';
      case 'Payroll': return 'bg-emerald-50 text-emerald-700';
      case 'Legal': return 'bg-rose-50 text-rose-700';
      case 'Admin': return 'bg-slate-100 text-slate-700';
      default: return 'bg-slate-50 text-slate-600';
    }
  };

  return (
    <Layout activeTab="Forms Library">
      <div className="min-h-screen">
        <Header 
          title="Forms Library" 
          subtitle="Access and download official HR templates, legal forms, and compliance documents" 
        />

        <div className="px-8 py-8 space-y-8">
          {/* Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 p-1 bg-white rounded-2xl border border-slate-200 shadow-sm w-fit">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                    activeCategory === cat
                      ? 'bg-[#4F46E5] text-white shadow-lg shadow-indigo-200'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
                <input
                  type="text"
                  placeholder="Search templates..."
                  className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all w-64 shadow-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button 
                onClick={() => setShowAddModal(true)}
                className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm active:scale-95 group"
              >
                <span className="material-symbols-outlined group-hover:rotate-90 transition-transform">add</span>
              </button>
            </div>
          </div>

          {/* Forms Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredForms.length > 0 ? (
              filteredForms.map((form) => (
                <div key={form.id} className="bg-white rounded-[24px] border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group overflow-hidden flex flex-col">
                  <div className="p-8 space-y-4 flex-grow relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 opacity-[0.03] text-[120px] text-slate-900 pointer-events-none group-hover:opacity-[0.06] transition-opacity">
                      <span className="material-symbols-outlined text-inherit">{getCategoryIcon(form.category)}</span>
                    </div>

                    <div className="flex items-start justify-between relative z-10">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${getCategoryStyles(form.category)}`}>
                        <span className="material-symbols-outlined text-[24px]">{getCategoryIcon(form.category)}</span>
                      </div>
                      {form.isMandatory && (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black border border-rose-100 shadow-sm uppercase tracking-widest">
                           <span className="material-symbols-outlined text-[14px]">info</span>
                          Required
                        </div>
                      )}
                    </div>

                    <div className="relative z-10">
                      <h3 className="text-lg font-black text-slate-900 group-hover:text-[#4F46E5] transition-colors leading-tight">{form.title}</h3>
                      <p className="text-xs text-slate-500 mt-3 line-clamp-2 leading-relaxed font-bold italic">{form.description}</p>
                    </div>
                  </div>

                  <div className="px-8 py-5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between gap-4">
                    <button className="flex items-center gap-2 text-slate-400 hover:text-[#4F46E5] text-[11px] font-black uppercase tracking-widest transition-all">
                      <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                      Preview
                    </button>
                    <button className="flex items-center gap-2 bg-white border border-slate-200 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-700 hover:bg-[#4F46E5] hover:text-white hover:border-[#4F46E5] transition-all shadow-sm active:scale-[0.98]">
                      <span className="material-symbols-outlined text-[18px]">download</span>
                      Download
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-24 bg-white rounded-[32px] border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-300 gap-4">
                <span className="material-symbols-outlined text-7xl opacity-20">find_in_page</span>
                <div className="text-center">
                  <p className="font-black text-slate-400 uppercase tracking-widest">No matching templates</p>
                  <p className="text-xs text-slate-400 mt-1 font-bold italic">Adjust search or filtering parameters</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden animate-in zoom-in duration-300">
             <div className="p-8 border-b border-slate-100 bg-gradient-to-br from-indigo-50/50 to-white flex items-center justify-between relative overflow-hidden">
               <div className="absolute -right-4 top-0 opacity-[0.03] text-[120px] text-indigo-900 pointer-events-none">
                 <span className="material-symbols-outlined text-inherit">upload_file</span>
               </div>
              <div className="relative z-10">
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Add Template</h3>
                <p className="text-xs text-indigo-600 font-bold uppercase tracking-widest mt-1">Publish to Company Library</p>
              </div>
              <button 
                onClick={() => setShowAddModal(false)} 
                className="w-10 h-10 flex items-center justify-center hover:bg-white rounded-xl text-slate-400 hover:text-slate-600 transition-all ring-1 ring-slate-200 shadow-sm relative z-10"
              >
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>
            
            <form className="p-8 space-y-6" onSubmit={(e) => { e.preventDefault(); setShowAddModal(false); }}>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Document Title</label>
                  <input type="text" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold placeholder:italic outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" placeholder="e.g. Standard NDA 2024" />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Category</label>
                    <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all">
                      <option>HR</option>
                      <option>Payroll</option>
                      <option>Legal</option>
                      <option>Admin</option>
                    </select>
                  </div>
                  <div>
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Settings</label>
                     <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl h-[54px] cursor-pointer hover:bg-slate-100 transition-colors">
                       <input type="checkbox" className="w-5 h-5 accent-[#4F46E5] cursor-pointer rounded-lg" id="is-mandatory" />
                       <label htmlFor="is-mandatory" className="text-xs font-black text-slate-700 uppercase tracking-tight cursor-pointer">Mandatory</label>
                     </div>
                  </div>
                </div>

                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Description</label>
                  <textarea rows={2} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold placeholder:italic outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" placeholder="Brief context for users..." />
                </div>

                <div className="border-2 border-dashed border-slate-200 rounded-[24px] p-8 text-center hover:bg-indigo-50/30 hover:border-indigo-200 transition-all cursor-pointer group">
                  <span className="material-symbols-outlined text-4xl text-slate-300 group-hover:text-indigo-400 transition-colors">upload_file</span>
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest mt-2">Select Template File</p>
                  <p className="text-[10px] text-slate-400 font-bold italic mt-1">PDF, DOCX, or XLSX (Max 10MB)</p>
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-4 bg-slate-50 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-100 transition-all">Discard</button>
                <button type="submit" className="flex-1 py-4 bg-[#4F46E5] text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-[#4338CA] shadow-xl shadow-indigo-200 transition-all active:scale-[0.98]">Publish Template</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
