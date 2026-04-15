import React, { useState, useMemo, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useAppData } from '../context/AppDataContext';
import { ExpenseRequest } from '../context/AppDataContext';

export default function Expenses() {
    const { 
        systemSettings, 
        employees, 
        expenses, 
        submitExpense, 
        isAdmin 
    } = useAppData();

    const [activeTab, setActiveTab] = useState<'Submit' | 'My Requests'>('Submit');
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [amount, setAmount] = useState<number | ''>('');
    const [currency, setCurrency] = useState('MMK');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState('');
    const [attachments, setAttachments] = useState<File[]>([]);
    
    // For Auth Simulation
    const loggedInEmpId = 'EMP-001'; // Defaulting to Admin for demo
    const isUserAdmin = isAdmin(loggedInEmpId);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setAttachments(Array.from(e.target.files));
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files) {
            setAttachments(Array.from(e.dataTransfer.files));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!categoryId || !amount || amount <= 0 || !description) return;
        
        // Convert pseudo-files to blob URLs so they can be rendered in Inbox
        const attachmentUrls = attachments.map(f => URL.createObjectURL(f));

        const targetEmpId = isUserAdmin ? (selectedEmployeeId || loggedInEmpId) : loggedInEmpId;
        const targetEmp = employees.find(emp => emp.id === targetEmpId);

        if (!targetEmp) return;

        submitExpense({
            employeeId: targetEmpId,
            employeeName: targetEmp.name,
            categoryId,
            amount: Number(amount),
            currency,
            date,
            description,
            attachments: attachmentUrls,
            approverId: 'ADM-001' // Routed to centralized admin group
        });

        // Reset
        setAmount('');
        setDescription('');
        setAttachments([]);
        setActiveTab('My Requests');
    };

    const myRequests = expenses.filter(e => e.employeeId === loggedInEmpId);
    
    const stats = useMemo(() => {
        const myExpenses = expenses.filter(e => e.employeeId === loggedInEmpId);
        return {
            pending: myExpenses.filter(e => e.status === 'Pending').length,
            approved: myExpenses.filter(e => e.status === 'Approved' || e.status === 'Processed').reduce((acc, curr) => acc + curr.amount, 0),
            rejected: myExpenses.filter(e => e.status === 'Rejected').length
        };
    }, [expenses]);

    if (!systemSettings.expenseModuleEnabled) {
        return (
            <div className="flex h-screen w-full font-display text-slate-900 bg-slate-50 antialiased overflow-hidden">
                <Sidebar activeTab="Expenses" />
                <main className="flex-1 flex flex-col h-full overflow-hidden relative ml-[280px]">
                    <Header title="Expense Tracking" subtitle="Service Disabled" />
                    <div className="flex-1 flex justify-center items-center">
                        <div className="text-center">
                            <span className="material-symbols-outlined text-6xl text-slate-300 mb-4 block">receipt_long</span>
                            <h2 className="text-xl font-bold text-slate-700">Expense Tracking is Disabled</h2>
                            <p className="text-slate-500 mt-2">Please ask your Administrator to enable this module in the Settings panel.</p>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-full font-display text-slate-900 bg-slate-50 antialiased overflow-hidden">
            <Sidebar activeTab="Expenses" />

            <main className="flex-1 flex flex-col h-full overflow-hidden relative ml-[280px]">
                <Header 
                    title="Expense Tracking"
                    subtitle="Submit reimbursement requests, track approvals, and manage corporate spend"
                />

                <div className="flex-1 overflow-y-auto px-8 pb-32">
                    <div className="max-w-5xl mx-auto py-6">
                        
                        {/* Stats Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Pending Review</p>
                                    <h3 className="text-3xl font-black text-slate-900">{stats.pending}</h3>
                                </div>
                                <div className="size-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                                    <span className="material-symbols-outlined">pending_actions</span>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Reimbursed This Month</p>
                                    <h3 className="text-2xl font-black text-[#4F46E5]">{stats.approved.toLocaleString()} <span className="text-lg">MMK</span></h3>
                                </div>
                                <div className="size-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                    <span className="material-symbols-outlined">payments</span>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Rejected Requests</p>
                                    <h3 className="text-3xl font-black text-rose-600">{stats.rejected}</h3>
                                </div>
                                <div className="size-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                                    <span className="material-symbols-outlined">cancel</span>
                                </div>
                            </div>
                        </div>

                        <nav className="flex border-b border-slate-200 mb-8 gap-8">
                            {['Submit', 'My Requests'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab as any)}
                                    className={`pb-4 border-b-[3px] transition-colors font-bold ${activeTab === tab ? 'border-[#4F46E5] text-[#4F46E5]' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
                                >
                                    {tab === 'Submit' ? 'Submit New Request' : 'My History'}
                                </button>
                            ))}
                        </nav>

                        {activeTab === 'Submit' && (
                            <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in max-w-3xl">
                                <div className="p-8 space-y-8">
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Expense Category <span className="text-rose-500">*</span></label>
                                            <select 
                                                required
                                                value={categoryId} 
                                                onChange={e => setCategoryId(e.target.value)}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] outline-none text-sm font-bold"
                                            >
                                                <option value="" disabled>Select Category</option>
                                                {systemSettings.expenseCategories.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Date of Expense <span className="text-rose-500">*</span></label>
                                            <input 
                                                type="date"
                                                required
                                                value={date}
                                                onChange={e => setDate(e.target.value)}
                                                max={new Date().toISOString().split('T')[0]}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] outline-none text-sm font-bold"
                                            />
                                        </div>
                                    </div>

                                    {isUserAdmin && (
                                        <div className="space-y-2 border-l-4 border-indigo-200 pl-4 py-1">
                                            <label className="text-xs font-black text-indigo-500 uppercase tracking-widest">Filing On Behalf Of (Admin Only)</label>
                                            <select 
                                                value={selectedEmployeeId} 
                                                onChange={e => setSelectedEmployeeId(e.target.value)}
                                                className="w-full px-4 py-3 bg-indigo-50/30 border border-indigo-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] outline-none text-sm font-bold text-indigo-900"
                                            >
                                                <option value="">Myself</option>
                                                {employees.map(emp => (
                                                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.dept})</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Total Amount <span className="text-rose-500">*</span></label>
                                            <div className="flex gap-2">
                                                <input 
                                                    type="number"
                                                    required
                                                    min="0"
                                                    placeholder="0.00"
                                                    value={amount}
                                                    onChange={e => setAmount(Number(e.target.value) || '')}
                                                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] outline-none text-lg font-black text-slate-900"
                                                />
                                                <select 
                                                    value={currency} 
                                                    onChange={e => setCurrency(e.target.value)}
                                                    className="w-24 px-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold outline-none cursor-pointer"
                                                >
                                                    <option value="MMK">MMK</option>
                                                    <option value="USD">USD</option>
                                                </select>
                                            </div>
                                            {categoryId && systemSettings.expenseCategories.find(c => c.id === categoryId)?.monthlyLimit && (
                                                <p className="text-[10px] font-bold text-amber-600 pl-1 mt-1 flex items-center gap-1">
                                                    <span className="material-symbols-outlined !text-[12px]">warning</span>
                                                    Budget Limit: {systemSettings.expenseCategories.find(c => c.id === categoryId)?.monthlyLimit?.toLocaleString()} MMK
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Description & Business Purpose <span className="text-rose-500">*</span></label>
                                        <textarea
                                            required
                                            rows={3}
                                            value={description}
                                            onChange={e => setDescription(e.target.value)}
                                            placeholder="Provide details about the business purpose of this expense..."
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] outline-none text-sm font-medium resize-none"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1 flex justify-between">
                                            <span>Receipts & Attachments</span>
                                            <span className="text-slate-400 font-medium normal-case tracking-normal">Optional for &lt; 10,000 MMK</span>
                                        </label>
                                        <div 
                                            onDragOver={e => e.preventDefault()}
                                            onDrop={handleDrop}
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-full border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors p-8 flex flex-col items-center justify-center cursor-pointer group"
                                        >
                                            <input 
                                                type="file" 
                                                multiple 
                                                accept="image/*,.pdf" 
                                                className="hidden" 
                                                ref={fileInputRef} 
                                                onChange={handleFileChange}
                                            />
                                            <span className="material-symbols-outlined text-4xl text-slate-400 group-hover:text-[#4F46E5] transition-colors mb-3">cloud_upload</span>
                                            <p className="text-sm font-bold text-slate-600">Click or drag receipts here</p>
                                            <p className="text-xs font-medium text-slate-400 mt-1">Supports JPG/PNG screenshots of receipts</p>
                                        </div>

                                        {attachments.length > 0 && (
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                                                {attachments.map((file, idx) => (
                                                    <div key={idx} className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-3 shadow-sm relative overflow-hidden group">
                                                        <div className="size-8 rounded bg-[#4F46E5]/10 text-[#4F46E5] flex items-center justify-center shrink-0">
                                                            <span className="material-symbols-outlined text-[16px]">receipt</span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-bold text-slate-700 truncate">{file.name}</p>
                                                            <p className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(0)} KB</p>
                                                        </div>
                                                        <button 
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); setAttachments(prev => prev.filter((_, i) => i !== idx)) }}
                                                            className="absolute right-2 text-rose-500 opacity-0 group-hover:opacity-100 bg-rose-50 rounded-full p-1 transition-all"
                                                        >
                                                            <span className="material-symbols-outlined text-[16px] block">close</span>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="bg-slate-50 border-t border-slate-100 p-6 flex justify-end">
                                    <button 
                                        type="submit"
                                        className="bg-[#4F46E5] hover:bg-[#4338CA] text-white px-8 py-3 rounded-xl text-sm font-bold shadow-sm transition-all shadow-[#4F46E5]/20 w-full md:w-auto"
                                    >
                                        Submit Request
                                    </button>
                                </div>
                            </form>
                        )}

                        {activeTab === 'My Requests' && (
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in pb-16">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-widest font-black text-slate-500">
                                            <th className="py-4 px-6">ID & Date</th>
                                            <th className="py-4 px-6">Category</th>
                                            <th className="py-4 px-6">Description</th>
                                            <th className="py-4 px-6 text-right">Amount</th>
                                            <th className="py-4 px-6 text-center">Receipt</th>
                                            <th className="py-4 px-6">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-sm border-b border-slate-100">
                                        {myRequests.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                                                    No expense requests submitted yet.
                                                </td>
                                            </tr>
                                        ) : myRequests.map(req => (
                                            <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="py-4 px-6">
                                                    <div className="font-mono font-bold text-slate-900 text-xs">{req.id}</div>
                                                    <div className="text-[11px] text-slate-500 font-medium mt-0.5">{req.date}</div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <span className="font-bold text-slate-700">
                                                        {systemSettings.expenseCategories.find(c => c.id === req.categoryId)?.name || req.categoryId}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6 text-slate-600 max-w-[250px] truncate">
                                                    {req.description}
                                                </td>
                                                <td className="py-4 px-6 text-right">
                                                    <div className="font-black text-slate-900">{req.amount.toLocaleString()}</div>
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase">{req.currency}</div>
                                                </td>
                                                <td className="py-4 px-6 text-center text-slate-400">
                                                    {req.attachments && req.attachments.length > 0 ? (
                                                        <div className="flex items-center justify-center gap-1 text-[#4F46E5] bg-indigo-50 px-2 py-1 rounded-lg text-xs font-bold w-max mx-auto">
                                                            <span className="material-symbols-outlined text-[14px]">attachment</span>
                                                            {req.attachments.length}
                                                        </div>
                                                    ) : '-'}
                                                </td>
                                                <td className="py-4 px-6">
                                                    <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                                                        req.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                        req.status === 'Approved' || req.status === 'Processed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                        'bg-rose-50 text-rose-700 border-rose-200'
                                                    }`}>
                                                        {req.status}
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
            </main>
        </div>
    );
}
