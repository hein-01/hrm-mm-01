import React, { createContext, useContext, useState, useMemo, useCallback, ReactNode, useEffect } from 'react';
import { AuditLog, SecurityAuditLog, Employee } from '../types/hrms.types';
import { useSystemCalendar } from './SystemCalendarContext';
import { supabase } from '../lib/supabase';

interface CurrentUser {
    id: string;
    role: 'Admin' | 'Manager' | 'Employee';
    name: string;
    avatar?: string;
    permissions?: string[];
}

interface UserAccessContextType {
    currentUser: CurrentUser | null;
    setCurrentUser: React.Dispatch<React.SetStateAction<CurrentUser | null>>;
    auditLogs: AuditLog[];
    addAuditLog: (log: Omit<AuditLog, 'id' | 'timestamp'>) => void;
    securityAuditLogs: SecurityAuditLog[];
    addSecurityLog: (log: Omit<SecurityAuditLog, 'id' | 'timestamp'>) => void;
    adminIds: string[];
    isAdmin: (empId: string) => boolean;
    assignAdmin: (empId: string, authorizerId: string) => void;
    revokeAdmin: (empId: string, authorizerId: string) => void;
    verifyLocalAuth: (input: string) => boolean;
    subscriptionTier: 'premium' | 'standard';
    setSubscriptionTier: React.Dispatch<React.SetStateAction<'premium' | 'standard'>>;
    signOut: () => Promise<void>;
}

const UserAccessContext = createContext<UserAccessContextType | undefined>(undefined);

// Dev fallback so the app is usable without a Supabase Auth session.
// When a real session is detected, this is replaced by the authenticated user.
const DEV_ADMIN_USER: CurrentUser = {
    id: 'EMP-001',
    role: 'Admin',
    name: 'Hein Htet',
    avatar: undefined, // Will be fetched from Supabase
    permissions: [],
};

export const UserAccessProvider: React.FC<{ children: ReactNode; initialAdmins?: string[] }> = ({ children, initialAdmins = ['EMP-001'] }) => {
    const { getFormattedDate } = useSystemCalendar();
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(DEV_ADMIN_USER);
    const [subscriptionTier, setSubscriptionTier] = useState<'premium' | 'standard'>('standard');
    const [adminIds, setAdminIds] = useState<string[]>(initialAdmins);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [securityAuditLogs, setSecurityAuditLogs] = useState<SecurityAuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch dev user profile from Supabase
    useEffect(() => {
        const fetchDevUser = async () => {
            const { data, error } = await supabase
                .from('employees')
                .select('id, role, name, avatar')
                .eq('id', 'EMP-001')
                .single();
            
            if (!error && data) {
                setCurrentUser({
                    id: data.id,
                    role: data.role || 'Admin',
                    name: data.name || 'Hein Htet',
                    avatar: data.avatar || undefined,
                    permissions: [],
                });
            }
        };
        fetchDevUser();
    }, []);

    // Listen for Supabase auth state changes
    useEffect(() => {
        const initAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                
                if (session?.user && session.user.email) {
                    // Try to fetch employee, but fallback to dev admin if it fails or takes too long
                    const timeoutPromise = new Promise(resolve => setTimeout(resolve, 3000));
                    const fetchPromise = supabase
                        .from('employees')
                        .select('id, role, name, avatar')
                        .ilike('email', session.user.email)
                        .limit(1);

                    const result = await Promise.race([fetchPromise, timeoutPromise]) as any;
                    const employees = result?.data;
                    const employee = employees && employees.length > 0 ? employees[0] : null;

                    if (employee) {
                        setCurrentUser({
                            id: employee.id,
                            role: employee.role || 'Employee',
                            name: employee.name || session.user.email?.split('@')[0] || 'User',
                            avatar: employee.avatar || undefined,
                            permissions: [],
                        });
                    } else {
                        setCurrentUser(DEV_ADMIN_USER);
                    }
                } else {
                    setCurrentUser(DEV_ADMIN_USER);
                }
            } catch (error) {
                console.error('Auth init error:', error);
                setCurrentUser(DEV_ADMIN_USER);
            } finally {
                setIsLoading(false);
            }
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            try {
                if (session?.user && session.user.email) {
                    // Try to fetch employee, but fallback to dev admin if it fails
                    const timeoutPromise = new Promise(resolve => setTimeout(resolve, 3000));
                    const fetchPromise = supabase
                        .from('employees')
                        .select('id, role, name, avatar')
                        .ilike('email', session.user.email)
                        .limit(1);

                    const result = await Promise.race([fetchPromise, timeoutPromise]) as any;
                    const employees = result?.data;
                    const employee = employees && employees.length > 0 ? employees[0] : null;

                    if (employee) {
                        setCurrentUser({
                            id: employee.id,
                            role: employee.role || 'Employee',
                            name: employee.name || session.user.email?.split('@')[0] || 'User',
                            avatar: employee.avatar || undefined,
                            permissions: [],
                        });
                    } else {
                        setCurrentUser(DEV_ADMIN_USER);
                    }
                } else {
                    setCurrentUser(DEV_ADMIN_USER);
                }
            } catch (error) {
                console.error('Auth change error:', error);
                setCurrentUser(DEV_ADMIN_USER);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const isAdmin = (empId: string) => adminIds.includes(empId);

    const addAuditLog = (log: Omit<AuditLog, 'id' | 'timestamp'>) => {
        const newLog: AuditLog = {
            ...log,
            id: `AUDIT-${Date.now()}`,
            timestamp: new Date().toISOString()
        };
        setAuditLogs(prev => [newLog, ...prev]);
    };

    const addSecurityLog = (log: Omit<SecurityAuditLog, 'id' | 'timestamp'>) => {
        const newLog: SecurityAuditLog = {
            ...log,
            id: `SEC-${Date.now()}`,
            timestamp: new Date().toISOString()
        };
        setSecurityAuditLogs(prev => [newLog, ...prev]);
    };

    const assignAdmin = (empId: string, authorizerId: string) => {
        if (!isAdmin(authorizerId)) return;
        setAdminIds(prev => [...new Set([...prev, empId])]);
        addAuditLog({
            adminId: authorizerId,
            actionType: 'Access Elevation',
            module: 'Settings',
            detail: `Administrative privileges granted to employee ${empId}.`
        });
    };

    const revokeAdmin = (empId: string, authorizerId: string) => {
        if (!isAdmin(authorizerId)) return;
        setAdminIds(prev => prev.filter(id => id !== empId));
        addAuditLog({
            adminId: authorizerId,
            actionType: 'Access Revocation',
            module: 'Settings',
            detail: `Administrative privileges revoked for employee ${empId}.`
        });
    };

    const verifyLocalAuth = useCallback((input: string) => {
        // Hardcoded for development - change via VITE_MOCK_AUTH_HASH env var in production
        const mockHash = '1234';
        const trimmedInput = input.trim();
        console.log('[DEBUG] verifyLocalAuth called:', { input: trimmedInput, mockHash, match: trimmedInput === mockHash });
        return trimmedInput === mockHash;
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
        setCurrentUser(DEV_ADMIN_USER);
    };

    const value = useMemo(() => ({
        currentUser,
        setCurrentUser,
        auditLogs,
        addAuditLog,
        securityAuditLogs,
        addSecurityLog,
        adminIds,
        isAdmin,
        assignAdmin,
        revokeAdmin,
        verifyLocalAuth,
        subscriptionTier,
        setSubscriptionTier,
        signOut
    }), [auditLogs, securityAuditLogs, adminIds, subscriptionTier, currentUser]);

    return (
        <UserAccessContext.Provider value={value}>
            {children}
        </UserAccessContext.Provider>
    );
};

export const useUserAccess = () => {
    const context = useContext(UserAccessContext);
    if (!context) throw new Error('useUserAccess must be used within UserAccessProvider');
    return context;
};
