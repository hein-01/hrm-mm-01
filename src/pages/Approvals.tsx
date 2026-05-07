import React, { useState, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useApprovals } from '../context/ApprovalContext';
import { useUserAccess } from '../context/UserAccessProvider';
import { useAppData } from '../context/AppDataContext';

export default function Approvals() {
    const { currentUser } = useUserAccess();
    const { requests, approveRequest, rejectRequest, acknowledgePeer, getPendingApprovals } = useApprovals();
    const { approveLeave, rejectLeave, approveOT, rejectOT, leaveRequests, otRequests } = useAppData();
    
    const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
    const [actionComment, setActionComment] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showBulkRejectModal, setShowBulkRejectModal] = useState(false);
    const [bulkRejectReason, setBulkRejectReason] = useState('');
    const [filterType, setFilterType] = useState<string>('All');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const pendingApprovals = useMemo(() => getPendingApprovals(currentUser?.id || ''), [getPendingApprovals, currentUser]);

    const filteredRequests = useMemo(() => {
        let list = pendingApprovals;
        if (filterType !== 'All') {
            list = list.filter(r => r.requestType === filterType);
        }
        return list;
    }, [pendingApprovals, filterType]);

    const stats = useMemo(() => ({
        pending: pendingApprovals.length,
        leave: pendingApprovals.filter(r => r.requestType === 'Leave').length,
        ot: pendingApprovals.filter(r => r.requestType === 'OT').length,
        expense: pendingApprovals.filter(r => r.requestType === 'Expense').length,
        swap: pendingApprovals.filter(r => r.requestType === 'Swap').length,
    }), [pendingApprovals]);

    const handleApprove = (request: any) => {
        approveRequest(request.id, currentUser?.id || '', currentUser?.name || '', actionComment);
        
        // Sync with underlying modules
        const targetId = request.metadata?.requestId || request.requestId;
        if (request.requestType === 'Leave' && targetId) {
            approveLeave(targetId, currentUser?.id || '');
        } else if (request.requestType === 'OT' && targetId) {
            approveOT(targetId, currentUser?.id || '');
        }
        
        setActionComment('');
        setSelectedRequest(null);
    };

    const handleReject = (request: any) => {
        if (!actionComment.trim()) return;
        rejectRequest(request.id, currentUser?.id || '', currentUser?.name || '', actionComment);
        
        // Sync with underlying modules
        const targetId = request.metadata?.requestId || request.requestId;
        if (request.requestType === 'Leave' && targetId) {
            rejectLeave(targetId, currentUser?.id || '', actionComment.trim());
        } else if (request.requestType === 'OT' && targetId) {
            rejectOT(targetId, currentUser?.id || '', actionComment.trim());
        }
        
        setActionComment('');
        setShowRejectModal(false);
        setSelectedRequest(null);
    };

    const handleBulkApprove = () => {
        selectedIds.forEach(id => {
            const req = pendingApprovals.find(r => r.id === id);
            if (req) {
                approveRequest(req.id, currentUser?.id || '', currentUser?.name || '', 'Bulk approved');
                // Sync with underlying modules
                const targetId = req.metadata?.requestId || req.requestId;
                if (req.requestType === 'Leave' && targetId) {
                    approveLeave(targetId, currentUser?.id || '');
                } else if (req.requestType === 'OT' && targetId) {
                    approveOT(targetId, currentUser?.id || '');
                }
            }
        });
        setSelectedIds([]);
    };

    const handleBulkReject = () => {
        if (selectedIds.length === 0 || !bulkRejectReason.trim()) return;
        selectedIds.forEach(id => {
            const req = pendingApprovals.find(r => r.id === id);
            if (req) {
                rejectRequest(req.id, currentUser?.id || '', currentUser?.name || '', bulkRejectReason.trim());
                // Sync with underlying modules
                const targetId = req.metadata?.requestId || req.requestId;
                if (req.requestType === 'Leave' && targetId) {
                    rejectLeave(targetId, currentUser?.id || '', bulkRejectReason.trim());
                } else if (req.requestType === 'OT' && targetId) {
                    rejectOT(targetId, currentUser?.id || '', bulkRejectReason.trim());
                }
            }
        });
        setSelectedIds([]);
        setShowBulkRejectModal(false);
        setBulkRejectReason('');
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredRequests.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredRequests.map(r => r.id));
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'Leave': return 'event_available';
            case 'OT': return 'more_time';
            case 'Expense': return 'receipt_long';
            case 'Swap': return 'swap_horiz';
            case 'Loan': return 'credit_score';
            case 'ProfileChange': return 'person_edit';
            default: return 'assignment';
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'Leave': return 'bg-blue-100 text-blue-600';
            case 'OT': return 'bg-indigo-100 text-indigo-600';
            case 'Expense': return 'bg-amber-100 text-amber-600';
            case 'Swap': return 'bg-violet-100 text-violet-600';
            case 'Loan': return 'bg-rose-100 text-rose-600';
            case 'ProfileChange': return 'bg-emerald-100 text-emerald-600';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    return (
        <div className="flex h-screen overflow-hidden bg-[#F8FAFC] dark:bg-slate-950 font-display text-slate-900 dark:text-slate-100">
            <Sidebar activeTab="Approvals" />
            <main className="flex flex-col h-full overflow-hidden ml-[280px] flex-1">
                <Header title="Manager Command Center" subtitle="Unified approval workflow for all request types" />
                
                <div className="flex-1 overflow-auto p-6">
                    {/* Stats */}
                    <div className="grid grid-cols-5 gap-4 mb-6">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                            <p className="text-xs font-bold text-slate-400 uppercase">Total Pending</p>
                            <p className="text-3xl font-black text-slate-800 dark:text-slate-200 mt-1">{stats.pending}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 cursor-pointer hover:border-blue-300 transition-colors" onClick={() => setFilterType('Leave')}>
                            <p className="text-xs font-bold text-slate-400 uppercase">Leave</p>
                            <p className="text-3xl font-black text-blue-600 mt-1">{stats.leave}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 cursor-pointer hover:border-indigo-300 transition-colors" onClick={() => setFilterType('OT')}>
                            <p className="text-xs font-bold text-slate-400 uppercase">OT</p>
                            <p className="text-3xl font-black text-indigo-600 mt-1">{stats.ot}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 cursor-pointer hover:border-amber-300 transition-colors" onClick={() => setFilterType('Expense')}>
                            <p className="text-xs font-bold text-slate-400 uppercase">Expense</p>
                            <p className="text-3xl font-black text-amber-600 mt-1">{stats.expense}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 cursor-pointer hover:border-violet-300 transition-colors" onClick={() => setFilterType('Swap')}>
                            <p className="text-xs font-bold text-slate-400 uppercase">Swap</p>
                            <p className="text-3xl font-black text-violet-600 mt-1">{stats.swap}</p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <select 
                                value={filterType}
                                onChange={e => setFilterType(e.target.value)}
                                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
                            >
                                <option value="All">All Types</option>
                                <option value="Leave">Leave</option>
                                <option value="OT">OT</option>
                                <option value="Expense">Expense</option>
                                <option value="Swap">Shift Swap</option>
                                <option value="Loan">Loan</option>
                            </select>
                            {filterType !== 'All' && (
                                <button onClick={() => setFilterType('All')} className="text-sm text-indigo-600 hover:underline">
                                    Clear filter
                                </button>
                            )}
                        </div>
                        {selectedIds.length > 0 && (
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={handleBulkApprove}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[20px]">done_all</span>
                                    Bulk Approve ({selectedIds.length})
                                </button>
                                <button 
                                    onClick={() => setShowBulkRejectModal(true)}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[20px]">cancel</span>
                                    Bulk Reject ({selectedIds.length})
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Requests List */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="px-4 py-4 text-left">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedIds.length === filteredRequests.length && filteredRequests.length > 0}
                                            onChange={toggleSelectAll}
                                            className="w-4 h-4 rounded border-slate-300"
                                        />
                                    </th>
                                    <th className="text-left px-4 py-4 text-xs font-black text-slate-400 uppercase">Requester</th>
                                    <th className="text-left px-4 py-4 text-xs font-black text-slate-400 uppercase">Type</th>
                                    <th className="text-left px-4 py-4 text-xs font-black text-slate-400 uppercase">Details</th>
                                    <th className="text-left px-4 py-4 text-xs font-black text-slate-400 uppercase">Progress</th>
                                    <th className="text-left px-4 py-4 text-xs font-black text-slate-400 uppercase">Status</th>
                                    <th className="text-right px-4 py-4 text-xs font-black text-slate-400 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredRequests.map(request => {
                                    const progress = Math.round((request.currentStep / request.totalSteps) * 100);
                                    return (
                                        <tr key={request.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-4 py-4">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedIds.includes(request.id)}
                                                    onChange={() => toggleSelect(request.id)}
                                                    className="w-4 h-4 rounded border-slate-300"
                                                />
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`size-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${getTypeColor(request.requestType)}`}>
                                                        {request.requesterName.split(' ').map((n: string) => n[0]).join('')}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm">{request.requesterName}</p>
                                                        <p className="text-xs text-slate-400">{request.requesterDept}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${getTypeColor(request.requestType)}`}>
                                                    <span className="material-symbols-outlined text-[14px]">{getTypeIcon(request.requestType)}</span>
                                                    {request.requestType}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-sm">
                                                {request.metadata.dates && <span className="block">{request.metadata.dates}</span>}
                                                {request.metadata.amount && <span className="block font-bold">{Number(request.metadata.amount).toLocaleString()} MMK</span>}
                                                {request.metadata.hours && <span className="block font-bold">{request.metadata.hours} hours</span>}
                                                {request.metadata.type && <span className="block text-slate-500">{request.metadata.type}</span>}
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${progress}%` }} />
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-400">{request.currentStep}/{request.totalSteps}</span>
                                                </div>
                                                <p className="text-[10px] text-slate-400 mt-1">Step {request.currentStep + 1} pending</p>
                                            </td>
                                            <td className="px-4 py-4">
                                                {request.status === 'Dormant' ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                                                        <span className="material-symbols-outlined text-[12px]">hourglass_empty</span>
                                                        Awaiting Peer
                                                    </span>
                                                ) : request.status === 'Escalated' ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                                                        <span className="material-symbols-outlined text-[12px]">warning</span>
                                                        Escalated
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                                                        <span className="material-symbols-outlined text-[12px]">schedule</span>
                                                        Pending
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                {request.status === 'Dormant' ? (
                                                    <button 
                                                        onClick={() => acknowledgePeer(request.id)}
                                                        className="text-indigo-600 hover:text-indigo-700 font-bold text-sm"
                                                    >
                                                        Acknowledge
                                                    </button>
                                                ) : (
                                                    <button 
                                                        onClick={() => setSelectedRequest(request)}
                                                        className="text-indigo-600 hover:text-indigo-700 font-bold text-sm"
                                                    >
                                                        Review
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {filteredRequests.length === 0 && (
                            <div className="p-12 text-center">
                                <span className="material-symbols-outlined text-4xl text-slate-300">inbox</span>
                                <p className="text-slate-400 mt-2">No pending approvals</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Review Modal */}
            {selectedRequest && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-black">{selectedRequest.requestType} Request</h3>
                                <p className="text-sm text-slate-400">From {selectedRequest.requesterName} · {selectedRequest.requesterDept}</p>
                            </div>
                            <button onClick={() => setSelectedRequest(null)} className="text-slate-400 hover:text-slate-600">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Progress Tracker */}
                        <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-3">Approval Progress</p>
                            <div className="flex items-center gap-2">
                                {Array.from({ length: selectedRequest.totalSteps }).map((_, i) => (
                                    <React.Fragment key={i}>
                                        <div className={`flex-1 h-2 rounded-full ${
                                            i < selectedRequest.currentStep ? 'bg-emerald-500' : 
                                            i === selectedRequest.currentStep ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'
                                        }`} />
                                    </React.Fragment>
                                ))}
                            </div>
                            <div className="flex justify-between mt-2">
                                <span className="text-xs text-slate-400">Step {selectedRequest.currentStep + 1} of {selectedRequest.totalSteps}</span>
                                <span className="text-xs font-bold text-indigo-600">{Math.round((selectedRequest.currentStep / selectedRequest.totalSteps) * 100)}%</span>
                            </div>
                        </div>

                        {/* Request Details */}
                        <div className="mb-6 space-y-3">
                            <h4 className="font-bold text-sm">Request Details</h4>
                            <div className="grid grid-cols-2 gap-4">
                                {Object.entries(selectedRequest.metadata).map(([key, value]) => (
                                    <div key={key} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                                        <p className="text-xs font-bold text-slate-400 uppercase">{key}</p>
                                        <p className="font-bold text-sm mt-1">{String(value)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Peer Acknowledgement */}
                        {selectedRequest.peerAcknowledgement && (
                            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="material-symbols-outlined text-amber-600">person_search</span>
                                    <p className="font-bold text-sm text-amber-800 dark:text-amber-200">Peer Acknowledgement Required</p>
                                </div>
                                <p className="text-sm text-amber-700 dark:text-amber-300">
                                    Waiting for {selectedRequest.peerAcknowledgement.peerName} to acknowledge this request.
                                </p>
                            </div>
                        )}

                        {/* History */}
                        {selectedRequest.history.length > 0 && (
                            <div className="mb-6">
                                <h4 className="font-bold text-sm mb-3">Approval History</h4>
                                <div className="space-y-2">
                                    {selectedRequest.history.map((entry: any, i: number) => (
                                        <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                            <div className={`size-8 rounded-full flex items-center justify-center ${
                                                entry.action === 'Approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                                            }`}>
                                                <span className="material-symbols-outlined text-[16px]">
                                                    {entry.action === 'Approved' ? 'check' : 'close'}
                                                </span>
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-bold">
                                                    {entry.approverName}
                                                    {entry.isDelegated && <span className="text-xs font-normal text-slate-400"> (on behalf of {entry.delegatedFrom})</span>}
                                                </p>
                                                <p className="text-xs text-slate-400">{entry.stepName} · {new Date(entry.timestamp).toLocaleString()}</p>
                                                {entry.comment && <p className="text-sm mt-1 italic">"{entry.comment}"</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Comment Input */}
                        <div className="mb-6">
                            <label className="text-xs font-bold text-slate-400 uppercase">Comment (optional for approve)</label>
                            <textarea 
                                value={actionComment}
                                onChange={e => setActionComment(e.target.value)}
                                placeholder="Add a comment..."
                                className="w-full mt-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                                rows={2}
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setShowRejectModal(true)}
                                className="flex-1 py-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 font-bold text-sm hover:bg-rose-100 transition-colors"
                            >
                                Reject
                            </button>
                            <button 
                                onClick={() => handleApprove(selectedRequest)}
                                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm"
                            >
                                Approve
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-black text-rose-600">Reject Request</h3>
                            <button onClick={() => setShowRejectModal(false)} className="text-slate-400 hover:text-slate-600">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <p className="text-sm text-slate-400 mb-4">Please provide a reason for rejection. This will be visible to the requester.</p>
                        <textarea 
                            value={actionComment}
                            onChange={e => setActionComment(e.target.value)}
                            placeholder="Reason for rejection (required)..."
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm mb-4"
                            rows={3}
                        />
                        <button 
                            onClick={() => handleReject(selectedRequest)}
                            disabled={!actionComment.trim()}
                            className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Confirm Rejection
                        </button>
                    </div>
                </div>
            )}

            {/* Bulk Reject Modal */}
            {showBulkRejectModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-black text-rose-600">Bulk Reject {selectedIds.length} Requests</h3>
                            <button onClick={() => setShowBulkRejectModal(false)} className="text-slate-400 hover:text-slate-600">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <p className="text-sm text-slate-400 mb-4">Please provide a reason for rejection. This will be visible to all selected requesters.</p>
                        <textarea 
                            value={bulkRejectReason}
                            onChange={e => setBulkRejectReason(e.target.value)}
                            placeholder="Reason for rejection (required)..."
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm mb-4"
                            rows={3}
                        />
                        <button 
                            onClick={handleBulkReject}
                            disabled={!bulkRejectReason.trim()}
                            className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Confirm Bulk Rejection
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
