import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import AiAssistantModal from './AiAssistantModal';

import { useAppData } from '../context/AppDataContext';
import { useUserAccess } from '../context/UserAccessProvider';

type SidebarProps = {
    activeTab: string;
};

const SCROLL_KEY = 'sidebar-scroll-position';

// Returns a Link element with refs attached if active
const NavLink = ({
    to,
    tabName,
    icon,
    label,
    activeTab,
    activeRef
}: {
    to: string;
    tabName: string;
    icon: string;
    label: string;
    activeTab: string;
    activeRef: React.RefObject<HTMLAnchorElement | null>;
}) => {
    const isActive = activeTab === tabName;
    const cls = isActive
        ? 'flex items-center gap-3 px-3 py-2 text-sm font-bold rounded-[12px] bg-[#F7F7FE] text-[#6567F1] shadow-sm ring-1 ring-[#6567F1]/5'
        : 'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-[12px] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200';
    return (
        <Link to={to} className={cls} ref={isActive ? activeRef : undefined}>
            <span className="material-symbols-outlined text-[20px]">{icon}</span>
            {label}
        </Link>
    );
};

export default function Sidebar({ activeTab }: SidebarProps) {
    const { systemSettings, userPermissions, tickets } = useAppData();
    const { currentUser, isAdmin } = useUserAccess();
    
    // centralized permission check
    const hasPermission = (perm: string) => currentUser?.role === 'Admin' || userPermissions.includes(perm);
    
    const canViewPayroll = hasPermission('canViewPayroll');
    const canApproveLoans = hasPermission('canApproveLoans');
    const canEditAssets = hasPermission('canEditAssets');
    const isHr = currentUser?.role === 'Admin';

    const navRef = useRef<HTMLElement>(null);
    const activeRef = useRef<HTMLAnchorElement>(null);
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);

    // On mount or tab change: restore saved scroll position, then ensure active item visibility
    useEffect(() => {
        const nav = navRef.current;
        if (!nav) return;

        // 1. Restore saved position (for initial load / refresh)
        const saved = sessionStorage.getItem(SCROLL_KEY);
        if (saved) {
            nav.scrollTop = parseInt(saved, 10);
        }

        // 2. Ensure active item is visible instantly without animated "jitter"
        // We use a tiny delay (0ms/RAF) to ensure the NavLink ref has attached after the render cycle
        const timer = setTimeout(() => {
            if (activeRef.current) {
                activeRef.current.scrollIntoView({ block: 'nearest', behavior: 'auto' });
            }
        }, 0);

        return () => clearTimeout(timer);
    }, [activeTab]);

    // Save scroll position whenever user scrolls
    const handleScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
        sessionStorage.setItem(SCROLL_KEY, String(e.currentTarget.scrollTop));
    }, []);



    return (
        <aside
            className="w-[280px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 fixed h-full z-20 font-display"
            style={{ backgroundColor: '#FFFFFF' }}
        >
            {/* Logo area */}
            <div className="px-6 h-[73px] flex items-center border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-3">
                    {systemSettings.companyLogo ? (
                        <div className="h-10 w-10 shrink-0 flex items-center justify-center overflow-hidden rounded-lg bg-slate-50 dark:bg-slate-800">
                            <img 
                                src={systemSettings.companyLogo} 
                                alt="Company Logo" 
                                className="h-full w-full object-contain"
                            />
                        </div>
                    ) : (
                        <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white shrink-0">
                            <span className="material-symbols-outlined">corporate_fare</span>
                        </div>
                    )}
                    <div className="flex flex-col leading-tight">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">HR Management</p>
                        <p className="text-[10px] font-medium text-slate-400">by TechDance HR</p>
                    </div>
                </div>
            </div>

            {/* Scrollable Nav */}
            <nav
                ref={navRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto py-4"
            >
                {/* AI Assistant */}
                <div className="px-4 mb-2 mt-4">
                    <button 
                        onClick={() => setIsAiModalOpen(true)}
                        className="ai-assistant-btn w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-[12px] group font-bold text-sm"
                    >
                        <span className="material-symbols-outlined text-[20px] flex items-center justify-center">auto_awesome</span>
                        <span className="flex items-center font-bold">Ask AI Assistant</span>
                    </button>
                </div>

                <AiAssistantModal 
                    isOpen={isAiModalOpen} 
                    onClose={() => setIsAiModalOpen(false)} 
                />

                {/* Main Menu */}
                <div className="px-4 mt-6">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-3">Main Menu</p>
                    <NavLink to="/home" tabName="Home" icon="home" label="Home" activeTab={activeTab} activeRef={activeRef} />
                    <NavLink to="/reports" tabName="Reports" icon="assessment" label="Reports" activeTab={activeTab} activeRef={activeRef} />
                    <NavLink to="/tickets" tabName="Tickets" icon="support_agent" label={`Help Desk${tickets.filter(t => t.status === 'Open').length > 0 ? ` (${tickets.filter(t => t.status === 'Open').length})` : ''}`} activeTab={activeTab} activeRef={activeRef} />
                </div>

                {/* Time & Attendance */}
                <div className="px-4 mt-6">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-3">Time & Attendance</p>
                    <NavLink to="/attendance" tabName="Attendance" icon="schedule" label="Attendance" activeTab={activeTab} activeRef={activeRef} />
                    <NavLink to="/field-force" tabName="Field Force (GPS)" icon="distance" label="Field Force (GPS)" activeTab={activeTab} activeRef={activeRef} />
                    <NavLink to="/leave-requests" tabName="Leave Requests" icon="event_busy" label="Leave Requests" activeTab={activeTab} activeRef={activeRef} />
                    <NavLink to="/team-calendar" tabName="Team Calendar" icon="calendar_month" label="Team Calendar" activeTab={activeTab} activeRef={activeRef} />
                    <NavLink to="/shift-planner" tabName="Shift Planner" icon="calendar_view_week" label="Shift Planner" activeTab={activeTab} activeRef={activeRef} />
                    <NavLink to="/approvals" tabName="Approvals" icon="fact_check" label="Approvals" activeTab={activeTab} activeRef={activeRef} />
                </div>

                {/* Financials */}
                <div className="px-4 mt-6">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-3">Payroll & Finance</p>
                    {canViewPayroll && <NavLink to="/payroll-run" tabName="Payroll Run" icon="payments" label="Payroll Run" activeTab={activeTab} activeRef={activeRef} />}
                    {canViewPayroll && <NavLink to="/bank-disbursements" tabName="Bank Disbursements" icon="account_balance" label="Bank Disbursements" activeTab={activeTab} activeRef={activeRef} />}
                    {canViewPayroll && <NavLink to="/ot-approvals" tabName="OT Approvals" icon="more_time" label="Overtime Management" activeTab={activeTab} activeRef={activeRef} />}
                    {canApproveLoans && <NavLink to="/loans-advances" tabName="Loans & Advances" icon="credit_score" label="Loans & Advances" activeTab={activeTab} activeRef={activeRef} />}
                    {canApproveLoans && <NavLink to="/adjustments" tabName="Adjustments" icon="account_balance_wallet" label="Adjustments" activeTab={activeTab} activeRef={activeRef} />}
                    <NavLink to="/my-payroll" tabName="My Payroll" icon="payments" label="My Payroll" activeTab={activeTab} activeRef={activeRef} />
                    {systemSettings.expenseModuleEnabled && (
                        <NavLink to="/expenses" tabName="Expenses" icon="receipt_long" label="Expenses" activeTab={activeTab} activeRef={activeRef} />
                    )}
                </div>

                {/* Workforce */}
                <div className="px-4 mt-6">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-3">Workforce</p>
                    <NavLink to="/employees" tabName="Employees" icon="groups" label="Employees" activeTab={activeTab} activeRef={activeRef} />
                    {systemSettings.recruitmentModuleEnabled && (
                        <>
                            <NavLink to="/jobs" tabName="Jobs" icon="work" label="Jobs" activeTab={activeTab} activeRef={activeRef} />
                            <NavLink to="/candidates" tabName="Candidates" icon="person_search" label="Candidates" activeTab={activeTab} activeRef={activeRef} />
                        </>
                    )}
                    <NavLink to="/onboarding" tabName="Onboarding" icon="person_add" label="Onboarding" activeTab={activeTab} activeRef={activeRef} />
                    <NavLink to="/offboarding" tabName="Offboarding" icon="person_off" label="Offboarding" activeTab={activeTab} activeRef={activeRef} />
                    <NavLink to="/benefits" tabName="Benefits" icon="card_giftcard" label="Benefits" activeTab={activeTab} activeRef={activeRef} />
                    <NavLink to="/handbook" tabName="Handbook" icon="menu_book" label="Handbook" activeTab={activeTab} activeRef={activeRef} />
                    <NavLink to="/org-chart" tabName="Org Chart" icon="account_tree" label="Org Chart" activeTab={activeTab} activeRef={activeRef} />
                </div>

                {/* Compliance */}
                <div className="px-4 mt-6">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-3">Compliance</p>
                    {isHr && <NavLink to="/ssb-pit" tabName="SSB & PIT" icon="security" label="SSB & PIT" activeTab={activeTab} activeRef={activeRef} />}
                    {isHr && <NavLink to="/labor-contracts" tabName="Labor Contracts (EC)" icon="contract" label="Labor Contracts (EC)" activeTab={activeTab} activeRef={activeRef} />}
                    {isHr && <NavLink to="/disciplinary-actions" tabName="Disciplinary Actions" icon="gavel" label="Disciplinary Actions" activeTab={activeTab} activeRef={activeRef} />}
                    <NavLink to="/forms-library" tabName="Forms Library" icon="folder_open" label="Forms Library" activeTab={activeTab} activeRef={activeRef} />
                </div>

                {/* Management */}
                <div className="px-4 mt-6">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-3">Management</p>
                    <NavLink to="/performance" tabName="Performance" icon="trending_up" label="Performance" activeTab={activeTab} activeRef={activeRef} />
                    {canEditAssets && <NavLink to="/assets" tabName="Assets" icon="inventory_2" label="Assets" activeTab={activeTab} activeRef={activeRef} />}
                    <NavLink to="/learning-training" tabName="Learning & Training" icon="school" label="Learning & Training" activeTab={activeTab} activeRef={activeRef} />
                    <NavLink to="/suggestions" tabName="Suggestions" icon="lightbulb" label="Innovation Hub" activeTab={activeTab} activeRef={activeRef} />
                </div>
            </nav>

            {/* Settings Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                {isHr && <NavLink to="/settings" tabName="Settings" icon="settings" label="Settings" activeTab={activeTab} activeRef={activeRef} />}
            </div>
        </aside>
    );
}
