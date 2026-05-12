-- ============================================================
-- Tickets (Help Desk) table for HRMS
-- ============================================================
-- Drop old camelCase table if it exists, then recreate with snake_case
-- (Supabase/PostgREST requires snake_case for reliable REST mapping)

DROP TABLE IF EXISTS tickets CASCADE;

CREATE TABLE tickets (
    id TEXT PRIMARY KEY,
    emp_id TEXT NOT NULL,
    emp_name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('payroll', 'leave', 'it', 'facilities', 'benefits', 'document', 'other')),
    subject TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('High', 'Medium', 'Low')),
    status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Pending', 'Resolved', 'On Hold', 'Closed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on tickets" ON tickets;
CREATE POLICY "Allow all operations on tickets" ON tickets FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE tickets;

-- Force reload schema cache
NOTIFY pgrst, 'reload schema';
