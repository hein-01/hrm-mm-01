import React, { createContext, useContext, useState, useMemo, useRef, ReactNode, useEffect } from 'react';
import * as Types from '../types/hrms.types';
import { useUserAccess } from './UserAccessProvider';
import { useSystemCalendar } from './SystemCalendarContext';
import { decrementLeaveBalance, syncLeaveWithCalendar } from '../utils/leaveBalance';
import { autoHealCompliance } from '../utils/complianceAutoHeal';
import { PayrollProvider, usePayroll } from './PayrollProvider';





type AppDataContextType = {
    employees: Types.Employee[];
    setEmployees: React.Dispatch<React.SetStateAction<Types.Employee[]>>;
    reviews: Types.Review[];
    setReviews: React.Dispatch<React.SetStateAction<Types.Review[]>>;
    assets: Types.Asset[];
    setAssets: React.Dispatch<React.SetStateAction<Types.Asset[]>>;
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
    checkIn: (empId: string, locationName: string, gps: { lat: number, lng: number }, method?: 'Web Portal' | 'Mobile App' | 'Biometric') => Promise<{ success: boolean, message: string }>;
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
    finalizeReview: (reviewId: string) => void;
    submitReview: (reviewId: string, reviewerId: string, scores: Types.Review['competencyScores']) => { success: boolean; message: string };
    performanceReviewRequests: Types.PerformanceReviewRequest[];
    setPerformanceReviewRequests: React.Dispatch<React.SetStateAction<Types.PerformanceReviewRequest[]>>;
    reportAssetLoss: (assetId: string, empId: string) => void;
    terminateEmployee: (empId: string, actorId: string) => { success: boolean, message: string };
    completeCourse: (courseId: string, empId: string) => void;
    updateEmployee: (empId: string, updates: Partial<Types.Employee>) => { success: boolean, message: string };
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
    optimizeFieldRoutes: (adminId: string) => { success: boolean; message: string };
    laborContracts: Types.LaborContract[];
    setLaborContracts: React.Dispatch<React.SetStateAction<Types.LaborContract[]>>;
    addLaborContract: (contract: Omit<Types.LaborContract, 'id' | 'status'>, adminId: string) => { success: boolean; message: string };
    disciplinaryActions: Types.DisciplinaryAction[];
    setDisciplinaryActions: React.Dispatch<React.SetStateAction<Types.DisciplinaryAction[]>>;
    addDisciplinaryAction: (action: Omit<Types.DisciplinaryAction, 'id' | 'status'>, adminId: string) => { success: boolean; message: string };
    formTemplates: Types.FormTemplate[];
    bulkImportAttendance: (adminId: string) => { success: boolean; message: string };
    setFormTemplates: React.Dispatch<React.SetStateAction<Types.FormTemplate[]>>;
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
        subscriptionTier
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
        lastPayrollTotal: number;
    }>({ setOTRequests: () => {}, otRequests: [], adjustments: [], lastPayrollTotal: 0 });

    // Aliases for outer functions — delegate to the live data/setter via ref
    const setOTRequests = (...args: Parameters<React.Dispatch<React.SetStateAction<Types.OTRequest[]>>>) => payrollSettersRef.current.setOTRequests(...args);
    const getOTRequests = () => payrollSettersRef.current.otRequests;
    const getAdjustments = () => payrollSettersRef.current.adjustments;
    const getLastPayrollTotal = () => payrollSettersRef.current.lastPayrollTotal;
    const [employees, setEmployees] = useState<Types.Employee[]>([
        // From Directory
        // From Directory
        { id: 'EMP-001', name: 'Nilar Lwin', role: 'Senior UX Designer', dept: 'Product Dept', status: 'Active', joinDate: '2021-01-15', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDtMXUX0ktXwWpCR_HssI-ya16-3aPa6AAVPyBQ1EHpfp-j-sPL3V6-M9LOQH5oBAEgQVe-LnDjqixmSwV106z7bEtrnsNZO1CATGA_USq9lnhHi1_HCFl-Cyi3xyw648ljz2mqjJMc3vscDUW5zgws6ccC1OF1vEu1wdaDvwNJ2V-sg_zZ0haXJZDCxUvx8VjDCNXD51nD66gSegMbmfNMdqwU2v6zEDDEhi7cAmX1yUQ8UQLqt3O-oPvyg5wEcfX6wNGOUrCzj4', township: 'Sanchaung', nrcNumber: '12/Bahan(N)123456', ssbNumber: 'SSB-001-992', mobile: '09-4555-00000', hasCriticalRiskFlag: false, documents: [], recruitmentSource: 'LinkedIn', baseSalary: 1200000, reliefs: { spouse: true, parentsCount: 0 }, shiftId: 'SH-GEN-96', bankName: 'KBZ Bank', accountNumber: '1002019920031', bankBranch: 'Bahan Branch', bankBranchCode: 'KBZ-B01', enrolledCourses: [{ courseId: 'CRS-POL-101', enrollmentDate: '2023-09-01', status: 'In Progress' }], leaveBalances: { Casual: 4, Medical: 12, Earned: 8 }, policyId: 'LP-MGM-01', autoAttendanceEnabled: true },
        { id: 'EMP-004', name: 'Thida', role: 'UI Designer', dept: 'Design', status: 'Active', joinDate: '2022-03-10', avatar: null, township: 'Bahan', nrcNumber: '12/Kamaya(N)555666', ssbNumber: 'SSB-004-112', initials: 'T', colorClass: 'bg-indigo-100 text-indigo-700', hasCriticalRiskFlag: false, documents: [], recruitmentSource: 'Internal Portal', baseSalary: 800000, reliefs: { spouse: false, parentsCount: 1 }, shiftId: 'SH-GEN-96', bankName: 'Yoma Bank', accountNumber: '200155667788', bankBranch: 'Sanchaung Branch', bankBranchCode: 'YOM-S02', enrolledCourses: [{ courseId: 'CRS-TECH-04', enrollmentDate: '2023-08-15', status: 'Completed', completionDate: '2023-09-10' }], leaveBalances: { Casual: 6, Medical: 15, Earned: 10 }, policyId: 'LP-GEN-01', autoAttendanceEnabled: false },
        { id: 'EMP-012', name: 'Maung Maung', role: 'Frontend Developer', dept: 'Engineering', status: 'Active', joinDate: '2022-06-20', avatar: null, township: 'Insein', nrcNumber: '12/Okkala(N)777888', ssbNumber: 'SSB-012-334', initials: 'M', colorClass: 'bg-teal-100 text-teal-700', mobile: '09123456789', hasCriticalRiskFlag: true, criticalRiskCategory: 'Safety', documents: [], recruitmentSource: 'LinkedIn', baseSalary: 950000, reliefs: { spouse: true, parentsCount: 2 }, shiftId: 'SH-FAC-85', bankName: 'KPay', enrolledCourses: [{ courseId: 'CRS-102', enrollmentDate: '2024-01-10', status: 'In Progress' }], leaveBalances: { Casual: 6, Medical: 15, Earned: 10 }, policyId: 'LP-GEN-01', autoAttendanceEnabled: false },
        { id: 'EMP-023', name: 'Kyaw Kyaw', role: 'Sales Executive', dept: 'Sales', status: 'Active', joinDate: '2023-02-05', avatar: null, township: 'Dagon', nrcNumber: '12/Dagon(N)999000', ssbNumber: 'SSB-023-556', initials: 'K', colorClass: 'bg-orange-100 text-orange-700', hasCriticalRiskFlag: false, documents: [], recruitmentSource: 'Types.Employee Referral', baseSalary: 700000, reliefs: { spouse: false, parentsCount: 1 }, shiftId: 'SH-GEN-96', bankName: 'MAB Bank', accountNumber: '998822331100', bankBranch: 'Dagon Branch', bankBranchCode: 'MAB-D09', enrolledCourses: [], leaveBalances: { Casual: 3, Medical: 8, Earned: 4 }, policyId: 'LP-ACC-01', autoAttendanceEnabled: false },
        { id: 'EMP-024', name: 'Zaw Min', role: 'Backend Dev', dept: 'Engineering', status: 'Terminated', joinDate: '2021-08-12', avatar: null, township: 'Hlaing', nrcNumber: '12/Hlaing(N)111222', ssbNumber: 'SSB-024-778', initials: 'ZM', colorClass: 'bg-slate-100 text-slate-700', hasCriticalRiskFlag: false, documents: [], recruitmentSource: 'Direct', baseSalary: 850000, reliefs: { spouse: true, parentsCount: 2 }, shiftId: 'SH-GEN-96', enrolledCourses: [], leaveBalances: { Casual: 0, Medical: 0, Earned: 0 }, policyId: 'LP-GEN-01', autoAttendanceEnabled: false },
        { id: 'EMP-099', name: 'Aye Aye', role: 'HR Manager', dept: 'HR & Admin', status: 'On Leave', joinDate: '2020-05-30', avatar: null, township: 'Mayangone', nrcNumber: '12/Mayan(N)333444', ssbNumber: 'SSB-099-111', initials: 'AA', colorClass: 'bg-pink-100 text-pink-700', hasCriticalRiskFlag: false, documents: [], recruitmentSource: 'LinkedIn', baseSalary: 1100000, reliefs: { spouse: false, parentsCount: 0 }, shiftId: 'SH-GEN-96', bankName: 'KBZ Bank', accountNumber: '1002019920088', bankBranch: 'Mayangone Branch', bankBranchCode: 'KBZ-M12', enrolledCourses: [], leaveBalances: { Casual: 2, Medical: 15, Earned: 12 }, policyId: 'LP-MGM-01', autoAttendanceEnabled: false },
        // From Performance (Merged)
        { id: 'EMP-4022', name: 'U Kyaw Zayar', role: 'Senior Engineer', dept: 'Engineering', status: 'Active', joinDate: '2021-04-12', avatar: null, township: 'Tamwe', nrcNumber: '12/Tamwe(N)111111', ssbNumber: 'SSB-4022-111', initials: 'KZ', colorClass: 'bg-indigo-50 text-[#4F46E5] border border-indigo-100', mobile: '09-4500-1122', hasCriticalRiskFlag: false, documents: [], recruitmentSource: 'LinkedIn', baseSalary: 1000000, reliefs: { spouse: true, parentsCount: 1 }, shiftId: 'SH-GEN-96', bankName: 'AYA Bank', accountNumber: '300055443322', bankBranch: 'Tamwe Branch', bankBranchCode: 'AYA-T03', enrolledCourses: [], leaveBalances: { Casual: 6, Medical: 15, Earned: 10 }, policyId: 'LP-GEN-01', autoAttendanceEnabled: false },
        { id: 'EMP-3105', name: 'Daw Aye Aye Myint', role: 'Marketing Specialist', dept: 'Marketing', status: 'Active', joinDate: '2022-12-01', avatar: null, township: 'Botahtaung', nrcNumber: '12/Bota(N)222222', ssbNumber: 'SSB-3105-222', initials: 'AM', colorClass: 'bg-emerald-50 text-emerald-600 border border-emerald-100', mobile: '09-2222-22222', hasCriticalRiskFlag: false, documents: [], recruitmentSource: 'Direct', baseSalary: 750000, reliefs: { spouse: false, parentsCount: 0 }, shiftId: 'SH-GEN-96', bankName: 'WaveMoney', enrolledCourses: [], leaveBalances: { Casual: 6, Medical: 15, Earned: 10 }, policyId: 'LP-GEN-01', autoAttendanceEnabled: false },
        { id: 'EMP-1299', name: 'Daw Thida Aye', role: 'Sales rep', dept: 'Sales', status: 'Active', joinDate: '2020-07-15', avatar: null, township: 'Yankin', nrcNumber: '12/Yankin(N)333333', ssbNumber: 'SSB-1299-333', initials: 'TA', colorClass: 'bg-slate-200 text-slate-600 border border-slate-300', mobile: '09-7788-3344', hasCriticalRiskFlag: false, documents: [], recruitmentSource: 'Types.Employee Referral', baseSalary: 900000, reliefs: { spouse: true, parentsCount: 0 }, shiftId: 'SH-GEN-96', bankName: 'Yoma Bank', accountNumber: '200155667799', bankBranch: 'Yankin Branch', bankBranchCode: 'YOM-Y11', enrolledCourses: [], leaveBalances: { Casual: 6, Medical: 15, Earned: 10 }, policyId: 'LP-GEN-01', autoAttendanceEnabled: false },
        { id: 'EMP-0044', name: 'Thaw Zin', role: 'Logistics Coordinator', dept: 'Logistics', status: 'Active', joinDate: '2023-01-20', avatar: null, township: 'Thaketa', nrcNumber: '12/Thaketa(N)444444', ssbNumber: 'SSB-0044-444', initials: 'TZ', colorClass: 'bg-amber-50 text-amber-600 border border-amber-100', mobile: '09-9988-7766', hasCriticalRiskFlag: false, documents: [], recruitmentSource: 'LinkedIn', baseSalary: 600000, reliefs: { spouse: false, parentsCount: 1 }, shiftId: 'SH-FAC-85', bankName: 'CB Bank', accountNumber: '00129988776600', bankBranch: 'Thaketa Branch', bankBranchCode: 'CBB-T44', enrolledCourses: [], leaveBalances: { Casual: 6, Medical: 15, Earned: 10 }, policyId: 'LP-GEN-01', autoAttendanceEnabled: false }
    ]);

    const [reviews, setReviews] = useState<Types.Review[]>([]);

    const [assets, setAssets] = useState<Types.Asset[]>([
        { id: 'AST-902', category: 'Laptop', icon: 'laptop_mac', model: 'MacBook Pro M2 - Space Gray', assigneeId: 'EMP-001', status: 'In Use', value: 2500, lastAuditDate: '2023-08-15', expectedReturnDate: null, isDeductible: true },
        { id: 'AST-441', category: 'Mobile', icon: 'smartphone', model: 'iPhone 14 Pro 256GB', assigneeId: 'EMP-023', status: 'Lost', value: 1200, lastAuditDate: '2023-09-01', expectedReturnDate: null, isDeductible: true },
        { id: 'AST-112', category: 'Peripheral', icon: 'keyboard', model: 'Keychron K2 Mechanical', assigneeId: 'EMP-008', status: 'In Use', value: 150, lastAuditDate: '2023-10-10', expectedReturnDate: null, isDeductible: false },
    ]);

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

    const [leaveRequests, setLeaveRequests] = useState<Types.LeaveRequest[]>([
        {
            id: 'LV-402', empId: 'EMP-012', name: 'Maung Maung', dept: 'Engineering', avatar: '',
            type: 'Casual', durationStr: 'Oct 18 - Oct 20', totalDays: 3, startDate: '2023-10-18', endDate: '2023-10-20',
            status: 'Pending', relieverId: 'EMP-023', relieverName: 'Kyaw Kyaw', reason: 'Family celebration', submitted: '2 hrs ago', hasCert: false,
            priority: 'Medium', category: 'Staffing'
        },
        {
            id: 'LV-215', empId: 'EMP-023', name: 'Kyaw Kyaw', dept: 'Sales', avatar: '',
            type: 'Unpaid', durationStr: 'Oct 12 - Oct 13', totalDays: 2, startDate: '2023-10-12', endDate: '2023-10-13',
            status: 'Approved', relieverId: 'EMP-012', relieverName: 'Maung Maung', reason: 'Personal matters', submitted: '5 hrs ago', hasCert: true,
            priority: 'Low', category: 'Staffing'
        }
    ]);

    const [attendanceLogs, setAttendanceLogs] = useState<Types.AttendanceLog[]>([
        { id: 'LOG-001', empId: 'EMP-004', name: 'Thida', dept: 'Design', checkIn: '09:05 AM', checkOut: '06:00 PM', location: 'HQ Office', status: 'Late', geofenceStatus: 'Verified', totalHours: 7.9, checkInMethod: 'Mobile App', isManual: false, penaltyRuleId: 'PEN-LATE', penaltyAmount: 5000, date: '2023-10-23', project: 'UI Redesign Sprint' },
        { id: 'LOG-002', empId: 'EMP-012', name: 'Maung Maung', dept: 'Engineering', checkIn: '09:00 AM', checkOut: '-- : --', location: 'Factory', status: 'Missing Out', geofenceStatus: 'Verified', totalHours: 0, checkInMethod: 'Biometric', isManual: false, penaltyAmount: 0, date: '2023-10-23', project: 'Production Line A' },
        { id: 'LOG-003', empId: 'EMP-023', name: 'Kyaw Kyaw', dept: 'Sales', checkIn: '09:15 AM', checkOut: '05:45 PM', location: 'Customer Site', status: 'Present', geofenceStatus: 'Verified', gps: { lat: 16.7984, lng: 96.1495 }, totalHours: 7.5, checkInMethod: 'Web Portal', isManual: true, penaltyAmount: 0, date: '2023-10-23', project: 'Warehouse Logistics' }
    ]);

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
        officeLocations: [
            { id: 'LOC-HQ', name: 'HQ Office (Yangon)', coords: { lat: 16.8201, lng: 96.1604 }, radius: 500 },
            { id: 'LOC-FAC', name: 'Factory (Bago)', coords: { lat: 17.3333, lng: 96.4833 }, radius: 1000 }
        ],
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
            { id: 'PROV-001', name: 'KBZ Bank', type: 'Bank', requiredFields: ['accountNumber', 'bankBranchCode'] },
            { id: 'PROV-002', name: 'CB Bank', type: 'Bank', requiredFields: ['accountNumber'] },
            { id: 'PROV-003', name: 'KPay', type: 'Digital Wallet', requiredFields: ['mobile'] },
            { id: 'PROV-004', name: 'WaveMoney', type: 'Digital Wallet', requiredFields: ['mobile'] }
        ],
        paymentRoundingLogic: 'Nearest',
        companyLogo: null,
        expenseModuleEnabled: false,
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

    const [disciplinaryActions, setDisciplinaryActions] = useState<Types.DisciplinaryAction[]>([
        { id: 'DIS-001', empId: 'EMP-023', employeeName: 'Kyaw Kyaw', dept: 'Sales', type: 'Written Warning', issueDate: '2023-10-05', expiryDate: '2024-04-05', status: 'Active', reason: 'Repeated tardiness and missing sales targets.', actionTaken: 'Formal warning and performance improvement plan.', documentUrl: '#' }
    ]);

    // projectPayments is now bridged live from PayrollProvider (no shadow)

    const [locationSnapshots, setLocationSnapshots] = useState<Types.LocationSnapshot[]>([
        { id: 'LS-001', empId: 'EMP-023', name: 'Kyaw Kyaw', coords: { lat: 16.7984, lng: 96.1495 }, address: 'Sule Pagoda Road, Yangon', timestamp: '2023-10-27 10:30 AM', status: 'Pending', priority: 'Medium', category: 'Attendance' }
    ]);

    const [jobActivityChanges, setJobActivityChanges] = useState<Types.JobActivityChange[]>([
        { id: 'JAC-001', empId: 'EMP-004', name: 'Thida', type: 'Promotion', detail: 'From Junior UI Designer to UI Designer', effectiveDate: '2023-11-01', status: 'Pending', submittedDate: '2023-10-20', priority: 'High', category: 'Staffing', newRole: 'UI Designer', newDept: 'Design' },
        { id: 'JAC-002', empId: 'EMP-012', name: 'Maung Maung', type: 'Transfer', detail: 'Transfer from Engineering to R&D', effectiveDate: '2023-11-15', status: 'Pending', submittedDate: '2023-10-22', priority: 'Medium', category: 'Staffing', newDept: 'R&D' }
    ]);

    const [announcements, setAnnouncements] = useState<Types.Announcement[]>([]);

    const [recruitmentActions, setRecruitmentActions] = useState<Types.RecruitmentAction[]>([
        { id: 'RA-001', candidateId: 'ID-003', candidateName: 'Aung Myo', jobTitle: 'Frontend Developer', type: 'Interview', detail: 'Technical Interview Round 2', status: 'Pending', submittedDate: '2023-10-26', priority: 'Medium', category: 'Staffing' }
    ]);

    const [attendanceRequests, setAttendanceRequests] = useState<Types.AttendanceRequest[]>([
        { id: 'AR-001', empId: 'EMP-001', name: 'Nilar Lwin', type: 'Remote Check-In', time: '08:45 AM', location: 'Home Office', reason: 'Remote work scheduled', status: 'Pending', submittedDate: '2023-10-27', priority: 'Medium', category: 'Attendance' }
    ]);

    const [performanceReviewRequests, setPerformanceReviewRequests] = useState<Types.PerformanceReviewRequest[]>([]);

    const [formTemplates, setFormTemplates] = useState<Types.FormTemplate[]>([
        { id: 'FRM-001', title: 'Employment Contract Template', category: 'Legal', description: 'Standard EC approved by Myanmar Ministry of Labor.', fileUrl: '#', isMandatory: true },
        { id: 'FRM-002', title: 'Leave Application Form', category: 'HR', description: 'Hardcopy backup for leave requests.', fileUrl: '#', isMandatory: false },
        { id: 'FRM-003', title: 'OT Request Form', category: 'Payroll', description: 'Form for manual OT approvals.', fileUrl: '#', isMandatory: false },
        { id: 'FRM-004', title: 'Exit Interview Questionnaire', category: 'HR', description: 'Standard offboarding feedback form.', fileUrl: '#', isMandatory: true }
    ]);

    const [fieldAgents, setFieldAgents] = useState<Types.FieldAgent[]>([
        { id: 'FA-001', empId: 'EMP-001', name: 'Kyaw Zayar', role: 'Sales - Downtown', avatar: null, status: 'Online', locationName: 'Downtown Yangon', mapPosition: { x: 45, y: 40 }, gps: { lat: 16.7840, lng: 96.1519 }, history: [{ x: 40, y: 35, lat: 16.7810, lng: 96.1490, timestamp: '08:00 AM' }, { x: 42, y: 38, lat: 16.7825, lng: 96.1505, timestamp: '09:30 AM' }], lastUpdate: '2m ago', routeAssigned: 'Route 1', batteryLevel: 85, alert: 'None' },
        { id: 'FA-002', empId: 'EMP-004', name: 'Hla Hla', role: 'Checking client site', avatar: null, status: 'Online', locationName: 'Hlaing Township', mapPosition: { x: 55, y: 30 }, gps: { lat: 16.8550, lng: 96.1100 }, history: [{ x: 50, y: 25, lat: 16.8520, lng: 96.1070, timestamp: '08:15 AM' }], lastUpdate: 'Just now', routeAssigned: 'Route 2', batteryLevel: 92, alert: 'None' },
        { id: 'FA-003', empId: 'EMP-023', name: 'Aung Kyaw', role: 'Delivery - Kamaryut', avatar: null, status: 'Online', locationName: 'Kamaryut', mapPosition: { x: 35, y: 60 }, gps: { lat: 16.8400, lng: 96.1250 }, history: [{ x: 33, y: 57, lat: 16.8370, lng: 96.1220, timestamp: '08:30 AM' }], lastUpdate: '15m ago', routeAssigned: 'Route 3', batteryLevel: 45, alert: 'None' },
        { id: 'FA-004', empId: 'EMP-112', name: 'Thidar Aye', role: 'Sales rep', avatar: null, status: 'Online', locationName: 'Yankin', mapPosition: { x: 60, y: 45 }, gps: { lat: 16.8050, lng: 96.1750 }, history: [{ x: 58, y: 42, lat: 16.8020, lng: 96.1720, timestamp: '09:00 AM' }], lastUpdate: '5m ago', routeAssigned: 'Route 3', batteryLevel: 78, alert: 'None' },
        { id: 'FA-005', empId: 'EMP-024', name: 'Moe Moe', role: 'Field Inspector', avatar: null, status: 'Offline', locationName: 'Tamwe', mapPosition: { x: 40, y: 55 }, gps: { lat: 16.7950, lng: 96.1900 }, history: [], lastUpdate: '1h ago', routeAssigned: 'Route 4', batteryLevel: 10, alert: 'Low Battery Warning' },
        { id: 'FA-006', empId: 'EMP-099', name: 'Ko Min', role: 'Delivery', avatar: null, status: 'Offline', locationName: 'Bahan', mapPosition: { x: 50, y: 50 }, gps: { lat: 16.7900, lng: 96.1650 }, history: [], lastUpdate: '10m ago', routeAssigned: 'Route 4', batteryLevel: 55, alert: 'GPS Signal Lost' },
        { id: 'FA-007', empId: 'EMP-1299', name: 'Min Thant', role: 'Logistics', avatar: null, status: 'Online', locationName: 'Insein', mapPosition: { x: 25, y: 25 }, gps: { lat: 16.9300, lng: 96.1000 }, history: [{ x: 23, y: 22, lat: 16.9270, lng: 96.0970, timestamp: '08:45 AM' }], lastUpdate: 'Just now', routeAssigned: 'Route 5', batteryLevel: 100, alert: 'Fake GPS Detected' }
    ]);

    const [shifts, setShifts] = useState<Types.Shift[]>([
        { id: 'SH-GEN-96', name: 'General Office (9-6)', start: '09:00', end: '18:00' },
        { id: 'SH-FAC-85', name: 'Factory 8-5', start: '08:00', end: '17:00' },
        { id: 'S-7', name: 'Flexible Office Hours', start: '10:00', end: '18:30', startTime: '10:00', endTime: '18:30', gracePeriod: 20, type: 'Flexible', active: true }
    ]);












    const [courses, setCourses] = useState<Types.Course[]>([
        { id: 'CRS-100', name: 'Anti-Harassment Policy', category: 'Compliance', duration: '1.0 Hrs', enrolled: 145, progress: 85, isMandatory: true },
        { id: 'CRS-101', name: 'Leadership Essentials', category: 'Soft Skills', duration: '1.5 Hrs', enrolled: 42, progress: 72, isMandatory: false },
        { id: 'CRS-102', name: 'Fire Safety Protocols', category: 'Safety', duration: '2.0 Hrs', enrolled: 300, progress: 98, isMandatory: true },
        { id: 'CRS-103', name: 'Advanced React Patterns', category: 'Technical', duration: '4.0 Hrs', enrolled: 12, progress: 40, isMandatory: false },
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

    const flagEmployeeRisk = (empId: string, category?: string) => {
        setEmployees(prev => prev.map(emp =>
            emp.id === empId ? { ...emp, hasCriticalRiskFlag: true, criticalRiskCategory: category } : emp
        ));
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

        return { success: true, message: `Auto Attendance ${newState ? 'Enabled' : 'Disabled'} for ${emp.name}. Audit entry created in Movement tab.` };
    };

    const addDocumentToEmployee = (empId: string, document: Omit<Types.DocumentType, 'id' | 'date' | 'timestamp'>) => {
        const timestamp = new Date().toISOString();
        const dateStr = getFormattedDate(new Date(), 'date');

        setEmployees(prev => prev.map(emp => {
            if (emp.id === empId) {
                const newDoc: Types.DocumentType = {
                    ...document,
                    id: `DOC-${Date.now()}`,
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

    const hireCandidate = (candidateId: string, township: string) => {
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
            joinDate: getFormattedDate(new Date(), 'date'),
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
        setCerts(prev => prev.map(c => c.id === certId ? {
            ...c,
            status: 'Valid',
            expiry: getFormattedDate(new Date(new Date().setFullYear(new Date().getFullYear() + 2)), 'date')
        } : c));

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

    const assignCourseToDepartment = (courseId: string, department: string) => {
        const course = courses.find(c => c.id === courseId);
        if (!course) return;

        // Identify department members
        const members = employees.filter(e => e.dept === department); // Changed 'department' to 'dept' to match Types.Employee type
        if (members.length === 0) return;

        // Update enrollment count
        setCourses(prev => prev.map(c => c.id === courseId ? { ...c, enrolled: c.enrolled + members.length } : c));

        // RECORD in each active member's profile
        setEmployees(prev => prev.map(emp => {
            if (emp.dept === department && emp.status === 'Active') {
                const alreadyEnrolled = emp.enrolledCourses.some(ec => ec.courseId === courseId);
                if (!alreadyEnrolled) {
                    return {
                        ...emp,
                        enrolledCourses: [...emp.enrolledCourses, {
                            courseId,
                            enrollmentDate: getCurrentDateISO(),
                            status: 'In Progress'
                        }]
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

    const completeCourse = (courseId: string, empId: string) => {
        const course = courses.find(c => c.id === courseId);
        if (!course) return;

        setEmployees(prev => prev.map(emp => {
            if (emp.id === empId) {
                const updatedCourses = emp.enrolledCourses.map(ec => 
                    ec.courseId === courseId ? { ...ec, status: 'Completed' as const, completionDate: getCurrentDateISO() } : ec
                );
                
                // Add to documents automatically
                addDocumentToEmployee(empId, {
                    name: `Certificate of Completion: ${course.name}`,
                    type: 'Certification',
                    category: 'Standard',
                    privacy: 'Manager Viewable',
                    url: '#'
                });
                
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
                    // Security audit trail via addSecurityLog (bridged from UserAccessProvider)
                    addSecurityLog({
                        deviceId: 'SYSTEM',
                        authMethod: 'Auto-Heal',
                        status: 'Success',
                        empId: emp.id,
                        detail: `System: Critical Risk [${healResult.category}] cleared for ${emp.name} via course completion.`
                    });
                    return { ...healResult.updatedEmployee, enrolledCourses: updatedCourses };
                }

                return { ...emp, enrolledCourses: updatedCourses };
            }
            return emp;
        }));
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

    const [publishedWeeks, setPublishedWeeks] = useState<string[]>([]);

    const [shiftAssignments, setShiftAssignments] = useState<ShiftAssignment[]>([
        { id: 'SA-1', empId: 'EMP-012', date: '2023-10-23', shiftId: 'Morning' },
        { id: 'SA-2', empId: 'EMP-012', date: '2023-10-24', shiftId: 'Morning' },
        { id: 'SA-3', empId: 'EMP-001', date: '2023-10-25', shiftId: 'General' },
    ]);

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

        setShiftAssignments(prev => {
            const next = [...prev];
            const newAssignment: ShiftAssignment = { 
                id: `SA-${Date.now()}`, 
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

        // 1. Retroactive Recalculation
        const effectiveStart = customStart || newShiftObj?.start;
        const effectiveEnd = customEnd || newShiftObj?.end;

        if (effectiveStart) {
            setAttendanceLogs(prev => prev.map(log => {
                if (log.empId === empId && log.date === date && log.checkIn !== '-- : --' && log.checkIn !== '--:--') {
                    const [shiftH, shiftM] = effectiveStart.split(':').map(Number);
                    const [ciTime, ciPeriod] = log.checkIn.split(' ');
                    let ciH = parseInt(ciTime.split(':')[0], 10);
                    const ciM = parseInt(ciTime.split(':')[1], 10);
                    if (ciPeriod === 'PM' && ciH !== 12) ciH += 12;
                    if (ciPeriod === 'AM' && ciH === 12) ciH = 0;
                    
                    const isLate = ciH > shiftH || (ciH === shiftH && ciM > shiftM);
                    const newStatus = isLate ? 'Late' : (log.status === 'Missing Out' || log.status === 'On Leave' ? log.status : 'Present');
                    return { ...log, status: newStatus };
                }
                return log;
            }));
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
                        date: getFormattedDate(new Date(), 'date'),
                        type: 'Schedule Adjustment',
                        detail: customStart ? customDetail : regularDetail,
                        reason: reason,
                        approvedBy: adminId
                    };
                    return { ...e, employmentHistory: [histEntry, ...(e.employmentHistory || [])] };
                }
                return e;
            }));
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
        if (newLogs.length > 0) setAttendanceLogs(prev => [...prev, ...newLogs]);

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

    const checkIn = async (empId: string, locationName: string, gps: { lat: number, lng: number }, method: 'Web Portal' | 'Mobile App' | 'Biometric' = 'Web Portal'): Promise<{success: boolean, message: string}> => {
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
        
        // Production Geofence check
        let inRange = false;
        let minDistance = 999999;
        systemSettings.officeLocations.forEach(loc => {
            const dist = calculateDistance(gps.lat, gps.lng, loc.coords.lat, loc.coords.lng);
            if (dist < minDistance) minDistance = dist;
            if (dist <= loc.radius) inRange = true;
        });
        const isGeofenceViolation = method === 'Mobile App' && minDistance > complianceSettings.geofenceViolationThreshold;
        const todayStr = getCurrentDateISO();
        const assignment = shiftAssignments.find(sa => sa.empId === empId && sa.date === todayStr);
        const activeShiftId = assignment ? assignment.shiftId : emp.shiftId;
        const shift = shifts.find(s => s.id === activeShiftId) || shifts[0];
        const [shiftH, shiftM] = shift.start.split(':').map(Number);
        
        const now = getAdjustedDateObj();
        const ciStr = getFormattedDate(now, 'time');
        const currentH = now.getHours();
        const currentM = now.getMinutes();
        const isLate = currentH > shiftH || (currentH === shiftH && currentM > shiftM);
        const penaltyAmount = isLate ? complianceSettings.attendancePenalty : 0;
        const newLog: AttendanceLog = {
            id: `LOG-${empId}-${Date.now()}`,
            empId,
            name: emp.name,
            dept: emp.dept,
            checkIn: ciStr,
            checkOut: '-- : --',
            location: locationName,
            date: todayStr,
            gps,
            geofenceStatus: isGeofenceViolation ? 'Violation' : (inRange ? 'Verified' : 'N/A'),
            status: isGeofenceViolation ? 'Pending Approval' : (isLate ? 'Late' : 'Present'),
            checkInMethod: method,
            totalHours: 0,
            isManual: false,
            penaltyAmount
        };
        setAttendanceLogs(prev => [newLog, ...prev]);
        if (isGeofenceViolation) {
            const newRequest: AttendanceRequest = {
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
        }
        if (isLate && !isGeofenceViolation) {
            addAdjustment({
                empId,
                name: emp.name,
                dept: emp.dept,
                type: 'Late Fine',
                category: 'Deduction',
                amount: penaltyAmount,
                effectiveMonth: 'Oct 2023',
                reason: `Late Arrival: ${ciStr} (Shift: ${shift.start})`,
                sourceLink: newLog.id,
                source: 'System-Attendance',
                priority: 'Low'
            });
        }
        return { success: true, message: `Check-in successful via ${method}.` };
    };

    const checkOut = (empId: string) => {
        const now = new Date();
        const checkoutStr = getFormattedDate(now, 'time');
        setAttendanceLogs(prev => prev.map(log => {
            if (log.empId === empId && log.checkOut === '-- : --') {
                const [time, period] = log.checkIn.split(' ');
                let [h, m] = time.split(':').map(Number);
                if (period === 'PM' && h < 12) h += 12;
                if (period === 'AM' && h === 12) h = 0;
                const checkInDate = new Date();
                checkInDate.setHours(h, m, 0, 0);
                const diffMs = now.getTime() - checkInDate.getTime();
                const totalHours = Number((diffMs / (1000 * 60 * 60)).toFixed(2));
                return { ...log, checkOut: checkoutStr, totalHours };
            }
            return log;
        }));
        return { success: true, message: 'Check-out successful.' };
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
                if (onLeave) return;
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
            return currentLogs;
        });
    };

    const regularizeAttendance = (logId: string, manualTime: string, adminId: string, reason: string) => {
        setAttendanceLogs(prev => prev.map(log => {
            if (log.id === logId) {
                return { ...log, checkOut: manualTime, status: 'Present', adminAuditId: adminId, adminAuditReason: reason, isManual: true };
            }
            return log;
        }));
    };

    const approveLeave = (reqId: string, adminId: string, forceOverride?: boolean) => {
        const req = leaveRequests.find(r => r.id === reqId);
        if (!req) return { success: false, message: 'Request not found' };

        // 1. Strict Guard: Prevent redundant approvals and double-deductions
        if (req.status === 'Approved') return { success: false, message: 'This request is already approved.' };

        const emp = employees.find(e => e.id === req.empId);
        if (!emp) return { success: false, message: 'Employee not found.' };

        const reliever = employees.find(e => e.id === req.relieverId);
        if (!reliever || reliever.status !== 'Active') return { success: false, message: 'Reliever is not active.' };

        // 1b. Policy Gate: Verify leave type is permitted under the employee's assigned policy
        const policy = policies.find(p => p.id === emp.policyId);
        if (policy && policy.applicableLeaveTypes.length > 0 && !policy.applicableLeaveTypes.includes(req.type)) {
            return { success: false, message: `Policy Violation: '${req.type}' leave is not permitted under policy '${policy.name}'.` };
        }

        // 2. Balance Integrity Check — bypass for no-balance leave types
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
                return { ...e, leaveBalances: { ...e.leaveBalances, [req.type]: newBalance } };
            }
            return e;
        }));

        setLeaveRequests(prev => prev.map(r => r.id === reqId ? {
            ...r,
            status: 'Approved' as const,
            approvedBy: adminId,
            approvedAt: getFormattedDate(undefined, 'time'),
            ...(forceOverride ? { isAdminOverride: true } : {})
        } : r));

        // 4. System Calendar Interactivity — delegated to utility
        syncLeaveWithCalendar(
            addCalendarEvent,
            emp.name,
            { type: req.type, startDate: req.startDate, endDate: req.endDate }
        );

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




    const reportAssetLoss = (assetId: string, empId: string) => {
        // Redacted for brevity, logic moved to PayrollProvider
    };

    const terminateEmployee = (empId: string, actorId: string) => {
        if (!isAdmin(actorId)) {
            addAuditLog({ adminId: actorId, actionType: 'Security Violation', module: 'Settings', detail: `Unauthorized attempt to terminate employee ${empId}.` });
            return { success: false, message: 'Security Violation: Only Administrators can deactivate users.' };
        }

        const emp = employees.find(e => e.id === empId);
        if (!emp) return { success: false, message: 'Types.Employee not found.' };

        // 1. Physical Asset Check
        const assignedAssets = assets.filter(a => a.assigneeId === empId && a.status === 'In Use');
        if (assignedAssets.length > 0) {
            const assetList = assignedAssets.map(a => `${a.model} (${a.id})`).join(', ');
            return { 
                success: false, 
                message: `OFFBOARDING BLOCKED: Physical assets still in use: ${assetList}. Recover all equipment before deactivation.` 
            };
        }

        // 2. Financial Balance Check (Pending Adjustments)
        const pendingAdjustments = getAdjustments().filter(a => a.empId === empId && a.status === 'Pending');
        if (pendingAdjustments.length > 0) {
            return { 
                success: false, 
                message: `OFFBOARDING BLOCKED: ${pendingAdjustments.length} pending financial adjustments (loans/fines) require finalization.` 
            };
        }

        // 3. Status Update (Atomic) & Admin Revocation
        setEmployees(prev => prev.map(e => 
            e.id === empId ? { ...e, status: 'Terminated', colorClass: 'bg-slate-100 text-slate-700' } : e
        ));

        // Automatic Admin Revocation
        setSystemSettings({
            ...systemSettings,
            adminIds: systemSettings.adminIds.filter(id => id !== empId),
            lastAuditDate: getCurrentDateISO()
        });

        // Audit Log Entry
        addAuditLog({ 
            adminId: actorId, 
            actionType: 'Types.Employee Termination', 
            module: 'Settings', 
            detail: `Terminated ${emp.name} (${empId}) and revoked all Admin privileges.`,
            sourceLink: empId
        });

        // Audit Types.Alert for Dashboard
        const alert: Types.Alert = {
            id: `TERM-${empId}-${Date.now()}`,
            message: `SECURE OFFBOARDING: ${emp.name} (${empId}) has been successfully deactivated with zero outstanding liabilities. Admin rights revoked.`,
            type: 'success',
            timestamp: getFormattedDate(new Date(), 'time'),
            isRead: false
        };
        setAlerts(prev => [alert, ...prev]);

        return { success: true, message: `Successfully terminated ${emp.name}.` };
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

        csvHeader += isDigitalWallet 
            ? `Wallet Account Name,${targetIdHeader},Payment Amount\n`
            : `Bank Account Name,${targetIdHeader},Branch Code,Payment Amount\n`;

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
                
                if (isDigitalWallet) {
                    csvContent += `"${cleanName}",${safeTargetId},"${val}"\n`;
                } else {
                    csvContent += `"${cleanName}",${safeTargetId},"${emp?.bankBranchCode || ''}","${val}"\n`;
                }

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
    const submitReview = (reviewId: string, reviewerId: string, scores: Review['competencyScores']): { success: boolean; message: string } => {
        const review = reviews.find(r => r.id === reviewId);
        if (!review) return { success: false, message: 'Review not found.' };

        // Weighted average of submitted competency scores
        const scoreValues = Object.values(scores).filter((v): v is number => v !== undefined);
        if (scoreValues.length === 0) return { success: false, message: 'At least one competency score is required.' };
        const weightedAvg = Math.round((scoreValues.reduce((sum, v) => sum + v, 0) / scoreValues.length) * 10) / 10;

        // Update review record
        setReviews(prev => prev.map(r => r.id === reviewId
            ? { ...r, status: 'Submitted' as const, reviewerId, competencyScores: scores, rating: weightedAvg, progress: [...new Set([...r.progress, 'M'])] }
            : r
        ));

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

        addAuditLog({
            adminId: reviewerId,
            actionType: 'Review Submitted',
            module: 'Performance',
            detail: `Review for ${review.name} (${review.period}) submitted with rating ${weightedAvg}/5. Pending Senior Admin approval.`,
            sourceLink: reviewId
        });

        return { success: true, message: `Review submitted for ${review.name}. Awaiting Senior Admin approval in the Centralized Inbox.` };
    };

    // finalizeReview: now only a minimal status-setter called after Inbox Approval.
    // The bonus and risk logic has moved to handleInboxAction('PerformanceReview').
    const finalizeReview = (reviewId: string) => {
        setReviews(prev => prev.map(r =>
            r.id === reviewId ? { ...r, status: 'Finalized' as const } : r
        ));
    };



    const toggleOnboardingTask = (recordId: string, taskId: string, adminId: string): { success: boolean, message: string } => {
        let success = true;
        let message = '';
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

                return { ...record, tasks: updatedTasks, status: newStatus as any };
            }
            return record;
        }));
        return { success, message };
    };

    const addOnboardingCustomTask = (recordId: string, title: string, tooltip: string, adminId: string) => {
        setOnboardingRecords(prev => prev.map(record => {
            if (record.id === recordId) {
                const newTask: OnboardingTask = { id: `CUST-${Date.now()}`, title, isCompleted: false, isMandatory: false, tooltip, type: 'Action' };
                addAuditLog({ adminId, actionType: 'Custom Task Added', module: 'Settings', detail: `Added "${title}" to ${record.name}'s onboarding.` });
                return { ...record, tasks: [...record.tasks, newTask], status: record.status === 'Completed' ? 'In Progress' : record.status };
            }
            return record;
        }));
    };

    const deleteOnboardingTask = (recordId: string, taskId: string, adminId: string) => {
        setOnboardingRecords(prev => prev.map(record => {
            if (record.id === recordId) {
                const updatedTasks = record.tasks.filter(t => t.id !== taskId);
                addAuditLog({ adminId, actionType: 'Task Removed', module: 'Settings', detail: `Removed task from ${record.name}'s onboarding.` });
                
                const allMandatoryCompleted = updatedTasks.filter(t => t.isMandatory).every(t => t.isCompleted);
                const newStatus = allMandatoryCompleted && updatedTasks.filter(t => t.isMandatory).length > 0 ? 'Completed' : (record.status === 'Completed' && !allMandatoryCompleted ? 'In Progress' : record.status);

                return { ...record, tasks: updatedTasks, status: newStatus as any };
            }
            return record;
        }));
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
            postingDate: getFormattedDate(new Date(), 'date')
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
    };

    const optimizeFieldRoutes = (adminId: string): { success: boolean; message: string } => {
        if (!isAdmin(adminId)) {
            addAuditLog({ adminId, actionType: 'Security Violation', module: 'Field Force', detail: `Unauthorized Route Optimization attempt by ${adminId}.` });
            return { success: false, message: 'Security Violation: Administrator privileges required.' };
        }
        
        // Randomly disperse agents visually by a small amount to simulate optimization spread
        setFieldAgents(prev => prev.map(agent => {
            const newX = Math.max(10, Math.min(90, agent.mapPosition.x + (Math.random() * 10 - 5)));
            const newY = Math.max(10, Math.min(90, agent.mapPosition.y + (Math.random() * 10 - 5)));
            return {
                ...agent,
                mapPosition: { x: newX, y: newY },
                history: [...(agent.history || []), { x: agent.mapPosition.x, y: agent.mapPosition.y, timestamp: getFormattedDate(new Date(), 'time') }]
            };
        }));

        addAuditLog({ adminId, actionType: 'Route Optimization Triggered', module: 'Field Force', detail: `Optimized dynamic assignment vectors for ${fieldAgents.filter(a => a.status === 'Online').length} active agents via external navigation API.` });
        
        return { success: true, message: 'Successfully calculated and dispersed optimal path assignments.' };
    };

    const addLaborContract = (contract: Omit<LaborContract, 'id' | 'status'>, adminId: string): { success: boolean; message: string } => {
        if (!isAdmin(adminId)) return { success: false, message: 'Admin privileges required.' };
        const newContract: LaborContract = {
            ...contract,
            id: `CON-${Date.now()}`,
            status: 'Active' // Default to active for new signings
        };
        setLaborContracts(prev => [newContract, ...prev]);
        addAuditLog({ adminId, actionType: 'Contract Added', module: 'Settings', detail: `New ${contract.type} contract for ${contract.employeeName}.` });
        return { success: true, message: 'Contract record added successfully.' };
    };

    const addDisciplinaryAction = (action: Omit<Types.DisciplinaryAction, 'id' | 'status'>, adminId: string): { success: boolean; message: string } => {
        if (!isAdmin(adminId)) return { success: false, message: 'Admin privileges required.' };
        const newAction: Types.DisciplinaryAction = {
            ...action,
            id: `DIS-${Date.now()}`,
            status: 'Active'
        };
        setDisciplinaryActions(prev => [newAction, ...prev]);
        addAuditLog({ adminId, actionType: 'Disciplinary Action', module: 'Settings', detail: `${action.type} issued to ${action.employeeName}.` });
        return { success: true, message: 'Disciplinary action recorded.' };
    };

    const createAnnouncement = (ann: Omit<Types.Announcement, 'id' | 'createdAt' | 'status' | 'sourceType'> & { isHoliday?: boolean, holidayDate?: string }) => {
        const id = `ANN-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
        const newAnn: Types.Announcement = {
            ...ann,
            id,
            status: 'Published',
            createdAt: new Date().toISOString(),
            sourceType: 'Manual',
            acknowledgedBy: ann.acknowledgmentRequired ? [] : undefined
        };

        if (ann.isHoliday && ann.holidayDate) {
            setHolidays([...holidays.filter(h => h.date !== ann.holidayDate), { date: ann.holidayDate!, name: ann.title, isRestricted: true }]);
        }

        setAnnouncements(prev => [newAnn, ...prev]);
        return { success: true, id };
    };

    const acknowledgeAnnouncement = (annId: string, empId: string) => {
        setAnnouncements(prev => prev.map(a => {
            if (a.id === annId && a.acknowledgmentRequired) {
                const ackList = a.acknowledgedBy || [];
                if (!ackList.includes(empId)) {
                    return { ...a, acknowledgedBy: [...ackList, empId] };
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
                
                if (action === 'Approve') {
                    // 1. Resignation specific logic
                    if (item.type === 'Resignation') {
                        // Asset Clearance Check (Warning only, already filtered in UI but strictly asserted here)
                        const assignedAssets = assets.filter(a => a.assigneeId === item.empId && a.status === 'In Use');
                        
                        setEmployees(prev => prev.map(e => {
                            if (e.id === item.empId) {
                                const historyEntry: Types.EmploymentHistory = {
                                    id: `HIST-${Date.now()}`,
                                    date: getFormattedDate(new Date(), 'date'),
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
                                    date: getFormattedDate(new Date(), 'date'),
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
                                    date: getFormattedDate(new Date(), 'date'),
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
                                    date: getFormattedDate(new Date(), 'date'),
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
                                    date: getFormattedDate(new Date(), 'date'),
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

                    // 4. Other JobActivity types (Adjustment) - no cascade needed
                    } else {
                        // Payroll adjustment handled via addAdjustment flow
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
                
                if (action === 'Approve') {
                    setAttendanceLogs(prev => prev.map(log => {
                        if (log.empId === item.empId && log.date === item.submittedDate && log.status === 'Pending Approval') {
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



    const bulkImportAttendance = (adminId: string): { success: boolean, message: string } => {
        if (!isAdmin(adminId)) return { success: false, message: 'Admin privileges required.' };
        
        const today = getCurrentDateISO();
        const newLogs: AttendanceLog[] = [
            { id: `IMP-${Date.now()}-1`, empId: 'EMP-001', name: 'Nilar Lwin', dept: 'Product Dept', checkIn: '08:55 AM', checkOut: '05:30 PM', location: 'HQ Office', status: 'Present', geofenceStatus: 'Verified', totalHours: 8.58, checkInMethod: 'Biometric', isManual: false, penaltyAmount: 0, date: today },
            { id: `IMP-${Date.now()}-2`, empId: 'EMP-4022', name: 'U Kyaw Zayar', dept: 'Engineering', checkIn: '09:02 AM', checkOut: '06:15 PM', location: 'HQ Office', status: 'Present', geofenceStatus: 'Verified', totalHours: 9.22, checkInMethod: 'Biometric', isManual: false, penaltyAmount: 0, date: today }
        ];

        setAttendanceLogs(prev => [...newLogs, ...prev]);
        addAuditLog({ adminId, actionType: 'Bulk Import', module: 'Attendance', detail: `Imported ${newLogs.length} records via legacy CSV upload.` });
        
        setAlerts(prev => [{
            id: `IMP-ALRT-${Date.now()}`,
            type: 'success',
            message: `Attendance Import Successful: ${newLogs.length} records added to ${today} cycle.`,
            timestamp: getFormattedDate(new Date(), 'time'),
            isRead: false
        }, ...prev]);

        return { success: true, message: `Successfully imported ${newLogs.length} attendance records.` };
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
    };

    const updateHoliday = (date: string, holiday: Types.Holiday) => {
        setHolidays(holidays.map(h => h.date === date ? holiday : h));
        incrementPolicyVersion();
    };

    const deleteHoliday = (date: string) => {
        setHolidays(holidays.filter(h => h.date !== date));
        incrementPolicyVersion();
    };

    // --- Bridge function stubs ---
    const updateEmployee = (empId: string, updates: Partial<Types.Employee>): { success: boolean; message: string } => {
        if (!isAdmin(empId)) {
            addSecurityLog({ level: 'Critical', source: 'AppDataContext', message: `Privilege Escalation Attempt: Non-admin attempted to update employee ${empId}`, details: { targetEmpId: empId, attemptedAction: 'updateEmployee' } });
            return { success: false, message: 'Security Violation: Unauthorized Action Logged' };
        }
        const emp = employees.find(e => e.id === empId);
        if (!emp) return { success: false, message: 'Employee not found.' };
        setEmployees(prev => prev.map(e => e.id === empId ? { ...e, ...updates } : e));
        return { success: true, message: 'Employee updated.' };
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
        setEmployees(prev => prev.map(e => {
            if (e.id === empId) {
                return { ...e, leaveBalances: { ...e.leaveBalances, [type]: (e.leaveBalances[type as keyof typeof e.leaveBalances] || 0) + amount } };
            }
            return e;
        }));
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
        addAuditLog({ adminId, actionType: 'OT Conflict Resolved', module: 'OT', detail: `Kept ${keepId}, voided ${voidId}.` });
        return { success: true, message: 'OT conflict resolved.' };
    };

    // --- Settings CRUD stubs (Location, Department, Position) ---
    const addLocation = (loc: Omit<Types.OfficeLocation, 'id'>): { success: boolean; message: string } => {
        const newLoc: Types.OfficeLocation = { ...loc, id: `LOC-${Date.now()}` } as Types.OfficeLocation;
        setSystemSettings((prev: Types.SystemSettings) => ({ ...prev, locations: [...(prev.locations || []), newLoc] }));
        return { success: true, message: 'Location added.' };
    };
    const updateLocation = (loc: Types.OfficeLocation): { success: boolean; message: string } => {
        setSystemSettings((prev: Types.SystemSettings) => ({ ...prev, locations: (prev.locations || []).map((l: Types.OfficeLocation) => l.id === loc.id ? loc : l) }));
        return { success: true, message: 'Location updated.' };
    };
    const deleteLocation = (id: string): { success: boolean; message: string } => {
        setSystemSettings((prev: Types.SystemSettings) => ({ ...prev, locations: (prev.locations || []).filter((l: Types.OfficeLocation) => l.id !== id) }));
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

    const coreValue = useMemo(() => ({
        employees, setEmployees,
        reviews, setReviews,
        assets, setAssets,
        candidates, setCandidates,
        candidateMessages, sendCandidateMessage,
        updateCandidateStage, rejectCandidate,
        alerts, setAlerts,
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
        updateEmployee,
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
        fieldAgents, setFieldAgents, optimizeFieldRoutes,
        laborContracts, setLaborContracts, addLaborContract,
        disciplinaryActions, setDisciplinaryActions, addDisciplinaryAction,
        formTemplates, bulkImportAttendance, setFormTemplates,
        policies, setPolicies, holidays, setHolidays,
        adjustLeaveBalance,
        locationSnapshots, setLocationSnapshots,
        jobActivityChanges, setJobActivityChanges,
        recruitmentActions, setRecruitmentActions,
        attendanceRequests, setAttendanceRequests,
        performanceReviewRequests, setPerformanceReviewRequests,
        submitReview,
        addJobActivityChange,
        announcements, setAnnouncements,
        createAnnouncement,
        acknowledgeAnnouncement,
        toggleAutoAttendance,
        addHoliday, updateHoliday, deleteHoliday,
        // Live from UserAccessProvider
        isAdmin, subscriptionTier, securityAuditLogs,
        // resolveOTConflict & handleInboxAction are added by the PayrollBridge
    }), [
        employees, reviews, assets, candidates, candidateMessages, alerts, courses, certs, analytics, 
        leaveRequests, attendanceLogs, complianceSettings, systemSettings, auditLogs, 
        shifts, shiftAssignments, publishedWeeks,
        onboardingRecords, jobPostings, fieldAgents, laborContracts, 
        disciplinaryActions, formTemplates, policies, holidays, bulkImportAttendance,
        locationSnapshots, jobActivityChanges, recruitmentActions, attendanceRequests,
        performanceReviewRequests, submitReview, addJobActivityChange, announcements, createAnnouncement, acknowledgeAnnouncement,
        toggleAutoAttendance, reorderDepartments, policyVersion,
        isAdmin, subscriptionTier, securityAuditLogs
    ]);

    const checkCurrentLeaveStatus = () => {
        // Stub: auto-expire or flag overdue leave requests
    };

    useEffect(() => {
        checkCurrentLeaveStatus();
    }, [leaveRequests]);

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
    payrollSettersRef: React.MutableRefObject<{ setOTRequests: React.Dispatch<React.SetStateAction<Types.OTRequest[]>>; otRequests: Types.OTRequest[]; adjustments: Types.Adjustment[]; lastPayrollTotal: number }>;
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
        requestLoan, approveLoan, rejectLoan, disburseLoan, pauseLoan, resumeLoan, recordCashRepayment
    } = usePayroll();

    // Populate the ref so outer-scope functions (addOTRequest, resolveOTConflict) can access live data
    payrollSettersRef.current.setOTRequests = setOTRequests;
    payrollSettersRef.current.otRequests = otRequests;
    payrollSettersRef.current.adjustments = adjustments;
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
        resolveOTConflict, handleInboxAction
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
