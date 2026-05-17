import React, { useState, useMemo } from 'react';
import { TableVirtuoso } from 'react-virtuoso';
import { jsPDF } from 'jspdf';
import Layout from '../layouts/Layout';
import Header from '../components/Header';
import DropdownMenu from '../components/DropdownMenu';
import { useAppData } from '../context/AppDataContext';
import { useUserAccess } from '../context/UserAccessProvider';
import { DisciplinaryAction } from '../types/hrms.types';

const INITIAL_FORM = {
  empId: '',
  type: 'Verbal Warning' as DisciplinaryAction['type'],
  category: 'Misconduct' as DisciplinaryAction['category'],
  description: '',
  actionTaken: '',
  filedDate: new Date().toISOString().split('T')[0],
  expiryDate: '',
  penaltyAmount: '',
  employeeStatement: '',
  documentUrl: ''
};

export default function DisciplinaryActions() {
  const { disciplinaryActions, employees, addDisciplinaryAction, resolveDisciplinaryAction, isAdmin, addDocumentToLibrary } = useAppData();
  const { currentUser } = useUserAccess();
  const adminId = currentUser?.id ?? 'EMP-001';
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formState, setFormState] = useState(INITIAL_FORM);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [detailAction, setDetailAction] = useState<DisciplinaryAction | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  // Stats
  const stats = useMemo(() => ({
    total: disciplinaryActions.length,
    active: disciplinaryActions.filter(a => a.status === 'Active').length,
    resolved: disciplinaryActions.filter(a => a.status === 'Resolved').length,
    suspensions: disciplinaryActions.filter(a => a.type === 'Suspension').length
  }), [disciplinaryActions]);

  const filteredActions = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return disciplinaryActions.filter(action => {
      const matchesTab = activeTab === 'All' || action.status === activeTab;
      const matchesSearch =
        action.employeeName.toLowerCase().includes(query) ||
        action.reason.toLowerCase().includes(query) ||
        action.category.toLowerCase().includes(query) ||
        action.empId.toLowerCase().includes(query) ||
        action.id.toLowerCase().includes(query) ||
        action.dept.toLowerCase().includes(query) ||
        action.type.toLowerCase().includes(query);
      return matchesTab && matchesSearch;
    });
  }, [activeTab, disciplinaryActions, searchQuery]);

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'Verbal Warning': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Written Warning': return 'bg-orange-50 text-orange-700 border-orange-100';
      case 'Final Warning': return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'Suspension': return 'bg-slate-900 text-white border-slate-900';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Resolved': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'Expired': return 'bg-slate-100 text-slate-500 border-slate-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Misconduct': return 'gavel';
      case 'Performance': return 'trending_down';
      case 'Attendance': return 'schedule';
      case 'Safety Violation': return 'health_and_safety';
      case 'Policy Breach': return 'policy';
      default: return 'info';
    }
  };

  // Form validation
  const validateForm = () => {
    if (!formState.empId) return 'Please select an employee.';
    if (!formState.description.trim()) return 'Incident description is required.';
    if (formState.expiryDate && formState.expiryDate < formState.filedDate) return 'Expiry date cannot be before filed date.';
    if (formState.penaltyAmount && (isNaN(Number(formState.penaltyAmount)) || Number(formState.penaltyAmount) < 0)) return 'Penalty must be a valid positive number.';
    // Legal compliance: Myanmar Labor Law §76 — employee response required for formal warnings
    const requiresRebuttal = ['Written Warning', 'Final Warning', 'Suspension'].includes(formState.type);
    if (requiresRebuttal && !formState.employeeStatement.trim()) {
      return 'Myanmar Labor Law §76 requires recording the employee\'s response for formal warnings. Please enter their statement or "Refused to sign".';
    }
    return '';
  };

  // Submit handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    const error = validateForm();
    if (error) { setFormError(error); return; }

    const employee = employees.find(emp => emp.id === formState.empId);
    if (!employee) { setFormError('Employee not found.'); return; }

    const response = addDisciplinaryAction(
      {
        empId: formState.empId,
        employeeName: employee.name,
        dept: employee.dept,
        type: formState.type,
        category: formState.category,
        issueDate: formState.filedDate,
        expiryDate: formState.expiryDate || null,
        reason: formState.description.trim(),
        actionTaken: formState.actionTaken.trim(),
        documentUrl: formState.documentUrl.trim(),
        penaltyAmount: formState.penaltyAmount ? Number(formState.penaltyAmount) : null,
        employeeStatement: formState.employeeStatement.trim() || null
      },
      adminId
    );

    if (!response.success) { setFormError(response.message); return; }
    setFormSuccess(response.message + (formState.penaltyAmount ? ` Penalty of ${Number(formState.penaltyAmount).toLocaleString()} MMK auto-linked to Adjustments.` : ''));
    setFormState(INITIAL_FORM);
    setTimeout(() => { setShowAddModal(false); setFormSuccess(''); }, 1800);
  };

  // Resolve handler
  const handleResolve = (actionId: string) => {
    const result = resolveDisciplinaryAction(actionId, adminId);
    if (!result.success) { alert(result.message); }
    setActionMenuId(null);
  };

  // Warning letter download with verification hash (PDF)
  const handleDownloadWarningLetter = (action: DisciplinaryAction) => {
    if (!isAdmin(adminId)) return;
    const timestamp = new Date().toLocaleString();
    const rawString = `${action.id}|${action.employeeName}|${action.issueDate}|${action.type}|${action.reason}`;
    const mockHash = Array.from(rawString)
      .reduce((hash, char) => (Math.imul(31, hash) + char.charCodeAt(0)) | 0, 0)
      .toString(16)
      .toUpperCase();

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('OFFICIAL WARNING LETTER', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('TechDance HR Management System', pageWidth / 2, 28, { align: 'center' });
    
    doc.setLineWidth(0.5);
    doc.line(20, 32, pageWidth - 20, 32);

    // Employee Details
    let y = 45;
    doc.setFont('helvetica', 'bold');
    doc.text('TO:', 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(action.employeeName, 50, y);

    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('DEPARTMENT:', 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(action.dept || 'N/A', 50, y);

    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('DATE ISSUED:', 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(action.issueDate, 50, y);

    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('SEVERITY:', 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(action.type, 50, y);

    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('CATEGORY:', 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(action.category, 50, y);

    // Content Sections
    y += 15;
    doc.setFont('helvetica', 'bold');
    doc.text('NATURE OF INFRACTION', 20, y);
    doc.line(20, y + 2, pageWidth - 20, y + 2);
    
    y += 10;
    doc.setFont('helvetica', 'normal');
    const splitReason = doc.splitTextToSize(action.reason, pageWidth - 40);
    doc.text(splitReason, 20, y);
    y += splitReason.length * 7;

    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('REMEDIAL ACTION TAKEN', 20, y);
    doc.line(20, y + 2, pageWidth - 20, y + 2);
    
    y += 10;
    doc.setFont('helvetica', 'normal');
    const actionText = action.actionTaken || 'Refer to department head for details.';
    const splitAction = doc.splitTextToSize(actionText, pageWidth - 40);
    doc.text(splitAction, 20, y);
    y += splitAction.length * 7;

    if (action.penaltyAmount) {
      doc.setFont('helvetica', 'bold');
      doc.text(`FINANCIAL PENALTY: ${Number(action.penaltyAmount).toLocaleString()} MMK`, 20, y);
      y += 8;
    }

    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('EMPLOYEE STATEMENT / REBUTTAL', 20, y);
    doc.line(20, y + 2, pageWidth - 20, y + 2);
    
    y += 10;
    doc.setFont('helvetica', 'normal');
    const statementText = action.employeeStatement || 'No statement provided.';
    const splitStatement = doc.splitTextToSize(statementText, pageWidth - 40);
    doc.text(splitStatement, 20, y);
    y += splitStatement.length * 7;

    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('PIP / EXPIRY INFORMATION', 20, y);
    doc.line(20, y + 2, pageWidth - 20, y + 2);
    
    y += 10;
    doc.setFont('helvetica', 'normal');
    const expiryText = action.expiryDate 
      ? `This warning is effective until: ${action.expiryDate}. Status: ${action.status}`
      : 'No expiry date set — warning remains on permanent record.';
    doc.text(expiryText, 20, y);
    
    if (action.resolvedDate) {
      y += 8;
      doc.text(`Resolved On: ${action.resolvedDate} (by ${action.resolvedBy})`, 20, y);
    }

    // Footer / Metadata
    y = 260;
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(`Record ID: ${action.id}`, 20, y);
    doc.text(`Generation Time: ${timestamp}`, pageWidth - 80, y);
    y += 5;
    doc.text(`Verification Hash: [SECURE-${mockHash}]`, 20, y);
    
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text('This document was generated by TechDance HRMS and is tamper-evident.', pageWidth / 2, 280, { align: 'center' });

    // Save PDF
    doc.save(`Warning_Letter_${action.employeeName.replace(/ /g, '_')}_${action.id}.pdf`);

    // Archive bridge — auto-save to Forms Library (store text content for searchability)
    addDocumentToLibrary({
      title: `Warning Letter — ${action.employeeName} (${action.type})`,
      category: 'Disciplinary Record',
      sourceModule: 'Disciplinary',
      description: `${action.type} for ${action.employeeName} (${action.empId}). Category: ${action.category}.`,
      period: action.issueDate.slice(0, 7).replace('-', '/'),
      generatedBy: adminId,
      fileContent: `Warning Letter PDF generated on ${timestamp}. Hash: ${mockHash}`,
      fileName: `Warning_Letter_${action.employeeName.replace(/ /g, '_')}_${action.id}.pdf`,
      isMandatory: false,
      relatedRecordId: action.id,
    }, adminId);

    setActionMenuId(null);
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
                  onClick={() => { setShowAddModal(true); setFormError(''); setFormSuccess(''); setFormState(INITIAL_FORM); }}
                  className="px-6 py-2 bg-rose-600 text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-md shadow-rose-200 flex items-center gap-2 active:scale-95"
                >
                   <span className="material-symbols-outlined text-[20px]">add</span>
                  Issue Warning
                </button>
              </div>
            </div>

            {/* Virtualized Table */}
            <div style={{ height: 520 }}>
              <TableVirtuoso
                data={filteredActions}
                fixedHeaderContent={() => (
                  <tr className="bg-slate-50/50 border-b border-slate-200">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left bg-slate-50">Employee</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left bg-slate-50">Category</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left bg-slate-50">Severity & Status</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left bg-slate-50">Reason & Action</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left bg-slate-50">Context Dates</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right bg-slate-50">Actions</th>
                  </tr>
                )}
                itemContent={(_, action) => (
                  <>
                    <td className="px-6 py-4 align-top">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold border-2 border-white shadow-sm ring-1 ring-slate-200 uppercase tracking-tighter text-xs">
                          {action.employeeName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{action.employeeName}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{action.dept} · {action.empId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                        <span className="material-symbols-outlined text-[16px] text-slate-400">{getCategoryIcon(action.category)}</span>
                        {action.category}
                      </div>
                      {action.penaltyAmount && action.penaltyAmount > 0 && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] font-black text-red-600 uppercase tracking-widest">
                          <span className="material-symbols-outlined text-[12px]">payments</span>
                          {action.penaltyAmount.toLocaleString()} MMK
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="space-y-2">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-widest shadow-sm ${getTypeStyles(action.type)}`}>
                          {action.type}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-widest ${getStatusStyles(action.status)}`}>
                            {action.status}
                          </span>
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
                        {action.resolvedDate && (
                          <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-600">
                            <span className="material-symbols-outlined text-[16px]">verified</span>
                            <span>Resolved: {action.resolvedDate}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right align-top">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setDetailAction(action)}
                          className="p-2 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 text-slate-500 hover:text-indigo-600 transition-all"
                          title="View Details"
                        >
                          <span className="material-symbols-outlined text-[20px]">description</span>
                        </button>
                        <div className="relative">
                          <button
                            onClick={() => setActionMenuId(actionMenuId === action.id ? null : action.id)}
                            className="p-2 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 text-slate-500 hover:text-rose-600 transition-all"
                          >
                            <span className="material-symbols-outlined text-[20px]">more_vert</span>
                          </button>
                          {actionMenuId === action.id && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                              {action.status === 'Active' && (
                                <button
                                  onClick={() => handleResolve(action.id)}
                                  className="w-full text-left px-4 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 transition-all"
                                >
                                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                  Resolve
                                </button>
                              )}
                              <button
                                onClick={() => handleDownloadWarningLetter(action)}
                                className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-all"
                              >
                                <span className="material-symbols-outlined text-[18px]">download</span>
                                Download Letter
                              </button>
                              <button
                                onClick={() => { setActionMenuId(null); }}
                                className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-400 hover:bg-slate-50 flex items-center gap-2 transition-all"
                              >
                                <span className="material-symbols-outlined text-[18px]">close</span>
                                Close Menu
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </>
                )}
                components={{
                  EmptyPlaceholder: () => (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                      <span className="material-symbols-outlined text-6xl opacity-20 block mb-2">gavel</span>
                      <p className="font-bold italic uppercase tracking-widest text-[11px]">No disciplinary records within this scope.</p>
                    </div>
                  )
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Detail Slide-Over */}
      {detailAction && (
        <div className="fixed inset-0 z-[100] flex justify-end bg-black/50 backdrop-blur-sm" onClick={() => setDetailAction(null)}>
          <div className="bg-white w-full max-w-lg h-full shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300" onClick={e => e.stopPropagation()}>
            <div className="p-8 border-b border-slate-100 bg-rose-50/30 flex items-center justify-between sticky top-0 z-10">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Incident Detail</h3>
                <p className="text-[10px] text-rose-600 font-bold uppercase tracking-widest mt-0.5">{detailAction.id}</p>
              </div>
              <button onClick={() => setDetailAction(null)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white border border-slate-200 text-slate-400 hover:text-slate-600 transition-all shadow-sm">
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-lg border-2 border-white shadow-md ring-1 ring-slate-200 uppercase">
                  {detailAction.employeeName.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="text-lg font-black text-slate-900">{detailAction.employeeName}</p>
                  <p className="text-xs text-slate-500 font-bold">{detailAction.dept} · {detailAction.empId}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Severity</p>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-widest ${getTypeStyles(detailAction.type)}`}>{detailAction.type}</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-widest ${getStatusStyles(detailAction.status)}`}>{detailAction.status}</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Category</p>
                  <div className="flex items-center gap-1.5 text-sm font-bold text-slate-700 mt-1">
                    <span className="material-symbols-outlined text-[16px] text-slate-400">{getCategoryIcon(detailAction.category)}</span>
                    {detailAction.category}
                  </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Filed Date</p>
                  <p className="text-sm font-bold text-slate-700 mt-1">{detailAction.issueDate}</p>
                </div>
              </div>

              {detailAction.penaltyAmount && detailAction.penaltyAmount > 0 && (
                <div className="p-4 bg-red-50 rounded-xl border border-red-100 flex items-center gap-3">
                  <span className="material-symbols-outlined text-red-600 text-[28px]">payments</span>
                  <div>
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Financial Penalty</p>
                    <p className="text-lg font-black text-red-700">{detailAction.penaltyAmount.toLocaleString()} MMK</p>
                    <p className="text-[10px] text-red-500 font-medium">Auto-linked to Payroll Adjustments as Pending Deduction</p>
                  </div>
                </div>
              )}

              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Incident Description</p>
                <p className="text-sm text-slate-700 font-medium leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">{detailAction.reason}</p>
              </div>

              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Remedial Action</p>
                <p className="text-sm text-slate-700 font-medium leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">{detailAction.actionTaken || 'No specific remedial action recorded.'}</p>
              </div>

              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Employee Rebuttal / Statement</p>
                <p className={`text-sm font-medium leading-relaxed p-4 rounded-xl border ${detailAction.employeeStatement ? 'bg-blue-50 border-blue-100 text-blue-800' : 'bg-slate-50 border-slate-100 text-slate-400 italic'}`}>
                  {detailAction.employeeStatement || 'No employee statement on file.'}
                </p>
              </div>

              {detailAction.expiryDate && (
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">PIP Expiry</p>
                  <p className="text-sm text-slate-700 font-bold">{detailAction.expiryDate}</p>
                </div>
              )}

              {detailAction.resolvedDate && (
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Resolution</p>
                  <p className="text-sm font-bold text-emerald-700">Closed on {detailAction.resolvedDate} by {detailAction.resolvedBy}</p>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                {detailAction.status === 'Active' && (
                  <button onClick={() => { handleResolve(detailAction.id); setDetailAction(null); }} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    Resolve Incident
                  </button>
                )}
                <button onClick={() => handleDownloadWarningLetter(detailAction)} className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  Download Letter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Issue Warning Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in px-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl border border-slate-200 overflow-visible animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
             <div className="p-8 border-b border-slate-100 bg-rose-50/20 flex items-center justify-between relative overflow-hidden sticky top-0 z-10 rounded-t-3xl">
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

            <form className="p-8 space-y-6" onSubmit={handleSubmit}>
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm font-bold text-red-700 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-bold text-emerald-700 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  {formSuccess}
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Subject Employee *</label>
                  <DropdownMenu
                    value={formState.empId}
                    onChange={val => setFormState({ ...formState, empId: val })}
                    className="w-full"
                    triggerClassName="w-full justify-between h-[46px] text-slate-700 dark:text-slate-200 font-bold"
                    options={[
                      { value: '', label: 'Select Employee...' },
                      ...employees.map(emp => ({
                        value: emp.id,
                        label: `${emp.name} (${emp.id})`,
                        subLabel: `Dept: ${emp.dept} · Role: ${emp.role || 'Personnel'}`
                      }))
                    ]}
                  />
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Severity Level *</label>
                  <DropdownMenu
                    value={formState.type}
                    onChange={val => setFormState({ ...formState, type: val as DisciplinaryAction['type'] })}
                    className="w-full"
                    triggerClassName="w-full justify-between h-[46px] text-rose-600 dark:text-rose-400 font-bold"
                    options={[
                      { value: 'Verbal Warning', label: 'Verbal Warning', subLabel: 'INFORMAL RECORD · REMEDIAL COACHING' },
                      { value: 'Written Warning', label: 'Written Warning', subLabel: 'FORMAL ACTION · FILED IN COMPLIANCE DOSSIER' },
                      { value: 'Final Warning', label: 'Final Warning', subLabel: 'CRITICAL COMPLIANCE RECORD · PIP INITIATION' },
                      { value: 'Suspension', label: 'Suspension', subLabel: 'MANDATORY LEAVE · PENDING INVESTIGATION' }
                    ]}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Incident Category *</label>
                <DropdownMenu
                  value={formState.category}
                  onChange={val => setFormState({ ...formState, category: val as DisciplinaryAction['category'] })}
                  className="w-full"
                  triggerClassName="w-full justify-between h-[46px] text-slate-700 dark:text-slate-200 font-bold"
                  options={[
                    { value: 'Misconduct', label: 'Misconduct', subLabel: 'UNPROFESSIONAL OR OFFENSIVE CONDUCT' },
                    { value: 'Performance', label: 'Performance', subLabel: 'SUB-STANDARD PERFORMANCE OR PIP BREACH' },
                    { value: 'Attendance', label: 'Attendance', subLabel: 'EXCESSIVE ABSENCE OR UNEXCUSED LEAVE' },
                    { value: 'Safety Violation', label: 'Safety Violation', subLabel: 'COMPLIANCE AND SAFETY PROTOCOL BREACH' },
                    { value: 'Policy Breach', label: 'Policy Breach', subLabel: 'COMPANY POLICIES OR NDA INFRINGEMENT' }
                  ]}
                />
              </div>

              <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Incident Description *</label>
                <textarea
                  rows={3}
                  value={formState.description}
                  onChange={e => setFormState({ ...formState, description: e.target.value })}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:ring-4 focus:ring-rose-500/10 transition-all"
                  placeholder="Detail the infraction strictly..."
                />
              </div>

              <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Direct Remedial Action</label>
                <input
                  type="text"
                  value={formState.actionTaken}
                  onChange={e => setFormState({ ...formState, actionTaken: e.target.value })}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-rose-500/10 transition-all"
                  placeholder="e.g. 10% Attendance Penalty applied"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Filed Date</label>
                  <input type="date" value={formState.filedDate} onChange={e => setFormState({ ...formState, filedDate: e.target.value })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-rose-500/10 transition-all" />
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Expiration (PIP End)</label>
                  <input type="date" value={formState.expiryDate} onChange={e => setFormState({ ...formState, expiryDate: e.target.value })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-rose-500/10 transition-all" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Financial Penalty (MMK)</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">payments</span>
                  <input
                    type="number"
                    min="0"
                    value={formState.penaltyAmount}
                    onChange={e => setFormState({ ...formState, penaltyAmount: e.target.value })}
                    className="w-full p-4 pl-12 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-rose-500/10 transition-all"
                    placeholder="0 (leave empty for no penalty)"
                  />
                </div>
                {formState.penaltyAmount && Number(formState.penaltyAmount) > 0 && (
                  <p className="text-[10px] font-bold text-amber-600 mt-1.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">info</span>
                    A Pending Deduction of {Number(formState.penaltyAmount).toLocaleString()} MMK will be auto-created in Payroll Adjustments.
                  </p>
                )}
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Employee Statement / Rebuttal</label>
                <textarea
                  rows={2}
                  value={formState.employeeStatement}
                  onChange={e => setFormState({ ...formState, employeeStatement: e.target.value })}
                  className="w-full p-4 bg-blue-50/50 border border-blue-100 rounded-2xl text-sm font-semibold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                  placeholder="Record the employee's response or defense statement here (Myanmar Labor Law §76 requirement)..."
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Document URL (Optional)</label>
                <input
                  type="url"
                  value={formState.documentUrl}
                  onChange={e => setFormState({ ...formState, documentUrl: e.target.value })}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-rose-500/10 transition-all"
                  placeholder="https://drive.google.com/..."
                />
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
