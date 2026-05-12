-- HRMS Myanmar Supabase Migration Schema
-- Run this in your Supabase SQL Editor

-- 1. Employees Table
CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    dept TEXT,
    position TEXT,
    "baseSalary" NUMERIC,
    role TEXT DEFAULT 'Employee',
    status TEXT DEFAULT 'Active',
    "joinDate" TEXT,
    "profileImage" TEXT,
    avatar TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Departments Table
CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    "parentId" TEXT REFERENCES departments(id),
    "managerId" TEXT REFERENCES employees(id),
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Shifts Table
CREATE TABLE IF NOT EXISTS shifts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    color TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Approval Requests Table
CREATE TABLE IF NOT EXISTS approval_requests (
    id TEXT PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "requestType" TEXT NOT NULL,
    "requesterId" TEXT REFERENCES employees(id),
    "requesterName" TEXT,
    "requesterDept" TEXT,
    "currentStep" INTEGER DEFAULT 0,
    "totalSteps" INTEGER DEFAULT 1,
    status TEXT DEFAULT 'Pending',
    metadata JSONB,
    history JSONB,
    "peerAcknowledgement" JSONB,
    "peerId" TEXT,
    "peerName" TEXT,
    "escalatedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Leave Requests Table
CREATE TABLE IF NOT EXISTS leave_requests (
    id TEXT PRIMARY KEY,
    "empId" TEXT REFERENCES employees(id),
    name TEXT,
    dept TEXT,
    type TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    days NUMERIC,
    reason TEXT,
    status TEXT DEFAULT 'Pending',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Attendance Logs Table
CREATE TABLE IF NOT EXISTS attendance_logs (
    id TEXT PRIMARY KEY,
    "empId" TEXT REFERENCES employees(id),
    name TEXT,
    dept TEXT,
    date TEXT NOT NULL,
    "checkIn" TEXT,
    "checkOut" TEXT,
    status TEXT,
    "lateMinutes" INTEGER DEFAULT 0,
    "earlyLeaveMinutes" INTEGER DEFAULT 0,
    location TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 6. OT Requests Table
CREATE TABLE IF NOT EXISTS ot_requests (
    id TEXT PRIMARY KEY,
    "empId" TEXT REFERENCES employees(id),
    name TEXT,
    dept TEXT,
    date TEXT NOT NULL,
    "shiftName" TEXT,
    "otHours" NUMERIC NOT NULL,
    "otType" TEXT,
    reason TEXT,
    "payoutAmount" NUMERIC,
    status TEXT DEFAULT 'Pending',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMPTZ,
    "hasViolation" BOOLEAN DEFAULT FALSE,
    "violationNote" TEXT,
    "systemDetectedHours" NUMERIC,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Adjustments Table (Payroll)
CREATE TABLE IF NOT EXISTS adjustments (
    id TEXT PRIMARY KEY,
    "empId" TEXT REFERENCES employees(id),
    name TEXT,
    dept TEXT,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'MMK',
    "effectiveMonth" TEXT,
    status TEXT DEFAULT 'Pending',
    reason TEXT,
    "sourceLink" TEXT,
    source TEXT,
    "isImmutable" BOOLEAN DEFAULT FALSE,
    "isTaxable" BOOLEAN DEFAULT FALSE,
    "isSSBRelevant" BOOLEAN DEFAULT FALSE,
    priority TEXT DEFAULT 'Medium',
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Approval Requests Table (Manager Approvals)
CREATE TABLE IF NOT EXISTS approval_requests (
    id TEXT PRIMARY KEY,
    "requestId" TEXT,
    "requestType" TEXT NOT NULL,
    "requesterId" TEXT REFERENCES employees(id),
    "requesterName" TEXT,
    "requesterDept" TEXT,
    "currentStep" INTEGER DEFAULT 0,
    "totalSteps" INTEGER DEFAULT 1,
    status TEXT DEFAULT 'Pending',
    metadata JSONB,
    history JSONB,
    "peerAcknowledgement" JSONB,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Shift Assignments Table
CREATE TABLE IF NOT EXISTS shift_assignments (
    id TEXT PRIMARY KEY,
    "empId" TEXT REFERENCES employees(id),
    date TEXT NOT NULL,
    "shiftId" TEXT REFERENCES shifts(id),
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Published Weeks Table
CREATE TABLE IF NOT EXISTS published_weeks (
    "weekStart" TEXT PRIMARY KEY,
    "weekEnd" TEXT,
    "isPublished" BOOLEAN DEFAULT FALSE,
    "publishedBy" TEXT,
    "publishedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    "empId" TEXT REFERENCES employees(id),
    title TEXT NOT NULL,
    body TEXT,
    category TEXT,
    priority TEXT DEFAULT 'normal',
    icon TEXT,
    "iconBg" TEXT,
    "iconColor" TEXT,
    "actionRoute" TEXT,
    "actionLabel" TEXT,
    badge TEXT,
    "badgeColor" TEXT,
    read BOOLEAN DEFAULT FALSE,
    "sourceId" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    details JSONB,
    "ipAddress" TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) - Optional, can enable later
-- ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE ot_requests ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE adjustments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE shift_assignments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leave_requests_empId ON leave_requests("empId");
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_empId ON attendance_logs("empId");
CREATE INDEX IF NOT EXISTS idx_attendance_logs_date ON attendance_logs(date);
CREATE INDEX IF NOT EXISTS idx_ot_requests_empId ON ot_requests("empId");
CREATE INDEX IF NOT EXISTS idx_ot_requests_status ON ot_requests(status);
CREATE INDEX IF NOT EXISTS idx_adjustments_empId ON adjustments("empId");
CREATE INDEX IF NOT EXISTS idx_approval_requests_requesterId ON approval_requests("requesterId");
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_notifications_empId ON notifications("empId");
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);

-- Insert default shifts
INSERT INTO shifts (id, name, "startTime", "endTime", color) VALUES
    ('Morning', 'Morning Shift', '08:00', '16:00', '#3B82F6'),
    ('Evening', 'Evening Shift', '16:00', '00:00', '#8B5CF6'),
    ('Night', 'Night Shift', '00:00', '08:00', '#6366F1'),
    ('General', 'General Shift', '09:00', '18:00', '#10B981'),
    ('Flexi', 'Flexi Shift', '10:00', '19:00', '#F59E0B')
ON CONFLICT (id) DO NOTHING;

-- Insert default employees
INSERT INTO employees (id, name, email, phone, dept, role, salary, "roleId", status, "joinDate", photo, address, "ssbId", "bankId", reliefs, "shiftId", leave, "managerId", "isManager", "isHR", "personalEmail", "currentAddress") VALUES
    ('EMP-001', 'Nilar Lwin', 'nilar@company.com', '09-4555-00000', 'Product Dept', 'admin', 1200000, 'admin', 'Active', '2021-01-15', 'https://lh3.googleusercontent.com/aida-public/AB6AXuDtMXUX0ktXwWpCR_HssI-ya16-3aPa6AAVPyBQ1EHpfp-j-sPL3V6-M9LOQH5oBAEgQVe-LnDjqixmSwV106z7bEtrnsNZO1CATGA_USq9lnhHi1_HCFl-Cyi3xyw648ljz2mqjJMc3vscDUW5zgws6ccC1OF1vEu1wdaDvwNJ2V-sg_zZ0haXJZDCxUvx8VjDCNXD51nD66gSegMbmfNMdqwU2v6zEDDEhi7cAmX1yUQ8UQLqt3O-oPvyg5wEcfX6wNGOUrCzj4', '12/Bahan(N)123456', 'SSB-001-992', NULL, 'Sanchaung', 'KBZ Bank', '1002019920031', 'KBZ-B01', '{"spouse": true, "parentsCount": 0, "childrenCount": 1}', 'SH-GEN-96', '{"Casual": 4, "Medical": 12, "Earned": 8}', 'LP-MGM-01', true, false, 'LinkedIn'),
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STARTER SET: RLS POLICIES & REALTIME
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ot_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies (idempotent: drop if exists before create)

-- 1. EMPLOYEES
DROP POLICY IF EXISTS "HR full access" ON employees;
CREATE POLICY "HR full access" ON employees FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
);
DROP POLICY IF EXISTS "Manager read all" ON employees;
CREATE POLICY "Manager read all" ON employees FOR SELECT USING (
    auth.jwt() ->> 'role' IN ('admin', 'manager')
);
DROP POLICY IF EXISTS "Employee read own" ON employees;
CREATE POLICY "Employee read own" ON employees FOR SELECT USING (
    auth.jwt() ->> 'user_id' = id
);

-- 2. LEAVE REQUESTS
DROP POLICY IF EXISTS "HR full access leave" ON leave_requests;
CREATE POLICY "HR full access leave" ON leave_requests FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
);
DROP POLICY IF EXISTS "Manager read leave" ON leave_requests;
CREATE POLICY "Manager read leave" ON leave_requests FOR SELECT USING (
    auth.jwt() ->> 'role' IN ('admin', 'manager')
);
DROP POLICY IF EXISTS "Employee own leave" ON leave_requests;
CREATE POLICY "Employee own leave" ON leave_requests FOR ALL USING (
    auth.jwt() ->> 'user_id' = "empId"
);

-- 3. ATTENDANCE LOGS
DROP POLICY IF EXISTS "HR full access attendance" ON attendance_logs;
CREATE POLICY "HR full access attendance" ON attendance_logs FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
);
DROP POLICY IF EXISTS "Manager read attendance" ON attendance_logs;
CREATE POLICY "Manager read attendance" ON attendance_logs FOR SELECT USING (
    auth.jwt() ->> 'role' IN ('admin', 'manager')
);
DROP POLICY IF EXISTS "Employee own attendance" ON attendance_logs;
CREATE POLICY "Employee own attendance" ON attendance_logs FOR ALL USING (
    auth.jwt() ->> 'user_id' = "empId"
);

-- 4. OT REQUESTS
DROP POLICY IF EXISTS "HR full access ot" ON ot_requests;
CREATE POLICY "HR full access ot" ON ot_requests FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
);
DROP POLICY IF EXISTS "Manager read ot" ON ot_requests;
CREATE POLICY "Manager read ot" ON ot_requests FOR SELECT USING (
    auth.jwt() ->> 'role' IN ('admin', 'manager')
);
DROP POLICY IF EXISTS "Employee own ot" ON ot_requests;
CREATE POLICY "Employee own ot" ON ot_requests FOR ALL USING (
    auth.jwt() ->> 'user_id' = "empId"
);

-- 5. APPROVAL REQUESTS
DROP POLICY IF EXISTS "HR full access approvals" ON approval_requests;
CREATE POLICY "HR full access approvals" ON approval_requests FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
);
DROP POLICY IF EXISTS "Manager read approvals" ON approval_requests;
CREATE POLICY "Manager read approvals" ON approval_requests FOR SELECT USING (
    auth.jwt() ->> 'role' IN ('admin', 'manager')
);
DROP POLICY IF EXISTS "Employee own approvals" ON approval_requests;
CREATE POLICY "Employee own approvals" ON approval_requests FOR ALL USING (
    auth.jwt() ->> 'user_id' = "requesterId"
);

-- 6. NOTIFICATIONS
DROP POLICY IF EXISTS "HR full access notifications" ON notifications;
CREATE POLICY "HR full access notifications" ON notifications FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
);
DROP POLICY IF EXISTS "Manager read notifications" ON notifications;
CREATE POLICY "Manager read notifications" ON notifications FOR SELECT USING (
    auth.jwt() ->> 'role' IN ('admin', 'manager')
);
DROP POLICY IF EXISTS "Employee own notifications" ON notifications;
CREATE POLICY "Employee own notifications" ON notifications FOR ALL USING (
    auth.jwt() ->> 'user_id' = "empId"
);

-- 7. SHIFT ASSIGNMENTS
DROP POLICY IF EXISTS "HR full access shifts" ON shift_assignments;
CREATE POLICY "HR full access shifts" ON shift_assignments FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
);
DROP POLICY IF EXISTS "Manager read shifts" ON shift_assignments;
CREATE POLICY "Manager read shifts" ON shift_assignments FOR SELECT USING (
    auth.jwt() ->> 'role' IN ('admin', 'manager')
);
DROP POLICY IF EXISTS "Employee own shifts" ON shift_assignments;
CREATE POLICY "Employee own shifts" ON shift_assignments FOR ALL USING (
    auth.jwt() ->> 'user_id' = "empId"
);

-- =====================================================
-- REALTIME ENABLEMENT
-- =====================================================
DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['approval_requests','notifications','leave_requests','employees']
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
        END IF;
    END LOOP;
END $$;

-- =====================================================
-- LEAVE REQUESTS: add rejection + metadata columns (idempotent)
-- =====================================================
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS "rejectedBy" TEXT;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMPTZ;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS "relieverId" TEXT;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS "relieverName" TEXT;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'Medium';
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Staffing';

SELECT 'RLS & Realtime enabled successfully!' as status;

-- =====================================================
-- EMPLOYEES: add identity, tax relief, and emergency contact columns
-- =====================================================
ALTER TABLE employees ADD COLUMN IF NOT EXISTS "nrcNumber" TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS "ssbNumber" TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS "taxId" TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS "dateOfBirth" TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS "emergencyContactName" TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS "emergencyContactRelationship" TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS "emergencyContactPhone" TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS township TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS "bankName" TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS "accountNumber" TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS "autoAttendanceEnabled" BOOLEAN DEFAULT FALSE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS "personalEmail" TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS "currentAddress" TEXT;
-- Store reliefs as JSONB for flexibility: { spouse: boolean, parentsCount: number, childrenCount: number }
ALTER TABLE employees ADD COLUMN IF NOT EXISTS reliefs JSONB DEFAULT '{"spouse":false,"parentsCount":0,"childrenCount":0}'::jsonb;
