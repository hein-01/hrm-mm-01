import React from 'react';

interface EmptyStateCardProps {
    icon?: string;
    title: string;
    subtitle?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    compact?: boolean;
}

/**
 * EmptyStateCard — A polished empty state with optional CTA.
 * Replaces bare `return null` patterns for filter/search empty results.
 *
 * Usage:
 *   <EmptyStateCard
 *     icon="person_search"
 *     title="No employees match this filter"
 *     subtitle="Try adjusting your search or department filter."
 *     action={{ label: 'Invite New Employee', onClick: () => {} }}
 *   />
 */
export default function EmptyStateCard({ icon = 'search_off', title, subtitle, action, compact = false }: EmptyStateCardProps) {
    return (
        <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8 px-4' : 'py-16 px-6'}`}>
            <div className={`${compact ? 'size-12' : 'size-16'} rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 shadow-inner`}>
                <span className={`material-symbols-outlined ${compact ? 'text-[24px]' : 'text-[32px]'} text-slate-400 dark:text-slate-500`}>{icon}</span>
            </div>
            <h4 className={`font-bold text-slate-700 dark:text-slate-300 ${compact ? 'text-sm' : 'text-base'} mb-1`}>{title}</h4>
            {subtitle && (
                <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs leading-relaxed">{subtitle}</p>
            )}
            {action && (
                <button
                    onClick={action.onClick}
                    className="mt-5 px-5 py-2.5 bg-[#4F46E5] hover:bg-indigo-600 text-white text-xs font-black rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none uppercase tracking-widest transition-all hover:scale-105"
                >
                    {action.label}
                </button>
            )}
        </div>
    );
}
