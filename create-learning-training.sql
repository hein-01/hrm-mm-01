-- ============================================================
-- Learning & Training tables for HRMS
-- ============================================================

-- 1. Courses
CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    duration TEXT,
    enrolled INTEGER DEFAULT 0,
    progress INTEGER DEFAULT 0,
    "isMandatory" BOOLEAN DEFAULT false,
    "expiryDays" INTEGER,
    "skillTags" JSONB DEFAULT '[]',
    provider TEXT,
    "costPerHead" INTEGER,
    "minPassingScore" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on courses" ON courses;
CREATE POLICY "Allow all operations on courses" ON courses FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE courses;


-- 2. Certifications
CREATE TABLE IF NOT EXISTS certifications (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    employee TEXT NOT NULL,
    "empId" TEXT NOT NULL,
    expiry TEXT,
    "complianceLink" TEXT,
    status TEXT NOT NULL DEFAULT 'Valid',
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on certifications" ON certifications;
CREATE POLICY "Allow all operations on certifications" ON certifications FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE certifications;


-- 3. Training Analytics (per-employee progress)
CREATE TABLE IF NOT EXISTS training_analytics (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    dept TEXT,
    progress INTEGER DEFAULT 0,
    avatar TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE training_analytics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on training_analytics" ON training_analytics;
CREATE POLICY "Allow all operations on training_analytics" ON training_analytics FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE training_analytics;

-- Force reload schema cache
NOTIFY pgrst, 'reload schema';
