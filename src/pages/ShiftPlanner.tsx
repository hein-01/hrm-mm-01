import React, { useState, useMemo, useRef } from 'react';
import DropdownMenu from '../components/DropdownMenu';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useAppData } from '../context/AppDataContext';

// Toast Component
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
    React.useEffect(() => {
        const timer = setTimeout(onClose, type === 'success' ? 2000 : 4000);
        return () => clearTimeout(timer);
    }, [onClose, type]);

    return (
        <div className="fixed bottom-6 right-6 animate-slide-up z-50">
            <div className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-black/50 border font-display ${
                type === 'error' ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-200' :
                'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-200'
            }`}>
                <div className={`size-8 rounded-full flex flex-shrink-0 items-center justify-center ${
                    type === 'error' ? 'bg-red-200 dark:bg-red-800/50' : 'bg-emerald-200 dark:bg-emerald-800/50'
                }`}>
                    <span className="material-symbols-outlined text-lg">
                        {type === 'error' ? 'warning' : 'check_circle'}
                    </span>
                </div>
                <div className="pr-4">
                    <p className="font-bold text-sm tracking-tight">{type === 'error' ? 'Action Failed' : 'Success'}</p>
                    <p className="text-xs opacity-80 mt-0.5 leading-snug">{message}</p>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors ml-auto">
                    <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
            </div>
        </div>
    );
};

const getMonday = (d: Date): Date => {
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const m = new Date(d);
    m.setDate(m.getDate() + diff);
    m.setHours(0, 0, 0, 0);
    return m;
};

export default function ShiftPlanner() {
    const {
        employees,
        shifts,
        shiftAssignments,
        leaveRequests,
        complianceSettings,
        assignShift,
        holidays,
        systemSettings,
        publishedWeeks,
        assignDepartmentShift,
        publishWeek
    } = useAppData();

    const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDept, setSelectedDept] = useState('');
    const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => getMonday(new Date()));
    const [deptModalOpen, setDeptModalOpen] = useState(false);
    const [deptId, setDeptId] = useState('');
    const [deptShiftId, setDeptShiftId] = useState('');
    const [copyPreview, setCopyPreview] = useState<{ total: number; leaveSkips: number; srcLabel: string } | null>(null);
    const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
    const importRef = useRef<HTMLInputElement>(null);
    // Click-controlled shift picker (replaces unreliable CSS hover mechanism)
    const [openPickerId, setOpenPickerId] = useState<string | null>(null);

    // Close picker when clicking outside any picker
    React.useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (!(e.target as Element).closest('[data-shift-picker]')) {
                setOpenPickerId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const weekDates = useMemo(() => {
        const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(currentWeekStart);
            d.setDate(d.getDate() + i);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return { label: `${DAY_LABELS[i]} ${dd}`, date: `${yyyy}-${mm}-${dd}`, isWeekend: i >= 5 };
        });
    }, [currentWeekStart]);

    // Calculate duration in hours between two HH:mm strings
    const getShiftDuration = (start: string, end: string) => {
        if (!start || !end) return 0;
        const [sh, sm] = start.split(':').map(Number);
        const [eh, em] = end.split(':').map(Number);
        if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 0;
        const startTotal = sh + sm / 60;
        let endTotal = eh + em / 60;
        if (endTotal <= startTotal) endTotal += 24; // Crosses midnight
        return endTotal - startTotal;
    };

    const getShiftStyling = (shiftName: string) => {
        if (shiftName.includes('Morning')) return { base: 'bg-[#4F46E5]/10 border-[#4F46E5]/20 text-[#4F46E5]', core: 'text-[#4F46E5]' };
        if (shiftName.includes('Night')) return { base: 'bg-purple-500/10 border-purple-500/20 text-purple-600', core: 'text-purple-600' };
        if (shiftName.includes('General')) return { base: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600', core: 'text-emerald-600' };
        return { base: 'bg-slate-100 border-slate-200 text-slate-600', core: 'text-slate-600' };
    };

    // Calculate weekly hours per employee
    const getEmployeeWeeklyHours = (empId: string, empShiftId: string) => {
        let total = 0;
        weekDates.forEach(({ date }) => {
            // Check leave
            const onLeave = leaveRequests.some(l => l.empId === empId && l.status === 'Approved' && l.startDate <= date && l.endDate >= date);
            if (onLeave) return;

            // Check specific assignment or fallback to default
            const sa = shiftAssignments.find(a => a.empId === empId && a.date === date);
            const activeShiftId = sa ? sa.shiftId : empShiftId;
            const shiftObj = shifts.find(s => s.id === activeShiftId);
            if (shiftObj) {
                total += getShiftDuration(shiftObj.start, shiftObj.end);
            }
        });
        return total;
    };

    const activeEmployees = useMemo(() => {
        return (employees || []).filter(e =>
            e.status === 'Active' &&
            (selectedDept === '' || e.dept === selectedDept) &&
            (e.name.toLowerCase().includes(searchQuery.toLowerCase()) || e.id.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [employees, searchQuery, selectedDept]);

    const wouldViolateRest = (empId: string, date: string, shiftId: string): boolean => {
        const emp = (employees || []).find(e => e.id === empId);
        if (!emp) return false;
        const newShiftObj = (shifts || []).find(s => s.id === shiftId);
        if (!newShiftObj || !newShiftObj.start || !newShiftObj.end) return false;
        const minRestMins = (complianceSettings.minRestHours ?? 11) * 60;
        const toMins = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
        const prevD = new Date(date + 'T00:00:00');
        prevD.setDate(prevD.getDate() - 1);
        const prevDateStr = prevD.toISOString().split('T')[0];
        const prevSA = shiftAssignments.find(sa => sa.empId === empId && sa.date === prevDateStr);
        const prevShiftObj = shifts.find(s => s.id === (prevSA?.shiftId ?? emp.shiftId));
        const prevEnd = prevSA?.customEnd || prevShiftObj?.end;
        if (!prevEnd) return false;
        const gapMins = toMins(newShiftObj.start) >= toMins(prevEnd)
            ? toMins(newShiftObj.start) - toMins(prevEnd)
            : (24 * 60 - toMins(prevEnd)) + toMins(newShiftObj.start);
        return gapMins < minRestMins;
    };

    const weekKey = useMemo(() => {
        const d = currentWeekStart;
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }, [currentWeekStart]);

    const isPublished = publishedWeeks.includes(weekKey);

    const weekLabel = useMemo(() => {
        const end = new Date(currentWeekStart);
        end.setDate(end.getDate() + 6);
        const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        return `${fmt(currentWeekStart)} – ${fmt(end)}`;
    }, [currentWeekStart]);

    const handlePrevWeek = () => setCurrentWeekStart(prev => { const d = new Date(prev); d.setDate(d.getDate() - 7); return d; });
    const handleNextWeek = () => setCurrentWeekStart(prev => { const d = new Date(prev); d.setDate(d.getDate() + 7); return d; });

    const handleAssignShift = (empId: string, date: string, shiftId: string) => {
        const res = assignShift(empId, date, shiftId, 'Manual assignment via Shift Planner', 'ADMIN');
        if (res.success) {
            setToast({ message: res.message, type: 'success' });
        } else {
            setToast({ message: res.message, type: 'error' });
        }
    };

    const handleUnassignShift = (empId: string, date: string) => {
        const emp = employees.find(e => e.id === empId);
        const res = assignShift(empId, date, emp?.shiftId || '', 'Unassigned via Shift Planner', 'ADMIN');
        if (res.success) {
            setToast({ message: 'Shift unassigned successfully.', type: 'success' });
        } else {
            setToast({ message: res.message, type: 'error' });
        }
    };

    const handleExport = () => {
        const rows = ['Employee,Date,Shift,Start,End'];
        activeEmployees.forEach(emp => {
            weekDates.forEach(({ date }) => {
                const onLeave = leaveRequests.some(l => l.empId === emp.id && l.status === 'Approved' && l.startDate <= date && l.endDate >= date);
                if (onLeave) return;
                const sa = shiftAssignments.find(a => a.empId === emp.id && a.date === date);
                const activeShiftId = sa ? sa.shiftId : emp.shiftId;
                const shiftObj = shifts.find(s => s.id === activeShiftId);
                if (shiftObj) rows.push(`"${emp.name}",${date},"${shiftObj.name}",${shiftObj.start},${shiftObj.end}`);
            });
        });
        const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `Duty_Roster_${weekKey}.csv`; a.click();
        URL.revokeObjectURL(url);
        setToast({ message: 'Roster exported successfully.', type: 'success' });
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const lines = (ev.target?.result as string).split('\n').map(l => l.trim()).filter(Boolean);
            let ok = 0; let fail = 0;
            lines.slice(1).forEach(line => {
                const [empId, date, shiftId] = line.split(',').map(s => s.replace(/"/g, '').trim());
                if (!empId || !date || !shiftId) { fail++; return; }
                const res = assignShift(empId, date, shiftId, 'CSV Import', 'ADMIN');
                if (res.success) ok++; else fail++;
            });
            setToast({ message: `Import complete: ${ok} assigned, ${fail} skipped.`, type: ok > 0 ? 'success' : 'error' });
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleCopyLastWeek = () => {
        let total = 0;
        let leaveSkips = 0;
        const srcWeekStart = new Date(currentWeekStart);
        srcWeekStart.setDate(srcWeekStart.getDate() - 7);
        const srcLabel = srcWeekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        weekDates.forEach(({ date }, i) => {
            const srcD = new Date(currentWeekStart);
            srcD.setDate(srcD.getDate() - 7 + i);
            const srcStr = `${srcD.getFullYear()}-${String(srcD.getMonth()+1).padStart(2,'0')}-${String(srcD.getDate()).padStart(2,'0')}`;
            activeEmployees.forEach(emp => {
                const sa = shiftAssignments.find(a => a.empId === emp.id && a.date === srcStr);
                if (!sa) return;
                total++;
                const onLeave = leaveRequests.some(l => l.empId === emp.id && l.status === 'Approved' && l.startDate <= date && l.endDate >= date);
                if (onLeave) leaveSkips++;
            });
        });
        if (total === 0) { setToast({ message: 'No assignments found in the previous week to copy.', type: 'error' }); return; }
        setCopyPreview({ total, leaveSkips, srcLabel });
    };

    const executeCopyLastWeek = () => {
        let copied = 0;
        weekDates.forEach(({ date }, i) => {
            const srcD = new Date(currentWeekStart);
            srcD.setDate(srcD.getDate() - 7 + i);
            const srcStr = `${srcD.getFullYear()}-${String(srcD.getMonth()+1).padStart(2,'0')}-${String(srcD.getDate()).padStart(2,'0')}`;
            activeEmployees.forEach(emp => {
                const sa = shiftAssignments.find(a => a.empId === emp.id && a.date === srcStr);
                if (sa) { const res = assignShift(emp.id, date, sa.shiftId, 'Copied from previous week', 'ADMIN'); if (res.success) copied++; }
            });
        });
        setCopyPreview(null);
        setToast({ message: `Copied ${copied} shift(s) from last week.`, type: 'success' });
    };

    const handlePublish = () => {
        const res = publishWeek(weekKey, 'ADMIN');
        setToast({ message: res.message, type: res.success ? 'success' : 'error' });
    };

    const handleDeptAssign = () => {
        if (!deptId || !deptShiftId) { setToast({ message: 'Select both a department and a shift.', type: 'error' }); return; }
        let totalAssigned = 0;
        const allSkippedNames = new Set<string>();
        weekDates.forEach(({ date }) => {
            const res = assignDepartmentShift(deptId, deptShiftId, date, 'ADMIN');
            const match = res.message.match(/Assigned (\d+)/);
            if (match) totalAssigned += parseInt(match[1]);
            res.skippedNames.forEach(n => allSkippedNames.add(n));
        });
        setDeptModalOpen(false);
        const skippedList = [...allSkippedNames];
        const skippedNote = skippedList.length > 0
            ? ` Skipped (need reliever): ${skippedList.slice(0, 3).join(', ')}${skippedList.length > 3 ? ` +${skippedList.length - 3} more` : ''}.`
            : '';
        setToast({ message: `Applied to ${deptId}: ${totalAssigned} assigned.${skippedNote}`, type: 'success' });
    };

    // Auto-calculate daily coverage totals
    const getDailyCoverage = (date: string) => {
        const counts: Record<string, number> = {};
        activeEmployees.forEach(emp => {
            const onLeave = leaveRequests.some(l => l.empId === emp.id && l.status === 'Approved' && l.startDate <= date && l.endDate >= date);
            if (onLeave) return;

            const sa = shiftAssignments.find(a => a.empId === emp.id && a.date === date);
            const activeShiftId = sa ? sa.shiftId : emp.shiftId;
            const shiftObj = shifts.find(s => s.id === activeShiftId);
            if (shiftObj) {
                counts[shiftObj.name] = (counts[shiftObj.name] || 0) + 1;
            }
        });
        return counts;
    };

    if (!employees || !shifts || !shiftAssignments || !leaveRequests || !holidays) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#F8FAFC] dark:bg-[#221610] ml-[280px]">
                <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 animate-pulse">calendar_month</span>
            </div>
        );
    }

    return (
        <div className="flex h-screen overflow-hidden dark:bg-[#221610] font-display text-slate-900 dark:text-slate-100 min-h-screen bg-[#F8FAFC]">
            <Sidebar activeTab="Shift Planner" />

            <main className="flex-1 flex flex-col overflow-hidden ml-[280px]">
                {/* Global Header exactly matching requirements */}
                <Header 
                    title="Shift Planner"
                    subtitle="Coordinate workforce schedules, manage department rotations, and track coverage across teams"
                >
                    <div className="flex items-center gap-3 ml-4 hidden lg:flex">
                        <div className="relative w-full max-w-[300px]">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
                            <input
                                className="w-full border border-slate-200 dark:border-slate-700 rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent text-slate-900 placeholder-slate-400 bg-white dark:bg-slate-900 transition-all shadow-sm"
                                placeholder="Search employees or ID..."
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <DropdownMenu
                            value={selectedDept}
                            onChange={setSelectedDept}
                            options={[
                                { value: '', label: 'All Departments' },
                                ...(systemSettings?.departments || []).map(d => ({
                                    value: d.name,
                                    label: d.name,
                                }))
                            ]}
                        />
                    </div>
                </Header>

                <div className="flex-1 overflow-auto p-8 pt-8">
                    {/* Top Actions & Date */}
                    <div className="flex flex-wrap items-center justify-between gap-6 mb-8">
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                                <button onClick={handlePrevWeek} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-all" title="Previous week">
                                    <span className="material-symbols-outlined text-lg leading-none">chevron_left</span>
                                </button>
                                <button onClick={() => setCurrentWeekStart(getMonday(new Date()))} className="px-3 py-1 text-sm font-bold hover:text-[#4F46E5] transition-colors whitespace-nowrap flex flex-col items-center leading-tight">
                                    <span>{weekLabel}</span>
                                    {currentWeekStart.getTime() === getMonday(new Date()).getTime() && (
                                        <span className="text-[10px] font-semibold text-[#4F46E5]">This Week</span>
                                    )}
                                </button>
                                <button onClick={handleNextWeek} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-all" title="Next week">
                                    <span className="material-symbols-outlined text-lg leading-none">chevron_right</span>
                                </button>
                            </div>
                            {/* View Mode Toggle */}
                            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                                {(['week', 'month'] as const).map(mode => (
                                    <button key={mode} onClick={() => setViewMode(mode)}
                                        className={`px-3 py-1 text-sm font-bold rounded-md transition-all capitalize ${
                                            viewMode === mode ? 'bg-white dark:bg-slate-700 text-[#4F46E5] shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                        }`}>
                                        {mode}
                                    </button>
                                ))}
                            </div>
                            <button onClick={handleExport}
                                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined text-sm">download</span> Export
                            </button>
                            <input ref={importRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
                            <button onClick={() => importRef.current?.click()}
                                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined text-sm">upload</span> Import
                            </button>
                            <button onClick={handleCopyLastWeek}
                                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined text-sm">content_copy</span> Copy Last Week
                            </button>
                            <button onClick={() => setDeptModalOpen(true)}
                                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined text-sm">groups</span> Apply to Dept
                            </button>
                            <button onClick={handlePublish} disabled={isPublished}
                                className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
                                    isPublished
                                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 cursor-not-allowed'
                                        : 'bg-[#4F46E5] text-white shadow-lg shadow-[#4F46E5]/20 hover:opacity-90'
                                }`}
                            >
                                <span className="material-symbols-outlined text-sm">{isPublished ? 'verified' : 'send'}</span>
                                {isPublished ? 'Published' : 'Publish Schedule'}
                            </button>
                        </div>
                    </div>

                    {/* Published Banner */}
                    {isPublished && (
                        <div className="flex items-center gap-3 px-5 py-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-t-xl border-b-0">
                            <span className="material-symbols-outlined text-emerald-600 text-xl">verified</span>
                            <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                                Schedule Published — employees have been notified for the week of {weekLabel}.
                            </p>
                        </div>
                    )}

                    {/* Planner Grid */}
                    {viewMode === 'week' ? (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden" style={{ overflowX: 'auto' }}>
                        <div className="grid border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 min-w-[1500px]" style={{ gridTemplateColumns: '280px 120px repeat(7, minmax(130px, 1fr))' }}>
                            <div className="p-4 font-bold text-sm text-slate-500" style={{ minWidth: '280px', whiteSpace: 'normal', position: 'sticky', left: 0, backgroundColor: 'inherit', zIndex: 10 }}>Employee</div>
                            <div className="p-4 font-bold text-sm text-slate-500" style={{ minWidth: '120px', textAlign: 'center', position: 'sticky', left: '280px', backgroundColor: 'inherit', zIndex: 10, borderRight: '1px solid rgba(0,0,0,0.05)', boxShadow: '4px 0 8px rgba(0, 0, 0, 0.05)' }}>Weekly Hours</div>
                            {weekDates.map((w, i) => {
                                const isHoliday = holidays.some(h => h.date === w.date);
                                return (
                                <div key={i} className={`p-4 text-center flex flex-col items-center justify-center gap-1 font-bold text-sm min-w-[130px] ${w.isWeekend || isHoliday ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}`}>
                                    {w.label}
                                    {isHoliday && <span className="text-[10px] bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-800/50 uppercase tracking-widest flex items-center gap-0.5 shadow-sm"><span className="text-[11px]">🏝️</span> Holiday</span>}
                                </div>
                                );
                            })}
                        </div>

                        {activeEmployees.map(emp => {
                            const weeklyHours = getEmployeeWeeklyHours(emp.id, emp.shiftId);
                            const isOverLimit = weeklyHours > complianceSettings.maxWeeklyHours;
                            
                            return (
                            <div key={emp.id} className="grid border-b border-slate-200 dark:border-slate-800 min-w-[1500px] hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors" style={{ gridTemplateColumns: '280px 120px repeat(7, minmax(130px, 1fr))' }}>
                                {/* Employee Identity */}
                                <div className="p-4 flex items-center gap-3 bg-white dark:bg-slate-900" style={{ minWidth: '280px', whiteSpace: 'normal', position: 'sticky', left: 0, zIndex: 10 }}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${emp.colorClass || 'bg-blue-100 text-blue-600'}`}>
                                        {emp.avatar ? <img className="w-full h-full rounded-full object-cover" src={emp.avatar} alt="avatar" /> : emp.initials}
                                    </div>
                                    <span className="text-sm font-bold">{emp.name} <span className="text-slate-400 text-xs font-medium ml-1">({emp.dept})</span></span>
                                </div>

                                {/* Weekly Hours / Compliance Check */}
                                <div className={`p-4 flex justify-center items-center gap-1 font-bold text-sm bg-white dark:bg-slate-900 ${isOverLimit ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-300'}`} style={{ minWidth: '120px', position: 'sticky', left: '280px', zIndex: 10, borderRight: '1px solid rgba(0,0,0,0.05)', boxShadow: '4px 0 8px rgba(0, 0, 0, 0.05)' }}>
                                    {weeklyHours}h
                                    {isOverLimit && <span className="material-symbols-outlined text-[16px] cursor-help" title={`Exceeds max weekly hours (${complianceSettings.maxWeeklyHours}h limit)`}>warning</span>}
                                </div>

                                {/* Daily Shift Cells */}
                                {weekDates.map(w => {
                                    // 1. Check leave
                                    const leaveReq = leaveRequests.find(l => l.empId === emp.id && l.status === 'Approved' && l.startDate <= w.date && l.endDate >= w.date);
                                    if (leaveReq) {
                                        return (
                                            <div key={w.date} className="p-2 min-w-[130px]">
                                                <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-lg p-2 flex flex-col items-center justify-center h-full min-h-[50px] opacity-70 cursor-not-allowed">
                                                    <span className="material-symbols-outlined text-slate-400 text-[18px]">beach_access</span>
                                                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">On Leave</div>
                                                </div>
                                            </div>
                                        );
                                    }

                                    // 2. Fetch specific shift or default
                                    const sa = shiftAssignments.find(a => a.empId === emp.id && a.date === w.date);
                                    const activeShiftId = sa ? sa.shiftId : emp.shiftId;
                                    const shiftObj = shifts.find(s => s.id === activeShiftId);
                                    const isHoliday = holidays.some(h => h.date === w.date);

                                    return (
                                        <div key={w.date} className={`p-2 min-w-[130px] flex flex-col gap-1.5 ${isHoliday ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                                            {/* Current shift chip */}
                                            {shiftObj ? (
                                                <div className={`border rounded-lg px-2 py-1 flex flex-col justify-center ${getShiftStyling(shiftObj.name).base}`}>
                                                    <div className={`text-[10px] font-bold leading-tight ${getShiftStyling(shiftObj.name).core}`}>{shiftObj.name}</div>
                                                    <div className="text-[10px] opacity-60 font-medium">{shiftObj.start} – {shiftObj.end}</div>
                                                </div>
                                            ) : (
                                                <div className="border border-dashed border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 flex items-center justify-center min-h-[32px]">
                                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                                        {isPublished ? 'Locked' : 'Unassigned'}
                                                    </span>
                                                </div>
                                            )}
                                            {/* Native select — simple, always works */}
                                            {!isPublished && (
                                                <select
                                                    value={activeShiftId && shifts.find(s => s.id === activeShiftId) ? activeShiftId : ''}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        if (val === '__unassign__') handleUnassignShift(emp.id, w.date);
                                                        else if (val) handleAssignShift(emp.id, w.date, val);
                                                    }}
                                                    className="w-full text-[10px] font-semibold border border-slate-200 dark:border-slate-700 rounded-lg px-1.5 py-1 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 cursor-pointer focus:ring-2 focus:ring-[#4F46E5]/30 focus:border-[#4F46E5] outline-none"
                                                >
                                                    <option value="">— Pick shift —</option>
                                                    {shifts.map(s => (
                                                        <option key={s.id} value={s.id}>
                                                            {s.name} ({s.start}–{s.end})
                                                        </option>
                                                    ))}
                                                    {shiftObj && <option value="__unassign__">✕ Remove</option>}
                                                </select>
                                            )}
                                        </div>
                                    );

                                })}
                            </div>
                            );
                        })}

                        {/* Daily Coverage Footer */}
                        <div className="grid bg-slate-50 dark:bg-slate-800/30 min-w-[1500px]" style={{ gridTemplateColumns: '280px 120px repeat(7, minmax(130px, 1fr))' }}>
                            <div className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400" style={{ minWidth: '280px', position: 'sticky', left: 0, backgroundColor: 'inherit', zIndex: 10 }}>Overall Daily Coverage</div>
                            <div className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400" style={{ minWidth: '120px', position: 'sticky', left: '280px', backgroundColor: 'inherit', zIndex: 10, borderRight: '1px solid rgba(0,0,0,0.05)', boxShadow: '4px 0 8px rgba(0, 0, 0, 0.05)' }}></div>
                            
                            {weekDates.map(w => {
                                const counts = getDailyCoverage(w.date);
                                return (
                                <div key={w.date} className="p-2 flex flex-col gap-1.5 min-w-[130px] justify-center">
                                    {Object.entries(counts).map(([shiftName, count]) => {
                                        const styles = getShiftStyling(shiftName);
                                        return (
                                            <div key={shiftName} className={`${styles.base} border px-2 py-0.5 rounded text-[9px] font-bold text-center`}>
                                                {count} {shiftName.split(' ')[0]}
                                            </div>
                                        );
                                    })}
                                </div>
                                );
                            })}
                        </div>
                    </div>
                    ) : (
                    /* MONTH VIEW */
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                        <div className="text-center py-12">
                            <span className="material-symbols-outlined text-6xl text-slate-200 dark:text-slate-700">calendar_month</span>
                            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mt-4">Monthly Overview</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Month view shows 4-week grid with shift coverage heatmap.</p>
                            <div className="mt-6 grid grid-cols-4 gap-4 text-left max-w-4xl mx-auto">
                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                    <h4 className="font-bold text-sm text-slate-700 dark:text-slate-200">Week 1</h4>
                                    <p className="text-xs text-slate-500 mt-1">Mon-Fri coverage: 85%</p>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                    <h4 className="font-bold text-sm text-slate-700 dark:text-slate-200">Week 2</h4>
                                    <p className="text-xs text-slate-500 mt-1">Mon-Fri coverage: 92%</p>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                    <h4 className="font-bold text-sm text-slate-700 dark:text-slate-200">Week 3</h4>
                                    <p className="text-xs text-slate-500 mt-1">Mon-Fri coverage: 78%</p>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                    <h4 className="font-bold text-sm text-slate-700 dark:text-slate-200">Week 4</h4>
                                    <p className="text-xs text-slate-500 mt-1">Mon-Fri coverage: 88%</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    )}

                    {/* Legend */}
                    <div className="mt-6 flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-[#4F46E5]"></div>
                            <span className="text-xs font-medium text-slate-500">Morning Shift</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                            <span className="text-xs font-medium text-slate-500">General Shift</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                            <span className="text-xs font-medium text-slate-500">Night Shift</span>
                        </div>
                    </div>
                </div>
            </main>

            {/* Copy Last Week — Preview & Confirm Modal */}
            {copyPreview && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-6">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">Confirm Copy</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                            Copying assignments from the week starting <span className="font-bold text-slate-700 dark:text-slate-200">{copyPreview.srcLabel}</span>.
                        </p>
                        <div className="space-y-2 mb-6">
                            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                <span className="text-sm text-slate-600 dark:text-slate-300">Shifts found to copy</span>
                                <span className="text-sm font-black text-slate-900 dark:text-white">{copyPreview.total}</span>
                            </div>
                            <div className="flex items-center justify-between px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                                <span className="text-sm text-amber-700 dark:text-amber-400">Skipped (approved leave conflicts)</span>
                                <span className="text-sm font-black text-amber-700 dark:text-amber-400">{copyPreview.leaveSkips}</span>
                            </div>
                            <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                                <span className="text-sm text-emerald-700 dark:text-emerald-400">Will be applied</span>
                                <span className="text-sm font-black text-emerald-700 dark:text-emerald-400">{copyPreview.total - copyPreview.leaveSkips}</span>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setCopyPreview(null)} className="px-4 py-2 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                Cancel
                            </button>
                            <button onClick={executeCopyLastWeek} className="px-5 py-2 bg-[#4F46E5] text-white rounded-lg text-sm font-bold hover:opacity-90 shadow-lg shadow-[#4F46E5]/20">
                                Copy {copyPreview.total - copyPreview.leaveSkips} Shifts
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Department Bulk-Assign Modal */}
            {deptModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-6">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">Apply Shift to Department</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Assigns the selected shift to all active employees in the department for every day of the current week.</p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Department</label>
                                <select
                                    value={deptId}
                                    onChange={e => setDeptId(e.target.value)}
                                    className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent"
                                >
                                    <option value="">Select department...</option>
                                    {(systemSettings?.departments || []).map(d => (
                                        <option key={d.id} value={d.name}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Shift</label>
                                <select
                                    value={deptShiftId}
                                    onChange={e => setDeptShiftId(e.target.value)}
                                    className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent"
                                >
                                    <option value="">Select shift...</option>
                                    {shifts.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.start}–{s.end})</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setDeptModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleDeptAssign} className="px-5 py-2 bg-[#4F46E5] text-white rounded-lg text-sm font-bold hover:opacity-90 shadow-lg shadow-[#4F46E5]/20">
                                Apply to Week
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
