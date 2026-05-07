import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { useSystemCalendar } from '../context/SystemCalendarContext';

// ─── QR Payload Parser ───────────────────────────────────────────────────────
// Parses: VERIFY_PROXIMITY|DEV:ZKT-ZPAD-882294|LOC:LOC-001|LOC_NAME:Yangon%20HQ|TS:1714000000|TTL:60
interface QRPayload {
    dev: string;
    locId: string;
    locName: string;
    ts: number;
    ttl: number;
}

function parseQRPayload(raw: string): QRPayload | null {
    try {
        if (!raw.startsWith('VERIFY_PROXIMITY|')) return null;
        const parts = Object.fromEntries(
            raw.split('|').slice(1).map(p => {
                const idx = p.indexOf(':');
                return [p.slice(0, idx).toLowerCase(), p.slice(idx + 1)];
            })
        );
        return {
            dev:     parts['dev']      || '',
            locId:   parts['loc']      || '',
            locName: decodeURIComponent(parts['loc_name'] || ''),
            ts:      parseInt(parts['ts']  || '0', 10),
            ttl:     parseInt(parts['ttl'] || '60', 10),
        };
    } catch {
        return null;
    }
}

function validateQRPayload(payload: QRPayload): { valid: boolean; reason?: string } {
    const ageMs = Date.now() - payload.ts;
    const ttlMs = payload.ttl * 1000;
    if (ageMs > ttlMs) return { valid: false, reason: `QR code expired ${Math.round(ageMs / 1000)}s ago. Ask terminal to refresh.` };
    if (!payload.dev.startsWith('ZKT-')) return { valid: false, reason: 'Unrecognized device ID. Only ZKT terminals are authorized.' };
    if (!payload.locId || payload.locId === 'NULL') return { valid: false, reason: 'Terminal has no location bound. Contact IT.' };
    return { valid: true };
}

// ─── QR Scanner Overlay ──────────────────────────────────────────────────────
// In a real mobile app this would use the camera.
// Here we simulate it: show a camera-like viewfinder, then "scan" a mock payload
// from the nearest DeviceSetup terminal after a short delay.
interface QRScannerOverlayProps {
    onResult: (raw: string) => void;
    onCancel: () => void;
}

function QRScannerOverlay({ onResult, onCancel }: QRScannerOverlayProps) {
    const [phase, setPhase] = useState<'aim' | 'found' | 'processing'>('aim');
    const [progress, setProgress] = useState(0);

    // Simulate QR detection after ~1.5s, then validation after ~0.5s
    useEffect(() => {
        // Progressive progress bar during "aim"
        const tick = setInterval(() => setProgress(p => Math.min(p + 4, 95)), 60);
        const foundTimer = setTimeout(() => {
            setPhase('found');
            setProgress(100);
        }, 1500);
        const processTimer = setTimeout(() => {
            setPhase('processing');
            // Emit a realistic terminal payload (matching DeviceSetup format)
            // In production this comes from the camera QR decode result
            const mockPayload = `VERIFY_PROXIMITY|DEV:ZKT-ZPAD-882294|LOC:LOC-001|LOC_NAME:Yangon%20HQ|TS:${Date.now()}|TTL:60`;
            onResult(mockPayload);
        }, 2200);

        return () => {
            clearInterval(tick);
            clearTimeout(foundTimer);
            clearTimeout(processTimer);
        };
    }, [onResult]);

    return (
        <div className="fixed inset-0 z-[120] bg-black flex flex-col items-center justify-center">
            {/* Simulated camera feed */}
            <div className="relative w-full h-full bg-slate-950 flex items-center justify-center overflow-hidden">
                {/* Blurred background simulating camera */}
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 opacity-90" />
                
                {/* Grid overlay — camera aesthetic */}
                <div className="absolute inset-0 opacity-10"
                    style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}
                />

                {/* Viewfinder */}
                <div className={`relative size-64 transition-all duration-300 ${phase === 'found' ? 'scale-95' : 'scale-100'}`}>
                    {/* Corner marks */}
                    {[['top-0 left-0 border-t-4 border-l-4 rounded-tl-xl', ''],
                      ['top-0 right-0 border-t-4 border-r-4 rounded-tr-xl', ''],
                      ['bottom-0 left-0 border-b-4 border-l-4 rounded-bl-xl', ''],
                      ['bottom-0 right-0 border-b-4 border-r-4 rounded-br-xl', ''],
                    ].map(([cls], i) => (
                        <div key={i} className={`absolute w-10 h-10 ${cls} ${phase === 'found' ? 'border-emerald-400' : 'border-white'} transition-colors duration-300`} />
                    ))}

                    {/* Scan sweep */}
                    <div className={`absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent transition-opacity duration-300 ${phase === 'found' ? 'opacity-0' : 'opacity-100'}`}
                        style={{ top: `${progress}%`, transition: 'top 60ms linear, opacity 300ms' }}
                    />

                    {/* Found indicator */}
                    {phase !== 'aim' && (
                        <div className="absolute inset-4 rounded-lg bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center animate-in zoom-in-75 duration-300">
                            <div className="text-center">
                                <span className="material-symbols-outlined text-4xl text-emerald-400">qr_code_2</span>
                                <p className="text-emerald-300 text-xs font-black uppercase tracking-widest mt-2">
                                    {phase === 'found' ? 'QR Detected' : 'Validating...'}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Instructions */}
                <div className="absolute bottom-32 left-0 right-0 text-center px-8">
                    <p className="text-white font-bold text-sm mb-1">
                        {phase === 'aim' ? 'Point camera at terminal QR code' : phase === 'found' ? 'QR Detected — hold still' : 'Verifying proximity...'}
                    </p>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">QR codes expire every 60 seconds</p>
                </div>

                {/* Cancel */}
                <button
                    onClick={onCancel}
                    className="absolute top-12 right-6 size-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/20"
                >
                    <span className="material-symbols-outlined">close</span>
                </button>

                {/* Torch toggle (cosmetic) */}
                <button className="absolute top-12 left-6 size-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/20">
                    <span className="material-symbols-outlined">flashlight_on</span>
                </button>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MobileCockpit() {
    const { employees, checkIn, checkOut, attendanceLogs, subscriptionTier, systemSettings, policyVersion, announcements, acknowledgeAnnouncement } = useAppData();
    const { getFormattedDate, getAdjustedDateObj } = useSystemCalendar();
    const navigate = useNavigate();
    const [currentTime, setCurrentTime] = useState(getAdjustedDateObj());
    const [isScanning, setIsScanning] = useState(false);

    // QR scan state machine
    type ScanPhase = 'idle' | 'camera' | 'validating' | 'success' | 'error' | 'expired' | 'clocking_out';
    const [scanPhase, setScanPhase] = useState<ScanPhase>('idle');
    const [scanMessage, setScanMessage] = useState('');
    const [scannedLocation, setScannedLocation] = useState('');
    const [scannedDeviceId, setScannedDeviceId] = useState('');

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(getAdjustedDateObj()), 1000);
        return () => clearInterval(timer);
    }, [getAdjustedDateObj]);

    const activeAdminId = 'EMP-001'; // Nilar Lwin
    const activeLog = attendanceLogs.find(l => l.empId === activeAdminId && l.checkOut === '-- : --');

    // ── Remote Check-In State ─────────────────────────────────────────────────
    const [remotePhase, setRemotePhase] = useState<'idle' | 'form' | 'submitting' | 'success' | 'error'>('idle');
    const [remoteReason, setRemoteReason] = useState('');
    const [remoteLocation, setRemoteLocation] = useState('Work From Home');
    const [remoteMessage, setRemoteMessage] = useState('');

    const handleRemoteCheckIn = async () => {
        if (!remoteReason.trim()) return;
        setRemotePhase('submitting');
        // Use a fixed dummy GPS (off-site) — geofence check skipped for Remote
        const result = await checkIn(
            activeAdminId,
            remoteLocation,
            { lat: 16.8000, lng: 96.1500 },
            'Remote'
        );
        if (result.success) {
            setRemotePhase('success');
        } else {
            setRemoteMessage(result.message || 'Remote check-in failed.');
            setRemotePhase('error');
        }
    };

    // ── QR Scan Flow ─────────────────────────────────────────────────────────
    const handleStartQRScan = () => {
        setScanPhase('camera');
    };

    const handleQRResult = async (raw: string) => {
        setScanPhase('validating');

        const payload = parseQRPayload(raw);
        if (!payload) {
            setScanMessage('Invalid QR format. This QR was not issued by a TechDance terminal.');
            setScanPhase('error');
            return;
        }

        const { valid, reason } = validateQRPayload(payload);
        if (!valid) {
            setScanMessage(reason || 'QR validation failed.');
            setScanPhase('expired');
            return;
        }

        // Find the matching office location from payload
        const matchedLoc = systemSettings.officeLocations.find(l => l.id === payload.locId);
        const locationName = matchedLoc?.name || payload.locName || 'QR Terminal';
        const coords = matchedLoc?.coords || { lat: 16.8661, lng: 96.1951 };

        setScannedLocation(locationName);
        setScannedDeviceId(payload.dev);

        const result = await checkIn(
            activeAdminId,
            locationName,
            { lat: coords.lat, lng: coords.lng },
            'QR'
        );

        if (result.success) {
            setScanPhase('success');
        } else {
            setScanMessage(result.message || 'Check-in failed. You may be outside the geofence.');
            setScanPhase('error');
        }
    };

    const handleQRScanCancel = () => {
        setScanPhase('idle');
    };

    // ── Clock Out ────────────────────────────────────────────────────────────
    const handleClockOut = async () => {
        setScanPhase('clocking_out');
        setIsScanning(true);
        await checkOut(activeAdminId);
        setIsScanning(false);
        setScanPhase('idle');
    };

    // ── Mock Data ────────────────────────────────────────────────────────────
    const user = {
        name: 'Nilar Lwin',
        role: 'Senior UX Designer',
        avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDtMXUX0ktXwWpCR_HssI-ya16-3aPa6AAVPyBQ1EHpfp-j-sPL3V6-M9LOQH5oBAEgQVe-LnDjqixmSwV106z7bEtrnsNZO1CATGA_USq9lnhHi1_HCFl-Cyi3xyw648ljz2mqjJMc3vscDUW5zgws6ccC1OF1vEu1wdaDvwNJ2V-sg_zZ0haXJZDCxUvx8VjDCNXD51nD66gSegMbmfNMdqwU2v6zEDDEhi7cAmX1yUQ8UQLqt3O-oPvyg5wEcfX6wNGOUrCzj4',
        sessionStart: activeLog ? activeLog.checkIn : '-- : --',
        leaveBalance: 4,
        nextPayday: '31 Oct 2023'
    };

    const isPremium = subscriptionTier === 'premium';

    // Elapsed time display
    const elapsedDisplay = (() => {
        if (!activeLog || activeLog.checkIn === '-- : --') return '0h 0m';
        const parseTime = (t: string) => {
            const [hm, ampm] = t.split(' ');
            let [h, m] = hm.split(':').map(Number);
            if (ampm === 'PM' && h !== 12) h += 12;
            if (ampm === 'AM' && h === 12) h = 0;
            return h * 60 + m;
        };
        try {
            const startMin = parseTime(activeLog.checkIn);
            const nowMin = currentTime.getHours() * 60 + currentTime.getMinutes();
            const diff = Math.max(0, nowMin - startMin);
            return `${Math.floor(diff / 60)}h ${diff % 60}m`;
        } catch { return '—'; }
    })();

    return (
        <div className="min-h-screen bg-[#F1F5F9] dark:bg-slate-950 font-display pb-24 overflow-x-hidden">
            {/* ── Remote Check-In Modal ── */}
            {(remotePhase === 'form' || remotePhase === 'submitting' || remotePhase === 'success' || remotePhase === 'error') && (
                <div className="fixed inset-0 z-[115] flex items-end justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] p-8 shadow-2xl border border-white/20 animate-in slide-in-from-bottom-8 duration-300">
                        {remotePhase === 'form' && (
                            <>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="size-12 bg-sky-50 dark:bg-sky-900/20 rounded-2xl flex items-center justify-center text-sky-600">
                                        <span className="material-symbols-outlined">wifi_tethering</span>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900 dark:text-white">Remote Check-In</h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Pending manager approval</p>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Working From</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['Work From Home', 'Client Site', 'Co-working Space', 'Other'].map(loc => (
                                            <button
                                                key={loc}
                                                onClick={() => setRemoteLocation(loc)}
                                                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                                                    remoteLocation === loc
                                                        ? 'bg-sky-500 text-white border-sky-500'
                                                        : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                                                }`}
                                            >{loc}</button>
                                        ))}
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Reason</label>
                                    <textarea
                                        value={remoteReason}
                                        onChange={e => setRemoteReason(e.target.value)}
                                        placeholder="e.g. Doctor appointment in the morning, working remotely after..."
                                        rows={3}
                                        className="w-full text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-sky-400"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <button
                                        onClick={handleRemoteCheckIn}
                                        disabled={!remoteReason.trim()}
                                        className="w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest text-white bg-sky-500 shadow-xl shadow-sky-200 dark:shadow-none hover:bg-sky-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                                    >
                                        Submit for Approval
                                    </button>
                                    <button
                                        onClick={() => { setRemotePhase('idle'); setRemoteReason(''); }}
                                        className="w-full py-3 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
                                    >Cancel</button>
                                </div>
                            </>
                        )}

                        {remotePhase === 'submitting' && (
                            <div className="text-center py-6">
                                <div className="size-20 mx-auto rounded-full bg-sky-50 flex items-center justify-center mb-5">
                                    <span className="material-symbols-outlined text-4xl text-sky-500 animate-spin" style={{ animationDuration: '1s' }}>sync</span>
                                </div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Submitting...</h3>
                                <p className="text-sm text-slate-400 font-bold">Recording remote session and notifying manager.</p>
                            </div>
                        )}

                        {remotePhase === 'success' && (
                            <div className="text-center">
                                <div className="size-20 mx-auto rounded-full bg-emerald-50 flex items-center justify-center mb-5">
                                    <span className="material-symbols-outlined text-4xl text-emerald-500" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                </div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Remote Session Started</h3>
                                <p className="text-sm text-slate-400 font-bold mb-2">Working from <span className="text-sky-500">{remoteLocation}</span>.</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-6">Pending manager approval</p>
                                <button
                                    onClick={() => { setRemotePhase('idle'); setRemoteReason(''); }}
                                    className="w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest text-white bg-emerald-500 shadow-xl shadow-emerald-200 dark:shadow-none active:scale-95 transition-all"
                                >Back to Dashboard</button>
                            </div>
                        )}

                        {remotePhase === 'error' && (
                            <div className="text-center">
                                <div className="size-20 mx-auto rounded-full bg-rose-50 flex items-center justify-center mb-5">
                                    <span className="material-symbols-outlined text-4xl text-rose-500">error</span>
                                </div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Failed</h3>
                                <p className="text-sm text-slate-400 font-bold mb-6">{remoteMessage}</p>
                                <button
                                    onClick={() => setRemotePhase('form')}
                                    className="w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest text-white bg-rose-500 active:scale-95 transition-all"
                                >Try Again</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── QR Scanner Camera Overlay ── */}
            {scanPhase === 'camera' && (
                <QRScannerOverlay onResult={handleQRResult} onCancel={handleQRScanCancel} />
            )}

            {/* ── Result/Status Overlay ── */}
            {(scanPhase === 'validating' || scanPhase === 'success' || scanPhase === 'error' || scanPhase === 'expired' || scanPhase === 'clocking_out') && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[40px] p-8 text-center shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300">
                        
                        {/* Validating spinner */}
                        {(scanPhase === 'validating' || scanPhase === 'clocking_out') && (
                            <>
                                <div className="size-24 mx-auto rounded-full bg-indigo-50 flex items-center justify-center mb-6 border-4 border-indigo-100">
                                    <span className="material-symbols-outlined text-5xl text-indigo-500 animate-spin" style={{ animationDuration: '1s' }}>sync</span>
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                                    {scanPhase === 'clocking_out' ? 'Ending Session...' : 'Verifying QR...'}
                                </h3>
                                <p className="text-sm text-slate-500 font-bold">
                                    {scanPhase === 'clocking_out' ? 'Recording your check-out time.' : 'Validating payload signature and geofence proximity.'}
                                </p>
                            </>
                        )}

                        {/* Success */}
                        {scanPhase === 'success' && (
                            <>
                                <div className="size-24 mx-auto rounded-full bg-emerald-50 flex items-center justify-center mb-6">
                                    <span className="material-symbols-outlined text-5xl text-emerald-500" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 leading-tight">QR Check-In Verified</h3>
                                <p className="text-sm text-slate-500 font-bold mb-3">Shift session started at {scannedLocation}.</p>
                                <div className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-full mb-8">
                                    <span className="material-symbols-outlined text-[14px] text-blue-400">qr_code_scanner</span>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Via {scannedDeviceId}</span>
                                </div>
                                <button
                                    onClick={() => setScanPhase('idle')}
                                    className="w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest text-white bg-emerald-500 shadow-xl shadow-emerald-200 dark:shadow-none active:scale-95 transition-all"
                                >
                                    Back to Dashboard
                                </button>
                            </>
                        )}

                        {/* Error / Expired */}
                        {(scanPhase === 'error' || scanPhase === 'expired') && (
                            <>
                                <div className={`size-24 mx-auto rounded-full flex items-center justify-center mb-6 ${scanPhase === 'expired' ? 'bg-amber-50' : 'bg-rose-50'}`}>
                                    <span className="material-symbols-outlined text-5xl" style={{ color: scanPhase === 'expired' ? '#D97706' : '#E11D48' }}>
                                        {scanPhase === 'expired' ? 'timer_off' : 'location_off'}
                                    </span>
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 leading-tight">
                                    {scanPhase === 'expired' ? 'QR Code Expired' : 'Check-In Blocked'}
                                </h3>
                                <p className="text-sm text-slate-500 font-bold mb-8 leading-relaxed">{scanMessage}</p>
                                <div className="space-y-3">
                                    <button
                                        onClick={() => setScanPhase('camera')}
                                        className="w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest text-white bg-indigo-500 active:scale-95 transition-all"
                                    >
                                        Try Again
                                    </button>
                                    <button
                                        onClick={() => setScanPhase('idle')}
                                        className="w-full py-3 rounded-2xl text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ── Glossy Top Header ── */}
            <div className="bg-[#4F46E5] pt-12 pb-20 px-6 rounded-b-[40px] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 h-64 w-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
                <div className="absolute bottom-0 left-0 h-40 w-40 bg-indigo-400/20 rounded-full -ml-20 -mb-20 blur-2xl" />

                <div className="relative z-10 flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <img src={user.avatar} className="size-12 rounded-2xl object-cover border-2 border-white/50 shadow-lg" alt="Avatar" />
                            <div className="absolute -bottom-1 -right-1 size-4 bg-emerald-500 border-2 border-[#4F46E5] rounded-full" />
                        </div>
                        <div>
                            <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em]">Welcome Back</p>
                            <h2 className="text-white text-xl font-black tracking-tight">{user.name.split(' ')[0]}</h2>
                        </div>
                    </div>
                    <button className="size-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-white relative">
                        <span className="material-symbols-outlined">notifications</span>
                        <div className="absolute top-3 right-3 size-2 bg-rose-500 rounded-full border border-indigo-600" />
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
                        <div className="flex items-center gap-2">
                            <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center gap-1">
                                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter">v{policyVersion.toFixed(2)}</span>
                            </div>
                            <div className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center gap-1">
                                <div className="size-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">Synced</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Started At</p>
                            <p className="text-sm font-bold text-slate-700 dark:text-white">{user.sessionStart}</p>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Duration</p>
                            <p className="text-sm font-bold text-slate-700 dark:text-white">{elapsedDisplay}</p>
                        </div>
                    </div>

                    {/* Check-In / Check-Out button */}
                    {activeLog ? (
                        <button
                            onClick={handleClockOut}
                            disabled={isScanning}
                            className="w-full py-4 bg-rose-500 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-rose-200 dark:shadow-none hover:bg-rose-600 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <span className="material-symbols-outlined">logout</span>
                            {isScanning ? 'Ending Session...' : 'End Session / Clock Out'}
                        </button>
                    ) : (
                        <button
                            onClick={handleStartQRScan}
                            className="w-full py-4 bg-[#4F46E5] text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-indigo-300/40 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined">qr_code_scanner</span>
                            Scan QR to Check In
                        </button>
                    )}

                    {/* Method indicator */}
                    <p className="text-center text-[9px] font-black text-slate-400 uppercase tracking-widest mt-3 flex items-center justify-center gap-1.5">
                        <span className="material-symbols-outlined text-[12px]">qr_code_2</span>
                        QR · GPS Geofenced · 60s Rotating Codes
                    </p>
                </div>

                {/* ── Remote Check-In Card ── */}
                {!activeLog && (
                    <div className="relative z-10 mt-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-[24px] p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="size-10 bg-white/20 rounded-2xl flex items-center justify-center">
                                    <span className="material-symbols-outlined text-white text-[20px]">wifi_tethering</span>
                                </div>
                                <div>
                                    <p className="text-white text-sm font-black">Remote Check-In</p>
                                    <p className="text-white/50 text-[9px] font-bold uppercase tracking-widest">WFH · Client Site · Other</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setRemotePhase('form')}
                                disabled={remotePhase !== 'idle'}
                                className="px-4 py-2 bg-white text-[#4F46E5] text-xs font-black rounded-xl shadow-lg active:scale-95 transition-all disabled:opacity-50"
                            >
                                Check In
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Announcements ── */}
            {announcements.filter(a => a.status === 'Published').length > 0 && (
                <div className="px-6 mt-6 space-y-3">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Announcements</h3>
                    {announcements.filter(a => a.status === 'Published').slice(0, 3).map(ann => {
                        const isAcked = ann.acknowledgements?.some(a => a.empId === activeAdminId);
                        return (
                            <div key={ann.id} className={`p-4 rounded-2xl border ${isAcked ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'}`}>
                                <div className="flex items-start justify-between mb-2">
                                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">{ann.title}</h4>
                                    {isAcked ? (
                                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">Acknowledged</span>
                                    ) : (
                                        <span className="text-[10px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">Action Required</span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">{ann.content}</p>
                                {!isAcked && ann.requiresAcknowledgement && (
                                    <button
                                        onClick={() => acknowledgeAnnouncement(ann.id, activeAdminId)}
                                        className="w-full py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black rounded-xl active:scale-95 transition-all"
                                    >
                                        Acknowledge Receipt
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Manager Cockpit (RBAC Simulation) ── */}
            {isPremium && (
                <div className="px-6 -mt-10 relative z-20 space-y-6">
                    <div className="bg-slate-900 rounded-3xl p-6 shadow-xl relative overflow-hidden border border-slate-800">
                        <div className="absolute -right-6 -top-6 h-24 w-24 bg-indigo-500/10 rounded-full blur-xl" />
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

                    {/* Quick Info Cards */}
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

                    {/* QR Security Info */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="size-9 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                                <span className="material-symbols-outlined text-[20px]">qr_code_scanner</span>
                            </div>
                            <div>
                                <h3 className="text-slate-900 dark:text-white font-black text-sm">QR Attendance Active</h3>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Authenticated via ZKT Terminal</p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {[
                                { icon: 'timer', label: 'Code Rotation', value: 'Every 60 seconds', color: 'text-blue-500' },
                                { icon: 'gpp_good', label: 'Geofence', value: 'GPS verified', color: 'text-emerald-500' },
                                { icon: 'security', label: 'Replay Protection', value: 'Timestamp signed', color: 'text-violet-500' },
                            ].map(r => (
                                <div key={r.label} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                                    <div className="flex items-center gap-2">
                                        <span className={`material-symbols-outlined text-[16px] ${r.color}`}>{r.icon}</span>
                                        <span className="text-xs text-slate-500 font-bold">{r.label}</span>
                                    </div>
                                    <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wide">{r.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Company Bulletins */}
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

            {/* ── Floating Bottom Nav ── */}
            <div className="fixed bottom-6 left-6 right-6 z-[100]">
                <div className="bg-slate-900/80 backdrop-blur-2xl px-8 py-4 rounded-[30px] border border-white/10 shadow-2xl flex items-center justify-between">
                    <button className="text-white hover:text-indigo-400 transition-colors">
                        <span className="material-symbols-outlined">home</span>
                    </button>
                    <button className="text-slate-500 hover:text-white transition-colors">
                        <span className="material-symbols-outlined">event_note</span>
                    </button>
                    {/* Center QR FAB */}
                    <div className="relative -top-10">
                        <button
                            onClick={activeLog ? handleClockOut : handleStartQRScan}
                            disabled={scanPhase !== 'idle'}
                            className={`size-16 rounded-full flex items-center justify-center text-white shadow-2xl transition-all active:scale-90 disabled:opacity-70 ${
                                scanPhase !== 'idle' ? 'bg-amber-500 animate-pulse' :
                                activeLog ? 'bg-rose-500 shadow-rose-500/50' :
                                'bg-[#4F46E5] shadow-indigo-500/50'
                            }`}
                        >
                            <span className="material-symbols-outlined text-3xl">
                                {scanPhase !== 'idle' ? 'wifi_protected_setup' : activeLog ? 'logout' : 'qr_code_scanner'}
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
        </div>
    );
}
