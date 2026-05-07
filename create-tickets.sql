-- ============================================================
-- Tickets (Help Desk) table for HRMS
-- ============================================================

CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY,
    "empId" TEXT NOT NULL,
    "empName" TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('payroll', 'leave', 'it', 'facilities', 'benefits', 'document', 'other')),
    subject TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('High', 'Medium', 'Low')),
    status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Pending', 'Resolved')),
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on tickets" ON tickets;
CREATE POLICY "Allow all operations on tickets" ON tickets FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE tickets;

-- Force reload schema cache
NOTIFY pgrst, 'reload schema';
