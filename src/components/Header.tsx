import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { useUserAccess } from '../context/UserAccessProvider';

type HeaderProps = {
    onSearch?: (query: string) => void;
    placeholder?: string;
    title?: string;
    subtitle?: string | React.ReactNode;
    children?: React.ReactNode;
};

export default function Header({ onSearch, placeholder, title, subtitle, children }: HeaderProps) {
    const navigate = useNavigate();
    const { currentUser, signOut } = useUserAccess();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [avatarError, setAvatarError] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setShowUserMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSignOut = async () => {
        setShowUserMenu(false);
        await signOut();
        navigate('/');
    };

    const handleMyProfile = () => {
        setShowUserMenu(false);
        if (currentUser?.id) {
            navigate(`/employees/${currentUser.id}`);
        }
    };

    const handleSettings = () => {
        setShowUserMenu(false);
        navigate('/settings');
    };

    return (
        <header className="flex items-center justify-between w-full h-[73.5px] bg-[#F8FAFC]/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 px-8">
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
                {/* User Avatar Hub with Dropdown */}
                <div className="relative" ref={userMenuRef}>
                    <button
                        onClick={() => setShowUserMenu(p => !p)}
                        className="flex items-center gap-3 pl-4 border-l border-slate-100 dark:border-slate-800 h-8 hover:opacity-80 transition-opacity"
                    >
                        <div className="flex flex-col items-end leading-none">
                            <p className="text-xs font-bold text-slate-900 dark:text-white">{currentUser?.name || 'Admin User'}</p>
                            <p className="text-[10px] font-medium text-slate-400">{currentUser?.role || 'Admin'}</p>
                        </div>
                        <div className="size-9 rounded-full bg-indigo-100 border-2 border-white ring-1 ring-slate-200 dark:ring-slate-700 overflow-hidden shadow-sm flex items-center justify-center text-indigo-600 font-bold text-sm">
                            {currentUser?.avatar && !avatarError ? (
                                <img
                                    src={currentUser.avatar}
                                    alt={currentUser.name || 'User'}
                                    className="size-full object-cover"
                                    onError={() => setAvatarError(true)}
                                />
                            ) : (
                                (currentUser?.name || 'A').charAt(0).toUpperCase()
                            )}
                        </div>
                    </button>

                    {/* User Dropdown Menu */}
                    {showUserMenu && (
                        <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{currentUser?.name || 'Admin User'}</p>
                                <p className="text-xs text-slate-500">{currentUser?.id || 'EMP-001'}</p>
                            </div>
                            <div className="py-1">
                                <button
                                    onClick={handleMyProfile}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[20px]">account_circle</span>
                                    My Profile
                                </button>
                                <button
                                    onClick={handleSettings}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[20px]">settings</span>
                                    Settings
                                </button>
                            </div>
                            <div className="border-t border-slate-100 dark:border-slate-700 py-1">
                                <button
                                    onClick={handleSignOut}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[20px]">logout</span>
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
