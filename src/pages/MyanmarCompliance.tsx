import React, { useState, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useAppData } from '../context/AppDataContext';
import { useNotifications } from '../context/NotificationProvider';
import { Holiday } from '../types/hrms.types';

type Tab = 'Tax Calculator' | 'Labor Deadlines' | 'Holidays' | 'NRC Registry';

// ─── Shared Badges ────────────────────────────────────────────────────────────
function Badge({ children, color }: { children: React.ReactNode; color: 'green' | 'emerald' | 'red' | 'amber' | 'slate' | 'indigo' | 'violet' }) {
    const maps = {
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        red: 'bg-rose-50 text-rose-700 border-rose-200',
        amber: 'bg-amber-50 text-amber-700 border-amber-200',
        slate: 'bg-slate-50 text-slate-700 border-slate-200',
        indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        violet: 'bg-violet-50 text-violet-700 border-violet-200',
    };
    return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${maps[color]}`}>
            {children}
        </span>
    );
}

export default function MyanmarCompliance() {
    const [activeTab, setActiveTab] = useState<Tab>('Tax Calculator');
    const { employees, complianceSettings, laborContracts, holidays, addHoliday } = useAppData();
    const { pushNotification } = useNotifications();

    // ─── TAB 1: Tax Calculator State ──────────────────────────────────────────
    const [calcSalary, setCalcSalary] = useState<number>(1000000);
    const [calcSpouse, setCalcSpouse] = useState<boolean>(false);
    const [calcParents, setCalcParents] = useState<number>(0);

    const taxDetails = useMemo(() => {
        // SSB: 2% of salary, capped
        const ssb = Math.min(calcSalary * (complianceSettings.ssbPercent / 100), complianceSettings.ssbCap * (complianceSettings.ssbPercent / 100));
        
        // PIT
        const annualIncome = calcSalary * 12;
        const ssbAnnual = ssb * 12;
        const basicRelief = Math.min(annualIncome * 0.2, 10000000); // 20% capped at 10m
        const spouseRelief = calcSpouse ? 1000000 : 0;
        const parentsRelief = calcParents * 1000000;
        const exemption = complianceSettings.pitExemption;

        const totalReliefs = basicRelief + spouseRelief + parentsRelief + ssbAnnual;
        const assessableIncome = Math.max(0, annualIncome - totalReliefs);

        let pitAnnual = 0;
        let pitTier = 0;
        const waterfall = [];

        if (assessableIncome > exemption) {
            const bands = [
                { limit: 2000000, rate: 0 },
                { limit: 5000000, rate: 0.05 },
                { limit: 10000000, rate: 0.10 },
                { limit: 20000000, rate: 0.15 },
                { limit: 30000000, rate: 0.20 },
                { limit: Infinity, rate: 0.25 },
            ];

            let remaining = assessableIncome;
            let previousLimit = 0;

            for (const b of bands) {
                const bandSize = b.limit - previousLimit;
                const inBand = Math.min(remaining, bandSize);
                if (inBand > 0) {
                    const taxForBand = inBand * b.rate;
                    pitAnnual += taxForBand;
                    if (b.rate > 0 && inBand > 0) pitTier = b.rate * 100;
                    waterfall.push({ range: `${(previousLimit/1000000)}M - ${b.limit===Infinity ? '...' : (b.limit/1000000)+'M'}`, rate: b.rate * 100, amount: inBand, tax: taxForBand });
                }
                remaining -= inBand;
                if (remaining <= 0) break;
                previousLimit = b.limit;
            }
        }

        return {
            ssb, annualIncome, assessableIncome, totalReliefs,
            exemption, pitAnnual, pitMonthly: pitAnnual / 12, pitTier, waterfall
        };
    }, [calcSalary, calcSpouse, calcParents, complianceSettings]);

    // ─── TAB 2: Labor Deadlines ───────────────────────────────────────────────
    const deadlines = useMemo(() => {
        const today = new Date().getTime();
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        return laborContracts.filter(c => c.status === 'Active' && c.endDate).map(c => {
            const end = new Date(c.endDate!).getTime();
            const daysLeft = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
            let urgency: 'red' | 'amber' | 'slate' = 'slate';
            if (daysLeft < 15) urgency = 'red';
            else if (daysLeft <= 30) urgency = 'amber';
            return { ...c, daysLeft, urgency };
        }).sort((a, b) => a.daysLeft - b.daysLeft);
    }, [laborContracts]);

    // ─── TAB 3: Holidays ────────────
    const myanmarMoiHolidays = [
        { date: '2024-01-04', name: 'Independence Day', isRestricted: true },
        { date: '2024-02-12', name: 'Union Day', isRestricted: true },
        { date: '2024-03-02', name: 'Peasants Day', isRestricted: true },
        { date: '2024-03-27', name: 'Armed Forces Day', isRestricted: true },
        { date: '2024-04-13', name: 'Thingyan Festival (Water Festival)', isRestricted: true },
        { date: '2024-04-14', name: 'Thingyan Festival (Water Festival)', isRestricted: true },
        { date: '2024-04-15', name: 'Thingyan Festival (Water Festival)', isRestricted: true },
        { date: '2024-04-16', name: 'Thingyan Festival (Water Festival)', isRestricted: true },
        { date: '2024-04-17', name: 'Myanmar New Year', isRestricted: true },
        { date: '2024-05-01', name: 'Labor Day', isRestricted: true },
        { date: '2024-07-19', name: 'Martyrs Day', isRestricted: true }
    ];

    const syncHolidays = () => {
        myanmarMoiHolidays.forEach(h => {
            if (!holidays.some(ext => ext.date === h.date)) {
                addHoliday(h);
            }
        });
        pushNotification({
            title: `MOI Holidays Synced`,
            body: `2024 Myanmar Public Holidays imported successfully.`,
            category: 'System', priority: 'normal', icon: 'event', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500'
        });
    };

    // ─── TAB 4: NRC Registry ───────────────────────────────────────────────
    // Basic regex for MM format: 12/BaHaNa(N)123456
    const nrcRegex = /^([1-9]|1[0-4])\/[a-zA-Z]+\([N|E|P]\)\d{6}$/i;
    const nrcStats = useMemo(() => {
        const active = employees.filter(e => e.status !== 'Terminated');
        const valid = active.filter(e => e.nrcNumber && nrcRegex.test(e.nrcNumber));
        const invalid = active.filter(e => e.nrcNumber && !nrcRegex.test(e.nrcNumber));
        const missing = active.filter(e => !e.nrcNumber);
        return { total: active.length, valid, invalid, missing };
    }, [employees]);


    return (
        <div className="flex h-screen overflow-hidden bg-[#F8FAFC] dark:bg-slate-950 font-display text-slate-900 dark:text-slate-100">
            <Sidebar activeTab="Compliance Hub" />
            <main className="flex flex-col h-full overflow-hidden ml-[280px] flex-1">
                <Header title="Myanmar Compliance Hub" subtitle="Labor Law Alerts, Tax Smart Calculators, NRC Validation" />

                <div className="flex-1 overflow-y-auto px-8 pb-8">
                    {/* Tab Navigation */}
                    <div className="flex items-center gap-1 mt-8 mb-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 w-fit shadow-sm">
                        {(['Tax Calculator', 'Labor Deadlines', 'Holidays', 'NRC Registry'] as Tab[]).map(t => (
                            <button key={t} onClick={() => setActiveTab(t)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer
                                    ${activeTab === t ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 bg-transparent'}`}>
                                {t}
                            </button>
                        ))}
                    </div>

                    {/* ─── TAB: Tax Calculator ─────────────────────────── */}
                    {activeTab === 'Tax Calculator' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
                            {/* Simulator Input */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm h-fit">
                                <h3 className="text-sm font-black mb-6 flex items-center gap-2"><span className="material-symbols-outlined text-indigo-600">tune</span> Salary Simulator</h3>
                                
                                <div className="space-y-6">
                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <label className="text-xs font-bold text-slate-600">Base Salary (MMK)</label>
                                            <span className="text-sm font-black text-indigo-600">{calcSalary.toLocaleString()} MMK</span>
                                        </div>
                                        <input type="range" min="150000" max="10000000" step="50000"
                                            value={calcSalary} onChange={e => setCalcSalary(Number(e.target.value))}
                                            className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-6">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input type="checkbox" checked={calcSpouse} onChange={e => setCalcSpouse(e.target.checked)} className="peer sr-only" />
                                            <div className="size-6 rounded border-2 border-slate-300 peer-checked:bg-indigo-600 peer-checked:border-indigo-600 flex items-center justify-center transition-all">
                                                <span className="material-symbols-outlined text-white text-[16px] opacity-0 peer-checked:opacity-100 transition-opacity">check</span>
                                            </div>
                                            <span className="text-xs font-bold text-slate-700">Spouse Allowance</span>
                                        </label>
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <select value={calcParents} onChange={e => setCalcParents(Number(e.target.value))} className="w-16 rounded-md border border-slate-300 bg-slate-50 text-xs p-1">
                                                <option value={0}>0</option><option value={1}>1</option><option value={2}>2</option>
                                            </select>
                                            <span className="text-xs font-bold text-slate-700">Parents Relief</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Results */}
                            <div className="space-y-4">
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm border-l-4 border-l-emerald-500">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-sm font-black flex items-center gap-2"><span className="material-symbols-outlined text-emerald-600">health_and_safety</span> Monthly SSB</h3>
                                        <Badge color="emerald">Capped</Badge>
                                    </div>
                                    <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{taxDetails.ssb.toLocaleString()} MMK</p>
                                    <p className="text-[10px] text-slate-500 mt-1">2% deduction. Max calc limit: 300,000 MMK</p>
                                </div>

                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm border-l-4 border-l-rose-500">
                                    <div className="p-6 border-b border-slate-100">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-sm font-black flex items-center gap-2"><span className="material-symbols-outlined text-rose-600">account_balance</span> Monthly PIT</h3>
                                            <Badge color="amber">Tier: {taxDetails.pitTier}%</Badge>
                                        </div>
                                        <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{taxDetails.pitMonthly.toLocaleString()} MMK</p>
                                        <p className="text-[10px] text-slate-500 mt-1">Annual PIT: {taxDetails.pitAnnual.toLocaleString()} MMK</p>
                                    </div>
                                    {taxDetails.waterfall.length > 0 && (
                                        <div className="p-4 bg-slate-50 rounded-b-2xl">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 px-2">Tax Brackets Applied</p>
                                            <div className="space-y-1">
                                                {taxDetails.waterfall.map((w, i) => (
                                                    <div key={i} className="flex items-center justify-between px-2 py-1.5 hover:bg-slate-100 rounded">
                                                        <span className="text-xs text-slate-600 w-24">{w.range}</span>
                                                        <span className="text-xs font-bold w-12 text-center text-slate-500">{w.rate}%</span>
                                                        <span className="text-xs font-black text-slate-800 tabular-nums">{w.tax.toLocaleString()}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ─── TAB: Labor Deadlines ─────────────────────────── */}
                    {activeTab === 'Labor Deadlines' && (
                        <div className="max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50">
                                <h4 className="font-bold text-slate-800">Critical Labor Deadlines (Next 60 Days)</h4>
                                <Badge color="indigo">{deadlines.length} Alert(s)</Badge>
                            </div>
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {deadlines.length === 0 ? (
                                    <div className="p-12 text-center text-slate-400 font-bold">No upcoming deadlines 🎉</div>
                                ) : deadlines.map(d => (
                                    <div key={d.id} className="p-5 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                                        <div className="size-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-slate-500">{d.type === 'Probation' ? 'school' : 'description'}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-900 truncate">{d.employeeName}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">{d.role || d.type} · {d.dept}</p>
                                        </div>
                                        <div className="text-right">
                                            <Badge color={d.urgency}>{d.daysLeft} days left</Badge>
                                            <p className="text-[10px] text-slate-400 mt-1">Exp: {d.endDate}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ─── TAB: Holidays ─────────────────────────── */}
                    {activeTab === 'Holidays' && (
                        <div className="max-w-5xl">
                            <div className="flex justify-between items-end mb-6">
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 mb-1">Public Holidays</h3>
                                    <p className="text-xs text-slate-500">Government gazetted holidays for automated attendance mapping</p>
                                </div>
                                <button onClick={syncHolidays} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-sm border border-indigo-200 transition-colors">
                                    <span className="material-symbols-outlined text-[18px]">sync</span>
                                    Sync 2024 MOI Holidays
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {holidays.map((h, i) => (
                                    <div key={i} className="bg-white border text-left border-slate-200 rounded-xl p-4 flex items-center gap-3">
                                        <div className={`size-10 rounded-xl flex items-center justify-center ${h.isRestricted ? 'bg-rose-50 text-rose-500' : 'bg-slate-100 text-slate-500'}`}>
                                            <span className="material-symbols-outlined">{h.isRestricted ? 'free_cancellation' : 'event'}</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">{h.name}</p>
                                            <p className="text-xs text-slate-500 font-mono mt-0.5">{h.date}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ─── TAB: NRC Registry ─────────────────────────── */}
                    {activeTab === 'NRC Registry' && (
                        <div className="max-w-4xl space-y-6">
                            <div className="grid grid-cols-4 gap-4">
                                <div className="p-4 bg-white border rounded-xl text-center"><p className="text-2xl font-black">{nrcStats.total}</p><p className="text-[10px] uppercase text-slate-500">Employees</p></div>
                                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center"><p className="text-2xl font-black text-emerald-600">{nrcStats.valid.length}</p><p className="text-[10px] uppercase text-emerald-700">Valid Format</p></div>
                                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-center"><p className="text-2xl font-black text-rose-600">{nrcStats.invalid.length}</p><p className="text-[10px] uppercase text-rose-700">Invalid Syntax</p></div>
                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center"><p className="text-2xl font-black text-amber-600">{nrcStats.missing.length}</p><p className="text-[10px] uppercase text-amber-700">Missing</p></div>
                            </div>

                            <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
                                <div className="p-4 border-b bg-slate-50 font-bold text-slate-800">NRC Format Validation Report</div>
                                <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                                    {(nrcStats.invalid.length > 0 ? nrcStats.invalid : nrcStats.missing).map(e => (
                                        <div key={e.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                                            <div className="flex items-center gap-3">
                                                <div className="size-8 bg-slate-200 rounded-full flex items-center justify-center font-bold text-xs">{e.initials || e.name[0]}</div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800">{e.name}</p>
                                                    <p className="text-xs text-slate-500">{e.role}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-mono text-sm font-bold text-slate-700">{e.nrcNumber || '—'}</p>
                                                {e.nrcNumber ? <Badge color="red">Invalid Format</Badge> : <Badge color="amber">Missing</Badge>}
                                            </div>
                                        </div>
                                    ))}
                                    {nrcStats.invalid.length === 0 && nrcStats.missing.length === 0 && (
                                        <div className="p-10 text-center font-bold text-emerald-500">All employee NRCs are valid! 🎉</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
