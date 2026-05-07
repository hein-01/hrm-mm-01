-- ============================================================
-- Settings & Announcements tables for HRMS
-- ============================================================

-- 1. System Settings (single-row JSONB config)
-- Stores the entire systemSettings + complianceSettings as one JSON blob.
-- Only one row ever exists (id = 'default').
CREATE TABLE IF NOT EXISTS system_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    data JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on system_settings" ON system_settings;
CREATE POLICY "Allow all operations on system_settings" ON system_settings FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE system_settings;

-- Seed the default row if empty
INSERT INTO system_settings (id, data)
VALUES ('default', '{}')
ON CONFLICT (id) DO NOTHING;


-- 2. Announcements
CREATE TABLE IF NOT EXISTS announcements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('High', 'Medium', 'Low')),
    "targetAudience" TEXT NOT NULL DEFAULT 'All' CHECK ("targetAudience" IN ('All', 'Department', 'Role')),
    "targetDept" TEXT,
    "targetRole" TEXT,
    "createdBy" TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Published', 'Draft')),
    "sourceType" TEXT NOT NULL DEFAULT 'Manual' CHECK ("sourceType" IN ('System', 'Manual')),
    "requiresAcknowledgement" BOOLEAN DEFAULT false,
    acknowledgements JSONB DEFAULT '[]',
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on announcements" ON announcements;
CREATE POLICY "Allow all operations on announcements" ON announcements FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE announcements;

-- Force reload schema cache
NOTIFY pgrst, 'reload schema';
