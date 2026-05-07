-- ============================================================
-- Performance module tables for HRMS
-- ============================================================

-- 1. Reviews
CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    "empId" TEXT NOT NULL,
    "revieweeId" TEXT,
    "reviewerId" TEXT,
    name TEXT,
    dept TEXT,
    period TEXT,
    progress JSONB DEFAULT '[]',
    rating NUMERIC,
    "competencyScores" JSONB DEFAULT '{}',
    "selfRating" NUMERIC,
    "managerRating" NUMERIC,
    "managerComments" TEXT,
    "peerRatings" JSONB DEFAULT '[]',
    "bonusEligible" BOOLEAN DEFAULT false,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Draft', 'Submitted', 'Finalized', 'Completed', 'In Progress')),
    checksum TEXT,
    initials TEXT,
    "colorClass" TEXT,
    "hasReminderSent" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on reviews" ON reviews;
CREATE POLICY "Allow all operations on reviews" ON reviews FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime (idempotent)
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE reviews;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- 2. Performance Review Requests (Inbox items for admin approval)
CREATE TABLE IF NOT EXISTS performance_review_requests (
    id TEXT PRIMARY KEY,
    "reviewId" TEXT NOT NULL,
    "empId" TEXT NOT NULL,
    name TEXT NOT NULL,
    dept TEXT,
    "reviewerId" TEXT,
    period TEXT,
    "competencyScores" JSONB DEFAULT '{}',
    rating NUMERIC,
    "submittedDate" TEXT,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('High', 'Medium', 'Low')),
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE performance_review_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on performance_review_requests" ON performance_review_requests;
CREATE POLICY "Allow all operations on performance_review_requests" ON performance_review_requests FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime (idempotent)
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE performance_review_requests;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- 3. Objectives (OKR)
CREATE TABLE IF NOT EXISTS objectives (
    id TEXT PRIMARY KEY,
    "empId" TEXT NOT NULL,
    title TEXT NOT NULL,
    period TEXT,
    weight INTEGER DEFAULT 0,
    alignment TEXT,
    progress INTEGER DEFAULT 0,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE objectives ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on objectives" ON objectives;
CREATE POLICY "Allow all operations on objectives" ON objectives FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime (idempotent)
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE objectives;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- 4. Key Results
CREATE TABLE IF NOT EXISTS key_results (
    id TEXT PRIMARY KEY,
    "objectiveId" TEXT NOT NULL,
    title TEXT NOT NULL,
    "targetValue" INTEGER DEFAULT 0,
    "currentValue" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE key_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on key_results" ON key_results;
CREATE POLICY "Allow all operations on key_results" ON key_results FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime (idempotent)
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE key_results;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Force reload schema cache
NOTIFY pgrst, 'reload schema';
