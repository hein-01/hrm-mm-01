import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications, NotificationCategory, PushNotification } from '../context/NotificationProvider';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(ts: number): string {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60_000);
    if (mins < 1)  return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

const BADGE_COLORS: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
    blue:    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
    violet:  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400',
    indigo:  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400',
    amber:   'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    rose:    'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400',
    slate:   'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

const PRIORITY_DOT: Record<string, string> = {
    urgent: 'bg-rose-500 animate-pulse',
    high:   'bg-amber-500',
    normal: 'bg-blue-400',
    low:    'bg-slate-300',
};

const CATEGORY_TABS: { key: 'all' | NotificationCategory; label: string; icon: string }[] = [
    { key: 'all',        label: 'All',        icon: 'notifications'   },
    { key: 'HR',         label: 'HR',         icon: 'people'          },
    { key: 'Financial',  label: 'Finance',    icon: 'payments'        },
    { key: 'Attendance', label: 'Attendance', icon: 'fingerprint'     },
    { key: 'Compliance', label: 'Compliance', icon: 'gavel'           },
    { key: 'System',     label: 'System',     icon: 'campaign'        },
];

// ─── Single Notification Card ─────────────────────────────────────────────────
function NotificationCard({ n, onRead, onDismiss, onNavigate }: {
    n: PushNotification;
    onRead: () => void;
    onDismiss: () => void;
    onNavigate: (route: string) => void;
}) {
    return (
        <div
            className={`relative group p-4 border-b border-slate-100 dark:border-slate-800 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer ${!n.isRead ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''}`}
            onClick={() => { onRead(); if (n.actionRoute) onNavigate(n.actionRoute); }}
        >
            <div className="flex gap-3">
                {/* Icon */}
                <div className={`size-10 rounded-2xl flex items-center justify-center shrink-0 ${n.iconBg}`}>
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>{n.icon}</span>
                    <span className={`sr-only ${n.iconColor}`}/>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className={`text-sm font-bold leading-snug ${!n.isRead ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                                {n.title}
                            </p>
                            {n.badge && (
                                <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full ${BADGE_COLORS[n.badgeColor || 'slate'] || BADGE_COLORS.slate}`}>
                                    {n.badge}
                                </span>
                            )}
                        </div>
                        {/* Unread dot */}
                        {!n.isRead && (
                            <div className={`size-2 rounded-full shrink-0 mt-1 ${PRIORITY_DOT[n.priority]}`} />
                        )}
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">
                        {n.body}
                    </p>

                    <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-slate-400 font-medium">{timeAgo(n.timestamp)}</span>
                        {n.actionRoute && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onRead(); onNavigate(n.actionRoute!); }}
                                className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg transition-all border-none
                                    ${n.iconColor.replace('text-', 'text-')} bg-white dark:bg-slate-800 hover:opacity-80`}
                            >
                                {n.actionLabel || 'View'} →
                            </button>
                        )}
                    </div>
                </div>

                {/* Dismiss X */}
                <button
                    onClick={(e) => { e.stopPropagation(); onDismiss(); }}
                    className="opacity-0 group-hover:opacity-100 size-6 flex items-center justify-center text-slate-300 hover:text-slate-500 transition-all shrink-0 mt-0.5 border-none bg-transparent rounded"
                >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
            </div>
        </div>
    );
}

// ─── Main NotificationCenter Panel ───────────────────────────────────────────
interface NotificationCenterProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
    const {
        notifications, unreadCount,
        markRead, markAllRead, dismiss, clearAll,
        browserPermission, requestBrowserPermission,
    } = useNotifications();

    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'all' | NotificationCategory>('all');
    const [showOnlyUnread, setShowOnlyUnread] = useState(false);

    const filtered = notifications.filter(n => {
        if (activeTab !== 'all' && n.category !== activeTab) return false;
        if (showOnlyUnread && n.isRead) return false;
        return true;
    });

    const tabCount = (key: 'all' | NotificationCategory) =>
        key === 'all'
            ? notifications.filter(n => !n.isRead).length
            : notifications.filter(n => n.category === key && !n.isRead).length;

    const handleNavigate = (route: string) => {
        navigate(route);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[1098] bg-transparent"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="fixed top-[73.5px] right-4 z-[1099] w-[420px] max-h-[calc(100vh-90px)] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden animate-in slide-in-from-top-3 fade-in duration-200 ring-1 ring-black/5">

                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="size-9 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-indigo-600 dark:text-indigo-400 text-[20px]">notifications</span>
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-slate-900 dark:text-white">Notifications</h2>
                            <p className="text-[10px] text-slate-400 font-medium">
                                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllRead}
                                className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 uppercase tracking-wider border-none bg-transparent cursor-pointer px-2 py-1 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all"
                            >
                                Mark all read
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="size-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all border-none bg-transparent"
                        >
                            <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                    </div>
                </div>

                {/* Browser Permission Banner */}
                {browserPermission === 'default' && (
                    <div className="px-5 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-900/30 flex items-center gap-3 shrink-0">
                        <span className="material-symbols-outlined text-amber-600 text-[20px] shrink-0">notification_important</span>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-amber-800 dark:text-amber-300">Enable push notifications</p>
                            <p className="text-[10px] text-amber-600 dark:text-amber-400">Get alerts for approvals, payslips and shifts</p>
                        </div>
                        <button
                            onClick={requestBrowserPermission}
                            className="text-[10px] font-black text-white bg-amber-500 hover:bg-amber-600 px-3 py-1.5 rounded-lg border-none cursor-pointer transition-all whitespace-nowrap"
                        >
                            Allow
                        </button>
                    </div>
                )}

                {/* Category Tabs */}
                <div className="flex items-center gap-1 px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 overflow-x-auto shrink-0 scrollbar-none">
                    {CATEGORY_TABS.map(({ key, label, icon }) => {
                        const count = tabCount(key);
                        const active = activeTab === key;
                        return (
                            <button
                                key={key}
                                onClick={() => setActiveTab(key)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all border-none cursor-pointer ${
                                    active
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 bg-transparent'
                                }`}
                            >
                                <span className="material-symbols-outlined text-[13px]">{icon}</span>
                                {label}
                                {count > 0 && (
                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full min-w-[16px] text-center ${
                                        active ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400'
                                    }`}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Filter row */}
                <div className="flex items-center justify-between px-5 py-2 border-b border-slate-50 dark:border-slate-800/50 shrink-0">
                    <span className="text-[10px] text-slate-400 font-medium">
                        {filtered.length} notification{filtered.length !== 1 ? 's' : ''}
                    </span>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Unread only</span>
                        <div
                            onClick={() => setShowOnlyUnread(p => !p)}
                            className={`w-8 h-4 rounded-full relative transition-all cursor-pointer ${showOnlyUnread ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                        >
                            <div className={`absolute top-0.5 size-3 bg-white rounded-full shadow transition-all ${showOnlyUnread ? 'right-0.5' : 'left-0.5'}`} />
                        </div>
                    </label>
                </div>

                {/* Notification List */}
                <div className="flex-1 overflow-y-auto">
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
                            <div className="size-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-3xl text-slate-300 dark:text-slate-600">notifications_off</span>
                            </div>
                            <p className="text-sm font-bold text-slate-400">No notifications</p>
                            <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">
                                {showOnlyUnread ? 'All notifications are read' : 'You\'re all caught up!'}
                            </p>
                        </div>
                    ) : (
                        filtered.map(n => (
                            <NotificationCard
                                key={n.id}
                                n={n}
                                onRead={() => markRead(n.id)}
                                onDismiss={() => dismiss(n.id)}
                                onNavigate={handleNavigate}
                            />
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 shrink-0">
                    <span className="text-[10px] text-slate-400 font-medium">TechDance HR · Push Engine v1.0</span>
                    {notifications.length > 0 && (
                        <button
                            onClick={clearAll}
                            className="text-[10px] font-bold text-slate-400 hover:text-rose-500 transition-colors border-none bg-transparent cursor-pointer"
                        >
                            Clear all
                        </button>
                    )}
                </div>
            </div>
        </>
    );
}
