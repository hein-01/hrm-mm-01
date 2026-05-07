import React, { useState, useMemo } from 'react';
import Layout from '../layouts/Layout';
import Header from '../components/Header';
import { useAppData } from '../context/AppDataContext';
import { supabase } from '../lib/supabase';

const TICKET_CATEGORIES = [
  { id: 'payroll', label: 'Payslip / Payroll', icon: 'payments' },
  { id: 'leave', label: 'Leave & Attendance', icon: 'event_available' },
  { id: 'it', label: 'IT / Device', icon: 'computer' },
  { id: 'facilities', label: 'Facilities / Admin', icon: 'business' },
  { id: 'benefits', label: 'Benefits & Claims', icon: 'health_and_safety' },
  { id: 'document', label: 'Document Request', icon: 'description' },
  { id: 'other', label: 'Other', icon: 'more_horiz' },
];

const INITIAL_FORM = {
  category: 'payroll',
  subject: '',
  description: '',
  priority: 'Medium',
};

export default function Tickets() {
  const { pushNotification, tickets, setTickets, employees } = useAppData();
  const [activeTab, setActiveTab] = useState('My Tickets');
  const [showNewModal, setShowNewModal] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  const stats = useMemo(() => ({
    open: tickets.filter(t => t.status === 'Open').length,
    pending: tickets.filter(t => t.status === 'Pending').length,
    resolved: tickets.filter(t => t.status === 'Resolved').length,
  }), [tickets]);

  const handleSubmit = () => {
    if (!form.subject.trim() || !form.description.trim()) return;
    setSubmitting(true);
    setTimeout(() => {
      const currentUser = employees.find(e => e.id === 'EMP-001');
      const newTicket = {
        id: `TKT-${Math.floor(Math.random() * 1000)}`,
        empId: 'EMP-001',
        empName: currentUser?.name || 'Unknown',
        ...form,
        status: 'Open',
        createdAt: new Date().toISOString().split('T')[0],
      };
      setTickets([newTicket, ...tickets]);
      // Sync to Supabase
      supabase.from('tickets').insert({
        id: newTicket.id,
        empId: newTicket.empId,
        empName: newTicket.empName,
        category: newTicket.category,
        subject: newTicket.subject,
        description: newTicket.description,
        priority: newTicket.priority,
        status: newTicket.status,
        createdAt: newTicket.createdAt,
      }).then(({ error }) => {
        if (error) console.error('Supabase ticket insert error:', error.message);
      });
      setSubmitting(false);
      setShowNewModal(false);
      setForm(INITIAL_FORM);
      
      pushNotification({
        title: 'Ticket Submitted',
        body: `Your ticket "${form.subject}" has been created.`,
        category: 'Support', priority: 'normal', icon: 'support_agent',
        iconBg: 'bg-blue-50', iconColor: 'text-blue-600',
        actionRoute: '/tickets', actionLabel: 'View Tickets',
        badge: 'New', badgeColor: 'blue',
      });
    }, 800);
  };

  return (
    <Layout activeTab="Tickets">
      <div className="min-h-screen">
        <Header title="Help Desk" subtitle="Submit support tickets & document requests" />

        <div className="px-8 py-8 space-y-6">
          
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="size-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <span className="material-symbols-outlined">pending</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.open}</p>
                <p className="text-xs text-slate-500 font-medium">Open Tickets</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="size-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <span className="material-symbols-outlined">hourglass_empty</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.pending}</p>
                <p className="text-xs text-slate-500 font-medium">In Progress</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="size-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <span className="material-symbols-outlined">check_circle</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.resolved}</p>
                <p className="text-xs text-slate-500 font-medium">Resolved</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {['My Tickets', 'All Tickets'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${activeTab === tab ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 cursor-pointer shadow-sm shadow-indigo-200"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              New Ticket
            </button>
          </div>

          {/* List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-bold">ID</th>
                  <th className="px-6 py-3 font-bold">Subject</th>
                  <th className="px-6 py-3 font-bold">Category</th>
                  <th className="px-6 py-3 font-bold">Status</th>
                  <th className="px-6 py-3 font-bold">Date</th>
                  <th className="px-6 py-3 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map(ticket => (
                  <tr key={ticket.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{ticket.id}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{ticket.subject}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs font-bold capitalize">{ticket.category}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        ticket.status === 'Open' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                        ticket.status === 'Resolved' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                        'bg-blue-50 border-blue-200 text-blue-700'
                      }`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{ticket.createdAt}</td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-indigo-600 hover:text-indigo-800 font-bold text-xs cursor-pointer">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {tickets.length === 0 && (
              <div className="p-12 text-center text-slate-400">
                <span className="material-symbols-outlined text-4xl mb-2">inbox</span>
                <p>No tickets found</p>
              </div>
            )}
          </div>
        </div>

        {/* New Ticket Modal */}
        {showNewModal && (
          <>
            <div className="fixed inset-0 z-[200] bg-black/20 backdrop-blur-sm" onClick={() => setShowNewModal(false)} />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-[201] bg-white rounded-2xl shadow-2xl p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Create New Ticket</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Category</label>
                  <div className="grid grid-cols-3 gap-2">
                    {TICKET_CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setForm({ ...form, category: cat.id })}
                        className={`p-2 rounded-lg border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                          form.category === cat.id ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">{cat.icon}</span>
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Subject</label>
                  <input 
                    type="text" 
                    value={form.subject}
                    onChange={e => setForm({ ...form, subject: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-300 outline-none"
                    placeholder="Brief summary of the issue"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Description</label>
                  <textarea 
                    rows={4}
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-300 outline-none resize-none"
                    placeholder="Explain your issue in detail..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button 
                    onClick={() => setShowNewModal(false)}
                    className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSubmit}
                    disabled={submitting || !form.subject.trim() || !form.description.trim()}
                    className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? 'Submitting...' : 'Submit Ticket'}
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
