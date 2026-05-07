-- Fix employees table: add ALL missing columns and reload schema cache
-- Run this in Supabase SQL Editor

-- 1. Add missing columns if they don't exist
DO $$
BEGIN
    -- Core fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'baseSalary') THEN
        ALTER TABLE employees ADD COLUMN "baseSalary" NUMERIC;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'joinDate') THEN
        ALTER TABLE employees ADD COLUMN "joinDate" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'profileImage') THEN
        ALTER TABLE employees ADD COLUMN "profileImage" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'position') THEN
        ALTER TABLE employees ADD COLUMN "position" TEXT;
    END IF;

    -- Identity & Location
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'township') THEN
        ALTER TABLE employees ADD COLUMN "township" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'nrcNumber') THEN
        ALTER TABLE employees ADD COLUMN "nrcNumber" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'ssbNumber') THEN
        ALTER TABLE employees ADD COLUMN "ssbNumber" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'taxId') THEN
        ALTER TABLE employees ADD COLUMN "taxId" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'mobile') THEN
        ALTER TABLE employees ADD COLUMN "mobile" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'officeLocation') THEN
        ALTER TABLE employees ADD COLUMN "officeLocation" TEXT;
    END IF;

    -- Banking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'bankName') THEN
        ALTER TABLE employees ADD COLUMN "bankName" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'accountNumber') THEN
        ALTER TABLE employees ADD COLUMN "accountNumber" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'bankBranch') THEN
        ALTER TABLE employees ADD COLUMN "bankBranch" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'bankBranchCode') THEN
        ALTER TABLE employees ADD COLUMN "bankBranchCode" TEXT;
    END IF;

    -- Employment
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'shiftId') THEN
        ALTER TABLE employees ADD COLUMN "shiftId" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'policyId') THEN
        ALTER TABLE employees ADD COLUMN "policyId" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'recruitmentSource') THEN
        ALTER TABLE employees ADD COLUMN "recruitmentSource" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'hasCriticalRiskFlag') THEN
        ALTER TABLE employees ADD COLUMN "hasCriticalRiskFlag" BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'autoAttendanceEnabled') THEN
        ALTER TABLE employees ADD COLUMN "autoAttendanceEnabled" BOOLEAN DEFAULT FALSE;
    END IF;

    -- Leave balances (JSONB for flexible keys)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'leaveBalances') THEN
        ALTER TABLE employees ADD COLUMN "leaveBalances" JSONB DEFAULT '{}';
    END IF;

    -- Reliefs (JSONB)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'reliefs') THEN
        ALTER TABLE employees ADD COLUMN "reliefs" JSONB DEFAULT '{"spouse": false, "parentsCount": 0}';
    END IF;

    -- Separation
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'separationReason') THEN
        ALTER TABLE employees ADD COLUMN "separationReason" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'separationDate') THEN
        ALTER TABLE employees ADD COLUMN "separationDate" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'eligibleForRehire') THEN
        ALTER TABLE employees ADD COLUMN "eligibleForRehire" BOOLEAN;
    END IF;

    -- Reporting
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'reportingManagerId') THEN
        ALTER TABLE employees ADD COLUMN "reportingManagerId" TEXT;
    END IF;
END $$;

-- 1.5 Remove duplicate lowercase columns (created by unquoted CREATE TABLE)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'basesalary') THEN
        ALTER TABLE employees DROP COLUMN basesalary;
    END IF;
END $$;

-- 2. Verify table structure
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'employees' ORDER BY ordinal_position;

-- 3. Force reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- 4. Employee Documents Table (for syncing uploaded documents)
DROP TABLE IF EXISTS employee_documents CASCADE;
CREATE TABLE IF NOT EXISTS employee_documents (
    id TEXT PRIMARY KEY,
    "empId" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "category" TEXT,
    "privacy" TEXT,
    "date" TEXT,
    "url" TEXT,
    "uploadedBy" TEXT,
    "timestamp" TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Realtime for employee_documents
ALTER PUBLICATION supabase_realtime ADD TABLE employee_documents;

-- Enable RLS (if not already enabled) and create policy to allow all operations
ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on employee_documents" ON employee_documents;
CREATE POLICY "Allow all operations on employee_documents" ON employee_documents FOR ALL USING (true) WITH CHECK (true);

-- 4.5 Force reload schema cache again
NOTIFY pgrst, 'reload schema';

-- 5. Shift Assignments Table
DROP TABLE IF EXISTS shift_assignments CASCADE;
CREATE TABLE IF NOT EXISTS shift_assignments (
    id TEXT PRIMARY KEY,
    "empId" TEXT,
    "date" TEXT,
    "shiftId" TEXT,
    "modifiedByHr" BOOLEAN,
    "reason" TEXT,
    "adminId" TEXT,
    "oldShiftId" TEXT,
    "customStart" TEXT,
    "customEnd" TEXT,
    "workType" TEXT,
    "source" TEXT
);

-- Enable RLS and allow all operations
ALTER TABLE shift_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on shift_assignments" ON shift_assignments;
CREATE POLICY "Allow all operations on shift_assignments" ON shift_assignments FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE shift_assignments;

-- 5.5 Force reload schema cache again
NOTIFY pgrst, 'reload schema';

-- 6. Published Weeks Table
DROP TABLE IF EXISTS published_weeks CASCADE;
CREATE TABLE IF NOT EXISTS published_weeks (
    id TEXT PRIMARY KEY,
    "weekKey" TEXT NOT NULL,
    "publishedBy" TEXT,
    "publishedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and allow all operations
ALTER TABLE published_weeks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on published_weeks" ON published_weeks;
CREATE POLICY "Allow all operations on published_weeks" ON published_weeks FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE published_weeks;

-- 6.5 Force reload schema cache again
NOTIFY pgrst, 'reload schema';

-- 7. Attendance Logs Table
DROP TABLE IF EXISTS attendance_logs CASCADE;
CREATE TABLE IF NOT EXISTS attendance_logs (
    id TEXT PRIMARY KEY,
    "empId" TEXT,
    "name" TEXT,
    "checkIn" TEXT,
    "checkOut" TEXT,
    "location" TEXT,
    "gpsLat" DOUBLE PRECISION,
    "gpsLng" DOUBLE PRECISION,
    "geofenceStatus" TEXT,
    "status" TEXT,
    "adminAuditId" TEXT,
    "adminAuditReason" TEXT,
    "dept" TEXT,
    "totalHours" DOUBLE PRECISION,
    "checkInMethod" TEXT,
    "isManual" BOOLEAN DEFAULT FALSE,
    "penaltyRuleId" TEXT,
    "penaltyAmount" DOUBLE PRECISION DEFAULT 0,
    "date" TEXT,
    "deviceCheckIn" TEXT,
    "syncCheckIn" TEXT,
    "deviceCheckOut" TEXT,
    "syncCheckOut" TEXT,
    "biometricDeviceId" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and allow all operations
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on attendance_logs" ON attendance_logs;
CREATE POLICY "Allow all operations on attendance_logs" ON attendance_logs FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE attendance_logs;

-- 7.5 Force reload schema cache again
NOTIFY pgrst, 'reload schema';

-- 8. Create attendance_requests table
CREATE TABLE IF NOT EXISTS attendance_requests (
    "id" TEXT PRIMARY KEY,
    "empId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL CHECK ("type" IN ('Remote Check-In', 'Remote Check-Out', 'Regularization')),
    "time" TEXT,
    "shiftTime" TEXT,
    "location" TEXT,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pending' CHECK ("status" IN ('Pending', 'Approved', 'Rejected')),
    "submittedDate" TEXT,
    "priority" TEXT DEFAULT 'Medium' CHECK ("priority" IN ('High', 'Medium', 'Low')),
    "category" TEXT DEFAULT 'Attendance',
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and allow all operations
ALTER TABLE attendance_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on attendance_requests" ON attendance_requests;
CREATE POLICY "Allow all operations on attendance_requests" ON attendance_requests FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE attendance_requests;

-- Force reload schema cache
NOTIFY pgrst, 'reload schema';
