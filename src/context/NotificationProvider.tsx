import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
export type NotificationCategory = 'HR' | 'Financial' | 'Attendance' | 'System' | 'Compliance';
export type NotificationPriority = 'urgent' | 'high' | 'normal' | 'low';

export interface PushNotification {
    id: string;
    title: string;
    body: string;
    category: NotificationCategory;
    priority: NotificationPriority;
    icon: string;            // material-symbols name
    iconBg: string;          // tailwind bg class
    iconColor: string;       // tailwind text class
    timestamp: number;       // unix ms
    isRead: boolean;
    actionRoute?: string;    // deep link path e.g. '/leave-requests'
    actionLabel?: string;    // button label e.g. 'View Request'
    badge?: string;          // small pill text e.g. 'Approved'
    badgeColor?: string;     // tailwind color for badge
    empId?: string;          // related employee (for filtering)
    sourceId?: string;       // ID of source record (leave, expense, etc.)
}

// ─── Context Shape ────────────────────────────────────────────────────────────
interface NotificationContextType {
    notifications: PushNotification[];
    unreadCount: number;
    pushNotification: (n: Omit<PushNotification, 'id' | 'timestamp' | 'isRead'>) => void;
    markRead: (id: string) => void;
    markAllRead: () => void;
    dismiss: (id: string) => void;
    clearAll: () => void;
    browserPermission: NotificationPermission | 'unsupported';
    requestBrowserPermission: () => Promise<void>;
    isToastVisible: boolean;
    latestToast: PushNotification | null;
    dismissToast: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotifications(): NotificationContextType {
    const ctx = useContext(NotificationContext);
    if (!ctx) throw new Error('useNotifications must be inside NotificationProvider');
    return ctx;
}

// ─── Priority → toast duration ────────────────────────────────────────────────
const TOAST_DURATION: Record<NotificationPriority, number> = {
    urgent: 8000,
    high:   5000,
    normal: 3500,
    low:    2500,
};

// ─── Seed notifications for demo ─────────────────────────────────────────────
const SEED_NOTIFICATIONS: PushNotification[] = [
    {
        id: 'NOTIF-SEED-001', title: 'Payslip Ready — October 2023',
        body: 'Your October payslip has been processed and is available for download.',
        category: 'Financial', priority: 'high', icon: 'payments',
        iconBg: 'bg-emerald-100 dark:bg-emerald-900/30', iconColor: 'text-emerald-600 dark:text-emerald-400',
        timestamp: Date.now() - 1 * 60 * 60 * 1000, isRead: false,
        actionRoute: '/payroll-run', actionLabel: 'View Payslip', badge: 'Ready', badgeColor: 'emerald',
    },
    {
        id: 'NOTIF-SEED-002', title: 'Leave Request Approved',
        body: 'Your Annual Leave request (Oct 28–30) has been approved by HR Manager.',
        category: 'HR', priority: 'high', icon: 'beach_access',
        iconBg: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400',
        timestamp: Date.now() - 3 * 60 * 60 * 1000, isRead: false,
        actionRoute: '/leave-requests', actionLabel: 'View Details', badge: 'Approved', badgeColor: 'blue',
    },
    {
        id: 'NOTIF-SEED-003', title: 'Expense Claim Approved',
        body: 'Your Transport expense claim of 45,000 MMK has been approved and queued for reimbursement.',
        category: 'Financial', priority: 'normal', icon: 'receipt_long',
        iconBg: 'bg-violet-100 dark:bg-violet-900/30', iconColor: 'text-violet-600 dark:text-violet-400',
        timestamp: Date.now() - 5 * 60 * 60 * 1000, isRead: true,
        actionRoute: '/expenses', actionLabel: 'View Claim', badge: 'Reimbursing', badgeColor: 'violet',
    },
    {
        id: 'NOTIF-SEED-004', title: 'OT Request Approved — 3 Hours',
        body: 'Your overtime request for Oct 23 (3 hrs @ 1.5x) has been approved. Payout: 22,500 MMK.',
        category: 'Financial', priority: 'normal', icon: 'schedule',
        iconBg: 'bg-indigo-100 dark:bg-indigo-900/30', iconColor: 'text-indigo-600 dark:text-indigo-400',
        timestamp: Date.now() - 8 * 60 * 60 * 1000, isRead: true,
        actionRoute: '/ot-approvals', actionLabel: 'View OT', badge: 'Approved', badgeColor: 'indigo',
    },
    {
        id: 'NOTIF-SEED-005', title: 'Shift Starts in 30 Minutes',
        body: 'Your Morning Shift (09:00–17:30) starts soon. Tap to check in via QR scanner.',
        category: 'Attendance', priority: 'urgent', icon: 'alarm',
        iconBg: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600 dark:text-amber-400',
        timestamp: Date.now() - 25 * 60 * 1000, isRead: false,
        actionRoute: '/mobile-cockpit', actionLabel: 'Check In', badge: '30 min', badgeColor: 'amber',
    },
    {
        id: 'NOTIF-SEED-006', title: 'Company Announcement',
        body: 'New Policy: Weekend OT rate updated to 2.0x effective Nov 1. Please review the updated policy.',
        category: 'System', priority: 'normal', icon: 'campaign',
        iconBg: 'bg-slate-100 dark:bg-slate-800', iconColor: 'text-slate-600 dark:text-slate-400',
        timestamp: Date.now() - 12 * 60 * 60 * 1000, isRead: false,
        actionRoute: '/home', actionLabel: 'View Announcement',
    },
    {
        id: 'NOTIF-SEED-007', title: 'Labor Contract Expiring Soon',
        body: 'Ko Kyaw Zin\'s employment contract expires in 7 days (Nov 3). Renew before the deadline.',
        category: 'Compliance', priority: 'urgent', icon: 'gavel',
        iconBg: 'bg-rose-100 dark:bg-rose-900/30', iconColor: 'text-rose-600 dark:text-rose-400',
        timestamp: Date.now() - 2 * 60 * 60 * 1000, isRead: false,
        actionRoute: '/labor-contracts', actionLabel: 'Renew Contract', badge: '7 Days', badgeColor: 'rose',
    },
];

// ─── Provider ─────────────────────────────────────────────────────────────────
export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [notifications, setNotifications] = useState<PushNotification[]>(SEED_NOTIFICATIONS);
    const [latestToast, setLatestToast] = useState<PushNotification | null>(null);
    const [isToastVisible, setIsToastVisible] = useState(false);
    const [browserPermission, setBrowserPermission] = useState<NotificationPermission | 'unsupported'>('default');
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Detect browser notification support on mount
    useEffect(() => {
        if (!('Notification' in window)) {
            setBrowserPermission('unsupported');
        } else {
            setBrowserPermission(Notification.permission);
        }
    }, []);

    const requestBrowserPermission = useCallback(async () => {
        if (!('Notification' in window)) return;
        const result = await Notification.requestPermission();
        setBrowserPermission(result);
    }, []);

    // Fire browser OS notification
    const fireBrowserNotification = useCallback((n: PushNotification) => {
        if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
        try {
            new Notification(n.title, {
                body: n.body,
                icon: '/favicon.ico',
                tag: n.id,
                requireInteraction: n.priority === 'urgent',
            });
        } catch {
            // Silently ignore (e.g. in iframe contexts)
        }
    }, []);

    // Show in-app toast
    const showToast = useCallback((n: PushNotification) => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setLatestToast(n);
        setIsToastVisible(true);
        toastTimerRef.current = setTimeout(() => {
            setIsToastVisible(false);
        }, TOAST_DURATION[n.priority]);
    }, []);

    const dismissToast = useCallback(() => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setIsToastVisible(false);
    }, []);

    // Main push function — all modules call this
    const pushNotification = useCallback((n: Omit<PushNotification, 'id' | 'timestamp' | 'isRead'>) => {
        const full: PushNotification = {
            ...n,
            id: `NOTIF-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
            timestamp: Date.now(),
            isRead: false,
        };
        setNotifications(prev => [full, ...prev].slice(0, 200)); // cap at 200
        showToast(full);
        fireBrowserNotification(full);
    }, [showToast, fireBrowserNotification]);

    const markRead = useCallback((id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    }, []);

    const markAllRead = useCallback(() => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    }, []);

    const dismiss = useCallback((id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const clearAll = useCallback(() => {
        setNotifications([]);
    }, []);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            pushNotification,
            markRead,
            markAllRead,
            dismiss,
            clearAll,
            browserPermission,
            requestBrowserPermission,
            isToastVisible,
            latestToast,
            dismissToast,
        }}>
            {children}
        </NotificationContext.Provider>
    );
}
