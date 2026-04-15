import React from 'react';

/**
 * SkeletonRow — A shimmer placeholder matching a table row.
 * Renders when data is loading (isLoading == true in parent).
 * Used in: Attendance.tsx, SSBPIT.tsx, Adjustments, etc.
 */
export function SkeletonRow({ columns = 5 }: { columns?: number }) {
    return (
        <tr className="animate-pulse border-b border-slate-100 dark:border-slate-800">
            {Array.from({ length: columns }).map((_, i) => (
                <td key={i} className="px-6 py-4">
                    <div className={`h-3 bg-slate-200 dark:bg-slate-700 rounded-full ${i === 0 ? 'w-3/4' : i === columns - 1 ? 'w-1/2' : 'w-full'}`} />
                    {i === 0 && (
                        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full w-1/2 mt-2" />
                    )}
                </td>
            ))}
        </tr>
    );
}

/**
 * SkeletonTable — Renders N skeleton rows inside a wrapper div.
 * Suitable for table bodies awaiting async data.
 */
export function SkeletonTable({ rows = 10, columns = 5 }: { rows?: number; columns?: number }) {
    return (
        <>
            {Array.from({ length: rows }).map((_, i) => (
                <SkeletonRow key={i} columns={columns} />
            ))}
        </>
    );
}
