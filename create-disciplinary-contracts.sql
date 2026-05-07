-- ============================================================
-- Disciplinary Actions & Labor Contracts tables for HRMS
-- ============================================================

-- 1. Disciplinary Actions
CREATE TABLE IF NOT EXISTS disciplinary_actions (
    id TEXT PRIMARY KEY,
    "empId" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    dept TEXT,
    type TEXT NOT NULL CHECK (type IN ('Verbal Warning', 'Written Warning', 'Final Warning', 'Suspension')),
    category TEXT NOT NULL CHECK (category IN ('Misconduct', 'Performance', 'Attendance', 'Safety Violation', 'Policy Breach')),
    "issueDate" TEXT,
    "expiryDate" TEXT,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Resolved', 'Expired')),
    reason TEXT,
    "actionTaken" TEXT,
    "documentUrl" TEXT,
    "penaltyAmount" INTEGER,
    "employeeStatement" TEXT,
    "resolvedDate" TEXT,
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE disciplinary_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on disciplinary_actions" ON disciplinary_actions;
CREATE POLICY "Allow all operations on disciplinary_actions" ON disciplinary_actions FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE disciplinary_actions;


-- 2. Labor Contracts
CREATE TABLE IF NOT EXISTS labor_contracts (
    id TEXT PRIMARY KEY,
    "empId" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    dept TEXT,
    type TEXT NOT NULL CHECK (type IN ('Probation', 'Fixed Term', 'Open Ended', 'Casual')),
    "startDate" TEXT,
    "endDate" TEXT,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Expiring Soon', 'Expired', 'Draft')),
    "documentUrl" TEXT,
    "signedDate" TEXT,
    salary INTEGER,
    role TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE labor_contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on labor_contracts" ON labor_contracts;
CREATE POLICY "Allow all operations on labor_contracts" ON labor_contracts FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE labor_contracts;

-- Force reload schema cache
NOTIFY pgrst, 'reload schema';
