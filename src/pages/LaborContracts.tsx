import React, { useMemo, useState } from 'react';
import { TableVirtuoso } from 'react-virtuoso';
import Layout from '../layouts/Layout';
import Header from '../components/Header';
import DropdownMenu from '../components/DropdownMenu';
import { useAppData } from '../context/AppDataContext';
import { generateDocumentContent } from '../utils/pdfGenerator';
import type { LaborContract } from '../types/hrms.types';

type ContractFormState = {
  empId: string;
  type: LaborContract['type'];
  signedDate: string;
  startDate: string;
  endDate: string;
  salary: string;
  documentUrl: string;
};

const INITIAL_FORM_STATE: ContractFormState = {
  empId: '',
  type: 'Probation',
  signedDate: new Date().toISOString().split('T')[0],
  startDate: '',
  endDate: '',
  salary: '',
  documentUrl: ''
};

export default function LaborContracts() {
  const { employees, laborContracts, addLaborContract, addDocumentToLibrary, systemSettings, isAdmin } = useAppData();
  const [activeTab, setActiveTab] = useState<'All' | 'Active' | 'Expiring Soon' | 'Expired'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formError, setFormError] = useState('');
  const [formState, setFormState] = useState<ContractFormState>(INITIAL_FORM_STATE);

  const stats = useMemo(
    () => ({
      total: laborContracts.length,
      active: laborContracts.filter(contract => contract.status === 'Active').length,
      expiring: laborContracts.filter(contract => contract.status === 'Expiring Soon').length,
      expired: laborContracts.filter(contract => contract.status === 'Expired').length
    }),
    [laborContracts]
  );

  const filteredContracts = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return laborContracts.filter(contract => {
      const matchesTab = activeTab === 'All' || contract.status === activeTab;
      const matchesSearch =
        contract.employeeName.toLowerCase().includes(query) ||
        contract.dept.toLowerCase().includes(query) ||
        contract.empId.toLowerCase().includes(query);
      return matchesTab && matchesSearch;
    });
  }, [activeTab, laborContracts, searchQuery]);

  const getStatusStyles = (status: LaborContract['status']) => {
    switch (status) {
      case 'Active':
        return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'Expiring Soon':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Expired':
        return 'bg-slate-100 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-400 border-slate-100';
    }
  };

  const closeModal = () => {
    setShowAddModal(false);
    setFormError('');
    setFormState(INITIAL_FORM_STATE);
  };

  const updateFormField = <K extends keyof ContractFormState>(key: K, value: ContractFormState[K]) => {
    setFormState(prev => ({ ...prev, [key]: value }));
  };

  const validateForm = () => {
    if (!formState.empId) return 'Employee is required.';
    if (!formState.startDate) return 'Start date is required.';
    if (!formState.endDate) return 'End date is required.';
    if (new Date(formState.endDate) < new Date(formState.startDate)) return 'End date cannot be before start date.';
    if (!formState.salary || Number(formState.salary) <= 0) return 'Valid salary is required.';
    return '';
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const employee = employees.find(item => item.id === formState.empId);
    if (!employee) {
      setFormError('Employee not found.');
      return;
    }

    const response = addLaborContract(
      {
        empId: formState.empId,
        employeeName: employee.name,
        dept: employee.dept,
        role: employee.role,
        type: formState.type,
        startDate: formState.startDate,
        endDate: formState.endDate,
        signedDate: formState.signedDate,
        salary: Number(formState.salary),
        documentUrl: formState.documentUrl.trim()
      },
      'EMP-001'
    );

    if (!response.success) {
      setFormError(response.message);
      return;
    }

    closeModal();
  };

  const handleRenew = (contract: LaborContract) => {
    const today = new Date();
    const todayISO = today.toISOString().split('T')[0];
    let newEndDate = '';
    if (contract.startDate && contract.endDate) {
      const durationMs = new Date(contract.endDate).getTime() - new Date(contract.startDate).getTime();
      const renewEnd = new Date(today.getTime() + durationMs);
      newEndDate = renewEnd.toISOString().split('T')[0];
    } else {
      const oneYearLater = new Date(today);
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
      newEndDate = oneYearLater.toISOString().split('T')[0];
    }
    setFormState({
      empId: contract.empId,
      type: contract.type === 'Probation' ? 'Fixed Term' : contract.type,
      signedDate: todayISO,
      startDate: todayISO,
      endDate: newEndDate,
      salary: String(contract.salary),
      documentUrl: ''
    });
    setFormError('');
    setShowAddModal(true);
  };

  const handleDownloadContract = (contract: LaborContract) => {
    if (!isAdmin('EMP-001')) return;

    const timestamp = new Date().toLocaleString();
    const rawString = `${contract.id}|${contract.employeeName}|${contract.startDate}|${contract.salary}`;
    const mockHash = Array.from(rawString)
      .reduce((hash, char) => (Math.imul(31, hash) + char.charCodeAt(0)) | 0, 0)
      .toString(16)
      .toUpperCase();

    const body = `
Employee: ${contract.employeeName}
Department: ${contract.dept}
Role: ${contract.role || 'Personnel'}
Contract Type: ${contract.type}
Start Date: ${contract.startDate}
End Date: ${contract.endDate || 'N/A'}
Salary: ${contract.salary.toLocaleString()} MMK
Status: ${contract.status}
Signed Date: ${contract.signedDate}
    `.trim();

    const content = generateDocumentContent(
        'Official Labor Contract',
        systemSettings.companyLogo,
        body,
        {
            id: `CNTR-${contract.id.split('-').pop()}`,
            timestamp,
            checksum: mockHash,
            footer: 'Myanmar Labor Law Compliant - Ministry of Labor Standard'
        }
    );

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `Contract_${contract.employeeName.replace(/\s+/g, '_')}_${contract.id}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);

    // Archive bridge — auto-save to Forms Library
    addDocumentToLibrary({
      title: `Labor Contract — ${contract.employeeName} (${contract.type})`,
      category: 'Employment Contract',
      sourceModule: 'Labor Contracts',
      description: `${contract.type} contract for ${contract.employeeName}. ${contract.startDate} to ${contract.endDate || 'Open-ended'}. Salary: ${contract.salary.toLocaleString()} MMK.`,
      period: contract.startDate.slice(0, 7).replace('-', '/'),
      generatedBy: 'EMP-001',
      fileContent: content,
      fileName: `Contract_${contract.employeeName.replace(/\s+/g, '_')}_${contract.id}.txt`,
      isMandatory: true,
      relatedRecordId: contract.id,
    }, 'EMP-001');
  };

  return (
    <Layout activeTab="Labor Contracts (EC)">
      <div className="min-h-screen">
        <Header title="Labor Contracts (EC)" subtitle="Manage employee agreements and Ministry of Labor compliance" />

        <div className="px-8 py-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Total Contracts</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Active</p>
              <p className="text-2xl font-bold text-slate-900">{stats.active}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-amber-200 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Expiring Soon</p>
              <p className="text-2xl font-bold text-amber-700">{stats.expiring}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-rose-200 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Expired</p>
              <p className="text-2xl font-bold text-rose-700">{stats.expired}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
              <div className="flex items-center gap-1 p-1 bg-white rounded-xl border border-slate-200 w-fit">
                {(['All', 'Active', 'Expiring Soon', 'Expired'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === tab ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Search employee..."
                  className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all w-64"
                  value={searchQuery}
                  onChange={event => setSearchQuery(event.target.value)}
                />
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all"
                >
                  New Contract
                </button>
              </div>
            </div>

            <div style={{ height: 520 }}>
              <TableVirtuoso
                data={filteredContracts}
                fixedHeaderContent={() => (
                  <tr className="bg-slate-50/50 border-b border-slate-200">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-left">Employee</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-left">Type</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-left">Duration</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-left">Signed</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-left">Salary</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-left">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                )}
                itemContent={(_, contract) => (
                  <>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-slate-900">{contract.employeeName}</p>
                        <p className="text-xs text-slate-500">{contract.empId} - {contract.dept}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-700">{contract.type}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {contract.startDate} to {contract.endDate || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{contract.signedDate}</td>
                    <td className="px-6 py-4 font-semibold text-slate-700">
                      {isAdmin('EMP-001') ? `${contract.salary.toLocaleString()} MMK` : '***'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border uppercase tracking-widest ${getStatusStyles(contract.status)}`}>
                        {contract.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isAdmin('EMP-001') && (
                          <button
                            onClick={() => handleDownloadContract(contract)}
                            className="px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:text-indigo-600 text-xs font-semibold"
                          >
                            Download
                          </button>
                        )}
                        <button
                          onClick={() => handleRenew(contract)}
                          className="px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:text-emerald-600 text-xs font-semibold"
                        >
                          Renew
                        </button>
                      </div>
                    </td>
                  </>
                )}
                components={{
                  EmptyPlaceholder: () => (
                    <div className="px-6 py-12 text-center text-slate-400">
                      No contract records found matching current criteria.
                    </div>
                  )
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-visible border border-slate-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-lg font-bold text-slate-900">New Labor Contract</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 transition-colors">
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>

            <form className="p-6 space-y-5" onSubmit={handleSubmit}>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Employee *</label>
                <DropdownMenu
                  value={formState.empId}
                  onChange={val => updateFormField('empId', val)}
                  className="w-full"
                  triggerClassName="w-full justify-between h-[46px] text-slate-700 dark:text-slate-200 font-bold"
                  options={[
                    { value: '', label: 'Select target employee...' },
                    ...employees.map(employee => ({
                      value: employee.id,
                      label: `${employee.name} (${employee.id})`,
                      subLabel: `Dept: ${employee.dept} · Role: ${employee.role || 'Personnel'}`
                    }))
                  ]}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Contract Type</label>
                  <DropdownMenu
                    value={formState.type}
                    onChange={val => updateFormField('type', val as LaborContract['type'])}
                    className="w-full"
                    triggerClassName="w-full justify-between h-[46px] text-slate-700 dark:text-slate-200 font-bold"
                    options={[
                      { value: 'Probation', label: 'Probation', subLabel: 'PROBATION PERIOD · STANDARD 3 MONTHS' },
                      { value: 'Fixed Term', label: 'Fixed Term', subLabel: 'FIXED CONTRACT · RENEWABLE CYCLE' },
                      { value: 'Open Ended', label: 'Open Ended', subLabel: 'PERMANENT CONTRACT · INDEFINITE TERM' },
                      { value: 'Casual', label: 'Casual', subLabel: 'CASUAL / SEASONAL EMPLOYMENT' }
                    ]}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Sign Date</label>
                  <input
                    type="date"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
                    value={formState.signedDate}
                    onChange={event => updateFormField('signedDate', event.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Start Date *</label>
                  <input
                    type="date"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
                    value={formState.startDate}
                    onChange={event => updateFormField('startDate', event.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">End Date *</label>
                  <input
                    type="date"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
                    value={formState.endDate}
                    onChange={event => updateFormField('endDate', event.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Salary (MMK)</label>
                  <input
                    type="number"
                    min={0}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
                    value={formState.salary}
                    onChange={event => updateFormField('salary', event.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Document URL</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
                    value={formState.documentUrl}
                    onChange={event => updateFormField('documentUrl', event.target.value)}
                  />
                </div>
              </div>

              {formError && (
                <div className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
                  {formError}
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={closeModal} className="flex-1 py-3 rounded-xl text-sm font-bold text-slate-600 border border-slate-200">
                  Discard
                </button>
                <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700">
                  Save Contract
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
