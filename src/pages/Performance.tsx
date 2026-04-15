import React, { useState, useMemo, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useAppData, Review } from '../context/AppDataContext';

export default function Performance() {
    const { employees: activeEmployees, reviews, setReviews, flagEmployeeRisk, addDocumentToEmployee, finalizeReview, submitReview } = useAppData();

    // Simulated current admin ID
    const currentAdminId = 'EMP-ADM-001';

    // Auto-Sync Background Risk Flags to Profiles natively based on Performance data
    useEffect(() => {
        reviews.forEach(r => {
            if (r.rating !== null && r.rating < 3.0 && r.status === 'Completed') {
                flagEmployeeRisk(r.empId);
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const [searchQuery, setSearchQuery] = useState('');

    // UI Modal States
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [activeRecord, setActiveRecord] = useState<any>(null);
    const [actionFeedback, setActionFeedback] = useState<string | null>(null);

    // Competency Slider State for Start Review modal
    const COMPETENCIES = ['Technical', 'Leadership', 'Communication', 'Execution', 'Collaboration'] as const;
    const [competencyScores, setCompetencyScores] = useState<Record<string, number>>({});

    // Live weighted average from slider values
    const competencyValues = Object.values(competencyScores).filter(v => v > 0);
    const liveWeightedAvg = competencyValues.length > 0
        ? Math.round((competencyValues.reduce((s, v) => s + v, 0) / competencyValues.length) * 10) / 10
        : null;

    // Schedule form states
    const [scheduleDept, setScheduleDept] = useState('Engineering');
    const [schedulePeriod, setSchedulePeriod] = useState('Q4 2023');

    // Filter Logic
    const filteredReviews = useMemo(() => {
        if (!searchQuery.trim()) return reviews;
        const lowerQ = searchQuery.toLowerCase();
        return reviews.filter(r =>
            r.name.toLowerCase().includes(lowerQ) ||
            r.empId.toLowerCase().includes(lowerQ) ||
            r.dept.toLowerCase().includes(lowerQ)
        );
    }, [reviews, searchQuery]);

    // Live KPI Generators (Derived purely by slicing the overarching array)
    const completedCount = reviews.filter(r => r.status === 'Completed').length;
    const reviewCompletionPct = reviews.length > 0 ? Math.round((completedCount / reviews.length) * 100) : 0;

    const ratedReviews = reviews.filter(r => r.rating !== null);
    const avgScore = ratedReviews.length > 0
        ? (ratedReviews.reduce((sum, r) => sum + r.rating!, 0) / ratedReviews.length).toFixed(1)
        : '0.0';

    const topPerformers = reviews.filter(r => r.rating !== null && r.rating >= 4.5).length;
    const riskCount = reviews.filter(r => r.rating !== null && r.rating < 3.0).length;

    // Actions
    const handleScheduleSubmit = () => {
        // Find explicitly "Active" employees in chosen dept who don't already have a review for this period
        const targetEmployees = activeEmployees.filter(e => e.status === 'Active' && e.dept === scheduleDept && !reviews.some(r => r.empId === e.id && r.period === schedulePeriod));

        if (targetEmployees.length === 0) {
            setActionFeedback(`No active employees in ${scheduleDept} lacking a ${schedulePeriod} cycle.`);
            setTimeout(() => setActionFeedback(null), 3000);
            return;
        }

        const newReviews = targetEmployees.map((emp, idx) => ({
            id: `REV-NEW-${Date.now()}-${idx}`,
            empId: emp.id,
            name: emp.name,
            dept: emp.dept,
            period: schedulePeriod,
            progress: [],
            rating: null,
            bonusEligible: false,
            status: 'Pending',
            initials: emp.initials,
            colorClass: 'bg-slate-100 text-slate-600 border border-slate-200'
        }));

        setReviews(prev => [...newReviews, ...prev]);
        closeModals();

        setActionFeedback(`Successfully dispatched ${newReviews.length} new cycles to ${scheduleDept}. Target UI Completion % dynamically reduced.`);
        setTimeout(() => setActionFeedback(null), 5000);
    };

    const handleSendReminder = (review: any) => {
        // Cross-check mocked employee profile for ESS Mobile app push
        const emp = activeEmployees.find(e => e.id === review.empId);
        const hasMobile = emp && emp.mobile;

        setActiveRecord(review);
        setActiveModal('sending_reminder');

        setTimeout(() => {
            const msg = hasMobile
                ? `System PUSH Notification dispatched cleanly to ${review.name}'s Employee Self-Service (ESS) Mobile App via ${emp.mobile}.`
                : `No ESS native mobile number found. Standard legacy email dispatch triggered to ${review.name}.`;

            setActionFeedback(msg);

            // Lock State
            setReviews(prev => prev.map(r => r.id === review.id ? { ...r, hasReminderSent: true } : r));

            setActiveModal(null);
            setTimeout(() => setActionFeedback(null), 5000);
        }, 1500);
    };

    const handleViewReport = (review: any) => {
        setActiveRecord(review);
        setActiveModal('view_report');
    };

    const closeModals = () => {
        setActiveModal(null);
        setActiveRecord(null);
        setCompetencyScores({});
    };

    const handleStartReview = (review: any) => {
        // Pre-populate any existing scores
        setCompetencyScores(review.competencyScores || {});
        setActiveRecord(review);
        setActiveModal('start_review');
    };

    const handleSubmitReview = () => {
        if (!activeRecord) return;
        const scores: Review['competencyScores'] = {};
        COMPETENCIES.forEach(c => {
            if (competencyScores[c] > 0) (scores as any)[c] = competencyScores[c];
        });
        const res = submitReview(activeRecord.id, currentAdminId, scores);
        closeModals();
        setActionFeedback(res.message);
        setTimeout(() => setActionFeedback(null), 6000);
    };

    // UI Helper
    const renderStars = (rating: number | null) => {
        if (rating === null) return (
            <div className="flex text-slate-300 dark:text-slate-700">
                <span className="material-symbols-outlined !text-[16px]">star</span>
                <span className="material-symbols-outlined !text-[16px]">star</span>
                <span className="material-symbols-outlined !text-[16px]">star</span>
                <span className="material-symbols-outlined !text-[16px]">star</span>
                <span className="material-symbols-outlined !text-[16px]">star</span>
            </div>
        );

        const fullStars = Math.floor(rating);
        const hasHalf = rating % 1 !== 0;
        const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

        return (
            <div className="flex text-amber-400">
                {[...Array(fullStars)].map((_, i) => <span key={`f-${i}`} className="material-symbols-outlined !text-[16px] text-[#4F46E5] fill">star</span>)}
                {hasHalf && <span className="material-symbols-outlined !text-[16px] text-[#4F46E5] fill" style={{ fontVariationSettings: "'FILL' 0.5" }}>star_half</span>}
                {[...Array(emptyStars)].map((_, i) => <span key={`e-${i}`} className="material-symbols-outlined !text-[16px] text-slate-200">star</span>)}
                <span className="ml-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 px-1.5 py-0.5 rounded">{rating.toFixed(1)}</span>
            </div>
        );
    };

    return (
        <div className="flex h-screen w-full font-display text-slate-900 dark:text-white antialiased overflow-hidden bg-background-light dark:bg-background-dark relative">
            <Sidebar activeTab="Performance" />

            <main className="flex-1 flex flex-col h-full overflow-hidden relative ml-[280px]">
                {/* 1. Standardized Global Header Axis Integration */}
                <Header 
                    title="Performance Appraisals"
                    subtitle="Goal tracking, cycle scheduling, and workforce calibration"
                >
                    <div className="relative w-full max-w-[480px] ml-4 hidden lg:block">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
                        <input
                            className="w-full border border-slate-200 dark:border-slate-800 rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent text-slate-900 placeholder-slate-400 bg-white dark:bg-slate-900 transition-all shadow-sm"
                            placeholder="Filter employees..."
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </Header>

                <div className="flex-1 overflow-y-auto w-full bg-[#F8FAFC]">

                    {/* Action Center Block (Conditional Feedback) */}
                    {actionFeedback && (
                        <div className="bg-[#4F46E5] text-white px-8 py-3 text-sm font-bold flex items-center gap-3 animate-fade-in z-20 sticky top-0 shadow-md">
                            <span className="material-symbols-outlined bg-white/20 p-1 rounded-full text-[16px]">info</span>
                            {actionFeedback}
                        </div>
                    )}

                    {/* Toolbar */}
                    <div className="px-8 pt-9 pb-4 flex items-center justify-end">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setActiveModal('schedule')} className="flex items-center gap-2 bg-[#4F46E5] text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-[#4338CA] transition-colors shadow-sm">
                                <span className="material-symbols-outlined text-[18px]">calendar_add_on</span> Schedule Cycle
                            </button>
                        </div>
                    </div>

                    <div className="px-8 pb-12 space-y-8 max-w-[1600px] mx-auto">

                        {/* 2. Interactive Stateful KPIs */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-white p-6 rounded-xl border border-slate-200 hover:border-[#4F46E5]/40 transition-colors shadow-sm flex flex-col justify-between">
                                <p className="text-slate-500 text-[11px] font-extrabold uppercase tracking-widest">Avg. Fleet Target Score</p>
                                <div className="mt-2 flex items-baseline gap-2">
                                    <h3 className="text-3xl font-bold text-slate-900">{avgScore}<span className="text-lg text-slate-400">/5.0</span></h3>
                                </div>
                                <div className="mt-4 h-8 w-full"><svg className="w-full h-full" viewBox="0 0 100 20"><path d="M0 15 Q 10 5, 20 12 T 40 8 T 60 14 T 80 6 T 100 10" fill="none" opacity="0.5" stroke="#4F46E5" strokeWidth="1.5"></path></svg></div>
                            </div>

                            <div className="bg-white p-6 rounded-xl border border-slate-200 hover:border-[#4F46E5]/40 transition-colors shadow-sm flex flex-col justify-between">
                                <p className="text-slate-500 text-[11px] font-extrabold uppercase tracking-widest flex items-center justify-between">
                                    UI Completion Tracking
                                    <span className="text-[#4F46E5] bg-indigo-50 px-1.5 py-0.5 rounded text-[10px]">{completedCount}/{reviews.length}</span>
                                </p>
                                <div className="mt-2 flex items-baseline gap-2">
                                    <h3 className="text-3xl font-bold text-slate-900">{reviewCompletionPct}%</h3>
                                </div>
                                <div className="w-full bg-slate-100 h-2 rounded-full mt-4 border border-slate-200 overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-700 ease-in-out" style={{ backgroundColor: '#4F46E5', width: `${reviewCompletionPct}%` }}></div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-xl border border-slate-200 hover:border-[#4F46E5]/40 transition-colors shadow-sm flex flex-col justify-between">
                                <p className="text-slate-500 text-[11px] font-extrabold uppercase tracking-widest">Top Performers</p>
                                <div className="mt-2 flex items-center justify-between">
                                    <div className="flex items-baseline gap-2">
                                        <h3 className="text-3xl font-bold text-emerald-600">{topPerformers}</h3>
                                        <span className="text-slate-400 text-sm font-medium">Eligible</span>
                                    </div>
                                    <span className="material-symbols-outlined text-emerald-100 text-[40px] -mb-2">star</span>
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-4 border-t border-slate-100 pt-3">Scores &ge; 4.5 automatically qualify for statutory bonus review.</p>
                            </div>

                            <div className="bg-red-50/30 p-6 rounded-xl border border-red-200 ring-4 ring-white shadow-sm flex flex-col justify-between relative overflow-hidden">
                                <div className="absolute -right-4 -top-4 opacity-[0.03] text-[120px] text-red-500 pointer-events-none">
                                    <span className="material-symbols-outlined text-inherit">warning</span>
                                </div>
                                <div className="flex justify-between items-start">
                                    <p className="text-red-600 text-[11px] font-extrabold uppercase tracking-widest flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[14px]">gpp_maybe</span> Critical Labor Risk
                                    </p>
                                </div>
                                <div className="mt-2 flex items-baseline gap-2 relative z-10">
                                    <h3 className="text-3xl font-bold text-red-600">{riskCount}</h3>
                                    <span className="text-red-400 text-sm font-bold uppercase">Flags Detected</span>
                                </div>
                                <p className="text-[10px] font-bold text-red-400/80 uppercase mt-4 border-t border-red-100 pt-3 relative z-10 leading-tight">Syncs structural risk flag directly downward onto Employee Profiles for future EC contracts.</p>
                            </div>
                        </div>

                        {/* 3. Main Review Data Grid */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col bg-clip-border">
                            <div className="px-6 py-4 border-b border-slate-200 bg-[#F8FAFC]">
                                <h4 className="font-bold text-slate-900 text-sm uppercase tracking-widest">Active Review Registry</h4>
                            </div>
                            <div className="overflow-x-auto min-h-[300px]">
                                <table className="w-full text-left">
                                    <thead className="bg-[#F8FAFC] text-slate-500 text-xs font-extrabold uppercase tracking-wider border-b border-slate-200">
                                        <tr>
                                            <th className="px-6 py-4">Employee / Function</th>
                                            <th className="px-6 py-4">Assessment Matrix</th>
                                            <th className="px-6 py-4">Scale Aggregation</th>
                                            <th className="px-6 py-4">Status Map</th>
                                            <th className="px-6 py-4 text-right">Context Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-sm">
                                        {filteredReviews.map(review => (
                                            <tr key={review.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${review.colorClass}`}>{review.initials}</div>
                                                        <div className="flex flex-col gap-0.5">
                                                            <p className="font-bold text-slate-900 group-hover:text-[#4F46E5] transition-colors">{review.name}</p>
                                                            <p className="text-[11px] font-mono font-medium text-slate-500">{review.empId} • <span className="font-semibold text-slate-600">{review.dept}</span></p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block w-16">{review.period}</span>
                                                        <div className="flex gap-1.5">
                                                            <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold border ${review.progress.includes('E') ? 'bg-[#4F46E5] text-white border-[#4F46E5]' : 'bg-slate-50 text-slate-400 border-slate-200'}`} title="Employee Self-Assessment">E</span>
                                                            <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold border ${review.progress.includes('M') ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-slate-50 text-slate-400 border-slate-200'}`} title="Manager Review">M</span>
                                                            <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold border ${review.progress.includes('A') ? 'bg-[#4338CA] text-white border-[#4338CA]' : 'bg-slate-50 text-slate-400 border-slate-200'}`} title="Admin Verification">A</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        {renderStars(review.rating)}
                                                        {review.bonusEligible && <span className="material-symbols-outlined !text-[16px] text-amber-500 bg-amber-50 p-1 rounded border border-amber-100" title="Auto-Qualified for Statutory Bonus review.">monetization_on</span>}
                                                        {review.rating !== null && review.rating < 3.0 && <span className="material-symbols-outlined !text-[16px] text-red-500 bg-red-50 p-1 rounded border border-red-100" title="Triggers EC Flag">warning</span>}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {review.status === 'Completed' && <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-extrabold uppercase tracking-widest border border-emerald-200 shadow-sm flex inline-flex items-center gap-1"><span className="size-1.5 rounded-full bg-emerald-500"></span>{review.status}</span>}
                                                    {review.status === 'In Progress' && <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-[#4F46E5] text-[10px] font-extrabold uppercase tracking-widest border border-indigo-200 shadow-sm flex inline-flex items-center gap-1"><span className="size-1.5 rounded-full animate-pulse bg-indigo-500"></span>{review.status}</span>}
                                                    {review.status === 'Pending' && <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-extrabold uppercase tracking-widest border border-slate-200 shadow-sm flex inline-flex items-center gap-1">{review.status}</span>}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {review.status === 'Completed' && <button onClick={() => handleViewReport(review)} className="text-xs font-bold px-3 py-1.5 border border-slate-200 rounded-lg shadow-sm text-slate-600 hover:text-[#4F46E5] hover:border-[#4F46E5] hover:bg-indigo-50/50 flex flex-inline items-center gap-2 transition-all ml-auto"><span className="material-symbols-outlined !text-[16px]">picture_as_pdf</span> Extract Report</button>}
                                                    {review.status === 'In Progress' && <button className="text-xs font-bold px-3 py-1.5 bg-indigo-50 text-[#4F46E5] rounded-lg border border-indigo-100 hover:bg-[#4F46E5] hover:text-white flex flex-inline items-center gap-2 transition-all shadow-sm ml-auto"><span className="material-symbols-outlined !text-[16px]">draw</span> Form Intercept</button>}
                                                    {(review.status === 'Pending' || review.status === 'Draft' || review.status === 'In Progress') && (
                                                        <div className="flex items-center gap-2 ml-auto">
                                                            <button
                                                                onClick={() => handleStartReview(review)}
                                                                className="text-xs font-bold px-3 py-1.5 rounded-lg border bg-indigo-50 text-[#4F46E5] border-indigo-200 hover:bg-[#4F46E5] hover:text-white flex items-center gap-2 transition-all shadow-sm"
                                                            >
                                                                <span className="material-symbols-outlined !text-[16px]">rate_review</span>
                                                                Start Review
                                                            </button>
                                                            {review.status === 'Pending' && (
                                                                <button
                                                                    onClick={() => handleSendReminder(review)}
                                                                    disabled={review.hasReminderSent}
                                                                    className={`text-xs font-bold px-3 py-1.5 rounded-lg border flex items-center gap-2 transition-all shadow-sm ${review.hasReminderSent ? 'bg-emerald-50 text-emerald-700 border-emerald-100 opacity-80 cursor-default' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
                                                                >
                                                                    <span className="material-symbols-outlined !text-[16px]">{review.hasReminderSent ? 'check_circle' : 'notifications_active'}</span>
                                                                    {review.hasReminderSent ? 'Reminded' : 'Notify'}
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredReviews.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                                    <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">person_search</span>
                                                    <p className="font-medium">No reviews found matching your query.</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Modals & Safe-Checks */}

                {/* 0. Start Review Modal — Competency Sliders */}
                {activeModal === 'start_review' && activeRecord && (() => {
                    // Goal completion hint: count 'E' (employee self-assess) or any completed goals in progress array
                    const completedGoalCount = activeRecord.progress?.filter((p: string) => p.startsWith('G')).length || 0;
                    const hasGoalHint = completedGoalCount >= 3;
                    return (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in px-4">
                            <div className="bg-white w-full max-w-lg rounded-[24px] shadow-2xl overflow-hidden border border-slate-200 flex flex-col">
                                {/* Header */}
                                <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
                                    <div>
                                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#4F46E5]">Performance Appraisal</p>
                                        <h3 className="text-lg font-bold text-slate-900 mt-0.5">{activeRecord.name}</h3>
                                        <p className="text-xs font-semibold text-slate-400 mt-0.5">{activeRecord.dept} · {activeRecord.period}</p>
                                    </div>
                                    <button onClick={closeModals} className="text-slate-400 hover:text-slate-600 p-1 transition-colors">
                                        <span className="material-symbols-outlined">close</span>
                                    </button>
                                </div>

                                {/* Sliders */}
                                <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
                                    <p className="text-xs font-bold text-slate-500">Rate each competency from 1 (Below Expectations) to 5 (Exceptional).</p>
                                    {COMPETENCIES.map(comp => {
                                        const score = competencyScores[comp] || 0;
                                        const isExecution = comp === 'Execution';
                                        return (
                                            <div key={comp} className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                                        {comp}
                                                        {isExecution && hasGoalHint && (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                                                                <span className="material-symbols-outlined text-[12px]">lightbulb</span>
                                                                Suggest ≥ 4 ({completedGoalCount} goals completed)
                                                            </span>
                                                        )}
                                                    </label>
                                                    <span className={`text-sm font-extrabold w-7 text-right ${score >= 4.5 ? 'text-emerald-600' : score > 0 && score < 3 ? 'text-red-500' : 'text-[#4F46E5]'}`}>
                                                        {score || '—'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] font-bold text-slate-400 w-4">1</span>
                                                    <input
                                                        type="range"
                                                        min={1} max={5} step={1}
                                                        value={score || 1}
                                                        onChange={e => setCompetencyScores(prev => ({ ...prev, [comp]: Number(e.target.value) }))}
                                                        className="flex-1 h-2 rounded-full accent-[#4F46E5] cursor-pointer"
                                                    />
                                                    <span className="text-[10px] font-bold text-slate-400 w-4">5</span>
                                                </div>
                                                <div className="flex justify-between text-[9px] text-slate-300 font-semibold px-4">
                                                    <span>Below Exp.</span><span>Meets</span><span>Exceeds</span><span>Exceptional</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Live Score Summary */}
                                <div className={`mx-6 mb-4 p-4 rounded-xl border flex items-center justify-between ${liveWeightedAvg !== null && liveWeightedAvg >= 4.5 ? 'bg-emerald-50 border-emerald-200' : liveWeightedAvg !== null && liveWeightedAvg < 3.0 ? 'bg-red-50 border-red-200' : 'bg-indigo-50 border-indigo-100'}`}>
                                    <div>
                                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Weighted Average</p>
                                        <p className={`text-2xl font-bold mt-0.5 ${liveWeightedAvg !== null && liveWeightedAvg >= 4.5 ? 'text-emerald-600' : liveWeightedAvg !== null && liveWeightedAvg < 3.0 ? 'text-red-600' : 'text-[#4F46E5]'}`}>
                                            {liveWeightedAvg !== null ? `${liveWeightedAvg} / 5.0` : 'Rate all competencies'}
                                        </p>
                                    </div>
                                    {liveWeightedAvg !== null && (
                                        <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${liveWeightedAvg >= 4.5 ? 'bg-emerald-100 text-emerald-700' : liveWeightedAvg < 3.0 ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                            {liveWeightedAvg >= 4.5 ? '⭐ Bonus Eligible' : liveWeightedAvg < 3.0 ? '⚠ Risk Flag' : '✓ Standard'}
                                        </span>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                                    <button onClick={closeModals} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button>
                                    <button
                                        onClick={handleSubmitReview}
                                        disabled={liveWeightedAvg === null}
                                        className="px-6 py-2.5 rounded-lg text-sm font-bold text-white bg-[#4F46E5] hover:bg-[#4338CA] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">send</span>
                                        Submit for Approval
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* 1. Schedule Workflow Check */}
                {activeModal === 'schedule' && (

                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in px-4">
                        <div className="bg-white w-full max-w-sm rounded-[24px] shadow-2xl overflow-hidden border border-slate-200 flex flex-col">
                            <div className="p-6 pb-2">
                                <span className="material-symbols-outlined text-[#4F46E5] bg-indigo-50 p-3 rounded-full text-2xl mb-4 border border-indigo-100">calendar_add_on</span>
                                <h3 className="text-xl font-bold text-slate-900 leading-tight">Schedule Cycle Tracker</h3>
                                <p className="text-sm font-medium text-slate-500 mt-2">Dispatches fresh assessment rows into the datagrid mapped to strict department constraints.</p>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Target Segment</label>
                                    <select value={scheduleDept} onChange={e => setScheduleDept(e.target.value)} className="w-full text-sm p-3 border border-slate-300 rounded-lg focus:ring-[#4F46E5] focus:border-[#4F46E5] font-bold bg-[#F8FAFC]">
                                        <option>Engineering</option>
                                        <option>Marketing</option>
                                        <option>Sales</option>
                                        <option>Logistics</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Period Parameter</label>
                                    <select value={schedulePeriod} onChange={e => setSchedulePeriod(e.target.value)} className="w-full text-sm p-3 border border-slate-300 rounded-lg focus:ring-[#4F46E5] focus:border-[#4F46E5] font-bold bg-[#F8FAFC]">
                                        <option>Q4 2023</option>
                                        <option>Annual 2023</option>
                                        <option>Probation 60-Day</option>
                                    </select>
                                </div>
                                <p className="text-[10px] font-bold text-[#4F46E5] flex items-center gap-1 pt-2 border-t border-slate-100"><span className="material-symbols-outlined text-[12px]">security</span> Linked exclusively to Active Directory HR members.</p>
                            </div>
                            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                                <button onClick={closeModals} className="px-5 py-2.5 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors">Discard</button>
                                <button onClick={handleScheduleSubmit} className="px-6 py-2.5 rounded-lg text-sm font-bold text-white bg-[#4F46E5] hover:bg-[#4338CA] transition-colors shadow-md">Dispatch Matrix</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. Simulation Spinner for Push Reminders */}
                {activeModal === 'sending_reminder' && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
                        <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center">
                            <span className="material-symbols-outlined animate-spin text-[#4F46E5] text-[40px] mb-4">sync</span>
                            <p className="font-bold text-slate-900">Querying Active Database...</p>
                            <p className="text-xs text-slate-500 mt-2">Checking ESS Native Contact Constraints for {activeRecord?.name}</p>
                        </div>
                    </div>
                )}

                {/* 3. Forms Library / Document Routing PDF Intercept */}
                {activeModal === 'view_report' && activeRecord && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in px-4">
                        <div className="bg-white w-full max-w-sm rounded-[24px] shadow-2xl overflow-hidden border border-slate-200 flex flex-col">
                            <div className="p-8 text-center bg-[#F8FAFC] border-b border-slate-100">
                                <div className="border border-slate-200 bg-white w-16 h-20 mx-auto shadow-sm rounded flex items-center justify-center mb-4 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-4 bg-red-500 flex items-center justify-center text-[8px] font-bold text-white uppercase tracking-widest">PDF</div>
                                    <span className="material-symbols-outlined text-[32px] text-slate-300 mt-2">assessment</span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 leading-tight">Generate Formal Extract</h3>
                                <p className="text-xs font-semibold text-slate-500 mt-2">This command parses the {activeRecord.period} matrix metrics for {activeRecord.name}.</p>
                            </div>
                            <div className="p-6 bg-white space-y-4">
                                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-start gap-3">
                                    <span className="material-symbols-outlined text-[#4F46E5]">route</span>
                                    <p className="text-xs font-bold text-slate-700 leading-relaxed uppercase tracking-widest">
                                        Data is automatically routed backwards directly into the 'Documents' tab on this Employee's Core Profile.
                                    </p>
                                </div>
                            </div>
                            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                                <button onClick={closeModals} className="px-5 py-2.5 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors w-full">Cancel</button>
                                <button onClick={() => {
                                    addDocumentToEmployee(activeRecord.empId, {
                                        name: `Performance Summary PDF - ${activeRecord.period}`,
                                        type: 'PDF',
                                        url: '#'
                                    });
                                    // Trigger Payroll Adjustment Bonus logic if rating > 4.5
                                    finalizeReview(activeRecord.id); 
                                    
                                    closeModals();
                                    setActionFeedback(`Extract compiled securely. Performance Bonus (10% Base) successfully pushed to Adjustments module.`);
                                    setTimeout(() => setActionFeedback(null), 5000);
                                }} className="px-5 py-2.5 rounded-lg text-sm font-bold text-white bg-[#4F46E5] hover:bg-indigo-600 transition-colors shadow-sm w-full">Got it, Generate PDF</button>
                            </div>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}
