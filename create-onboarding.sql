-- ============================================================
-- Onboarding Records table for HRMS
-- ============================================================

CREATE TABLE IF NOT EXISTS onboarding_records (
    id TEXT PRIMARY KEY,
    "empId" TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    supervisor TEXT,
    "startDate" TEXT,
    status TEXT NOT NULL DEFAULT 'In Progress' CHECK (status IN ('In Progress', 'Pending Docs', 'Orientation', 'Completed', 'Overdue')),
    tasks JSONB NOT NULL DEFAULT '[]',
    "isVisibleToEmployee" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE onboarding_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on onboarding_records" ON onboarding_records;
CREATE POLICY "Allow all operations on onboarding_records" ON onboarding_records FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE onboarding_records;

-- Force reload schema cache
NOTIFY pgrst, 'reload schema';
