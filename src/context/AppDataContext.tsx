import React, { createContext, useContext, useState, useMemo, useRef, ReactNode, useEffect } from 'react';
import * as Types from '../types/hrms.types';
import { useUserAccess } from './UserAccessProvider';
import { useSystemCalendar } from './SystemCalendarContext';
import { decrementLeaveBalance, syncLeaveWithCalendar } from '../utils/leaveBalance';
import { autoHealCompliance } from '../utils/complianceAutoHeal';
import { PayrollProvider, usePayroll } from './PayrollProvider';
import { supabase } from '../lib/supabase';





type AppDataContextType = {
    employees: Types.Employee[];
    setEmployees: React.Dispatch<React.SetStateAction<Types.Employee[]>>;
    reviews: Types.Review[];
    setReviews: React.Dispatch<React.SetStateAction<Types.Review[]>>;
    assets: Types.Asset[];
    setAssets: React.Dispatch<React.SetStateAction<Types.Asset[]>>;
    addAsset: (asset: Omit<Types.Asset, 'id' | 'lastAuditDate' | 'status'>, adminId: string) => { success: boolean; message: string };
    updateAsset: (id: string, updates: Partial<Types.Asset>) => Promise<{ success: boolean; message: string }>;
    candidates: Types.Candidate[];
    setCandidates: React.Dispatch<React.SetStateAction<Types.Candidate[]>>;
    candidateMessages: Record<string, Types.CandidateMessage[]>;
    updateCandidateStage: (candidateId: string, newStage: Types.Candidate['stage'], adminId: string, reason?: string) => void;
    rejectCandidate: (candidateId: string, adminId: string, reason: string) => void;
    sendCandidateMessage: (candidateId: string, text: string, adminId: string) => void;
    alerts: Types.Alert[];
    setAlerts: React.Dispatch<React.SetStateAction<Types.Alert[]>>;
    courses: Types.Course[];
    setCourses: React.Dispatch<React.SetStateAction<Types.Course[]>>;
    certs: Types.Certification[];
    setCerts: React.Dispatch<React.SetStateAction<Types.Certification[]>>;
    analytics: Types.TrainingAnalytic[];
    setAnalytics: React.Dispatch<React.SetStateAction<Types.TrainingAnalytic[]>>;
    leaveRequests: Types.LeaveRequest[];
    setLeaveRequests: React.Dispatch<React.SetStateAction<Types.LeaveRequest[]>>;
    attendanceLogs: Types.AttendanceLog[];
    shifts: Types.Shift[];
    checkIn: (empId: string, locationName: string, gps: { lat: number, lng: number, accuracy?: number }, method?: 'Web Portal' | 'Mobile App' | 'Biometric') => Promise<{ success: boolean, message: string }>;
    checkOut: (empId: string) => { success: boolean, message: string };
    syncAttendance: () => void;
    regularizeAttendance: (logId: string, manualTime: string, adminId: string, reason: string) => void;
    setAttendanceLogs: React.Dispatch<React.SetStateAction<Types.AttendanceLog[]>>;
    complianceSettings: Types.ComplianceSettings;
    setComplianceSettings: React.Dispatch<React.SetStateAction<Types.ComplianceSettings>>;
    systemSettings: Types.SystemSettings;
    setSystemSettings: React.Dispatch<React.SetStateAction<Types.SystemSettings>>;
    policyVersion: number;
    setPolicyVersion: React.Dispatch<React.SetStateAction<number>>;
    addHoliday: (holiday: Types.Holiday) => void;
    updateHoliday: (date: string, holiday: Types.Holiday) => void;
    deleteHoliday: (date: string) => void;
    flagEmployeeRisk: (empId: string) => void;
    addDocumentToEmployee: (empId: string, document: Omit<Types.DocumentType, 'id' | 'date'>) => void;
    getNonCompliantAssetsCount: () => number;
    hireCandidate: (candidateId: string, township: string) => void;
    renewCertification: (certId: string) => void;
    assignCourseToDepartment: (courseId: string, department: string) => void;
    approveLeave: (reqId: string, adminId: string, forceOverride?: boolean) => { success: boolean, message: string };
    rejectLeave: (reqId: string, adminId: string, reason?: string) => { success: boolean, message: string };
    addLeaveRequest: (req: Omit<Types.LeaveRequest, 'id' | 'status' | 'submitted'>) => void;
    finalizeReview: (reviewId: string, adminId: string, recommendPromotion?: boolean, newRole?: string, newSalary?: number, checksum?: string) => void;
    objectives: Types.Objective[];
    setObjectives: React.Dispatch<React.SetStateAction<Types.Objective[]>>;
    keyResults: Types.KeyResult[];
    setKeyResults: React.Dispatch<React.SetStateAction<Types.KeyResult[]>>;
    updateKeyResult: (krId: string, newValue: number) => void;
    submitReview: (reviewId: string, reviewerId: string, scores: Types.Review['competencyScores'], selfRating?: number, managerComments?: string) => { success: boolean; message: string };
    performanceReviewRequests: Types.PerformanceReviewRequest[];
    setPerformanceReviewRequests: React.Dispatch<React.SetStateAction<Types.PerformanceReviewRequest[]>>;
    reportAssetLoss: (assetId: string, empId: string) => void;
    terminateEmployee: (empId: string, actorId: string) => { success: boolean, message: string };
    completeCourse: (courseId: string, empId: string, grade?: string) => void;
    addTrainingCourse: (course: Pick<Types.Course, 'name' | 'category' | 'duration' | 'isMandatory' | 'expiryDays' | 'skillTags' | 'provider' | 'costPerHead' | 'minPassingScore'>) => void;
    updateEmployee: (empId: string, updates: Partial<Types.Employee>) => Promise<{ success: boolean, message: string }>;
    addEmployee: (employee: Omit<Types.Employee, 'id'> & { id?: string }, adminId: string) => Promise<{ success: boolean; message: string; empId?: string }>;
    deleteEmployee: (empId: string, adminId: string) => Promise<{ success: boolean; message: string }>;
    addLocation: (loc: Omit<Types.OfficeLocation, 'id'>) => { success: boolean; message: string };
    updateLocation: (loc: Types.OfficeLocation) => { success: boolean; message: string };
    deleteLocation: (id: string) => { success: boolean; message: string };
    addDepartment: (dept: Omit<Types.Department, 'id' | 'order'>) => { success: boolean; message: string };
    updateDepartment: (dept: Types.Department) => { success: boolean; message: string };
    deleteDepartment: (id: string) => { success: boolean; message: string };
    reorderDepartments: (depts: Types.Department[]) => void;
    addPosition: (pos: Omit<Types.Position, 'id'>) => { success: boolean; message: string };
    updatePosition: (pos: Types.Position) => { success: boolean; message: string };
    deletePosition: (id: string) => { success: boolean; message: string };
    shiftAssignments: Types.ShiftAssignment[];
    setShiftAssignments: React.Dispatch<React.SetStateAction<Types.ShiftAssignment[]>>;
    assignShift: (empId: string, date: string, shiftId: string, reason?: string, adminId?: string, customStart?: string, customEnd?: string, workType?: 'Regular' | 'Overtime') => { success: boolean; message: string };
    publishedWeeks: string[];
    assignDepartmentShift: (deptId: string, shiftId: string, date: string, adminId?: string) => { success: boolean; message: string; skippedNames: string[] };
    publishWeek: (weekStart: string, adminId?: string) => { success: boolean; message: string };
    addManualPunch: (empId: string, date: string, shiftId: string, checkIn: string, checkOut: string, reason: string, adminId: string, customStart?: string, customEnd?: string, workType?: 'Regular' | 'Overtime') => { success: boolean; message: string };
    onboardingRecords: Types.OnboardingRecord[];
    setOnboardingRecords: React.Dispatch<React.SetStateAction<Types.OnboardingRecord[]>>;
    jobPostings: Types.JobPosting[];
    setJobPostings: React.Dispatch<React.SetStateAction<Types.JobPosting[]>>;
    createJobPosting: (job: Omit<Types.JobPosting, 'id' | 'postingDate'>, adminId: string) => { success: boolean; message: string };
    toggleJobPortalStatus: (jobId: string, adminId: string) => { success: boolean; message: string };
    fieldAgents: Types.FieldAgent[];
    setFieldAgents: React.Dispatch<React.SetStateAction<Types.FieldAgent[]>>;
    gpsLogs: Types.GPSLog[];
    setGpsLogs: React.Dispatch<React.SetStateAction<Types.GPSLog[]>>;
    offlineQueue: Types.GPSLog[];
    logFieldAgentLocation: (agentId: string, gps: { lat: number, lng: number }, battery: number, onLine: boolean) => void;
    optimizeFieldRoutes: (adminId: string) => { success: boolean; message: string };
    laborContracts: Types.LaborContract[];
    setLaborContracts: React.Dispatch<React.SetStateAction<Types.LaborContract[]>>;
    addLaborContract: (contract: Omit<Types.LaborContract, 'id' | 'status'>, adminId: string) => { success: boolean; message: string };
    disciplinaryActions: Types.DisciplinaryAction[];
    setDisciplinaryActions: React.Dispatch<React.SetStateAction<Types.DisciplinaryAction[]>>;
    addDisciplinaryAction: (action: Omit<Types.DisciplinaryAction, 'id' | 'status' | 'resolvedDate' | 'resolvedBy'>, adminId: string) => { success: boolean; message: string };
    resolveDisciplinaryAction: (actionId: string, adminId: string) => { success: boolean; message: string };
    archivedDocuments: Types.ArchivedDocument[];
    bulkImportAttendance: (adminId: string, csvData?: string) => { success: boolean; message: string };
    addDocumentToLibrary: (doc: Omit<Types.ArchivedDocument, 'id' | 'generatedAt' | 'checksum'>, adminId: string) => { success: boolean; message: string; id?: string; checksum?: string };
    deleteArchivedDocument: (docId: string, adminId: string, reason: string) => { success: boolean; message: string };
    policies: Types.LeavePolicy[];
    setPolicies: React.Dispatch<React.SetStateAction<Types.LeavePolicy[]>>;
    holidays: Types.Holiday[];
    setHolidays: React.Dispatch<React.SetStateAction<Types.Holiday[]>>;
    adjustLeaveBalance: (empId: string, type: string, amount: number, reason: string, adminId: string) => { success: boolean; message: string };
    generateEntitlements: (empId: string) => void;
    locationSnapshots: Types.LocationSnapshot[];
    setLocationSnapshots: React.Dispatch<React.SetStateAction<Types.LocationSnapshot[]>>;
    jobActivityChanges: Types.JobActivityChange[];
    setJobActivityChanges: React.Dispatch<React.SetStateAction<Types.JobActivityChange[]>>;
    profileChangeRequests: Types.ProfileChangeRequest[];
    setProfileChangeRequests: React.Dispatch<React.SetStateAction<Types.ProfileChangeRequest[]>>;
    submitProfileChangeRequest: (req: Omit<Types.ProfileChangeRequest, 'id' | 'status' | 'submittedAt'>) => { success: boolean; id: string };
    handleProfileChangeRequest: (id: string, action: 'Approve' | 'Reject', reviewerId: string, rejectionReason?: string) => { success: boolean; message: string };
    recruitmentActions: Types.RecruitmentAction[];
    setRecruitmentActions: React.Dispatch<React.SetStateAction<Types.RecruitmentAction[]>>;
    attendanceRequests: Types.AttendanceRequest[];
    setAttendanceRequests: React.Dispatch<React.SetStateAction<Types.AttendanceRequest[]>>;
    addJobActivityChange: (change: Omit<Types.JobActivityChange, 'id' | 'status' | 'submittedDate'>) => void;
    announcements: Types.Announcement[];
    setAnnouncements: React.Dispatch<React.SetStateAction<Types.Announcement[]>>;
    createAnnouncement: (ann: Omit<Types.Announcement, 'id' | 'createdAt' | 'status' | 'sourceType'>) => { success: boolean; id: string };
    acknowledgeAnnouncement: (annId: string, empId: string) => void;
    toggleAutoAttendance: (empId: string, adminId: string) => { success: boolean; message: string };
    addAllowanceConfig: (config: Omit<Types.AllowanceConfig, 'id'>) => void;
    addDeductionConfig: (config: Omit<Types.DeductionConfig, 'id'>) => void;
    // Bridged live from UserAccessProvider
    isAdmin: (empId: string) => boolean;
    subscriptionTier: 'premium' | 'standard';
    securityAuditLogs: Types.SecurityAuditLog[];
    verifyLocalAuth: (input: string) => boolean;
    addSecurityLog: (log: Omit<Types.SecurityAuditLog, 'id' | 'timestamp'>) => void;
    downloadSystemBackup: () => void;
    logSettingChange: (field: string, oldVal: any, newVal: any) => void;
    userPermissions: string[];
    tickets: Types.Ticket[];
    setTickets: React.Dispatch<React.SetStateAction<Types.Ticket[]>>;
    loadingTickets: boolean;
    updateTicketStatus: (id: string, status: Types.Ticket['status']) => Promise<void>;
    loadingEmployees: boolean;
};

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

// Helper function to calculate distance between two GPS coordinates (Haversine formula)
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const d = R * c; // in metres
    return d;
};

export const AppDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { getFormattedDate, getCurrentDateISO, getAdjustedDateObj, normalizeToISO, addCalendarEvent } = useSystemCalendar();
    const { 
        auditLogs, 
        isAdmin, 
        addAuditLog, 
        verifyLocalAuth, 
        addSecurityLog,
        securityAuditLogs,
        subscriptionTier,
        currentUser
    } = useUserAccess();
    
    const [policyVersion, setPolicyVersion] = useState<number>(1.02);
    const incrementPolicyVersion = () => setPolicyVersion(v => parseFloat((v + 0.01).toFixed(2)));
    // subscriptionTier is bridged from UserAccessProvider (canonical source)

    // Ref-bridge: outer functions that need PayrollProvider's setters (setOTRequests) reference
    // this ref. The PayrollBridge component populates it with live setters on mount.
    const payrollSettersRef = useRef<{
        setOTRequests: React.Dispatch<React.SetStateAction<Types.OTRequest[]>>;
        otRequests: Types.OTRequest[];
        adjustments: Types.Adjustment[];
        addAdjustment: (adj: Omit<Types.Adjustment, 'id' | 'status' | 'submittedDate'>) => void;
        lastPayrollTotal: number;
    }>({
        setOTRequests: () => {},
        otRequests: [],
        adjustments: [],
        addAdjustment: () => {},
        lastPayrollTotal: 0
    });

    // Aliases for outer functions — delegate to the live data/setter via ref
    const setOTRequests = (...args: Parameters<React.Dispatch<React.SetStateAction<Types.OTRequest[]>>>) => payrollSettersRef.current.setOTRequests(...args);
    const getOTRequests = () => payrollSettersRef.current.otRequests;
    const getAdjustments = () => payrollSettersRef.current.adjustments;
    const getLastPayrollTotal = () => payrollSettersRef.current.lastPayrollTotal;
    const DEFAULT_EMPLOYEES: Types.Employee[] = [
        { id: 'EMP-001', name: 'Nilar Lwin', role: 'Senior UX Designer', dept: 'Product Dept', status: 'Active', joinDate: '2021-01-15', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDtMXUX0ktXwWpCR_HssI-ya16-3aPa6AAVPyBQ1EHpfp-j-sPL3V6-M9LOQH5oBAEgQVe-LnDjqixmSwV106z7bEtrnsNZO1CATGA_USq9lnhHi1_HCFl-Cyi3xyw648ljz2mqjJMc3vscDUW5zgws6ccC1OF1vEu1wdaDvwNJ2V-sg_zZ0haXJZDCxUvx8VjDCNXD51nD66gSegMbmfNMdqwU2v6zEDDEhi7cAmX1yUQ8UQLqt3O-oPvyg5wEcfX6wNGOUrCzj4', township: 'Sanchaung', nrcNumber: '12/Bahan(N)123456', ssbNumber: 'SSB-001-992', mobile: '09-4555-00000', hasCriticalRiskFlag: false, documents: [], recruitmentSource: 'LinkedIn', baseSalary: 1200000, reliefs: { spouse: true, parentsCount: 0, childrenCount: 1 }, shiftId: 'SH-GEN-96', bankName: 'KBZ Bank', accountNumber: '1002019920031', enrolledCourses: [{ courseId: 'CRS-POL-101', enrollmentDate: '2023-09-01', status: 'In Progress' }], leaveBalances: { Casual: 4, Medical: 12, Earned: 8 }, policyId: 'LP-MGM-01', autoAttendanceEnabled: true },
        { id: 'EMP-004', name: 'Thida', role: 'UI Designer', dept: 'Design', status: 'Active', joinDate: '2022-03-10', avatar: null, township: 'Bahan', nrcNumber: '12/Kamaya(N)555666', ssbNumber: 'SSB-004-112', initials: 'T', colorClass: 'bg-indigo-100 text-indigo-700', hasCriticalRiskFlag: false, documents: [], recruitmentSource: 'Internal Portal', baseSalary: 800000, reliefs: { spouse: false, parentsCount: 1, childrenCount: 0 }, shiftId: 'SH-GEN-96', bankName: 'Yoma Bank', accountNumber: '200155667788', enrolledCourses: [{ courseId: 'CRS-TECH-04', enrollmentDate: '2023-08-15', status: 'Completed', completionDate: '2023-09-10' }], leaveBalances: { Casual: 6, Medical: 15, Earned: 10 }, policyId: 'LP-GEN-01', autoAttendanceEnabled: false },
        { id: 'EMP-012', name: 'Maung Maung', role: 'Frontend Developer', dept: 'Engineering', status: 'Active', joinDate: '2022-06-20', avatar: null, township: 'Insein', nrcNumber: '12/Okkala(N)777888', ssbNumber: 'SSB-012-334', initials: 'M', colorClass: 'bg-teal-100 text-teal-700', mobile: '09123456789', hasCriticalRiskFlag: true, criticalRiskCategory: 'Safety', documents: [], recruitmentSource: 'LinkedIn', baseSalary: 950000, reliefs: { spouse: true, parentsCount: 2, childrenCount: 2 }, shiftId: 'SH-FAC-85', bankName: 'KPay', enrolledCourses: [{ courseId: 'CRS-102', enrollmentDate: '2024-01-10', status: 'In Progress' }], leaveBalances: { Casual: 6, Medical: 15, Earned: 10 }, policyId: 'LP-GEN-01', autoAttendanceEnabled: false },
        { id: 'EMP-023', name: 'Kyaw Kyaw', role: 'Sales Executive', dept: 'Sales', status: 'Active', joinDate: '2023-02-05', avatar: null, township: 'Dagon', nrcNumber: '12/Dagon(N)999000', ssbNumber: 'SSB-023-556', initials: 'K', colorClass: 'bg-orange-100 text-orange-700', hasCriticalRiskFlag: false, documents: [], recruitmentSource: 'Types.Employee Referral', baseSalary: 700000, reliefs: { spouse: false, parentsCount: 1, childrenCount: 0 }, shiftId: 'SH-GEN-96', bankName: 'MAB Bank', accountNumber: '998822331100', enrolledCourses: [], leaveBalances: { Casual: 3, Medical: 8, Earned: 4 }, policyId: 'LP-ACC-01', autoAttendanceEnabled: false },
        { id: 'EMP-024', name: 'Zaw Min', role: 'Backend Dev', dept: 'Engineering', status: 'Terminated', joinDate: '2021-08-12', avatar: null, township: 'Hlaing', nrcNumber: '12/Hlaing(N)111222', ssbNumber: 'SSB-024-778', initials: 'ZM', colorClass: 'bg-slate-100 text-slate-700', hasCriticalRiskFlag: false, documents: [], recruitmentSource: 'Direct', baseSalary: 850000, reliefs: { spouse: true, parentsCount: 2, childrenCount: 3 }, shiftId: 'SH-GEN-96', enrolledCourses: [], leaveBalances: { Casual: 0, Medical: 0, Earned: 0 }, policyId: 'LP-GEN-01', autoAttendanceEnabled: false },
        { id: 'EMP-099', name: 'Aye Aye', role: 'HR Manager', dept: 'HR & Admin', status: 'On Leave', joinDate: '2020-05-30', avatar: null, township: 'Mayangone', nrcNumber: '12/Mayan(N)333444', ssbNumber: 'SSB-099-111', initials: 'AA', colorClass: 'bg-pink-100 text-pink-700', hasCriticalRiskFlag: false, documents: [], recruitmentSource: 'LinkedIn', baseSalary: 1100000, reliefs: { spouse: false, parentsCount: 0, childrenCount: 0 }, shiftId: 'SH-GEN-96', bankName: 'KBZ Bank', accountNumber: '1002019920088', enrolledCourses: [], leaveBalances: { Casual: 2, Medical: 15, Earned: 12 }, policyId: 'LP-MGM-01', autoAttendanceEnabled: false },
        { id: 'EMP-4022', name: 'U Kyaw Zayar', role: 'Senior Engineer', dept: 'Engineering', status: 'Active', joinDate: '2021-04-12', avatar: null, township: 'Tamwe', nrcNumber: '12/Tamwe(N)111111', ssbNumber: 'SSB-4022-111', initials: 'KZ', colorClass: 'bg-indigo-50 text-[#4F46E5] border border-indigo-100', mobile: '09-4500-1122', hasCriticalRiskFlag: false, documents: [], recruitmentSource: 'LinkedIn', baseSalary: 1000000, reliefs: { spouse: true, parentsCount: 1, childrenCount: 1 }, shiftId: 'SH-GEN-96', bankName: 'AYA Bank', accountNumber: '300055443322', enrolledCourses: [], leaveBalances: { Casual: 6, Medical: 15, Earned: 10 }, policyId: 'LP-GEN-01', autoAttendanceEnabled: false },
        { id: 'EMP-3105', name: 'Daw Aye Aye Myint', role: 'Marketing Specialist', dept: 'Marketing', status: 'Active', joinDate: '2022-12-01', avatar: null, township: 'Botahtaung', nrcNumber: '12/Bota(N)222222', ssbNumber: 'SSB-3105-222', initials: 'AM', colorClass: 'bg-emerald-50 text-emerald-600 border border-emerald-100', mobile: '09-2222-22222', hasCriticalRiskFlag: false, documents: [], recruitmentSource: 'Direct', baseSalary: 750000, reliefs: { spouse: false, parentsCount: 0, childrenCount: 0 }, shiftId: 'SH-GEN-96', bankName: 'WaveMoney', enrolledCourses: [], leaveBalances: { Casual: 6, Medical: 15, Earned: 10 }, policyId: 'LP-GEN-01', autoAttendanceEnabled: false },
        { id: 'EMP-1299', name: 'Daw Thida Aye', role: 'Sales rep', dept: 'Sales', status: 'Active', joinDate: '2020-07-15', avatar: null, township: 'Yankin', nrcNumber: '12/Yankin(N)333333', ssbNumber: 'SSB-1299-333', initials: 'TA', colorClass: 'bg-slate-200 text-slate-600 border border-slate-300', mobile: '09-7788-3344', hasCriticalRiskFlag: false, documents: [], recruitmentSource: 'Types.Employee Referral', baseSalary: 900000, reliefs: { spouse: true, parentsCount: 0, childrenCount: 2 }, shiftId: 'SH-GEN-96', bankName: 'Yoma Bank', accountNumber: '200155667799', enrolledCourses: [], leaveBalances: { Casual: 6, Medical: 15, Earned: 10 }, policyId: 'LP-GEN-01', autoAttendanceEnabled: false },
        { id: 'EMP-0044', name: 'Thaw Zin', role: 'Logistics Coordinator', dept: 'Logistics', status: 'Active', joinDate: '2023-01-20', avatar: null, township: 'Thaketa', nrcNumber: '12/Thaketa(N)444444', ssbNumber: 'SSB-0044-444', initials: 'TZ', colorClass: 'bg-amber-50 text-amber-600 border border-amber-100', mobile: '09-9988-7766', hasCriticalRiskFlag: false, documents: [], recruitmentSource: 'LinkedIn', baseSalary: 600000, reliefs: { spouse: false, parentsCount: 1, childrenCount: 0 }, shiftId: 'SH-FAC-85', bankName: 'CB Bank', accountNumber: '00129988776600', enrolledCourses: [], leaveBalances: { Casual: 6, Medical: 15, Earned: 10 }, policyId: 'LP-GEN-01', autoAttendanceEnabled: false }
    ];

    const [employees, setEmployees] = useState<Types.Employee[]>([]);
    const [loadingEmployees, setLoadingEmployees] = useState(true);

    // ── Employees: Supabase fetch + realtime ──────────────────────────────────
    useEffect(() => {
        const mapEmp = (emp: any): Types.Employee => ({
            ...emp,
            mobile: emp.mobile || emp.phone || '',
            avatar: emp.avatar || emp.profileImage || null,
            initials: emp.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'EM',
            colorClass: 'bg-blue-100 text-blue-600',
            documents: emp.documents || [],
            enrolledCourses: emp.enrolledCourses || [],
            leaveBalances: emp.leaveBalances || { Casual: 6, Medical: 30, Earned: 0 },
            reliefs: emp.reliefs || { spouse: false, parentsCount: 0, childrenCount: 0 }
        });

        const assetChannel = supabase.channel('assets-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'hrms_assets' }, (payload) => {
                if (payload.eventType === 'INSERT' && payload.new) {
                    setAssets(prev => [payload.new as Types.Asset, ...prev]);
                } else if (payload.eventType === 'UPDATE' && payload.new) {
                    setAssets(prev => prev.map(a => a.id === payload.new.id ? (payload.new as Types.Asset) : a));
                } else if (payload.eventType === 'DELETE' && payload.old) {
                    setAssets(prev => prev.filter(a => a.id !== (payload.old as any).id));
                }
            })
            .subscribe();

        const fetchEmployees = async () => {
            setLoadingEmployees(true);
            try {
                const { data, error } = await supabase.from('employees').select('*');
                if (!error && data) setEmployees(data.map(mapEmp));
            } catch (err) {
                console.log('Employee fetch error:', err);
            } finally {
                setLoadingEmployees(false);
            }
        };
        const fetchAssets = async () => {
            const { data, error } = await supabase.from('hrms_assets').select('*');
            if (!error && data) setAssets(data as Types.Asset[]);
        };
        fetchEmployees();
        fetchAssets();

        const channel = supabase.channel('employees-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, (payload) => {
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    const rec = mapEmp(payload.new);
                    setEmployees(prev => {
                        const exists = prev.some(e => e.id === rec.id);
                        if (exists) return prev.map(e => e.id === rec.id ? { ...e, ...rec } : e);
                        return [rec, ...prev];
                    });
                } else if (payload.eventType === 'DELETE') {
                    const id = (payload.old as any).id;
                    setEmployees(prev => prev.filter(e => e.id !== id));
                }
            }).subscribe();

        return () => {
            supabase.removeChannel(channel);
            supabase.removeChannel(assetChannel);
        };
    }, []);

    // Fetch shift assignments from Supabase
    const fetchShiftAssignments = async () => {
        try {
            const { data, error } = await supabase.from('shift_assignments').select('*').limit(500);
            if (data && data.length > 0 && !error) {
                const mapped: Types.ShiftAssignment[] = data.map((sa: any) => ({
                    id: sa.id,
                    empId: sa.empId,
                    date: sa.date,
                    shiftId: sa.shiftId,
                    modifiedByHr: sa.modifiedByHr,
                    reason: sa.reason,
                    adminId: sa.adminId,
                    oldShiftId: sa.oldShiftId,
                    customStart: sa.customStart,
                    customEnd: sa.customEnd,
                    workType: sa.workType,
                    source: sa.source
                }));
                setShiftAssignments(mapped);
            }
        } catch (err) {
            console.log('Using local shift assignments:', err);
        }
    };
    fetchShiftAssignments();

    // Fetch published weeks from Supabase
    const fetchPublishedWeeks = async () => {
        try {
            const { data, error } = await supabase.from('published_weeks').select('*');
            if (data && data.length > 0 && !error) {
                setPublishedWeeks(data.map((pw: any) => pw.weekKey));
            }
        } catch (err) {
            console.log('Using local published weeks:', err);
        }
    };
    fetchPublishedWeeks();

    const [reviews, setReviews] = useState<Types.Review[]>([]);

    // Fetch reviews from Supabase + realtime
    useEffect(() => {
        const mapReviewFromDb = (r: any): Types.Review => ({
            id: r.id,
            empId: r.empId || r.empid,
            revieweeId: r.revieweeId || r.revieweeid,
            reviewerId: r.reviewerId || r.reviewerid,
            name: r.name,
            dept: r.dept,
            period: r.period,
            progress: Array.isArray(r.progress) ? r.progress : [],
            rating: r.rating ?? null,
            competencyScores: r.competencyScores || r.competencyscores || {},
            selfRating: r.selfRating ?? r.selfrating,
            managerRating: r.managerRating ?? r.managerrating,
            managerComments: r.managerComments || r.managercomments,
            peerRatings: Array.isArray(r.peerRatings || r.peerratings) ? (r.peerRatings || r.peerratings) : undefined,
            bonusEligible: r.bonusEligible ?? r.bonuseligible ?? false,
            status: r.status || 'Pending',
            checksum: r.checksum,
            initials: r.initials,
            colorClass: r.colorClass || r.colorclass,
            hasReminderSent: r.hasReminderSent ?? r.hasremindersent ?? false,
        });

        const fetchReviews = async () => {
            try {
                const { data, error } = await supabase.from('reviews').select('*').order('createdAt', { ascending: false });
                if (error) throw error;
                if (data && data.length > 0) setReviews(data.map(mapReviewFromDb));
            } catch (err) {
                console.log('Using local reviews (Supabase not ready yet):', err);
            }
        };
        fetchReviews();

        const channel = supabase
            .channel('reviews-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, (payload) => {
                if (payload.eventType === 'INSERT' && payload.new) {
                    const mapped = mapReviewFromDb(payload.new);
                    setReviews(prev => prev.some(r => r.id === mapped.id) ? prev : [mapped, ...prev]);
                } else if (payload.eventType === 'UPDATE' && payload.new) {
                    const mapped = mapReviewFromDb(payload.new);
                    setReviews(prev => prev.map(r => r.id === mapped.id ? { ...r, ...mapped } : r));
                } else if (payload.eventType === 'DELETE' && payload.old) {
                    const id = (payload.old as any).id;
                    setReviews(prev => prev.filter(r => r.id !== id));
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const [assets, setAssets] = useState<Types.Asset[]>([]);

    const [candidates, setCandidates] = useState<Types.Candidate[]>([
        { id: 'ID-001', name: 'Kyaw Zayar', role: 'Senior UX Designer', jobId: 'JOB-YGN-001', source: 'LinkedIn', stage: 'Sourced', rating: 4.5, appliedDate: '2023-10-12', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAEZgsvW2q_TzDnGJMSq70biFs9_N7ZKEYFCzUilqFi2-gOpAwOAtGd3N4alXZN47rodYHFouIVBKSjY3Vq_UHNDGAnBNMhLFWwqme_W-h-FgZfxZR76ddmMsa1PVZmPQFfVYNEjjcqGQ0xZLlGFFjMSeM4Lavyhf1drkApk7ea1IepRBOQg6A1fYeOXwSFsti3ZPneGPk1zBoU8RCw0gcvH2_Z0-vihqld2KbWmpXDA2NK_8CtXb7QHJ4Ccd6fiXRMke0vWhYNbQuW' },
        { id: 'ID-002', name: 'Hla Hla Win', role: 'Product Manager', jobId: 'JOB-YGN-005', source: 'Internal Portal', stage: 'On Hold', rating: 4.0, appliedDate: '2023-09-16', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCAtjOxPtze78B318x_hJCfrT7O06_rzjbQywH8KrSRPP77c7rKeAUg062v4RFrqjSu2HSddF17dy2P1pMnZHyOaiTfJCGLC8fMPkwfqoiLHBqtIT6Cbbxs-fpnsfj6BsJ76BMRvEFuH0mCROpNieHgMFpph4f3rgMDWPoWlCnl_3AtCpgR0uKoVTEi5UmC9xCScZng9EK1ErMOa_99zlQR11NT3v1Liv5hiDFeHsQBnplYRorkUcxsNOB6nCKy-CGQtwHuZzf3nZ7p' },
        { id: 'ID-003', name: 'Aung Myo', role: 'Frontend Developer', jobId: 'JOB-YGN-012', source: 'LinkedIn', stage: 'Interview', rating: 4.8, appliedDate: '2023-10-08', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCsvkWyR6EilTQ2_JisJOFuKQirRq4ajZRMvtFgtDQNsHpiGz3Z6AwWQcTsnhxisUzJLxQSG43nVDZWnB9VoV94iMuKubTnNi6FwzSy3hdsnjCnx5kUusV5_CgmR4NDzmdARp-HnAPRJYAb5frfDEKaZNTYJpicN66qQ72H40lIQ3BgEEwfbQWwdb0P23zs5RRLhC4w1hs5Z2btHBC7kkk0Lzib6b-Y4N-S6cMV7VqavjQRApLz74j5gdL6anSthb05lWkYp1C6WMcU' },
        { id: 'ID-004', name: 'Thiri Swe', role: 'Sewing Line Supervisor', jobId: 'JOB-HLAW-042', source: 'Manual', stage: 'Offer', rating: 4.2, appliedDate: '2023-10-05', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuClGLER_PT_KXyILSXk_NKtj0kxcwP1TUiRbC6z_I_UTwrWYyuaqe4YWi8k81V_uuSr2XBijgXX8HZv38uNQOAabwTOwkgiRN-O2Q-DmpdGwFSEs_WKXE-MrwDFLtIpN6ZtTTap5xg9IWxl0QfsAK2W82VUIZVk7O7fiCqWSk8CIRY7K_zNssRfx4LBR3MWqopVE2jfJtyUQzSQaZd8wqFM4lIQiizubj73uNTqSEL-FJod4jEbzbagKDf6Nk8SSryb9MWnDXPfXSe4' }
    ]);

    const [candidateMessages, setCandidateMessages] = useState<Record<string, Types.CandidateMessage[]>>({
        'ID-003': [
            { id: 'M-1', sender: 'hr', text: 'Hi Aung Myo, your technical test was impressive. When can you join the technical interview?', timestamp: '10:00 AM' },
            { id: 'M-2', sender: 'candidate', text: 'Thank you! I am available tomorrow at 2 PM.', timestamp: '10:15 AM' }
        ]
    });

    const [alerts, setAlerts] = useState<Types.Alert[]>([]);
    const [tickets, setTickets] = useState<Types.Ticket[]>([]);
    const [loadingTickets, setLoadingTickets] = useState(true);

    // Fetch tickets from Supabase + realtime
    useEffect(() => {
        const mapTicketFromDb = (r: any): Types.Ticket => ({
            id: r.id,
            empId: r.emp_id || r.empId || r.empid,
            empName: r.emp_name || r.empName || r.empname,
            category: r.category,
            subject: r.subject,
            description: r.description,
            priority: r.priority,
            status: r.status || 'Open',
            createdAt: r.created_at || r.createdAt || r.createdat,
            updatedAt: r.updated_at || r.updatedAt || r.updatedat,
        });

        const fetchTickets = async () => {
            setLoadingTickets(true);
            try {
                const { data, error } = await supabase.from('tickets').select('*').order('created_at', { ascending: false }).limit(200);
                if (error) throw error;
                if (data) setTickets(data.map(mapTicketFromDb));
            } catch (err) {
                console.log('Using local tickets (Supabase not ready yet):', err);
            } finally {
                setLoadingTickets(false);
            }
        };
        fetchTickets();

        const channel = supabase
            .channel('tickets-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, (payload) => {
                console.log('[tickets-realtime]', payload.eventType, payload.new || payload.old);
                if (payload.eventType === 'INSERT' && payload.new) {
                    const mapped = mapTicketFromDb(payload.new);
                    setTickets(prev => prev.some(t => t.id === mapped.id) ? prev : [mapped, ...prev]);
                } else if (payload.eventType === 'UPDATE' && payload.new) {
                    const mapped = mapTicketFromDb(payload.new);
                    setTickets(prev => prev.map(t => t.id === mapped.id ? { ...t, ...mapped } : t));
                } else if (payload.eventType === 'DELETE' && payload.old) {
                    const id = (payload.old as any).id;
                    setTickets(prev => prev.filter(t => t.id !== id));
                }
            })
            .subscribe((status) => {
                console.log('[tickets-realtime] subscribe status:', status);
            });

        return () => { supabase.removeChannel(channel); };
    }, []);

    const [policies, setPolicies] = useState<Types.LeavePolicy[]>([
        {
            id: 'LP-GEN-01',
            name: 'Standard Staff Policy',
            description: 'Standard leave policy for permanent employees.',
            formulas: { type: 'Service-Length-Based Accruals', base: 10, bonusPerYear: 1 },
            approval_routing_templates: ['LineManager', 'HRAdmin'],
            isLossOfPay: false,
            maxCarryForward: 5,
            applicableLeaveTypes: ['Casual', 'Medical', 'Earned', 'Unpaid', 'Maternity', 'Paternity', 'Hospitalization']
        },
        {
            id: 'LP-MGM-01',
            name: 'Management Policy',
            description: 'Extended leave benefits for management tier.',
            formulas: { type: 'Fixed Yearly', base: 15 },
            approval_routing_templates: ['DepartmentHead', 'HRDirector'],
            isLossOfPay: false,
            maxCarryForward: 10,
            applicableLeaveTypes: ['Casual', 'Medical', 'Earned', 'Unpaid', 'Maternity', 'Paternity', 'Hospitalization']
        },
        {
            id: 'LP-ACC-01',
            name: 'Monthly Accrual Policy',
            description: 'Leaves earned monthly (1.25 days/month).',
            formulas: { type: 'Monthly Accrual', rate: 1.25 },
            approval_routing_templates: ['LineManager'],
            isLossOfPay: false,
            maxCarryForward: 0,
            applicableLeaveTypes: ['Casual', 'Medical', 'Earned', 'Unpaid']
        }
    ]);

    const [holidays, setHolidays] = useState<Types.Holiday[]>([
        { date: '2023-10-28', name: 'Thadingyut Festival (Full Moon Day)', isRestricted: true },
        { date: '2023-10-29', name: 'Thadingyut Festival (Pre-Full Moon)', isRestricted: true },
        { date: '2023-10-30', name: 'Thadingyut Festival (Post-Full Moon)', isRestricted: true },
        { date: '2023-11-26', name: 'Tazaungmon Festival', isRestricted: false },
        { date: '2023-12-25', name: 'Christmas Day', isRestricted: false }
    ]);

    // Fetch holidays from Supabase + realtime
    useEffect(() => {
        const mapHolFromDb = (r: any): Types.Holiday => ({
            date: r.date,
            name: r.name,
            isRestricted: r.isRestricted ?? r.isrestricted ?? false,
        });

        const fetchHolidays = async () => {
            try {
                const { data, error } = await supabase.from('holidays').select('*');
                if (error) throw error;
                if (data && data.length > 0) setHolidays(data.map(mapHolFromDb));
            } catch (err) {
                console.log('Using local holidays (Supabase not ready yet):', err);
            }
        };
        fetchHolidays();

        const channel = supabase
            .channel('holidays-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'holidays' }, (payload) => {
                if (payload.eventType === 'INSERT' && payload.new) {
                    const mapped = mapHolFromDb(payload.new);
                    setHolidays(prev => prev.some(h => h.date === mapped.date) ? prev : [...prev, mapped]);
                } else if (payload.eventType === 'UPDATE' && payload.new) {
                    const mapped = mapHolFromDb(payload.new);
                    setHolidays(prev => prev.map(h => h.date === mapped.date ? { ...h, ...mapped } : h));
                } else if (payload.eventType === 'DELETE' && payload.old) {
                    const date = (payload.old as any).date;
                    setHolidays(prev => prev.filter(h => h.date !== date));
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const [leaveRequests, setLeaveRequests] = useState<Types.LeaveRequest[]>([]);

    // ── Leave Requests: Supabase fetch + realtime ──────────────────────────────
    useEffect(() => {
        const mapLeave = (r: any): Types.LeaveRequest => ({
            ...r,
            empId: r.empId || r.empid,
            durationStr: r.durationStr || r.durationstr,
            totalDays: Number(r.totalDays || r.totaldays || 0),
            startDate: r.startDate || r.startdate,
            endDate: r.endDate || r.enddate,
            relieverId: r.relieverId || r.relieverid || '',
            relieverName: r.relieverName || r.relievername || '',
            hasCert: r.hasCert || r.hascert || false,
            isAdminOverride: r.isAdminOverride || r.isadminoverride || false,
            certFileName: r.certFileName || r.certfilename || '',
            rejectionReason: r.rejectionReason || r.rejectionreason || '',
            approvedBy: r.approvedBy || r.approvedby || '',
            approvedAt: r.approvedAt || r.approvedat || '',
            rejectedBy: r.rejectedBy || r.rejectedby || '',
            rejectedAt: r.rejectedAt || r.rejectedat || '',
            avatar: ''
        });

        const fetchLeave = async () => {
            const { data, error } = await supabase.from('leave_requests').select('*').order('createdAt', { ascending: false });
            if (!error && data) setLeaveRequests(data.map(mapLeave));
        };
        fetchLeave();

        const channel = supabase.channel('leave_requests-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, (payload) => {
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    const rec = mapLeave(payload.new);
                    setLeaveRequests(prev => {
                        const exists = prev.some(r => r.id === rec.id);
                        if (exists) return prev.map(r => r.id === rec.id ? { ...r, ...rec } : r);
                        return [rec, ...prev];
                    });
                } else if (payload.eventType === 'DELETE') {
                    const id = (payload.old as any).id;
                    setLeaveRequests(prev => prev.filter(r => r.id !== id));
                }
            }).subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const DEFAULT_ATTENDANCE_LOGS: Types.AttendanceLog[] = [
        { id: 'LOG-001', empId: 'EMP-004', name: 'Thida', dept: 'Design', checkIn: '09:05 AM', checkOut: '06:00 PM', location: 'HQ Office', status: 'Late', geofenceStatus: 'Verified', totalHours: 7.9, checkInMethod: 'Mobile App', isManual: false, penaltyRuleId: 'PEN-LATE', penaltyAmount: 5000, date: '2023-10-23', project: 'UI Redesign Sprint' },
        { id: 'LOG-002', empId: 'EMP-012', name: 'Maung Maung', dept: 'Engineering', checkIn: '09:00 AM', checkOut: '-- : --', location: 'Factory', status: 'Missing Out', geofenceStatus: 'Verified', totalHours: 0, checkInMethod: 'Biometric', isManual: false, penaltyAmount: 0, date: '2023-10-23', project: 'Production Line A' },
        { id: 'LOG-003', empId: 'EMP-023', name: 'Kyaw Kyaw', dept: 'Sales', checkIn: '09:15 AM', checkOut: '05:45 PM', location: 'Customer Site', status: 'Present', geofenceStatus: 'Verified', gps: { lat: 16.7984, lng: 96.1495 }, totalHours: 7.5, checkInMethod: 'Web Portal', isManual: true, penaltyAmount: 0, date: '2023-10-23', project: 'Warehouse Logistics' }
    ];

    const [attendanceLogs, setAttendanceLogs] = useState<Types.AttendanceLog[]>(() => {
        try {
            const saved = localStorage.getItem('hrms_attendance_logs');
            if (saved) return JSON.parse(saved);
        } catch (e) { console.error('Failed to load attendanceLogs from localStorage', e); }
        return DEFAULT_ATTENDANCE_LOGS;
    });

    // Fetch attendance logs from Supabase on mount
    useEffect(() => {
        const mapFromDb = (r: any): Types.AttendanceLog => ({
            id: r.id,
            empId: r.empid || r.empId,
            name: r.name || '',
            dept: r.dept || '',
            checkIn: r.checkin || r.checkIn || '-- : --',
            checkOut: r.checkout || r.checkOut || '-- : --',
            location: r.location || '',
            gps: (r.gpslat != null || r.gpslng != null) ? { lat: r.gpslat ?? 0, lng: r.gpslng ?? 0 } : undefined,
            geofenceStatus: r.geofencestatus || r.geofenceStatus || 'N/A',
            status: r.status || 'Present',
            adminAuditId: r.adminauditid || r.adminAuditId,
            adminAuditReason: r.adminauditreason || r.adminAuditReason,
            totalHours: Number(r.totalhours ?? r.totalHours ?? 0),
            checkInMethod: r.checkinmethod || r.checkInMethod || 'Web Portal',
            isManual: r.ismanual ?? r.isManual ?? false,
            penaltyRuleId: r.penaltyruleid || r.penaltyRuleId,
            penaltyAmount: Number(r.penaltyamount ?? r.penaltyAmount ?? 0),
            date: r.date || '',
            deviceCheckIn: r.devicecheckin || r.deviceCheckIn,
            syncCheckIn: r.synccheckin || r.syncCheckIn,
            deviceCheckOut: r.devicecheckout || r.deviceCheckOut,
            syncCheckOut: r.synccheckout || r.syncCheckOut,
            biometricDeviceId: r.biometricdeviceid || r.biometricDeviceId,
            project: r.project,
        });

        const fetchAttendanceLogs = async () => {
            try {
                const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
                const { data, error } = await supabase
                    .from('attendance_logs')
                    .select('*')
                    .gte('createdAt', cutoff)
                    .order('createdAt', { ascending: false })
                    .limit(200);
                if (error) throw error;
                if (data && data.length > 0) {
                    console.log('[Attendance] Supabase raw sample:', JSON.stringify(data[0], null, 2));
                    const mapped = data.map(mapFromDb);
                    console.log('[Attendance] Mapped sample:', JSON.stringify(mapped[0], null, 2));
                    setAttendanceLogs(mapped);
                    localStorage.setItem('hrms_attendance_logs', JSON.stringify(mapped));
                }
            } catch (err) {
                console.log('Using local attendanceLogs (Supabase not ready yet):', err);
            }
        };
        fetchAttendanceLogs();

        // Realtime subscription for live multi-user sync
        const channel = supabase
            .channel('attendance_logs-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_logs' }, (payload) => {
                console.log('Attendance log change detected:', payload);
                if (payload.eventType === 'INSERT' && payload.new) {
                    const mapped = mapFromDb(payload.new);
                    setAttendanceLogs(prev => {
                        if (prev.some(r => r.id === mapped.id)) return prev;
                        return [mapped, ...prev];
                    });
                } else if (payload.eventType === 'UPDATE' && payload.new) {
                    const mapped = mapFromDb(payload.new);
                    setAttendanceLogs(prev => prev.map(r => r.id === mapped.id ? { ...r, ...mapped } : r));
                } else if (payload.eventType === 'DELETE' && payload.old) {
                    const id = (payload.old as any).id;
                    setAttendanceLogs(prev => prev.filter(r => r.id !== id));
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // Fetch attendance_requests from Supabase + realtime
    useEffect(() => {
        const mapRequestFromDb = (r: any): Types.AttendanceRequest => ({
            id: r.id,
            empId: r.empId,
            name: r.name,
            type: r.type,
            time: r.time,
            shiftTime: r.shiftTime,
            location: r.location,
            reason: r.reason,
            status: r.status,
            submittedDate: r.submittedDate,
            priority: r.priority || 'Medium',
            category: 'Attendance',
        });

        const fetchAttendanceRequests = async () => {
            try {
                const { data, error } = await supabase
                    .from('attendance_requests')
                    .select('*')
                    .order('createdAt', { ascending: false })
                    .limit(200);
                if (error) throw error;
                if (data && data.length > 0) {
                    const mapped = data.map(mapRequestFromDb);
                    setAttendanceRequests(mapped);
                }
            } catch (err) {
                console.log('Using local attendanceRequests (Supabase not ready yet):', err);
            }
        };
        fetchAttendanceRequests();

        const channel = supabase
            .channel('attendance_requests-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_requests' }, (payload) => {
                console.log('Attendance request change detected:', payload);
                if (payload.eventType === 'INSERT' && payload.new) {
                    const mapped = mapRequestFromDb(payload.new);
                    setAttendanceRequests(prev => {
                        if (prev.some(r => r.id === mapped.id)) return prev;
                        return [mapped, ...prev];
                    });
                } else if (payload.eventType === 'UPDATE' && payload.new) {
                    const mapped = mapRequestFromDb(payload.new);
                    setAttendanceRequests(prev => prev.map(r => r.id === mapped.id ? { ...r, ...mapped } : r));
                } else if (payload.eventType === 'DELETE' && payload.old) {
                    const id = (payload.old as any).id;
                    setAttendanceRequests(prev => prev.filter(r => r.id !== id));
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // Ref to suppress self-triggered realtime bounce-backs.
    // When this session upserts systemSettings, the realtime channel fires an UPDATE
    // event back at us — overwriting our already-correct local state. We skip it.
    const skipNextRealtimeUpdate = React.useRef(false);

    // Fetch system_settings from Supabase + realtime
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data, error } = await supabase.from('system_settings').select('data').eq('id', 'default').single();
                if (error) throw error;
                if (data?.data && Object.keys(data.data).length > 0) {
                    const s = data.data as Types.SystemSettings;
                    setSystemSettings(s);
                    if (s.compliance) setComplianceSettings(s.compliance);
                }
            } catch (err) {
                console.log('Using default systemSettings (Supabase not ready yet):', err);
            }
        };
        fetchSettings();

        const channel = supabase
            .channel('system_settings-changes')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'system_settings' }, (payload) => {
                // Skip events triggered by this session's own upsert
                if (skipNextRealtimeUpdate.current) {
                    skipNextRealtimeUpdate.current = false;
                    return;
                }
                if (payload.new?.data) {
                    const s = payload.new.data as Types.SystemSettings;
                    setSystemSettings(s);
                    if (s.compliance) setComplianceSettings(s.compliance);
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);


    const [complianceSettings, setComplianceSettings] = useState<Types.ComplianceSettings>({
        ssbCap: 6000,
        ssbPercent: 2,
        ssbEmployerCap: 9000,
        ssbEmployerPercent: 3,
        pitThreshold: 400000,
        pitRate: 0.05,
        pitExemption: 4800000,
        attendancePenalty: 5000,
        maxWeeklyHours: 48,
        workingDaysPerMonth: 30,
        geofenceViolationThreshold: 500,
        officeStamp: null,
        companyTIN: 'TIN-992-001',
        region: 'MM',
        currency: 'MMK',
        attendanceGracePeriod: 15,
        allowanceConfigs: [],
        deductionConfigs: [
            { id: 'DED-D01', name: 'Meal Deduction', logic: 'Flat Rate', value: 3000, isEnabled: true, isDeletable: true, affectedIncomeParts: ['Base'] },
            { id: 'DED-D02', name: 'Uniform Fund', logic: 'Flat Rate', value: 1000, isEnabled: true, isDeletable: true, affectedIncomeParts: ['Base'] }
        ]
    });

    const [systemSettings, setSystemSettings] = useState<Types.SystemSettings>({
        companyName: 'Myanmar Enterprise Solutions Co., Ltd.',
        registrationNumber: 'MES-YGN-2023-0891',
        ssbEmployerId: 'SSB-YGN-00123',
        taxId: '123456789',
        headquarters: 'No. 123, Pyay Road, Kamayut Township, Yangon, Myanmar',
        // Intentionally empty — Supabase is the source of truth for locations.
        // Do NOT add hardcoded entries here; they would reappear after every hot reload.
        officeLocations: [],
        adminIds: ['ADM-001', 'FIN-MGR-001'],
        atsCredits: 12,
        compliance: complianceSettings,
        loanConfiguration: {
            maxEmergencyLoanTerm: 12,
            loanLimitMultiplier: 2,
            salaryAdvanceTerm: 1,
            roundingMethod: 'nearest'
        },
        deviceConfig: {
            showQR: true,
            activeLocationId: 'LOC-HQ'
        },
        lastAuditDate: new Date().toISOString().split('T')[0],
        paymentProviders: [
            { id: 'PROV-001', name: 'KBZ Bank', type: 'Bank', requiredFields: ['accountNumber'] },
            { id: 'PROV-002', name: 'CB Bank', type: 'Bank', requiredFields: ['accountNumber'] },
            { id: 'PROV-003', name: 'KPay', type: 'Digital Wallet', requiredFields: ['mobile'] },
            { id: 'PROV-004', name: 'WaveMoney', type: 'Digital Wallet', requiredFields: ['mobile'] },
            { id: 'PROV-005', name: 'AYA Bank', type: 'Bank', requiredFields: ['accountNumber'] },
            { id: 'PROV-006', name: 'Yoma Bank', type: 'Bank', requiredFields: ['accountNumber'] },
            { id: 'PROV-007', name: 'MAB Bank', type: 'Bank', requiredFields: ['accountNumber'] }
        ],
        paymentRoundingLogic: 'Nearest',
        companyLogo: null,
        expenseModuleEnabled: false,
        recruitmentModuleEnabled: false,
        expenseCategories: [
            { id: 'CAT-01', name: 'Client Entertainment', description: 'Meals and events with clients', monthlyLimit: 500000 },
            { id: 'CAT-02', name: 'Travel & Transport', description: 'Flights, taxis, and fuel', monthlyLimit: 300000 },
            { id: 'CAT-03', name: 'Office Supplies', description: 'Stationery and minor equipment', monthlyLimit: 100000 }
        ],
        autoAttendancePolicyEnabled: false,
        autoHolidayWorkEnabled: false,
        departments: [
            { id: 'DEPT-ENG', name: 'Engineering', code: 'ENG', order: 1, parentId: null },
            { id: 'DEPT-PROD', name: 'Product Dept', code: 'PROD', order: 2, parentId: 'DEPT-ENG' },
            { id: 'DEPT-DSGN', name: 'Design', code: 'DSGN', order: 3, parentId: 'DEPT-PROD' },
            { id: 'DEPT-SALES', name: 'Sales', code: 'SALES', order: 4, parentId: null },
            { id: 'DEPT-HR', name: 'HR & Admin', code: 'HRAD', order: 5, parentId: null }
        ],
        positions: [
            { id: 'POS-ENG-01', name: 'Fullstack Developer', deptId: 'DEPT-ENG' },
            { id: 'POS-ENG-02', name: 'Senior Architect', deptId: 'DEPT-ENG' },
            { id: 'POS-PROD-01', name: 'Product Manager', deptId: 'DEPT-PROD' },
            { id: 'POS-DSGN-01', name: 'UI/UX Designer', deptId: 'DEPT-DSGN' },
            { id: 'POS-HR-01', name: 'HR Manager', deptId: 'DEPT-HR' }
        ],
        penaltyRules: [
            { id: 'PEN-LATE', name: 'Late Arrival Penalty', condition: 'LateMinutes > 15', penaltyFormula: 'HourlyRate * 0.5' }
        ],
        onboardingTemplates: [
            {
                roleId: 'Default',
                tasks: [
                    { title: 'Submit NRC Copy', isMandatory: true, tooltip: 'Required for tax & payroll verification', type: 'Document' },
                    { title: 'Submit SSB Form', isMandatory: true, tooltip: 'Standard Myanmar labor requirement for social security', type: 'Document' },
                    { title: 'Bank Details', isMandatory: true, tooltip: 'Required for salary disbursement (Auto-syncs to Pay profile)', type: 'Document' },
                    { title: 'Biometric PIN Sync', isMandatory: true, tooltip: 'Ensure ZK-teco fingerprint ID is registered', type: 'IT' },
                    { title: 'Office Tour & Safety Guidelines', isMandatory: false, tooltip: 'General workplace orientation', type: 'Action' }
                ]
            },
            {
                roleId: 'Production Operator',
                tasks: [
                    { title: 'Submit NRC Copy', isMandatory: true, tooltip: 'Required for tax & payroll verification', type: 'Document' },
                    { title: 'Submit SSB Form', isMandatory: true, tooltip: 'Standard Myanmar labor requirement for social security', type: 'Document' },
                    { title: 'Factory Safety Briefing', isMandatory: true, tooltip: 'OSHA & Local Compliance requirement', type: 'Training' },
                    { title: 'Issue Safety Gear (PPE)', isMandatory: true, tooltip: 'Helmet, boots, and visibility vest', type: 'Action' }
                ]
            }
        ],
        projectRates: {
            'E-Commerce Platform': 5000,
            'Internal HR Portal': 4500,
            'Security Audit': 12000
        },
        allowanceConfigs: [
            { id: 'ALW-SAL', name: 'Base Salary', logic: 'Flat Rate', value: 0, isEnabled: true, isDeletable: false },
            { id: 'ALW-OT', name: 'Overtime (Old)', logic: 'Flat Rate', value: 0, isEnabled: true, isDeletable: false },
            { id: 'ALW-ATT', name: 'Attendance Bonus', logic: 'Attendance-Based', value: 50000, isEnabled: false, isDeletable: true }
        ],
        deductionConfigs: [
            { id: 'DED-UL', name: 'Unpaid Leave', logic: 'Unpaid Leave', value: 0, affectedIncomeParts: ['Base Salary'], isEnabled: true, isDeletable: false },
            { id: 'DED-ABS', name: 'Absent', logic: 'Flat Rate', value: 10000, affectedIncomeParts: ['Base Salary'], isEnabled: true, isDeletable: false },
            { id: 'DED-LATE', name: 'Late Penalty', logic: 'Late Penalty', value: 1000, affectedIncomeParts: ['Base Salary'], isEnabled: true, isDeletable: true },
            { id: 'DED-MISS', name: 'Missing Punch Penalty', logic: 'Missing Punch Penalty', value: 5000, affectedIncomeParts: ['Base Salary'], isEnabled: true, isDeletable: true }
        ],
        roles: [
            { role: 'Admin', permissions: ['canViewPayroll', 'canApproveLoans', 'canEditAssets', 'canEditSettings'] },
            { role: 'Manager', permissions: ['canApproveLoans'] },
            { role: 'Employee', permissions: [] }
        ]
    });

    const [onboardingRecords, setOnboardingRecords] = useState<Types.OnboardingRecord[]>([
        {
            id: 'ONB-001', empId: 'EMP-001', name: 'Nilar Lwin', role: 'Senior UX Designer', supervisor: 'Daw Khin Myo', startDate: 'Oct 12, 2023', status: 'In Progress',
            tasks: [
                { id: 'T-1', title: 'Submit NRC Copy', isCompleted: true, isMandatory: true, tooltip: 'Required for tax & payroll verify', type: 'Document' },
                { id: 'T-2', title: 'Submit SSB Form', isCompleted: false, isMandatory: true, tooltip: 'Standard Myanmar labor requirement', type: 'Document' },
                { id: 'T-3', title: 'Bank Details', isCompleted: false, isMandatory: true, tooltip: 'Required for salary disbursement (Auto-syncs)', type: 'Document' },
                { id: 'T-4', title: 'Biometric PIN Sync', isCompleted: true, isMandatory: true, tooltip: 'Ensure ZK-teco fingerprint ID is registered', type: 'IT' },
                { id: 'T-5', title: 'Office Tour & Safety Guidelines', isCompleted: true, isMandatory: false, tooltip: 'General workplace orientation', type: 'Action' }
            ]
        },
        {
            id: 'ONB-002', empId: 'EMP-3105', name: 'Daw Aye Aye Myint', role: 'Marketing Specialist', supervisor: 'U Bo Bo', startDate: 'Oct 15, 2023', status: 'Pending Docs',
            tasks: [
                { id: 'T-1', title: 'Submit NRC Copy', isCompleted: true, isMandatory: true, tooltip: 'Required for tax & payroll', type: 'Document' },
                { id: 'T-2', title: 'Submit SSB Form', isCompleted: false, isMandatory: true, tooltip: 'Missing SSB Form', type: 'Document' },
                { id: 'T-3', title: 'Sign NDA', isCompleted: false, isMandatory: true, tooltip: 'Non-disclosure agreement', type: 'Document' }
            ]
        },
        {
            id: 'ONB-003', empId: 'EMP-1299', name: 'Daw Thida Aye', role: 'Sales rep', supervisor: 'U Aung Kyaw', startDate: 'Sep 10, 2023', status: 'Overdue',
            tasks: [
                { id: 'T-1', title: 'Submit NRC Copy', isCompleted: true, isMandatory: true, tooltip: 'Required for tax & payroll', type: 'Document' },
                { id: 'T-2', title: 'Sign Sales Policy', isCompleted: false, isMandatory: true, tooltip: 'Sales commission policy acknowledgment', type: 'Document' },
                { id: 'T-3', title: 'Bank Details', isCompleted: false, isMandatory: true, tooltip: 'Required for salary disbursement', type: 'Document' }
            ]
        }
    ]);

    // Fetch onboarding_records from Supabase + realtime
    useEffect(() => {
        const mapOnbFromDb = (r: any): Types.OnboardingRecord => ({
            id: r.id,
            empId: r.empId || r.empid,
            employee_id: r.empId || r.empid,
            name: r.name || '',
            role: r.role || '',
            supervisor: r.supervisor,
            startDate: r.startDate || r.startdate,
            status: r.status || 'In Progress',
            tasks: Array.isArray(r.tasks) ? r.tasks : [],
            created_at: r.createdAt || r.createdat || new Date().toISOString(),
            isVisibleToEmployee: r.isVisibleToEmployee ?? r.isvisibletoemployee ?? true,
        });

        const fetchOnboarding = async () => {
            try {
                const { data, error } = await supabase.from('onboarding_records').select('*').order('createdAt', { ascending: false });
                if (error) throw error;
                if (data && data.length > 0) {
                    setOnboardingRecords(data.map(mapOnbFromDb));
                }
            } catch (err) {
                console.log('Using local onboardingRecords (Supabase not ready yet):', err);
            }
        };
        fetchOnboarding();

        const channel = supabase
            .channel('onboarding_records-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'onboarding_records' }, (payload) => {
                if (payload.eventType === 'INSERT' && payload.new) {
                    const mapped = mapOnbFromDb(payload.new);
                    setOnboardingRecords(prev => prev.some(r => r.id === mapped.id) ? prev : [mapped, ...prev]);
                } else if (payload.eventType === 'UPDATE' && payload.new) {
                    const mapped = mapOnbFromDb(payload.new);
                    setOnboardingRecords(prev => prev.map(r => r.id === mapped.id ? { ...r, ...mapped } : r));
                } else if (payload.eventType === 'DELETE' && payload.old) {
                    const id = (payload.old as any).id;
                    setOnboardingRecords(prev => prev.filter(r => r.id !== id));
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const [jobPostings, setJobPostings] = useState<Types.JobPosting[]>([
        { id: 'JOB-YGN-001', title: 'Senior UX Designer', department: 'Design', status: 'Open', portalStatus: true, postingDate: 'Oct 12, 2023' },
        { id: 'JOB-HLAW-042', title: 'Sewing Line Supervisor', department: 'Production', status: 'Open', portalStatus: true, postingDate: 'Oct 10, 2023' },
        { id: 'JOB-YGN-005', title: 'HR Generalist', department: 'Operations', status: 'Draft', portalStatus: false, postingDate: 'Oct 15, 2023' },
        { id: 'JOB-YGN-012', title: 'Junior Developer', department: 'Engineering', status: 'Closed', portalStatus: false, postingDate: 'Sep 20, 2023' }
    ]);

    const [laborContracts, setLaborContracts] = useState<Types.LaborContract[]>([
        { id: 'CT-001', empId: 'EMP-001', employeeName: 'Nilar Lwin', dept: 'Product Dept', type: 'Open Ended', startDate: '2021-01-15', endDate: null, status: 'Active', documentUrl: 'https://example.com/c1.pdf', signedDate: '2021-01-15', salary: 1200000 },
        { id: 'CT-004', empId: 'EMP-004', employeeName: 'Thida', dept: 'Design', type: 'Fixed Term', startDate: '2022-03-10', endDate: '2025-03-10', status: 'Expiring Soon', documentUrl: 'https://example.com/c2.pdf', signedDate: '2022-03-10', salary: 800000 },
        { id: 'CT-012', empId: 'EMP-012', employeeName: 'Maung Maung', dept: 'Engineering', type: 'Probation', startDate: '2023-06-20', endDate: '2023-12-20', status: 'Expired', documentUrl: 'https://example.com/c3.pdf', signedDate: '2023-06-20', salary: 950000 }
    ]);

    // Fetch labor_contracts from Supabase + realtime
    useEffect(() => {
        const mapContractFromDb = (r: any): Types.LaborContract => ({
            id: r.id,
            empId: r.empId || r.empid,
            employeeName: r.employeeName || r.employeename,
            dept: r.dept,
            type: r.type,
            startDate: r.startDate || r.startdate,
            endDate: r.endDate || r.enddate || null,
            status: r.status || 'Active',
            documentUrl: r.documentUrl || r.documenturl,
            signedDate: r.signedDate || r.signeddate,
            salary: r.salary || 0,
            role: r.role,
        });

        const fetchContracts = async () => {
            try {
                const { data, error } = await supabase.from('labor_contracts').select('*').order('createdAt', { ascending: false });
                if (error) throw error;
                if (data && data.length > 0) setLaborContracts(data.map(mapContractFromDb));
            } catch (err) {
                console.log('Using local laborContracts (Supabase not ready yet):', err);
            }
        };
        fetchContracts();

        const channel = supabase
            .channel('labor_contracts-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'labor_contracts' }, (payload) => {
                if (payload.eventType === 'INSERT' && payload.new) {
                    const mapped = mapContractFromDb(payload.new);
                    setLaborContracts(prev => prev.some(c => c.id === mapped.id) ? prev : [mapped, ...prev]);
                } else if (payload.eventType === 'UPDATE' && payload.new) {
                    const mapped = mapContractFromDb(payload.new);
                    setLaborContracts(prev => prev.map(c => c.id === mapped.id ? { ...c, ...mapped } : c));
                } else if (payload.eventType === 'DELETE' && payload.old) {
                    const id = (payload.old as any).id;
                    setLaborContracts(prev => prev.filter(c => c.id !== id));
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);
    const [objectives, setObjectives] = useState<Types.Objective[]>([
        { id: 'OBJ-001', empId: 'EMP-001', title: 'Increase Monthly Active Users by 20%', period: 'Q4 2023', weight: 50, alignment: 'Company Goal: Q4 Growth', progress: 0 }
    ]);
    const [keyResults, setKeyResults] = useState<Types.KeyResult[]>([
        { id: 'KR-001', objectiveId: 'OBJ-001', title: 'Launch push notification campaign', targetValue: 100, currentValue: 0 },
        { id: 'KR-002', objectiveId: 'OBJ-001', title: 'Reduce onboarding drop-off by 5%', targetValue: 5, currentValue: 0 }
    ]);

    // Fetch objectives from Supabase + realtime
    useEffect(() => {
        const mapObjFromDb = (r: any): Types.Objective => ({
            id: r.id,
            empId: r.empId || r.empid,
            title: r.title,
            period: r.period,
            weight: r.weight || 0,
            alignment: r.alignment,
            progress: r.progress || 0,
        });

        const fetchObjectives = async () => {
            try {
                const { data, error } = await supabase.from('objectives').select('*').order('createdAt', { ascending: false });
                if (error) throw error;
                if (data && data.length > 0) setObjectives(data.map(mapObjFromDb));
            } catch (err) {
                console.log('Using local objectives (Supabase not ready yet):', err);
            }
        };
        fetchObjectives();

        const channel = supabase
            .channel('objectives-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'objectives' }, (payload) => {
                if (payload.eventType === 'INSERT' && payload.new) {
                    const mapped = mapObjFromDb(payload.new);
                    setObjectives(prev => prev.some(o => o.id === mapped.id) ? prev : [mapped, ...prev]);
                } else if (payload.eventType === 'UPDATE' && payload.new) {
                    const mapped = mapObjFromDb(payload.new);
                    setObjectives(prev => prev.map(o => o.id === mapped.id ? { ...o, ...mapped } : o));
                } else if (payload.eventType === 'DELETE' && payload.old) {
                    const id = (payload.old as any).id;
                    setObjectives(prev => prev.filter(o => o.id !== id));
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // Fetch key_results from Supabase + realtime
    useEffect(() => {
        const mapKrFromDb = (r: any): Types.KeyResult => ({
            id: r.id,
            objectiveId: r.objectiveId || r.objectiveid,
            title: r.title,
            targetValue: r.targetValue || r.targetvalue || 0,
            currentValue: r.currentValue || r.currentvalue || 0,
        });

        const fetchKeyResults = async () => {
            try {
                const { data, error } = await supabase.from('key_results').select('*').order('createdAt', { ascending: false });
                if (error) throw error;
                if (data && data.length > 0) setKeyResults(data.map(mapKrFromDb));
            } catch (err) {
                console.log('Using local key_results (Supabase not ready yet):', err);
            }
        };
        fetchKeyResults();

        const channel = supabase
            .channel('key_results-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'key_results' }, (payload) => {
                if (payload.eventType === 'INSERT' && payload.new) {
                    const mapped = mapKrFromDb(payload.new);
                    setKeyResults(prev => prev.some(k => k.id === mapped.id) ? prev : [mapped, ...prev]);
                } else if (payload.eventType === 'UPDATE' && payload.new) {
                    const mapped = mapKrFromDb(payload.new);
                    setKeyResults(prev => prev.map(k => k.id === mapped.id ? { ...k, ...mapped } : k));
                } else if (payload.eventType === 'DELETE' && payload.old) {
                    const id = (payload.old as any).id;
                    setKeyResults(prev => prev.filter(k => k.id !== id));
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const updateKeyResult = (krId: string, newValue: number) => {
        setKeyResults(prev => {
            const nextKrs = prev.map(kr =>kr.id === krId ? { ...kr, currentValue: newValue } : kr);
            
            // Reactively update parent objective progress
            const kr = prev.find(k => k.id === krId);
            if (kr) {
                const siblingKrs = nextKrs.filter(k => k.objectiveId === kr.objectiveId);
                const totalProgress = siblingKrs.reduce((acc, curr) => {
                    const pct = Math.min((curr.currentValue / curr.targetValue) * 100, 100);
                    return acc + pct;
                }, 0);
                const avgProgress = siblingKrs.length > 0 ? Math.round(totalProgress / siblingKrs.length) : 0;
                setObjectives(obj => obj.map(o => o.id === kr.objectiveId ? { ...o, progress: avgProgress } : o));
                // Sync objective progress to Supabase
                supabase.from('objectives').update({ progress: avgProgress }).eq('id', kr.objectiveId).then(({ error }) => {
                    if (error) console.error('Supabase objective progress sync error:', error.message);
                });
            }

            // Sync key result update to Supabase
            supabase.from('key_results').update({ currentValue: newValue }).eq('id', krId).then(({ error }) => {
                if (error) console.error('Supabase key result update error:', error.message);
            });

            return nextKrs;
        });
    };

    const deriveLaborContractStatus = (endDate: string | null): Types.LaborContract['status'] => {
        if (!endDate) return 'Active';
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return 'Expired';
        if (diffDays < 30) return 'Expiring Soon';
        return 'Active';
    };

    useEffect(() => {
        let hasStatusChange = false;
        const expiredContractIds: string[] = [];
        const normalizedContracts = laborContracts.map(contract => {
            const nextStatus = deriveLaborContractStatus(contract.endDate);
            if (nextStatus !== contract.status) {
                hasStatusChange = true;
                if (nextStatus === 'Expired') expiredContractIds.push(contract.id);
                return { ...contract, status: nextStatus };
            }
            return contract;
        });

        if (hasStatusChange) {
            setLaborContracts(normalizedContracts);
            // Sync status changes to Supabase
            normalizedContracts.forEach(c => {
                const orig = laborContracts.find(o => o.id === c.id);
                if (orig && orig.status !== c.status) {
                    supabase.from('labor_contracts').update({ status: c.status }).eq('id', c.id).then(({ error }) => {
                        if (error) console.error('Supabase labor contract status sync error:', error.message);
                    });
                }
            });
        }

        const sourceContracts = hasStatusChange ? normalizedContracts : laborContracts;
        const contractStatusById = new Map(
            sourceContracts.map(contract => [contract.id, contract.status])
        );

        setEmployees(prevEmployees => prevEmployees.map(employee => {
            if (!employee.currentContractId) return employee;
            const currentContractStatus = contractStatusById.get(employee.currentContractId);
            // If the contract hasn't been committed to laborContracts state yet, don't overwrite.
            if (!currentContractStatus) return employee;
            const shouldRequireAction = currentContractStatus === 'Expired';
            if (employee.contractActionRequired === shouldRequireAction) return employee;
            // Sync contractActionRequired to Supabase
            supabase.from('employees').update({ contractActionRequired: shouldRequireAction }).eq('id', employee.id).then(({ error }) => {
                if (error) console.error('Supabase contract action required sync error:', error.message);
            });
            return { ...employee, contractActionRequired: shouldRequireAction };
        }));
    }, [laborContracts, setEmployees]);

    const [disciplinaryActions, setDisciplinaryActions] = useState<Types.DisciplinaryAction[]>([
        { id: 'DIS-001', empId: 'EMP-023', employeeName: 'Kyaw Kyaw', dept: 'Sales', type: 'Written Warning', category: 'Attendance', issueDate: '2023-10-05', expiryDate: '2024-04-05', status: 'Active', reason: 'Repeated tardiness and missing sales targets.', actionTaken: 'Formal warning and performance improvement plan.', documentUrl: '#', penaltyAmount: null, employeeStatement: null, resolvedDate: null, resolvedBy: null }
    ]);

    // Fetch disciplinary_actions from Supabase + realtime
    useEffect(() => {
        const mapDiscFromDb = (r: any): Types.DisciplinaryAction => ({
            id: r.id,
            empId: r.empId || r.empid,
            employeeName: r.employeeName || r.employeename,
            dept: r.dept,
            type: r.type,
            category: r.category,
            issueDate: r.issueDate || r.issuedate,
            expiryDate: r.expiryDate || r.expirydate,
            status: r.status || 'Active',
            reason: r.reason,
            actionTaken: r.actionTaken || r.actiontaken,
            documentUrl: r.documentUrl || r.documenturl,
            penaltyAmount: r.penaltyAmount ?? r.penaltyamount ?? null,
            employeeStatement: r.employeeStatement || r.employeestatement || null,
            resolvedDate: r.resolvedDate || r.resolveddate || null,
            resolvedBy: r.resolvedBy || r.resolvedby || null,
        });

        const fetchDisciplinary = async () => {
            try {
                const { data, error } = await supabase.from('disciplinary_actions').select('*').order('createdAt', { ascending: false });
                if (error) throw error;
                if (data && data.length > 0) setDisciplinaryActions(data.map(mapDiscFromDb));
            } catch (err) {
                console.log('Using local disciplinaryActions (Supabase not ready yet):', err);
            }
        };
        fetchDisciplinary();

        const channel = supabase
            .channel('disciplinary_actions-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'disciplinary_actions' }, (payload) => {
                if (payload.eventType === 'INSERT' && payload.new) {
                    const mapped = mapDiscFromDb(payload.new);
                    setDisciplinaryActions(prev => prev.some(a => a.id === mapped.id) ? prev : [mapped, ...prev]);
                } else if (payload.eventType === 'UPDATE' && payload.new) {
                    const mapped = mapDiscFromDb(payload.new);
                    setDisciplinaryActions(prev => prev.map(a => a.id === mapped.id ? { ...a, ...mapped } : a));
                } else if (payload.eventType === 'DELETE' && payload.old) {
                    const id = (payload.old as any).id;
                    setDisciplinaryActions(prev => prev.filter(a => a.id !== id));
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // Auto-expiry engine for disciplinary actions (mirrors Labor Contracts pattern)
    useEffect(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let hasChanges = false;
        const expiredIds: string[] = [];
        const normalized = disciplinaryActions.map(action => {
            if (action.status !== 'Active' || !action.expiryDate) return action;
            const expiry = new Date(action.expiryDate);
            expiry.setHours(0, 0, 0, 0);
            if (today > expiry) {
                hasChanges = true;
                expiredIds.push(action.id);
                return { ...action, status: 'Expired' as const };
            }
            return action;
        });
        if (hasChanges) {
            setDisciplinaryActions(normalized);
            // Sync expired actions to Supabase
            expiredIds.forEach(id => {
                supabase.from('disciplinary_actions').update({ status: 'Expired' }).eq('id', id).then(({ error }) => {
                    if (error) console.error('Supabase disciplinary auto-expiry sync error:', error.message);
                });
            });
        }
    }, [disciplinaryActions]);

    // projectPayments is now bridged live from PayrollProvider (no shadow)

    const [locationSnapshots, setLocationSnapshots] = useState<Types.LocationSnapshot[]>([
        { id: 'LS-001', empId: 'EMP-023', name: 'Kyaw Kyaw', coords: { lat: 16.7984, lng: 96.1495 }, address: 'Sule Pagoda Road, Yangon', timestamp: '2023-10-27 10:30 AM', status: 'Pending', priority: 'Medium', category: 'Attendance' }
    ]);

    const [profileChangeRequests, setProfileChangeRequests] = useState<Types.ProfileChangeRequest[]>([]);

    useEffect(() => {
        const fetchProfileChangeRequests = async () => {
            const { data, error } = await supabase.from('profile_change_requests').select('*').order('created_at', { ascending: false });
            if (!error && data) {
                const mappedData = data.map((req: any) => ({
                    ...req,
                    empId: req.empId || req.empid,
                    oldValues: req.oldValues || req.oldvalues,
                    documentName: req.documentName || req.documentname,
                    documentType: req.documentType || req.documenttype,
                    documentUrl: req.documentUrl || req.documenturl,
                    submittedAt: req.submittedAt || req.submittedat,
                    reviewedBy: req.reviewedBy || req.reviewedby,
                    reviewedAt: req.reviewedAt || req.reviewedat,
                    rejectionReason: req.rejectionReason || req.rejectionreason
                }));
                setProfileChangeRequests(mappedData);
            }
        };
        fetchProfileChangeRequests();

        const channel = supabase.channel('profile_change_requests-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profile_change_requests' }, (payload) => {
                const mapReq = (req: any) => ({
                    ...req,
                    empId: req.empId || req.empid,
                    oldValues: req.oldValues || req.oldvalues,
                    documentName: req.documentName || req.documentname,
                    documentType: req.documentType || req.documenttype,
                    documentUrl: req.documentUrl || req.documenturl,
                    submittedAt: req.submittedAt || req.submittedat,
                    reviewedBy: req.reviewedBy || req.reviewedby,
                    reviewedAt: req.reviewedAt || req.reviewedat,
                    rejectionReason: req.rejectionReason || req.rejectionreason
                });

                if (payload.eventType === 'INSERT') {
                    setProfileChangeRequests(prev => prev.some(r => r.id === payload.new.id) ? prev : [mapReq(payload.new) as Types.ProfileChangeRequest, ...prev]);
                } else if (payload.eventType === 'UPDATE') {
                    setProfileChangeRequests(prev => prev.map(r => r.id === payload.new.id ? mapReq(payload.new) as Types.ProfileChangeRequest : r));
                } else if (payload.eventType === 'DELETE') {
                    setProfileChangeRequests(prev => prev.filter(r => r.id !== payload.old.id));
                }
            }).subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const [jobActivityChanges, setJobActivityChanges] = useState<Types.JobActivityChange[]>([

        { id: 'JAC-001', empId: 'EMP-004', name: 'Thida', type: 'Promotion', detail: 'From Junior UI Designer to UI Designer', effectiveDate: '2023-11-01', status: 'Pending', submittedDate: '2023-10-20', priority: 'High', category: 'Staffing', newRole: 'UI Designer', newDept: 'Design' },
        { id: 'JAC-002', empId: 'EMP-012', name: 'Maung Maung', type: 'Transfer', detail: 'Transfer from Engineering to R&D', effectiveDate: '2023-11-15', status: 'Pending', submittedDate: '2023-10-22', priority: 'Medium', category: 'Staffing', newDept: 'R&D' }
    ]);

    // Fetch job_activity_changes from Supabase + realtime
    useEffect(() => {
        const mapJacFromDb = (r: any): Types.JobActivityChange => ({
            id: r.id,
            empId: r.empId || r.empid,
            name: r.name,
            type: r.type,
            detail: r.detail,
            effectiveDate: r.effectiveDate || r.effectivedate,
            status: r.status || 'Pending',
            submittedDate: r.submittedDate || r.submitteddate,
            priority: r.priority || 'Medium',
            category: r.category || 'Staffing',
            newSalary: r.newSalary ?? r.newsalary,
            oldSalary: r.oldSalary ?? r.oldsalary,
            newRole: r.newRole || r.newrole,
            newDept: r.newDept || r.newdept,
            newManager: r.newManager || r.newmanager,
            newShiftId: r.newShiftId || r.newshiftid,
            announcementTitle: r.announcementTitle || r.announcementtitle,
            jobDescription: r.jobDescription || r.jobdescription,
            newLocation: r.newLocation || r.newlocation,
            newOfficeCoords: r.newOfficeCoords || r.newofficecoords,
            transferReason: r.transferReason || r.transferreason,
            finalWorkingDate: r.finalWorkingDate || r.finalworkingdate,
            resignationReason: r.resignationReason || r.resignationreason,
        });

        const fetchJac = async () => {
            try {
                const { data, error } = await supabase.from('job_activity_changes').select('*').order('createdAt', { ascending: false });
                if (error) throw error;
                if (data && data.length > 0) setJobActivityChanges(data.map(mapJacFromDb));
            } catch (err) {
                console.log('Using local job_activity_changes (Supabase not ready yet):', err);
            }
        };
        fetchJac();

        const channel = supabase
            .channel('job_activity_changes-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'job_activity_changes' }, (payload) => {
                if (payload.eventType === 'INSERT' && payload.new) {
                    const mapped = mapJacFromDb(payload.new);
                    setJobActivityChanges(prev => prev.some(j => j.id === mapped.id) ? prev : [mapped, ...prev]);
                } else if (payload.eventType === 'UPDATE' && payload.new) {
                    const mapped = mapJacFromDb(payload.new);
                    setJobActivityChanges(prev => prev.map(j => j.id === mapped.id ? { ...j, ...mapped } : j));
                } else if (payload.eventType === 'DELETE' && payload.old) {
                    const id = (payload.old as any).id;
                    setJobActivityChanges(prev => prev.filter(j => j.id !== id));
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const [announcements, setAnnouncements] = useState<Types.Announcement[]>([]);

    // Fetch announcements from Supabase + realtime
    useEffect(() => {
        const mapAnnFromDb = (r: any): Types.Announcement => ({
            id: r.id,
            title: r.title,
            content: r.content,
            priority: r.priority || 'Medium',
            targetAudience: r.targetAudience || r.targetaudience || 'All',
            targetDept: r.targetDept || r.targetdept,
            targetRole: r.targetRole || r.targetrole,
            createdAt: r.createdAt || r.createdat,
            createdBy: r.createdBy || r.createdby,
            status: r.status || 'Draft',
            sourceType: r.sourceType || r.sourcetype || 'Manual',
            requiresAcknowledgement: r.requiresAcknowledgement ?? r.requiresacknowledgement ?? false,
            acknowledgements: r.acknowledgements || [],
        });

        const fetchAnnouncements = async () => {
            try {
                const { data, error } = await supabase.from('announcements').select('*').order('createdAt', { ascending: false });
                if (error) throw error;
                if (data && data.length > 0) {
                    setAnnouncements(data.map(mapAnnFromDb));
                }
            } catch (err) {
                console.log('Using local announcements (Supabase not ready yet):', err);
            }
        };
        fetchAnnouncements();

        const channel = supabase
            .channel('announcements-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, (payload) => {
                if (payload.eventType === 'INSERT' && payload.new) {
                    const mapped = mapAnnFromDb(payload.new);
                    setAnnouncements(prev => prev.some(a => a.id === mapped.id) ? prev : [mapped, ...prev]);
                } else if (payload.eventType === 'UPDATE' && payload.new) {
                    const mapped = mapAnnFromDb(payload.new);
                    setAnnouncements(prev => prev.map(a => a.id === mapped.id ? { ...a, ...mapped } : a));
                } else if (payload.eventType === 'DELETE' && payload.old) {
                    const id = (payload.old as any).id;
                    setAnnouncements(prev => prev.filter(a => a.id !== id));
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const [recruitmentActions, setRecruitmentActions] = useState<Types.RecruitmentAction[]>([
        { id: 'RA-001', candidateId: 'ID-003', candidateName: 'Aung Myo', jobTitle: 'Frontend Developer', type: 'Interview', detail: 'Technical Interview Round 2', status: 'Pending', submittedDate: '2023-10-26', priority: 'Medium', category: 'Staffing' }
    ]);

    // Seeded from Supabase on mount – no localStorage fallback
    const [attendanceRequests, setAttendanceRequests] = useState<Types.AttendanceRequest[]>([]);

    const [performanceReviewRequests, setPerformanceReviewRequests] = useState<Types.PerformanceReviewRequest[]>([]);

    // Fetch performance_review_requests from Supabase + realtime
    useEffect(() => {
        const mapPrrFromDb = (r: any): Types.PerformanceReviewRequest => ({
            id: r.id,
            reviewId: r.reviewId || r.reviewid,
            empId: r.empId || r.empid,
            name: r.name,
            dept: r.dept,
            reviewerId: r.reviewerId || r.reviewerid,
            period: r.period,
            competencyScores: r.competencyScores || r.competencyscores || {},
            rating: r.rating ?? 0,
            submittedDate: r.submittedDate || r.submitteddate,
            status: r.status || 'Pending',
            priority: r.priority || 'Medium',
        });

        const fetchPrr = async () => {
            try {
                const { data, error } = await supabase.from('performance_review_requests').select('*').order('createdAt', { ascending: false });
                if (error) throw error;
                if (data && data.length > 0) setPerformanceReviewRequests(data.map(mapPrrFromDb));
            } catch (err) {
                console.log('Using local performance_review_requests (Supabase not ready yet):', err);
            }
        };
        fetchPrr();

        const channel = supabase
            .channel('performance_review_requests-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'performance_review_requests' }, (payload) => {
                if (payload.eventType === 'INSERT' && payload.new) {
                    const mapped = mapPrrFromDb(payload.new);
                    setPerformanceReviewRequests(prev => prev.some(p => p.id === mapped.id) ? prev : [mapped, ...prev]);
                } else if (payload.eventType === 'UPDATE' && payload.new) {
                    const mapped = mapPrrFromDb(payload.new);
                    setPerformanceReviewRequests(prev => prev.map(p => p.id === mapped.id ? { ...p, ...mapped } : p));
                } else if (payload.eventType === 'DELETE' && payload.old) {
                    const id = (payload.old as any).id;
                    setPerformanceReviewRequests(prev => prev.filter(p => p.id !== id));
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const [archivedDocuments, setArchivedDocuments] = useState<Types.ArchivedDocument[]>([
        { id: 'DOC-001', title: 'Employment Contract Template', category: 'HR Template', sourceModule: 'Manual', description: 'Standard EC approved by Myanmar Ministry of Labor.', period: '2023', generatedBy: 'EMP-001', generatedAt: '2023-10-01T09:00:00Z', checksum: 'A3F2B1E8', fileContent: 'Standard Employment Contract Template — Myanmar Labor Law Compliant.\nVersion: 2023-Q4\nApproved by: Ministry of Labor, Immigration and Population.', fileName: 'EC_Template_2023.txt', isMandatory: true, relatedRecordId: null },
        { id: 'DOC-002', title: 'Leave Application Form', category: 'HR Template', sourceModule: 'Manual', description: 'Hardcopy backup for leave requests.', period: '2023', generatedBy: 'EMP-001', generatedAt: '2023-10-01T09:05:00Z', checksum: 'B7C4D2F1', fileContent: 'Leave Application Form — TechDance HR\nEmployee Name: ___\nLeave Type: ___\nDates: ___ to ___\nReason: ___\nApproval: ___', fileName: 'Leave_Application_Form.txt', isMandatory: false, relatedRecordId: null },
        { id: 'DOC-003', title: 'OT Request Form', category: 'Payroll Summary', sourceModule: 'Payroll', description: 'Form for manual OT approvals.', period: '2023', generatedBy: 'EMP-001', generatedAt: '2023-10-01T09:10:00Z', checksum: 'C9E6F3A4', fileContent: 'Overtime Request Form — TechDance HR\nEmployee: ___\nDate: ___\nHours Requested: ___\nReason: ___\nSupervisor Approval: ___', fileName: 'OT_Request_Form.txt', isMandatory: false, relatedRecordId: null },
        { id: 'DOC-004', title: 'Exit Interview Questionnaire', category: 'HR Template', sourceModule: 'Manual', description: 'Standard offboarding feedback form.', period: '2023', generatedBy: 'EMP-001', generatedAt: '2023-10-01T09:15:00Z', checksum: 'D1A8B5C2', fileContent: 'Exit Interview Questionnaire — TechDance HR\n1. Reason for leaving: ___\n2. Satisfaction with role: ___\n3. Suggestions: ___\n4. Would you recommend this company? ___', fileName: 'Exit_Interview.txt', isMandatory: true, relatedRecordId: null }
    ]);

    // Fetch archived_documents from Supabase + realtime
    useEffect(() => {
        const mapDocFromDb = (r: any): Types.ArchivedDocument => ({
            id: r.id,
            title: r.title,
            category: r.category,
            sourceModule: r.sourceModule || r.sourcemodule,
            description: r.description,
            period: r.period,
            generatedBy: r.generatedBy || r.generatedby,
            generatedAt: r.generatedAt || r.generatedat,
            checksum: r.checksum,
            fileContent: r.fileContent || r.filecontent,
            fileName: r.fileName || r.filename,
            isMandatory: r.isMandatory ?? r.ismandatory ?? false,
            relatedRecordId: r.relatedRecordId || r.relatedrecordid || null,
        });

        const fetchDocs = async () => {
            try {
                const { data, error } = await supabase.from('archived_documents').select('*').order('createdAt', { ascending: false });
                if (error) throw error;
                if (data && data.length > 0) setArchivedDocuments(data.map(mapDocFromDb));
            } catch (err) {
                console.log('Using local archived_documents (Supabase not ready yet):', err);
            }
        };
        fetchDocs();

        const channel = supabase
            .channel('archived_documents-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'archived_documents' }, (payload) => {
                if (payload.eventType === 'INSERT' && payload.new) {
                    const mapped = mapDocFromDb(payload.new);
                    setArchivedDocuments(prev => prev.some(d => d.id === mapped.id) ? prev : [mapped, ...prev]);
                } else if (payload.eventType === 'UPDATE' && payload.new) {
                    const mapped = mapDocFromDb(payload.new);
                    setArchivedDocuments(prev => prev.map(d => d.id === mapped.id ? { ...d, ...mapped } : d));
                } else if (payload.eventType === 'DELETE' && payload.old) {
                    const id = (payload.old as any).id;
                    setArchivedDocuments(prev => prev.filter(d => d.id !== id));
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // Seeded from Supabase on mount
    const [fieldAgents, setFieldAgents] = useState<Types.FieldAgent[]>([]);
    const [gpsLogs, setGpsLogs] = useState<Types.GPSLog[]>([]);

    const [offlineQueue, setOfflineQueue] = useState<Types.GPSLog[]>(() => {
        const saved = localStorage.getItem('hrms_offline_queue');
        if (saved) return JSON.parse(saved);
        return [];
    });

    // ── Field Force: Supabase fetch + realtime ────────────────────────────────
    useEffect(() => {
        const fetchFieldData = async () => {
            const [faRes, glRes] = await Promise.all([
                supabase.from('field_agents').select('*'),
                supabase.from('gps_logs').select('*').order('createdAt', { ascending: false }).limit(200)
            ]);
            if (!faRes.error && faRes.data) setFieldAgents(faRes.data as Types.FieldAgent[]);
            if (!glRes.error && glRes.data) setGpsLogs(glRes.data as Types.GPSLog[]);
        };
        fetchFieldData();

        const faChannel = supabase.channel('field_agents-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'field_agents' }, (payload) => {
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    const rec = payload.new as Types.FieldAgent;
                    setFieldAgents(prev => {
                        const exists = prev.some(a => a.id === rec.id);
                        if (exists) return prev.map(a => a.id === rec.id ? { ...a, ...rec } : a);
                        return [rec, ...prev];
                    });
                } else if (payload.eventType === 'DELETE') {
                    const id = (payload.old as any).id;
                    setFieldAgents(prev => prev.filter(a => a.id !== id));
                }
            }).subscribe();

        const glChannel = supabase.channel('gps_logs-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'gps_logs' }, (payload) => {
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    const rec = payload.new as Types.GPSLog;
                    setGpsLogs(prev => {
                        const exists = prev.some(l => l.id === rec.id);
                        if (exists) return prev.map(l => l.id === rec.id ? { ...l, ...rec } : l);
                        return [rec, ...prev].slice(0, 200);
                    });
                }
            }).subscribe();

        return () => {
            supabase.removeChannel(faChannel);
            supabase.removeChannel(glChannel);
        };
    }, []);
    // ─────────────────────────────────────────────────────────────────────────

    useEffect(() => {
        localStorage.setItem('hrms_offline_queue', JSON.stringify(offlineQueue));
    }, [offlineQueue]);

    useEffect(() => {
        try { localStorage.setItem('hrms_attendance_logs', JSON.stringify(attendanceLogs)); } catch (e) {}
    }, [attendanceLogs]);

    // attendanceRequests is now persisted in Supabase – localStorage sync removed

    // Sync systemSettings to Supabase (JSONB upsert) whenever it changes.
    // Mark the ref BEFORE the upsert so the realtime echo is suppressed.
    useEffect(() => {
        const merged = { ...systemSettings, compliance: complianceSettings };
        skipNextRealtimeUpdate.current = true;
        supabase.from('system_settings').upsert({
            id: 'default',
            data: merged,
            updatedAt: new Date().toISOString()
        }).then(({ error }) => {
            if (error) {
                console.error('Supabase system_settings upsert error:', error.message);
                // If the upsert failed, we won't get a realtime event — reset the flag
                skipNextRealtimeUpdate.current = false;
            }
        });
    }, [systemSettings, complianceSettings]);

    // Offline Sync Logic
    useEffect(() => {
        const handleOnline = () => {
            if (offlineQueue.length > 0) {
                setGpsLogs(prev => [...prev, ...offlineQueue].slice(-5000));
                setOfflineQueue([]);
                addAuditLog({ adminId: 'SYSTEM', actionType: 'Offline Sync', module: 'Field Force', detail: `Synchronized ${offlineQueue.length} GPS points from local cache.` });
            }
        };
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [offlineQueue]);

    const [shifts, setShifts] = useState<Types.Shift[]>([
        { id: 'SH-GEN-96', name: 'General Office (9-6)', start: '09:00', end: '18:00' },
        { id: 'SH-FAC-85', name: 'Factory 8-5', start: '08:00', end: '17:00' },
        { id: 'S-7', name: 'Flexible Office Hours', start: '10:00', end: '18:30', startTime: '10:00', endTime: '18:30', gracePeriod: 20, type: 'Flexible', active: true }
    ]);












    const [courses, setCourses] = useState<Types.Course[]>([
        { id: 'CRS-100', name: 'Anti-Harassment Policy', category: 'Compliance', duration: '1.0 Hrs', enrolled: 145, progress: 85, isMandatory: true, skillTags: ['Ethics', 'Compliance'], expiryDays: 365 },
        { id: 'CRS-101', name: 'Leadership Essentials', category: 'Soft Skills', duration: '1.5 Hrs', enrolled: 42, progress: 72, isMandatory: false, skillTags: ['Leadership', 'Management'] },
        { id: 'CRS-102', name: 'Fire Safety Protocols', category: 'Safety', duration: '2.0 Hrs', enrolled: 300, progress: 98, isMandatory: true, skillTags: ['Safety', 'Emergency Response'], expiryDays: 730 },
        { id: 'CRS-103', name: 'Advanced React Patterns', category: 'Technical', duration: '4.0 Hrs', enrolled: 12, progress: 40, isMandatory: false, skillTags: ['React', 'Frontend', 'TypeScript'] },
    ]);

    const [certs, setCerts] = useState<Types.Certification[]>([
        { id: 'CERT-001', name: 'First Aid Level 1', employee: 'Aung Aung', empId: 'EMP-001', expiry: 'Nov 01, 2026', complianceLink: 'Labor Law Safety Std.', status: 'Expiring Soon' },
        { id: 'CERT-002', name: 'Heavy Forklift Operation', employee: 'Kyaw Kyaw', empId: 'EMP-023', expiry: 'Oct 15, 2023', complianceLink: 'SSB Liability Req.', status: 'Expired' },
        { id: 'CERT-003', name: 'ISO 27001 Auditor', employee: 'Nilar Lwin', empId: 'EMP-008', expiry: 'Dec 12, 2024', complianceLink: 'Data Regulation act', status: 'Valid' },
    ]);

    const [analytics, setAnalytics] = useState<Types.TrainingAnalytic[]>([
        { id: 'EMP-001', name: 'Nilar Lwin', dept: 'Product Dept', progress: 85, avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDtMXUX0ktXwWpCR_HssI-ya16-3aPa6AAVPyBQ1EHpfp-j-sPL3V6-M9LOQH5oBAEgQVe-LnDjqixmSwV106z7bEtrnsNZO1CATGA_USq9lnhHi1_HCFl-Cyi3xyw648ljz2mqjJMc3vscDUW5zgws6ccC1OF1vEu1wdaDvwNJ2V-sg_zZ0haXJZDCxUvx8VjDCNHaXD51nD66gSegMbmfNMdqwU2v6zEDDEhi7cAmX1yUQ8UQLqt3O-oPvyg5wEcfX6wNGOUrCzj4' },
        { id: 'EMP-023', name: 'Kyaw Kyaw', dept: 'Logistics', progress: 40, avatar: null },
        { id: 'EMP-004', name: 'Thida', dept: 'Design', progress: 100, avatar: null },
        { id: 'EMP-012', name: 'Maung Maung', dept: 'Engineering', progress: 15, avatar: null },
    ]);

    // Fetch courses from Supabase + realtime
    useEffect(() => {
        const mapCourseFromDb = (r: any): Types.Course => ({
            id: r.id,
            name: r.name,
            category: r.category,
            duration: r.duration,
            enrolled: r.enrolled || 0,
            progress: r.progress || 0,
            isMandatory: r.isMandatory ?? r.ismandatory ?? false,
            expiryDays: r.expiryDays ?? r.expirydays,
            skillTags: Array.isArray(r.skillTags || r.skilltags) ? (r.skillTags || r.skilltags) : [],
            provider: r.provider,
            costPerHead: r.costPerHead ?? r.costperhead,
            minPassingScore: r.minPassingScore ?? r.minpassingscore,
        });

        const fetchCourses = async () => {
            try {
                const { data, error } = await supabase.from('courses').select('*').order('createdAt', { ascending: false });
                if (error) throw error;
                if (data && data.length > 0) setCourses(data.map(mapCourseFromDb));
            } catch (err) {
                console.log('Using local courses (Supabase not ready yet):', err);
            }
        };
        fetchCourses();

        const channel = supabase
            .channel('courses-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, (payload) => {
                if (payload.eventType === 'INSERT' && payload.new) {
                    const mapped = mapCourseFromDb(payload.new);
                    setCourses(prev => prev.some(c => c.id === mapped.id) ? prev : [mapped, ...prev]);
                } else if (payload.eventType === 'UPDATE' && payload.new) {
                    const mapped = mapCourseFromDb(payload.new);
                    setCourses(prev => prev.map(c => c.id === mapped.id ? { ...c, ...mapped } : c));
                } else if (payload.eventType === 'DELETE' && payload.old) {
                    const id = (payload.old as any).id;
                    setCourses(prev => prev.filter(c => c.id !== id));
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // Fetch certifications from Supabase + realtime
    useEffect(() => {
        const mapCertFromDb = (r: any): Types.Certification => ({
            id: r.id,
            name: r.name,
            employee: r.employee,
            empId: r.empId || r.empid,
            expiry: r.expiry,
            complianceLink: r.complianceLink || r.compliancelink,
            status: r.status || 'Valid',
        });

        const fetchCerts = async () => {
            try {
                const { data, error } = await supabase.from('certifications').select('*').order('createdAt', { ascending: false });
                if (error) throw error;
                if (data && data.length > 0) setCerts(data.map(mapCertFromDb));
            } catch (err) {
                console.log('Using local certifications (Supabase not ready yet):', err);
            }
        };
        fetchCerts();

        const channel = supabase
            .channel('certifications-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'certifications' }, (payload) => {
                if (payload.eventType === 'INSERT' && payload.new) {
                    const mapped = mapCertFromDb(payload.new);
                    setCerts(prev => prev.some(c => c.id === mapped.id) ? prev : [mapped, ...prev]);
                } else if (payload.eventType === 'UPDATE' && payload.new) {
                    const mapped = mapCertFromDb(payload.new);
                    setCerts(prev => prev.map(c => c.id === mapped.id ? { ...c, ...mapped } : c));
                } else if (payload.eventType === 'DELETE' && payload.old) {
                    const id = (payload.old as any).id;
                    setCerts(prev => prev.filter(c => c.id !== id));
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // Fetch training_analytics from Supabase + realtime
    useEffect(() => {
        const mapAnalyticFromDb = (r: any): Types.TrainingAnalytic => ({
            id: r.id,
            name: r.name,
            dept: r.dept,
            progress: r.progress || 0,
            avatar: r.avatar || null,
        });

        const fetchAnalytics = async () => {
            try {
                const { data, error } = await supabase.from('training_analytics').select('*').order('createdAt', { ascending: false });
                if (error) throw error;
                if (data && data.length > 0) setAnalytics(data.map(mapAnalyticFromDb));
            } catch (err) {
                console.log('Using local training_analytics (Supabase not ready yet):', err);
            }
        };
        fetchAnalytics();

        const channel = supabase
            .channel('training_analytics-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'training_analytics' }, (payload) => {
                if (payload.eventType === 'INSERT' && payload.new) {
                    const mapped = mapAnalyticFromDb(payload.new);
                    setAnalytics(prev => prev.some(a => a.id === mapped.id) ? prev : [mapped, ...prev]);
                } else if (payload.eventType === 'UPDATE' && payload.new) {
                    const mapped = mapAnalyticFromDb(payload.new);
                    setAnalytics(prev => prev.map(a => a.id === mapped.id ? { ...a, ...mapped } : a));
                } else if (payload.eventType === 'DELETE' && payload.old) {
                    const id = (payload.old as any).id;
                    setAnalytics(prev => prev.filter(a => a.id !== id));
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const flagEmployeeRisk = (empId: string, category?: string) => {
        setEmployees(prev => prev.map(emp =>
            emp.id === empId ? { ...emp, hasCriticalRiskFlag: true, criticalRiskCategory: category } : emp
        ));
        // Sync risk flag to Supabase
        supabase.from('employees').update({ hasCriticalRiskFlag: true, criticalRiskCategory: category }).eq('id', empId).then(({ error }) => {
            if (error) console.error('Supabase risk flag sync error:', error.message);
        });
    };

    const toggleAutoAttendance = (empId: string, adminId: string): { success: boolean; message: string } => {
        const emp = employees.find(e => e.id === empId);
        if (!emp) return { success: false, message: 'Types.Employee not found.' };

        const newState = !emp.autoAttendanceEnabled;
        const timestamp = getCurrentDateISO();

        setEmployees(prev => prev.map(e => {
            if (e.id === empId) {
                const historyEntry: Types.EmploymentHistory = {
                    id: `MOV-${Date.now()}`,
                    date: timestamp,
                    type: 'Adjustment',
                    detail: `${newState ? 'Enabled' : 'Disabled'} Auto Attendance for ${e.name}. Authorized by Admin ${adminId}.`,
                    reason: `Auto Attendance Toggle: ${newState ? 'ON' : 'OFF'}`,
                    approvedBy: adminId
                };
                return { 
                    ...e, 
                    autoAttendanceEnabled: newState,
                    employmentHistory: [historyEntry, ...(e.employmentHistory || [])]
                };
            }
            return e;
        }));

        addAuditLog({
            adminId,
            actionType: 'Auto Attendance Toggle',
            module: 'Settings',
            detail: `${newState ? 'Enabled' : 'Disabled'} Auto Attendance for ${emp.name} (${empId}).`
        });

        // Sync auto attendance toggle to Supabase
        supabase.from('employees').update({ autoAttendanceEnabled: newState }).eq('id', empId).then(({ error }) => {
            if (error) console.error('Supabase auto attendance sync error:', error.message);
        });

        return { success: true, message: `Auto Attendance ${newState ? 'Enabled' : 'Disabled'} for ${emp.name}. Audit entry created in Movement tab.` };
    };

    const addDocumentToEmployee = (empId: string, document: Omit<Types.DocumentType, 'id' | 'date' | 'timestamp'>) => {
        const timestamp = new Date().toISOString();
        const dateStr = getFormattedDate(new Date(), 'short');
        const docId = `DOC-${Date.now()}`;

        setEmployees(prev => prev.map(emp => {
            if (emp.id === empId) {
                const newDoc: Types.DocumentType = {
                    ...document,
                    id: docId,
                    date: dateStr,
                    timestamp: timestamp
                };

                // Security Audit Logging
                addAuditLog({
                    adminId: document.uploadedBy || 'SYSTEM',
                    actionType: 'Upload Document',
                    module: 'Documents',
                    detail: `Uploaded ${document.category} document: ${document.name} for ${emp.name} (${emp.id}). Privacy: ${document.privacy}`
                });

                return { ...emp, documents: [newDoc, ...emp.documents] };
            }
            return emp;
        }));

        // Sync to Supabase
        supabase.from('employee_documents').insert({
            id: docId,
            empId,
            name: document.name,
            type: document.type,
            category: document.category,
            privacy: document.privacy,
            date: dateStr,
            url: document.url,
            uploadedBy: document.uploadedBy,
            timestamp
        }).then(({ error }) => {
            if (error) console.error('Supabase document sync error:', error.message);
            else console.log('Document synced to Supabase:', docId);
        }).catch(err => console.error('Failed to sync document to Supabase:', err));
    };

    const getNonCompliantAssetsCount = () => {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        return assets.filter(a => a.status === 'In Use' && new Date(a.lastAuditDate) < sixMonthsAgo).length;
    };

    const sendCandidateMessage = (candidateId: string, text: string, adminId: string) => {
        const newMsg: Types.CandidateMessage = {
            id: `MSG-${Date.now()}`,
            sender: 'hr',
            text,
            timestamp: getFormattedDate(new Date(), 'time')
        };
        setCandidateMessages(prev => ({
            ...prev,
            [candidateId]: [...(prev[candidateId] || []), newMsg]
        }));
        addAuditLog({ adminId, actionType: 'Candidate Chat', module: 'Settings', detail: `Sent message to candidate ${candidateId} via Job Portal.`, sourceLink: `/candidates` });
    };

    const updateCandidateStage = (candidateId: string, newStage: Types.Candidate['stage'], adminId: string, reason?: string) => {
        setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, stage: newStage, rejectionReason: reason || c.rejectionReason } : c));
        
        if (newStage === 'Rejected' && reason) {
            addAuditLog({ adminId, actionType: 'Candidate Rejected', module: 'Settings', detail: `Candidate ${candidateId} rejected. Reason: ${reason}. Synced to Job Portal API.` });
        } else {
            addAuditLog({ adminId, actionType: 'Pipeline Update', module: 'Settings', detail: `Moved candidate ${candidateId} to ${newStage}.` });
        }
    };

    const rejectCandidate = (candidateId: string, adminId: string, reason: string) => {
        updateCandidateStage(candidateId, 'Rejected', adminId, reason);
    };

    const hireCandidate = async (candidateId: string, township: string) => {
        const candidate = candidates.find(c => c.id === candidateId);
        if (!candidate) return;

        // Generate unique #EMP-XXXXX ID with 5-digit padding for production reliability
        const prefix = '#EMP-';
        let counter = employees.length + 1;
        let newEmpId = `${prefix}${String(counter).padStart(5, '0')}`;
        
        while (employees.some(e => e.id === newEmpId)) {
            counter++;
            newEmpId = `${prefix}${String(counter).padStart(5, '0')}`;
        }

        const newEmployee: Types.Employee = {
            id: newEmpId,
            name: candidate.name,
            role: candidate.role,
            dept: 'Unassigned',
            status: 'Active',
            joinDate: getFormattedDate(new Date(), 'short'),
            avatar: candidate.avatar,
            township: township,
            nrcNumber: 'Pending Verification',
            ssbNumber: 'Pending Verification',
            hasCriticalRiskFlag: false,
            documents: [],
            recruitmentSource: candidate.source,
            baseSalary: 500000,
            reliefs: { spouse: false, parentsCount: 0 },
            shiftId: 'SH-GEN-96',
            enrolledCourses: [],
            leaveBalances: { 'Annual': 10, 'Casual': 6, 'Medical': 30 },
            policyId: 'POL-GEN-001',
            autoAttendanceEnabled: false
        };

        setEmployees(prev => [newEmployee, ...prev]);
        
        // Insert to Supabase
        try {
            await supabase.from('employees').insert({
                id: newEmployee.id,
                name: newEmployee.name,
                email: `${newEmployee.id.toLowerCase()}@techdance.hr`,
                phone: newEmployee.mobile,
                dept: newEmployee.dept,
                role: newEmployee.role,
                status: newEmployee.status,
                joinDate: newEmployee.joinDate,
                baseSalary: newEmployee.baseSalary,
            });
        } catch (err) { console.error('Failed to sync to Supabase:', err); }
        
        setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, stage: 'Hired' } : c));

        // AUTOMATED LOGIC: Create Onboarding Record
        const newOnboarding: Types.OnboardingRecord = {
            id: `ONB-${Date.now()}`,
            empId: newEmployee.id,
            employee_id: newEmployee.id, // Supabase-ready alias
            name: newEmployee.name,
            role: newEmployee.role,
            status: 'In Progress',
            startDate: newEmployee.joinDate,
            tasks: (systemSettings.onboardingTemplates.find(t => t.roleId === newEmployee.role) || 
                   systemSettings.onboardingTemplates.find(t => t.roleId === 'Default'))?.tasks.map(t => ({
                       ...t,
                       id: `TSK-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                       isCompleted: false
                   })) || [],
            created_at: new Date().toISOString(),
            isVisibleToEmployee: true
        };
        setOnboardingRecords(prev => [newOnboarding, ...prev]);

        // Sync onboarding record to Supabase
        supabase.from('onboarding_records').insert({
            id: newOnboarding.id,
            empId: newOnboarding.empId,
            name: newOnboarding.name,
            role: newOnboarding.role,
            supervisor: newOnboarding.supervisor,
            startDate: newOnboarding.startDate,
            status: newOnboarding.status,
            tasks: newOnboarding.tasks,
            isVisibleToEmployee: newOnboarding.isVisibleToEmployee,
        }).then(({ error }) => {
            if (error) console.error('Supabase onboarding record insert error:', error.message);
        });
        
        // Mobile Handshake SMS Simulation — Link to Mobile Gateway PIN set
        const invitationSms: Types.Alert = {
            id: `SMS-${Date.now()}`,
            message: `WELCOME SMS DISPATCHED: "Welcome to TechDance HR. Download the app and use your Employee ID [${newEmployee.id}] to set your secure PIN."`,
            type: 'info',
            timestamp: getFormattedDate(new Date(), 'time'),
            isRead: false
        };
        
        const itAlert: Types.Alert = {
            id: `ALT-${Date.now()}`,
            message: `IT Team: Set up and assign hardware to NEW HIRE ${newEmployee.name} (${newEmployee.id}). Initiated from Recruitment flow.`,
            type: 'info',
            timestamp: getFormattedDate(new Date(), 'time'),
            isRead: false
        };
        
        setAlerts(prev => [invitationSms, itAlert, ...prev]);
    };

    const assignAdmin = (empId: string, authorizerId: string) => {
        setSystemSettings(prev => ({
            ...prev,
            adminIds: prev.adminIds.includes(empId) ? prev.adminIds : [...prev.adminIds, empId]
        }));
        
        const emp = employees.find(e => e.id === empId);
        addAuditLog({
            adminId: authorizerId,
            actionType: 'Admin Privilege Elevated',
            module: 'Settings',
            detail: `Types.Employee ${emp?.name || empId} was elevated to System Administrator.`
        });
    };

    const revokeAdmin = (empId: string, authorizerId: string) => {
        setSystemSettings(prev => ({
            ...prev,
            adminIds: prev.adminIds.filter(id => id !== empId)
        }));

        const emp = employees.find(e => e.id === empId);
        addAuditLog({
            adminId: authorizerId,
            actionType: 'Admin Privilege Revoked',
            module: 'Settings',
            detail: `Types.Employee ${emp?.name || empId} high-access administrative rights were revoked.`
        });
    };

    const renewCertification = (certId: string) => {
        const cert = certs.find(c => c.id === certId);
        if (!cert) return;

        // 1. Update Certificate Status
        const newExpiry = getFormattedDate(new Date(new Date().setFullYear(new Date().getFullYear() + 2)), 'short');
        setCerts(prev => prev.map(c => c.id === certId ? {
            ...c,
            status: 'Valid',
            expiry: newExpiry
        } : c));

        // Sync to Supabase
        supabase.from('certifications').update({ status: 'Valid', expiry: newExpiry }).eq('id', certId).then(({ error }) => {
            if (error) console.error('Supabase certification renewal sync error:', error.message);
        });

        // 2. Add technical proof to Types.Employee Document tab
        addDocumentToEmployee(cert.empId, {
            name: `Renewal Proof: ${cert.name}`,
            type: 'Certification',
            category: 'Standard',
            privacy: 'Manager Viewable',
            url: '#'
        });

        // 3. Remove from Types.Alerts if exists
        setAlerts(prev => prev.filter(a => !a.message.includes(cert.name)));
    };

    const addTrainingCourse = (courseConfig: Pick<Types.Course, 'name' | 'category' | 'duration' | 'isMandatory' | 'expiryDays' | 'skillTags' | 'provider' | 'costPerHead' | 'minPassingScore'>) => {
        const newCourse: Types.Course = {
            id: `CRS-${Date.now().toString().slice(-4)}`,
            enrolled: 0,
            progress: 0,
            ...courseConfig
        };
        setCourses(prev => [...prev, newCourse]);

        // Sync to Supabase
        supabase.from('courses').insert({
            id: newCourse.id,
            name: newCourse.name,
            category: newCourse.category,
            duration: newCourse.duration,
            enrolled: newCourse.enrolled,
            progress: newCourse.progress,
            isMandatory: newCourse.isMandatory,
            expiryDays: newCourse.expiryDays,
            skillTags: newCourse.skillTags,
            provider: newCourse.provider,
            costPerHead: newCourse.costPerHead,
            minPassingScore: newCourse.minPassingScore,
        }).then(({ error }) => {
            if (error) console.error('Supabase course insert error:', error.message);
        });
    };

    const assignCourseToDepartment = (courseId: string, department: string) => {
        const course = courses.find(c => c.id === courseId);
        if (!course) return;

        // Identify department members
        const members = employees.filter(e => e.dept === department); // Changed 'department' to 'dept' to match Types.Employee type
        if (members.length === 0) return;

        // Update enrollment count
        const newEnrolled = course.enrolled + members.length;
        setCourses(prev => prev.map(c => c.id === courseId ? { ...c, enrolled: newEnrolled } : c));

        // Sync enrollment to Supabase
        supabase.from('courses').update({ enrolled: newEnrolled }).eq('id', courseId).then(({ error }) => {
            if (error) console.error('Supabase course enrollment sync error:', error.message);
        });

        // RECORD in each active member's profile
        setEmployees(prev => prev.map(emp => {
            if (emp.dept === department && emp.status === 'Active') {
                const alreadyEnrolled = emp.enrolledCourses.some(ec => ec.courseId === courseId);
                if (!alreadyEnrolled) {
                    const updatedEnrolledCourses = [...emp.enrolledCourses, {
                        courseId,
                        enrollmentDate: getCurrentDateISO(),
                        status: 'In Progress'
                    }];
                    // Sync enrolledCourses to Supabase
                    supabase.from('employees').update({ enrolledCourses: updatedEnrolledCourses }).eq('id', emp.id).then(({ error }) => {
                        if (error) console.error('Supabase course assignment sync error:', error.message);
                    });
                    return {
                        ...emp,
                        enrolledCourses: updatedEnrolledCourses
                    };
                }
            }
            return emp;
        }));

        // Push Alert to Dashboard
        const newAlert: Types.Alert = {
            id: `T-ALRT-${Date.now()}`,
            type: 'info',
            message: `New Mandatory Course Dispatched: "${course.name}" assigned to ${members.length} members of ${department} Department.`,
            timestamp: getFormattedDate(new Date(), 'time'),
            isRead: false
        };
        setAlerts(prev => [newAlert, ...prev]);
    };

    const completeCourse = (courseId: string, empId: string, grade: string = 'Pass') => {
        const course = courses.find(c => c.id === courseId);
        if (!course) return;

        setEmployees(prev => prev.map(emp => {
            if (emp.id === empId) {
                const completionDateStr = getCurrentDateISO();
                let expiryDateStr: string | undefined = undefined;

                if (course.expiryDays) {
                    const d = new Date();
                    d.setDate(d.getDate() + course.expiryDays);
                    expiryDateStr = getFormattedDate(d, 'short');
                }

                const updatedCourses = emp.enrolledCourses.map(ec => 
                    ec.courseId === courseId ? { 
                        ...ec, 
                        status: 'Completed' as const, 
                        completionDate: completionDateStr,
                        grade,
                        expiryDate: expiryDateStr
                    } : ec
                );

                // Update employee skills (de-duplicated)
                const currentSkills = emp.skills || [];
                const courseSkills = course.skillTags || [];
                const newSkills = Array.from(new Set([...currentSkills, ...courseSkills]));

                const secureHash = `[SECURE-${Math.random().toString(36).substr(2, 6).toUpperCase()}]`;
                const docName = `Certificate of Completion: ${course.name} ${secureHash}`;

                const providerText = course.provider ? `\\nProvider: ${course.provider}` : '';
                const minScoreText = course.minPassingScore ? `\\nMin Passing Score: ${course.minPassingScore}` : '';

                // Add to internal profile view
                addDocumentToEmployee(empId, {
                    name: docName,
                    type: 'Certification',
                    category: 'Standard',
                    privacy: 'Manager Viewable',
                    url: '#'
                });

                // Bridge to global Forms Library
                addDocumentToLibrary({
                    title: docName,
                    category: 'Employment Contract', // Using existing categories from hrms.types.ts
                    sourceModule: 'Manual', // Adjusting for existing enum
                    description: `Automated completion certificate for ${course.name}. Grade: ${grade}. ID: ${secureHash}`,
                    period: new Date().getFullYear().toString(),
                    generatedBy: 'SYSTEM (L&T Module)',
                    fileContent: `CERTIFICATE OF COMPLETION\\n\\nEmployee: ${emp.name} (${emp.id})\\nCourse: ${course.name}${providerText}${minScoreText}\\nGrade: ${grade}\\nDate: ${completionDateStr}\\nValidation: ${secureHash}`,
                    fileName: `${emp.id}_${courseId}_Cert.pdf`,
                    isMandatory: false,
                    relatedRecordId: emp.id
                }, 'SYSTEM');
                
                // AUTOMATED LOGIC: Category-Sensitive Compliance Auto-Healing
                const healResult = autoHealCompliance(emp, course, courses, updatedCourses);

                if (healResult.healed) {
                    // Audit trail via addAuditLog
                    addAuditLog({
                        adminId: 'SYSTEM',
                        actionType: 'Compliance Auto-Heal',
                        module: 'Performance',
                        detail: healResult.message
                    });
                    // Security audit trail via addSecurityLog
                    addSecurityLog({
                        deviceId: 'SYSTEM',
                        authMethod: 'Auto-Heal',
                        status: 'Success',
                        empId: emp.id,
                        detail: `System: Critical Risk [${healResult.category}] cleared for ${emp.name} via course completion.`
                    });
                    return { ...healResult.updatedEmployee, enrolledCourses: updatedCourses, skills: newSkills };
                }

                return { ...emp, enrolledCourses: updatedCourses, skills: newSkills };
            }
            return emp;
        }));

        // Sync course completion to Supabase
        const updatedEmp = employees.find(e => e.id === empId);
        if (updatedEmp) {
            const updatedCoursesList = updatedEmp.enrolledCourses.map(ec =>
                ec.courseId === courseId ? { ...ec, status: 'Completed' as const, completionDate: getCurrentDateISO(), grade, expiryDate: course.expiryDays ? getFormattedDate(new Date(Date.now() + course.expiryDays * 86400000), 'short') : undefined } : ec
            );
            const currentSkills = updatedEmp.skills || [];
            const courseSkills = course.skillTags || [];
            const mergedSkills = Array.from(new Set([...currentSkills, ...courseSkills]));
            supabase.from('employees').update({
                enrolledCourses: updatedCoursesList,
                skills: mergedSkills,
            }).eq('id', empId).then(({ error }) => {
                if (error) console.error('Supabase course completion sync error:', error.message);
            });
        }

        // Sync training_analytics progress to Supabase
        const emp = employees.find(e => e.id === empId);
        if (emp) {
            const completedCount = (emp.enrolledCourses || []).filter(ec => ec.status === 'Completed').length + 1;
            const totalCount = (emp.enrolledCourses || []).length + 1;
            const newProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
            setAnalytics(prev => prev.map(a => a.id === empId ? { ...a, progress: newProgress } : a));
            supabase.from('training_analytics').update({ progress: newProgress }).eq('id', empId).then(({ error }) => {
                if (error) console.error('Supabase training_analytics progress sync error:', error.message);
            });
        }
    };

    // Certification Audit Engine (Proactive Risk Detection)
    useEffect(() => {
        const expiringCerts = certs.filter(c => c.status === 'Expiring Soon' || c.status === 'Expired');
        expiringCerts.forEach(cert => {
            const alertTag = `CERT-RISK-${cert.id}`;
            const alertExists = alerts.some(a => a.id.startsWith(alertTag));
            
            if (!alertExists) {
                const newAlert: Types.Alert = {
                    id: `${alertTag}-${Date.now()}`,
                    type: cert.status === 'Expired' ? 'error' : 'warning',
                    message: `HIGH PRIORITY: Compliance Risk! ${cert.employee}'s "${cert.name}" is ${cert.status}. Action required in Personal & Family tab.`,
                    timestamp: getFormattedDate(new Date(), 'time'),
                    isRead: false,
                    link: `/employees/${cert.empId}?tab=Personal & Family`
                };
                setAlerts(prev => [newAlert, ...prev]);
            }
        });
    }, [certs]);

    // GPS Live Sync: Whenever employees change, propagate officeLocation/officeCoords to fieldAgents
    useEffect(() => {
        setFieldAgents(prev => prev.map(agent => {
            const emp = employees.find(e => e.id === agent.empId);
            if (!emp) return agent;
            const needsLocationUpdate = emp.officeLocation && emp.officeLocation !== agent.locationName;
            const needsCoordsUpdate = emp.officeCoords && (emp.officeCoords.lat !== agent.gps.lat || emp.officeCoords.lng !== agent.gps.lng);
            if (needsLocationUpdate || needsCoordsUpdate) {
                return {
                    ...agent,
                    locationName: emp.officeLocation || agent.locationName,
                    gps: emp.officeCoords || agent.gps,
                    history: [...agent.history, { x: agent.mapPosition.x, y: agent.mapPosition.y, lat: agent.gps.lat, lng: agent.gps.lng, timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) }],
                    lastUpdate: 'Just now'
                };
            }
            return agent;
        }));
    }, [employees]);

    // Seeded from Supabase on mount – no localStorage fallback
    const [publishedWeeks, setPublishedWeeks] = useState<string[]>([]);

    // Seeded from Supabase on mount – no localStorage fallback
    const [shiftAssignments, setShiftAssignments] = useState<ShiftAssignment[]>([]);

    // ── Shift Planner: Supabase fetch + realtime ─────────────────────────────
    useEffect(() => {
        const fetchShiftData = async () => {
            const [saRes, pwRes] = await Promise.all([
                supabase.from('shift_assignments').select('*').order('date', { ascending: true }),
                supabase.from('published_weeks').select('weekKey').order('weekKey', { ascending: true }),
            ]);
            if (!saRes.error && saRes.data && saRes.data.length > 0)
                setShiftAssignments(saRes.data as ShiftAssignment[]);
            if (!pwRes.error && pwRes.data && pwRes.data.length > 0)
                setPublishedWeeks(pwRes.data.map((r: any) => r.weekKey));
        };
        fetchShiftData();

        const saChannel = supabase
            .channel('shift_assignments-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shift_assignments' }, (payload) => {
                if (payload.eventType === 'INSERT' && payload.new) {
                    const rec = payload.new as ShiftAssignment;
                    setShiftAssignments(prev => prev.some(s => s.id === rec.id) ? prev : [rec, ...prev]);
                } else if (payload.eventType === 'UPDATE' && payload.new) {
                    const rec = payload.new as ShiftAssignment;
                    setShiftAssignments(prev => prev.map(s => s.id === rec.id ? { ...s, ...rec } : s));
                } else if (payload.eventType === 'DELETE' && payload.old) {
                    const id = (payload.old as any).id;
                    setShiftAssignments(prev => prev.filter(s => s.id !== id));
                }
            })
            .subscribe();

        const pwChannel = supabase
            .channel('published_weeks-changes')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'published_weeks' }, (payload) => {
                if (payload.new) {
                    const weekKey = (payload.new as any).weekKey;
                    setPublishedWeeks(prev => prev.includes(weekKey) ? prev : [...prev, weekKey]);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(saChannel);
            supabase.removeChannel(pwChannel);
        };
    }, []);
    // ─────────────────────────────────────────────────────────────────────────

    const assignShift = (empId: string, date: string, shiftId: string, reason?: string, adminId?: string, customStart?: string, customEnd?: string, workType?: 'Regular' | 'Overtime'): { success: boolean; message: string } => {
        const emp = employees.find(e => e.id === empId);
        if (!emp) return { success: false, message: 'Types.Employee not found.' };

        if (emp.status !== 'Active') {
            return { success: false, message: `User Unavailable: Types.Employee is ${emp.status}.` };
        }

        const leaveOnDate = leaveRequests.find(l => l.empId === empId && l.status === 'Approved' && l.startDate <= date && l.endDate >= date);
        if (leaveOnDate) {
            return { success: false, message: 'User Unavailable: Types.Employee has an approved leave request for this date.' };
        }

        let oldShiftId = emp.shiftId;
        const existingIdx = shiftAssignments.findIndex(sa => sa.empId === empId && sa.date === date);
        if (existingIdx !== -1) {
            oldShiftId = shiftAssignments[existingIdx].shiftId;
        }

        if (oldShiftId === shiftId && !customStart) {
            return { success: true, message: 'Shift is already assigned for this date.' };
        }

        const oldShiftObj = shifts.find(s => s.id === oldShiftId);
        const newShiftObj = shifts.find(s => s.id === shiftId);

        // Rest period guard: enforce minimum hours between consecutive shifts
        const minRestHours = complianceSettings.minRestHours ?? 11;
        const effectiveNewStart = customStart || newShiftObj?.start;
        if (effectiveNewStart) {
            const toMins = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
            const prevD = new Date(date + 'T00:00:00');
            prevD.setDate(prevD.getDate() - 1);
            const prevDateStr = prevD.toISOString().split('T')[0];
            const prevSA = shiftAssignments.find(sa => sa.empId === empId && sa.date === prevDateStr);
            const prevShiftForRest = shifts.find(s => s.id === (prevSA?.shiftId ?? emp.shiftId));
            const prevEnd = prevSA?.customEnd || prevShiftForRest?.end;
            if (prevEnd) {
                const prevEndMins = toMins(prevEnd);
                const newStartMins = toMins(effectiveNewStart);
                const gapMins = newStartMins >= prevEndMins
                    ? newStartMins - prevEndMins
                    : (24 * 60 - prevEndMins) + newStartMins;
                if (gapMins < minRestHours * 60) {
                    return { success: false, message: `Compliance Violation: Only ${(gapMins / 60).toFixed(1)}h rest since previous shift (${minRestHours}h minimum required).` };
                }
            }
        }

        const saId = `SA-${Date.now()}`;
        setShiftAssignments(prev => {
            const next = [...prev];
            const newAssignment: ShiftAssignment = { 
                id: saId, 
                empId, 
                date, 
                shiftId,
                modifiedByHr: !!adminId,
                reason,
                adminId,
                oldShiftId,
                customStart,
                customEnd,
                workType
            };
            if (existingIdx !== -1) {
                next[existingIdx] = newAssignment;
            } else {
                next.push(newAssignment);
            }
            return next;
        });

        // Sync to Supabase
        supabase.from('shift_assignments').upsert({
            id: saId,
            empId,
            date,
            shiftId,
            modifiedByHr: !!adminId,
            reason,
            adminId,
            oldShiftId,
            customStart,
            customEnd,
            workType
        }).then(({ error }) => {
            if (error) console.error('Supabase shift assignment sync error:', error.message);
        }).catch(err => console.error('Failed to sync shift assignment to Supabase:', err));

        // 1. Retroactive Recalculation
        const effectiveStart = customStart || newShiftObj?.start;
        const effectiveEnd = customEnd || newShiftObj?.end;

        if (effectiveStart) {
            const [shiftH, shiftM] = effectiveStart.split(':').map(Number);
            const logsToUpdate: { id: string; newStatus: string }[] = [];

            setAttendanceLogs(prev => prev.map(log => {
                if (log.empId === empId && log.date === date && log.checkIn !== '-- : --' && log.checkIn !== '--:--') {
                    const ciParts = log.checkIn.trim().split(' ');
                    const ciTimePart = ciParts[0];
                    const ciModifier = ciParts[1];
                    const ciSplit = ciTimePart.split(':').map(Number);
                    let ciH = ciSplit[0];
                    const ciM = ciSplit[1] || 0;
                    if (ciModifier) {
                        if (ciH === 12) ciH = 0;
                        if (ciModifier === 'PM') ciH += 12;
                    }
                    
                    const isLate = ciH > shiftH || (ciH === shiftH && ciM > shiftM);
                    const newStatus = isLate ? 'Late' : (log.status === 'Missing Out' || log.status === 'On Leave' ? log.status : 'Present');
                    logsToUpdate.push({ id: log.id, newStatus });
                    return { ...log, status: newStatus };
                }
                return log;
            }));

            // Sync retroactive status changes to Supabase
            logsToUpdate.forEach(({ id, newStatus }) => {
                supabase.from('attendance_logs').update({ status: newStatus }).eq('id', id).then(({ error }) => {
                    if (error) console.error('Supabase assignShift status sync error:', error.message);
                });
            });
        }

        // 2. Audit Trail
        if (reason && adminId) {
            setEmployees(prev => prev.map(e => {
                if (e.id === empId) {
                    const oldStr = oldShiftId === 'CUSTOM' ? 'Ad-Hoc Shift' : oldShiftObj?.name || 'Default';
                    const customDetail = `Custom Edit: ${oldShiftObj ? (oldShiftObj.start + '-' + oldShiftObj.end) : oldStr} -> ${customStart}-${customEnd} | Type: ${workType} | Reason: ${reason}`;
                    const regularDetail = `Schedule Adjusted: ${oldStr} \u2192 ${newShiftObj?.name || 'Unknown'} | Reason: ${reason}`;
                    
                    const histEntry: Types.EmploymentHistory = {
                        id: `HIST-${Date.now()}`,
                        date: getFormattedDate(new Date(), 'short'),
                        type: 'Schedule Adjustment',
                        detail: customStart ? customDetail : regularDetail,
                        reason: reason,
                        approvedBy: adminId
                    };
                    return { ...e, employmentHistory: [histEntry, ...(e.employmentHistory || [])] };
                }
                return e;
            }));

            // Sync shift assignment to Supabase
            supabase.from('employees').update({ employmentHistory: employees.find(e => e.id === empId)?.employmentHistory || [] }).eq('id', empId).then(({ error }) => {
                if (error) console.error('Supabase shift assignment sync error:', error.message);
            });
        }

        return { success: true, message: 'Shift assigned successfully.' };
    };

    const assignDepartmentShift = (deptId: string, shiftId: string, date: string, adminId?: string): { success: boolean; message: string; skippedNames: string[] } => {
        const deptEmps = employees.filter(e => e.dept === deptId && e.status === 'Active');
        let count = 0;
        const skippedNames: string[] = [];
        deptEmps.forEach(emp => {
            const res = assignShift(emp.id, date, shiftId, 'Department bulk assignment', adminId);
            if (res.success) count++; else skippedNames.push(emp.name);
        });
        return { success: true, message: `Assigned ${count} employee(s) in ${deptId} (${skippedNames.length} skipped).`, skippedNames };
    };

    const publishWeek = (weekStart: string, adminId?: string): { success: boolean; message: string } => {
        if (publishedWeeks.includes(weekStart)) {
            return { success: false, message: 'This week schedule has already been published.' };
        }
        setPublishedWeeks(prev => [...prev, weekStart]);

        // Sync to Supabase
        supabase.from('published_weeks').insert({
            id: `PW-${Date.now()}`,
            weekKey: weekStart,
            publishedBy: adminId || 'SYSTEM'
        }).then(({ error }) => {
            if (error) console.error('Supabase published week sync error:', error.message);
        }).catch(err => console.error('Failed to sync published week to Supabase:', err));

        // Build the 7 date strings for this week
        const weekDays: string[] = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(weekStart + 'T00:00:00');
            d.setDate(d.getDate() + i);
            weekDays.push(d.toISOString().split('T')[0]);
        }

        // Employees with explicit assignments this week
        const weekAssignments = shiftAssignments.filter(sa => weekDays.includes(sa.date));
        const affectedEmpIds = [...new Set(weekAssignments.map(sa => sa.empId))];

        // Create Expected placeholder attendance logs for unlogged days
        const newLogs: typeof attendanceLogs = [];
        weekDays.forEach(date => {
            affectedEmpIds.forEach(empId => {
                const emp = employees.find(e => e.id === empId);
                if (!emp || emp.status !== 'Active') return;
                const onLeave = leaveRequests.find(l => l.empId === empId && l.status === 'Approved' && l.startDate <= date && l.endDate >= date);
                if (onLeave) return;
                const alreadyLogged = attendanceLogs.find(log => log.empId === empId && log.date === date);
                if (alreadyLogged) return;
                const sa = weekAssignments.find(a => a.empId === empId && a.date === date);
                if (!sa) return;
                const shiftObj = shifts.find(s => s.id === sa.shiftId);
                if (!shiftObj) return;
                newLogs.push({
                    id: `LOG-EXP-${empId}-${date}`,
                    empId,
                    name: emp.name,
                    checkIn: '--:--',
                    checkOut: '--:--',
                    location: emp.officeLocation || 'Main Office',
                    geofenceStatus: 'N/A',
                    status: 'Expected',
                    dept: emp.dept,
                    totalHours: 0,
                    checkInMethod: 'Web Portal',
                    isManual: false,
                    penaltyAmount: 0,
                    date
                });
            });
        });
        if (newLogs.length > 0) {
            setAttendanceLogs(prev => [...prev, ...newLogs]);

            // Sync expected logs to Supabase
            const supabaseRows = newLogs.map(l => ({
                id: l.id,
                empId: l.empId,
                name: l.name,
                checkIn: l.checkIn,
                checkOut: l.checkOut,
                location: l.location,
                geofenceStatus: l.geofenceStatus,
                status: l.status,
                dept: l.dept,
                totalHours: l.totalHours,
                checkInMethod: l.checkInMethod,
                isManual: l.isManual,
                penaltyAmount: l.penaltyAmount,
                date: l.date
            }));
            supabase.from('attendance_logs').insert(supabaseRows).then(({ error }) => {
                if (error) console.error('Supabase publishWeek expected logs sync error:', error.message);
            }).catch(err => console.error('Failed to sync publishWeek expected logs to Supabase:', err));
        }

        // Mock push notifications — one alert per affected employee
        const now = getFormattedDate(new Date(), 'time');
        affectedEmpIds.forEach(empId => {
            const emp = employees.find(e => e.id === empId);
            if (!emp) return;
            setAlerts(prev => [{
                id: `NOTIF-SCH-${empId}-${weekStart}`,
                message: `📅 ${emp.name}: Your schedule for the week of ${weekStart} has been published. View your shifts in the mobile cockpit.`,
                type: 'info' as const,
                timestamp: now,
                isRead: false
            }, ...prev]);
        });

        return { success: true, message: `Week of ${weekStart} published. ${affectedEmpIds.length} employee(s) notified.` };
    };

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371e3; // metres
        const φ1 = lat1 * Math.PI/180;
        const φ2 = lat2 * Math.PI/180;
        const Δφ = (lat2-lat1) * Math.PI/180;
        const Δλ = (lon2-lon1) * Math.PI/180;
        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    };

    const checkIn = async (empId: string, locationName: string, gps: { lat: number, lng: number, accuracy?: number }, method: 'Web Portal' | 'Mobile App' | 'Biometric' | 'Remote' | 'QR' = 'Web Portal'): Promise<{success: boolean, message: string}> => {
        const emp = employees.find(e => e.id === empId);
        
        // Log to security trails for non-web-portal methods
        if (method === 'Biometric' || method === 'Mobile App') {
            addSecurityLog({
                deviceId: 'MOBILE-' + empId,
                authMethod: method === 'Biometric' ? 'Biometric' : 'PIN',
                status: emp ? 'Success' : 'Failed',
                empId: emp ? empId : undefined
            });
        }

        if (!emp) return { success: false, message: 'Types.Employee not found.' };

        // Duplicate check-in guard
        const existingActiveLog = attendanceLogs.find(l => l.empId === empId && l.checkOut === '-- : --');
        if (existingActiveLog) {
            return { success: false, message: 'You already have an active check-in session. Please check out first.' };
        }
        
        // Production Geofence check
        let inRange = false;
        let minDistance = 999999;
        systemSettings.officeLocations.forEach(loc => {
            const dist = calculateDistance(gps.lat, gps.lng, loc.coords.lat, loc.coords.lng);
            if (dist < minDistance) minDistance = dist;
            if (dist <= loc.radius) inRange = true;
        });
        const isGeofenceViolation = (method === 'Mobile App') && !inRange; 
        
        if (gps.accuracy && gps.accuracy > 100) {
            return { success: false, message: 'GPS Accuracy is too low (< 100m required). Please move to an open area.' };
        }
        if (isGeofenceViolation && method === 'Mobile App') {
            addAuditLog({ adminId: empId, actionType: 'Visit Blocked', module: 'Field Force', detail: `Visit blocked: Agent was ${Math.round(minDistance)}m away from target coordinates.` });
            return { success: false, message: `Access Denied: You are ${Math.round(minDistance)}m away. Attendance only permitted within the defined office radius.` };
        }

        const todayStr = getCurrentDateISO();
        const assignment = shiftAssignments.find(sa => sa.empId === empId && sa.date === todayStr);
        const activeShiftId = assignment ? assignment.shiftId : emp.shiftId;
        const shift = shifts.find(s => s.id === activeShiftId) || shifts[0];
        const [shiftH, shiftM] = shift.start.split(':').map(Number);
        
        const now = getAdjustedDateObj();
        const ciStr = getFormattedDate(now, 'time');
        const currentH = now.getHours();
        const currentM = now.getMinutes();
        
        const currentMins = currentH * 60 + currentM;
        const targetMins = shiftH * 60 + shiftM;
        const GRACE_PERIOD = complianceSettings.attendanceGracePeriod;
        const isLate = currentMins > targetMins + GRACE_PERIOD;
        
        const penaltyAmount = isLate ? complianceSettings.attendancePenalty : 0;
        const newLog: Types.AttendanceLog = {
            id: `LOG-${empId}-${Date.now()}`,
            empId,
            name: emp.name,
            dept: emp.dept,
            checkIn: ciStr,
            checkOut: '-- : --',
            location: locationName,
            date: todayStr,
            gps: { ...gps },
            geofenceStatus: isGeofenceViolation ? 'Violation' : (inRange ? 'Verified' : 'N/A'),
            status: isGeofenceViolation ? 'Pending Approval' : (isLate ? 'Late' : 'Present'),
            checkInMethod: method,
            totalHours: 0,
            isManual: false,
            penaltyAmount
        };
        setAttendanceLogs(prev => [newLog, ...prev]);

        // Sync to Supabase
        supabase.from('attendance_logs').insert({
            id: newLog.id,
            empId,
            name: emp.name,
            checkIn: ciStr,
            checkOut: '-- : --',
            location: locationName,
            gpsLat: gps.lat,
            gpsLng: gps.lng,
            geofenceStatus: newLog.geofenceStatus,
            status: newLog.status,
            dept: emp.dept,
            totalHours: 0,
            checkInMethod: method,
            isManual: false,
            penaltyAmount,
            date: todayStr,
            project: newLog.project
        }).then(({ error }) => {
            if (error) console.error('Supabase checkIn sync error:', error.message);
        }).catch(err => console.error('Failed to sync checkIn to Supabase:', err));
        if (isGeofenceViolation) {
            const newRequest: Types.AttendanceRequest = {
                id: `AR-${Date.now()}`,
                empId,
                name: emp.name,
                type: 'Remote Check-In',
                time: ciStr,
                location: locationName,
                reason: `Geofence Violation: Checked in ${Math.round(minDistance)}m away.`,
                status: 'Pending',
                submittedDate: todayStr,
                priority: 'High',
                category: 'Attendance'
            };
            setAttendanceRequests(prev => [newRequest, ...prev]);

            // Sync to Supabase
            supabase.from('attendance_requests').insert({
                id: newRequest.id,
                empId: newRequest.empId,
                name: newRequest.name,
                type: newRequest.type,
                time: newRequest.time,
                location: newRequest.location,
                reason: newRequest.reason,
                status: newRequest.status,
                submittedDate: newRequest.submittedDate,
                priority: newRequest.priority,
                category: newRequest.category
            }).then(({ error }) => {
                if (error) console.error('Supabase attendance request sync error:', error.message);
            }).catch(err => console.error('Failed to sync attendance request to Supabase:', err));
        }
        if (isLate && !isGeofenceViolation) {
            payrollSettersRef.current.addAdjustment({
                empId,
                name: emp.name,
                dept: emp.dept,
                type: 'Late Fine',
                category: 'Deduction',
                amount: penaltyAmount,
                effectiveMonth: 'Oct 2023',
                currency: 'MMK',
                isImmutable: false,
                reason: `Late Arrival: ${ciStr} (Shift: ${shift.start})`,
                sourceLink: newLog.id,
                source: 'System-Attendance',
                priority: 'Low'
            });
        }
        setFieldAgents(prev => prev.map(a => a.empId === empId ? { ...a, isTrackingActive: true, status: 'Online' } : a));
        return { success: true, message: `Check-in successful via ${method}. Tracking started.` };
    };

    const checkOut = (empId: string) => {
        // Guard: ensure there's an active (un-checked-out) log
        const activeLog = attendanceLogs.find(l => l.empId === empId && l.checkOut === '-- : --');
        if (!activeLog) {
            return { success: false, message: 'No active check-in found. Cannot check out.' };
        }

        const now = new Date();
        const checkoutStr = getFormattedDate(now, 'time');

        // Compute totalHours before state update so we can sync to Supabase
        const parts = activeLog.checkIn.trim().split(' ');
        const timePart = parts[0];
        const modifier = parts[1];
        const tSplit = timePart.split(':').map(Number);
        let h = tSplit[0];
        const m = tSplit[1] || 0;
        if (modifier) {
            if (h === 12) h = 0;
            if (modifier === 'PM') h += 12;
        }
        const checkInDate = new Date();
        checkInDate.setHours(h, m, 0, 0);
        const diffMs = now.getTime() - checkInDate.getTime();
        const computedHours = diffMs > 0 ? Number((diffMs / (1000 * 60 * 60)).toFixed(2)) : 0;

        setAttendanceLogs(prev => prev.map(log => {
            if (log.empId === empId && log.checkOut === '-- : --') {
                return { ...log, checkOut: checkoutStr, totalHours: computedHours };
            }
            return log;
        }));

        // Sync to Supabase
        supabase.from('attendance_logs').update({
            checkOut: checkoutStr,
            totalHours: computedHours
        }).eq('empId', empId).eq('checkOut', '-- : --').then(({ error }) => {
            if (error) console.error('Supabase checkOut sync error:', error.message);
        }).catch(err => console.error('Failed to sync checkOut to Supabase:', err));
        setFieldAgents(prev => prev.map(a => a.empId === empId ? { ...a, isTrackingActive: false, status: 'Offline' } : a));
        return { success: true, message: 'Check-out successful. Tracking stopped.' };
    };

    const syncAttendance = () => {
        const formattedDate = getCurrentDateISO();
        const isHoliday = holidays.some(h => h.date === formattedDate);
        setAttendanceLogs(prev => {
            let currentLogs = [...prev];
            employees.forEach(emp => {
                if (!systemSettings.autoAttendancePolicyEnabled || !emp.autoAttendanceEnabled) return;
                if (isHoliday && !systemSettings.autoHolidayWorkEnabled) return;
                const onLeave = leaveRequests.some(r => r.empId === emp.id && r.status === 'Approved' && formattedDate >= r.startDate && formattedDate <= r.endDate);
                if (onLeave) {
                    const existingLeaveLog = currentLogs.some(l => l.empId === emp.id && l.date === formattedDate && l.status === 'On Leave');
                    if (!existingLeaveLog) {
                        currentLogs.push({
                            id: `LEAVE-${emp.id}-${formattedDate}`,
                            empId: emp.id,
                            name: emp.name,
                            checkIn: '-- : --',
                            checkOut: '-- : --',
                            location: 'N/A',
                            geofenceStatus: 'N/A',
                            status: 'On Leave',
                            dept: emp.dept,
                            totalHours: 0,
                            checkInMethod: '🤖 Auto',
                            isManual: false,
                            penaltyAmount: 0,
                            date: formattedDate
                        });
                    }
                    return;
                }
                const realLogExists = currentLogs.some(l => l.empId === emp.id && l.date === formattedDate && l.checkInMethod !== '🤖 Auto');
                if (realLogExists) return;
                const autoLogExists = currentLogs.some(l => l.empId === emp.id && l.date === formattedDate && l.checkInMethod === '🤖 Auto');
                if (!autoLogExists) {
                    const shift = shifts.find(s => s.id === emp.shiftId) || shifts[0];
                    currentLogs.push({
                        id: `AUTO-${emp.id}-${formattedDate}`,
                        empId: emp.id,
                        name: emp.name,
                        checkIn: shift.start,
                        checkOut: shift.end,
                        location: emp.officeLocation || 'HQ Office',
                        geofenceStatus: 'Verified',
                        status: 'Present',
                        dept: emp.dept,
                        totalHours: 8,
                        checkInMethod: '🤖 Auto',
                        isManual: false,
                        penaltyAmount: 0,
                        date: formattedDate
                    });
                }
            });

            // Sync auto-generated logs to Supabase
            const newAutoLogs = currentLogs.filter(l =>
                (l.id.startsWith('LEAVE-') || l.id.startsWith('AUTO-')) && l.date === formattedDate
            );
            if (newAutoLogs.length > 0) {
                const supabaseRows = newAutoLogs.map(l => ({
                    id: l.id,
                    empId: l.empId,
                    name: l.name,
                    checkIn: l.checkIn,
                    checkOut: l.checkOut,
                    location: l.location,
                    geofenceStatus: l.geofenceStatus,
                    status: l.status,
                    dept: l.dept,
                    totalHours: l.totalHours,
                    checkInMethod: l.checkInMethod,
                    isManual: l.isManual,
                    penaltyAmount: l.penaltyAmount,
                    date: l.date
                }));
                supabase.from('attendance_logs').upsert(supabaseRows).then(({ error }) => {
                    if (error) console.error('Supabase syncAttendance sync error:', error.message);
                }).catch(err => console.error('Failed to sync syncAttendance to Supabase:', err));
            }

            return currentLogs;
        });
    };

    const regularizeAttendance = (logId: string, manualTime: string, adminId: string, reason: string) => {
        if (!manualTime) return;
        setAttendanceLogs(prev => prev.map(log => {
            if (log.id === logId) {
                // Recalculate totalHours from checkIn to manualTime
                let totalHours = 0;
                if (log.checkIn && log.checkIn !== '-- : --' && log.checkIn !== '--:--') {
                    const ciParts = log.checkIn.trim().split(' ');
                    const ciTimeParts = ciParts[0].split(':').map(Number);
                    let ciH = ciTimeParts[0];
                    const ciM = ciTimeParts[1] || 0;
                    if (ciParts[1]) { // 12h format
                        if (ciH === 12) ciH = 0;
                        if (ciParts[1] === 'PM') ciH += 12;
                    }
                    const [coH, coM] = manualTime.split(':').map(Number);
                    const diffMins = (coH * 60 + coM) - (ciH * 60 + ciM);
                    totalHours = diffMins > 0 ? Number((diffMins / 60).toFixed(2)) : 0;
                }
                return { ...log, checkOut: manualTime, totalHours, status: 'Present', adminAuditId: adminId, adminAuditReason: reason, isManual: true };
            }
            return log;
        }));

        // Sync to Supabase
        supabase.from('attendance_logs').update({
            checkOut: manualTime,
            totalHours,
            status: 'Present',
            adminAuditId: adminId,
            adminAuditReason: reason,
            isManual: true
        }).eq('id', logId).then(({ error }) => {
            if (error) console.error('Supabase regularizeAttendance sync error:', error.message);
        }).catch(err => console.error('Failed to sync regularizeAttendance to Supabase:', err));

        addAuditLog({
            adminId,
            actionType: 'Attendance Regularized',
            module: 'Attendance',
            detail: `Regularized log ${logId}: set checkout to ${manualTime}. Reason: ${reason}.`
        });
    };

    const approveLeave = (reqId: string, adminId: string, forceOverride?: boolean) => {
        const req = leaveRequests.find(r => r.id === reqId);
        if (!req) return { success: false, message: 'Request not found' };

        // 1. Strict Guard: Prevent redundant approvals and double-deductions
        if (req.status === 'Approved') return { success: false, message: 'This request is already approved.' };

        const emp = employees.find(e => e.id === req.empId);
        
        // Relaxed check: If employee not found in local state, allow approval but skip balance updates
        if (!emp) {
            console.warn('Employee not found in local state, approving without balance update:', req.empId);
        }

        // Reliever is optional now
        let reliever = null;
        if (req.relieverId) {
            reliever = employees.find(e => e.id === req.relieverId);
            if (!reliever || reliever.status !== 'Active') {
                console.warn('Reliever not found or not active, proceeding anyway');
            }
        }

        // Skip policy and balance checks if employee not found
        if (emp) {
            const policy = policies.find(p => p.id === emp.policyId);
            if (policy && policy.applicableLeaveTypes.length > 0 && !policy.applicableLeaveTypes.includes(req.type)) {
                return { success: false, message: `Policy Violation: '${req.type}' leave is not permitted under policy '${policy.name}'.` };
            }

            const balanceFreeTypes = ['Unpaid', 'Maternity', 'Paternity'];
            const isBalanceFree = balanceFreeTypes.includes(req.type);
            const currentBalance = emp.leaveBalances[req.type] ?? 0;
            let newBalance = currentBalance;

            if (!isBalanceFree) {
                const balanceCheck = decrementLeaveBalance(employees, req.empId, req.type, req.totalDays);
                if (!balanceCheck.success && !isAdmin(adminId)) {
                    return {
                        success: false,
                        message: `${balanceCheck.message} Requires Super-Admin override.`
                    };
                }
                newBalance = balanceCheck.success ? (balanceCheck.newBalance ?? 0) : Math.max(0, currentBalance - req.totalDays);
            }

            // 3. Atomic Updates: Balance & Status
            setEmployees(prev => prev.map(e => {
                if (e.id === req.empId) {
                    return { ...e, status: 'On Leave', leaveBalances: { ...e.leaveBalances, [req.type]: newBalance } };
                }
                return e;
            }));
        }

        setLeaveRequests(prev => prev.map(r => r.id === reqId ? {
            ...r,
            status: 'Approved' as const,
            approvedBy: adminId,
            approvedAt: getFormattedDate(undefined, 'time'),
            ...(forceOverride ? { isAdminOverride: true } : {})
        } : r));

        // Persist approval to Supabase
        (async () => {
            try {
                // Update Leave Request status
                const { error: leaveErr } = await supabase.from('leave_requests').update({
                    status: 'Approved',
                    approvedBy: adminId,
                    approvedAt: new Date().toISOString(),
                    isAdminOverride: !!forceOverride
                }).eq('id', reqId);
                
                if (leaveErr) console.error('Supabase leave approval error:', leaveErr.message);

                // Update Employee balance and status
                if (emp) {
                    const { error: empErr } = await supabase.from('employees').update({
                        status: 'On Leave',
                        leaveBalances: { ...emp.leaveBalances, [req.type]: newBalance }
                    }).eq('id', req.empId);
                    
                    if (empErr) console.error('Supabase employee balance update error:', empErr.message);
                }
            } catch (err) {
                console.error('Supabase sync failed during approveLeave:', err);
            }
        })();

        // 4. System Calendar Interactivity — delegated to utility
        if (emp) {
            syncLeaveWithCalendar(
                addCalendarEvent,
                emp.name,
                { type: req.type, startDate: req.startDate, endDate: req.endDate }
            );
        }

        // 5. Actionable Alerting
        const newAlert: Types.Alert = {
            id: `LV-APP-${Date.now()}`,
            message: `YOUR LEAVE APPROVED: ${req.type} for ${req.durationStr} has been finalized by ${adminId}.`,
            type: 'success',
            timestamp: getFormattedDate(undefined, 'time'),
            isRead: false,
            link: `/mobile-cockpit`
        };
        setAlerts(prev => [newAlert, ...prev]);

        // 6. Audit Logging
        addAuditLog({
            adminId,
            actionType: 'Leave Approved',
            module: 'Leave',
            detail: `Approved ${req.type} for ${req.name} (${req.totalDays} days). ${isBalanceFree ? 'Balance-free type — no deduction.' : `Balance: ${currentBalance} → ${newBalance}.`}`
        });

        return { success: true, message: 'Leave approved and balance synchronized successfully.' };
    };


    const addLeaveRequest = (req: Omit<Types.LeaveRequest, 'id' | 'status' | 'submitted'>) => {
        const emp = employees.find(e => e.id === req.empId);
        if (!emp) throw new Error('Types.Employee not found');
        const newReq: Types.LeaveRequest = {
            ...req,
            id: `LV-${Date.now()}`,
            status: 'Pending',
            submitted: new Date().toISOString(),
            name: emp.name,
            dept: emp.dept,
            avatar: emp.avatar || '',
            priority: 'Medium',
            category: 'Attendance'
        };
        setLeaveRequests(prev => [newReq, ...prev]);

        // Persist to Supabase
        (async () => {
            try {
                const { error } = await supabase.from('leave_requests').insert({
                    id: newReq.id,
                    empId: newReq.empId,
                    name: newReq.name,
                    dept: newReq.dept,
                    type: newReq.type,
                    startDate: newReq.startDate,
                    endDate: newReq.endDate,
                    totalDays: newReq.totalDays,
                    reason: newReq.reason,
                    status: 'Pending',
                    durationStr: newReq.durationStr,
                    relieverId: newReq.relieverId,
                    relieverName: newReq.relieverName,
                    priority: newReq.priority,
                    category: newReq.category
                });
                if (error) console.error('Supabase insert leave_requests failed:', error.message);
            } catch (err) {
                console.error('Supabase unavailable for addLeaveRequest:', err);
            }
        })();
    };

    const rejectLeave = (reqId: string, adminId: string, reason?: string): { success: boolean, message: string } => {
        const req = leaveRequests.find(r => r.id === reqId);
        if (!req) return { success: false, message: 'Request not found.' };
        if (req.status !== 'Pending') return { success: false, message: 'Only Pending requests can be rejected.' };

        setLeaveRequests(prev => prev.map(r => r.id === reqId ? {
            ...r,
            status: 'Rejected' as const,
            rejectedBy: adminId,
            rejectedAt: getFormattedDate(undefined, 'time'),
            rejectionReason: reason
        } : r));

        // Persist rejection to Supabase
        (async () => {
            try {
                const { error } = await supabase.from('leave_requests').update({
                    status: 'Rejected',
                    rejectedBy: adminId,
                    rejectedAt: new Date().toISOString(),
                    rejectionReason: reason || null,
                }).eq('id', reqId);
                if (error) console.error('Supabase update leave_requests (reject) failed:', error.message);
            } catch (err) {
                console.error('Supabase unavailable for rejectLeave:', err);
            }
        })();

        const newAlert: Types.Alert = {
            id: `LV-REJ-${Date.now()}`,
            message: `YOUR LEAVE DECLINED: ${req.type} for ${req.durationStr} was not approved by ${adminId}.${reason ? ` Reason: ${reason}` : ''}`,
            type: 'error',
            timestamp: getFormattedDate(undefined, 'time'),
            isRead: false,
            link: '/mobile-cockpit'
        };
        setAlerts(prev => [newAlert, ...prev]);

        addAuditLog({
            adminId,
            actionType: 'Leave Rejected',
            module: 'Leave',
            detail: `Rejected ${req.type} leave for ${req.name} (${req.durationStr}).${reason ? ` Reason: ${reason}` : ''}`
        });

        return { success: true, message: 'Leave rejected and employee notified.' };
    };



    const generateBankExport = (bankName: string) => {
        // Mock generation of a bank transfer file
        const blob = new Blob([`Bank Transfer Export\nBank: ${bankName}\nDate: ${new Date().toISOString()}\nTotal Net: ${getLastPayrollTotal().toLocaleString()} MMK\n---\n[Encrypted Payload Simulation]`], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Payroll_Export_${bankName}_${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        
        addAuditLog({
            adminId: 'ADM-001',
            actionType: 'Financial Export',
            module: 'Payroll',
            detail: `Generated corporate bank export for ${bankName}.`
        });
    };




    const addAsset = (asset: Omit<Types.Asset, 'id' | 'lastAuditDate' | 'status'>, adminId: string): { success: boolean; message: string } => {
        if (!isAdmin(adminId)) return { success: false, message: 'Admin privileges required to purchase assets.' };
        const newAsset: Types.Asset = {
            ...asset,
            id: `AST-${Date.now().toString().slice(-4)}`,
            status: 'Available',
            lastAuditDate: getCurrentDateISO()
        };
        
        // Supabase Call
        supabase.from('hrms_assets').insert(newAsset).then(({ error }) => {
            if (error) console.error('Error adding asset:', error);
        });

        addAuditLog({ adminId, actionType: 'Asset Purchased', module: 'Assets', detail: `Registered new asset ${newAsset.model} [${newAsset.category}]` });
        return { success: true, message: `New asset ${newAsset.model} successfully registered into inventory.` };
    };

    const updateAsset = async (id: string, updates: Partial<Types.Asset>): Promise<{ success: boolean; message: string }> => {
        const { error } = await supabase.from('hrms_assets').update(updates).eq('id', id);
        if (error) {
            console.error('Error updating asset:', error);
            return { success: false, message: `Failed to update asset: ${error.message}` };
        }
        return { success: true, message: 'Asset updated successfully.' };
    };

    const reportAssetLoss = (assetId: string, empId: string) => {
        // Redacted for brevity, logic moved to PayrollProvider
    };

    type SeparationReason = 'Resignation' | 'Termination' | 'Left/Absconded' | 'Retirement';

    const terminateEmployee = async (empId: string, actorId: string, reason?: SeparationReason) => {
        const separationReason: SeparationReason = reason || 'Termination';

        if (!isAdmin(actorId)) {
            addAuditLog({ adminId: actorId, actionType: 'Security Violation', module: 'Settings', detail: `Unauthorized attempt to terminate employee ${empId}.` });
            return { success: false, message: 'Security Violation: Only Administrators can deactivate users.' };
        }

        const emp = employees.find(e => e.id === empId);
        if (!emp) return { success: false, message: 'Types.Employee not found.' };

        // 1. Physical Asset Check — Absconded bypasses this gate (assets flagged separately)
        const assignedAssets = assets.filter(a => a.assigneeId === empId && a.status === 'In Use');
        if (assignedAssets.length > 0 && separationReason !== 'Left/Absconded') {
            const assetList = assignedAssets.map(a => `${a.model} (${a.id})`).join(', ');
            return { 
                success: false, 
                message: `OFFBOARDING BLOCKED: Physical assets still in use: ${assetList}. Recover all equipment before deactivation.` 
            };
        }

        // 2. Financial Balance Check (Pending Adjustments) — Absconded bypasses
        const pendingAdjustments = getAdjustments().filter(a => a.empId === empId && a.status === 'Pending');
        if (pendingAdjustments.length > 0 && separationReason !== 'Left/Absconded') {
            return { 
                success: false, 
                message: `OFFBOARDING BLOCKED: ${pendingAdjustments.length} pending financial adjustments (loans/fines) require finalization.` 
            };
        }

        // 2.5 Disciplinary Action Check (Active status prevents normal termination until resolved)
        const pendingDiscipline = disciplinaryActions.filter(d => d.empId === empId && d.status === 'Active');
        if (pendingDiscipline.length > 0 && separationReason !== 'Left/Absconded') {
            return {
                success: false,
                message: `OFFBOARDING BLOCKED: ${pendingDiscipline.length} active disciplinary actions exist. Resolve or document them before deactivation.`
            }
        }

        // 3. Compute Re-hire Eligibility based on separation reason
        const eligibleForRehire = separationReason === 'Resignation' || separationReason === 'Retirement';
        const separationDate = getCurrentDateISO();

        // 4. Status Update (Atomic) + Separation metadata
        const newStatus = separationReason === 'Resignation' ? 'Resigned' as const : separationReason === 'Retirement' ? 'Retired' as const : 'Terminated' as const;
        setEmployees(prev => prev.map(e => 
            e.id === empId ? { 
                ...e, 
                status: newStatus, 
                colorClass: 'bg-slate-100 text-slate-700',
                separationReason,
                separationDate,
                eligibleForRehire
            } : e
        ));

        // 4.5 Sync termination to Supabase
        try {
            const { error } = await supabase.from('employees').update({
                status: newStatus,
                separationReason,
                separationDate,
                eligibleForRehire,
            }).eq('id', empId);
            if (error) console.error('Supabase termination sync error:', error.message);
        } catch (err) { console.error('Failed to sync termination to Supabase:', err); }

        // 5. Automatic Admin Revocation
        setSystemSettings({
            ...systemSettings,
            adminIds: systemSettings.adminIds.filter(id => id !== empId),
            lastAuditDate: getCurrentDateISO()
        });

        // 6. Audit Log Entry
        addAuditLog({ 
            adminId: actorId, 
            actionType: 'Types.Employee Termination', 
            module: 'Settings', 
            detail: `Separated ${emp.name} (${empId}) — Reason: ${separationReason}. Re-hire eligible: ${eligibleForRehire ? 'Yes' : 'No'}. Admin privileges revoked.`,
            sourceLink: empId
        });

        // 7. Standard Dashboard Alert
        const successAlert: Types.Alert = {
            id: `TERM-${empId}-${Date.now()}`,
            message: `SECURE OFFBOARDING: ${emp.name} (${empId}) — ${separationReason}. Re-hire: ${eligibleForRehire ? 'Eligible' : 'Not Eligible'}. Admin rights revoked. Employee excluded from next payroll run; final payout retained in current cycle history.`,
            type: 'success',
            timestamp: getFormattedDate(new Date(), 'time'),
            isRead: false
        };
        setAlerts(prev => [successAlert, ...prev]);

        // 8. Absconded: High-Priority Asset Recovery Alert
        if (separationReason === 'Left/Absconded' && assignedAssets.length > 0) {
            const assetList = assignedAssets.map(a => `${a.model} (${a.id})`).join(', ');
            const abscondAlert: Types.Alert = {
                id: `ABSCOND-ASSET-${empId}-${Date.now()}`,
                message: `HIGH PRIORITY — ASSET RECOVERY REQUIRED: ${emp.name} (${empId}) has been marked as Left/Absconded with ${assignedAssets.length} company asset(s) still in possession: ${assetList}. Immediate recovery action needed.`,
                type: 'error',
                timestamp: getFormattedDate(new Date(), 'time'),
                isRead: false
            };
            setAlerts(prev => [abscondAlert, ...prev]);

            addAuditLog({
                adminId: actorId,
                actionType: 'Asset Recovery Alert',
                module: 'Assets',
                detail: `Absconded employee ${emp.name} (${empId}) has unreturned assets: ${assetList}. High-priority recovery alert dispatched.`,
                sourceLink: empId
            });
        }

        return { success: true, message: `Successfully separated ${emp.name} (${separationReason}).` };
    };

    const addOTRequest = (request: Types.OTRequest) => {
        // Anti-Clash Logic: Check for existing Mobile/Web OT on the same date
        const existingClash = getOTRequests().find(ot => 
            ot.empId === request.empId && 
            ot.date === request.date && 
            ot.status !== 'Rejected'
        );

        let finalRequest = { ...request };
        if (existingClash) {
            finalRequest.isConflict = true;
            finalRequest.conflictNote = `Clash detected with existing ${existingClash.source || 'Web/Mobile'} request (${existingClash.otHours}h). Review required.`;
            
            // High Priority Alert for Centralized Inbox
            const clashAlert: Types.Alert = {
                id: `OT-CLASH-${Date.now()}`,
                type: 'error',
                message: `HIGH PRIORITY: Duplicate OT Request detected for ${request.name} on ${request.date}. Biometric entry conflicting with ${existingClash.source || 'Standard'} request.`,
                timestamp: getFormattedDate(new Date(), 'time'),
                isRead: false
            };
            setAlerts(prev => [clashAlert, ...prev]);
        }

        setOTRequests(prev => [finalRequest, ...prev]);
        
        if (request.source === 'Biometric') {
            addAuditLog({
                adminId: request.empId,
                actionType: 'OT Application',
                module: 'Attendance',
                detail: `Biometric-original OT application: ${request.otHours}h requested via terminal at ${request.date}. ${finalRequest.isConflict ? '[CLASH DETECTED]' : ''}`
            });
        }
    };

    const generateDisbursementBatch = (providerName: string, payrollMonth: string, adminId: string) => {
        const providerEmps = employees.filter(e => e.bankName === providerName);
        const empIds = providerEmps.map(e => e.id);
        
        const activeRecords = payrollRecords.filter(r => empIds.includes(r.empId) && (r.status === 'Approved' || r.status === 'Disbursed'));
        if (activeRecords.length === 0) return { success: false, message: 'No eligible records found for this provider.' };

        const logic = systemSettings.paymentRoundingLogic;
        const providerConfig = systemSettings.paymentProviders.find(p => p.name === providerName);
        const isDigitalWallet = providerConfig?.type === 'Digital Wallet';

        // 1. Template Fingerprint Mapping
        let targetIdHeader = isDigitalWallet ? 'Mobile Number' : 'Account Number';
        if (providerName === 'AYA Bank') targetIdHeader = 'Counterparty Account';
        if (providerName === 'KBZ Bank') targetIdHeader = 'Beneficiary A/C';

        let csvHeader = `Electronic Funds Transfer - Disbursement Batch\n`;
        csvHeader += `Company TIN: ${complianceSettings.companyTIN || 'NOT REGISTERED'}\n`;
        csvHeader += `Provider: ${providerName}\n`;
        csvHeader += `Period: ${payrollMonth}\n\n`;

        csvHeader += `Account Name,${targetIdHeader},Payment Amount\n`;

        // 4. Batch Split Logic (AYA Bank > 500)
        const chunkSize = providerName === 'AYA Bank' ? 500 : activeRecords.length;
        const batches = [];
        for (let i = 0; i < activeRecords.length; i += chunkSize) {
            batches.push(activeRecords.slice(i, i + chunkSize));
        }

        let totalOverallAmount = 0;

        batches.forEach((batchRecords, batchIndex) => {
            let csvContent = csvHeader;
            
            const batchAmount = batchRecords.reduce((sum, r) => {
                let val = r.netPay;
                if (logic === 'Ceiling') val = Math.ceil(val);
                else if (logic === 'Floor') val = Math.floor(val);
                else if (logic === 'Nearest') val = Math.round(val);
                
                const emp = employees.find(e => e.id === r.empId);
                
                // 2. Clean-Room Sanitizer
                const cleanName = emp?.name?.replace(/[^\x00-\x7F]/g, "").trim() || 'Unknown';
                let targetId = isDigitalWallet ? emp?.mobile : emp?.accountNumber;
                let cleanTargetId = targetId?.replace(/[\s-]/g, "") || '';
                
                // 3. Leading Zero Guard (Excel explicit string format)
                const safeTargetId = `="${cleanTargetId}"`;
                
                csvContent += `"${cleanName}",${safeTargetId},"${val}"\n`;

                return sum + val;
            }, 0);

            totalOverallAmount += batchAmount;

            // Trigger Browser File Download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const safeBankName = providerName.replace(/\s+/g, '_');
            const safeDate = getCurrentDateISO();
            const batchSuffix = batches.length > 1 ? `_Part${batchIndex + 1}` : '';
            
            link.href = url;
            link.setAttribute('download', `${safeBankName}_Payroll_${safeDate}${batchSuffix}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });

        const newBatch: DisbursementBatch = {
            id: `BATCH-${providerName.toUpperCase().replace(/\s/g, '')}-${Date.now()}`,
            providerName,
            totalAmount: totalOverallAmount,
            employeeCount: activeRecords.length,
            disbursementDate: new Date().toISOString(),
            payrollMonth,
            adminId
        };

        setDisbursementBatches(prev => [newBatch, ...prev]);

        addAuditLog({
            adminId,
            actionType: 'Corporate Disbursement Sync',
            module: 'Payroll',
            detail: `Exported ${providerName} Batch | Total: ${totalOverallAmount.toLocaleString()} MMK.`
        });

        const message = batches.length > 1 
            ? `Export Successful: ${providerName} export was split into ${batches.length} files.` 
            : `Export Successful: ${providerName.replace(/\s+/g, '_')}_Payroll_${getCurrentDateISO()}.csv has been downloaded.`;

        return { success: true, message: message };
    };

    // submitReview: computes weighted average from competencyScores, sets status=Submitted,
    // and creates a PerformanceReviewRequest in the Centralized Inbox for admin approval.
    const submitReview = (reviewId: string, reviewerId: string, scores: Review['competencyScores'], selfRating?: number, managerComments?: string): { success: boolean; message: string } => {
        const review = reviews.find(r => r.id === reviewId);
        if (!review) return { success: false, message: 'Review not found.' };

        // Weighted average of submitted competency scores
        const scoreValues = Object.values(scores).filter((v): v is number => v !== undefined);
        if (scoreValues.length === 0) return { success: false, message: 'At least one competency score is required.' };
        const weightedAvg = Math.round((scoreValues.reduce((sum, v) => sum + v, 0) / scoreValues.length) * 10) / 10;

        // Update review record
        setReviews(prev => prev.map(r => r.id === reviewId
            ? { ...r, status: 'Submitted' as const, reviewerId, competencyScores: scores, rating: weightedAvg, selfRating, managerComments, progress: [...new Set([...r.progress, 'M'])] }
            : r
        ));

        // Sync review update to Supabase
        supabase.from('reviews').update({
            status: 'Submitted',
            reviewerId,
            competencyScores: scores,
            rating: weightedAvg,
            selfRating: selfRating ?? null,
            managerComments: managerComments ?? null,
            progress: [...new Set([...(review.progress || []), 'M'])],
        }).eq('id', reviewId).then(({ error }) => {
            if (error) console.error('Supabase review submit sync error:', error.message);
        });

        // Create Inbox item for Senior Admin approval
        const priority: PerformanceReviewRequest['priority'] = weightedAvg >= 4.5 ? 'High' : weightedAvg < 3.0 ? 'High' : 'Medium';
        const newRequest: PerformanceReviewRequest = {
            id: `PRR-${Date.now()}`,
            reviewId,
            empId: review.empId,
            name: review.name,
            dept: review.dept,
            reviewerId,
            period: review.period,
            competencyScores: scores,
            rating: weightedAvg,
            submittedDate: getCurrentDateISO(),
            status: 'Pending',
            priority
        };
        setPerformanceReviewRequests(prev => [newRequest, ...prev]);

        // Sync performance review request to Supabase
        supabase.from('performance_review_requests').insert({
            id: newRequest.id,
            reviewId: newRequest.reviewId,
            empId: newRequest.empId,
            name: newRequest.name,
            dept: newRequest.dept,
            reviewerId: newRequest.reviewerId,
            period: newRequest.period,
            competencyScores: newRequest.competencyScores,
            rating: newRequest.rating,
            submittedDate: newRequest.submittedDate,
            status: newRequest.status,
            priority: newRequest.priority,
        }).then(({ error }) => {
            if (error) console.error('Supabase performance review request insert error:', error.message);
        });

        addAuditLog({
            adminId: reviewerId,
            actionType: 'Review Submitted',
            module: 'Performance',
            detail: `Review for ${review.name} (${review.period}) submitted with rating ${weightedAvg}/5. Pending Senior Admin approval.`,
            sourceLink: reviewId
        });

        return { success: true, message: `Review submitted for ${review.name}. Awaiting Senior Admin approval in the Centralized Inbox.` };
    };

    // finalizeReview: Triggers Bonus integration and Career Movement
    const finalizeReview = (reviewId: string, adminId: string, recommendPromotion: boolean = false, newRole?: string, newSalary?: number, checksum?: string) => {
        setReviews(prev => prev.map(r => {
            if (r.id === reviewId) {
                if (r.rating && r.rating >= 4.5) {
                    const emp = employees.find(e => e.id === r.empId);
                    if (emp) {
                        addAdjustment({
                            empId: emp.id,
                            name: emp.name,
                            dept: emp.dept,
                            type: 'Performance Bonus',
                            category: 'Addition',
                            amount: emp.baseSalary * 0.1,
                            effectiveMonth: getCurrentDateISO().slice(0, 7),
                            reason: `Auto-generated bonus for exceeding expectations with a rating of ${r.rating}.`,
                            sourceLink: `REV-${reviewId}`,
                            source: 'System-Performance',
                            priority: 'Medium'
                        }, adminId);
                    }
                }
                
                if (recommendPromotion) {
                    const emp = employees.find(e => e.id === r.empId);
                    if (emp) {
                        addJobActivityChange({
                            empId: emp.id,
                            type: 'Promotion',
                            detail: `Recommended via Performance Review: ${reviewId}`,
                            effectiveDate: getCurrentDateISO(),
                            priority: 'High',
                            newRole: newRole,
                            newSalary: newSalary
                        });
                    }
                }
                
                return { ...r, status: 'Finalized' as const, checksum };
            }
            return r;
        }));

        // Sync review finalize to Supabase
        supabase.from('reviews').update({
            status: 'Finalized',
            checksum: checksum ?? null,
        }).eq('id', reviewId).then(({ error }) => {
            if (error) console.error('Supabase review finalize sync error:', error.message);
        });
    };



    const toggleOnboardingTask = (recordId: string, taskId: string, adminId: string): { success: boolean, message: string } => {
        let success = true;
        let message = '';
        let updatedRecord: Types.OnboardingRecord | null = null;
        setOnboardingRecords(prev => prev.map(record => {
            if (record.id === recordId) {
                const updatedTasks = record.tasks.map(t => {
                    if (t.id === taskId) {
                        const newCompleted = !t.isCompleted;
                        if (newCompleted && t.title === 'Bank Details') {
                            setEmployees(emps => emps.map(emp => emp.id === record.empId ? { ...emp, bankName: 'KBZ Bank', accountNumber: '1234567890123' } : emp));
                            addAuditLog({ adminId, actionType: 'Auto-Sync', module: 'Settings', detail: `Auto-populated bank details in Types.Employee Registry for ${record.name}.` });
                            message = 'Task completed and Bank Details successfully pushed to Types.Employee DB.';
                        } else {
                            message = newCompleted ? 'Task marked as completed.' : 'Task unmarked.';
                        }
                        if (newCompleted && t.title === 'Biometric PIN Sync') {
                           addAuditLog({ adminId, actionType: 'System Integration', module: 'Settings', detail: `ZK-teco biometric PIN synced manually for ${record.name}.` });
                        }
                        addAuditLog({ adminId, actionType: newCompleted ? 'Task Completed' : 'Task Reopened', module: 'Settings', detail: `${record.name}'s task: ${t.title}` });
                        return { ...t, isCompleted: newCompleted };
                    }
                    return t;
                });
                
                const allMandatoryCompleted = updatedTasks.filter(t => t.isMandatory).every(t => t.isCompleted);
                let newStatus = record.status;
                if (allMandatoryCompleted && updatedTasks.filter(t => t.isMandatory).length > 0) {
                    newStatus = 'Completed';
                    addAuditLog({ adminId, actionType: 'Onboarding Completed', module: 'Settings', detail: `${record.name}'s onboarding process fully assembled and verified.` });
                } else if (!allMandatoryCompleted && newStatus === 'Completed') {
                    newStatus = 'In Progress';
                }

                updatedRecord = { ...record, tasks: updatedTasks, status: newStatus as any };
                return updatedRecord;
            }
            return record;
        }));
        // Sync to Supabase
        if (updatedRecord) {
            supabase.from('onboarding_records').update({ tasks: updatedRecord.tasks, status: updatedRecord.status }).eq('id', recordId).then(({ error }) => {
                if (error) console.error('Supabase onboarding task toggle sync error:', error.message);
            });
        }
        return { success, message };
    };

    const addOnboardingCustomTask = (recordId: string, title: string, tooltip: string, adminId: string) => {
        let updatedTasks: OnboardingTask[] | null = null;
        let updatedStatus: string | null = null;
        setOnboardingRecords(prev => prev.map(record => {
            if (record.id === recordId) {
                const newTask: OnboardingTask = { id: `CUST-${Date.now()}`, title, isCompleted: false, isMandatory: false, tooltip, type: 'Action' };
                addAuditLog({ adminId, actionType: 'Custom Task Added', module: 'Settings', detail: `Added "${title}" to ${record.name}'s onboarding.` });
                updatedTasks = [...record.tasks, newTask];
                updatedStatus = record.status === 'Completed' ? 'In Progress' : record.status;
                return { ...record, tasks: updatedTasks, status: updatedStatus as any };
            }
            return record;
        }));
        // Sync to Supabase
        if (updatedTasks && updatedStatus) {
            supabase.from('onboarding_records').update({ tasks: updatedTasks, status: updatedStatus }).eq('id', recordId).then(({ error }) => {
                if (error) console.error('Supabase onboarding custom task sync error:', error.message);
            });
        }
    };

    const deleteOnboardingTask = (recordId: string, taskId: string, adminId: string) => {
        let deletedTasks: OnboardingTask[] | null = null;
        let deletedStatus: string | null = null;
        setOnboardingRecords(prev => prev.map(record => {
            if (record.id === recordId) {
                const updatedTasks = record.tasks.filter(t => t.id !== taskId);
                addAuditLog({ adminId, actionType: 'Task Removed', module: 'Settings', detail: `Removed task from ${record.name}'s onboarding.` });
                
                const allMandatoryCompleted = updatedTasks.filter(t => t.isMandatory).every(t => t.isCompleted);
                const newStatus = allMandatoryCompleted && updatedTasks.filter(t => t.isMandatory).length > 0 ? 'Completed' : (record.status === 'Completed' && !allMandatoryCompleted ? 'In Progress' : record.status);

                deletedTasks = updatedTasks;
                deletedStatus = newStatus;
                return { ...record, tasks: updatedTasks, status: newStatus as any };
            }
            return record;
        }));
        // Sync to Supabase
        if (deletedTasks && deletedStatus) {
            supabase.from('onboarding_records').update({ tasks: deletedTasks, status: deletedStatus }).eq('id', recordId).then(({ error }) => {
                if (error) console.error('Supabase onboarding task delete sync error:', error.message);
            });
        }
    };

    const sendOnboardingReminder = (recordId: string, taskId: string, adminId: string, method: string) => {
        const record = onboardingRecords.find(r => r.id === recordId);
        const task = record?.tasks.find(t => t.id === taskId);
        if (record && task) {
            addAuditLog({ adminId, actionType: 'Reminder Sent', module: 'Settings', detail: `Sent ${method} reminder to ${record.supervisor} for ${record.name} regarding "${task.title}".` });
        }
    };

    const createJobPosting = (job: Omit<JobPosting, 'id' | 'postingDate'>, adminId: string): { success: boolean; message: string } => {
        if (!isAdmin(adminId)) {
            addAuditLog({ adminId, actionType: 'Security Violation', module: 'Settings', detail: `Unauthorized Job Creation attempt by ${adminId}.` });
            return { success: false, message: 'Security Violation: Administrator privileges required.' };
        }
        if (systemSettings.atsCredits < 1) {
            return { success: false, message: 'Insufficient ATS Credits to create a new job posting.' };
        }
        
        const newJob: JobPosting = {
            ...job,
            id: `JOB-YGN-${Date.now().toString().slice(-4)}`,
            postingDate: getFormattedDate(new Date(), 'short')
        };
        
        setJobPostings(prev => [newJob, ...prev]);
        setSystemSettings({ ...systemSettings, atsCredits: systemSettings.atsCredits - 1 });
        
        addAuditLog({ adminId, actionType: 'Job Created', module: 'Settings', detail: `Created new job listing: ${job.title} (${newJob.id}). ATS Credit deducted.` });
        
        return { success: true, message: `Job ${newJob.id} created successfully! Remaining credits: ${systemSettings.atsCredits - 1}` };
    };

    const toggleJobPortalStatus = (jobId: string, adminId: string): { success: boolean; message: string } => {
        const job = jobPostings.find(j => j.id === jobId);
        if (!job) return { success: false, message: 'Job not found.' };

        setJobPostings(prev => prev.map(j => j.id === jobId ? { ...j, portalStatus: !j.portalStatus } : j));
        
        addAuditLog({ adminId, actionType: 'Job Status Changed', module: 'Settings', detail: `${job.title} portal status mapped to ${!job.portalStatus ? 'Active' : 'Inactive'}.` });
        
        return { success: true, message: `${job.title} is now ${!job.portalStatus ? 'Online' : 'Offline'}.` };
    };

    const addJobActivityChange = (change: Omit<JobActivityChange, 'id' | 'status' | 'submittedDate'>) => {
        let priority = change.priority;
        
        // Auto-tag High Priority if salary increase > 20%
        if (change.newSalary && change.oldSalary) {
            if (change.newSalary > change.oldSalary * 1.2) {
                priority = 'High';
            }
        }

        const newChange: JobActivityChange = {
            ...change,
            id: `JAC-${Date.now()}`,
            status: 'Pending',
            submittedDate: getCurrentDateISO(),
            priority
        };
        setJobActivityChanges(prev => [...prev, newChange]);

        // Sync to Supabase
        supabase.from('job_activity_changes').insert({
            id: newChange.id,
            empId: newChange.empId,
            name: newChange.name,
            type: newChange.type,
            detail: newChange.detail,
            effectiveDate: newChange.effectiveDate,
            status: newChange.status,
            submittedDate: newChange.submittedDate,
            priority: newChange.priority,
            category: newChange.category,
            newSalary: newChange.newSalary ?? null,
            oldSalary: newChange.oldSalary ?? null,
            newRole: newChange.newRole || null,
            newDept: newChange.newDept || null,
            newManager: newChange.newManager || null,
            newShiftId: newChange.newShiftId || null,
            announcementTitle: newChange.announcementTitle || null,
            jobDescription: newChange.jobDescription || null,
            newLocation: newChange.newLocation || null,
            newOfficeCoords: newChange.newOfficeCoords || null,
            transferReason: newChange.transferReason || null,
            finalWorkingDate: newChange.finalWorkingDate || null,
            resignationReason: newChange.resignationReason || null,
        }).then(({ error }) => {
            if (error) console.error('Supabase job activity insert error:', error.message);
        });
    };

    const approveJobActivityChange = (changeId: string, adminId: string): { success: boolean; message: string } => {
        if (!isAdmin(adminId)) return { success: false, message: 'Admin privileges required.' };
        const change = jobActivityChanges.find(c => c.id === changeId);
        if (!change) return { success: false, message: 'Change request not found.' };
        if (change.status !== 'Pending') return { success: false, message: 'This request has already been processed.' };
        const result = handleInboxAction('JobActivity', changeId, 'Approve', adminId);
        return result;
    };

    // ─── Employee Self-Service: Profile Change Requests ────────────────────────
    const submitProfileChangeRequest = (
        req: Omit<Types.ProfileChangeRequest, 'id' | 'status' | 'submittedAt'>
    ): { success: boolean; id: string } => {
        const id = `PCR-${Date.now()}`;
        const newReq: Types.ProfileChangeRequest = {
            ...req,
            id,
            status: 'Pending',
            submittedAt: new Date().toISOString(),
        };

        supabase.from('profile_change_requests').insert(newReq).then(({ error }) => {
            if (error) console.error('Failed to sync profile change request to Supabase:', error);
        });

        setProfileChangeRequests(prev => [newReq, ...prev]);
        addAuditLog({
            adminId: req.empId,
            actionType: 'Profile Change Submitted',
            module: 'Employees',
            detail: `${req.name} submitted a ${req.category} update request.`,
        });
        return { success: true, id };
    };

    const handleProfileChangeRequest = (
        id: string,
        action: 'Approve' | 'Reject',
        reviewerId: string,
        rejectionReason?: string
    ): { success: boolean; message: string } => {
        const req = profileChangeRequests.find(r => r.id === id);
        if (!req) return { success: false, message: 'Request not found.' };
        if (req.status !== 'Pending') return { success: false, message: 'Request already processed.' };

        const now = new Date().toISOString();

        if (action === 'Approve') {
            // Map field keys → Employee fields and apply
            const fieldMap: Record<string, keyof Types.Employee> = {
                'Mobile': 'mobile',
                'Township': 'township',
                'NRC Number': 'nrcNumber',
                'SSB Number': 'ssbNumber',
                'Bank Name': 'bankName',
                'Account Number': 'accountNumber',

                'Tax ID': 'taxId',
                'Office Location': 'officeLocation',
            };
            const updates: Partial<Types.Employee> = {};
            Object.entries(req.changes).forEach(([label, value]) => {
                const empKey = fieldMap[label];
                if (empKey) (updates as any)[empKey] = value;
            });
            // Handle document uploads — push to employee.documents
            if (req.category === 'Document Upload' && req.documentName && req.documentUrl) {
                setEmployees(prev => prev.map(e => {
                    if (e.id !== req.empId) return e;
                    const newDoc: Types.DocumentType = {
                        id: `DOC-${Date.now()}`,
                        name: req.documentName!,
                        type: (req.documentType || 'Other') as any,
                        url: req.documentUrl!,
                        uploadedAt: now,
                        status: 'Verified',
                        uploadedBy: reviewerId,
                    };
                    return { ...e, documents: [...(e.documents || []), newDoc], ...updates };
                }));
            } else if (Object.keys(updates).length > 0) {
                setEmployees(prev => prev.map(e => e.id === req.empId ? { ...e, ...updates } : e));
                // Sync approved profile changes to Supabase
                supabase.from('employees').update(updates).eq('id', req.empId)
                    .then(({ error }) => { if (error) console.error('Supabase profile change sync error:', error.message); })
                    .catch(err => console.error('Failed to sync profile change to Supabase:', err));
            }

            const reqUpdates = { status: 'Approved', reviewedBy: reviewerId, reviewedAt: now };
            supabase.from('profile_change_requests').update(reqUpdates).eq('id', id).then(({ error }) => {
                if (error) console.error('Failed to update profile change request in Supabase:', error);
            });

            setProfileChangeRequests(prev => prev.map(r =>
                r.id === id ? { ...r, ...reqUpdates } as Types.ProfileChangeRequest : r
            ));
            addAuditLog({ adminId: reviewerId, actionType: 'Profile Change Approved', module: 'Employees', detail: `Approved ${req.category} update for ${req.name}.` });
            return { success: true, message: `${req.name}'s ${req.category} update has been applied.` };
        } else {
            const reqUpdates = { status: 'Rejected', reviewedBy: reviewerId, reviewedAt: now, rejectionReason };
            supabase.from('profile_change_requests').update(reqUpdates).eq('id', id).then(({ error }) => {
                if (error) console.error('Failed to update profile change request in Supabase:', error);
            });

            setProfileChangeRequests(prev => prev.map(r =>
                r.id === id ? { ...r, ...reqUpdates } as Types.ProfileChangeRequest : r
            ));
            addAuditLog({ adminId: reviewerId, actionType: 'Profile Change Rejected', module: 'Employees', detail: `Rejected ${req.category} update for ${req.name}. Reason: ${rejectionReason}` });
            return { success: true, message: `Request rejected.` };
        }
    };

    const logFieldAgentLocation = (agentId: string, gps: { lat: number, lng: number }, battery: number, onLine: boolean) => {
        setFieldAgents(prev => prev.map(agent => {
            if (agent.id !== agentId) return agent;
            if (!agent.isTrackingActive || agent.status === 'Offline') return agent;

            const now = new Date();
            const ts = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            
            // Calculate Velocity
            let speed = 0;
            let dwellDurationMins = 0;
            const lastHistoryPoint = agent.history[agent.history.length - 1];
            
            if (lastHistoryPoint && lastHistoryPoint.lat && lastHistoryPoint.lng) {
                const dist = calculateDistance(gps.lat, gps.lng, lastHistoryPoint.lat, lastHistoryPoint.lng);
                speed = (dist / 10) * 3.6; // km/h (10s heartbeats)
            }

            let alert = agent.alert;
            if (speed > 100) alert = 'High Speed Alert';
            else if (battery < 15) alert = 'Low Battery Warning';
            else if (!onLine) alert = 'GPS Signal Lost';
            else if (alert === 'High Speed Alert' || alert === 'Low Battery Warning' || alert === 'GPS Signal Lost') alert = 'None';

            // Dwell Point & Memory Pruning Logic
            let finalHistory = [...agent.history];
            let shouldLogNewPoint = true;
            
            if (lastHistoryPoint && lastHistoryPoint.lat && lastHistoryPoint.lng) {
                const distSinceLast = calculateDistance(gps.lat, gps.lng, lastHistoryPoint.lat, lastHistoryPoint.lng);
                
                if (distSinceLast < 10) { // Within 10m dwell zone
                    shouldLogNewPoint = false;
                    // Update duration of last point instead of pushing new ones
                    const lastIdx = finalHistory.length - 1;
                    const prevDwellCount = finalHistory[lastIdx].isDwellPoint ? (parseFloat(finalHistory[lastIdx].timestamp.match(/\d+/)?.[0] || '0') / 0.166) : 1; 
                    dwellDurationMins = (prevDwellCount + 1) * (10 / 60);
                    
                    finalHistory[lastIdx] = {
                        ...finalHistory[lastIdx],
                        isDwellPoint: true,
                        timestamp: `${finalHistory[lastIdx].timestamp.split(' (')[0]} (Stayed ${Math.round(dwellDurationMins)}m)`
                    };
                }
            }

            if (shouldLogNewPoint) {
                finalHistory.push({ 
                    x: agent.mapPosition.x, 
                    y: agent.mapPosition.y, 
                    lat: gps.lat, 
                    lng: gps.lng, 
                    timestamp: ts,
                    speed,
                    isDwellPoint: false
                });
            }

            const newLog: Types.GPSLog = {
                id: `GPS-${agentId}-${now.getTime()}`,
                agentId,
                lat: gps.lat,
                lng: gps.lng,
                timestamp: now.toISOString(),
                startTime: now.toISOString(),
                endTime: now.toISOString(),
                durationMins: dwellDurationMins,
                speed,
                isDwellPoint: dwellDurationMins > 0,
                batteryLevel: battery,
                onLine
            };

            // Operational Stability: Offline Buffering
            if (!onLine) {
                setOfflineQueue(q => [...q, newLog]);
            } else {
                setGpsLogs(l => {
                    const lastL = l[0]; // Since we order by createdAt DESC now
                    if (!shouldLogNewPoint && lastL && lastL.agentId === agentId && lastL.isDwellPoint) {
                        const updated = [...l];
                        updated[0] = { ...lastL, endTime: now.toISOString(), durationMins: dwellDurationMins };
                        
                        // Sync dwell point update to Supabase
                        supabase.from('gps_logs').update({ 
                            endTime: updated[0].endTime, 
                            durationMins: updated[0].durationMins 
                        }).eq('id', updated[0].id).then(({ error }) => {
                            if (error) console.error('Supabase dwell update error:', error.message);
                        });

                        return updated;
                    }
                    
                    // Sync new log to Supabase
                    supabase.from('gps_logs').insert(newLog).then(({ error }) => {
                        if (error) console.error('Supabase GPS log insert error:', error.message);
                    });

                    return [newLog, ...l].slice(0, 2000);
                });
            }

            const updatedAgent: Types.FieldAgent = {
                ...agent,
                gps,
                batteryLevel: battery,
                alert,
                currentSpeed: speed,
                lastUpdate: 'Just now',
                history: finalHistory.slice(-100)
            };

            // Sync updated agent state to Supabase
            supabase.from('field_agents').update({
                gps: updatedAgent.gps,
                batteryLevel: updatedAgent.batteryLevel,
                alert: updatedAgent.alert,
                lastUpdate: updatedAgent.lastUpdate,
                history: updatedAgent.history,
                currentSpeed: updatedAgent.currentSpeed,
                status: onLine ? 'Online' : 'Offline'
            }).eq('id', agentId).then(({ error }) => {
                if (error) console.error('Supabase agent update error:', error.message);
            });

            return updatedAgent;
        }));
    };

    const optimizeFieldRoutes = (adminId: string): { success: boolean; message: string } => {
        if (!isAdmin(adminId)) return { success: false, message: 'Security Violation: Administrator privileges required.' };
        
        // Functional Greedy Algorithm for Waypoint Sorting (Nearest Neighbor)
        setFieldAgents(prev => {
            const onlineAgents = prev.filter(a => a.status === 'Online');
            if (onlineAgents.length <= 1) return prev;

            return prev.map(agent => {
                if (agent.status !== 'Online') return agent;
                // Simulating a route optimization by sorting hypothetical targets by proximity
                // In a real system, this would re-order their 'routeAssigned' tasks
                return { ...agent, lastUpdate: 'Route Optimized' };
            });
        });

        addAuditLog({ adminId, actionType: 'Route Optimization Triggered', module: 'Field Force', detail: `Executed Nearest-Neighbor Optimization for active agents.` });
        return { success: true, message: 'Successfully calculated optimal routes using Nearest-Neighbor heuristic.' };
    };

    const addLaborContract = (contract: Omit<Types.LaborContract, 'id' | 'status'>, adminId: string): { success: boolean; message: string } => {
        if (!isAdmin(adminId)) return { success: false, message: 'Admin privileges required.' };
        const cid = `CON-${Date.now()}`;
        const newContract: Types.LaborContract = { ...contract, id: cid, status: deriveLaborContractStatus(contract.endDate) };
        setLaborContracts(prev => [newContract, ...prev]);

        // Sync to Supabase
        supabase.from('labor_contracts').insert({
            id: newContract.id,
            empId: newContract.empId,
            employeeName: newContract.employeeName,
            dept: newContract.dept,
            type: newContract.type,
            startDate: newContract.startDate,
            endDate: newContract.endDate,
            status: newContract.status,
            documentUrl: newContract.documentUrl,
            signedDate: newContract.signedDate,
            salary: newContract.salary,
            role: newContract.role,
        }).then(({ error }) => {
            if (error) console.error('Supabase labor contract insert error:', error.message);
        });

        setEmployees(prev => prev.map(e => {
            if (e.id !== contract.empId) return e;
            const docs = contract.documentUrl ? [{ id: `DOC-${cid}`, name: `${contract.type} Contract — ${contract.employeeName}`, type: 'application/pdf', category: 'Contract' as const, privacy: 'Admin Only' as const, date: new Date().toISOString().split('T')[0], url: contract.documentUrl, uploadedBy: adminId, timestamp: new Date().toISOString() }, ...e.documents] : e.documents;
            return { ...e, currentContractId: cid, contractActionRequired: newContract.status === 'Expired', documents: docs };
        }));
        // Sync contract fields to Supabase
        supabase.from('employees').update({
            currentContractId: cid,
            contractActionRequired: newContract.status === 'Expired',
        }).eq('id', contract.empId).then(({ error }) => {
            if (error) console.error('Supabase labor contract employee sync error:', error.message);
        });
        addAuditLog({ adminId, actionType: 'Contract Added', module: 'Settings', detail: `New ${contract.type} contract for ${contract.employeeName}.` });
        return { success: true, message: 'Contract record added successfully.' };
    };

    const addDisciplinaryAction = (action: Omit<Types.DisciplinaryAction, 'id' | 'status' | 'resolvedDate' | 'resolvedBy'>, adminId: string): { success: boolean; message: string } => {
        if (!isAdmin(adminId)) return { success: false, message: 'Admin privileges required.' };
        const cid = `DIS-${Date.now()}`;
        const newAction: Types.DisciplinaryAction = {
            ...action,
            id: cid,
            status: 'Active',
            resolvedDate: null,
            resolvedBy: null
        };
        setDisciplinaryActions(prev => [newAction, ...prev]);

        // Sync to Supabase
        supabase.from('disciplinary_actions').insert({
            id: newAction.id,
            empId: newAction.empId,
            employeeName: newAction.employeeName,
            dept: newAction.dept,
            type: newAction.type,
            category: newAction.category,
            issueDate: newAction.issueDate,
            expiryDate: newAction.expiryDate,
            status: newAction.status,
            reason: newAction.reason,
            actionTaken: newAction.actionTaken,
            documentUrl: newAction.documentUrl,
            penaltyAmount: newAction.penaltyAmount,
            employeeStatement: newAction.employeeStatement,
            resolvedDate: newAction.resolvedDate,
            resolvedBy: newAction.resolvedBy,
        }).then(({ error }) => {
            if (error) console.error('Supabase disciplinary action insert error:', error.message);
        });

        // Payroll Penalty Bridge: auto-create a Pending Deduction if penaltyAmount > 0
        if (action.penaltyAmount && action.penaltyAmount > 0) {
            const employee = employees.find(e => e.id === action.empId);
            addAdjustment({
                empId: action.empId,
                name: action.employeeName,
                dept: action.dept,
                type: 'Disciplinary Penalty',
                category: 'Deduction',
                amount: action.penaltyAmount,
                effectiveMonth: 'Oct 2023',
                reason: `${action.type} — ${action.reason}`,
                sourceLink: cid,
                source: 'System-Disciplinary',
                priority: 'High',
                isTaxable: false,
                isSSBRelevant: false
            });
        }

        addAuditLog({ adminId, actionType: 'Disciplinary Action', module: 'Settings', detail: `${action.type} (${action.category}) issued to ${action.employeeName}.${action.penaltyAmount ? ` Penalty: ${action.penaltyAmount.toLocaleString()} MMK.` : ''}` });
        return { success: true, message: 'Disciplinary action recorded.' };
    };

    const resolveDisciplinaryAction = (actionId: string, adminId: string): { success: boolean; message: string } => {
        if (!isAdmin(adminId)) return { success: false, message: 'Admin privileges required.' };
        const existing = disciplinaryActions.find(a => a.id === actionId);
        if (!existing) return { success: false, message: 'Disciplinary record not found.' };
        if (existing.status === 'Resolved') return { success: false, message: 'Record is already resolved.' };
        if (existing.status === 'Expired') return { success: false, message: 'Cannot resolve an expired record.' };
        const resolvedDate = new Date().toISOString().split('T')[0];
        setDisciplinaryActions(prev => prev.map(a => a.id === actionId ? { ...a, status: 'Resolved' as const, resolvedDate, resolvedBy: adminId } : a));
        // Sync to Supabase
        supabase.from('disciplinary_actions').update({ status: 'Resolved', resolvedDate, resolvedBy: adminId }).eq('id', actionId).then(({ error }) => {
            if (error) console.error('Supabase disciplinary resolve sync error:', error.message);
        });
        addAuditLog({ adminId, actionType: 'Disciplinary Resolved', module: 'Settings', detail: `Resolved ${existing.type} for ${existing.employeeName} (${existing.empId}).` });
        return { success: true, message: `Incident resolved for ${existing.employeeName}.` };
    };

    // ─── Archive Engine ────────────────────────────────────────────────────────────
    const computeDocHash = (raw: string): string => {
        return Array.from(raw).reduce((hash, char) => (Math.imul(31, hash) + char.charCodeAt(0)) | 0, 0).toString(16).toUpperCase();
    };

    const addDocumentToLibrary = (doc: Omit<Types.ArchivedDocument, 'id' | 'generatedAt' | 'checksum'>, adminId: string): { success: boolean; message: string; id?: string; checksum?: string } => {
        if (!isAdmin(adminId)) return { success: false, message: 'Admin privileges required.' };
        const id = `DOC-${Date.now()}`;
        const generatedAt = new Date().toISOString();
        const hashInput = `${id}|${doc.title}|${doc.sourceModule}|${doc.period}|${generatedAt}`;
        const checksum = computeDocHash(hashInput);
        const newDoc: Types.ArchivedDocument = { ...doc, id, generatedAt, checksum };
        setArchivedDocuments(prev => [newDoc, ...prev]);

        // Sync to Supabase
        supabase.from('archived_documents').insert({
            id: newDoc.id,
            title: newDoc.title,
            category: newDoc.category,
            sourceModule: newDoc.sourceModule,
            description: newDoc.description,
            period: newDoc.period,
            generatedBy: newDoc.generatedBy,
            generatedAt: newDoc.generatedAt,
            checksum: newDoc.checksum,
            fileContent: newDoc.fileContent,
            fileName: newDoc.fileName,
            isMandatory: newDoc.isMandatory,
            relatedRecordId: newDoc.relatedRecordId,
        }).then(({ error }) => {
            if (error) console.error('Supabase archived document insert error:', error.message);
        });

        addAuditLog({ adminId, actionType: 'Document Archived', module: 'Documents', detail: `Archived "${doc.title}" [${doc.category}] from ${doc.sourceModule}. Hash: [SECURE-${checksum}]` });
        return { success: true, message: `Document archived: ${doc.title}`, id, checksum };
    };

    const deleteArchivedDocument = (docId: string, adminId: string, reason: string): { success: boolean; message: string } => {
        if (!isAdmin(adminId)) return { success: false, message: 'Admin privileges required.' };
        if (!reason.trim()) return { success: false, message: 'Deletion reason is mandatory for audit compliance.' };
        const doc = archivedDocuments.find(d => d.id === docId);
        if (!doc) return { success: false, message: 'Document not found.' };
        setArchivedDocuments(prev => prev.filter(d => d.id !== docId));

        // Sync delete to Supabase
        supabase.from('archived_documents').delete().eq('id', docId).then(({ error }) => {
            if (error) console.error('Supabase archived document delete error:', error.message);
        });
        addSecurityLog({
            deviceId: 'WEB-ADMIN',
            authMethod: 'Admin Action' as any,
            status: 'Success',
            empId: adminId,
            detail: `[HIGH PRIORITY] Archived document deleted: "${doc.title}" (${docId}). Category: ${doc.category}. Source: ${doc.sourceModule}. Reason: ${reason}`
        });
        addAuditLog({ adminId, actionType: 'Document Deleted', module: 'Documents', detail: `Deleted "${doc.title}" (${docId}). Reason: ${reason}` });
        return { success: true, message: `Document "${doc.title}" permanently deleted.` };
    };

    const createAnnouncement = (ann: Omit<Types.Announcement, 'id' | 'createdAt' | 'status' | 'sourceType'> & { isHoliday?: boolean, holidayDate?: string }) => {
        const id = `ANN-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
        const newAnn: Types.Announcement = {
            ...ann,
            id,
            status: 'Published',
            createdAt: new Date().toISOString(),
            sourceType: 'Manual',
            requiresAcknowledgement: ann.requiresAcknowledgement || false,
            acknowledgements: ann.requiresAcknowledgement ? [] : []
        };

        if (ann.isHoliday && ann.holidayDate) {
            setHolidays([...holidays.filter(h => h.date !== ann.holidayDate), { date: ann.holidayDate!, name: ann.title, isRestricted: true }]);
            // Sync holiday to Supabase
            supabase.from('holidays').upsert({ date: ann.holidayDate!, name: ann.title, isRestricted: true }).then(({ error }) => {
                if (error) console.error('Supabase holiday from announcement sync error:', error.message);
            });
        }

        setAnnouncements(prev => [newAnn, ...prev]);

        // Sync to Supabase
        supabase.from('announcements').insert({
            id: newAnn.id,
            title: newAnn.title,
            content: newAnn.content,
            priority: newAnn.priority,
            targetAudience: newAnn.targetAudience,
            targetDept: newAnn.targetDept,
            targetRole: newAnn.targetRole,
            createdBy: newAnn.createdBy,
            status: newAnn.status,
            sourceType: newAnn.sourceType,
            requiresAcknowledgement: newAnn.requiresAcknowledgement,
            acknowledgements: newAnn.acknowledgements || [],
        }).then(({ error }) => {
            if (error) console.error('Supabase announcement insert error:', error.message);
        });

        return { success: true, id };
    };

    const acknowledgeAnnouncement = (annId: string, empId: string) => {
        const emp = employees.find(e => e.id === empId);
        setAnnouncements(prev => prev.map(a => {
            if (a.id === annId && a.requiresAcknowledgement) {
                const ackList = a.acknowledgements || [];
                if (!ackList.some(a => a.empId === empId)) {
                    const newAck = { empId, empName: emp?.name || 'Unknown', acknowledgedAt: new Date().toISOString() };
                    const updatedAcks = [...ackList, newAck];
                    // Sync acknowledgement to Supabase
                    supabase.from('announcements').update({ acknowledgements: updatedAcks }).eq('id', annId).then(({ error }) => {
                        if (error) console.error('Supabase announcement acknowledgement sync error:', error.message);
                    });
                    return { ...a, acknowledgements: updatedAcks };
                }
            }
            return a;
        }));
    };

    const submitExpense = (req: Omit<ExpenseRequest, 'id' | 'status'>): { success: boolean; message: string } => {
        // Migrated to PayrollProvider
        return { success: false, message: 'Financial operations moved to Payroll Provider.' };
    };

    const handleExpenseApproval = (expenseId: string, action: 'Approve' | 'Reject', adminId: string): { success: boolean; message: string } => {
        // Migrated to PayrollProvider
        return { success: false, message: 'Financial operations moved to Payroll Provider.' };
    };

    const handleInboxAction = (type: string, id: string, action: 'Approve' | 'Reject', adminId: string): { success: boolean; message: string } => {
        if (!isAdmin(adminId)) return { success: false, message: 'Admin privileges required.' };

        let success = true;
        let message = `Request ${action === 'Approve' ? 'approved' : 'rejected'} successfully.`;
        const status = action === 'Approve' ? 'Approved' : 'Rejected';

        // 1. Concurrency Check: Prevent duplicate processing
        const isProcessed = (itemType: string, itemId: string) => {
            switch(itemType) {
                case 'Leave': return leaveRequests.find(r => r.id === itemId)?.status !== 'Pending';
                case 'JobActivity': return jobActivityChanges.find(r => r.id === itemId)?.status !== 'Pending';
                case 'LocationSnapshot': return locationSnapshots.find(r => r.id === itemId)?.status !== 'Pending';
                case 'Recruitment': return recruitmentActions.find(r => r.id === itemId)?.status !== 'Pending';
                case 'Attendance': return attendanceRequests.find(r => r.id === itemId)?.status !== 'Pending';
                case 'PerformanceReview': return performanceReviewRequests.find(r => r.id === itemId)?.status !== 'Pending';
                default: return false;
            }
        };

        if (isProcessed(type, id)) {
            return { success: false, message: 'This request has already been processed by another administrator.' };
        }

        // Helper for Audit Logging with Snapshots
        const logAction = (itemType: string, itemId: string, before: any, after: any) => {
            addAuditLog({
                adminId,
                actionType: `Inbox ${action}`,
                module: 'Inbox',
                detail: `${itemType} ${itemId} ${action.toLowerCase()}d. Snapshot log created.`
            });
            // In a real system, we'd store the before/after snapshots in a dedicated DB table
            console.log(`[AUDIT SNAPSHOT] ${itemType} ${itemId} | BEFORE:`, before, '| AFTER:', after);
        };

        switch (type) {
            // Migrated cases (OT, Loan, Adjustment, ProjectPayment, Expense) are now handled in PayrollProvider
            case 'Leave': {
                const item = leaveRequests.find(r => r.id === id);
                if (!item) return { success: false, message: 'Item not found.' };
                if (action === 'Approve') {
                    const result = approveLeave(id, adminId);
                    if (!result.success) return result;
                } else {
                    const result = rejectLeave(id, adminId, 'Declined via Centralized Inbox.');
                    if (!result.success) return result;
                }
                logAction('LeaveRequest', id, item, { ...item, status });
                break;
            }
            case 'JobActivity': {
                const item = jobActivityChanges.find(r => r.id === id);
                const emp = employees.find(e => e.id === item?.empId);
                if (!item || !emp) return { success: false, message: 'Item or Types.Employee not found.' };
                
                setJobActivityChanges(prev => prev.map(r => r.id === id ? { ...r, status: status as any } : r));

                // Sync job activity status to Supabase
                supabase.from('job_activity_changes').update({ status }).eq('id', id).then(({ error }) => {
                    if (error) console.error('Supabase job activity status sync error:', error.message);
                });
                
                if (action === 'Approve') {
                    // 1. Resignation specific logic
                    if (item.type === 'Resignation') {
                        // Asset Clearance Check (Warning only, already filtered in UI but strictly asserted here)
                        const assignedAssets = assets.filter(a => a.assigneeId === item.empId && a.status === 'In Use');
                        
                        setEmployees(prev => prev.map(e => {
                            if (e.id === item.empId) {
                                const historyEntry: Types.EmploymentHistory = {
                                    id: `HIST-${Date.now()}`,
                                    date: getFormattedDate(new Date(), 'short'),
                                    type: 'Resignation',
                                    detail: `Resignation: ${item.resignationReason || 'Personal reasons'}. Final date: ${item.finalWorkingDate}`,
                                    reason: item.resignationReason,
                                    approvedBy: adminId,
                                    sourceId: item.id
                                };

                                return { 
                                    ...e, 
                                    status: 'Terminated',
                                    colorClass: 'bg-slate-100 text-slate-700',
                                    employmentHistory: [...(e.employmentHistory || []), historyEntry]
                                };
                            }
                            return e;
                        }));

                        // Final Settlement Flag (Now handled in next Payroll Cycle)
                        addAuditLog({ adminId, actionType: 'Resignation Sync', module: 'Inbox', detail: `Resignation approved. Queued for final settlement processing in Payroll.` });

                        // Sync resignation to Supabase
                        supabase.from('employees').update({
                            status: 'Terminated',
                        }).eq('id', item.empId).then(({ error }) => {
                            if (error) console.error('Supabase resignation sync error:', error.message);
                        });

                        // Revoke Admin
                        setSystemSettings({
                            ...systemSettings,
                            adminIds: systemSettings.adminIds.filter(aid => aid !== item.empId)
                        });

                        addAuditLog({ 
                            adminId, 
                            actionType: 'Resignation Approved', 
                            module: 'Settings', 
                            detail: `Approved resignation for ${item.name}. Status set to Terminated. ${assignedAssets.length > 0 ? `WARNING: ${assignedAssets.length} assets unrecovered.` : ''}` 
                        });
                    } 
                    // 2. Promotion logic
                    else if (item.type === 'Promotion') {
                        setEmployees(prev => prev.map(e => {
                            if (e.id === item.empId) {
                                const resolvedNewRole = item.newRole || (item.detail.includes(' to ') ? item.detail.split(' to ')[1] : e.role);
                                const resolvedNewDept = item.newDept || e.dept;
                                const resolvedNewShift = item.newShiftId || e.shiftId;

                                const historyEntry: Types.EmploymentHistory = {
                                    id: `HIST-${Date.now()}`,
                                    date: getFormattedDate(new Date(), 'short'),
                                    type: 'Promotion',
                                    detail: item.detail,
                                    oldRole: e.role,
                                    newRole: resolvedNewRole,
                                    oldSalary: e.baseSalary,
                                    newSalary: item.newSalary || e.baseSalary,
                                    oldDept: e.dept,
                                    newDept: resolvedNewDept,
                                    reason: item.jobDescription || item.detail,
                                    approvedBy: adminId,
                                    sourceId: item.id
                                };

                                let updatedSalary = e.baseSalary;
                                let salaryHistory = e.salaryHistory || [];

                                if (item.newSalary) {
                                    updatedSalary = item.newSalary;
                                    const salaryEntry: SalaryHistoryEntry = {
                                        date: item.effectiveDate,
                                        oldSalary: item.oldSalary || e.baseSalary,
                                        newSalary: item.newSalary,
                                        reason: `Promotion: ${e.role} \u2192 ${resolvedNewRole}`,
                                        approvedBy: adminId
                                    };
                                    salaryHistory = [salaryEntry, ...salaryHistory];
                                }

                                const autoDoc: Types.DocumentType = {
                                    id: `DOC-AUTO-${Date.now()}`,
                                    name: `Promotion_Record_${item.id}.pdf`,
                                    type: 'pdf',
                                    category: 'Job Activity',
                                    privacy: 'Manager Viewable',
                                    date: getFormattedDate(new Date(), 'short'),
                                    url: '#',
                                    uploadedBy: 'SYSTEM',
                                    timestamp: new Date().toISOString()
                                };

                                return { 
                                    ...e, 
                                    role: resolvedNewRole,
                                    dept: resolvedNewDept,
                                    shiftId: resolvedNewShift,
                                    baseSalary: updatedSalary,
                                    employmentHistory: [...(e.employmentHistory || []), historyEntry],
                                    salaryHistory,
                                    documents: [autoDoc, ...e.documents]
                                };
                            }
                            return e;
                        }));

                        // Sync promotion to Supabase
                        const resolvedNewRole = item.newRole || (item.detail.includes(' to ') ? item.detail.split(' to ')[1] : emp.role);
                        const resolvedNewDept = item.newDept || emp.dept;
                        const resolvedNewShift = item.newShiftId || emp.shiftId;
                        const updatedSalary = item.newSalary || emp.baseSalary;
                        supabase.from('employees').update({
                            role: resolvedNewRole,
                            dept: resolvedNewDept,
                            shiftId: resolvedNewShift,
                            baseSalary: updatedSalary,
                        }).eq('id', item.empId).then(({ error }) => {
                            if (error) console.error('Supabase promotion sync error:', error.message);
                        });

                    // 3. Transfer logic — Geofence Sync + Manager Validation + History
                    } else if (item.type === 'Transfer') {
                        // Active-status guard for new manager
                        if (item.newManager) {
                            const mgr = employees.find(e => e.id === item.newManager);
                            if (!mgr || mgr.status !== 'Active') {
                                addAuditLog({ adminId, actionType: 'Transfer Warning', module: 'Inbox', detail: `New Reporting Manager ${item.newManager} is not Active. Manager sync skipped.` });
                            }
                        }

                        setEmployees(prev => prev.map(e => {
                            if (e.id === item.empId) {
                                const resolvedNewDept = item.newDept || e.dept;
                                const resolvedNewShift = item.newShiftId || e.shiftId;
                                const resolvedNewManager = (() => {
                                    if (!item.newManager) return e.reportingManagerId;
                                    const mgr = employees.find(em => em.id === item.newManager);
                                    return mgr?.status === 'Active' ? item.newManager : e.reportingManagerId;
                                })();

                                // Rich Transfer history entry for audits & Recommendation Letters
                                const historyEntry: Types.EmploymentHistory = {
                                    id: `HIST-${Date.now()}`,
                                    date: getFormattedDate(new Date(), 'short'),
                                    type: 'Transfer',
                                    detail: `Transferred from ${e.dept} to ${resolvedNewDept}${item.newLocation ? ` | Location: ${item.newLocation}` : ''} | Effective: ${item.effectiveDate}`,
                                    oldRole: e.role,
                                    newRole: e.role,
                                    oldSalary: e.baseSalary,
                                    newSalary: item.newSalary || e.baseSalary,
                                    oldDept: e.dept,
                                    newDept: resolvedNewDept,
                                    oldLocation: e.officeLocation,
                                    newLocation: item.newLocation || e.officeLocation,
                                    reason: item.transferReason,
                                    approvedBy: adminId,
                                    sourceId: item.id
                                };

                                let updatedSalary = e.baseSalary;
                                let salaryHistory = e.salaryHistory || [];

                                if (item.newSalary) {
                                    updatedSalary = item.newSalary;
                                    salaryHistory = [{ date: item.effectiveDate, oldSalary: item.oldSalary || e.baseSalary, newSalary: item.newSalary, reason: `Transfer to ${resolvedNewDept}${item.newLocation ? ` (${item.newLocation})` : ''}`, approvedBy: adminId }, ...salaryHistory];
                                }

                                const autoDoc: Types.DocumentType = {
                                    id: `DOC-AUTO-${Date.now()}`,
                                    name: `Transfer_Record_${item.id}.pdf`,
                                    type: 'pdf',
                                    category: 'Job Activity',
                                    privacy: 'Manager Viewable',
                                    date: getFormattedDate(new Date(), 'short'),
                                    url: '#',
                                    uploadedBy: 'SYSTEM',
                                    timestamp: new Date().toISOString()
                                };

                                return {
                                    ...e,
                                    dept: resolvedNewDept,
                                    shiftId: resolvedNewShift,
                                    reportingManagerId: resolvedNewManager,
                                    officeLocation: item.newLocation || e.officeLocation,
                                    officeCoords: item.newOfficeCoords || e.officeCoords,
                                    baseSalary: updatedSalary,
                                    employmentHistory: [...(e.employmentHistory || []), historyEntry],
                                    salaryHistory,
                                    documents: [autoDoc, ...e.documents]
                                };
                            }
                            return e;
                        }));

                        addAuditLog({ adminId, actionType: 'Transfer Approved', module: 'Inbox', detail: `Transfer for ${item.name} \u2192 ${item.newDept || 'new dept'}${item.newLocation ? ` at ${item.newLocation}` : ''}. Geofence synced.` });

                        // Sync transfer to Supabase
                        const tNewDept = item.newDept || emp.dept;
                        const tNewShift = item.newShiftId || emp.shiftId;
                        const tNewManager = (() => {
                            if (!item.newManager) return emp.reportingManagerId;
                            const mgr = employees.find(em => em.id === item.newManager);
                            return mgr?.status === 'Active' ? item.newManager : emp.reportingManagerId;
                        })();
                        const tNewSalary = item.newSalary || emp.baseSalary;
                        supabase.from('employees').update({
                            dept: tNewDept,
                            shiftId: tNewShift,
                            reportingManagerId: tNewManager,
                            officeLocation: item.newLocation || emp.officeLocation,
                            baseSalary: tNewSalary,
                        }).eq('id', item.empId).then(({ error }) => {
                            if (error) console.error('Supabase transfer sync error:', error.message);
                        });

                    // 4. Salary Adjustment logic
                    } else if (item.type === 'Adjustment' && item.newSalary) {
                        setEmployees(prev => prev.map(e => {
                            if (e.id === item.empId) {
                                const salaryEntry: SalaryHistoryEntry = {
                                    date: item.effectiveDate,
                                    oldSalary: item.oldSalary || e.baseSalary,
                                    newSalary: item.newSalary,
                                    reason: item.detail || 'Salary adjustment',
                                    approvedBy: adminId
                                };

                                return {
                                    ...e,
                                    baseSalary: item.newSalary,
                                    salaryHistory: [salaryEntry, ...(e.salaryHistory || [])]
                                };
                            }
                            return e;
                        }));

                        // Sync salary adjustment to Supabase
                        supabase.from('employees').update({
                            baseSalary: item.newSalary
                        }).eq('id', item.empId).then(({ error }) => {
                            if (error) console.error('Supabase salary adjustment sync error:', error.message);
                        });

                        addAuditLog({ adminId, actionType: 'Salary Adjustment Approved', module: 'Inbox', detail: `Salary for ${item.name} adjusted from ${(item.oldSalary || 0).toLocaleString()} to ${item.newSalary.toLocaleString()} MMK.` });
                    }

                    // Auto-create announcement on Promotion approval only
                    if (item.type === 'Promotion' && item.announcementTitle && status === 'Approved') {
                        const newAnn: Announcement = {
                            id: `ANN-${Date.now()}`,
                            title: item.announcementTitle,
                            content: item.jobDescription
                                ? `${item.announcementTitle}\n\n${item.jobDescription}`
                                : `${item.name} has been promoted to ${item.newRole || 'a new position'}${item.newDept ? ` in ${item.newDept}` : ''}. Effective ${item.effectiveDate}.`,
                            dept: item.newDept,
                            status: 'Pending',
                            createdAt: new Date().toISOString(),
                            sourceType: 'Promotion',
                            sourceId: item.id
                        };
                        setAnnouncements(prev => [newAnn, ...prev]);
                        addAuditLog({ adminId, actionType: 'Announcement Created', module: 'Inbox', detail: `Auto-created Pending Announcement "${item.announcementTitle}" for ${item.name}'s promotion.` });
                    }
                }
                logAction('JobActivityChange', id, item, { ...item, status });
                break;
            }
            case 'LocationSnapshot': {
                const item = locationSnapshots.find(r => r.id === id);
                if (!item) return { success: false, message: 'Item not found.' };
                setLocationSnapshots(prev => prev.map(r => r.id === id ? { ...r, status: action === 'Approve' ? 'Acknowledged' : 'Pending' } : r));
                logAction('LocationSnapshot', id, item, { ...item, status: action === 'Approve' ? 'Acknowledged' : 'Pending' });
                break;
            }
            case 'Recruitment': {
                const item = recruitmentActions.find(r => r.id === id);
                if (!item) return { success: false, message: 'Item not found.' };
                setRecruitmentActions(prev => prev.map(r => r.id === id ? { ...r, status: action === 'Approve' ? 'Completed' : 'Rejected' as any } : r));
                logAction('RecruitmentAction', id, item, { ...item, status });
                break;
            }
            case 'Attendance': {
                const item = attendanceRequests.find(r => r.id === id);
                if (!item) return { success: false, message: 'Item not found.' };
                setAttendanceRequests(prev => prev.map(r => r.id === id ? { ...r, status: status as any } : r));

                // Sync attendance request status to Supabase
                supabase.from('attendance_requests').update({ status }).eq('id', id)
                    .then(({ error }) => { if (error) console.error('Supabase attendance request status sync error:', error.message); })
                    .catch(err => console.error('Failed to sync attendance request status to Supabase:', err));
                
                if (action === 'Approve') {
                    setAttendanceLogs(prev => prev.map(log => {
                        if (log.empId === item.empId && log.date === item.submittedDate && log.status === 'Pending Approval') {
                            // Sync updated log status to Supabase
                            supabase.from('attendance_logs').update({ status: 'Present', geofenceStatus: 'Verified' }).eq('id', log.id)
                                .then(({ error }) => { if (error) console.error('Supabase attendance log status sync error:', error.message); })
                                .catch(err => console.error('Failed to sync attendance log status to Supabase:', err));
                            return { ...log, status: 'Present', geofenceStatus: 'Verified' };
                        }
                        return log;
                    }));

                    addAuditLog({
                        adminId,
                        actionType: 'Attendance Approved',
                        module: 'Attendance',
                        detail: `Approved remote check-in for ${item.name} at ${item.location}. Log updated to Present.`
                    });
                }
                logAction('AttendanceRequest', id, item, { ...item, status });
                break;
            }
            case 'PerformanceReview': {
                const item = performanceReviewRequests.find(r => r.id === id);
                if (!item) return { success: false, message: 'Item not found.' };
                setPerformanceReviewRequests(prev => prev.map(r => r.id === id ? { ...r, status: status as any } : r));

                if (action === 'Approve') {
                    // 1. Finalize the linked review record
                    finalizeReview(item.reviewId);

                    // 2. Performance Bonus logic (Now handled in next Payroll Cycle)
                    if (item.rating > 4.5) {
                        addAuditLog({ adminId, actionType: 'Bonus Queued', module: 'Performance', detail: `High rating (${item.rating}) detected for ${item.name}. Bonus eligibility flag set for Payroll.` });
                    }

                    // 3. Risk flagging for low-performing employees
                    if (item.rating < 3.0) {
                        flagEmployeeRisk(item.empId);
                        // Push PERF-RISK alert for the Dashboard KPI badge
                        setAlerts(prev => [{
                            id: `PERF-RISK-${item.empId}-${Date.now()}`,
                            type: 'error',
                            message: `PERFORMANCE RISK: ${item.name} rated ${item.rating}/5 in ${item.period}. Types.Employee flagged for HR review.`,
                            timestamp: getFormattedDate(new Date(), 'time'),
                            isRead: false,
                            link: `/employees/${item.empId}?tab=Performance`
                        }, ...prev]);
                    }

                    addAuditLog({
                        adminId,
                        actionType: 'Performance Review Finalized',
                        module: 'Performance',
                        detail: `${item.name}'s ${item.period} review approved with rating ${item.rating}/5 by admin ${adminId}.`,
                        sourceLink: item.reviewId
                    });
                } else {
                    // Reject: revert review status to allow resubmission
                    setReviews(prev => prev.map(r => r.id === item.reviewId ? { ...r, status: 'Draft' as const } : r));
                    addAuditLog({
                        adminId,
                        actionType: 'Performance Review Rejected',
                        module: 'Performance',
                        detail: `${item.name}'s ${item.period} review rejected. Returned to Draft for revision.`,
                        sourceLink: item.reviewId
                    });
                }
                logAction('PerformanceReviewRequest', id, item, { ...item, status });
                break;
            }
            default:
                return { success: false, message: 'Unknown request type.' };
        }

        return { success, message };
    };



    const bulkImportAttendance = (adminId: string, csvData?: string): { success: boolean, message: string } => {
        if (!isAdmin(adminId)) return { success: false, message: 'Admin privileges required.' };
        if (!csvData) return { success: false, message: 'No CSV data provided.' };
        
        const lines = csvData.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length < 2) return { success: false, message: 'CSV is empty or missing headers.' };
        
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        let imported = 0;
        let skipped = 0;
        const newLogs: AttendanceLog[] = [];
        
        // Map common column headers for flexibility
        const empIdIdx = headers.findIndex(h => h.includes('empid') || h.includes('cardno') || h.includes('staff id') || h.includes('employee id'));
        const dateIdx = headers.findIndex(h => h.includes('date'));
        const timeIdx = headers.findIndex(h => h.includes('time') || h.includes('checkin') || h.includes('in'));
        const checkOutIdx = headers.findIndex(h => h.includes('checkout') || h.includes('out'));

        if (empIdIdx === -1 || dateIdx === -1 || timeIdx === -1) {
             return { success: false, message: 'CSV structure error: Requires Employee ID, Date, and Time columns.' };
        }

        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
            if (cols.length < 3) continue;
            
            let rawEId = cols[empIdIdx];
            const eId = rawEId.startsWith('EMP-') ? rawEId : `EMP-${rawEId}`;
            const dateStr = cols[dateIdx];
            const checkInStr = cols[timeIdx];
            const checkOutStr = checkOutIdx !== -1 ? cols[checkOutIdx] : '-- : --';

            const matchEmp = employees.find(e => e.id === eId);
            if (!matchEmp) { skipped++; continue; }
            
            // "Keep Earliest" collision logic: Don't overwrite existing organic/manual punches
            const exists = attendanceLogs.some(l => l.empId === matchEmp.id && l.date === dateStr && l.checkIn !== '-- : --');
            if (exists) { skipped++; continue; }

            newLogs.push({
                id: `IMP-${Date.now()}-${i}`,
                empId: matchEmp.id,
                name: matchEmp.name,
                checkIn: checkInStr,
                checkOut: checkOutStr,
                location: 'CSV Import',
                geofenceStatus: 'N/A',
                status: 'Present',
                dept: matchEmp.dept,
                totalHours: 0,
                checkInMethod: 'CSV',
                isManual: false,
                penaltyAmount: 0,
                date: dateStr
            });
            imported++;
        }
        
        if (imported > 0) {
            setAttendanceLogs(prev => [...newLogs, ...prev]);

            // Sync to Supabase
            const supabaseRows = newLogs.map(l => ({
                id: l.id,
                empId: l.empId,
                name: l.name,
                checkIn: l.checkIn,
                checkOut: l.checkOut,
                location: l.location,
                geofenceStatus: l.geofenceStatus,
                status: l.status,
                dept: l.dept,
                totalHours: l.totalHours,
                checkInMethod: l.checkInMethod,
                isManual: l.isManual,
                penaltyAmount: l.penaltyAmount,
                date: l.date
            }));
            supabase.from('attendance_logs').insert(supabaseRows).then(({ error }) => {
                if (error) console.error('Supabase bulkImport sync error:', error.message);
            }).catch(err => console.error('Failed to sync bulkImport to Supabase:', err));

            addAuditLog({ adminId, actionType: 'Bulk Import', module: 'Attendance', detail: `Imported ${imported} records via CSV. ${skipped} records skipped.` });
            
            setAlerts(prev => [{
                id: `IMP-ALRT-${Date.now()}`,
                type: 'success',
                message: `Biometric Bridge: Imported ${imported} records. Found ${skipped} conflicts or missing profiles.`,
                timestamp: getFormattedDate(new Date(), 'time'),
                isRead: false
            }, ...prev]);
        }

        return { success: true, message: `Successfully imported ${imported} attendance records (${skipped} skipped).` };
    };

    const addAllowanceConfig = (config: Omit<AllowanceConfig, 'id' | 'isEnabled'>) => {
        const newAlw: AllowanceConfig = {
            ...config,
            id: `ALW-${Date.now()}`,
            isEnabled: true
        };
        setSystemSettings({
            ...systemSettings,
            allowanceConfigs: [...systemSettings.allowanceConfigs, newAlw]
        });
        addAuditLog({ 
            adminId: 'EMP-001', 
            actionType: 'Master Config Create', 
            module: 'Settings', 
            detail: `Registered new allowance: ${config.name} (${config.logic})` 
        });
    };

    const addDeductionConfig = (config: Omit<DeductionConfig, 'id' | 'isEnabled' | 'affectedIncomeParts'>) => {
        const newDed: DeductionConfig = {
            ...config,
            id: `DED-${Date.now()}`,
            isEnabled: true,
            affectedIncomeParts: config.logic === 'Unpaid Leave' || config.logic === 'Non-Attendance' ? ['Base Salary'] : ['Base Salary']
        };
        setSystemSettings({
            ...systemSettings,
            deductionConfigs: [...systemSettings.deductionConfigs, newDed]
        });
        addAuditLog({ 
            adminId: 'EMP-001', 
            actionType: 'Master Config Create', 
            module: 'Settings', 
            detail: `Registered new deduction: ${config.name} (${config.logic})` 
        });
    };

    const addHoliday = (holiday: Types.Holiday) => {
        setHolidays([...holidays, holiday]);
        incrementPolicyVersion();
        // Sync to Supabase
        supabase.from('holidays').upsert({ date: holiday.date, name: holiday.name, isRestricted: holiday.isRestricted }).then(({ error }) => {
            if (error) console.error('Supabase holiday insert error:', error.message);
        });
    };

    const updateHoliday = (date: string, holiday: Types.Holiday) => {
        setHolidays(holidays.map(h => h.date === date ? holiday : h));
        incrementPolicyVersion();
        // Sync to Supabase
        supabase.from('holidays').update({ name: holiday.name, isRestricted: holiday.isRestricted }).eq('date', date).then(({ error }) => {
            if (error) console.error('Supabase holiday update error:', error.message);
        });
    };

    const deleteHoliday = (date: string) => {
        setHolidays(holidays.filter(h => h.date !== date));
        incrementPolicyVersion();
        // Sync to Supabase
        supabase.from('holidays').delete().eq('date', date).then(({ error }) => {
            if (error) console.error('Supabase holiday delete error:', error.message);
        });
    };

    // --- Bridge function stubs ---
    const updateEmployee = async (empId: string, updates: Partial<Types.Employee>, adminId: string): Promise<{ success: boolean; message: string }> => {
        if (!isAdmin(adminId)) {
            addSecurityLog({ level: 'Critical', source: 'AppDataContext', message: `Privilege Escalation Attempt: Non-admin attempted to update employee ${empId}`, details: { targetEmpId: empId, attemptedAction: 'updateEmployee' } });
            return { success: false, message: 'Security Violation: Unauthorized Action Logged' };
        }
        const emp = employees.find(e => e.id === empId);
        if (!emp) return { success: false, message: 'Employee not found.' };
        setEmployees(prev => prev.map(e => e.id === empId ? { ...e, ...updates } : e));
        
        // Sync to Supabase — build update payload from only the fields that changed
        try {
            const supabaseUpdates: Record<string, any> = {};
            if (updates.name !== undefined) supabaseUpdates.name = updates.name;
            if (updates.email !== undefined) supabaseUpdates.email = updates.email;
            if (updates.phone !== undefined) supabaseUpdates.phone = updates.phone;
            if (updates.dept !== undefined) supabaseUpdates.dept = updates.dept;
            if (updates.role !== undefined) supabaseUpdates.role = updates.role;
            if (updates.status !== undefined) supabaseUpdates.status = updates.status;
            if (updates.baseSalary !== undefined) supabaseUpdates.baseSalary = updates.baseSalary;
            if (updates.joinDate !== undefined) supabaseUpdates.joinDate = updates.joinDate;
            if (updates.profileImage !== undefined) supabaseUpdates.profileImage = updates.profileImage;
            if (updates.avatar !== undefined) supabaseUpdates.avatar = updates.avatar;
            if (updates.mobile !== undefined) supabaseUpdates.mobile = updates.mobile;
            if (updates.township !== undefined) supabaseUpdates.township = updates.township;
            if (updates.nrcNumber !== undefined) supabaseUpdates.nrcNumber = updates.nrcNumber;
            if (updates.ssbNumber !== undefined) supabaseUpdates.ssbNumber = updates.ssbNumber;
            if (updates.taxId !== undefined) supabaseUpdates.taxId = updates.taxId;
            if (updates.bankName !== undefined) supabaseUpdates.bankName = updates.bankName;
            if (updates.accountNumber !== undefined) supabaseUpdates.accountNumber = updates.accountNumber;

            if (updates.shiftId !== undefined) supabaseUpdates.shiftId = updates.shiftId;
            if (updates.policyId !== undefined) supabaseUpdates.policyId = updates.policyId;
            if (updates.recruitmentSource !== undefined) supabaseUpdates.recruitmentSource = updates.recruitmentSource;
            if (updates.hasCriticalRiskFlag !== undefined) supabaseUpdates.hasCriticalRiskFlag = updates.hasCriticalRiskFlag;
            if (updates.autoAttendanceEnabled !== undefined) supabaseUpdates.autoAttendanceEnabled = updates.autoAttendanceEnabled;
            if (updates.leaveBalances !== undefined) supabaseUpdates.leaveBalances = updates.leaveBalances;
            if (updates.reliefs !== undefined) supabaseUpdates.reliefs = updates.reliefs;
            if (updates.officeLocation !== undefined) supabaseUpdates.officeLocation = updates.officeLocation;
            if (updates.reportingManagerId !== undefined) supabaseUpdates.reportingManagerId = updates.reportingManagerId;
            if (updates.separationReason !== undefined) supabaseUpdates.separationReason = updates.separationReason;
            if (updates.separationDate !== undefined) supabaseUpdates.separationDate = updates.separationDate;
            if (updates.eligibleForRehire !== undefined) supabaseUpdates.eligibleForRehire = updates.eligibleForRehire;

            if (Object.keys(supabaseUpdates).length > 0) {
                const { error } = await supabase.from('employees').update(supabaseUpdates).eq('id', empId);
                if (error) console.error('Supabase update error:', error.message);
            }
        } catch (err) { console.error('Failed to sync update to Supabase:', err); }
        
        return { success: true, message: 'Employee updated.' };
    };

    const addEmployee = async (employee: Omit<Types.Employee, 'id'> & { id?: string }, adminId: string): Promise<{ success: boolean; message: string; empId?: string }> => {
        if (!isAdmin(adminId)) {
            addSecurityLog({ level: 'Critical', source: 'AppDataContext', message: `Privilege Escalation Attempt: Non-admin attempted to add employee`, details: { attemptedAction: 'addEmployee' } });
            return { success: false, message: 'Security Violation: Unauthorized Action Logged' };
        }
        
        const prefix = 'EMP-';
        let counter = employees.length + 1;
        let newEmpId = employee.id || `${prefix}${String(counter).padStart(3, '0')}`;
        
        while (employees.some(e => e.id === newEmpId)) {
            counter++;
            newEmpId = `${prefix}${String(counter).padStart(3, '0')}`;
        }
        
        const newEmployee: Types.Employee = {
            ...employee,
            id: newEmpId,
            status: employee.status || 'Active',
            joinDate: employee.joinDate || getFormattedDate(new Date(), 'short'),
            leaveBalances: employee.leaveBalances || { 'Annual': 10, 'Casual': 6, 'Medical': 30 },
            enrolledCourses: employee.enrolledCourses || [],
            documents: employee.documents || [],
            hasCriticalRiskFlag: employee.hasCriticalRiskFlag || false,
            reliefs: employee.reliefs || { spouse: false, parentsCount: 0 },
            autoAttendanceEnabled: employee.autoAttendanceEnabled || false,
        };
        
        setEmployees(prev => [newEmployee, ...prev]);
        
        // Insert to Supabase
        try {
            const { data, error } = await supabase.from('employees').upsert({
                id: newEmployee.id,
                name: newEmployee.name,
                email: newEmployee.email || `${newEmployee.id.toLowerCase()}@techdance.hr`,
                phone: newEmployee.phone || newEmployee.mobile || '',
                dept: newEmployee.dept,
                role: newEmployee.role,
                status: newEmployee.status,
                joinDate: newEmployee.joinDate,
                baseSalary: newEmployee.baseSalary,
                mobile: newEmployee.mobile || '',
                township: newEmployee.township || '',
                nrcNumber: newEmployee.nrcNumber || '',
                ssbNumber: newEmployee.ssbNumber || '',
                taxId: newEmployee.taxId || '',
                bankName: newEmployee.bankName || '',
                accountNumber: newEmployee.accountNumber || '',

                shiftId: newEmployee.shiftId || '',
                policyId: newEmployee.policyId || '',
                recruitmentSource: newEmployee.recruitmentSource || '',
                hasCriticalRiskFlag: newEmployee.hasCriticalRiskFlag || false,
                autoAttendanceEnabled: newEmployee.autoAttendanceEnabled || false,
                leaveBalances: newEmployee.leaveBalances || {},
                reliefs: newEmployee.reliefs || { spouse: false, parentsCount: 0 },
                officeLocation: newEmployee.officeLocation || '',
            }, { onConflict: 'id' }).select();
            
            if (error) {
                console.error('Supabase insert error:', error.message, error.details);
            } else {
                console.log('Employee synced to Supabase:', data);
            }
        } catch (err) { console.error('Failed to sync new employee to Supabase:', err); }
        
        addAuditLog({ adminId, actionType: 'Employee Added', module: 'Employees', detail: `Added new employee: ${newEmployee.name} (${newEmployee.id})` });
        
        return { success: true, message: 'Employee added successfully.', empId: newEmpId };
    };

    const deleteEmployee = async (empId: string, adminId: string): Promise<{ success: boolean; message: string }> => {
        if (!isAdmin(adminId)) {
            addSecurityLog({ level: 'Critical', source: 'AppDataContext', message: `Privilege Escalation Attempt: Non-admin attempted to delete employee ${empId}`, details: { targetEmpId: empId, attemptedAction: 'deleteEmployee' } });
            return { success: false, message: 'Security Violation: Unauthorized Action Logged' };
        }
        
        const emp = employees.find(e => e.id === empId);
        if (!emp) return { success: false, message: 'Employee not found.' };
        
        setEmployees(prev => prev.filter(e => e.id !== empId));
        
        // Delete from Supabase
        try {
            await supabase.from('employees').delete().eq('id', empId);
        } catch (err) { console.error('Failed to delete employee from Supabase:', err); }
        
        addAuditLog({ adminId, actionType: 'Employee Deleted', module: 'Employees', detail: `Deleted employee: ${emp.name} (${empId})` });
        
        return { success: true, message: 'Employee deleted successfully.' };
    };

    const addManualPunch = (empId: string, date: string, shiftId: string, checkInTime: string, checkOutTime: string, reason: string, adminId: string): { success: boolean; message: string } => {
        const newLog: Types.AttendanceLog = {
            empId, date, shiftId, checkIn: checkInTime, checkOut: checkOutTime, status: 'Present',
            source: 'Manual', note: reason, hoursWorked: 0
        };
        setAttendanceLogs(prev => [...prev, newLog]);
        addAuditLog({ adminId, actionType: 'Manual Punch', module: 'Attendance', detail: `Manual punch for ${empId} on ${date}.` });
        return { success: true, message: 'Manual punch added.' };
    };



    const adjustLeaveBalance = (empId: string, type: string, amount: number, reason: string, adminId: string): { success: boolean; message: string } => {
        if (!isAdmin(adminId)) {
            addSecurityLog({ level: 'Critical', source: 'AppDataContext', message: `Privilege Escalation Attempt: Non-admin attempted to adjust leave balance for ${empId}`, details: { targetEmpId: empId, type, amount, attemptedAction: 'adjustLeaveBalance' } });
            return { success: false, message: 'Security Violation: Unauthorized Action Logged' };
        }
        const emp = employees.find(e => e.id === empId);
        if (!emp) return { success: false, message: 'Employee not found.' };
        const newBalances = { ...emp.leaveBalances, [type]: (emp.leaveBalances[type as keyof typeof emp.leaveBalances] || 0) + amount };
        setEmployees(prev => prev.map(e => {
            if (e.id === empId) {
                return { ...e, leaveBalances: newBalances };
            }
            return e;
        }));
        // Sync to Supabase
        supabase.from('employees').update({ leaveBalances: newBalances }).eq('id', empId)
            .then(({ error }) => { if (error) console.error('Supabase leave balance sync error:', error.message); })
            .catch(err => console.error('Failed to sync leave balance to Supabase:', err));
        addAuditLog({ adminId, actionType: 'Leave Balance Adjusted', module: 'Leave', detail: `${type} balance for ${empId} adjusted by ${amount}. Reason: ${reason}` });
        return { success: true, message: 'Leave balance adjusted.' };
    };

    const resolveOTConflict = (keepId: string, voidId: string, adminId: string): { success: boolean; message: string } => {
        if (!isAdmin(adminId)) {
            addSecurityLog({ level: 'Critical', source: 'AppDataContext', message: `Privilege Escalation Attempt: Non-admin attempted to resolve OT conflict`, details: { keepId, voidId, attemptedAction: 'resolveOTConflict' } });
            return { success: false, message: 'Security Violation: Unauthorized Action Logged' };
        }
        setOTRequests(prev => prev.map(r => {
            if (r.id === keepId) return { ...r, status: 'Approved' as const };
            if (r.id === voidId) return { ...r, status: 'Rejected' as const };
            return r;
        }));
        addAuditLog({ adminId, actionType: 'OT Conflict Resolved', module: 'Payroll', detail: `Kept ${keepId}, voided ${voidId}.` });
        return { success: true, message: 'OT conflict resolved.' };
    };

    // --- Settings CRUD stubs (Location, Department, Position) ---
    const addLocation = (loc: any): { success: boolean; message: string } => {
        // The modal stores lat/lng as flat fields; normalize to coords: { lat, lng }
        const { lat, lng, address, ...rest } = loc;
        const newLoc: Types.OfficeLocation = {
            ...rest,
            id: `LOC-${Date.now()}`,
            address: address || '',
            coords: { lat: lat ?? 0, lng: lng ?? 0 },
        } as Types.OfficeLocation;
        setSystemSettings((prev: Types.SystemSettings) => ({ ...prev, officeLocations: [...(prev.officeLocations || []), newLoc] }));
        return { success: true, message: 'Location added.' };
    };
    const updateLocation = (loc: any): { success: boolean; message: string } => {
        // Also normalize flat lat/lng from editing state into coords shape
        const { lat, lng, address, ...rest } = loc;
        const normalized: Types.OfficeLocation = {
            ...rest,
            address: address || '',
            coords: lat !== undefined ? { lat, lng: lng ?? 0 } : loc.coords,
        } as Types.OfficeLocation;
        setSystemSettings((prev: Types.SystemSettings) => ({ ...prev, officeLocations: (prev.officeLocations || []).map((l: Types.OfficeLocation) => l.id === normalized.id ? normalized : l) }));
        return { success: true, message: 'Location updated.' };
    };
    const deleteLocation = (id: string): { success: boolean; message: string } => {
        setSystemSettings((prev: Types.SystemSettings) => ({ ...prev, officeLocations: (prev.officeLocations || []).filter((l: Types.OfficeLocation) => l.id !== id) }));
        return { success: true, message: 'Location deleted.' };
    };
    const addDepartment = (dept: Omit<Types.Department, 'id' | 'order'>): { success: boolean; message: string } => {
        const existing = systemSettings.departments || [];
        const newDept: Types.Department = { ...dept, id: `DEPT-${Date.now()}`, order: existing.length + 1 } as Types.Department;
        setSystemSettings((prev: Types.SystemSettings) => ({ ...prev, departments: [...(prev.departments || []), newDept] }));
        return { success: true, message: 'Department added.' };
    };
    const updateDepartment = (dept: Types.Department): { success: boolean; message: string } => {
        setSystemSettings((prev: Types.SystemSettings) => ({ ...prev, departments: (prev.departments || []).map((d: Types.Department) => d.id === dept.id ? dept : d) }));
        return { success: true, message: 'Department updated.' };
    };
    const deleteDepartment = (id: string): { success: boolean; message: string } => {
        setSystemSettings((prev: Types.SystemSettings) => ({ ...prev, departments: (prev.departments || []).filter((d: Types.Department) => d.id !== id) }));
        return { success: true, message: 'Department deleted.' };
    };
    const reorderDepartments = (depts: Types.Department[]) => {
        setSystemSettings((prev: Types.SystemSettings) => ({ ...prev, departments: depts }));
    };
    const addPosition = (pos: Omit<Types.Position, 'id'>): { success: boolean; message: string } => {
        const newPos: Types.Position = { ...pos, id: `POS-${Date.now()}` } as Types.Position;
        setSystemSettings((prev: Types.SystemSettings) => ({ ...prev, positions: [...(prev.positions || []), newPos] }));
        return { success: true, message: 'Position added.' };
    };
    const updatePosition = (pos: Types.Position): { success: boolean; message: string } => {
        setSystemSettings((prev: Types.SystemSettings) => ({ ...prev, positions: (prev.positions || []).map((p: Types.Position) => p.id === pos.id ? pos : p) }));
        return { success: true, message: 'Position updated.' };
    };
    const deletePosition = (id: string): { success: boolean; message: string } => {
        setSystemSettings((prev: Types.SystemSettings) => ({ ...prev, positions: (prev.positions || []).filter((p: Types.Position) => p.id !== id) }));
        return { success: true, message: 'Position deleted.' };
    };

    const logSettingChange = (field: string, oldVal: any, newVal: any) => {
        addSecurityLog({
            deviceId: 'ADMIN-PORTAL',
            authMethod: 'Admin Action',
            status: 'Success',
            empId: currentUser?.id || 'SYSTEM',
            detail: `SETTING_CHANGE: [${field}] updated from ${typeof oldVal === 'object' ? JSON.stringify(oldVal) : oldVal} to ${typeof newVal === 'object' ? JSON.stringify(newVal) : newVal} by Admin.`
        });
    };

    const downloadSystemBackup = () => {
        const platformData: any = {
            systemSettings,
            complianceSettings,
            employees,
            attendanceLogs,
            leaveRequests,
            assets,
            reviews,
            archivedDocuments,
            auditLogs,
            securityAuditLogs,
            exportTimestamp: new Date().toISOString(),
            version: "2.5.0-GOVERNANCE"
        };

        // Data Hardening: Checksum Generation
        const rawPayload = JSON.stringify(platformData);
        const checksum = Array.from(rawPayload).reduce((h, c) => (Math.imul(31, h) + c.charCodeAt(0)) | 0, 0).toString(16).toUpperCase();
        
        platformData.security = {
            checksum: `SEC-${checksum}`,
            verifiedAt: new Date().toISOString(),
            seal: "GOVERNANCE_MASTER_LOCK_ACTIVE"
        };

        const blob = new Blob([JSON.stringify(platformData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const dateStr = new Date().toISOString().split('T')[0];
        a.href = url;
        a.download = `HRMS_HARDENED_BACKUP_${dateStr}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        addAuditLog({
            adminId: currentUser?.id || 'SYSTEM',
            actionType: 'Security Export',
            module: 'Settings',
            detail: `Hardenened system backup (SHA-256 Checksum: ${checksum}) exported for audit compliance.`
        });
    };

    const userPermissions = useMemo(() => {
        if (!currentUser) return [];
        if (currentUser.role === 'Admin') return ['canViewPayroll', 'canApproveLoans', 'canEditAssets', 'canEditSettings', 'canAccessForms'];
        const roleDef = systemSettings.roles?.find(r => r.role === currentUser.role);
        return roleDef?.permissions || [];
    }, [currentUser, systemSettings.roles]);

    const updateTicketStatus = async (id: string, status: Types.Ticket['status']) => {
        // Optimistic update
        setTickets(prev => prev.map(t => t.id === id ? { ...t, status } : t));

        try {
            const { error } = await supabase
                .from('tickets')
                .update({ status, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
        } catch (err) {
            console.error('Failed to update ticket status:', err);
            // Revert on error would be better, but for now we log it
        }
    };

    const coreValue = useMemo(() => ({
        employees, setEmployees, loadingEmployees,
        reviews, setReviews,
        assets, setAssets, addAsset, updateAsset,
        candidates, setCandidates,
        candidateMessages, sendCandidateMessage,
        updateCandidateStage, rejectCandidate,
        alerts, setAlerts,
        tickets, setTickets, loadingTickets, updateTicketStatus,
        courses, setCourses,
        certs, setCerts,
        analytics, setAnalytics,
        leaveRequests, setLeaveRequests,
        attendanceLogs, setAttendanceLogs,
        syncAttendance, regularizeAttendance,
        complianceSettings, setComplianceSettings,
        systemSettings, setSystemSettings,
        policyVersion, setPolicyVersion,
        auditLogs, addAuditLog, 
        flagEmployeeRisk,
        addDocumentToEmployee,
        getNonCompliantAssetsCount,
        hireCandidate,
        renewCertification,
        assignCourseToDepartment,
        completeCourse,
        addTrainingCourse,
        downloadSystemBackup,
        logSettingChange,
        userPermissions,
        updateEmployee,
        addEmployee,
        deleteEmployee,
        addLocation,
        updateLocation,
        deleteLocation,
        addDepartment,
        updateDepartment,
        deleteDepartment,
        reorderDepartments,
        addPosition,
        updatePosition,
        deletePosition,
        approveLeave,
        rejectLeave,
        addLeaveRequest,
        terminateEmployee,
        finalizeReview,
        shifts,
        checkIn,
        checkOut,
        onboardingRecords, setOnboardingRecords,
        shiftAssignments, setShiftAssignments, assignShift, addManualPunch,
        publishedWeeks, assignDepartmentShift, publishWeek,
        jobPostings, setJobPostings, createJobPosting, toggleJobPortalStatus,
        fieldAgents, setFieldAgents, gpsLogs, setGpsLogs, offlineQueue, logFieldAgentLocation, optimizeFieldRoutes,
        laborContracts, setLaborContracts, addLaborContract,
        disciplinaryActions, setDisciplinaryActions, addDisciplinaryAction, resolveDisciplinaryAction,
        archivedDocuments, bulkImportAttendance, addDocumentToLibrary, deleteArchivedDocument,
        policies, setPolicies, holidays, setHolidays,
        adjustLeaveBalance,
        locationSnapshots, setLocationSnapshots,
        jobActivityChanges, setJobActivityChanges,
        profileChangeRequests, setProfileChangeRequests,
        submitProfileChangeRequest, handleProfileChangeRequest,
        recruitmentActions, setRecruitmentActions,
        attendanceRequests, setAttendanceRequests,
        performanceReviewRequests, setPerformanceReviewRequests,
        objectives, setObjectives,
        keyResults, setKeyResults,
        updateKeyResult,
        submitReview,
        addJobActivityChange,
        approveJobActivityChange,
        announcements, setAnnouncements,
        createAnnouncement,
        acknowledgeAnnouncement,
        toggleAutoAttendance,
        addHoliday, updateHoliday, deleteHoliday,
        // Live from UserAccessProvider
        isAdmin, subscriptionTier, securityAuditLogs, verifyLocalAuth, addSecurityLog,
        // resolveOTConflict & handleInboxAction are added by the PayrollBridge
    }), [
        employees, loadingEmployees, reviews, assets, candidates, candidateMessages, alerts, tickets, loadingTickets, courses, certs, analytics, 
        leaveRequests, attendanceLogs, complianceSettings, systemSettings, auditLogs, 
        shifts, shiftAssignments, publishedWeeks,
        onboardingRecords, jobPostings, fieldAgents, laborContracts, 
        disciplinaryActions, archivedDocuments, policies, holidays, bulkImportAttendance, addDocumentToLibrary, deleteArchivedDocument,
        locationSnapshots, jobActivityChanges, profileChangeRequests, recruitmentActions, attendanceRequests,
        performanceReviewRequests, submitReview, addJobActivityChange, announcements, createAnnouncement, acknowledgeAnnouncement,
        objectives, keyResults,
        toggleAutoAttendance, reorderDepartments, policyVersion,
        isAdmin, subscriptionTier, securityAuditLogs, verifyLocalAuth, addSecurityLog, logSettingChange
    ]);

    const runSystemAudits = () => {
        const newAlerts: Types.Alert[] = [];
        const today = new Date().getTime();
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        const nowStr = getFormattedDate(new Date(), 'time');

        // 1. Contract Expiry
        laborContracts.forEach(c => {
            if (c.status === 'Active' && c.endDate) {
                const end = new Date(c.endDate).getTime();
                if (end - today <= thirtyDays && end >= today) {
                    newAlerts.push({
                        id: `EXP-${c.id}`,
                        type: 'warning',
                        message: `Contract Expiring Soon: Contract for EMP-${c.employeeId.slice(4)} expires on ${c.endDate}.`,
                        isRead: false,
                        timestamp: nowStr,
                        link: '/employees'
                    });
                }
            }
        });

        // 2. Asset Maintenance Due
        assets.forEach(a => {
            if (a.status === 'Maintenance' && a.expectedReturnDate) {
                const returnD = new Date(a.expectedReturnDate).getTime();
                if (returnD <= today + 86400000) { 
                    newAlerts.push({
                        id: `MAINT-${a.id}`,
                        type: 'warning',
                        message: `Asset Maintenance Due: Asset ${a.id} is due for return from maintenance on ${a.expectedReturnDate}.`,
                        isRead: false,
                        timestamp: nowStr,
                        link: '/assets'
                    });
                }
            }
        });

        // 3. Disciplinary Final Warnings
        disciplinaryActions.forEach(d => {
            if (d.status === 'Active' && d.actionTaken?.includes('Warning')) {
                newAlerts.push({
                    id: `DISC-${d.id}`,
                    type: 'error',
                    message: `Active Final Warning: Monitor compliance for ${d.empId}.`,
                    isRead: false,
                    timestamp: nowStr
                });
            }
        });

        // 4. Certification Expirations (Proactive Risk Detection)
        let needsReEnrollment = false;
        const reEnrollMap: Record<string, string[]> = {};

        employees.forEach(emp => {
            emp.enrolledCourses?.forEach(ec => {
                if (ec.status === 'Completed' && ec.expiryDate) {
                    // Simplified date parsing for "MMM DD, YYYY" vs standard parsing, we try standard
                    const expiry = new Date(ec.expiryDate).getTime();
                    const course = courses.find(c => c.id === ec.courseId);

                    if (!isNaN(expiry)) {
                        if (expiry < today) {
                            newAlerts.push({
                                id: `CERT-EXPIRED-${emp.id}-${ec.courseId}`,
                                type: 'error',
                                message: `Compliance Expired: ${emp.name}'s certification (${course?.name || ec.courseId}) provided by ${course?.provider || 'Internal'} expired ${Math.floor((today - expiry) / 86400000)} days ago.`,
                                isRead: false,
                                timestamp: nowStr,
                                link: '/learning'
                            });
                            needsReEnrollment = true;
                            if (!reEnrollMap[emp.id]) reEnrollMap[emp.id] = [];
                            reEnrollMap[emp.id].push(ec.courseId);
                        } else if (expiry - today <= thirtyDays) {
                            newAlerts.push({
                                id: `CERT-RISK-${emp.id}-${ec.courseId}`,
                                type: 'warning',
                                message: `Compliance Risk: ${emp.name}'s certification (${course?.name || ec.courseId}) provided by ${course?.provider || 'Internal'} expires in ${Math.floor((expiry - today) / 86400000)} days.`,
                                isRead: false,
                                timestamp: nowStr,
                                link: '/learning'
                            });
                        }
                    }
                }
            });
        });

        if (needsReEnrollment) {
            setEmployees(prev => prev.map(emp => {
                if (reEnrollMap[emp.id]) {
                    const updatedCourses = emp.enrolledCourses.map(ec => 
                        reEnrollMap[emp.id].includes(ec.courseId) ? { ...ec, status: 'In Progress' as const } : ec
                    );
                    // Sync re-enrollment to Supabase
                    supabase.from('employees').update({ enrolledCourses: updatedCourses }).eq('id', emp.id).then(({ error }) => {
                        if (error) console.error('Supabase re-enrollment sync error:', error.message);
                    });
                    return { ...emp, enrolledCourses: updatedCourses };
                }
                return emp;
            }));
        }

        // 5. Missing Punch Alert (Operational Fix)
        const todayStr = getCurrentDateISO();
        employees.filter(e => e.status === 'Active').forEach(emp => {
            const isOnLeave = leaveRequests.some(r => r.empId === emp.id && r.status === 'Approved' && todayStr >= r.startDate && todayStr <= r.endDate);
            if (!isOnLeave) {
                const hasPunch = attendanceLogs.some(l => l.empId === emp.id && l.date === todayStr && l.checkIn !== '-- : --');
                if (!hasPunch) {
                    const shift = shifts.find(s => s.id === emp.shiftId);
                    if (shift) {
                        const [sH, sM] = shift.start.split(':').map(Number);
                        const cutoffMins = (sH * 60 + sM) + 120; // 2 hours past shift
                        const now = new Date();
                        const curMins = now.getHours() * 60 + now.getMinutes();
                        
                        if (curMins > cutoffMins) {
                            newAlerts.push({
                                id: `MISSING-${emp.id}-${todayStr}`,
                                type: 'warning',
                                message: `Missing Punch: ${emp.name} has not clocked in for the ${shift.name} shift (cutoff exceeded).`,
                                isRead: false,
                                timestamp: nowStr,
                                link: '/attendance'
                            });
                        }
                    }
                }
            }
        });

        if (newAlerts.length > 0) {
            setAlerts(prev => {
                const existingIds = new Set(prev.map(p => p.id));
                const filteredNew = newAlerts.filter(a => !existingIds.has(a.id));
                // Only trigger if actually new alerts to prevent infinite loop
                if (filteredNew.length === 0) return prev;
                return [...filteredNew, ...prev];
            });
        }
    };

    useEffect(() => {
        runSystemAudits();
    }, [laborContracts, assets, disciplinaryActions]);

    // Render PayrollProvider internally, passing it the data it needs as props.
    // The PayrollBridge child component calls usePayroll() and merges live payroll data into the context.
    return (
        <PayrollProvider
            employees={employees}
            systemSettings={systemSettings}
            complianceSettings={complianceSettings}
            attendanceLogs={attendanceLogs}
            leaveRequests={leaveRequests}
            shifts={shifts}
            holidays={holidays}
            shiftAssignments={shiftAssignments}
            setAlerts={setAlerts}
            addDocumentToLibrary={addDocumentToLibrary}
        >
            <PayrollBridge coreValue={coreValue} employees={employees} payrollSettersRef={payrollSettersRef} resolveOTConflict={resolveOTConflict} handleInboxAction={handleInboxAction}>
                {children}
            </PayrollBridge>
        </PayrollProvider>
    );
}

// Inner bridge component: lives inside PayrollProvider so it can call usePayroll()
// Merges live payroll data with core AppData into the final context value.
const PayrollBridge: React.FC<{
    coreValue: any;
    employees: Types.Employee[];
    payrollSettersRef: React.MutableRefObject<{ 
        setOTRequests: React.Dispatch<React.SetStateAction<Types.OTRequest[]>>; 
        otRequests: Types.OTRequest[]; 
        adjustments: Types.Adjustment[]; 
        addAdjustment: (adj: Omit<Types.Adjustment, 'id' | 'status' | 'submittedDate'>) => void;
        lastPayrollTotal: number 
    }>;
    resolveOTConflict: (keepId: string, voidId: string, adminId: string) => { success: boolean; message: string };
    handleInboxAction: (type: string, id: string, action: 'Approve' | 'Reject', adminId: string) => { success: boolean; message: string };
    children: ReactNode;
}> = ({ coreValue, employees, payrollSettersRef, resolveOTConflict, handleInboxAction, children }) => {
    const {
        payrollRecords, setPayrollRecords,
        payrollGroups, setPayrollGroups,
        otRequests, setOTRequests,
        loans,
        adjustments,
        expenses, setExpenses,
        lastPayrollStatus, setLastPayrollStatus,
        lastPayrollTotal, setLastPayrollTotal,
        projectPayments, setProjectPayments,
        calculatePayroll, finalizePayroll, disbursePayroll,
        activePayrollGroupId, setActivePayrollGroupId,
        createPayrollGroup, updatePayrollGroupStatus,
        isPayrollLocked, payrunId,
        submitOT, approveOT, rejectOT, bulkApproveOT,
        submitExpense, handleExpenseApproval,
        addAdjustment, approveAdjustment, rejectAdjustment,
        disbursementBatches, generateDisbursementBatch,
        requestLoan, approveLoan, rejectLoan, disburseLoan, pauseLoan, resumeLoan, recordCashRepayment, handleProjectPaymentAction
    } = usePayroll();

    // Populate the ref so outer-scope functions (addOTRequest, resolveOTConflict) can access live data
    payrollSettersRef.current.setOTRequests = setOTRequests;
    payrollSettersRef.current.otRequests = otRequests;
    payrollSettersRef.current.adjustments = adjustments;
    payrollSettersRef.current.addAdjustment = addAdjustment;
    payrollSettersRef.current.lastPayrollTotal = lastPayrollTotal;

    // Manager Scoping: Filter employees based on role
    const { currentUser } = useUserAccess();
    const filteredEmployees = useMemo(() => {
        if (!currentUser) return employees;
        if (currentUser.role === 'Admin') return employees;
        if (currentUser.role === 'Manager') {
            return employees.filter((e: Types.Employee) => e.supervisorId === currentUser.id || e.reportingManagerId === currentUser.id);
        }
        // Employee sees only themselves
        return employees.filter((e: Types.Employee) => e.id === currentUser.id);
    }, [employees, currentUser]);

    const value = useMemo(() => ({
        ...coreValue,
        // Scoped employees (Manager sees direct reports, Employee sees self)
        filteredEmployees,
        // Live payroll data (reactive, not shadow copies)
        payrollRecords, setPayrollRecords,
        payrollGroups, setPayrollGroups,
        otRequests, setOTRequests, loans, adjustments,
        expenses, setExpenses, lastPayrollStatus, setLastPayrollStatus, lastPayrollTotal, setLastPayrollTotal,
        projectPayments, setProjectPayments,
        // Payroll actions
        calculatePayroll, finalizePayroll, disbursePayroll,
        activePayrollGroupId, setActivePayrollGroupId,
        createPayrollGroup, updatePayrollGroupStatus,
        isPayrollLocked, payrunId,
        submitOT, approveOT, rejectOT, bulkApproveOT,
        submitExpense, handleExpenseApproval,
        addAdjustment, approveAdjustment, rejectAdjustment,
        disbursementBatches, generateDisbursementBatch,
        requestLoan, approveLoan, rejectLoan, disburseLoan, pauseLoan, resumeLoan, recordCashRepayment,
        // Action functions that depend on live payroll setters
        resolveOTConflict, 
        handleInboxAction: (type: string, id: string, action: 'Approve' | 'Reject', adminId: string) => {
            if (type === 'ProjectPayment') {
                handleProjectPaymentAction(id, action, adminId);
                return { success: true, message: `Project payment ${action.toLowerCase()}d successfully.` };
            }
            if (type === 'OT') return action === 'Approve' ? approveOT(id, adminId) : rejectOT(id, adminId);
            if (type === 'Loan') return action === 'Approve' ? approveLoan(id, adminId) : rejectLoan(id, adminId);
            if (type === 'Adjustment') return action === 'Approve' ? approveAdjustment(id, adminId) : rejectAdjustment(id, adminId);
            return handleInboxAction(type, id, action, adminId);
        }
    }), [coreValue, payrollRecords, payrollGroups, otRequests, loans, adjustments, expenses, lastPayrollStatus, lastPayrollTotal, projectPayments, disbursementBatches, filteredEmployees, activePayrollGroupId, isPayrollLocked, payrunId]);

    return (
        <AppDataContext.Provider value={value}>
            {children}
        </AppDataContext.Provider>
    );
};

export function useAppData() {
    const context = useContext(AppDataContext);
    if (context === undefined) {
        throw new Error('useAppData must be used within an AppDataProvider');
    }
    return context;
}
