import React from 'react';

interface StandardDataWidgetProps {
    label?: string;
    metrics?: { title: string; value: string | number; icon: string; color: string }[];
    onUpgradeClick?: () => void;
}

/**
 * StandardDataWidget — Shown to 'standard' tier users in place of AI components.
 * Displays SQL-computed HR KPIs and a subtle Premium upgrade prompt.
 */
export default function StandardDataWidget({
    label = 'Upgrade to Premium for AI Insights',
    metrics = [],
    onUpgradeClick
}: StandardDataWidgetProps) {
    return (
        <div className="relative rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 p-6 overflow-hidden">
            {/* Premium Lock Overlay Hint */}
            <div className="absolute top-3 right-3">
                <span className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-full">
                    <span className="material-symbols-outlined text-[12px]">lock</span>
                    Standard
                </span>
            </div>

            {/* Metrics (greyed-out, SQL-computed) */}
            {metrics.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 mb-5">
                    {metrics.map((m, i) => (
                        <div key={i} className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`material-symbols-outlined text-[16px] ${m.color}`}>{m.icon}</span>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{m.title}</p>
                            </div>
                            <p className="text-lg font-black text-slate-800 dark:text-white">{m.value}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex items-center gap-3 mb-5">
                    <div className="size-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-indigo-300">analytics</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-400 italic">AI-powered insights are not available on this plan.</p>
                </div>
            )}

            {/* Upgrade CTA */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                <p className="text-xs text-slate-500 mb-3">{label}</p>
                <button
                    onClick={onUpgradeClick}
                    className="flex items-center gap-2 text-xs font-black text-indigo-600 hover:text-indigo-700 transition-colors uppercase tracking-widest group"
                >
                    <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                    Unlock Smart Insights
                    <span className="material-symbols-outlined text-[14px] transition-transform group-hover:translate-x-1">arrow_forward</span>
                </button>
            </div>
        </div>
    );
}
