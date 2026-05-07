import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { 
    ApprovalChain, 
    ApprovalRequest, 
    ApprovalRequestType, 
    Delegation, 
    OutOfOffice,
    ApprovalStep
} from '../types/hrms.types';
import { useAppData } from './AppDataContext';
import { useNotifications } from './NotificationProvider';
import { supabase } from '../lib/supabase';

interface ApprovalContextType {
    // Chains
    chains: ApprovalChain[];
    addChain: (chain: Omit<ApprovalChain, 'id' | 'createdAt' | 'updatedAt'>) => void;
    updateChain: (id: string, updates: Partial<ApprovalChain>) => void;
    deleteChain: (id: string) => void;
    getChainForType: (type: ApprovalRequestType) => ApprovalChain | undefined;
    
    // Requests
    requests: ApprovalRequest[];
    getPendingApprovals: (userId: string) => ApprovalRequest[];
    createApprovalRequest: (data: {
        requestId: string;
        requestType: ApprovalRequestType;
        requesterId: string;
        requesterName: string;
        requesterDept: string;
        metadata: Record<string, any>;
        peerId?: string;
        peerName?: string;
    }) => void;
    approveRequest: (requestId: string, approverId: string, approverName: string, comment?: string) => void;
    rejectRequest: (requestId: string, approverId: string, approverName: string, comment: string) => void;
    acknowledgePeer: (requestId: string) => void;
    
    // Delegation
    delegations: Delegation[];
    addDelegation: (d: Omit<Delegation, 'id' | 'createdAt'>) => void;
    revokeDelegation: (id: string) => void;
    getEffectiveApprover: (originalApproverId: string, requestType: ApprovalRequestType) => string | null;
    
    // Out of Office
    oooEntries: OutOfOffice[];
    setOutOfOffice: (entry: Omit<OutOfOffice, 'id' | 'createdAt'>) => void;
    cancelOutOfOffice: (id: string) => void;
    getAutoDelegate: (userId: string) => OutOfOffice | undefined;
    
    // Stats
    pendingCount: number;
    escalatedCount: number;
}

const ApprovalContext = createContext<ApprovalContextType | undefined>(undefined);

// Default chains
const DEFAULT_CHAINS: ApprovalChain[] = [
    {
        id: 'chain-leave',
        name: 'Standard Leave Approval',
        requestType: 'Leave',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        steps: [
            { order: 1, name: 'Team Lead Approval', role: 'Team Lead' },
            { order: 2, name: 'Manager Approval', role: 'Manager' },
            { order: 3, name: 'HR Approval', role: 'HR' },
        ]
    },
    {
        id: 'chain-ot',
        name: 'Standard OT Approval',
        requestType: 'OT',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        steps: [
            { order: 1, name: 'Team Lead Approval', role: 'Team Lead' },
            { order: 2, name: 'Manager Approval', role: 'Manager' },
            { 
                order: 3, 
                name: 'Finance Approval (High Hours)', 
                role: 'Finance',
                condition: { field: 'hours', operator: 'gt', value: 10 },
                isOptional: true 
            },
        ]
    },
    {
        id: 'chain-expense',
        name: 'Standard Expense Approval',
        requestType: 'Expense',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        steps: [
            { order: 1, name: 'Manager Approval', role: 'Manager' },
            { order: 2, name: 'Finance Approval', role: 'Finance' },
            { 
                order: 3, 
                name: 'CEO Approval (High Value)', 
                role: 'CEO',
                condition: { field: 'amount', operator: 'gt', value: 1000000 },
                isOptional: true 
            },
        ]
    },
    {
        id: 'chain-swap',
        name: 'Standard Shift Swap Approval',
        requestType: 'Swap',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        steps: [
            { order: 1, name: 'Team Lead Approval', role: 'Team Lead' },
            { order: 2, name: 'HR Approval', role: 'HR' },
        ]
    },
];

export function ApprovalProvider({ children }: { children: React.ReactNode }) {
    const { employees } = useAppData();
    const { pushNotification } = useNotifications();
    
    const [chains, setChains] = useState<ApprovalChain[]>(DEFAULT_CHAINS);
    const [requests, setRequests] = useState<ApprovalRequest[]>(() => {
        try {
            const saved = localStorage.getItem('hrms_approval_requests');
            if (saved) return JSON.parse(saved);
        } catch (e) { console.error('Failed to load approval requests', e); }
        return [];
    });
    const [delegations, setDelegations] = useState<Delegation[]>([]);
    const [oooEntries, setOooEntries] = useState<OutOfOffice[]>([]);

    // Persist requests to localStorage
    useEffect(() => {
        try { localStorage.setItem('hrms_approval_requests', JSON.stringify(requests)); } catch {}
    }, [requests]);

    // Fetch approval requests from Supabase + realtime
    useEffect(() => {
        const mapFromDb = (r: any): ApprovalRequest => ({
            id: r.id,
            requestId: r.requestid || r.requestId,
            requestType: r.requesttype || r.requestType,
            requesterId: r.requesterid || r.requesterId,
            requesterName: r.requestername || r.requesterName,
            requesterDept: r.requesterdept || r.requesterDept,
            currentStep: r.currentstep ?? r.currentStep ?? 0,
            totalSteps: r.totalsteps ?? r.totalSteps ?? 1,
            status: r.status || 'Pending',
            metadata: r.metadata || {},
            history: r.history || [],
            peerAcknowledgement: r.peeracknowledgement || r.peerAcknowledgement,
            peerId: r.peerid || r.peerId,
            peerName: r.peername || r.peerName,
            escalatedAt: r.escalatedat || r.escalatedAt,
            createdAt: r.createdat || r.createdAt,
            updatedAt: r.updatedat || r.updatedAt,
        });

        const fetchRequests = async () => {
            try {
                const { data, error } = await supabase
                    .from('approval_requests')
                    .select('*')
                    .order('createdat', { ascending: false });
                if (error) throw error;
                if (data && data.length > 0) {
                    const mapped = data.map(mapFromDb);
                    setRequests(mapped);
                }
            } catch (err) {
                console.log('Using local approval_requests:', err);
            }
        };
        fetchRequests();

        const channel = supabase
            .channel('approval_requests-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'approval_requests' }, (payload) => {
                console.log('Approval request change detected:', payload);
                if (payload.eventType === 'INSERT' && payload.new) {
                    const mapped = mapFromDb(payload.new);
                    setRequests(prev => {
                        if (prev.some(r => r.id === mapped.id)) return prev;
                        return [mapped, ...prev];
                    });
                } else if (payload.eventType === 'UPDATE' && payload.new) {
                    const mapped = mapFromDb(payload.new);
                    setRequests(prev => prev.map(r => r.id === mapped.id ? { ...r, ...mapped } : r));
                } else if (payload.eventType === 'DELETE' && payload.old) {
                    const id = (payload.old as any).id;
                    setRequests(prev => prev.filter(r => r.id !== id));
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // Check for stale requests (48h escalation)
    useEffect(() => {
        const checkEscalation = () => {
            const now = new Date();
            const staleRequests = requests.filter(r => {
                if (r.status !== 'Pending') return false;
                const updated = new Date(r.updatedAt);
                const hoursDiff = (now.getTime() - updated.getTime()) / (1000 * 60 * 60);
                return hoursDiff > 48;
            });

            staleRequests.forEach(r => {
                setRequests(prev => prev.map(req => {
                    if (req.id === r.id) {
                        pushNotification({
                            title: 'Approval Escalated',
                            body: `Request from ${r.requesterName} has been pending for 48h+ and requires attention.`,
                            category: 'HR', priority: 'high', icon: 'warning',
                            iconBg: 'bg-amber-50', iconColor: 'text-amber-600',
                            actionRoute: '/approvals', actionLabel: 'Review',
                            badge: 'Escalated', badgeColor: 'red',
                        });
                        return { ...req, status: 'Escalated', escalatedAt: new Date().toISOString() };
                    }
                    return req;
                }));
            });
        };

        const interval = setInterval(checkEscalation, 60 * 60 * 1000); // Check hourly
        return () => clearInterval(interval);
    }, [requests, pushNotification]);

    // Chain management
    const addChain = useCallback((chain: Omit<ApprovalChain, 'id' | 'createdAt' | 'updatedAt'>) => {
        const newChain: ApprovalChain = {
            ...chain,
            id: `chain-${Date.now()}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        setChains(prev => [...prev, newChain]);
    }, []);

    const updateChain = useCallback((id: string, updates: Partial<ApprovalChain>) => {
        setChains(prev => prev.map(c => 
            c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
        ));
    }, []);

    const deleteChain = useCallback((id: string) => {
        setChains(prev => prev.filter(c => c.id !== id));
    }, []);

    const getChainForType = useCallback((type: ApprovalRequestType) => {
        return chains.find(c => c.requestType === type && c.isActive);
    }, [chains]);

    // Get effective approver considering delegation + OOO
    const getEffectiveApprover = useCallback((originalApproverId: string, requestType: ApprovalRequestType): string | null => {
        const now = new Date();
        
        // Check OOO first
        const ooo = oooEntries.find(o => 
            o.isActive && 
            o.userId === originalApproverId &&
            new Date(o.startDate) <= now && 
            new Date(o.endDate) >= now
        );
        if (ooo) return ooo.autoDelegateTo;

        // Check delegation
        const delegation = delegations.find(d => 
            d.isActive &&
            d.delegatorId === originalApproverId &&
            d.requestTypes.includes(requestType) &&
            new Date(d.startDate) <= now && 
            new Date(d.endDate) >= now
        );
        if (delegation) return delegation.delegateId;

        return originalApproverId;
    }, [delegations, oooEntries]);

    const getAutoDelegate = useCallback((userId: string) => {
        const now = new Date();
        return oooEntries.find(o => 
            o.isActive && 
            o.userId === userId &&
            new Date(o.startDate) <= now && 
            new Date(o.endDate) >= now
        );
    }, [oooEntries]);

    // Request management
    const createApprovalRequest = useCallback((data: {
        requestId: string;
        requestType: ApprovalRequestType;
        requesterId: string;
        requesterName: string;
        requesterDept: string;
        metadata: Record<string, any>;
        peerId?: string;
        peerName?: string;
    }) => {
        const chain = getChainForType(data.requestType);
        if (!chain) return;

        // Calculate effective steps based on conditions
        let effectiveSteps = [...chain.steps];
        if (data.requestType === 'OT' && data.metadata.hours) {
            effectiveSteps = effectiveSteps.filter(s => {
                if (!s.condition) return true;
                const val = data.metadata.hours;
                switch (s.condition.operator) {
                    case 'gt': return val > s.condition.value;
                    case 'lt': return val < s.condition.value;
                    case 'gte': return val >= s.condition.value;
                    case 'lte': return val <= s.condition.value;
                    case 'eq': return val === s.condition.value;
                    return true;
                }
            });
        }
        if (data.requestType === 'Expense' && data.metadata.amount) {
            effectiveSteps = effectiveSteps.filter(s => {
                if (!s.condition) return true;
                const val = data.metadata.amount;
                switch (s.condition.operator) {
                    case 'gt': return val > s.condition.value;
                    case 'lt': return val < s.condition.value;
                    case 'gte': return val >= s.condition.value;
                    case 'lte': return val <= s.condition.value;
                    case 'eq': return val === s.condition.value;
                    return true;
                }
            });
        }

        const needsPeerAck = data.requestType === 'Leave' || data.requestType === 'Swap';

        const newRequest: ApprovalRequest = {
            id: `APR-${Date.now()}`,
            requestId: data.requestId,
            requestType: data.requestType,
            requesterId: data.requesterId,
            requesterName: data.requesterName,
            requesterDept: data.requesterDept,
            currentStep: 0,
            totalSteps: effectiveSteps.length,
            status: needsPeerAck ? 'Dormant' : 'Pending',
            metadata: data.metadata,
            history: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            peerAcknowledgement: needsPeerAck ? {
                required: true,
                peerId: data.peerId,
                peerName: data.peerName,
                acknowledged: false,
            } : undefined,
        };

        setRequests(prev => [newRequest, ...prev]);

        // Persist to Supabase
        (async () => {
            try {
                const { error } = await supabase.from('approval_requests').insert({
                    id: newRequest.id,
                    requestid: newRequest.requestId,
                    requesttype: newRequest.requestType,
                    requesterid: newRequest.requesterId,
                    requestername: newRequest.requesterName,
                    requesterdept: newRequest.requesterDept,
                    currentstep: newRequest.currentStep,
                    totalsteps: newRequest.totalSteps,
                    status: newRequest.status,
                    metadata: newRequest.metadata,
                    history: newRequest.history,
                    peeracknowledgement: newRequest.peerAcknowledgement,
                    peerid: newRequest.peerId,
                    peername: newRequest.peerName,
                });
                if (error) console.warn('Supabase insert approval_requests failed:', error.message);
            } catch (err) {
                console.warn('Supabase unavailable for createApprovalRequest:', err);
            }
        })();
    }, [getChainForType]);

    const acknowledgePeer = useCallback((requestId: string) => {
        setRequests(prev => prev.map(r => {
            if (r.id === requestId && r.status === 'Dormant') {
                return { 
                    ...r, 
                    status: 'Pending', 
                    peerAcknowledgement: r.peerAcknowledgement ? {
                        ...r.peerAcknowledgement,
                        acknowledged: true,
                        acknowledgedAt: new Date().toISOString()
                    } : undefined,
                    updatedAt: new Date().toISOString()
                };
            }
            return r;
        }));
    }, []);

    const approveRequest = useCallback((requestId: string, approverId: string, approverName: string, comment?: string) => {
        // Compute new state first
        let updatedReq: ApprovalRequest | null = null;
        
        setRequests(prev => {
            const r = prev.find(req => req.id === requestId);
            if (!r || r.status === 'Approved' || r.status === 'Rejected') return prev;

            const chain = getChainForType(r.requestType);
            if (!chain) return prev;

            const currentStepObj = chain.steps.find(s => s.order === r.currentStep + 1);
            const isDelegated = getEffectiveApprover(approverId, r.requestType) !== approverId;
            const delegator = isDelegated ? employees.find(e => getEffectiveApprover(approverId, r.requestType) === e.id) : null;

            const newHistory = [...r.history, {
                step: r.currentStep + 1,
                stepName: currentStepObj?.name || `Step ${r.currentStep + 1}`,
                approverId,
                approverName: approverName,
                action: 'Approved' as const,
                comment,
                timestamp: new Date().toISOString(),
                isDelegated,
                delegatedFrom: isDelegated ? delegator?.name : undefined,
            }];

            const nextStep = r.currentStep + 1;
            const isComplete = nextStep >= r.totalSteps;

            if (isComplete) {
                pushNotification({
                    title: 'Request Approved',
                    body: `${r.requestType} request from ${r.requesterName} has been fully approved.`,
                    category: 'HR', priority: 'normal', icon: 'check_circle',
                    iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600',
                    actionRoute: '/approvals', actionLabel: 'View',
                    badge: 'Approved', badgeColor: 'emerald',
                });
            }

            updatedReq = {
                ...r,
                currentStep: isComplete ? r.currentStep : nextStep,
                status: isComplete ? 'Approved' : 'Pending',
                history: newHistory,
                updatedAt: new Date().toISOString(),
            };

            return prev.map(req => req.id === requestId ? updatedReq! : req);
        });

        // Persist to Supabase
        if (updatedReq) {
            (async () => {
                try {
                    await supabase.from('approval_requests').update({
                        currentstep: updatedReq!.currentStep,
                        status: updatedReq!.status,
                        history: updatedReq!.history,
                        updatedat: new Date().toISOString(),
                    }).eq('id', requestId);
                } catch (err) {
                    console.warn('Supabase update approveRequest failed:', err);
                }
            })();
        }
    }, [getChainForType, getEffectiveApprover, employees, pushNotification]);

    const rejectRequest = useCallback((requestId: string, approverId: string, approverName: string, comment: string) => {
        let updatedReq: ApprovalRequest | null = null;

        setRequests(prev => {
            const r = prev.find(req => req.id === requestId);
            if (!r || r.status === 'Approved' || r.status === 'Rejected') return prev;

            const chain = getChainForType(r.requestType);
            if (!chain) return prev;

            const currentStepObj = chain.steps.find(s => s.order === r.currentStep + 1);

            const newHistory = [...r.history, {
                step: r.currentStep + 1,
                stepName: currentStepObj?.name || `Step ${r.currentStep + 1}`,
                approverId,
                approverName,
                action: 'Rejected' as const,
                comment,
                timestamp: new Date().toISOString(),
                isDelegated: false,
            }];

            pushNotification({
                title: 'Request Rejected',
                body: `${r.requestType} request from ${r.requesterName} has been rejected. Reason: ${comment}`,
                category: 'HR', priority: 'normal', icon: 'cancel',
                iconBg: 'bg-rose-50', iconColor: 'text-rose-600',
                actionRoute: '/approvals', actionLabel: 'View',
                badge: 'Rejected', badgeColor: 'rose',
            });

            updatedReq = {
                ...r,
                status: 'Rejected',
                history: newHistory,
                updatedAt: new Date().toISOString(),
            };

            return prev.map(req => req.id === requestId ? updatedReq! : req);
        });

        // Persist to Supabase
        if (updatedReq) {
            (async () => {
                try {
                    await supabase.from('approval_requests').update({
                        status: updatedReq!.status,
                        history: updatedReq!.history,
                        updatedat: new Date().toISOString(),
                    }).eq('id', requestId);
                } catch (err) {
                    console.warn('Supabase update rejectRequest failed:', err);
                }
            })();
        }
    }, [getChainForType, pushNotification]);

    const getPendingApprovals = useCallback((userId: string) => {
        const user = employees.find(e => e.id === userId);
        if (!user) return [];

        return requests.filter(r => {
            if (r.status !== 'Pending') return false;
            
            const chain = getChainForType(r.requestType);
            if (!chain) return false;

            const currentStepObj = chain.steps.find(s => s.order === r.currentStep + 1);
            if (!currentStepObj) return false;

            // Check if user's role matches current step role
            const userRole = user.role;
            const roleMatch = currentStepObj.role.toLowerCase().includes(userRole.toLowerCase()) || 
                             userRole.toLowerCase().includes(currentStepObj.role.toLowerCase());

            // Check if user is the specific approver
            const approverMatch = currentStepObj.approverId === userId;

            // Check delegation
            const effectiveApprover = getEffectiveApprover(currentStepObj.approverId || userId, r.requestType);
            const delegationMatch = effectiveApprover === userId;

            return roleMatch || approverMatch || delegationMatch;
        });
    }, [requests, employees, getChainForType, getEffectiveApprover]);

    // Delegation management
    const addDelegation = useCallback((d: Omit<Delegation, 'id' | 'createdAt'>) => {
        const newDelegation: Delegation = {
            ...d,
            id: `DEL-${Date.now()}`,
            createdAt: new Date().toISOString(),
        };
        setDelegations(prev => [...prev, newDelegation]);
    }, []);

    const revokeDelegation = useCallback((id: string) => {
        setDelegations(prev => prev.map(d => 
            d.id === id ? { ...d, isActive: false } : d
        ));
    }, []);

    // OOO management
    const setOutOfOffice = useCallback((entry: Omit<OutOfOffice, 'id' | 'createdAt'>) => {
        const newEntry: OutOfOffice = {
            ...entry,
            id: `OOO-${Date.now()}`,
            createdAt: new Date().toISOString(),
        };
        setOooEntries(prev => [...prev, newEntry]);
    }, []);

    const cancelOutOfOffice = useCallback((id: string) => {
        setOooEntries(prev => prev.map(o => 
            o.id === id ? { ...o, isActive: false } : o
        ));
    }, []);

    // Stats
    const pendingCount = useMemo(() => requests.filter(r => r.status === 'Pending').length, [requests]);
    const escalatedCount = useMemo(() => requests.filter(r => r.status === 'Escalated').length, [requests]);

    return (
        <ApprovalContext.Provider value={{
            chains,
            addChain,
            updateChain,
            deleteChain,
            getChainForType,
            requests,
            getPendingApprovals,
            createApprovalRequest,
            approveRequest,
            rejectRequest,
            acknowledgePeer,
            delegations,
            addDelegation,
            revokeDelegation,
            getEffectiveApprover,
            oooEntries,
            setOutOfOffice,
            cancelOutOfOffice,
            getAutoDelegate,
            pendingCount,
            escalatedCount,
        }}>
            {children}
        </ApprovalContext.Provider>
    );
}

export function useApprovals() {
    const context = useContext(ApprovalContext);
    if (!context) {
        throw new Error('useApprovals must be used within ApprovalProvider');
    }
    return context;
}
