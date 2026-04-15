import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { useSystemCalendar } from '../context/SystemCalendarContext';

export default function MobileCockpit() {
    const { employees, checkIn, checkOut, attendanceLogs, subscriptionTier, systemSettings, policyVersion } = useAppData();
    const { getFormattedDate, getAdjustedDateObj } = useSystemCalendar();
    const navigate = useNavigate();
    const [currentTime, setCurrentTime] = useState(getAdjustedDateObj());
    const [isScanning, setIsScanning] = useState(false);
    const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'violation' | 'scanning'>('idle');

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(getAdjustedDateObj()), 1000);
        return () => clearInterval(timer);
    }, [getAdjustedDateObj]);

    const activeAdminId = 'EMP-001'; // Nilar Lwin
    const activeLog = attendanceLogs.find(l => l.empId === activeAdminId && l.checkOut === '-- : --');

    // Proximity Handshake Logic (Simulated via coordinate lookup)
    const handleQRScan = async () => {
        setIsScanning(true);
        setScanStatus('scanning');
        
        // Use HQ as the targeted location for this simulation
        const targetLoc = systemSettings.officeLocations[0]; // HQ
        
        // Simulate real checkIn logic which now includes Geofence + Security Logs
        const result = await checkIn(
            activeAdminId, 
            targetLoc.name, 
            { lat: targetLoc.coords.lat, lng: targetLoc.coords.lng }, 
            'Mobile App'
        );

        if (result.success) {
            setScanStatus('success');
        } else {
            setScanStatus('violation');
        }
        setIsScanning(false);
    };

    const handleClockOut = async () => {
        setIsScanning(true);
        await checkOut(activeAdminId);
        setIsScanning(false);
    };

    // Mock data for mobile experience
    const user = {
        name: 'Nilar Lwin',
        role: 'Senior UX Designer',
        avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDtMXUX0ktXwWpCR_HssI-ya16-3aPa6AAVPyBQ1EHpfp-j-sPL3V6-M9LOQH5oBAEgQVe-LnDjqixmSwV106z7bEtrnsNZO1CATGA_USq9lnhHi1_HCFl-Cyi3xyw648ljz2mqjJMc3vscDUW5zgws6ccC1OF1vEu1wdaDvwNJ2V-sg_zZ0haXJZDCxUvx8VjDCNXD51nD66gSegMbmfNMdqwU2v6zEDDEhi7cAmX1yUQ8UQLqt3O-oPvyg5wEcfX6wNGOUrCzj4',
        sessionStart: activeLog ? activeLog.checkIn : '-- : --',
        leaveBalance: 4,
        nextPayday: '31 Oct 2023'
    };

    const isPremium = subscriptionTier === 'premium';

    return (
        <div className="min-h-screen bg-[#F1F5F9] dark:bg-slate-950 font-display pb-24 overflow-x-hidden">
            {/* Glossy Top Header */}
            <div className="bg-[#4F46E5] pt-12 pb-20 px-6 rounded-b-[40px] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 h-64 w-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 h-40 w-40 bg-indigo-400/20 rounded-full -ml-20 -mb-20 blur-2xl"></div>
                
                <div className="relative z-10 flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <img src={user.avatar} className="size-12 rounded-2xl object-cover border-2 border-white/50 shadow-lg" alt="Avatar" />
                            <div className="absolute -bottom-1 -right-1 size-4 bg-emerald-500 border-2 border-[#4F46E5] rounded-full"></div>
                        </div>
                        <div>
                            <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em]">Welcome Back</p>
                            <h2 className="text-white text-xl font-black tracking-tight">{user.name.split(' ')[0]}</h2>
                        </div>
                    </div>
                    <button className="size-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-white relative">
                        <span className="material-symbols-outlined">notifications</span>
                        <div className="absolute top-3 right-3 size-2 bg-rose-500 rounded-full border border-indigo-600"></div>
                    </button>
                </div>

                {/* Clock-In Cockpit Card */}
                <div className="relative z-10 bg-white dark:bg-slate-900 rounded-[30px] p-6 shadow-2xl border border-white/20 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Session</p>
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">
                                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </h1>
                        </div>
                        <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center gap-1 ml-2">
                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter">v{policyVersion.toFixed(2)}</span>
                        </div>
                        <div className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center gap-1">
                            <div className="size-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">Synced</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Started At</p>
                            <p className="text-sm font-bold text-slate-700 dark:text-white">{user.sessionStart}</p>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Duration</p>
                            <p className="text-sm font-bold text-slate-700 dark:text-white">7h 42m</p>
                        </div>
                    </div>

                    <button 
                        onClick={handleClockOut}
                        disabled={!activeLog || isScanning}
                        className="w-full py-4 bg-rose-500 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-rose-200 dark:shadow-none hover:bg-rose-600 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <span className="material-symbols-outlined">logout</span>
                        {isScanning ? 'Ending Session...' : 'End Session / Clock Out'}
                    </button>
                </div>
            </div>

            {/* Manager Cockpit (RBAC Simulation) - Only if Premium */}
            {isPremium && (
                <div className="px-6 -mt-10 relative z-20 space-y-6">
                <div className="bg-slate-900 rounded-3xl p-6 shadow-xl relative overflow-hidden border border-slate-800">
                    <div className="absolute -right-6 -top-6 h-24 w-24 bg-indigo-500/10 rounded-full blur-xl"></div>
                    
                    <div className="flex items-center gap-3 mb-6">
                        <div className="size-10 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
                            <span className="material-symbols-outlined">hub</span>
                        </div>
                        <h3 className="text-white font-bold">Team Cockpit</h3>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <div className="bg-slate-800 p-3 rounded-2xl text-center">
                            <p className="text-indigo-400 text-lg font-black leading-none mb-1">3</p>
                            <p className="text-[8px] text-slate-500 font-black uppercase tracking-tighter">Present</p>
                        </div>
                        <div className="bg-slate-800 p-3 rounded-2xl text-center border border-amber-500/30">
                            <p className="text-amber-500 text-lg font-black leading-none mb-1">1</p>
                            <p className="text-[8px] text-slate-500 font-black uppercase tracking-tighter">Late</p>
                        </div>
                        <div className="bg-slate-800 p-3 rounded-2xl text-center">
                            <p className="text-rose-400 text-lg font-black leading-none mb-1">2</p>
                            <p className="text-[8px] text-slate-500 font-black uppercase tracking-tighter">Actions</p>
                        </div>
                    </div>
                </div>

                {/* Personal Quick Actions */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
                        <div className="size-10 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-center justify-center text-amber-600 mb-4">
                            <span className="material-symbols-outlined">event_busy</span>
                        </div>
                        <h4 className="text-slate-900 dark:text-white font-bold text-sm tracking-tight leading-none mb-1">Leave Balance</h4>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{user.leaveBalance} Days Left</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
                        <div className="size-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center text-emerald-600 mb-4">
                            <span className="material-symbols-outlined">payments</span>
                        </div>
                        <h4 className="text-slate-900 dark:text-white font-bold text-sm tracking-tight leading-none mb-1">Next Payday</h4>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{user.nextPayday}</p>
                    </div>
                </div>

                {/* Recent Feed / Announcements */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                    <h3 className="text-slate-900 dark:text-white font-black uppercase tracking-widest text-[10px] mb-4">Company Bulletins</h3>
                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-slate-500 text-[18px]">campaign</span>
                            </div>
                            <div>
                                <p className="text-[11px] font-black text-slate-800 dark:text-slate-200 leading-tight mb-1">New Policy: Weekend OT Adjustments</p>
                                <p className="text-[9px] text-slate-400 font-bold">2 Hours ago • HR Global</p>
                            </div>
                        </div>
                        <div className="flex gap-4 opacity-60">
                            <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-slate-500 text-[18px]">cake</span>
                            </div>
                            <div>
                                <p className="text-[11px] font-black text-slate-800 dark:text-slate-200 leading-tight mb-1">Kyaw Kyaw's Birthday Tomorrow!</p>
                                <p className="text-[9px] text-slate-400 font-bold">Yesterday • Operations</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            )}

            {/* Floating Bottom Nav */}
            <div className="fixed bottom-6 left-6 right-6 z-[100]">
                <div className="bg-slate-900/80 backdrop-blur-2xl px-8 py-4 rounded-[30px] border border-white/10 shadow-2xl flex items-center justify-between">
                    <button className="text-white hover:text-indigo-400 transition-colors">
                        <span className="material-symbols-outlined">home</span>
                    </button>
                    <button className="text-slate-500 hover:text-white transition-colors">
                        <span className="material-symbols-outlined">event_note</span>
                    </button>
                    <div className="relative -top-10">
                        <button 
                            onClick={activeLog ? handleClockOut : handleQRScan}
                            disabled={isScanning}
                            className={`size-16 rounded-full flex items-center justify-center text-white shadow-2xl transition-all active:scale-90 ${isScanning ? 'bg-amber-500 animate-pulse' : activeLog ? 'bg-rose-500 shadow-rose-500/50' : 'bg-[#4F46E5] shadow-indigo-500/50'}`}
                        >
                            <span className="material-symbols-outlined text-3xl">
                                {isScanning ? 'wifi_protected_setup' : activeLog ? 'logout' : 'qr_code_scanner'}
                            </span>
                        </button>
                    </div>
                    <button className="text-slate-500 hover:text-white transition-colors">
                        <span className="material-symbols-outlined">description</span>
                    </button>
                    <button className="text-slate-500 hover:text-white transition-colors" onClick={() => navigate('/settings')}>
                        <span className="material-symbols-outlined">settings</span>
                    </button>
                </div>
            </div>
            {/* Scan Feedback Overlay */}
            {scanStatus !== 'idle' && scanStatus !== 'scanning' && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[40px] p-8 text-center shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300">
                        <div className={`size-24 mx-auto rounded-full flex items-center justify-center mb-6 ${scanStatus === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                            <span className="material-symbols-outlined text-5xl">
                                {scanStatus === 'success' ? 'verified' : 'location_off'}
                            </span>
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 leading-tight">
                            {scanStatus === 'success' ? 'Check-In Verified' : 'Proximity Violation'}
                        </h3>
                        <p className="text-sm text-slate-500 font-bold mb-8">
                            {scanStatus === 'success' 
                                ? 'Your location has been verified. Shift session started.' 
                                : 'Unauthorized Site Detected. Your clock-in attempt was logged for security review.'}
                        </p>
                        <button 
                            onClick={() => setScanStatus('idle')}
                            className={`w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest text-white shadow-xl ${scanStatus === 'success' ? 'bg-emerald-500 shadow-emerald-200' : 'bg-rose-500 shadow-rose-200'}`}
                        >
                            Return to Dashboard
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
