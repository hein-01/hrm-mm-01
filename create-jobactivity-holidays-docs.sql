-- ============================================================
-- Job Activity Changes, Holidays, Archived Documents tables for HRMS
-- ============================================================

-- 1. Job Activity Changes (Inbox approval flow)
CREATE TABLE IF NOT EXISTS job_activity_changes (
    id TEXT PRIMARY KEY,
    "empId" TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Promotion', 'Transfer', 'Resignation', 'Adjustment')),
    detail TEXT,
    "effectiveDate" TEXT,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    "submittedDate" TEXT,
    priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('High', 'Medium', 'Low')),
    category TEXT DEFAULT 'Staffing',
    "newSalary" NUMERIC,
    "oldSalary" NUMERIC,
    "newRole" TEXT,
    "newDept" TEXT,
    "newManager" TEXT,
    "newShiftId" TEXT,
    "announcementTitle" TEXT,
    "jobDescription" TEXT,
    "newLocation" TEXT,
    "newOfficeCoords" JSONB,
    "transferReason" TEXT,
    "finalWorkingDate" TEXT,
    "resignationReason" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE job_activity_changes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on job_activity_changes" ON job_activity_changes;
CREATE POLICY "Allow all operations on job_activity_changes" ON job_activity_changes FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime (idempotent)
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE job_activity_changes;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- 2. Holidays
CREATE TABLE IF NOT EXISTS holidays (
    date TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    "isRestricted" BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on holidays" ON holidays;
CREATE POLICY "Allow all operations on holidays" ON holidays FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime (idempotent)
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE holidays;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- 3. Archived Documents
CREATE TABLE IF NOT EXISTS archived_documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Government Filing', 'Employment Contract', 'Disciplinary Record', 'Payroll Summary', 'HR Template', 'Internal Memo', 'Performance Record')),
    "sourceModule" TEXT NOT NULL CHECK ("sourceModule" IN ('SSB', 'PIT', 'Disciplinary', 'Labor Contracts', 'Payroll', 'Manual', 'Performance')),
    description TEXT,
    period TEXT,
    "generatedBy" TEXT,
    "generatedAt" TEXT,
    checksum TEXT,
    "fileContent" TEXT,
    fileName TEXT,
    "isMandatory" BOOLEAN DEFAULT false,
    "relatedRecordId" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE archived_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on archived_documents" ON archived_documents;
CREATE POLICY "Allow all operations on archived_documents" ON archived_documents FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime (idempotent)
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE archived_documents;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Force reload schema cache
NOTIFY pgrst, 'reload schema';
