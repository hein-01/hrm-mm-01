import React from 'react';

/**
 * SkeletonCard — A shimmer placeholder matching an employee or entity card.
 * Used in: EmployeesDirectory card grid view, Candidates, etc.
 */
export function SkeletonCard() {
    return (
        <div className="animate-pulse bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 flex flex-col gap-4 shadow-sm">
            {/* Avatar + Name Row */}
            <div className="flex items-center gap-3">
                <div className="size-12 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
                <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full w-2/3" />
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full w-1/2" />
                </div>
                <div className="size-6 rounded-full bg-slate-100 dark:bg-slate-800" />
            </div>
            {/* Meta Tags */}
            <div className="flex gap-2">
                <div className="h-5 w-16 bg-slate-100 dark:bg-slate-800 rounded-full" />
                <div className="h-5 w-20 bg-slate-100 dark:bg-slate-800 rounded-full" />
            </div>
            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="h-8 bg-slate-50 dark:bg-slate-800 rounded-xl" />
                <div className="h-8 bg-slate-50 dark:bg-slate-800 rounded-xl" />
            </div>
        </div>
    );
}

/**
 * SkeletonCardGrid — Renders N skeleton cards in a responsive grid.
 */
export function SkeletonCardGrid({ count = 10 }: { count?: number }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </div>
    );
}
