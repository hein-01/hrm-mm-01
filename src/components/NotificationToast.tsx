import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationProvider';

/**
 * NotificationToast — renders a floating toast in the top-right corner.
 * Appears whenever pushNotification() is called, auto-dismisses after
 * priority-based duration. Supports one-click deep navigation.
 */
export default function NotificationToast() {
    const { latestToast, isToastVisible, dismissToast, markRead } = useNotifications();
    const navigate = useNavigate();
    const [mounted, setMounted] = useState(false);

    // Slightly delay mount for animation to work
    useEffect(() => {
        if (isToastVisible) {
            requestAnimationFrame(() => setMounted(true));
        } else {
            const t = setTimeout(() => setMounted(false), 300);
            return () => clearTimeout(t);
        }
    }, [isToastVisible]);

    if (!latestToast && !mounted) return null;
    const n = latestToast;
    if (!n) return null;

    const handleAction = () => {
        markRead(n.id);
        dismissToast();
        if (n.actionRoute) navigate(n.actionRoute);
    };

    const PRIORITY_ACCENT: Record<string, string> = {
        urgent: 'border-l-rose-500',
        high:   'border-l-amber-500',
        normal: 'border-l-indigo-500',
        low:    'border-l-slate-400',
    };

    return (
        <div
            className={`fixed top-20 right-5 z-[1200] w-[360px] transition-all duration-300 ${
                isToastVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
            }`}
        >
            <div className={`bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 border-l-4 ${PRIORITY_ACCENT[n.priority] || PRIORITY_ACCENT.normal} overflow-hidden ring-1 ring-black/5`}>
                <div className="p-4 flex gap-3">
                    {/* Icon */}
                    <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${n.iconBg}`}>
                        <span className={`material-symbols-outlined text-[20px] ${n.iconColor}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                            {n.icon}
                        </span>
                    </div>

                    {/* Body */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm font-black text-slate-900 dark:text-white leading-snug truncate">{n.title}</p>
                            {n.priority === 'urgent' && (
                                <span className="text-[8px] font-black text-rose-600 bg-rose-100 dark:bg-rose-900/30 px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 animate-pulse">
                                    Urgent
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">{n.body}</p>

                        {n.actionRoute && (
                            <button
                                onClick={handleAction}
                                className={`mt-2 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg border-none cursor-pointer transition-all ${n.iconColor} bg-slate-50 dark:bg-slate-800 hover:opacity-80`}
                            >
                                {n.actionLabel || 'View'} →
                            </button>
                        )}
                    </div>

                    {/* Close */}
                    <button
                        onClick={dismissToast}
                        className="size-6 flex items-center justify-center text-slate-300 hover:text-slate-500 transition-colors border-none bg-transparent cursor-pointer shrink-0"
                    >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                </div>

                {/* Progress bar — shrinks over toast duration */}
                <div className="h-0.5 bg-slate-100 dark:bg-slate-800">
                    <div
                        className={`h-full ${n.iconColor.replace('text-', 'bg-')} transition-none`}
                        style={{
                            animation: isToastVisible
                                ? `toast-drain ${n.priority === 'urgent' ? 8 : n.priority === 'high' ? 5 : n.priority === 'normal' ? 3.5 : 2.5}s linear forwards`
                                : 'none',
                        }}
                    />
                </div>
            </div>

            {/* Inline keyframe via style tag */}
            <style>{`
                @keyframes toast-drain {
                    from { width: 100%; }
                    to   { width: 0%;   }
                }
            `}</style>
        </div>
    );
}
