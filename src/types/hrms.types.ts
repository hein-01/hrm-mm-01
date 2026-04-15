import React from 'react';

export type Review = {
    id: string;
    empId: string;
    revieweeId: string;
    reviewerId?: string;
    name: string;
    dept: string;
    period: string;
    progress: string[];
    rating: number | null;
    competencyScores: {
        Technical?: number;
        Leadership?: number;
        Communication?: number;
        Execution?: number;
        Collaboration?: number;
    };
    bonusEligible: boolean;
    status: 'Pending' | 'Draft' | 'Submitted' | 'Finalized' | 'Completed' | 'In Progress';
    initials?: string;
    colorClass?: string;
    hasReminderSent?: boolean;
};

export type PerformanceReviewRequest = {
    id: string;
    reviewId: string;
    empId: string;
    name: string;
    dept: string;
    reviewerId: string;
    period: string;
    competencyScores: Review['competencyScores'];
    rating: number;
    submittedDate: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    priority: 'High' | 'Medium' | 'Low';
};

export type DocumentType = {
    id: string;
    name: string;
    type: string;
    category: 'Standard' | 'CV' | 'Contract' | 'Performance' | 'Job Activity' | 'Medical' | 'National ID' | 'Payroll' | 'Legal';
    privacy: 'Admin Only' | 'Manager Viewable' | 'Restricted' | 'Internal';
    date: string;
    url: string;
    uploadedBy?: string;
    timestamp?: string;
};

export type Asset = {
    id: string;
    category: string;
    icon: string;
    model: string;
    assigneeId: string | null;
    status: string;
    value: number;
    lastAuditDate: string;
    expectedReturnDate: string | null;
    isDeductible: boolean;
};

export type Course = {
    id: string;
    name: string;
    category: string;
    duration: string;
    enrolled: number;
    progress: number;
    isMandatory: boolean;
};

export type Certification = {
    id: string;
    name: string;
    employee: string;
    empId: string;
    expiry: string;
    complianceLink: string;
    status: string;
};

export type TrainingAnalytic = {
    id: string;
    name: string;
    dept: string;
    progress: number;
    avatar: string | null;
};

export type Reliefs = {
    spouse: boolean;
    parentsCount: number;
};

export type ComplianceSettings = {
    ssbCap: number;
    ssbPercent: number;
    ssbEmployerCap: number;
    ssbEmployerPercent: number;
    pitThreshold: number;
    pitRate: number;
    pitExemption: number;
    attendancePenalty: number;
    maxWeeklyHours: number;
    minRestHours?: number;
    workingDaysPerMonth: 22 | 26 | 30;
    geofenceViolationThreshold: number;
    officeStamp: string | null;
    companyTIN: string;
    region: string;
    currency: 'MMK';
    allowanceConfigs: AllowanceConfig[];
    deductionConfigs: DeductionConfig[];
};

export type AllowanceLogic = 'Flat Rate' | 'Percentage of Base' | 'Attendance-Based' | 'Project-Premium';
export type DeductionLogic = 'Flat Rate' | 'Percentage of Base' | 'Unpaid Leave' | 'Late Penalty' | 'Early Check-Out Penalty' | 'Missing Punch Penalty' | 'No Check-In Penalty' | 'No Check-Out Penalty' | 'Non-Attendance';

export type AllowanceConfig = {
    id: string;
    name: string;
    logic: AllowanceLogic;
    value: number;
    isEnabled: boolean;
    isDeletable: boolean;
};

export type DeductionConfig = {
    id: string;
    name: string;
    logic: DeductionLogic;
    value: number;
    affectedIncomeParts: string[];
    isEnabled: boolean;
    isDeletable: boolean;
};

export type OfficeLocation = {
    id: string;
    name: string;
    coords: { lat: number; lng: number };
    radius: number;
};

export type Shift = {
    id: string;
    name: string;
    start: string;
    end: string;
};

export type ShiftAssignment = {
    id: string;
    empId: string;
    date: string;
    shiftId: string;
    modifiedByHr?: boolean;
    reason?: string;
    adminId?: string;
    oldShiftId?: string;
    customStart?: string;
    customEnd?: string;
    workType?: 'Regular' | 'Overtime';
    source?: 'Mobile' | 'Web' | 'Biometric';
};

export type AttendanceLog = {
    id: string;
    empId: string;
    name: string;
    checkIn: string;
    checkOut: string;
    location: string;
    gps?: { lat: number, lng: number };
    geofenceStatus: 'Verified' | 'Violation' | 'N/A';
    status: 'Present' | 'Late' | 'Missing Out' | 'On Leave' | 'Pending Approval' | 'Expected';
    adminAuditId?: string;
    adminAuditReason?: string;
    dept: string;
    totalHours: number;
    checkInMethod: 'Web Portal' | 'Mobile App' | 'Biometric' | '🤖 Auto';
    isManual: boolean;
    penaltyRuleId?: string;
    penaltyAmount: number;
    date: string;
    deviceCheckIn?: string;
    syncCheckIn?: string;
    deviceCheckOut?: string;
    syncCheckOut?: string;
    biometricDeviceId?: string;
    project?: string;
};

export type LeaveRequest = {
    id: string;
    empId: string;
    name: string;
    dept: string;
    avatar: string;
    type: string;
    durationStr: string;
    totalDays: number;
    startDate: string;
    endDate: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    relieverId: string;
    relieverName: string;
    reason: string;
    submitted: string;
    hasCert: boolean;
    isAdminOverride?: boolean;
    certFileName?: string;
    rejectionReason?: string;
    approvedBy?: string;
    approvedAt?: string;
    rejectedBy?: string;
    rejectedAt?: string;
    priority: 'High' | 'Medium' | 'Low';
    category: 'Staffing' | 'Financial' | 'Attendance';
};

export type LeavePolicy = {
    id: string;
    name: string;
    description: string;
    formulas: any;
    approval_routing_templates: string[];
    isLossOfPay: boolean;
    maxCarryForward: number;
    applicableLeaveTypes: string[];
};

export type Holiday = {
    date: string;
    name: string;
    isRestricted: boolean;
};

export type CalendarEvent = {
    id: string;
    title: string;
    start: string; // ISO Date "YYYY-MM-DD"
    end: string;   // ISO Date "YYYY-MM-DD"
    type: 'Leave' | 'Holiday' | 'Event';
    empId?: string;
    empName?: string;
    color?: string;
};


export type Adjustment = {
    id: string;
    empId: string;
    name: string;
    dept: string;
    type: string;
    category: 'Addition' | 'Deduction';
    amount: number;
    currency: 'MMK';
    effectiveMonth: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    reason: string;
    sourceLink: string;
    source: 'Manual' | 'System-Performance' | 'System-Attendance' | 'System-Asset' | 'System-OT';
    isImmutable: boolean;
    isTaxable?: boolean;
    isSSBRelevant?: boolean;
    priority: 'High' | 'Medium' | 'Low';
    calculationBreakdown?: string;
};

export type PayrollGroup = {
    id: string;
    name: string;
    period: string;
    type: 'Monthly' | 'Contract' | 'Daily';
    status: 'Draft' | 'Awaiting_Publication' | 'Published' | 'Disbursed';
    payrollCycle: string;
    proRatingDenominator: 22 | 26 | 30;
    cutoffs: {
        attendance: string;
        overtime: string;
        leave: string;
        project?: string;
    };
    paymentDate: string;
    affectedEmployees: string[];
    approverId?: string;
    approverName?: string;
    records: PayrollRecord[];
    createdAt: string;
};

export type PayrollRecord = {
    empId: string;
    name: string;
    salary: number;
    additions: number;
    deductions: number;
    ssb: number;
    pit: number;
    netPay: number;
    status: 'Draft' | 'Approved' | 'Disbursed' | 'Error';
    alerts: string[];
    detailedBreakdowns?: { [configId: string]: string[] };
    biometricOTHours?: number;
    biometricAttendanceDays?: number;
    biometricDeviceId?: string;
};

export type CandidateMessage = {
    id: string;
    sender: 'candidate' | 'hr';
    text: string;
    timestamp: string;
};

export type Candidate = {
    id: string;
    name: string;
    role: string;
    jobId?: string;
    source: string;
    stage: 'Sourced' | 'Interview' | 'Offer' | 'Hired' | 'On Hold' | 'Rejected';
    rating: number;
    appliedDate: string;
    avatar: string;
    rejectionReason?: string;
};

export type Alert = {
    id: string;
    message: string;
    type: 'info' | 'warning' | 'success' | 'error';
    timestamp: string;
    isRead: boolean;
    link?: string;
};

export type AuditLog = {
    id: string;
    timestamp: string;
    adminId: string;
    actionType: string;
    module: 'Assets' | 'Payroll' | 'Attendance' | 'Leave' | 'Performance' | 'Settings' | 'Inbox' | 'Adjustments' | 'Field Force' | 'Documents' | 'Employees' ;
    detail: string;
    sourceLink?: string;
    oldValue?: string | number;
    newValue?: string | number;
};

export type OTRequest = {
    id: string;
    empId: string;
    name: string;
    dept: string;
    date: string;
    shiftName: string;
    otHours: number;
    otType: 'Weekday 1.5x' | 'Rest Day 2.0x' | 'Holiday 2.0x';
    reason: string;
    payoutAmount: number;
    status: 'Pending' | 'Approved' | 'Rejected';
    hasViolation: boolean;
    violationNote: string;
    effectiveMonth: string;
    requestedDate: string;
    priority: 'High' | 'Medium' | 'Low';
    category: 'Attendance';
    source?: 'Mobile' | 'Web' | 'Biometric';
    isConflict?: boolean;
    conflictNote?: string;
    biometricDeviceId?: string;
    systemDetectedHours?: number;
    approvedBy?: string;
    approvedAt?: string;
};

export type LoanConfiguration = {
    maxEmergencyLoanTerm: number;
    loanLimitMultiplier: number;
    salaryAdvanceTerm: number;
    roundingMethod: 'nearest' | 'ceiling' | 'floor';
};

export type LoanInstallment = {
    month: string;
    amount: number;
    status: 'Pending' | 'Paid' | 'Overdue';
};

export type Loan = {
    id: string;
    empId: string;
    name: string;
    dept: string;
    type: 'Salary Advance' | 'Emergency Loan';
    principalAmount: number;
    termMonths: number;
    monthlyInstallment: number;
    disbursedDate: string | null;
    status: 'Pending' | 'Approved' | 'Active' | 'Completed' | 'Rejected';
    remainingBalance: number;
    installmentsPaid: number;
    schedule: LoanInstallment[];
    reason: string;
    requestedDate: string;
    priority: 'High' | 'Medium' | 'Low';
    category: 'Financial';
    isPaused: boolean;
    interestRate: number;
};

export type OnboardingTaskTemplate = {
    title: string;
    isMandatory: boolean;
    tooltip: string;
    type: 'Document' | 'IT' | 'Action' | 'Training';
};

export type OnboardingTemplate = {
    roleId: string;
    tasks: OnboardingTaskTemplate[];
};

export type OnboardingTask = {
    id: string;
    title: string;
    isCompleted: boolean;
    isMandatory: boolean;
    tooltip: string;
    type: 'Document' | 'IT' | 'Action' | 'Training';
};

export type OnboardingRecord = {
    id: string;
    empId: string;
    employee_id: string; // Supabase-ready alias (kept in sync with empId)
    name: string;
    role: string;
    supervisor?: string;
    startDate: string;
    status: 'In Progress' | 'Pending Docs' | 'Orientation' | 'Completed' | 'Overdue';
    tasks: OnboardingTask[];
    created_at: string; // ISO timestamp
    isVisibleToEmployee?: boolean;
};

export type PaymentProvider = {
    id: string;
    name: string;
    type: 'Bank' | 'Digital Wallet';
    requiredFields: string[];
};

export type DisbursementBatch = {
    id: string;
    providerName: string;
    totalAmount: number;
    employeeCount: number;
    disbursementDate: string;
    payrollMonth: string;
    adminId: string;
};

export type JobPosting = {
    id: string;
    title: string;
    department: string;
    status: 'Open' | 'Closed' | 'Draft';
    portalStatus: boolean;
    postingDate: string;
};

export type LaborContract = {
    id: string;
    empId: string;
    employeeName: string;
    dept: string;
    type: 'Probation' | 'Fixed Term' | 'Open Ended' | 'Casual';
    startDate: string;
    endDate: string | null;
    status: 'Active' | 'Expiring Soon' | 'Expired' | 'Draft';
    documentUrl: string;
    signedDate: string;
    salary: number; // Added since it's used in LaborContracts.tsx
    role?: string;
};

export type DisciplinaryAction = {
    id: string;
    empId: string;
    employeeName: string;
    dept: string;
    type: 'Verbal Warning' | 'Written Warning' | 'Final Warning' | 'Suspension';
    issueDate: string;
    expiryDate: string | null;
    status: 'Active' | 'Resolved' | 'Expired';
    reason: string;
    actionTaken: string;
    documentUrl: string;
};

export type FormTemplate = {
    id: string;
    title: string;
    category: 'HR' | 'Payroll' | 'Legal' | 'Admin';
    description: string;
    fileUrl: string;
    isMandatory: boolean;
};

export type FieldAgentAlert = 'GPS Signal Lost' | 'Fake GPS Detected' | 'Low Battery Warning' | 'None';

export type FieldAgent = {
    id: string;
    empId: string;
    name: string;
    role: string;
    avatar: string | null;
    status: 'Online' | 'Offline';
    locationName: string;
    mapPosition: { x: number, y: number };
    gps: { lat: number, lng: number };
    history: { x: number, y: number, lat?: number, lng?: number, timestamp: string }[];
    lastUpdate: string;
    routeAssigned: string;
    batteryLevel: number;
    alert: FieldAgentAlert;
};

export type ProjectPayment = {
    id: string;
    empId: string;
    name: string;
    projectName: string;
    hoursLogged: number;
    amount: number;
    premiumRateApplied?: number;
    currency: 'MMK';
    status: 'Pending' | 'Approved' | 'Rejected';
    submittedDate: string;
    priority: 'High' | 'Medium' | 'Low';
    category: 'Financial';
};

export type LocationSnapshot = {
    id: string;
    empId: string;
    name: string;
    coords: { lat: number, lng: number };
    address: string;
    timestamp: string;
    photoUrl?: string;
    status: 'Pending' | 'Acknowledged';
    priority: 'Medium' | 'Low';
    category: 'Attendance';
};

export type JobActivityChange = {
    id: string;
    empId: string;
    name: string;
    type: 'Promotion' | 'Transfer' | 'Resignation' | 'Adjustment';
    detail: string;
    effectiveDate: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    submittedDate: string;
    priority: 'High' | 'Medium' | 'Low';
    category: 'Staffing';
    newSalary?: number;
    oldSalary?: number;
    newRole?: string;
    newDept?: string;
    newManager?: string;
    newShiftId?: string;
    announcementTitle?: string;
    jobDescription?: string;
    newLocation?: string;
    newOfficeCoords?: { lat: number; lng: number };
    transferReason?: string;
    finalWorkingDate?: string;
    resignationReason?: string;
};

export type Announcement = {
    id: string;
    title: string;
    content: string;
    dept?: string;
    status: 'Pending' | 'Published';
    createdAt: string;
    sourceType: 'Promotion' | 'Manual';
    sourceId?: string;
    targetFilters?: {
        dept?: string;
        location?: string;
        empType?: string;
    };
    acknowledgmentRequired?: boolean;
    acknowledgedBy?: string[];
};

export type RecruitmentAction = {
    id: string;
    candidateId: string;
    candidateName: string;
    jobTitle: string;
    type: 'Interview' | 'Feedback' | 'Assignment';
    detail: string;
    status: 'Pending' | 'Completed' | 'Rejected';
    submittedDate: string;
    priority: 'Medium' | 'Low';
    category: 'Staffing';
};

export type AttendanceRequest = {
    id: string;
    empId: string;
    name: string;
    type: 'Remote Check-In' | 'Remote Check-Out' | 'Regularization';
    time: string;
    shiftTime?: string;
    location: string;
    reason: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    submittedDate: string;
    priority: 'High' | 'Medium' | 'Low';
    category: 'Attendance';
};

export type ExpenseCategory = {
    id: string;
    name: string;
    description: string;
    monthlyLimit?: number;
};

export type ExpenseRequest = {
    id: string;
    employeeId: string;
    employeeName: string;
    categoryId: string;
    amount: number;
    currency: string;
    date: string;
    description: string;
    attachments: string[];
    approverId: string;
    status: 'Pending' | 'Approved' | 'Rejected' | 'Processed';
};

export type Department = {
    id: string;
    name: string;
    code: string;
    order: number;
    parentId?: string | null;
};

export type PenaltyRule = {
    id: string;
    name: string;
    condition: string;
    penaltyFormula: string;
};

export type Position = {
    id: string;
    name: string;
    deptId?: string;
    reportTo?: string;
};

export type SystemSettings = {
    companyName: string;
    registrationNumber: string;
    ssbEmployerId: string;
    taxId: string;
    headquarters: string;
    officeLocations: OfficeLocation[];
    adminIds: string[];
    atsCredits: number;
    compliance: ComplianceSettings;
    loanConfiguration: LoanConfiguration;
    deviceConfig: {
        showQR: boolean;
        activeLocationId: string | null;
    };
    lastAuditDate: string;
    onboardingTemplates: OnboardingTemplate[];
    paymentProviders: PaymentProvider[];
    paymentRoundingLogic: 'Ceiling' | 'Floor' | 'Nearest' | 'None';
    companyLogo?: string | null;
    expenseModuleEnabled: boolean;
    expenseCategories: ExpenseCategory[];
    autoAttendancePolicyEnabled: boolean;
    autoHolidayWorkEnabled: boolean;
    allowanceConfigs: AllowanceConfig[];
    deductionConfigs: DeductionConfig[];
    departments: Department[];
    positions: Position[];
    penaltyRules: PenaltyRule[];
    projectRates: Record<string, number>;
};

export type EmploymentHistory = {
    id: string;
    date: string;
    type: 'Promotion' | 'Transfer' | 'Adjustment' | 'Hired' | 'Resignation' | 'Schedule Adjustment';
    detail: string;
    oldRole?: string;
    newRole?: string;
    oldSalary?: number;
    newSalary?: number;
    oldDept?: string;
    newDept?: string;
    oldLocation?: string;
    newLocation?: string;
    reason?: string;
    approvedBy?: string;
    sourceId?: string;
    calculationBreakdown?: string;
}

export type SalaryHistoryEntry = {
    date: string;
    oldSalary: number;
    newSalary: number;
    reason: string;
    approvedBy: string;
    attachment?: boolean;
};

export interface SecurityAuditLog {
    id: string;
    timestamp: string;
    deviceId: string;
    authMethod: 'Biometric' | 'PIN' | 'Setup Token' | 'SYSTEM' | 'Auto-Heal';
    status: 'Success' | 'Failed';
    empId?: string;
    detail?: string;
}

export type Employee = {
    id: string;
    name: string;
    role: string;
    dept: string;
    status: 'Active' | 'On Leave' | 'Terminated';
    joinDate: string;
    avatar: string | null;
    township: string;
    nrcNumber?: string;
    ssbNumber?: string;
    initials?: string;
    colorClass?: string;
    mobile?: string | null;
    hasCriticalRiskFlag: boolean;
    criticalRiskCategory?: string;
    documents: DocumentType[];
    recruitmentSource: string;
    baseSalary: number;
    reliefs: Reliefs;
    shiftId: string;
    bankName?: string;
    accountNumber?: string;
    bankBranch?: string;
    bankBranchCode?: string;
    enrolledCourses: {
        courseId: string;
        enrollmentDate: string;
        status: 'In Progress' | 'Completed';
        completionDate?: string;
    }[];
    leaveBalances: Record<string, number>;
    policyId: string;
    officeLocation?: string;
    officeCoords?: { lat: number; lng: number };
    reportingManagerId?: string;
    supervisorId?: string;
    employmentHistory?: EmploymentHistory[];
    salaryHistory?: SalaryHistoryEntry[];
    autoAttendanceEnabled: boolean;
};
