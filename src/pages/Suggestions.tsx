import React, { useState, useMemo } from 'react';
import Layout from '../layouts/Layout';
import Header from '../components/Header';
import { useAppData } from '../context/AppDataContext';

const CATEGORIES = [
  { id: 'process', label: 'Process Improvement', icon: 'sync' },
  { id: 'product', label: 'Product / Service', icon: 'inventory_2' },
  { id: 'workplace', label: 'Workplace Culture', icon: 'groups' },
  { id: 'tech', label: 'Technology / Tools', icon: 'computer' },
  { id: 'other', label: 'Other', icon: 'more_horiz' },
];

const LOGGED_IN_EMP_ID = 'EMP-001';

export default function Suggestions() {
  const { pushNotification } = useAppData();
  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Mock suggestions
  const [suggestions, setSuggestions] = useState([
    { id: 'SUG-001', title: 'Implement flexible working hours', category: 'Workplace Culture', status: 'Under Review', votes: 12, submittedAt: '2026-04-15', author: 'EMP-001' },
    { id: 'SUG-002', title: 'Upgrade project management tool', category: 'Technology', status: 'Implemented', votes: 45, submittedAt: '2026-03-10', author: 'EMP-003' },
    { id: 'SUG-003', title: 'Weekly team building activities', category: 'Workplace Culture', status: 'New', votes: 8, submittedAt: '2026-04-28', author: 'EMP-001' },
  ]);

  const stats = useMemo(() => ({
    total: suggestions.length,
    implemented: suggestions.filter(s => s.status === 'Implemented').length,
    underReview: suggestions.filter(s => s.status === 'Under Review').length,
  }), [suggestions]);

  const handleSubmit = () => {
    if (!selectedCategory || !title.trim() || !description.trim()) return;
    setSubmitting(true);
    setTimeout(() => {
      const catLabel = CATEGORIES.find(c => c.id === selectedCategory)?.label || selectedCategory;
      const newSug = {
        id: `SUG-${Math.floor(Math.random() * 1000)}`,
        title: title,
        category: catLabel,
        status: 'New',
        votes: 0,
        submittedAt: new Date().toISOString().split('T')[0],
        author: LOGGED_IN_EMP_ID,
      };
      setSuggestions([newSug, ...suggestions]);
      setSubmitting(false);
      setShowModal(false);
      setSelectedCategory('');
      setTitle('');
      setDescription('');
      
      pushNotification({
        title: 'Suggestion Submitted',
        body: 'Thank you for your idea!',
        category: 'Innovation', priority: 'normal', icon: 'lightbulb',
        iconBg: 'bg-amber-50', iconColor: 'text-amber-600',
        actionRoute: '/suggestions', actionLabel: 'View Ideas',
        badge: 'New', badgeColor: 'amber',
      });
    }, 800);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Implemented': return 'bg-emerald-50 border-emerald-200 text-emerald-700';
      case 'Under Review': return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'New': return 'bg-amber-50 border-amber-200 text-amber-700';
      default: return 'bg-slate-50 border-slate-200 text-slate-700';
    }
  };

  return (
    <Layout activeTab="Suggestions">
      <div className="min-h-screen">
        <Header 
          title="Innovation Hub" 
          subtitle="Share your ideas to improve our workplace" 
        />

        <div className="px-8 py-8 space-y-6">
          
          {/* Hero */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-lg shadow-indigo-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">Have an Idea?</h2>
                <p className="text-indigo-100 max-w-lg">We value your input. Share your suggestions for process improvements, new tools, or workplace culture enhancements.</p>
              </div>
              <button 
                onClick={() => setShowModal(true)}
                className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-all shadow-md cursor-pointer flex items-center gap-2"
              >
                <span className="material-symbols-outlined">add</span>
                Submit Idea
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="size-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <span className="material-symbols-outlined">lightbulb</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-xs text-slate-500 font-medium">Total Ideas</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="size-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <span className="material-symbols-outlined">check_circle</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.implemented}</p>
                <p className="text-xs text-slate-500 font-medium">Implemented</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="size-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <span className="material-symbols-outlined">rate_review</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.underReview}</p>
                <p className="text-xs text-slate-500 font-medium">Under Review</p>
              </div>
            </div>
          </div>

          {/* List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Recent Ideas</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {suggestions.map(sug => (
                <div key={sug.id} className="p-6 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-400">{sug.id}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(sug.status)}`}>
                          {sug.status}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 mb-1">{sug.title}</h4>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">category</span> {sug.category}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">calendar_today</span> {sug.submittedAt}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-1 ml-4">
                      <button className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-indigo-600 cursor-pointer transition-colors">
                        <span className="material-symbols-outlined text-[20px]">thumb_up</span>
                      </button>
                      <span className="text-xs font-bold text-slate-600">{sug.votes}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <>
            <div className="fixed inset-0 z-[200] bg-black/20 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-[201] bg-white rounded-2xl shadow-2xl p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Submit Your Idea</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Category</label>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`p-3 rounded-lg border text-left flex items-center gap-2 cursor-pointer transition-all ${
                          selectedCategory === cat.id ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <span className={`material-symbols-outlined text-[18px] ${selectedCategory === cat.id ? 'text-indigo-600' : 'text-slate-400'}`}>{cat.icon}</span>
                        <span className={`text-xs font-bold ${selectedCategory === cat.id ? 'text-indigo-700' : 'text-slate-700'}`}>{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Title</label>
                  <input 
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-300 outline-none"
                    placeholder="Brief summary of your idea"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Description</label>
                  <textarea 
                    rows={4}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-300 outline-none resize-none"
                    placeholder="Explain your idea in detail..."
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
                    disabled={submitting || !selectedCategory || !title.trim() || !description.trim()}
                    className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? 'Submitting...' : 'Submit Idea'}
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
