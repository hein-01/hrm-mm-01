import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { useSystemCalendar } from '../context/SystemCalendarContext';

export default function DeviceSetup() {
    const { systemSettings, addOTRequest, addSecurityLog } = useAppData();
    const { getCurrentDateISO } = useSystemCalendar();
    const navigate = useNavigate();
    
    const [step, setStep] = useState<'login' | 'location' | 'home'>('login');
    const [setupToken, setSetupToken] = useState('');
    const [selectedLocation, setSelectedLocation] = useState<string | null>(systemSettings.deviceConfig.activeLocationId);
    const [statusMessage, setStatusMessage] = useState({ text: '', type: 'info' as 'info' | 'success' | 'error' });
    const [currentTime, setCurrentTime] = useState(new Date());

    const DEVICE_ID = 'ZKT-ZPAD-882294'; // Simulated fixed hardware ID

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const expectedToken = `ZKT-${getCurrentDateISO().split('T')[0].replace(/-/g, '')}`;

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (setupToken === expectedToken) {
            addSecurityLog({
                deviceId: DEVICE_ID,
                authMethod: 'Setup Token',
                status: 'Success'
            });
            setStep('location');
        } else {
            addSecurityLog({
                deviceId: DEVICE_ID,
                authMethod: 'Setup Token',
                status: 'Failed'
            });
            setStatusMessage({ text: 'Invalid or Expired Setup Token', type: 'error' });
        }
    };

    const handleLocationSelect = (id: string) => {
        setSelectedLocation(id);
        setStep('home');
        addSecurityLog({
            deviceId: DEVICE_ID,
            authMethod: 'Setup Token',
            status: 'Success',
            detail: `Hardware-to-Location Binding: Terminal ${DEVICE_ID} locked to ${systemSettings.officeLocations.find(l => l.id === id)?.name}.`
        });
    };

    const handleApplyOT = () => {
        if (!selectedLocation) return;

        const mockOT: any = {
            id: `OT-DEVICE-${Date.now()}`,
            empId: 'EMP-001', 
            name: 'Nilar Lwin',
            dept: 'Product Dept',
            date: new Date().toISOString().split('T')[0],
            shiftName: 'General Shift (09:00 - 17:30)',
            otHours: 2,
            otType: 'Weekday 1.5x',
            payoutAmount: 15000,
            status: 'Pending',
            reason: 'Critical task completion via terminal request',
            hasViolation: false,
            violationNote: '',
            effectiveMonth: 'Oct 2023',
            requestedDate: new Date().toISOString().split('T')[0],
            priority: 'Medium',
            category: 'Attendance',
            source: 'Biometric',
            locationId: selectedLocation // Inherited from hardware binding
        };
        
        addOTRequest(mockOT);
        setStatusMessage({ text: 'Biometric OT Request sent successfully!', type: 'success' });
        setTimeout(() => setStatusMessage({ text: '', type: 'info' }), 3000);
    };

    const locationName = systemSettings.officeLocations.find(l => l.id === selectedLocation)?.name || 'Unknown Location';

    // Proximity Verification QR Data
    const proximityQRData = `VERIFY_PROXIMITY|DEV:${DEVICE_ID}|LOC:${selectedLocation || 'NULL'}|TS:${Date.now()}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(proximityQRData)}`;

    return (
        <div className="min-h-screen bg-[#0F172A] text-slate-100 font-mono flex items-center justify-center p-4 select-none">
            {/* Device Frame */}
            <div className="w-full max-w-[400px] aspect-[3/4] bg-[#1E293B] rounded-[40px] border-[12px] border-[#334155] shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col relative">
                
                {/* Status Bar */}
                <div className="h-8 bg-[#0F172A] flex items-center justify-between px-6 text-[10px] font-bold text-slate-500">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[12px]">wifi</span>
                        <span className="uppercase">{DEVICE_ID.split('-')[2]}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="material-symbols-outlined text-[12px] text-emerald-500">battery_full</span>
                    </div>
                </div>

                {/* Main Viewport */}
                <div className="flex-1 p-8 flex flex-col">
                    
                    {step === 'login' && (
                        <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="mb-10 mt-4">
                                <div className="size-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
                                    <span className="material-symbols-outlined text-4xl">fingerprint</span>
                                </div>
                                <h1 className="text-2xl font-black tracking-tighter">Sign In to<br/>Organization</h1>
                                <p className="text-slate-500 text-xs mt-2 uppercase tracking-widest font-bold">ZKT Zpad V2.4</p>
                            </div>

                            <form onSubmit={handleLogin} className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 mb-1.5 block flex justify-between">
                                        <span>Setup Token</span>
                                        <span className="text-indigo-400">Valid: {expectedToken}</span>
                                    </label>
                                    <input 
                                        type="text" 
                                        value={setupToken}
                                        onChange={e => setSetupToken(e.target.value)}
                                        className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-all font-mono uppercase tracking-widest text-slate-200"
                                        placeholder="ZKT-YYYYMMDD"
                                    />
                                </div>
                                <button 
                                    type="submit"
                                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-900/20 active:scale-[0.98] transition-all"
                                >
                                    Authenticate Device
                                </button>
                            </form>
                        </div>
                    )}

                    {step === 'location' && (
                        <div className="flex flex-col h-full animate-in zoom-in-95 duration-300">
                            <h2 className="text-lg font-black tracking-tight mb-8">Select Active<br/>Office Location</h2>
                            <p className="text-[10px] text-amber-500 font-bold uppercase mb-4 italic">⚠️ Binding is immutable until logout</p>
                            <div className="space-y-3">
                                {systemSettings.officeLocations.map(loc => (
                                    <button 
                                        key={loc.id}
                                        onClick={() => handleLocationSelect(loc.id)}
                                        className="w-full p-5 bg-[#0F172A] border border-slate-700 rounded-2xl text-left hover:border-blue-500 hover:bg-blue-900/10 transition-all flex items-center justify-between group"
                                    >
                                        <div>
                                            <p className="font-bold text-sm">{loc.name}</p>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">{loc.radius}m Geofence</p>
                                        </div>
                                        <span className="material-symbols-outlined text-slate-600 group-hover:text-blue-500">arrow_forward</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 'home' && (
                        <div className="flex flex-col h-full animate-in fade-in duration-700">
                            {/* Device Home Header */}
                            <div className="flex items-center justify-between mb-8">
                                <div className="text-left">
                                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none mb-1">Terminal Active</p>
                                    <p className="text-xs font-bold text-slate-300">{locationName}</p>
                                </div>
                                <button 
                                    onClick={() => {
                                        setStep('login');
                                        setSelectedLocation(null);
                                    }} 
                                    className="px-3 py-1.5 bg-red-900/20 border border-red-500/30 rounded-lg text-[10px] font-black text-red-500 uppercase tracking-widest"
                                >
                                    Logout
                                </button>
                            </div>

                            {/* Large Clock */}
                            <div className="text-center py-6 mb-8 bg-gradient-to-b from-[#0F172A] to-transparent rounded-3xl border border-white/5">
                                <h1 className="text-5xl font-black tracking-tighter tabular-nums mb-1">
                                    {getFormattedDate(currentTime, 'time')}
                                </h1>
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.3em]">
                                    {getFormattedDate(currentTime, 'long')}
                                </p>
                            </div>

                            {/* Interaction Area */}
                            <div className="flex-1 flex flex-col items-center justify-center">
                                {systemSettings.deviceConfig.showQR ? (
                                    <div className="relative group flex flex-col items-center">
                                        <div className="size-48 bg-white p-4 rounded-3xl shadow-[0_0_40px_rgba(59,130,246,0.2)]">
                                            <img src={qrUrl} className="size-full opacity-90" alt="QR Code" />
                                        </div>
                                        <div className="mt-4 text-center">
                                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Mobile Proximity Verified</p>
                                            <p className="text-[8px] text-slate-600 mt-1 font-mono uppercase">ID: {DEVICE_ID}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <div className="size-32 bg-[#0F172A] rounded-full border-4 border-slate-700 flex items-center justify-center text-slate-500 mb-6">
                                            <span className="material-symbols-outlined text-[64px] animate-pulse">fingerprint</span>
                                        </div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Ready for Biometric</p>
                                    </div>
                                )}
                            </div>

                            {/* Device Quick Actions */}
                            <div className="mt-auto grid grid-cols-2 gap-4">
                                <button 
                                    onClick={handleApplyOT}
                                    className="p-4 bg-emerald-600/10 border border-emerald-500/30 text-emerald-500 rounded-2xl flex flex-col items-center gap-2 hover:bg-emerald-600/20 transition-all active:scale-95"
                                >
                                    <span className="material-symbols-outlined">add_task</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest">Apply OT</span>
                                </button>
                                <button className="p-4 bg-blue-600/10 border border-blue-500/30 text-blue-500 rounded-2xl flex flex-col items-center gap-2 hover:bg-blue-600/20 transition-all active:scale-95">
                                    <span className="material-symbols-outlined">history</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest">Logs</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Hardware Navigation Dots (ZKT Style) */}
                <div className="h-10 bg-[#0F172A] flex items-center justify-center gap-6 px-6">
                    <button className="size-2 bg-slate-700 rounded-full"></button>
                    <button className="size-2 bg-slate-700 rounded-full"></button>
                    <button className="size-2 bg-slate-400 rounded-full"></button>
                </div>

                {/* Status Toasts */}
                {statusMessage.text && (
                    <div className="absolute top-16 left-8 right-8 animate-in slide-in-from-top-4 duration-300">
                        <div className={`p-4 rounded-xl text-center border shadow-lg ${statusMessage.type === 'success' ? 'bg-emerald-900/80 border-emerald-500 text-emerald-200' : 'bg-red-900/80 border-red-500 text-red-200'}`}>
                            <p className="text-xs font-bold">{statusMessage.text}</p>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Simulation Controls Sidebar (Out-of-device) */}
            <div className="fixed top-10 right-10 w-64 space-y-4 hidden xl:block">
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-4 text-blue-500">Simulator Logic</h3>
                    <div className="space-y-4">
                        <div className="p-3 bg-[#0F172A] rounded-xl border border-slate-800">
                            <p className="text-[9px] font-black text-slate-500 uppercase mb-1">State: Sync</p>
                            <p className="text-[11px] font-bold text-slate-300">Biometric PIN Matcher: ACTIVE</p>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed font-medium capitalize prose-slate">
                            This simulator replicates the ZKT Zpad interface. <strong>Binding</strong> ensures all logs inherit the site ID.
                        </p>
                        <button 
                            onClick={() => navigate('/settings')}
                            className="w-full py-3 bg-slate-800 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-700 hover:bg-slate-700 transition-all"
                        >
                            Return to Settings
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
