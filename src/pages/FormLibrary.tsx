import React, { useState, useMemo } from 'react';
import { TableVirtuoso } from 'react-virtuoso';
import Layout from '../layouts/Layout';
import Header from '../components/Header';
import { useAppData } from '../context/AppDataContext';
import { useUserAccess } from '../context/UserAccessProvider';
import { ArchivedDocument } from '../types/hrms.types';

const CATEGORIES = ['All', 'Government Filing', 'Employment Contract', 'Disciplinary Record', 'Payroll Summary', 'HR Template', 'Internal Memo'] as const;

const INITIAL_ADD_FORM = {
  title: '',
  category: 'HR Template' as ArchivedDocument['category'],
  sourceModule: 'Manual' as ArchivedDocument['sourceModule'],
  description: '',
  period: new Date().getFullYear().toString(),
  fileContent: '',
  fileName: '',
  isMandatory: false,
};

export default function FormLibrary() {
  const { archivedDocuments, addDocumentToLibrary, deleteArchivedDocument, systemSettings } = useAppData();
  const { currentUser, isAdmin } = useUserAccess();
  const adminId = currentUser?.id ?? 'EMP-001';

  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<ArchivedDocument | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<ArchivedDocument | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [formState, setFormState] = useState(INITIAL_ADD_FORM);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [verifiedIds, setVerifiedIds] = useState<Record<string, 'pass' | 'fail'>>({});

  // — Deep search across 7 fields
  const filteredDocs = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return archivedDocuments.filter(doc => {
      const matchesCat = activeCategory === 'All' || doc.category === activeCategory;
      const matchesSearch =
        doc.title.toLowerCase().includes(q) ||
        doc.id.toLowerCase().includes(q) ||
        doc.category.toLowerCase().includes(q) ||
        doc.sourceModule.toLowerCase().includes(q) ||
        doc.period.toLowerCase().includes(q) ||
        doc.generatedBy.toLowerCase().includes(q) ||
        doc.description.toLowerCase().includes(q) ||
        (doc.relatedRecordId?.toLowerCase().includes(q) ?? false);
      return matchesCat && matchesSearch;
    });
  }, [archivedDocuments, activeCategory, searchQuery]);

  // — KPI stats
  const stats = useMemo(() => ({
    total: archivedDocuments.length,
    government: archivedDocuments.filter(d => d.category === 'Government Filing').length,
    contracts: archivedDocuments.filter(d => d.category === 'Employment Contract').length,
    disciplinary: archivedDocuments.filter(d => d.category === 'Disciplinary Record').length,
  }), [archivedDocuments]);

  // — Hash verification
  const computeHash = (raw: string): string =>
    Array.from(raw).reduce((hash, char) => (Math.imul(31, hash) + char.charCodeAt(0)) | 0, 0).toString(16).toUpperCase();

  const handleVerify = (doc: ArchivedDocument) => {
    const recomputed = computeHash(`${doc.id}|${doc.title}|${doc.sourceModule}|${doc.period}|${doc.generatedAt}`);
    setVerifiedIds(prev => ({ ...prev, [doc.id]: recomputed === doc.checksum ? 'pass' : 'fail' }));
  };

  // — Download
  const handleDownload = (doc: ArchivedDocument) => {
    const blob = new Blob([doc.fileContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.fileName || `${doc.title.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // — Delete
  const handleDelete = () => {
    if (!deleteDoc) return;
    if (!deleteReason.trim()) { setDeleteError('Deletion reason is mandatory for regulatory compliance.'); return; }
    const result = deleteArchivedDocument(deleteDoc.id, adminId, deleteReason);
    if (!result.success) { setDeleteError(result.message); return; }
    setDeleteDoc(null); setDeleteReason(''); setDeleteError('');
  };

  // — Add form
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(''); setFormSuccess('');
    if (!formState.title.trim()) { setFormError('Document title is required.'); return; }
    if (!formState.fileContent.trim()) { setFormError('Document content is required.'); return; }
    const result = addDocumentToLibrary({
      title: formState.title.trim(),
      category: formState.category,
      sourceModule: formState.sourceModule,
      description: formState.description.trim(),
      period: formState.period,
      generatedBy: adminId,
      fileContent: formState.fileContent,
      fileName: formState.fileName || `${formState.title.replace(/\s+/g, '_')}.txt`,
      isMandatory: formState.isMandatory,
      relatedRecordId: null,
    }, adminId);
    if (!result.success) { setFormError(result.message); return; }
    setFormSuccess('Document archived successfully.');
    setTimeout(() => { setShowAddModal(false); setFormState(INITIAL_ADD_FORM); setFormSuccess(''); }, 1500);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Government Filing': return 'account_balance';
      case 'Employment Contract': return 'handshake';
      case 'Disciplinary Record': return 'gavel';
      case 'Payroll Summary': return 'payments';
      case 'HR Template': return 'description';
      case 'Internal Memo': return 'sticky_note_2';
      default: return 'folder';
    }
  };

  const getCategoryStyle = (category: string) => {
    switch (category) {
      case 'Government Filing': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Employment Contract': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Disciplinary Record': return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'Payroll Summary': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'HR Template': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      case 'Internal Memo': return 'bg-slate-100 text-slate-600 border-slate-200';
      default: return 'bg-slate-50 text-slate-500 border-slate-200';
    }
  };

  return (
    <Layout activeTab="Forms Library">
      <div className="min-h-screen">
        <Header
          title="Forms Library"
          subtitle="Secure document archive — Tamper-evident records from all HRMS modules"
        />

        <div className="px-8 py-8 space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total Archived', value: stats.total, icon: 'inventory_2', color: 'bg-indigo-500' },
              { label: 'Government Filings', value: stats.government, icon: 'account_balance', color: 'bg-blue-500' },
              { label: 'Employment Contracts', value: stats.contracts, icon: 'handshake', color: 'bg-emerald-500' },
              { label: 'Disciplinary Records', value: stats.disciplinary, icon: 'gavel', color: 'bg-rose-500' },
            ].map(kpi => (
              <div key={kpi.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
                <div className={`w-12 h-12 ${kpi.color} rounded-2xl flex items-center justify-center text-white shadow-lg`}>
                  <span className="material-symbols-outlined text-[24px]">{kpi.icon}</span>
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-900">{kpi.value}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 p-1 bg-white rounded-2xl border border-slate-200 shadow-sm w-fit overflow-x-auto">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
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
                  placeholder="Search by ID, title, module, period..."
                  className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all w-72 shadow-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button
                onClick={() => { setShowAddModal(true); setFormError(''); setFormSuccess(''); setFormState(INITIAL_ADD_FORM); }}
                className="px-5 py-2 bg-[#4F46E5] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#4338CA] transition-all shadow-md shadow-indigo-200 flex items-center gap-2 active:scale-95"
              >
                <span className="material-symbols-outlined text-[18px]">upload_file</span>
                Archive Document
              </button>
            </div>
          </div>

          {/* Virtualized Table */}
          <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden">
            <div style={{ height: Math.min(filteredDocs.length * 72 + 56, 600) || 200 }}>
              {filteredDocs.length > 0 ? (
                <TableVirtuoso
                  data={filteredDocs}
                  fixedHeaderContent={() => (
                    <tr className="bg-slate-50/80 border-b border-slate-200">
                      <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left bg-slate-50">Document</th>
                      <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left bg-slate-50">Source & Period</th>
                      <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left bg-slate-50">Integrity Hash</th>
                      <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left bg-slate-50">Archived</th>
                      <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right bg-slate-50">Actions</th>
                    </tr>
                  )}
                  components={{
                    Table: (props) => <table {...props} className="w-full text-left border-collapse" />,
                    TableHead: React.forwardRef((props, ref) => <thead {...props} ref={ref} />),
                    TableRow: (props) => <tr {...props} className="hover:bg-slate-50/60 transition-colors border-b border-slate-100" />,
                    TableBody: React.forwardRef((props, ref) => <tbody {...props} ref={ref} />),
                  }}
                  itemContent={(_, doc) => (
                    <>
                      <td className="px-5 py-3.5 align-top">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${getCategoryStyle(doc.category)}`}>
                            <span className="material-symbols-outlined text-[20px]">{getCategoryIcon(doc.category)}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 text-sm truncate max-w-[260px]">{doc.title}</p>
                            <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getCategoryStyle(doc.category)}`}>
                              {doc.category}
                            </span>
                            {doc.isMandatory && (
                              <span className="inline-block ml-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-100">
                                Required
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 align-top">
                        <p className="text-xs font-bold text-slate-700">{doc.sourceModule}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">{doc.period}</p>
                        {doc.relatedRecordId && (
                          <p className="text-[10px] text-indigo-500 font-mono font-bold mt-0.5">{doc.relatedRecordId}</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5 align-top">
                        <div className="flex items-center gap-2">
                          <code className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">[SECURE-{doc.checksum}]</code>
                          {verifiedIds[doc.id] === 'pass' && (
                            <span className="material-symbols-outlined text-emerald-500 text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                          )}
                          {verifiedIds[doc.id] === 'fail' && (
                            <span className="material-symbols-outlined text-red-500 text-[16px] animate-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>gpp_bad</span>
                          )}
                        </div>
                        <button onClick={() => handleVerify(doc)} className="mt-1 text-[10px] font-bold text-indigo-500 hover:text-indigo-700 uppercase tracking-widest transition-colors flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">shield</span>Verify
                        </button>
                      </td>
                      <td className="px-5 py-3.5 align-top">
                        <p className="text-xs font-bold text-slate-600">{new Date(doc.generatedAt).toLocaleDateString()}</p>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">by {doc.generatedBy}</p>
                      </td>
                      <td className="px-5 py-3.5 align-top text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => setPreviewDoc(doc)} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all" title="Preview">
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                          </button>
                          <button onClick={() => handleDownload(doc)} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:border-emerald-200 transition-all" title="Download">
                            <span className="material-symbols-outlined text-[18px]">download</span>
                          </button>
                          <button onClick={() => { setDeleteDoc(doc); setDeleteReason(''); setDeleteError(''); }} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-600 hover:border-red-200 transition-all" title="Delete">
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-16 text-slate-300">
                  <span className="material-symbols-outlined text-6xl opacity-30 mb-3">folder_off</span>
                  <p className="font-black text-slate-400 uppercase tracking-widest text-sm">No archived documents</p>
                  <p className="text-xs text-slate-400 mt-1 font-bold italic">Adjust search or category filters</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Preview Modal ──────────────────────────────────────────────── */}
      {previewDoc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in" onClick={() => setPreviewDoc(null)}>
          <div className="bg-white rounded-[28px] shadow-2xl w-full max-w-2xl border border-slate-200 overflow-hidden animate-in zoom-in duration-300 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 bg-gradient-to-br from-indigo-50/50 to-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                {systemSettings.companyLogo && (
                  <div className="size-12 rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center p-1 shrink-0">
                    <img src={systemSettings.companyLogo} alt="Logo" className="max-h-full max-w-full object-contain" />
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">{previewDoc.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getCategoryStyle(previewDoc.category)}`}>{previewDoc.category}</span>
                    <code className="text-[10px] font-mono text-slate-400">[SECURE-{previewDoc.checksum}]</code>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleDownload(previewDoc)} className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:text-emerald-600 transition-all">
                  <span className="material-symbols-outlined text-[20px]">download</span>
                </button>
                <button onClick={() => setPreviewDoc(null)} className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all">
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-3 gap-4 mb-5">
                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Source</p><p className="text-sm font-bold text-slate-700 mt-0.5">{previewDoc.sourceModule}</p></div>
                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Period</p><p className="text-sm font-bold text-slate-700 mt-0.5">{previewDoc.period}</p></div>
                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Generated By</p><p className="text-sm font-bold text-slate-700 mt-0.5">{previewDoc.generatedBy}</p></div>
              </div>
              {previewDoc.relatedRecordId && (
                <div className="mb-5 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Linked Record</p>
                  <p className="text-sm font-mono font-bold text-indigo-700 mt-0.5">{previewDoc.relatedRecordId}</p>
                </div>
              )}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 overflow-auto">
                <pre className="text-xs text-slate-700 font-mono leading-relaxed whitespace-pre-wrap break-words">{previewDoc.fileContent}</pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal ──────────────────────────────────── */}
      {deleteDoc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in" onClick={() => setDeleteDoc(null)}>
          <div className="bg-white rounded-[28px] shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 bg-red-50 flex items-start gap-4">
              <span className="material-symbols-outlined text-red-600 text-3xl mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
              <div>
                <h3 className="text-lg font-black text-red-900 uppercase tracking-tighter">Permanent Deletion</h3>
                <p className="text-xs text-red-600 font-bold mt-1">Deleting "{deleteDoc.title}" — this action is irreversible and will be logged to the Security Audit.</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Reason for Deletion <span className="text-red-500">*</span></label>
                <textarea
                  value={deleteReason}
                  onChange={e => { setDeleteReason(e.target.value); setDeleteError(''); }}
                  rows={3}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold placeholder:italic outline-none focus:ring-4 focus:ring-red-500/10 transition-all"
                  placeholder="Mandatory compliance reason (e.g., 'Duplicate filing — original retained as DOC-003')..."
                />
              </div>
              {deleteError && <p className="text-xs text-red-600 font-bold bg-red-50 p-3 rounded-xl border border-red-100">{deleteError}</p>}
            </div>
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setDeleteDoc(null)} className="px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-200 transition-all">Cancel</button>
              <button onClick={handleDelete} className="px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200 transition-all active:scale-95 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Add Document Modal ─────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-[28px] shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 bg-gradient-to-br from-indigo-50/50 to-white flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Archive Document</h3>
                <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest mt-1">Persist to Global Library</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form className="p-6 space-y-4 max-h-[60vh] overflow-y-auto" onSubmit={handleAddSubmit}>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Document Title <span className="text-red-500">*</span></label>
                <input type="text" value={formState.title} onChange={e => setFormState(s => ({ ...s, title: e.target.value }))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold placeholder:italic outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" placeholder="e.g., SSB Form 13 — October 2023" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Category</label>
                  <select value={formState.category} onChange={e => setFormState(s => ({ ...s, category: e.target.value as ArchivedDocument['category'] }))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all">
                    <option value="Government Filing">Government Filing</option>
                    <option value="Employment Contract">Employment Contract</option>
                    <option value="Disciplinary Record">Disciplinary Record</option>
                    <option value="Payroll Summary">Payroll Summary</option>
                    <option value="HR Template">HR Template</option>
                    <option value="Internal Memo">Internal Memo</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Source Module</label>
                  <select value={formState.sourceModule} onChange={e => setFormState(s => ({ ...s, sourceModule: e.target.value as ArchivedDocument['sourceModule'] }))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all">
                    <option value="Manual">Manual Upload</option>
                    <option value="SSB">SSB</option>
                    <option value="PIT">PIT</option>
                    <option value="Disciplinary">Disciplinary</option>
                    <option value="Labor Contracts">Labor Contracts</option>
                    <option value="Payroll">Payroll</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Period</label>
                  <input type="text" value={formState.period} onChange={e => setFormState(s => ({ ...s, period: e.target.value }))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" placeholder="e.g., Oct 2023" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">File Name</label>
                  <input type="text" value={formState.fileName} onChange={e => setFormState(s => ({ ...s, fileName: e.target.value }))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" placeholder="e.g., SSB_Form13_Oct2023.txt" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Description</label>
                <input type="text" value={formState.description} onChange={e => setFormState(s => ({ ...s, description: e.target.value }))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold placeholder:italic outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" placeholder="Brief context for this document..." />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Document Content <span className="text-red-500">*</span></label>
                <textarea value={formState.fileContent} onChange={e => setFormState(s => ({ ...s, fileContent: e.target.value }))} rows={5} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold placeholder:italic outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" placeholder="Paste document content here..." />
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <input type="checkbox" checked={formState.isMandatory} onChange={e => setFormState(s => ({ ...s, isMandatory: e.target.checked }))} className="w-5 h-5 accent-[#4F46E5] rounded-lg cursor-pointer" id="add-mandatory" />
                <label htmlFor="add-mandatory" className="text-xs font-black text-slate-700 uppercase tracking-tight cursor-pointer">Mark as Mandatory Compliance Document</label>
              </div>
              {formError && <p className="text-xs text-red-600 font-bold bg-red-50 p-3 rounded-xl border border-red-100">{formError}</p>}
              {formSuccess && <p className="text-xs text-emerald-600 font-bold bg-emerald-50 p-3 rounded-xl border border-emerald-100 flex items-center gap-2"><span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>{formSuccess}</p>}
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 bg-slate-50 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-100 transition-all">Discard</button>
                <button type="submit" className="flex-1 py-3 bg-[#4F46E5] text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-[#4338CA] shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">lock</span>
                  Archive & Seal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
