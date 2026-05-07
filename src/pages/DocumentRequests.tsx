import React, { useState, useMemo } from 'react';
import Layout from '../layouts/Layout';
import Header from '../components/Header';
import { useAppData } from '../context/AppDataContext';

const DOC_TYPES = [
  { id: 'service_cert', label: 'Service Certificate', desc: 'Proof of employment', icon: 'workspace_premium' },
  { id: 'salary_cert', label: 'Salary Certificate', desc: 'Proof of income for loans', icon: 'request_quote' },
  { id: 'payslip', label: 'Payslip Copy', desc: 'Previous month payslips', icon: 'receipt_long' },
  { id: 'hmo', label: 'HMO / Insurance Cert', desc: 'Medical coverage details', icon: 'health_and_safety' },
  { id: 'other', label: 'Other', desc: 'Any other document', icon: 'description' },
];

const LOGGED_IN_EMP_ID = 'EMP-001';

export default function DocumentRequests() {
  const { pushNotification } = useAppData();
  const [showModal, setShowModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Mock requests
  const [requests, setRequests] = useState([
    { id: 'REQ-001', type: 'Service Certificate', status: 'Approved', requestedAt: '2026-04-10', processedAt: '2026-04-12' },
    { id: 'REQ-002', type: 'Payslip Copy', status: 'Pending', requestedAt: '2026-04-25', processedAt: null },
  ]);

  const stats = useMemo(() => ({
    pending: requests.filter(r => r.status === 'Pending').length,
    approved: requests.filter(r => r.status === 'Approved').length,
    total: requests.length,
  }), [requests]);

  const handleSubmit = () => {
    if (!selectedDoc || !reason.trim()) return;
    setSubmitting(true);
    setTimeout(() => {
      const docLabel = DOC_TYPES.find(d => d.id === selectedDoc)?.label || selectedDoc;
      const newReq = {
        id: `REQ-${Math.floor(Math.random() * 1000)}`,
        type: docLabel,
        status: 'Pending',
        requestedAt: new Date().toISOString().split('T')[0],
        processedAt: null,
      };
      setRequests([newReq, ...requests]);
      setSubmitting(false);
      setShowModal(false);
      setSelectedDoc('');
      setReason('');
      
      pushNotification({
        title: 'Document Requested',
        body: `Your request for ${docLabel} has been submitted.`,
        category: 'Support', priority: 'normal', icon: 'description',
        iconBg: 'bg-blue-50', iconColor: 'text-blue-600',
        actionRoute: '/document-requests', actionLabel: 'View Status',
        badge: 'New', badgeColor: 'blue',
      });
    }, 800);
  };

  return (
    <Layout activeTab="Document Requests">
      <div className="min-h-screen">
        <Header 
          title="Document Request Center" 
          subtitle="Request official company documents" 
        />

        <div className="px-8 py-8 space-y-6">
          
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="size-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <span className="material-symbols-outlined">pending</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.pending}</p>
                <p className="text-xs text-slate-500 font-medium">Pending</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="size-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <span className="material-symbols-outlined">check_circle</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.approved}</p>
                <p className="text-xs text-slate-500 font-medium">Approved</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="size-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                <span className="material-symbols-outlined">folder</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-xs text-slate-500 font-medium">Total Requests</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-lg">My Requests</h3>
            <button 
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 cursor-pointer shadow-sm shadow-indigo-200"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              New Request
            </button>
          </div>

          {/* List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-bold">Request ID</th>
                  <th className="px-6 py-3 font-bold">Document Type</th>
                  <th className="px-6 py-3 font-bold">Status</th>
                  <th className="px-6 py-3 font-bold">Requested Date</th>
                  <th className="px-6 py-3 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{req.id}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{req.type}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        req.status === 'Approved' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                        req.status === 'Pending' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                        'bg-rose-50 border-rose-200 text-rose-700'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{req.requestedAt}</td>
                    <td className="px-6 py-4 text-right">
                      {req.status === 'Approved' ? (
                        <button className="text-indigo-600 hover:text-indigo-800 font-bold text-xs cursor-pointer flex items-center gap-1 ml-auto">
                          <span className="material-symbols-outlined text-[16px]">download</span> Download
                        </button>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Processing...</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {requests.length === 0 && (
              <div className="p-12 text-center text-slate-400">
                <span className="material-symbols-outlined text-4xl mb-2">description</span>
                <p>No document requests yet</p>
              </div>
            )}
          </div>
        </div>

        {/* New Request Modal */}
        {showModal && (
          <>
            <div className="fixed inset-0 z-[200] bg-black/20 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-[201] bg-white rounded-2xl shadow-2xl p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Request New Document</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Select Document</label>
                  <div className="grid grid-cols-1 gap-2">
                    {DOC_TYPES.map(doc => (
                      <button
                        key={doc.id}
                        onClick={() => setSelectedDoc(doc.id)}
                        className={`p-3 rounded-lg border text-left flex items-center gap-3 cursor-pointer transition-all ${
                          selectedDoc === doc.id ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <span className={`material-symbols-outlined ${selectedDoc === doc.id ? 'text-indigo-600' : 'text-slate-400'}`}>{doc.icon}</span>
                        <div>
                          <p className={`text-sm font-bold ${selectedDoc === doc.id ? 'text-indigo-700' : 'text-slate-900'}`}>{doc.label}</p>
                          <p className="text-[10px] text-slate-500">{doc.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Reason / Purpose</label>
                  <textarea 
                    rows={3}
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-300 outline-none resize-none"
                    placeholder="e.g. Applying for home loan, Visa application..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button 
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSubmit}
                    disabled={submitting || !selectedDoc || !reason.trim()}
                    className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
