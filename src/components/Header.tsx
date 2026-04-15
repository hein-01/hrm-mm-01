import React, { useState } from 'react';
import { useAppData } from '../context/AppDataContext';

type HeaderProps = {
    onSearch?: (query: string) => void;
    placeholder?: string;
    title?: string;
    subtitle?: string;
    children?: React.ReactNode;
};

export default function Header({ onSearch, placeholder, title, subtitle, children }: HeaderProps) {
    const { alerts } = useAppData();
    const [showNotifications, setShowNotifications] = useState(false);
    const unreadCount = alerts.filter(a => !a.isRead).length;

    return (
        <header className="flex items-center justify-between w-full h-[73.5px] bg-[#F8FAFC] dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-[1100] px-8">
            {/* Left Side: Title & Children Injection Container */}
            <div className="flex items-center gap-8 h-full">
                {(title || subtitle) && (
                    <div className="flex flex-col justify-center">
                        {title && <h2 className="text-2xl font-bold text-slate-900 dark:text-white whitespace-nowrap">{title}</h2>}
                        {subtitle && <p className="text-slate-500 dark:text-slate-400 text-sm whitespace-nowrap">{subtitle}</p>}
                    </div>
                )}
                {children}
            </div>

            {/* The Identity Hub (Right Side) - Centered Aligned */}
            <div className="flex items-center gap-6 h-full">
                <div className="flex items-center gap-5 h-full">
                    {/* Notification Icon */}
                    <div className="relative h-full flex items-center">
                        <button 
                            onClick={() => setShowNotifications(!showNotifications)}
                            className={`relative flex items-center justify-center size-10 rounded-full transition-all ${showNotifications ? 'bg-[#4F46E5]/10 text-[#4F46E5]' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                            <span className="material-symbols-outlined text-[24px]">notifications</span>
                            {unreadCount > 0 && (
                                <span className="absolute top-1.5 right-1.5 size-4 bg-[#EF4444] rounded-full text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-[#F8FAFC]">
                                    {unreadCount}
                                </span>
                            )}
                        </button>

                        {/* Notifications Dropdown (Filing Audit Trail) */}
                        {showNotifications && (
                            <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden ring-1 ring-black/5 animate-in fade-in slide-in-from-top-2">
                                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">Compliance Alerts</h3>
                                    <span className="text-[10px] font-bold text-[#4F46E5] uppercase tracking-wider bg-[#4F46E5]/10 px-2 py-0.5 rounded-full">New</span>
                                </div>
                                <div className="max-h-[320px] overflow-y-auto">
                                    {alerts.length === 0 ? (
                                        <div className="p-8 text-center">
                                            <span className="material-symbols-outlined text-4xl text-slate-200">notifications_off</span>
                                            <p className="text-xs text-slate-400 mt-2">No active alerts</p>
                                        </div>
                                    ) : (
                                        alerts.map(alert => (
                                            <div key={alert.id} className="p-4 border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 transition-colors cursor-pointer group">
                                                <div className="flex gap-3">
                                                    <div className={`size-8 rounded-full flex items-center justify-center shrink-0 ${alert.type === 'error' ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}>
                                                        <span className="material-symbols-outlined text-lg">{alert.type === 'error' ? 'error' : 'task_alt'}</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2">{alert.message}</p>
                                                        <p className="text-[10px] text-slate-400 mt-1">{alert.timestamp}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 text-center">
                                    <button className="text-[11px] font-bold text-[#4F46E5] hover:underline">View All in Forms Library</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* User Avatar Hub */}
                    <div className="flex items-center gap-3 pl-4 border-l border-slate-100 h-8">
                        <div className="flex flex-col items-end leading-none">
                            <p className="text-xs font-bold text-slate-900">Admin User</p>
                            <p className="text-[10px] font-medium text-slate-400">HQ Office</p>
                        </div>
                        <div className="size-9 rounded-full bg-indigo-100 border-2 border-white ring-1 ring-slate-200 overflow-hidden cursor-pointer hover:ring-[#4F46E5]/40 transition-all shadow-sm">
                            <img
                                alt="Admin"
                                className="size-full object-cover"
                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBPv3N7DJ1HO5GnNQ4VFZzFDLmbiepKJrVnpRpaacPiL-7ribzgq_dUwyv-Ii7r0NlRYqvE96sJ1MuV5vN319TbU3x97XbNOhouNqTBB945wSReJs5gLsweRh5O5PqLhWmGyTRrCJvBlBDH0z4yGBPCyJo7Z56wvyzI-xk8PIWVYAm5S11kFDBiNvt99RaaRGQL5qErZh_UDP5LEkOcfBFJ0zZ66JX75Lf68HgT8wHdZsfq9-LIUTM_zG3wHD8fXaYT7h5xo_mdc1Af"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
