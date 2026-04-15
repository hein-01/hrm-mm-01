import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { AuditLog, SecurityAuditLog, Employee } from '../types/hrms.types';
import { useSystemCalendar } from './SystemCalendarContext';

interface CurrentUser {
    id: string;
    role: 'Admin' | 'Manager' | 'Employee';
    name: string;
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
}

const UserAccessContext = createContext<UserAccessContextType | undefined>(undefined);

export const UserAccessProvider: React.FC<{ children: ReactNode; initialAdmins?: string[] }> = ({ children, initialAdmins = ['EMP-001'] }) => {
    const { getFormattedDate } = useSystemCalendar();
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>({ id: 'EMP-001', role: 'Admin', name: 'Nilar Lwin' });
    const [subscriptionTier, setSubscriptionTier] = useState<'premium' | 'standard'>('standard');
    const [adminIds, setAdminIds] = useState<string[]>(initialAdmins);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [securityAuditLogs, setSecurityAuditLogs] = useState<SecurityAuditLog[]>([]);

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

    const verifyLocalAuth = (input: string) => {
        const mockHash = import.meta.env.VITE_MOCK_AUTH_HASH || '1234';
        return input === mockHash;
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
        setSubscriptionTier
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
