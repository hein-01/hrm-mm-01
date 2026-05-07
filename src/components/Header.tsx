import React, { useState } from 'react';
import { useAppData } from '../context/AppDataContext';
import { useNotifications } from '../context/NotificationProvider';
import NotificationCenter from './NotificationCenter';

type HeaderProps = {
    onSearch?: (query: string) => void;
    placeholder?: string;
    title?: string;
    subtitle?: string;
    children?: React.ReactNode;
};

export default function Header({ onSearch, placeholder, title, subtitle, children }: HeaderProps) {
    const { alerts } = useAppData();
    const { unreadCount } = useNotifications();
    const [showNotifications, setShowNotifications] = useState(false);

    // Total badge = push notifications + legacy compliance alerts  
    const totalUnread = unreadCount + alerts.filter(a => !a.isRead).length;

    return (
        <header className="flex items-center justify-between w-full h-[73.5px] bg-[#F8FAFC] dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-[1100] px-8">
            {/* Left Side: Title & Children */}
            <div className="flex items-center gap-8 h-full">
                {(title || subtitle) && (
                    <div className="flex flex-col justify-center">
                        {title && <h2 className="text-2xl font-bold text-slate-900 dark:text-white whitespace-nowrap">{title}</h2>}
                        {subtitle && <p className="text-slate-500 dark:text-slate-400 text-sm whitespace-nowrap">{subtitle}</p>}
                    </div>
                )}
                {children}
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-6 h-full">
                <div className="flex items-center gap-5 h-full">

                    {/* Notification Bell */}
                    <div className="relative h-full flex items-center">
                        <button
                            id="notification-bell-btn"
                            onClick={() => setShowNotifications(p => !p)}
                            className={`relative flex items-center justify-center size-10 rounded-full transition-all ${
                                showNotifications
                                    ? 'bg-[#4F46E5]/10 text-[#4F46E5]'
                                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            <span className={`material-symbols-outlined text-[24px] transition-transform ${totalUnread > 0 ? 'animate-[wiggle_1s_ease-in-out_1]' : ''}`}>
                                notifications
                            </span>

                            {/* Animated badge */}
                            {totalUnread > 0 && (
                                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-rose-500 rounded-full text-[10px] font-black text-white flex items-center justify-center ring-2 ring-[#F8FAFC] dark:ring-slate-950 px-1 animate-in zoom-in duration-300">
                                    {totalUnread > 99 ? '99+' : totalUnread}
                                </span>
                            )}

                            {/* Pulse ring when urgent */}
                            {totalUnread > 0 && (
                                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-rose-400 rounded-full opacity-40 animate-ping" />
                            )}
                        </button>

                        {/* NotificationCenter Panel */}
                        <NotificationCenter
                            isOpen={showNotifications}
                            onClose={() => setShowNotifications(false)}
                        />
                    </div>

                    {/* User Avatar Hub */}
                    <div className="flex items-center gap-3 pl-4 border-l border-slate-100 dark:border-slate-800 h-8">
                        <div className="flex flex-col items-end leading-none">
                            <p className="text-xs font-bold text-slate-900 dark:text-white">Admin User</p>
                            <p className="text-[10px] font-medium text-slate-400">HQ Office</p>
                        </div>
                        <div className="size-9 rounded-full bg-indigo-100 border-2 border-white ring-1 ring-slate-200 dark:ring-slate-700 overflow-hidden cursor-pointer hover:ring-[#4F46E5]/40 transition-all shadow-sm">
                            <img
                                alt="Admin"
                                className="size-full object-cover"
                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBPv3N7DJ1HO5GnNQ4VFZzFDLmbiepKJrVnpRpaacPiL-7ribzgq_dUwyv-Ii7r0NlRYqvE96sJ1MuV5vN319TbU3x97XbNOhouNqTBB945wSReJs5gLsweRh5O5PqLhWmGyTRrCJvBlBDH0z4yGBPCyJo7Z56wvyzI-xk8PIWVYAm5S11kFDBiNvt99RaaRGQL5qErZh_UDP5LEkOcfBFJ0zZ66JX75Lf68HgT8wHdZsfq9-LIUTM_zG3wHD8fXaYT7h5xo_mdc1Af"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Wiggle keyframe */}
            <style>{`
                @keyframes wiggle {
                    0%, 100% { transform: rotate(0deg); }
                    15%       { transform: rotate(-15deg); }
                    30%       { transform: rotate(12deg); }
                    45%       { transform: rotate(-10deg); }
                    60%       { transform: rotate(8deg); }
                    75%       { transform: rotate(-5deg); }
                }
            `}</style>
        </header>
    );
}
