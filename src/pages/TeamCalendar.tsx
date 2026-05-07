import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useAppData } from '../context/AppDataContext';
import * as XLSX from 'xlsx';

// ─── Leave type → colour palette ─────────────────────────────────────────────
const LEAVE_COLORS: Record<string, { bg: string; ring: string; text: string; light: string; hex: string; isPending?: boolean }> = {
    Annual:          { bg: 'bg-blue-500',    ring: 'ring-blue-400',   text: 'text-blue-700',    light: 'bg-blue-50 border-blue-200',    hex: '#3b82f6' },
    Casual:          { bg: 'bg-indigo-500',  ring: 'ring-indigo-400', text: 'text-indigo-700',  light: 'bg-indigo-50 border-indigo-200',  hex: '#6366f1' },
    Earned:          { bg: 'bg-violet-500',  ring: 'ring-violet-400', text: 'text-violet-700',  light: 'bg-violet-50 border-violet-200',  hex: '#8b5cf6' },
    Medical:         { bg: 'bg-rose-500',    ring: 'ring-rose-400',   text: 'text-rose-700',    light: 'bg-rose-50 border-rose-200',    hex: '#f43f5e' },
    Hospitalization: { bg: 'bg-red-600',     ring: 'ring-red-400',    text: 'text-red-700',     light: 'bg-red-50 border-red-200',     hex: '#dc2626' },
    Maternity:       { bg: 'bg-pink-500',    ring: 'ring-pink-400',   text: 'text-pink-700',    light: 'bg-pink-50 border-pink-200',    hex: '#ec4899' },
    Paternity:       { bg: 'bg-cyan-500',    ring: 'ring-cyan-400',   text: 'text-cyan-700',    light: 'bg-cyan-50 border-cyan-200',    hex: '#06b6d4' },
    Unpaid:          { bg: 'bg-slate-400',   ring: 'ring-slate-300',  text: 'text-slate-600',   light: 'bg-slate-50 border-slate-200',   hex: '#94a3b8' },
    Custom:          { bg: 'bg-amber-500',   ring: 'ring-amber-400',  text: 'text-amber-700',   light: 'bg-amber-50 border-amber-200',   hex: '#f59e0b' },
    _default:        { bg: 'bg-teal-500',    ring: 'ring-teal-400',   text: 'text-teal-700',    light: 'bg-teal-50 border-teal-200',    hex: '#14b8a6' },
    Pending:         { bg: 'bg-orange-400',  ring: 'ring-orange-300', text: 'text-orange-700',  light: 'bg-orange-50 border-orange-300 border-dashed', hex: '#fb923c', isPending: true },
};
function leaveColor(type: string) { return LEAVE_COLORS[type] ?? LEAVE_COLORS._default; }

// ─── Understaffing threshold: if ≥ 30% of active filtered employees are off ──
const UNDERSTAFFED_PCT = 0.30;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isoDateStr(y: number, m: number, d: number) {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
function isoToday() { return new Date().toISOString().split('T')[0]; }
function monthName(m: number) {
    return ['January','February','March','April','May','June','July','August','September','October','November','December'][m];
}
function initials(name: string) { return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }

const WEEKDAYS      = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const WEEKDAYS_FULL = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

// ─── Types ────────────────────────────────────────────────────────────────────
interface DayEntry { empId: string; name: string; avatar?: string; dept: string; leaveType: string; startDate: string; endDate: string; status: 'Approved' | 'Pending' | 'Rejected'; shiftName?: string; }
interface DayData  { dateStr: string; entries: DayEntry[]; isHoliday: boolean; holidayName?: string; isWeekend: boolean; isToday: boolean; isOtherMonth: boolean; workingCount: number; totalActive: number; isUnderstaffed: boolean; pendingCount: number; }

// ─── Dot Tooltip (hover employee card) ────────────────────────────────────────
function DotTooltip({ entry, onClose }: { entry: DayEntry & { anchorRect: DOMRect }; onClose: () => void }) {
    const c = leaveColor(entry.leaveType);
    const ref = useRef<HTMLDivElement>(null);

    // Position the tooltip to the right of the dot, clamped to viewport
    const [pos, setPos] = useState({ top: 0, left: 0 });
    useEffect(() => {
        if (!ref.current) return;
        const r = entry.anchorRect;
        const th = ref.current.offsetHeight;
        const tw = ref.current.offsetWidth;
        let top  = r.top + window.scrollY + r.height / 2 - th / 2;
        let left = r.right + window.scrollX + 8;
        if (left + tw > window.innerWidth - 16) left = r.left + window.scrollX - tw - 8;
        if (top < 8) top = 8;
        if (top + th > window.innerHeight - 8) top = window.innerHeight - th - 8;
        setPos({ top, left });
    }, [entry.anchorRect]);

    return (
        <div
            ref={ref}
            style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
            className="pointer-events-none animate-in fade-in slide-in-from-left-2 duration-150"
        >
            <div className={`bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 w-56`}>
                {/* Header row */}
                <div className="flex items-center gap-3 mb-3">
                    <div className={`size-10 rounded-xl flex items-center justify-center text-[12px] font-black text-white overflow-hidden shrink-0 ${c.bg}`}>
                        {entry.avatar ? <img src={entry.avatar} alt={entry.name} className="size-full object-cover" /> : initials(entry.name)}
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-black text-slate-900 dark:text-white truncate">{entry.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{entry.dept}</p>
                    </div>
                </div>
                {/* Leave details */}
                <div className={`flex items-start gap-2 p-2.5 rounded-xl border ${c.light} ${entry.status === 'Pending' ? 'border-dashed' : ''}`}>
                    <span className="material-symbols-outlined text-[14px] mt-0.5 shrink-0" style={{ color: leaveColor(entry.leaveType).hex }}>beach_access</span>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <p className={`text-[10px] font-black ${c.text}`}>{entry.leaveType} Leave</p>
                            {entry.status === 'Pending' && <span className="text-[8px] font-black text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-full">PENDING</span>}
                        </div>
                        <p className="text-[9px] text-slate-500 mt-0.5">{entry.startDate} → {entry.endDate}</p>
                        {entry.shiftName && <p className="text-[9px] text-indigo-500 mt-0.5">Shift: {entry.shiftName}</p>}
                    </div>
                </div>
            </div>
            {/* Caret */}
            <div className="absolute left-[-6px] top-1/2 -translate-y-1/2 w-0 h-0
                border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[6px] border-r-white dark:border-r-slate-900" />
        </div>
    );
}

// ─── Capacity badge per day cell ─────────────────────────────────────────────
function CapacityPill({ working, total, isUnderstaffed }: { working: number; total: number; isUnderstaffed: boolean }) {
    const pct = total > 0 ? Math.round((working / total) * 100) : 100;
    return (
        <div className="flex items-center gap-1 mt-1.5">
            <div className="flex-1 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all ${isUnderstaffed ? 'bg-rose-400' : pct >= 80 ? 'bg-emerald-400' : 'bg-amber-400'}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className={`text-[8px] font-black tabular-nums ${isUnderstaffed ? 'text-rose-500' : 'text-slate-400'}`}>
                {working}/{total}
            </span>
        </div>
    );
}

// ─── Day Detail Drawer ────────────────────────────────────────────────────────
function DayDrawer({
    day, employees, totalActive, onClose, onRequestLeave,
}: {
    day: DayData; employees: any[]; totalActive: number; onClose: () => void; onRequestLeave?: () => void;
}) {
    const dateObj    = new Date(day.dateStr + 'T00:00:00');
    const weekdayName = WEEKDAYS_FULL[(dateObj.getDay() + 6) % 7];
    const onLeaveIds  = new Set(day.entries.map(e => e.empId));
    const working     = employees.filter(e => e.status === 'Active' && !onLeaveIds.has(e.id));
    const pct         = totalActive > 0 ? Math.round((working.length / totalActive) * 100) : 100;

    return (
        <>
            <div className="fixed inset-0 z-[200] bg-black/20 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed top-0 right-0 h-full w-[440px] z-[201] bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col">
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between shrink-0">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{weekdayName}</p>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                            {dateObj.getDate()} {monthName(dateObj.getMonth())} {dateObj.getFullYear()}
                        </h2>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {day.isToday && <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">Today</span>}
                            {day.isUnderstaffed && (
                                <span className="text-[10px] font-black text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[11px]">warning</span>Understaffed
                                </span>
                            )}
                            {day.isHoliday && (
                                <span className="text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[11px]">celebration</span>{day.holidayName}
                                </span>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="size-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border-none bg-transparent cursor-pointer">
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                {/* Capacity section */}
                <div className="px-6 py-5 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 shrink-0 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Team Capacity</span>
                        <span className={`text-xs font-black ${day.isUnderstaffed ? 'text-rose-600' : 'text-slate-700 dark:text-slate-300'}`}>
                            {working.length} working · {day.entries.length} off
                        </span>
                    </div>
                    <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${day.isUnderstaffed ? 'bg-gradient-to-r from-rose-400 to-orange-400' : 'bg-gradient-to-r from-indigo-500 to-emerald-400'}`}
                            style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold ${day.isUnderstaffed ? 'text-rose-500' : 'text-slate-400'}`}>
                            {pct}% available {day.isUnderstaffed ? '— leave requests restricted' : ''}
                        </span>
                        {/* Request Leave button — disabled when understaffed */}
                        <button
                            onClick={day.isUnderstaffed ? undefined : onRequestLeave}
                            disabled={day.isUnderstaffed}
                            title={day.isUnderstaffed ? 'Team is understaffed on this day. Leave requests are restricted.' : 'Submit a leave request for this day'}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all border-none
                                ${day.isUnderstaffed
                                    ? 'bg-rose-50 text-rose-400 cursor-not-allowed border border-rose-200'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer shadow-sm'}`}
                        >
                            <span className="material-symbols-outlined text-[13px]">
                                {day.isUnderstaffed ? 'block' : 'add_circle'}
                            </span>
                            {day.isUnderstaffed ? 'Blocked' : 'Request Leave'}
                        </button>
                    </div>

                    {/* Understaffed warning banner */}
                    {day.isUnderstaffed && (
                        <div className="flex items-start gap-2.5 p-3 bg-rose-50 border border-rose-200 rounded-xl">
                            <span className="material-symbols-outlined text-rose-500 text-[18px] mt-0.5 shrink-0">warning</span>
                            <p className="text-[10px] font-bold text-rose-700 leading-relaxed">
                                {Math.round((1 - pct / 100) * 100)}% of the team is on leave. New leave requests for this day require manager override.
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto">
                    {/* On Leave */}
                    {day.entries.length > 0 && (
                        <div className="px-6 py-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">On Leave ({day.entries.length})</p>
                            <div className="space-y-2">
                                {day.entries.map((e, i) => {
                                    const c = leaveColor(e.leaveType);
                                    return (
                                        <div key={e.empId + i} className={`flex items-center gap-3 p-3 rounded-xl border ${c.light}`}>
                                            <div className={`size-10 rounded-xl flex items-center justify-center text-[11px] font-black text-white overflow-hidden shrink-0 ${c.bg}`}>
                                                {e.avatar ? <img src={e.avatar} alt={e.name} className="size-full object-cover" /> : initials(e.name)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-black text-slate-900 dark:text-slate-100 truncate">{e.name}</p>
                                                <p className="text-[10px] text-slate-500">{e.dept}</p>
                                                <p className="text-[9px] text-slate-400">{e.startDate} → {e.endDate}</p>
                                            </div>
                                            <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full border ${c.light} ${c.text} shrink-0`}>{e.leaveType}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Working */}
                    {working.length > 0 && (
                        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Working ({working.length})</p>
                            <div className="space-y-1">
                                {working.slice(0, 20).map(emp => (
                                    <div key={emp.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                        <div className={`size-7 rounded-full flex items-center justify-center text-[9px] font-black text-white overflow-hidden shrink-0 ${(emp as any).colorClass || 'bg-indigo-500'}`}>
                                            {emp.avatar ? <img src={emp.avatar} alt={emp.name} className="size-full object-cover" /> : initials(emp.name)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{emp.name}</p>
                                            <p className="text-[10px] text-slate-400">{(emp as any).dept}</p>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <div className="size-1.5 rounded-full bg-emerald-400" />
                                            <span className="text-[9px] font-bold text-emerald-600">Working</span>
                                        </div>
                                    </div>
                                ))}
                                {working.length > 20 && <p className="text-[10px] text-slate-400 text-center py-2">+{working.length - 20} more</p>}
                            </div>
                        </div>
                    )}

                    {day.entries.length === 0 && (
                        <div className="px-6 py-12 text-center">
                            <span className="material-symbols-outlined text-4xl text-slate-200 dark:text-slate-700">beach_access</span>
                            <p className="text-sm font-bold text-slate-400 mt-2">Full team available 💪</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TeamCalendar() {
    const { leaveRequests, employees, holidays, shifts } = useAppData();

    const today = new Date();
    const [viewYear, setViewYear]   = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());
    const [viewMode, setViewMode]   = useState<'month' | 'week' | 'list'>('month');
    const [deptFilter, setDeptFilter] = useState('All');
    const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
    const [hoveredEntry, setHoveredEntry] = useState<(DayEntry & { anchorRect: DOMRect }) | null>(null);
    const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Departments
    const depts = useMemo(() => {
        const set = new Set<string>();
        employees.forEach(e => { if ((e as any).dept) set.add((e as any).dept); });
        return ['All', ...Array.from(set).sort()];
    }, [employees]);

    // Active employees (scoped to dept filter)
    const filteredEmps = useMemo(() =>
        employees.filter(e => e.status === 'Active' && (deptFilter === 'All' || (e as any).dept === deptFilter)),
        [employees, deptFilter]);

    const totalActive = filteredEmps.length;

    // Approved + Pending leaves (scoped to dept filter)
    const allLeaves = useMemo(() =>
        leaveRequests.filter(r => (r.status === 'Approved' || r.status === 'Pending') && (deptFilter === 'All' || r.dept === deptFilter)),
        [leaveRequests, deptFilter]);

    // Holiday lookup
    const holidayMap = useMemo(() => {
        const m: Record<string, string> = {};
        holidays.forEach(h => { m[h.date] = h.name; });
        return m;
    }, [holidays]);

    // Build DayData
    const buildDay = useCallback((dateStr: string, isOtherMonth = false): DayData => {
        const d   = new Date(dateStr + 'T00:00:00');
        const dow = (d.getDay() + 6) % 7;
        const isWeekend = dow >= 5;
        const isToday   = dateStr === isoToday();
        const holidayName = holidayMap[dateStr];

        const entries: DayEntry[] = allLeaves
            .filter(r => r.startDate <= dateStr && r.endDate >= dateStr)
            .map(r => {
                const emp = employees.find(e => e.id === r.empId);
                const shift = emp?.shiftId && shifts ? shifts.find(s => s.id === emp.shiftId) : (shifts?.[0] || { name: 'General 9-6' });
                return {
                    empId: r.empId, name: r.name, avatar: r.avatar,
                    dept: r.dept, leaveType: r.type,
                    startDate: r.startDate, endDate: r.endDate,
                    status: r.status as 'Approved' | 'Pending' | 'Rejected',
                    shiftName: shift?.name
                };
            });

        const approvedCount = entries.filter(e => e.status === 'Approved').length;
        const pendingCount = entries.filter(e => e.status === 'Pending').length;
        const workingCount   = Math.max(0, totalActive - approvedCount);
        const isUnderstaffed = !isOtherMonth && !isWeekend && totalActive > 0 && approvedCount / totalActive >= UNDERSTAFFED_PCT;

        return { dateStr, entries, isHoliday: !!holidayName, holidayName, isWeekend, isToday, isOtherMonth, workingCount, totalActive, isUnderstaffed, pendingCount };
    }, [allLeaves, holidayMap, totalActive, employees, shifts]);

    // Month grid
    const monthDays = useMemo((): DayData[] => {
        const firstDay = new Date(viewYear, viewMonth, 1);
        const lastDay  = new Date(viewYear, viewMonth + 1, 0);
        const startDow = (firstDay.getDay() + 6) % 7;
        const days: DayData[] = [];
        for (let i = startDow - 1; i >= 0; i--) {
            const d = new Date(viewYear, viewMonth, -i);
            days.push(buildDay(isoDateStr(d.getFullYear(), d.getMonth(), d.getDate()), true));
        }
        for (let d = 1; d <= lastDay.getDate(); d++) {
            days.push(buildDay(isoDateStr(viewYear, viewMonth, d), false));
        }
        const trailing = (7 - (days.length % 7)) % 7;
        for (let d = 1; d <= trailing; d++) {
            const dt = new Date(viewYear, viewMonth + 1, d);
            days.push(buildDay(isoDateStr(dt.getFullYear(), dt.getMonth(), dt.getDate()), true));
        }
        return days;
    }, [viewYear, viewMonth, buildDay]);

    // Week strip
    const weekDays = useMemo((): DayData[] => {
        const anchor = new Date(viewYear, viewMonth, 1);
        const anchorDow = (anchor.getDay() + 6) % 7;
        const weekStart = new Date(anchor);
        weekStart.setDate(anchor.getDate() - anchorDow);
        const td = new Date();
        if (td.getFullYear() === viewYear && td.getMonth() === viewMonth) {
            const d = (td.getDay() + 6) % 7;
            weekStart.setFullYear(td.getFullYear()); weekStart.setMonth(td.getMonth()); weekStart.setDate(td.getDate() - d);
        }
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(weekStart); d.setDate(weekStart.getDate() + i);
            return buildDay(isoDateStr(d.getFullYear(), d.getMonth(), d.getDate()), d.getMonth() !== viewMonth);
        });
    }, [viewYear, viewMonth, buildDay]);

    // List leaves
    const listLeaves = useMemo(() => {
        const start  = isoDateStr(viewYear, viewMonth, 1);
        const endDt  = new Date(viewYear, viewMonth + 1, 0);
        const end    = isoDateStr(endDt.getFullYear(), endDt.getMonth(), endDt.getDate());
        return allLeaves.filter(r => r.endDate >= start && r.startDate <= end)
            .sort((a, b) => a.startDate.localeCompare(b.startDate));
    }, [allLeaves, viewYear, viewMonth]);

    // KPIs
    const kpis = useMemo(() => {
        const start = isoDateStr(viewYear, viewMonth, 1);
        const endDt = new Date(viewYear, viewMonth + 1, 0);
        const end   = isoDateStr(endDt.getFullYear(), endDt.getMonth(), endDt.getDate());
        const thisMonth = allLeaves.filter(r => r.endDate >= start && r.startDate <= end);
        const uniqueEmp = new Set(thisMonth.map(r => r.empId)).size;
        const totalDays = thisMonth.reduce((s, r) => s + r.totalDays, 0);
        const peakDay   = monthDays.filter(d => !d.isOtherMonth).sort((a, b) => b.entries.length - a.entries.length)[0];
        const understaffedDays = monthDays.filter(d => d.isUnderstaffed).length;
        return { total: thisMonth.length, uniqueEmp, totalDays, peakCount: peakDay?.entries.length ?? 0, peakDate: peakDay?.dateStr, understaffedDays };
    }, [allLeaves, viewYear, viewMonth, monthDays]);

    const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
    const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };
    const goToday   = () => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); };

    // Export functions
    const handlePrint = () => window.print();

    const handleExportXLSX = () => {
        const data = allLeaves.map(r => ({
            'Employee': r.name,
            'ID': r.empId,
            'Department': r.dept,
            'Leave Type': r.type,
            'Start Date': r.startDate,
            'End Date': r.endDate,
            'Total Days': r.totalDays,
            'Status': r.status,
            'Duration': r.durationStr,
            'Reason': r.reason || ''
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Leave Calendar');
        const colWidths = [{ wch: 20 }, { wch: 10 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 30 }];
        ws['!cols'] = colWidths;
        XLSX.writeFile(wb, `Team_Calendar_${viewYear}_${monthName(viewMonth)}.xlsx`);
    };

    // Dot hover handlers
    const handleDotEnter = useCallback((e: React.MouseEvent<HTMLDivElement>, entry: DayEntry) => {
        if (hoverTimer.current) clearTimeout(hoverTimer.current);
        const rect = e.currentTarget.getBoundingClientRect();
        setHoveredEntry({ ...entry, anchorRect: rect });
    }, []);
    const handleDotLeave = useCallback(() => {
        hoverTimer.current = setTimeout(() => setHoveredEntry(null), 180);
    }, []);

    // ── DayCell (month view) ──────────────────────────────────────────────────
    const DayCell = ({ day }: { day: DayData }) => {
        const dayNum = parseInt(day.dateStr.split('-')[2]);
        const maxDots = 7; // show up to 7 colored dots (1 per employee)
        const shown   = day.entries.slice(0, maxDots);
        const extra   = day.entries.length - maxDots;

        return (
            <div
                onClick={() => !day.isOtherMonth && setSelectedDay(day)}
                className={`relative min-h-[110px] p-2 border-b border-r border-slate-100 dark:border-slate-800 transition-all group select-none
                    ${day.isOtherMonth ? 'bg-slate-50/40 dark:bg-slate-950/40 cursor-default' : 'cursor-pointer'}
                    ${day.isWeekend && !day.isOtherMonth ? 'bg-slate-50 dark:bg-slate-800/30' : 'bg-white dark:bg-slate-900'}
                    ${day.isToday && !day.isOtherMonth ? '!bg-indigo-50/50 dark:!bg-indigo-950/20 ring-inset ring-2 ring-indigo-400/30' : ''}
                    ${day.isHoliday && !day.isOtherMonth ? '!bg-amber-50/40 dark:!bg-amber-950/10' : ''}
                    ${day.isUnderstaffed ? '!bg-rose-50/50 dark:!bg-rose-950/10' : ''}
                    ${!day.isOtherMonth ? 'hover:bg-indigo-50/40 dark:hover:bg-slate-800/50' : ''}
                `}
            >
                {/* Understaffed stripe border-top */}
                {day.isUnderstaffed && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-400 to-orange-400 rounded-t" />
                )}

                {/* Day number + holiday dot */}
                <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition-all leading-none
                        ${day.isToday && !day.isOtherMonth ? 'bg-indigo-600 text-white' : ''}
                        ${day.isOtherMonth ? 'text-slate-300 dark:text-slate-700' : day.isWeekend ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}
                        ${!day.isToday && !day.isOtherMonth ? 'group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 group-hover:text-indigo-600' : ''}
                    `}>{dayNum}</span>

                    <div className="flex items-center gap-1">
                        {day.isHoliday && !day.isOtherMonth && (
                            <span title={day.holidayName} className="size-1.5 rounded-full bg-amber-400 shrink-0" />
                        )}
                        {day.isUnderstaffed && (
                            <span title="Team understaffed" className="material-symbols-outlined text-[11px] text-rose-400">warning</span>
                        )}
                    </div>
                </div>

                {/* Colored dots — one per employee on leave */}
                {!day.isOtherMonth && shown.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1">
                        {shown.map((entry, i) => {
                            const c = entry.status === 'Pending' ? leaveColor('Pending') : leaveColor(entry.leaveType);
                            return (
                                <div
                                    key={entry.empId + i}
                                    onMouseEnter={e => handleDotEnter(e, entry)}
                                    onMouseLeave={handleDotLeave}
                                    onClick={ev => { ev.stopPropagation(); handleDotEnter(ev, entry); }}
                                    title={`${entry.name} — ${entry.leaveType} ${entry.status === 'Pending' ? '(Pending)' : ''}`}
                                    className={`size-5 rounded-full flex items-center justify-center text-[7px] font-black text-white overflow-hidden border-2 border-white dark:border-slate-900 cursor-default shrink-0 ${c.bg} ring-1 ${c.ring} ring-offset-0 transition-all hover:scale-125 hover:z-10 hover:shadow-lg ${entry.status === 'Pending' ? 'border-dashed border-orange-400' : ''}`}
                                    style={{ position: 'relative' }}
                                >
                                    {entry.avatar
                                        ? <img src={entry.avatar} alt={entry.name} className="size-full object-cover" />
                                        : initials(entry.name)}
                                </div>
                            );
                        })}
                        {extra > 0 && (
                            <div className="size-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[7px] font-black text-slate-600 dark:text-slate-300 border-2 border-white dark:border-slate-900 shrink-0">
                                +{extra}
                            </div>
                        )}
                    </div>
                )}

                {/* Capacity bar + counter */}
                {!day.isOtherMonth && !day.isWeekend && (
                    <CapacityPill working={day.workingCount} total={day.totalActive} isUnderstaffed={day.isUnderstaffed} />
                )}
            </div>
        );
    };

    // Dismiss tooltip on scroll
    useEffect(() => {
        const dismiss = () => setHoveredEntry(null);
        window.addEventListener('scroll', dismiss, true);
        return () => window.removeEventListener('scroll', dismiss, true);
    }, []);

    return (
        <div className="flex h-screen overflow-hidden bg-[#F8FAFC] dark:bg-slate-950 font-display text-slate-900 dark:text-slate-100">
            <Sidebar activeTab="Team Calendar" />
            <main className="flex flex-col h-full overflow-hidden ml-[280px] flex-1">
                <Header title="Team Calendar" subtitle="Team availability · leave coverage · understaffing alerts" />

                <div className="flex-1 overflow-y-auto px-8 pb-8 bg-[#F8FAFC] dark:bg-slate-950">

                    {/* ── KPI Row ─────────────────────────────────────────── */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8 mb-6 max-w-[1600px] mx-auto">
                        {[
                            { label: 'Leaves This Month',  value: kpis.total,            icon: 'event_busy',     color: 'indigo', sub: 'approved' },
                            { label: 'Employees Affected', value: kpis.uniqueEmp,        icon: 'people',         color: 'amber',  sub: 'unique' },
                            { label: 'Total Leave Days',   value: kpis.totalDays,        icon: 'calendar_month', color: 'violet', sub: 'days off' },
                            { label: 'Peak Day',           value: kpis.peakCount,        icon: 'trending_up',    color: 'blue',   sub: kpis.peakDate ?? '—' },
                            { label: 'Understaffed Days',  value: kpis.understaffedDays, icon: 'warning',        color: 'rose',   sub: '≥30% off' },
                        ].map(k => (
                            <div key={k.label}
                                className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex items-start gap-3
                                    ${k.color === 'rose' && kpis.understaffedDays > 0 ? 'border-rose-300 dark:border-rose-800 bg-rose-50/30 dark:bg-rose-950/10' : ''}`}>
                                <div className={`size-9 rounded-xl flex items-center justify-center shrink-0
                                    ${k.color === 'indigo' ? 'bg-indigo-50 text-indigo-600' :
                                      k.color === 'amber'  ? 'bg-amber-50 text-amber-600' :
                                      k.color === 'violet' ? 'bg-violet-50 text-violet-600' :
                                      k.color === 'blue'   ? 'bg-blue-50 text-blue-600' :
                                                             'bg-rose-50 text-rose-500'}`}>
                                    <span className="material-symbols-outlined text-[18px]">{k.icon}</span>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 truncate">{k.label}</p>
                                    <p className={`text-2xl font-black mt-0.5 ${k.color === 'rose' && kpis.understaffedDays > 0 ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>{k.value}</p>
                                    <p className="text-[9px] text-slate-400">{k.sub}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ── Controls ─────────────────────────────────────────── */}
                    <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                            <button onClick={prevMonth} className="size-9 flex items-center justify-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm cursor-pointer">
                                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                            </button>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white min-w-[200px] text-center">{monthName(viewMonth)} {viewYear}</h2>
                            <button onClick={nextMonth} className="size-9 flex items-center justify-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm cursor-pointer">
                                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                            </button>
                            <button onClick={goToday} className="px-4 py-2 text-xs font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all cursor-pointer">Today</button>
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                            {/* Dept filter */}
                            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-1 shadow-sm overflow-x-auto max-w-[420px]">
                                {depts.slice(0, 7).map(d => (
                                    <button key={d} onClick={() => setDeptFilter(d)}
                                        className={`px-3 py-1.5 text-[10px] font-black rounded-lg whitespace-nowrap transition-all cursor-pointer
                                            ${deptFilter === d ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 bg-transparent'}`}>
                                        {d}
                                    </button>
                                ))}
                            </div>
                            {/* View toggle */}
                            <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-1 shadow-sm">
                                {(['month','week','list'] as const).map(mode => (
                                    <button key={mode} onClick={() => setViewMode(mode)}
                                        className={`px-3 py-1.5 text-[10px] font-black capitalize rounded-lg transition-all cursor-pointer
                                            ${viewMode === mode ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 bg-transparent'}`}>
                                        {mode}
                                    </button>
                                ))}
                            </div>
                            {/* Print & Export */}
                            <div className="flex items-center gap-2">
                                <button onClick={handlePrint} title="Print Calendar" className="px-3 py-1.5 text-[10px] font-black text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[14px]">print</span>
                                    Print
                                </button>
                                <button onClick={handleExportXLSX} title="Export to Excel" className="px-3 py-1.5 text-[10px] font-black text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[14px]">table_view</span>
                                    Excel
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── Legend + Understaffed note ─────────────────────── */}
                    <div className="max-w-[1600px] mx-auto mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                        {Object.entries(LEAVE_COLORS).filter(([k]) => k !== '_default' && k !== 'Pending').map(([type, c]) => (
                            <div key={type} className="flex items-center gap-1.5">
                                <div className={`size-2.5 rounded-full ${c.bg}`} />
                                <span className="text-[10px] font-bold text-slate-500">{type}</span>
                            </div>
                        ))}
                        <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200 dark:border-slate-700">
                            <div className="size-2.5 rounded-full bg-orange-400 border border-dashed border-orange-600" />
                            <span className="text-[10px] font-bold text-orange-600">Pending</span>
                        </div>
                        <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200 dark:border-slate-700">
                            <div className="size-2.5 rounded-full bg-amber-400" />
                            <span className="text-[10px] font-bold text-slate-500">Holiday</span>
                        </div>
                        <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200 dark:border-slate-700">
                            <span className="material-symbols-outlined text-[12px] text-rose-400">warning</span>
                            <span className="text-[10px] font-bold text-rose-500">Understaffed (≥30% off)</span>
                        </div>
                        <div className="ml-auto flex items-center gap-3 text-[10px] font-bold text-slate-400">
                            <span className="flex items-center gap-1"><div className="w-6 h-1 rounded bg-emerald-400" /> ≥80% available</span>
                            <span className="flex items-center gap-1"><div className="w-6 h-1 rounded bg-amber-400" /> &lt;80%</span>
                            <span className="flex items-center gap-1"><div className="w-6 h-1 rounded bg-rose-400" /> Understaffed</span>
                        </div>
                    </div>

                    {/* ── Calendar ─────────────────────────────────────────── */}
                    <div className="max-w-[1600px] mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">

                        {/* MONTH VIEW */}
                        {viewMode === 'month' && (
                            <>
                                <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                                    {WEEKDAYS.map(d => (
                                        <div key={d} className={`py-3 text-center text-[10px] font-black uppercase tracking-widest
                                            ${d === 'Sat' || d === 'Sun' ? 'text-slate-300 dark:text-slate-600' : 'text-slate-400 dark:text-slate-500'}`}>{d}</div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7">
                                    {monthDays.map((day, i) => <DayCell key={day.dateStr + i} day={day} />)}
                                </div>
                            </>
                        )}

                        {/* WEEK VIEW */}
                        {viewMode === 'week' && (
                            <>
                                <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                                    {weekDays.map((day, i) => (
                                        <div key={day.dateStr}
                                            className={`py-3 text-center border-r border-slate-100 dark:border-slate-800 last:border-0
                                                ${day.isToday ? 'bg-indigo-50 dark:bg-indigo-950/30' : ''}
                                                ${day.isUnderstaffed ? 'bg-rose-50 dark:bg-rose-950/10' : ''}`}>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{WEEKDAYS[i]}</p>
                                            <p className={`text-lg font-black mt-0.5 ${day.isToday ? 'text-indigo-600' : 'text-slate-700 dark:text-slate-200'}`}>
                                                {parseInt(day.dateStr.split('-')[2])}
                                            </p>
                                            {day.isUnderstaffed && <span className="text-[8px] font-black text-rose-500 flex items-center justify-center gap-0.5"><span className="material-symbols-outlined text-[10px]">warning</span>Short</span>}
                                            {day.isHoliday && <div className="text-[8px] font-black text-amber-600 truncate px-1">{day.holidayName}</div>}
                                        </div>
                                    ))}
                                </div>
                                <div className="overflow-x-auto">
                                    {filteredEmps.slice(0, 30).map(emp => {
                                        const empLeavesByDay = weekDays.map(day =>
                                            allLeaves.find(r => r.empId === emp.id && r.startDate <= day.dateStr && r.endDate >= day.dateStr) ?? null
                                        );
                                        const hasAnyLeave = empLeavesByDay.some(Boolean);
                                        return (
                                            <div key={emp.id}
                                                className={`grid border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors ${!hasAnyLeave ? 'opacity-50' : ''}`}
                                                style={{ gridTemplateColumns: '200px repeat(7, 1fr)' }}>
                                                <div className="flex items-center gap-2 px-4 py-2.5 border-r border-slate-100 dark:border-slate-800">
                                                    <div className={`size-7 rounded-full flex items-center justify-center text-[9px] font-black text-white overflow-hidden shrink-0 ${(emp as any).colorClass || 'bg-indigo-500'}`}>
                                                        {emp.avatar ? <img src={emp.avatar} alt={emp.name} className="size-full object-cover" /> : initials(emp.name)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{emp.name}</p>
                                                        <p className="text-[9px] text-slate-400">{(emp as any).dept}</p>
                                                    </div>
                                                </div>
                                                {empLeavesByDay.map((leave, di) => {
                                                    const day = weekDays[di];
                                                    const c   = leave ? (leave.status === 'Pending' ? leaveColor('Pending') : leaveColor(leave.type)) : null;
                                                    return (
                                                        <div key={di}
                                                            onClick={() => setSelectedDay(day)}
                                                            className={`border-r border-slate-50 dark:border-slate-800/50 last:border-0 p-1.5 cursor-pointer
                                                                ${day.isWeekend ? 'bg-slate-50/40' : ''}
                                                                ${day.isToday ? 'bg-indigo-50/20' : ''}
                                                                ${day.isUnderstaffed ? 'bg-rose-50/30' : ''}`}>
                                                            {leave && c && (
                                                                <div className={`h-full min-h-[28px] rounded-lg flex items-center justify-center ${c.bg} ${leave.status === 'Pending' ? 'border-2 border-dashed border-orange-300' : ''}`}>
                                                                    <span className="text-[8px] font-black text-white truncate px-1">{leave.type}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}

                        {/* LIST VIEW */}
                        {viewMode === 'list' && (
                            <div>
                                {listLeaves.length === 0 ? (
                                    <div className="py-20 flex flex-col items-center text-center">
                                        <div className="size-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                                            <span className="material-symbols-outlined text-3xl text-slate-300">beach_access</span>
                                        </div>
                                        <p className="text-sm font-bold text-slate-400">No approved leaves this month</p>
                                        <p className="text-xs text-slate-300 mt-1">Full team working in {monthName(viewMonth)} {viewYear}</p>
                                    </div>
                                ) : (
                                    listLeaves.map((r, i) => {
                                        const c = leaveColor(r.type);
                                        // Check if any day in this leave range is understaffed
                                        const leaveStart = new Date(r.startDate + 'T00:00:00');
                                        const leaveEnd   = new Date(r.endDate   + 'T00:00:00');
                                        let hasUnderstaffedDay = false;
                                        for (let d = new Date(leaveStart); d <= leaveEnd; d.setDate(d.getDate() + 1)) {
                                            const ds = isoDateStr(d.getFullYear(), d.getMonth(), d.getDate());
                                            const dayData = buildDay(ds, false);
                                            if (dayData.isUnderstaffed) { hasUnderstaffedDay = true; break; }
                                        }
                                        return (
                                            <div key={r.id + i}
                                                className={`flex items-start gap-4 px-6 py-4 border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors
                                                    ${hasUnderstaffedDay ? 'bg-rose-50/30 dark:bg-rose-950/10' : ''}`}>
                                                <div className={`w-1 self-stretch rounded-full shrink-0 ${c.bg}`} />
                                                <div className={`size-10 rounded-xl flex items-center justify-center text-[11px] font-black text-white overflow-hidden shrink-0 ${c.bg}`}>
                                                    {r.avatar ? <img src={r.avatar} alt={r.name} className="size-full object-cover" /> : initials(r.name)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="text-sm font-black text-slate-900 dark:text-white">{r.name}</p>
                                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${c.light} ${c.text}`}>{r.type} Leave</span>
                                                        {r.status === 'Pending' && <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-orange-100 border border-orange-300 text-orange-600">PENDING</span>}
                                                        {hasUnderstaffedDay && (
                                                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center gap-0.5">
                                                                <span className="material-symbols-outlined text-[10px]">warning</span>Covers understaffed day
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-0.5">{r.dept} · {r.durationStr}</p>
                                                    {r.reason && <p className="text-[10px] text-slate-400 mt-1 line-clamp-1 italic">"{r.reason}"</p>}
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-xl font-black text-slate-900 dark:text-white">{r.totalDays}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold">day{r.totalDays !== 1 ? 's' : ''}</p>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── Dept Breakdown ────────────────────────────────────── */}
                    {viewMode === 'month' && (
                        <div className="max-w-[1600px] mx-auto mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                            {depts.filter(d => d !== 'All').map(dept => {
                                const deptActive = employees.filter(e => (e as any).dept === dept && e.status === 'Active').length;
                                const deptLeaves = allLeaves.filter(r => r.dept === dept).length;
                                const pct = deptActive ? Math.round((deptLeaves / deptActive) * 100) : 0;
                                const isHigh = deptActive > 0 && deptLeaves / deptActive >= UNDERSTAFFED_PCT;
                                return (
                                    <button key={dept} onClick={() => setDeptFilter(dept === deptFilter ? 'All' : dept)}
                                        className={`bg-white dark:bg-slate-900 rounded-xl border p-4 text-left transition-all shadow-sm cursor-pointer hover:shadow-md
                                            ${deptFilter === dept ? 'border-indigo-400 ring-2 ring-indigo-200' : isHigh ? 'border-rose-300' : 'border-slate-200 dark:border-slate-800'}`}>
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-xs font-black text-slate-500 uppercase tracking-wider truncate">{dept}</p>
                                            {isHigh && <span className="material-symbols-outlined text-[13px] text-rose-400">warning</span>}
                                        </div>
                                        <p className="text-2xl font-black text-slate-900 dark:text-white">
                                            {deptLeaves}<span className="text-sm font-medium text-slate-400 ml-1">leaves</span>
                                        </p>
                                        <div className="mt-2 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full transition-all ${isHigh ? 'bg-rose-400' : 'bg-indigo-500'}`}
                                                style={{ width: `${Math.min(pct * 2, 100)}%` }} />
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1">{deptActive} active · {pct}% on leave</p>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>

            {/* Day Drawer */}
            {selectedDay && (
                <DayDrawer
                    day={selectedDay}
                    employees={filteredEmps}
                    totalActive={totalActive}
                    onClose={() => setSelectedDay(null)}
                    onRequestLeave={() => { setSelectedDay(null); window.location.href = '/leave-requests'; }}
                />
            )}

            {/* Dot hover tooltip */}
            {hoveredEntry && (
                <DotTooltip entry={hoveredEntry} onClose={() => setHoveredEntry(null)} />
            )}
        </div>
    );
}
