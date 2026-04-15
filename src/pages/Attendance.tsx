import React, { useState, useMemo } from 'react';
import DropdownMenu from '../components/DropdownMenu';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useAppData } from '../context/AppDataContext';
import { safeEval } from '../utils/safeEval';
import { useDebounce } from '../hooks/useDebounce';

export default function Attendance() {
    const { 
        attendanceLogs, 
        syncAttendance, 
        regularizeAttendance, 
        complianceSettings,
        checkIn,
        checkOut,
        systemSettings,
        shifts,
        employees,
        bulkImportAttendance
    } = useAppData();

    const [locationFilter, setLocationFilter] = useState('All Locations');
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState('2 mins ago (UTC+6:30)');
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [activeRecord, setActiveRecord] = useState<any>(null);
    const [manualCheckoutTime, setManualCheckoutTime] = useState('18:00');
    const [regularizeReason, setRegularizeReason] = useState('Power Outage');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 20;
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showDevSettings, setShowDevSettings] = useState(false);

    // Personal Mobile Simulator State
    const [simLocation, setSimLocation] = useState(systemSettings.officeLocations[0].id);
    const [isDevModeOverride, setIsDevModeOverride] = useState(false);
    const [isPunching, setIsPunching] = useState(false);
    const [punchSuccess, setPunchSuccess] = useState(false);
    const [dateFilter, setDateFilter] = useState('2023-10-23');
    const debouncedSearch = useDebounce(searchQuery, 300);

    const isDevelopment = import.meta.env.MODE === 'development';

    const activeAdminId = 'EMP-001'; // Mocking active user (Nilar Lwin)
    const hasActiveLog = attendanceLogs.some(l => l.empId === activeAdminId && l.checkOut === '-- : --');

    const handleCheckIn = async () => {
        setIsPunching(true);
        try {
            const selectedLoc = systemSettings.officeLocations.find(l => l.id === simLocation) || systemSettings.officeLocations[0];
            const applyBypass = isDevelopment && isDevModeOverride;
            const gps = applyBypass
                ? { lat: selectedLoc.coords.lat + 0.05, lng: selectedLoc.coords.lng + 0.05 }
                : { lat: selectedLoc.coords.lat + (Math.random() * 0.0001), lng: selectedLoc.coords.lng + (Math.random() * 0.0001) };
            const result = await checkIn(activeAdminId, selectedLoc.name, gps, 'Mobile App');
            if (!result.success) {
                alert(result.message);
            } else {
                setPunchSuccess(true);
                setTimeout(() => setPunchSuccess(false), 1500);
            }
        } catch (err) {
            console.error('[Attendance] Punch-in error:', err);
        } finally {
            setIsPunching(false);
        }
    };

    const handleCheckOutLocal = () => {
        setIsPunching(true);
        try {
            const result = checkOut(activeAdminId);
            if (!result?.success) {
                alert(result?.message || 'Check-out failed.');
            }
        } catch (err) {
            console.error('[Attendance] Punch-out error:', err);
        } finally {
            setIsPunching(false);
        }
    };

    const handleRegularizeSave = () => {
        if (activeRecord) {
            regularizeAttendance(activeRecord.id, manualCheckoutTime, activeAdminId, regularizeReason);
            setActiveModal(null);
        }
    };

    const filteredLogs = useMemo(() => {
        setCurrentPage(1);
        let logs = attendanceLogs;
        if (dateFilter) {
            logs = logs.filter(log => log.date === dateFilter);
        }
        if (locationFilter !== 'All Locations') {
            logs = logs.filter(log => log.location.includes(locationFilter) || log.location === 'Customer Site');
        }
        if (statusFilter) {
            logs = logs.filter(log =>
                statusFilter === 'Late'
                    ? (log.status === 'Late' || log.geofenceStatus === 'Violation')
                    : log.status === statusFilter
            );
        }
        if (debouncedSearch.trim()) {
            const q = debouncedSearch.toLowerCase();
            logs = logs.filter(log =>
                log.name.toLowerCase().includes(q) ||
                log.empId.toLowerCase().includes(q) ||
                log.dept.toLowerCase().includes(q)
            );
        }
        return logs;
    }, [attendanceLogs, dateFilter, locationFilter, statusFilter, debouncedSearch]);

    const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
    const pagedLogs = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const getPageNumbers = () => {
        const pages: (number | '...')[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (currentPage > 3) pages.push('...');
            for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
            if (currentPage < totalPages - 2) pages.push('...');
            pages.push(totalPages);
        }
        return pages;
    };

    // computePenalty — Now uses safeEval instead of eval() for security + V8 optimization
    const penaltyMap = useMemo(() => {
        const map = new Map<string, number>();
        for (const log of filteredLogs) {
            if (!log.penaltyRuleId) { map.set(log.id, log.penaltyAmount || 0); continue; }
            const rule = systemSettings.penaltyRules?.find(r => r.id === log.penaltyRuleId);
            if (!rule) { map.set(log.id, log.penaltyAmount || 0); continue; }

            const emp = employees.find(e => e.id === log.empId);
            const HourlyRate = emp ? (emp.baseSalary || emp.salary || 0) / 160 : 5000;

            let LateMinutes = 0;
            if (log.status === 'Late' && log.checkIn) {
                const [time, modifier] = log.checkIn.split(' ');
                const [hours, minutes] = time.split(':');
                let hr = parseInt(hours, 10);
                if (hr === 12) hr = 0;
                if (modifier === 'PM') hr += 12;
                const checkInMins = hr * 60 + parseInt(minutes, 10);
                LateMinutes = Math.max(0, checkInMins - (9 * 60));
            }

            const isConditionMet = safeEval(rule.condition, { LateMinutes });
            if (isConditionMet) {
                const penalty = safeEval(rule.penaltyFormula, { HourlyRate, LateMinutes });
                map.set(log.id, typeof penalty === 'number' ? penalty : 0);
            } else {
                map.set(log.id, 0);
            }
        }
        return map;
    }, [filteredLogs, systemSettings.penaltyRules, employees]);

    const getPenalty = (logId: string) => penaltyMap.get(logId) ?? 0;

    // KPIs always reflect the full day's data regardless of active filters
    const kpiBase = dateFilter ? attendanceLogs.filter(l => l.date === dateFilter) : attendanceLogs;
    const kpiPresent = kpiBase.filter(l => l.status === 'Present').length;
    const kpiLate = kpiBase.filter(l => l.status === 'Late' || l.geofenceStatus === 'Violation').length;
    const kpiMissing = kpiBase.filter(l => l.status === 'Missing Out').length;
    const kpiOnLeave = kpiBase.filter(l => l.status === 'On Leave').length;

    const renderMethodBadge = (method: string) => {
        if (method === '🤖 Auto') return <span className="mr-1" title="System Generated (Auto Attendance)">🤖</span>;
        const icon = method === 'Web Portal' ? '🖥️' : method === 'Mobile App' ? '📱' : '📟';
        return <span className="mr-1" title={method}>{icon}</span>;
    };

    const renderStatusBadge = (log: any) => {
        const getStyles = () => {
            if (log.geofenceStatus === 'Violation') return 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-100 dark:border-orange-900/30';
            
            switch (log.status) {
                case 'Late': return 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/30';
                case 'Missing Out': return 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-100 dark:border-red-900/30';
                case 'Present': return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30';
                case 'On Leave': return 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900/30';
                default: return 'bg-slate-50 text-slate-700 border-slate-200';
            }
        };

        const icon = log.geofenceStatus === 'Violation' ? 'location_off' : (
            log.status === 'Late' ? 'add_alert' : 
            log.status === 'Missing Out' ? 'error' : 
            log.status === 'On Leave' ? 'beach_access' : 'check'
        );

        return (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border w-fit whitespace-nowrap ${getStyles()}`}>
                <span className="material-symbols-outlined text-[16px]">{icon}</span>
                <span className="text-xs font-bold">{log.geofenceStatus === 'Violation' ? 'Geofence Violation' : log.status}</span>
            </div>
        );
    };

    const openActionModal = (type: string, record: any) => {
        setActiveRecord(record);
        setActiveModal(type);
    };

    const renderActionButton = (log: any) => {
        if (log.status === 'Missing Out') {
            return (
                <button onClick={() => openActionModal('regularize', log)} className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-[#4F46E5] text-white text-xs font-bold hover:bg-indigo-600 transition-colors shadow-sm whitespace-nowrap border-none">
                    Regularize
                </button>
            );
        } else if (log.location === 'Customer Site' || log.geofenceStatus === 'Violation') {
            return (
                <button onClick={() => openActionModal('map', log)} className="text-blue-500 hover:text-blue-600 transition-colors text-xs font-semibold flex items-center justify-end gap-1.5 ml-auto">
                    <span className="material-symbols-outlined text-[16px] text-blue-500">location_on</span>
                    View Map
                </button>
            );
        } else {
            return (
                <button onClick={() => openActionModal('logs', log)} className="text-slate-400 hover:text-[#4F46E5] transition-colors text-xs font-semibold flex items-center justify-end gap-1 ml-auto">
                    <span className="material-symbols-outlined text-[16px]">history</span>
                    Logs
                </button>
            );
        }
    };

    return (
        <div className="flex h-screen w-full font-display text-slate-900 dark:text-white antialiased overflow-hidden bg-background-light dark:bg-background-dark relative">
            <Sidebar activeTab="Attendance" />

            <main className="flex flex-col h-full overflow-hidden relative ml-[280px] flex-1">
                <Header 
                    title="Attendance"
                    subtitle="Monitor real-time employee check-ins and check-outs across all office locations"
                />

                <div className="flex-1 overflow-y-auto px-8 pb-6 bg-[#F8FAFC]">
                    <div className="max-w-[1600px] mx-auto space-y-6 mt-8">
                        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-white dark:bg-[#182130] p-4 xl:pr-[330px] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative min-h-[160px] z-10">
                            {/* Mobile Simulator Overlay Widget */}
                            <div className="absolute right-0 top-0 bottom-0 w-80 bg-slate-50 dark:bg-slate-900/50 border-l border-slate-200 dark:border-slate-800 rounded-r-xl p-4 pb-5 hidden xl:flex flex-col justify-center gap-3">

                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Admin Override</span>
                                    {isDevelopment && (
                                        <button
                                            onClick={() => setShowDevSettings(s => !s)}
                                            className={`p-1 rounded-md transition-colors border-none ${showDevSettings ? 'bg-rose-50 text-rose-500' : 'text-slate-400 hover:text-slate-600'}`}
                                            title="Override Settings"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">settings</span>
                                        </button>
                                    )}
                                </div>
                                {isDevelopment && showDevSettings && (
                                    <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-100 px-2 py-1.5 rounded-lg mb-2">
                                        <input
                                            type="checkbox"
                                            id="mock-gps"
                                            className="accent-rose-500 scale-90"
                                            checked={isDevModeOverride}
                                            onChange={(e) => setIsDevModeOverride(e.target.checked)}
                                        />
                                        <label htmlFor="mock-gps" className="text-[10px] font-bold text-rose-500 cursor-pointer">FAKE GPS (Dev Only)</label>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 w-full">
                                    <DropdownMenu
                                        value={simLocation}
                                        onChange={setSimLocation}
                                        className="w-full"
                                        triggerClassName="w-full justify-between"
                                        options={systemSettings.officeLocations.map(loc => ({
                                            value: loc.id,
                                            label: loc.name.split(' (')[0],
                                            subLabel: loc.name.match(/\(([^)]+)\)/)?.[1],
                                        }))}
                                    />
                                </div>

                                {hasActiveLog ? (
                                    <button
                                        onClick={handleCheckOutLocal}
                                        disabled={isPunching}
                                        className="w-full bg-red-500 hover:bg-red-600 disabled:bg-slate-400 text-white rounded-xl py-2 text-[12px] font-bold shadow-md shadow-red-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 border-none"
                                    >
                                        {isPunching ? <span className="animate-spin text-lg">⏳</span> : <span className="material-symbols-outlined text-[20px]">logout</span>}
                                        {isPunching ? 'Processing...' : 'Punch-Out Now'}
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleCheckIn}
                                        disabled={isPunching}
                                        className={`w-full rounded-xl py-2 text-[12px] font-bold shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 border text-white ${
                                            punchSuccess
                                                ? 'bg-emerald-600 border-emerald-700'
                                                : 'bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:bg-slate-400 border-slate-600'
                                        }`}
                                    >
                                        {isPunching
                                            ? <span className="animate-spin text-lg">⏳</span>
                                            : punchSuccess
                                                ? <span className="material-symbols-outlined text-[20px]">check_circle</span>
                                                : <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>}
                                        {isPunching ? 'Processing...' : punchSuccess ? 'Done!' : 'Punch-In (Override)'}
                                    </button>
                                )}
                            </div>

                            <div className="flex-1 flex flex-col gap-2">
                                {/* Row 1 — all controls on a single h-9 baseline */}
                                <div className="flex items-center gap-2 h-9">
                                    {/* Search — far left, stretches */}
                                    <div className="flex-1 relative min-w-[160px] h-full">
                                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                                            <span className="material-symbols-outlined text-slate-400 text-[18px]">search</span>
                                        </div>
                                        <input
                                            className="w-full h-full pl-9 pr-3 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md focus:ring-[#4F46E5] focus:border-[#4F46E5] shadow-sm transition-all outline-none"
                                            placeholder="Search employee, ID, dept… (⌘K)"
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                    {/* Date picker */}
                                    <div className="relative h-full">
                                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                                            <span className="material-symbols-outlined text-slate-400 text-[18px]">calendar_today</span>
                                        </div>
                                        <input
                                            className="h-full pl-9 pr-3 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md focus:ring-[#4F46E5] focus:border-[#4F46E5] shadow-sm cursor-pointer w-[155px] transition-colors"
                                            type="date"
                                            value={dateFilter}
                                            onChange={(e) => setDateFilter(e.target.value)}
                                        />
                                    </div>
                                    {/* Location filter */}
                                    <DropdownMenu
                                        value={locationFilter}
                                        onChange={setLocationFilter}
                                        options={[
                                            { value: 'All Locations', label: 'All Locations' },
                                            ...systemSettings.officeLocations.map(loc => ({
                                                value: loc.name,
                                                label: loc.name.split(' (')[0],
                                                subLabel: loc.name.match(/\(([^)]+)\)/)?.[1],
                                            }))
                                        ]}
                                    />
                                    {/* Import + Sync grouped right */}
                                    <div className="flex items-center gap-1.5 ml-auto h-full">
                                        <button
                                            onClick={() => {
                                                const res = bulkImportAttendance(activeAdminId);
                                                alert(res.message);
                                            }}
                                            className="h-full flex items-center gap-1.5 px-3 rounded-md text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-600 text-[13px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors bg-transparent shadow-sm"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">upload</span>
                                            Import
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (isSyncing) return;
                                                setIsSyncing(true);
                                                setTimeout(() => {
                                                    syncAttendance();
                                                    setIsSyncing(false);
                                                    setLastSyncTime('Just now');
                                                }, 1500);
                                            }}
                                            disabled={isSyncing}
                                            className="h-full flex items-center gap-1.5 px-3 rounded-md text-white border-none text-sm font-semibold hover:opacity-90 disabled:opacity-70 transition-all shadow-sm"
                                            style={{ backgroundColor: '#4F46E5' }}
                                        >
                                            <span className={`material-symbols-outlined text-[18px] ${isSyncing ? 'animate-spin' : ''}`}>sync</span>
                                            {isSyncing ? 'Syncing...' : 'Sync Devices'}
                                        </button>
                                    </div>
                                </div>
                                {/* Row 2 — status aligned right under Import/Sync; clear filters on left */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {(statusFilter || searchQuery) && (
                                            <button onClick={() => { setStatusFilter(null); setSearchQuery(''); }} className="text-[11px] text-indigo-600 font-bold flex items-center gap-1 border-none bg-transparent cursor-pointer hover:underline">
                                                <span className="material-symbols-outlined text-[14px]">filter_alt_off</span>
                                                Clear filters
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4 ml-auto">
                                        <span className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                                            <span className={`h-1.5 w-1.5 rounded-full ${isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500 animate-pulse'}`}></span>
                                            Last Sync: {lastSyncTime}
                                        </span>
                                        <div className="flex items-center gap-3 border-l border-slate-200 dark:border-slate-700 pl-4">
                                            {systemSettings.officeLocations.map(loc => (
                                                <div key={loc.id} className="flex items-center gap-1.5">
                                                    <span className={`h-1.5 w-1.5 rounded-full ${loc.id === 'LOC-HQ' ? 'bg-emerald-500' : 'bg-blue-500'}`}></span>
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{loc.name.split(' ')[0]}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Interactive KPI Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                            {/* Present Today */}
                            <div className="bg-white dark:bg-[#182130] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col relative overflow-hidden group">
                                <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <span className="material-symbols-outlined text-emerald-600 text-[64px]">check_circle</span>
                                </div>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Present Today</p>
                                <div className="flex items-baseline gap-2 mt-2">
                                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white transition-all">{kpiPresent}</h3>
                                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full whitespace-nowrap">On Time</span>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-1.5">
                                    {kpiPresent} / {attendanceLogs.length} total&nbsp;
                                    <span className="font-bold text-emerald-600">
                                        ({attendanceLogs.length > 0 ? Math.round(kpiPresent / attendanceLogs.length * 100) : 0}%)
                                    </span>
                                </p>
                            </div>
                            {/* Late — clickable filter */}
                            <button
                                onClick={() => setStatusFilter(f => f === 'Late' ? null : 'Late')}
                                className={`p-5 rounded-xl border shadow-sm flex flex-col relative overflow-hidden group text-left transition-all ${statusFilter === 'Late' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 ring-2 ring-amber-400' : 'bg-white dark:bg-[#182130] border-slate-200 dark:border-slate-800 hover:border-amber-300'}`}
                            >
                                <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <span className="material-symbols-outlined text-amber-500 text-[64px]">warning</span>
                                </div>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Late / Geofence Violation</p>
                                <div className="flex items-baseline gap-2 mt-2">
                                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white transition-all">{kpiLate}</h3>
                                    <span className="text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full whitespace-nowrap" title="Will sync with Payroll to automate Penalty Risk deductions">Penalty Risk</span>
                                </div>
                                <p className="text-[11px] text-amber-500 font-semibold mt-1.5 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[13px]">{statusFilter === 'Late' ? 'filter_alt_off' : 'filter_alt'}</span>
                                    {statusFilter === 'Late' ? 'Clear filter' : 'Click to filter table'}
                                </p>
                            </button>
                            {/* Missing Punch — clickable filter */}
                            <button
                                onClick={() => setStatusFilter(f => f === 'Missing Out' ? null : 'Missing Out')}
                                className={`p-5 rounded-xl border shadow-sm flex flex-col relative overflow-hidden group text-left transition-all ${statusFilter === 'Missing Out' ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 ring-2 ring-red-400' : 'bg-white dark:bg-[#182130] border-slate-200 dark:border-slate-800 hover:border-red-300'}`}
                            >
                                <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <span className="material-symbols-outlined text-red-500 text-[64px]">running_with_errors</span>
                                </div>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Missing Punch</p>
                                <div className="flex items-baseline gap-2 mt-2">
                                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white transition-all">{kpiMissing}</h3>
                                    <span className="text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full whitespace-nowrap">Critical Action</span>
                                </div>
                                <p className="text-[11px] text-red-500 font-semibold mt-1.5 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[13px]">{statusFilter === 'Missing Out' ? 'filter_alt_off' : 'filter_alt'}</span>
                                    {statusFilter === 'Missing Out' ? 'Clear filter' : 'Click to filter table'}
                                </p>
                            </button>
                            {/* On Leave */}
                            <div className="bg-white dark:bg-[#182130] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col relative overflow-hidden group">
                                <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <span className="material-symbols-outlined text-blue-500 text-[64px]">beach_access</span>
                                </div>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">On Leave</p>
                                <div className="flex items-baseline gap-2 mt-2">
                                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{kpiOnLeave}</h3>
                                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full whitespace-nowrap">Approved</span>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-1.5">
                                    {attendanceLogs.length > 0 ? Math.round(kpiOnLeave / attendanceLogs.length * 100) : 0}% of workforce
                                </p>
                            </div>
                        </div>

                        {/* Interactive Data Table — Paginated for scalability */}
                        <div className="bg-white dark:bg-[#182130] border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden transition-all">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 z-10">
                                        <tr className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-[#182130] text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">
                                            <th className="px-6 py-4 whitespace-nowrap text-left">Employee</th>
                                            <th className="px-6 py-4 text-right whitespace-nowrap min-w-[120px]">Check-In</th>
                                            <th className="px-6 py-4 text-right whitespace-nowrap min-w-[120px]">Check-Out</th>
                                            <th className="px-6 py-4 whitespace-nowrap">Project / Task</th>
                                            <th className="px-6 py-4 text-right whitespace-nowrap">Total Hours</th>
                                            <th className="px-6 py-4 whitespace-nowrap text-left">Status & Penalty</th>
                                            <th className="px-6 py-4 text-right whitespace-nowrap">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {pagedLogs.map(log => (
                                            <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-6 py-4 align-top">
                                                    <div className="flex items-center gap-3">
                                                        <div className="size-10 rounded-full flex items-center justify-center font-bold shrink-0 bg-slate-100 text-slate-600">{log.name.charAt(0)}</div>
                                                        <div className="flex flex-col gap-0.5">
                                                            <p className="font-bold text-slate-900 dark:text-white">{log.name}</p>
                                                            <p className="text-xs text-slate-500"><span className="font-bold">ID: {log.empId}</span> • {log.dept}</p>
                                                            <div className="mt-1">
                                                                <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-[10px] font-medium text-gray-600 dark:text-gray-300 ring-1 ring-inset ring-gray-500/10">
                                                                    {shifts.find(s => s.id === employees.find(e => e.id === log.empId)?.shiftId)?.name || 'General 9-6'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right align-top">
                                                    <div className="flex flex-col items-end">
                                                        <span className={`font-bold whitespace-nowrap ${log.status === 'Late' ? 'text-red-600' : 'text-slate-700'}`}>{log.checkIn}</span>
                                                        <div className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-400 whitespace-nowrap font-bold uppercase tracking-widest">
                                                            {renderMethodBadge(log.checkInMethod)}
                                                            <span>{log.location}</span>
                                                        </div>
                                                        <div className="mt-1 text-[9px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                                            TARGET: {shifts.find(s => s.id === employees.find(e => e.id === log.empId)?.shiftId)?.start || '09:00'}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right align-top">
                                                    {log.checkOut === '-- : --' ? (
                                                        <span className="font-bold text-slate-400 tracking-wider whitespace-nowrap">{log.checkOut}</span>
                                                    ) : (
                                                        <div className="flex flex-col items-end">
                                                            <span className="font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">{log.checkOut}</span>
                                                            <div className="mt-1 text-[9px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase">
                                                                TARGET: {shifts.find(s => s.id === employees.find(e => e.id === log.empId)?.shiftId)?.end || '18:00'}
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 align-top">
                                                    {log.checkOut === '-- : --' ? (
                                                        <span className="text-slate-400 text-xs italic">{log.project}</span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300">
                                                            {log.project}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono text-slate-700 dark:text-slate-300 align-top font-bold">
                                                    {log.totalHours > 0 ? `${log.totalHours}h` : '--'}
                                                </td>
                                                <td className="px-6 py-4 align-top">
                                                    <div className="flex flex-col gap-1">
                                                        {renderStatusBadge(log)}
                                                        {getPenalty(log.id) > 0 && (
                                                            <p className="text-[10px] text-red-500 font-bold italic flex items-center gap-1" title="Automated deduction synced to Payroll Run">
                                                                <span className="material-symbols-outlined text-[14px]">payments</span>
                                                                -{getPenalty(log.id).toLocaleString()} MMK Penalty
                                                            </p>
                                                        )}
                                                        {log.isManual && (
                                                            <p className="text-[9px] text-amber-600 font-black mt-0.5 uppercase tracking-tighter flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 w-fit">
                                                                <span className="material-symbols-outlined text-[12px]">security</span>
                                                                Manual Override
                                                            </p>
                                                        )}
                                                        {log.adminAuditId && (
                                                            <p className="text-[9px] text-emerald-600 font-bold mt-0.5 uppercase tracking-tighter flex items-center gap-1">
                                                                <span className="material-symbols-outlined text-[12px]">verified_user</span>
                                                                Verified by {log.adminAuditId}
                                                            </p>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right align-top">
                                                    {renderActionButton(log)}
                                                </td>
                                            </tr>
                                        ))}
                                        {pagedLogs.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400">
                                                    No attendance records found.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {/* Pagination Footer */}
                            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#182130]">
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Showing <span className="font-bold text-slate-700 dark:text-slate-200">{filteredLogs.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredLogs.length)}</span> of <span className="font-bold text-slate-700 dark:text-slate-200">{filteredLogs.length}</span> records
                                </p>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                                    </button>
                                    {getPageNumbers().map((page, idx) =>
                                        page === '...' ? (
                                            <span key={`ellipsis-${idx}`} className="h-8 w-8 flex items-center justify-center text-xs text-slate-400">…</span>
                                        ) : (
                                            <button
                                                key={page}
                                                onClick={() => setCurrentPage(page as number)}
                                                className={`h-8 w-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                                                    currentPage === page
                                                        ? 'bg-indigo-600 text-white shadow-sm'
                                                        : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                                }`}
                                            >
                                                {page}
                                            </button>
                                        )
                                    )}
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modals */}
                {activeModal === 'regularize' && activeRecord && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in px-4">
                        <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <h3 className="font-bold text-slate-900">Regularize Punch Out</h3>
                                <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <div className="p-6 space-y-4 text-left">
                                <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                                    <p className="text-[10px] font-bold text-amber-700 uppercase mb-1">Audit Warning</p>
                                    <p className="text-xs text-amber-600 leading-relaxed font-medium">This action will be logged under your Admin ID for Myanmar Labor Inspection compliance.</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Employee</p>
                                    <p className="text-sm font-semibold text-slate-800">{activeRecord?.name} ({activeRecord?.empId})</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Check-Out Time</label>
                                        <input 
                                            type="time" 
                                            className="w-full text-sm p-2.5 border border-slate-200 rounded-lg bg-white focus:ring-[#4F46E5] outline-none" 
                                            value={manualCheckoutTime}
                                            onChange={(e) => setManualCheckoutTime(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Audit Reason</label>
                                        <select 
                                            className="w-full text-sm p-2.5 border border-slate-200 rounded-lg bg-white focus:ring-[#4F46E5] outline-none appearance-none"
                                            value={regularizeReason}
                                            onChange={(e) => setRegularizeReason(e.target.value)}
                                        >
                                            <option value="Power Outage">Power Outage</option>
                                            <option value="Device Error">Device Error</option>
                                            <option value="Half Day Auth">Half Day Auth</option>
                                            <option value="On-Site Meeting">On-Site Meeting</option>
                                            <option value="Manual Log Correction">Manual Log</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
                                <button onClick={() => setActiveModal(null)} className="px-5 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
                                    Cancel
                                </button>
                                <button onClick={handleRegularizeSave} className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-[#4F46E5] hover:bg-indigo-600 transition-colors shadow-sm">
                                    Confirm Audit Fix
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeModal === 'logs' && activeRecord && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in px-4">
                        <div className="bg-white dark:bg-[#182130] w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white">{activeRecord.name}</h3>
                                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">{activeRecord.id} · {activeRecord.date}</p>
                                </div>
                                <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600 transition-colors border-none bg-transparent">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <div className="p-5">
                                <ol className="relative border-l-2 border-slate-200 dark:border-slate-700 ml-3 space-y-5">
                                    {/* Check-In */}
                                    <li className="ml-5">
                                        <span className="absolute -left-[9px] flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-white dark:ring-[#182130]"></span>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Check-In</p>
                                        <p className="font-bold text-slate-900 dark:text-white text-sm">{activeRecord.checkIn}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {activeRecord.location} · via {activeRecord.checkInMethod}
                                        </p>
                                        {activeRecord.gps && (
                                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                                GPS {activeRecord.gps.lat.toFixed(4)}°N, {activeRecord.gps.lng.toFixed(4)}°E
                                            </p>
                                        )}
                                    </li>
                                    {/* Admin Override / Regularization */}
                                    {activeRecord.isManual && (
                                        <li className="ml-5">
                                            <span className="absolute -left-[9px] flex items-center justify-center w-4 h-4 rounded-full bg-amber-400 ring-4 ring-white dark:ring-[#182130]"></span>
                                            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Admin Override</p>
                                            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                                                Regularized by {activeRecord.adminAuditId || 'Admin'}
                                            </p>
                                            {activeRecord.adminAuditReason && (
                                                <p className="text-[11px] text-slate-400 italic mt-0.5">Reason: {activeRecord.adminAuditReason}</p>
                                            )}
                                        </li>
                                    )}
                                    {/* Check-Out */}
                                    <li className="ml-5">
                                        <span className={`absolute -left-[9px] flex items-center justify-center w-4 h-4 rounded-full ring-4 ring-white dark:ring-[#182130] ${
                                            activeRecord.checkOut === '-- : --' ? 'bg-slate-300 animate-pulse' : 'bg-indigo-500'
                                        }`}></span>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Check-Out</p>
                                        {activeRecord.checkOut === '-- : --' ? (
                                            <p className="text-xs text-amber-500 font-semibold">Active session — not yet checked out</p>
                                        ) : (
                                            <>
                                                <p className="font-bold text-slate-900 dark:text-white text-sm">{activeRecord.checkOut}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">Total: {activeRecord.totalHours}h</p>
                                            </>
                                        )}
                                    </li>
                                </ol>
                            </div>
                        </div>
                    </div>
                )}

                {activeModal === 'map' && activeRecord && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in px-4">
                        <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 h-[600px] flex flex-col">
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-blue-500">location_on</span>
                                    <h3 className="font-bold text-slate-900">Geofence Check: {activeRecord.name}</h3>
                                </div>
                                <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <div className="flex-1 bg-slate-100 flex items-center justify-center flex-col gap-4 text-slate-400 p-6 relative">
                                <div className={`absolute top-6 left-6 px-4 py-2 rounded-lg font-bold text-sm shadow-lg border ${
                                    activeRecord.geofenceStatus === 'Violation' ? 'bg-red-500 text-white border-red-600' : 'bg-emerald-500 text-white border-emerald-600'
                                }`}>
                                    {activeRecord.geofenceStatus === 'Violation' ? 'GEOFENCE OUTSIDE RADIUS' : 'GEOFENCE VERIFIED'}
                                </div>
                                
                                <span className="material-symbols-outlined text-6xl text-slate-300">explore</span>
                                <p className="text-sm font-medium text-center max-w-md">
                                    The device report for {activeRecord.name} shows a {activeRecord.geofenceStatus === 'Violation' ? 'major mismatch' : 'perfect match'} between reported location "{activeRecord.location}" and GPS coordinates.
                                </p>

                                <div className="absolute bottom-4 left-4 right-4 bg-white p-4 rounded-xl shadow-lg border border-slate-200">
                                    <p className="text-xs font-bold text-slate-500 mb-2 uppercase">Captured GPS Data</p>
                                    <div className="flex justify-between items-center text-sm font-semibold text-slate-900">
                                        <span>Lat: {activeRecord.gps?.lat || '16.8201'}° N</span>
                                        <span>Long: {activeRecord.gps?.lng || '96.1604'}° E</span>
                                        <span className={activeRecord.geofenceStatus === 'Violation' ? 'text-red-500' : 'text-emerald-500'}>
                                            <span className="material-symbols-outlined text-[14px]">
                                                {activeRecord.geofenceStatus === 'Violation' ? 'report' : 'verified'}
                                            </span> 
                                            {activeRecord.geofenceStatus === 'Violation' ? 'Deviation Detected' : 'GPS Accurate'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
