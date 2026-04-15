import React, { useState, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useAppData } from '../context/AppDataContext';

export default function Candidates() {
    const { candidates, candidateMessages, sendCandidateMessage, updateCandidateStage, rejectCandidate, hireCandidate, addAuditLog } = useAppData();
    
    const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
    const [searchQuery, setSearchQuery] = useState('');

    // Modals and Slide-overs state
    const [hiringCandidateId, setHiringCandidateId] = useState<string | null>(null);
    const [township, setTownship] = useState('');
    
    const [rejectingCandidateId, setRejectingCandidateId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    
    const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
    const [chatInput, setChatInput] = useState('');
    
    const [showSuccess, setShowSuccess] = useState(false);

    // Filtered Candidates
    const filteredCandidates = useMemo(() => {
        return candidates.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.role.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [candidates, searchQuery]);

    // KPIs calculation
    const kpiTotal = candidates.length;
    const kpiShortlisted = candidates.filter(c => c.stage !== 'Sourced' && c.stage !== 'Rejected').length;
    const kpiInterviewing = candidates.filter(c => c.stage === 'Interview').length;
    const kpiHired = candidates.filter(c => c.stage === 'Hired').length;

    // Helper to check 30-day expiry
    const isExpired = (appliedDateStr: string) => {
        const [day, month, year] = appliedDateStr.split('/');
        if (!day || !month || !year) return false;
        const appliedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        const diffTime = Math.abs(new Date().getTime() - appliedDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 30;
    };

    const handleConfirmHire = () => {
        if (!hiringCandidateId || !township) return;
        hireCandidate(hiringCandidateId, township);
        setHiringCandidateId(null);
        setTownship('');
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 5000);
    };

    const handleConfirmReject = () => {
        if (!rejectingCandidateId || !rejectReason) return;
        rejectCandidate(rejectingCandidateId, 'ADM-001', rejectReason);
        setRejectingCandidateId(null);
        setRejectReason('');
    };

    const handleSendChat = () => {
        if (!selectedCandidateId || !chatInput.trim()) return;
        sendCandidateMessage(selectedCandidateId, chatInput.trim(), 'ADM-001');
        setChatInput('');
    };

    const stages = ['Sourced', 'Interview', 'Offer', 'Hired', 'On Hold', 'Rejected'];

    const getStageColor = (stage: string) => {
        switch (stage) {
            case 'Hired': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'Offer': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            case 'Interview': return 'bg-orange-50 text-orange-600 border-orange-100';
            case 'On Hold': return 'bg-[#FEF3C7] text-amber-700 border-amber-200';
            case 'Rejected': return 'bg-[#FEE2E2] text-rose-700 border-rose-200';
            default: return 'bg-blue-50 text-blue-600 border-blue-100';
        }
    };

    const selectedCandidate = candidates.find(c => c.id === selectedCandidateId);
    const messages = selectedCandidateId ? (candidateMessages[selectedCandidateId] || []) : [];

    // Notification badge logic
    const hasUnreadMessages = Object.keys(candidateMessages).length > 0;

    return (
        <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100">
            <Sidebar activeTab="Candidates" />

            <main className="flex-1 flex flex-col overflow-hidden ml-[280px]">
                <Header 
                    title="Candidates"
                    subtitle="Track applicant pipelines, manage interview stages, and review candidate profiles"
                >
                    <div className="flex items-center gap-6 w-full max-w-[800px]">
                        <div className="relative w-full max-w-[480px]">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
                            <input
                                className="w-full border border-slate-200 dark:border-slate-800 rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent text-slate-900 placeholder-slate-400 bg-white dark:bg-slate-900 transition-all shadow-sm"
                                placeholder="Search candidates..."
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1 shadow-sm shrink-0">
                            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-[#4F46E5] dark:text-indigo-400' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: viewMode === 'list' ? "'FILL' 1" : "'FILL' 0" }}>format_list_bulleted</span>
                            </button>
                            <button onClick={() => setViewMode('kanban')} className={`p-1.5 rounded transition-colors ${viewMode === 'kanban' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-[#4F46E5] dark:text-indigo-400' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: viewMode === 'kanban' ? "'FILL' 1" : "'FILL' 0" }}>view_kanban</span>
                            </button>
                        </div>
                    </div>
                </Header>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto p-8 bg-background-light dark:bg-background-dark relative">
                    {showSuccess && (
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400 px-6 py-4 rounded-xl flex items-center gap-3 shadow-sm mb-6 animate-fade-in font-bold text-sm">
                            <span className="material-symbols-outlined text-[20px]">check_circle</span>
                            Candidate hired successfully! Profile propagated to Directory.
                        </div>
                    )}

                    {/* KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                                    <span className="material-symbols-outlined">person_search</span>
                                </div>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Applicants</p>
                            <h3 className="text-2xl font-bold mt-1 text-slate-900 dark:text-slate-100">{kpiTotal}</h3>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                                    <span className="material-symbols-outlined">checklist_rtl</span>
                                </div>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Shortlisted</p>
                            <h3 className="text-2xl font-bold mt-1 text-slate-900 dark:text-slate-100">{kpiShortlisted}</h3>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600 dark:text-purple-400">
                                    <span className="material-symbols-outlined">forum</span>
                                </div>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Interviewing</p>
                            <h3 className="text-2xl font-bold mt-1 text-slate-900 dark:text-slate-100">{kpiInterviewing}</h3>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600 dark:text-emerald-400">
                                    <span className="material-symbols-outlined">verified_user</span>
                                </div>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Hired Pipeline</p>
                            <h3 className="text-2xl font-bold mt-1 text-slate-900 dark:text-slate-100">{kpiHired}</h3>
                        </div>
                    </div>

                    {/* View Router */}
                    {viewMode === 'kanban' ? (
                        <div className="flex gap-6 overflow-x-auto pb-6 h-[600px]">
                            {stages.map(stage => (
                                <div key={stage} className={`flex-shrink-0 w-80 rounded-xl flex flex-col ${stage === 'On Hold' ? 'bg-[#FEF3C7] dark:bg-amber-900/10' : stage === 'Rejected' ? 'bg-[#FEE2E2] dark:bg-rose-900/10' : 'bg-slate-100 dark:bg-slate-800/50'}`}>
                                    <div className="p-4 font-bold text-slate-700 dark:text-slate-200 flex justify-between items-center border-b border-black/5 dark:border-white/5">
                                        <div className="flex items-center gap-2">
                                            {stage}
                                            <span className="bg-white dark:bg-slate-700 text-xs px-2 py-0.5 rounded-full text-slate-500 shadow-sm border border-slate-200 dark:border-slate-600">
                                                {filteredCandidates.filter(c => c.stage === stage).length}
                                            </span>
                                        </div>
                                        {stage === 'On Hold' && <span className="material-symbols-outlined text-[16px] text-amber-500" title="Terminal Column">timer</span>}
                                        {stage === 'Rejected' && <span className="material-symbols-outlined text-[16px] text-rose-500" title="Terminal Column">block</span>}
                                    </div>
                                    <div className="p-3 flex-1 overflow-y-auto space-y-3">
                                        {filteredCandidates.filter(c => c.stage === stage).map(candidate => {
                                            const expired = stage === 'On Hold' && isExpired(candidate.appliedDate);
                                            return (
                                                <div 
                                                    key={candidate.id} 
                                                    className={`p-4 bg-white dark:bg-slate-900 rounded-lg shadow-sm border hover:shadow-md transition-all cursor-pointer ${expired ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-slate-200 dark:border-slate-700'}`}
                                                    onClick={() => setSelectedCandidateId(candidate.id)}
                                                >
                                                    <div className="flex gap-3">
                                                        <img src={candidate.avatar} className="w-10 h-10 rounded-full object-cover bg-slate-100" />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between items-start">
                                                                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{candidate.name}</h4>
                                                            </div>
                                                            <p className="text-xs text-slate-500 truncate mt-0.5">{candidate.role}</p>
                                                            <div className="flex items-center justify-between mt-3">
                                                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                                                  {candidate.appliedDate}
                                                                </span>
                                                                
                                                                {expired && (
                                                                    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                                                        <span className="material-symbols-outlined text-[12px]">warning</span>
                                                                        30D+ EXPIRE
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    {candidate.rejectionReason && stage === 'Rejected' && (
                                                        <div className="mt-3 p-2 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 text-xs rounded-md border border-rose-100 dark:border-rose-800">
                                                            Reason: {candidate.rejectionReason}
                                                        </div>
                                                    )}

                                                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                                        <div className="text-amber-400 text-xs flex items-center">
                                                            <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                                            <span className="ml-1 font-bold text-slate-700 dark:text-slate-300">{candidate.rating.toFixed(1)}</span>
                                                        </div>

                                                        {/* Stage Progression Dropdown */}
                                                        <select 
                                                            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 outline-none text-slate-600 dark:text-slate-300"
                                                            value={candidate.stage}
                                                            onClick={e => e.stopPropagation()}
                                                            onChange={(e) => {
                                                                const newStage = e.target.value as any;
                                                                if (newStage === 'Rejected') {
                                                                    setRejectingCandidateId(candidate.id);
                                                                } else if (newStage === 'Hired') {
                                                                    setHiringCandidateId(candidate.id);
                                                                } else {
                                                                    updateCandidateStage(candidate.id, newStage, 'ADM-001');
                                                                }
                                                            }}
                                                        >
                                                            {stages.map(s => <option key={s} value={s}>{s}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        // List View
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Candidate</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Applied For</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Source</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Stage</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Applied Date</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {filteredCandidates.map(candidate => (
                                            <tr key={candidate.id} onClick={() => setSelectedCandidateId(candidate.id)} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <img className="w-10 h-10 rounded-full object-cover bg-slate-100" src={candidate.avatar} />
                                                        <div>
                                                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{candidate.name}</p>
                                                            <p className="text-xs text-slate-500">{candidate.id}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{candidate.role}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{candidate.source}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStageColor(candidate.stage)}`}>
                                                        {candidate.stage}
                                                    </span>
                                                    {candidate.stage === 'On Hold' && isExpired(candidate.appliedDate) && (
                                                        <span className="ml-2 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">EXPIRED</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{candidate.appliedDate}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right relative" onClick={e => e.stopPropagation()}>
                                                    <div className="flex items-center justify-end gap-2">
                                                        <select 
                                                            className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 outline-none font-medium hover:border-primary/50 cursor-pointer transition-colors"
                                                            value={candidate.stage}
                                                            onChange={(e) => {
                                                                const newStage = e.target.value as any;
                                                                if (newStage === 'Rejected') {
                                                                    setRejectingCandidateId(candidate.id);
                                                                } else if (newStage === 'Hired') {
                                                                    setHiringCandidateId(candidate.id);
                                                                } else {
                                                                    updateCandidateStage(candidate.id, newStage, 'ADM-001');
                                                                }
                                                            }}
                                                        >
                                                            {stages.map(s => <option key={s} value={s}>{s}</option>)}
                                                        </select>
                                                        {candidate.stage === 'Offer' && (
                                                            <button onClick={() => setHiringCandidateId(candidate.id)} className="p-1 rounded hover:bg-emerald-50 text-emerald-600 tooltip" title="Deploy to Employees">
                                                                <span className="material-symbols-outlined text-[20px]">how_to_reg</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* SLIDE-OVER: Candidate Details & Integrated Chat */}
                {selectedCandidate && (
                    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedCandidateId(null)}>
                        <div className="w-[450px] bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col transition-transform transform translate-x-0" onClick={e => e.stopPropagation()}>
                            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-start bg-slate-50 dark:bg-slate-800/50">
                                <div className="flex items-center gap-4">
                                    <img src={selectedCandidate.avatar} className="w-16 h-16 rounded-full border-2 border-white shadow-sm object-cover bg-slate-200" />
                                    <div>
                                        <h2 className="text-xl font-black text-slate-900 dark:text-white">{selectedCandidate.name}</h2>
                                        <p className="text-sm font-medium text-slate-500">{selectedCandidate.role}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold border ${getStageColor(selectedCandidate.stage)}`}>
                                                {selectedCandidate.stage}
                                            </span>
                                            <span className="text-xs font-bold text-slate-400 border-l border-slate-300 dark:border-slate-600 pl-2">
                                                Source: {selectedCandidate.source}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedCandidateId(null)} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            {/* Integrated Chat Window */}
                            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col space-y-4">
                                <div className="text-center">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                                        End-to-End Encrypted via Job Portal API
                                    </span>
                                </div>
                                {messages.length === 0 ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 mt-10">
                                        <span className="material-symbols-outlined text-4xl mb-2 opacity-50">forum</span>
                                        <p className="text-sm font-medium">No messages yet.</p>
                                        <p className="text-xs">Start a conversation via the Portal.</p>
                                    </div>
                                ) : (
                                    messages.map(msg => (
                                        <div key={msg.id} className={`flex max-w-[85%] ${msg.sender === 'hr' ? 'ml-auto justify-end' : 'mr-auto justify-start'}`}>
                                            <div className={`p-3 rounded-2xl text-sm ${msg.sender === 'hr' ? 'bg-primary text-white rounded-br-sm' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-bl-sm shadow-sm'}`}>
                                                <p>{msg.text}</p>
                                                <p className={`text-[10px] mt-1 font-medium ${msg.sender === 'hr' ? 'text-primary-100 opacity-80 text-right' : 'text-slate-400 text-left'}`}>
                                                    {msg.timestamp}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2">
                                <input 
                                    type="text" 
                                    className="flex-1 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-slate-700"
                                    placeholder="Message via Job Portal..."
                                    value={chatInput}
                                    onChange={e => setChatInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                                />
                                <button onClick={handleSendChat} disabled={!chatInput.trim()} className="p-2 rounded-full bg-primary text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 flex items-center justify-center shadow-md">
                                    <span className="material-symbols-outlined text-[18px]">send</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* HIRE MODAL */}
                {hiringCandidateId && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
                        <div className="bg-white dark:bg-[#182130] rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-emerald-500">how_to_reg</span>
                                    Hire Candidate
                                </h3>
                                <button onClick={() => setHiringCandidateId(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <div className="p-6 space-y-4 text-sm text-slate-600 dark:text-slate-300">
                                <p>You are about to deploy this candidate into the active Employee database.</p>
                                <div className="space-y-3 mt-4">
                                    <div className="bg-emerald-50/50 p-4 border border-emerald-100 rounded-lg flex items-start gap-3 mt-4">
                                        <span className="material-symbols-outlined text-emerald-500 mt-0.5">mark_email_unread</span>
                                        <div>
                                            <p className="text-xs font-bold text-slate-700 block mb-1">Security Invitation Pending</p>
                                            <p className="text-[10px] text-slate-500 font-medium">Upon deployment, employee will securely set their Auth credentials via the TechDance HR App.</p>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Township (For Tax & SSB Routing)</label>
                                        <select 
                                            className="w-full text-slate-900 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                            value={township} onChange={e => setTownship(e.target.value)}
                                        >
                                            <option value="">Select Township</option>
                                            <option value="Hlaing">Hlaing</option>
                                            <option value="Kamayut">Kamayut</option>
                                            <option value="Bahan">Bahan</option>
                                            <option value="Sanchaung">Sanchaung</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex justify-end gap-3">
                                <button onClick={() => setHiringCandidateId(null)} className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
                                <button onClick={handleConfirmHire} disabled={!township} className="px-4 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 rounded-lg shadow-sm transition-colors">
                                    Deploy to Directory
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* REJECT MODAL */}
                {rejectingCandidateId && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
                        <div className="bg-white dark:bg-[#182130] rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-rose-200 dark:border-rose-900/50">
                            <div className="p-6 border-b border-rose-100 dark:border-rose-900/30 flex justify-between items-center bg-rose-50 dark:bg-rose-900/20">
                                <h3 className="font-bold text-lg text-rose-700 dark:text-rose-400 flex items-center gap-2">
                                    <span className="material-symbols-outlined">person_remove</span>
                                    Reject Candidate
                                </h3>
                                <button onClick={() => setRejectingCandidateId(null)} className="text-slate-400 hover:text-rose-600 transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <div className="p-6 space-y-4 text-sm text-slate-600 dark:text-slate-300">
                                <div className="bg-amber-50 text-amber-700 p-3 rounded-lg border border-amber-200 text-xs font-medium flex gap-2 items-start">
                                    <span className="material-symbols-outlined text-[16px]">info</span>
                                    Providing constructive feedback improves recruitment ROI metrics and syncs directly back to the candidate via the Job Portal API.
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Rejection Reason *</label>
                                    <select 
                                        className="w-full text-slate-900 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none mb-3"
                                        value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                                    >
                                        <option value="">Select Primary Reason</option>
                                        <option value="Salary Mismatch">Salary Expectation Mismatch</option>
                                        <option value="Skill Gap">Technical Skill Gap</option>
                                        <option value="Cultural Fit">Cultural / Team Fit</option>
                                        <option value="Declined Offer">Candidate Declined Offer</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>
                            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex justify-end gap-3">
                                <button onClick={() => setRejectingCandidateId(null)} className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
                                <button onClick={handleConfirmReject} disabled={!rejectReason} className="px-4 py-2 font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 rounded-lg shadow-sm transition-colors">
                                    Confirm Rejection
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
